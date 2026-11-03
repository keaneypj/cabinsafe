/**
 * Table-setting diagrams for the Service Standards guide. Each setting is one place setting seen
 * from above, drawn by src/components/TableSettingDiagram.tsx.
 *
 * Coordinates are in a 320 × 212 box. The guest sits at the bottom edge. Utensils are drawn
 * pointing up (`rot: 90` turns them to lie across the table). Items are numbered in list order.
 */

export type PieceKind =
  | "plate"
  | "bowl"
  | "rectPlate"
  | "glass"
  | "cup"
  | "fork"
  | "knife"
  | "spoon"
  | "chopsticks"
  | "rest"
  | "napkin"
  | "towel"
  | "basket"
  | "warmer";

export interface Piece {
  kind: PieceKind;
  x: number;
  y: number;
  label: string;
  /** Radius for round pieces. */
  r?: number;
  /** Width and height for rectangular pieces. */
  w?: number;
  h?: number;
  /** Utensils: rotation in degrees and size (1 = full size). */
  rot?: number;
  scale?: number;
  /** Where to put the number, relative to the piece, when the default spot would overlap. */
  badge?: [number, number];
}

export interface TableSetting {
  title: string;
  pieces: Piece[];
  tips: string[];
}

export type TableSettingId = "breakfast" | "lunch" | "dinner" | "snack" | "american" | "italian" | "french" | "japanese" | "mexican" | "middleEastern";

// Shared positions so every setting lines up the same way.
const C = { x: 160, y: 118 };
const L1 = 102; // fork next to the plate
const L2 = 86; // outer fork
const R1 = 218; // knife
const R2 = 234; // spoon
const napkin = (x = 48): Piece => ({ kind: "napkin", x, y: C.y, w: 30, h: 60, label: "Napkin, folded" });
const breadPlate = (x = 88, y = 50): Piece[] => [
  { kind: "plate", x, y, r: 16, label: "Bread plate" },
  { kind: "knife", x, y, rot: 90, scale: 0.55, label: "Butter knife, across the bread plate", badge: [0, -24] },
];
const water = (x = 222, y = 48): Piece => ({ kind: "glass", x, y, r: 10, label: "Water glass, above the knife" });

