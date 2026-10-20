import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronRight, FilePenLine, FolderOpen, MapPin } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListSavedApplicationsQueryKey, useUpdateSavedApplication,
  type SavedApplication,
} from '@workspace/api-client-react';
import { usePortalProfile } from './PortalProfile';
import { useOwnedSavedApplications } from './hooks/use-owned-saved-applications';
import './saved-applications.css';
import { AccountApplicationHistory } from './AccountApplicationHistory';
import { formatAccountDate as formattedDate } from './account-application-format';

export function AccountApplicationCard({ record }: { record: SavedApplication }) {
  const submitted = record.status === 'Submitted';
  return <article className="ap-panel saved-card" data-testid={`saved-application-${record.id}`}>
    <div className="saved-card-heading">
      <div><p className="ap-kicker">{submitted ? 'SUBMITTED APPLICATION' : 'SAVED APPLICATION'}</p><h3>{record.projectName}</h3></div>
      <span className="saved-status">{record.status}</span>
    </div>
    <p className="ap-record-meta">{record.applicationNumber}</p>
    <p className="ap-record-meta"><MapPin size={15} aria-hidden="true" /> {record.projectAddress}</p>
    <dl className="saved-facts">
      <div><dt>Application type</dt><dd>{record.applicationType}</dd></div>
      <div><dt>Current status</dt><dd>{record.status}</dd></div>
      <div><dt>{submitted ? 'Submitted date' : 'Date saved'}</dt><dd>{formattedDate(record.submissionDate ?? record.dateSaved)}</dd></div>
      <div><dt>Last updated</dt><dd>{formattedDate(record.lastUpdated)}</dd></div>
    </dl>
    <div className="saved-actions">
      <Link href={`/saved-applications/${record.id}${submitted ? '' : '/edit'}`} className="ap-btn"><FilePenLine size={16} aria-hidden="true" /> {submitted ? 'View application' : 'Continue application'}</Link>
      <Link href={`/saved-applications/${record.id}`} className="ap-text-link">View details <ChevronRight size={16} aria-hidden="true" /></Link>
    </div>
  </article>;
}

export function SavedApplicationsSection() {
  const records = useOwnedSavedApplications();
  return <section className="saved-section" aria-labelledby="saved-applications-title">
    <div className="ap-section-heading"><div><h2 id="saved-applications-title">Your applications</h2><p>Manage your saved applications and continue any projects in progress.</p></div></div>
    {records.isPending && <p role="status">Loading your applications…</p>}
    {records.isError && <div className="ap-panel ap-content-panel" role="alert">Applications could not be loaded. <button className="ap-text-link" onClick={() => records.refetch()}>Retry</button></div>}
    {records.accountApplications?.length ? <div className="saved-card-grid">{records.accountApplications.map(record => <AccountApplicationCard key={record.id} record={record} />)}</div> : null}
    {records.isSuccess && !records.data?.length && <div className="ap-panel ap-content-panel"><FolderOpen aria-hidden="true" /><p>No saved applications for this account.</p><Link href="/new-application" className="ap-text-link">Start an application <ChevronRight size={16} aria-hidden="true" /></Link></div>}
  </section>;
}

export function SavedApplicationPage({ id, editing }: { id: string; editing: boolean }) {
  const profile = usePortalProfile();
  const records = useOwnedSavedApplications();
  const record = records.data?.find(item => item.id === id);
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const update = useUpdateSavedApplication();
  const [form, setForm] = useState({ projectName: '', projectAddress: '', applicationType: '', description: '' });
  useEffect(() => {
    if (record) setForm({
      projectName: record.projectName, projectAddress: record.projectAddress,
      applicationType: record.applicationType, description: record.description,
    });
  }, [record?.id, editing]);

  if (records.isPending) return <main className="page applicant-page" role="status">Loading application…</main>;
  if (records.isError) return <main className="page applicant-page" role="alert">Unable to load your saved application. <button onClick={() => records.refetch()}>Retry</button></main>;
  if (!record) return <main className="page applicant-page" role="alert"><h1>Application not found</h1><p>This application is not available to your account.</p><Link href="/applications">Back to your applications</Link></main>;
  const submitted = record.status === 'Submitted';
  const editMode = editing && !submitted;
  const currentStatus = submitted ? 'Submitted — awaiting initial review' : record.status;

  return <main className="page applicant-page">
    <header className="ap-hero"><div className="ap-hero-copy">
      <Link href="/applications" className="ap-text-link">← Your applications</Link>
      <p className="ap-kicker" style={{ marginTop: 22 }}>{submitted ? 'SUBMITTED APPLICATION' : 'SAVED APPLICATION'}</p>
      <h1 className="ap-heading">{editMode ? 'Continue application' : record.projectName}</h1>
      <p className="ap-lede">{record.applicationNumber} · {currentStatus}</p>
    </div></header>
    <div className="ap-panel ap-content-panel saved-detail">
      {editMode ? <form onSubmit={async event => {
        event.preventDefault();
        try {
          const saved = await update.mutateAsync({ id: record.id, data: form });
          client.setQueryData<SavedApplication[]>(
            [...getListSavedApplicationsQueryKey(), profile.id],
            previous => previous?.map(item => item.id === saved.id ? saved : item),
          );
          await client.invalidateQueries({ queryKey: getListSavedApplicationsQueryKey() });
          navigate(`/saved-applications/${record.id}`);
        } catch { /* An inline error below retains the entered fields. */ }
      }}>
        <label>Project name<input className="input" required maxLength={180} value={form.projectName} onChange={event => setForm({ ...form, projectName: event.target.value })} /></label>
        <label>Address<input className="input" required maxLength={240} value={form.projectAddress} onChange={event => setForm({ ...form, projectAddress: event.target.value })} /></label>
        <label>Application type<input className="input" required maxLength={100} value={form.applicationType} onChange={event => setForm({ ...form, applicationType: event.target.value })} /></label>
        <label>Project details<textarea className="input" maxLength={2000} rows={4} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
        <p className="ap-record-meta">Saving changes keeps this application in progress. It does not submit a permit for review.</p>
        {update.isError && <p role="alert">Could not save changes. Please retry.</p>}
        <div className="saved-actions"><button type="submit" className="ap-btn" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</button><Link href={`/saved-applications/${record.id}`} className="ap-text-link">Cancel</Link></div>
      </form> : <>
        <dl className="saved-facts">
          <div><dt>Applicant name</dt><dd>{record.applicantName}</dd></div>
          <div><dt>Application number</dt><dd>{record.applicationNumber}</dd></div>
          <div><dt>Project name</dt><dd>{record.projectName}</dd></div>
          <div><dt>Address</dt><dd>{record.address}</dd></div>
          <div><dt>Application type</dt><dd>{record.applicationType}</dd></div>
          <div><dt>Current status</dt><dd>{currentStatus}</dd></div>
          <div><dt>{submitted ? 'Submission date' : 'Date saved'}</dt><dd>{formattedDate(record.submissionDate ?? record.dateSaved)}</dd></div>
          <div><dt>Last updated</dt><dd>{formattedDate(record.lastUpdated)}</dd></div>
        </dl>
        <p>{record.description}</p>
        <p className="ap-record-meta">Synthetic account presentation data. This is not an official City submission or an approved permit.</p>
        {!submitted && <Link href={`/saved-applications/${record.id}/edit`} className="ap-btn"><FilePenLine size={16} aria-hidden="true" /> Continue application</Link>}
      </>}
    </div>
    {!editMode && <AccountApplicationHistory application={record} />}
  </main>;
}