// Sky decorations: small ✦ stars by day, a night sky after dark. Purely decorative, hidden from assistive technology.
// Colours come from theme tokens through CSS classes in app/globals.css, so the dark theme can restyle them.

export function Sparkle({ className = "" }: { className?: string }) {
  return <svg className={`sparkle ${className}`} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="M8 0C8.6 4.9 11.1 7.4 16 8C11.1 8.6 8.6 11.1 8 16C7.4 11.1 4.9 8.6 0 8C4.9 7.4 7.4 4.9 8 0Z" />
  </svg>;
}

// Night only (hidden by CSS in the light theme). A fixed-seed generator places the stars, so every render and every
// screen shows the same sky; one star in six twinkles slowly, and reduced motion stops it.
function seeded(seed: number) {
  let x = seed >>> 0;
  return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const nextStar = seeded(20261024);
const stars = Array.from({ length: 70 }, (_, i) => ({
  cx: Math.round(nextStar() * 1000), cy: Math.round(nextStar() * 560), r: [0.8, 1.1, 1.6][Math.floor(nextStar() * 3)],
  twinkle: i % 6 === 0, delay: (i % 7) * 1.1,
}));

export function NightSky() {
  return <div className="night-sky" aria-hidden="true">
    <div className="galaxy" />
    <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" focusable="false">
      {stars.map((star, i) => <circle key={i} cx={star.cx} cy={star.cy} r={star.r} className={star.twinkle ? "twinkle" : undefined} style={star.twinkle ? { animationDelay: `${star.delay}s` } : undefined} />)}
    </svg>
  </div>;
}
