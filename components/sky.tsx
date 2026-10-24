// Day-concept decorations ("a library above the clouds"): purely decorative, hidden from assistive technology.
// Colours come from theme tokens through CSS classes in app/globals.css, so the dark theme can restyle them.

export function Sparkle({ className = "" }: { className?: string }) {
  return <svg className={`sparkle ${className}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 0C8.6 4.9 11.1 7.4 16 8C11.1 8.6 8.6 11.1 8 16C7.4 11.1 4.9 8.6 0 8C4.9 7.4 7.4 4.9 8 0Z" />
  </svg>;
}

// Overlapping circles of uneven size and height read as one cumulus edge. [cx, cy, r] in a 1200-wide repeat of a
// 2400x160 box: the box is wider than any hero, so "slice" always scales by height and never crops the cloud tops.
// The back layer is a translucent mist that drifts slowly unless motion is reduced.
const backPattern = [[40, 96, 62], [170, 86, 58], [300, 80, 64], [440, 92, 60], [570, 78, 62], [720, 90, 62], [850, 80, 64], [990, 88, 60], [1120, 80, 64]];
const frontPattern = [[0, 128, 64], [90, 112, 58], [180, 124, 50], [260, 100, 70], [360, 120, 56], [450, 108, 64], [550, 126, 50], [630, 98, 76], [740, 118, 58], [830, 104, 68], [930, 126, 48], [1010, 100, 72], [1110, 120, 56]];
const repeatAcross = (pattern: number[][]) => [-1200, 0, 1200, 2400].flatMap(offset => pattern.map(([cx, cy, r]) => [cx + offset, cy, r]));
const backPuffs = repeatAcross(backPattern);
const frontPuffs = repeatAcross(frontPattern);

export function CloudBank({ className = "" }: { className?: string }) {
  return <svg className={`cloud-bank ${className}`} viewBox="0 0 2400 160" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <g className="cloud-mist cloud-drift"><rect x="-1200" y="100" width="4800" height="60" />{backPuffs.map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} />)}</g>
    <g className="cloud-front"><rect x="-1200" y="128" width="4800" height="32" />{frontPuffs.map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} />)}</g>
  </svg>;
}

export function CloudIsland({ className = "" }: { className?: string }) {
  return <svg className={`cloud-island ${className}`} viewBox="0 0 560 140" aria-hidden="true" focusable="false">
    <g className="cloud-shade"><ellipse cx="280" cy="98" rx="236" ry="34" /><circle cx="120" cy="86" r="38" /><circle cx="200" cy="62" r="54" /><circle cx="290" cy="50" r="64" /><circle cx="380" cy="64" r="54" /><circle cx="456" cy="86" r="40" /></g>
    <g className="cloud-front"><ellipse cx="280" cy="104" rx="200" ry="30" /><circle cx="110" cy="104" r="26" /><circle cx="160" cy="92" r="40" /><circle cx="230" cy="72" r="52" /><circle cx="310" cy="70" r="58" /><circle cx="390" cy="90" r="42" /><circle cx="450" cy="104" r="28" /></g>
  </svg>;
}
