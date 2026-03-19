export const DEFAULT_MANUFACTURERS = [
  "Luxottica",
  "Marchon",
  "Safilo",
  "Kering",
  "Marcolin",
  "Kenmark",
  "Silhouette",
  "De Rigo",
  "Charmant",
  "Altair",
  "Blackfin",
];

export const MANUFACTURER_BRANDS: Record<string, string[]> = {
  Luxottica: [
    "Ray-Ban",
    "Oakley",
    "Persol",
    "Oliver Peoples",
    "Alain Mikli",
    "Arnette",
    "Vogue Eyewear",
    "Tiffany & Co",
    "Giorgio Armani",
    "Emporio Armani",
    "Armani Exchange",
    "Burberry",
    "Prada",
    "Prada Linea Rossa",
    "Dolce & Gabbana",
    "Versace",
    "Michael Kors",
    "Coach",
    "Tory Burch",
    "Swarovski",
    "Jimmy Choo",
    "Brooks Brothers",
    "Ralph Lauren",
    "Polo Ralph Lauren",
    "Ferragamo",
    "Bulgari",
  ],
  Marchon: [
    "Nike",
    "Calvin Klein",
    "Calvin Klein Jeans",
    "Lacoste",
    "Dragon",
    "Flexon",
    "Skaga",
    "Nine West",
    "Marchon NYC",
    "Longchamp",
    "Victoria Beckham",
    "Karl Lagerfeld",
    "Converse",
    "Liu Jo",
  ],
  Safilo: [
    "Carrera",
    "Polaroid",
    "Boss",
    "Hugo",
    "Kate Spade",
    "Tommy Hilfiger",
    "Marc Jacobs",
    "David Beckham",
    "Dsquared2",
    "Moschino",
    "Missoni",
    "Under Armour",
    "Levi's",
  ],
  Kering: [
    "Gucci",
    "Saint Laurent",
    "Balenciaga",
    "Bottega Veneta",
    "Alexander McQueen",
    "Cartier",
    "Chloé",
    "Dunhill",
    "Montblanc",
    "Puma",
  ],
  Marcolin: [
    "Tom Ford",
    "Guess",
    "Adidas Sport",
    "Adidas Originals",
    "Max Mara",
    "Zegna",
    "MCM",
    "Timberland",
    "Skechers",
  ],
  Kenmark: [
    "Lilly Pulitzer",
    "Original Penguin",
    "Zac Posen",
    "Vera Wang",
    "Vera Wang V",
    "Nicole Miller",
    "Ted Baker",
  ],
  Silhouette: ["Silhouette", "adidas eyewear"],
  "De Rigo": ["Police", "Lozza", "Sting", "Chopard"],
  Charmant: ["Charmant", "Line Art", "Eschenbach"],
  Altair: ["Revo", "BCBGMAXAZRIA", "Joseph Abboud", "Adidas Originals"],
  Blackfin: ["Blackfin", "Blackfin Titanium"],
};

export interface Lab {
  name: string;
  account: string;
}

export const DEFAULT_LABS: Lab[] = [
  { name: "Vision-Craft", account: "Y1500" },
  { name: "Opti-Craft", account: "18369" },
  { name: "Custom Eyelab", account: "1015" },
  { name: "HOYA Lab", account: "632142" },
  { name: "Frame Dream", account: "fd10673" },
];

const STORAGE_KEY_MANUFACTURERS = "optitrack_custom_manufacturers";
const STORAGE_KEY_BRANDS = "optitrack_custom_brands";
const STORAGE_KEY_LABS = "optitrack_custom_labs_v2";

export function loadCustomManufacturers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MANUFACTURERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomManufacturers(list: string[]) {
  localStorage.setItem(STORAGE_KEY_MANUFACTURERS, JSON.stringify(list));
}

export function loadCustomBrands(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANDS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomBrands(map: Record<string, string[]>) {
  localStorage.setItem(STORAGE_KEY_BRANDS, JSON.stringify(map));
}

export function loadCustomLabs(): Lab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LABS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomLabs(list: Lab[]) {
  localStorage.setItem(STORAGE_KEY_LABS, JSON.stringify(list));
}
