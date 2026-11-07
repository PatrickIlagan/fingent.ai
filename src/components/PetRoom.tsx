import { forwardRef, useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement } from 'react';
import { motion } from 'framer-motion';
import { itemById } from '../lib/rewardsCatalog';
import { fitsFloor, fitsWall, footprint, ROOM_SIZE, wallSpan, WINDOW_SPOT, type RoomLayout } from '../lib/roomLayout';
import { Pet, shade } from './Pet';
import { A, Furniture, OX, OY, P, pts, RugArt, WALL_H, WallArt, wallTransform, floorTransform } from './RoomArt';

type Equipped = Partial<Record<string, string | null>>;
export type Selection = { kind: 'floor' | 'wall' | 'rug' | 'pet'; index: number } | null;
type Drag = { kind: 'floor' | 'wall' | 'rug' | 'pet'; index: number; grabI: number; grabJ: number; grabU: number; moved: boolean };

function timeOfDay(date = new Date()) {
  const hour = date.getHours();
  return hour >= 6 && hour < 17 ? 'day' : hour >= 17 && hour < 19 ? 'sunset' : 'night';
}

const T = 0.22; // wall thickness in tiles
const BASE = 14; // floor slab thickness in px
const VIEWBOX = '12 12 376 342';

/**
 * The pet's room as a little isometric diorama: two walls, a floor slab,
 * a window whose view follows the time of day, and furniture the user places.
 * In edit mode, pieces can be dragged around (snapping to tiles).
 */
