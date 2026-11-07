import { motion } from 'framer-motion';
import { shade } from './Pet';

// Isometric drawing kit for the pet's room. A floor tile is 2A wide and A tall
// on screen; P(i, j, z) turns tile coordinates plus a height in pixels into a
// screen point. Light comes from the upper left: tops are lightest, the
// front-left faces mid, the front-right faces darkest.

export const A = 28;
export const OX = 200;
export const OY = 150;
export const WALL_H = 118;
export const P = (i: number, j: number, z = 0): [number, number] => [OX + (i - j) * A, OY + (i + j) * (A / 2) - z];
export const pts = (...points: [number, number][]) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const EDGE = 'rgba(15,23,42,0.10)';

type Spot = { x: number; y: number; w: number; d: number };

/** A lit box standing on tiles (x..x+w, y..y+d), lifted z pixels, h pixels tall. */
export function Box({ x, y, w, d, h, z = 0, color, top, left, right, opacity }: { x: number; y: number; w: number; d: number; h: number; z?: number; color: string; top?: string; left?: string; right?: string; opacity?: number; key?: string | number }) {
  const topFace = pts(P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h));
  const leftFace = pts(P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h));
  const rightFace = pts(P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h));
  return <g opacity={opacity} stroke={EDGE} strokeWidth="0.6" strokeLinejoin="round">
    <polygon points={leftFace} fill={left ?? shade(color, -0.06)} />
    <polygon points={rightFace} fill={right ?? shade(color, -0.24)} />
    <polygon points={topFace} fill={top ?? shade(color, 0.16)} />
  </g>;
}

/** An upright cylinder standing at a screen point (its base center). */
export function Cylinder({ cx, cy, r, h, color, top, opacity }: { cx: number; cy: number; r: number; h: number; color: string; top?: string; opacity?: number }) {
  const id = `cyl-${color.replace('#', '')}`;
  return <g opacity={opacity}>
    <defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor={shade(color, 0.08)} /><stop offset="0.55" stopColor={color} /><stop offset="1" stopColor={shade(color, -0.28)} /></linearGradient></defs>
    <path d={`M${cx - r} ${cy - h} L${cx - r} ${cy} A${r} ${r / 2} 0 0 0 ${cx + r} ${cy} L${cx + r} ${cy - h} Z`} fill={`url(#${id})`} />
    <ellipse cx={cx} cy={cy - h} rx={r} ry={r / 2} fill={top ?? shade(color, 0.22)} />
  </g>;
}

/** Soft contact shadow under a footprint. */
export function FootShadow({ x, y, w, d }: Spot) {
  return <polygon points={pts(P(x - 0.05, y + 0.1), P(x + w + 0.05, y + 0.1), P(x + w + 0.15, y + d + 0.15), P(x + 0.05, y + d + 0.15))} fill="#0f172a" opacity="0.10" />;
}

/** SVG transform that maps a face of a box (front-left when along i, front-right when along j) to a flat drawing surface. */
const faceAlongI = (x: number, j: number, z: number) => { const [X, Y] = P(x, j, z); return `matrix(1 0.5 0 1 ${X} ${Y})`; };
const faceAlongJ = (i: number, y: number, z: number) => { const [X, Y] = P(i, y, z); return `matrix(-1 0.5 0 1 ${X} ${Y})`; };

// ---- Furniture ---------------------------------------------------------------

