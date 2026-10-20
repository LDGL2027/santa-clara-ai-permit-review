import { useState } from 'react';
import { useCorrectPermitClassification, useGetPermitRuleConfig, useReviewPermitChecks, useUpdatePermitRuleConfig, type PermitApplication as ApiApplication } from '@workspace/api-client-react';
import type { PermitApplication } from './App';

export function ClassificationCorrection({ application: app, onSaved }: { application: PermitApplication; onSaved: (app: ApiApplication) => void }) {
  const correct = useCorrectPermitClassification();
  const [type, setType] = useState(app.projectType);
  const [units, setUnits] = useState(String(app.housingUnits));
  const [description, setDescription] = useState(app.description);
  const [error, setError] = useState('');
  if (!app.ruleChecks?.classificationConflicts.length) return null;
  return <section className="card card-body rule-panel" data-testid="classification-correction"><h2>Confirm or correct project classification</h2><p className="rule-alert">Project classification conflict — human review required. Confirm or correct the project type, unit count, and description before it can move forward.</p><ul>{app.ruleChecks.classificationConflicts.map(c => <li key={c}>{c}</li>)}</ul><form onSubmit={async e => { e.preventDefault(); setError(''); try { onSaved(await correct.mutateAsync({ id: app.id, data: { projectType: type, housingUnits: Number(units), description } })); } catch { setError('The correction could not be saved. Check the values and try again.'); } }}>
    <label>Project type<select className="select" value={type} onChange={e => setType(e.target.value)}><option>Single-family residential</option><option>Accessory dwelling unit</option><option>Addition</option><option>Small multifamily housing</option><option>Multifamily housing</option><option>Commercial</option><option>Senior residential care</option></select></label>
    <label>Housing units<input className="input" type="number" min="0" step="1" required value={units} onChange={e => setUnits(e.target.value)} /></label>
    <label>Project description<textarea className="textarea" required value={description} onChange={e => setDescription(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}<button className="button teal" disabled={correct.isPending}>Save correction and recheck</button>
  </form></section>;
}
export function StaffChecksPanel({ application: app, onSaved }: { application: PermitApplication; onSaved: (app: ApiApplication) => void }) {
  const review = useReviewPermitChecks();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const submit = async (action: 'claim' | 'safety' | 'jurisdiction', extra: { claim?: 'affordable' | 'underserved'; decision?: 'Verified' | 'Rejected'; document?: string } = {}) => {
    if (!note.trim()) { setError('A staff note is required for every verification or resolution.'); return; }
    setError('');
    try { const saved = await review.mutateAsync({ id: app.id, data: { action, note: note.trim(), ...extra } }); onSaved(saved); setNote(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'The staff decision could not be saved.'); }
  };
  return <section className="card card-body rule-panel" data-testid="staff-checks-panel"><h2>Verify priority claims</h2><p>Claims do not raise priority until staff verify them. Every decision records your signed-in user ID, note, and timestamp.</p>
    {app.documents.filter(d => d.objectPath).map(d => <p key={d.objectPath}><a href={`/api/storage${d.objectPath}`} target="_blank" rel="noopener noreferrer">Download {d.label}: {d.fileName}</a></p>)}
    <label>Required verification / resolution note<textarea className="textarea" value={note} onChange={e => setNote(e.target.value)} data-testid="textarea-verification-note" /></label>
    {(['affordable', 'underserved'] as const).map(claim => {
      const claimed = claim === 'affordable' ? app.claimed_affordable ?? app.affordableHousing : app.claimed_underserved ?? app.underservedCommunity;
      if (!claimed) return null;
      const decision = app.priorityClaims?.[claim];
      return <div className="claim-row" key={claim}><strong>Applicant-claimed: {claim === 'affordable' ? 'Affordable housing project' : 'Located in an underserved community'}</strong><p>{decision?.status ?? 'Unverified'}{decision?.by && ` · ${decision.by} · ${decision.at}`}</p>{decision?.note && <p>{decision.note}</p>}{claim === 'underserved' && <p>{app.ruleChecks?.underservedMatch}</p>}<div className="actions"><button className="button teal" disabled={review.isPending || !note.trim()} onClick={() => submit('claim', { claim, decision: 'Verified' })} data-testid={`verify-${claim}`}>Verify</button><button className="button danger" disabled={review.isPending || !note.trim()} onClick={() => submit('claim', { claim, decision: 'Rejected' })} data-testid={`reject-${claim}`}>Reject</button></div></div>;
    })}
    {!app.affordableHousing && !app.underservedCommunity && <p>No applicant priority claims.</p>}
    {app.ruleChecks?.jurisdictionStatus === 'Needs Verification' && !app.reviewDecisions?.jurisdiction && <div className="claim-row"><h3>Jurisdiction verification</h3><p>Confirm this project is within the prototype's Santa Clara County geography before intake proceeds.</p><button className="button teal" disabled={review.isPending || !note.trim()} onClick={() => submit('jurisdiction')}>Confirm County jurisdiction</button></div>}
    {app.ruleChecks?.safetyCriticalFlags.length ? <div className="claim-row safety-critical"><h3>Required safety review</h3><p>Fire Marshal or City Worker must document the resolution. A waiver does not mark a missing document complete.</p><button className="button danger" disabled={review.isPending || !note.trim()} onClick={() => submit('safety', { document: 'Fire and life safety plan' })} data-testid="resolve-fire-safety">Record fire/life-safety resolution</button></div> : null}
    {app.reviewDecisions?.safety?.map((d, index) => <p key={index}>Safety resolution: {d.document} — {d.note} · {d.by} · {d.at}</p>)}
    {error && <p className="rule-alert" role="alert">{error}</p>}
  </section>;
}
export function UnderservedConfigPanel() {
  const config = useGetPermitRuleConfig();
  const update = useUpdatePermitRuleConfig();
  const [editing, setEditing] = useState(false);
  const [zips, setZips] = useState('');
  const [tracts, setTracts] = useState('');
  const [placeholder, setPlaceholder] = useState(true);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  return <section className="card card-body rule-panel" data-testid="underserved-config"><h2>Underserved area matching configuration</h2><p>{config.data?.placeholder ? 'PLACEHOLDER DATA — not official County designations. Matches never automatically verify claims.' : 'Staff-maintained matching list. All claims still require staff verification.'}</p><p>ZIPs: {config.data?.zips.join(', ') || 'None'} · Census tracts: {config.data?.censusTracts.join(', ') || 'None'}</p>{config.isError && <p role="alert">Configuration could not be loaded.</p>}<button className="button outline" onClick={() => { if (config.data) { setZips(config.data.zips.join(', ')); setTracts(config.data.censusTracts.join(', ')); setPlaceholder(config.data.placeholder); setEditing(true); } }} disabled={!config.data}>Edit area list</button>
    {editing && <form onSubmit={async e => { e.preventDefault(); try { await update.mutateAsync({ data: { zips: zips.split(',').map(s => s.trim()).filter(Boolean), censusTracts: tracts.split(',').map(s => s.trim()).filter(Boolean), placeholder, updateNote: note.trim() } }); await config.refetch(); setEditing(false); setMessage('Configuration saved with your staff identity and update note.'); } catch { setMessage('Could not save. ZIPs must have five digits and a staff note is required.'); } }}>
      <label>ZIP codes, comma-separated<input className="input" value={zips} onChange={e => setZips(e.target.value)} /></label><label>Census tracts, comma-separated<input className="input" value={tracts} onChange={e => setTracts(e.target.value)} /></label><label className="checkbox-row"><input type="checkbox" checked={placeholder} onChange={e => setPlaceholder(e.target.checked)} /> This is placeholder data</label><label>Required update note<textarea className="textarea" required value={note} onChange={e => setNote(e.target.value)} /></label><button className="button teal" disabled={update.isPending || !note.trim()}>Save area configuration</button>
    </form>}{message && <p role="status">{message}</p>}
  </section>;
}