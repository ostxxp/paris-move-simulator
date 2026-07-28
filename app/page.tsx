"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import metroSchematic from "./game/paris-metro-schematic.json";

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

type TravelMode = "metro" | "bike" | "walk";
type SideTab = "actions" | "people" | "event";
type MetroDecisionStage = "line" | "direction";

type MetroLineDef = {
  id: string;
  name: string;
  color: string;
  text: string;
  stations: string[];
};

type MetroLeg = {
  lineId: string;
  from: string;
  to: string;
  direction: string;
  stops: number;
};

type MetroTrip = {
  destination: LocationDef;
  legs: MetroLeg[];
  minutes: number;
};

type ActiveTravel = {
  mode: TravelMode;
  originId: string;
  destinationId: string;
  minutes: number;
  legs: MetroLeg[];
};

type DayProgress = {
  actions: number;
  talks: number;
  travels: number;
  french: number;
  admin: number;
  culture: number;
  earned: number;
};

type DialogueChoice = {
  label: string;
  response: string;
  effects: Partial<Stats>;
};

type DialogueDef = {
  intro: string;
  greeting: string;
  choices: DialogueChoice[];
};

type DialogueRound = {
  prompt: string;
  choices: DialogueChoice[];
};

type DialogueMission = {
  id: string;
  kind: "ПОРУЧЕНИЕ" | "РАЗУЗНАТЬ" | "ЛИЧНАЯ ИСТОРИЯ";
  title: string;
  goal: string;
  task: string;
  knowledge: string;
  durationMinutes: number;
};

type NpcAssignment = {
  missionId: string;
  title: string;
  task: string;
  knowledge: string;
};

type CityEvent = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  locationId: string;
  hours: number;
  effects: Partial<Stats>;
};

type DailyTask = {
  id: string;
  trigger: "visit" | "talk" | "action";
  targetId: string;
  locationId: string;
  label: string;
  detail: string;
};

type ActiveAction = {
  action: Action;
  locationId: string;
  startTime: number;
};

type ActivityKind = "home" | "cafe" | "study" | "admin" | "culture" | "walk" | "community";

type AchievementDef = {
  id: string;
  icon: string;
  title: string;
  description: string;
  kind: "npcs" | "visited" | "events" | "french" | "admin" | "assimilation";
  target: number;
};

type StoryChapter = {
  episode: string;
  title: string;
  summary: string;
  mission: string;
  stakes: string;
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
  dailyProgress?: DayProgress;
  dailyRewardClaimed?: boolean;
  visitedLocations?: string[];
  completedCityEvents?: string[];
  completedDailyTaskIds?: string[];
  chapterProgressPoints?: number;
  npcDialogueProgress?: Record<string, number>;
  relationships?: Record<string, number>;
  npcAssignments?: Record<string, NpcAssignment>;
};

