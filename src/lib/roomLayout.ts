// Where things sit in the pet's isometric room. The floor is a ROOM_SIZE ×
// ROOM_SIZE grid of tiles; furniture covers a rectangle of tiles (swapped when
// rotated), rugs lie underneath, and wall pieces hang along the left or right
// wall. Shared by the server checks and the drag-to-place editor.
import { itemById } from './rewardsCatalog';

export const ROOM_SIZE = 6;
/** The window is fixed on the right wall, covering these tiles. */
export const WINDOW_SPOT = { wall: 'right' as const, u: 3, span: 2 };

export type FloorPiece = { item: string; x: number; y: number; rotated: boolean };
export type WallPiece = { item: string; wall: 'left' | 'right'; u: number };
export type RugPiece = { item: string; x: number; y: number };
export type RoomLayout = { pet: { x: number; y: number }; floor: FloorPiece[]; wall: WallPiece[]; rug: RugPiece | null };

export const emptyLayout = (): RoomLayout => ({ pet: { x: 2, y: 3 }, floor: [], wall: [], rug: null });

export function footprint(itemId: string, rotated = false): [number, number] {
  const [w, d] = itemById(itemId)?.size ?? [1, 1];
  return rotated ? [d, w] : [w, d];
}
export const wallSpan = (itemId: string) => itemById(itemId)?.span ?? 1;

const cells = (x: number, y: number, w: number, d: number) => { const out: string[] = []; for (let i = x; i < x + w; i += 1) for (let j = y; j < y + d; j += 1) out.push(`${i},${j}`); return out; };
const inside = (x: number, y: number, w: number, d: number) => x >= 0 && y >= 0 && x + w <= ROOM_SIZE && y + d <= ROOM_SIZE;

/** Tiles taken by furniture (and the pet), optionally ignoring one piece being moved. */
export function takenCells(layout: RoomLayout, ignore?: { kind: 'floor' | 'pet'; index?: number }) {
  const taken = new Set<string>();
  layout.floor.forEach((piece, index) => {
    if (ignore?.kind === 'floor' && ignore.index === index) return;
    const [w, d] = footprint(piece.item, piece.rotated);
    cells(piece.x, piece.y, w, d).forEach(cell => taken.add(cell));
  });
  if (ignore?.kind !== 'pet') taken.add(`${layout.pet.x},${layout.pet.y}`);
  return taken;
}

export function fitsFloor(layout: RoomLayout, x: number, y: number, w: number, d: number, ignore?: { kind: 'floor' | 'pet'; index?: number }) {
  if (!inside(x, y, w, d)) return false;
  const taken = takenCells(layout, ignore);
  return cells(x, y, w, d).every(cell => !taken.has(cell));
}

export function fitsWall(layout: RoomLayout, wall: 'left' | 'right', u: number, span: number, ignoreIndex?: number) {
  if (u < 0 || u + span > ROOM_SIZE) return false;
  const used = layout.wall.filter((_, index) => index !== ignoreIndex).filter(piece => piece.wall === wall).map(piece => [piece.u, piece.u + wallSpan(piece.item)]);
  if (wall === WINDOW_SPOT.wall) used.push([WINDOW_SPOT.u, WINDOW_SPOT.u + WINDOW_SPOT.span]);
  return used.every(([start, end]) => u + span <= start || u >= end);
}

/** First open spot for a new piece, scanning from the back of the room. */
export function firstFreeSpot(layout: RoomLayout, itemId: string): Partial<FloorPiece & WallPiece & RugPiece> | null {
  const slot = itemById(itemId)?.slot;
  if (slot === 'rug') { const [w, d] = footprint(itemId); return { item: itemId, x: Math.max(0, Math.floor((ROOM_SIZE - w) / 2)), y: Math.max(0, Math.floor((ROOM_SIZE - d) / 2)) }; }
  if (slot === 'wall') {
    const span = wallSpan(itemId);
    for (const wall of ['left', 'right'] as const) for (let u = 0; u + span <= ROOM_SIZE; u += 1) if (fitsWall(layout, wall, u, span)) return { item: itemId, wall, u };
    return null;
  }
  for (const rotated of [false, true]) {
    const [w, d] = footprint(itemId, rotated);
    for (let sum = 0; sum <= ROOM_SIZE * 2; sum += 1) for (let x = 0; x <= sum; x += 1) { const y = sum - x; if (fitsFloor(layout, x, y, w, d)) return { item: itemId, x, y, rotated }; }
  }
  return null;
}

