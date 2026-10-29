import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_SC, Noto_Serif_SC, Fraunces } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers";
import { withBase } from "@/lib/base-path";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin", "latin-ext"], display: "swap", axes: ["SOFT", "opsz"] });
// Fuentes chinas como cara variable (una sola @font-face por rango Unicode): el CSS pasa de ~650 KB a ~190 KB.
const notoSans = Noto_Sans_SC({ variable: "--font-noto-sans-sc", subsets: ["latin"], display: "swap", preload: false });
const notoSerif = Noto_Serif_SC({ variable: "--font-noto-serif-sc", subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "学伴 Xuébàn", template: "%s · Xuébàn" },
  description: "Tu compañero para aprender chino mandarín: HSK 1, flashcards con FSRS, diccionario, caracteres, vídeos y lecturas. Local-first y gratuito.",
  applicationName: "Xuébàn",
  manifest: withBase("/manifest.webmanifest"),
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Xuébàn" },
  icons: { icon: withBase("/icon.svg"), apple: withBase("/apple-icon.png") },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5EFE3" },
    { media: "(prefers-color-scheme: dark)", color: "#181715" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} ${notoSans.variable} ${notoSerif.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
