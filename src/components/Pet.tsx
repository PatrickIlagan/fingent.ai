import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';

// The Ipon pet: a round mochi drawn in layers (body, face, stage features,
// then hat / face / neck items) so colors and items swap cleanly.

type Mood = 'happy' | 'content' | 'sleepy';
export type PetProps = {
  stage: number; color: string; mood: Mood;
  hat?: string; face?: string; neck?: string; eyes?: string; pattern?: string;
  size?: number; x?: number; y?: number;
  /** Change this number to make the pet jump for joy. */
  cheer?: number;
  /** 0–1 progress toward hatching, shown as cracks on the egg. */
  hatchProgress?: number;
  interactive?: boolean;
  className?: string;
};

/** Mixes a hex color toward black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number) {
  const value = parseInt(hex.replace('#', ''), 16);
  const channel = (shift: number) => { const c = (value >> shift) & 255; return Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount); };
  return `#${[16, 8, 0].map(shift => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

const SCALE = [1, 0.74, 0.84, 0.92, 1, 1];
const BODY = 'M18 90 C18 50 37 28 60 28 C83 28 102 50 102 90 C102 101 90 106 60 106 C30 106 18 101 18 90 Z';

/** Body markings, drawn inside the body outline. */
function Pattern({ item, color }: { item?: string; color: string }) {
  const mark = shade(color, -0.22);
  if (item === 'pattern-belly') return <ellipse cx="60" cy="94" rx="24" ry="16" fill="#ffffff" opacity="0.55" />;
  if (item === 'pattern-spots') return <g fill={mark} opacity="0.55"><circle cx="30" cy="70" r="6" /><circle cx="88" cy="58" r="5" /><circle cx="80" cy="94" r="7" /><circle cx="40" cy="98" r="4" /><circle cx="70" cy="38" r="4" /></g>;
  if (item === 'pattern-stripes') return <g fill="none" stroke={mark} strokeWidth="4.5" strokeLinecap="round" opacity="0.5"><path d="M48 30 Q52 40 46 48" /><path d="M60 28 L60 44" /><path d="M72 30 Q68 40 74 48" /></g>;
  if (item === 'pattern-stars') return <g fill="#fff8c5" opacity="0.9">{[[32, 62], [86, 66], [70, 40], [42, 96], [82, 96]].map(([sx, sy], index) => <path key={index} transform={`translate(${sx} ${sy}) scale(${index % 2 ? 0.8 : 1})`} d="M0 -4 L1.2 -1.2 L4 -1 L1.8 1 L2.4 4 L0 2.4 L-2.4 4 L-1.8 1 L-4 -1 L-1.2 -1.2 Z" />)}</g>;
  return null;
}

