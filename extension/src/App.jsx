import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Clipboard, Download, Globe2, Link2, LoaderCircle, LockKeyhole, PencilLine, Settings2, X } from 'lucide-react';
import { BrandMark } from './components/BrandMark.jsx';
import { VideoCard } from './components/VideoCard.jsx';
import { QualityPicker } from './components/QualityPicker.jsx';
import { ProgressCard } from './components/ProgressCard.jsx';
import { HistoryPanel } from './components/HistoryPanel.jsx';
import { SettingsView } from './components/SettingsView.jsx';
import { detectVideoUrl, firstVideoLink } from './lib/platform.js';

const PREVIEW = !globalThis.chrome?.runtime?.id;
const DEFAULT_SETTINGS = { quality: 'best', cookies: 'none', theme: 'system', notifications: true };
const DEMO_PAGE = { url: 'https://www.tiktok.com/@weekend/video/1234567890123', title: 'A little moment worth keeping', uploader: '@weekend', thumbnail: null };
const DEMO_INFO = { ...DEMO_PAGE, platform: 'TikTok', duration: 28, heights: [1080, 720] };
const ACTIVE = new Set(['extracting', 'downloading', 'processing', 'canceling']);

async function request(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error || 'The extension could not complete this request.');
  return response.data;
}

function resolvedTheme(choice) {
  return choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function hostLabel(url) {
  try { return new URL(url).hostname || url; }
  catch { return url || 'Open a TikTok, Instagram or Facebook video'; }
}

export function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [view, setView] = useState('home');
  const [helper, setHelper] = useState(null);
  const [helperError, setHelperError] = useState('');
  const [checkingHelper, setCheckingHelper] = useState(false);
  const [page, setPage] = useState(PREVIEW ? DEMO_PAGE : null);
  const [source, setSource] = useState('tab');
  const [pasted, setPasted] = useState('');
  const [inputError, setInputError] = useState('');
  const [info, setInfo] = useState(PREVIEW ? DEMO_INFO : null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [quality, setQuality] = useState('best');
  const [filename, setFilename] = useState('');
  const [job, setJob] = useState(null);
  const [history, setHistory] = useState([]);
  const [actionError, setActionError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const activeTabId = useRef(null);
  const linkInput = useRef(null);
  const submittingRef = useRef(false);

  const detected = source === 'paste' ? (firstVideoLink(pasted) || detectVideoUrl(pasted)) : detectVideoUrl(page?.url);
  const videoUrl = detected?.isVideo ? detected.url : null;
  const busy = !!(job && ACTIVE.has(job.status) && job.url === videoUrl);
  const canDownload = videoUrl && helper?.ffmpeg && !busy && !submitting && !PREVIEW;

  useEffect(() => {
    const update = () => document.documentElement.classList.toggle('dark', resolvedTheme(settings.theme));
    update();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [settings.theme]);

  async function refreshPage() {
    if (PREVIEW) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) { setPage(null); return; }
      activeTabId.current = tab.id;
      let context;
      try { context = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTEXT' }); }
      catch { context = null; }
      // The tab URL, not a page-controlled canonical tag, is the source of truth.
      setPage({ url: tab.url || '', title: context?.title || tab.title || '',
        thumbnail: context?.thumbnail || null, uploader: context?.uploader || '' });
    } catch { setPage(null); }
  }

  async function checkHelper() {
    if (PREVIEW) return;
    setCheckingHelper(true);
    try { setHelper(await request('HELLO')); setHelperError(''); }
    catch (error) { setHelper(null); setHelperError(error.message); }
    finally { setCheckingHelper(false); }
  }

  useEffect(() => {
    if (PREVIEW) return;
    let active = true;
    chrome.storage.local.get('settings').then((data) => {
      if (!active) return;
      const next = { ...DEFAULT_SETTINGS, ...data.settings };
      setSettings(next);
      setQuality(next.quality);
    });
    request('GET_STATE').then((state) => {
      if (!active) return;
      setJob(state.jobs[state.latestJobId] || null);
      setHistory(state.history || []);
    }).catch((error) => { if (active) setActionError(error.message); });
    refreshPage();
    checkHelper();
    const onStorage = (changes, area) => {
      if (area !== 'local') return;
      if (changes.jobs || changes.history || changes.latestJobId) {
        chrome.storage.local.get(['jobs', 'history', 'latestJobId']).then((state) => {
          if (!active) return;
          setJob(state.jobs?.[state.latestJobId] || null);
          setHistory(state.history || []);
        });
      }
    };
    const onTabChanged = (_tabId, change) => {
      if (_tabId === activeTabId.current && (change.url || change.status === 'complete')) refreshPage();
    };
    const onMessage = (message) => { if (message?.type === 'TAB_CHANGED' && message.tabId === activeTabId.current) refreshPage(); };
    chrome.storage.onChanged.addListener(onStorage);
    chrome.tabs.onUpdated.addListener(onTabChanged);
    chrome.tabs.onActivated.addListener(refreshPage);
    chrome.runtime.onMessage.addListener(onMessage);
    return () => {
      active = false;
      chrome.storage.onChanged.removeListener(onStorage);
      chrome.tabs.onUpdated.removeListener(onTabChanged);
      chrome.tabs.onActivated.removeListener(refreshPage);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  useEffect(() => {
    if (PREVIEW) return;
    setInfo(null);
    setInfoError('');
    setInfoLoading(false);
    if (!videoUrl || !helper) return;
    let canceled = false;
    const timer = setTimeout(async () => {
      setInfoLoading(true);
      try { const result = await request('INFO', { url: videoUrl }); if (!canceled) setInfo(result); }
      catch (error) { if (!canceled) setInfoError(error.message); }
      finally { if (!canceled) setInfoLoading(false); }
    }, 250);
    return () => { canceled = true; clearTimeout(timer); };
  }, [videoUrl, helper, settings.cookies]);

  async function saveSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.quality) setQuality(patch.quality);
    if (!PREVIEW) {
      try { await chrome.storage.local.set({ settings: next }); }
      catch (error) { setActionError(`Could not save settings: ${error.message}`); }
    }
  }

  async function pasteLink() {
    setSource('paste');
    setInputError('');
    requestAnimationFrame(() => linkInput.current?.focus());
    if (PREVIEW) { setPasted(DEMO_PAGE.url); return; }
    try {
      const text = await navigator.clipboard.readText();
      setPasted(text.trim());
      if (!firstVideoLink(text)) setInputError('No supported video link was found. Paste a direct post link below.');
    } catch { setInputError('Clipboard access was denied. Paste the link into the field below.'); }
  }

  async function download() {
    if (!canDownload || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setActionError('');
    try {
      const result = await request('DOWNLOAD', { url: videoUrl, quality, filename: filename.trim(), title: info?.title || page?.title || '', thumbnail: info?.thumbnail || page?.thumbnail });
      // Storage may already have received a very fast completion before this reply.
      setJob((current) => current?.id === result.id && ['complete', 'error', 'canceled'].includes(current.status) ? current : result);
    } catch (error) { setActionError(error.message); }
    finally { submittingRef.current = false; setSubmitting(false); }
  }

  async function cancel() {
    if (!job) return;
    try {
      const result = await request('CANCEL', { id: job.id });
      setJob((current) => current?.id === result.id && ['complete', 'error', 'canceled'].includes(current.status) ? current : result);
    } catch (error) { setActionError(error.message); }
  }

  async function clearHistory() {
    try {
      const state = await request('CLEAR_HISTORY');
      setHistory(state.history);
      setJob(state.jobs[state.latestJobId] || null);
    } catch (error) { setActionError(error.message); }
  }

  async function copyPath() {
    if (!job?.path) return;
    try { await navigator.clipboard.writeText(job.path); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setActionError('Could not copy the path. You can find the file in your Downloads/Framekeeper folder.'); }
  }

  function openDownloads() {
    if (!PREVIEW) chrome.downloads.showDefaultFolder();
  }

  return (
    <main className="popup-shell">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div className="flex items-center gap-2.5"><BrandMark size={36} /><div><p className="text-[16px] font-extrabold leading-[1.05] tracking-[-0.055em] text-foreground">framekeeper<span className="text-[#7fae5a]">.</span></p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.17em] text-subtle">Your offline collection</p></div></div>
        <button type="button" onClick={() => setView(view === 'settings' ? 'home' : 'settings')} aria-label={view === 'home' ? 'Open settings' : 'Close settings'} className={`icon-button ${view === 'settings' ? 'bg-soft' : ''}`}><Settings2 size={17} strokeWidth={1.8} /></button>
      </header>
      <div className="mx-5 h-px bg-line" />
      <div className="px-5 pt-4">
        {view === 'settings' ? (
          <SettingsView settings={settings} onChange={saveSettings} onBack={() => setView('home')} helper={helper} helperError={helperError} onRefresh={checkHelper} preview={PREVIEW} />
        ) : (
          <div className="space-y-4 pb-4">
            {PREVIEW && <div className="rounded-[11px] border border-accent-border bg-accent-soft px-3 py-2 text-[11px] font-medium text-foreground">UI preview only · Load the built extension in Chrome for real downloads.</div>}
            <div className="flex items-center justify-between"><div><p className="eyebrow">READY WHEN YOU ARE</p><h1 className="mt-1 text-[20px] font-bold leading-[1.15] tracking-[-0.055em] text-foreground">Keep the good stuff.</h1></div><div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${helper ? 'border-success-line bg-success-soft text-success-icon' : 'border-line bg-soft text-subtle'}`} title={helper ? 'Local helper connected' : 'Local helper not connected'}><span className={`h-[6px] w-[6px] rounded-full ${helper ? 'bg-success-icon' : 'bg-subtle'}`} />{helper ? 'LOCAL / READY' : checkingHelper ? 'CHECKING…' : 'LOCAL / OFFLINE'}</div></div>

            {!PREVIEW && !helper && !checkingHelper && <div role="alert" className="flex gap-2.5 rounded-[12px] border border-error-line bg-error-soft p-3 text-[11px] leading-[1.5] text-foreground"><AlertCircle size={16} className="mt-0.5 shrink-0 text-error-icon" /><div><strong>Connect your local helper.</strong><p className="mt-0.5 text-subtle">{helperError || 'Install the Python helper using your extension ID.'} <button type="button" className="font-semibold text-foreground underline underline-offset-2" onClick={() => setView('settings')}>View settings</button></p></div></div>}
            {helper && !helper.ffmpeg && <div role="alert" className="flex gap-2 rounded-[11px] border border-error-line bg-error-soft p-3 text-[11px] text-foreground"><AlertCircle size={15} className="shrink-0 text-error-icon" />Install FFmpeg, restart Chrome, then check the helper in Settings.</div>}

            <div>
              <div className="mb-2 flex items-center justify-between"><p className="eyebrow">VIDEO SOURCE</p>{source === 'paste' ? <button type="button" onClick={() => { setSource('tab'); setPasted(''); setInputError(''); setActionError(''); }} className="text-[11px] font-semibold text-accent-ink hover:underline">Use current tab</button> : <button type="button" onClick={pasteLink} className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-ink hover:underline"><Clipboard size={13} /> Paste a link</button>}</div>
              {source === 'paste' ? <div className="relative"><Link2 size={15} className="pointer-events-none absolute left-3 top-3.5 text-subtle" /><input ref={linkInput} type="url" aria-label="Video link" placeholder="Paste a TikTok, Reel or Facebook link" value={pasted} onChange={(event) => { setPasted(event.target.value); setInputError(''); setActionError(''); }} className="field-input has-icon w-full !py-[10px] pr-8" /><button type="button" aria-label="Clear pasted link" onClick={() => setPasted('')} className="absolute right-3 top-3 text-subtle hover:text-foreground"><X size={15} /></button></div> : <div className="flex min-w-0 items-center gap-2.5 rounded-[11px] border border-line bg-card px-3 py-2.5"><Globe2 size={15} className="shrink-0 text-accent-ink" /><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold text-foreground">Current browser tab</p><p className="truncate text-[10px] text-subtle" title={page?.url}>{hostLabel(page?.url)}</p></div><span className="shrink-0 rounded-md bg-soft px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-subtle">AUTO</span></div>}
              {inputError && <p className="mt-1.5 text-[10px] text-error-icon">{inputError}</p>}
            </div>

            <VideoCard page={source === 'paste' ? null : page} detected={detected} info={info} loading={infoLoading} />
            {infoError && videoUrl && <p role="alert" className="flex items-start gap-1.5 text-[10px] leading-4 text-error-icon"><AlertCircle size={13} className="mt-0.5 shrink-0" />Could not load video details: {infoError} You can still try downloading.</p>}

            <section className="space-y-2.5"><div className="flex items-baseline justify-between"><p className="eyebrow">DOWNLOAD OPTIONS</p><span className="text-[10px] text-subtle">Choose your format</span></div><QualityPicker value={quality} onChange={setQuality} heights={info?.heights || []} /></section>
            <div><label htmlFor="filename" className="eyebrow mb-2 block">CUSTOM FILENAME <span className="font-normal normal-case tracking-normal text-subtle">· optional</span></label><div className="relative"><PencilLine size={14} className="absolute left-3 top-[11px] text-subtle" /><input id="filename" type="text" maxLength={90} value={filename} onChange={(event) => setFilename(event.target.value)} className="field-input has-icon w-full" placeholder="Use the original video title" /></div><p className="mt-1.5 text-[10px] text-subtle">The video ID is added to avoid overwriting files.</p></div>

            <div className="sticky-download-footer space-y-2">
              {actionError && <p role="alert" className="flex items-start gap-1.5 rounded-[10px] bg-error-soft px-3 py-2 text-[10px] text-error-icon"><AlertCircle size={13} className="shrink-0" />{actionError}</p>}
              <button type="button" onClick={download} disabled={!canDownload} className="primary-button group flex w-full items-center justify-center gap-2.5 rounded-[12px] px-4 py-3 text-[12px] font-bold tracking-[-0.01em] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} strokeWidth={2.2} />}{submitting ? 'Starting download…' : busy ? 'Download in progress' : !videoUrl ? 'Select a video to download' : quality === 'audio' ? 'Save audio locally' : 'Save video locally'}<ArrowRight size={15} className="ml-auto transition-transform group-enabled:group-hover:translate-x-0.5" /></button>
            </div>
            {job && <ProgressCard job={job} onCancel={cancel} onOpenFolder={openDownloads} onCopyPath={copyPath} />}
            {copied && <p role="status" className="flex items-center justify-center gap-1.5 text-[10px] text-success-icon"><Check size={12} /> File path copied</p>}
            <HistoryPanel history={history} onClear={clearHistory} onVisit={(url) => { if (!PREVIEW && detectVideoUrl(url)) chrome.tabs.create({ url }); }} />
            <footer className="flex items-center justify-center gap-1.5 pb-0.5 text-[10px] text-subtle"><LockKeyhole size={11} /> Saved on your device. No cloud. No paid API.</footer>
          </div>
        )}
      </div>
    </main>
  );
}
