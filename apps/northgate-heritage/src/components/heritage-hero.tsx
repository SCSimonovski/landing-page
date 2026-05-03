import Image from "next/image";

// Heritage hero component. Two responsibilities:
// 1. Render the hero image (placeholder until real Hearth-direction
//    photography lands per AGENTS.md § 9 — firm SAC blocker).
// 2. Render a dev-only "PLACEHOLDER" banner gated on
//    NEXT_PUBLIC_HERO_PLACEHOLDER. Set to "true" in local dev .env.local;
//    UNSET in production env so the banner doesn't render. Browser-side
//    env var is bundled at build time, so the production build with the
//    var unset is the actual safety check.
//
// Once real photography lands, both this component AND the
// NEXT_PUBLIC_HERO_PLACEHOLDER env var should be removed (keep the
// component file but drop the banner; or move the banner logic out).
export function HeritageHero() {
  const showPlaceholderBanner =
    process.env.NEXT_PUBLIC_HERO_PLACEHOLDER === "true";

  return (
    <div className="relative">
      <Image
        src="/hero-placeholder.svg"
        alt=""
        width={800}
        height={600}
        priority
        className="rounded-[20px] w-full h-auto"
      />
      {showPlaceholderBanner && (
        <div
          role="status"
          className="absolute top-3 left-3 right-3 sm:right-auto rounded-md bg-accent-burgundy text-background-card px-3 py-2 text-[11px] font-semibold tracking-[0.04em] uppercase shadow-md"
        >
          ⚠ Hero placeholder — do not ship to production ads (AGENTS.md § 9)
        </div>
      )}
    </div>
  );
}
