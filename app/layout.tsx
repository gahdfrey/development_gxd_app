import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "CareVault — The Modern EHR for Connected Care";
const description =
  "CareVault unifies charts, labs, scheduling, and billing into one fast, HIPAA-compliant workspace built for clinicians.";

// Icons and the link-preview image come from the file conventions in this folder
// (favicon.ico, icon.svg, apple-icon.png, opengraph-image.png, twitter-image.png) and
// manifest.ts. Their sources live in brand/logo/.
export const metadata: Metadata = {
  // Absolute base for the preview-image URLs; without it Next falls back to the Vercel URL.
  metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
  title,
  description,
  applicationName: "CareVault",
  appleWebApp: { title: "CareVault" },
  openGraph: { type: "website", siteName: "CareVault", locale: "en_NG", title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
