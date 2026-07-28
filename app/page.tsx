"use client";

import { useEffect, useMemo, useState } from "react";

type Phase = "intro" | "setup" | "route" | "game" | "test" | "ending";
type Gender = "Женщина" | "Мужчина" | "Другое";
type StatKey = "energy" | "money" | "french" | "admin" | "assimilation" | "stability";

type Profile = {
  name: string;
  gender: Gender;
  age: number;
};

type Stats = Record<StatKey, number>;

type RouteDef = {
  id: string;
  icon: string;
  label: string;
  subtitle: string;
  duration: string;
  difficulty: string;
  description: string;
  quest: string;
  start: Stats;
};

type Action = {
  id: string;
  label: string;
  detail: string;
  icon: string;
  hours: number;
  effects: Partial<Stats>;
};

type LocationDef = {
  id: string;
  label: string;
  short: string;
  district: string;
  x: string;
  y: string;
  art: string;
  npc: string;
  description: string;
  actions: Action[];
};

type Npc = {
  id: string;
  name: string;
  role: string;
  color: string;
  hair: string;
  accessory: "glasses" | "moustache" | "beret" | "scarf" | "none";
  line: string;
};

type StoryChoice = {
  label: string;
  hint: string;
  result: string;
  effects: Partial<Stats>;
};

type StoryEvent = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  npc: string;
  choices: StoryChoice[];
};

type SavedGame = {
  profile: Profile;
  routeId: string;
  stats: Stats;
  year: number;
  day: number;
  time: number;
  locationId: string;
  actionCount: number;
  seenEvents: string[];
  metNpcs: string[];
  journal: string[];
};

const STORAGE_KEY = "paris-nouvelle-vie-save-v1";

const routes: RouteDef[] = [
  {
    id: "licence",
    icon: "🎓",
    label: "Бакалавриат",
    subtitle: "Visa étudiant · Licence",
    duration: "5+ лет до гражданства",
    difficulty: "Много учёбы, мало денег",
    description: "Начать с университета, подработок и первых фраз на французском.",
    quest: "Закрывать учебные модули и вовремя продлевать студенческий ВНЖ.",
    start: { energy: 78, money: 1180, french: 12, admin: 8, assimilation: 5, stability: 4 },
  },
  {
    id: "master",
    icon: "📚",
    label: "Магистратура",
    subtitle: "Visa étudiant · Master",
    duration: "5 лет до гражданства",
    difficulty: "Интенсивный старт",
    description: "Диплом, стажировка и шанс быстрее закрепиться на рынке труда.",
    quest: "Защитить mémoire, найти стажировку и сменить статус после выпуска.",
    start: { energy: 74, money: 1850, french: 22, admin: 12, assimilation: 8, stability: 10 },
  },
  {
    id: "talent",
    icon: "💼",
    label: "Паспорт талант",
    subtitle: "Passeport talent",
    duration: "5 лет стабильного проживания",
    difficulty: "Высокие требования",
    description: "Переезд как специалист: больше денег, но контракт нельзя потерять.",
    quest: "Укреплять карьеру, платить налоги и собирать безупречное досье.",
    start: { energy: 70, money: 3150, french: 10, admin: 22, assimilation: 5, stability: 30 },
  },
  {
    id: "family",
    icon: "🏠",
    label: "Семейный путь",
    subtitle: "Vie privée et familiale",
    duration: "Зависит от основания",
    difficulty: "Много подтверждений",
    description: "Сильная поддержка близких, но особенно тщательная проверка документов.",
    quest: "Подтверждать совместную жизнь и строить собственную связь с Францией.",
    start: { energy: 82, money: 1650, french: 18, admin: 24, assimilation: 18, stability: 22 },
  },
];

const npcs: Npc[] = [
  { id: "claire", name: "Клэр", role: "соседка", color: "#e85d75", hair: "#5b3328", accessory: "beret", line: "Bienvenue! В Париже знакомство часто начинается с bonjour." },
  { id: "malik", name: "Малик", role: "бариста", color: "#3d8c76", hair: "#17191f", accessory: "moustache", line: "Un café? Заодно потренируем твой заказ без английского." },
  { id: "ines", name: "Инес", role: "одногруппница", color: "#6a70d6", hair: "#221a33", accessory: "glasses", line: "Я пришлю конспект, но на следующей паре говоришь первым." },
  { id: "bernard", name: "Бернар", role: "чиновник", color: "#5277a8", hair: "#d9d2bf", accessory: "moustache", line: "Каждая справка должна быть переведена и датирована. Courage!" },
  { id: "yuki", name: "Юки", role: "иллюстратор", color: "#e2a94a", hair: "#151515", accessory: "scarf", line: "Лучший вид на город — там, где туристы перестают смотреть в карту." },
  { id: "luc", name: "Люк", role: "историк", color: "#9b5a9f", hair: "#c06d34", accessory: "glasses", line: "Лувр — не галочка в списке. Выбери один зал и останься надолго." },
  { id: "amina", name: "Амина", role: "волонтёр", color: "#d66b3c", hair: "#2d201b", accessory: "none", line: "Город становится своим, когда ты начинаешь делать что-то для других." },
  { id: "thomas", name: "Тома", role: "рекрутер", color: "#477c9d", hair: "#b57a42", accessory: "beret", line: "Во Франции важен не только CV. Расскажи, зачем тебе именно эта работа." },
];

