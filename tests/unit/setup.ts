import "fake-indexeddb/auto";
import { activateLang } from "@/lib/languages/registry";

// Los tests heredados del chino trabajan con el paquete zh activo.
await activateLang("zh");