const STORAGE_KEY = "paris-nouvelle-vie-save-v1";
const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const emptyDayProgress: DayProgress = { actions: 0, talks: 0, travels: 0, french: 0, admin: 0, culture: 0, earned: 0 };

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
    id: "home", label: "Мансарда", short: "Квартира · 11e", district: "11e arrondissement", x: "80%", y: "76%", art: "home", npc: "claire",
    description: "Крошечная квартира под крышей. Отсюда начинается каждый день.",
    actions: [
      { id: "unpack", label: "Распаковать коробки", detail: "+уют · +опора", icon: "▣", hours: 2, effects: { energy: -7, assimilation: 2, stability: 5 } },
      { id: "insurance", label: "Оформить страховку жилья", detail: "−45 € · +досье", icon: "⌂", hours: 1, effects: { money: -45, energy: -4, admin: 7, stability: 3 } },
      { id: "address", label: "Собрать подтверждение адреса", detail: "договор + страховка + счёт", icon: "▤", hours: 2, effects: { energy: -8, admin: 9, stability: 4 } },
    ],
  },
  {
    id: "sorbonne", label: "Сорбонна", short: "Сорбонна · 5e", district: "Quartier latin", x: "56%", y: "79%", art: "university", npc: "ines",
    description: "Аудитории, библиотека и слишком быстрый французский преподавателей.",
    actions: [
      { id: "class", label: "Пойти на занятие", detail: "+8 язык", icon: "📖", hours: 3, effects: { energy: -16, french: 8, assimilation: 3 } },
      { id: "library", label: "Засесть в библиотеке", detail: "+5 язык · +досье", icon: "📝", hours: 2, effects: { energy: -10, french: 5, admin: 2 } },
      { id: "exam", label: "Сдать модуль", detail: "+стабильность", icon: "✓", hours: 4, effects: { energy: -24, french: 6, stability: 9 } },
    ],
  },
  {
    id: "cafe", label: "Café des Amis", short: "Кафе · Canal", district: "Canal Saint-Martin", x: "76%", y: "27%", art: "cafe", npc: "malik",
    description: "Подработка, дешёвый эспрессо и разговоры, где никто не ждёт идеальной грамматики.",
    actions: [
      { id: "shift", label: "Выйти на смену", detail: "+68 € · −22 сил", icon: "☕", hours: 4, effects: { money: 68, energy: -22, french: 4, stability: 5 } },
      { id: "espresso", label: "Выпить эспрессо", detail: "−4 € · +12 сил", icon: "◼", hours: 1, effects: { money: -4, energy: 12 } },
      { id: "chat", label: "Болтать у стойки", detail: "+язык · +связи", icon: "💬", hours: 2, effects: { energy: -6, french: 4, assimilation: 7 } },
    ],
  },
  {
    id: "prefecture", label: "Префектура полиции", short: "Префектура · 4e", district: "Île de la Cité", x: "59%", y: "56%", art: "office", npc: "bernard",
    description: "Записи, копии, переводы и главный ресурс иммигранта — терпение.",
    actions: [
      { id: "appointment", label: "Прийти по записи", detail: "+10 досье", icon: "🗂", hours: 3, effects: { energy: -14, admin: 10, stability: 3 } },
      { id: "copies", label: "Заверить копии", detail: "−24 € · +6 досье", icon: "▤", hours: 2, effects: { money: -24, energy: -7, admin: 6 } },
      { id: "taxes", label: "Проверить налоги", detail: "+досье · +опора", icon: "€", hours: 2, effects: { energy: -9, admin: 5, stability: 6 } },
    ],
  },
  {
    id: "louvre", label: "Лувр", short: "Лувр · 1er", district: "1er arrondissement", x: "43%", y: "47%", art: "louvre", npc: "luc",
    description: "Дворец, стеклянная пирамида и несколько тысяч лет культуры под одной крышей.",
    actions: [
      { id: "museum", label: "Исследовать зал", detail: "−17 € · +культура", icon: "◆", hours: 3, effects: { money: -17, energy: -9, french: 2, assimilation: 10 } },
      { id: "sketch", label: "Делать заметки", detail: "+язык · +культура", icon: "✎", hours: 2, effects: { energy: -7, french: 5, assimilation: 5 } },
    ],
  },
  {
    id: "eiffel", label: "Эйфелева башня", short: "Эйфелева башня · 7e", district: "Champ de Mars", x: "18%", y: "53%", art: "eiffel", npc: "thomas",
    description: "Железный ориентир новой жизни. Особенно красив, когда включается подсветка.",
    actions: [
      { id: "walk", label: "Гулять по набережной", detail: "+культура · +силы", icon: "🚶", hours: 3, effects: { energy: 4, assimilation: 7, stability: 3 } },
      { id: "network", label: "Встреча сообщества", detail: "+язык · +опора", icon: "🤝", hours: 3, effects: { energy: -10, french: 4, assimilation: 5, stability: 7 } },
    ],
  },
  {
    id: "montmartre", label: "Монмартр и Сакре-Кёр", short: "Монмартр · 18e", district: "18e arrondissement", x: "45%", y: "18%", art: "montmartre", npc: "yuki",
    description: "Лестницы, мастерские и белый купол Сакре-Кёр над крышами города.",
    actions: [
      { id: "pleinair", label: "Рисовать на площади", detail: "+22 € · +культура", icon: "🎨", hours: 3, effects: { money: 22, energy: -11, assimilation: 8, stability: 3 } },
      { id: "picnic", label: "Пикник на ступенях", detail: "−14 € · +силы", icon: "🥖", hours: 2, effects: { money: -14, energy: 18, assimilation: 5 } },
    ],
  },
  {
    id: "notredame", label: "Нотр-Дам де Пари", short: "Нотр-Дам · 4e", district: "Île de la Cité", x: "66%", y: "70%", art: "notredame", npc: "amina",
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

const dailyTaskSets: DailyTask[][] = [
  [
    { id: "cafe-arrive", trigger: "visit", targetId: "cafe", locationId: "cafe", label: "Доехать до Café des Amis", detail: "Открой карту → Café des Amis → выбери транспорт" },
    { id: "meet-malik", trigger: "talk", targetId: "malik", locationId: "cafe", label: "Представиться Малику", detail: "В кафе открой вкладку «Люди» и начни диалог" },
    { id: "first-shift", trigger: "action", targetId: "shift", locationId: "cafe", label: "Отработать короткую смену", detail: "В кафе открой «Дела» → «Выйти на смену»" },
  ],
  [
    { id: "sorbonne-arrive", trigger: "visit", targetId: "sorbonne", locationId: "sorbonne", label: "Добраться до Сорбонны", detail: "Выбери Сорбонну на карте Парижа" },
    { id: "meet-ines", trigger: "talk", targetId: "ines", locationId: "sorbonne", label: "Познакомиться с Инес", detail: "В Сорбонне открой вкладку «Люди»" },
    { id: "first-class", trigger: "action", targetId: "class", locationId: "sorbonne", label: "Посетить занятие", detail: "В Сорбонне выбери «Пойти на занятие»" },
  ],
  [
    { id: "prefecture-arrive", trigger: "visit", targetId: "prefecture", locationId: "prefecture", label: "Прийти в префектуру", detail: "На карте выбери «Префектура полиции»" },
    { id: "meet-bernard", trigger: "talk", targetId: "bernard", locationId: "prefecture", label: "Уточнить список у Бернара", detail: "Во вкладке «Люди» спроси о документах" },
    { id: "certify-copies", trigger: "action", targetId: "copies", locationId: "prefecture", label: "Заверить копии документов", detail: "Открой «Дела» → «Заверить копии»" },
  ],
  [
    { id: "louvre-arrive", trigger: "visit", targetId: "louvre", locationId: "louvre", label: "Добраться до Лувра", detail: "Построй маршрут до станции Palais Royal" },
    { id: "meet-luc", trigger: "talk", targetId: "luc", locationId: "louvre", label: "Познакомиться с Люком", detail: "В Лувре открой вкладку «Люди»" },
    { id: "explore-gallery", trigger: "action", targetId: "museum", locationId: "louvre", label: "Исследовать один зал", detail: "Открой «Дела» → «Исследовать зал»" },
  ],
];

const dialogues: Record<string, DialogueDef> = {
  claire: {
    intro: "Клэр живёт этажом ниже. Она первой замечает твои коробки на лестнице и предлагает помочь разобраться с домом.",
    greeting: "Я как раз хотела спросить: ты уже познакомился с соседями на лестничной площадке?",
    choices: [
      { label: "Пока стесняюсь. Как лучше начать?", response: "Просто скажи bonjour и представься. Здесь маленькая вежливость открывает большие двери.", effects: { french: 3, assimilation: 5 } },
      { label: "Да, и хочу устроить общий ужин.", response: "Вот это по-соседски! Я принесу тарт, а ты напиши приглашение в общий чат.", effects: { money: -10, assimilation: 7, stability: 4 } },
    ],
  },
  malik: {
    intro: "Малик — бариста Café des Amis. Он знает постоянных гостей, местные объявления и все способы не растеряться у стойки.",
    greeting: "Сегодня очередь не давит. Попробуешь заказать всё по-французски?",
    choices: [
      { label: "Un café allongé, s’il vous plaît.", response: "Parfait! И обязательно скажи sur place, если пьёшь здесь. Уже звучишь увереннее.", effects: { money: -4, french: 6, energy: 8 } },
      { label: "Лучше расскажи, где здесь ищут подработку.", response: "Оставь номер. По пятницам мне нужен человек на закрытие — начнёшь с короткой смены.", effects: { assimilation: 4, stability: 7 } },
    ],
  },
  ines: {
    intro: "Инес учится с тобой в Сорбонне. Она быстро говорит, ведёт идеальные конспекты и хорошо помнит собственный первый день.",
    greeting: "Преподаватель дал групповую презентацию. Возьмёшь устную часть или соберёшь материалы?",
    choices: [
      { label: "Возьму устную часть — пора говорить.", response: "Смело. Давай вечером прорепетируем, и я поправлю только самые важные ошибки.", effects: { energy: -5, french: 8, stability: 3 } },
      { label: "Сначала соберу источники в библиотеке.", response: "Хороший план. Я покажу, как здесь правильно оформляют bibliographie.", effects: { admin: 4, french: 3, stability: 4 } },
    ],
  },
  bernard: {
    intro: "Бернар принимает документы в префектуре. Он строг к формальностям, но охотно объясняет правила тем, кто задаёт точные вопросы.",
    greeting: "Ваше досье уже лучше. Но скажите: оригиналы документов сегодня с собой?",
    choices: [
      { label: "Да, и копии разложены по разделам.", response: "Редкая подготовка. С таким порядком следующий rendez-vous пройдёт заметно быстрее.", effects: { admin: 8, stability: 5 } },
      { label: "Нет. Можно донести их позже?", response: "Можно, но возьмите récépissé и сохраните номер обращения. Без него письмо легко потеряется.", effects: { energy: -3, admin: 5, french: 2 } },
    ],
  },
  yuki: {
    intro: "Юки рисует людей на Монмартре. Она замечает город не по памятникам, а по жестам, привычкам и маленьким сценам.",
    greeting: "Я рисую не базилику, а людей на ступенях. Хочешь присоединиться?",
    choices: [
      { label: "Дай карандаш — попробую быстрый портрет.", response: "Не гоняйся за сходством. Поймай жест — именно он потом вернёт этот день.", effects: { energy: -3, assimilation: 8 } },
      { label: "Лучше расспрошу туристов, откуда они.", response: "Тоже способ увидеть город. Париж всегда состоит из множества чужих историй.", effects: { french: 5, assimilation: 5 } },
    ],
  },
  luc: {
    intro: "Люк — историк и волонтёр музея. Вместо списка шедевров он предлагает выбрать одну историю и действительно её понять.",
    greeting: "У тебя есть час в Лувре. Итальянское Возрождение или история самой крепости?",
    choices: [
      { label: "Хочу понять, как дворец стал музеем.", response: "Тогда начнём с подземных стен. История города лучше запоминается ногами.", effects: { french: 3, assimilation: 8 } },
      { label: "Покажи одну картину, но подробно.", response: "Отличный выбор. Музей перестаёт утомлять, когда разрешаешь себе не увидеть всё.", effects: { energy: 3, assimilation: 7 } },
    ],
  },
  amina: {
    intro: "Амина координирует соседский волонтёрский центр. Она знакомит новичков с районом через совместные дела.",
    greeting: "В субботу мы собираем вещи для новых семей. Сможешь помочь два часа?",
    choices: [
      { label: "Да, запиши меня в команду.", response: "Спасибо. Там легко познакомиться с людьми — работа быстро снимает неловкость.", effects: { energy: -7, assimilation: 9, stability: 4 } },
      { label: "Не успею, но могу принести продукты.", response: "Это тоже помощь. Я пришлю список того, что действительно нужно.", effects: { money: -16, assimilation: 6 } },
    ],
  },
  thomas: {
    intro: "Тома — рекрутер из местного профессионального сообщества. Он помогает адаптировать опыт к французским собеседованиям.",
    greeting: "Представь, что собеседование началось. Почему ты хочешь работать именно здесь?",
    choices: [
      { label: "Хочу применить опыт и расти вместе с командой.", response: "Неплохо. Теперь добавь конкретный пример — во Франции любят ясную аргументацию.", effects: { french: 4, stability: 7 } },
      { label: "Мне прежде всего нужен стабильный статус.", response: "Честно, но работодателю важна и его выгода. Давай переформулируем ответ.", effects: { admin: 3, french: 5, stability: 3 } },
    ],
  },
};

const moreDialogues: Record<string, DialogueDef[]> = {
  claire: [
    { intro: "Клэр снова встречает тебя на лестнице.", greeting: "Ну как первая ночь? В мансардах трубы иногда стучат так, будто кто-то живёт в стене.", choices: [
      { label: "Честно? Я почти не спал.", response: "Тогда покажу вентиль отопления и дам номер gardien. В Париже половина спокойствия — знать, кому звонить.", effects: { french: 2, stability: 6 } },
      { label: "Зато вид из окна всё компенсирует.", response: "Вот это правильный настрой. Приходи вечером — покажу крыши, куда не водят туристов.", effects: { assimilation: 7, energy: 2 } },
    ] },
    { intro: "Клэр уже обращается к тебе как к соседу.", greeting: "В воскресенье у нас собрание жильцов. Хочешь пойти со мной и познакомиться со всеми?", choices: [
      { label: "Да, но помоги понять повестку.", response: "Конечно. Разберём слова про charges и travaux, а на встрече я тебя представлю.", effects: { french: 5, admin: 4, assimilation: 5 } },
      { label: "Лучше сначала помогу с общей лестницей.", response: "Поступок скажет больше речи. После этого тебя точно запомнят.", effects: { energy: -4, assimilation: 8, stability: 4 } },
    ] },
  ],
  malik: [
    { intro: "Малик уже помнит твой обычный заказ.", greeting: "У нас освободилась субботняя смена. Справишься с кассой полностью на французском?", choices: [
      { label: "Попробую, но сначала потренируем меню.", response: "Договорились. Самые опасные слова — noisette и allongé. Через час перестанешь путаться.", effects: { french: 7, stability: 5, energy: -3 } },
      { label: "Давай сразу в бой.", response: "Смело! Первые два заказа были неловкими, зато третий ты уже принял без подсказки.", effects: { money: 35, french: 5, assimilation: 6, energy: -7 } },
    ] },
    { intro: "Теперь Малик разговаривает с тобой между заказами.", greeting: "Постоянные гости хотят устроить вечер историй о переезде. Расскажешь свою?", choices: [
      { label: "Расскажу про первый день и потерянное метро.", response: "Все смеются не над тобой, а вместе с тобой. Оказывается, почти каждый однажды уезжал не в ту сторону.", effects: { french: 5, assimilation: 9 } },
      { label: "Лучше помогу вести вечер.", response: "Ты задаёшь вопросы другим и неожиданно становишься связующим человеком всей компании.", effects: { assimilation: 8, stability: 6 } },
    ] },
  ],
  ines: [
    { intro: "Инес оставляет тебе место рядом на лекции.", greeting: "После пары идём готовить exposé. Какую часть возьмёшь?", choices: [
      { label: "Сделаю вступление и вывод.", response: "Отлично: короткие части, зато именно их все запоминают. Проверим произношение вместе.", effects: { french: 7, stability: 4 } },
      { label: "Соберу статистику и источники.", response: "Тогда ты отвечаешь за точность. Я покажу университетские базы, куда редко заглядывают новички.", effects: { admin: 5, stability: 5 } },
    ] },
    { intro: "Инес предлагает поговорить уже не только об учёбе.", greeting: "Мы празднуем окончание модуля у Сены. Ты с нами или снова в библиотеку?", choices: [
      { label: "Сегодня точно с вами.", response: "Через час ты уже споришь о музыке и впервые не переводишь каждую фразу в голове.", effects: { energy: 5, french: 5, assimilation: 9 } },
      { label: "Зайду ненадолго после библиотеки.", response: "Баланс принят. Ты закрываешь конспект вовремя и всё равно успеваешь к общему фото.", effects: { french: 4, assimilation: 5, stability: 5 } },
    ] },
  ],
  bernard: [
    { intro: "Бернар узнаёт тебя у окна приёма.", greeting: "Сегодня проверим justificatif de domicile. Какие три документа вы принесли?", choices: [
      { label: "Договор, страховку жилья и счёт за электричество.", response: "Именно. Копии читаемые, адрес совпадает — этот раздел досье закрыт.", effects: { admin: 10, stability: 6 } },
      { label: "Договор и банковскую выписку. Этого хватит?", response: "Не совсем. Выписка полезна, но нужен свежий счёт или attestation d’hébergement.", effects: { admin: 6, french: 3 } },
    ] },
    { intro: "Бернар говорит уже менее официально.", greeting: "Ваше досье стало аккуратным. Осталось решить: подавать сейчас или дождаться ещё одной справки?", choices: [
      { label: "Подать сейчас и получить récépissé.", response: "Разумно. Я отмечу полный комплект и выдам подтверждение приёма.", effects: { admin: 9, stability: 8 } },
      { label: "Подождать справку и усилить пакет.", response: "Тоже допустимо. Запишите крайний срок, чтобы осторожность не превратилась в опоздание.", effects: { admin: 7, stability: 5 } },
    ] },
  ],
  yuki: [
    { intro: "Юки машет тебе с привычного места на ступенях.", greeting: "Сегодня рисуем один и тот же вид десятью линиями. Что оставишь на листе?", choices: [
      { label: "Купол, лестницу и силуэт прохожего.", response: "Хорошо. Ты уже выбираешь главное, а не пытаешься уместить весь Париж сразу.", effects: { assimilation: 8, energy: 3 } },
      { label: "Только людей и их движение.", response: "Ещё лучше. Город узнаётся не по камню, а по тому, как в нём живут.", effects: { french: 3, assimilation: 8 } },
    ] },
    { intro: "Юки показывает тебе небольшую папку с работами.", greeting: "В районной галерее есть место для одного твоего рисунка. Решишься выставить?", choices: [
      { label: "Да, выберем работу вместе.", response: "Мы берём самый честный набросок. На открытии незнакомые люди спрашивают о твоей истории.", effects: { assimilation: 10, stability: 6 } },
      { label: "Пока помогу оформить выставку.", response: "Ты развешиваешь работы и знакомишься со всей мастерской — тоже способ стать частью сцены.", effects: { energy: -4, assimilation: 8, stability: 4 } },
    ] },
  ],
  luc: [
    { intro: "Люк встречает тебя у нового музейного зала.", greeting: "Сегодня сравним два портрета. Сначала читаем табличку или смотрим сами?", choices: [
      { label: "Сначала посмотрим без подсказки.", response: "Верно. Ты замечаешь детали до того, как чужое объяснение успевает их заслонить.", effects: { french: 3, assimilation: 8 } },
      { label: "Хочу понять исторический контекст.", response: "Тогда начнём с эпохи и заказчика. Картина сразу превращается из декорации в разговор.", effects: { french: 6, assimilation: 6 } },
    ] },
    { intro: "Люк уже доверяет тебе отвечать на вопросы посетителей.", greeting: "Группа школьников потерялась между залами. Поможешь провести короткую экскурсию?", choices: [
      { label: "Проведу по трём любимым работам.", response: "Ты говоришь просто и живо. Люк улыбается: теперь музей звучит и твоим голосом.", effects: { french: 7, assimilation: 10, stability: 4 } },
      { label: "Лучше помогу составить маршрут.", response: "Ты строишь понятный путь без музейного марафона. Учителя забирают схему с собой.", effects: { admin: 4, assimilation: 7 } },
    ] },
  ],
  amina: [
    { intro: "Амина уже знает, на какую работу можно на тебя рассчитывать.", greeting: "Сегодня придут две новые семьи. Встретишь их или займёшься вещами на складе?", choices: [
      { label: "Встречу и объясню, как всё устроено.", response: "Ты узнаёшь в их растерянности себя и находишь именно те слова, которых когда-то не хватало.", effects: { french: 6, assimilation: 9 } },
      { label: "Разберу склад и подготовлю наборы.", response: "К вечеру хаос превращается в подписанные коробки. Команде становится заметно легче.", effects: { energy: -6, admin: 4, stability: 6 } },
    ] },
    { intro: "Амина предлагает тебе больше ответственности.", greeting: "Хочешь сам организовать маленькую соседскую акцию в следующем месяце?", choices: [
      { label: "Сделаем обмен книгами во дворе.", response: "Идея собирает весь квартал: дети приносят комиксы, соседи — романы, а ты ведёшь объявления.", effects: { french: 5, assimilation: 11, stability: 5 } },
      { label: "Организуем помощь новым жильцам.", response: "Ты составляешь понятный список первых шагов и превращаешь собственный опыт в поддержку для других.", effects: { admin: 5, assimilation: 9, stability: 6 } },
    ] },
  ],
  thomas: [
    { intro: "Тома присылает тебе комментарии к резюме.", greeting: "В CV всё понятно, но слишком общо. Какое достижение поставим первым?", choices: [
      { label: "Проект, где я отвечал за результат команды.", response: "Отлично. Добавим цифры и конкретную роль — теперь это доказательство, а не обещание.", effects: { french: 4, stability: 8 } },
      { label: "Опыт адаптации и работы на другом языке.", response: "Сильная история. Покажем её как навык, а не как оправдание.", effects: { french: 6, assimilation: 5, stability: 5 } },
    ] },
    { intro: "Тома зовёт тебя на тренировочное собеседование.", greeting: "Последний вопрос: где вы видите себя через три года во Франции?", choices: [
      { label: "В устойчивой команде с большей ответственностью.", response: "Конкретно и реалистично. Именно такой ответ показывает намерение строить жизнь надолго.", effects: { french: 5, stability: 10 } },
      { label: "Хочу развиваться и приносить пользу городу.", response: "Хорошая ценность, но добавим план. После правки ответ звучит и искренне, и убедительно.", effects: { french: 5, assimilation: 7, stability: 6 } },
    ] },
  ],
};

const dialogueMissions: Record<string, DialogueMission[]> = {
  claire: [
    { id: "claire-neighbours", kind: "РАЗУЗНАТЬ", title: "Код подъезда", goal: "Понять неписаные правила дома и представиться соседям.", task: "Поздороваться с консьержкой и оставить имя на почтовом ящике.", knowledge: "Всё о мусоре, тишине и gardien можно узнать на доске у лифта.", durationMinutes: 16 },
    { id: "claire-apartment", kind: "ПОРУЧЕНИЕ", title: "Старая мансарда", goal: "Разобраться с отоплением и не платить за чужой ремонт.", task: "Сфотографировать счётчик, кран и трещину; попросить у хозяина акт вселения.", knowledge: "Неисправность лучше фиксировать письменно до первой оплаты.", durationMinutes: 18 },
    { id: "claire-building", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "Стать соседом", goal: "Выйти из роли «новенького» и заявить о себе на собрании дома.", task: "Подготовить две фразы о шуме и общих charges для собрания жильцов.", knowledge: "Клэр сама когда-то боялась говорить на таких встречах.", durationMinutes: 22 },
  ],
  malik: [
    { id: "malik-order", kind: "РАЗУЗНАТЬ", title: "Французский у стойки", goal: "Научиться делать заказ и не теряться из-за быстрой речи.", task: "Заказать напиток, уточнив sur place и способ оплаты, без английского.", knowledge: "Noisette — это эспрессо с каплей молока, а не ореховый кофе.", durationMinutes: 15 },
    { id: "malik-shift", kind: "ПОРУЧЕНИЕ", title: "Субботняя смена", goal: "Получить первую реальную подработку и доверие Малика.", task: "Выйти на смену, выучить пять позиций меню и закрыть кассу по чек-листу.", knowledge: "Малик не любит импровизацию в счетах, но всегда защищает новичка перед грубым клиентом.", durationMinutes: 20 },
    { id: "malik-stories", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "Вечер историй", goal: "Рассказать о своём переезде и стать частью круга постоянных гостей.", task: "Принести одну фотографию и подготовить пятиминутную историю о первой ошибке в Париже.", knowledge: "Малик вырос здесь, но его родители тоже учились считывать новый город.", durationMinutes: 24 },
  ],
  ines: [
    { id: "ines-presentation", kind: "ПОРУЧЕНИЕ", title: "Голос в аудитории", goal: "Взять устную часть презентации и не спрятаться за слайдами.", task: "Написать вступление на 90 секунд и дважды проговорить его с Инес.", knowledge: "В французской презентации лучше сразу объявить plan, чтобы слушатель не терялся.", durationMinutes: 18 },
    { id: "ines-expose", kind: "РАЗУЗНАТЬ", title: "Неписаные правила Сорбонны", goal: "Понять, как ищут источники, спорят и делят работу в университете.", task: "Найти две статьи в Cairn и оформить bibliographie по образцу Инес.", knowledge: "Преподаватель ценит не сложные слова, а ясную логику и точные ссылки.", durationMinutes: 20 },
    { id: "ines-seine", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "Вне библиотеки", goal: "Перестать общаться с одногруппниками только об дедлайнах.", task: "Прийти на пикник у Сены и задать три вопроса не об учёбе.", knowledge: "Инес меняла факультет и помнит, каково чувствовать себя лишней в группе.", durationMinutes: 25 },
  ],
  bernard: [
    { id: "bernard-originals", kind: "РАЗУЗНАТЬ", title: "Оригиналы и копии", goal: "Понять, что именно показывать в окне и что оставлять в досье.", task: "Собрать папку: оригинал → копия → перевод, и пронумеровать разделы.", knowledge: "Оригинал показывают для сверки, но обычно не оставляют в досье.", durationMinutes: 17 },
    { id: "bernard-address", kind: "ПОРУЧЕНИЕ", title: "Justificatif de domicile", goal: "Закрыть раздел адреса без повторной записи.", task: "Принести договор, страховку жилья и свежий счёт с одинаковым написанием имени.", knowledge: "Разные варианты имени в документах лучше объяснить короткой запиской.", durationMinutes: 21 },
    { id: "bernard-deadline", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "По эту сторону окна", goal: "Научиться задавать точные вопросы и не воспринимать бюрократию как личную вражду.", task: "Записать номер обращения, крайний срок и следующее действие на одном листе.", knowledge: "Бернар стал чиновником, потому что сам видел, как неточный ответ ломает чей-то план.", durationMinutes: 24 },
  ],
  yuki: [
    { id: "yuki-gesture", kind: "РАЗУЗНАТЬ", title: "Десять линий", goal: "Научиться замечать людей, а не только достопримечательности.", task: "Сделать три быстрых наброска прохожих, используя не более десяти линий на каждый.", knowledge: "Юки сначала смотрит на позу и темп, а лицо дорисовывает после.", durationMinutes: 16 },
    { id: "yuki-view", kind: "ПОРУЧЕНИЕ", title: "Неоткрыточный Париж", goal: "Найти в районе место, которое ещё не стало туристическим штампом.", task: "Пройти от ступеней до rue des Abbesses без карты и принести один набросок местной сцены.", knowledge: "Лучший вид для Юки — не панорама, а прачечная, велосипед и двое спорящих соседей.", durationMinutes: 19 },
    { id: "yuki-exhibit", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "Место на стене", goal: "Решить, готов ли ты показать свою работу незнакомым людям.", task: "Выбрать один неидеальный, но честный рисунок и написать к нему три фразы на французском.", knowledge: "Юки долго не показывала свои работы из-за акцента, хотя рисункам акцент не мешал.", durationMinutes: 26 },
  ],
  luc: [
    { id: "luc-one-room", kind: "РАЗУЗНАТЬ", title: "Один зал, одна история", goal: "Не пробежать Лувр как список и научиться смотреть медленно.", task: "Выбрать один зал, остаться на 20 минут и записать три детали одного предмета.", knowledge: "Под Лувром сохранились стены крепости XII века.", durationMinutes: 18 },
    { id: "luc-context", kind: "ПОРУЧЕНИЕ", title: "До таблички", goal: "Научиться сначала строить свою гипотезу, а потом читать описание.", task: "Сравнить два портрета: положение рук, одежду и то, что автор хотел сообщить о герое.", knowledge: "Музейная табличка — ответ, но не замена собственному взгляду.", durationMinutes: 20 },
    { id: "luc-school", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "Музей твоим голосом", goal: "Провести первую мини-экскурсию и не прятаться за заученным текстом.", task: "Построить маршрут из трёх работ для школьной группы и задать в каждом зале один вопрос.", knowledge: "Люк стал историком после того, как скучная школьная экскурсия чуть не отвернула его от музеев.", durationMinutes: 27 },
  ],
  amina: [
    { id: "amina-saturday", kind: "ПОРУЧЕНИЕ", title: "Два часа помощи", goal: "Понять, как устроен центр, и взять конкретную роль в субботу.", task: "Прийти к 10:00, отсортировать одежду и собрать два набора по списку семей.", knowledge: "Центр принимает не всё подряд: каждая вещь должна решать реальную потребность.", durationMinutes: 18 },
    { id: "amina-welcome", kind: "РАЗУЗНАТЬ", title: "Встретить новичка", goal: "Превратить свой опыт растерянности в понятную помощь другому.", task: "Объяснить новой семье три первых шага: адрес, страховка, rendez-vous — и оставить контакт центра.", knowledge: "Люди лучше запоминают три следующих шага, чем пятнадцать пунктов на одном листе.", durationMinutes: 21 },
    { id: "amina-project", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "Своя акция", goal: "Перейти от помощи по инструкции к собственной маленькой инициативе.", task: "Написать план обмена книгами: место, время, три роли волонтёров и объявление на простом французском.", knowledge: "Амина не просит делать всё самому: сильное сообщество начинается с распределения ответственности.", durationMinutes: 28 },
  ],
  thomas: [
    { id: "thomas-pitch", kind: "РАЗУЗНАТЬ", title: "Не просто «мне нужна работа»", goal: "Сформулировать, чем ты полезен команде, не скрывая свою мотивацию.", task: "Записать самопрезентацию на 60 секунд: опыт, один результат в цифрах и причина выбора компании.", knowledge: "Во французском интервью конкретный пример важнее пяти абстрактных качеств.", durationMinutes: 17 },
    { id: "thomas-cv", kind: "ПОРУЧЕНИЕ", title: "Резюме с доказательствами", goal: "Переписать CV так, чтобы каждая строка показывала результат.", task: "Переписать три пункта CV по формуле: действие → масштаб → измеримый результат.", knowledge: "Адаптация к новой стране — это навык, если описать его через конкретные задачи.", durationMinutes: 22 },
    { id: "thomas-future", kind: "ЛИЧНАЯ ИСТОРИЯ", title: "Три года вперёд", goal: "Соединить карьерный план с реальной жизнью, а не с фразой для интервью.", task: "Составить план на 12 месяцев: должность, уровень языка, один новый навык и резервный сценарий.", knowledge: "Тома когда-то выбрал безопасную работу и сожалел, что не спросил себя, какой жизни он хочел.", durationMinutes: 26 },
  ],
};

const dialogueFollowUps: Record<string, DialogueRound[][]> = {
  claire: [
    [{ prompt: "Клэр показывает на двери. «Кому ты представишься сегодня первым?»", choices: [{ label: "Gardienne — она знает весь дом.", response: "«Верно. И назови имя медленно — она запишет его для почты».", effects: { french: 2, admin: 2 } }, { label: "Соседу с собакой — он выглядит добро.", response: "«Это Марсель. Спроси имя собаки — он будет счастлив вдвойне».", effects: { assimilation: 3 } }] }, { prompt: "«И последнее: что сделаешь, если тебе мешает шум?»", choices: [{ label: "Сначала спокойно поговорю.", response: "«Именно. Записка под дверью тоже работает, если ты пока не уверен в речи».", effects: { french: 2, stability: 2 } }, { label: "Попрошу тебя пойти со мной.", response: "«Первый раз — да. Второй раз ты уже сможешь сам».", effects: { assimilation: 2, stability: 3 } }] }],
    [{ prompt: "«Слышишь этот стук? Начнём не с паники, а с диагноза».", choices: [{ label: "Проверю кран и сниму видео.", response: "«Отлично. Дата и звук на видео сильнее фразы “мне кажется”».", effects: { admin: 3 } }, { label: "Сразу напишу хозяину.", response: "«Напиши, но приложи факты. Иначе он ответит одной вежливой фразой».", effects: { french: 2, admin: 2 } }] }, { prompt: "Клэр видит трещину у окна. «Она была в acte d’état des lieux?»", choices: [{ label: "Проверю акт до первой оплаты.", response: "«Вот и задание. Если её нет — отправь фото сегодня».", effects: { admin: 3, stability: 2 } }, { label: "Может, не стоит портить отношения с хозяином?", response: "«Спокойная фиксация — не конфликт. Это память для вас обоих».", effects: { stability: 3, french: 2 } }] }],
    [{ prompt: "«На собрании будут говорить быстро. Как не потеряешься?»", choices: [{ label: "Запрошу повестку и выпишу термины.", response: "«Хорошо. Charges, travaux, vote — этого уже хватит, чтобы следить за разговором».", effects: { french: 4, admin: 2 } }, { label: "Попрошу тебя переводить всё.", response: "«Я помогу в критический момент, но не отдам тебе твой голос».", effects: { french: 2, assimilation: 2 } }] }, { prompt: "«О чём ты сам хочешь сказать соседям?»", choices: [{ label: "О шуме после полуночи — мне важно спать.", response: "«Ясная просьба без обвинений. Я сяду рядом, но говорить будешь ты».", effects: { stability: 4, assimilation: 2 } }, { label: "Предложу общую полку для книг.", response: "«Вот это уже не просьба новичка, а идея соседа».", effects: { assimilation: 5, stability: 2 } }] }],
  ],
  malik: [
    [{ prompt: "«Клиент сказал serré. Что ты понял?»", choices: [{ label: "Короткий и крепкий эспрессо.", response: "«Exactement. И не наливай его до края».", effects: { french: 3 } }, { label: "Кофе с молоком?", response: "«Это noisette. Лучше переспросить, чем испортить напиток».", effects: { french: 2 } }] }, { prompt: "«А теперь я говорю очень быстро: sur place ou à emporter?»", choices: [{ label: "Sur place, et je paie par carte.", response: "«Всё. Ты не потерялся и закрыл заказ одной фразой».", effects: { french: 3, assimilation: 2 } }, { label: "Можно ещё раз помедленнее?", response: "«Можно. И это нормальная фраза, а не признание в провале».", effects: { french: 3, stability: 2 } }] }],
    [{ prompt: "«В 11:30 будет очередь. Что ты сделаешь до неё?»", choices: [{ label: "Проверю мелочь, кассу и столы.", response: "«Правильно. Спокойная смена готовится до первого клиента».", effects: { admin: 2, stability: 2 } }, { label: "Запомню все цены.", response: "«Нужно, но проверь ещё и рабочее место. Память не вытрет стол».", effects: { french: 2, energy: -1 } }] }, { prompt: "«Гость возвращает кофе: говорит, что он холодный. Твой ответ?»", choices: [{ label: "Извинюсь и переделаю без спора.", response: "«Да. Потом разберёмся, где ошибка. Перед очередью мы решаем, а не доказываем».", effects: { french: 2, stability: 3 } }, { label: "Объясню, что машина работает нормально.", response: "«Не защищай машину от гостя. Защити доверие».", effects: { french: 2, stability: 1 } }] }],
    [{ prompt: "«Твоя история не должна быть идеальной. С какого момента начнёшь?»", choices: [{ label: "С того, как я уехал не в ту сторону.", response: "«Отлично: смешно, конкретно и сразу узнаваемо».", effects: { french: 2, assimilation: 3 } }, { label: "С того, почему я решил переехать.", response: "«Честно. Только добавь одну сцену, чтобы это не звучало как резюме».", effects: { french: 2, stability: 2 } }] }, { prompt: "«А какой вопрос ты задашь человеку после своей истории?»", choices: [{ label: "«Какой момент ты теперь вспоминаешь со смехом?»", response: "«Вот. Теперь это не монолог, а начало общего вечера».", effects: { assimilation: 5, french: 2 } }, { label: "«Кто тебе помог в первый день?»", response: "«Сильный вопрос. Он сразу даёт людям важную роль».", effects: { assimilation: 4, stability: 2 } }] }],
  ],
  ines: [
    [{ prompt: "«Скажи первую фразу вступления. Не извиняйся за акцент».", choices: [{ label: "Aujourd’hui, nous allons montrer trois choses…", response: "«Отлично: сразу есть plan. Дальше говори короче».", effects: { french: 4 } }, { label: "Je suis désolé pour mon français…", response: "«Стоп. Тебя ещё не слышали, а ты уже обесценил свою речь».", effects: { french: 3, stability: 2 } }] }, { prompt: "«В конце тебе задают вопрос, которого ты не понял. Что делаешь?»", choices: [{ label: "Переформулирую то, что услышал.", response: "«Да: si je comprends bien… И человек сам поправит неточность».", effects: { french: 4, stability: 2 } }, { label: "Передам ответ Инес.", response: "«Я помогу один раз. Но задача — чтобы твой голос остался твоим».", effects: { french: 2, stability: 2 } }] }],
    [{ prompt: "«Ты нашёл десять статей. Как поймёшь, какие две нам нужны?»", choices: [{ label: "Сверю вопрос, автора и дату.", response: "«И прочитай conclusion. Не надо превращать поиск в коллекцию PDF».", effects: { admin: 3, french: 2 } }, { label: "Возьму самые цитируемые.", response: "«Цитируемость полезна, но не заменяет связь с нашим вопросом».", effects: { admin: 2 } }] }, { prompt: "«В группе двое не сделали свою часть. Ты молча доделаешь?»", choices: [{ label: "Сначала переделю задачи и зафиксирую срок.", response: "«Да. Французская вежливость не означает, что ты должен взять всё на себя».", effects: { stability: 3, french: 2 } }, { label: "Доделаю — так быстрее.", response: "«Сегодня быстрее, но в следующий раз все будут ждать того же».", effects: { energy: -3, stability: 1 } }] }],
    [{ prompt: "«На пикнике не будет темы. Как войдёшь в разговор?»", choices: [{ label: "Спрошу, какое место в Париже они любят.", response: "«Прекрасно. У каждого есть ответ, и ты сразу узнаешь город через людей».", effects: { assimilation: 4, french: 2 } }, { label: "Подожду, пока меня о чём-то спросят.", response: "«Могут спросить, но дай им маленькую дверь».", effects: { assimilation: 2 } }] }, { prompt: "«Кто-то шутит быстро, и ты не понял. Притворишься?»", choices: [{ label: "Спрошу, почему это смешно.", response: "«Именно. Человек обычно с радостью объясняет свою шутку».", effects: { french: 3, assimilation: 3 } }, { label: "Улыбнусь и сменю тему.", response: "«Иногда можно. Но не делай из этого единственную стратегию».", effects: { stability: 2 } }] }],
  ],
  bernard: [
    [{ prompt: "«Вы печатали одну копию на двух сторонах. Почему это плохо?»", choices: [{ label: "Страницы труднее сканировать и сверять.", response: "«Верно. Один лист — одна страница, без скрепок».", effects: { admin: 4 } }, { label: "Потому что так не принято.", response: "«Не просто не принято: сканер может пропустить оборот».", effects: { admin: 3 } }] }, { prompt: "«Что вы отдадите мне, а что заберёте?»", choices: [{ label: "Копии и переводы оставлю, оригиналы заберу.", response: "«Именно. Перед уходом проверьте паспорт и диплом».", effects: { admin: 4, stability: 2 } }, { label: "Оставлю всю папку.", response: "«Никогда. Папка — ваш архив, а не наш».", effects: { admin: 3 } }] }],
    [{ prompt: "«В счёте одна буква в имени не такая, как в паспорте. Что будем делать?»", choices: [{ label: "Приложу объяснение и попрошу исправить счёт.", response: "«Лучший вариант. Для сегодня приложите письмо об исправлении».", effects: { admin: 4, french: 2 } }, { label: "Надеюсь, что не заметят.", response: "«Автоматическая сверка заметит. Лучше объяснить до вопроса».", effects: { admin: 2, stability: -1 } }] }, { prompt: "«Назовите три документа на адрес».", choices: [{ label: "Договор, страховка и свежий счёт.", response: "«Верно. Проверьте дату и одинаковый адрес на всех трёх».", effects: { admin: 5, stability: 2 } }, { label: "Договор, выписка и паспорт.", response: "«Паспорт подтверждает личность, но не ваше жильё в Париже».", effects: { admin: 3 } }] }],
    [{ prompt: "«Вместо “Когда будет готово?” какой вопрос вы зададите?»", choices: [{ label: "Какой срок и что мне делать, если ответа нет?", response: "«Отлично. У вас появились дата и действие».", effects: { admin: 4, stability: 3 } }, { label: "Можно ли ускорить?", response: "«Иногда. Но сначала узнайте обычный срок и номер дела».", effects: { admin: 3 } }] }, { prompt: "«Вы сердитесь на систему. Как не дать этому сломать разговор?»", choices: [{ label: "Разделю факты, чувства и следующий шаг.", response: "«Если бы все приходили с такой схемой, у меня было бы меньше седых волос».", effects: { stability: 4, assimilation: 2 } }, { label: "Постараюсь не показывать злость.", response: "«Скрывать не обязательно. Важно не потерять точный вопрос».", effects: { stability: 3, french: 2 } }] }],
  ],
  yuki: [
    [{ prompt: "«Видишь мужчину с газетой? Какая линия будет первой?»", choices: [{ label: "Наклон спины и газеты.", response: "«Да. Лицо может подождать — жест уже рассказал половину».", effects: { assimilation: 3 } }, { label: "Контур его профиля.", response: "«Можно, но ты потеряешь то, что он делает. Сначала движение».", effects: { assimilation: 2 } }] }, { prompt: "«Твой набросок не похож. Ты его выбросишь?»", choices: [{ label: "Нет, подпишу жест, который хотел поймать.", response: "«Вот. Рисунок — это память, а не паспортная проверка».", effects: { assimilation: 4, stability: 2 } }, { label: "Попробую перерисовать по памяти.", response: "«Сделай второй, но сохрани первый. Он правдивее».", effects: { assimilation: 3 } }] }],
    [{ prompt: "«Ты идёшь без карты. По чему будешь запоминать путь?»", choices: [{ label: "По пекарней, мозаике и красной двери.", response: "«Хорошо. Ты строишь карту из жизни, а не из названий».", effects: { assimilation: 4 } }, { label: "По номерам улиц.", response: "«На Монмартре номер может увести вверх, а не вперёд. Добавь ориентиры».", effects: { assimilation: 2 } }] }, { prompt: "«Турист просит показать самый красивый вид. Ты отдашь ему своё место?»", choices: [{ label: "Покажу другую тихую улицу.", response: "«Мудро. Не всяким любимым местом нужно становиться точкой на карте».", effects: { stability: 3, assimilation: 3 } }, { label: "Покажу — город не только мой.", response: "«Тоже честно. Просто не забудь, почему тебе было там хорошо».", effects: { assimilation: 3 } }] }],
    [{ prompt: "«Какой рисунок ты боишься показывать больше всего?»", choices: [{ label: "Где видно, что я ещё чужой.", response: "«Именно он нужен. На нём есть твоя точка зрения, которой нет у местных».", effects: { assimilation: 5, stability: 2 } }, { label: "Где линии неровные.", response: "«Неровная линия может быть живой. Мы не показываем экзаменатору».", effects: { stability: 3 } }] }, { prompt: "«На открытии спрашивают, о чём твоя работа. Что ты ответишь?»", choices: [{ label: "О том, как чужой город начинает запоминать тебя.", response: "«Отлично. Коротко, лично и без оправданий».", effects: { french: 3, assimilation: 4 } }, { label: "Я пока не знаю — можно я скажу это?", response: "«Можно. Скажи, что ты выясняешь. Незнание тоже может быть точным».", effects: { french: 2, stability: 3 } }] }],
  ],
  luc: [
    [{ prompt: "«Мы стоим у каменной стены. Что тебе нужно знать до даты?»", choices: [{ label: "Зачем её построили и кого она защищала.", response: "«Именно. Функция превращает камень в историю».", effects: { french: 2, assimilation: 3 } }, { label: "Какого она века.", response: "«Это полезно, но дата без причины быстро исчезнет».", effects: { assimilation: 2 } }] }, { prompt: "«Выбери одну деталь, которую ты запишешь».", choices: [{ label: "Следы инструмента на камне.", response: "«Прекрасно. Теперь это не абстрактный XII век, а чья-то рука».", effects: { assimilation: 4 } }, { label: "Высоту и толщину стены.", response: "«Хорошая точность. А теперь добавь, что это делало с человеком рядом».", effects: { assimilation: 3 } }] }],
    [{ prompt: "«Не смотри на табличку. Кто этот человек на портрете?»", choices: [{ label: "Человек, который хочет казаться сильным.", response: "«Почему? Назови позу, одежду, предмет в руке. Тогда гипотеза заработает».", effects: { french: 2, assimilation: 3 } }, { label: "Не знаю без таблички.", response: "«Ты не обязан знать. Ты можешь заметить и предположить».", effects: { stability: 2, assimilation: 2 } }] }, { prompt: "«Табличка говорит, что ты ошибся. Разочарован?»", choices: [{ label: "Нет, сравню свою версию с контекстом.", response: "«Вот зачем нужна ошибка: она показала, как именно работает образ».", effects: { french: 2, assimilation: 4 } }, { label: "Да, лучше было сразу прочитать.", response: "«Тогда ты запомнил бы факт, но не свой взгляд».", effects: { assimilation: 2 } }] }],
    [{ prompt: "«Школьник спрашивает: почему это искусство? Твой ответ?»", choices: [{ label: "Спрошу, что он сам в этом видит.", response: "«Лучший ход. Экскурсия — не допрос, а разговор».", effects: { french: 2, assimilation: 4 } }, { label: "Объясню технику и эпоху.", response: "«Полезно, но после двух фраз верни ему вопрос».", effects: { french: 3, assimilation: 2 } }] }, { prompt: "«В группе кто-то даёт неожиданный ответ. Ты поправишь?»", choices: [{ label: "Попрошу показать, как он к этому пришёл.", response: "«Да. Иногда самая интересная экскурсия начинается там, где ломается наш план».", effects: { assimilation: 5, stability: 2 } }, { label: "Мягко дам правильный ответ.", response: "«Ты сохранишь порядок, но можешь потерять открытие».", effects: { french: 2, stability: 2 } }] }],
  ],
  amina: [
    [{ prompt: "«Перед тем как класть вещь в коробку, что ты себя спросишь?»", choices: [{ label: "Я бы сам обрадовался такой вещи?", response: "«Да. Помощь не должна сбывать на других то, что нам самим не нужно».", effects: { assimilation: 4 } }, { label: "В какую коробку она поместится?", response: "«Это второй вопрос. Первый — нужна ли она кому-то».", effects: { admin: 2, assimilation: 2 } }] }, { prompt: "«На складе много хаоса. С чего начнёшь?»", choices: [{ label: "Со списка запросов на сегодня.", response: "«Именно. Склад существует для людей, а не для идеальных полок».", effects: { admin: 3, assimilation: 2 } }, { label: "Разложу всё по цветам и типам.", response: "«Красиво, но сначала закроем сегодняшние нужды».", effects: { admin: 2 } }] }],
    [{ prompt: "«Новая семья спрашивает о всём сразу. Как не перегрузить их?»", choices: [{ label: "Дам три шага на сегодня и контакт на завтра.", response: "«Лучше всего. Человеку нужен путь, а не энциклопедия».", effects: { french: 2, assimilation: 4 } }, { label: "Отдам им полную памятку.", response: "«Отдай, но пометь три пункта, которые нужны прямо сейчас».", effects: { admin: 2, assimilation: 2 } }] }, { prompt: "«Они стесняются спрашивать второй раз. Что ты скажешь?»", choices: [{ label: "«Я тоже переспрашивал. Вот мой номер».", response: "«Да. Не делай вид, что тебе всё давалось легко — это отдаляет».", effects: { assimilation: 5, stability: 2 } }, { label: "«Все вопросы есть в памятке».", response: "«Памятка не ответит на чувство растерянности. Ты можешь».", effects: { assimilation: 2 } }] }],
    [{ prompt: "«Ты хочешь обмен книгами. Как поймёшь, что он нужен району?»", choices: [{ label: "Спрошу соседей и библиотеку.", response: "«Правильно. Не начинай с афиши — начни с людей».", effects: { assimilation: 4, french: 2 } }, { label: "Сделаю красивую афишу и посмотрю.", response: "«Афиша нужна. Но красивое молчание не заменит разговор».", effects: { assimilation: 2 } }] }, { prompt: "«Ты не успеваешь всё сам. Что отдашь другим?»", choices: [{ label: "Сбор книг и встречу гостей — двум людям.", response: "«Отлично. А сам держи расписание и связь между команами».", effects: { admin: 3, stability: 3, assimilation: 2 } }, { label: "Ничего — так точно не потеряется.", response: "«Зато потеряешься ты. Доверие — тоже часть организации».", effects: { energy: -3, stability: 1 } }] }],
  ],
  thomas: [
    [{ prompt: "«Назови один результат, а не своё качество».", choices: [{ label: "Сократил срок проекта на две недели.", response: "«Хорошо. Теперь скажи, что именно ты сделал для этого».", effects: { french: 2, stability: 3 } }, { label: "Я очень ответственный.", response: "«Это обещание. Мне нужен эпизод, где твоя ответственность изменила итог».", effects: { french: 2 } }] }, { prompt: "«Почему тебе нужна именно эта компания?»", choices: [{ label: "Назову их проект и свяжу его со своим опытом.", response: "«Вот это мотивация: ты изучил их и понял свою пользу».", effects: { french: 3, stability: 3 } }, { label: "Скажу, что мне нужен стабильный статус.", response: "«Это честно, но отвечает на твою нужду, а не на нужду команды».", effects: { admin: 2, stability: 2 } }] }],
    [{ prompt: "«Строка “отвечал за проект”. Чего в ней не хватает?»", choices: [{ label: "Масштаба, действий и результата.", response: "«Верно. Сколько людей, что сделал лично ты, что изменилось».", effects: { french: 3, stability: 3 } }, { label: "Красивого глагола.", response: "«Глагол поможет, но не спасёт пустую строку».", effects: { french: 2 } }] }, { prompt: "«Твой иностранный опыт не понятен рекрутеру. Что ты сделаешь?»", choices: [{ label: "Переведу не название, а уровень ответственности.", response: "«Именно. Бюджет, команда, решения — они переводятся лучше титула».", effects: { french: 3, stability: 4 } }, { label: "Уберу этот опыт.", response: "«Тогда ты сам сделаешь свой путь меньше. Сначала попробуй объяснить».", effects: { stability: 1 } }] }],
    [{ prompt: "«Через три года ты назвал должность. А какой будет твоя обычная среда?»", choices: [{ label: "Команда, где я могу спорить и брать ответственность.", response: "«Хорошо. Теперь это не титул, а тип работы и отношений».", effects: { stability: 4, assimilation: 2 } }, { label: "Главное — бессрочный контракт.", response: "«Он важен. Но контракт не опишет, как ты хочешь проводить каждый день».", effects: { admin: 2, stability: 2 } }] }, { prompt: "«Если первый план не сработает, ты сочтёшь себя провалившимся?»", choices: [{ label: "Нет, у плана будут резервные маршруты.", response: "«Вот зрелый ответ. Устойчивость — не идеальный маршрут, а способность перестроиться».", effects: { stability: 5, admin: 2 } }, { label: "Да. Мне нужен один точный план.", response: "«Точный план нужен, но его нельзя путать с гарантией».", effects: { stability: 2 } }] }],
  ],
};

function getNpcDialogues(npcId: string) {
  return [dialogues[npcId], ...(moreDialogues[npcId] ?? [])];
}

function getDialogueMission(npcId: string, dialogueIndex: number) {
  const missions = dialogueMissions[npcId];
  return missions[dialogueIndex % missions.length];
}

function getDialogueRounds(npcId: string, dialogueIndex: number) {
  const dialogue = getNpcDialogues(npcId)[dialogueIndex % getNpcDialogues(npcId).length];
  return [{ prompt: dialogue.greeting, choices: dialogue.choices }, ...dialogueFollowUps[npcId][dialogueIndex % dialogueFollowUps[npcId].length]];
}

function getRelationshipTitle(value: number) {
  if (value >= 80) return "близкий человек";
  if (value >= 55) return "доверяет тебе";
  if (value >= 30) return "хороший знакомый";
  if (value >= 10) return "узнаёт тебя";
  return "новое знакомство";
}

const cityEvents: CityEvent[] = [
  { id: "canal-market", kicker: "СОБЫТИЕ ДНЯ", title: "Рынок у канала", body: "Соседи продают книги, пластинки и домашнюю выпечку. Малик ищет помощника на пару часов.", locationId: "cafe", hours: 2, effects: { money: 28, energy: -7, french: 3, assimilation: 6 } },
  { id: "night-museum", kicker: "СОБЫТИЕ ДНЯ", title: "Вечер в Лувре", body: "Сегодня музей работает допоздна, а Люк проводит короткую экскурсию для местных жителей.", locationId: "louvre", hours: 3, effects: { money: -9, energy: -8, french: 4, assimilation: 9 } },
  { id: "street-music", kicker: "СОБЫТИЕ ДНЯ", title: "Музыка на Монмартре", body: "На площади собирается импровизированный концерт. Можно помочь музыкантам и остаться на выступление.", locationId: "montmartre", hours: 3, effects: { energy: -6, french: 3, assimilation: 10 } },
  { id: "seine-cleanup", kicker: "СОБЫТИЕ ДНЯ", title: "Волонтёры у Сены", body: "Амина зовёт на уборку набережной и общий пикник после работы.", locationId: "notredame", hours: 3, effects: { energy: -12, french: 3, assimilation: 8, stability: 5 } },
  { id: "career-meetup", kicker: "СОБЫТИЕ ДНЯ", title: "Встреча молодых специалистов", body: "Тома ведёт открытую встречу о французском CV и первых собеседованиях.", locationId: "eiffel", hours: 2, effects: { money: -6, energy: -5, french: 4, stability: 9 } },
];

const achievementDefs: AchievementDef[] = [
  { id: "bonjour", icon: "💬", title: "Первое bonjour", description: "Познакомиться с первым парижанином", kind: "npcs", target: 1 },
  { id: "flaneur", icon: "⌖", title: "Фланёр", description: "Побывать в четырёх разных местах", kind: "visited", target: 4 },
  { id: "eventful", icon: "★", title: "В ритме города", description: "Принять участие в трёх городских событиях", kind: "events", target: 3 },
  { id: "francophone", icon: "FR", title: "Без субтитров", description: "Поднять французский до 60%", kind: "french", target: 60 },
  { id: "dossier", icon: "▤", title: "Папка идеальна", description: "Поднять готовность досье до 50%", kind: "admin", target: 50 },
  { id: "local", icon: "◆", title: "Почти свой", description: "Поднять интеграцию до 65%", kind: "assimilation", target: 65 },
];

const metroLines: Record<string, MetroLineDef> = {
  "1": { id: "1", name: "Линия 1", color: "#ffcd00", text: "#1d2430", stations: ["Charles de Gaulle–Étoile", "Franklin D. Roosevelt", "Concorde", "Palais Royal – Musée du Louvre", "Châtelet", "Bastille", "Nation"] },
  "2": { id: "2", name: "Линия 2", color: "#0064b0", text: "#fff", stations: ["Charles de Gaulle–Étoile", "Anvers", "Barbès – Rochechouart", "Nation"] },
  "4": { id: "4", name: "Линия 4", color: "#be418d", text: "#fff", stations: ["Porte de Clignancourt", "Barbès – Rochechouart", "Châtelet", "Cité", "Saint-Michel", "Odéon", "Montparnasse – Bienvenüe", "Bagneux – Lucie Aubrac"] },
  "5": { id: "5", name: "Линия 5", color: "#f28e42", text: "#1d2430", stations: ["Bobigny–Pablo Picasso", "République", "Bastille", "Gare d’Austerlitz", "Place d’Italie"] },
  "6": { id: "6", name: "Линия 6", color: "#77c695", text: "#1d2430", stations: ["Charles de Gaulle–Étoile", "Bir-Hakeim", "Montparnasse – Bienvenüe", "Place d’Italie", "Nation"] },
  "7": { id: "7", name: "Линия 7", color: "#f3a4ba", text: "#1d2430", stations: ["La Courneuve", "Gare de l’Est", "Châtelet", "Palais Royal – Musée du Louvre", "Villejuif"] },
  "9": { id: "9", name: "Линия 9", color: "#b6bd00", text: "#1d2430", stations: ["Pont de Sèvres", "Franklin D. Roosevelt", "République", "Oberkampf", "Mairie de Montreuil"] },
  "10": { id: "10", name: "Линия 10", color: "#c9910d", text: "#fff", stations: ["Boulogne", "Duroc", "Montparnasse – Bienvenüe", "Odéon", "Cluny – La Sorbonne", "Gare d’Austerlitz"] },
  "11": { id: "11", name: "Линия 11", color: "#704b1c", text: "#fff", stations: ["Rosny–Bois-Perrier", "République", "Châtelet"] },
};

const metroStopByLocation: Record<string, string> = {
  home: "Oberkampf",
  sorbonne: "Cluny – La Sorbonne",
  cafe: "République",
  prefecture: "Cité",
  louvre: "Palais Royal – Musée du Louvre",
  eiffel: "Bir-Hakeim",
  montmartre: "Anvers",
  notredame: "Saint-Michel",
};

const storyChapters: StoryChapter[] = [
  {
    episode: "ГЛАВА I · ПРИБЫТИЕ",
    title: "Новый адрес",
    summary: "Чемодан стоит посреди мансарды, французский звучит слишком быстро, а арендодатель ждёт документы.",
    mission: "Получить подтверждение адреса: договор аренды, страховку жилья и первый счёт за электричество.",
    stakes: "Эти три документа нужны, чтобы открыть банковский счёт и подтвердить место проживания.",
  },
  {
    episode: "ГЛАВА II · ПЕРВЫЙ ГОД",
    title: "Город отвечает",
    summary: "Париж перестаёт быть открыткой. У тебя появляются любимое кафе, знакомые лица и первая серьёзная ошибка.",
    mission: "Поднять французский, войти в местный круг и не потерять основание для проживания.",
    stakes: "Изоляция замедлит учёбу, работу и продление документов.",
  },
  {
    episode: "ГЛАВА III · ВЫБОР",
    title: "Остаться надолго",
    summary: "Временная жизнь становится настоящей. Теперь нужно выбрать между безопасностью и возможностью вырасти.",
    mission: "Создать устойчивый доход и пройти ключевой поворот выбранного пути.",
    stakes: "Один неудачный сезон может отбросить историю на год назад.",
  },
  {
    episode: "ГЛАВА IV · СВОЯ СРЕДА",
    title: "Больше не турист",
    summary: "Ты знаешь, где пересесть без карты, споришь о районе и помогаешь новичкам не повторять твои ошибки.",
    mission: "Укрепить связи, закрыть налоговые вопросы и подготовить сильное досье.",
    stakes: "Натурализация оценивает не маршрут, а цельность твоей жизни во Франции.",
  },
  {
    episode: "ГЛАВА V · РЕШЕНИЕ",
    title: "Досье на гражданство",
    summary: "Пять лет собраны в одну папку: адреса, дипломы, контракты, налоги, встречи и выборы.",
    mission: "Достичь требований, подать заявление и пройти интервью на ассимиляцию.",
    stakes: "Финал зависит от всего, что ты строил с первого дня.",
  },
];

const tutorialSteps = [
  {
    kicker: "ОБУЧЕНИЕ · 1/4",
    title: "У тебя есть история",
    body: "Это не свободная песочница без цели. Каждый год — отдельная сюжетная глава. Выполняй миссию, принимай решения в событиях и готовься к гражданству.",
    tip: "Сюжетная задача всегда видна в центре экрана.",
  },
  {
    kicker: "ОБУЧЕНИЕ · 2/4",
    title: "Париж теперь живой",
    body: "После прибытия ты увидишь саму локацию: интерьер, улицу, посетителей и маленькие анимации. Персонажи вокруг продолжают жить, пока ты выбираешь действие.",
    tip: "Сцена меняется вместе с районом и временем суток.",
  },
  {
    kicker: "ОБУЧЕНИЕ · 3/4",
    title: "Каждый выбор тратит время",
    body: "Справа находятся крупные действия. Учёба, работа, отдых и разговоры меняют силы, деньги, язык, досье, интеграцию и устойчивость.",
    tip: "Перед действием проверяй стоимость и длительность.",
  },
  {
    kicker: "ОБУЧЕНИЕ · 4/4",
    title: "Построй маршрут и доберись",
    body: "Выбери место на карте, затем способ поездки. Для метро нужно найти линию, правильное направление и пересадки; прогулка и Vélib’ показываются отдельными дорожными сценами.",
    tip: "В метро direction — это конечная станция нужной платформы.",
  },
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
  const totalMinutes = Math.round(time * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function PixelPortrait({ npc, small = false, unknown = false }: { npc: Npc; small?: boolean; unknown?: boolean }) {
  return (
    <div className={`pixel-portrait ${small ? "is-small" : ""} ${unknown ? "is-unknown" : ""}`} style={{ "--shirt": npc.color, "--hair": npc.hair } as React.CSSProperties} aria-hidden="true">
      <div className="portrait-hair" />
      <div className="portrait-face">
        <i className="portrait-ear left" /><i className="portrait-ear right" /><i className="eye left" /><i className="eye right" /><i className="portrait-nose" /><i className="portrait-mouth" />
        {npc.accessory === "glasses" && <i className="glasses" />}
        {npc.accessory === "moustache" && <i className="moustache" />}
        {npc.accessory === "scarf" && <i className="scarf" />}
      </div>
      {npc.accessory === "beret" && <div className="beret" />}
      <div className="portrait-neck" /><div className="portrait-body"><i className="portrait-collar left" /><i className="portrait-collar right" /></div>
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

function normalizeMetroName(value: string) {
  const key = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u2019']/g, "-").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
  const aliases: Record<string, string> = { "saint michel": "st michel", "montparnasse bienvenue": "montparnasse" };
  return aliases[key] ?? key;
}

function PixelMetroMap({ trip, currentLeg }: { trip: MetroTrip; currentLeg: MetroLeg }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedStationKey, setSelectedStationKey] = useState(normalizeMetroName(currentLeg.from));
  const routeLineIds = new Set(trip.legs.map((leg) => leg.lineId.toUpperCase()));
  const routeStations = new Set(trip.legs.flatMap((leg) => [normalizeMetroName(leg.from), normalizeMetroName(leg.to)]));
  const currentStationKey = normalizeMetroName(currentLeg.from);
  const selectedStation = metroSchematic.stations.find((station) => station.key === selectedStationKey);
  const mapWidth = metroSchematic.width;
  const mapHeight = metroSchematic.height;

  const setSafeZoom = (nextZoom: number) => setZoom(Math.max(1, Math.min(4, Math.round(nextZoom * 10) / 10)));
  const resetMap = () => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedStationKey(currentStationKey); };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const mapUnitsPerPixel = mapWidth / Math.max(1, rect.width);
    setPan({ x: drag.panX + (event.clientX - drag.x) * mapUnitsPerPixel, y: drag.panY + (event.clientY - drag.y) * mapUnitsPerPixel });
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={`official-metro-map ${zoom >= 1.6 ? "is-zoomed" : ""}`} aria-label="Интерактивная схема метро Парижа">
      <div className="metro-map-toolbar">
        <div><b>MÉTRO PARIS</b><span>Реальная схема · 311 станций</span></div>
        <div className="metro-zoom-controls" aria-label="Масштаб карты"><button onClick={() => setSafeZoom(zoom - .35)} aria-label="Уменьшить">-</button><output>{Math.round(zoom * 100)}%</output><button onClick={() => setSafeZoom(zoom + .35)} aria-label="Увеличить">+</button><button className="metro-reset" onClick={resetMap}>Центр</button></div>
      </div>
      <div
        ref={viewportRef}
        className="metro-map-viewport"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => setSafeZoom(zoom + .5)}
        onWheel={(event) => { event.preventDefault(); setSafeZoom(zoom + (event.deltaY < 0 ? .25 : -.25)); }}
      >
        <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="img" aria-label="Линии и станции парижского метро">
          <defs><pattern id="metro-paper-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" /></pattern></defs>
          <rect width={mapWidth} height={mapHeight} className="metro-paper" />
          <rect width={mapWidth} height={mapHeight} fill="url(#metro-paper-grid)" className="metro-grid" />
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} className="metro-map-canvas">
            <g className="official-lines">
              {metroSchematic.lines.map((line) => <g key={line.id} className={routeLineIds.has(line.id) ? "route-line-active" : ""}>{line.segments.map((segment, index) => <polyline key={`${line.id}-${index}`} points={segment.map((point) => point.join(",")).join(" ")} stroke={line.color} />)}</g>)}
            </g>
            <g className="official-stations">
              {metroSchematic.stations.map((station) => {
                const current = station.key === currentStationKey;
                const onRoute = routeStations.has(station.key);
                const interchange = station.lines.length > 1;
                const showLabel = zoom >= 1.6 || current || onRoute || station.lines.length >= 4;
                return <g key={station.key} className={`official-station ${interchange ? "interchange" : ""} ${onRoute ? "on-route" : ""} ${current ? "current" : ""} ${selectedStationKey === station.key ? "selected" : ""}`} transform={`translate(${station.x} ${station.y})`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setSelectedStationKey(station.key)} role="button" tabIndex={0} aria-label={`${station.name}, линии ${station.lines.join(", ")}`}>
                  {interchange && <circle className="station-ring" r={7} />}
                  <circle className="station-dot" r={current ? 7 : onRoute ? 5.5 : 3.2} />
                  {showLabel && <text x={8} y={-7}>{station.name}</text>}
                </g>;
              })}
            </g>
          </g>
        </svg>
        <div className="metro-map-help"><span>Зажмите и двигайте</span><span>Колесо или +/− для масштаба</span></div>
        {selectedStation && <div className="metro-station-inspector"><small>СТАНЦИЯ</small><strong>{selectedStation.name}</strong><div>{selectedStation.lines.map((lineId) => { const line = metroSchematic.lines.find((item) => item.id === lineId); return <i key={lineId} style={{ background: line?.color }}>{lineId}</i>; })}</div></div>}
      </div>
      <div className="metro-route-summary"><div><i className="map-current-dot" /><span>Вы здесь</span><strong>{currentLeg.from}</strong></div><div><i className="map-route-dot" /><span>Цель</span><strong>{trip.destination.label}</strong></div><p>Линии маршрута подсвечены. Нажмите на станцию, чтобы увидеть пересадки.</p></div>
      <div className="metro-data-credit">Данные: Île-de-France Mobilités Open Data · Licence Ouverte 2.0</div>
    </div>
  );
}