export const TABLE_SETTINGS: Record<TableSettingId, TableSetting> = {
  breakfast: {
    title: "Breakfast",
    pieces: [
      { kind: "plate", x: C.x, y: C.y, r: 36, label: "Breakfast plate" },
      napkin(),
      { kind: "fork", x: L1, y: C.y, label: "Fork" },
      { kind: "knife", x: R1, y: C.y, label: "Knife, blade toward the plate" },
      { kind: "spoon", x: R2, y: C.y, scale: 0.8, label: "Teaspoon" },
      ...breadPlate(),
      { kind: "glass", x: 222, y: 46, r: 9, label: "Juice glass" },
      { kind: "cup", x: 272, y: 108, label: "Coffee cup on saucer, handle to the right" },
    ],
    tips: ["Bring coffee or tea first, before food is ordered.", "Butter, jam and honey go in small dishes above the plate."],
  },
  lunch: {
    title: "Lunch",
    pieces: [
      { kind: "plate", x: C.x, y: C.y, r: 36, label: "Lunch plate" },
      napkin(),
      { kind: "fork", x: L2, y: C.y, scale: 0.9, label: "Salad fork (outside, used first)" },
      { kind: "fork", x: L1, y: C.y, label: "Lunch fork" },
      { kind: "knife", x: R1, y: C.y, label: "Knife, blade toward the plate" },
      { kind: "spoon", x: R2, y: C.y, label: "Soup spoon" },
      ...breadPlate(),
      water(),
      { kind: "glass", x: 246, y: 62, r: 9, label: "Wine or iced tea glass" },
    ],
    tips: ["If there is no soup course, leave the soup spoon off.", "Serve the salad or starter on a plate placed on top of the lunch plate."],
  },
  dinner: {
    title: "Dinner",
    pieces: [
      { kind: "plate", x: C.x, y: C.y, r: 48, label: "Charger (service plate)", badge: [34, 34] },
      { kind: "plate", x: C.x, y: C.y, r: 36, label: "Dinner plate" },
      napkin(40),
      { kind: "fork", x: 80, y: C.y, scale: 0.9, label: "Salad fork (outside)" },
      { kind: "fork", x: 96, y: C.y, label: "Dinner fork" },
      { kind: "knife", x: 224, y: C.y, label: "Dinner knife, blade toward the plate" },
      { kind: "spoon", x: 240, y: C.y, label: "Soup spoon" },
      { kind: "spoon", x: C.x + 6, y: 50, rot: -90, scale: 0.75, label: "Dessert spoon, handle to the right", badge: [32, 0] },
      { kind: "fork", x: C.x - 6, y: 60, rot: 90, scale: 0.75, label: "Dessert fork, handle to the left", badge: [-32, 0] },
      ...breadPlate(80, 46),
      { kind: "glass", x: 226, y: 44, r: 10, label: "Water glass" },
      { kind: "glass", x: 252, y: 56, r: 10, label: "Red wine glass" },
      { kind: "glass", x: 276, y: 72, r: 9, label: "White wine glass" },
    ],
    tips: ["The charger stays until the main course is served; the dinner plate goes on top of it.", "Glasses go in the order they will be used, from right to left."],
  },
  snack: {
    title: "Snack or light bite",
    pieces: [
      { kind: "plate", x: 152, y: 122, r: 26, label: "Small plate" },
      { kind: "napkin", x: 82, y: 122, w: 26, h: 26, label: "Cocktail napkin" },
      { kind: "fork", x: 112, y: 122, scale: 0.7, label: "Small fork (if needed)" },
      { kind: "glass", x: 206, y: 72, r: 9, label: "Drink glass on a coaster" },
      { kind: "bowl", x: 214, y: 128, r: 14, label: "Small bowl for nuts or olives" },
    ],
    tips: ["Keep it light: one small plate, one napkin, one glass.", "Offer a second napkin with anything eaten by hand."],
  },
  american: {
    title: "American",
    pieces: [
      { kind: "plate", x: C.x, y: C.y, r: 38, label: "Dinner plate" },
      napkin(),
      { kind: "fork", x: L2, y: C.y, scale: 0.9, label: "Salad fork" },
      { kind: "fork", x: L1, y: C.y, label: "Dinner fork" },
      { kind: "knife", x: R1, y: C.y, label: "Steak or dinner knife" },
      { kind: "spoon", x: R2, y: C.y, scale: 0.8, label: "Teaspoon" },
      ...breadPlate(),
      water(),
      { kind: "glass", x: 246, y: 62, r: 9, label: "Iced tea or wine glass" },
    ],
    tips: ["Salad is usually served before the main course.", "Offer a steak knife when red meat is served."],
  },
  italian: {
    title: "Italian",
    pieces: [
      { kind: "plate", x: C.x, y: C.y, r: 48, label: "Charger", badge: [34, 34] },
      { kind: "bowl", x: C.x, y: C.y, r: 32, label: "Pasta bowl" },
      napkin(40),
      { kind: "fork", x: 96, y: C.y, label: "Fork" },
      { kind: "knife", x: 224, y: C.y, label: "Knife, for the main course" },
      { kind: "spoon", x: 240, y: C.y, label: "Spoon (only if the guest likes one with pasta)" },
      { kind: "spoon", x: C.x, y: 52, rot: -90, scale: 0.75, label: "Dessert spoon", badge: [32, 0] },
      { kind: "plate", x: 78, y: 48, r: 15, label: "Bread plate" },
      { kind: "bowl", x: 110, y: 40, r: 8, label: "Olive oil dish" },
      { kind: "glass", x: 226, y: 44, r: 10, label: "Water glass" },
      { kind: "glass", x: 252, y: 58, r: 10, label: "Wine glass" },
    ],
    tips: ["Pasta is a first course; clear the bowl before the main is served.", "Offer grated cheese at the table, never with seafood pasta unless asked."],
  },
  french: {
    title: "French",
    pieces: [
      { kind: "plate", x: C.x, y: C.y, r: 40, label: "Dinner plate" },
      napkin(),
      { kind: "fork", x: L2, y: C.y, scale: 0.9, label: "Starter fork (tines may face down, French style)" },
      { kind: "fork", x: L1, y: C.y, label: "Main fork" },
      { kind: "knife", x: R1, y: C.y, label: "Main knife" },
      { kind: "spoon", x: C.x + 6, y: 52, rot: -90, scale: 0.75, label: "Dessert spoon", badge: [32, 0] },
      { kind: "fork", x: C.x - 6, y: 62, rot: 90, scale: 0.75, label: "Dessert fork", badge: [-32, 0] },
      ...breadPlate(),
      { kind: "glass", x: 222, y: 44, r: 10, label: "Water glass" },
      { kind: "glass", x: 248, y: 56, r: 10, label: "Red wine glass" },
      { kind: "glass", x: 272, y: 72, r: 9, label: "White wine glass" },
    ],
    tips: ["A cheese course comes before dessert; set a small knife for it.", "Bread may go straight on the table cloth if the guest prefers."],
  },
  japanese: {
    title: "Japanese and sushi",
    pieces: [
      { kind: "rectPlate", x: C.x, y: 112, w: 108, h: 46, label: "Sushi plate" },
      { kind: "chopsticks", x: C.x, y: 168, label: "Chopsticks, tips to the left", badge: [56, 0] },
      { kind: "rest", x: 110, y: 168, label: "Chopstick rest", badge: [0, 14] },
      { kind: "bowl", x: 236, y: 92, r: 12, label: "Soy sauce dish" },
      { kind: "bowl", x: 92, y: 68, r: 12, label: "Dish for ginger and wasabi" },
      { kind: "bowl", x: 252, y: 146, r: 16, label: "Miso soup bowl with lid" },
      { kind: "towel", x: 56, y: 140, w: 36, h: 12, label: "Hot towel (oshibori)", badge: [0, 18] },
      { kind: "glass", x: 226, y: 42, r: 9, label: "Green tea cup" },
      { kind: "glass", x: 254, y: 52, r: 10, label: "Water or sake glass" },
    ],
    tips: ["Offer the hot towel before the meal.", "Never stand chopsticks upright in rice, and offer a fork without making a point of it."],
  },
  mexican: {
    title: "Mexican",
    pieces: [
      { kind: "plate", x: C.x, y: C.y, r: 38, label: "Dinner plate" },
      napkin(),
      { kind: "fork", x: L1, y: C.y, label: "Fork" },
      { kind: "knife", x: R1, y: C.y, label: "Knife" },
      { kind: "spoon", x: R2, y: C.y, label: "Spoon" },
      { kind: "warmer", x: 82, y: 46, r: 18, label: "Tortilla warmer" },
      { kind: "bowl", x: 124, y: 44, r: 11, label: "Salsa bowl" },
      { kind: "bowl", x: 154, y: 40, r: 11, label: "Guacamole bowl" },
      water(),
      { kind: "glass", x: 248, y: 60, r: 10, label: "Agua fresca or margarita glass" },
    ],
    tips: ["Keep tortillas covered in the warmer so they stay soft.", "Put lime wedges in a small dish next to the salsa."],
  },
  middleEastern: {
    title: "Middle Eastern",
    pieces: [
      { kind: "plate", x: C.x, y: 122, r: 36, label: "Dinner plate" },
      napkin(),
      { kind: "fork", x: L1, y: 122, label: "Fork" },
      { kind: "knife", x: R1, y: 122, label: "Knife" },
      { kind: "spoon", x: R2, y: 122, label: "Spoon" },
      { kind: "basket", x: 80, y: 48, w: 40, h: 26, label: "Flatbread basket" },
      { kind: "bowl", x: 128, y: 48, r: 11, label: "Mezze dish (hummus)" },
      { kind: "bowl", x: 158, y: 42, r: 11, label: "Mezze dish (tabbouleh)" },
      { kind: "bowl", x: 188, y: 48, r: 11, label: "Mezze dish (olives)" },
      { kind: "glass", x: 224, y: 50, r: 10, label: "Water glass" },
      { kind: "glass", x: 250, y: 64, r: 8, label: "Tea glass" },
    ],
    tips: ["Mezze can be shared; offer a serving spoon with each dish.", "Offer mint tea or cardamom coffee after the meal."],
  },
};
