import { useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, Clock3, History, Trash2, X } from 'lucide-react';

function shortDate(value) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
  catch { return ''; }
}

const colors = { TikTok: 'bg-[#87d8d0]', Instagram: 'bg-[#f1b2bd]', Facebook: 'bg-[#9ebff2]' };
export function HistoryPanel({ history = [], onClear, onVisit }) {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <section className="overflow-hidden rounded-[17px] border border-line bg-card">
      <button type="button" className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-soft" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="flex items-center gap-2.5 text-[12px] font-semibold text-foreground"><History size={16} className="text-subtle" /> Recent downloads <span className="rounded-md bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-subtle">{history.length}</span></span>
        <ChevronDown size={15} className={`text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-line px-3.5 pb-3 pt-1">
        {history.length ? (
          <>
            <div className="max-h-[210px] overflow-y-auto">
              {history.slice(0, 8).map((job) => <div key={job.id} className="flex items-center gap-2.5 border-b border-line py-2.5 last:border-0">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[9px] font-black text-[#183026] ${colors[job.platform] || 'bg-mint'}`}>{job.platform === 'TikTok' ? 'T' : job.platform === 'Instagram' ? 'IG' : 'f'}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-foreground" title={job.title}>{job.title || `${job.platform} video`}</p><span className="flex items-center gap-1 text-[10px] text-subtle"><Clock3 size={10} /> {shortDate(job.finishedAt || job.startedAt)} <span className="px-0.5">·</span> {job.status === 'complete' ? 'Saved' : job.status === 'canceled' ? 'Canceled' : 'Failed'}</span></div>
                {job.status === 'complete' ? <Check size={15} className="shrink-0 text-success-icon" /> : <X size={15} className="shrink-0 text-error-icon" />}
                <button type="button" onClick={() => onVisit(job.url)} title="Open original page" aria-label={`Open original page for ${job.title}`} className="rounded-md p-1 text-subtle hover:bg-soft hover:text-foreground"><ArrowUpRight size={14} /></button>
              </div>)}
            </div>
            <div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-subtle">Clearing history won’t delete files.</span><button type="button" onClick={() => confirmClear ? (onClear(), setConfirmClear(false)) : setConfirmClear(true)} className="flex items-center gap-1 text-[10px] font-semibold text-subtle hover:text-foreground"><Trash2 size={11} /> {confirmClear ? 'Confirm clear' : 'Clear'}</button></div>
          </>
        ) : <p className="px-1 py-3 text-[11px] text-subtle">Your saved videos will appear here. Close the popup while downloading — it keeps going.</p>}
      </div>}
    </section>
  );
}
