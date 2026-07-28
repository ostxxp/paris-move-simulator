"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

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

type DayProgress = {
  actions: number;
  talks: number;
  travels: number;
  french: number;
  admin: number;
  culture: number;
  earned: number;
};

type DayProgressKey = keyof DayProgress;

type DialogueChoice = {
  label: string;
  response: string;
  effects: Partial<Stats>;
};

type DialogueDef = {
  greeting: string;
  choices: DialogueChoice[];
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
  key: DayProgressKey;
  label: string;
  detail: string;
  target: number;
};

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
      { id: "sleep", label: "Отдохнуть", detail: "+38 сил", icon: "🛏", hours: 3, effects: { energy: 38 } },
      { id: "cook", label: "Приготовить ужин", detail: "−12 € · +культура", icon: "🥘", hours: 2, effects: { money: -12, energy: 22, assimilation: 3 } },
      { id: "papers", label: "Разобрать письма", detail: "+бюрократия", icon: "✉", hours: 2, effects: { energy: -7, admin: 6 } },
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
    { key: "talks", label: "Сказать кому-то bonjour", detail: "Поговори с любым персонажем", target: 1 },
    { key: "actions", label: "Сделать два полезных дела", detail: "Подойдут учёба, работа, быт или отдых", target: 2 },
    { key: "travels", label: "Съездить в другой район", detail: "Открой карту и подтверди маршрут", target: 1 },
  ],
  [
    { key: "french", label: "Попрактиковать французский", detail: "Выбери действие или реплику с бонусом к языку", target: 1 },
    { key: "admin", label: "Продвинуть документы", detail: "Сделай одно дело с бонусом к досье", target: 1 },
    { key: "actions", label: "Закрыть три дела", detail: "Любые три действия в течение дня", target: 3 },
  ],
  [
    { key: "earned", label: "Заработать не меньше 50 €", detail: "Смена в кафе — самый прямой вариант", target: 50 },
    { key: "culture", label: "Узнать Париж ближе", detail: "Сделай действие с бонусом к интеграции", target: 1 },
    { key: "talks", label: "Поговорить с двумя людьми", detail: "Загляни в разные локации", target: 2 },
  ],
  [
    { key: "travels", label: "Посетить два места", detail: "Каждый подтверждённый маршрут идёт в зачёт", target: 2 },
    { key: "culture", label: "Два культурных дела", detail: "Музей, прогулка, волонтёрство или городской ивент", target: 2 },
    { key: "actions", label: "Не потратить день впустую", detail: "Выполни три обычных действия", target: 3 },
  ],
];

