"use client";
import { usePathname } from "next/navigation";

/** Fundido de tinta entre páginas: la nueva pantalla aparece con opacidad y un leve desenfoque que se aclara. */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="motion-safe:animate-ink-in">
      {children}
    </div>
  );
}