const locations: LocationDef[] = [
  {
    id: "home", label: "Мансарда", short: "Дом", district: "11e arrondissement", x: "12%", y: "70%", art: "home", npc: "claire",
    description: "Крошечная квартира под крышей. Отсюда начинается каждый день.",
    actions: [
      { id: "sleep", label: "Отдохнуть", detail: "+38 сил", icon: "🛏", hours: 3, effects: { energy: 38 } },
      { id: "cook", label: "Приготовить ужин", detail: "−12 € · +культура", icon: "🥘", hours: 2, effects: { money: -12, energy: 22, assimilation: 3 } },
      { id: "papers", label: "Разобрать письма", detail: "+бюрократия", icon: "✉", hours: 2, effects: { energy: -7, admin: 6 } },
    ],
  },
  {
    id: "sorbonne", label: "Сорбонна", short: "Учёба", district: "Quartier latin", x: "54%", y: "67%", art: "university", npc: "ines",
    description: "Аудитории, библиотека и слишком быстрый французский преподавателей.",
    actions: [
      { id: "class", label: "Пойти на занятие", detail: "+8 язык", icon: "📖", hours: 3, effects: { energy: -16, french: 8, assimilation: 3 } },
      { id: "library", label: "Засесть в библиотеке", detail: "+5 язык · +досье", icon: "📝", hours: 2, effects: { energy: -10, french: 5, admin: 2 } },
      { id: "exam", label: "Сдать модуль", detail: "+стабильность", icon: "✓", hours: 4, effects: { energy: -24, french: 6, stability: 9 } },
    ],
  },
  {
    id: "cafe", label: "Café des Amis", short: "Кафе", district: "Canal Saint-Martin", x: "31%", y: "38%", art: "cafe", npc: "malik",
    description: "Подработка, дешёвый эспрессо и разговоры, где никто не ждёт идеальной грамматики.",
    actions: [
      { id: "shift", label: "Выйти на смену", detail: "+68 € · −22 сил", icon: "☕", hours: 4, effects: { money: 68, energy: -22, french: 4, stability: 5 } },
      { id: "espresso", label: "Выпить эспрессо", detail: "−4 € · +12 сил", icon: "◼", hours: 1, effects: { money: -4, energy: 12 } },
      { id: "chat", label: "Болтать у стойки", detail: "+язык · +связи", icon: "💬", hours: 2, effects: { energy: -6, french: 4, assimilation: 7 } },
    ],
  },
  {
    id: "prefecture", label: "Префектура", short: "Досье", district: "Île de la Cité", x: "69%", y: "48%", art: "office", npc: "bernard",
    description: "Записи, копии, переводы и главный ресурс иммигранта — терпение.",
    actions: [
      { id: "appointment", label: "Прийти по записи", detail: "+10 досье", icon: "🗂", hours: 3, effects: { energy: -14, admin: 10, stability: 3 } },
      { id: "copies", label: "Заверить копии", detail: "−24 € · +6 досье", icon: "▤", hours: 2, effects: { money: -24, energy: -7, admin: 6 } },
      { id: "taxes", label: "Проверить налоги", detail: "+досье · +опора", icon: "€", hours: 2, effects: { energy: -9, admin: 5, stability: 6 } },
    ],
  },
  {
    id: "louvre", label: "Лувр", short: "Лувр", district: "1er arrondissement", x: "47%", y: "47%", art: "louvre", npc: "luc",
    description: "Дворец, стеклянная пирамида и несколько тысяч лет культуры под одной крышей.",
    actions: [
      { id: "museum", label: "Исследовать зал", detail: "−17 € · +культура", icon: "◆", hours: 3, effects: { money: -17, energy: -9, french: 2, assimilation: 10 } },
      { id: "sketch", label: "Делать заметки", detail: "+язык · +культура", icon: "✎", hours: 2, effects: { energy: -7, french: 5, assimilation: 5 } },
    ],
  },
  {
    id: "eiffel", label: "Эйфелева башня", short: "Башня", district: "Champ de Mars", x: "18%", y: "18%", art: "eiffel", npc: "thomas",
    description: "Железный ориентир новой жизни. Особенно красив, когда включается подсветка.",
    actions: [
      { id: "walk", label: "Гулять по набережной", detail: "+культура · +силы", icon: "🚶", hours: 3, effects: { energy: 4, assimilation: 7, stability: 3 } },
      { id: "network", label: "Встреча сообщества", detail: "+язык · +опора", icon: "🤝", hours: 3, effects: { energy: -10, french: 4, assimilation: 5, stability: 7 } },
    ],
  },
  {
    id: "montmartre", label: "Монмартр", short: "Холм", district: "18e arrondissement", x: "46%", y: "15%", art: "montmartre", npc: "yuki",
    description: "Лестницы, мастерские и белый купол Сакре-Кёр над крышами города.",
    actions: [
      { id: "pleinair", label: "Рисовать на площади", detail: "+22 € · +культура", icon: "🎨", hours: 3, effects: { money: 22, energy: -11, assimilation: 8, stability: 3 } },
      { id: "picnic", label: "Пикник на ступенях", detail: "−14 € · +силы", icon: "🥖", hours: 2, effects: { money: -14, energy: 18, assimilation: 5 } },
    ],
  },
  {
    id: "notredame", label: "Нотр-Дам", short: "Собор", district: "Île de la Cité", x: "79%", y: "73%", art: "notredame", npc: "amina",
    description: "Готические башни, остров Сите и волонтёрский центр неподалёку.",
    actions: [
      { id: "volunteer", label: "Помочь волонтёрам", detail: "+10 культура", icon: "♡", hours: 4, effects: { energy: -18, french: 4, assimilation: 10, stability: 5 } },
      { id: "history", label: "Историческая прогулка", detail: "+язык · +культура", icon: "⌛", hours: 3, effects: { money: -8, energy: -8, french: 3, assimilation: 7 } },
    ],
  },
];

