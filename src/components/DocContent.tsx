// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import type { ReactNode } from "react";

/** Renders the light markup used by company H&S documents: "## " heading, "- " bullet, "| a | b |" table row. */
export function DocContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (line.startsWith("## ")) {
      out.push(<h4 key={key++} style={{ margin: "16px 0 6px" }}>{line.slice(3)}</h4>);
      i++;
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) items.push(lines[i++].slice(2));
      out.push(
        <ul key={key++} style={{ margin: "4px 0 8px", paddingLeft: 20 }}>
          {items.map((t, n) => <li key={n}>{t}</li>)}
        </ul>,
      );
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++].split("|").slice(1, -1).map((c) => c.trim()));
      const [head, ...body] = rows;
      out.push(
        <table key={key++} style={{ margin: "8px 0" }}>
          <thead><tr>{head.map((c, n) => <th key={n}>{c}</th>)}</tr></thead>
          <tbody>{body.map((r, n) => <tr key={n}>{r.map((c, m) => <td key={m}>{c}</td>)}</tr>)}</tbody>
        </table>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !lines[i].startsWith("## ") && !lines[i].startsWith("- ") && !lines[i].startsWith("|")) para.push(lines[i++]);
      out.push(<p key={key++} style={{ margin: "6px 0", whiteSpace: "pre-wrap" }}>{para.join("\n")}</p>);
    }
  }
  return <div>{out}</div>;
}