function LocationBackdrop({ location, sky }: { location: LocationDef; sky: string }) {
  return (
    <div className={`world-scene scene-${location.id} scene-time-${sky}`}>
      <div className="world-sky"><i className="world-sun" /><i className="world-cloud cloud-a" /><i className="world-cloud cloud-b" /></div>
      <div className="world-building">
        <span className="set-piece set-one" /><span className="set-piece set-two" /><span className="set-piece set-three" /><span className="set-piece set-four" />
      </div>
      <div className="scene-landmark"><LandmarkArt type={location.art} /></div>
      <div className="scene-furniture">
        <span className="furniture table-one" /><span className="furniture table-two" /><span className="furniture bench" /><span className="furniture counter" />
      </div>
      <div className="crowd-person person-one"><i className="mini-head" /><i className="mini-body" /><i className="mini-arm" /><i className="mini-prop laptop" /></div>
      <div className="crowd-person person-two"><i className="mini-head" /><i className="mini-body" /><i className="mini-arm" /><i className="mini-prop cup" /></div>
      <div className="crowd-person person-three"><i className="mini-head" /><i className="mini-body" /><i className="mini-arm" /><i className="mini-prop book" /></div>
      <div className="crowd-person person-four"><i className="mini-head" /><i className="mini-body" /><i className="mini-arm" /></div>
      <div className="scene-atmosphere"><i /><i /><i /></div>
      <div className="scene-label">
        <span>{location.district}</span>
        <h2>{location.label}</h2>
        <p>{location.description}</p>
      </div>
    </div>
  );
}

