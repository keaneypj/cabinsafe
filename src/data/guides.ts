/**
 * The four mock guides on the Documents page. They open as scroll-through, PDF-style pages
 * (see src/app/documents/guide/[slug]/page.tsx).
 *
 * All of this is generic demonstration content written for CabinSafe. It is not Gulfstream or
 * operator material, and it must not be used for real flight operations.
 *
 * To edit a guide, change the text below. Each section starts a new page; `h3` blocks are
 * sub-headings and also appear in the contents list. `setting` blocks draw a table-setting
 * diagram from src/data/tableSettings.ts.
 */

import type { TableSettingId } from "./tableSettings";

export type GuideBlock =
  | { type: "p"; text: string }
  | { type: "h3"; id: string; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "note"; text: string }
  | { type: "setting"; id: TableSettingId };

export interface GuideSection {
  id: string;
  title: string;
  blocks: GuideBlock[];
}

export interface Guide {
  slug: string;
  title: string;
  /** One line under the title on the cover and on the Documents page. */
  summary: string;
  docNo: string;
  sections: GuideSection[];
}

export const MOCK_STAMP = "MOCK DOCUMENT - For Demonstration Only";
export const MOCK_DISCLAIMER =
  "Generic content written for the CabinSafe demonstration. This is not Gulfstream or operator material and is not approved for flight operations. Always follow the operator's approved manuals and your training.";

const p = (text: string): GuideBlock => ({ type: "p", text });
const h3 = (id: string, text: string): GuideBlock => ({ type: "h3", id, text });
const ul = (...items: string[]): GuideBlock => ({ type: "list", items });
const ol = (...items: string[]): GuideBlock => ({ type: "list", items, ordered: true });
const note = (text: string): GuideBlock => ({ type: "note", text });
const table = (head: string[], ...rows: string[][]): GuideBlock => ({ type: "table", head, rows });
const setting = (id: TableSettingId): GuideBlock => ({ type: "setting", id });

const ABOUT_NOTE = note("This is a mock document. Layouts, part names and settings vary from aircraft to aircraft. Confirm everything against the aircraft you are flying and the operator's approved manuals.");

// ───────────────────────── a) G700 Cabin Familiarization ─────────────────────────