const dialogues: Record<string, DialogueDef> = {
  claire: {
    greeting: "Я как раз хотела спросить: ты уже познакомился с соседями на лестничной площадке?",
    choices: [
      { label: "Пока стесняюсь. Как лучше начать?", response: "Просто скажи bonjour и представься. Здесь маленькая вежливость открывает большие двери.", effects: { french: 3, assimilation: 5 } },
      { label: "Да, и хочу устроить общий ужин.", response: "Вот это по-соседски! Я принесу тарт, а ты напиши приглашение в общий чат.", effects: { money: -10, assimilation: 7, stability: 4 } },
    ],
  },
  malik: {
    greeting: "Сегодня очередь не давит. Попробуешь заказать всё по-французски?",
    choices: [
      { label: "Un café allongé, s’il vous plaît.", response: "Parfait! И обязательно скажи sur place, если пьёшь здесь. Уже звучишь увереннее.", effects: { money: -4, french: 6, energy: 8 } },
      { label: "Лучше расскажи, где здесь ищут подработку.", response: "Оставь номер. По пятницам мне нужен человек на закрытие — начнёшь с короткой смены.", effects: { assimilation: 4, stability: 7 } },
    ],
  },
  ines: {
    greeting: "Преподаватель дал групповую презентацию. Возьмёшь устную часть или соберёшь материалы?",
    choices: [
      { label: "Возьму устную часть — пора говорить.", response: "Смело. Давай вечером прорепетируем, и я поправлю только самые важные ошибки.", effects: { energy: -5, french: 8, stability: 3 } },
      { label: "Сначала соберу источники в библиотеке.", response: "Хороший план. Я покажу, как здесь правильно оформляют bibliographie.", effects: { admin: 4, french: 3, stability: 4 } },
    ],
  },
  bernard: {
    greeting: "Ваше досье уже лучше. Но скажите: оригиналы документов сегодня с собой?",
    choices: [
      { label: "Да, и копии разложены по разделам.", response: "Редкая подготовка. С таким порядком следующий rendez-vous пройдёт заметно быстрее.", effects: { admin: 8, stability: 5 } },
      { label: "Нет. Можно донести их позже?", response: "Можно, но возьмите récépissé и сохраните номер обращения. Без него письмо легко потеряется.", effects: { energy: -3, admin: 5, french: 2 } },
    ],
  },
  yuki: {
    greeting: "Я рисую не базилику, а людей на ступенях. Хочешь присоединиться?",
    choices: [
      { label: "Дай карандаш — попробую быстрый портрет.", response: "Не гоняйся за сходством. Поймай жест — именно он потом вернёт этот день.", effects: { energy: -3, assimilation: 8 } },
      { label: "Лучше расспрошу туристов, откуда они.", response: "Тоже способ увидеть город. Париж всегда состоит из множества чужих историй.", effects: { french: 5, assimilation: 5 } },
    ],
  },
  luc: {
    greeting: "У тебя есть час в Лувре. Итальянское Возрождение или история самой крепости?",
    choices: [
      { label: "Хочу понять, как дворец стал музеем.", response: "Тогда начнём с подземных стен. История города лучше запоминается ногами.", effects: { french: 3, assimilation: 8 } },
      { label: "Покажи одну картину, но подробно.", response: "Отличный выбор. Музей перестаёт утомлять, когда разрешаешь себе не увидеть всё.", effects: { energy: 3, assimilation: 7 } },
    ],
  },
  amina: {
    greeting: "В субботу мы собираем вещи для новых семей. Сможешь помочь два часа?",
    choices: [
      { label: "Да, запиши меня в команду.", response: "Спасибо. Там легко познакомиться с людьми — работа быстро снимает неловкость.", effects: { energy: -7, assimilation: 9, stability: 4 } },
      { label: "Не успею, но могу принести продукты.", response: "Это тоже помощь. Я пришлю список того, что действительно нужно.", effects: { money: -16, assimilation: 6 } },
    ],
  },
  thomas: {
    greeting: "Представь, что собеседование началось. Почему ты хочешь работать именно здесь?",
    choices: [
      { label: "Хочу применить опыт и расти вместе с командой.", response: "Неплохо. Теперь добавь конкретный пример — во Франции любят ясную аргументацию.", effects: { french: 4, stability: 7 } },
      { label: "Мне прежде всего нужен стабильный статус.", response: "Честно, но работодателю важна и его выгода. Давай переформулируем ответ.", effects: { admin: 3, french: 5, stability: 3 } },
    ],
  },
};

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

