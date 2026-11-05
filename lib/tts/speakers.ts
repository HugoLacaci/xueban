/**
 * Voz de cada personaje de los diálogos (la misma en la app y en `npm run audio:build`, que pregenera los MP3 con
 * esa voz): f = Xiaoxiao, m = Yunxi, child = Xiaoyou. Los personajes desconocidos alternan f/m por orden de aparición.
 */
export type SpeakerVoice = "f" | "m" | "child";

const MALE =
  /^(雨果|小李|大卫|王明|老李|小王|刘经理|陈总|张先生|老板|爸爸|爷爷|外公|哥哥|弟弟|叔叔|舅舅|伯伯|司机|师傅|警察|医生|大夫|教练|经理|男|乙|B)/;
const FEMALE =
  /^(王老师|李老师|老师|安娜|小美|张女士|妈妈|奶奶|外婆|姐姐|妹妹|阿姨|姑姑|服务员|护士|女|甲|A)/;
const CHILD = /^(小朋友|孩子|小孩|儿子|女儿|小明)/;

export function speakerVoice(speaker: string | undefined, order = 0): SpeakerVoice {
  if (!speaker) return "f";
  if (CHILD.test(speaker)) return "child";
  if (MALE.test(speaker)) return "m";
  if (FEMALE.test(speaker)) return "f";
  return order % 2 === 0 ? "f" : "m";
}

/** Voces de todas las líneas de un diálogo (los desconocidos se numeran por orden de aparición). */
export function dialogueVoices(lines: { speaker?: string }[]): SpeakerVoice[] {
  const order = new Map<string, number>();
  return lines.map((l) => {
    const s = l.speaker ?? "";
    if (!order.has(s)) order.set(s, order.size);
    return speakerVoice(l.speaker, order.get(s));
  });
}
