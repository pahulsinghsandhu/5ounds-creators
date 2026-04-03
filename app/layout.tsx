import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "5ounds creators",
  description: "The platform for instrumental producers",
  metadataBase: new URL("https://creators.5ounds.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen font-sans font-light">{children}</body>
    </html>
  );
}
