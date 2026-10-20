import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListPermitApplicationsQueryKey, useAnalyzePermitIntake } from '@workspace/api-client-react';
import type { IntakeAnalysis, IntakeEvidence, IntakeFinding, PermitApplication as ApiPermitApplication } from '@workspace/api-client-react';
import { AlertTriangle, FileSearch, LoaderCircle, X } from 'lucide-react';
import './IntakeAnalysisPanel.css';

type IntakeApplication = {
  id: string;
  intakeAnalysis?: IntakeAnalysis | null;
  documents: { label: string; category: string; required: boolean; received: boolean }[];
};

type Props = {
  application: IntakeApplication;
  onSaved: (saved: ApiPermitApplication) => void;
};

const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

function EvidenceButton({ finding }: { finding: IntakeFinding }) {
  const [open, setOpen] = useState(false);
  const available = finding.evidence.length > 0;
  const dialogRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, [tabindex="0"]') ?? []);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      buttonRef.current?.focus();
    };
  }, [open]);
  return <>
    <button
      ref={buttonRef}
      type="button"
      className="intake-evidence-button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      data-testid={`button-view-ai-evidence-${finding.key}`}
    >
      <FileSearch size={14} /> View AI Evidence
    </button>
    {open && <div className="intake-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section
        ref={dialogRef}
        className="intake-evidence-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`evidence-title-${finding.key}`}
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}
        data-testid={`dialog-ai-evidence-${finding.key}`}
      >
        <div className="intake-dialog-heading">
          <div><span className="intake-kicker">Intake evidence</span><h3 id={`evidence-title-${finding.key}`}>{finding.label}</h3></div>
          <button type="button" className="intake-close" aria-label="Close evidence details" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        {finding.value === null
          ? <p className="intake-no-evidence" role="status">Evidence unavailable. No supporting evidence was returned for this finding.</p>
          : available
            ? <div className="intake-evidence-list">{finding.evidence.map((item: IntakeEvidence, index: number) => <article className="intake-evidence-item" key={`${item.source}-${item.sourceField}-${index}`}>
              <dl>
                <div><dt>Source</dt><dd>{item.source}</dd></div>
                <div><dt>Source field</dt><dd>{item.sourceField}</dd></div>
                {item.documentName && <div><dt>Filename</dt><dd>{item.documentName}</dd></div>}
                {item.page !== null && <div><dt>Page</dt><dd>{item.page}</dd></div>}
              </dl>
              <blockquote>{item.quote}</blockquote>
            </article>)}</div>
            : <p className="intake-no-evidence" role="status">Evidence unavailable for this finding.</p>}
        {finding.note && <p className="intake-dialog-note">{finding.note}</p>}
      </section>
    </div>}
  </>;
}

function FindingRow({ finding }: { finding: IntakeFinding }) {
  return <article className="intake-finding" data-testid={`finding-${finding.key}`}>
    <div className="intake-finding-copy">
      <div className="intake-finding-label">{finding.label}</div>
      <div className={`intake-finding-value ${finding.value === null ? 'is-not-found' : ''}`}>{finding.value === null ? 'Not found in submitted documents' : finding.value}</div>
      {finding.note && <p className="intake-finding-note">{finding.note}</p>}
    </div>
    <div className="intake-finding-actions">
      <span className={`intake-confidence confidence-${finding.confidence.toLowerCase()}`}>{finding.confidence} confidence</span>
      <EvidenceButton finding={finding} />
    </div>
  </article>;
}

