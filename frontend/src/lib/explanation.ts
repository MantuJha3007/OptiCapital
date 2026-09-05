/* Parser for the engine's explanation text.

   backend/app/services/explanation_service.py emits a stable, structured
   document:

     Portfolio risk level: STRESS (score: 64.2/100).

     Threshold breaches detected:
       • Portfolio volatility (18.2%) exceeded ...

     Assets reduced:
       ↓ Equity reduced from 45% to 35%

     Assets increased:
       ↑ Cash increased from 5% to 15%

     The recommended allocation reduces portfolio volatility ...

   Recovering that structure lets the ledger render a decision narrative
   with the reasoning attached to each step, rather than printing a blob of
   text and calling it an audit trail. Parsing is deliberately tolerant: if
   the format ever changes, `raw` still carries the original. */

export interface ParsedExplanation {
  level: string | null;
  score: number | null;
  breaches: string[];
  reduced: string[];
  increased: string[];
  closing: string | null;
  raw: string;
}

export function parseExplanation(raw: string | null): ParsedExplanation {
  const empty: ParsedExplanation = {
    level: null,
    score: null,
    breaches: [],
    reduced: [],
    increased: [],
    closing: null,
    raw: raw ?? "",
  };
  if (!raw) return empty;

  const lines = raw.split("\n");
  const out: ParsedExplanation = { ...empty, breaches: [], reduced: [], increased: [] };

  const header = raw.match(/Portfolio risk level:\s*([A-Z_]+)\s*\(score:\s*([\d.]+)/);
  if (header) {
    out.level = header[1];
    out.score = Number(header[2]);
  }

  type Section = "breaches" | "reduced" | "increased" | null;
  let section: Section = null;

  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;

    if (/^Threshold breaches detected:/i.test(text)) {
      section = "breaches";
      continue;
    }
    if (/^Assets reduced:/i.test(text)) {
      section = "reduced";
      continue;
    }
    if (/^Assets increased:/i.test(text)) {
      section = "increased";
      continue;
    }

    const bullet = text.match(/^[•↓↑]\s*(.+)$/);
    if (bullet && section) {
      out[section].push(bullet[1].trim());
      continue;
    }

    if (/^The recommended allocation/i.test(text)) {
      out.closing = text;
      section = null;
    }
  }

  return out;
}
