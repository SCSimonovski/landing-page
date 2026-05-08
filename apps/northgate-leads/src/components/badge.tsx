// Single Badge component covering brand / product / temperature variants.
// One file keeps the variant-to-color mapping in one place + makes visual
// consistency easy to maintain. Variants pull colors from globals.css
// CSS vars (--badge-* tokens).

type Variant =
  | "brand-np"
  | "brand-heritage"
  | "product-mp"
  | "product-fe"
  | "temp-hot"
  | "temp-warm"
  | "temp-cold";

const VARIANT_LABEL: Record<Variant, string> = {
  "brand-np": "NP",
  "brand-heritage": "Heritage",
  "product-mp": "MP",
  "product-fe": "FE",
  "temp-hot": "hot",
  "temp-warm": "warm",
  "temp-cold": "cold",
};

const VARIANT_STYLES: Record<Variant, { bg: string; fg: string }> = {
  "brand-np": { bg: "var(--badge-np-bg)", fg: "var(--badge-np-fg)" },
  "brand-heritage": { bg: "var(--badge-heritage-bg)", fg: "var(--badge-heritage-fg)" },
  "product-mp": { bg: "var(--badge-np-bg)", fg: "var(--badge-np-fg)" },
  "product-fe": { bg: "var(--badge-heritage-bg)", fg: "var(--badge-heritage-fg)" },
  "temp-hot": { bg: "var(--badge-temp-hot-bg)", fg: "var(--badge-temp-hot-fg)" },
  "temp-warm": { bg: "var(--badge-temp-warm-bg)", fg: "var(--badge-temp-warm-fg)" },
  "temp-cold": { bg: "var(--badge-temp-cold-bg)", fg: "var(--badge-temp-cold-fg)" },
};

export function Badge({
  variant,
  children,
}: {
  variant: Variant;
  children?: React.ReactNode;
}) {
  const style = VARIANT_STYLES[variant];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {children ?? VARIANT_LABEL[variant]}
    </span>
  );
}

// Helpers for the table cells.
export function brandVariant(brand: string): Variant {
  return brand === "northgate-heritage" ? "brand-heritage" : "brand-np";
}

export function productVariant(product: string): Variant {
  return product === "final_expense" ? "product-fe" : "product-mp";
}

export function tempVariant(temp: string): Variant {
  if (temp === "hot") return "temp-hot";
  if (temp === "warm") return "temp-warm";
  return "temp-cold";
}