export const PetRoom = forwardRef<SVGSVGElement, {
  equipped: Equipped; layout: RoomLayout; stage: number; mood: 'happy' | 'content' | 'sleepy'; cheer?: number; hatchProgress?: number;
  editing?: boolean; selected?: Selection; onSelect?: (selection: Selection) => void; onLayoutChange?: (layout: RoomLayout) => void; className?: string;
}>(function PetRoom({ equipped, layout, stage, mood, cheer, hatchProgress, editing = false, selected = null, onSelect, onLayoutChange, className = '' }, ref) {
  const id = useId().replace(/:/g, '');
  const innerRef = useRef<SVGSVGElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; w: number; d: number; valid: boolean } | null>(null);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  const time = timeOfDay(now);
  const night = time === 'night';
  const wall = itemById(equipped.wallpaper)?.value ?? '#e7f8f0';
  const floor = itemById(equipped.floor)?.value ?? '#e8c9a1';
  const color = itemById(equipped.color)?.value ?? '#fff3e4';
  const leftWall = shade(wall, -0.02);
  const rightWall = shade(wall, -0.1);

  // ---- Pointer → room coordinates ----
  const toRoom = (event: ReactPointerEvent) => {
    const svg = innerRef.current!;
    const point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const p = point.matrixTransform(svg.getScreenCTM()!.inverse());
    const u = (p.x - OX) / A; const v = (p.y - OY) / (A / 2);
    return { i: (v + u) / 2, j: (v - u) / 2, sx: p.x };
  };
  const startDrag = (event: ReactPointerEvent, kind: Drag['kind'], index: number) => {
    if (!editing) return;
    event.stopPropagation();
    innerRef.current?.setPointerCapture(event.pointerId);
    const { i, j, sx } = toRoom(event);
    const piece = kind === 'floor' ? layout.floor[index] : kind === 'rug' ? layout.rug! : kind === 'pet' ? layout.pet : null;
    const wallPiece = kind === 'wall' ? layout.wall[index] : null;
    const wallU = wallPiece ? (wallPiece.wall === 'right' ? (sx - OX) / A : (sx - P(0, 6)[0]) / A) - wallPiece.u : 0;
    setDrag({ kind, index, grabI: piece ? i - piece.x : 0, grabJ: piece ? j - piece.y : 0, grabU: wallU, moved: false });
    onSelect?.({ kind, index });
  };
  const moveDrag = (event: ReactPointerEvent) => {
    if (!drag || !onLayoutChange) return;
    const { i, j, sx } = toRoom(event);
    if (drag.kind === 'wall') {
      const piece = layout.wall[drag.index];
      const side: 'left' | 'right' = sx < OX ? 'left' : 'right';
      const raw = side === 'right' ? (sx - OX) / A : (sx - P(0, 6)[0]) / A;
      const span = wallSpan(piece.item);
      const u = Math.max(0, Math.min(ROOM_SIZE - span, Math.round(raw - (side === piece.wall ? drag.grabU : span / 2))));
      if ((u !== piece.u || side !== piece.wall) && fitsWall(layout, side, u, span, drag.index)) onLayoutChange({ ...layout, wall: layout.wall.map((item, index) => index === drag.index ? { ...item, wall: side, u } : item) });
      setDrag({ ...drag, moved: true });
      return;
    }
    const size: [number, number] = drag.kind === 'floor' ? footprint(layout.floor[drag.index].item, layout.floor[drag.index].rotated) : drag.kind === 'rug' ? footprint(layout.rug!.item) : [1, 1];
    const x = Math.max(0, Math.min(ROOM_SIZE - size[0], Math.round(i - drag.grabI)));
    const y = Math.max(0, Math.min(ROOM_SIZE - size[1], Math.round(j - drag.grabJ)));
    const valid = drag.kind === 'rug' ? true : fitsFloor(layout, x, y, size[0], size[1], drag.kind === 'pet' ? { kind: 'pet' } : { kind: 'floor', index: drag.index });
    setGhost({ x, y, w: size[0], d: size[1], valid });
    setDrag({ ...drag, moved: true });
    if (!valid) return;
    if (drag.kind === 'floor') { const piece = layout.floor[drag.index]; if (piece.x !== x || piece.y !== y) onLayoutChange({ ...layout, floor: layout.floor.map((item, index) => index === drag.index ? { ...item, x, y } : item) }); }
    else if (drag.kind === 'rug' && layout.rug && (layout.rug.x !== x || layout.rug.y !== y)) onLayoutChange({ ...layout, rug: { ...layout.rug, x, y } });
    else if (drag.kind === 'pet' && (layout.pet.x !== x || layout.pet.y !== y)) onLayoutChange({ ...layout, pet: { x, y } });
  };
  const endDrag = () => { setDrag(null); setGhost(null); };

  // ---- Paint order: things further back first ----
  type Thing = { key: string; x: number; y: number; w: number; d: number; render: () => ReactElement };
  const things: Thing[] = layout.floor.map((piece, index) => {
    const [w, d] = footprint(piece.item, piece.rotated);
    return { key: `f-${piece.item}`, x: piece.x, y: piece.y, w, d, render: () => <g key={`f-${piece.item}`} onPointerDown={event => startDrag(event, 'floor', index)} style={{ cursor: editing ? 'grab' : undefined }}>
      <motion.g initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}><Furniture item={piece.item} x={piece.x} y={piece.y} w={w} d={d} night={night} /></motion.g>
    </g> };
  });
  const petSpot = P(layout.pet.x + 0.5, layout.pet.y + 0.5);
  things.push({ key: 'pet', x: layout.pet.x, y: layout.pet.y, w: 1, d: 1, render: () => <g key="pet" onPointerDown={event => startDrag(event, 'pet', 0)} style={{ cursor: editing ? 'grab' : undefined }}>
    <Pet x={petSpot[0] - 40} y={petSpot[1] - 71} size={80} stage={stage} mood={mood} color={color} eyes={equipped.eyes ?? undefined} pattern={equipped.pattern ?? undefined} hat={equipped.hat ?? undefined} face={equipped.face ?? undefined} neck={equipped.neck ?? undefined} cheer={cheer} hatchProgress={hatchProgress} interactive={!editing} />
  </g> });
  const behind = (a: Thing, b: Thing) => (a.x + a.w <= b.x && !(b.y + b.d <= a.y)) || (a.y + a.d <= b.y && !(b.x + b.w <= a.x));
  const ordered: Thing[] = [];
  const pending = [...things];
  while (pending.length) {
    const index = pending.findIndex(candidate => !pending.some(other => other !== candidate && behind(other, candidate)));
    ordered.push(...pending.splice(index < 0 ? 0 : index, 1));
  }

  const selectedOutline = (() => {
    if (!editing || !selected) return null;
    if (selected.kind === 'floor' && layout.floor[selected.index]) { const piece = layout.floor[selected.index]; const [w, d] = footprint(piece.item, piece.rotated); return { x: piece.x, y: piece.y, w, d }; }
    if (selected.kind === 'rug' && layout.rug) { const [w, d] = footprint(layout.rug.item); return { x: layout.rug.x, y: layout.rug.y, w, d }; }
    if (selected.kind === 'pet') return { x: layout.pet.x, y: layout.pet.y, w: 1, d: 1 };
    return null;
  })();

  const windowView = equipped.window ?? 'window-city';
  const beam = time === 'night' ? '#c7d2fe' : time === 'sunset' ? '#ffb27a' : '#fff6c8';

  return <svg ref={element => { innerRef.current = element; if (typeof ref === 'function') ref(element); else if (ref) ref.current = element; }} viewBox={VIEWBOX} className={`block h-auto w-full select-none ${className}`} role="img" aria-label="Your pet's room"
    style={{ touchAction: editing ? 'none' : undefined }} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerDown={() => editing && onSelect?.(null)}>
    <defs>
      <linearGradient id={`${id}-backdrop`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={night ? '#c7cdf0' : '#eaf6ff'} /><stop offset="1" stopColor={night ? '#e3e6f8' : '#fdf7ef'} /></linearGradient>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        {time === 'day' && <><stop offset="0" stopColor="#8fd3ff" /><stop offset="1" stopColor="#e3f5ff" /></>}
        {time === 'sunset' && <><stop offset="0" stopColor="#ff9a7a" /><stop offset="1" stopColor="#ffd9a3" /></>}
        {time === 'night' && <><stop offset="0" stopColor="#1b2559" /><stop offset="1" stopColor="#3b4b8f" /></>}
      </linearGradient>
      <linearGradient id={`${id}-floorShade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.08" /></linearGradient>
      <linearGradient id={`${id}-wallShade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.18" /><stop offset="1" stopColor="#000" stopOpacity="0.06" /></linearGradient>
      <pattern id={`${id}-stripes`} width="14" height="14" patternUnits="userSpaceOnUse"><rect width="7" height="14" fill="#fff" opacity="0.45" /></pattern>
      <pattern id={`${id}-dots`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.8" fill="#f9a8d4" opacity="0.6" /><circle cx="12" cy="12" r="1.8" fill="#f9a8d4" opacity="0.6" /></pattern>
      <pattern id={`${id}-stars`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M8 4 L9.2 7 L12.4 7.3 L10 9.4 L10.7 12.6 L8 11 L5.3 12.6 L6 9.4 L3.6 7.3 L6.8 7 Z" fill="#a5b4fc" opacity="0.65" /><circle cx="22" cy="21" r="1.2" fill="#c7d2fe" /></pattern>
      <clipPath id={`${id}-window`}><rect x={WINDOW_SPOT.u * A + 4} y="24" width={WINDOW_SPOT.span * A - 8} height="56" rx="5" /></clipPath>
    </defs>

    <rect x="12" y="12" width="376" height="342" fill={`url(#${id}-backdrop)`} />
    <ellipse cx={OX} cy={338} rx="170" ry="16" fill="#0f172a" opacity="0.10" />

    {/* Floor slab and wall ends give the diorama its thickness. */}
    <polygon points={pts(P(0, 6, 0), P(6, 6, 0), P(6, 6, -BASE), P(0, 6, -BASE))} fill={shade(floor, -0.28)} />
    <polygon points={pts(P(6, 6, 0), P(6, -T, 0), P(6, -T, -BASE), P(6, 6, -BASE))} fill={shade(floor, -0.4)} />
    <polygon points={pts(P(-T, 6, 0), P(0, 6, 0), P(0, 6, -BASE), P(-T, 6, -BASE))} fill={shade(floor, -0.28)} />
    <polygon points={pts(P(-T, 6, 0), P(0, 6, 0), P(0, 6, WALL_H), P(-T, 6, WALL_H))} fill={shade(wall, -0.14)} />
    <polygon points={pts(P(6, 0, 0), P(6, -T, 0), P(6, -T, WALL_H), P(6, 0, WALL_H))} fill={shade(wall, -0.3)} />

    {/* Walls */}
    <g transform={wallTransform('left')}>
      <rect width={ROOM_SIZE * A} height={WALL_H} fill={leftWall} />
      {equipped.wallpaper === 'wall-stripes' && <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-stripes)`} />}
      {equipped.wallpaper === 'wall-dots' && <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-dots)`} />}
      {equipped.wallpaper === 'wall-stars' && <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-stars)`} />}
      <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-wallShade)`} />
      <rect y={WALL_H - 7} width={ROOM_SIZE * A} height="7" fill={shade(wall, -0.16)} />
    </g>
    <g transform={wallTransform('right')}>
      <rect width={ROOM_SIZE * A} height={WALL_H} fill={rightWall} />
      {equipped.wallpaper === 'wall-stripes' && <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-stripes)`} />}
      {equipped.wallpaper === 'wall-dots' && <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-dots)`} />}
      {equipped.wallpaper === 'wall-stars' && <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-stars)`} />}
      <rect width={ROOM_SIZE * A} height={WALL_H} fill={`url(#${id}-wallShade)`} />
      <rect y={WALL_H - 7} width={ROOM_SIZE * A} height="7" fill={shade(wall, -0.24)} />
      {/* Window */}
      <rect x={WINDOW_SPOT.u * A} y="20" width={WINDOW_SPOT.span * A} height="64" rx="7" fill="#ffffff" />
      <g clipPath={`url(#${id}-window)`}>
        <rect x={WINDOW_SPOT.u * A} y="20" width={WINDOW_SPOT.span * A} height="64" fill={`url(#${id}-sky)`} />
        <WindowView view={windowView} time={time} x={WINDOW_SPOT.u * A + 4} width={WINDOW_SPOT.span * A - 8} />
      </g>
      <path d={`M${WINDOW_SPOT.u * A + WINDOW_SPOT.span * A / 2} 24 L${WINDOW_SPOT.u * A + WINDOW_SPOT.span * A / 2} 80 M${WINDOW_SPOT.u * A + 4} 52 L${WINDOW_SPOT.u * A + WINDOW_SPOT.span * A - 4} 52`} stroke="#ffffff" strokeWidth="3" />
      <rect x={WINDOW_SPOT.u * A - 3} y="83" width={WINDOW_SPOT.span * A + 6} height="5" rx="2" fill={shade(wall, -0.3)} />
    </g>
    {/* Wall tops */}
    <polygon points={pts(P(-T, -T, WALL_H), P(6, -T, WALL_H), P(6, 0, WALL_H), P(0, 0, WALL_H), P(0, 6, WALL_H), P(-T, 6, WALL_H))} fill={shade(wall, 0.25)} stroke={shade(wall, -0.2)} strokeWidth="0.6" />

    {/* Wall pieces */}
    {(['left', 'right'] as const).map(side => <g key={side} transform={wallTransform(side)}>
      {layout.wall.map((piece, index) => piece.wall === side && <g key={piece.item} onPointerDown={event => startDrag(event, 'wall', index)} style={{ cursor: editing ? 'grab' : undefined }}>
        {editing && <rect x={piece.u * A + 1} y="14" width={wallSpan(piece.item) * A - 2} height="78" rx="6" fill={selected?.kind === 'wall' && selected.index === index ? '#10b98133' : '#ffffff22'} stroke={selected?.kind === 'wall' && selected.index === index ? '#10b981' : '#94a3b8'} strokeDasharray="4 3" strokeWidth="1.2" />}
        <WallArt item={piece.item} u={piece.u} now={now} />
      </g>)}
    </g>)}

    {/* Floor */}
    <polygon points={pts(P(0, 0), P(6, 0), P(6, 6), P(0, 6))} fill={floor} />
    <g transform={floorTransform}>
      {equipped.floor === 'floor-wood' && <g stroke={shade(floor, -0.14)} strokeWidth="1" vectorEffect="non-scaling-stroke">{Array.from({ length: 11 }, (_, index) => <line key={index} x1="0" y1={(index + 1) * 0.5} x2="6" y2={(index + 1) * 0.5} vectorEffect="non-scaling-stroke" />)}{Array.from({ length: 12 }, (_, index) => <line key={`s${index}`} x1={(index * 1.7) % 6} y1={Math.floor(index / 2) * 0.5 + (index % 2) * 0.5} x2={(index * 1.7) % 6} y2={Math.floor(index / 2) * 0.5 + (index % 2) * 0.5 + 0.5} vectorEffect="non-scaling-stroke" />)}</g>}
      {equipped.floor === 'floor-tiles' && <g stroke={shade(floor, -0.12)} strokeWidth="1">{Array.from({ length: 5 }, (_, index) => <g key={index}><line x1={index + 1} y1="0" x2={index + 1} y2="6" vectorEffect="non-scaling-stroke" /><line x1="0" y1={index + 1} x2="6" y2={index + 1} vectorEffect="non-scaling-stroke" /></g>)}</g>}
      {equipped.floor === 'floor-grass' && <g fill={shade(floor, -0.18)}>{Array.from({ length: 40 }, (_, index) => <circle key={index} cx={((index * 37) % 59) / 10 + 0.05} cy={((index * 23) % 57) / 10 + 0.1} r="0.06" />)}</g>}
      {editing && <g stroke="#0f172a" strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 3">{Array.from({ length: 5 }, (_, index) => <g key={index}><line x1={index + 1} y1="0" x2={index + 1} y2="6" vectorEffect="non-scaling-stroke" /><line x1="0" y1={index + 1} x2="6" y2={index + 1} vectorEffect="non-scaling-stroke" /></g>)}</g>}
    </g>
    <polygon points={pts(P(0, 0), P(6, 0), P(6, 6), P(0, 6))} fill={`url(#${id}-floorShade)`} />
    {/* Window light falling on the floor */}
    <motion.polygon points={pts(P(WINDOW_SPOT.u + 0.1, 0.05), P(WINDOW_SPOT.u + WINDOW_SPOT.span - 0.1, 0.05), P(WINDOW_SPOT.u + WINDOW_SPOT.span + 0.5, 2.3), P(WINDOW_SPOT.u + 0.6, 2.3))} fill={beam} animate={{ opacity: night ? [0.16, 0.22, 0.16] : [0.32, 0.4, 0.32] }} transition={{ duration: 5, repeat: Infinity }} />

    {layout.rug && (() => { const [w, d] = footprint(layout.rug.item); return <g onPointerDown={event => startDrag(event, 'rug', 0)} style={{ cursor: editing ? 'grab' : undefined }}><RugArt item={layout.rug.item} x={layout.rug.x} y={layout.rug.y} w={w} d={d} /></g>; })()}

    {ghost && <polygon points={pts(P(ghost.x, ghost.y), P(ghost.x + ghost.w, ghost.y), P(ghost.x + ghost.w, ghost.y + ghost.d), P(ghost.x, ghost.y + ghost.d))} fill={ghost.valid ? '#10b981' : '#f43f5e'} opacity="0.35" />}
    {selectedOutline && <polygon points={pts(P(selectedOutline.x, selectedOutline.y), P(selectedOutline.x + selectedOutline.w, selectedOutline.y), P(selectedOutline.x + selectedOutline.w, selectedOutline.y + selectedOutline.d), P(selectedOutline.x, selectedOutline.y + selectedOutline.d))} fill="#10b98122" stroke="#10b981" strokeWidth="1.6" strokeDasharray="5 3" />}

    {ordered.map(thing => thing.render())}

    {night && <rect x="12" y="12" width="376" height="342" fill="#1e1b4b" opacity="0.12" pointerEvents="none" />}
  </svg>;
});