export function Furniture({ item, x, y, w, d, night }: { item: string } & Spot & { night?: boolean }) {
  const [cx, cy] = P(x + w / 2, y + d / 2);
  const along = w >= d ? 'i' : 'j';
  switch (item) {
    case 'decor-plant': return <g>
      <ellipse cx={cx} cy={cy + 1} rx="13" ry="6" fill="#0f172a" opacity="0.12" />
      <Cylinder cx={cx} cy={cy} r={10} h={18} color="#e07a4f" />
      <ellipse cx={cx} cy={cy - 18} rx="8" ry="4" fill="#5b3a29" />
      <motion.g animate={{ rotate: [-2.5, 2.5, -2.5] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }} style={{ originX: 0.5, originY: 1 }}>
        {[[-16, -50, -0.5], [14, -54, 0.4], [-4, -64, -0.1], [-20, -36, -0.9], [20, -38, 0.9]].map(([dx, dy], index) => <path key={index} d={`M${cx} ${cy - 18} Q${cx + dx * 0.4} ${cy + dy * 0.5} ${cx + dx} ${cy + dy} Q${cx + dx * 0.9 + 6} ${cy + dy * 0.6} ${cx + 1} ${cy - 18} Z`} fill={index % 2 ? '#2f9e57' : '#4cbf6b'} stroke="#23824a" strokeWidth="0.6" />)}
      </motion.g>
    </g>;
    case 'decor-coinjar': return <g>
      <ellipse cx={cx} cy={cy + 1} rx="11" ry="5" fill="#0f172a" opacity="0.12" />
      {[0, 1, 2, 3].map(level => <ellipse key={level} cx={cx + (level % 2 ? 2 : -2)} cy={cy - 3 - level * 4} rx="7" ry="3" fill="#f6b73c" stroke="#c98612" strokeWidth="0.6" />)}
      <Cylinder cx={cx} cy={cy} r={9} h={24} color="#d7ecfb" opacity={0.55} />
      <Cylinder cx={cx} cy={cy - 24} r={8} h={4} color="#8aa1b8" />
      <ellipse cx={cx - 4} cy={cy - 14} rx="1.6" ry="7" fill="#fff" opacity="0.7" />
    </g>;
    case 'decor-lamp': return <g>
      {night && <ellipse cx={cx} cy={cy} rx="46" ry="23" fill="#ffe8a3" opacity="0.35" />}
      <ellipse cx={cx} cy={cy} rx="9" ry="4.5" fill="#475569" />
      <rect x={cx - 1.2} y={cy - 58} width="2.4" height="58" fill="#64748b" />
      <path d={`M${cx - 14} ${cy - 54} L${cx - 8} ${cy - 74} L${cx + 8} ${cy - 74} L${cx + 14} ${cy - 54} Z`} fill={night ? '#ffd166' : '#f7c948'} />
      <ellipse cx={cx} cy={cy - 54} rx="14" ry="4" fill={night ? '#fff1b8' : '#e8b33a'} />
      {night && <ellipse cx={cx} cy={cy - 60} rx="22" ry="14" fill="#fff4c2" opacity="0.35" />}
    </g>;
    case 'decor-piggy': return <g>
      <defs><radialGradient id="piggy-body" cx="38%" cy="30%" r="75%"><stop offset="0" stopColor="#ffe0ec" /><stop offset="0.6" stopColor="#f7a8c8" /><stop offset="1" stopColor="#e07aa7" /></radialGradient></defs>
      <ellipse cx={cx} cy={cy + 2} rx="18" ry="7" fill="#0f172a" opacity="0.13" />
      {[-9, -3, 4, 10].map((dx, index) => <rect key={dx} x={cx + dx - 2.5} y={cy - 6 + (index % 2) * 2} width="5" height="8" rx="2" fill="#e88ab3" />)}
      <ellipse cx={cx} cy={cy - 14} rx="19" ry="14" fill="url(#piggy-body)" />
      <ellipse cx={cx + 16} cy={cy - 15} rx="6" ry="5.5" fill="#f08cb7" /><circle cx={cx + 15} cy={cy - 15} r="1.2" fill="#8a2c54" /><circle cx={cx + 18} cy={cy - 15} r="1.2" fill="#8a2c54" />
      <path d={`M${cx + 2} ${cy - 26} l4 -7 l3 7 Z M${cx - 8} ${cy - 25} l3 -7 l4 6 Z`} fill="#ef8db6" />
      <circle cx={cx + 8} cy={cy - 19} r="1.6" fill="#3b1f2c" /><rect x={cx - 6} y={cy - 28} width="9" height="2" rx="1" fill="#a64b74" />
      <ellipse cx={cx - 6} cy={cy - 20} rx="6" ry="3" fill="#fff" opacity="0.45" />
    </g>;
    case 'decor-beanbag': return <g>
      <defs><radialGradient id="beanbag" cx="35%" cy="25%" r="80%"><stop offset="0" stopColor="#d9ccff" /><stop offset="0.6" stopColor="#a78bfa" /><stop offset="1" stopColor="#7c5cd6" /></radialGradient></defs>
      <ellipse cx={cx} cy={cy + 2} rx="22" ry="9" fill="#0f172a" opacity="0.13" />
      <path d={`M${cx - 22} ${cy} C${cx - 26} ${cy - 22} ${cx - 10} ${cy - 34} ${cx + 2} ${cy - 32} C${cx + 18} ${cy - 30} ${cx + 26} ${cy - 16} ${cx + 22} ${cy} C${cx + 10} ${cy + 7} ${cx - 10} ${cy + 7} ${cx - 22} ${cy} Z`} fill="url(#beanbag)" />
      <path d={`M${cx - 12} ${cy - 14} Q${cx} ${cy - 20} ${cx + 12} ${cy - 13}`} stroke="#c4b5fd" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>;
    case 'decor-table': {
      const legs = [[x + 0.12, y + 0.12], [x + w - 0.24, y + 0.12], [x + 0.12, y + d - 0.24], [x + w - 0.24, y + d - 0.24]];
      const [mx, my] = P(x + w * 0.65, y + d * 0.45, 18);
      return <g>
        <FootShadow x={x + 0.1} y={y + 0.1} w={w - 0.2} d={d - 0.2} />
        {legs.map(([lx, ly], index) => <Box key={index} x={lx} y={ly} w={0.12} d={0.12} h={14} color="#8a5a36" />)}
        <Box x={x + 0.05} y={y + 0.05} w={w - 0.1} d={d - 0.1} h={4} z={14} color="#c58b5a" />
        <Cylinder cx={mx} cy={my} r={4.5} h={7} color="#f4f4f5" /><path d={`M${mx + 4.5} ${my - 5} q4 1 0 4`} stroke="#e4e4e7" strokeWidth="1.6" fill="none" />
        <Box x={x + w * 0.2} y={y + d * 0.3} w={0.45} d={0.32} h={3} z={18} color="#3b82f6" />
      </g>;
    }
    case 'decor-bookshelf': {
      const h = 66;
      const books = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
      const length = (along === 'i' ? w : d) * A;
      const transform = along === 'i' ? faceAlongI(x, y + d, h) : faceAlongJ(x + w, y, h);
      return <g>
        <FootShadow x={x} y={y} w={w} d={d} />
        <Box x={x} y={y} w={w} d={d} h={h} color="#b9824f" />
        <g transform={transform}>
          <rect x="3" y="3" width={length - 6} height={h - 6} fill="#6b4226" />
          {[0, 1, 2].map(row => <g key={row}>
            {Array.from({ length: Math.floor((length - 10) / 7) }, (_, index) => { const tall = 13 + ((index * 7 + row * 3) % 6); return <rect key={index} x={6 + index * 7} y={5 + row * 20 + (19 - tall)} width="5.5" height={tall} rx="0.8" fill={books[(index + row * 3) % books.length]} />; })}
            <rect x="3" y={4 + row * 20 + 19} width={length - 6} height="2.5" fill="#b9824f" />
          </g>)}
        </g>
      </g>;
    }
    case 'decor-sofa': {
      const color = '#5b8def';
      const seat = 13; const back = 0.32; const arm = 0.3;
      return <g>
        <FootShadow x={x} y={y} w={w} d={d} />
        {along === 'i'
          ? <>
            <Box x={x} y={y} w={w} d={back} h={34} color={shade(color, -0.08)} />
            <Box x={x} y={y + back} w={arm} d={d - back} h={22} color={color} />
            <Box x={x + arm} y={y + back} w={w - arm * 2} d={d - back} h={seat} color={color} />
            {[0, 1].map(index => <Box key={index} x={x + arm + 0.04 + index * (w - arm * 2) / 2} y={y + back + 0.04} w={(w - arm * 2) / 2 - 0.08} d={d - back - 0.12} h={5} z={seat} color={shade(color, 0.08)} />)}
            <Box x={x + w - arm} y={y + back} w={arm} d={d - back} h={22} color={color} />
          </>
          : <>
            <Box x={x} y={y} w={back} d={d} h={34} color={shade(color, -0.08)} />
            <Box x={x + back} y={y} w={w - back} d={arm} h={22} color={color} />
            <Box x={x + back} y={y + arm} w={w - back} d={d - arm * 2} h={seat} color={color} />
            {[0, 1].map(index => <Box key={index} x={x + back + 0.04} y={y + arm + 0.04 + index * (d - arm * 2) / 2} w={w - back - 0.12} d={(d - arm * 2) / 2 - 0.08} h={5} z={seat} color={shade(color, 0.08)} />)}
            <Box x={x + back} y={y + d - arm} w={w - back} d={arm} h={22} color={color} />
          </>}
      </g>;
    }
    case 'decor-bed': {
      const frame = '#c08a5c'; const blanket = '#f472b6';
      return <g>
        <FootShadow x={x} y={y} w={w} d={d} />
        {along === 'j'
          ? <>
            <Box x={x} y={y} w={w} d={0.2} h={40} color={shade(frame, -0.05)} />
            <Box x={x} y={y + 0.2} w={w} d={d - 0.2} h={10} color={frame} />
            <Box x={x + 0.08} y={y + 0.24} w={w - 0.16} d={d - 0.32} h={8} z={10} color="#f8fafc" />
            <Box x={x + 0.2} y={y + 0.32} w={w - 0.4} d={0.55} h={6} z={18} color="#ffffff" />
            <Box x={x + 0.06} y={y + d * 0.42} w={w - 0.12} d={d * 0.58 - 0.06} h={9} z={10} color={blanket} />
          </>
          : <>
            <Box x={x} y={y} w={0.2} d={d} h={40} color={shade(frame, -0.05)} />
            <Box x={x + 0.2} y={y} w={w - 0.2} d={d} h={10} color={frame} />
            <Box x={x + 0.24} y={y + 0.08} w={w - 0.32} d={d - 0.16} h={8} z={10} color="#f8fafc" />
            <Box x={x + 0.32} y={y + 0.2} w={0.55} d={d - 0.4} h={6} z={18} color="#ffffff" />
            <Box x={x + w * 0.42} y={y + 0.06} w={w * 0.58 - 0.06} d={d - 0.12} h={9} z={10} color={blanket} />
          </>}
      </g>;
    }
    case 'decor-aquarium': {
      const length = (along === 'i' ? w : d) * A;
      const transform = along === 'i' ? faceAlongI(x + 0.05, y + d - 0.05, 46) : faceAlongJ(x + w - 0.05, y + 0.05, 46);
      return <g>
        <FootShadow x={x} y={y} w={w} d={d} />
        <Box x={x} y={y} w={w} d={d} h={16} color="#334155" />
        <Box x={x + 0.05} y={y + 0.05} w={w - 0.1} d={d - 0.1} h={30} z={16} color="#7dd3fc" top="#bae6fd" opacity={0.75} />
        <g transform={transform}>
          <rect x="2" y="22" width={length - 8} height="6" fill="#fde68a" opacity="0.9" />
          {[0, 1].map(index => <motion.path key={index} d={`M0 ${8 + index * 8} q5 -4 10 0 q-5 4 -10 0 Z M10 ${8 + index * 8} l4 -3 l0 6 Z`} fill={index ? '#f472b6' : '#fb923c'} animate={{ x: index ? [length - 24, 6, length - 24] : [6, length - 24, 6] }} transition={{ duration: 7 + index * 2, repeat: Infinity, ease: 'easeInOut' }} />)}
          <motion.circle cx={length - 16} cy="20" r="1.4" fill="#fff" animate={{ cy: [22, 2], opacity: [0.9, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />
        </g>
      </g>;
    }
    case 'decor-desk': {
      const legs = [[x + 0.06, y + 0.06], [x + w - 0.16, y + 0.06], [x + 0.06, y + d - 0.16], [x + w - 0.16, y + d - 0.16]];
      const mon = along === 'i' ? { x: x + w * 0.3, y: y + 0.1, w: w * 0.4, d: 0.08 } : { x: x + 0.1, y: y + d * 0.3, w: 0.08, d: d * 0.4 };
      const screen = along === 'i' ? faceAlongI(mon.x, mon.y + mon.d, 56) : faceAlongJ(mon.x + mon.w, mon.y, 56);
      const length = (along === 'i' ? mon.w : mon.d) * A;
      return <g>
        <FootShadow x={x} y={y} w={w} d={d} />
        {legs.map(([lx, ly], index) => <Box key={index} x={lx} y={ly} w={0.1} d={0.1} h={26} color="#1e293b" />)}
        <Box x={x} y={y} w={w} d={d} h={3} z={26} color="#334155" />
        <Box x={mon.x + mon.w / 2 - 0.05} y={mon.y + mon.d / 2 - 0.05} w={0.1} d={0.1} h={6} z={29} color="#0f172a" />
        <Box {...mon} h={22} z={34} color="#0f172a" />
        <g transform={screen}><motion.rect x="1.5" y="1.5" width={length - 3} height="18" rx="1.5" animate={{ fill: ['#8b5cf6', '#06b6d4', '#ec4899', '#8b5cf6'] }} transition={{ duration: 6, repeat: Infinity }} /></g>
        <Box x={along === 'i' ? x + w * 0.25 : x + w * 0.5} y={along === 'i' ? y + d * 0.55 : y + d * 0.25} w={along === 'i' ? w * 0.5 : 0.25} d={along === 'i' ? 0.25 : d * 0.5} h={1.5} z={29} color="#475569" top="#a78bfa" />
      </g>;
    }
    default: return <Box x={x} y={y} w={w} d={d} h={20} color="#cbd5e1" />;
  }
}

// ---- Wall pieces (drawn flat on a wall, 1 tile = A px across) ------------------

/** Transform that lays a flat drawing onto the left or right wall; (0,0) is the wall's top at its left end. */
export const wallTransform = (wall: 'left' | 'right') => wall === 'right' ? `matrix(1 0.5 0 1 ${OX} ${OY - WALL_H})` : `matrix(1 -0.5 0 1 ${P(0, 6)[0]} ${P(0, 6)[1] - WALL_H})`;

export function WallArt({ item, u, now }: { item: string; u: number; now: Date }) {
  const s = u * A;
  switch (item) {
    case 'decor-poster': return <g transform={`translate(${s + 8} 24)`}>
      <rect width="40" height="52" rx="3" fill="#fff" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="5" y="5" width="30" height="30" rx="2" fill="#ecfdf5" />
      <path d="M9 30 L16 22 L22 26 L30 13" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 13 L30 13 L30 17" stroke="#10b981" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="7" y="40" width="26" height="3" rx="1.5" fill="#cbd5e1" /><rect x="11" y="46" width="18" height="2.5" rx="1.25" fill="#e2e8f0" />
    </g>;
    case 'decor-clock': {
      const minute = now.getMinutes(); const hour = (now.getHours() % 12) + minute / 60;
      return <g transform={`translate(${s + 14} 40)`}>
        <circle r="12" fill="#fff" stroke="#94a3b8" strokeWidth="2.5" />
        {[0, 90, 180, 270].map(angle => <line key={angle} x1="0" y1="-9.5" x2="0" y2="-7.5" stroke="#94a3b8" strokeWidth="1.5" transform={`rotate(${angle})`} />)}
        <line x1="0" y1="0" x2="0" y2="-5.5" stroke="#334155" strokeWidth="2" strokeLinecap="round" transform={`rotate(${hour * 30})`} />
        <line x1="0" y1="0" x2="0" y2="-8.5" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${minute * 6})`} />
        <circle r="1.6" fill="#f43f5e" />
      </g>;
    }
    case 'decor-frame': return <g transform={`translate(${s + 4} 30)`}>
      <rect width="20" height="24" rx="2" fill="#d4a373" /><rect x="2.5" y="2.5" width="15" height="19" fill="#fef3c7" />
      <path d="M5 19 C5 12 7.5 9 10 9 C12.5 9 15 12 15 19 Z" fill="#fde2e4" stroke="#e9a8b5" strokeWidth="0.6" />
      <circle cx="8.6" cy="14.5" r="0.8" fill="#2b2b3a" /><circle cx="11.4" cy="14.5" r="0.8" fill="#2b2b3a" />
    </g>;
    case 'decor-shelf': return <g transform={`translate(${s + 4} 52)`}>
      <rect x="0" y="0" width="48" height="4" rx="1" fill="#b9824f" /><rect x="0" y="4" width="48" height="3" fill="#8a5a36" />
      <rect x="4" y="-14" width="4" height="14" fill="#ef4444" /><rect x="8.5" y="-12" width="4" height="12" fill="#3b82f6" /><rect x="13" y="-15" width="4" height="15" fill="#f59e0b" />
      <path d="M33 0 L31 -8 L41 -8 L39 0 Z" fill="#e07a4f" /><path d="M36 -8 C30 -16 32 -22 36 -24 C40 -22 42 -16 36 -8 Z" fill="#4cbf6b" />
    </g>;
    case 'decor-lights': return <g>
      <path d={`M${s + 2} 10 Q${s + 21} 26 ${s + 42} 12 Q${s + 63} 26 ${s + 82} 10`} stroke="#64748b" strokeWidth="1" fill="none" />
      {Array.from({ length: 8 }, (_, index) => { const bx = s + 6 + index * 10.5; const by = 13 + Math.sin((index / 7) * Math.PI * 2) * 4 + 3; return <motion.circle key={index} cx={bx} cy={by} r="2.6" fill={['#fde047', '#f472b6', '#60a5fa', '#34d399'][index % 4]} animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.18 }} />; })}
    </g>;
    default: return null;
  }
}

// ---- Rugs (drawn flat on the floor, in tile units) ---------------------------------

export const floorTransform = `matrix(${A} ${A / 2} ${-A} ${A / 2} ${OX} ${OY})`;

export function RugArt({ item, x, y, w, d }: { item: string } & Spot) {
  const cx = x + w / 2; const cy = y + d / 2;
  if (item === 'rug-rainbow') return <g transform={floorTransform}>{['#fca5a5', '#fdba74', '#fde68a', '#86efac', '#93c5fd'].map((fill, index) => <ellipse key={fill} cx={cx} cy={cy} rx={w / 2 - index * 0.32} ry={d / 2 - index * 0.24} fill={fill} />)}</g>;
  return <g transform={floorTransform}><ellipse cx={cx} cy={cy} rx={w / 2 - 0.05} ry={d / 2 - 0.05} fill="#c4b5fd" /><ellipse cx={cx} cy={cy} rx={w / 2 - 0.4} ry={d / 2 - 0.4} fill="none" stroke="#ede9fe" strokeWidth="0.08" strokeDasharray="0.25 0.2" /></g>;
}

/** A small picture of one room item for the shop. */
export function RoomItemThumb({ item, slot, size, span }: { item: string; slot: string; size?: [number, number]; span?: number }) {
  if (slot === 'wall') {
    const width = (span ?? 1) * A + 8;
    return <svg viewBox={`-4 4 ${width} 86`} width="56" height="48" className="my-0.5 h-12 w-14"><rect x="-4" y="4" width={width} height="86" rx="6" fill="#eef2f7" /><WallArt item={item} u={0} now={new Date(2026, 0, 1, 10, 10)} /></svg>;
  }
  const [w, d] = size ?? [1, 1];
  const [cx, cy] = P(2 + w / 2, 2 + d / 2);
  const half = (w + d) * A / 4;
  const width = (w + d) * A + 12;
  const tall: Record<string, number> = { 'decor-plant': 66, 'decor-lamp': 76, 'decor-bookshelf': 68, 'decor-desk': 58, 'decor-aquarium': 48, 'decor-bed': 42, 'decor-sofa': 36, 'decor-beanbag': 34, 'decor-piggy': 32, 'decor-coinjar': 30, 'decor-table': 26 };
  const top = slot === 'rug' ? cy - half - 4 : cy - half - (tall[item] ?? 60) - 6;
  const height = cy + half + 6 - top;
  return <svg viewBox={`${cx - width / 2} ${top} ${width} ${height}`} width="56" height="48" className="my-0.5 h-12 w-14">{slot === 'rug' ? <RugArt item={item} x={2} y={2} w={w} d={d} /> : <Furniture item={item} x={2} y={2} w={w} d={d} />}</svg>;
}
