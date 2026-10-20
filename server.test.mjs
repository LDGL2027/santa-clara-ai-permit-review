import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { randomBytes, randomInt, createHmac } from "node:crypto";

test("production server gates deep links and static files before serving the unchanged built app", async t => {
  const reserve = createServer();
  await new Promise(resolve => reserve.listen(0, "127.0.0.1", resolve));
  const port = reserve.address().port;
  await new Promise(resolve => reserve.close(resolve));
  const passcode = String(randomInt(10000)).padStart(4, "0");
  const key = randomBytes(32).toString("hex");
  const child = spawn(process.execPath, ["artifacts/permit-review-assistant/server.mjs"], {
    env: { ...process.env, PORT: String(port), BASE_PATH: "/", NODE_ENV: "production", APP_PASSCODE: passcode, SESSION_SECRET: key },
    stdio: "ignore",
  });
  t.after(() => child.kill());
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { ready = (await fetch(base + "/healthz")).status === 200; if (ready) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(ready, "production server starts");
  for (const path of ["/", "/records", "/applications/example"]) {
    const html = await (await fetch(base + path)).text();
    assert.match(html, /4-digit passcode/);
    assert.doesNotMatch(html, /src="\/assets/);
    assert.ok(!html.includes(passcode));
  }
  assert.equal((await fetch(base + "/sample-documents/residential-project-summary.pdf")).status, 401);
  assert.equal((await fetch(base + "/assets/example.js")).status, 401);
  const nonce = randomBytes(32).toString("base64url");
  const signature = createHmac("sha256", key).update("scc-app-access:v1:").update(passcode).update(":").update(nonce).digest("base64url");
  const headers = { cookie: `scc_app_access=${nonce}.${signature}` };
  const response = await fetch(base + "/records", { headers });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/);
  const script = html.match(/src="([^"]+\.js)"/)?.[1];
  assert.ok(script, "the original Vite application is served after unlock");
  assert.equal((await fetch(base + script)).status, 401);
  assert.equal((await fetch(base + script, { headers })).status, 200);
  assert.equal((await fetch(base + "/logo.svg", { headers })).status, 200);
  assert.equal((await fetch(base + "/records")).headers.get("cache-control"), "private, no-store");
});
