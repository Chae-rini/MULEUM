import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Heading({ title, description, eyebrow }: { title: string; description: string; eyebrow: string }) {
  return <div className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lead">{description}</p></div>;
}
export function Feedback({ error, success }: { error?: string; success?: string }) {
  return <>{error && <p className="notice error" role="alert">{error}</p>}{success && !error && <p className="notice success" role="status">{success}</p>}</>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
export function Field({ name, label, placeholder, maxLength, required = false, value = "", multiline = true }: { name: string; label: string; placeholder?: string; maxLength: number; required?: boolean; value?: string; multiline?: boolean }) {
  const props = { id: name, name, placeholder, maxLength, required, defaultValue: value };
  return <div className="field"><label htmlFor={name}>{label}</label>{multiline ? <textarea {...props} rows={3} /> : <input {...props} type="text" />}<span className="hint">최대 {maxLength}자{required ? " · 필수" : " · 선택"}</span></div>;
}
