import type { PermitApplication } from './App';
import { Link } from 'wouter';
import {
  ArrowRight, ArrowUpRight, Building2, CheckCircle2, ChevronRight, ClipboardList,
  FilePlus2, FolderOpen, HelpCircle, Info, MapPin, ShieldCheck, UserRound
} from 'lucide-react';
import './applicant-portal.css';
import { ClassificationCorrection } from './ReviewSafeguards';
import type { PermitApplication as ApiApplication } from '@workspace/api-client-react';
import { SavedApplicationsSection, AccountApplicationCard } from './SavedApplications';
import { useOwnedSavedApplications } from './hooks/use-owned-saved-applications';

type ApplicationsProps = { applications: PermitApplication[] };

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function statusTone(status: string) {
  if (status === 'Approved') return 'done';
  if (status === 'Revisions Required' || status === 'Denied') return 'revision';
  if (status === 'More Information Requested') return 'action';
  return 'review';
}

function Status({ value, id }: { value: string; id?: string }) {
  return <span className={`ap-status ${statusTone(value)}`} data-testid={id ? `status-application-${id}` : 'status-application'}>{value}</span>;
}

function RecordLink({ application }: { application: PermitApplication }) {
  return <Link href={`/applications/${encodeURIComponent(application.id)}`} className="ap-record ap-panel" data-testid={`link-record-${application.id}`}>
    <div className="ap-record-main">
      <h3>{application.projectName}</h3>
      <p className="ap-record-meta">{application.id} · {application.projectAddress}</p>
      <p className="ap-record-meta">Submitted {formatDate(application.submittedAt)}</p>
    </div>
    <div className="ap-record-right"><Status value={application.reviewStatus} id={application.id} /><ChevronRight aria-hidden="true" /></div>
  </Link>;
}

function EmptyRecords({ compact = false }: { compact?: boolean }) {
  return <div className="ap-empty ap-panel" data-testid="empty-applicant-records">
    <FolderOpen aria-hidden="true" />
    <h2>No submitted projects</h2>
    <p>Your submitted projects will appear here, together with their current status and documents.</p>
    <Link href="/new-application" className="ap-btn" data-testid={compact ? 'link-start-first-application-dashboard' : 'link-start-first-application-records'}><FilePlus2 aria-hidden="true" /> Start an application</Link>
  </div>;
}

export function RoleChooser({ onSelect }: { onSelect: (role: 'applicant' | 'worker') => void }) {
  return <main className="role-chooser">
    <section className="role-intro" aria-label="Santa Clara County Permit Portal introduction">
      <div className="role-brand"><span className="role-mark" aria-hidden="true">SC</span><span>Santa Clara County<br />Permit Portal</span></div>
      <div><h1>Santa Clara County <span>Permit Portal</span></h1><p>Follow a permit submission from the first documents to the final decision, with the information you need at each step.</p></div>
      <small>Independent educational portal · Not an official County service</small>
    </section>
    <section className="role-main" aria-labelledby="role-title">
      <p className="ap-kicker">Choose your view</p>
      <h2 id="role-title">How would you like to continue?</h2>
      <p>Explore the applicant experience or the County team workspace.</p>
      <div className="role-options">
        <button type="button" className="role-choice" onClick={() => onSelect('applicant')} data-testid="button-continue-applicant">
          <span className="role-choice-icon"><UserRound aria-hidden="true" /></span>
          <span className="role-choice-copy"><strong>Continue as Permit Applicant</strong><small>See your projects, documents, and status updates.</small></span>
          <ArrowRight aria-hidden="true" />
        </button>
        <button type="button" className="role-choice worker" onClick={() => onSelect('worker')} data-testid="button-continue-worker">
          <span className="role-choice-icon"><Building2 aria-hidden="true" /></span>
          <span className="role-choice-copy"><strong>Continue as City Worker</strong><small>Explore the staff review workspace.</small></span>
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
      <div className="role-demo-note"><Info aria-hidden="true" /><span>Sign in to access your own saved work and submissions. City Worker access requires administrator-assigned permissions. Selecting a view does not grant staff access. This is not an official County system.</span></div>
    </section>
  </main>;
}

