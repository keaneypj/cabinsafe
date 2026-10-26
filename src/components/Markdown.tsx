import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe markdown renderer for Copilot answers and briefings.
 * Supports headings (#, ##), bullet lists (two nesting levels), **bold**,
 * _italic_, `code` and citation labels like [CSI-CAT-003 v1.1 §2].
 * Produces React elements only — never injects raw HTML.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[A-Z]{2,4}-[A-Z0-9-]+ v[\d.]+ §\d+\]|(?<![\w])_[^_]+_(?![\w]))/g;

function inline(text: string, key: string): ReactNode[] {
  return text.split(INLINE).filter((s) => s !== "").map((part, i) => {
    const k = `${key}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={k}>{part.slice(1, -1)}</code>;
    if (/^\[[A-Z]{2,4}-/.test(part)) return <span key={k} className="cite">{part}</span>;
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) return <em key={k}>{part.slice(1, -1)}</em>;
    return <Fragment key={k}>{part}</Fragment>;
  });
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: { text: string; children: string[] }[] = [];
  const flush = (k: number) => {
    if (!list.length) return;
    out.push(
      <ul key={`ul-${k}`}>
        {list.map((li, i) => (
          <li key={i}>
            {inline(li.text, `li-${k}-${i}`)}
            {li.children.length > 0 && (
              <ul>
                {li.children.map((c, j) => (
                  <li key={j}>{inline(c, `lic-${k}-${i}-${j}`)}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };
  lines.forEach((raw, i) => {
    const sub = raw.match(/^\s{2,}[-*] (.*)$/);
    const top = raw.match(/^[-*] (.*)$/);
    if (sub && list.length) {
      list[list.length - 1].children.push(sub[1]);
      return;
    }
    if (top) {
      list.push({ text: top[1], children: [] });
      return;
    }
    flush(i);
    if (raw.startsWith("# ")) out.push(<h1 key={i}>{inline(raw.slice(2), `h1-${i}`)}</h1>);
    else if (raw.startsWith("## ")) out.push(<h2 key={i}>{inline(raw.slice(3), `h2-${i}`)}</h2>);
    else if (raw.trim()) out.push(<p key={i}>{inline(raw, `p-${i}`)}</p>);
  });
  flush(lines.length);
  return <div className={`md-body text-[0.875rem] leading-relaxed text-slate ${className ?? ""}`}>{out}</div>;
}