function WindowView({ view, time, x, width }: { view: string; time: string; x: number; width: number }) {
  const dim = time === 'night';
  const right = x + width;
  return <g>
    {dim ? <g><circle cx={right - 12} cy="34" r="6" fill="#fef9c3" /><circle cx={right - 9} cy="32" r="5" fill="#2b3a7a" />{[[x + 8, 30], [x + 18, 42], [x + 30, 28], [x + 12, 50]].map(([cx, cy], index) => <motion.circle key={index} cx={cx} cy={cy} r="0.9" fill="#fff" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2 + index * 0.4, repeat: Infinity }} />)}</g>
      : <circle cx={time === 'day' ? right - 12 : right - 16} cy={time === 'day' ? 34 : 54} r="6" fill={time === 'day' ? '#fde047' : '#fb923c'} />}
    {view === 'window-beach' && <g><rect x={x} y="60" width={width} height="10" fill={dim ? '#27407a' : '#38bdf8'} /><path d={`M${x} 70 L${right} 70 L${right} 84 L${x} 84 Z`} fill={dim ? '#8a7a5a' : '#fde68a'} /><path d={`M${x + 12} 70 C${x + 12} 62 ${x + 14} 56 ${x + 17} 52`} stroke="#7c5a2b" strokeWidth="1.6" fill="none" /><path d={`M${x + 17} 52 c-6 0 -9 3 -10 5 M${x + 17} 52 c6 -1 9 2 10 4 M${x + 17} 52 c-2 -5 -6 -6 -8 -6`} stroke={dim ? '#2f6b46' : '#22c55e'} strokeWidth="2" fill="none" strokeLinecap="round" /></g>}
    {view === 'window-terraces' && <g>{[0, 1, 2, 3].map(step => <path key={step} d={`M${x} ${56 + step * 7} Q${x + width * 0.4} ${52 + step * 7} ${x + width * 0.7} ${58 + step * 7} T${right} ${55 + step * 7} L${right} 84 L${x} 84 Z`} fill={dim ? ['#1f4d3a', '#24573f', '#2a6345', '#30704c'][step] : ['#6fbf73', '#5fb366', '#4fa65a', '#3f994d'][step]} />)}</g>}
    {view === 'window-city' && <g fill={dim ? '#24305e' : '#94a3b8'}>{[[0, 56, 9, 28], [10, 46, 11, 38], [22, 60, 8, 24], [31, 50, 12, 34], [44, 58, 8, 26]].filter(([dx]) => dx < width - 4).map(([dx, top, w, h], index) => <g key={index}><rect x={x + dx} y={top} width={w} height={h} rx="1" />{dim && <rect x={x + dx + 2} y={top + 4} width="2.4" height="2.4" fill="#fde68a" opacity="0.9" />}</g>)}</g>}
  </g>;
}
