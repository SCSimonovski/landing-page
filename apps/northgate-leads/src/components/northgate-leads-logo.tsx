import Image from "next/image";

// Wordmark + arch motif. Used by the (auth) layout's chromeless header
// AND by AppSidebar's header. Single import path keeps both in lockstep.
export function NorthgateLeadsLogo({
  className = "h-9 w-auto",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/northgate-leads-logo.svg"
      alt="Northgate Leads"
      width={280}
      height={80}
      priority
      className={className}
    />
  );
}
