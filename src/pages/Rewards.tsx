import { useEffect, useMemo, useRef, useState, type ElementType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgePercent, CalendarCheck, Check, Copy, Download, Flame, Lock, Move, Paintbrush, PartyPopper, Pencil, PiggyBank, Plus, RotateCw, Share2, ShieldAlert, Shirt, Smile, Sofa, Sparkles, Target, TrendingDown, TrendingUp, Undo2, Wallet, X, Home as HomeIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ITEMS, OPTIONAL_SLOTS, PLACED_SLOTS, STAGES, itemById, type RewardItem } from '../lib/rewardsCatalog';
import { firstFreeSpot, fitsFloor, footprint, type FloorPiece, type RoomLayout, type RugPiece, type WallPiece } from '../lib/roomLayout';
import { canCopyPicture, copyPicture, roomPicture, savePicture, sharePicture } from '../lib/sharePicture';
import { Pet } from '../components/Pet';
import { PetRoom, type Selection } from '../components/PetRoom';
import { RoomItemThumb } from '../components/RoomArt';
import { Segmented } from '../components/Segmented';
import { CountUp } from '../components/CountUp';
import { celebrate } from '../components/Celebrations';
import { petLook, refreshRewards } from '../components/RewardsWatcher';

const CHALLENGE_ICONS: Record<string, ElementType> = { ShieldAlert, Wallet, PiggyBank, TrendingUp, TrendingDown, Sofa, BadgePercent, CalendarCheck, Target };
const THEME_SWATCH: Record<string, string> = { mango: 'from-amber-400 to-orange-500', sakura: 'from-pink-400 to-rose-400', matcha: 'from-lime-400 to-green-500', midnight: 'from-indigo-500 to-slate-700' };
const SHOP_TABS = [
  { value: 'look', label: 'Pet', icon: Smile, slots: ['color', 'eyes', 'pattern'] },
  { value: 'outfits', label: 'Outfits', icon: Shirt, slots: ['hat', 'face', 'neck'] },
  { value: 'furniture', label: 'Furniture', icon: Sofa, slots: ['furniture', 'wall', 'rug'] },
  { value: 'room', label: 'Room', icon: HomeIcon, slots: ['wallpaper', 'floor', 'window'] },
  { value: 'themes', label: 'Themes', icon: Paintbrush, slots: ['theme'] },
  { value: 'effects', label: 'Effects', icon: PartyPopper, slots: ['effect'] },
] as const;
const PET_SLOTS = ['color', 'eyes', 'pattern', 'hat', 'face', 'neck'];
const MOOD_TEXT = { happy: 'is happy. You saved this week!', content: 'is doing fine.', sleepy: 'is sleepy. Add to a goal to wake it up.' };

async function post(path: string, body: unknown) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

const isPlaced = (layout: RoomLayout, item: string) => layout.floor.some(piece => piece.item === item) || layout.wall.some(piece => piece.item === item) || layout.rug?.item === item;

/** Adds an item to a layout at the first open spot, or returns null when there's no room. */
function withPlaced(layout: RoomLayout, item: string): RoomLayout | null {
  const spot = firstFreeSpot(layout, item);
  if (!spot) return null;
  const slot = itemById(item)?.slot;
  if (slot === 'furniture') return { ...layout, floor: [...layout.floor, spot as FloorPiece] };
  if (slot === 'wall') return { ...layout, wall: [...layout.wall, spot as WallPiece] };
  return { ...layout, rug: spot as RugPiece };
}

