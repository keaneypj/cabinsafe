import type { EquipmentCategory } from "@/domain/types";

/**
 * What each piece of emergency equipment is, in plain words, for someone new to the aircraft.
 * Fictional demonstration wording — confirm against the operator's approved equipment list.
 */
export const EQUIPMENT_DESCRIPTIONS: Record<EquipmentCategory, string> = {
  aed: "A defibrillator for someone whose heart has stopped. Open it and it talks you through every step.",
  first_aid: "Plasters, dressings, gloves and basic supplies for small cuts, burns and minor injuries.",
  medical_kit: "A sealed kit with medicines and medical supplies, for more serious illness. Used with telemedical advice.",
  telemedical: "Equipment for reaching a doctor on the ground during a medical event, with devices to check vital signs.",
  fire_extinguisher: "A hand-held extinguisher for small cabin fires. Pull the pin, aim at the base of the fire and squeeze.",
  flashlight: "A rechargeable torch for a power failure or an evacuation. It switches on when lifted from its bracket.",
  oxygen: "A portable oxygen bottle with a mask, for a passenger or crew member who needs extra oxygen.",
  pbe: "A smoke hood that protects your face and breathing while you fight a fire or deal with smoke.",
};

/**
 * Location photos live in `public/equipment-photos/`, named after the equipment code
 * (for example `public/equipment-photos/AED-01.jpg`). To add or replace a photo, drop a
 * JPG with that name into the folder. Until a photo is there, a placeholder is shown.
 */
export function equipmentPhotoSrc(code: string): string {
  return `/equipment-photos/${code}.jpg`;
}