const storyChapters: StoryChapter[] = [
  {
    episode: "ГЛАВА I · ПРИБЫТИЕ",
    title: "Новый адрес",
    summary: "Чемодан стоит посреди мансарды, французский звучит слишком быстро, а арендодатель ждёт документы.",
    mission: "Закрепить жильё, познакомиться с соседом и собрать первое досье.",
    stakes: "Без адреса не открыть счёт и не продлить ВНЖ.",
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
    title: "Сначала построй маршрут",
    body: "Карта показывает реальные названия районов и достопримечательностей. Нажми на место, сравни метро, велосипед и прогулку, затем подтверди поездку.",
    tip: "Время в пути приблизительное и зависит от расстояния.",
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
  const [showAchievements, setShowAchievements] = useState(false);

  const selectedRoute = routes.find((route) => route.id === routeId) ?? routes[0];
  const currentLocation = locations.find((location) => location.id === locationId) ?? locations[0];
  const currentNpc = npcs.find((npc) => npc.id === currentLocation.npc) ?? npcs[0];
  const goal = yearGoals[Math.min(year - 1, yearGoals.length - 1)];
  const chapter = storyChapters[Math.min(year - 1, storyChapters.length - 1)];
  const goalsMet = stats.french >= goal.french && stats.admin >= goal.admin && stats.assimilation >= goal.assimilation && stats.stability >= goal.stability;
  const dailyTasks = dailyTaskSets[(day - 1) % dailyTaskSets.length];
  const allDailyTasksDone = dailyTasks.every((task) => dailyProgress[task.key] >= task.target);
  const currentCityEvent = cityEvents[(day - 1) % cityEvents.length];
  const currentCityEventLocation = locations.find((location) => location.id === currentCityEvent.locationId) ?? locations[0];
  const currentCityEventKey = `${day}-${currentCityEvent.id}`;
  const cityEventDone = completedCityEvents.includes(currentCityEventKey);
  const chapterProgress = Math.round(((["french", "admin", "assimilation", "stability"] as const)
    .reduce((sum, key) => sum + Math.min(stats[key] / goal[key], 1), 0) / 4) * 100);

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
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [phase, profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents]);

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
    setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false); setVisitedLocations(["home"]); setCompletedCityEvents([]);
    setActiveDialogue(null); setDialogueResult(""); setShowAchievements(false);
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
    setAwake(true); setViewMode("scene"); setTutorialStep(-1); setPhase("game");
  };

  const startFresh = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedGame(null); setProfile(defaultProfile); setPhase("setup");
  };

  const exitToTitle = () => {
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents };
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
    setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false);
    setViewMode("scene");
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
    addJournal(`${formatTime(time)} · ${currentLocation.short}: ${action.label}.`);
    setToast(`${action.label} · прошло ${action.hours} ч.`);
    maybeTriggerEvent(nextCount);
    if (nextTime >= 24) {
      setDay((value) => value + 1); setTime(6); setAwake(false); setLocationId("home");
      setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false);
    } else {
      setTime(nextTime);
    }
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
    const effects = mode === "metro" ? { money: -2, energy: -2 } : mode === "bike" ? { money: -2, energy: -6 } : { energy: -9 };
    const transport = mode === "metro" ? "Métro" : mode === "bike" ? "Vélib’" : "Пешком";
    setLocationId(pendingTravel.id);
    setVisitedLocations((items) => items.includes(pendingTravel.id) ? items : [...items, pendingTravel.id]);
    setDailyProgress((progress) => ({ ...progress, travels: progress.travels + 1 }));
    setTime((value) => value + minutes / 60);
    setStats((current) => applyEffects(current, effects));
    addJournal(`${formatTime(time)} · ${transport}: ${currentLocation.label} → ${pendingTravel.label}, около ${minutes} мин.`);
    setToast(`${transport} · прибытие примерно в ${formatTime(time + minutes / 60)}`);
    setPendingTravel(null);
    setViewMode("scene");
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
    setDialogueResult("");
  };

  const chooseDialogue = (choice: DialogueChoice) => {
    if (!activeDialogue) return;
    const firstMeeting = !metNpcs.includes(activeDialogue.id);
    const baseEffects: Partial<Stats> = { energy: -3, french: firstMeeting ? 2 : 1, assimilation: firstMeeting ? 3 : 1 };
    const combinedEffects: Partial<Stats> = {
      ...baseEffects,
      ...choice.effects,
      energy: (baseEffects.energy ?? 0) + (choice.effects.energy ?? 0),
      french: (baseEffects.french ?? 0) + (choice.effects.french ?? 0),
      assimilation: (baseEffects.assimilation ?? 0) + (choice.effects.assimilation ?? 0),
    };
    if (firstMeeting) setMetNpcs((items) => [...items, activeDialogue.id]);
    setStats((current) => applyEffects(current, combinedEffects));
    setTime((value) => Math.min(23.5, value + 1));
    setDailyProgress((progress) => ({
      ...progress,
      talks: progress.talks + 1,
      french: progress.french + ((combinedEffects.french ?? 0) > 0 ? 1 : 0),
      admin: progress.admin + ((combinedEffects.admin ?? 0) > 0 ? 1 : 0),
      culture: progress.culture + ((combinedEffects.assimilation ?? 0) > 0 ? 1 : 0),
      earned: progress.earned + Math.max(0, combinedEffects.money ?? 0),
    }));
    setDialogueResult(choice.response);
    addJournal(`${activeDialogue.name}: ${choice.response}`);
    setToast(firstMeeting ? `Новое знакомство: ${activeDialogue.name}` : `Разговор повлиял на твою историю`);
  };

  const closeDialogue = () => { setActiveDialogue(null); setDialogueResult(""); };

  const claimDailyReward = () => {
    if (!allDailyTasksDone || dailyRewardClaimed) return;
    setStats((current) => applyEffects(current, { money: 60, energy: 10, assimilation: 3 }));
    setDailyRewardClaimed(true);
    addJournal(`План дня выполнен: +60 €, +10 сил и +3 к интеграции.`);
    setToast("План дня выполнен — награда получена!");
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
    if (!goalsMet) { setToast("Сначала выполни цели года."); return; }
    if (year >= 5) {
      setTestIndex(0); setTestScore(0); setTestFeedback(""); setPhase("test");
      return;
    }
    const nextYear = year + 1;
    setYear(nextYear); setDay((value) => value + 1); setTime(7); setAwake(false); setLocationId("home");
    setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false);
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
        <div className="time-block"><span>ГЛАВА {year}/5 · ДЕНЬ {day}</span><strong>{formatTime(time)}</strong><em>{sky === "night" ? "Ночь" : sky === "sunset" ? "Закат" : sky === "dawn" ? "Рассвет" : "День"}</em></div>
        <div className="header-actions"><button className={viewMode === "map" ? "active" : ""} onClick={() => setViewMode(viewMode === "map" ? "scene" : "map")}>⌖ {viewMode === "map" ? "Вернуться в локацию" : "Карта Парижа"}</button><button onClick={() => { setTutorialStep(0); setViewMode("scene"); }}>? Обучение</button><button onClick={() => setShowAchievements(true)}>★ Ачивки <b>{unlockedAchievements.length}/{achievementDefs.length}</b></button><button onClick={() => setShowJournal(true)}>▤ Журнал</button><button onClick={exitToTitle}>Сохранить</button></div>
      </header>

      <div className="game-layout">
        <aside className="left-panel pixel-panel">
          <div className="player-card"><div className="player-avatar small"><span className="player-hair" /><span className="player-face" /><span className="player-body" /></div><div><strong>{profile.name}</strong><small>{profile.age} лет · глава {year}/5</small></div></div>
          <div className="stats-list">
            <StatMeter label="Силы" value={stats.energy} icon="♥" />
            <StatMeter label="Деньги" value={stats.money} icon="€" money />
            <StatMeter label="Французский" value={stats.french} icon="FR" />
            <StatMeter label="Досье" value={stats.admin} icon="▤" />
            <StatMeter label="Интеграция" value={stats.assimilation} icon="◆" />
            <StatMeter label="Опора" value={stats.stability} icon="⌂" />
          </div>
          <div className="daily-plan-card">
            <div className="daily-plan-head"><span>ПЛАН НА СЕГОДНЯ · ДЕНЬ {day}</span><b>{dailyTasks.filter((task) => dailyProgress[task.key] >= task.target).length}/{dailyTasks.length}</b></div>
            <h3>Понятные дела на день</h3>
            <div className="daily-task-list">
              {dailyTasks.map((task) => {
                const value = Math.min(dailyProgress[task.key], task.target);
                const done = value >= task.target;
                return <div className={`daily-task ${done ? "done" : ""}`} key={`${task.key}-${task.label}`}><i>{done ? "✓" : ""}</i><div><strong>{task.label}</strong><small>{task.detail}</small></div><b>{value}/{task.target}</b></div>;
              })}
            </div>
            <button className={`daily-reward ${allDailyTasksDone && !dailyRewardClaimed ? "ready" : ""}`} disabled={!allDailyTasksDone || dailyRewardClaimed} onClick={claimDailyReward}>{dailyRewardClaimed ? "✓ Награда получена" : "Награда: +60 € · +10 сил"}</button>
          </div>
          <div className="chapter-progress-card">
            <div><span>ПУТЬ К ГРАЖДАНСТВУ</span><b>Глава {year} из 5</b></div>
            <strong>{goal.title}</strong>
            <p>Язык, досье, интеграция и опора вместе открывают следующую сюжетную главу.</p>
            <div className="chapter-progress-track"><span style={{ width: `${chapterProgress}%` }} /></div>
            <small>Общий прогресс главы <b>{chapterProgress}%</b></small>
            <button className={`year-button ${goalsMet ? "ready" : ""}`} disabled={!goalsMet} onClick={advanceYear}>{year === 5 ? "Подать заявление" : `Открыть главу ${year + 1}`} →</button>
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
                <button key={location.id} className={`map-location ${locationId === location.id ? "active" : ""}`} style={{ left: location.x, top: location.y }} onClick={() => travelTo(location.id)} aria-label={`Построить маршрут: ${location.label}`}>
                  <LandmarkArt type={location.art} /><span>{location.short}</span>{locationId === location.id && <i className="you-pin">ВЫ ЗДЕСЬ</i>}
                </button>
              ))}
              <div className="map-legend"><b>КАК ПОЛЬЗОВАТЬСЯ</b><span><i className="legend-dot red" /> линия 1</span><span><i className="legend-dot blue" /> линия 4</span><span><i className="legend-dot gold" /> RER</span><p>Выберите место — время и способ поездки появятся до подтверждения.</p></div>
              <div className="map-grain" />
            </div>
          ) : (
            <div className="location-world">
              <LocationBackdrop location={currentLocation} sky={sky} />
              <div className="chapter-banner">
                <span>{chapter.episode}</span>
                <h2>{chapter.title}</h2>
                <p>{chapter.summary}</p>
                <div><b>ТЕКУЩАЯ МИССИЯ</b><strong>{chapter.mission}</strong><small>Ставка: {chapter.stakes}</small></div>
              </div>
              <button className="open-map-button" onClick={() => setViewMode("map")}><span>⌖</span><b>Открыть карту Парижа</b><small>Выбрать следующую локацию</small></button>
            </div>
          )}
        </section>

        <aside className="right-panel pixel-panel">
          <div className="location-heading"><span>СЕЙЧАС ВЫ ЗДЕСЬ</span><h2>{currentLocation.label}</h2><p>{currentLocation.district}</p></div>
          <div className="location-summary"><span>СЮЖЕТНАЯ ТОЧКА</span><p>{currentLocation.description}</p></div>
          <div className={`city-event-card ${cityEventDone ? "completed" : ""}`}>
            <div><span>{currentCityEvent.kicker}</span><b>{currentCityEvent.hours} ч.</b></div>
            <h3>{currentCityEvent.title}</h3>
            <p>{currentCityEvent.body}</p>
            <small>⌖ {currentCityEventLocation.label} · {currentCityEventLocation.district}</small>
            <button disabled={!awake || cityEventDone} onClick={participateCityEvent}>{cityEventDone ? "✓ Событие завершено" : locationId === currentCityEvent.locationId ? "Участвовать сейчас →" : "Показать место на карте →"}</button>
          </div>
          <div className="npc-card"><PixelPortrait npc={currentNpc} small /><div><span>{currentNpc.role}</span><strong>{currentNpc.name}</strong><p>«{currentNpc.line}»</p></div></div>
          <button className="talk-button" disabled={!awake} onClick={talkToNpc}>Поговорить · 1 ч. {metNpcs.includes(currentNpc.id) ? "" : "· новое знакомство"}</button>
          <div className="actions-title"><span>ЧТО ДЕЛАТЬ?</span><b>{awake ? `свободно около ${Math.max(0, Math.floor(24 - time))} ч.` : "сначала проснись"}</b></div>
          <div className="action-list">
            {currentLocation.actions.map((action) => <button key={action.id} disabled={!awake} onClick={() => performAction(action)}><span className="action-icon">{action.icon}</span><span><strong>{action.label}</strong><small>{action.detail} · {action.hours} ч.</small></span><b>›</b></button>)}
          </div>
          {awake && <button className="end-day" onClick={finishDay}>Завершить день · вернуться домой</button>}
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

      {activeDialogue && (
        <div className="modal-backdrop dialogue-backdrop">
          <section className="dialogue-modal">
            <button className="modal-close" onClick={closeDialogue}>×</button>
            <div className="dialogue-speaker"><PixelPortrait npc={activeDialogue} /><span>{activeDialogue.role}</span><h2>{activeDialogue.name}</h2><small>{currentLocation.label}</small></div>
            <div className="dialogue-content">
              <p className="eyebrow ink">ДИАЛОГ · ВАШ ОТВЕТ МЕНЯЕТ ХАРАКТЕРИСТИКИ</p>
              <blockquote>«{dialogueResult || dialogues[activeDialogue.id].greeting}»</blockquote>
              {!dialogueResult ? <div className="dialogue-choices">{dialogues[activeDialogue.id].choices.map((choice) => <button key={choice.label} onClick={() => chooseDialogue(choice)}><span>Сказать:</span><strong>«{choice.label}»</strong><b>→</b></button>)}</div> : <button className="pixel-button primary" onClick={closeDialogue}>Продолжить день →</button>}
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

      {!awake && !activeEvent && !activeDialogue && tutorialStep < 0 && !pendingTravel && (
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
      {showAchievements && <div className="modal-backdrop achievement-backdrop"><section className="achievements-modal"><button className="modal-close" onClick={() => setShowAchievements(false)}>×</button><p className="eyebrow ink">COLLECTION · {unlockedAchievements.length}/{achievementDefs.length}</p><h2>Ачивки новой жизни</h2><p>Открываются сами, когда ты исследуешь город, знакомишься с людьми и развиваешь персонажа.</p><div className="achievement-grid">{achievementDefs.map((achievement) => { const value = Math.min(getAchievementProgress(achievement), achievement.target); const unlocked = value >= achievement.target; return <article className={unlocked ? "unlocked" : "locked"} key={achievement.id}><i>{unlocked ? achievement.icon : "?"}</i><div><span>{unlocked ? "ОТКРЫТО" : "ЕЩЁ НЕ ОТКРЫТО"}</span><h3>{achievement.title}</h3><p>{achievement.description}</p><div className="achievement-track"><b style={{ width: `${(value / achievement.target) * 100}%` }} /></div><small>{value}/{achievement.target}</small></div></article>; })}</div></section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
