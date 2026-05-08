import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Plan 4: shadcn Badge extended with the brand/product/temp/dnc variants
// the leads table uses. Brand colors come from CSS vars (--badge-* tokens
// in globals.css) so they stay distinct from shadcn's neutral primary/
// secondary/etc. mapping.
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        "brand-np":
          "bg-[var(--badge-np-bg)] text-[var(--badge-np-fg)] rounded",
        "brand-heritage":
          "bg-[var(--badge-heritage-bg)] text-[var(--badge-heritage-fg)] rounded",
        "product-mp":
          "bg-[var(--badge-np-bg)] text-[var(--badge-np-fg)] rounded",
        "product-fe":
          "bg-[var(--badge-heritage-bg)] text-[var(--badge-heritage-fg)] rounded",
        "temp-hot":
          "bg-[var(--badge-temp-hot-bg)] text-[var(--badge-temp-hot-fg)] rounded",
        "temp-warm":
          "bg-[var(--badge-temp-warm-bg)] text-[var(--badge-temp-warm-fg)] rounded",
        "temp-cold":
          "bg-[var(--badge-temp-cold-bg)] text-[var(--badge-temp-cold-fg)] rounded",
        dnc: "bg-red-100 text-red-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// Helpers used by the leads table cells. Lift mapping out of the template
// so adding a brand or temperature value is one place, not a switch in
// every table.
export type BrandVariant = "brand-np" | "brand-heritage";
export type ProductVariant = "product-mp" | "product-fe";
export type TempVariant = "temp-hot" | "temp-warm" | "temp-cold";

export function brandVariant(brand: string): BrandVariant {
  return brand === "northgate-heritage" ? "brand-heritage" : "brand-np";
}

export function brandLabel(brand: string): string {
  return brand === "northgate-heritage" ? "Heritage" : "NP";
}

export function productVariant(product: string): ProductVariant {
  return product === "final_expense" ? "product-fe" : "product-mp";
}

export function productLabel(product: string): string {
  return product === "final_expense" ? "FE" : "MP";
}

export function tempVariant(temp: string): TempVariant {
  if (temp === "hot") return "temp-hot";
  if (temp === "warm") return "temp-warm";
  return "temp-cold";
}

export { Badge, badgeVariants }
