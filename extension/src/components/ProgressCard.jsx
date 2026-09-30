import { AlertCircle, Check, Copy, FolderOpen, LoaderCircle, X } from 'lucide-react';

const labels = {
  extracting: 'Finding your video', downloading: 'Saving to your computer',
  processing: 'Finishing the file', canceling: 'Canceling download',
  complete: 'Saved successfully', error: 'Download failed', canceled: 'Download canceled',
};

function fileSize(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = value >= 1024 ** 3 ? 'GB' : value >= 1024 ** 2 ? 'MB' : 'KB';
  const divisor = unit === 'GB' ? 1024 ** 3 : unit === 'MB' ? 1024 ** 2 : 1024;
  return `${(value / divisor).toFixed(1)} ${unit}`;
}

export function ProgressCard({ job, onCancel, onOpenFolder, onCopyPath }) {
  if (!job) return null;
  const active = ['extracting', 'downloading', 'processing', 'canceling'].includes(job.status);
  const success = job.status === 'complete';
  const isError = job.status === 'error';
  const percent = typeof job.percent === 'number' ? job.percent : null;
  const amount = fileSize(job.downloadedBytes);
  const total = fileSize(job.totalBytes);
  return (
    <section className={`rounded-[18px] border p-3.5 ${success ? 'border-success-line bg-success-soft' : isError ? 'border-error-line bg-error-soft' : 'border-line bg-card'}`} aria-live="polite">
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${success ? 'bg-success-soft text-success-icon' : isError ? 'bg-error-soft text-error-icon' : 'bg-soft text-foreground'}`}>
          {success ? <Check size={17} strokeWidth={2.4} /> : isError ? <AlertCircle size={17} /> : active ? <LoaderCircle size={17} className="animate-spin" /> : <X size={16} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><h3 className="text-[12px] font-semibold text-foreground">{labels[job.status] || 'Preparing download'}</h3>{active && percent !== null && <span className="font-mono text-[11px] font-semibold text-foreground">{percent}%</span>}</div>
          <p className="mt-0.5 truncate text-[11px] text-subtle" title={success ? job.path : job.title}>{success ? job.filename : isError ? job.error : job.status === 'canceled' ? 'No new file was saved.' : job.title}</p>
        </div>
      </div>
      {active && (
        <>
          <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-track"><div className={`h-full rounded-full bg-progress transition-[width] duration-300 ${percent === null ? 'indeterminate' : ''}`} style={percent === null ? undefined : { width: `${percent}%` }} /></div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-subtle">
            <span>{amount ? `${amount}${total ? ` / ${total}` : ''}` : job.status === 'processing' ? 'Merging streams with FFmpeg' : 'This can take a moment'}</span>
            {job.status !== 'canceling' && <button type="button" className="font-semibold text-foreground hover:underline" onClick={onCancel}>Cancel</button>}
          </div>
        </>
      )}
      {success && (
        <div className="mt-3 flex gap-2 border-t border-success-line pt-3">
          <button type="button" onClick={onOpenFolder} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground hover:underline"><FolderOpen size={13} /> Open Downloads</button>
          <span className="text-subtle">·</span>
          <button type="button" onClick={onCopyPath} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground hover:underline"><Copy size={12} /> Copy file path</button>
        </div>
      )}
    </section>
  );
}
