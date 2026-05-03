import Image from "next/image";

// Hero composition: brand photo + dark-navy "THE POINT" callout overlay.
// Photo at public/heritage-hero.png. Aspect 4:5 box; object-cover so any
// image dimensions render without distortion. priority=true since the
// image is above the fold.
export function HeritageHero() {
  return (
    <div className="relative">
      <div className="aspect-[4/5] w-full overflow-hidden rounded-xl shadow-[0_30px_80px_-30px_rgba(20,37,58,0.35)]">
        <Image
          src="/heritage-hero.png"
          alt=""
          width={800}
          height={1000}
          priority
          className="h-full w-full object-cover"
        />
      </div>

      <div className="absolute -bottom-6 right-4 sm:right-auto sm:bottom-6 sm:-left-6 max-w-[260px] rounded-xl bg-accent text-background-card px-5 py-4 shadow-[0_18px_36px_-18px_rgba(20,37,58,0.55)]">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-accent-terracotta mb-1.5">
          The point
        </p>
        <p className="text-[14px] leading-[1.4] tracking-[-0.005em]">
          If something happens, the funeral isn&apos;t theirs to pay for.
        </p>
      </div>
    </div>
  );
}
