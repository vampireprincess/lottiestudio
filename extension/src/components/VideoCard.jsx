import { useEffect, useState } from 'react';
import { Clock3, Play, Video, LoaderCircle } from 'lucide-react';

function durationLabel(seconds) {
  if (!Number.isFinite(seconds)) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoCard({ page, detected, info, loading }) {
  const [brokenImage, setBrokenImage] = useState(false);
  const thumbnail = info?.thumbnail || (detected?.isVideo ? page?.thumbnail : null);
  useEffect(() => setBrokenImage(false), [thumbnail]);
  const platform = detected?.platform;
  const hasVideo = !!detected?.isVideo;
  const title = hasVideo ? (info?.title || page?.title || `${platform} video`) :
    platform ? `Open a ${platform} video` : 'Your video goes here';
  const uploader = hasVideo ? (info?.uploader || page?.uploader || 'Ready to save offline') :
    platform ? 'Navigate to a single post, Reel or video.' : 'Open a supported page or paste a video link.';

  return (
    <div className="overflow-hidden rounded-[20px] border border-line bg-card shadow-card">
      <div className="relative h-[116px] overflow-hidden bg-[#27372c]">
        {thumbnail && !brokenImage ? (
          <img src={thumbnail} alt="Video thumbnail" className="h-full w-full object-cover" onError={() => setBrokenImage(true)} />
        ) : (
          <div className="hero-pattern absolute inset-0 flex items-center justify-center">
            <div className="absolute -right-9 -top-16 h-60 w-60 rounded-full border border-white/10" />
            <div className="absolute -right-2 -top-9 h-44 w-44 rounded-full border border-white/10" />
            <div className="absolute -bottom-20 -left-14 h-44 w-44 rounded-full bg-[#a7cc83]/10 blur-2xl" />
            <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-[19px] border border-white/20 bg-white/10 shadow-xl backdrop-blur-sm">
              {loading ? <LoaderCircle className="h-7 w-7 animate-spin text-[#d9f9b4]" /> : <Play className="ml-1 h-7 w-7 fill-[#d9f9b4] text-[#d9f9b4]" />}
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d1c14]/65 via-transparent to-[#102116]/10" />
        <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.11em] text-white backdrop-blur-lg">
          <span className={`h-[6px] w-[6px] rounded-full ${platform === 'TikTok' ? 'bg-[#80e7dd]' : platform === 'Instagram' ? 'bg-[#f0afbd]' : platform === 'Facebook' ? 'bg-[#91baff]' : 'bg-[#bce58d]'}`} />
          {platform || 'No video selected'}
        </div>
        {durationLabel(info?.duration) && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <Clock3 size={11} /> {durationLabel(info.duration)}
          </div>
        )}
      </div>
      <div className="flex min-h-[63px] items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-soft text-foreground">
          <Video size={17} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-1 text-[13px] font-semibold leading-5 text-foreground" title={title}>{title}</h2>
          <p className="line-clamp-1 text-[11px] leading-5 text-subtle">{loading && !info ? 'Finding video details…' : uploader}</p>
        </div>
      </div>
    </div>
  );
}