const storyEvents: StoryEvent[] = [
  {
    id: "housing", kicker: "ПЕРВЫЙ КВЕСТ", title: "Хозяин просит гаранта",
    body: "Ключи почти у тебя, но propriétaire хочет французского гаранта и ответ до вечера.", npc: "claire",
    choices: [
      { label: "Оформить Visale", hint: "Надёжно, но придётся разобраться", result: "Ты прошёл онлайн-проверку и получил гарантию. Первая победа над системой!", effects: { energy: -10, admin: 10, stability: 8 } },
      { label: "Снять комнату через знакомых", hint: "Дешевле, но менее стабильно", result: "Клэр познакомила тебя с хозяйкой мансарды. Тесно, зато появилось первое местное знакомство.", effects: { money: -45, assimilation: 7, stability: 3 } },
    ],
  },
  {
    id: "metro", kicker: "ГОРОДСКАЯ ЖИЗНЬ", title: "Забастовка транспорта",
    body: "Метро закрыто, а через час у тебя важная встреча на другом берегу Сены.", npc: "malik",
    choices: [
      { label: "Взять Vélib’", hint: "Быстро, мокро, по-парижски", result: "Ты приезжаешь под дождём, но вовремя. Теперь велодорожки кажутся чуть менее страшными.", effects: { money: -6, energy: -13, assimilation: 8, stability: 4 } },
      { label: "Предупредить и идти пешком", hint: "Честно и спокойно", result: "Твоё сообщение на французском поняли. Встречу перенесли без драмы.", effects: { energy: -8, french: 5, admin: 3 } },
    ],
  },
  {
    id: "language", kicker: "СЛОЖНЫЙ РАЗГОВОР", title: "Фраза прозвучала грубо",
    body: "Ты перепутал tu и vous. Собеседник замолчал, а очередь за спиной стала длиннее.", npc: "ines",
    choices: [
      { label: "Извиниться и переспросить", hint: "Неловко, зато полезно", result: "Инес объяснила оттенок фразы. Ошибка превратилась в маленький урок.", effects: { french: 9, assimilation: 5, energy: -4 } },
      { label: "Перейти на английский", hint: "Разговор закончится быстрее", result: "Вопрос решён, но ощущение дистанции осталось.", effects: { admin: 4, stability: -4 } },
    ],
  },
  {
    id: "document", kicker: "ДОСЬЕ", title: "Не хватает перевода",
    body: "В префектуре заметили, что свидетельство переведено не присяжным переводчиком.", npc: "bernard",
    choices: [
      { label: "Заказать срочный перевод", hint: "−90 €, запись сохраняется", result: "Дорого, зато Бернар принимает обновлённое досье сегодня.", effects: { money: -90, admin: 13, stability: 8 } },
      { label: "Перенести rendez-vous", hint: "Деньги целы, время потеряно", result: "Новая запись через месяц. Ты заносишь требования в отдельный список.", effects: { energy: -12, admin: 6, stability: -5 } },
    ],
  },
  {
    id: "opportunity", kicker: "ВОЗМОЖНОСТЬ", title: "Тебя зовут на пробный день",
    body: "Тома предлагает короткий контракт. Он поможет с опытом, но неделя станет очень плотной.", npc: "thomas",
    choices: [
      { label: "Согласиться", hint: "+деньги и опыт, −силы", result: "Пробный день проходит хорошо. В резюме появляется первая французская строка.", effects: { money: 160, energy: -22, french: 6, stability: 12 } },
      { label: "Сначала укрепить язык", hint: "Медленнее, но увереннее", result: "Ты честно объясняешь план. Тома оставляет контакт и присылает полезный курс.", effects: { french: 10, assimilation: 4, stability: 3 } },
    ],
  },
  {
    id: "renewal", kicker: "ПОВОРОТНЫЙ МОМЕНТ", title: "Продление ВНЖ",
    body: "Срок карты истекает через четыре месяца. Можно подать заранее или ещё немного подождать справку с работы.", npc: "amina",
    choices: [
      { label: "Подать заранее", hint: "Спокойнее, но −45 €", result: "Ты получаешь récépissé и впервые выходишь из префектуры без тревоги.", effects: { money: -45, admin: 14, stability: 12 } },
      { label: "Дождаться сильного досье", hint: "Рискованнее, зато убедительнее", result: "Справка пришла вовремя. Риск оправдался, но стоил нескольких бессонных вечеров.", effects: { energy: -18, admin: 9, stability: 5 } },
    ],
  },
];

