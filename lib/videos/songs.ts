/**
 * Canciones para el Study Hall (solo chino). No se incluye ninguna letra en la app:
 *  - `captions: true` → el vídeo trae subtítulos chinos propios (se usan con el servidor local de transcripciones).
 *  - si no, la letra sincronizada se pide a LRCLIB (lrclib.net) en el navegador al abrir la canción,
 *    eligiendo la versión de duración más parecida a la del vídeo (`duration`, en segundos).
 * Vídeos y duraciones comprobados con yt-dlp y LRCLIB (noviembre de 2026).
 */
export type SongKind = "popular" | "practica" | "meme";

export interface Song {
  id: string; // id de YouTube
  track: string; // título en chino (búsqueda en LRCLIB)
  artist: string;
  kind: SongKind;
  level: 1 | 2 | 3 | 4 | 5 | 6; // nivel HSK orientativo del vocabulario
  duration: number;
  captions?: boolean;
  /** Por qué está en la lista (en español). */
  note: string;
  /** Sin letra automática disponible: hay que pegarla. */
  manualLyrics?: boolean;
}

export const SONGS: Song[] = [
  // ——— para practicar: lentas, vocalización clara, vocabulario sencillo y repetitivo
  { id: "Iqy_cP5-0tE", track: "声调歌", artist: "", kind: "practica", level: 1, duration: 122, manualLyrics: true, note: "Canción de los cuatro tonos del pinyin (Institut Xinès Qiushi, explicada en español)." },
  { id: "IiFm7AWP9n4", track: "月亮代表我的心", artist: "邓丽君", kind: "practica", level: 2, duration: 205, note: "El clásico para estudiantes: lenta, pronunciación muy clara y frases que se repiten (你问我爱你有多深…)." },
  { id: "9iRlk5uXhZQ", track: "甜蜜蜜", artist: "邓丽君", kind: "practica", level: 2, duration: 204, captions: true, note: "Versión de «唱歌學中文» con subtítulos: ritmo tranquilo y mucho 好像 / 在哪里 / 见过你." },
  { id: "Gb8AZbpnzy4", track: "小苹果", artist: "筷子兄弟", kind: "practica", level: 2, duration: 211, note: "Pegadiza y muy repetitiva; la bailan en cualquier plaza de China (广场舞)." },
  { id: "5DYJ90iOAUc", track: "虫儿飞", artist: "杨烁", kind: "practica", level: 2, duration: 165, note: "Canción infantil muy conocida, lenta y con vocabulario básico (天、星星、飞、睡)." },
  { id: "tF68NTvGRCg", track: "茉莉花", artist: "凤飞飞", kind: "practica", level: 3, duration: 204, note: "La canción popular china más famosa fuera de China (jazmín); melodía tradicional de Jiangsu." },
  { id: "mRKTOZmX2cE", track: "童年", artist: "罗大佑", kind: "practica", level: 3, duration: 233, note: "Recuerdos del colegio: 黑板、老师、作业、考试… vocabulario de clase cantado despacio." },
  // ——— populares: lo que suena y lo que todo el mundo canta en el KTV
  { id: "sHD_z90ZKV0", track: "稻香", artist: "周杰伦", kind: "popular", level: 3, duration: 224, note: "Jay Chou, la canción optimista por excelencia; vídeo oficial." },
  { id: "3-DteAHyRnI", track: "晴天", artist: "周杰伦", kind: "popular", level: 3, duration: 270, note: "Probablemente la canción más cantada en los KTV chinos." },
  { id: "bu7nU9Mhpyo", track: "告白气球", artist: "周杰伦", kind: "popular", level: 3, duration: 216, note: "Romántica y ligera, con referencias a París; vídeo oficial." },
  { id: "0FJ1BCbTlXg", track: "童话", artist: "光良", kind: "popular", level: 3, duration: 245, note: "Balada clásica de los 2000, pronunciación muy clara." },
  { id: "t0igPuDjYUE", track: "后来", artist: "刘若英", kind: "popular", level: 4, duration: 340, captions: true, note: "La balada de desamor que corea todo un estadio; vídeo oficial con subtítulos." },
  { id: "GCgvpwLNvtY", track: "小幸运", artist: "田馥甄", kind: "popular", level: 4, duration: 266, note: "Tema de la película «Our Times» (我的少女时代)." },
  { id: "ecTSlaNM0Z0", track: "平凡之路", artist: "朴树", kind: "popular", level: 4, duration: 306, note: "Himno generacional sobre crecer; vídeo oficial." },
  { id: "HDzEYn1DbRU", track: "成都", artist: "赵雷", kind: "popular", level: 4, duration: 329, note: "Folk tranquilo sobre la ciudad de Chengdu; muy buena para el oído." },
  { id: "T4SimnaiktU", track: "光年之外", artist: "邓紫棋", kind: "popular", level: 4, duration: 236, note: "G.E.M., tema de la película «Passengers»; vídeo oficial." },
  { id: "MngtdadZvEY", track: "演员", artist: "薛之谦", kind: "popular", level: 4, duration: 261, note: "Joker Xue, uno de los cantantes más escuchados en China continental." },
  { id: "CSBrZbaN8Ao", track: "孤勇者", artist: "陈奕迅", kind: "popular", level: 5, duration: 256, note: "Eason Chan, tema de «Arcane» en chino; la cantan hasta los niños en el colegio." },
  { id: "j2V1W-ChF1s", track: "起风了", artist: "买辣椒也用券", kind: "popular", level: 5, duration: 326, note: "Éxito viral de internet, letra poética." },
  { id: "vovpYaNzuuc", track: "小酒窝", artist: "林俊杰", kind: "popular", level: 3, duration: 218, note: "JJ Lin a dúo, alegre y fácil de seguir." },
  { id: "G97_rOdHcnY", track: "江南", artist: "林俊杰", kind: "popular", level: 4, duration: 264, note: "JJ Lin, clásico de 2004; vídeo oficial." },
  { id: "VQXEMwwVDTc", track: "隐形的翅膀", artist: "张韶涵", kind: "popular", level: 3, duration: 226, note: "Canción motivadora que se canta en los colegios; frases cortas." },
  // ——— memes y TikTok
  { id: "VKq2flvS7dw", track: "一剪梅", artist: "费玉清", kind: "meme", level: 4, duration: 237, note: "«Xuě huā piāo piāo, běi fēng xiāo xiāo»: el meme de 2019 del hombre en la nieve. Lenta y muy fácil de cantar." },
  { id: "4v5-532xqY8", track: "今生缘", artist: "川子", kind: "meme", level: 4, duration: 321, note: "La de «women cheat» / «Samsung»: en TikTok oían 我们今生 (wǒmen jīnshēng) y 沧桑 (cāngsāng) como si fuera inglés." },
  { id: "rAl19p1w5kM", track: "落泪", artist: "康熙 / TOYOKI", kind: "meme", level: 3, duration: 203, note: "La del gato que se tapa la nariz y mueve la mano (trend de TikTok)." },
  { id: "ZjmoySiTFOQ", track: "一望一望都一望", artist: "Age of Apes", kind: "meme", level: 2, duration: 89, manualLyrics: true, note: "Los monos cantando («hiwong hiwong tong hiwong»): anuncio del juego Age of Apes que se hizo meme en 2022." },
  { id: "9C9fGafzm5I", track: "洗澡歌", artist: "圈圈宝贝", kind: "meme", level: 1, duration: 206, note: "Canción infantil del baño, muy usada en vídeos de gatos bailando. Vocabulario del cuerpo y del baño." },
  { id: "vu1K6f8CBiE", track: "学猫叫", artist: "小潘潘 / 小峰峰", kind: "meme", level: 2, duration: 210, note: "«我们一起学猫叫，一起喵喵喵喵喵»: el gran éxito de Douyin/TikTok de 2018." },
  { id: "ZkjTWMneTLw", track: "蜜雪冰城主题曲", artist: "蜜雪冰城", kind: "meme", level: 1, duration: 145, note: "«你爱我，我爱你，蜜雪冰城甜蜜蜜»: el jingle de la cadena de helados, meme nacional en 2021. La verás en cada esquina de China." },
  { id: "ipggaw0mGjk", track: "野狼disco", artist: "宝石Gem", kind: "meme", level: 4, duration: 240, note: "Rap-disco del noreste de China (东北), lleno de humor y frases que todo el mundo corea." },
  { id: "8RrUv2Q0Kp4", track: "卡路里", artist: "火箭少女101", kind: "meme", level: 3, duration: 233, note: "«燃烧我的卡路里»: la canción de quemar calorías, meme de gimnasio." },
  { id: "HegSBovl24I", track: "跳楼机", artist: "LBI利比", kind: "meme", level: 4, duration: 202, note: "Uno de los mayores éxitos chinos de TikTok de 2024 (vídeo oficial con letra)." },
  { id: "7NA8I8-6fyE", track: "少年", artist: "梦然", kind: "meme", level: 4, duration: 237, note: "«我还是从前那个少年»: himno de Douyin que se usa en miles de vídeos." },
  { id: "7VS2ehvGkrQ", track: "向云端", artist: "小霞 / 海洋Bo", kind: "meme", level: 4, duration: 252, note: "Mezcla de canto y rap, viral en Douyin y TikTok." },
  { id: "pgrCUkZVWzI", track: "可可托海的牧羊人", artist: "王琪", kind: "meme", level: 4, duration: 341, note: "Balada de Xinjiang que arrasó en Douyin en 2020; lenta y clara." },
  { id: "q2WvTaqe9zU", track: "芒种", artist: "音阙诗听 / 赵方婧", kind: "meme", level: 5, duration: 220, note: "Estilo 古风 (aire tradicional) con un baile viral; el nombre es uno de los 24 términos solares." },
  { id: "U9Z9X_YXaNY", track: "悬溺", artist: "葛东琪", kind: "meme", level: 5, duration: 198, note: "Su «我主张 制造浪漫…» se hizo viral como sonido de TikTok." },
];

export const songTitle = (s: Song) => (s.artist ? `${s.track} · ${s.artist}` : s.track);
