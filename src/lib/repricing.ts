// Pure calculation logic for Ali-Frame Install Repricing — matches the
// skill's rule exactly: a supplier margin is ADDED to the supplier price, a
// discount/credit is DEDUCTED. Never silently reinterpret one as the other.
export interface RepricingInput {
  supplierPrice: number;
  marginMode: "margin" | "discount";
  marginIsPercent: boolean;
  marginValue: number;
  installDays: number;
  installDaysOriginal: number | null;
  installAllowance: number;
  materials: number;
  rubbishRemoval: number;
  scaffolding: number;
  otherLabel: string;
  otherAmount: number;
  gstBasis: "excluding" | "including";
}

export interface RepricingLine {
  label: string;
  amount: number;
}

export interface RepricingResult {
  lines: RepricingLine[];
  total: number;
}

export function calculateRepricing(input: RepricingInput): RepricingResult {
  const marginAmount = input.marginIsPercent ? input.supplierPrice * (input.marginValue / 100) : input.marginValue;
  const supplierLineAmount =
    input.marginMode === "margin" ? input.supplierPrice + marginAmount : input.supplierPrice - marginAmount;

  const marginDesc = input.marginIsPercent ? `${input.marginValue}%` : `$${input.marginValue.toFixed(2)}`;
  const supplierLabel =
    input.marginMode === "margin"
      ? `Supplier price including ${marginDesc} margin`
      : `Supplier price less ${marginDesc} discount`;

  const installLabel =
    input.installDaysOriginal && input.installDaysOriginal !== input.installDays
      ? `Installation - ${input.installDays} day${input.installDays === 1 ? "" : "s"} (down from ${input.installDaysOriginal} days)`
      : `Installation - ${input.installDays} day${input.installDays === 1 ? "" : "s"}`;

  const lines: RepricingLine[] = [
    { label: supplierLabel, amount: round2(supplierLineAmount) },
    { label: installLabel, amount: round2(input.installAllowance) },
    { label: "Materials", amount: round2(input.materials) },
    { label: "Rubbish Removal / Disposal", amount: round2(input.rubbishRemoval) },
    { label: "Scaffolding", amount: round2(input.scaffolding) },
  ];

  if (input.otherLabel.trim()) {
    lines.push({ label: input.otherLabel.trim(), amount: round2(input.otherAmount) });
  }

  const total = round2(lines.reduce((sum, l) => sum + l.amount, 0));
  return { lines, total };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}
