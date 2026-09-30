import { useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, FolderOpen, HardDriveDownload, Moon, RefreshCw, ShieldCheck, Sun, Monitor, Wifi, WifiOff } from 'lucide-react';
import { QualityPicker } from './QualityPicker.jsx';

export function SettingsView({ settings, onChange, onBack, helper, helperError, onRefresh, preview }) {
  const [copied, setCopied] = useState(false);
  const id = !preview ? chrome.runtime.id : '(visible after loading in Chrome)';
  async function copyId() {
    try { await navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* Chrome may deny clipboard in preview. */ }
  }
  return (
    <div className="space-y-5 pb-5">
      <div className="flex items-center gap-3"><button type="button" onClick={onBack} aria-label="Back to downloader" className="icon-button"><ArrowLeft size={18} /></button><div><h1 className="text-[17px] font-bold tracking-[-0.03em] text-foreground">Settings</h1><p className="text-[11px] text-subtle">Your downloads, your device.</p></div></div>

      <section className="settings-section">
        <div className="flex items-center justify-between"><h2 className="settings-heading"><HardDriveDownload size={15} /> Local helper</h2><button type="button" onClick={onRefresh} className="icon-button !h-7 !w-7" title="Check connection" aria-label="Check helper connection"><RefreshCw size={14} /></button></div>
        <div className={`mt-3 flex items-center gap-2 rounded-[11px] px-3 py-2.5 text-[11px] font-semibold ${helper ? 'bg-success-soft text-success-icon' : 'bg-error-soft text-error-icon'}`}>
          {helper ? <Wifi size={15} /> : <WifiOff size={15} />}{helper ? `Connected · yt-dlp ${helper.ytDlpVersion}` : 'Not connected'}
        </div>
        {!helper && <p className="mt-2 text-[11px] leading-[1.6] text-subtle">{helperError || 'Build and load the extension, then install the Python helper using the ID below. See README.md for steps.'}</p>}
        {helper && !helper.ffmpeg && <p className="mt-2 text-[11px] leading-[1.6] text-error-icon">FFmpeg is missing. Install it, restart Chrome, then check again.</p>}
        <div className="mt-3 border-t border-line pt-3"><p className="field-label">YOUR EXTENSION ID</p><div className="mt-1.5 flex items-center justify-between gap-2 rounded-[9px] bg-soft px-2.5 py-2"><code className="truncate text-[10px] text-foreground">{id}</code><button type="button" onClick={copyId} className="shrink-0 text-subtle hover:text-foreground" title="Copy extension ID" aria-label="Copy extension ID">{copied ? <Check size={14} /> : <Copy size={14} />}</button></div></div>
      </section>

      <section className="settings-section">
        <h2 className="settings-heading"><FolderOpen size={15} /> Save location</h2>
        <p className="mt-2 break-all rounded-[9px] bg-soft px-2.5 py-2 font-mono text-[10px] text-foreground">{helper?.outputDir || '~/Downloads/Framekeeper'}</p>
        <p className="mt-2 text-[10px] leading-[1.5] text-subtle">Videos are organized by platform. Change the folder with the helper installer’s <code>--output-dir</code> option.</p>
      </section>

      <section className="settings-section">
        <h2 className="settings-heading"><ShieldCheck size={15} /> Access & quality</h2>
        <label htmlFor="cookies" className="field-label mt-3 block">BROWSER COOKIES</label>
        <select id="cookies" value={settings.cookies} onChange={(event) => onChange({ cookies: event.target.value })} className="field-input mt-1.5 w-full">
          <option value="none">No cookies (public videos)</option>
          <option value="chrome">Google Chrome (signed-in posts)</option>
          <option value="firefox">Firefox</option>
          <option value="edge">Microsoft Edge</option>
          <option value="brave">Brave</option>
        </select>
        <p className="mt-2 text-[10px] leading-[1.5] text-subtle">yt-dlp reads cookies locally from your browser; they never enter the extension. Some signed-in posts still fail, and private Facebook videos are not supported.</p>
        <p className="field-label mb-2 mt-4">DEFAULT QUALITY</p>
        <QualityPicker value={settings.quality} onChange={(quality) => onChange({ quality })} />
      </section>

      <section className="settings-section">
        <h2 className="settings-heading"><Sun size={15} /> Appearance & alerts</h2>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-[10px] bg-soft p-1">
          {[['system', Monitor, 'System'], ['light', Sun, 'Light'], ['dark', Moon, 'Dark']].map(([value, Icon, label]) => <button key={value} type="button" onClick={() => onChange({ theme: value })} className={`flex items-center justify-center gap-1.5 rounded-[7px] py-2 text-[11px] font-medium transition-colors ${settings.theme === value ? 'bg-card text-foreground shadow-sm' : 'text-subtle hover:text-foreground'}`} aria-pressed={settings.theme === value}><Icon size={13} />{label}</button>)}
        </div>
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-4"><span><span className="block text-[11px] font-semibold text-foreground">Download notifications</span><span className="mt-0.5 block text-[10px] text-subtle">Get notified when the file is ready.</span></span><input type="checkbox" checked={settings.notifications} onChange={(event) => onChange({ notifications: event.target.checked })} className="switch-checkbox" /></label>
      </section>
      <p className="flex items-center justify-center gap-1 text-[10px] text-subtle">Powered by the open-source <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline underline-offset-2">yt-dlp <ExternalLink size={10} /></a> engine.</p>
    </div>
  );
}