const yearGoals = [
  { french: 25, admin: 18, assimilation: 15, stability: 10, title: "Обустройство" },
  { french: 38, admin: 30, assimilation: 30, stability: 25, title: "Закрепление" },
  { french: 52, admin: 42, assimilation: 45, stability: 40, title: "Своя среда" },
  { french: 65, admin: 55, assimilation: 60, stability: 55, title: "Долгосрочная жизнь" },
  { french: 72, admin: 65, assimilation: 72, stability: 65, title: "Натурализация" },
];

const testQuestions = [
  { question: "Как звучит девиз Французской Республики?", answers: ["Liberté, Égalité, Fraternité", "Travail, Famille, Patrie", "Unité, Force, Honneur"], correct: 0 },
  { question: "Когда отмечается национальный праздник Франции?", answers: ["8 мая", "14 июля", "11 ноября"], correct: 1 },
  { question: "Что означает принцип laïcité?", answers: ["Запрет религии", "Нейтральность государства и свободу совести", "Обязательную государственную религию"], correct: 1 },
  { question: "Кто такая Марианна?", answers: ["Королева Франции", "Автор гимна", "Символ Республики"], correct: 2 },
  { question: "Что важно для натурализации в этой игре?", answers: ["Только прожить пять лет", "Язык, интеграция, стабильность и досье", "Посетить все музеи"], correct: 1 },
];

const defaultProfile: Profile = { name: "", gender: "Другое", age: 24 };
const emptyStats: Stats = { energy: 75, money: 1200, french: 10, admin: 5, assimilation: 3, stability: 4 };

function clampStats(stats: Stats): Stats {
  return {
    energy: Math.max(0, Math.min(100, stats.energy)),
    money: Math.max(-500, stats.money),
    french: Math.max(0, Math.min(100, stats.french)),
    admin: Math.max(0, Math.min(100, stats.admin)),
    assimilation: Math.max(0, Math.min(100, stats.assimilation)),
    stability: Math.max(0, Math.min(100, stats.stability)),
  };
}

function applyEffects(stats: Stats, effects: Partial<Stats>) {
  const next = { ...stats };
  (Object.keys(effects) as StatKey[]).forEach((key) => {
    next[key] += effects[key] ?? 0;
  });
  return clampStats(next);
}

function formatTime(time: number) {
  return `${String(Math.floor(time)).padStart(2, "0")}:00`;
}

function PixelPortrait({ npc, small = false, unknown = false }: { npc: Npc; small?: boolean; unknown?: boolean }) {
  return (
    <div className={`pixel-portrait ${small ? "is-small" : ""} ${unknown ? "is-unknown" : ""}`} style={{ "--shirt": npc.color, "--hair": npc.hair } as React.CSSProperties} aria-hidden="true">
      <div className="portrait-hair" />
      <div className="portrait-face">
        <i className="eye left" /><i className="eye right" />
        {npc.accessory === "glasses" && <i className="glasses" />}
        {npc.accessory === "moustache" && <i className="moustache" />}
        {npc.accessory === "scarf" && <i className="scarf" />}
      </div>
      {npc.accessory === "beret" && <div className="beret" />}
      <div className="portrait-body" />
    </div>
  );
}

function LandmarkArt({ type }: { type: string }) {
  return (
    <div className={`landmark landmark-${type}`} aria-hidden="true">
      <span className="landmark-piece one" />
      <span className="landmark-piece two" />
      <span className="landmark-piece three" />
      <span className="landmark-piece four" />
    </div>
  );
}