const cabin: Guide = {
  slug: "cabin-familiarization",
  title: "G700 Cabin Familiarization",
  summary: "Cabin zones, seating, cabin systems, storage, beds and crew rest",
  docNo: "MOCK-CAB-100",
  sections: [
    {
      id: "about",
      title: "About This Guide",
      blocks: [
        p("This guide walks a new cabin host through a typical large-cabin business jet laid out like the demonstration aircraft in CabinSafe. Read it before your first trip, then keep it handy for the walkaround."),
        ul("Section 2 explains the cabin zones used throughout the app.", "Sections 3 to 6 cover seats and the systems passengers touch most: lighting, entertainment, Wi-Fi and temperature.", "Sections 7 to 9 cover storage, bed conversion and the crew rest area."),
        ABOUT_NOTE,
      ],
    },
    {
      id: "layout",
      title: "Cabin Layout and Zones",
      blocks: [
        p("The cabin is split into zones from front to back. CabinSafe uses the same names on the cabin map, the checklists and the equipment list, so everyone means the same place."),
        table(
          ["Zone", "What is there"],
          ["Flight deck", "Pilots' seats and controls. Enter only when invited by the flight crew."],
          ["Galley", "Forward galley beside the main entry door: ovens, coffee and espresso, chillers, sink and storage."],
          ["Crew rest", "Forward, opposite the galley: a seat that converts to a berth, with a curtain."],
          ["Zone 1", "Forward club seating: four seats facing each other around fold-out tables."],
          ["Zone 2", "Conference and dining group: four seats around a table that extends for meals."],
          ["Zone 3", "Lounge: three-place divan opposite two single seats."],
          ["Zone 4", "Second lounge or media room with the large monitor."],
          ["Zone 5", "Principal's stateroom: fixed bed or convertible divan, wardrobe and private washroom."],
          ["Aft", "Aft washroom and the baggage compartment, reachable in flight."],
        ),
        p("The main entry door is at the front on the left. Overwing emergency exits are on both sides of the cabin; the Safety Guide shows where."),
      ],
    },
    {
      id: "seating",
      title: "Seating and Divan Configurations",
      blocks: [
        h3("seat-controls", "Single seats"),
        p("Each single seat swivels, moves along a track toward the aisle or window, and reclines fully into a flat berth. Controls are on the inboard armrest: a button panel for recline and leg rest, and a lever or button to release the swivel and track."),
        ul("Before takeoff and landing, every occupied seat must face the direction shown on its placard, sit fully upright, and be locked in track and swivel.", "Headrests and leg rests return to stowed.", "Seat belts are fastened and low and tight across the lap."),
        h3("seat-divans", "Divans"),
        p("A divan is a sofa along the cabin wall. Only the places marked on the placard may be used for taxi, takeoff and landing, and only with their seat belts fastened. Cushions lift for storage underneath."),
        h3("seat-configs", "Common setups"),
        table(
          ["Setup", "How it is arranged", "Good for"],
          ["Club four", "Four seats facing in pairs", "Working, conversation"],
          ["Dining", "Table extended between four seats", "Plated meals for up to four"],
          ["Lounge", "Divan plus facing seats", "Relaxing, small groups"],
          ["Sleep", "Seats and divan made into beds", "Overnight legs"],
        ),
      ],
    },
    {
      id: "cms",
      title: "Cabin Management System and Lighting",
      blocks: [
        p("The cabin management system (CMS) controls lights, window shades, temperature, monitors and audio. It can be used from the touch panel in the galley, from the seat-side panels, or from the cabin app on a paired phone or tablet."),
        h3("cms-scenes", "Lighting scenes"),
        table(
          ["Scene", "What it does", "When to use"],
          ["Boarding", "Bright, warm white throughout", "Boarding and stepping off"],
          ["Dining", "Table lights up, ceiling softened", "Meal service"],
          ["Relax", "Low warm light, accent lighting on", "After the meal"],
          ["Sleep", "Ceiling off, floor path lights on", "Rest periods"],
          ["Circadian", "Shifts color through the flight to ease jet lag", "Long overnight legs"],
        ),
        h3("cms-shades", "Window shades and reading lights"),
        ul("Shades open or close per window, per zone, or all at once from the galley panel.", "Reading lights are on each seat panel. Set them low before passengers sleep.", "Ask the flight crew before opening shades during taxi at night, and close them on request for sleeping passengers."),
        h3("cms-reset", "If something stops responding"),
        ol("Try the same control from a different panel.", "Close and reopen the cabin app.", "Tell the flight crew. Do not pull circuit breakers or cycle power yourself."),
      ],
    },
    {
      id: "ife",
      title: "Entertainment and Wi-Fi",
      blocks: [
        h3("ife-screens", "Screens and audio"),
        p("Each zone has a monitor that can show the moving map, live TV where available, movies from the onboard library, or a passenger's own device by casting or HDMI. Audio plays through cabin speakers or Bluetooth headphones."),
        ul("Choose a source for each zone from the CMS panel.", "Keep spare headphones charged and in their case.", "Set the moving map on the forward monitor at boarding unless the principal prefers otherwise (see Preferences)."),
        h3("ife-wifi", "Wi-Fi"),
        ol("Confirm with the flight crew that the connection is available for this route.", "Give passengers the network name from the cabin card.", "Share the password in person. Never write it on a public surface or post it in a group chat.", "Expect short drop-outs over oceans and on some routes."),
        note("If passengers report slow Wi-Fi, ask them to pause large downloads and video calls first, then let the flight crew know."),
      ],
    },
    {
      id: "temperature",
      title: "Temperature Controls",
      blocks: [
        p("Temperature can be set separately for the forward, middle and aft parts of the cabin from the CMS. Changes take several minutes to be felt, so adjust early."),
        ul("Pre-cool or pre-warm the cabin before boarding. Ask the flight crew to start air conditioning in time.", "A comfortable starting point is around 70 to 72°F (21 to 22°C). Check the principal's preference in the Preferences tab.", "Passengers usually want it a little cooler for sleeping and a little warmer after waking.", "With the entry door open in hot weather, the cabin heats quickly. Close the door as soon as boarding is complete."),
        note("If a zone will not reach its set temperature, tell the flight crew rather than changing settings repeatedly."),
      ],
    },
    {
      id: "storage",
      title: "Storage Locations",
      blocks: [
        p("Everything has a home. Put things back in the same place every trip so the next cabin host can find them."),
        table(
          ["What", "Where"],
          ["Blankets and pillows", "Overhead bins in Zones 3 and 5, and under divan cushions"],
          ["Bedding kits and duvets", "Stateroom wardrobe, lower shelf"],
          ["Amenity kits and slippers", "Galley drawer G-4 and the aft washroom cabinet"],
          ["Spare headphones and chargers", "Galley drawer G-2"],
          ["Magazines and newspapers", "Side-ledge pockets in each zone"],
          ["Coats and garment bags", "Forward closet beside the entry door"],
          ["Passenger luggage", "Aft baggage compartment; small bags under seats or in the closet"],
          ["Cleaning supplies", "Galley lower cabinet, kept away from food"],
        ),
        note("Nothing heavy goes in overhead bins, and every door and drawer is latched for taxi, takeoff and landing."),
      ],
    },
    {
      id: "beds",
      title: "Bed Conversion",
      blocks: [
        h3("beds-seats", "Two facing seats into a bed"),
        ol("Clear the table and fold it away.", "Move both seats fully inboard on their tracks.", "Recline each seat to flat and raise the leg rests.", "Fit the mattress pad across both seats so there is no gap.", "Make the bed: fitted sheet, duvet, two pillows, then turn down one corner."),
        h3("beds-divan", "Divan into a bed"),
        ol("Remove the back cushions and store them in the bin above.", "Pull the divan base out until it locks.", "Lay the mattress pad, then make the bed as above."),
        h3("beds-return", "Before landing"),
        p("All beds go back to seats and divans before landing, with belts available. Allow at least 20 minutes, and start early if several beds are made up."),
      ],
    },
    {
      id: "crew-rest",
      title: "Crew Rest Area",
      blocks: [
        p("The crew rest area is forward, across from the galley. It has a seat that reclines into a berth, a curtain, a reading light, a call chime and its own air outlet."),
        ul("It is for crew rest only. Do not store passenger bags or catering there.", "Agree rest times with the flight crew before departure on long legs.", "Keep the curtain open and the area tidy during taxi, takeoff and landing.", "Leave a phone or tablet on silent so the call chime is the only sound you need to listen for."),
      ],
    },
    {
      id: "quick-ref",
      title: "Quick Reference Before Boarding",
      blocks: [
        ul(
          "Lights set to Boarding; shades as the principal prefers.",
          "Temperature at the preferred setting and settling.",
          "Seats upright, belts crossed, tables stowed or set.",
          "Monitors on the moving map; Wi-Fi card at each seat.",
          "Blankets, pillows and amenity kits stocked.",
          "Washrooms clean and stocked.",
          "Crew rest area tidy and clear.",
        ),
      ],
    },
  ],
};

