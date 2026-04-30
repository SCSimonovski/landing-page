import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-6xl items-center px-6">
        <Link href="/" aria-label="Northgate Protection home" className="block">
          <Image
            src="/northgate-logo.svg"
            alt="Northgate Protection"
            width={120}
            height={64}
            priority
            className="h-10 w-auto"
          />
        </Link>
      </div>
    </header>
  );
}