function StatMeter({ label, value, icon, money = false }: { label: string; value: number; icon: string; money?: boolean }) {
  return (
    <div className={`stat-meter ${money ? "is-money" : ""}`}>
      <div className="stat-top"><span>{icon} {label}</span><strong>{money ? `${value} €` : `${value}%`}</strong></div>
      {!money && <div className="meter-track"><span style={{ width: `${Math.max(0, value)}%` }} /></div>}
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [routeId, setRouteId] = useState("licence");
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [year, setYear] = useState(1);
  const [day, setDay] = useState(1);
  const [time, setTime] = useState(7);
  const [locationId, setLocationId] = useState("home");
  const [awake, setAwake] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [seenEvents, setSeenEvents] = useState<string[]>([]);
  const [activeEvent, setActiveEvent] = useState<StoryEvent | null>(null);
  const [eventResult, setEventResult] = useState("");
  const [metNpcs, setMetNpcs] = useState<string[]>([]);
  const [journal, setJournal] = useState<string[]>(["Ты прибыл в Париж. Всё только начинается."]);
  const [toast, setToast] = useState("");
  const [showJournal, setShowJournal] = useState(false);
  const [savedGame, setSavedGame] = useState<SavedGame | null>(null);
  const [testIndex, setTestIndex] = useState(0);
  const [testScore, setTestScore] = useState(0);
  const [testFeedback, setTestFeedback] = useState("");

  const selectedRoute = routes.find((route) => route.id === routeId) ?? routes[0];
  const currentLocation = locations.find((location) => location.id === locationId) ?? locations[0];
  const currentNpc = npcs.find((npc) => npc.id === currentLocation.npc) ?? npcs[0];
  const goal = yearGoals[Math.min(year - 1, yearGoals.length - 1)];
  const goalsMet = stats.french >= goal.french && stats.admin >= goal.admin && stats.assimilation >= goal.assimilation && stats.stability >= goal.stability;

  const sky = useMemo(() => {
    if (time < 7) return "night";
    if (time < 9) return "dawn";
    if (time < 18) return "day";
    if (time < 21) return "sunset";
    return "night";
  }, [time]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedGame;
        const timeout = window.setTimeout(() => setSavedGame(parsed), 0);
        return () => window.clearTimeout(timeout);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (phase !== "game" || !profile.name) return;
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [phase, profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const addJournal = (entry: string) => setJournal((items) => [entry, ...items].slice(0, 30));

  const beginGame = () => {
    setStats(selectedRoute.start);
    setYear(1); setDay(1); setTime(7); setLocationId("home"); setAwake(false);
    setActionCount(0); setSeenEvents([]); setMetNpcs([]);
    setJournal([`${profile.name} начинает путь «${selectedRoute.label}».`, "Ты прибыл в Париж. Всё только начинается."]);
    setPhase("game");
  };

  const resumeGame = () => {
    if (!savedGame) return;
    setProfile(savedGame.profile); setRouteId(savedGame.routeId); setStats(savedGame.stats);
    setYear(savedGame.year); setDay(savedGame.day); setTime(savedGame.time); setLocationId(savedGame.locationId);
    setActionCount(savedGame.actionCount); setSeenEvents(savedGame.seenEvents); setMetNpcs(savedGame.metNpcs); setJournal(savedGame.journal);
    setAwake(true); setPhase("game");
  };

  const startFresh = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedGame(null); setProfile(defaultProfile); setPhase("setup");
  };

  const exitToTitle = () => {
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    setSavedGame(save);
    setPhase("intro");
  };

  const wakeUp = (hour: number, energy: number, label: string) => {
    setTime(hour); setStats((current) => applyEffects(current, { energy })); setAwake(true);
    addJournal(`День ${day}: ${label.toLowerCase()}.`);
    setToast(`День ${day} начался в ${formatTime(hour)}`);
  };

  const finishDay = () => {
    setDay((value) => value + 1); setTime(6); setAwake(false); setLocationId("home");
    setStats((current) => applyEffects(current, { energy: 18 }));
    addJournal(`День ${day} завершён. Париж затихает за окном.`);
  };

  const maybeTriggerEvent = (nextCount: number) => {
    const thresholds = [1, 4, 7, 10, 14, 18];
    const index = thresholds.findIndex((threshold) => threshold === nextCount);
    if (index >= 0) {
      const event = storyEvents[index];
      if (!seenEvents.includes(event.id)) {
        setSeenEvents((items) => [...items, event.id]);
        setActiveEvent(event);
      }
    }
  };

  const performAction = (action: Action) => {
    if (!awake) return;
    if (stats.energy <= 5 && action.effects.energy && action.effects.energy < 1) {
      setToast("Сил почти нет. Отдохни или заверши день.");
      return;
    }
    const nextTime = time + action.hours;
    const nextCount = actionCount + 1;
    setStats((current) => applyEffects(current, action.effects));
    setActionCount(nextCount);
    addJournal(`${formatTime(time)} · ${currentLocation.short}: ${action.label}.`);
    setToast(`${action.label} · прошло ${action.hours} ч.`);
    maybeTriggerEvent(nextCount);
    if (nextTime >= 24) {
      setDay((value) => value + 1); setTime(6); setAwake(false); setLocationId("home");
    } else {
      setTime(nextTime);
    }
  };

  const travelTo = (id: string) => {
    if (!awake || id === locationId) return;
    if (time >= 23) { setToast("Слишком поздно для поездки. Пора домой."); return; }
    const destination = locations.find((location) => location.id === id);
    setLocationId(id); setTime((value) => value + 1); setStats((current) => applyEffects(current, { energy: -3 }));
    if (destination) setToast(`Métro → ${destination.short} · 1 ч.`);
  };

  const talkToNpc = () => {
    const firstMeeting = !metNpcs.includes(currentNpc.id);
    if (firstMeeting) setMetNpcs((items) => [...items, currentNpc.id]);
    setStats((current) => applyEffects(current, { energy: -3, french: firstMeeting ? 4 : 2, assimilation: firstMeeting ? 5 : 2 }));
    setTime((value) => Math.min(23, value + 1));
    addJournal(`${currentNpc.name}: «${currentNpc.line}»`);
    setToast(firstMeeting ? `Новое знакомство: ${currentNpc.name}` : `Разговор с ${currentNpc.name}`);
  };

  const chooseStory = (choice: StoryChoice) => {
    setStats((current) => applyEffects(current, choice.effects));
    setEventResult(choice.result); addJournal(`${activeEvent?.title}: ${choice.result}`);
  };

  const closeStory = () => { setActiveEvent(null); setEventResult(""); };

  const advanceYear = () => {
    if (!goalsMet) { setToast("Сначала выполни цели года."); return; }
    if (year >= 5) {
      setTestIndex(0); setTestScore(0); setTestFeedback(""); setPhase("test");
      return;
    }
    const nextYear = year + 1;
    setYear(nextYear); setDay((value) => value + 1); setTime(7); setAwake(false); setLocationId("home");
    setStats((current) => applyEffects(current, { energy: 22, money: 240, stability: 4 }));
    addJournal(`Год ${year} завершён. Начинается глава «${yearGoals[nextYear - 1].title}».`);
    setToast(`Год ${nextYear} · ${yearGoals[nextYear - 1].title}`);
  };

  const answerTest = (answer: number) => {
    if (testFeedback) return;
    const correct = answer === testQuestions[testIndex].correct;
    if (correct) setTestScore((score) => score + 1);
    setTestFeedback(correct ? "Верно — très bien!" : "Не совсем. Запомни правильный ответ и двигайся дальше.");
  };

  const nextQuestion = () => {
    const finalScore = testScore;
    if (testIndex >= testQuestions.length - 1) {
      if (finalScore >= 4) {
        localStorage.removeItem(STORAGE_KEY); setPhase("ending");
      } else {
        setTestIndex(0); setTestScore(0); setTestFeedback("");
        setToast("Нужно 4 из 5. Попробуй ещё раз!");
      }
      return;
    }
    setTestIndex((index) => index + 1); setTestFeedback("");
  };

  if (phase === "intro") {
    return (
      <main className="title-screen">
        <div className="title-sky"><div className="pixel-sun" /><div className="cloud cloud-one" /><div className="cloud cloud-two" /></div>
        <div className="title-city" aria-hidden="true"><div className="roofline" /><div className="title-tower"><span /></div><div className="seine" /></div>
        <section className="title-card">
          <div className="tiny-flag"><i /><i /><i /></div>
          <p className="eyebrow">СИМУЛЯТОР НОВОЙ ЖИЗНИ</p>
          <h1>PARIS,<br /><span>NOUVELLE VIE</span></h1>
          <p className="title-copy">Переезд — это не один билет. Это сотни маленьких решений, пять важных лет и город, который постепенно становится твоим.</p>
          <div className="title-actions">
            <button className="pixel-button primary" onClick={startFresh}>Новая история <span>→</span></button>
            {savedGame && <button className="pixel-button secondary" onClick={resumeGame}>Продолжить · год {savedGame.year}</button>}
          </div>
          <p className="legal-note">Игровая модель. Не является юридической консультацией.</p>
        </section>
      </main>
    );
  }

  if (phase === "setup") {
    return (
      <main className="paper-screen">
        <section className="paper-card setup-card">
          <button className="back-link" onClick={() => setPhase("intro")}>← На титульный экран</button>
          <div className="step-stamp">DOSSIER · 01</div>
          <p className="eyebrow ink">СОЗДАНИЕ ПЕРСОНАЖА</p>
          <h2>Кто начинает эту историю?</h2>
          <p className="form-lede">Данные влияют на обращение персонажей, но не ограничивают доступные пути.</p>
          <div className="avatar-preview"><div className="player-avatar"><span className="player-hair" /><span className="player-face" /><span className="player-body" /></div><div><strong>{profile.name || "Ваше имя"}</strong><small>Будущий парижанин · уровень 1</small></div></div>
          <label className="field-label">Имя
            <input value={profile.name} maxLength={24} placeholder="Например, Саша" onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          </label>
          <div className="field-label">Пол
            <div className="segmented" role="group" aria-label="Пол">
              {(["Женщина", "Мужчина", "Другое"] as Gender[]).map((gender) => <button key={gender} className={profile.gender === gender ? "active" : ""} onClick={() => setProfile({ ...profile, gender })}>{gender}</button>)}
            </div>
          </div>
          <label className="field-label">Возраст <span>{profile.age}</span>
            <input type="range" min="18" max="55" value={profile.age} onChange={(event) => setProfile({ ...profile, age: Number(event.target.value) })} />
          </label>
          <button className="pixel-button primary wide" disabled={!profile.name.trim()} onClick={() => setPhase("route")}>Выбрать путь переезда →</button>
        </section>
      </main>
    );
  }

  if (phase === "route") {
    return (
      <main className="paper-screen route-screen">
        <section className="route-wrap">
          <button className="back-link" onClick={() => setPhase("setup")}>← Назад к персонажу</button>
          <div className="step-stamp">DOSSIER · 02</div>
          <p className="eyebrow ink">ОСНОВАНИЕ ДЛЯ ПЕРЕЕЗДА</p>
          <h2>Как {profile.name} попадёт во Францию?</h2>
          <p className="form-lede">У каждого пути свой стартовый запас денег, документов и устойчивости. Гражданство остаётся общей финальной целью.</p>
          <div className="route-grid">
            {routes.map((route) => (
              <button key={route.id} className={`route-card ${routeId === route.id ? "selected" : ""}`} onClick={() => setRouteId(route.id)}>
                <span className="route-icon">{route.icon}</span><span className="route-check">✓</span>
                <strong>{route.label}</strong><small>{route.subtitle}</small><p>{route.description}</p>
                <span className="route-meta"><b>{route.duration}</b><em>{route.difficulty}</em></span>
              </button>
            ))}
          </div>
          <div className="route-quest"><span>ГЛАВНАЯ ЛИНИЯ</span><p>{selectedRoute.quest}</p></div>
          <button className="pixel-button primary wide" onClick={beginGame}>Приземлиться в Париже ✈</button>
        </section>
      </main>
    );
  }

  if (phase === "test") {
    const question = testQuestions[testIndex];
    return (
      <main className="test-screen">
        <section className="test-building"><div className="republic-mark">RF</div><p>RÉPUBLIQUE FRANÇAISE</p><div className="tricolor-line" /></section>
        <section className="test-card">
          <div className="test-head"><span>ENTRETIEN D’ASSIMILATION</span><b>{testIndex + 1} / {testQuestions.length}</b></div>
          <div className="test-progress"><span style={{ width: `${((testIndex + 1) / testQuestions.length) * 100}%` }} /></div>
          <p className="eyebrow ink">ФИНАЛЬНОЕ ИСПЫТАНИЕ</p><h2>{question.question}</h2>
          <div className="answer-list">
            {question.answers.map((answer, index) => <button key={answer} disabled={!!testFeedback} onClick={() => answerTest(index)}><span>{String.fromCharCode(65 + index)}</span>{answer}</button>)}
          </div>
          {testFeedback && <div className="test-feedback"><p>{testFeedback}</p><button className="pixel-button primary" onClick={nextQuestion}>{testIndex === testQuestions.length - 1 ? "Узнать решение" : "Следующий вопрос →"}</button></div>}
          <p className="score-note">Нужно минимум 4 правильных ответа · сейчас {testScore}</p>
        </section>
      </main>
    );
  }

  if (phase === "ending") {
    return (
      <main className="ending-screen">
        <div className="fireworks"><i /><i /><i /></div>
        <section className="citizenship-card">
          <div className="gold-seal">RF</div><p className="eyebrow ink">DÉCRET DE NATURALISATION</p>
          <h1>Félicitations,<br /><span>{profile.name}!</span></h1>
          <p>После пяти лет решений, ошибок, разговоров и новых привычек ты получаешь гражданство Франции.</p>
          <div className="ending-stats"><div><strong>{stats.french}%</strong><span>французский</span></div><div><strong>{stats.assimilation}%</strong><span>интеграция</span></div><div><strong>{metNpcs.length}/8</strong><span>друзей</span></div></div>
          <div className="ending-route">Путь: <b>{selectedRoute.label}</b> · Возраст на старте: <b>{profile.age}</b></div>
          <button className="pixel-button primary wide" onClick={() => { setPhase("intro"); setSavedGame(null); }}>Сыграть новую историю ↻</button>
          <p className="ending-tease">Следующая глава: работа, жильё и жизнь после получения паспорта.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`game-shell sky-${sky}`}>
      <header className="game-header">
        <div className="brand-mini"><span className="mini-tower">A</span><div><strong>PARIS, NOUVELLE VIE</strong><small>{selectedRoute.subtitle}</small></div></div>
        <div className="time-block"><span>ГОД {year} · ДЕНЬ {day}</span><strong>{formatTime(time)}</strong><em>{sky === "night" ? "Ночь" : sky === "sunset" ? "Закат" : sky === "dawn" ? "Рассвет" : "День"}</em></div>
        <div className="header-actions"><button onClick={() => setShowJournal(true)}>▤ Журнал</button><button onClick={exitToTitle}>Сохранить и выйти</button></div>
      </header>

      <div className="game-layout">
        <aside className="left-panel pixel-panel">
          <div className="player-card"><div className="player-avatar small"><span className="player-hair" /><span className="player-face" /><span className="player-body" /></div><div><strong>{profile.name}</strong><small>{profile.age} лет · год {year}/5</small></div></div>
          <div className="stats-list">
            <StatMeter label="Силы" value={stats.energy} icon="♥" />
            <StatMeter label="Деньги" value={stats.money} icon="€" money />
            <StatMeter label="Французский" value={stats.french} icon="FR" />
            <StatMeter label="Досье" value={stats.admin} icon="▤" />
            <StatMeter label="Интеграция" value={stats.assimilation} icon="◆" />
            <StatMeter label="Опора" value={stats.stability} icon="⌂" />
          </div>
          <div className="goal-card">
            <div className="goal-title"><span>ЦЕЛИ · ГОД {year}</span><b>{goal.title}</b></div>
            {(["french", "admin", "assimilation", "stability"] as const).map((key) => {
              const labels = { french: "Язык", admin: "Досье", assimilation: "Интеграция", stability: "Опора" };
              const met = stats[key] >= goal[key];
              return <div className={`goal-line ${met ? "met" : ""}`} key={key}><i>{met ? "✓" : "·"}</i><span>{labels[key]}</span><b>{stats[key]}/{goal[key]}</b></div>;
            })}
            <button className={`year-button ${goalsMet ? "ready" : ""}`} disabled={!goalsMet} onClick={advanceYear}>{year === 5 ? "Подать на гражданство" : `Завершить год ${year}`} →</button>
          </div>
        </aside>

        <section className="map-panel">
          <div className="paris-sky"><div className="sun-or-moon" /><div className="sky-cloud c1" /><div className="sky-cloud c2" /></div>
          <div className="map-name">PARIS <span>CARTE DE LA VILLE</span></div>
          <div className="seine-map"><span>LA SEINE</span></div>
          <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
          {locations.map((location) => (
            <button key={location.id} className={`map-location ${locationId === location.id ? "active" : ""}`} style={{ left: location.x, top: location.y }} onClick={() => travelTo(location.id)} aria-label={`Перейти: ${location.label}`}>
              <LandmarkArt type={location.art} /><span>{location.short}</span>{locationId === location.id && <i className="you-pin">ВЫ</i>}
            </button>
          ))}
          <div className="map-grain" />
        </section>

        <aside className="right-panel pixel-panel">
          <div className="location-heading"><span>СЕЙЧАС ВЫ ЗДЕСЬ</span><h2>{currentLocation.label}</h2><p>{currentLocation.district}</p></div>
          <div className="location-scene"><LandmarkArt type={currentLocation.art} /><div className="scene-copy"><p>{currentLocation.description}</p></div></div>
          <div className="npc-card"><PixelPortrait npc={currentNpc} small /><div><span>{currentNpc.role}</span><strong>{currentNpc.name}</strong><p>«{currentNpc.line}»</p></div></div>
          <button className="talk-button" disabled={!awake} onClick={talkToNpc}>Поговорить · 1 ч. {metNpcs.includes(currentNpc.id) ? "" : "· новое знакомство"}</button>
          <div className="actions-title"><span>ЧТО ДЕЛАТЬ?</span><b>{awake ? `до полуночи ${24 - time} ч.` : "сначала проснись"}</b></div>
          <div className="action-list">
            {currentLocation.actions.map((action) => <button key={action.id} disabled={!awake} onClick={() => performAction(action)}><span className="action-icon">{action.icon}</span><span><strong>{action.label}</strong><small>{action.detail} · {action.hours} ч.</small></span><b>›</b></button>)}
          </div>
          {awake && <button className="end-day" onClick={finishDay}>Завершить день · вернуться домой</button>}
        </aside>
      </div>

      <footer className="game-footer"><span>Кликните по месту на карте, чтобы добраться на метро · поездка занимает 1 час</span><div>{npcs.map((npc) => <span key={npc.id} title={npc.name} className={metNpcs.includes(npc.id) ? "met" : ""}><PixelPortrait npc={npc} small unknown={!metNpcs.includes(npc.id)} /></span>)}</div></footer>

      {!awake && !activeEvent && (
        <div className="modal-backdrop morning-backdrop">
          <section className="morning-modal">
            <div className={`window-view sky-${sky}`}><div className="window-sun" /><div className="window-roofs" /><span>PARIS · ДЕНЬ {day}</span></div>
            <div className="morning-copy"><p className="eyebrow ink">НОВОЕ УТРО</p><h2>Как начнётся день?</h2><p>Выбор времени влияет на запас сил и количество дел, которые ты успеешь.</p>
              <div className="wake-options">
                <button onClick={() => wakeUp(7, 22, "Ранний подъём")}><b>07:00</b><span>Ранний подъём</span><small>+22 силы · длинный день</small></button>
                <button onClick={() => wakeUp(9, 32, "Спокойное утро")}><b>09:00</b><span>Спокойное утро</span><small>+32 силы · баланс</small></button>
                <button onClick={() => wakeUp(11, 45, "Выспаться")}><b>11:00</b><span>Выспаться</span><small>+45 сил · меньше времени</small></button>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeEvent && (
        <div className="modal-backdrop">
          <section className="story-modal">
            <div className="story-stripe" /><div className="story-npc"><PixelPortrait npc={npcs.find((npc) => npc.id === activeEvent.npc) ?? npcs[0]} /><span>СОБЫТИЕ</span></div>
            <div className="story-content"><p className="eyebrow ink">{activeEvent.kicker}</p><h2>{activeEvent.title}</h2><p>{eventResult || activeEvent.body}</p>
              {!eventResult ? <div className="story-choices">{activeEvent.choices.map((choice) => <button key={choice.label} onClick={() => chooseStory(choice)}><strong>{choice.label}</strong><small>{choice.hint}</small><span>→</span></button>)}</div> : <button className="pixel-button primary" onClick={closeStory}>Продолжить историю →</button>}
            </div>
          </section>
        </div>
      )}

      {showJournal && <div className="modal-backdrop"><section className="journal-modal"><button className="modal-close" onClick={() => setShowJournal(false)}>×</button><p className="eyebrow ink">CHRONIQUE</p><h2>Журнал {profile.name}</h2><div className="journal-list">{journal.map((entry, index) => <div key={`${entry}-${index}`}><span>{journal.length - index}</span><p>{entry}</p></div>)}</div></section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
