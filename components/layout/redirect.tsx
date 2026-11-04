"use client";
import { useEffect } from "react";
import { useLangRouter } from "@/lib/languages/link";
import { Spinner } from "@/components/ui/primitives";

/** Redirección en cliente (compatible con la exportación estática): conserva el idioma activo. */
export function Redirect({ to }: { to: string }) {
  const router = useLangRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-faint">
      <Spinner className="mr-2 size-4" /> Redirigiendo…
    </div>
  );
}
