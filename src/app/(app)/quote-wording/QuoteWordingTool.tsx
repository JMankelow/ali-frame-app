"use client";

import { useMemo, useState } from "react";

const DEFAULT_INSTALL_LINES = [
  "Delivery to site is included",
  "WANZ sill pans and head flashings are allowed for to all units",
  "Scaffolding allowance is included",
  "Price includes the removal of existing joinery and installation of new joinery with internal foam seals, standard unpainted architraves and unpainted external facings, scribers and weather seals. This quote includes our standard architraves; any special architraves will be an additional cost unless stated.",
  "Removal of the old joinery from site is included.",
  "Please note that existing blinds or shutters may not fit once the new joinery is installed.",
  "No preparation or painting is included.",
].join("\n");

function linesFrom(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function formatTotal(total: number): string {
  return `Total $${total.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + GST`;
}

export function QuoteWordingTool() {
  const [customer, setCustomer] = useState("");
  const [address, setAddress] = useState("");
  const [total, setTotal] = useState("0");
  const [scopeType, setScopeType] = useState("Supply and Installation of:");
  const [itemsInput, setItemsInput] = useState("");
  const [suite, setSuite] = useState("");
  const [colour, setColour] = useState("");
  const [hardware, setHardware] = useState("");
  const [specialHardware, setSpecialHardware] = useState("");
  const [restrictors, setRestrictors] = useState("");
  const [glazing, setGlazing] = useState("");
  const [obscure, setObscure] = useState("");
  const [liners, setLiners] = useState("");
  const [installInput, setInstallInput] = useState(DEFAULT_INSTALL_LINES);
  const [copyStatus, setCopyStatus] = useState("");

  const specLines = useMemo(
    () => [suite, colour, hardware, specialHardware, restrictors, glazing, obscure, liners].map((s) => s.trim()).filter(Boolean),
    [suite, colour, hardware, specialHardware, restrictors, glazing, obscure, liners]
  );
  const items = useMemo(() => linesFrom(itemsInput), [itemsInput]);
  const installLines = useMemo(() => linesFrom(installInput), [installInput]);
  const totalNumber = parseFloat(total) || 0;

  async function handleCopy() {
    const parts = [
      `${customer.trim() || "Customer"} - Quote Wording`,
      ...(address.trim() ? [address.trim()] : []),
      "",
      formatTotal(totalNumber),
      "",
      scopeType,
      items.join("\n"),
      "",
      specLines.join("\n"),
      "",
      installLines.join("\n"),
    ];
    const text = parts.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied to clipboard — paste directly into NextMinute.");
    } catch {
      setCopyStatus("Could not copy automatically — select the preview text below and copy manually.");
    }
  }

  return (
    <div>
      <div className="notice">
        <strong>Quote Wording:</strong> build copy-ready quote wording to paste into NextMinute. This tool does not
        send a quote, price the installation or produce the supplier schedule — it only prepares the wording text.
      </div>

      <div className="card">
        <div className="label">Job Details</div>
        <div className="form">
          <div>
            <label>Customer</label>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div>
            <label>Site Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div>
            <label>Total ($, excl GST)</label>
            <input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
          <div>
            <label>Scope Type</label>
            <select value={scopeType} onChange={(e) => setScopeType(e.target.value)}>
              <option value="Supply and Installation of:">Supply and Installation of:</option>
              <option value="Supply Only of:">Supply Only of:</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Joinery Item Lines (one per line, e.g. &quot;10 X Awning Windows&quot;)</div>
        <textarea
          rows={4}
          style={{ width: "100%", marginTop: 8 }}
          value={itemsInput}
          onChange={(e) => setItemsInput(e.target.value)}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Specification</div>
        <div className="form">
          <div>
            <label>Suite</label>
            <input value={suite} onChange={(e) => setSuite(e.target.value)} placeholder="e.g. APL Vantage Residential Suite" />
          </div>
          <div>
            <label>Colour</label>
            <input value={colour} onChange={(e) => setColour(e.target.value)} placeholder="e.g. Standard Powdercoat Colour" />
          </div>
          <div>
            <label>Hardware</label>
            <input value={hardware} onChange={(e) => setHardware(e.target.value)} placeholder="e.g. Urbo Colour Matched Hardware" />
          </div>
          <div>
            <label>Special Hardware (optional)</label>
            <input
              value={specialHardware}
              onChange={(e) => setSpecialHardware(e.target.value)}
              placeholder="e.g. Key/Snib to the Dining Sliding Door"
            />
          </div>
          <div>
            <label>Restrictor Stays (optional)</label>
            <input
              value={restrictors}
              onChange={(e) => setRestrictors(e.target.value)}
              placeholder="e.g. Stainless Steel Restrictor Stays to Items 2, 6, 7, 8 and 9"
            />
          </div>
          <div>
            <label>Glazing</label>
            <input value={glazing} onChange={(e) => setGlazing(e.target.value)} placeholder="e.g. Clear Double Glazed Glass" />
          </div>
          <div>
            <label>Obscure Glazing (optional)</label>
            <input
              value={obscure}
              onChange={(e) => setObscure(e.target.value)}
              placeholder="e.g. Double Glazed Etchlite (obscure) Glass to Items 3, 6 and 7"
            />
          </div>
          <div>
            <label>Liners</label>
            <input value={liners} onChange={(e) => setLiners(e.target.value)} placeholder="e.g. 19mm H3.1 treated FJP pine jamb liners" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Installation Inclusions / Exclusions (one per line)</div>
        <textarea
          rows={8}
          style={{ width: "100%", marginTop: 8 }}
          value={installInput}
          onChange={(e) => setInstallInput(e.target.value)}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Quote Wording Preview (copy this into NextMinute)</div>
        <div style={{ fontWeight: 900, marginTop: 8 }}>{(customer.trim() || "Customer") + " - Quote Wording"}</div>
        <div className="hint">{address}</div>
        <div style={{ fontWeight: 900, color: "#dc2626", marginTop: 14, fontSize: 16 }}>{formatTotal(totalNumber)}</div>
        <div style={{ marginTop: 14, fontWeight: 700 }}>{scopeType}</div>
        <div style={{ marginTop: 2 }}>
          {items.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {specLines.map((line, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          {installLines.map((line, i) => (
            <div key={i} style={{ marginTop: 4 }}>
              {line}
            </div>
          ))}
        </div>
        <div className="actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn primary" onClick={handleCopy}>
            Copy to Clipboard
          </button>
        </div>
        {copyStatus && <div className="hint" style={{ marginTop: 8 }}>{copyStatus}</div>}
      </div>
    </div>
  );
}
