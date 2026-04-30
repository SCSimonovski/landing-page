import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northgate Protection — Mortgage Protection Quotes",
  description:
    "A licensed agent in your state will follow up with options that fit your mortgage and your family.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