function getTravelMinutes(from: LocationDef, to: LocationDef, mode: TravelMode) {
  const dx = parseFloat(from.x) - parseFloat(to.x);
  const dy = parseFloat(from.y) - parseFloat(to.y);
  const distance = Math.sqrt(dx * dx + dy * dy);
  const metro = Math.max(15, Math.round((12 + distance * 0.42) / 5) * 5);
  if (mode === "bike") return Math.max(15, Math.round((metro * 1.12) / 5) * 5);
  if (mode === "walk") return Math.max(25, Math.round((metro * 2.15) / 5) * 5);
  return metro;
}

function getActivityKind(actionId: string): ActivityKind {
  if (["unpack", "insurance", "address", "sleep"].includes(actionId)) return "home";
  if (["shift", "espresso", "chat"].includes(actionId)) return "cafe";
  if (["class", "library", "exam"].includes(actionId)) return "study";
  if (["appointment", "copies", "taxes"].includes(actionId)) return "admin";
  if (["museum", "sketch", "pleinair"].includes(actionId)) return "culture";
  if (["walk", "picnic", "history"].includes(actionId)) return "walk";
  return "community";
}

function getActivityStatus(kind: ActivityKind, progress: number) {
  const copy: Record<ActivityKind, string[]> = {
    home: ["Осматриваем квартиру…", "Раскладываем вещи…", "Дом становится своим…", "Готово"],
    cafe: ["Открываем смену…", "Принимаем заказы…", "У стойки становится оживлённо…", "Смена закончена"],
    study: ["Открываем конспект…", "Разбираем материал…", "Закрепляем главное…", "Занятие окончено"],
    admin: ["Проверяем список…", "Сверяем документы…", "Ставим отметки…", "Документы приняты"],
    culture: ["Входим в пространство…", "Смотрим внимательнее…", "Запоминаем детали…", "Впечатление осталось"],
    walk: ["Выходим на улицу…", "Идём через квартал…", "Город меняется вокруг…", "Прогулка завершена"],
    community: ["Собираемся вместе…", "Распределяем задачи…", "Помогаем команде…", "Общее дело сделано"],
  };
  const index = progress < 38 ? 0 : progress < 72 ? 1 : progress < 92 ? 2 : 3;
  return copy[kind][index];
}

