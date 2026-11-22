import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { siteOrigin } from "@/lib/site-url";
import { jetBrainsMono, newsreader, plusJakartaSans } from "./fonts";
import "./globals.css";

const title = "Rastabaaz";
const description =
  "Follow the rupee on Mumbai's monsoon roads. Report a pothole, see where each ward's repair money went, and whether the fix held.";

const baseMetadata: Metadata = {
  title,
  description,
  openGraph: {
    siteName: "Rastabaaz",
    type: "website",
    locale: "en_IN",
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await siteOrigin();
  return metadataBase ? { ...baseMetadata, metadataBase } : baseMetadata;
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android otherwise overlays the soft keyboard on the page instead of
  // resizing it, which hides the bottom of a focused form.
  interactiveWidget: "resizes-content",
  themeColor: "#064E4B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plusJakartaSans.variable} ${jetBrainsMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
