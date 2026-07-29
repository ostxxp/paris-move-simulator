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
  repeatable?: boolean;
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

type DialogueLine = {
  speaker: "player" | "npc";
  text: string;
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
  period: "morning" | "day" | "evening";
  startHour: number;
  endHour: number;
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

type DutyMetric = keyof DayProgress | "route";

type WeekDuty = {
  id: string;
  label: string;
  detail: string;
  metric: DutyMetric;
  target: number;
  dueHour: number;
  locationId?: string;
};

type WeekdayDef = {
  name: string;
  short: string;
  french: string;
  focus: string;
  duties: WeekDuty[];
};

type ParisDistrict = {
  number: number;
  name: string;
  x: string;
  y: string;
};

type ActiveAction = {
  action: Action;
  locationId: string;
  startTime: number;
};

type CafeOrderChoice = {
  label: string;
  correct: boolean;
  feedback: string;
};

type CafeOrder = {
  id: string;
  customer: Npc;
  entrance: string;
  order: string;
  meaning: string;
  prompt: string;
  choices: CafeOrderChoice[];
};

type ActiveCafeShift = {
  action: Action;
  locationId: string;
  startTime: number;
  orders: CafeOrder[];
  index: number;
  correct: number;
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

type PortraitPreset = {
  skin: string;
  shadow: string;
  accent: string;
  hairStyle: "crop" | "bob" | "curls" | "side" | "bun" | "waves";
  face: "round" | "long" | "square";
};

type AmbientProp = "none" | "laptop" | "cup" | "book" | "phone" | "folder" | "bag" | "camera" | "sketch";
type AmbientPose = "standing" | "seated" | "leaning" | "walking" | "queue";
type AmbientPersonDef = {
  prop: AmbientProp;
  pose: AmbientPose;
  scale?: number;
  depth?: number;
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
  completedActionIds?: string[];
  recentCafeOrderIds?: string[];
  activeCafeShift?: ActiveCafeShift | null;
  cafeShiftFeedback?: { correct: boolean; text: string } | null;
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

const portraitPresets: Record<string, PortraitPreset> = {
  claire: { skin: "#e2aa82", shadow: "#c98268", accent: "#f0cf85", hairStyle: "bob", face: "round" },
  malik: { skin: "#a96f50", shadow: "#7f4b3e", accent: "#e5bc5f", hairStyle: "curls", face: "square" },
  ines: { skin: "#c98b68", shadow: "#9f644f", accent: "#d7b9ed", hairStyle: "waves", face: "long" },
  bernard: { skin: "#dfb08c", shadow: "#bb816a", accent: "#d9d2bf", hairStyle: "side", face: "square" },
  yuki: { skin: "#e0ad82", shadow: "#b7775f", accent: "#e15f62", hairStyle: "bob", face: "round" },
  luc: { skin: "#e4b18a", shadow: "#bd7a61", accent: "#7db7c2", hairStyle: "curls", face: "long" },
  amina: { skin: "#895139", shadow: "#65392f", accent: "#f0b34e", hairStyle: "bun", face: "round" },
  thomas: { skin: "#d19a72", shadow: "#a46750", accent: "#e8d49a", hairStyle: "side", face: "square" },
  lea: { skin: "#e2ae89", shadow: "#ba795f", accent: "#d9a4c9", hairStyle: "waves", face: "long" },
  hugo: { skin: "#d1956d", shadow: "#a8644e", accent: "#e2a64c", hairStyle: "crop", face: "square" },
  mireille: { skin: "#e1b18d", shadow: "#bb8067", accent: "#d9d2bd", hairStyle: "bob", face: "round" },
  sami: { skin: "#9f684c", shadow: "#784436", accent: "#7291d8", hairStyle: "curls", face: "long" },
  camille: { skin: "#dfaa82", shadow: "#b8755e", accent: "#e5c35d", hairStyle: "bun", face: "long" },
  nora: { skin: "#b97958", shadow: "#8c503f", accent: "#8bc08a", hairStyle: "waves", face: "round" },
  etienne: { skin: "#d6a079", shadow: "#aa6852", accent: "#ae91c7", hairStyle: "side", face: "square" },
  fatou: { skin: "#7d4935", shadow: "#5c3229", accent: "#e28a61", hairStyle: "bun", face: "round" },
  rachid: { skin: "#b97655", shadow: "#8d4c3d", accent: "#d8aa53", hairStyle: "crop", face: "square" },
  chloe: { skin: "#dfaa86", shadow: "#b46f59", accent: "#d897a3", hairStyle: "waves", face: "long" },
  alain: { skin: "#d09b77", shadow: "#a36350", accent: "#8fa9bf", hairStyle: "side", face: "square" },
  sofia: { skin: "#c88465", shadow: "#985441", accent: "#b5a1d5", hairStyle: "bob", face: "long" },
  marc: { skin: "#e0ad88", shadow: "#b6765d", accent: "#7ba46f", hairStyle: "crop", face: "round" },
  elodie: { skin: "#edc09e", shadow: "#c48971", accent: "#d8bf91", hairStyle: "bun", face: "long" },
  gabriel: { skin: "#b97858", shadow: "#8e4d3e", accent: "#7898c5", hairStyle: "side", face: "square" },
  zoe: { skin: "#dda681", shadow: "#b16d57", accent: "#b884a2", hairStyle: "waves", face: "round" },
  idris: { skin: "#8d543f", shadow: "#68372e", accent: "#66a1aa", hairStyle: "crop", face: "long" },
  pauline: { skin: "#e4b08b", shadow: "#ba7a63", accent: "#d77b68", hairStyle: "bob", face: "round" },
  ana: { skin: "#c98767", shadow: "#9b5847", accent: "#9c92cf", hairStyle: "bun", face: "long" },
  omar: { skin: "#9d6248", shadow: "#754034", accent: "#73a18d", hairStyle: "curls", face: "square" },
};

const ambientLooks = [
  { skin: "#e4ad85", shadow: "#bd775e", hair: "#3d2926", coat: "#44789a", accent: "#e5bf61" },
  { skin: "#9c6249", shadow: "#754033", hair: "#171a20", coat: "#b74750", accent: "#73b49a" },
  { skin: "#d39069", shadow: "#a75f4d", hair: "#71462f", coat: "#d6a13d", accent: "#f1e0bd" },
  { skin: "#75442f", shadow: "#543027", hair: "#221b1b", coat: "#3f806c", accent: "#e79a55" },
  { skin: "#e6ba99", shadow: "#c2836c", hair: "#d2c9b8", coat: "#735f9e", accent: "#80b5c0" },
  { skin: "#bd7b59", shadow: "#8e4e3f", hair: "#2d2020", coat: "#cb6b45", accent: "#e1c461" },
  { skin: "#d9a47f", shadow: "#ad6d57", hair: "#1c2530", coat: "#5670bd", accent: "#dc8bb1" },
  { skin: "#8c563e", shadow: "#66382e", hair: "#4b2c25", coat: "#718d4e", accent: "#e8d69e" },
  { skin: "#efc4a0", shadow: "#c98e74", hair: "#9b5b38", coat: "#41818f", accent: "#cf5059" },
  { skin: "#aa6e51", shadow: "#814738", hair: "#171719", coat: "#9b5f91", accent: "#e0a542" },
  { skin: "#d99570", shadow: "#a95c4b", hair: "#d3b36f", coat: "#385f7d", accent: "#e4cf9c" },
  { skin: "#70402f", shadow: "#4f2d28", hair: "#222329", coat: "#d16d55", accent: "#76b7a2" },
];

const scenePopulation: Record<string, AmbientPersonDef[]> = {
  home: [{ prop: "cup", pose: "standing", scale: 1 }, { prop: "book", pose: "seated", scale: .94 }],
  cafe: [{ prop: "laptop", pose: "seated", scale: .93, depth: 3 }, { prop: "cup", pose: "seated", scale: .9, depth: 3 }, { prop: "folder", pose: "standing", scale: 1.02 }, { prop: "book", pose: "seated", scale: .86, depth: 3 }, { prop: "phone", pose: "leaning", scale: .97 }, { prop: "bag", pose: "standing", scale: 1.06 }],
  sorbonne: [{ prop: "laptop", pose: "seated", scale: .9, depth: 3 }, { prop: "book", pose: "seated", scale: .94, depth: 3 }, { prop: "folder", pose: "standing", scale: 1.04 }, { prop: "phone", pose: "seated", scale: .86, depth: 3 }, { prop: "bag", pose: "standing", scale: .96 }, { prop: "book", pose: "leaning", scale: 1 }],
  prefecture: [{ prop: "folder", pose: "queue", scale: 1 }, { prop: "phone", pose: "queue", scale: .94 }, { prop: "bag", pose: "queue", scale: 1.05 }, { prop: "folder", pose: "seated", scale: .9 }, { prop: "none", pose: "standing", scale: 1 }],
  louvre: [{ prop: "camera", pose: "standing", scale: .96 }, { prop: "book", pose: "seated", scale: .88, depth: 3 }, { prop: "phone", pose: "standing", scale: 1.04 }, { prop: "sketch", pose: "seated", scale: .9, depth: 3 }, { prop: "bag", pose: "walking", scale: .82 }, { prop: "none", pose: "standing", scale: .73 }],
  eiffel: [{ prop: "camera", pose: "standing", scale: 1.04 }, { prop: "phone", pose: "standing", scale: .88 }, { prop: "bag", pose: "walking", scale: .78 }, { prop: "cup", pose: "seated", scale: .9 }, { prop: "none", pose: "walking", scale: .68 }, { prop: "camera", pose: "standing", scale: .74 }, { prop: "bag", pose: "standing", scale: 1.08 }],
  montmartre: [{ prop: "sketch", pose: "seated", scale: .95 }, { prop: "camera", pose: "standing", scale: .84 }, { prop: "bag", pose: "walking", scale: .78 }, { prop: "cup", pose: "seated", scale: .9 }, { prop: "phone", pose: "leaning", scale: 1 }, { prop: "none", pose: "standing", scale: .72 }],
  notredame: [{ prop: "book", pose: "standing", scale: .98 }, { prop: "camera", pose: "standing", scale: .85 }, { prop: "bag", pose: "walking", scale: .76 }, { prop: "cup", pose: "seated", scale: .9 }, { prop: "phone", pose: "standing", scale: 1.02 }, { prop: "sketch", pose: "seated", scale: .86 }],
};

const cafeOrderPool: CafeOrder[] = [
  {
    id: "lea-noisette", customer: { id: "lea", name: "Леа", role: "архитектор", color: "#a45f8c", hair: "#2d2026", accessory: "glasses", line: "" },
    entrance: "Леа складывает зонт, здоровается с Маликом и подходит к кассе.", order: "Bonjour ! Un noisette, sans sucre, sur place, s’il vous plaît.", meaning: "Нуазет — эспрессо с небольшим количеством молока. Без сахара, здесь.", prompt: "Как правильно подтвердить заказ?",
    choices: [
      { label: "Un noisette sans sucre, sur place. C’est bien ça ?", correct: true, feedback: "Отлично: ты повторил напиток, уточнение и формат заказа." },
      { label: "Un café au lait à emporter ?", correct: false, feedback: "Не совсем: café au lait — другой напиток, а sur place значит «здесь»." },
      { label: "Vous voulez du thé ?", correct: false, feedback: "Клиентка просила кофе. Лучше коротко повторить весь заказ." },
    ],
  },
  {
    id: "hugo-allonge", customer: { id: "hugo", name: "Юго", role: "велокурьер", color: "#d1873e", hair: "#443128", accessory: "scarf", line: "" },
    entrance: "Юго оставляет шлем на стойке и торопливо смотрит на часы.", order: "Deux cafés allongés à emporter. Et rapidement, si possible.", meaning: "Два американо навынос. И побыстрее, если возможно.", prompt: "Что сказать, чтобы заказ прозвучал точно?",
    choices: [
      { label: "Deux allongés à emporter. Je vous prépare ça tout de suite.", correct: true, feedback: "Точно и вежливо: два allongés, навынос, готовим сразу." },
      { label: "Un espresso sur place, monsieur.", correct: false, feedback: "Потерялось количество, тип кофе и «навынос»." },
      { label: "Je ne comprends pas, parlez anglais.", correct: false, feedback: "Лучше переспросить по-французски: «Deux cafés, c’est bien ça ?»" },
    ],
  },
  {
    id: "mireille-deca", customer: { id: "mireille", name: "Мирей", role: "соседка", color: "#477c79", hair: "#d8d0bd", accessory: "beret", line: "" },
    entrance: "Мирей снимает перчатки и сначала спрашивает, как проходит твой день.", order: "Je prendrai un déca avec un nuage de lait, mais pas trop chaud.", meaning: "Кофе без кофеина с каплей молока, но не слишком горячий.", prompt: "Какое уточнение важно передать бариста?",
    choices: [
      { label: "Un déca, un peu de lait, pas trop chaud.", correct: true, feedback: "Именно: déca, немного молока и умеренная температура." },
      { label: "Un double espresso très chaud.", correct: false, feedback: "Получилось наоборот: двойной крепкий и очень горячий." },
      { label: "Sans lait et avec beaucoup de sucre.", correct: false, feedback: "Мирей просила немного молока и ничего не говорила о сахаре." },
    ],
  },
  {
    id: "sami-formule", customer: { id: "sami", name: "Сами", role: "студент", color: "#4d72b1", hair: "#17191f", accessory: "none", line: "" },
    entrance: "Сами раскрывает ноутбук ещё до того, как добирается до свободного столика.", order: "La formule étudiante, avec le croque-monsieur et une carafe d’eau.", meaning: "Студенческий комплекс: крок-месье и графин воды.", prompt: "Что входит в его заказ?",
    choices: [
      { label: "La formule étudiante, un croque-monsieur et de l’eau.", correct: true, feedback: "Верно. Carafe d’eau — бесплатный графин воды, не бутылка." },
      { label: "Seulement un sandwich à emporter.", correct: false, feedback: "Это комплекс на месте, а не один сэндвич навынос." },
      { label: "Une bouteille d’eau pétillante.", correct: false, feedback: "Он попросил обычную воду в графине." },
    ],
  },
  {
    id: "camille-the", customer: { id: "camille", name: "Камиль", role: "музыкант", color: "#b74e53", hair: "#7d4c31", accessory: "scarf", line: "" },
    entrance: "Камиль ставит у стены футляр от скрипки и говорит почти шёпотом.", order: "Un thé vert au citron, et est-ce que je peux avoir du miel à côté ?",
    meaning: "Зелёный чай с лимоном и мёд отдельно.", prompt: "Как подтвердить просьбу о мёде?",
    choices: [
      { label: "Bien sûr, je mets le miel à côté.", correct: true, feedback: "Bien sûr — естественное «конечно», а à côté — отдельно, рядом." },
      { label: "Je mélange le miel dans le café.", correct: false, feedback: "Камиль просила чай, а мёд — отдельно." },
      { label: "Nous n’avons pas de citron.", correct: false, feedback: "Лимон есть. Нужно было лишь подтвердить мёд." },
    ],
  },
  {
    id: "nora-oat", customer: { id: "nora", name: "Нора", role: "разработчица", color: "#5b8b68", hair: "#39261f", accessory: "glasses", line: "" },
    entrance: "Нора закрывает ноутбук и подходит к стойке, не снимая наушников с шеи.", order: "Un cappuccino au lait d’avoine. Je suis allergique au lait de vache.", meaning: "Капучино на овсяном молоке. Есть аллергия на коровье молоко.", prompt: "Как показать, что ты услышал важное?",
    choices: [
      { label: "Au lait d’avoine uniquement. Je préviens le barista pour l’allergie.", correct: true, feedback: "Правильно: повторил замену и отдельно отметил аллергию." },
      { label: "Un cappuccino normal, ça ira.", correct: false, feedback: "Нет: при аллергии нельзя заменять заказ «обычным» молоком." },
      { label: "Avec un peu de crème ?", correct: false, feedback: "Сливки тоже молочные. Нужна чистая рабочая зона и овсяное молоко." },
    ],
  },
  {
    id: "etienne-serre", customer: { id: "etienne", name: "Этьен", role: "редактор", color: "#7c669b", hair: "#2a2526", accessory: "moustache", line: "" },
    entrance: "Этьен кладёт на стойку газету и кивает вместо приветствия.", order: "Un café serré et l’addition de la table six, s’il vous plaît.", meaning: "Крепкий короткий эспрессо и счёт шестого столика.", prompt: "Что нужно сделать кроме кофе?",
    choices: [
      { label: "Préparer un serré et apporter l’addition à la table six.", correct: true, feedback: "Да: serré — короткий крепкий кофе, addition — счёт." },
      { label: "Débarrasser la table seize.", correct: false, feedback: "Six — шесть, не seize — шестнадцать; и нужен счёт, а не уборка." },
      { label: "Ajouter beaucoup d’eau au café.", correct: false, feedback: "Много воды превратит напиток в allongé, а нужен serré." },
    ],
  },
  {
    id: "fatou-sans", customer: { id: "fatou", name: "Фату", role: "медсестра", color: "#d2694a", hair: "#241b19", accessory: "none", line: "" },
    entrance: "Фату приходит после смены, устало улыбается и ищет тихий столик.", order: "Une tisane à la menthe, sans sucre, et quelque chose de léger à manger.", meaning: "Мятный травяной чай без сахара и что-нибудь лёгкое поесть.", prompt: "Какой вариант предложить?",
    choices: [
      { label: "Une tisane sans sucre et notre salade du jour ?", correct: true, feedback: "Хорошее предложение: напиток повторён, салат подходит к «лёгкому»." },
      { label: "Un chocolat chaud et un gâteau.", correct: false, feedback: "Это сладко и тяжело — противоположно просьбе." },
      { label: "Deux expressos avec du sucre.", correct: false, feedback: "Фату просила tisane без сахара, не кофе." },
    ],
  },
  {
    id: "rachid-petit-dej", customer: { id: "rachid", name: "Рашид", role: "фотограф", color: "#386b80", hair: "#181a1d", accessory: "moustache", line: "" },
    entrance: "Рашид вешает на спинку стула камеру и просит завтрак до начала съёмки.", order: "La formule petit-déjeuner : un café crème, une tartine beurre-confiture et un jus d’orange pressé.", meaning: "Завтрак: кофе со сливками, тост с маслом и джемом и свежевыжатый апельсиновый сок.", prompt: "Как не потерять ни одну часть формулы?",
    choices: [
      { label: "Un café crème, une tartine beurre-confiture et un jus d’orange pressé.", correct: true, feedback: "Всё на месте: напиток, тост и именно свежевыжатый сок." },
      { label: "Un café noir et un croissant seulement.", correct: false, feedback: "Это другой завтрак: пропали tartine и jus pressé." },
      { label: "Une formule déjeuner avec de l’eau.", correct: false, feedback: "Petit-déjeuner — завтрак, не обеденная формула." },
    ],
  },
  {
    id: "chloe-chocolat", customer: { id: "chloe", name: "Хлоя", role: "танцовщица", color: "#a9556b", hair: "#6b3a2e", accessory: "scarf", line: "" },
    entrance: "Хлоя стряхивает дождь с пальто и греет ладони у кофемашины.", order: "Un chocolat chaud sans chantilly, et un pain au chocolat réchauffé, s’il vous plaît.", meaning: "Горячий шоколад без взбитых сливок и разогретый pain au chocolat.", prompt: "Какое слово меняет подачу выпечки?",
    choices: [
      { label: "Je réchauffe le pain au chocolat, et le chocolat chaud sera sans chantilly.", correct: true, feedback: "Верно: réchauffer — разогреть, sans chantilly — без сливок." },
      { label: "Je sers tout froid avec de la chantilly.", correct: false, feedback: "Получилось ровно наоборот." },
      { label: "Un croissant et un café glacé.", correct: false, feedback: "Клиентка заказала другие напиток и выпечку." },
    ],
  },
  {
    id: "alain-double", customer: { id: "alain", name: "Ален", role: "таксист", color: "#315a76", hair: "#55505a", accessory: "moustache", line: "" },
    entrance: "Ален оставляет ключи у кассы и говорит заказ одним привычным выдохом.", order: "Un double expresso dans une tasse bien chaude, avec un verre d’eau gazeuse.", meaning: "Двойной эспрессо в хорошо прогретой чашке и стакан газированной воды.", prompt: "Что здесь важно кроме двойной порции?",
    choices: [
      { label: "Une tasse préchauffée et un verre d’eau gazeuse avec le double expresso.", correct: true, feedback: "Точно: прогретая чашка и газированная вода не потерялись." },
      { label: "Une tasse froide et de l’eau plate.", correct: false, feedback: "И температура чашки, и вид воды перепутаны." },
      { label: "Deux cafés allongés sans eau.", correct: false, feedback: "Double expresso — не два allongés." },
    ],
  },
  {
    id: "sofia-vegetal", customer: { id: "sofia", name: "София", role: "дизайнерка", color: "#7c5f9a", hair: "#2f252d", accessory: "glasses", line: "" },
    entrance: "София показывает сохранённый референс цвета, затем убирает телефон и улыбается.", order: "Un latte au lait de soja, peu sucré, avec la cannelle à part.", meaning: "Латте на соевом молоке, слегка сладкий, корица отдельно.", prompt: "Как подтвердить все три уточнения?",
    choices: [
      { label: "Lait de soja, peu sucré, et je mets la cannelle à part.", correct: true, feedback: "Все уточнения повторены ясно и коротко." },
      { label: "Lait entier, très sucré, avec la cannelle dedans.", correct: false, feedback: "Каждое уточнение оказалось противоположным." },
      { label: "Un thé sans lait ni sucre.", correct: false, feedback: "София заказала latte." },
    ],
  },
  {
    id: "marc-vegan", customer: { id: "marc", name: "Марк", role: "садовник", color: "#4f7b54", hair: "#4e3528", accessory: "beret", line: "" },
    entrance: "Марк ставит у двери корзину с растениями и внимательно читает витрину.", order: "Le sandwich aux légumes, mais sans fromage ni beurre. C’est bien végétalien ?", meaning: "Овощной сэндвич без сыра и масла; клиент уточняет, полностью ли он веганский.", prompt: "Как ответить безопасно, если нужно проверить состав?",
    choices: [
      { label: "Je vérifie la composition en cuisine avant de vous le confirmer.", correct: true, feedback: "Правильно: при ограничениях лучше проверить, а не угадывать." },
      { label: "Oui, sûrement, même avec un peu de beurre.", correct: false, feedback: "Beurre не подходит, а «наверное» — плохое подтверждение состава." },
      { label: "Je peux ajouter du jambon.", correct: false, feedback: "Это противоречит запросу на végétalien." },
    ],
  },
  {
    id: "elodie-gluten", customer: { id: "elodie", name: "Элоди", role: "юристка", color: "#a34c4f", hair: "#c7b08d", accessory: "glasses", line: "" },
    entrance: "Элоди кладёт рядом папку с делом и сразу предупреждает об аллергии.", order: "Je suis cœliaque. Est-ce que ce gâteau est vraiment sans gluten, sans contamination croisée ?", meaning: "У клиентки целиакия; она спрашивает о безглютеновом десерте и перекрёстном загрязнении.", prompt: "Какой ответ будет профессиональным?",
    choices: [
      { label: "Je demande en cuisine quels ustensiles ont été utilisés avant de vous répondre.", correct: true, feedback: "Верно: проверяем не только состав, но и приготовление." },
      { label: "Enlevez simplement les miettes, ce sera bon.", correct: false, feedback: "Крошки как раз создают риск загрязнения." },
      { label: "Tous les gâteaux sont pareils.", correct: false, feedback: "Так нельзя отвечать на вопрос об аллергии." },
    ],
  },
  {
    id: "gabriel-addition", customer: { id: "gabriel", name: "Габриэль", role: "учитель", color: "#4c6991", hair: "#5e3b2c", accessory: "none", line: "" },
    entrance: "Габриэль подходит от большого стола и держит в руке ошибочный счёт.", order: "Pardon, il y a trois cafés sur l’addition, mais nous n’en avons pris que deux.", meaning: "В счёте три кофе, хотя компания заказала только два.", prompt: "Как лучше отреагировать на ошибку?",
    choices: [
      { label: "Je suis désolé. Je vérifie la commande et je corrige l’addition tout de suite.", correct: true, feedback: "Вежливое извинение, проверка и конкретное действие." },
      { label: "Payez d’abord, on verra demain.", correct: false, feedback: "Ошибка кафе должна быть исправлена до оплаты." },
      { label: "Vous avez certainement oublié le troisième café.", correct: false, feedback: "Не стоит обвинять гостя без проверки." },
    ],
  },
  {
    id: "zoe-reservation", customer: { id: "zoe", name: "Зоэ", role: "издательница", color: "#8b617d", hair: "#211c22", accessory: "beret", line: "" },
    entrance: "Зоэ оглядывает зал, сверяется с часами и подходит уточнить бронь.", order: "J’ai réservé une table pour quatre au nom de Martin, près de la fenêtre.", meaning: "Бронь на четверых на имя Мартен, возле окна.", prompt: "Какие данные нужно повторить?",
    choices: [
      { label: "Une table pour quatre, au nom de Martin, près de la fenêtre.", correct: true, feedback: "Количество гостей, имя и пожелание по месту подтверждены." },
      { label: "Une table pour deux au nom de Martine, en terrasse.", correct: false, feedback: "Изменились и число, и имя, и место." },
      { label: "Quatre cafés à emporter.", correct: false, feedback: "Речь шла о брони стола, не о напитках." },
    ],
  },
  {
    id: "idris-frappe", customer: { id: "idris", name: "Идрис", role: "звукорежиссёр", color: "#3e7080", hair: "#15171b", accessory: "scarf", line: "" },
    entrance: "Идрис снимает наушники только с одного уха и отбивает пальцами ритм.", order: "Un café frappé sans sirop, avec très peu de glaçons et sans paille.", meaning: "Холодный кофе без сиропа, совсем немного льда и без трубочки.", prompt: "Как передать нестандартную подачу?",
    choices: [
      { label: "Sans sirop, peu de glaçons et sans paille.", correct: true, feedback: "Коротко и точно повторены все ограничения." },
      { label: "Beaucoup de glaçons, du sirop et deux pailles.", correct: false, feedback: "Это полная противоположность заказу." },
      { label: "Un café brûlant dans une grande tasse.", correct: false, feedback: "Frappé подаётся холодным." },
    ],
  },
  {
    id: "pauline-partager", customer: { id: "pauline", name: "Полин", role: "журналистка", color: "#b25a55", hair: "#523126", accessory: "glasses", line: "" },
    entrance: "Полин собирает у друзей банковские карты и подходит к кассе со счётом.", order: "On voudrait partager l’addition en trois parts égales, si c’est possible.", meaning: "Компания хочет разделить счёт на три равные части.", prompt: "Как подтвердить способ оплаты?",
    choices: [
      { label: "Bien sûr, je divise le total en trois montants égaux.", correct: true, feedback: "Именно: три одинаковые суммы." },
      { label: "Une seule personne doit tout payer.", correct: false, feedback: "Это не соответствует просьбе гостей." },
      { label: "Je divise le total en quatre.", correct: false, feedback: "Гости попросили три части, не четыре." },
    ],
  },
  {
    id: "ana-noisette-allergy", customer: { id: "ana", name: "Ана", role: "переводчица", color: "#6d679a", hair: "#402b25", accessory: "none", line: "" },
    entrance: "Ана здоровается сразу на трёх языках, но заказ делает медленно и очень чётко.", order: "Un espresso, et aucun fruit à coque : j’ai une allergie sévère aux noisettes.", meaning: "Эспрессо без контакта с орехами; сильная аллергия на фундук.", prompt: "Почему здесь нельзя путать noisette с названием напитка?",
    choices: [
      { label: "Je note l’allergie et j’utilise du matériel propre, sans contact avec les noisettes.", correct: true, feedback: "Правильно: noisettes здесь буквально фундук, и риск нужно отметить." },
      { label: "Je vous prépare justement un café noisette.", correct: false, feedback: "При сильной аллергии такая игра слов опасна." },
      { label: "Quelques amandes ne posent pas de problème.", correct: false, feedback: "Нельзя самостоятельно ослаблять ограничение клиента." },
    ],
  },
  {
    id: "omar-gobelet", customer: { id: "omar", name: "Омар", role: "инженер", color: "#497468", hair: "#28201e", accessory: "moustache", line: "" },
    entrance: "Омар достаёт многоразовую кружку и ставит её на стойку крышкой рядом.", order: "Un déca à emporter dans mon gobelet, avec un seul sucre roux.", meaning: "Декаф навынос в собственной кружке и один коричневый сахар.", prompt: "Как подтвердить тару и сахар?",
    choices: [
      { label: "Un déca dans votre gobelet, avec un sucre roux.", correct: true, feedback: "Верно: собственная кружка и ровно один коричневый сахар." },
      { label: "Un double dans un gobelet jetable, sans sucre.", correct: false, feedback: "Перепутаны кофе, тара и сахар." },
      { label: "Deux décas sur place.", correct: false, feedback: "Заказ один и навынос." },
    ],
  },
];

function shuffleItems<T>(items: readonly T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const locations: LocationDef[] = [
  {
    id: "home", label: "Мансарда", short: "Квартира · 11e", district: "11e arrondissement", x: "72%", y: "52%", art: "home", npc: "claire",
    description: "Крошечная квартира под крышей. Отсюда начинается каждый день.",
    actions: [
      { id: "unpack", label: "Распаковать коробки", detail: "+уют · +опора", icon: "▣", hours: 2, effects: { energy: -7, assimilation: 2, stability: 5 } },
      { id: "insurance", label: "Оформить страховку жилья", detail: "−45 € · +досье", icon: "⌂", hours: 1, effects: { money: -45, energy: -4, admin: 7, stability: 3 } },
      { id: "address", label: "Собрать подтверждение адреса", detail: "договор + страховка + счёт", icon: "▤", hours: 2, effects: { energy: -8, admin: 9, stability: 4 } },
    ],
  },
  {
    id: "sorbonne", label: "Сорбонна", short: "Сорбонна · 5e", district: "Quartier latin", x: "52%", y: "69%", art: "university", npc: "ines",
    description: "Аудитории, библиотека и слишком быстрый французский преподавателей.",
    actions: [
      { id: "class", label: "Пойти на занятие", detail: "+8 язык", icon: "📖", hours: 3, effects: { energy: -16, french: 8, assimilation: 3 }, repeatable: true },
      { id: "library", label: "Засесть в библиотеке", detail: "+5 язык · +досье", icon: "📝", hours: 2, effects: { energy: -10, french: 5, admin: 2 }, repeatable: true },
      { id: "exam", label: "Сдать модуль", detail: "+стабильность", icon: "✓", hours: 4, effects: { energy: -24, french: 6, stability: 9 } },
    ],
  },
  {
    id: "cafe", label: "Café des Amis", short: "Кафе · Canal", district: "Canal Saint-Martin", x: "61%", y: "32%", art: "cafe", npc: "malik",
    description: "Подработка, дешёвый эспрессо и разговоры, где никто не ждёт идеальной грамматики.",
    actions: [
      { id: "shift", label: "Выйти на смену", detail: "+68 € · −22 сил", icon: "☕", hours: 4, effects: { money: 68, energy: -22, french: 4, stability: 5 }, repeatable: true },
      { id: "espresso", label: "Выпить эспрессо", detail: "−4 € · +12 сил", icon: "◼", hours: 1, effects: { money: -4, energy: 12 }, repeatable: true },
      { id: "chat", label: "Болтать у стойки", detail: "+язык · +связи", icon: "💬", hours: 2, effects: { energy: -6, french: 4, assimilation: 7 }, repeatable: true },
    ],
  },
  {
    id: "prefecture", label: "Префектура полиции", short: "Префектура · 4e", district: "Île de la Cité", x: "48%", y: "54%", art: "office", npc: "bernard",
    description: "Записи, копии, переводы и главный ресурс иммигранта — терпение.",
    actions: [
      { id: "appointment", label: "Прийти по записи", detail: "+10 досье", icon: "🗂", hours: 3, effects: { energy: -14, admin: 10, stability: 3 } },
      { id: "copies", label: "Заверить копии", detail: "−24 € · +6 досье", icon: "▤", hours: 2, effects: { money: -24, energy: -7, admin: 6 } },
      { id: "taxes", label: "Проверить налоги", detail: "+досье · +опора", icon: "€", hours: 2, effects: { energy: -9, admin: 5, stability: 6 } },
    ],
  },
  {
    id: "louvre", label: "Лувр", short: "Лувр · 1er", district: "1er arrondissement", x: "39%", y: "46%", art: "louvre", npc: "luc",
    description: "Дворец, стеклянная пирамида и несколько тысяч лет культуры под одной крышей.",
    actions: [
      { id: "museum", label: "Исследовать зал", detail: "−17 € · +культура", icon: "◆", hours: 3, effects: { money: -17, energy: -9, french: 2, assimilation: 10 }, repeatable: true },
      { id: "sketch", label: "Делать заметки", detail: "+язык · +культура", icon: "✎", hours: 2, effects: { energy: -7, french: 5, assimilation: 5 }, repeatable: true },
    ],
  },
  {
    id: "eiffel", label: "Эйфелева башня", short: "Эйфелева башня · 7e", district: "Champ de Mars", x: "22%", y: "58%", art: "eiffel", npc: "thomas",
    description: "Железный ориентир новой жизни. Особенно красив, когда включается подсветка.",
    actions: [
      { id: "walk", label: "Гулять по набережной", detail: "+культура · +силы", icon: "🚶", hours: 3, effects: { energy: 4, assimilation: 7, stability: 3 }, repeatable: true },
      { id: "network", label: "Встреча сообщества", detail: "+язык · +опора", icon: "🤝", hours: 3, effects: { energy: -10, french: 4, assimilation: 5, stability: 7 }, repeatable: true },
    ],
  },
  {
    id: "montmartre", label: "Монмартр и Сакре-Кёр", short: "Монмартр · 18e", district: "18e arrondissement", x: "43%", y: "20%", art: "montmartre", npc: "yuki",
    description: "Лестницы, мастерские и белый купол Сакре-Кёр над крышами города.",
    actions: [
      { id: "pleinair", label: "Рисовать на площади", detail: "+22 € · +культура", icon: "🎨", hours: 3, effects: { money: 22, energy: -11, assimilation: 8, stability: 3 }, repeatable: true },
      { id: "picnic", label: "Пикник на ступенях", detail: "−14 € · +силы", icon: "🥖", hours: 2, effects: { money: -14, energy: 18, assimilation: 5 }, repeatable: true },
    ],
  },
  {
    id: "notredame", label: "Нотр-Дам де Пари", short: "Нотр-Дам · 4e", district: "Île de la Cité", x: "59%", y: "60%", art: "notredame", npc: "amina",
    description: "Готические башни, остров Сите и волонтёрский центр неподалёку.",
    actions: [
      { id: "volunteer", label: "Помочь волонтёрам", detail: "+10 культура", icon: "♡", hours: 4, effects: { energy: -18, french: 4, assimilation: 10, stability: 5 }, repeatable: true },
      { id: "history", label: "Историческая прогулка", detail: "+язык · +культура", icon: "⌛", hours: 3, effects: { money: -8, energy: -8, french: 3, assimilation: 7 }, repeatable: true },
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
  [
    { id: "friday-cafe", trigger: "visit", targetId: "cafe", locationId: "cafe", label: "Вернуться в Café des Amis", detail: "Пятничный бюджет начинается с поездки на смену" },
    { id: "friday-malik", trigger: "talk", targetId: "malik", locationId: "cafe", label: "Сверить смену с Маликом", detail: "Во вкладке «Люди» обсуди гостей и французские фразы" },
    { id: "friday-shift", trigger: "action", targetId: "shift", locationId: "cafe", label: "Отработать пятничную смену", detail: "Прими заказы гостей и заработай деньги на неделю" },
  ],
  [
    { id: "montmartre-arrive", trigger: "visit", targetId: "montmartre", locationId: "montmartre", label: "Подняться на Монмартр", detail: "Выбери Монмартр на карте и рассчитай время дороги" },
    { id: "meet-yuki", trigger: "talk", targetId: "yuki", locationId: "montmartre", label: "Найти Юки на площади", detail: "Во вкладке «Люди» спроси про нетуристические места" },
    { id: "weekend-pleinair", trigger: "action", targetId: "pleinair", locationId: "montmartre", label: "Порисовать на площади", detail: "Открой «Дела» → «Рисовать на площади»" },
  ],
  [
    { id: "notredame-arrive", trigger: "visit", targetId: "notredame", locationId: "notredame", label: "Добраться до острова Сите", detail: "На карте выбери Нотр-Дам де Пари" },
    { id: "meet-amina", trigger: "talk", targetId: "amina", locationId: "notredame", label: "Встретиться с Аминой", detail: "Во вкладке «Люди» узнай, кому сегодня нужна помощь" },
    { id: "sunday-volunteer", trigger: "action", targetId: "volunteer", locationId: "notredame", label: "Помочь волонтёрам", detail: "Открой «Дела» → «Помочь волонтёрам»" },
  ],
];

const weekSchedule: WeekdayDef[] = [
  {
    name: "Понедельник", short: "ПН", french: "lundi", focus: "Учёба и рабочий ритм",
    duties: [
      { id: "mon-action", label: "Учёба или рабочая смена", detail: "Закончить два полезных дела", metric: "actions", target: 2, dueHour: 19, locationId: "cafe" },
      { id: "mon-fr", label: "Французский в живой ситуации", detail: "Получить практику языка в деле или разговоре", metric: "french", target: 1, dueHour: 21 },
    ],
  },
  {
    name: "Вторник", short: "ВТ", french: "mardi", focus: "Контакты и язык",
    duties: [
      { id: "tue-talk", label: "Поддержать знакомство", detail: "Завершить один содержательный разговор", metric: "talks", target: 1, dueHour: 20 },
      { id: "tue-travel", label: "Не засиживаться дома", detail: "Съездить хотя бы в один другой район", metric: "travels", target: 1, dueHour: 21 },
    ],
  },
  {
    name: "Среда", short: "СР", french: "mercredi", focus: "Документы и досье",
    duties: [
      { id: "wed-admin", label: "Бюрократическое окно", detail: "Продвинуть документы или досье", metric: "admin", target: 1, dueHour: 17, locationId: "prefecture" },
      { id: "wed-route", label: "Сюжетный шаг", detail: "Закрыть один пункт маршрута дня", metric: "route", target: 1, dueHour: 21 },
    ],
  },
  {
    name: "Четверг", short: "ЧТ", french: "jeudi", focus: "Город и культура",
    duties: [
      { id: "thu-actions", label: "Два полезных дела", detail: "Не откладывать недельные задачи", metric: "actions", target: 2, dueHour: 21 },
      { id: "thu-culture", label: "Связь с Парижем", detail: "Получить культурный или интеграционный опыт", metric: "culture", target: 1, dueHour: 22, locationId: "louvre" },
    ],
  },
  {
    name: "Пятница", short: "ПТ", french: "vendredi", focus: "Бюджет и коллеги",
    duties: [
      { id: "fri-income", label: "Деньги на расходы", detail: "Заработать не меньше 40 €", metric: "earned", target: 40, dueHour: 20, locationId: "cafe" },
      { id: "fri-talk", label: "Не выпадать из круга", detail: "Поговорить с одним знакомым", metric: "talks", target: 1, dueHour: 22 },
    ],
  },
  {
    name: "Суббота", short: "СБ", french: "samedi", focus: "Исследование города",
    duties: [
      { id: "sat-culture", label: "Культурный выход", detail: "Музей, прогулка или городское событие", metric: "culture", target: 1, dueHour: 20, locationId: "montmartre" },
      { id: "sat-travel", label: "Исследовать Париж", detail: "Совершить две поездки по городу", metric: "travels", target: 2, dueHour: 22 },
    ],
  },
  {
    name: "Воскресенье", short: "ВС", french: "dimanche", focus: "Люди и подготовка",
    duties: [
      { id: "sun-route", label: "Закрыть маршрут дня", detail: "Выполнить все три сюжетных шага", metric: "route", target: 3, dueHour: 21 },
      { id: "sun-action", label: "Одно спокойное дело", detail: "Подготовиться к новой неделе", metric: "actions", target: 1, dueHour: 22, locationId: "home" },
    ],
  },
];

const parisDistricts: ParisDistrict[] = [
  { number: 1, name: "Louvre", x: "44%", y: "47%" },
  { number: 2, name: "Bourse", x: "48%", y: "40%" },
  { number: 3, name: "Temple", x: "54%", y: "41%" },
  { number: 4, name: "Hôtel-de-Ville", x: "55%", y: "50%" },
  { number: 5, name: "Panthéon", x: "52%", y: "62%" },
  { number: 6, name: "Luxembourg", x: "44%", y: "60%" },
  { number: 7, name: "Palais-Bourbon", x: "36%", y: "52%" },
  { number: 8, name: "Élysée", x: "36%", y: "41%" },
  { number: 9, name: "Opéra", x: "42%", y: "34%" },
  { number: 10, name: "Entrepôt", x: "51%", y: "32%" },
  { number: 11, name: "Popincourt", x: "64%", y: "47%" },
  { number: 12, name: "Reuilly", x: "73%", y: "59%" },
  { number: 13, name: "Gobelins", x: "59%", y: "70%" },
  { number: 14, name: "Observatoire", x: "44%", y: "72%" },
  { number: 15, name: "Vaugirard", x: "31%", y: "66%" },
  { number: 16, name: "Passy", x: "23%", y: "51%" },
  { number: 17, name: "Batignolles", x: "34%", y: "30%" },
  { number: 18, name: "Montmartre", x: "43%", y: "22%" },
  { number: 19, name: "Buttes-Chaumont", x: "59%", y: "27%" },
  { number: 20, name: "Ménilmontant", x: "70%", y: "40%" },
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

const dialogueTangents: Record<string, DialogueRound[]> = {
  claire: [
    { prompt: "Клэр придерживает дверь и вдруг улыбается. «А что ты обычно готовишь, когда хочешь почувствовать себя дома?»", choices: [{ label: "Блюдо из детства — запах сразу всё меняет.", response: "«Тогда однажды приготовишь его для нас. Я отвечу французским десертом, и никаких оценок». Клэр уже говорит не о вежливости, а о будущем вечере.", effects: { assimilation: 4, stability: 3 } }, { label: "Пока питаюсь тем, что помещается на одной конфорке.", response: "«Это честный парижский ответ. Я дам тебе маленькую кастрюлю — у меня две, а места всё равно нет». Она смеётся и записывает напоминание.", effects: { stability: 3, energy: 2 } }] },
    { prompt: "Разобравшись с трубами, Клэр не уходит. «Тебя этот дом уже раздражает или понемногу нравится?»", choices: [{ label: "Оба чувства одновременно.", response: "«Значит, всё идёт нормально. Дом становится своим не тогда, когда идеален, а когда знаешь его странности». Она кивает на упрямый радиатор.", effects: { stability: 4, assimilation: 2 } }, { label: "Мне всё ещё кажется, что я здесь временно.", response: "«Оставь одну вещь на виду, которую не положил бы в гостинице. Маленький жест, но мозг его понимает». Клэр говорит мягче обычного.", effects: { stability: 4 } }] },
    { prompt: "На лестнице становится тихо. «Если на собрании станет неловко, посмотри на меня. Но какую мысль ты точно хочешь сказать сам?»", choices: [{ label: "Что я хочу быть хорошим соседом, а не тихим гостем.", response: "«Вот с этого и начни. Акцент никому не помешает услышать такую мысль». Клэр репетирует с тобой первую фразу.", effects: { french: 3, assimilation: 4 } }, { label: "Что мне нужна помощь, пока я учу правила дома.", response: "«Просьба о помощи — тоже участие. Главное, добавь, чем готов помочь в ответ». Вместе вы формулируете это без извинений.", effects: { french: 3, stability: 3 } }] },
  ],
  malik: [
    { prompt: "Когда очередь исчезает, Малик ставит перед собой воду. «А какой кофе ты пил дома — до всех этих noisette и allongé?»", choices: [{ label: "Крепкий и без церемоний.", response: "«Значит, serré тебе понятнее, чем кажется». Малик делает две маленькие чашки и предлагает сравнить вкус, а не слова.", effects: { french: 3, energy: 2 } }, { label: "Я вообще пришёл сюда не ради кофе, а ради людей.", response: "«Лучший ответ для бариста». Он кивает в сторону столиков и по именам рассказывает, кто обычно сидит у окна.", effects: { assimilation: 4 } }] },
    { prompt: "Малик закрывает кассу и спрашивает уже без учебного тона: «Тебя пугает ошибиться перед гостем или задержать всю очередь?»", choices: [{ label: "Задержать людей — кажется, все сразу смотрят.", response: "«Они смотрят на кофе, не на твою биографию. Повтори заказ, вдохни и делай один шаг за раз». Он показывает свой ритм работы.", effects: { stability: 4, french: 2 } }, { label: "Ошибиться в слове и выглядеть глупо.", response: "«Я десять лет здесь и вчера перепутал два заказа. Профессионализм — исправить, а не никогда не ошибаться». Напряжение заметно отпускает.", effects: { stability: 5 } }] },
    { prompt: "После разговора о вечере историй Малик задерживает тебя. «Какую часть переезда ты пока никому здесь не рассказывал?»", choices: [{ label: "Как одиноко было в первый вечер.", response: "«Расскажи именно это, если захочешь. Кто-нибудь в зале узнает себя и перестанет думать, что один такой». Он не торопит тебя с обещанием.", effects: { assimilation: 5, stability: 2 } }, { label: "Как смешно я пытался понять первую квитанцию.", response: "«Идеально. Принеси её — сделаем из бюрократии комедию, раз уж победить её иначе нельзя». Вы оба смеётесь.", effects: { assimilation: 4, french: 2 } }] },
  ],
  ines: [
    { prompt: "Инес закрывает конспект. «За пределами учёбы тебе чего сейчас больше не хватает — привычных людей или привычной версии себя?»", choices: [{ label: "Людей, которым ничего не надо объяснять.", response: "«Понимаю. Со мной можешь иногда не объяснять. Просто скажи, что день тяжёлый». Впервые пауза между вами не кажется неловкой.", effects: { stability: 5, assimilation: 3 } }, { label: "Себя, который легко говорит и шутит.", response: "«Он никуда не делся. Просто сейчас у него словарь меньше характера». Инес обещает не исправлять тебя во время шуток.", effects: { french: 2, stability: 5 } }] },
    { prompt: "Собирая статьи, Инес замечает твой список дел. «Ты всегда так пытаешься заслужить отдых?»", choices: [{ label: "Если остановлюсь, кажется, что отстану.", response: "«Тогда впиши отдых как задачу, пока не научишься оставлять для него место без разрешения». Она вычёркивает один необязательный пункт.", effects: { energy: 4, stability: 4 } }, { label: "Список успокаивает меня.", response: "«Пусть успокаивает, только оставь одну пустую строку для неожиданного Парижа». Инес рисует рядом маленькую звезду.", effects: { stability: 4, assimilation: 2 } }] },
    { prompt: "Перед пикником Инес спрашивает: «Если станет слишком шумно, ты уйдёшь молча или скажешь мне?»", choices: [{ label: "Скажу. Но не хочу портить всем вечер.", response: "«Ты не портишь вечер, когда бережёшь себя. Мы можем пройтись вдоль воды и вернуться». План сразу становится легче.", effects: { stability: 5 } }, { label: "Попробую остаться до конца.", response: "«Не сдаём экзамен на общительность. Останься, пока тебе хорошо, — этого достаточно». Она убирает из приглашения слово obligatoire.", effects: { assimilation: 3, stability: 3 } }] },
  ],
  bernard: [
    { prompt: "Бернар складывает копии и неожиданно спрашивает: «Кто научил вас так внимательно хранить бумаги?»", choices: [{ label: "Париж. После первой потерянной справки.", response: "Уголок его рта поднимается. «Самый убедительный преподаватель. Но теперь вы уже опережаете систему на один шаг».", effects: { admin: 3, stability: 3 } }, { label: "Дома документы всегда лежали в одной папке.", response: "«Хорошая семейная привычка пережила границу. Добавьте только цифровую копию — на всякий случай». Голос становится почти дружелюбным.", effects: { admin: 4 } }] },
    { prompt: "Бернар возвращает паспорт. «Вы каждый раз входите сюда так, будто ожидаете плохих новостей. Это заметно». Что ответить?", choices: [{ label: "Потому что от этой папки зависит слишком многое.", response: "«Я знаю. Поэтому спрашивайте точный следующий шаг, а не пытайтесь угадать настроение человека в окне». Он записывает номер обращения крупнее обычного.", effects: { stability: 4, admin: 2 } }, { label: "Я пока не привык к официальному французскому.", response: "«Тогда просите повторить. Медленная точность лучше быстрого недоразумения». Он произносит ключевую фразу ещё раз.", effects: { french: 3, stability: 3 } }] },
    { prompt: "Когда формальности закончены, Бернар задерживает папку на секунду. «А что вы сделаете первым, когда этот этап закроется?»", choices: [{ label: "Куплю пирожное и ничего не буду заполнять весь вечер.", response: "«Прекрасный административный план». Бернар советует кондитерскую за углом и даже пишет название без штампа.", effects: { energy: 3, assimilation: 3 } }, { label: "Начну готовить следующую папку.", response: "«Нет. Хотя бы один вечер поживите как человек, а не как приложение к досье». В его сухом тоне слышится забота.", effects: { stability: 5 } }] },
  ],
  yuki: [
    { prompt: "Юки рассматривает твой набросок и спрашивает: «Что здесь получилось случайно, но тебе нравится?»", choices: [{ label: "Слишком длинная тень от прохожего.", response: "«Оставь её. Иногда ошибка честнее плана». Юки добавляет рядом короткую линию, и тень становится центром рисунка.", effects: { assimilation: 4, stability: 3 } }, { label: "Пустое место, которое я не успел заполнить.", response: "«Пустота тоже рассказывает. Не заставляй лист доказывать, что ты много работал». Она отодвигает карандаш.", effects: { stability: 4 } }] },
    { prompt: "Спускаясь по лестнице, Юки спрашивает: «Какой звук уже стал для тебя парижским?»", choices: [{ label: "Гул метро перед прибытием поезда.", response: "«Нарисуй его завтра без поезда — только ожидание и ветер». Задача звучит странно, но тебе уже хочется попробовать.", effects: { assimilation: 4 } }, { label: "Чашки и голоса из открытого кафе.", response: "«Тогда твой Париж живёт не в памятниках. Это хорошая новость». Она записывает место для следующего пленэра.", effects: { assimilation: 5, energy: 2 } }] },
    { prompt: "У входа в галерею Юки тихо спрашивает: «Если никто не остановится у твоей работы, она станет хуже?»", choices: [{ label: "Нет, но мне всё равно будет больно.", response: "«Это честно. Мы можем хотеть внимания и не отдавать ему право решать ценность работы». Она встаёт рядом с тобой у стены.", effects: { stability: 5, assimilation: 2 } }, { label: "Наверное, я сразу захочу её снять.", response: "«Подожди один вечер. Работа должна сначала побыть в мире без твоей защиты». Юки обещает не позволить снять её раньше.", effects: { stability: 4 } }] },
  ],
  luc: [
    { prompt: "Люк садится на каменный выступ. «Какой музей был первым в твоей жизни — помнишь не экспонат, а чувство?»", choices: [{ label: "Помню огромные залы и страх что-то пропустить.", response: "«Вот почему сегодня мы выбираем одну вещь. Любопытство не обязано превращаться в марафон». Люк складывает карту.", effects: { energy: 2, assimilation: 4 } }, { label: "Помню человека, который мне всё объяснял.", response: "«Тогда сохрани не факты, а его способ смотреть. Возможно, однажды ты так же покажешь музей другому». Он говорит это как о реальном плане.", effects: { assimilation: 5 } }] },
    { prompt: "Перед следующим портретом Люк спрашивает: «Ты чаще доверяешь первой реакции или боишься, что она недостаточно умная?»", choices: [{ label: "Боюсь сказать банальность.", response: "«Банальность, которую ты действительно увидел, полезнее умной фразы из каталога». Он просит назвать первую деталь без подготовки.", effects: { stability: 4, french: 2 } }, { label: "Доверяю, но потом люблю проверять.", response: "«Идеальный порядок: взгляд, гипотеза, контекст. Не наоборот». Люк явно доволен.", effects: { assimilation: 4, admin: 2 } }] },
    { prompt: "Школьники уходят, и Люк спрашивает: «Чей неожиданный ответ ты сегодня запомнил?»", choices: [{ label: "Девочки, которая увидела в портрете усталость.", response: "«Потому что она смотрела на человека, не на эпоху. Запиши это — пригодится в следующей экскурсии». Вы ещё минуту обсуждаете её наблюдение.", effects: { assimilation: 5, french: 2 } }, { label: "Мальчика, который спросил про цену картины.", response: "«Очень музейный вопрос, хотя взрослые его стесняются. Деньги тоже часть истории искусства». Люк предлагает тему для новой прогулки.", effects: { french: 3, assimilation: 3 } }] },
  ],
  amina: [
    { prompt: "Амина завязывает последнюю коробку. «Когда тебе самому помогали, что оказалось важнее вещей?»", choices: [{ label: "Что человек не спешил уйти.", response: "«Да. Иногда десять спокойных минут ценнее ещё одного пакета». Она оставляет время в расписании следующей встречи.", effects: { assimilation: 5, stability: 2 } }, { label: "Что мне объяснили, чего ждать завтра.", response: "«Предсказуемость возвращает опору. Добавим в каждый набор короткий лист со следующими шагами». Твоя мысль становится частью работы центра.", effects: { admin: 3, assimilation: 4 } }] },
    { prompt: "После встречи семьи Амина спрашивает: «Ты узнал в них себя. Это помогло или сделало тяжелее?»", choices: [{ label: "Помогло подобрать слова.", response: "«Твой опыт стал инструментом, но не обязан становиться раной каждый раз». Она предлагает выпить воды и выдохнуть.", effects: { stability: 4, assimilation: 4 } }, { label: "Сделало тяжелее, чем я ожидал.", response: "«Спасибо, что сказал. Сегодня достаточно. Забота о других не требует исчезнуть самому». Амина снимает с тебя следующую задачу.", effects: { energy: 4, stability: 5 } }] },
    { prompt: "Закрывая центр, Амина спрашивает: «Если акция получится маленькой — десять человек вместо ста — это провал?»", choices: [{ label: "Нет, если этим десяти было хорошо.", response: "«Тогда у проекта уже есть правильный масштаб: человеческий». Она предлагает начать со двора, а не со всего района.", effects: { assimilation: 5, stability: 3 } }, { label: "Я всё равно буду переживать из-за цифр.", response: "«Переживай, но заранее выбери ещё один критерий: разговоры, обмены, новые знакомства». Вместе вы меняете план оценки.", effects: { admin: 3, stability: 3 } }] },
  ],
  thomas: [
    { prompt: "Тома откладывает ручку. «А если убрать интервью: какую работу ты сам считаешь достойной своего времени?»", choices: [{ label: "Где мой результат виден и кому-то полезен.", response: "«Вот это уже критерий выбора, а не фраза для рекрутера». Он обводит два подходящих пункта в твоём опыте.", effects: { stability: 5 } }, { label: "Сейчас любую, которая даст опору.", response: "«Это нормальный этап. Просто договорись с собой, когда снова поднимешь планку». Вы ставите конкретную дату пересмотра.", effects: { admin: 2, stability: 4 } }] },
    { prompt: "Тома смотрит на старую версию CV. «Какой опыт тебе труднее всего объяснять — потому что здесь его недооценивают?»", choices: [{ label: "Работу в маленькой компании без громкого названия.", response: "«Тогда покажем широту ответственности. Маленькая команда часто означает больше решений, а не меньше опыта». Он просит три конкретных примера.", effects: { french: 3, stability: 4 } }, { label: "Период, когда я начинал всё заново.", response: "«Не прячь его. Назови, чему научился и как быстро вернулся к результату». Пауза в резюме превращается в связный эпизод.", effects: { stability: 5, assimilation: 2 } }] },
    { prompt: "Тома закрывает ноутбук. «Через три года кто будет рядом с тобой после рабочего дня? Карьерный план об этом обычно молчит». Что ответить?", choices: [{ label: "Люди, с которыми не надо играть роль успешного эмигранта.", response: "«Хороший ориентир. Не строй план, в котором есть должность, но нет места для близости». Он добавляет в заметки слово équilibre.", effects: { assimilation: 4, stability: 4 } }, { label: "Пока не знаю, но хочу оставить для них место.", response: "«Это уже ответ. Календарь тоже показывает ценности — не только резюме». Вы убираете один лишний вечерний курс.", effects: { energy: 3, stability: 4 } }] },
  ],
};

function getDialogueClosingRound(npcId: string): DialogueRound {
  const closings: Record<string, DialogueRound> = {
    claire: { prompt: "У своей двери Клэр оборачивается. «Если что-то случится — постучишь, а не будешь один читать форумы до трёх ночи?»", choices: [{ label: "Постучу. И чай с меня.", response: "«Договорились. Тогда я считаю, что у меня появился настоящий сосед». Она машет рукой и спускается этажом ниже.", effects: { assimilation: 4, stability: 3 } }, { label: "Сначала попробую сам, но буду знать, что можно прийти.", response: "«Этого достаточно. Самостоятельность лучше работает, когда рядом есть дверь, в которую можно постучать». Клэр улыбается на прощание.", effects: { stability: 4 } }] },
    malik: { prompt: "Малик уже берётся за следующую чашку. «Останешься на минуту у стойки или побежишь дальше покорять Париж?»", choices: [{ label: "Останусь. Хочу дослушать историю про постоянного гостя.", response: "«Тогда без учебника — просто слушай». Разговор ещё немного петляет между кофе, районом и смешными ошибками.", effects: { french: 2, assimilation: 4 } }, { label: "Пора идти, но завтра поздороваюсь первым.", response: "«Вот это хорошее домашнее задание». Малик поднимает чашку вместо рукопожатия.", effects: { french: 2, stability: 3 } }] },
    ines: { prompt: "Инес убирает телефон. «Напишешь мне вечером не отчёт о делах, а одну вещь, которая сегодня была хорошей?»", choices: [{ label: "Напишу. Даже если это будет просто хороший круассан.", response: "«Особенно если круассан». Вы расходитесь, договорившись не превращать каждую встречу в продуктивность.", effects: { energy: 3, stability: 4 } }, { label: "Попробую заметить такую вещь.", response: "«Этого уже достаточно. Внимание — тоже навык». Инес уходит на следующую пару.", effects: { assimilation: 3, stability: 3 } }] },
    bernard: { prompt: "Бернар придвигает папку к тебе. «Остались вопросы — настоящие, не те, которые, как вам кажется, положено задавать?»", choices: [{ label: "Сегодня нет. Теперь я понимаю следующий шаг.", response: "«Тогда на сегодня хватит». Он впервые завершает встречу без новой стопки требований.", effects: { admin: 3, stability: 4 } }, { label: "Один: можно я запишу вашу формулировку дословно?", response: "«Разумеется. Точная запись экономит нам обоим следующий разговор». Он диктует медленно и ждёт, пока ты поставишь точку.", effects: { french: 2, admin: 4 } }] },
    yuki: { prompt: "Юки прячет карандаши. «В следующий раз принесёшь рисунок, который сделал без меня?»", choices: [{ label: "Принесу, даже если он будет неловким.", response: "«Неловкие рисунки обычно самые живые». Она оставляет тебе короткий карандаш как обещание следующей встречи.", effects: { stability: 4, assimilation: 3 } }, { label: "Сначала сделаю несколько и выберу один.", response: "«Хорошо. Но покажи мне и тот, который почти выбросил». Юки слишком хорошо знает эту привычку.", effects: { assimilation: 4 } }] },
    luc: { prompt: "У выхода Люк спрашивает: «Что ты унесёшь сегодня — одну дату или один вопрос?»", choices: [{ label: "Вопрос. Он дольше останется со мной.", response: "«Тогда музей сделал свою работу». Люк не отвечает за тебя и указывает на следующий зал.", effects: { assimilation: 4, stability: 2 } }, { label: "Одну деталь, которую теперь вижу иначе.", response: "«Ещё лучше. В следующий раз проверим, изменилась ли она снова». Он прощается как с будущим коллегой.", effects: { french: 2, assimilation: 4 } }] },
    amina: { prompt: "Амина выключает свет на складе. «Ты вернёшься потому, что надо, или потому, что здесь уже есть знакомые лица?»", choices: [{ label: "Из-за лиц. Задачи без людей сюда бы не вернули.", response: "«Значит, центр работает правильно». Она обнимает тебя на прощание и зовёт по имени следующего волонтёра.", effects: { assimilation: 5, stability: 2 } }, { label: "Пока из чувства долга, но лица уже запоминаю.", response: "«Честно. Иногда принадлежность приходит после нескольких повторений». Она оставляет твоё имя в расписании без давления.", effects: { stability: 4, assimilation: 3 } }] },
    thomas: { prompt: "Тома убирает блокнот. «После разговора тебе хочется действовать или сначала выдохнуть?»", choices: [{ label: "Сделаю один конкретный шаг сегодня.", response: "«Один — правильное число. Отправь мне его результат, а не список из десяти обещаний». Он пожимает руку без формальности.", effects: { stability: 4, admin: 2 } }, { label: "Сначала выдохну, чтобы не делать из тревоги.", response: "«Зрелое решение. Хорошая карьера строится не только рывками». Тома ставит встречу на следующую неделю, не на завтра.", effects: { energy: 4, stability: 4 } }] },
  };
  return closings[npcId];
}

function getNpcDialogues(npcId: string) {
  return [dialogues[npcId], ...(moreDialogues[npcId] ?? [])];
}

function getDialogueMission(npcId: string, dialogueIndex: number) {
  const missions = dialogueMissions[npcId];
  return missions[dialogueIndex % missions.length];
}

function getDialogueRounds(npcId: string, dialogueIndex: number) {
  const dialogue = getNpcDialogues(npcId)[dialogueIndex % getNpcDialogues(npcId).length];
  const index = dialogueIndex % dialogueFollowUps[npcId].length;
  return [{ prompt: dialogue.greeting, choices: dialogue.choices }, ...dialogueFollowUps[npcId][index], dialogueTangents[npcId][index], getDialogueClosingRound(npcId)];
}

function getRelationshipTitle(value: number) {
  if (value >= 80) return "близкий человек";
  if (value >= 55) return "доверяет тебе";
  if (value >= 30) return "хороший знакомый";
  if (value >= 10) return "узнаёт тебя";
  return "новое знакомство";
}

const cityEvents: CityEvent[] = [
  { id: "canal-market", kicker: "УТРЕННЕЕ СОБЫТИЕ", title: "Рынок у канала", body: "Соседи продают книги, пластинки и домашнюю выпечку. Малик ищет помощника до обеденного наплыва.", locationId: "cafe", period: "morning", startHour: 8, endHour: 12.5, hours: 2, effects: { money: 28, energy: -7, french: 3, assimilation: 6 } },
  { id: "night-museum", kicker: "ВЕЧЕРНЕЕ СОБЫТИЕ", title: "Вечер в Лувре", body: "Музей работает допоздна, а Люк проводит камерную экскурсию для местных жителей.", locationId: "louvre", period: "evening", startHour: 18.5, endHour: 23, hours: 3, effects: { money: -9, energy: -8, french: 4, assimilation: 9 } },
  { id: "street-music", kicker: "ВЕЧЕРНЕЕ СОБЫТИЕ", title: "Музыка на Монмартре", body: "После заката на площади начинается импровизированный концерт. Можно помочь музыкантам и остаться на выступление.", locationId: "montmartre", period: "evening", startHour: 19, endHour: 23.5, hours: 3, effects: { energy: -6, french: 3, assimilation: 10 } },
  { id: "seine-cleanup", kicker: "УТРЕННЕЕ СОБЫТИЕ", title: "Волонтёры у Сены", body: "Амина зовёт на уборку набережной, пока улицы прохладные, и на общий пикник после работы.", locationId: "notredame", period: "morning", startHour: 9, endHour: 14, hours: 3, effects: { energy: -12, french: 3, assimilation: 8, stability: 5 } },
  { id: "career-meetup", kicker: "ДНЕВНОЕ СОБЫТИЕ", title: "Встреча молодых специалистов", body: "После обеда Тома ведёт открытую встречу о французском CV и первых собеседованиях.", locationId: "eiffel", period: "day", startHour: 14, endHour: 18, hours: 2, effects: { money: -6, energy: -5, french: 4, stability: 9 } },
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

function mergeEffectDeltas(...effects: Partial<Stats>[]) {
  const result: Partial<Stats> = {};
  effects.forEach((effect) => {
    (Object.keys(effect) as StatKey[]).forEach((key) => {
      result[key] = (result[key] ?? 0) + (effect[key] ?? 0);
    });
  });
  return result;
}

function formatTime(time: number) {
  const totalMinutes = Math.round(time * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getEventPeriodLabel(period: CityEvent["period"]) {
  if (period === "morning") return "УТРО";
  if (period === "evening") return "ВЕЧЕР";
  return "ДЕНЬ";
}

function formatEventWindow(event: CityEvent) {
  return `${formatTime(event.startHour)}–${formatTime(event.endHour)}`;
}

function DialogueLineText({ text, source = text }: { text: string; source?: string }) {
  if (!source.includes("«")) return <span className="dialogue-spoken-text">{text}</span>;
  const parts = text.split(/(«|»)/);
  return (
    <span className="dialogue-rich-line">
      {parts.map((part, index) => {
        if (!part) return null;
        const previousParts = parts.slice(0, index);
        const insideSpeech = previousParts.lastIndexOf("«") > previousParts.lastIndexOf("»");
        if (part === "«" || part === "»") return <span className="dialogue-spoken-text" key={`${index}-quote`}>{part}</span>;
        return <span className={insideSpeech ? "dialogue-spoken-text" : "dialogue-narration-text"} key={index}>{part}</span>;
      })}
    </span>
  );
}

function PixelPortrait({ npc, small = false, unknown = false }: { npc: Npc; small?: boolean; unknown?: boolean }) {
  const preset = portraitPresets[npc.id] ?? { skin: "#dca47d", shadow: "#ad6b55", accent: "#e3bd68", hairStyle: "crop", face: "round" };
  return (
    <div className={`pixel-portrait portrait-npc-${npc.id} portrait-hair-${preset.hairStyle} portrait-face-${preset.face} ${small ? "is-small" : ""} ${unknown ? "is-unknown" : ""}`} style={{ "--shirt": npc.color, "--hair": npc.hair, "--skin": preset.skin, "--skin-shadow": preset.shadow, "--portrait-accent": preset.accent } as React.CSSProperties} aria-hidden="true">
      <div className="portrait-hair portrait-hair-back"><i /></div>
      <i className="portrait-ear left" /><i className="portrait-ear right" />
      <div className="portrait-face">
        <i className="portrait-brow left" /><i className="portrait-brow right" /><i className="eye left" /><i className="eye right" /><i className="portrait-nose" /><i className="portrait-mouth" /><i className="portrait-cheek left" /><i className="portrait-cheek right" />
        {npc.accessory === "glasses" && <i className="glasses" />}
        {npc.accessory === "moustache" && <i className="moustache" />}
      </div>
      <div className="portrait-hair-front"><i /></div>
      {npc.accessory === "beret" && <div className="beret" />}
      <div className="portrait-neck" /><div className="portrait-body"><i className="portrait-collar left" /><i className="portrait-collar right" /><i className="portrait-lapel left" /><i className="portrait-lapel right" /><i className="portrait-button one" /><i className="portrait-button two" /></div>
      {npc.accessory === "scarf" && <i className="scarf" />}
    </div>
  );
}

function AmbientPerson({ person, look, index }: { person: AmbientPersonDef; look: (typeof ambientLooks)[number]; index: number }) {
  return (
    <div className={`scene-extra extra-${index + 1} pose-${person.pose} prop-${person.prop}`} style={{ "--extra-skin": look.skin, "--extra-shadow": look.shadow, "--extra-hair": look.hair, "--extra-coat": look.coat, "--extra-accent": look.accent, "--extra-scale": person.scale ?? 1, zIndex: person.depth ?? 6 } as React.CSSProperties} aria-hidden="true">
      <i className="extra-ground-shadow" />
      <div className="extra-figure">
        <i className="extra-leg left" /><i className="extra-leg right" />
        <i className="extra-body"><b className="extra-lapel left" /><b className="extra-lapel right" /></i>
        <i className="extra-arm left" /><i className="extra-arm right" />
        <i className="extra-neck" />
        <i className="extra-head"><b className="extra-hair" /><b className="extra-eye left" /><b className="extra-eye right" /><b className="extra-nose" /></i>
        {person.prop !== "none" && <i className="extra-prop" />}
      </div>
    </div>
  );
}

function EventArtwork({ eventId, period }: { eventId: string; period: CityEvent["period"] }) {
  return (
    <div className={`event-art event-art-${eventId} event-art-period-${period}`} aria-hidden="true">
      <div className="event-art-sky"><i /><i /></div>
      <div className="event-art-landmark"><i className="art-a" /><i className="art-b" /><i className="art-c" /><i className="art-d" /></div>
      <div className="event-art-people"><i /><i /><i /><i /></div>
      <div className="event-art-detail"><i /><i /><i /></div>
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

  const clampZoom = (value: number) => Math.max(1, Math.min(4, Math.round(value * 10) / 10));
  const clampPan = (value: { x: number; y: number }, viewZoom = zoom) => ({
    x: Math.min(0, Math.max(mapWidth * (1 - viewZoom), value.x)),
    y: Math.min(0, Math.max(mapHeight * (1 - viewZoom), value.y)),
  });
  const changeZoom = (delta: number) => {
    const nextZoom = clampZoom(zoom + delta);
    const centerX = (mapWidth / 2 - pan.x) / zoom;
    const centerY = (mapHeight / 2 - pan.y) / zoom;
    setZoom(nextZoom);
    setPan(clampPan({ x: mapWidth / 2 - centerX * nextZoom, y: mapHeight / 2 - centerY * nextZoom }, nextZoom));
  };
  const showOverview = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const focusCurrentStation = () => {
    const station = metroSchematic.stations.find((item) => item.key === currentStationKey);
    if (!station) return;
    const nextZoom = 2.3;
    setZoom(nextZoom);
    setPan(clampPan({ x: mapWidth / 2 - station.x * nextZoom, y: mapHeight / 2 - station.y * nextZoom }, nextZoom));
    setSelectedStationKey(station.key);
  };
  const focusRoute = () => {
    const points = metroSchematic.stations.filter((station) => routeStations.has(station.key));
    if (!points.length) { showOverview(); return; }
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const nextZoom = clampZoom(Math.max(1.35, Math.min(mapWidth / Math.max(260, maxX - minX + 260), mapHeight / Math.max(220, maxY - minY + 220), 2.8)));
    setZoom(nextZoom);
    setPan(clampPan({ x: mapWidth / 2 - ((minX + maxX) / 2) * nextZoom, y: mapHeight / 2 - ((minY + maxY) / 2) * nextZoom }, nextZoom));
  };
  const moveMap = (x: number, y: number) => {
    const nudge = Math.max(90, 170 / zoom);
    setPan((value) => clampPan({ x: value.x + x * nudge, y: value.y + y * nudge }));
  };
  const handleMapKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key.toLowerCase();
    if (["+", "=", "-", "arrowup", "arrowdown", "arrowleft", "arrowright", "home", "0", "r", "c"].includes(key)) event.preventDefault();
    if (key === "+" || key === "=") changeZoom(.35);
    else if (key === "-") changeZoom(-.35);
    else if (key === "arrowup") moveMap(0, 1);
    else if (key === "arrowdown") moveMap(0, -1);
    else if (key === "arrowleft") moveMap(1, 0);
    else if (key === "arrowright") moveMap(-1, 0);
    else if (key === "home" || key === "0") showOverview();
    else if (key === "r") focusRoute();
    else if (key === "c") focusCurrentStation();
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const mapUnitsPerPixel = Math.max(mapWidth / Math.max(1, rect.width), mapHeight / Math.max(1, rect.height));
    setPan(clampPan({ x: drag.panX + (event.clientX - drag.x) * mapUnitsPerPixel, y: drag.panY + (event.clientY - drag.y) * mapUnitsPerPixel }));
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className={`official-metro-map ${zoom >= 1.6 ? "is-zoomed" : ""}`} aria-label="Интерактивная схема метро Парижа">
      <div className="metro-map-toolbar">
        <div><b>MÉTRO PARIS</b><span>Реальная схема · 311 станций</span></div>
        <div className="metro-toolbar-note"><b>МАРШРУТ ПОДСВЕЧЕН</b><span>Выберите станцию или используйте панель на карте</span></div>
      </div>
      <div
        ref={viewportRef}
        className="metro-map-viewport"
        tabIndex={0}
        role="region"
        aria-label="Схема метро. Перетаскивайте карту, используйте плюс и минус или клавиши со стрелками."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => changeZoom(.5)}
        onWheel={(event) => { event.preventDefault(); changeZoom(event.deltaY < 0 ? .25 : -.25); }}
        onKeyDown={handleMapKeyDown}
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
                return <g key={station.key} className={`official-station ${interchange ? "interchange" : ""} ${onRoute ? "on-route" : ""} ${current ? "current" : ""} ${selectedStationKey === station.key ? "selected" : ""}`} transform={`translate(${station.x} ${station.y})`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setSelectedStationKey(station.key)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedStationKey(station.key); } }} role="button" tabIndex={0} aria-label={`${station.name}, линии ${station.lines.join(", ")}`}>
                  {interchange && <circle className="station-ring" r={7} />}
                  <circle className="station-dot" r={current ? 7 : onRoute ? 5.5 : 3.2} />
                  {showLabel && <text x={8} y={-7}>{station.name}</text>}
                </g>;
              })}
            </g>
          </g>
        </svg>
        <div className="metro-map-floating-controls" aria-label="Управление картой" onPointerDown={(event) => event.stopPropagation()}>
          <div className="metro-map-zoom-row"><button type="button" onClick={() => changeZoom(-.35)} disabled={zoom <= 1} aria-label="Уменьшить масштаб">−</button><output aria-live="polite" aria-label="Текущий масштаб">{Math.round(zoom * 100)}%</output><button type="button" onClick={() => changeZoom(.35)} disabled={zoom >= 4} aria-label="Увеличить масштаб">+</button></div>
          <div className="metro-map-pan-pad" aria-label="Перемещение карты"><button type="button" className="pan-up" onClick={() => moveMap(0, 1)} disabled={zoom <= 1} aria-label="Показать область выше">↑</button><button type="button" className="pan-left" onClick={() => moveMap(1, 0)} disabled={zoom <= 1} aria-label="Показать область слева">←</button><button type="button" className="pan-center" onClick={focusCurrentStation} aria-label="Вернуться к текущей станции">●</button><button type="button" className="pan-right" onClick={() => moveMap(-1, 0)} disabled={zoom <= 1} aria-label="Показать область справа">→</button><button type="button" className="pan-down" onClick={() => moveMap(0, -1)} disabled={zoom <= 1} aria-label="Показать область ниже">↓</button></div>
          <div className="metro-map-view-actions"><button type="button" onClick={focusRoute}>Весь маршрут</button><button type="button" onClick={showOverview}>Вся схема</button></div>
        </div>
        <div className="metro-map-help"><span>Зажмите и двигайте</span><span>Клавиши: + − · стрелки · R маршрут</span></div>
        {selectedStation && <div className="metro-station-inspector" aria-live="polite"><small>СТАНЦИЯ</small><strong>{selectedStation.name}</strong><div>{selectedStation.lines.map((lineId) => { const line = metroSchematic.lines.find((item) => item.id === lineId); return <i key={lineId} style={{ background: line?.color }}>{lineId}</i>; })}</div></div>}
      </div>
      <div className="metro-route-summary"><div><i className="map-current-dot" /><span>Вы здесь</span><strong>{currentLeg.from}</strong></div><div><i className="map-route-dot" /><span>Цель</span><strong>{trip.destination.label}</strong></div><p>Линии маршрута подсвечены. Нажмите на станцию, чтобы увидеть пересадки.</p></div>
      <div className="metro-data-credit">Данные: Île-de-France Mobilités Open Data · Licence Ouverte 2.0</div>
    </div>
  );
}

function LocationBackdrop({ location, sky }: { location: LocationDef; sky: string }) {
  const population = scenePopulation[location.id] ?? [];
  const lookOffset = Math.max(0, locations.findIndex((item) => item.id === location.id)) * 2;
  return (
    <div className={`world-scene scene-${location.id} scene-time-${sky}`}>
      <div className="scene-image-layer" aria-hidden="true" />
      <div className="world-sky"><i className="world-sun" /><i className="world-cloud cloud-a" /><i className="world-cloud cloud-b" /></div>
      <div className="world-building">
        <span className="set-piece set-one" /><span className="set-piece set-two" /><span className="set-piece set-three" /><span className="set-piece set-four" />
      </div>
      <div className="scene-landmark"><LandmarkArt type={location.art} /></div>
      <div className="scene-furniture">
        <span className="furniture table-one" /><span className="furniture table-two" /><span className="furniture bench" /><span className="furniture counter" />
      </div>
      <div className="scene-details"><i className="detail-one" /><i className="detail-two" /><i className="detail-three" /><i className="detail-four" /><i className="detail-five" /><i className="detail-six" /></div>
      <div className="scene-population">{population.map((person, index) => <AmbientPerson key={`${location.id}-${index}-${person.prop}`} person={person} look={ambientLooks[(lookOffset + index) % ambientLooks.length]} index={index} />)}</div>
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

const activitySceneScripts: Record<string, { shot: string; copy: [string, string, string, string] }> = {
  unpack: { shot: "МАНСАРДА · КОРОБКИ", copy: ["Снимаем ленту с первой коробки…", "Книги отправляются на полку…", "Лампа и фотографии находят своё место…", "Мансарда стала немного своей"] },
  insurance: { shot: "МАНСАРДА · ОНЛАЙН-ФОРМА", copy: ["Сравниваем условия страховки…", "Вводим данные договора аренды…", "Подписываем форму и оплачиваем полис…", "Attestation d’assurance получена"] },
  address: { shot: "МАНСАРДА · ДОСЬЕ", copy: ["Сверяем имя в договоре аренды…", "Прикладываем страховку жилья…", "Добавляем свежий счёт с адресом…", "Пакет подтверждения адреса готов"] },
  class: { shot: "СОРБОННА · АУДИТОРИЯ", copy: ["Преподаватель начинает лекцию…", "Ловим знакомые слова в быстром французском…", "Обсуждаем пример с соседом по парте…", "Конспект заполнен, занятие окончено"] },
  library: { shot: "СОРБОННА · БИБЛИОТЕКА", copy: ["Находим нужный раздел каталога…", "Собираем источники и словарь…", "Перепроверяем даты и формулировки…", "Заметки разложены по темам"] },
  exam: { shot: "СОРБОННА · ЭКЗАМЕН", copy: ["Получаем билет и читаем вопросы…", "Пишем аргументы по-французски…", "Проверяем ответы перед сдачей…", "Модуль сдан преподавателю"] },
  shift: { shot: "CAFÉ · ВЕЧЕРНЯЯ СМЕНА", copy: ["Малик открывает кассу, а ты ставишь чашки…", "Первый заказ: deux cafés allongés…", "Очередь растёт, столики заполняются…", "Последняя чашка вымыта, смена закрыта"] },
  espresso: { shot: "CAFÉ · ПЯТЬ МИНУТ ТИШИНЫ", copy: ["Мелем зёрна для двойного эспрессо…", "Кофе медленно наполняет чашку…", "За окном проходит шумный автобус…", "Чашка пуста, силы вернулись"] },
  chat: { shot: "CAFÉ · У СТОЙКИ", copy: ["Разговор начинается с погоды…", "Малик поправляет одно слово — без насмешки…", "К теме подключается постоянная гостья…", "Новая фраза остаётся в памяти"] },
  appointment: { shot: "ПРЕФЕКТУРА · ОКНО 14", copy: ["Берём талон и следим за табло…", "Передаём папку сотруднику…", "Отвечаем на уточняющие вопросы…", "В досье появилась новая отметка"] },
  copies: { shot: "ПРЕФЕКТУРА · КОПИ-ЦЕНТР", copy: ["Сортируем оригиналы и переводы…", "Аппарат сканирует страницу за страницей…", "Проверяем печати и читаемость…", "Заверенные копии убраны в папку"] },
  taxes: { shot: "ПРЕФЕКТУРА · НАЛОГОВОЕ ОКНО", copy: ["Открываем налоговый кабинет…", "Сверяем доходы, адрес и номер fiscal…", "Исправляем найденное расхождение…", "Налоговая история подтверждена"] },
  museum: { shot: "ЛУВР · ТИХИЙ ЗАЛ", copy: ["Оставляем маршрут туристических групп…", "Выбираем одну работу и остаёмся рядом…", "Замечаем детали, которые сначала ускользнули…", "Зал запомнился как личное открытие"] },
  sketch: { shot: "ЛУВР · АЛЬБОМ", copy: ["Намечаем композицию несколькими линиями…", "Подписываем цвета по-французски…", "Добавляем заметку об истории работы…", "Страница альбома закончена"] },
  walk: { shot: "НАБЕРЕЖНАЯ · ПРОГУЛКА", copy: ["Спускаемся к Сене…", "Проходим мимо букинистов и велосипедистов…", "Башня появляется между домами…", "Маршрут закончился у воды"] },
  network: { shot: "CHAMP DE MARS · ВСТРЕЧА", copy: ["Участники собираются небольшими группами…", "Ты представляешься без заученной речи…", "Разговор переходит к работе и планам…", "В телефоне появилось новое знакомство"] },
  pleinair: { shot: "МОНМАРТР · ПЛЕНЭР", copy: ["Ставим мольберт у края площади…", "Намечаем крыши и купол Сакре-Кёр…", "Прохожий останавливается посмотреть…", "Последний мазок подсыхает на ветру"] },
  picnic: { shot: "МОНМАРТР · СТУПЕНИ", copy: ["Находим свободное место с видом на город…", "Делим багет и сыр…", "Музыкант начинает знакомую мелодию…", "Плед сложен, закат остаётся в памяти"] },
  volunteer: { shot: "ОСТРОВ СИТЕ · ВОЛОНТЁРСКИЙ ЦЕНТР", copy: ["Амина знакомит тебя с командой…", "Сортируем коробки по адресам…", "Передаём пакеты людям у входа…", "Последняя коробка доставлена"] },
  history: { shot: "НОТР-ДАМ · МАРШРУТ", copy: ["Гид разворачивает старую карту острова…", "Сравниваем фасад с архивной фотографией…", "Записываем названия архитектурных деталей…", "Прогулка заканчивается у набережной"] },
};

function getActivityScene(actionId: string, progress: number) {
  const scene = activitySceneScripts[actionId] ?? { shot: "ПАРИЖ · ДЕЛО", copy: ["Начинаем…", "Продолжаем…", "Проверяем результат…", "Готово"] as [string, string, string, string] };
  const index = progress < 38 ? 0 : progress < 72 ? 1 : progress < 92 ? 2 : 3;
  return { shot: scene.shot, status: scene.copy[index] };
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
  const [dialogueTurnPhase, setDialogueTurnPhase] = useState<"prompt" | "response">("prompt");
  const [dialogueVisibleText, setDialogueVisibleText] = useState("");
  const [dialogueTextComplete, setDialogueTextComplete] = useState(false);
  const [dialogueTranscript, setDialogueTranscript] = useState<DialogueLine[]>([]);
  const [dialoguePendingEffects, setDialoguePendingEffects] = useState<Partial<Stats>>({});
  const [dialoguePendingRelationship, setDialoguePendingRelationship] = useState(0);
  const [dialogueElapsedMinutes, setDialogueElapsedMinutes] = useState(0);
  const dialogueTypingSkipRef = useRef(false);
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
  const [activeCafeShift, setActiveCafeShift] = useState<ActiveCafeShift | null>(null);
  const [cafeShiftFeedback, setCafeShiftFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [showCafeShiftLeaveConfirm, setShowCafeShiftLeaveConfirm] = useState(false);
  const cafeShiftLeaveButtonRef = useRef<HTMLButtonElement>(null);
  const cafeShiftLeaveDialogRef = useRef<HTMLElement>(null);
  const restoreCafeShiftLeaveFocusRef = useRef(false);
  const cafeShiftWasActiveRef = useRef(false);
  const [recentCafeOrderIds, setRecentCafeOrderIds] = useState<string[]>([]);
  const [closingWindow, setClosingWindow] = useState(false);
  const [showEventReveal, setShowEventReveal] = useState(false);
  const [completedDailyTaskIds, setCompletedDailyTaskIds] = useState<string[]>([]);
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);
  const [chapterProgressPoints, setChapterProgressPoints] = useState(0);
  const [dayTransitionPhase, setDayTransitionPhase] = useState<"sunset" | "night" | "dawn" | null>(null);
  const [dayTransitionText, setDayTransitionText] = useState("");

  const selectedRoute = routes.find((route) => route.id === routeId) ?? routes[0];
  const currentLocation = locations.find((location) => location.id === locationId) ?? locations[0];
  const currentNpc = npcs.find((npc) => npc.id === currentLocation.npc) ?? npcs[0];
  const currentNpcDialogueProgress = npcDialogueProgress[currentNpc.id] ?? 0;
  const currentNpcDialogueIndex = currentNpcDialogueProgress % getNpcDialogues(currentNpc.id).length;
  const currentNpcDialogue = getNpcDialogues(currentNpc.id)[currentNpcDialogueIndex];
  const currentNpcMission = getDialogueMission(currentNpc.id, currentNpcDialogueIndex);
  const currentNpcRelationship = relationships[currentNpc.id] ?? 0;
  const activeDialogueDef = activeDialogue ? getNpcDialogues(activeDialogue.id)[activeDialogueIndex] : null;
  const activeDialogueMission = activeDialogue ? getDialogueMission(activeDialogue.id, activeDialogueIndex) : null;
  const activeDialogueRounds = activeDialogue ? getDialogueRounds(activeDialogue.id, activeDialogueIndex) : [];
  const activeDialogueRound = activeDialogueRounds[dialogueRoundIndex] ?? null;
  const activeDialogueRelationship = activeDialogue ? relationships[activeDialogue.id] ?? 0 : 0;
  const activeDialogueId = activeDialogue?.id ?? "";
  const dialogueLineSource = dialogueStage === "choice"
    ? dialogueTurnPhase === "prompt"
      ? activeDialogueRound?.prompt ?? ""
      : dialogueResult
    : "";
  const canChooseDialogue = dialogueStage === "choice" && dialogueTurnPhase === "prompt" && dialogueTextComplete;
  const dialoguePortraitState = dialogueStage === "intro"
    ? "entering"
    : dialogueStage === "result"
      ? "settled"
      : dialogueTurnPhase === "response" || !dialogueTextComplete
        ? "speaking"
        : "listening";
  const goal = yearGoals[Math.min(year - 1, yearGoals.length - 1)];
  const chapter = storyChapters[Math.min(year - 1, storyChapters.length - 1)];
  const goalsMet = stats.french >= goal.french && stats.admin >= goal.admin && stats.assimilation >= goal.assimilation && stats.stability >= goal.stability;
  const dailyTasks = dailyTaskSets[(day - 1) % dailyTaskSets.length];
  const isDailyTaskDone = (task: DailyTask) => completedDailyTaskIds.includes(task.id) || (task.trigger === "action" && completedActionIds.includes(task.targetId));
  const allDailyTasksDone = dailyTasks.every(isDailyTaskDone);
  const nextDailyTask = dailyTasks.find((task) => !isDailyTaskDone(task)) ?? null;
  const weekdayIndex = (day - 1) % weekSchedule.length;
  const weekNumber = Math.floor((day - 1) / weekSchedule.length) + 1;
  const currentWeekday = weekSchedule[weekdayIndex];
  const getDutyProgress = (duty: WeekDuty) => duty.metric === "route" ? dailyTasks.filter(isDailyTaskDone).length : dailyProgress[duty.metric];
  const isDutyDone = (duty: WeekDuty) => getDutyProgress(duty) >= duty.target;
  const dutiesDone = currentWeekday.duties.filter(isDutyDone).length;
  const allDutiesDone = dutiesDone === currentWeekday.duties.length;
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
  const activeActivityScene = activeAction ? getActivityScene(activeAction.action.id, actionProgress) : null;
  const currentCafeOrder = activeCafeShift ? activeCafeShift.orders[activeCafeShift.index] : null;
  const cafeShiftStartedGuests = activeCafeShift ? Math.max(1, activeCafeShift.index + 1) : 0;
  const cafeShiftLeaveMinutes = Math.max(30, cafeShiftStartedGuests * 30);
  const remainingDayHours = Math.max(0, 24 - time);
  const cityEventLatestStart = currentCityEvent.endHour - currentCityEvent.hours;
  const cityEventStatus: "done" | "upcoming" | "open" | "missed" = cityEventDone ? "done" : time < currentCityEvent.startHour ? "upcoming" : time <= cityEventLatestStart ? "open" : "missed";
  const cityEventWindow = formatEventWindow(currentCityEvent);
  const cityEventStatusText = cityEventStatus === "done" ? "Событие уже пройдено" : cityEventStatus === "upcoming" ? `Начнётся в ${formatTime(currentCityEvent.startHour)}` : cityEventStatus === "open" ? `Идёт сейчас · войти до ${formatTime(cityEventLatestStart)}` : `Завершилось в ${formatTime(currentCityEvent.endHour)}`;
  const cityEventAtVenue = locationId === currentCityEvent.locationId;
  const cityEventButtonLabel = cityEventStatus === "done" ? "✓ Событие завершено" : cityEventStatus === "missed" ? "Сегодня уже завершилось" : !cityEventAtVenue ? "Показать место на карте →" : cityEventStatus === "upcoming" ? `Начнётся в ${formatTime(currentCityEvent.startHour)}` : "Участвовать сейчас →";
  const cityEventButtonDisabled = !awake || cityEventStatus === "done" || cityEventStatus === "missed" || (cityEventAtVenue && cityEventStatus === "upcoming");
  const availableLocationActions = currentLocation.actions.filter((action) => action.repeatable || !completedActionIds.includes(action.id));
  const completedLocationActions = currentLocation.actions.filter((action) => !action.repeatable && completedActionIds.includes(action.id));

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
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents, completedDailyTaskIds, completedActionIds, chapterProgressPoints, npcDialogueProgress, relationships, npcAssignments, recentCafeOrderIds, activeCafeShift, cafeShiftFeedback };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [phase, profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents, completedDailyTaskIds, completedActionIds, chapterProgressPoints, npcDialogueProgress, relationships, npcAssignments, recentCafeOrderIds, activeCafeShift, cafeShiftFeedback]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const shiftBecameActive = !!activeCafeShift && !cafeShiftWasActiveRef.current;
    cafeShiftWasActiveRef.current = !!activeCafeShift;
    if (!activeCafeShift) {
      restoreCafeShiftLeaveFocusRef.current = false;
      return;
    }
    if (showCafeShiftLeaveConfirm || (!shiftBecameActive && !restoreCafeShiftLeaveFocusRef.current)) return;
    restoreCafeShiftLeaveFocusRef.current = false;
    const frame = window.requestAnimationFrame(() => cafeShiftLeaveButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [activeCafeShift, showCafeShiftLeaveConfirm]);

  useEffect(() => {
    if (!showCafeShiftLeaveConfirm) return;
    restoreCafeShiftLeaveFocusRef.current = true;
    const dialog = cafeShiftLeaveDialogRef.current;
    const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
    const focusSafeAction = () => {
      const safeAction = dialog?.querySelector<HTMLElement>(".cafe-shift-leave-cancel");
      const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector);
      (safeAction ?? firstFocusable ?? dialog)?.focus();
    };
    const frame = window.requestAnimationFrame(focusSafeAction);
    const trapCafeShiftLeaveFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowCafeShiftLeaveConfirm(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focused = document.activeElement;
      if (!dialog.contains(focused)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && focused === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trapCafeShiftLeaveFocus, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", trapCafeShiftLeaveFocus, true);
    };
  }, [showCafeShiftLeaveConfirm]);

  useEffect(() => {
    if (!activeDialogue || !activeDialogueMission || dialogueStage === "intro") return;
    const timer = window.setInterval(() => {
      setDialogueElapsedMinutes((minutes) => Math.min(activeDialogueMission.durationMinutes, minutes + 1));
    }, 520);
    return () => window.clearInterval(timer);
  }, [activeDialogue, activeDialogueMission, dialogueStage]);

  useEffect(() => {
    if (!activeDialogueId || dialogueStage !== "choice" || !dialogueLineSource) {
      dialogueTypingSkipRef.current = false;
      return;
    }

    let cancelled = false;
    let cursor = 0;
    let timer = 0;
    dialogueTypingSkipRef.current = false;

    const typeNextCharacter = () => {
      if (cancelled) return;
      if (dialogueTypingSkipRef.current) {
        setDialogueVisibleText(dialogueLineSource);
        setDialogueTextComplete(true);
        return;
      }

      cursor = Math.min(dialogueLineSource.length, cursor + 1);
      setDialogueVisibleText(dialogueLineSource.slice(0, cursor));
      if (cursor >= dialogueLineSource.length) {
        setDialogueTextComplete(true);
        return;
      }

      const typedCharacter = dialogueLineSource[cursor - 1];
      const delay = /[.!?…]/.test(typedCharacter) ? 220 : /[,;:—]/.test(typedCharacter) ? 90 : 28;
      timer = window.setTimeout(typeNextCharacter, delay);
    };

    timer = window.setTimeout(typeNextCharacter, dialogueTurnPhase === "response" ? 180 : 260);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeDialogueId, dialogueStage, dialogueLineSource, dialogueTurnPhase, dialogueRoundIndex]);

  useEffect(() => {
    if (!activeDialogueId || dialogueStage !== "choice" || dialogueTurnPhase !== "response" || !dialogueTextComplete || !dialogueResult) return;
    const response = dialogueResult;
    const finalRound = dialogueRoundIndex >= activeDialogueRounds.length - 1;
    const pauseAfterLine = 1600 + Math.min(2800, response.length * 18);
    const timer = window.setTimeout(() => {
      setDialogueTranscript((lines) => [...lines, { speaker: "npc", text: response }]);
      if (finalRound) {
        setDialogueStage("result");
      } else {
        setDialogueVisibleText("");
        setDialogueTextComplete(false);
        setDialogueRoundIndex((index) => index + 1);
        setDialogueResult("");
        setDialogueTurnPhase("prompt");
      }
    }, pauseAfterLine);
    return () => window.clearTimeout(timer);
  }, [activeDialogueId, dialogueStage, dialogueTurnPhase, dialogueTextComplete, dialogueResult, dialogueRoundIndex, activeDialogueRounds.length]);

  useEffect(() => {
    if (!activeDialogueId || dialogueStage !== "choice" || dialogueTextComplete) return;
    const revealOnKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, textarea, select, a")) return;
      event.preventDefault();
      dialogueTypingSkipRef.current = true;
      setDialogueVisibleText(dialogueLineSource);
      setDialogueTextComplete(true);
    };
    window.addEventListener("keydown", revealOnKeyboard);
    return () => window.removeEventListener("keydown", revealOnKeyboard);
  }, [activeDialogueId, dialogueStage, dialogueTextComplete, dialogueLineSource]);

  useEffect(() => {
    const paused = phase !== "game" || !awake || !!activeTravel || !!activeAction || !!activeCafeShift || !!activeDialogue || !!activeEvent || !!pendingTravel || !!metroTrip || !!dayTransitionPhase || tutorialStep >= 0 || showEventReveal || showGameMenu || showJournal || showAchievements;
    if (paused) return;
    const clock = window.setInterval(() => {
      setTime((value) => Math.min(23.95, value + 1 / 60));
    }, 2400);
    return () => window.clearInterval(clock);
  }, [phase, awake, activeTravel, activeAction, activeCafeShift, activeDialogue, activeEvent, pendingTravel, metroTrip, dayTransitionPhase, tutorialStep, showEventReveal, showGameMenu, showJournal, showAchievements]);

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

  const animateCloseWindow = (afterClose: () => void) => {
    if (closingWindow) return;
    setClosingWindow(true);
    window.setTimeout(() => {
      afterClose();
      setClosingWindow(false);
    }, 240);
  };

  const beginGame = () => {
    setStats(selectedRoute.start);
    setYear(1); setDay(1); setTime(7); setLocationId("home"); setAwake(false);
    setActionCount(0); setSeenEvents([]); setMetNpcs([]);
    setDailyProgress(emptyDayProgress); setDailyRewardClaimed(false); setVisitedLocations(["home"]); setCompletedCityEvents([]);
    setCompletedDailyTaskIds([]); setCompletedActionIds([]); setChapterProgressPoints(0); setNpcDialogueProgress({}); setRelationships({}); setNpcAssignments({}); setRecentCafeOrderIds([]);
    setActiveDialogue(null); setDialogueResult(""); setDialogueStage("choice"); setActiveDialogueIndex(0); setDialogueRoundIndex(0); setDialogueTurnPhase("prompt"); setDialogueVisibleText(""); setDialogueTextComplete(false); dialogueTypingSkipRef.current = false; setDialogueTranscript([]); setDialoguePendingEffects({}); setDialoguePendingRelationship(0); setDialogueElapsedMinutes(0); setShowAchievements(false); setShowGameMenu(false);
    setStatsExpanded(false); setStoryExpanded(false); setSideTab("actions");
    setMetroTrip(null); setActiveTravel(null); setTravelProgress(0); setActiveAction(null); setActionProgress(0); setActiveCafeShift(null); setCafeShiftFeedback(null); setShowCafeShiftLeaveConfirm(false); setClosingWindow(false); setShowEventReveal(false); setDayTransitionPhase(null);
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
    setCompletedDailyTaskIds(savedGame.completedDailyTaskIds ?? []); setCompletedActionIds(savedGame.completedActionIds ?? []); setChapterProgressPoints(savedGame.chapterProgressPoints ?? 0);
    setNpcDialogueProgress(savedGame.npcDialogueProgress ?? {}); setRelationships(savedGame.relationships ?? {}); setNpcAssignments(savedGame.npcAssignments ?? {}); setRecentCafeOrderIds(savedGame.recentCafeOrderIds ?? []);
    setAwake(true); setViewMode("scene"); setTutorialStep(-1); setSideTab("actions"); setActiveAction(null); setActiveCafeShift(savedGame.activeCafeShift ?? null); setCafeShiftFeedback(savedGame.cafeShiftFeedback ?? null); setShowCafeShiftLeaveConfirm(false); setClosingWindow(false); setShowEventReveal(false); setPhase("game");
  };

  const startFresh = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedGame(null); setProfile(defaultProfile); setPhase("setup");
  };

  const exitToTitle = () => {
    const save: SavedGame = { profile, routeId, stats, year, day, time, locationId, actionCount, seenEvents, metNpcs, journal, dailyProgress, dailyRewardClaimed, visitedLocations, completedCityEvents, completedDailyTaskIds, completedActionIds, chapterProgressPoints, npcDialogueProgress, relationships, npcAssignments, recentCafeOrderIds, activeCafeShift, cafeShiftFeedback };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    setSavedGame(save);
    setPhase("intro");
  };

  const wakeUp = (hour: number, energy: number, label: string) => {
    setTime(hour); setStats((current) => applyEffects(current, { energy })); setAwake(true);
    setShowEventReveal(true);
    addJournal(`${currentWeekday.name}, день ${day}: ${label.toLowerCase()}.`);
    setToast(`${currentWeekday.name} · день начался в ${formatTime(hour)}`);
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

  const finishDay = () => {
    if (activeCafeShift) {
      setToast("Сначала закончи смену или покинь её со штрафом.");
      return;
    }
    if (dayTransitionPhase) return;
    const missed = currentWeekday.duties.filter((duty) => !isDutyDone(duty));
    addJournal(allDutiesDone
      ? `${currentWeekday.name}: все обязанности выполнены.`
      : `${currentWeekday.name}: выполнено ${dutiesDone}/${currentWeekday.duties.length}; осталось: ${missed.map((duty) => duty.label).join(", ")}.`);
    startDayTransition(allDutiesDone
      ? "Обязанности закрыты. Можно спокойно возвращаться домой."
      : `День завершён: выполнено ${dutiesDone} из ${currentWeekday.duties.length} обязанностей.`);
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

  const completePerformedAction = (action: Action, actionLocation: LocationDef, actionStart: number, bonusEffects: Partial<Stats> = {}) => {
    const finalEffects = mergeEffectDeltas(action.effects, bonusEffects);
    const nextTime = actionStart + action.hours;
    const nextCount = actionCount + 1;
    setStats((current) => applyEffects(current, finalEffects));
    setActionCount(nextCount);
    if (!action.repeatable) setCompletedActionIds((items) => items.includes(action.id) ? items : [...items, action.id]);
    setCompletedDailyTaskIds((items) => {
      const matches = dailyTasks.filter((task) => task.trigger === "action" && task.targetId === action.id && task.locationId === actionLocation.id).map((task) => task.id);
      return [...new Set([...items, ...matches])];
    });
    setChapterProgressPoints((value) => Math.min(100, value + Math.max(7, action.hours * 5)));
    setDailyProgress((progress) => ({
      ...progress,
      actions: progress.actions + 1,
      french: progress.french + ((finalEffects.french ?? 0) > 0 ? 1 : 0),
      admin: progress.admin + ((finalEffects.admin ?? 0) > 0 ? 1 : 0),
      culture: progress.culture + ((finalEffects.assimilation ?? 0) > 0 ? 1 : 0),
      earned: progress.earned + Math.max(0, finalEffects.money ?? 0),
    }));
    addJournal(`${formatTime(actionStart)} · ${actionLocation.short}: ${action.label}.`);
    setActionProgress(100);
    setActiveAction(null);
    setTime(Math.min(23.95, nextTime));
    setToast(`${action.label} · прошло ${action.hours} ч.`);
    maybeTriggerEvent(nextCount);
  };

  const performAction = (action: Action) => {
    if (!awake || activeAction || activeCafeShift) return;
    if (!action.repeatable && completedActionIds.includes(action.id)) {
      setToast("Это сюжетное дело уже завершено — результат сохранён.");
      return;
    }
    if (time + action.hours > 24) {
      setToast(`До полуночи не хватает времени: нужно ${action.hours} ч., осталось ${Math.max(0, Math.floor(remainingDayHours))} ч.`);
      return;
    }
    if (stats.energy <= 5 && action.effects.energy && action.effects.energy < 1) {
      setToast("Сил почти нет. Отдохни или заверши день.");
      return;
    }
    const actionLocation = currentLocation;
    const actionStart = time;
    if (action.id === "shift") {
      const unseenOrders = cafeOrderPool.filter((order) => !recentCafeOrderIds.includes(order.id));
      const seenOrders = cafeOrderPool.filter((order) => recentCafeOrderIds.includes(order.id));
      const orderCandidates = unseenOrders.length >= 5
        ? shuffleItems(unseenOrders)
        : [...shuffleItems(unseenOrders), ...shuffleItems(seenOrders)];
      const orders = orderCandidates.slice(0, 5).map((order) => ({ ...order, choices: shuffleItems(order.choices) }));
      setCafeShiftFeedback(null);
      setShowCafeShiftLeaveConfirm(false);
      setActiveCafeShift({ action, locationId: actionLocation.id, startTime: actionStart, orders, index: 0, correct: 0 });
      return;
    }
    setActionProgress(7);
    setActiveAction({ action, locationId: actionLocation.id, startTime: actionStart });
    window.setTimeout(() => setActionProgress(27), 850);
    window.setTimeout(() => setActionProgress(52), 2100);
    window.setTimeout(() => setActionProgress(76), 3450);
    window.setTimeout(() => setActionProgress(93), 4700);
    window.setTimeout(() => {
      completePerformedAction(action, actionLocation, actionStart);
    }, 5450);
  };

  const answerCafeOrder = (choice: CafeOrderChoice) => {
    if (!activeCafeShift || cafeShiftFeedback) return;
    if (choice.correct) setActiveCafeShift((shift) => shift ? { ...shift, correct: shift.correct + 1 } : shift);
    setCafeShiftFeedback({ correct: choice.correct, text: choice.feedback });
  };

  const continueCafeShift = () => {
    if (!activeCafeShift || !cafeShiftFeedback) return;
    if (activeCafeShift.index >= activeCafeShift.orders.length - 1) {
      const location = locations.find((item) => item.id === activeCafeShift.locationId) ?? locations[0];
      const score = activeCafeShift.correct;
      const finishedOrderIds = activeCafeShift.orders.map((order) => order.id);
      setRecentCafeOrderIds((ids) => [...ids.filter((id) => !finishedOrderIds.includes(id)), ...finishedOrderIds].slice(-15));
      completePerformedAction(activeCafeShift.action, location, activeCafeShift.startTime, { french: score, assimilation: score >= 4 ? 2 : 0 });
      setActiveCafeShift(null);
      setCafeShiftFeedback(null);
      setShowCafeShiftLeaveConfirm(false);
      setToast(`Смена закрыта: ${score}/${activeCafeShift.orders.length} заказов без ошибки · французский +${4 + score}`);
      return;
    }
    setActiveCafeShift((shift) => shift ? { ...shift, index: shift.index + 1 } : shift);
    setCafeShiftFeedback(null);
  };

  const leaveCafeShiftEarly = () => {
    if (!activeCafeShift) return;
    const startedGuests = Math.max(1, activeCafeShift.index + 1);
    const elapsedMinutes = Math.max(30, startedGuests * 30);
    const endTime = Math.min(23.95, activeCafeShift.startTime + elapsedMinutes / 60);
    const seenOrderIds = activeCafeShift.orders.slice(0, startedGuests).map((order) => order.id);
    setStats((current) => applyEffects(current, { money: -20, stability: -4, energy: -4 }));
    setRelationships((values) => ({ ...values, malik: Math.max(0, (values.malik ?? 0) - 8) }));
    setRecentCafeOrderIds((ids) => [...ids.filter((id) => !seenOrderIds.includes(id)), ...seenOrderIds].slice(-15));
    setTime(endTime);
    addJournal(`${formatTime(activeCafeShift.startTime)} · Café des Amis: смена прервана после ${startedGuests} ${startedGuests === 1 ? "гостя" : "гостей"}. Зарплата 0 €; смена заняла ${elapsedMinutes} мин. Штраф: −20 €, −4 силы, −4 опоры, −8 отношений с Маликом.`);
    setActiveCafeShift(null);
    setCafeShiftFeedback(null);
    setShowCafeShiftLeaveConfirm(false);
    setToast(`Смена прервана: 0 € зарплаты · −20 € · силы/опора −4 · Малик −8 · ${elapsedMinutes} мин.`);
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
    const index = currentNpcDialogueIndex;
    setActiveDialogue(currentNpc);
    setActiveDialogueIndex(index);
    setDialogueRoundIndex(0);
    setDialogueTurnPhase("prompt");
    setDialogueVisibleText("");
    setDialogueTextComplete(false);
    dialogueTypingSkipRef.current = false;
    setDialogueResult("");
    setDialogueTranscript([]);
    setDialoguePendingEffects({});
    setDialoguePendingRelationship(0);
    setDialogueElapsedMinutes(0);
    setDialogueStage(metNpcs.includes(currentNpc.id) ? "choice" : "intro");
  };

  const chooseDialogue = (choice: DialogueChoice) => {
    if (!activeDialogue || !activeDialogueDef || !activeDialogueMission || !activeDialogueRound || !canChooseDialogue) return;
    setDialoguePendingEffects((effects) => mergeEffectDeltas(effects, choice.effects));
    setDialoguePendingRelationship((value) => value + 3 + ((choice.effects.assimilation ?? 0) > 6 ? 1 : 0));
    setDialogueTranscript((lines) => [...lines, { speaker: "player", text: choice.label }]);
    setDialogueVisibleText("");
    setDialogueTextComplete(false);
    setDialogueResult(choice.response);
    setDialogueTurnPhase("response");
  };

  const revealCurrentDialogueLine = () => {
    if (dialogueStage !== "choice" || dialogueTextComplete || !dialogueLineSource) return;
    dialogueTypingSkipRef.current = true;
    setDialogueVisibleText(dialogueLineSource);
    setDialogueTextComplete(true);
  };

  const resetDialogueSession = () => {
    setActiveDialogue(null);
    setDialogueResult("");
    setDialogueStage("choice");
    setDialogueRoundIndex(0);
    setDialogueTurnPhase("prompt");
    setDialogueVisibleText("");
    setDialogueTextComplete(false);
    dialogueTypingSkipRef.current = false;
    setDialogueTranscript([]);
    setDialoguePendingEffects({});
    setDialoguePendingRelationship(0);
    setDialogueElapsedMinutes(0);
  };

  const completeDialogue = () => {
    if (!activeDialogue || !activeDialogueMission) return;
    const npc = activeDialogue;
    const mission = activeDialogueMission;
    const firstMeeting = !metNpcs.includes(npc.id);
    const combinedEffects = mergeEffectDeltas(dialoguePendingEffects, { energy: -3, french: firstMeeting ? 2 : 0, assimilation: firstMeeting ? 2 : 0 });
    if (firstMeeting) setMetNpcs((items) => items.includes(npc.id) ? items : [...items, npc.id]);
    setStats((current) => applyEffects(current, combinedEffects));
    setRelationships((values) => ({ ...values, [npc.id]: Math.min(100, (values[npc.id] ?? 0) + dialoguePendingRelationship) }));
    setTime((value) => Math.min(23.95, value + mission.durationMinutes / 60));
    setCompletedDailyTaskIds((items) => {
      const matches = dailyTasks.filter((task) => task.trigger === "talk" && task.targetId === npc.id && task.locationId === currentLocation.id).map((task) => task.id);
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
    setNpcDialogueProgress((progress) => ({ ...progress, [npc.id]: (progress[npc.id] ?? 0) + 1 }));
    setNpcAssignments((assignments) => ({ ...assignments, [npc.id]: { missionId: mission.id, title: mission.title, task: mission.task, knowledge: mission.knowledge } }));
    addJournal(`${npc.name} · ${mission.title}: ${mission.task}`);
    setToast(firstMeeting ? `Новое знакомство: ${npc.name}` : `Разговор с ${npc.name} завершён — договорённость записана`);
    resetDialogueSession();
  };

  const closeDialogue = () => {
    if (dialoguePendingRelationship > 0) setToast("Незаконченный разговор прерван — отношения и награды не изменились.");
    resetDialogueSession();
  };

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

  const guideDuty = (duty: WeekDuty) => {
    if (isDutyDone(duty)) { setToast(`Обязанность «${duty.label}» уже выполнена.`); return; }
    if (duty.locationId && locationId !== duty.locationId) {
      const destination = locations.find((location) => location.id === duty.locationId);
      setViewMode("map");
      setToast(`${duty.label}: ориентир на карте — ${destination?.label ?? "нужная локация"}.`);
      return;
    }
    setViewMode("scene");
    setSideTab(duty.metric === "talks" ? "people" : "actions");
    setToast(`${duty.label}: ${duty.detail}. Срок — до ${formatTime(duty.dueHour)}.`);
  };

  const participateCityEvent = () => {
    if (cityEventDone || !awake) return;
    if (cityEventStatus === "missed") {
      setToast(`На ${currentCityEvent.title.toLowerCase()} сегодня уже не успеть. Завтра в городе будет новое событие.`);
      return;
    }
    if (locationId !== currentCityEvent.locationId) {
      setViewMode("map");
      setToast(`${currentCityEvent.title}: ${currentCityEventLocation.label} · вход до ${formatTime(cityEventLatestStart)}`);
      return;
    }
    if (cityEventStatus === "upcoming") {
      setToast(`${currentCityEvent.title} начнётся в ${formatTime(currentCityEvent.startHour)}. До этого времени можно заняться другими делами.`);
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
          <h1 className="title-accessible">PARIS,<br /><span>NOUVELLE VIE</span></h1>
          <p className="title-chapter">CHAPITRE I · LE GRAND DÉPART</p>
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
    <main className={`game-shell sky-${sky} ${closingWindow ? "closing-window" : ""}`}>
      <header className="game-header" aria-hidden={!!activeCafeShift || undefined} inert={!!activeCafeShift || undefined}>
        <div className="brand-mini"><span className="mini-tower">A</span><div><strong>PARIS, NOUVELLE VIE</strong><small>{selectedRoute.subtitle}</small></div></div>
        <div className="time-block"><span>ГЛАВА {year}/5 · НЕДЕЛЯ {weekNumber}</span><strong>{formatTime(time)}</strong><em>{currentWeekday.name} · день {day} · {sky === "night" ? "ночь" : sky === "sunset" ? "закат" : sky === "dawn" ? "рассвет" : "день"}</em></div>
        <div className="header-actions"><button disabled={!!activeCafeShift} className={viewMode === "map" ? "active" : ""} onClick={() => { if (!activeCafeShift) setViewMode(viewMode === "map" ? "scene" : "map"); }}>⌖ {viewMode === "map" ? "Вернуться" : "Карта"}</button><button disabled={!!activeCafeShift} onClick={() => { if (!activeCafeShift) setShowGameMenu(true); }}>☰ Меню</button></div>
      </header>

      <div className="game-layout" aria-hidden={!!activeCafeShift || undefined} inert={!!activeCafeShift || undefined}>
        <aside className="left-panel pixel-panel">
          <div className="player-card"><div className="player-avatar small"><span className="player-hair" /><span className="player-face" /><span className="player-body" /></div><div><strong>{profile.name}</strong><small>{profile.age} лет · глава {year}/5</small></div></div>
          <div className="stats-list">
            <StatMeter label="Силы" value={stats.energy} icon="♥" />
            <StatMeter label="Деньги" value={stats.money} icon="€" money />
            <button className="stats-toggle" onClick={() => setStatsExpanded((value) => !value)}><span>Развитие персонажа</span><b>{statsExpanded ? "Свернуть −" : "Показать +"}</b></button>
            {statsExpanded && <div className="secondary-stats"><StatMeter label="Французский" value={stats.french} icon="FR" /><StatMeter label="Досье" value={stats.admin} icon="▤" /><StatMeter label="Интеграция" value={stats.assimilation} icon="◆" /><StatMeter label="Опора" value={stats.stability} icon="⌂" /></div>}
          </div>
          <div className="week-agenda-card">
            <div className="week-agenda-head"><span>НЕДЕЛЯ {weekNumber}</span><strong>{currentWeekday.name}</strong><em>{currentWeekday.french} · {currentWeekday.focus}</em></div>
            <div className="week-strip" aria-label={`Календарь недели, сегодня ${currentWeekday.name}`}>{weekSchedule.map((item, index) => <span key={item.short} className={index === weekdayIndex ? "active" : index < weekdayIndex ? "past" : ""}><b>{item.short}</b><i>{index + 1}</i></span>)}</div>
            <div className="duty-head"><span>ОБЯЗАННОСТИ НА СЕГОДНЯ</span><b>{dutiesDone}/{currentWeekday.duties.length}</b></div>
            <div className="week-duty-list">{currentWeekday.duties.map((duty) => {
              const done = isDutyDone(duty); const progress = getDutyProgress(duty); const late = !done && time >= duty.dueHour;
              return <button key={duty.id} className={`week-duty ${done ? "done" : ""} ${late ? "late" : ""}`} onClick={() => guideDuty(duty)}><i>{done ? "✓" : late ? "!" : "○"}</i><div><strong>{duty.label}</strong><small>{duty.detail}</small></div><b>{Math.min(progress, duty.target)}/{duty.target}<small>до {formatTime(duty.dueHour)}</small></b></button>;
            })}</div>
          </div>
          <div className="daily-plan-card">
            <div className="daily-plan-head"><span>СЮЖЕТНЫЙ МАРШРУТ · ДЕНЬ {day}</span><b>{dailyTasks.filter(isDailyTaskDone).length}/{dailyTasks.length}</b></div>
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
              <div className="map-topline"><div className="map-name">PARIS <span>20 ОКРУГОВ · СЕНА · ВАЖНЫЕ МЕСТА</span></div><button onClick={() => setViewMode("scene")}>× Закрыть карту</button></div>
              <div className="map-calendar-stamp"><span>{currentWeekday.short} · НЕДЕЛЯ {weekNumber}</span><strong>{formatTime(time)}</strong><small>{currentWeekday.focus}</small></div>
              <div className="paris-city-boundary" aria-hidden="true" />
              <div className="peripherique-ring" aria-hidden="true"><span>BOULEVARD PÉRIPHÉRIQUE</span></div>
              <div className="atlas-park park-boulogne" aria-hidden="true"><span>BOIS DE<br />BOULOGNE</span></div><div className="atlas-park park-vincennes" aria-hidden="true"><span>BOIS DE<br />VINCENNES</span></div><div className="atlas-park park-luxembourg" aria-hidden="true"><span>JARDIN DU LUXEMBOURG</span></div><div className="atlas-park park-tuileries" aria-hidden="true"><span>TUILERIES</span></div>
              <div className="atlas-roads" aria-hidden="true"><i className="atlas-road road-champs"><span>AV. DES CHAMPS-ÉLYSÉES</span></i><i className="atlas-road road-rivoli"><span>RUE DE RIVOLI</span></i><i className="atlas-road road-saint-germain"><span>BD SAINT-GERMAIN</span></i><i className="atlas-road road-sebastopol"><span>BD DE SÉBASTOPOL</span></i><i className="atlas-road road-voltaire"><span>BD VOLTAIRE</span></i><i className="atlas-road road-magenta"><span>BD DE MAGENTA</span></i></div>
              <div className="arrondissement-layer" aria-hidden="true">{parisDistricts.map((district) => <span key={district.number} className="arrondissement-marker" style={{ left: district.x, top: district.y }}><b>{district.number}</b><small>{district.name}</small></span>)}</div>
              <div className="seine-map"><span>LA SEINE · СЕНА</span><i className="map-island island-cite">ÎLE DE LA CITÉ</i><i className="map-island island-saint-louis">ST-LOUIS</i></div>
              {locations.map((location) => (
                <button key={location.id} className={`map-location map-location-${location.id} ${locationId === location.id ? "active" : ""} ${nextDailyTask?.locationId === location.id ? "guided" : ""} ${currentCityEvent.locationId === location.id && cityEventStatus !== "done" ? "event-destination" : ""}`} style={{ left: location.x, top: location.y }} onClick={() => travelTo(location.id)} aria-label={`Построить маршрут: ${location.label}${locationId === location.id ? ". Вы здесь" : ""}${currentCityEvent.locationId === location.id && cityEventStatus !== "done" ? `. Событие дня «${currentCityEvent.title}», ${getEventPeriodLabel(currentCityEvent.period).toLowerCase()}, начало в ${formatTime(currentCityEvent.startHour)}` : ""}`}>
                  <LandmarkArt type={location.art} /><span><b>{location.label}</b><small>{location.district}</small></span>{locationId === location.id && <i className="you-pin">ВЫ ЗДЕСЬ</i>}{currentCityEvent.locationId === location.id && cityEventStatus !== "done" && <i className={`event-map-pin ${cityEventStatus}`}>{getEventPeriodLabel(currentCityEvent.period)} · {formatTime(currentCityEvent.startHour)}</i>}
                </button>
              ))}
              <div className="map-compass" aria-hidden="true"><b>N</b><i /></div><div className="map-scale" aria-hidden="true"><i /><span>0</span><span>2</span><span>4 км</span></div>
              <div className="map-legend"><b>УСЛОВНЫЕ ОБОЗНАЧЕНИЯ</b><span><i className="legend-swatch district" /> округ</span><span><i className="legend-swatch river" /> Сена</span><span><i className="legend-swatch current" /> вы здесь</span><span><i className="legend-swatch event" /> событие дня</span><p>Нажмите на достопримечательность: время и способы дороги появятся до подтверждения. Подробная схема метро откроется после выбора поездки.</p></div>
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
          <div className="side-tabs" role="tablist" aria-label="Действия в локации"><button className={sideTab === "actions" ? "active" : ""} onClick={() => setSideTab("actions")}>Дела</button><button className={sideTab === "people" ? "active" : ""} onClick={() => setSideTab("people")}>Люди</button><button className={sideTab === "event" ? "active" : ""} onClick={() => setSideTab("event")}>Ивент <i>{cityEventStatus === "done" ? "✓" : cityEventStatus === "open" ? "!" : cityEventStatus === "missed" ? "×" : "◷"}</i></button></div>
          {sideTab === "actions" && <div className="side-tab-content"><div className="actions-title"><span>ДОСТУПНЫЕ ДЕЛА</span><b>{awake ? `≈ ${Math.max(0, Math.floor(remainingDayHours))} ч. осталось` : "день завершён"}</b></div>{availableLocationActions.length > 0 ? <div className="action-list">{availableLocationActions.map((action) => {
            const lacksTime = action.hours > remainingDayHours;
            const guided = nextDailyTask?.trigger === "action" && nextDailyTask.targetId === action.id && nextDailyTask.locationId === currentLocation.id;
            return <button className={`${guided ? "quest-action" : ""} ${lacksTime ? "lacks-time" : ""}`} key={action.id} disabled={!awake || lacksTime} onClick={() => performAction(action)}><span className="action-icon">{action.icon}</span><span><strong>{action.label}</strong><small>{lacksTime && awake ? `Нужно ${action.hours} ч. · сегодня уже не успеть` : `${action.detail} · ${action.hours} ч. · ${action.repeatable ? "можно повторять" : "один раз"}`}</small></span><b>{lacksTime ? "⌛" : "›"}</b></button>;
          })}</div> : <div className="no-actions-left"><b>✓</b><strong>Все сюжетные дела здесь завершены</strong><span>Завтра маршрут дня предложит следующий шаг в другой части Парижа.</span></div>}{completedLocationActions.length > 0 && <div className="completed-actions-note">Завершено в этой локации: {completedLocationActions.length}</div>}{awake && <button className={`end-day ${allDutiesDone ? "duties-complete" : ""}`} onClick={finishDay}>Завершить день · обязанности {dutiesDone}/{currentWeekday.duties.length}</button>}</div>}
          {sideTab === "people" && <div className="side-tab-content people-tab">
            <div className="npc-card"><PixelPortrait npc={currentNpc} small /><div><span>{currentNpc.role}</span><strong>{currentNpc.name}</strong><p>{metNpcs.includes(currentNpc.id) ? `«${currentNpc.line}»` : "Вы ещё не знакомы. Первый разговор начнётся с представления."}</p></div></div>
            <div className="relationship-card"><div><span>ОТНОШЕНИЯ</span><b>{getRelationshipTitle(currentNpcRelationship)}</b><strong>{currentNpcRelationship}%</strong></div><div className="relationship-track"><i style={{ width: `${currentNpcRelationship}%` }} /></div></div>
            <div className="conversation-preview"><span>СЛЕДУЮЩАЯ ТЕМА</span><strong>{currentNpcMission.title}</strong><p>«{currentNpcDialogue.greeting}»</p><small>Живой разговор · около {currentNpcMission.durationMinutes} мин.</small></div>
            <button className="talk-button" disabled={!awake} onClick={talkToNpc}>{metNpcs.includes(currentNpc.id) ? `Поговорить с ${currentNpc.name}` : `Представиться ${currentNpc.name}`} →</button>
            {npcAssignments[currentNpc.id] && <div className="npc-assignment"><span>ЛИЧНОЕ ПОРУЧЕНИЕ</span><strong>{npcAssignments[currentNpc.id].title}</strong><p>{npcAssignments[currentNpc.id].task}</p></div>}
          </div>}
          {sideTab === "event" && <div className="side-tab-content"><div className={`city-event-card event-status-${cityEventStatus} ${cityEventDone ? "completed" : ""}`}><div><span>{currentCityEvent.kicker}</span><b>{currentCityEvent.hours} ч.</b></div><h3>{currentCityEvent.title}</h3><p>{currentCityEvent.body}</p><div className="event-schedule"><span>{getEventPeriodLabel(currentCityEvent.period)}</span><strong>{cityEventWindow}</strong><small>{cityEventStatusText}</small></div><small>⌖ {currentCityEventLocation.label} · {currentCityEventLocation.district}</small><button disabled={cityEventButtonDisabled} onClick={participateCityEvent}>{cityEventButtonLabel}</button></div></div>}
        </aside>
      </div>

      <footer className="game-footer" aria-hidden={!!activeCafeShift || undefined} inert={!!activeCafeShift || undefined}><span><b>{chapter.episode}</b> · ежедневные дела, диалоги и события меняют твою историю</span><div>{npcs.map((npc) => <span key={npc.id} title={npc.name} className={metNpcs.includes(npc.id) ? "met" : ""}><PixelPortrait npc={npc} small unknown={!metNpcs.includes(npc.id)} /></span>)}</div></footer>

      {pendingTravel && (
        <div className="modal-backdrop travel-backdrop">
          <section className="travel-modal">
            <button className="modal-close" onClick={() => animateCloseWindow(() => setPendingTravel(null))}>×</button>
            <p className="eyebrow ink">ПОДТВЕРЖДЕНИЕ МАРШРУТА</p>
            <h2>{currentLocation.label} <span>→</span> {pendingTravel.label}</h2>
            <p>Выберите способ передвижения. Указано приблизительное время без учёта забастовок, ремонта линий и парижского дождя.</p>
            <div className="route-line"><i className="route-stop start" /><span /><i className="route-stop finish" /></div>
            <div className="travel-options">
              <button onClick={() => animateCloseWindow(() => confirmTravel("metro"))}><span className="travel-icon">M</span><strong>Метро</strong><b>≈ {getTravelMinutes(currentLocation, pendingTravel, "metro")} мин</b><small>−2 € · почти без усталости</small></button>
              <button onClick={() => animateCloseWindow(() => confirmTravel("bike"))}><span className="travel-icon">V</span><strong>Vélib’</strong><b>≈ {getTravelMinutes(currentLocation, pendingTravel, "bike")} мин</b><small>−2 € · −6 сил</small></button>
              <button onClick={() => animateCloseWindow(() => confirmTravel("walk"))}><span className="travel-icon">↟</span><strong>Пешком</strong><b>≈ {getTravelMinutes(currentLocation, pendingTravel, "walk")} мин</b><small>бесплатно · −9 сил</small></button>
            </div>
          </section>
        </div>
      )}

      {metroTrip && currentMetroLeg && currentMetroLine && (
        <div className="modal-backdrop metro-backdrop">
          <section className="metro-simulator">
            <button className="modal-close" onClick={() => animateCloseWindow(() => setMetroTrip(null))}>×</button>
            <header className="metro-sim-header"><div className="metro-mark">M</div><div><span>PARIS MÉTRO · НАВИГАЦИЯ</span><h2>{currentMetroLeg.from}</h2><p>Маршрут до {metroTrip.destination.label} · примерно {metroTrip.minutes} мин.</p></div></header>
            <PixelMetroMap key={`${metroStep}-${currentMetroLeg.lineId}-${currentMetroLeg.from}`} trip={metroTrip} currentLeg={currentMetroLeg} />
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

      {activeCafeShift && currentCafeOrder && (
        <>
        <div className={`cafe-shift-screen ${showCafeShiftLeaveConfirm ? "is-leave-confirming" : ""}`} aria-hidden={showCafeShiftLeaveConfirm || undefined} inert={showCafeShiftLeaveConfirm || undefined}>
          <header className="cafe-shift-header"><div><span>CAFÉ DES AMIS · СМЕНА</span><h2>Заказы на французском</h2></div><div className="cafe-shift-header-actions"><div className="shift-score"><span>БЕЗ ОШИБКИ</span><strong>{activeCafeShift.correct}/{activeCafeShift.orders.length}</strong></div><button ref={cafeShiftLeaveButtonRef} type="button" className="cafe-shift-leave-button" disabled={showCafeShiftLeaveConfirm} onClick={() => setShowCafeShiftLeaveConfirm(true)} aria-label="Покинуть смену досрочно и посмотреть штрафы">Покинуть смену</button></div></header>
          <div className="cafe-shift-progress">{activeCafeShift.orders.map((order, index) => <i key={order.id} className={`${index < activeCafeShift.index ? "done" : ""} ${index === activeCafeShift.index ? "active" : ""}`}>{index < activeCafeShift.index ? "✓" : index + 1}</i>)}</div>
          <div className="cafe-shift-layout">
            <section className="cafe-shift-scene">
              <div className="shift-awning" /><div className="shift-menu"><span>CAFÉ</span><i /><i /><i /></div><div className="shift-counter"><i className="shift-machine" /><i className="shift-cup one" /><i className="shift-cup two" /><i className="shift-croissant" /></div>
              <div className="shift-customer" key={currentCafeOrder.id}><PixelPortrait npc={currentCafeOrder.customer} /><div><span>{currentCafeOrder.customer.role}</span><strong>{currentCafeOrder.customer.name}</strong></div></div>
              <div className="shift-entrance">{currentCafeOrder.entrance}</div>
              <div className="shift-queue">{activeCafeShift.orders.slice(activeCafeShift.index + 1).map((order) => <PixelPortrait key={order.id} npc={order.customer} small />)}</div>
              <div className="shift-steam"><i /><i /><i /></div>
            </section>
            <section className="cafe-order-card">
              <p>ЗАКАЗ {activeCafeShift.index + 1} ИЗ {activeCafeShift.orders.length}</p>
              <blockquote>«{currentCafeOrder.order}»</blockquote>
              <details><summary>Подсказка по смыслу</summary><span>{currentCafeOrder.meaning}</span></details>
              <h3>{currentCafeOrder.prompt}</h3>
              <div className="cafe-order-choices">{currentCafeOrder.choices.map((choice) => <button key={choice.label} disabled={!!cafeShiftFeedback || showCafeShiftLeaveConfirm} className={cafeShiftFeedback ? choice.correct ? "correct" : "muted" : ""} onClick={() => answerCafeOrder(choice)}><span>Сказать:</span><strong>«{choice.label}»</strong></button>)}</div>
              {cafeShiftFeedback && <div className={`cafe-order-feedback ${cafeShiftFeedback.correct ? "correct" : "wrong"}`}><b>{cafeShiftFeedback.correct ? "✓ ЗАКАЗ ПОНЯТ" : "✕ НУЖНО УТОЧНИТЬ"}</b><p>{cafeShiftFeedback.text}</p><button type="button" disabled={showCafeShiftLeaveConfirm} onClick={continueCafeShift}>{activeCafeShift.index >= activeCafeShift.orders.length - 1 ? "Закрыть кассу и подвести итог →" : "Впустить следующего гостя →"}</button></div>}
            </section>
          </div>
        </div>
        {showCafeShiftLeaveConfirm && (
          <div className="cafe-shift-leave-backdrop" role="presentation">
            <section ref={cafeShiftLeaveDialogRef} className="cafe-shift-leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cafe-shift-leave-title" aria-describedby="cafe-shift-leave-description" tabIndex={-1}>
              <button type="button" className="cafe-shift-leave-close" onClick={() => setShowCafeShiftLeaveConfirm(false)} aria-label="Отменить уход и вернуться к смене">×</button>
              <p className="cafe-shift-leave-kicker">СМЕНА НЕ ЗАКОНЧЕНА</p>
              <h2 id="cafe-shift-leave-title">Уйти из Café des Amis сейчас?</h2>
              <p id="cafe-shift-leave-description">Малику придётся остаться одному. За незакрытую смену не будет зарплаты, а результаты заказов не засчитаются.</p>
              <ul className="cafe-shift-leave-penalties" aria-label="Потери за досрочный уход">
                <li><span>Деньги</span><strong>−20 € · зарплата 0 €</strong></li>
                <li><span>Силы и опора</span><strong>−4 силы · −4 опоры</strong></li>
                <li><span>Отношения</span><strong>Малик −8 · не ниже 0</strong></li>
                <li><span>Потрачено времени</span><strong>{cafeShiftLeaveMinutes} мин. · начато заказов: {cafeShiftStartedGuests}</strong></li>
              </ul>
              <div className="cafe-shift-leave-actions">
                <button type="button" className="cafe-shift-leave-cancel" autoFocus onClick={() => setShowCafeShiftLeaveConfirm(false)}>Остаться на смене</button>
                <button type="button" className="cafe-shift-leave-confirm" onClick={leaveCafeShiftEarly} aria-label="Покинуть смену со штрафом">Покинуть смену · принять штраф</button>
              </div>
            </section>
          </div>
        )}
        </>
      )}

      {activeAction && activeActivityKind && activeActivityScene && (
        <div className="action-transition-screen">
          <div className={`activity-stage activity-${activeActivityKind} action-${activeAction.action.id}`}><div className="activity-shot-label"><span>8-BIT CUT SCENE</span><b>{activeActivityScene.shot}</b></div><div className="activity-backdrop"><i className="set-a" /><i className="set-b" /><i className="set-c" /></div><div className="activity-person main"><i className="act-head" /><i className="act-body" /><i className="act-arm" /><i className="act-leg left" /><i className="act-leg right" /></div><div className="activity-person second"><i className="act-head" /><i className="act-body" /><i className="act-arm" /><i className="act-leg left" /><i className="act-leg right" /></div><div className="activity-prop"><i /><i /><i /></div><div className="activity-cutscene-props"><i className="prop-one" /><i className="prop-two" /><i className="prop-three" /><i className="prop-four" /></div></div>
          <section><p>ВЫПОЛНЯЕТСЯ · {locations.find((location) => location.id === activeAction.locationId)?.short}</p><h2>{activeAction.action.label}</h2><strong>{activeActivityScene.status}</strong><div className="action-progress-track"><span style={{ width: `${actionProgress}%` }} /></div><small>Игровое время: {formatTime(activeAction.startTime)} → {formatTime(activeAction.startTime + activeAction.action.hours)}</small></section>
        </div>
      )}

      {dayTransitionPhase && (
        <div className={`day-cycle-transition phase-${dayTransitionPhase}`}>
          <div className="cycle-sky"><i className="cycle-sun" /><i className="cycle-moon" /><span className="cycle-cloud one" /><span className="cycle-cloud two" /></div>
          <div className="cycle-city"><i /><i /><i /><i /><i /></div>
          <div className="cycle-window-row"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <section><p>{currentWeekday.name.toUpperCase()} · {dayTransitionPhase === "dawn" ? `ДЕНЬ ${day} · 06:00` : `ДЕНЬ ${day} · ${dayTransitionPhase === "sunset" ? "ВЕЧЕР" : "НОЧЬ"}`}</p><h2>{dayTransitionPhase === "sunset" ? "Париж замедляется" : dayTransitionPhase === "night" ? "Город засыпает" : "Начинается новое утро"}</h2><span>{dayTransitionPhase === "dawn" ? `${currentWeekday.name}: ${currentWeekday.focus.toLowerCase()}. Сначала выбери время подъёма.` : dayTransitionText}</span><div className="cycle-progress"><i className={dayTransitionPhase === "sunset" || dayTransitionPhase === "night" || dayTransitionPhase === "dawn" ? "active" : ""} /><i className={dayTransitionPhase === "night" || dayTransitionPhase === "dawn" ? "active" : ""} /><i className={dayTransitionPhase === "dawn" ? "active" : ""} /></div></section>
        </div>
      )}

      {showEventReveal && (
        <div className="modal-backdrop event-reveal-backdrop">
          <section className="event-reveal-modal">
            <div className={`event-poster event-poster-${currentCityEvent.period}`}><span>PARIS</span><i>{currentCityEvent.period === "evening" ? "☾" : "★"}</i><EventArtwork eventId={currentCityEvent.id} period={currentCityEvent.period} /><b>{currentWeekday.short}<br />ДЕНЬ {day}</b></div>
            <div className="event-reveal-copy"><p className="eyebrow ink">{currentCityEvent.kicker}</p><h2>{currentCityEvent.title}</h2><p>{currentCityEvent.body}</p><div className="event-place"><span>ГДЕ И КОГДА</span><strong>{currentCityEventLocation.label}</strong><small>{currentCityEventLocation.district} · {cityEventWindow} · занимает {currentCityEvent.hours} ч.</small><em className={`event-status-line ${cityEventStatus}`}>{cityEventStatusText}</em></div><div className="event-reveal-actions"><button className="pixel-button primary" onClick={() => animateCloseWindow(() => setShowEventReveal(false))}>{cityEventStatus === "missed" ? "Событие уже прошло · начать день" : "Запомнить расписание и начать день"}</button><button className="event-map-link" disabled={cityEventStatus === "missed"} onClick={() => animateCloseWindow(() => { setShowEventReveal(false); setSideTab("event"); setViewMode("map"); })}>Показать на карте →</button></div></div>
          </section>
        </div>
      )}

      {activeDialogue && activeDialogueDef && activeDialogueMission && activeDialogueRound && (
        <div className="modal-backdrop dialogue-backdrop">
          <section className="dialogue-modal visual-novel-dialogue" role="dialog" aria-modal="true" aria-label={`Разговор с ${activeDialogue.name}`} data-dialogue-stage={dialogueStage} data-turn-phase={dialogueTurnPhase}>
            <button className="modal-close" aria-label="Прервать разговор" onClick={() => animateCloseWindow(closeDialogue)}>×</button>
            <div className={`dialogue-speaker dialogue-speaker-bust vn-speaker is-${dialoguePortraitState}`} data-character-id={activeDialogue.id} data-portrait-state={dialoguePortraitState}>
              <div className={`dialogue-portrait-stage portrait-bust is-${dialoguePortraitState}`} key={`${activeDialogue.id}-${dialogueRoundIndex}-${dialoguePortraitState}`}>
                <div className="dialogue-portrait-crop"><PixelPortrait npc={activeDialogue} /></div>
                <i className="dialogue-portrait-glow" aria-hidden="true" />
              </div>
              <span>{activeDialogue.role}</span>
              <h2>{activeDialogue.name}</h2>
              <small>{currentLocation.label}</small>
              <div className="speaker-relationship"><span>{getRelationshipTitle(activeDialogueRelationship)}</span><i><b style={{ width: `${activeDialogueRelationship}%` }} /></i><strong>{activeDialogueRelationship}%{dialoguePendingRelationship > 0 && <em> +{dialoguePendingRelationship} после разговора</em>}</strong></div>
            </div>
            <div className="dialogue-content">
              <p className="eyebrow ink">{dialogueStage === "intro" ? "НОВОЕ ЗНАКОМСТВО" : `РАЗГОВОР · ${formatTime(time + dialogueElapsedMinutes / 60)} · ПРОШЛО ${dialogueElapsedMinutes} МИН.`}</p>
              {dialogueStage === "intro" && <><div className="character-introduction"><span>КТО ЭТО?</span><p>{activeDialogueDef.intro}</p></div><div className="conversation-context"><span>О чём заходит речь</span><strong>{activeDialogueMission.title}</strong><p>{activeDialogueMission.goal}</p></div><button className="pixel-button primary" onClick={() => setDialogueStage("choice")}>Поздороваться и представиться →</button></>}
              {dialogueStage === "choice" && (
                <div className={`dialogue-turn dialogue-turn-in dialogue-phase-${dialogueTurnPhase}`} key={`dialogue-turn-${dialogueRoundIndex}`}>
                  <div className="conversation-flow">{activeDialogueRounds.map((_, index) => <i key={index} className={index <= dialogueRoundIndex ? "active" : ""} />)}<span>тема: {activeDialogueMission.title}</span></div>
                  {dialogueTranscript.length > 0 && <div className="dialogue-transcript">{dialogueTranscript.slice(-4).map((line, index) => <p className={line.speaker} key={`${line.speaker}-${index}-${line.text}`}><span>{line.speaker === "player" ? profile.name : activeDialogue.name}</span>{line.text}</p>)}</div>}
                  <div
                    className={`dialogue-line-stage npc-line ${dialogueTextComplete ? "is-complete" : "is-typing"}`}
                    data-speaker={activeDialogue.id}
                    data-line-kind={dialogueTurnPhase}
                    role={!dialogueTextComplete ? "button" : undefined}
                    tabIndex={!dialogueTextComplete ? 0 : -1}
                    aria-label={!dialogueTextComplete ? `${activeDialogue.name} говорит. Нажмите, чтобы показать реплику целиком.` : `${activeDialogue.name}: ${dialogueLineSource}`}
                    onClick={revealCurrentDialogueLine}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      revealCurrentDialogueLine();
                    }}
                  >
                    <blockquote aria-hidden="true"><span className="dialogue-typewriter-text"><DialogueLineText text={dialogueVisibleText} source={dialogueLineSource} /></span>{!dialogueTextComplete && <i className="dialogue-typewriter-caret" />}</blockquote>
                    {!dialogueTextComplete && <small className="dialogue-reveal-hint">Нажмите или пробел — показать реплику целиком</small>}
                  </div>
                  {dialogueTurnPhase === "prompt" && (
                    <div className={`dialogue-choices ${canChooseDialogue ? "is-ready" : "is-locked"}`} aria-label="Варианты ответа" aria-busy={!canChooseDialogue}>
                      {activeDialogueRound.choices.map((choice) => <button key={choice.label} disabled={!canChooseDialogue} aria-disabled={!canChooseDialogue} onClick={() => chooseDialogue(choice)}><strong>{choice.label}</strong><b>→</b></button>)}
                    </div>
                  )}
                  {dialogueTurnPhase === "response" && <div className="dialogue-response-pause" aria-live="polite"><span>{activeDialogue.name} отвечает</span><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></div>}
                </div>
              )}
              {dialogueStage === "result" && <div className="dialogue-turn dialogue-response-in"><div className="dialogue-answer-name">{activeDialogue.name}</div><blockquote><DialogueLineText text={dialogueResult} /></blockquote><div className="dialogue-assignment-reveal"><span>ВЫ ДОГОВОРИЛИСЬ</span><strong>{activeDialogueMission.task}</strong><small><b>Что стало понятнее:</b> {activeDialogueMission.knowledge}</small></div><div className="dialogue-reward-note">Отношения, время и результаты будут засчитаны после завершения сцены.</div><button className="pixel-button primary" onClick={() => animateCloseWindow(completeDialogue)}>Завершить разговор и записать договорённость →</button></div>}
            </div>
          </section>
        </div>
      )}

      {tutorialStep >= 0 && (
        <div className="modal-backdrop tutorial-backdrop">
          <section className="tutorial-modal">
            <div className="tutorial-visual"><div className={`tutorial-icon step-${tutorialStep}`}><i /><i /><i /></div><div className="tutorial-progress">{tutorialSteps.map((_, index) => <span key={index} className={index <= tutorialStep ? "active" : ""} />)}</div></div>
            <div className="tutorial-copy"><button className="tutorial-skip" onClick={() => animateCloseWindow(() => { setTutorialStep(-1); setViewMode("scene"); })}>Пропустить обучение</button><p className="eyebrow ink">{tutorialSteps[tutorialStep].kicker}</p><h2>{tutorialSteps[tutorialStep].title}</h2><p>{tutorialSteps[tutorialStep].body}</p><div className="tutorial-tip"><b>ПОДСКАЗКА</b>{tutorialSteps[tutorialStep].tip}</div><button className="pixel-button primary" onClick={() => tutorialStep === 3 ? animateCloseWindow(nextTutorial) : nextTutorial()}>{tutorialStep === 3 ? "Начать первый день" : "Дальше →"}</button></div>
          </section>
        </div>
      )}

      {!awake && !activeEvent && !activeDialogue && !dayTransitionPhase && tutorialStep < 0 && !pendingTravel && (
        <div className="modal-backdrop morning-backdrop">
          <section className="morning-modal">
            <div className={`window-view sky-${sky}`}><div className="window-sun" /><div className="window-roofs" /><span>PARIS · {currentWeekday.name.toUpperCase()} · ДЕНЬ {day}</span></div>
            <div className="morning-copy"><p className="eyebrow ink">НЕДЕЛЯ {weekNumber} · {currentWeekday.french.toUpperCase()}</p><h2>Как начнётся {currentWeekday.name.toLowerCase()}?</h2><p>{currentWeekday.focus}. Сегодня в расписании {currentWeekday.duties.length} обязанности; выбор времени влияет на запас сил и количество дел.</p>
              <div className="wake-options">
                <button onClick={() => animateCloseWindow(() => wakeUp(7, 22, "Ранний подъём"))}><b>07:00</b><span>Ранний подъём</span><small>+22 силы · длинный день</small></button>
                <button onClick={() => animateCloseWindow(() => wakeUp(9, 32, "Спокойное утро"))}><b>09:00</b><span>Спокойное утро</span><small>+32 силы · баланс</small></button>
                <button onClick={() => animateCloseWindow(() => wakeUp(11, 45, "Выспаться"))}><b>11:00</b><span>Выспаться</span><small>+45 сил · меньше времени</small></button>
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
              {!eventResult ? <div className="story-choices">{activeEvent.choices.map((choice) => <button key={choice.label} onClick={() => chooseStory(choice)}><strong>{choice.label}</strong><small>{choice.hint}</small><span>→</span></button>)}</div> : <button className="pixel-button primary" onClick={() => animateCloseWindow(closeStory)}>Продолжить историю →</button>}
            </div>
          </section>
        </div>
      )}

      {showGameMenu && <div className="modal-backdrop game-menu-backdrop"><section className="game-menu-modal"><button className="modal-close" onClick={() => animateCloseWindow(() => setShowGameMenu(false))}>×</button><p className="eyebrow ink">ПАУЗА · ГЛАВА {year}/5</p><h2>Меню истории</h2><div className="game-menu-grid"><button onClick={() => animateCloseWindow(() => { setShowGameMenu(false); setTutorialStep(0); setViewMode("scene"); })}><i>?</i><span><strong>Обучение</strong><small>Ещё раз показать основы</small></span></button><button onClick={() => animateCloseWindow(() => { setShowGameMenu(false); setShowAchievements(true); })}><i>★</i><span><strong>Ачивки</strong><small>Открыто {unlockedAchievements.length} из {achievementDefs.length}</small></span></button><button onClick={() => animateCloseWindow(() => { setShowGameMenu(false); setShowJournal(true); })}><i>▤</i><span><strong>Журнал</strong><small>Решения и события истории</small></span></button><button onClick={() => animateCloseWindow(exitToTitle)}><i>↥</i><span><strong>Сохранить и выйти</strong><small>Вернуться на титульный экран</small></span></button></div></section></div>}

      {showJournal && <div className="modal-backdrop"><section className="journal-modal"><button className="modal-close" onClick={() => animateCloseWindow(() => setShowJournal(false))}>×</button><p className="eyebrow ink">CHRONIQUE</p><h2>Журнал {profile.name}</h2><div className="journal-list">{journal.map((entry, index) => <div key={`${entry}-${index}`}><span>{journal.length - index}</span><p>{entry}</p></div>)}</div></section></div>}
      {showAchievements && <div className="modal-backdrop achievement-backdrop"><section className="achievements-modal"><button className="modal-close" onClick={() => animateCloseWindow(() => setShowAchievements(false))}>×</button><p className="eyebrow ink">COLLECTION · {unlockedAchievements.length}/{achievementDefs.length}</p><h2>Ачивки новой жизни</h2><p>Открываются сами, когда ты исследуешь город, знакомишься с людьми и развиваешь персонажа.</p><div className="achievement-grid">{achievementDefs.map((achievement) => { const value = Math.min(getAchievementProgress(achievement), achievement.target); const unlocked = value >= achievement.target; return <article className={unlocked ? "unlocked" : "locked"} key={achievement.id}><i>{unlocked ? achievement.icon : "?"}</i><div><span>{unlocked ? "ОТКРЫТО" : "ЕЩЁ НЕ ОТКРЫТО"}</span><h3>{achievement.title}</h3><p>{achievement.description}</p><div className="achievement-track"><b style={{ width: `${(value / achievement.target) * 100}%` }} /></div><small>{value}/{achievement.target}</small></div></article>; })}</div></section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