export function Pet({ stage, color, mood, hat, face, neck, eyes = 'eyes-round', pattern, size = 160, x, y, cheer = 0, hatchProgress = 0, interactive = true, className = '' }: PetProps) {
  const id = useId().replace(/:/g, '');
  const body = useAnimationControls();
  const [sparkle, setSparkle] = useState(0);

  const hop = async (big = false) => {
    setSparkle(value => value + 1);
    await body.start({ y: [0, big ? -26 : -16, 0, -4, 0], scaleY: [1, 1.08, 0.86, 1.03, 1], scaleX: [1, 0.94, 1.12, 0.98, 1], transition: { duration: big ? 0.9 : 0.65, ease: 'easeOut' } });
  };
  useEffect(() => { if (cheer) void hop(true); }, [cheer]);

  const dark = shade(color, -0.18);
  const darker = shade(color, -0.34);
  const egg = stage === 0;

  return <svg x={x} y={y} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={egg ? 'Your pet is still an egg' : `Your pet, feeling ${mood}`} style={{ overflow: 'visible' }} className={`${interactive ? 'cursor-pointer' : ''} ${className}`} onClick={interactive ? () => void hop() : undefined}>
    <defs>
      <radialGradient id={`${id}-body`} cx="38%" cy="30%" r="80%">
        <stop offset="0" stopColor={shade(color, 0.45)} />
        <stop offset="0.55" stopColor={color} />
        <stop offset="1" stopColor={dark} />
      </radialGradient>
      <radialGradient id={`${id}-shadow`} cx="50%" cy="100%" r="70%">
        <stop offset="0" stopColor={darker} stopOpacity="0.55" />
        <stop offset="1" stopColor={darker} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-ground`} cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#0f172a" stopOpacity="0.28" />
        <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
      </radialGradient>
      <clipPath id={`${id}-clip`}><path d={BODY} /></clipPath>
      <radialGradient id={`${id}-aura`} cx="50%" cy="55%" r="50%">
        <stop offset="0" stopColor="#ffe58a" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ffe58a" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* Ground shadow breathes with the body. */}
    <motion.ellipse cx="60" cy="108" rx="40" ry="8" fill={`url(#${id}-ground)`} animate={{ rx: [40, 43, 40] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />

    {stage === 5 && <motion.circle cx="60" cy="70" r="56" fill={`url(#${id}-aura)`} animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.96, 1.04, 0.96] }} transition={{ duration: 3, repeat: Infinity }} style={{ originX: 0.5, originY: 0.5 }} />}

    {egg ? <Egg id={id} color={color} progress={hatchProgress} /> : (
      <motion.g animate={body} style={{ originX: 0.5, originY: 1 }}>
        <g transform={`translate(60 106) scale(${SCALE[stage] ?? 1}) translate(-60 -106)`}>
          <motion.g animate={{ scaleY: [1, 0.955, 1], scaleX: [1, 1.03, 1] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} style={{ originX: 0.5, originY: 1 }}>
            {/* Stage features behind the body */}
            {stage >= 3 && <g fill={dark}><ellipse cx="34" cy="40" rx="9" ry="11" transform="rotate(-24 34 40)" /><ellipse cx="86" cy="40" rx="9" ry="11" transform="rotate(24 86 40)" /><ellipse cx="34" cy="41" rx="4.5" ry="6" fill="#ffc9d6" opacity="0.8" transform="rotate(-24 34 41)" /><ellipse cx="86" cy="41" rx="4.5" ry="6" fill="#ffc9d6" opacity="0.8" transform="rotate(24 86 41)" /></g>}
            {stage >= 2 && <g fill={dark}><ellipse cx="44" cy="104" rx="9" ry="5" /><ellipse cx="76" cy="104" rx="9" ry="5" /></g>}
            {/* Body */}
            <path d={BODY} fill={`url(#${id}-body)`} />
            <g clipPath={`url(#${id}-clip)`}>
              <Pattern item={pattern} color={color} />
              {/* A soft inner shadow at the base and a rim light on the right make it look round. */}
              <ellipse cx="60" cy="112" rx="52" ry="26" fill={`url(#${id}-shadow)`} />
              <path d="M96 58 C104 74 104 92 96 102" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>
            <path d={BODY} fill="none" stroke={darker} strokeOpacity="0.22" strokeWidth="1.2" />
            <ellipse cx="43" cy="45" rx="14" ry="8.5" fill="#fff" opacity="0.5" transform="rotate(-22 43 45)" />
            <ellipse cx="36" cy="52" rx="3" ry="2" fill="#fff" opacity="0.75" />
            {/* Sprout tuft for little ones */}
            {(stage === 1 || stage === 2) && <g><path d="M60 30 C60 22 60 18 61 14" stroke="#4d9a5b" strokeWidth="2.4" fill="none" strokeLinecap="round" /><path d="M61 16 C66 8 76 9 77 13 C72 17 66 18 61 16 Z" fill="#7cc576" /><path d="M60 19 C55 12 46 13 45 17 C50 20 55 21 60 19 Z" fill="#94d58d" /></g>}
            <Face mood={mood} eyes={eyes} />
            {neck && <NeckItem item={neck} />}
            {face && <FaceItem item={face} />}
            {hat && <HatItem item={hat} />}
          </motion.g>
        </g>
      </motion.g>
    )}

    {!egg && mood === 'sleepy' && <g fontFamily="inherit" fontWeight="800" fill="#64748b">
      {[0, 1, 2].map(index => <motion.text key={index} attrX={86} attrY={40} fontSize={8 + index * 2} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0], x: [0, 6 + index * 3, 12 + index * 4], y: [0, -10 - index * 5, -22 - index * 8] }} transition={{ duration: 3, repeat: Infinity, delay: index, ease: 'easeOut' }}>z</motion.text>)}
    </g>}

    <AnimatePresence>
      {sparkle > 0 && <motion.g key={sparkle} initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1, delay: 0.3 }}>
        {[[-34, -28], [36, -30], [-42, 4], [44, 2], [0, -46]].map(([dx, dy], index) => <motion.path key={index} d="M0 -5 Q0 0 5 0 Q0 0 0 5 Q0 0 -5 0 Q0 0 0 -5 Z" fill={index % 2 ? '#fbbf24' : '#f472b6'} initial={{ x: 60, y: 64, scale: 0 }} animate={{ x: 60 + dx, y: 64 + dy, scale: [0, 1.4, 1] }} transition={{ duration: 0.6, ease: 'easeOut' }} />)}
      </motion.g>}
    </AnimatePresence>
  </svg>;
}