export function IntakeAnalysisPanel({ application, onSaved }: Props) {
  const queryClient = useQueryClient();
  const analyze = useAnalyzePermitIntake();
  const [saveError, setSaveError] = useState('');
  const analysis = application.intakeAnalysis;

  const runAnalysis = async () => {
    if (analyze.isPending) return;
    setSaveError('');
    try {
      const saved = await analyze.mutateAsync({ id: application.id });
      onSaved(saved);
      await queryClient.invalidateQueries({ queryKey: getListPermitApplicationsQueryKey() });
    } catch {
      setSaveError('The intake analysis could not be saved. Check the connection and try again.');
    }
  };

  return <section className="intake-panel card" aria-labelledby="intake-panel-title" data-testid="panel-ai-intake-analysis">
    <header className="intake-panel-header">
      <div className="intake-title-line"><span className="intake-icon"><FileSearch size={18} /></span><div><span className="intake-kicker">Staff aid · application-only</span><h2 id="intake-panel-title">AI intake summary</h2></div></div>
      {analysis?.status === 'completed' && <button type="button" className="button outline intake-run-button" onClick={runAnalysis} disabled={analyze.isPending} data-testid="button-rerun-intake-analysis">
        {analyze.isPending ? <><LoaderCircle className="intake-spin" size={15} /> Analyzing…</> : 'Re-run analysis'}
      </button>}
    </header>
    <div className="intake-panel-body">
      <div className="intake-scope-notice">
        <strong>Application text only.</strong> The checklist status is simulated; no files were analyzed. Confidence is advisory and does not verify documents. Do not treat this as an official eligibility decision.
      </div>

      {!analysis && <div className="intake-not-ready">
        <div className="intake-not-ready-copy"><h3>Analysis not yet run</h3><p>This older database record has no saved intake summary. Run an analysis to review application text alongside the simulated checklist.</p></div>
        <button type="button" className="button teal intake-run-button" onClick={runAnalysis} disabled={analyze.isPending} data-testid="button-run-intake-analysis">
          {analyze.isPending ? <><LoaderCircle className="intake-spin" size={15} /> Analyzing…</> : <><FileSearch size={15} /> Run AI Intake Analysis</>}
        </button>
      </div>}

      {analysis?.status === 'failed' && <div className="intake-failure" role="alert" data-testid="status-intake-analysis-failed">
        <AlertTriangle size={18} /><div><h3>Intake analysis failed</h3><p>{analysis.error || 'The analysis could not be completed.'}</p></div>
        <button type="button" className="button outline intake-run-button" onClick={runAnalysis} disabled={analyze.isPending} data-testid="button-retry-intake-analysis">
          {analyze.isPending ? <><LoaderCircle className="intake-spin" size={15} /> Retrying…</> : 'Retry analysis'}
        </button>
      </div>}

      {analysis?.status === 'completed' && <>
        <div className="intake-analysis-meta"><span>Analyzed {dateLabel(analysis.analyzedAt)}</span><span>Model: {analysis.model}</span><span>Mode: application text only</span></div>
        {analysis.error && <div className="intake-failure compact" role="alert"><AlertTriangle size={16} /><p>{analysis.error}</p></div>}
        <div className="intake-metrics" aria-label="Intake analysis counts">
          <div className="intake-metric"><span>Files analyzed</span><strong>{analysis.actualDocumentsAnalyzed}</strong><small>None accessed by this analysis</small></div>
          <div className="intake-metric"><span>Checklist submitted</span><strong>{analysis.checklistSubmitted}</strong><small>Simulated categories</small></div>
          <div className="intake-metric"><span>Required expected</span><strong>{analysis.requiredDocumentsExpected}</strong><small>Checklist expectations</small></div>
          <div className="intake-metric"><span>Missing required</span><strong>{analysis.missingRequired}</strong><small>Checklist status only</small></div>
          <div className="intake-metric"><span>Potential mismatches</span><strong>{analysis.potentialDocumentMismatches === null ? 'Not assessed' : analysis.potentialDocumentMismatches}</strong><small>Not document verification</small></div>
          <div className="intake-metric"><span>Staff verification</span><strong>{analysis.needsStaffVerification}</strong><small>Items to review</small></div>
        </div>

        <section className="intake-fields-section" aria-labelledby="intake-fields-title">
          <div className="intake-section-heading"><div><h3 id="intake-fields-title">Extracted application fields</h3><p>Every value is an advisory extraction, grounded in the returned evidence where available.</p></div><span className="intake-count">{analysis.fields.length} fields</span></div>
          {analysis.fields.length ? <div className="intake-findings">{analysis.fields.map(finding => <FindingRow key={finding.key} finding={finding} />)}</div> : <p className="intake-empty">No extracted fields were returned.</p>}
        </section>

        <div className="intake-legal-note" role="note"><AlertTriangle size={17} /><p>Any potential SB35, AB2162, SB330, or Density Bonus context is not a legal eligibility determination. Staff verification is required; the summary must not change application priority, routing, or review actions.</p></div>
      </>}
      {saveError && <div className="intake-save-error" role="alert" data-testid="error-save-intake-analysis">{saveError}</div>}
    </div>
  </section>;
}

export default IntakeAnalysisPanel;
