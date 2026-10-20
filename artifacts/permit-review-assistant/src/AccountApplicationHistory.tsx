import type { SavedApplication } from '@workspace/api-client-react';
import { formatAccountDate } from './account-application-format';

export function AccountApplicationHistory({ application }: { application: SavedApplication }) {
  const required = application.documents.filter(document => document.required);
  const received = application.documents.filter(document => document.uploadStatus === 'Received');
  return <div className="ap-page-stack account-history">
    <section className="ap-panel ap-content-panel" aria-labelledby="account-documents-title">
      <h2 id="account-documents-title">Documents</h2>
      {application.documents.length > 0 ? <>
        <div className="account-document-summary"><strong>{received.length} documents received</strong>
          {required.length > 0 && required.every(document => document.uploadStatus === 'Received') && <span>Required documents complete</span>}
        </div>
        <p className="ap-record-meta">Synthetic document metadata for presentation only. Dates and file sizes are illustrative; no actual PDF files are attached or verified.</p>
        {application.documents.map(document => <article className="account-document" key={document.fileName}>
          <div className="saved-card-heading"><h3>{document.name}</h3><span className="saved-status">{document.uploadStatus}</span></div>
          <p className="account-document-filename">{document.fileName}</p>
          <p>{document.required ? 'Required' : 'Supporting document'} · {document.category}</p>
          <p className="ap-record-meta">Upload date: {formatAccountDate(document.uploadDate)} · PDF · {(document.fileSize / 1024).toLocaleString('en-US')} KB</p>
          <details><summary>View document information</summary>
            <dl className="saved-facts">
              <div><dt>Document name</dt><dd>{document.name}</dd></div>
              <div><dt>File name</dt><dd>{document.fileName}</dd></div>
              <div><dt>Category</dt><dd>{document.category}</dd></div>
              <div><dt>Requirement</dt><dd>{document.required ? 'Required' : 'Supporting document'}</dd></div>
              <div><dt>Upload status</dt><dd>{document.uploadStatus}</dd></div>
              <div><dt>Upload date</dt><dd>{formatAccountDate(document.uploadDate)}</dd></div>
              <div><dt>File type</dt><dd>{document.fileType}</dd></div>
              <div><dt>Illustrative file size</dt><dd>{document.fileSize.toLocaleString('en-US')} bytes</dd></div>
            </dl>
            <p>This entry contains synthetic metadata, not a downloadable plan or authorization.</p>
          </details>
        </article>)}
      </> : <p>No documents have been added to this saved application.</p>}
    </section>
    <section className="ap-panel ap-content-panel" aria-labelledby="account-timeline-title">
      <h2 id="account-timeline-title">Application timeline</h2>
      <ol className="ap-timeline">{application.timeline.map(event => <li className={event.status} key={event.label}>
        <span className="ap-timeline-dot" aria-hidden="true" /><div><strong>{event.label}</strong>
          <small>{event.date ? formatAccountDate(event.date) : 'Upcoming — awaiting initial review'}</small></div>
      </li>)}</ol>
      {!application.timeline.length && <p>Application saved · {formatAccountDate(application.dateSaved)}</p>}
    </section>
    <section className="ap-panel ap-content-panel" aria-labelledby="account-next-steps-title">
      <h2 id="account-next-steps-title">Next steps</h2>
      {application.status === 'Submitted' ? <p>No action is requested for this presentation record. Initial review is the next stage; no review decision has been recorded. For an actual permit, use the official jurisdiction’s submission process.</p>
        : <p>Continue your application to refine the project information and prepare the materials needed for submission.</p>}
    </section>
  </div>;
}