function Eyes({ eyes }: { eyes: string }) {
  if (eyes === 'eyes-smile') return <g stroke="#2b2b3a" strokeWidth="2.6" fill="none" strokeLinecap="round"><path d="M42 71 Q47 64 52 71" /><path d="M68 71 Q73 64 78 71" /></g>;
  const blink = { animate: { scaleY: [1, 1, 0.12, 1] }, transition: { duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.94, 1] }, style: { originX: 0.5, originY: 0.5 } };
  if (eyes === 'eyes-sparkle') return <motion.g {...blink}>{[47, 73].map(cx => <g key={cx}><ellipse cx={cx} cy="69" rx="5.4" ry="6.6" fill="#2b2b3a" /><ellipse cx={cx} cy="71" rx="4" ry="3.6" fill="#6d5bd0" opacity="0.85" /><circle cx={cx + 1.8} cy="66.4" r="2" fill="#fff" /><circle cx={cx - 1.8} cy="72" r="1" fill="#fff" /></g>)}</motion.g>;
  if (eyes === 'eyes-cat') return <motion.g {...blink}>{[47, 73].map(cx => <g key={cx}><path d={`M${cx - 6} 69 Q${cx} 61 ${cx + 6} 69 Q${cx} 77 ${cx - 6} 69 Z`} fill="#7bc96f" stroke="#2b2b3a" strokeWidth="1.4" /><ellipse cx={cx} cy="69" rx="1.3" ry="4.4" fill="#2b2b3a" /><circle cx={cx + 2} cy="66.8" r="1" fill="#fff" /></g>)}</motion.g>;
  return <motion.g {...blink}>
    <ellipse cx="47" cy="69" rx="4" ry="5" fill="#2b2b3a" /><ellipse cx="73" cy="69" rx="4" ry="5" fill="#2b2b3a" />
    <circle cx="48.4" cy="67" r="1.5" fill="#fff" /><circle cx="74.4" cy="67" r="1.5" fill="#fff" />
  </motion.g>;
}