// ───────────────────────── b) Galley Guide ─────────────────────────

const galley: Guide = {
  slug: "galley-guide",
  title: "Galley Guide",
  summary: "Ovens, coffee, water, chillers, cleaning and food safety",
  docNo: "MOCK-GAL-200",
  sections: [
    {
      id: "about",
      title: "About This Guide",
      blocks: [
        p("This guide covers the forward galley of the demonstration aircraft: what each unit does, how to use it safely, and how to keep food at safe temperatures from catering to table."),
        ABOUT_NOTE,
      ],
    },
    {
      id: "layout",
      title: "Galley Layout",
      blocks: [
        table(
          ["Unit", "Where", "Notes"],
          ["Convection oven", "Upper left", "Main oven for reheating plated meals"],
          ["Steam oven", "Below the convection oven", "Gentle reheating; keeps food moist"],
          ["Microwave", "Upper right", "Small items only"],
          ["Espresso and coffee machine", "Center counter", "Plumbed to the aircraft water system"],
          ["Sink and tap", "Counter, right", "Hot and cold potable water"],
          ["Chillers", "Under the counter, left and right", "Food on the left, drinks on the right"],
          ["Wine chiller", "Tall unit by the entry door", "Two temperature zones"],
          ["Drawers G-1 to G-8", "Below the counter", "Labeled; see Storage"],
          ["Trash compactor", "Lower right", "Empty after every leg"],
        ),
        p("The galley control panel shows which units have power and lets you switch each one on or off."),
      ],
    },
    {
      id: "ovens",
      title: "Ovens and How to Use Them",
      blocks: [
        h3("ovens-convection", "Convection oven"),
        ol("Switch the oven on at the galley panel.", "Choose the mode (convection or bake) and set the temperature.", "Let it preheat; the ready light comes on when it reaches temperature.", "Load food on the oven racks. Use the oven-safe dishes provided.", "Set the timer and stay in the galley while the oven is on.", "Use oven mitts to unload, then switch the oven off when you are done."),
        h3("ovens-steam", "Steam oven"),
        ol("Fill the water reservoir to the line, or check the plumbed supply light is on.", "Choose steam or combination mode and set the temperature.", "Reheat, then wipe out any water left in the cavity when it cools."),
        h3("ovens-times", "Guide reheating times"),
        table(
          ["Food", "Mode", "Temperature", "About"],
          ["Plated main course", "Convection", "300°F / 150°C", "15–20 min"],
          ["Fish fillet", "Steam", "212°F / 100°C", "8–10 min"],
          ["Bread rolls", "Convection", "300°F / 150°C", "4–6 min"],
          ["Vegetables", "Steam", "212°F / 100°C", "5–7 min"],
          ["Pastries", "Convection", "320°F / 160°C", "5–7 min"],
        ),
        note("Times are a starting point only. Always check that food reaches the safe temperatures in Section 9."),
        h3("ovens-safety", "Oven safety"),
        ul("Never leave a working oven unattended.", "Check the oven placard before using foil or paper; some ovens do not allow them.", "Keep the door closed if anything inside catches fire, switch the oven off, and tell the flight crew right away.", "Allow ovens to cool before cleaning."),
      ],
    },
    {
      id: "coffee",
      title: "Coffee and Espresso Machine",
      blocks: [
        h3("coffee-setup", "Setting up"),
        ol("Switch the machine on and wait for the ready light.", "Run a short rinse through the group head and steam wand.", "Fill the bean hopper or load capsules, and check the milk is chilled.", "Make a test shot and taste it before passengers board."),
        h3("coffee-making", "Making drinks"),
        table(
          ["Drink", "How"],
          ["Espresso", "One shot, about 1 fl oz (30 ml), in a warmed cup"],
          ["Americano", "One or two shots topped with hot water"],
          ["Cappuccino", "One shot, equal parts steamed milk and foam"],
          ["Latte", "One shot, mostly steamed milk, thin foam"],
          ["Flat white", "Two shots, thin silky milk"],
          ["Filter coffee", "Brew a carafe; keep hot for no more than 30 minutes"],
        ),
        h3("coffee-cleaning", "Cleaning"),
        ul("Purge and wipe the steam wand after every milk drink.", "Empty the drip tray and grounds bin after each service.", "At the end of each trip, run the cleaning cycle, then rinse.", "Descale on the schedule printed on the machine."),
        note("If the machine shows a fault or leaks, switch it off at the galley panel and report it in the handover form."),
      ],
    },
    {
      id: "water",
      title: "Water and Ice",
      blocks: [
        h3("water-system", "Potable water"),
        ul("Check the water level on the galley panel before each trip, and ask for a top-up if needed.", "Run the tap for 30 seconds before the first use of the day.", "Use bottled water for drinks unless the operator says otherwise.", "Keep a stock of still and sparkling water chilled."),
        h3("water-ice", "Ice"),
        ul("Order ice from the caterer or FBO in sealed food-grade bags.", "Store ice in the ice drawer or in its sealed bags in the drain bin.", "Always use the ice scoop. Never scoop ice with a glass or your hands.", "Throw away ice that has been left open or touched."),
      ],
    },
    {
      id: "chillers",
      title: "Refrigeration and Chillers",
      blocks: [
        table(
          ["Unit", "Keep at"],
          ["Food chiller", "34–40°F (1–4°C)"],
          ["Drinks chiller", "38–45°F (3–7°C)"],
          ["Wine chiller, white and sparkling", "45–50°F (7–10°C)"],
          ["Wine chiller, red", "55–60°F (13–16°C)"],
        ),
        ul("Switch chillers on early so they are cold before catering arrives.", "Raw and ready-to-eat foods go on separate shelves, ready-to-eat on top.", "Do not overpack. Air needs to move around food to keep it cold.", "Keep doors shut; check the temperature display each time you open one.", "Empty and wipe chillers at the end of every trip."),
      ],
    },
    {
      id: "storage",
      title: "Storage",
      blocks: [
        table(
          ["Drawer", "Contents"],
          ["G-1", "Cutlery and serving utensils"],
          ["G-2", "Headphones, chargers and spare batteries"],
          ["G-3", "Napkins, placemats and table linen"],
          ["G-4", "Amenity kits, slippers and eye masks"],
          ["G-5", "Tea, coffee, sugar and snacks"],
          ["G-6", "China: plates and bowls"],
          ["G-7", "Glassware in padded inserts"],
          ["G-8", "Foil, wrap, containers and labels"],
        ),
        ul("Heavy items go low; glass always goes in its padded insert.", "Label opened items with the date.", "Latch every drawer, cabinet and oven door for taxi, takeoff, landing and turbulence."),
      ],
    },
    {
      id: "cleaning",
      title: "Cleaning and Sanitizing",
      blocks: [
        p("Clean first to remove dirt and food, then sanitize to kill germs. Sanitizer does not work well on a dirty surface."),
        h3("cleaning-when", "When"),
        table(
          ["When", "What"],
          ["Before catering is loaded", "Counters, chillers and drawers wiped and sanitized"],
          ["After each service", "Counters, sink and spills cleaned; trash bagged"],
          ["End of each leg", "Ovens, coffee machine, chillers and sink cleaned; trash removed"],
          ["End of each trip", "Full clean-down; record anything not done in the handover form"],
        ),
        h3("cleaning-how", "How"),
        ol("Wear gloves.", "Clear and scrape the surface.", "Wash with warm water and detergent, then rinse.", "Apply food-safe sanitizer and leave it for the time on the label.", "Air-dry or wipe with a clean disposable towel."),
        ul("Use separate color-coded cloths for food areas and washrooms.", "Store chemicals in the lower cabinet, never above food."),
      ],
    },
    {
      id: "food-safety",
      title: "Catering Handling and Food Safety Temperatures",
      blocks: [
        h3("food-receiving", "Receiving catering"),
        ul("Check the order against the catering sheet, item by item.", "Check that cold food is cold and hot food is hot (see the table below).", "Check seals, use-by dates and labels.", "Check allergen labels against the passenger list. Keep allergen-free meals sealed and separate.", "Refuse anything warm that should be cold, damaged, or unlabeled."),
        h3("food-temps", "Safe temperatures"),
        table(
          ["What", "Temperature"],
          ["Cold holding", "41°F (5°C) or colder"],
          ["Hot holding", "135°F (57°C) or hotter"],
          ["Reheating", "165°F (74°C) in the center, checked with a probe thermometer"],
          ["Danger zone", "Between 41°F and 135°F (5°C and 57°C)"],
        ),
        note("Food should not spend more than 4 hours in total in the danger zone, including time before it reached the aircraft. When in doubt, throw it out."),
        h3("food-tips", "Good habits"),
        ul("Wash hands before handling food and after clearing.", "Clean the probe thermometer between foods.", "Use separate boards and utensils for allergen-free meals.", "Label leftovers with the time; offload or discard them at the end of the trip."),
      ],
    },
  ],
};

