import Dexie, { type EntityTable } from "dexie";
import type {
  Card,
  Category,
  CharacterState,
  DailyStat,
  DictFavorite,
  DictHistoryRow,
  ExerciseAttempt,
  LegacyCharacterState,
  LegacyDailyStat,
  LegacyDictFavorite,
  LessonProgress,
  Note,
  Reading,
  ReviewLog,
  SettingRow,
  StudySession,
  SyncStateRow,
  Video,
  Word,
} from "./schema";

export class XuebanDB extends Dexie {
  words!: EntityTable<Word, "id">;
  cards!: EntityTable<Card, "id">;
  reviewLogs!: EntityTable<ReviewLog, "id">;
  categories!: EntityTable<Category, "id">;
  /** v3: estado de caracteres por idioma (id `${lang}:${char}`); sustituye a `characters` */
  charStates!: EntityTable<CharacterState, "id">;
  lessonProgress!: EntityTable<LessonProgress, "lessonId">;
  exerciseAttempts!: EntityTable<ExerciseAttempt, "id">;
  videos!: EntityTable<Video, "id">;
  readings!: EntityTable<Reading, "id">;
  notes!: EntityTable<Note, "id">;
  studySessions!: EntityTable<StudySession, "id">;
  settings!: EntityTable<SettingRow, "key">;
  syncState!: EntityTable<SyncStateRow, "key">;
  dictHistory!: EntityTable<DictHistoryRow, "id">;
  /** v3: favoritos por idioma (id `${lang}:${hanzi}`); sustituye a `dictFavorites` */
  favorites!: EntityTable<DictFavorite, "id">;
  /** v3: estadísticas diarias por idioma (id `${lang}:${date}`); sustituye a `dailyStats` */
  daily!: EntityTable<DailyStat, "id">;

  constructor(name = "xueban") {
    super(name);
    this.version(1).stores({
      words: "id, hanzi, category, source, updatedAt, *hsk, *tags, ankiNoteId",
      cards: "id, wordId, type, due, state, [type+due], [wordId+type]",
      reviewLogs: "++id, cardId, wordId, review",
      categories: "id, order",
      characters: "hanzi, known, canWrite",
      lessonProgress: "lessonId, unitId, status",
      exerciseAttempts: "++id, exerciseType, itemId, skill, correct, at, [itemId+correct]",
      videos: "id, source, addedAt",
      readings: "id, source, addedAt",
      notes: "id, kind, classDate, updatedAt",
      studySessions: "++id, start, kind",
      settings: "key",
      syncState: "key",
      dictHistory: "++id, hanzi, at",
      dictFavorites: "hanzi, at",
      dailyStats: "date",
    });
    // v2: los booleanos no son claves válidas en IndexedDB → sin índices known/canWrite/correct; se indexa context
    this.version(2).stores({
      characters: "hanzi",
      exerciseAttempts: "++id, exerciseType, itemId, skill, at, context",
      videos: "id, source, addedAt",
      readings: "id, source, addedAt",
      notes: "id, kind, classDate, updatedAt",
      studySessions: "++id, start, kind",
      settings: "key",
      syncState: "key",
      dictHistory: "++id, hanzi, at",
      dictFavorites: "hanzi, at",
      dailyStats: "date",
    });
    // v3: multiidioma. `lang` en todas las tablas con índices compuestos; tablas nuevas para las claves que colisionaban.
    this.version(3)
      .stores({
        words: "id, lang, hanzi, category, source, updatedAt, *hsk, *tags, ankiNoteId, [lang+hanzi], [lang+category], [lang+source], [lang+updatedAt]",
        cards: "id, lang, wordId, type, due, state, [type+due], [wordId+type], [lang+due], [lang+state], [lang+type]",
        reviewLogs: "++id, lang, cardId, wordId, review, [lang+review]",
        categories: "id, lang, order, [lang+order]",
        charStates: "id, lang, hanzi, [lang+hanzi]",
        lessonProgress: "lessonId, lang, unitId, status, [lang+status], [lang+unitId]",
        exerciseAttempts: "++id, lang, exerciseType, itemId, skill, at, context, [lang+at], [lang+skill], [lang+itemId]",
        videos: "id, lang, source, addedAt, [lang+source], [lang+addedAt]",
        readings: "id, lang, source, addedAt, [lang+source], [lang+addedAt]",
        notes: "id, lang, kind, classDate, updatedAt, [lang+kind], [lang+updatedAt]",
        studySessions: "++id, lang, start, kind, [lang+start]",
        dictHistory: "++id, lang, hanzi, at, [lang+at]",
        favorites: "id, lang, hanzi, at, [lang+at]",
        daily: "id, lang, date, [lang+date]",
        // tablas antiguas: siguen declaradas en v3 para poder leerlas en la migración
        characters: "hanzi",
        dictFavorites: "hanzi, at",
        dailyStats: "date",
      })
      .upgrade(async (tx) => {
        const lang = "zh" as const;
        const stamp = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, lang }));
        for (const name of ["words", "cards", "reviewLogs", "categories", "lessonProgress", "exerciseAttempts", "videos", "readings", "notes", "studySessions", "dictHistory"]) {
          await tx.table(name).toCollection().modify((row: { lang?: string }) => {
            if (!row.lang) row.lang = lang;
          });
        }
        void stamp;
        const chars = (await tx.table("characters").toArray()) as LegacyCharacterState[];
        if (chars.length) await tx.table("charStates").bulkPut(chars.map((c) => ({ ...c, id: `${lang}:${c.hanzi}`, lang })));
        const favs = (await tx.table("dictFavorites").toArray()) as LegacyDictFavorite[];
        if (favs.length) await tx.table("favorites").bulkPut(favs.map((f) => ({ ...f, id: `${lang}:${f.hanzi}`, lang })));
        const stats = (await tx.table("dailyStats").toArray()) as LegacyDailyStat[];
        if (stats.length) await tx.table("daily").bulkPut(stats.map((d) => ({ ...d, id: `${lang}:${d.date}`, lang })));
      });
    // v4: se eliminan las tablas antiguas ya migradas.
    this.version(4).stores({ characters: null, dictFavorites: null, dailyStats: null });
  }
}

export const db = new XuebanDB();

export * from "./schema";
export * from "./ids";
export * from "./repo";