function Face({ mood, eyes }: { mood: Mood; eyes: string }) {
  if (mood === 'sleepy') return <g stroke="#2b2b3a" strokeWidth="2.4" strokeLinecap="round" fill="none">
    <path d="M42 70 Q47 74 52 70" /><path d="M68 70 Q73 74 78 70" />
    <ellipse cx="60" cy="82" rx="2.6" ry="2" fill="#2b2b3a" stroke="none" />
    <ellipse cx="36" cy="79" rx="6" ry="3.6" fill="#ff9fb4" opacity="0.45" stroke="none" /><ellipse cx="84" cy="79" rx="6" ry="3.6" fill="#ff9fb4" opacity="0.45" stroke="none" />
  </g>;
  return <g>
    <Eyes eyes={eyes} />
    {mood === 'happy'
      ? <path d="M53 79 Q56.5 84 60 79 Q63.5 84 67 79" stroke="#2b2b3a" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      : <path d="M55 80 Q60 84 65 80" stroke="#2b2b3a" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
    <ellipse cx="36" cy="78" rx="6.5" ry="4" fill="#ff8fab" opacity={mood === 'happy' ? 0.6 : 0.42} /><ellipse cx="84" cy="78" rx="6.5" ry="4" fill="#ff8fab" opacity={mood === 'happy' ? 0.6 : 0.42} />
  </g>;
}

function Egg({ id, color, progress }: { id: string; color: string; progress: number }) {
  return <motion.g animate={{ rotate: progress > 0.6 ? [-6, 6, -6] : [-3, 3, -3] }} transition={{ duration: progress > 0.6 ? 1.2 : 2.6, repeat: Infinity, ease: 'easeInOut' }} style={{ originX: 0.5, originY: 1 }}>
    <defs><radialGradient id={`${id}-egg`} cx="40%" cy="30%" r="80%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f3e7d3" /></radialGradient></defs>
    <path d="M60 16 C82 16 95 50 95 74 C95 96 80 108 60 108 C40 108 25 96 25 74 C25 50 38 16 60 16 Z" fill={`url(#${id}-egg)`} stroke="#d9c7a8" strokeWidth="1.2" />
    <g fill={color}><circle cx="46" cy="52" r="7" /><circle cx="74" cy="64" r="9" /><circle cx="52" cy="86" r="6" /><circle cx="76" cy="92" r="4" /></g>
    <ellipse cx="46" cy="36" rx="8" ry="5" fill="#fff" opacity="0.7" transform="rotate(-25 46 36)" />
    {progress > 0.6 && <path d="M34 62 L42 58 L47 65 L54 57 L60 64 L67 56 L73 63 L80 57 L86 62" stroke="#a88f6a" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
  </motion.g>;
}

// ---- Items (positioned for the full-size body; the stage scale applies to them too) ----

function HatItem({ item }: { item: string }) {
  switch (item) {
    case 'hat-party': return <g transform="rotate(12 62 30)"><path d="M47 34 L62 2 L77 34 Z" fill="#f472b6" /><path d="M52 24 L72 24 M56 15 L68 15" stroke="#fde68a" strokeWidth="3" /><circle cx="62" cy="3" r="4.5" fill="#fde047" /><ellipse cx="62" cy="34" rx="16" ry="3.4" fill="#ec4899" /></g>;
    case 'hat-flower': return <g transform="translate(80 38)">{[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="0" cy="-7" rx="5" ry="7.5" fill="#fb7185" transform={`rotate(${angle})`} />)}<circle r="4" fill="#fde047" /></g>;
    case 'hat-cap': return <g><path d="M38 38 C38 20 50 13 60 13 C70 13 82 20 82 38 Z" fill="#3b82f6" /><path d="M76 36 C88 35 98 37 100 40 C92 42 82 41 76 40 Z" fill="#2563eb" /><circle cx="60" cy="14" r="2.6" fill="#1d4ed8" /><path d="M60 14 L60 37" stroke="#1d4ed8" strokeWidth="1.2" opacity="0.6" /></g>;
    case 'hat-beret': return <g transform="rotate(-14 60 28)"><ellipse cx="58" cy="28" rx="26" ry="10" fill="#ef4444" /><ellipse cx="58" cy="32" rx="22" ry="4" fill="#b91c1c" opacity="0.5" /><path d="M58 18 L60 11" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" /></g>;
    case 'hat-salakot': return <g><path d="M22 40 L60 10 L98 40 Q60 48 22 40 Z" fill="#d6a85c" /><path d="M22 40 Q60 48 98 40" stroke="#a0763a" strokeWidth="2" fill="none" /><path d="M41 25 L79 25 M33 32 L87 32 M50 18 L70 18" stroke="#a0763a" strokeWidth="1.2" opacity="0.7" /><circle cx="60" cy="10" r="3" fill="#a0763a" /></g>;
    case 'hat-headphones': return <g><path d="M24 66 C22 34 40 20 60 20 C80 20 98 34 96 66" stroke="#334155" strokeWidth="5" fill="none" strokeLinecap="round" /><rect x="14" y="58" width="13" height="22" rx="6" fill="#8b5cf6" /><rect x="93" y="58" width="13" height="22" rx="6" fill="#8b5cf6" /></g>;
    case 'hat-crown': return <g><path d="M40 36 L42 14 L52 26 L60 9 L68 26 L78 14 L80 36 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" /><circle cx="60" cy="27" r="3.2" fill="#ef4444" /><circle cx="48" cy="30" r="2.2" fill="#3b82f6" /><circle cx="72" cy="30" r="2.2" fill="#10b981" /></g>;
    default: return null;
  }
}

function FaceItem({ item }: { item: string }) {
  if (item === 'face-glasses') return <g stroke="#1f2937" strokeWidth="2" fill="#ffffff" fillOpacity="0.25"><circle cx="47" cy="69" r="9" /><circle cx="73" cy="69" r="9" /><path d="M56 68 Q60 65 64 68" fill="none" /></g>;
  if (item === 'face-shades') return <g fill="#1f2937">{[47, 73].map(cx => <path key={cx} transform={`translate(${cx} 69)`} d="M0 -10 L2.8 -3.4 L9.8 -3.1 L4.4 1.4 L6.2 8.2 L0 4.4 L-6.2 8.2 L-4.4 1.4 L-9.8 -3.1 L-2.8 -3.4 Z" />)}<path d="M56 67 L64 67" stroke="#1f2937" strokeWidth="2" /></g>;
  return null;
}

function NeckItem({ item }: { item: string }) {
  if (item === 'neck-bow') return <g transform="translate(60 96)"><path d="M0 0 L-11 -7 L-11 7 Z M0 0 L11 -7 L11 7 Z" fill="#8b5cf6" /><circle r="3" fill="#6d28d9" /></g>;
  if (item === 'neck-scarf') return <g><path d="M24 90 Q60 102 96 90 L96 97 Q60 109 24 97 Z" fill="#f97316" /><path d="M72 98 L78 114 L86 112 L80 97 Z" fill="#ea580c" /><path d="M32 93 L32 99 M44 96 L44 102 M56 97 L56 103 M68 97 L68 103 M80 95 L80 101" stroke="#fed7aa" strokeWidth="1.6" /></g>;
  if (item === 'neck-medal') return <g><path d="M50 86 L60 100 L70 86" stroke="#3b82f6" strokeWidth="4" fill="none" /><circle cx="60" cy="102" r="7" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" /><text x="60" y="105.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#92400e">₱</text></g>;
  return null;
}
