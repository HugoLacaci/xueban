import type { Metadata } from "next";
import { Redirect } from "@/components/layout/redirect";

export const metadata: Metadata = { title: "Cuaderno de clase" };

/** Ruta antigua: el cuaderno de clase vive ahora en Apuntes. */
export default function Page() {
  return <Redirect to="/apuntes/clases" />;
}