// ───────────────────────── c) Service Standards ─────────────────────────

const service: Guide = {
  slug: "service-standards",
  title: "Service Standards",
  summary: "Boarding, drinks, meals, clearing, turndown and table settings",
  docNo: "MOCK-SVC-300",
  sections: [
    {
      id: "about",
      title: "About This Guide",
      blocks: [
        p("Good service on a private aircraft feels personal and unhurried. This guide sets out the order of service and how each table should look, so every trip feels the same no matter who is hosting."),
        ul("Always check the Preferences tab before a trip. A passenger's own wishes come before anything in this guide.", "Anticipate, don't interrupt. Watch for cues instead of asking repeatedly.", "Keep the cabin calm and tidy at all times."),
        ABOUT_NOTE,
      ],
    },
    {
      id: "greeting",
      title: "Greeting and Boarding",
      blocks: [
        ol(
          "Stand at the foot of the stairs or at the door, in uniform, before passengers arrive.",
          "Greet each passenger by name, and introduce yourself to new guests.",
          "Offer to take coats and small bags. Hang coats in the forward closet.",
          "Show new guests to their seats and point out the washroom.",
          "Offer the welcome drink from the preferences list, with a cold towel in warm weather.",
          "Give the safety briefing once everyone is seated, calmly and briefly.",
          "Let the flight crew know when the cabin is ready and the door can be closed.",
        ),
        note("Learn names before the trip. Use titles and surnames unless the passenger asks otherwise."),
      ],
    },
    {
      id: "beverage",
      title: "Beverage Service",
      blocks: [
        ul(
          "Serve from the right of the passenger and clear from the right.",
          "Hold glasses by the stem or base, never by the rim.",
          "Always serve on a coaster or cocktail napkin, logo facing the passenger.",
          "Offer still or sparkling water with every drink.",
          "Present wine with the label toward the guest, pour a taste for the host, then serve guests first.",
          "Refill before a glass is empty; ask before topping up wine.",
          "Remove empty glasses promptly, without reaching across a passenger.",
        ),
        table(
          ["Drink", "Glass", "Fill to"],
          ["Water", "Water goblet or tumbler", "Three-quarters"],
          ["White wine", "White wine glass", "One-third"],
          ["Red wine", "Red wine glass", "One-third"],
          ["Champagne", "Flute or tulip", "Two-thirds"],
          ["Spirits", "Rocks glass", "Standard measure"],
          ["Juice", "Small tumbler", "Three-quarters"],
        ),
      ],
    },
    {
      id: "meal-flow",
      title: "Meal Service Flow",
      blocks: [
        ol(
          "Confirm timing with the principal: when they would like to eat and how many courses.",
          "Set the table from the diagrams in Sections 7 and 8.",
          "Offer bread and butter, then pour water and wine.",
          "Serve each course from the left; serve the principal and guests of honor first.",
          "Clear each course only when everyone at the table has finished.",
          "Before dessert, clear everything except glasses, and crumb the table.",
          "Offer dessert, coffee, tea and digestifs.",
        ),
        note("Re-check allergies before each course leaves the galley. Allergen-free meals are plated first with clean utensils."),
      ],
    },
    {
      id: "clearing",
      title: "Clearing",
      blocks: [
        ul(
          "Clear from the right, quietly, one or two plates at a time. Never stack plates in front of a passenger.",
          "Knife and fork placed together on the plate means finished. If unsure, ask quietly.",
          "Remove condiments and bread plates before dessert.",
          "Crumb the table with a crumber or folded napkin onto a small plate.",
          "Wipe and stow the table once the meal is over and passengers have moved away.",
        ),
      ],
    },
    {
      id: "turndown",
      title: "Turndown and Bed Service",
      blocks: [
        ol(
          "Ask when the passenger would like their bed, and in which zone.",
          "Make up the bed as in the Cabin Familiarization guide, with the duvet turned down at one corner.",
          "Place pillows as preferred, with an eye mask, earplugs and a bottle of water on the side ledge.",
          "Set lights to Sleep, close shades, and set the temperature slightly cooler.",
          "Leave slippers beside the bed and pajamas folded on it if provided.",
          "Agree a wake-up time and what the passenger would like on waking.",
        ),
      ],
    },
    {
      id: "settings-meals",
      title: "Table Settings by Meal",
      blocks: [
        p("These drawings look down on one place setting. Numbers on the drawing match the list under it. Settings sit about an inch (2–3 cm) from the table edge; cutlery is used from the outside in."),
        h3("setting-breakfast", "Breakfast"),
        setting("breakfast"),
        h3("setting-lunch", "Lunch"),
        setting("lunch"),
        h3("setting-dinner", "Dinner"),
        setting("dinner"),
        h3("setting-snack", "Snack or light bite"),
        setting("snack"),
      ],
    },
    {
      id: "settings-cuisine",
      title: "Table Settings by Cuisine",
      blocks: [
        p("Start from the meal setting above, then adjust for the cuisine. Match the passenger's preferences where they differ."),
        h3("setting-american", "American"),
        setting("american"),
        h3("setting-italian", "Italian"),
        setting("italian"),
        h3("setting-french", "French"),
        setting("french"),
        h3("setting-japanese", "Japanese and sushi"),
        setting("japanese"),
        h3("setting-mexican", "Mexican"),
        setting("mexican"),
        h3("setting-middle-eastern", "Middle Eastern"),
        setting("middleEastern"),
      ],
    },
  ],
};

