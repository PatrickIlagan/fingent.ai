// Ipon rewards: pet growth stages and everything points can buy. Items are
// drawn in code (src/components/Pet.tsx and PetRoom.tsx); here they only have
// a name, slot, price, and the stage that unlocks them.

export const STAGES = [
  { id: 'egg', name: 'Egg', at: 0 },
  { id: 'hatchling', name: 'Hatchling', at: 100 },
  { id: 'kid', name: 'Kid', at: 400 },
  { id: 'teen', name: 'Teen', at: 1000 },
  { id: 'adult', name: 'Adult', at: 2500 },
  { id: 'legend', name: 'Legend', at: 6000 },
] as const;

export type ItemSlot = 'color' | 'eyes' | 'pattern' | 'hat' | 'face' | 'neck' | 'wallpaper' | 'floor' | 'window' | 'rug' | 'furniture' | 'wall' | 'theme' | 'effect';
/** `size` is the floor footprint in tiles (furniture and rugs); `span` is how many tiles a wall piece covers. */
export type RewardItem = { id: string; name: string; slot: ItemSlot; cost: number; stage?: number; value?: string; size?: [number, number]; span?: number };

/** Slots that can be left empty (the rest always show something). */
export const OPTIONAL_SLOTS: ItemSlot[] = ['pattern', 'hat', 'face', 'neck', 'effect'];
/** Room pieces are placed with the room editor rather than worn. */
export const PLACED_SLOTS: ItemSlot[] = ['furniture', 'wall', 'rug'];

