import type { Metadata } from "next";
import { NoteEditorPage } from "@/components/notes/note-page";
import { builtinNoteIds } from "@/lib/notes/builtin-ids";

export const metadata: Metadata = { title: "Apunte" };

// Exportación estática: solo se pregeneran los apuntes del profesor (ids conocidos). Los del usuario
// se resuelven en app/not-found.tsx a partir de la URL.
export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { lang: string } }) {
  return builtinNoteIds(params.lang).map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { id } = await params;
  return <NoteEditorPage id={decodeURIComponent(id)} />;
}
