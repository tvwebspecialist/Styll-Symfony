import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Styll — Il tuo salone, organizzato.",
  description:
    "La piattaforma all-in-one per barbieri e parrucchieri: prenotazioni, team e fidelizzazione clienti.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Styll",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#222222",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${outfit.variable} h-full antialiased`}>
      <body
        className="min-h-full flex flex-col"
        style={{
          backgroundColor: "var(--color-bg)",
          color: "var(--color-fg)",
        }}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
