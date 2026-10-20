import type { CSSProperties } from 'react';
import type { PermitApplication } from './App';
import './worker-analytics.css';

const DAY_MS = 86_400_000;
const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const numberFormatter = new Intl.NumberFormat('en-US');
const decimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function validDate(value: string): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!match) return null;
  const day = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== match[0].slice(0, 10)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function size(value: number): CSSProperties {
  return { '--wa-size': `${Math.max(0, Math.min(100, value))}%` } as CSSProperties;
}

type Duration = { outcome: 'Approved' | 'Denied'; days: number };

export function WorkerAnalytics({ applications }: { applications: PermitApplication[] }) {
  const now = new Date();
  const firstMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1);
  const afterLastMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const months = Array.from({ length: 6 }, (_, index) => {
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1);
    return { start, label: monthFormatter.format(new Date(start)), count: 0 };
  });
  let undatedSubmissions = 0;

  const statusCounts = new Map<string, number>();
  let approved = 0;
  let denied = 0;
  const durations: Duration[] = [];
  let excludedDecisions = 0;

  for (const application of applications) {
    const submitted = validDate(application.submittedAt);
    if (submitted === null) {
      undatedSubmissions++;
    } else if (submitted >= firstMonth && submitted < afterLastMonth) {
      const date = new Date(submitted);
      const offset = (date.getUTCFullYear() - now.getUTCFullYear()) * 12
        + date.getUTCMonth() - (now.getUTCMonth() - 5);
      if (months[offset]) months[offset].count++;
    }

    const status = application.reviewStatus || 'Unspecified';
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    if (status !== 'Approved' && status !== 'Denied') continue;
    if (status === 'Approved') approved++;
    else denied++;

    const finalEvent = [...(application.timeline ?? [])].reverse()
      .find(event => event.label === 'Final County decision' && validDate(event.date) !== null);
    const decision = finalEvent ? validDate(finalEvent.date) : null;
    if (submitted === null || decision === null || decision < submitted) {
      excludedDecisions++;
      continue;
    }
    durations.push({ outcome: status, days: (decision - submitted) / DAY_MS });
  }

  const recentTotal = months.reduce((total, month) => total + month.count, 0);
  const maxMonth = Math.max(1, ...months.map(month => month.count));
  const decided = approved + denied;
  const rate = decided ? (approved / decided) * 100 : null;
  const average = durations.length
    ? durations.reduce((total, item) => total + item.days, 0) / durations.length
    : null;
  const outcomeAverages = (['Approved', 'Denied'] as const).map(outcome => {
    const values = durations.filter(item => item.outcome === outcome);
    return {
      outcome,
      count: values.length,
      average: values.length ? values.reduce((total, item) => total + item.days, 0) / values.length : null,
    };
  });
  const maxOutcomeAverage = Math.max(1, ...outcomeAverages.map(item => item.average ?? 0));
  const statuses = [...statusCounts.entries()]
    .sort(([labelA, countA], [labelB, countB]) => countB - countA || labelA.localeCompare(labelB));
  const maxStatus = Math.max(1, ...statuses.map(([, count]) => count));

  return (
    <section className="page worker-analytics" aria-label="Permit performance analytics" data-testid="section-worker-analytics">
      <div className="wa-heading">
        <p className="eyebrow">Staff performance · recorded data</p>
        <h2>Permit performance</h2>
        <p className="lead">Submission volume, recorded County decisions, and the current review mix. Figures use only the applications in this workspace.</p>
      </div>

      <div className="wa-grid">
        <article className="wa-panel" aria-labelledby="wa-volume-heading" data-testid="chart-permit-volume">
          <div className="wa-panel-head">
            <h3 id="wa-volume-heading">Permit volume by month</h3>
            <p>Submissions in the current month and five preceding calendar months (UTC).</p>
          </div>
          <div className="wa-panel-body">
            <strong className="wa-big-number" data-testid="value-recent-permit-volume">{numberFormatter.format(recentTotal)}</strong>
            <span className="wa-number-caption">applications submitted in this period</span>
            <div className="wa-month-chart" role="img" aria-label={`Monthly submissions: ${months.map(month => `${month.label}: ${month.count}`).join('; ')}`}>
              {months.map(month => (
                <div className="wa-month" key={month.start} data-testid={`chart-volume-month-${month.start}`}>
                  <span className="wa-month-value" data-testid={`value-volume-month-${month.start}`}>{month.count}</span>
                  <div className="wa-month-track" aria-hidden="true">
                    <span className="wa-month-bar" style={size(month.count / maxMonth * 100)} />
                  </div>
                  <span className="wa-month-label">{month.label}</span>
                </div>
              ))}
            </div>
            {recentTotal === 0 && <p className="wa-empty" data-testid="text-volume-empty">No submissions have a valid date in this six-month period.</p>}
            {undatedSubmissions > 0 && <p className="wa-footnote" data-testid="text-volume-excluded">{undatedSubmissions} application{undatedSubmissions === 1 ? '' : 's'} with an invalid or missing submission date excluded.</p>}
          </div>
        </article>

        <article className="wa-panel" aria-labelledby="wa-rate-heading" data-testid="chart-approval-rate">
          <div className="wa-panel-head">
            <h3 id="wa-rate-heading">Approval rate</h3>
            <p>Approved ÷ decided; decided means Approved or Denied, not pending or revisions.</p>
          </div>
          <div className="wa-panel-body">
            <strong className="wa-big-number" data-testid="value-approval-rate">{rate === null ? 'n/a' : `${decimalFormatter.format(rate)}%`}</strong>
            <span className="wa-number-caption" data-testid="value-decided-count">{numberFormatter.format(decided)} decided application{decided === 1 ? '' : 's'}</span>
            {rate === null ? (
              <p className="wa-empty" data-testid="text-approval-unavailable">No Approved or Denied applications are recorded, so an approval rate cannot be calculated.</p>
            ) : (
              <div className="wa-rate-track" role="img" aria-label={`${approved} approved out of ${decided} decided applications; approval rate ${decimalFormatter.format(rate)} percent`}>
                <span className="wa-rate-fill" style={size(rate)} />
              </div>
            )}
            <div className="wa-key">
              <span><i className="wa-swatch" aria-hidden="true" /> Approved <strong data-testid="value-approved-count">{approved}</strong></span>
              <span><i className="wa-swatch wa-denied" aria-hidden="true" /> Denied <strong data-testid="value-denied-count">{denied}</strong></span>
            </div>
          </div>
        </article>

        <article className="wa-panel" aria-labelledby="wa-time-heading" data-testid="chart-processing-time">
          <div className="wa-panel-head">
            <h3 id="wa-time-heading">Time to final County decision</h3>
            <p>Elapsed days from submission to the dated “Final County decision” timeline event.</p>
          </div>
          <div className="wa-panel-body">
            <strong className="wa-big-number" data-testid="value-average-processing-days">{average === null ? 'n/a' : `${decimalFormatter.format(average)} days`}</strong>
            <span className="wa-number-caption" data-testid="value-timed-decisions">{durations.length} dated decision{durations.length === 1 ? '' : 's'} included in the average</span>
            {average === null && <p className="wa-empty" data-testid="text-processing-unavailable">No Approved or Denied application has both a valid submission date and a dated final County decision at or after submission.</p>}
            <div className="wa-breakdown">
              <p className="wa-breakdown-title">Average by recorded outcome</p>
              <div className="wa-rows" role="img" aria-label={outcomeAverages.map(item => `${item.outcome}: ${item.average === null ? 'not available' : `${decimalFormatter.format(item.average)} days`}, ${item.count} dated decisions`).join('; ')}>
                {outcomeAverages.map(item => (
                  <div className="wa-row" key={item.outcome} data-testid={`chart-processing-${item.outcome.toLowerCase()}`}>
                    <div className="wa-row-top">
                      <span className="wa-row-label">{item.outcome} <span>({item.count})</span></span>
                      <strong className="wa-row-value" data-testid={`value-processing-${item.outcome.toLowerCase()}`}>{item.average === null ? 'n/a' : `${decimalFormatter.format(item.average)} days`}</strong>
                    </div>
                    <div className="wa-row-track" aria-hidden="true">
                      <div className={`wa-row-fill ${item.outcome === 'Denied' ? 'wa-muted' : ''}`} style={size((item.average ?? 0) / maxOutcomeAverage * 100)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {excludedDecisions > 0 && <p className="wa-footnote" data-testid="text-processing-excluded">{excludedDecisions} decided application{excludedDecisions === 1 ? '' : 's'} excluded from time calculations because a valid chronological date pair is unavailable.</p>}
          </div>
        </article>

        <article className="wa-panel" aria-labelledby="wa-status-heading" data-testid="chart-application-status">
          <div className="wa-panel-head">
            <h3 id="wa-status-heading">Applications by review status</h3>
            <p>Current reviewStatus across all {numberFormatter.format(applications.length)} applications.</p>
          </div>
          <div className="wa-panel-body">
            <strong className="wa-big-number" data-testid="value-application-total">{numberFormatter.format(applications.length)}</strong>
            <span className="wa-number-caption">applications in the workspace</span>
            {statuses.length === 0 ? (
              <p className="wa-empty" data-testid="text-status-empty">No applications are available to summarize.</p>
            ) : (
              <div className="wa-rows" role="img" aria-label={`Review status counts: ${statuses.map(([status, count]) => `${status}: ${count}`).join('; ')}`}>
                {statuses.map(([status, count]) => (
                  <div className="wa-row" key={status} data-testid={`chart-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                    <div className="wa-row-top">
                      <span className="wa-row-label">{status}</span>
                      <strong className="wa-row-value" data-testid={`value-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{count}</strong>
                    </div>
                    <div className="wa-row-track" aria-hidden="true">
                      <div className="wa-row-fill" style={size(count / maxStatus * 100)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}