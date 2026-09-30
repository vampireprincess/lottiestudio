import { Headphones, SignalHigh, SignalMedium, Sparkles } from 'lucide-react';

const choices = [
  { value: 'best', label: 'Best', hint: 'Original', icon: Sparkles },
  { value: '1080', label: '1080p', hint: 'Up to FHD', icon: SignalHigh },
  { value: '720', label: '720p', hint: 'Up to HD', icon: SignalMedium },
  { value: 'audio', label: 'Audio', hint: 'MP3 only', icon: Headphones },
];

export function QualityPicker({ value, onChange, heights = [] }) {
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Download quality">
      {choices.map(({ value: option, label, hint, icon: Icon }) => {
        const unavailable = (option === '1080' || option === '720') && heights.length > 0 && !heights.some((h) => h <= Number(option));
        const active = value === option;
        return (
          <button key={option} type="button" role="radio" aria-checked={active} disabled={unavailable} onClick={() => onChange(option)}
            title={unavailable ? 'This resolution is not available for the selected video' : hint}
            className={`flex min-h-[68px] flex-col items-start justify-between rounded-[13px] border px-2.5 py-2.5 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-accent-border bg-accent-soft shadow-[0_0_0_1px_var(--accent-border)]' : 'border-line bg-card hover:border-hover-line hover:bg-soft'}`}>
            <Icon size={17} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-accent-ink' : 'text-subtle'} />
            <span className="block leading-none"><strong className="block text-[12px] font-semibold text-foreground">{label}</strong><span className="mt-1 block text-[9px] text-subtle">{unavailable ? 'Not available' : hint}</span></span>
          </button>
        );
      })}
    </div>
  );
}