function getMetroLinesAtStation(station: string) {
  return Object.values(metroLines).filter((line) => line.stations.includes(station));
}

function buildMetroRoute(fromLocationId: string, toLocationId: string): MetroLeg[] {
  const startStation = metroStopByLocation[fromLocationId];
  const finishStation = metroStopByLocation[toLocationId];
  if (!startStation || !finishStation || startStation === finishStation) return [];

  type MetroState = { station: string; lineId: string };
  type QueueItem = { state: MetroState; path: MetroState[] };
  const queue: QueueItem[] = getMetroLinesAtStation(startStation).map((line) => ({
    state: { station: startStation, lineId: line.id },
    path: [{ station: startStation, lineId: line.id }],
  }));
  const visited = new Set(queue.map((item) => `${item.state.station}|${item.state.lineId}`));
  let winningPath: MetroState[] = [];

  while (queue.length) {
    const item = queue.shift();
    if (!item) break;
    const { station, lineId } = item.state;
    if (station === finishStation) {
      winningPath = item.path;
      break;
    }

    const line = metroLines[lineId];
    const stationIndex = line.stations.indexOf(station);
    const neighbours: MetroState[] = [];
    if (stationIndex > 0) neighbours.push({ station: line.stations[stationIndex - 1], lineId });
    if (stationIndex < line.stations.length - 1) neighbours.push({ station: line.stations[stationIndex + 1], lineId });
    getMetroLinesAtStation(station).forEach((transferLine) => {
      if (transferLine.id !== lineId) neighbours.push({ station, lineId: transferLine.id });
    });

    neighbours.forEach((nextState) => {
      const key = `${nextState.station}|${nextState.lineId}`;
      if (visited.has(key)) return;
      visited.add(key);
      queue.push({ state: nextState, path: [...item.path, nextState] });
    });
  }

  if (!winningPath.length) return [];
  const legs: MetroLeg[] = [];
  let lineId = winningPath[0].lineId;
  let legStart = winningPath[0].station;

  const addLeg = (legEnd: string) => {
    if (legStart === legEnd) return;
    const line = metroLines[lineId];
    const startIndex = line.stations.indexOf(legStart);
    const endIndex = line.stations.indexOf(legEnd);
    legs.push({
      lineId,
      from: legStart,
      to: legEnd,
      direction: endIndex > startIndex ? line.stations[line.stations.length - 1] : line.stations[0],
      stops: Math.abs(endIndex - startIndex),
    });
  };

  for (let index = 1; index < winningPath.length; index += 1) {
    const previous = winningPath[index - 1];
    const current = winningPath[index];
    if (current.lineId !== lineId) {
      addLeg(previous.station);
      lineId = current.lineId;
      legStart = current.station;
    }
  }
  addLeg(winningPath[winningPath.length - 1].station);
  return legs;
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
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
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
  const [viewMode, setViewMode] = useState<"scene" | "map">("scene");
  const [pendingTravel, setPendingTravel] = useState<LocationDef | null>(null);
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [dailyProgress, setDailyProgress] = useState<DayProgress>(emptyDayProgress);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [visitedLocations, setVisitedLocations] = useState<string[]>(["home"]);
  const [completedCityEvents, setCompletedCityEvents] = useState<string[]>([]);
  const [activeDialogue, setActiveDialogue] = useState<Npc | null>(null);
  const [dialogueResult, setDialogueResult] = useState("");
  const [dialogueStage, setDialogueStage] = useState<"intro" | "choice" | "result">("choice");
  const [activeDialogueIndex, setActiveDialogueIndex] = useState(0);
  const [dialogueRoundIndex, setDialogueRoundIndex] = useState(0);
  const [npcDialogueProgress, setNpcDialogueProgress] = useState<Record<string, number>>({});
  const [relationships, setRelationships] = useState<Record<string, number>>({});
  const [npcAssignments, setNpcAssignments] = useState<Record<string, NpcAssignment>>({});
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>("actions");
  const [metroTrip, setMetroTrip] = useState<MetroTrip | null>(null);
  const [metroStep, setMetroStep] = useState(0);
  const [metroStage, setMetroStage] = useState<MetroDecisionStage>("line");
  const [metroSelectedLine, setMetroSelectedLine] = useState("");
  const [metroMessage, setMetroMessage] = useState("");
  const [activeTravel, setActiveTravel] = useState<ActiveTravel | null>(null);
  const [travelProgress, setTravelProgress] = useState(0);
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [actionProgress, setActionProgress] = useState(0);
  const [showEventReveal, setShowEventReveal] = useState(false);
  const [completedDailyTaskIds, setCompletedDailyTaskIds] = useState<string[]>([]);
  const [chapterProgressPoints, setChapterProgressPoints] = useState(0);
  const [dayTransitionPhase, setDayTransitionPhase] = useState<"sunset" | "night" | "dawn" | null>(null);
  const [dayTransitionText, setDayTransitionText] = useState("");

  const selectedRoute = routes.find((route) => route.id === routeId) ?? routes[0];
  const currentLocation = locations.find((location) => location.id === locationId) ?? locations[0];
  const currentNpc = npcs.find((npc) => npc.id === currentLocation.npc) ?? npcs[0];
  const currentNpcDialogueProgress = npcDialogueProgress[currentNpc.id] ?? 0;
  const currentNpcDialogueIndex = currentNpcDialogueProgress % getNpcDialogues(currentNpc.id).length;
  const currentNpcMission = getDialogueMission(currentNpc.id, currentNpcDialogueIndex);
  const currentNpcRelationship = relationships[currentNpc.id] ?? 0;
  const activeDialogueDef = activeDialogue ? getNpcDialogues(activeDialogue.id)[activeDialogueIndex] : null;
  const activeDialogueMission = activeDialogue ? getDialogueMission(activeDialogue.id, activeDialogueIndex) : null;
  const activeDialogueRounds = activeDialogue ? getDialogueRounds(activeDialogue.id, activeDialogueIndex) : [];
  const activeDialogueRound = activeDialogueRounds[dialogueRoundIndex] ?? null;
  const activeDialogueRelationship = activeDialogue ? relationships[activeDialogue.id] ?? 0 : 0;
  const goal = yearGoals[Math.min(year - 1, yearGoals.length - 1)];
  const chapter = storyChapters[Math.min(year - 1, storyChapters.length - 1)];
  const goalsMet = stats.french >= goal.french && stats.admin >= goal.admin && stats.assimilation >= goal.assimilation && stats.stability >= goal.stability;
  const dailyTasks = dailyTaskSets[(day - 1) % dailyTaskSets.length];
  const isDailyTaskDone = (task: DailyTask) => completedDailyTaskIds.includes(task.id);
  const allDailyTasksDone = dailyTasks.every(isDailyTaskDone);
  const nextDailyTask = dailyTasks.find((task) => !isDailyTaskDone(task)) ?? null;
  const currentCityEvent = cityEvents[(day - 1) % cityEvents.length];
  const currentCityEventLocation = locations.find((location) => location.id === currentCityEvent.locationId) ?? locations[0];
  const currentCityEventKey = `${day}-${currentCityEvent.id}`;
  const cityEventDone = completedCityEvents.includes(currentCityEventKey);
  const chapterProgress = Math.min(100, chapterProgressPoints);
  const chapterReady = goalsMet && chapterProgress >= 100;
  const currentMetroLeg = metroTrip?.legs[metroStep] ?? null;
  const currentMetroLine = currentMetroLeg ? metroLines[currentMetroLeg.lineId] : null;
  const metroLineOptions = currentMetroLeg ? getMetroLinesAtStation(currentMetroLeg.from) : [];
  const travelOrigin = activeTravel ? locations.find((location) => location.id === activeTravel.originId) ?? locations[0] : null;
  const travelDestination = activeTravel ? locations.find((location) => location.id === activeTravel.destinationId) ?? locations[0] : null;
  const activeActivityKind = activeAction ? getActivityKind(activeAction.action.id) : null;

  const getAchievementProgress = (achievement: AchievementDef) => {
    if (achievement.kind === "npcs") return metNpcs.length;
    if (achievement.kind === "visited") return visitedLocations.length;
    if (achievement.kind === "events") return completedCityEvents.length;
    return stats[achievement.kind];
  };
  const unlockedAchievements = achievementDefs.filter((achievement) => getAchievementProgress(achievement) >= achievement.target);

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
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents, completedDailyTaskIds, chapterProgressPoints, npcDialogueProgress, relationships, npcAssignments };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [phase, profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents, completedDailyTaskIds, chapterProgressPoints, npcDialogueProgress, relationships, npcAssignments]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const paused = phase !== "game" || !awake || !!activeTravel || !!activeAction || !!activeDialogue || !!activeEvent || !!pendingTravel || !!metroTrip || !!dayTransitionPhase || tutorialStep >= 0 || showEventReveal || showGameMenu || showJournal || showAchievements;
    if (paused) return;
    const clock = window.setInterval(() => {
      setTime((value) => Math.min(23.95, value + 1 / 60));
    }, 2400);
    return () => window.clearInterval(clock);
  }, [phase, awake, activeTravel, activeAction, activeDialogue, activeEvent, pendingTravel, metroTrip, dayTransitionPhase, tutorialStep, showEventReveal, showGameMenu, showJournal, showAchievements]);

  useEffect(() => {
    if (!activeTravel) return;
    const progressTimers = [
      window.setTimeout(() => setTravelProgress(24), 900),
      window.setTimeout(() => setTravelProgress(48), 2400),
      window.setTimeout(() => setTravelProgress(72), 3900),
      window.setTimeout(() => setTravelProgress(91), 5400),
    ];
    const arrivalTimer = window.setTimeout(() => {
      const origin = locations.find((location) => location.id === activeTravel.originId) ?? locations[0];
      const destination = locations.find((location) => location.id === activeTravel.destinationId) ?? locations[0];
      const effects: Partial<Stats> = activeTravel.mode === "metro" ? { money: -2, energy: -2 } : activeTravel.mode === "bike" ? { money: -2, energy: -6 } : { energy: -9 };
      const transport = activeTravel.mode === "metro" ? "Métro" : activeTravel.mode === "bike" ? "Vélib’" : "Пешком";
      setLocationId(destination.id);
      setVisitedLocations((items) => items.includes(destination.id) ? items : [...items, destination.id]);
      setDailyProgress((progress) => ({ ...progress, travels: progress.travels + 1 }));
      setCompletedDailyTaskIds((items) => {
        const matches = dailyTasks.filter((task) => task.trigger === "visit" && task.targetId === destination.id).map((task) => task.id);
        return [...new Set([...items, ...matches])];
      });
      setChapterProgressPoints((value) => Math.min(100, value + 3));
      setTime((value) => value + activeTravel.minutes / 60);
      setStats((current) => applyEffects(current, effects));
      setJournal((items) => [`${formatTime(time)} · ${transport}: ${origin.label} → ${destination.label}, около ${activeTravel.minutes} мин.`, ...items].slice(0, 30));
      setTravelProgress(100);
      setActiveTravel(null);
      setViewMode("scene");
      setToast(`${transport} · прибытие примерно в ${formatTime(time + activeTravel.minutes / 60)}`);
    }, 6500);
    return () => {
      progressTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(arrivalTimer);
    };
  }, [activeTravel, time, dailyTasks]);

  const addJournal = (entry: string) => setJournal((items) => [entry, ...items].slice(0, 30));

  const beginGame = () => {
    setStats(selectedRoute.start);
    setYear(1); setDay(1); setTime(7); setLocationId("home"); setAwake(false);
    setActionCount(0); setSeenEvents([]); setMetNpcs([]);
    setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false); setVisitedLocations(["home"]); setCompletedCityEvents([]);
    setCompletedDailyTaskIds([]); setChapterProgressPoints(0); setNpcDialogueProgress({}); setRelationships({}); setNpcAssignments({});
    setActiveDialogue(null); setDialogueResult(""); setDialogueStage("choice"); setActiveDialogueIndex(0); setDialogueRoundIndex(0); setShowAchievements(false); setShowGameMenu(false);
    setStatsExpanded(false); setStoryExpanded(false); setSideTab("actions");
    setMetroTrip(null); setActiveTravel(null); setTravelProgress(0); setActiveAction(null); setActionProgress(0); setShowEventReveal(false); setDayTransitionPhase(null);
    setViewMode("scene"); setPendingTravel(null); setTutorialStep(0);
    setJournal([`${profile.name} начинает путь «${selectedRoute.label}».`, "Ты прибыл в Париж. Всё только начинается."]);
    setPhase("game");
  };

  const resumeGame = () => {
    if (!savedGame) return;
    setProfile(savedGame.profile); setRouteId(savedGame.routeId); setStats(savedGame.stats);
    setYear(savedGame.year); setDay(savedGame.day); setTime(savedGame.time); setLocationId(savedGame.locationId);
    setActionCount(savedGame.actionCount); setSeenEvents(savedGame.seenEvents); setMetNpcs(savedGame.metNpcs); setJournal(savedGame.journal);
    setDailyProgress(savedGame.dailyProgress ?? emptyDayProgress); setDailyRewardClaimed(savedGame.dailyRewardClaimed ?? false);
    setVisitedLocations(savedGame.visitedLocations ?? [savedGame.locationId]); setCompletedCityEvents(savedGame.completedCityEvents ?? []);
    setCompletedDailyTaskIds(savedGame.completedDailyTaskIds ?? []); setChapterProgressPoints(savedGame.chapterProgressPoints ?? 0);
    setNpcDialogueProgress(savedGame.npcDialogueProgress ?? {}); setRelationships(savedGame.relationships ?? {}); setNpcAssignments(savedGame.npcAssignments ?? {});
    setAwake(true); setViewMode("scene"); setTutorialStep(-1); setSideTab("actions"); setActiveAction(null); setShowEventReveal(false); setPhase("game");
  };

  const startFresh = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedGame(null); setProfile(defaultProfile); setPhase("setup");
  };

  const exitToTitle = () => {
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents, completedDailyTaskIds, chapterProgressPoints, npcDialogueProgress, relationships, npcAssignments };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    setSavedGame(save);
    setPhase("intro");
  };

  const wakeUp = (hour: number, energy: number, label: string) => {
    setTime(hour); setStats((current) => applyEffects(current, { energy })); setAwake(true);
    setShowEventReveal(true);
    addJournal(`День ${day}: ${label.toLowerCase()}.`);
    setToast(`День ${day} начался в ${formatTime(hour)}`);
  };

  const startDayTransition = (message = "Дела закончены. Пора возвращаться в мансарду.") => {
    if (dayTransitionPhase) return;
    setDayTransitionText(message);
    setDayTransitionPhase("sunset");
    window.setTimeout(() => setDayTransitionPhase("night"), 1250);
    window.setTimeout(() => {
      setDay((value) => value + 1); setTime(6); setAwake(false); setLocationId("home");
      setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false); setCompletedDailyTaskIds([]);
      setViewMode("scene"); setStats((current) => applyEffects(current, { energy: 12 }));
      setDayTransitionPhase("dawn");
      addJournal(`День ${day} завершён. Париж затихает за окном.`);
    }, 2600);
    window.setTimeout(() => setDayTransitionPhase(null), 4700);
  };

  const finishDay = () => startDayTransition();

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
    if (!awake || activeAction) return;
    if (stats.energy <= 5 && action.effects.energy && action.effects.energy < 1) {
      setToast("Сил почти нет. Отдохни или заверши день.");
      return;
    }
    const actionLocation = currentLocation;
    const actionStart = time;
    setActionProgress(7);
    setActiveAction({ action, locationId: actionLocation.id, startTime: actionStart });
    window.setTimeout(() => setActionProgress(27), 850);
    window.setTimeout(() => setActionProgress(52), 2100);
    window.setTimeout(() => setActionProgress(76), 3450);
    window.setTimeout(() => setActionProgress(93), 4700);
    window.setTimeout(() => {
      const nextTime = actionStart + action.hours;
      const nextCount = actionCount + 1;
      setStats((current) => applyEffects(current, action.effects));
      setActionCount(nextCount);
      setCompletedDailyTaskIds((items) => {
        const matches = dailyTasks.filter((task) => task.trigger === "action" && task.targetId === action.id && task.locationId === actionLocation.id).map((task) => task.id);
        return [...new Set([...items, ...matches])];
      });
      setChapterProgressPoints((value) => Math.min(100, value + Math.max(7, action.hours * 5)));
      if (nextTime < 24) {
        setDailyProgress((progress) => ({
          ...progress,
          actions: progress.actions + 1,
          french: progress.french + ((action.effects.french ?? 0) > 0 ? 1 : 0),
          admin: progress.admin + ((action.effects.admin ?? 0) > 0 ? 1 : 0),
          culture: progress.culture + ((action.effects.assimilation ?? 0) > 0 ? 1 : 0),
          earned: progress.earned + Math.max(0, action.effects.money ?? 0),
        }));
      }
      addJournal(`${formatTime(actionStart)} · ${actionLocation.short}: ${action.label}.`);
      setActionProgress(100);
      setActiveAction(null);
      setToast(`${action.label} · прошло ${action.hours} ч.`);
      maybeTriggerEvent(nextCount);
      if (nextTime >= 24) {
        setTime(23.9);
        startDayTransition("Позднее дело закончено. Ночной Париж провожает тебя домой.");
      } else {
        setTime(nextTime);
      }
    }, 5450);
  };

  const travelTo = (id: string) => {
    if (!awake) return;
    if (id === locationId) { setViewMode("scene"); return; }
    if (time >= 23) { setToast("Слишком поздно для поездки. Пора домой."); return; }
    const destination = locations.find((location) => location.id === id);
    if (destination) setPendingTravel(destination);
  };

  const confirmTravel = (mode: TravelMode) => {
    if (!pendingTravel) return;
    const minutes = getTravelMinutes(currentLocation, pendingTravel, mode);
    if (mode === "metro") {
      const legs = buildMetroRoute(currentLocation.id, pendingTravel.id);
      if (legs.length) {
        setMetroTrip({ destination: pendingTravel, legs, minutes });
        setMetroStep(0); setMetroStage("line"); setMetroSelectedLine("");
        setMetroMessage(`Найдите платформу на станции ${metroStopByLocation[currentLocation.id]}.`);
        setPendingTravel(null);
        return;
      }
    }
    setTravelProgress(8);
    setActiveTravel({ mode, originId: currentLocation.id, destinationId: pendingTravel.id, minutes, legs: [] });
    setPendingTravel(null);
  };

  const chooseMetroLine = (lineId: string) => {
    if (!metroTrip) return;
    const leg = metroTrip.legs[metroStep];
    if (lineId !== leg.lineId) {
      setMetroMessage(`Линия ${lineId} не ведёт к следующей точке маршрута. Сверьтесь со схемой.`);
      return;
    }
    setMetroSelectedLine(lineId);
    setMetroStage("direction");
    setMetroMessage(`Линия ${lineId} выбрана. Теперь найдите правильное направление.`);
  };

  const chooseMetroDirection = (direction: string) => {
    if (!metroTrip) return;
    const leg = metroTrip.legs[metroStep];
    if (direction !== leg.direction) {
      setMetroMessage(`Эта платформа увезёт в другую сторону. Ищите направление «${leg.direction}».`);
      return;
    }
    if (metroStep >= metroTrip.legs.length - 1) {
      setTravelProgress(8);
      setActiveTravel({ mode: "metro", originId: currentLocation.id, destinationId: metroTrip.destination.id, minutes: metroTrip.minutes, legs: metroTrip.legs });
      setMetroTrip(null); setMetroStep(0); setMetroStage("line"); setMetroSelectedLine("");
      return;
    }
    const nextStep = metroStep + 1;
    setMetroStep(nextStep); setMetroStage("line"); setMetroSelectedLine("");
    setMetroMessage(`Вы вышли на ${leg.to}. Найдите пересадку на линию ${metroTrip.legs[nextStep].lineId}.`);
  };

  const nextTutorial = () => {
    if (tutorialStep >= 3) {
      setTutorialStep(-1);
      setViewMode("scene");
      return;
    }
    const next = tutorialStep + 1;
    setTutorialStep(next);
    if (next === 3) setViewMode("map");
  };

  const talkToNpc = () => {
    setActiveDialogue(currentNpc);
    setActiveDialogueIndex(currentNpcDialogueIndex);
    setDialogueRoundIndex(0);
    setDialogueResult("");
    setDialogueStage(metNpcs.includes(currentNpc.id) ? "choice" : "intro");
  };

  const chooseDialogue = (choice: DialogueChoice) => {
    if (!activeDialogue || !activeDialogueDef || !activeDialogueMission || !activeDialogueRound) return;
    const firstMeeting = !metNpcs.includes(activeDialogue.id);
    const finalRound = dialogueRoundIndex >= activeDialogueRounds.length - 1;
    const baseEffects: Partial<Stats> = { energy: -1, french: firstMeeting ? 2 : 0, assimilation: firstMeeting ? 2 : 0 };
    const combinedEffects: Partial<Stats> = {
      ...baseEffects,
      ...choice.effects,
      energy: (baseEffects.energy ?? 0) + (choice.effects.energy ?? 0),
      french: (baseEffects.french ?? 0) + (choice.effects.french ?? 0),
      assimilation: (baseEffects.assimilation ?? 0) + (choice.effects.assimilation ?? 0),
    };
    if (firstMeeting) setMetNpcs((items) => [...items, activeDialogue.id]);
    setStats((current) => applyEffects(current, combinedEffects));
    setRelationships((values) => ({ ...values, [activeDialogue.id]: Math.min(100, (values[activeDialogue.id] ?? 0) + 4 + ((choice.effects.assimilation ?? 0) > 2 ? 1 : 0)) }));
    setTime((value) => Math.min(23.95, value + Math.ceil(activeDialogueMission.durationMinutes / activeDialogueRounds.length) / 60));
    setDialogueResult(choice.response);
    setDialogueStage("result");
    if (finalRound) {
      setCompletedDailyTaskIds((items) => {
        const matches = dailyTasks.filter((task) => task.trigger === "talk" && task.targetId === activeDialogue.id && task.locationId === currentLocation.id).map((task) => task.id);
        return [...new Set([...items, ...matches])];
      });
      setChapterProgressPoints((value) => Math.min(100, value + 5));
      setDailyProgress((progress) => ({
        ...progress,
        talks: progress.talks + 1,
        french: progress.french + ((combinedEffects.french ?? 0) > 0 ? 1 : 0),
        admin: progress.admin + ((combinedEffects.admin ?? 0) > 0 ? 1 : 0),
        culture: progress.culture + ((combinedEffects.assimilation ?? 0) > 0 ? 1 : 0),
        earned: progress.earned + Math.max(0, combinedEffects.money ?? 0),
      }));
      setNpcDialogueProgress((progress) => ({ ...progress, [activeDialogue.id]: (progress[activeDialogue.id] ?? 0) + 1 }));
      setNpcAssignments((assignments) => ({ ...assignments, [activeDialogue.id]: { missionId: activeDialogueMission.id, title: activeDialogueMission.title, task: activeDialogueMission.task, knowledge: activeDialogueMission.knowledge } }));
      addJournal(`${activeDialogue.name} · ${activeDialogueMission.title}: ${activeDialogueMission.task}`);
      setToast(firstMeeting ? `Новое знакомство: ${activeDialogue.name}` : `Новое личное поручение от ${activeDialogue.name}`);
    }
  };

  const continueDialogue = () => {
    if (dialogueRoundIndex < activeDialogueRounds.length - 1) {
      setDialogueRoundIndex((index) => index + 1);
      setDialogueResult("");
      setDialogueStage("choice");
      return;
    }
    setActiveDialogue(null); setDialogueResult(""); setDialogueStage("choice"); setDialogueRoundIndex(0);
  };

  const closeDialogue = () => { setActiveDialogue(null); setDialogueResult(""); setDialogueStage("choice"); setDialogueRoundIndex(0); };

  const claimDailyReward = () => {
    if (!allDailyTasksDone || dailyRewardClaimed) return;
    setStats((current) => applyEffects(current, { money: 60, energy: 10, assimilation: 3 }));
    setDailyRewardClaimed(true);
    setChapterProgressPoints((value) => Math.min(100, value + 5));
    addJournal(`План дня выполнен: +60 €, +10 сил и +3 к интеграции.`);
    setToast("План дня выполнен — награда получена!");
  };

  const guideDailyTask = (task: DailyTask) => {
    if (completedDailyTaskIds.includes(task.id)) return;
    const targetLocation = locations.find((location) => location.id === task.locationId) ?? locations[0];
    if (locationId !== task.locationId) {
      setViewMode("map");
      setToast(`Следующий шаг: добраться до «${targetLocation.label}». Нужная точка отмечена золотым.`);
      return;
    }
    setViewMode("scene");
    if (task.trigger === "talk") {
      setSideTab("people");
      setToast(`Открой диалог с персонажем: ${npcs.find((npc) => npc.id === task.targetId)?.name ?? "нужный человек"}.`);
    } else if (task.trigger === "action") {
      setSideTab("actions");
      const action = targetLocation.actions.find((item) => item.id === task.targetId);
      setToast(`Выбери действие: «${action?.label ?? task.label}».`);
    }
  };

  const participateCityEvent = () => {
    if (cityEventDone || !awake) return;
    if (locationId !== currentCityEvent.locationId) {
      setViewMode("map");
      setToast(`Событие проходит здесь: ${currentCityEventLocation.label}`);
      return;
    }
    if (time + currentCityEvent.hours >= 24) {
      setToast("Для этого события уже слишком поздно. Оно сменится завтра.");
      return;
    }
    const nextCount = actionCount + 1;
    setStats((current) => applyEffects(current, currentCityEvent.effects));
    setTime((value) => value + currentCityEvent.hours);
    setActionCount(nextCount);
    setCompletedCityEvents((items) => [...items, currentCityEventKey]);
    setChapterProgressPoints((value) => Math.min(100, value + 12));
    setDailyProgress((progress) => ({
      ...progress,
      actions: progress.actions + 1,
      french: progress.french + ((currentCityEvent.effects.french ?? 0) > 0 ? 1 : 0),
      admin: progress.admin + ((currentCityEvent.effects.admin ?? 0) > 0 ? 1 : 0),
      culture: progress.culture + ((currentCityEvent.effects.assimilation ?? 0) > 0 ? 1 : 0),
      earned: progress.earned + Math.max(0, currentCityEvent.effects.money ?? 0),
    }));
    addJournal(`${currentCityEvent.title}: ты принял участие в событии дня.`);
    setToast(`Событие завершено · прошло ${currentCityEvent.hours} ч.`);
    maybeTriggerEvent(nextCount);
  };

  const chooseStory = (choice: StoryChoice) => {
    setStats((current) => applyEffects(current, choice.effects));
    setEventResult(choice.result); addJournal(`${activeEvent?.title}: ${choice.result}`);
  };

  const closeStory = () => { setActiveEvent(null); setEventResult(""); };

  const advanceYear = () => {
    if (!chapterReady) { setToast("Закрой сюжетный прогресс главы и подготовь ключевые показатели."); return; }
    if (year >= 5) {
      setTestIndex(0); setTestScore(0); setTestFeedback(""); setPhase("test");
      return;
    }
    const nextYear = year + 1;
    setYear(nextYear); setDay((value) => value + 1); setTime(7); setAwake(false); setLocationId("home");
    setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false); setCompletedDailyTaskIds([]); setChapterProgressPoints(0);
    setViewMode("scene");
    setStats((current) => applyEffects(current, { energy: 22, money: 240, stability: 4 }));
    addJournal(`Глава ${year} завершена. Начинается «${yearGoals[nextYear - 1].title}».`);
    setToast(`Глава ${nextYear} · ${yearGoals[nextYear - 1].title}`);
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

  if (!hydrated) {
    return (
      <main className="boot-screen" aria-hidden="true">
        <div className="boot-sky"><i /><i /><i /></div>
        <div className="boot-city"><span /><span /><span /><span /><span /></div>
        <div className="boot-river" />
        <div className="boot-frame"><span className="boot-tower" /><span className="boot-pulse" /></div>
      </main>
    );
  }

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
            {savedGame && <button className="pixel-button secondary" onClick={resumeGame}>Продолжить · глава {savedGame.year}</button>}
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
          <div className="field-label age-field">Возраст
            <div className="age-picker">
              <button aria-label="Уменьшить возраст" disabled={profile.age <= 18} onClick={() => setProfile({ ...profile, age: Math.max(18, profile.age - 1) })}>−</button>
              <div className="age-display"><span key={profile.age}>{profile.age}</span><small>лет</small></div>
              <button aria-label="Увеличить возраст" disabled={profile.age >= 55} onClick={() => setProfile({ ...profile, age: Math.min(55, profile.age + 1) })}>+</button>
            </div>
            <div className="age-presets" aria-label="Быстрый выбор возраста">{[18, 22, 26, 30, 35, 40].map((age) => <button key={age} className={profile.age === age ? "active" : ""} onClick={() => setProfile({ ...profile, age })}>{age}</button>)}</div>
            <p className="age-note">Возраст влияет на текст истории, но не закрывает игровые пути.</p>
          </div>
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
        <div className="time-block"><span>ГЛАВА {year}/5 · ДЕНЬ {day}</span><strong>{formatTime(time)}</strong><em>{sky === "night" ? "Ночь" : sky === "sunset" ? "Закат" : sky === "dawn" ? "Рассвет" : "День"}</em></div>
        <div className="header-actions"><button className={viewMode === "map" ? "active" : ""} onClick={() => setViewMode(viewMode === "map" ? "scene" : "map")}>⌖ {viewMode === "map" ? "Вернуться" : "Карта"}</button><button onClick={() => setShowGameMenu(true)}>☰ Меню</button></div>
      </header>

      <div className="game-layout">
        <aside className="left-panel pixel-panel">
          <div className="player-card"><div className="player-avatar small"><span className="player-hair" /><span className="player-face" /><span className="player-body" /></div><div><strong>{profile.name}</strong><small>{profile.age} лет · глава {year}/5</small></div></div>
          <div className="stats-list">
            <StatMeter label="Силы" value={stats.energy} icon="♥" />
            <StatMeter label="Деньги" value={stats.money} icon="€" money />
            <button className="stats-toggle" onClick={() => setStatsExpanded((value) => !value)}><span>Развитие персонажа</span><b>{statsExpanded ? "Свернуть −" : "Показать +"}</b></button>
            {statsExpanded && <div className="secondary-stats"><StatMeter label="Французский" value={stats.french} icon="FR" /><StatMeter label="Досье" value={stats.admin} icon="▤" /><StatMeter label="Интеграция" value={stats.assimilation} icon="◆" /><StatMeter label="Опора" value={stats.stability} icon="⌂" /></div>}
          </div>
          <div className="daily-plan-card">
            <div className="daily-plan-head"><span>МАРШРУТ ДНЯ · ДЕНЬ {day}</span><b>{dailyTasks.filter(isDailyTaskDone).length}/{dailyTasks.length}</b></div>
            <h3>{nextDailyTask ? `Сейчас: ${nextDailyTask.label}` : "Маршрут дня завершён"}</h3>
            <div className="daily-task-list">
              {dailyTasks.map((task, index) => {
                const done = isDailyTaskDone(task);
                const current = nextDailyTask?.id === task.id;
                return <button className={`daily-task ${done ? "done" : ""} ${current ? "current" : ""}`} key={task.id} onClick={() => guideDailyTask(task)} disabled={done}><i>{done ? "✓" : index + 1}</i><div><strong>{task.label}</strong><small>{task.detail}</small></div><b>{done ? "ГОТОВО" : current ? "ПОКАЗАТЬ →" : "ПОТОМ"}</b></button>;
              })}
            </div>
            <button className={`daily-reward ${allDailyTasksDone && !dailyRewardClaimed ? "ready" : ""}`} disabled={!allDailyTasksDone || dailyRewardClaimed} onClick={claimDailyReward}>{dailyRewardClaimed ? "✓ Награда получена" : "Награда: +60 € · +10 сил"}</button>
          </div>
          <div className="chapter-progress-card compact">
            <div><span>ГЛАВА {year}/5 · {goal.title}</span><b>{chapterProgress}%</b></div>
            <div className="chapter-progress-track"><span style={{ width: `${chapterProgress}%` }} /></div>
            <small className="chapter-progress-help">Счёт начинается с 0% в каждой главе и растёт от дел, поездок и событий.</small>
            {chapterReady && <button className="year-button ready" onClick={advanceYear}>{year === 5 ? "Подать заявление" : `Открыть главу ${year + 1}`} →</button>}
          </div>
        </aside>

        <section className={`center-stage mode-${viewMode}`}>
          {viewMode === "map" ? (
            <div className="map-panel map-panel-v2">
              <div className="map-topline"><div className="map-name">PARIS <span>КАРТА РАЙОНОВ И МАРШРУТОВ</span></div><button onClick={() => setViewMode("scene")}>× Закрыть карту</button></div>
              <div className="arrondissement-ring ring-one" /><div className="arrondissement-ring ring-two" /><div className="arrondissement-ring ring-three" />
              <div className="seine-map"><span>СЕНА · LA SEINE</span></div>
              <div className="metro-line metro-red" /><div className="metro-line metro-blue" /><div className="metro-line metro-gold" />
              {locations.map((location) => (
                <button key={location.id} className={`map-location ${locationId === location.id ? "active" : ""} ${nextDailyTask?.locationId === location.id ? "guided" : ""}`} style={{ left: location.x, top: location.y }} onClick={() => travelTo(location.id)} aria-label={`Построить маршрут: ${location.label}`}>
                  <LandmarkArt type={location.art} /><span>{location.short}</span>{locationId === location.id && <i className="you-pin">ВЫ ЗДЕСЬ</i>}
                </button>
              ))}
              <div className="map-legend"><b>КАК ПОЛЬЗОВАТЬСЯ</b><span><i className="legend-dot red" /> линия 1</span><span><i className="legend-dot blue" /> линия 4</span><span><i className="legend-dot gold" /> RER</span><p>Выберите место — время и способ поездки появятся до подтверждения.</p></div>
              <div className="map-grain" />
            </div>
          ) : (
            <div className="location-world">
              <LocationBackdrop location={currentLocation} sky={sky} />
              <div className={`chapter-banner ${storyExpanded ? "expanded" : "collapsed"}`}>
                <button className="chapter-toggle" onClick={() => setStoryExpanded((value) => !value)}><span><small>{chapter.episode}</small><strong>{chapter.title}</strong></span><b>{storyExpanded ? "Свернуть −" : "Сюжет +"}</b></button>
                {storyExpanded && <div className="chapter-details"><p>{chapter.summary}</p><div><b>ТЕКУЩАЯ МИССИЯ</b><strong>{chapter.mission}</strong><small>Ставка: {chapter.stakes}</small></div></div>}
              </div>
              <button className="open-map-button" onClick={() => setViewMode("map")}><span>⌖</span><b>Открыть карту Парижа</b><small>Выбрать следующую локацию</small></button>
            </div>
          )}
        </section>

        <aside className="right-panel pixel-panel">
          <div className="location-heading"><span>СЕЙЧАС ВЫ ЗДЕСЬ</span><h2>{currentLocation.label}</h2><p>{currentLocation.district}</p></div>
          <p className="location-one-line">{currentLocation.description}</p>
          <div className="side-tabs" role="tablist" aria-label="Действия в локации"><button className={sideTab === "actions" ? "active" : ""} onClick={() => setSideTab("actions")}>Дела</button><button className={sideTab === "people" ? "active" : ""} onClick={() => setSideTab("people")}>Люди</button><button className={sideTab === "event" ? "active" : ""} onClick={() => setSideTab("event")}>Ивент <i>{cityEventDone ? "✓" : "1"}</i></button></div>
          {sideTab === "actions" && <div className="side-tab-content"><div className="actions-title"><span>ДОСТУПНЫЕ ДЕЛА</span><b>{awake ? `≈ ${Math.max(0, Math.floor(24 - time))} ч. осталось` : "сначала проснись"}</b></div><div className="action-list">{currentLocation.actions.map((action) => <button className={nextDailyTask?.trigger === "action" && nextDailyTask.targetId === action.id && nextDailyTask.locationId === currentLocation.id ? "quest-action" : ""} key={action.id} disabled={!awake} onClick={() => performAction(action)}><span className="action-icon">{action.icon}</span><span><strong>{action.label}</strong><small>{action.detail} · {action.hours} ч.</small></span><b>›</b></button>)}</div>{awake && <button className="end-day" onClick={finishDay}>Завершить день · вернуться домой</button>}</div>}
          {sideTab === "people" && <div className="side-tab-content people-tab">
            <div className="npc-card"><PixelPortrait npc={currentNpc} small /><div><span>{currentNpc.role}</span><strong>{currentNpc.name}</strong><p>{metNpcs.includes(currentNpc.id) ? `«${currentNpc.line}»` : "Вы ещё не знакомы. Первый разговор начнётся с представления."}</p></div></div>
            <div className="relationship-card"><div><span>ОТНОШЕНИЯ</span><b>{getRelationshipTitle(currentNpcRelationship)}</b><strong>{currentNpcRelationship}%</strong></div><div className="relationship-track"><i style={{ width: `${currentNpcRelationship}%` }} /></div></div>
            <div className="conversation-preview"><span>{currentNpcMission.kind}</span><strong>{currentNpcMission.title}</strong><p>{currentNpcMission.goal}</p><small>Длительный разгов · около {currentNpcMission.durationMinutes} мин.</small></div>
            <button className="talk-button" disabled={!awake} onClick={talkToNpc}>{metNpcs.includes(currentNpc.id) ? "Обсудить: " : "Представиться и начать: "}{currentNpcMission.title} →</button>
            {npcAssignments[currentNpc.id] && <div className="npc-assignment"><span>ЛИЧНОЕ ПОРУЧЕНИЕ</span><strong>{npcAssignments[currentNpc.id].title}</strong><p>{npcAssignments[currentNpc.id].task}</p></div>}
          </div>}
          {sideTab === "event" && <div className="side-tab-content"><div className={`city-event-card ${cityEventDone ? "completed" : ""}`}><div><span>{currentCityEvent.kicker}</span><b>{currentCityEvent.hours} ч.</b></div><h3>{currentCityEvent.title}</h3><p>{currentCityEvent.body}</p><small>⌖ {currentCityEventLocation.label} · {currentCityEventLocation.district}</small><button disabled={!awake || cityEventDone} onClick={participateCityEvent}>{cityEventDone ? "✓ Событие завершено" : locationId === currentCityEvent.locationId ? "Участвовать сейчас →" : "Показать место на карте →"}</button></div></div>}
        </aside>
      </div>

      <footer className="game-footer"><span><b>{chapter.episode}</b> · ежедневные дела, диалоги и события меняют твою историю</span><div>{npcs.map((npc) => <span key={npc.id} title={npc.name} className={metNpcs.includes(npc.id) ? "met" : ""}><PixelPortrait npc={npc} small unknown={!metNpcs.includes(npc.id)} /></span>)}</div></footer>

      {pendingTravel && (
        <div className="modal-backdrop travel-backdrop">
          <section className="travel-modal">
            <button className="modal-close" onClick={() => setPendingTravel(null)}>×</button>
            <p className="eyebrow ink">ПОДТВЕРЖДЕНИЕ МАРШРУТА</p>
            <h2>{currentLocation.label} <span>→</span> {pendingTravel.label}</h2>
            <p>Выберите способ передвижения. Указано приблизительное время без учёта забастовок, ремонта линий и парижского дождя.</p>
            <div className="route-line"><i className="route-stop start" /><span /><i className="route-stop finish" /></div>
            <div className="travel-options">
              <button onClick={() => confirmTravel("metro")}><span className="travel-icon">M</span><strong>Метро</strong><b>≈ {getTravelMinutes(currentLocation, pendingTravel, "metro")} мин</b><small>−2 € · почти без усталости</small></button>
              <button onClick={() => confirmTravel("bike")}><span className="travel-icon">V</span><strong>Vélib’</strong><b>≈ {getTravelMinutes(currentLocation, pendingTravel, "bike")} мин</b><small>−2 € · −6 сил</small></button>
              <button onClick={() => confirmTravel("walk")}><span className="travel-icon">↟</span><strong>Пешком</strong><b>≈ {getTravelMinutes(currentLocation, pendingTravel, "walk")} мин</b><small>бесплатно · −9 сил</small></button>
            </div>
          </section>
        </div>
      )}

      {metroTrip && currentMetroLeg && currentMetroLine && (
        <div className="modal-backdrop metro-backdrop">
          <section className="metro-simulator">
            <button className="modal-close" onClick={() => setMetroTrip(null)}>×</button>
            <header className="metro-sim-header"><div className="metro-mark">M</div><div><span>PARIS MÉTRO · НАВИГАЦИЯ</span><h2>{currentMetroLeg.from}</h2><p>Маршрут до {metroTrip.destination.label} · примерно {metroTrip.minutes} мин.</p></div></header>
            <PixelMetroMap trip={metroTrip} currentLeg={currentMetroLeg} />
            <div className="metro-platform-board"><span>СТАНЦИЯ · {currentMetroLeg.from}</span><strong>{metroStage === "line" ? "Выберите линию по общей схеме" : "Выберите платформу по конечной станции"}</strong><p>{metroMessage}</p></div>
            {metroStage === "line" ? <div className="metro-choice-grid line-choices">{metroLineOptions.map((line) => <button key={line.id} onClick={() => chooseMetroLine(line.id)}><i style={{ background: line.color, color: line.text }}>{line.id}</i><span><strong>{line.name}</strong><small>Платформа на станции {currentMetroLeg.from}</small></span><b>→</b></button>)}</div> : <div className="metro-choice-grid direction-choices">{[currentMetroLine.stations[0], currentMetroLine.stations[currentMetroLine.stations.length - 1]].map((direction) => <button key={direction} onClick={() => chooseMetroDirection(direction)}><i style={{ background: currentMetroLine.color, color: currentMetroLine.text }}>{metroSelectedLine}</i><span><strong>Direction {direction}</strong><small>{currentMetroLeg.stops} ост. до {currentMetroLeg.to}</small></span><b>→</b></button>)}</div>}
            <div className="metro-map-key"><span><i className="metro-symbol transfer" /> correspondance = пересадка</span><span><i className="metro-symbol exit" /> sortie = выход</span><p>Ошибиться можно: игра подскажет, почему выбранная платформа не подходит.</p></div>
          </section>
        </div>
      )}

      {activeTravel && travelOrigin && travelDestination && (
        <div className={`travel-loading-screen travel-${activeTravel.mode}`}>
          <div className="travel-loading-sky"><i /><i /></div>
          <div className="travel-cityscape" aria-hidden="true"><i className="travel-building one" /><i className="travel-building two" /><i className="travel-building three" /><span className="travel-tree one" /><span className="travel-tree two" /><span className="travel-lamp one" /><span className="travel-lamp two" /></div>
          <div className="travel-motion-art" aria-hidden="true">
            {activeTravel.mode === "metro" ? <div className="loading-metro"><span className="train-window" /><span className="train-window" /><span className="train-door" /><b>M</b></div> : activeTravel.mode === "bike" ? <div className="loading-bike"><i className="wheel one" /><i className="wheel two" /><span className="bike-frame"><i /></span><span className="bike-rider"><i className="bike-head" /><i className="bike-body" /><i className="bike-arm front" /><i className="bike-arm back" /><i className="bike-leg front" /><i className="bike-leg back" /></span><span className="bike-basket" /><span className="bike-shadow" /></div> : <div className="loading-walker"><i className="walker-shadow" /><i className="walk-head" /><i className="walk-hair" /><i className="walk-body" /><i className="walk-arm one" /><i className="walk-arm two" /><i className="walk-leg one" /><i className="walk-leg two" /><i className="walk-backpack" /></div>}
          </div>
          <section className="travel-loading-card">
            <p>{activeTravel.mode === "metro" ? "EN ROUTE · MÉTRO" : activeTravel.mode === "bike" ? "EN ROUTE · VÉLIB’" : "EN ROUTE · À PIED"}</p>
            <h2>{travelOrigin.label} <span>→</span> {travelDestination.label}</h2>
            <strong>{travelProgress < 25 ? activeTravel.mode === "walk" ? "Выходим на улицу…" : activeTravel.mode === "bike" ? "Проверяем Vélib’ и строим маршрут…" : "Спускаемся на платформу…" : travelProgress < 50 ? activeTravel.mode === "metro" ? "Поезд набирает ход в тоннеле…" : activeTravel.mode === "bike" ? "Едем по велодорожке вдоль квартала…" : "Витрины и балконы меняются вокруг…" : travelProgress < 75 ? activeTravel.mode === "metro" ? "Следим за станциями и пересадками…" : activeTravel.mode === "bike" ? "Проезжаем перекрёсток и набираем темп…" : "Сворачиваем на более тихую улицу…" : travelProgress < 92 ? "Уже виден нужный квартал…" : "Прибываем и ориентируемся на месте…"}</strong>
            {activeTravel.mode === "metro" && <div className="loading-metro-lines">{activeTravel.legs.map((leg) => <span key={`${leg.lineId}-${leg.from}`}><i style={{ background: metroLines[leg.lineId].color, color: metroLines[leg.lineId].text }}>{leg.lineId}</i>{leg.to}</span>)}</div>}
            <div className="travel-loading-track"><span style={{ width: `${travelProgress}%` }} /></div>
            <small>≈ {activeTravel.minutes} мин. игрового времени</small>
          </section>
          <div className="travel-ground" />
        </div>
      )}

      {activeAction && activeActivityKind && (
        <div className="action-transition-screen">
          <div className={`activity-stage activity-${activeActivityKind}`}><div className="activity-backdrop"><i className="set-a" /><i className="set-b" /><i className="set-c" /></div><div className="activity-person main"><i className="act-head" /><i className="act-body" /><i className="act-arm" /><i className="act-leg left" /><i className="act-leg right" /></div><div className="activity-person second"><i className="act-head" /><i className="act-body" /><i className="act-arm" /><i className="act-leg left" /><i className="act-leg right" /></div><div className="activity-prop"><i /><i /><i /></div></div>
          <section><p>ВЫПОЛНЯЕТСЯ · {locations.find((location) => location.id === activeAction.locationId)?.short}</p><h2>{activeAction.action.label}</h2><strong>{getActivityStatus(activeActivityKind, actionProgress)}</strong><div className="action-progress-track"><span style={{ width: `${actionProgress}%` }} /></div><small>Игровое время: {formatTime(activeAction.startTime)} → {formatTime(activeAction.startTime + activeAction.action.hours)}</small></section>
        </div>
      )}

      {dayTransitionPhase && (
        <div className={`day-cycle-transition phase-${dayTransitionPhase}`}>
          <div className="cycle-sky"><i className="cycle-sun" /><i className="cycle-moon" /><span className="cycle-cloud one" /><span className="cycle-cloud two" /></div>
          <div className="cycle-city"><i /><i /><i /><i /><i /></div>
          <div className="cycle-window-row"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <section><p>{dayTransitionPhase === "dawn" ? `ДЕНЬ ${day} · 06:00` : `ДЕНЬ ${day} · ${dayTransitionPhase === "sunset" ? "ВЕЧЕР" : "НОЧЬ"}`}</p><h2>{dayTransitionPhase === "sunset" ? "Париж замедляется" : dayTransitionPhase === "night" ? "Город засыпает" : "Начинается новое утро"}</h2><span>{dayTransitionPhase === "dawn" ? "Скоро можно будет выбрать время подъёма." : dayTransitionText}</span><div className="cycle-progress"><i className={dayTransitionPhase === "sunset" || dayTransitionPhase === "night" || dayTransitionPhase === "dawn" ? "active" : ""} /><i className={dayTransitionPhase === "night" || dayTransitionPhase === "dawn" ? "active" : ""} /><i className={dayTransitionPhase === "dawn" ? "active" : ""} /></div></section>
        </div>
      )}

      {showEventReveal && (
        <div className="modal-backdrop event-reveal-backdrop">
          <section className="event-reveal-modal">
            <div className="event-poster"><span>PARIS</span><i>★</i><b>ДЕНЬ<br />{day}</b><div className="poster-crowd"><i /><i /><i /></div></div>
            <div className="event-reveal-copy"><p className="eyebrow ink">СЕГОДНЯ В ГОРОДЕ</p><h2>{currentCityEvent.title}</h2><p>{currentCityEvent.body}</p><div className="event-place"><span>ГДЕ</span><strong>{currentCityEventLocation.label}</strong><small>{currentCityEventLocation.district} · около {currentCityEvent.hours} ч.</small></div><div className="event-reveal-actions"><button className="pixel-button primary" onClick={() => setShowEventReveal(false)}>Запомнить и начать день</button><button className="event-map-link" onClick={() => { setShowEventReveal(false); setSideTab("event"); setViewMode("map"); }}>Показать на карте →</button></div></div>
          </section>
        </div>
      )}

      {activeDialogue && activeDialogueDef && activeDialogueMission && activeDialogueRound && (
        <div className="modal-backdrop dialogue-backdrop">
          <section className="dialogue-modal">
            <button className="modal-close" onClick={closeDialogue}>×</button>
            <div className="dialogue-speaker"><PixelPortrait npc={activeDialogue} /><span>{activeDialogue.role}</span><h2>{activeDialogue.name}</h2><small>{currentLocation.label}</small><div className="speaker-relationship"><span>{getRelationshipTitle(activeDialogueRelationship)}</span><i><b style={{ width: `${activeDialogueRelationship}%` }} /></i><strong>{activeDialogueRelationship}%</strong></div></div>
            <div className="dialogue-content">
              <p className="eyebrow ink">{dialogueStage === "intro" ? "НОВОЕ ЗНАКОМСТВО" : `${activeDialogueMission.kind} · ОКОЛО ${activeDialogueMission.durationMinutes} МИНУТ`}</p>
              <div className="conversation-mission"><span>{activeDialogueMission.kind}</span><strong>{activeDialogueMission.title}</strong><p><b>Цель:</b> {activeDialogueMission.goal}</p></div>
              {dialogueStage === "intro" && <><div className="character-introduction"><span>КТО ЭТО?</span><p>{activeDialogueDef.intro}</p></div><button className="pixel-button primary" onClick={() => setDialogueStage("choice")}>Поздороваться и представиться →</button></>}
              {dialogueStage === "choice" && <><div className="conversation-flow">{activeDialogueRounds.map((_, index) => <i key={index} className={index <= dialogueRoundIndex ? "active" : ""} />)}<span>разговор развивается</span></div><blockquote>«{activeDialogueRound.prompt}»</blockquote><div className="dialogue-choices">{activeDialogueRound.choices.map((choice) => <button key={choice.label} onClick={() => chooseDialogue(choice)}><span>Ответить:</span><strong>«{choice.label}»</strong><b>→</b></button>)}</div></>}
              {dialogueStage === "result" && <><blockquote>«{dialogueResult}»</blockquote>{dialogueRoundIndex >= activeDialogueRounds.length - 1 ? <div className="dialogue-assignment-reveal"><span>ЗАПИСАНО В ЖУРНАЛ</span><strong>{activeDialogueMission.task}</strong><small><b>Вы разузнали:</b> {activeDialogueMission.knowledge}</small></div> : <div className="dialogue-time-note">Разговор продолжается · время идёт постепенно</div>}<button className="pixel-button primary" onClick={continueDialogue}>{dialogueRoundIndex >= activeDialogueRounds.length - 1 ? "Записать поручение и продолжить день →" : "Продолжить разговор →"}</button></>}
            </div>
          </section>
        </div>
      )}

      {tutorialStep >= 0 && (
        <div className="modal-backdrop tutorial-backdrop">
          <section className="tutorial-modal">
            <div className="tutorial-visual"><div className={`tutorial-icon step-${tutorialStep}`}><i /><i /><i /></div><div className="tutorial-progress">{tutorialSteps.map((_, index) => <span key={index} className={index <= tutorialStep ? "active" : ""} />)}</div></div>
            <div className="tutorial-copy"><button className="tutorial-skip" onClick={() => { setTutorialStep(-1); setViewMode("scene"); }}>Пропустить обучение</button><p className="eyebrow ink">{tutorialSteps[tutorialStep].kicker}</p><h2>{tutorialSteps[tutorialStep].title}</h2><p>{tutorialSteps[tutorialStep].body}</p><div className="tutorial-tip"><b>ПОДСКАЗКА</b>{tutorialSteps[tutorialStep].tip}</div><button className="pixel-button primary" onClick={nextTutorial}>{tutorialStep === 3 ? "Начать первый день" : "Дальше →"}</button></div>
          </section>
        </div>
      )}

      {!awake && !activeEvent && !activeDialogue && !dayTransitionPhase && tutorialStep < 0 && !pendingTravel && (
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

      {showGameMenu && <div className="modal-backdrop game-menu-backdrop"><section className="game-menu-modal"><button className="modal-close" onClick={() => setShowGameMenu(false)}>×</button><p className="eyebrow ink">ПАУЗА · ГЛАВА {year}/5</p><h2>Меню истории</h2><div className="game-menu-grid"><button onClick={() => { setShowGameMenu(false); setTutorialStep(0); setViewMode("scene"); }}><i>?</i><span><strong>Обучение</strong><small>Ещё раз показать основы</small></span></button><button onClick={() => { setShowGameMenu(false); setShowAchievements(true); }}><i>★</i><span><strong>Ачивки</strong><small>Открыто {unlockedAchievements.length} из {achievementDefs.length}</small></span></button><button onClick={() => { setShowGameMenu(false); setShowJournal(true); }}><i>▤</i><span><strong>Журнал</strong><small>Решения и события истории</small></span></button><button onClick={exitToTitle}><i>↥</i><span><strong>Сохранить и выйти</strong><small>Вернуться на титульный экран</small></span></button></div></section></div>}

      {showJournal && <div className="modal-backdrop"><section className="journal-modal"><button className="modal-close" onClick={() => setShowJournal(false)}>×</button><p className="eyebrow ink">CHRONIQUE</p><h2>Журнал {profile.name}</h2><div className="journal-list">{journal.map((entry, index) => <div key={`${entry}-${index}`}><span>{journal.length - index}</span><p>{entry}</p></div>)}</div></section></div>}
      {showAchievements && <div className="modal-backdrop achievement-backdrop"><section className="achievements-modal"><button className="modal-close" onClick={() => setShowAchievements(false)}>×</button><p className="eyebrow ink">COLLECTION · {unlockedAchievements.length}/{achievementDefs.length}</p><h2>Ачивки новой жизни</h2><p>Открываются сами, когда ты исследуешь город, знакомишься с людьми и развиваешь персонажа.</p><div className="achievement-grid">{achievementDefs.map((achievement) => { const value = Math.min(getAchievementProgress(achievement), achievement.target); const unlocked = value >= achievement.target; return <article className={unlocked ? "unlocked" : "locked"} key={achievement.id}><i>{unlocked ? achievement.icon : "?"}</i><div><span>{unlocked ? "ОТКРЫТО" : "ЕЩЁ НЕ ОТКРЫТО"}</span><h3>{achievement.title}</h3><p>{achievement.description}</p><div className="achievement-track"><b style={{ width: `${(value / achievement.target) * 100}%` }} /></div><small>{value}/{achievement.target}</small></div></article>; })}</div></section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
