import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "学伴 Xuébàn — aprender chino",
    short_name: "Xuébàn",
    description: "Tu compañero para aprender chino mandarín (HSK 1–3): flashcards FSRS, diccionario, caracteres, vídeos y lecturas.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5EFE3",
    theme_color: "#F5EFE3",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