/** Reads a stored layout, keeping only owned items in valid spots; older rooms with fixed decor spots are moved over. */
export function readLayout(equipped: Record<string, unknown>, owned: Set<string>): RoomLayout {
  const stored = equipped.layout as Partial<RoomLayout> | undefined;
  let layout = emptyLayout();
  if (stored && typeof stored === 'object') {
    const pet = stored.pet && Number.isInteger(stored.pet.x) && Number.isInteger(stored.pet.y) ? { x: stored.pet.x, y: stored.pet.y } : layout.pet;
    layout = { pet: inside(pet.x, pet.y, 1, 1) ? pet : layout.pet, floor: [], wall: [], rug: null };
    for (const piece of Array.isArray(stored.floor) ? stored.floor : []) {
      if (!owned.has(piece.item) || itemById(piece.item)?.slot !== 'furniture' || layout.floor.some(other => other.item === piece.item)) continue;
      const [w, d] = footprint(piece.item, Boolean(piece.rotated));
      if (fitsFloor(layout, piece.x, piece.y, w, d)) layout.floor.push({ item: piece.item, x: piece.x, y: piece.y, rotated: Boolean(piece.rotated) });
    }
    for (const piece of Array.isArray(stored.wall) ? stored.wall : []) {
      if (!owned.has(piece.item) || itemById(piece.item)?.slot !== 'wall' || layout.wall.some(other => other.item === piece.item)) continue;
      if ((piece.wall === 'left' || piece.wall === 'right') && fitsWall(layout, piece.wall, piece.u, wallSpan(piece.item))) layout.wall.push({ item: piece.item, wall: piece.wall, u: piece.u });
    }
    const rug = stored.rug;
    if (rug && owned.has(rug.item) && itemById(rug.item)?.slot === 'rug') { const [w, d] = footprint(rug.item); if (inside(rug.x, rug.y, w, d)) layout.rug = { item: rug.item, x: rug.x, y: rug.y }; }
    return layout;
  }
  // Rooms saved before free placement had one decor spot each.
  const legacy: [string, string][] = [['decorLeft', 'furniture'], ['decorRight', 'furniture'], ['decorWall', 'wall'], ['rug', 'rug']];
  for (const [key] of legacy) {
    const item = equipped[key];
    if (typeof item !== 'string' || !owned.has(item)) continue;
    const spot = firstFreeSpot(layout, item);
    if (!spot) continue;
    const slot = itemById(item)?.slot;
    if (slot === 'furniture') layout.floor.push(spot as FloorPiece);
    else if (slot === 'wall') layout.wall.push(spot as WallPiece);
    else if (slot === 'rug') layout.rug = spot as RugPiece;
  }
  return layout;
}

/** Checks a layout sent by the editor. Returns the cleaned layout or the first problem found. */
export function checkLayout(input: unknown, owned: Set<string>): { layout: RoomLayout } | { error: string } {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<RoomLayout>;
  const layout = emptyLayout();
  const pet = raw.pet;
  if (!pet || !Number.isInteger(pet.x) || !Number.isInteger(pet.y) || !inside(pet.x, pet.y, 1, 1)) return { error: 'Your pet needs a spot on the floor.' };
  layout.pet = { x: pet.x, y: pet.y };
  const seen = new Set<string>();
  const ownedRight = (item: string, slot: string) => {
    if (!itemById(item) || itemById(item)?.slot !== slot) return 'That item doesn’t go there.';
    if (!owned.has(item)) return 'Buy it first.';
    if (seen.has(item)) return 'Each item can be placed once.';
    seen.add(item);
    return null;
  };
  for (const piece of Array.isArray(raw.floor) ? raw.floor : []) {
    const problem = ownedRight(String(piece.item), 'furniture');
    if (problem) return { error: problem };
    const [w, d] = footprint(piece.item, Boolean(piece.rotated));
    if (!Number.isInteger(piece.x) || !Number.isInteger(piece.y) || !fitsFloor(layout, piece.x, piece.y, w, d)) return { error: `${itemById(piece.item)?.name} doesn’t fit there.` };
    layout.floor.push({ item: piece.item, x: piece.x, y: piece.y, rotated: Boolean(piece.rotated) });
  }
  for (const piece of Array.isArray(raw.wall) ? raw.wall : []) {
    const problem = ownedRight(String(piece.item), 'wall');
    if (problem) return { error: problem };
    if ((piece.wall !== 'left' && piece.wall !== 'right') || !Number.isInteger(piece.u) || !fitsWall(layout, piece.wall, piece.u, wallSpan(piece.item))) return { error: `${itemById(piece.item)?.name} doesn’t fit on that wall.` };
    layout.wall.push({ item: piece.item, wall: piece.wall, u: piece.u });
  }
  if (raw.rug) {
    const problem = ownedRight(String(raw.rug.item), 'rug');
    if (problem) return { error: problem };
    const [w, d] = footprint(raw.rug.item);
    if (!Number.isInteger(raw.rug.x) || !Number.isInteger(raw.rug.y) || !inside(raw.rug.x, raw.rug.y, w, d)) return { error: 'The rug doesn’t fit there.' };
    layout.rug = { item: raw.rug.item, x: raw.rug.x, y: raw.rug.y };
  }
  return { layout };
}