export const ITEMS: RewardItem[] = [
  // Pet colors (value = body color)
  { id: 'color-mochi', name: 'Mochi', slot: 'color', cost: 0, value: '#fff3e4' },
  { id: 'color-sakura', name: 'Sakura', slot: 'color', cost: 120, value: '#ffd3df' },
  { id: 'color-matcha', name: 'Matcha', slot: 'color', cost: 120, value: '#cfe8a9' },
  { id: 'color-ube', name: 'Ube', slot: 'color', cost: 120, value: '#ddc8f3' },
  { id: 'color-mango', name: 'Mango', slot: 'color', cost: 120, value: '#ffdc8f' },
  { id: 'color-sky', name: 'Sky', slot: 'color', cost: 120, value: '#c4e4ff' },
  { id: 'color-cocoa', name: 'Cocoa', slot: 'color', cost: 160, value: '#e2bf98' },
  { id: 'color-midnight', name: 'Midnight', slot: 'color', cost: 200, stage: 3, value: '#a9b2e6' },
  { id: 'color-gold', name: 'Gold', slot: 'color', cost: 400, stage: 5, value: '#ffd75e' },
  // Eyes and body patterns
  { id: 'eyes-round', name: 'Round eyes', slot: 'eyes', cost: 0 },
  { id: 'eyes-smile', name: 'Smiley eyes', slot: 'eyes', cost: 100 },
  { id: 'eyes-sparkle', name: 'Sparkle eyes', slot: 'eyes', cost: 120 },
  { id: 'eyes-cat', name: 'Cat eyes', slot: 'eyes', cost: 150, stage: 2 },
  { id: 'pattern-belly', name: 'Belly patch', slot: 'pattern', cost: 100 },
  { id: 'pattern-spots', name: 'Spots', slot: 'pattern', cost: 120 },
  { id: 'pattern-stripes', name: 'Stripes', slot: 'pattern', cost: 140 },
  { id: 'pattern-stars', name: 'Freckle stars', slot: 'pattern', cost: 180, stage: 2 },
  // Outfits
  { id: 'hat-party', name: 'Party hat', slot: 'hat', cost: 80 },
  { id: 'hat-flower', name: 'Flower', slot: 'hat', cost: 90 },
  { id: 'hat-cap', name: 'Cap', slot: 'hat', cost: 100 },
  { id: 'hat-beret', name: 'Beret', slot: 'hat', cost: 120 },
  { id: 'hat-salakot', name: 'Salakot', slot: 'hat', cost: 200, stage: 2 },
  { id: 'hat-headphones', name: 'Headphones', slot: 'hat', cost: 220, stage: 2 },
  { id: 'hat-crown', name: 'Crown', slot: 'hat', cost: 400, stage: 5 },
  { id: 'face-glasses', name: 'Round glasses', slot: 'face', cost: 120 },
  { id: 'face-shades', name: 'Star shades', slot: 'face', cost: 180, stage: 2 },
  { id: 'neck-bow', name: 'Bow tie', slot: 'neck', cost: 90 },
  { id: 'neck-scarf', name: 'Scarf', slot: 'neck', cost: 100 },
  { id: 'neck-medal', name: 'Saver medal', slot: 'neck', cost: 250, stage: 3 },
  // Room
  { id: 'wall-mint', name: 'Mint', slot: 'wallpaper', cost: 0, value: '#e7f8f0' },
  { id: 'wall-stripes', name: 'Stripes', slot: 'wallpaper', cost: 150, value: '#fdf0e3' },
  { id: 'wall-dots', name: 'Polka dots', slot: 'wallpaper', cost: 150, value: '#fbe8f0' },
  { id: 'wall-stars', name: 'Starry', slot: 'wallpaper', cost: 200, stage: 2, value: '#e6e9fb' },
  { id: 'floor-wood', name: 'Wood', slot: 'floor', cost: 0, value: '#e8c9a1' },
  { id: 'floor-tiles', name: 'Tiles', slot: 'floor', cost: 150, value: '#e9eef3' },
  { id: 'floor-grass', name: 'Grass', slot: 'floor', cost: 200, value: '#bfe3a4' },
  { id: 'window-city', name: 'City', slot: 'window', cost: 0 },
  { id: 'window-beach', name: 'Beach', slot: 'window', cost: 200 },
  { id: 'window-terraces', name: 'Rice terraces', slot: 'window', cost: 250, stage: 2 },
  { id: 'rug-round', name: 'Round rug', slot: 'rug', cost: 120, size: [3, 3] },
  { id: 'rug-rainbow', name: 'Rainbow rug', slot: 'rug', cost: 180, size: [4, 3] },
  // Furniture (size = tiles wide × deep)
  { id: 'decor-plant', name: 'Plant', slot: 'furniture', cost: 100, size: [1, 1] },
  { id: 'decor-coinjar', name: 'Coin jar', slot: 'furniture', cost: 100, size: [1, 1] },
  { id: 'decor-lamp', name: 'Floor lamp', slot: 'furniture', cost: 120, size: [1, 1] },
  { id: 'decor-piggy', name: 'Piggy bank', slot: 'furniture', cost: 120, size: [1, 1] },
  { id: 'decor-table', name: 'Coffee table', slot: 'furniture', cost: 140, size: [2, 1] },
  { id: 'decor-beanbag', name: 'Bean bag', slot: 'furniture', cost: 160, size: [1, 1] },
  { id: 'decor-bookshelf', name: 'Bookshelf', slot: 'furniture', cost: 220, stage: 2, size: [2, 1] },
  { id: 'decor-sofa', name: 'Sofa', slot: 'furniture', cost: 240, stage: 2, size: [3, 1] },
  { id: 'decor-bed', name: 'Cozy bed', slot: 'furniture', cost: 280, stage: 2, size: [2, 3] },
  { id: 'decor-aquarium', name: 'Aquarium', slot: 'furniture', cost: 300, stage: 3, size: [2, 1] },
  { id: 'decor-desk', name: 'Gaming desk', slot: 'furniture', cost: 450, stage: 3, size: [2, 1] },
  // Wall pieces (span = tiles wide)
  { id: 'decor-clock', name: 'Clock', slot: 'wall', cost: 100, span: 1 },
  { id: 'decor-frame', name: 'Pet portrait', slot: 'wall', cost: 120, span: 1 },
  { id: 'decor-poster', name: 'Savings poster', slot: 'wall', cost: 120, span: 2 },
  { id: 'decor-shelf', name: 'Wall shelf', slot: 'wall', cost: 140, span: 2 },
  { id: 'decor-lights', name: 'Fairy lights', slot: 'wall', cost: 180, span: 3 },
  // App themes (value = accent id) and celebration effects
  { id: 'theme-mango', name: 'Mango theme', slot: 'theme', cost: 400, value: 'mango' },
  { id: 'theme-sakura', name: 'Sakura theme', slot: 'theme', cost: 500, value: 'sakura' },
  { id: 'theme-matcha', name: 'Matcha theme', slot: 'theme', cost: 500, value: 'matcha' },
  { id: 'theme-midnight', name: 'Midnight theme', slot: 'theme', cost: 800, stage: 3, value: 'midnight' },
  { id: 'effect-coins', name: 'Coin shower', slot: 'effect', cost: 250, value: 'coins' },
  { id: 'effect-hearts', name: 'Hearts', slot: 'effect', cost: 250, value: 'hearts' },
  { id: 'effect-stars', name: 'Stars', slot: 'effect', cost: 250, value: 'stars' },
  { id: 'effect-petals', name: 'Petals', slot: 'effect', cost: 300, value: 'petals' },
];

export const DEFAULT_EQUIPPED: Partial<Record<ItemSlot, string>> = { color: 'color-mochi', eyes: 'eyes-round', wallpaper: 'wall-mint', floor: 'floor-wood', window: 'window-city' };
export const itemById = (id: string | null | undefined) => ITEMS.find(item => item.id === id);
/** Accent ids that must be bought before they can be used. */
export const PREMIUM_ACCENTS = ITEMS.filter(item => item.slot === 'theme').map(item => item.value as string);