export function Rewards({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { rewards, themeMode, accentColor, setAccentColor, setFocusGoalId } = useStore();
  const advanced = themeMode === 'advanced';
  const roomRef = useRef<SVGSVGElement>(null);
  const [tab, setTab] = useState<(typeof SHOP_TABS)[number]['value']>('look');
  const [selected, setSelected] = useState<RewardItem | null>(null);
  const [cheer, setCheer] = useState(0);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [draft, setDraft] = useState<RoomLayout | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [picture, setPicture] = useState<{ blob: Blob; url: string } | null>(null);
  const card = `rounded-3xl border shadow-sm ${advanced ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`;
  const accentText = advanced ? 'text-violet-300' : 'text-emerald-600';
  const primary = `inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${advanced ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-500 hover:bg-emerald-600'}`;
  const secondary = `inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50 ${advanced ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`;
  const chip = 'flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-slate-800 shadow-sm backdrop-blur';
  const tabItems = useMemo(() => ITEMS.filter(item => (SHOP_TABS.find(entry => entry.value === tab)?.slots as readonly string[]).includes(item.slot)), [tab]);
  useEffect(() => () => { if (picture) URL.revokeObjectURL(picture.url); }, [picture]);

  if (!rewards) return <div className="space-y-4"><div className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /></div>;

  const owned = new Set(rewards.owned);
  const layout = draft ?? rewards.layout;
  const editing = draft !== null;
  const egg = rewards.index === 0;
  // Shop preview: pet and room items are tried on before buying.
  const previewSlot = selected && !['theme', 'effect'].includes(selected.slot) && !PLACED_SLOTS.includes(selected.slot) ? { [selected.slot]: selected.id } : {};
  const look = petLook(rewards, previewSlot);
  const previewLayout = selected && PLACED_SLOTS.includes(selected.slot) && !isPlaced(layout, selected.id) ? withPlaced(layout, selected.id) ?? layout : layout;
  const isEquipped = (item: RewardItem) => item.slot === 'theme' ? accentColor === item.value : PLACED_SLOTS.includes(item.slot) ? isPlaced(rewards.layout, item.id) : rewards.equipped[item.slot] === item.id;

  const act = async (label: string, work: () => Promise<void>) => {
    setBusy(label); setError('');
    try { await work(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Something went wrong.'); }
    finally { setBusy(''); }
  };
  const saveLayout = (next: RoomLayout) => post('/api/rewards/layout', { layout: next });
  const place = async (item: RewardItem) => {
    const next = withPlaced(rewards.layout, item.id);
    if (!next) throw new Error('Your room is full. Tap Arrange to make space.');
    await saveLayout(next);
  };
  const use = async (item: RewardItem) => {
    if (item.slot === 'theme') setAccentColor(item.value as typeof accentColor);
    else if (PLACED_SLOTS.includes(item.slot)) await place(item);
    else await post('/api/rewards/equip', { slot: item.slot, item_id: item.id });
    refreshRewards();
    setCheer(value => value + 1);
  };
  const buy = (item: RewardItem) => act('buy', async () => {
    await post('/api/rewards/buy', { item_id: item.id });
    celebrate({ kind: 'success', title: `Got the ${item.name}!`, message: PLACED_SLOTS.includes(item.slot) ? 'Placed in your room. Tap Arrange to move it.' : `${item.cost} points` });
    await use(item).catch(reason => { refreshRewards(); throw reason; });
  });
  const takeOff = (item: RewardItem) => act('equip', async () => {
    if (PLACED_SLOTS.includes(item.slot)) await saveLayout({ ...rewards.layout, floor: rewards.layout.floor.filter(piece => piece.item !== item.id), wall: rewards.layout.wall.filter(piece => piece.item !== item.id), rug: rewards.layout.rug?.item === item.id ? null : rewards.layout.rug });
    else await post('/api/rewards/equip', { slot: item.slot, item_id: null });
    refreshRewards();
  });
  const startChallenge = (template: string, title: string) => act(template, async () => {
    const result = await post('/api/rewards/challenges', { template });
    refreshRewards();
    setCheer(value => value + 1);
    celebrate({ kind: 'success', title: 'Challenge started', message: result.goal_id ? `${title} · added to your goals` : title });
  });
  const cancelChallenge = (id: number) => act(`cancel-${id}`, async () => { await post(`/api/rewards/challenges/${id}/cancel`, {}); refreshRewards(); });
  const saveName = () => act('name', async () => { await post('/api/rewards/profile', { pet_name: name }); setEditingName(false); refreshRewards(); });
  const openGoal = (goalId: number | null) => { if (!goalId || !onNavigate) return; setFocusGoalId(goalId); onNavigate('plans'); };

  // ---- Arranging ----
  const startArranging = () => { setSelected(null); setDraft(rewards.layout); setSelection(null); };
  const finishArranging = () => act('layout', async () => { if (draft) await saveLayout(draft); setDraft(null); setSelection(null); refreshRewards(); celebrate({ kind: 'success', title: 'Room saved' }); });
  const unplaced = ITEMS.filter(item => PLACED_SLOTS.includes(item.slot) && owned.has(item.id) && !isPlaced(layout, item.id));
  const selectedPiece = selection && draft ? (selection.kind === 'floor' ? draft.floor[selection.index]?.item : selection.kind === 'wall' ? draft.wall[selection.index]?.item : selection.kind === 'rug' ? draft.rug?.item : null) : null;
  const rotate = () => {
    if (!draft || selection?.kind !== 'floor') return;
    const piece = draft.floor[selection.index];
    const [w, d] = footprint(piece.item, !piece.rotated);
    if (!fitsFloor(draft, piece.x, piece.y, w, d, { kind: 'floor', index: selection.index })) return setError('No space to turn it here. Move it first.');
    setError('');
    setDraft({ ...draft, floor: draft.floor.map((item, index) => index === selection.index ? { ...item, rotated: !item.rotated } : item) });
  };
  const putAway = () => {
    if (!draft || !selection) return;
    if (selection.kind === 'floor') setDraft({ ...draft, floor: draft.floor.filter((_, index) => index !== selection.index) });
    if (selection.kind === 'wall') setDraft({ ...draft, wall: draft.wall.filter((_, index) => index !== selection.index) });
    if (selection.kind === 'rug') setDraft({ ...draft, rug: null });
    setSelection(null);
  };
  const addFromTray = (item: RewardItem) => {
    if (!draft) return;
    const next = withPlaced(draft, item.id);
    if (!next) return setError('No open spot for that. Move or put something away first.');
    setError('');
    setDraft(next);
  };

  // ---- Sharing ----
  const makePicture = () => act('share', async () => {
    // A shop item being tried on shouldn't end up in the picture.
    if (selected) { setSelected(null); await new Promise(resolve => window.setTimeout(resolve, 80)); }
    if (!roomRef.current) return;
    const blob = await roomPicture(roomRef.current, { name: egg ? 'My Ipon egg' : rewards.pet_name, stage: rewards.stage.name, streak: rewards.streak, lifetime: rewards.lifetime, accent: accentColor });
    setPicture({ blob, url: URL.createObjectURL(blob) });
  });
  const shareText = `Meet ${egg ? 'my Ipon egg' : rewards.pet_name}! My saving buddy in FinGent grows every time I save.`;
  const filename = `${(egg ? 'ipon-egg' : rewards.pet_name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-room.png`;

  const lockedStage = (item: RewardItem) => (item.stage ?? 0) > rewards.index;
  const actionFor = (item: RewardItem) => {
    if (owned.has(item.id)) {
      if (isEquipped(item)) {
        if (PLACED_SLOTS.includes(item.slot)) return <div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1 text-sm font-bold ${accentText}`}><Check size={16} /> In your room</span><button disabled={!!busy} onClick={() => takeOff(item)} className={secondary}>Put away</button></div>;
        return OPTIONAL_SLOTS.includes(item.slot) ? <button disabled={!!busy} onClick={() => takeOff(item)} className={secondary}>Take off</button> : <span className={`inline-flex items-center gap-1 text-sm font-bold ${accentText}`}><Check size={16} /> In use</span>;
      }
      return <button disabled={!!busy} onClick={() => act('equip', () => use(item))} className={primary}>{PLACED_SLOTS.includes(item.slot) ? 'Place in room' : 'Use it'}</button>;
    }
    if (lockedStage(item)) return <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-500"><Lock size={14} /> At {STAGES[item.stage ?? 0].name}</span>;
    if (rewards.balance < item.cost) return <span className="text-sm font-bold text-slate-500">Need {item.cost - rewards.balance} more</span>;
    return <button disabled={!!busy} onClick={() => buy(item)} className={primary}><Sparkles size={15} /> Buy · {item.cost}</button>;
  };

  const history = showAllHistory ? rewards.events : rewards.events.slice(0, 6);

  return <div className="space-y-5 pb-10">
    <div>
      <h2 className="text-2xl font-black sm:text-3xl">Ipon</h2>
      <p className="mt-1 text-slate-500 dark:text-slate-400">Save, earn points, and grow {egg ? 'your pet' : rewards.pet_name}.</p>
    </div>

    {/* Room, pet, points */}
    <section className={`${card} overflow-hidden`}>
      <div className="relative">
        <PetRoom ref={roomRef} equipped={look.equipped} layout={editing ? layout : previewLayout} stage={rewards.index} mood={rewards.mood} cheer={cheer} hatchProgress={egg ? rewards.progress : 0}
          editing={editing} selected={selection} onSelect={setSelection} onLayoutChange={setDraft} />
        {!editing && <>
          <div className={`absolute left-3 top-3 ${chip} !text-sm`}><Sparkles size={15} className="text-amber-500" /><CountUp value={rewards.balance} format={value => Math.round(value).toLocaleString()} /> pts</div>
          {rewards.streak > 0 && <div className={`absolute right-3 top-3 ${chip} !text-orange-600`}><Flame size={14} /> {rewards.streak}-week streak</div>}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button onClick={startArranging} className={`${chip} hover:bg-white`}><Move size={14} /> Arrange</button>
            <button onClick={makePicture} disabled={busy === 'share'} className={`${chip} hover:bg-white`}><Share2 size={14} /> {busy === 'share' ? 'Making…' : 'Share'}</button>
          </div>
        </>}
        {editing && <div className={`absolute left-3 top-3 ${chip}`}><Move size={14} /> Drag things to move them</div>}
      </div>

      <AnimatePresence initial={false}>
        {editing && <motion.div key="arrange" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className={`space-y-3 border-t p-4 ${advanced ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="flex min-h-[2.5rem] flex-wrap items-center gap-2">
              {selection?.kind === 'pet' ? <p className="text-sm font-bold">{rewards.pet_name} <span className="font-normal text-slate-500">· drag to choose a favorite spot</span></p>
                : selectedPiece ? <>
                  <p className="mr-auto text-sm font-bold">{itemById(selectedPiece)?.name}</p>
                  {selection?.kind === 'floor' && <button onClick={rotate} className={secondary}><RotateCw size={15} /> Turn</button>}
                  <button onClick={putAway} className={secondary}><Undo2 size={15} /> Put away</button>
                </> : <p className="text-sm text-slate-500">Tap something to turn it or put it away. Wall pieces slide along the walls.</p>}
            </div>
            {unplaced.length > 0 && <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Your items</p>
              <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">{unplaced.map(item => <button key={item.id} onClick={() => addFromTray(item)} className={`flex shrink-0 flex-col items-center rounded-2xl border px-2 py-1.5 ${advanced ? 'border-slate-700' : 'border-slate-200'}`}><RoomItemThumb item={item.id} slot={item.slot} size={item.size} span={item.span} /><span className="flex items-center gap-0.5 text-[11px] font-bold"><Plus size={11} />{item.name}</span></button>)}</div>
            </div>}
            {error && <p className="text-sm text-rose-500">{error}</p>}
            <div className="flex justify-end gap-2"><button onClick={() => { setDraft(null); setSelection(null); setError(''); }} className={secondary}>Cancel</button><button disabled={busy === 'layout'} onClick={finishArranging} className={primary}><Check size={16} /> Save room</button></div>
          </div>
        </motion.div>}
      </AnimatePresence>

      {!editing && <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          {editingName
            ? <form onSubmit={event => { event.preventDefault(); void saveName(); }} className="flex min-w-0 flex-1 gap-2"><input autoFocus value={name} maxLength={24} onChange={event => setName(event.target.value)} aria-label="Pet name" className={`min-w-0 flex-1 rounded-xl border px-3 py-2 font-bold outline-none ${advanced ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50'}`} /><button className={primary} disabled={!!busy}>Save</button><button type="button" aria-label="Cancel" onClick={() => setEditingName(false)} className="rounded-xl p-2 text-slate-400"><X size={18} /></button></form>
            : <div className="min-w-0"><p className="flex items-center gap-2 text-lg font-black">{egg ? 'Your egg' : rewards.pet_name}{!egg && <button aria-label="Rename your pet" onClick={() => { setName(rewards.pet_name); setEditingName(true); }} className="rounded-lg p-1 text-slate-400 hover:text-slate-600"><Pencil size={14} /></button>}<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${advanced ? 'bg-violet-500/20 text-violet-200' : 'bg-emerald-50 text-emerald-700'}`}>{rewards.stage.name}</span></p><p className="text-sm text-slate-500">{egg ? 'Earn points by saving and it will hatch.' : `${rewards.pet_name} ${MOOD_TEXT[rewards.mood]}`}</p></div>}
        </div>
        {rewards.next && <div>
          <div className={`h-2.5 overflow-hidden rounded-full ${advanced ? 'bg-slate-700' : 'bg-slate-100'}`}><motion.div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-pink-400 to-violet-500" initial={{ width: 0 }} animate={{ width: `${Math.max(4, rewards.progress * 100)}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} /></div>
          <p className="mt-1.5 text-xs font-bold text-slate-500">{rewards.toNext.toLocaleString()} points to {egg ? 'hatching' : rewards.next.name} · {rewards.lifetime.toLocaleString()} earned in all</p>
        </div>}
        {error && !selected && <p className="text-sm text-rose-500">{error}</p>}
      </div>}
    </section>

    {/* Challenges */}
    <section className={`${card} p-4 sm:p-5`}>
      <h3 className="font-black">Challenges for you</h3>
      <p className="text-sm text-slate-500">Picked from your income and spending. Finish them for points.</p>
      <div className="mt-3 space-y-2">
        {rewards.challenges.active.map(challenge => { const Icon = CHALLENGE_ICONS[challenge.icon] ?? Target; return <motion.div layout key={challenge.id} className={`flex items-center gap-3 rounded-2xl p-3 ${advanced ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
          <ProgressRing percent={challenge.percent} advanced={advanced}><Icon size={16} /></ProgressRing>
          <button onClick={() => openGoal(challenge.goal_id)} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-bold">{challenge.title}</p><p className="truncate text-xs text-slate-500">{challenge.progress_label} · {challenge.params?.points ?? ''} pts</p></button>
          <button aria-label={`Stop ${challenge.title}`} disabled={!!busy} onClick={() => cancelChallenge(challenge.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"><X size={15} /></button>
        </motion.div>; })}
        {rewards.challenges.suggested.map(suggestion => { const Icon = CHALLENGE_ICONS[suggestion.icon] ?? Target; return <motion.div layout key={suggestion.template} className={`rounded-2xl border p-3 ${advanced ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${advanced ? 'bg-violet-500/15 text-violet-300' : 'bg-emerald-50 text-emerald-600'}`}><Icon size={18} /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold">{suggestion.title}</p><p className="mt-0.5 text-xs text-slate-500">{suggestion.why}</p></div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-2 pl-12">
            <span className="flex items-center gap-1 text-xs font-black text-amber-600"><Sparkles size={13} /> Up to {suggestion.points} pts</span>
            <button disabled={!!busy} onClick={() => startChallenge(suggestion.template, suggestion.title)} className={`${primary} !px-3 !py-1.5 !text-xs`}>{busy === suggestion.template ? 'Starting…' : 'Start'}</button>
          </div>
        </motion.div>; })}
        {!rewards.challenges.active.length && !rewards.challenges.suggested.length && <p className="text-sm text-slate-500">Record some income and spending, and challenges will show up here.</p>}
      </div>
    </section>

    {/* Shop */}
    <section className={`${card} p-4 sm:p-5`}>
      <div className="flex items-center justify-between gap-2"><h3 className="font-black">Shop</h3><span className="flex items-center gap-1 text-sm font-black text-amber-600"><Sparkles size={14} /> {rewards.balance.toLocaleString()}</span></div>
      <p className="text-sm text-slate-500">Customize {egg ? 'your pet' : rewards.pet_name} and decorate the room. Tap an item to try it.</p>
      <Segmented label="Shop section" size="sm" className="mt-3" value={tab} onChange={value => { setTab(value); setSelected(null); }} options={SHOP_TABS.map(entry => ({ value: entry.value, label: entry.label, icon: entry.icon }))} />
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {tabItems.map(item => {
          const isOwned = owned.has(item.id);
          const active = selected?.id === item.id;
          return <motion.button layout key={item.id} whileTap={{ scale: 0.94 }} onClick={() => setSelected(active ? null : item)} className={`relative flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition-colors ${active ? (advanced ? 'border-violet-400 bg-violet-500/10' : 'border-emerald-400 bg-emerald-50') : (advanced ? 'border-slate-700 hover:border-slate-500' : 'border-slate-100 hover:border-slate-300')}`}>
            <ItemThumb item={item} color={look.color} />
            <span className="w-full truncate text-[11px] font-bold">{item.name}</span>
            <span className={`text-[10px] font-bold ${isOwned ? accentText : lockedStage(item) ? 'text-slate-400' : 'text-amber-600'}`}>{isOwned ? (isEquipped(item) ? (PLACED_SLOTS.includes(item.slot) ? 'In room' : 'In use') : 'Owned') : lockedStage(item) ? `${STAGES[item.stage ?? 0].name}+` : item.cost ? `${item.cost} pts` : 'Free'}</span>
          </motion.button>;
        })}
      </div>
      <AnimatePresence>
        {selected && <motion.div key={selected.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className={`mt-3 flex items-center gap-3 rounded-2xl p-3 ${advanced ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
          <div className="w-28 shrink-0 overflow-hidden rounded-xl">{PET_SLOTS.includes(selected.slot)
            ? <div className="flex justify-center"><Pet stage={Math.max(1, rewards.index)} mood="happy" color={look.color} hat={look.hat} face={look.face} neck={look.neck} eyes={look.eyes} pattern={look.pattern} size={90} cheer={cheer} /></div>
            : selected.slot === 'theme' ? <div className={`h-16 rounded-xl bg-gradient-to-br ${THEME_SWATCH[selected.value ?? ''] ?? ''}`} />
            : selected.slot === 'effect' ? <div className="flex h-16 items-center justify-center text-amber-500"><PartyPopper size={30} /></div>
            : <PetRoom equipped={look.equipped} layout={previewLayout} stage={rewards.index} mood={rewards.mood} />}</div>
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{selected.name}</p><p className="text-xs text-slate-500">{selected.slot === 'theme' ? 'Changes the whole app’s colors.' : selected.slot === 'effect' ? 'Plays when you reach a goal.' : PLACED_SLOTS.includes(selected.slot) ? (owned.has(selected.id) ? 'Arrange it anywhere in your room.' : 'Shown in your room up top.') : 'Previewing on your pet.'}</p><div className="mt-2">{actionFor(selected)}</div></div>
        </motion.div>}
      </AnimatePresence>
      {error && selected && <p className="mt-2 text-sm text-rose-500">{error}</p>}
    </section>

    {/* History */}
    <section className={`${card} p-4 sm:p-5`}>
      <h3 className="font-black">Points history</h3>
      <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-700/60">
        {history.map(event => <div key={event.ref_key} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{event.label}</p><p className="text-[11px] text-slate-500">{event.date}</p></div>
          <span className={`shrink-0 text-sm font-black ${event.points > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{event.points > 0 ? '+' : ''}{event.points}</span>
        </div>)}
        {!rewards.events.length && <p className="py-2 text-sm text-slate-500">Points you earn and spend show up here.</p>}
      </div>
      {rewards.events.length > 6 && <button onClick={() => setShowAllHistory(value => !value)} className={`mt-1 text-xs font-bold ${accentText}`}>{showAllHistory ? 'Show less' : 'Show all'}</button>}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Points come from real progress: goal milestones (bigger goals earn more), weekly saving streaks, first steps, and challenges. Taking money out never removes points, and points have no cash value.</p>
    </section>

    <AnimatePresence>
      {picture && <motion.div key="share" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setPicture(null)}>
        <motion.div role="dialog" aria-modal="true" aria-label="Share your room" onMouseDown={event => event.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} className={`w-full max-w-sm rounded-t-3xl p-4 shadow-2xl sm:rounded-3xl ${advanced ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}`}>
          <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-black">Share your room</h3><button aria-label="Close" onClick={() => setPicture(null)} className="rounded-lg p-2 text-slate-400"><X size={18} /></button></div>
          <img src={picture.url} alt={`${rewards.pet_name}'s room`} className="mx-auto max-h-[52vh] w-auto rounded-2xl shadow-md" />
          <p className="mt-3 text-xs text-slate-500">Shows your pet, room, stage, streak, and points. No balances or amounts.</p>
          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
            <button disabled={busy === 'send'} onClick={() => act('send', async () => { const result = await sharePicture(picture.blob, { title: `${rewards.pet_name}'s room`, text: shareText, filename }); if (result === 'saved') celebrate({ kind: 'success', title: 'Picture saved', message: filename }); if (result !== 'cancelled') setPicture(null); })} className={primary}><Share2 size={16} /> Share</button>
            <button aria-label="Save picture" title="Save picture" onClick={() => { savePicture(picture.blob, filename); celebrate({ kind: 'success', title: 'Picture saved', message: filename }); }} className={secondary}><Download size={16} /></button>
            {canCopyPicture() && <button aria-label="Copy picture" title="Copy picture" onClick={() => act('copy', async () => { await copyPicture(picture.blob); celebrate({ kind: 'success', title: 'Copied', message: 'Paste it into any chat' }); })} className={secondary}><Copy size={16} /></button>}
          </div>
          {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </div>;
}

function ProgressRing({ percent, advanced, children }: { percent: number; advanced: boolean; children: ReactNode }) {
  const circumference = 2 * Math.PI * 17;
  return <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
    <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90"><circle cx="20" cy="20" r="17" fill="none" strokeWidth="4" className={advanced ? 'stroke-slate-700' : 'stroke-slate-200'} /><motion.circle cx="20" cy="20" r="17" fill="none" strokeWidth="4" strokeLinecap="round" className={advanced ? 'stroke-violet-400' : 'stroke-emerald-500'} strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - Math.min(1, percent)) }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} /></svg>
    <span className={advanced ? 'text-violet-300' : 'text-emerald-600'}>{children}</span>
  </span>;
}

function ItemThumb({ item, color }: { item: RewardItem; color: string }) {
  if (item.slot === 'color') return <Pet stage={1} mood="happy" color={item.value ?? color} size={52} interactive={false} />;
  if (item.slot === 'eyes') return <Pet stage={1} mood="happy" color={color} eyes={item.id} size={52} interactive={false} />;
  if (item.slot === 'pattern') return <Pet stage={4} mood="content" color={color} pattern={item.id} size={52} interactive={false} />;
  if (['hat', 'face', 'neck'].includes(item.slot)) return <Pet stage={4} mood="content" color={color} hat={item.slot === 'hat' ? item.id : undefined} face={item.slot === 'face' ? item.id : undefined} neck={item.slot === 'neck' ? item.id : undefined} size={52} interactive={false} />;
  if (PLACED_SLOTS.includes(item.slot)) return <RoomItemThumb item={item.id} slot={item.slot} size={item.size} span={item.span} />;
  if (item.slot === 'theme') return <span className={`my-1.5 block h-10 w-10 rounded-xl bg-gradient-to-br ${THEME_SWATCH[item.value ?? ''] ?? ''}`} />;
  if (item.slot === 'effect') return <span className="my-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10"><PartyPopper size={20} /></span>;
  if (['wallpaper', 'floor'].includes(item.slot)) return <span className="my-1.5 block h-10 w-10 rounded-xl border border-black/5" style={{ background: item.value }} />;
  return <span className="my-1.5 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-slate-700 dark:text-slate-300"><HomeIcon size={18} /></span>;
}
