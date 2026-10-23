import type { CSSProperties } from "react";

// Vendored Lucide SVGs; ISC/MIT notices are in public/icons/LICENSE.txt.
const symbols: Record<string, string> = {
  "⌂": "house", "▧": "megaphone", "↗": "arrow-up-right", "○": "users", "◇": "users", "▷": "play",
  "?": "circle-question-mark", "✎": "notebook-pen", "◎": "target", "▤": "book-open", "◈": "users",
  "♡": "heart-handshake", "♧": "sprout", "⊙": "shield-check", "☰": "menu", "✕": "x", "✳": "lightbulb",
};
export function Icon({ name, className = "" }: { name: string; className?: string }) {
  const file = symbols[name] ?? (Object.values(symbols).includes(name) ? name : "book-open");
  return <span aria-hidden="true" className={`lucide-icon ${className}`} style={{ "--icon-url": `url('/icons/${file}.svg')` } as CSSProperties} />;
}