// ───────────────────────── d) Safety Guide ─────────────────────────

const safety: Guide = {
  slug: "safety-guide",
  title: "Safety Guide",
  summary: "Emergency equipment, oxygen, fire, first aid and AED, exits, turbulence and medical",
  docNo: "MOCK-SAF-400",
  sections: [
    {
      id: "about",
      title: "About This Guide",
      blocks: [
        p("This guide brings the cabin safety basics together in one place: where the emergency equipment is, and the general steps for fire, oxygen, first aid, evacuation, turbulence and medical situations."),
        note("This is a mock document for demonstration only. It is not an approved emergency procedure. Real emergency procedures come from the operator's approved manuals and your recurrent training, and the flight crew's instructions always come first."),
      ],
    },
    {
      id: "equipment",
      title: "Emergency Equipment and Locations",
      blocks: [
        p("The cabin map in the Cabin tab shows each item below. Check every item during the pre-boarding walkaround."),
        table(
          ["Code", "Item", "Where"],
          ["FE-01", "Fire extinguisher", "Flight deck"],
          ["FE-02", "Fire extinguisher", "Galley"],
          ["FE-03", "Fire extinguisher", "Zone 3"],
          ["FE-04", "Fire extinguisher", "Aft"],
          ["PBE-01", "Protective breathing equipment (smoke hood)", "Flight deck"],
          ["PBE-02", "Protective breathing equipment (smoke hood)", "Galley"],
          ["O2-01", "Portable oxygen bottle", "Zone 1"],
          ["O2-02", "Portable oxygen bottle", "Zone 4"],
          ["AED-01", "Automated external defibrillator", "Galley"],
          ["EMK-01", "Emergency medical kit", "Galley"],
          ["TMS-01", "Telemedical link kit", "Galley"],
          ["FAK-01", "First-aid kit", "Zone 2"],
          ["FAK-02", "First-aid kit", "Zone 5"],
          ["FL-01 to FL-04", "Flashlights", "Galley, Zone 2, Zone 4, Zone 5"],
        ),
        ul("Each item should be in place, sealed or charged, and in date.", "Report anything missing, opened or out of date before passengers board."),
      ],
    },
    {
      id: "oxygen",
      title: "Oxygen",
      blocks: [
        h3("oxygen-masks", "Passenger masks"),
        p("If the cabin loses pressure, masks drop from the ceiling or seat panels. Put your own mask on first, then help others."),
        ol("Pull the mask toward you to start the flow.", "Place it over the nose and mouth and tighten the strap.", "Breathe normally.", "Keep it on until the flight crew says it is safe to remove."),
        h3("oxygen-portable", "Portable oxygen bottles"),
        p("Portable bottles are used to move around the cabin during a pressure loss and for first aid when a passenger feels unwell."),
        ul("Pre-flight: gauge in the green, mask attached and sealed in its bag, bottle secure in its bracket.", "Keep oxygen away from flames, heat, oil and grease. No smoking.", "Note the time you started and the flow setting, and tell the flight crew."),
      ],
    },
    {
      id: "fire",
      title: "Fire Extinguishers",
      blocks: [
        p("Any smoke or fire is reported to the flight crew straight away, even if it seems small."),
        h3("fire-steps", "General steps"),
        ol("Find the source. Tell the flight crew and any other crew member.", "Take the nearest extinguisher, and a smoke hood if there is smoke.", "Pull the pin, aim at the base of the fire, squeeze the handle and sweep side to side.", "Keep watching the area after the fire is out in case it reignites.", "Move passengers away from smoke and keep them low."),
        h3("fire-galley", "Galley and oven fires"),
        ul("Keep the oven door closed and switch the unit off at the galley panel.", "Only open the door to use an extinguisher if the fire continues."),
        h3("fire-battery", "Phone, tablet or laptop fires"),
        ul("Tell the flight crew. Do not pick up a burning device.", "Use an extinguisher on flames, then follow your training for cooling the device and moving it to a containment bag."),
      ],
    },
    {
      id: "first-aid",
      title: "First Aid and AED",
      blocks: [
        h3("aid-kits", "Kits"),
        table(
          ["Kit", "Use for"],
          ["First-aid kits (FAK-01, FAK-02)", "Cuts, burns, sprains and minor illness"],
          ["Emergency medical kit (EMK-01)", "Serious illness; used with medical advice"],
          ["Telemedical link (TMS-01)", "Talking to a doctor on the ground"],
        ),
        h3("aid-aed", "Using the AED"),
        ol("Check for response and normal breathing. Call for help and tell the flight crew.", "Start chest compressions if the person is not breathing normally.", "Switch on the AED and follow its voice prompts.", "Place the pads as shown on the pad pictures.", "Make sure no one is touching the person when the AED analyzes or advises a shock.", "Keep going until the person recovers or medical help takes over."),
        note("Only crew trained and current in CPR and AED use should use the AED. Record everything used so the kit can be restocked."),
      ],
    },
    {
      id: "evacuation",
      title: "Evacuation and Exits",
      blocks: [
        h3("evac-exits", "Exits"),
        ul("Main entry door: front left.", "Overwing emergency exits: both sides of the cabin over the wing.", "Floor path lighting leads to the exits in smoke or darkness."),
        h3("evac-brace", "Brace position"),
        p("Feet flat on the floor, belt low and tight. Forward-facing seats lean forward with head down. Rear-facing seats sit upright with the head back against the headrest. Demonstrate in the safety briefing."),
        h3("evac-steps", "If the flight crew calls an evacuation"),
        ol("Release your belt and check outside the exit for fire, water or debris.", "If it is safe, open the exit and shout clear commands: release belts, leave everything, come this way.", "Help passengers out and move them well away from the aircraft, upwind.", "Count heads and stay with the group until help arrives."),
        note("If an exit is blocked, redirect passengers to the other side."),
      ],
    },
    {
      id: "turbulence",
      title: "Turbulence Procedures",
      blocks: [
        table(
          ["Level", "What it feels like", "Cabin action"],
          ["Light", "Slight bumps; drinks ripple", "Belt sign on; stop hot drinks; passengers seated"],
          ["Moderate", "Walking is difficult; items move", "Stop service; secure galley; crew seated"],
          ["Severe", "Strong jolts; items thrown", "Crew sit down immediately wherever they are"],
        ),
        ul("Secure the galley first: hot liquids, ovens, carts and drawers.", "Check passengers' belts quickly, without leaning over them.", "Wait for the flight crew before resuming service, then check for injuries and spills."),
      ],
    },
    {
      id: "medical",
      title: "Medical Situations",
      blocks: [
        ol("Stay calm and ask the passenger what is wrong.", "Tell the flight crew. They decide whether to divert.", "Use the telemedical link to get a doctor's advice.", "Ask whether there is a doctor or nurse on board.", "Write down times, symptoms and anything given."),
        table(
          ["Situation", "First steps"],
          ["Fainting", "Lay the person flat with legs raised; loosen tight clothing"],
          ["Allergic reaction", "Ask about their medication or auto-injector; get medical advice at once"],
          ["Breathing difficulty", "Sit them upright; give oxygen if trained; get medical advice"],
          ["Chest pain", "Rest, reassure, get medical advice; keep the AED nearby"],
          ["Ear pain on descent", "Swallowing, yawning or a warm drink"],
          ["Nausea", "Fresh air from the outlet, sips of water, sick bag nearby"],
        ),
        note("Check the passenger's file and the Preferences tab for known allergies or conditions before every trip."),
      ],
    },
    {
      id: "after",
      title: "After Any Event",
      blocks: [
        ul("Report it to the flight crew and log it in the app as a discrepancy.", "List anything used so it can be restocked.", "Note it in the handover form for the next cabin host."),
      ],
    },
  ],
};

export const GUIDES: Guide[] = [cabin, galley, service, safety];

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
