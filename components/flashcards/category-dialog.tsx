"use client";
import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { db, slugify } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, Input, Label } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const ICONS = ["Tag", "NotebookPen", "Utensils", "Coffee", "Bus", "TrainFront", "Plane", "Home", "Hospital", "ShoppingBag", "Phone", "MessageCircle", "GraduationCap", "Briefcase", "Users", "Heart", "Music", "Gamepad2", "MapPin", "CalendarDays", "CloudSun", "Hash", "Sparkles", "Zap", "Star", "Book", "Smartphone", "Wallet", "Bed", "Dog"];
const COLORS = ["#c0392b", "#2f8f6f", "#1f6fd0", "#8e44ad", "#d35400", "#b8860b", "#16a085", "#c2185b", "#34495e", "#7f8c8d"];

export function CategoryDialog({ open, onOpenChange, editId }: { open: boolean; onOpenChange: (o: boolean) => void; editId?: string }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[1]);
  const [icon, setIcon] = useState("Tag");
  const [builtin, setBuiltin] = useState(false);
  const [originalName, setOriginalName] = useState("");

  useEffect(() => {
    if (!editId) return;
    void db.categories.get(editId).then((c) => {
      if (!c) return;
      setName(c.name);
      setColor(c.color);
      setIcon(c.icon);
      setBuiltin(c.builtin);
      setOriginalName(c.name);
    });
  }, [editId]);

  const save = async () => {
    const n = name.trim();
    if (!n) return toast.error("Pon un nombre a la categoría.");
    if (editId) {
      await db.transaction("rw", db.categories, db.words, async () => {
        await db.categories.update(editId, { name: n, color, icon });
        if (originalName && originalName !== n) await db.words.where("category").equals(originalName).modify({ category: n, updatedAt: Date.now() });
      });
      toast.success("Categoría actualizada");
    } else {
      const id = slugify(n);
      if (await db.categories.get(id)) return toast.error("Ya existe una categoría con ese nombre.");
      const max = (await db.categories.orderBy("order").last())?.order ?? 0;
      await db.categories.put({ id, name: n, color, icon, order: max + 1, builtin: false });
      toast.success("Categoría creada");
    }
    onOpenChange(false);
  };

  const remove = async () => {
    if (!editId) return;
    const count = await db.words.where("category").equals(originalName).count();
    if (!window.confirm(`¿Eliminar la categoría «${originalName}»? ${count ? `Sus ${count} palabras pasarán a «Clase».` : ""}`)) return;
    await db.transaction("rw", db.categories, db.words, async () => {
      await db.words.where("category").equals(originalName).modify({ category: "Clase", updatedAt: Date.now() });
      await db.categories.delete(editId);
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editId ? "Editar categoría" : "Nueva categoría"}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cat-name">Nombre</Label>
            <Input id="cat-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Metro y taxi" autoFocus />
          </div>
          <div>
            <Label>Color</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={cn("size-7 rounded-full border-2", color === c ? "border-ink ring-2 ring-paper-raised ring-inset" : "border-transparent")} style={{ background: c }} aria-label={c} />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-7 cursor-pointer rounded-full border border-line bg-transparent" aria-label="Color personalizado" />
            </div>
          </div>
          <div>
            <Label>Icono</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {ICONS.map((n) => {
                const I = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[n];
                if (!I) return null;
                return (
                  <button key={n} onClick={() => setIcon(n)} className={cn("flex size-8 items-center justify-center rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40", icon === n ? "border-cinnabar bg-cinnabar/10 text-cinnabar" : "border-line text-ink-soft hover:bg-paper-sunk")} aria-label={n}>
                    <I className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            {editId && !builtin ? (
              <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => void remove()}>
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={() => void save()}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