export function ApplicantDashboard({ applications }: ApplicationsProps) {
  const drafts = useOwnedSavedApplications();
  const sorted = [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const awaiting = applications.filter(a => a.reviewStatus === 'More Information Requested' || a.reviewStatus === 'Revisions Required').length;
  const inProgress = applications.filter(a => !['Approved', 'Denied', 'Revisions Required'].includes(a.reviewStatus)).length;
  const savedInProgress = drafts.data?.filter(a => a.status === 'In progress').length ?? 0;
  const savedActionNeeded = drafts.data?.filter(a => a.status === 'Action needed').length ?? 0;
  const submittedCount = drafts.data?.filter(a => a.status === 'Submitted').length ?? 0;
  const savedCount = (drafts.data?.length ?? 0) - submittedCount;
  return <main className="page applicant-page">
    <header className="ap-hero">
      <div className="ap-hero-copy"><p className="ap-kicker">Applicant home</p><h1 className="ap-heading">My applications</h1><p className="ap-lede">View the applications associated with your account and review their current status.</p></div>
      <Link href="/new-application" className="ap-btn" data-testid="link-new-application-dashboard"><FilePlus2 aria-hidden="true" /> Start a new application</Link>
    </header>
    <section className="ap-summary" aria-label="Your application summary">
      <div className="ap-summary-item" data-testid="summary-total-applications"><span>Your applications</span><strong>{(drafts.data?.length ?? 0) + applications.length}</strong><small>{savedCount} saved · {submittedCount + applications.length} submitted</small></div>
      <div className="ap-summary-item" data-testid="summary-needs-attention"><span>May need your attention</span><strong>{awaiting + savedActionNeeded}</strong><small>Items requiring your attention</small></div>
      <div className="ap-summary-item" data-testid="summary-in-progress"><span>In progress</span><strong>{inProgress + savedInProgress + submittedCount}</strong><small>Saved work or pending review</small></div>
    </section>
    <SavedApplicationsSection />
    {sorted.length > 0 && <div className="ap-overview-grid">
      <section aria-labelledby="recent-projects-title">
        <div className="ap-section-heading"><div><h2 id="recent-projects-title">Recent applications</h2><p>Updates to your submitted applications.</p></div><Link href="/records" className="ap-text-link" data-testid="link-all-records-dashboard">All records <ArrowRight aria-hidden="true" /></Link></div>
        {sorted.length ? <div className="ap-record-list">{sorted.slice(0, 3).map(a => <RecordLink key={a.id} application={a} />)}</div> : <EmptyRecords compact />}
      </section>
      <aside className="ap-side-note">
        <ClipboardList aria-hidden="true" /><h2>Planning your submission?</h2>
        <p>Get your project description, address, and supporting plans together before you begin.</p>
        <Link href="/applications" className="ap-text-link" data-testid="link-applications-dashboard">Application guide <ArrowRight aria-hidden="true" /></Link>
      </aside>
    </div>}
  </main>;
}

export function ApplicantApplicationsPage({ applications }: ApplicationsProps) {
  const sorted = [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return <main className="page applicant-page">
    <header className="ap-hero"><div className="ap-hero-copy"><p className="ap-kicker">Applications</p><h1 className="ap-heading">My applications</h1><p className="ap-lede">View the applications associated with your account and review their current status.</p></div><Link href="/new-application" className="ap-btn" data-testid="link-new-application-applicant"><FilePlus2 aria-hidden="true" /> Start a new application</Link></header>
    <div className="ap-page-stack">
      <SavedApplicationsSection />
      <section className="ap-guidance-grid" aria-label="Submission preparation">
        <div className="ap-content-panel ap-panel"><p className="ap-kicker">Before you begin</p><h2>Have the essentials ready</h2><p>A clear application makes it easier to understand your proposed work. Document needs can vary by project type and the County's review.</p><ul className="ap-list"><li>Project address, description, permit type, and estimated cost</li><li>Architectural and structural plans, plus a site plan or survey</li><li>Owner authorization, fire and life safety plans, and Title 24 energy forms when applicable</li></ul></div>
        <aside className="ap-side-note"><HelpCircle aria-hidden="true" /><h2>Not sure what applies?</h2><p>Requirements can differ by scope. Review the guide before submitting; County staff make all final determinations.</p><Link href="/help" className="ap-text-link" data-testid="link-help-applications">Read the guidance <ArrowRight aria-hidden="true" /></Link></aside>
      </section>
      {sorted.length > 0 && <section aria-labelledby="applications-list-title"><div className="ap-section-heading"><div><h2 id="applications-list-title">Submitted applications</h2><p>Your submitted projects remain separate from saved work.</p></div><Link href="/records" className="ap-text-link" data-testid="link-records-applications">View submitted records <ArrowRight aria-hidden="true" /></Link></div><div className="ap-record-list">{sorted.map(a => <RecordLink key={a.id} application={a} />)}</div></section>}
    </div>
  </main>;
}

export function ApplicantRecordsPage({ applications }: ApplicationsProps) {
  const account = useOwnedSavedApplications();
  const submitted = account.accountApplications?.filter(application => application.status === 'Submitted') ?? [];
  const sorted = [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return <main className="page applicant-page">
    <header className="ap-hero"><div className="ap-hero-copy"><p className="ap-kicker">Your records</p><h1 className="ap-heading">A record of every step.</h1><p className="ap-lede">Find your current and past submissions here. Open a project for its documents and status history.</p></div><Link href="/new-application" className="ap-btn secondary" data-testid="link-new-application-records"><FilePlus2 aria-hidden="true" /> New application</Link></header>
    <section aria-labelledby="all-records-title"><div className="ap-section-heading"><h2 id="all-records-title">Your submitted projects ({submitted.length + applications.length})</h2></div>
      {account.isPending && <p role="status">Loading submitted projects…</p>}
      {account.isError && <p role="alert">Could not load submitted projects. <button onClick={() => account.refetch()}>Retry</button></p>}
      <div className="ap-record-list">{submitted.map(record => <AccountApplicationCard key={record.id} record={record} />)}{sorted.map(a => <RecordLink key={a.id} application={a} />)}</div>
      {account.isSuccess && submitted.length + sorted.length === 0 && <EmptyRecords />}
    </section>
  </main>;
}

export function ApplicantDetailPage({ application, onSaved }: { application?: PermitApplication; onSaved: (app: ApiApplication) => void }) {
  if (!application) return <main className="page applicant-page"><div className="ap-empty ap-panel"><ShieldCheck aria-hidden="true" /><h1 className="ap-heading">This application is unavailable.</h1><p>We could not find a project you can view at this address. Check your records for applications available to you.</p><Link href="/records" className="ap-btn" data-testid="link-back-records-unavailable"><FolderOpen aria-hidden="true" /> Go to your records</Link></div></main>;
  const a = application;
  return <main className="page applicant-page">
    <div className="ap-hero"><div className="ap-hero-copy"><Link href="/records" className="ap-text-link" data-testid="link-back-records-detail">Your records <ChevronRight aria-hidden="true" /></Link><p className="ap-kicker" style={{ marginTop: 24 }}>Project details</p><h1 className="ap-heading" data-testid="text-project-name">{a.projectName}</h1><p className="ap-lede"><MapPin size={15} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />{a.projectAddress}</p></div><div><span className="ap-id" data-testid="text-application-id">{a.id}</span><div style={{ marginTop: 10 }}><Status value={a.reviewStatus} id={a.id} /></div></div></div>
    {a.verification_status === 'Unverified' && (a.claimed_affordable || a.claimed_underserved) && <p className="priority-pending" data-testid="priority-under-review">Priority claim under review</p>}
    {a.ruleChecks?.safetyCriticalFlags.length ? <div className="safety-critical" role="alert"><h2>Safety-Critical</h2>{a.ruleChecks.safetyCriticalFlags.map(f => <p key={f}>{f}</p>)}</div> : null}
    <p className={a.requiredReviewers?.length ? 'rule-alert' : ''}>{a.ruleChecks?.completenessLabel}</p>
    <ClassificationCorrection key={a.id} application={a} onSaved={onSaved} />
    <div className="ap-detail-grid">
      <div className="ap-page-stack">
        <section className="ap-panel ap-content-panel" aria-labelledby="project-title"><h2 id="project-title">Project overview</h2><dl className="ap-facts"><div><dt>Permit type</dt><dd>{a.permitType}</dd></div><div><dt>Project type</dt><dd>{a.projectType}</dd></div><div><dt>Submitted</dt><dd>{formatDate(a.submittedAt)}</dd></div><div><dt>Applicant</dt><dd>{a.applicantName}</dd></div></dl>{a.description && <p style={{ margin: '22px 0 0', paddingTop: 18, borderTop: '1px solid #e2ebf0' }}>{a.description}</p>}</section>
        <section className="ap-panel ap-content-panel" aria-labelledby="documents-title"><h2 id="documents-title">Submitted documents</h2><p>Stored documents can be downloaded only by their owner or authorized staff.</p>{a.documents.length ? a.documents.map((doc, index) => <div className="ap-document" key={`${doc.category}-${doc.label}-${index}`} data-testid={`document-${index}`}><div><strong>{doc.label}</strong><small>{doc.category}{doc.required ? ' · Usually required' : ' · Additional document'}{doc.received && doc.fileName ? ` · ${doc.fileName}` : ''}</small>{doc.objectPath && <a href={`/api/storage${doc.objectPath}`} target="_blank" rel="noopener noreferrer">Download document</a>}</div><span className={`ap-document-state ${doc.received ? '' : 'missing'}`} data-testid={`status-document-${index}`}>{doc.received ? 'Received' : 'Not received'}</span></div>) : <p>No documents are listed for this application.</p>}</section>
      </div>
      <div className="ap-page-stack">
        <section className="ap-panel ap-content-panel" aria-labelledby="timeline-title"><h2 id="timeline-title">Status timeline</h2><p>Your project's recorded progress. Upcoming steps are estimates, not a decision or guarantee of timing.</p><ol className="ap-timeline">{a.timeline.map((event, index) => <li className={event.status} key={`${event.label}-${index}`} data-testid={`timeline-step-${index}`}><span className="ap-timeline-dot" aria-hidden="true" /><div><strong>{event.label === 'AI pre-screening' ? 'Initial completeness check' : event.label}</strong><small>{event.date ? formatDate(event.date) : event.status === 'upcoming' ? 'Upcoming' : 'In progress'}</small></div></li>)}</ol></section>
        <aside className="ap-side-note"><Info aria-hidden="true" /><h2>Questions about this project?</h2><p>For current requirements and official contact options, visit the County website. Decisions are made by authorized personnel.</p><Link href="/help" className="ap-text-link" data-testid="link-help-detail">Find help <ArrowRight aria-hidden="true" /></Link></aside>
      </div>
    </div>
  </main>;
}

export function ApplicantHelpPage() {
  return <main className="page applicant-page">
    <header className="ap-hero"><div className="ap-hero-copy"><p className="ap-kicker">Help & guidance</p><h1 className="ap-heading">Good preparation starts here.</h1><p className="ap-lede">A short guide to the information and documents commonly needed for a permit submission.</p></div><Link href="/new-application" className="ap-btn" data-testid="link-new-application-help"><FilePlus2 aria-hidden="true" /> Start an application</Link></header>
    <div className="ap-guidance-grid">
      <div className="ap-page-stack">
        <section className="ap-content-panel ap-panel" aria-labelledby="steps-title"><p className="ap-kicker">The process</p><h2 id="steps-title">How to get started</h2><ol className="ap-list"><li>Describe the work, the project address, and the permit type as clearly as you can.</li><li>Prepare plans and any ownership or project-specific supporting materials.</li><li>Submit your application, then check your records for status updates and document receipt.</li><li>If more information is requested, consult the official County guidance for how to respond.</li></ol></section>
        <section className="ap-content-panel ap-panel" aria-labelledby="required-documents-title"><p className="ap-kicker">Document checklist</p><h2 id="required-documents-title">Core materials to consider</h2><ul className="ap-list"><li>Architectural plans showing the proposed work</li><li>Structural plans and a site plan or survey</li><li>Owner authorization, if someone other than the owner is applying</li><li>Fire and life safety plans and Title 24 energy forms, where applicable</li><li>Planning or zoning forms, where required for your project</li></ul><p style={{ margin: '16px 0 0' }}>This is a general guide, not a determination of what your project requires. Confirm requirements through official County resources.</p></section>
      </div>
      <aside className="ap-page-stack">
        <div className="ap-side-note"><Building2 aria-hidden="true" /><h2>Official County information</h2><p>For verified contact details, permit rules, forms, and current procedures, use the County of Santa Clara website.</p><a href="https://www.santaclaracounty.gov/" target="_blank" rel="noopener noreferrer" className="ap-text-link" data-testid="link-official-county-website">Visit the official County website <ArrowUpRight aria-hidden="true" /></a></div>
        <div className="ap-panel ap-content-panel"><CheckCircle2 aria-hidden="true" style={{ width: 21, color: '#0067a5', marginBottom: 12 }} /><h2>Your own project history</h2><p>Once you submit, your application record keeps the status and received-document list together.</p><Link href="/records" className="ap-text-link" data-testid="link-records-help">View your records <ArrowRight aria-hidden="true" /></Link></div>
        <p className="ap-disclaimer">This is an independent educational portal, not an official County website. Information here does not replace County instructions or decisions.</p>
      </aside>
    </div>
  </main>;
}