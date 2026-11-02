export interface Outfit {
  id: string;
  name: string;
  description: string;
  colors: string[];
  pattern: 'woodland' | 'digital' | 'solid' | 'arid' | 'urban';
}
export interface Gloves { id: string; name: string; description: string; color: string; accent: string; }

export const OUTFITS: Outfit[] = [
  { id: 'woodland', name: 'Woodland', description: 'Field jacket / forest camouflage', colors: ['#707650', '#415230', '#57432d', '#1c1f17'], pattern: 'woodland' },
  { id: 'desert', name: 'Desert', description: 'Combat shirt / arid camouflage', colors: ['#c9b688', '#a58b62', '#e0d3a8', '#7a6849'], pattern: 'arid' },
  { id: 'urban', name: 'Urban', description: 'Field jacket / city camouflage', colors: ['#8a9092', '#555d62', '#b5b8b4', '#2a3034'], pattern: 'urban' },
  { id: 'digital', name: 'Digital', description: 'Combat shirt / pixel camouflage', colors: ['#6e7961', '#39473d', '#a7aa87', '#555d4b'], pattern: 'digital' },
  { id: 'special-ops', name: 'Special Ops', description: 'Tactical shell / midnight ripstop', colors: ['#262d32', '#182129', '#3c454b'], pattern: 'solid' },
  { id: 'winter', name: 'Winter', description: 'Field jacket / snow camouflage', colors: ['#d8dcd6', '#a3adad', '#c4cac6', '#5f7075'], pattern: 'woodland' },
];
export const GLOVES: Gloves[] = [
  { id: 'black', name: 'Black Tactical', description: 'Full coverage / reinforced knuckles', color: '#22292b', accent: '#424c4e' },
  { id: 'coyote', name: 'Coyote', description: 'Full coverage / sand grip panels', color: '#89734e', accent: '#b39c70' },
  { id: 'ranger', name: 'Ranger', description: 'Full coverage / olive field gloves', color: '#475644', accent: '#71806a' },
  { id: 'urban', name: 'Urban Grey', description: 'Full coverage / charcoal grip panels', color: '#505b61', accent: '#879094' },
];
export const appearance = { outfit: 'woodland', gloves: 'black' };
const STORAGE_KEY = 'zombiesiege-appearance';
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (saved && typeof saved === 'object') {
    if (OUTFITS.some(outfit => outfit.id === saved.outfit)) appearance.outfit = saved.outfit;
    else if (typeof saved.sweatshirt === 'string') {
      const legacy: Record<string, string> = { '#536449': 'woodland', '#28394d': 'special-ops', '#722f36': 'urban', '#b5ada0': 'desert', '#292b30': 'special-ops', '#b47735': 'desert' };
      appearance.outfit = legacy[saved.sweatshirt] || 'woodland';
    }
    if (GLOVES.some(gloves => gloves.id === saved.gloves)) appearance.gloves = saved.gloves;
  }
} catch { /* Storage may be unavailable; session defaults still work. */ }
export function saveAppearance(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance)); } catch { /* Session choices still work. */ }
}
export function selectedOutfit(): Outfit { return OUTFITS.find(outfit => outfit.id === appearance.outfit) || OUTFITS[0]; }
export function selectedGloves(): Gloves { return GLOVES.find(gloves => gloves.id === appearance.gloves) || GLOVES[0]; }
