export function BrandMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0 rounded-[12px] shadow-sm">
      <rect width="40" height="40" rx="12" fill="#19251D" />
      <path d="M11 11h18M11 17h12" stroke="#BCE58D" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M20 21v9m0 0-4.3-4.3M20 30l4.3-4.3M12 32h16" stroke="#BCE58D" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
