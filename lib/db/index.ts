import Dexie, { type EntityTable } from "dexie";
import type {
  Card,
  Category,
  CharacterState,
  DailyStat,
  DictFavorite,
  DictHistoryRow,
  ExerciseAttempt,
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
  characters!: EntityTable<CharacterState, "hanzi">;
  lessonProgress!: EntityTable<LessonProgress, "lessonId">;
  exerciseAttempts!: EntityTable<ExerciseAttempt, "id">;
  videos!: EntityTable<Video, "id">;
  readings!: EntityTable<Reading, "id">;
  notes!: EntityTable<Note, "id">;
  studySessions!: EntityTable<StudySession, "id">;
  settings!: EntityTable<SettingRow, "key">;
  syncState!: EntityTable<SyncStateRow, "key">;
  dictHistory!: EntityTable<DictHistoryRow, "id">;
  dictFavorites!: EntityTable<DictFavorite, "hanzi">;
  dailyStats!: EntityTable<DailyStat, "date">;

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
  }
}

export const db = new XuebanDB();

export * from "./schema";
export * from "./repo";
