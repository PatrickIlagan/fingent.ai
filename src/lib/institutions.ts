// Philippine banks, digital banks, and e-wallets offered as presets when adding
// an account. A preset only fills in the account form; every field stays
// editable, and presets never change accounts that already exist.
//
// Rates were researched in November 2026 and change often:
//   - PesoHub savings rates (Nov 2, 2026): https://pesohub.ph/rates/savings-rates/best-savings-interest-rates-philippines/
//   - BitPinas digital bank rates (Nov 3, 2026): https://bitpinas.com/fintech/digital-banks-high-interest-rates-philippines/
//   - Fintech News PH comparison: https://fintechnews.ph/69840/digital-banking-news-philippines/philippines-digital-banks-deposit-interest-rates-compared/
//   - Maya Bank: https://www.mayabank.ph/highinterestsavings/
// Rates are annual and stored as fractions (0.03 = 3% p.a.), before the 20% final tax.

export const CATALOG_AS_OF = 'Nov 2026';

export type InstitutionKind = 'digital' | 'bank' | 'wallet' | 'card';

export type InterestPreset = {
  rate_pa: number;
  frequency: 'daily' | 'monthly';
  /** Day of the month monthly interest is credited; 31 = month end. */
  day?: number;
  /** A higher rate for the whole balance once it reaches `from`. */
  tiers?: { from: number; rate_pa: number }[];
  min_balance?: number;
  tax_rate?: number;
  /** Extra rate available through missions or promos; the user enters what they actually get. */
  boost?: { max_pa: number; cap?: number; until?: string; how: string };
};

export type Product = {
  id: string;
  name: string;
  type: 'Bank' | 'Digital' | 'Card';
  purpose?: string;
  interest?: InterestPreset;
  note?: string;
  /** No current official figure was found; shown as "check with your bank". */
  verify?: boolean;
};

export type Institution = {
  id: string;
  name: string;
  /** Short name used to build account names, e.g. "BPI" → "BPI Regular Savings". */
  label: string;
  initials: string;
  kinds: InstitutionKind[];
  /** Tailwind gradient used for the badge and the new account's card. */
  color: string;
  aliases?: string[];
  products: Product[];
};

const daily = (rate_pa: number, extra: Partial<InterestPreset> = {}): InterestPreset => ({ rate_pa, frequency: 'daily', ...extra });
const monthly = (rate_pa: number, extra: Partial<InterestPreset> = {}): InterestPreset => ({ rate_pa, frequency: 'monthly', day: 31, ...extra });
const wallet = (id: string, name = 'Wallet'): Product => ({ id, name, type: 'Digital', purpose: 'Wallet' });
const card = (id: string): Product => ({ id, name: 'Credit Card', type: 'Card' });
const regularSavings = (id: string, rate_pa = 0.000625, extra: Partial<InterestPreset> = {}, verify = true): Product => ({ id, name: 'Regular Savings', type: 'Bank', purpose: 'Savings', interest: monthly(rate_pa, extra), verify, note: verify ? 'Typical regular-savings rate; check your bank for the current figure.' : undefined });

export const INSTITUTIONS: Institution[] = [
  // Digital banks
  {
    id: 'maya', name: 'Maya', label: 'Maya', initials: 'M', kinds: ['digital', 'wallet'], color: 'from-emerald-400 to-green-600', aliases: ['Maya Bank', 'PayMaya'],
    products: [
      wallet('maya-wallet'),
      { id: 'maya-savings', name: 'Savings', type: 'Bank', purpose: 'Savings', interest: daily(0.03, { boost: { max_pa: 0.12, cap: 100000, how: 'Boost up to 15% p.a. on your first ₱100,000 by completing Maya missions each month (spending, bills, deposits).' } }), note: 'Interest is credited daily, after tax.' },
      { id: 'maya-goals', name: 'Personal Goals', type: 'Bank', purpose: 'Goal', interest: monthly(0.04, { boost: { max_pa: 0.04, cap: 100000, how: 'Rates go up to 8% p.a. depending on the goal, on up to ₱100,000 per goal.' } }), note: 'Tip: link it to a FinGent goal as a whole account.' },
    ],
  },
  { id: 'gotyme', name: 'GoTyme Bank', label: 'GoTyme', initials: 'GT', kinds: ['digital'], color: 'from-sky-400 to-cyan-600', products: [{ id: 'gotyme-gosave', name: 'Go Save', type: 'Bank', purpose: 'Savings', interest: monthly(0.03), note: 'Accrues daily, credited monthly.' }] },
  { id: 'maribank', name: 'MariBank', label: 'MariBank', initials: 'MB', kinds: ['digital'], color: 'from-orange-400 to-orange-600', aliases: ['SeaBank', 'Sea Bank', 'Shopee'], products: [{ id: 'maribank-savings', name: 'Savings', type: 'Bank', purpose: 'Savings', interest: daily(0.0325, { tiers: [{ from: 1000000, rate_pa: 0.0375 }] }), note: 'Formerly SeaBank. 3.75% p.a. once the balance is above ₱1,000,000.' }] },
  {
    id: 'tonik', name: 'Tonik', label: 'Tonik', initials: 'TK', kinds: ['digital'], color: 'from-fuchsia-500 to-pink-600',
    products: [
      { id: 'tonik-account', name: 'Account', type: 'Bank', purpose: 'Spending', interest: monthly(0.001), verify: true, note: 'Sources disagree on this rate; check the app.' },
      { id: 'tonik-solo-stash', name: 'Solo Stash', type: 'Bank', purpose: 'Savings', interest: monthly(0.0325) },
      { id: 'tonik-group-stash', name: 'Group Stash', type: 'Bank', purpose: 'Savings', interest: monthly(0.0325, { boost: { max_pa: 0.005, how: 'Up to 3.75% p.a. when saving with a group.' } }) },
    ],
  },
  { id: 'uno', name: 'UNO Digital Bank', label: 'UNO', initials: 'UNO', kinds: ['digital'], color: 'from-indigo-500 to-blue-700', products: [{ id: 'uno-ready', name: 'UNOready', type: 'Bank', purpose: 'Savings', interest: monthly(0.03, { tiers: [{ from: 5000, rate_pa: 0.035 }] }), note: '3.50% p.a. with ₱5,000 or more.' }] },
  { id: 'uniondigital', name: 'UnionDigital Bank', label: 'UnionDigital', initials: 'UD', kinds: ['digital'], color: 'from-orange-500 to-amber-500', products: [{ id: 'ud-save', name: 'UD Save', type: 'Bank', purpose: 'Savings', interest: monthly(0.03, { tiers: [{ from: 5000000, rate_pa: 0.0325 }] }), note: '3.25% p.a. from ₱5,000,000.' }] },
  { id: 'ownbank', name: 'OwnBank', label: 'OwnBank', initials: 'OB', kinds: ['digital'], color: 'from-teal-500 to-emerald-700', products: [{ id: 'ownbank-savings', name: 'Own It Savings', type: 'Bank', purpose: 'Savings', interest: monthly(0.038), note: 'Advertised as up to 3.80% p.a.; conditions may apply.' }] },
  { id: 'netbank', name: 'Netbank', label: 'Netbank', initials: 'NB', kinds: ['digital'], color: 'from-blue-500 to-indigo-600', products: [{ id: 'netbank-savings', name: 'Savings', type: 'Bank', purpose: 'Savings', interest: daily(0.0325), note: 'Up to 3.25% p.a., credited daily.' }] },
  { id: 'salmon', name: 'Salmon Bank', label: 'Salmon', initials: 'SL', kinds: ['digital'], color: 'from-rose-400 to-orange-400', products: [{ id: 'salmon-savings', name: 'Savings', type: 'Bank', purpose: 'Savings', interest: monthly(0.04), note: 'Advertised as up to 4.00% p.a.' }] },
  {
    id: 'cimb', name: 'CIMB Bank', label: 'CIMB', initials: 'CB', kinds: ['digital'], color: 'from-red-600 to-rose-700', aliases: ['GSave', 'UpSave'],
    products: [
      { id: 'cimb-upsave', name: 'UpSave', type: 'Bank', purpose: 'Savings', interest: monthly(0.023, { boost: { max_pa: 0.0185, until: '2026-12-31', how: 'Promo rate up to 4.15% p.a. until Dec 31, 2026 (conditions apply).' } }) },
      { id: 'cimb-gsave', name: 'GSave', type: 'Bank', purpose: 'Savings', interest: monthly(0.023, { boost: { max_pa: 0.0185, until: '2026-12-31', how: 'Promo rate up to 4.15% p.a. until Dec 31, 2026 (conditions apply).' } }), note: 'Opened through GCash.' },
      { id: 'cimb-grow', name: 'Grow', type: 'Bank', purpose: 'Savings', interest: monthly(0.023), note: 'Up to 2.30% p.a.' },
    ],
  },
  { id: 'diskartech', name: 'RCBC DiskarTech', label: 'DiskarTech', initials: 'DT', kinds: ['digital'], color: 'from-blue-600 to-sky-500', products: [{ id: 'diskartech-savings', name: 'Savings', type: 'Bank', purpose: 'Savings', interest: monthly(0.04), note: 'Up to 4.00% p.a. on balances up to ₱50,000.' }] },
  { id: 'komo', name: 'Komo by EastWest', label: 'Komo', initials: 'KO', kinds: ['digital'], color: 'from-purple-500 to-violet-700', products: [{ id: 'komo-savings', name: 'Savings', type: 'Bank', purpose: 'Savings', interest: monthly(0.025), note: 'Up to 2.50% p.a.' }] },
  {
    id: 'banko', name: 'BPI BanKo', label: 'BanKo', initials: 'BK', kinds: ['digital'], color: 'from-red-500 to-red-700',
    products: [
      { id: 'banko-todo', name: 'TODO Savings', type: 'Bank', purpose: 'Savings', interest: monthly(0.05, { min_balance: 5000 }), note: 'Up to 5.0% p.a. on balances from ₱5,000 to ₱1,000,000.' },
      { id: 'banko-pondoko', name: 'PondoKo', type: 'Bank', purpose: 'Savings', interest: monthly(0.000625) },
    ],
  },
  { id: 'ofbank', name: 'Overseas Filipino Bank', label: 'OFBank', initials: 'OF', kinds: ['digital'], color: 'from-blue-700 to-blue-900', products: [{ id: 'ofbank-savings', name: 'Savings', type: 'Bank', purpose: 'Savings', interest: monthly(0.0005) }] },

  // E-wallets
  { id: 'gcash', name: 'GCash', label: 'GCash', initials: 'G', kinds: ['wallet'], color: 'from-blue-500 to-blue-700', products: [wallet('gcash-wallet'), { id: 'gcash-gsave', name: 'GSave (CIMB)', type: 'Bank', purpose: 'Savings', interest: monthly(0.023, { boost: { max_pa: 0.0185, until: '2026-12-31', how: 'Promo rate up to 4.15% p.a. until Dec 31, 2026 (conditions apply).' } }), note: 'A CIMB savings account inside GCash.' }] },
  { id: 'shopeepay', name: 'ShopeePay', label: 'ShopeePay', initials: 'SP', kinds: ['wallet'], color: 'from-orange-500 to-red-500', products: [wallet('shopeepay-wallet')] },
  { id: 'grabpay', name: 'GrabPay', label: 'GrabPay', initials: 'GP', kinds: ['wallet'], color: 'from-green-500 to-emerald-600', products: [wallet('grabpay-wallet')] },
  { id: 'coins', name: 'Coins.ph', label: 'Coins.ph', initials: 'C', kinds: ['wallet'], color: 'from-blue-400 to-indigo-500', products: [wallet('coins-wallet')] },

  // Banks
  { id: 'bdo', name: 'BDO Unibank', label: 'BDO', initials: 'BDO', kinds: ['bank', 'card'], color: 'from-blue-700 to-indigo-800', products: [{ id: 'bdo-passbook', name: 'Passbook Savings', type: 'Bank', purpose: 'Savings', interest: monthly(0.000625, { min_balance: 10000 }), note: 'Earns interest from ₱10,000.' }, card('bdo-card')] },
  {
    id: 'bpi', name: 'BPI', label: 'BPI', initials: 'BPI', kinds: ['bank', 'card'], color: 'from-red-600 to-rose-800', aliases: ['Bank of the Philippine Islands'],
    products: [
      regularSavings('bpi-regular', 0.000625, { min_balance: 5000 }, false),
      { id: 'bpi-saveup', name: '#SaveUp', type: 'Bank', purpose: 'Savings', interest: monthly(0.000925) },
      { id: 'bpi-maxisaver', name: 'Maxi-Saver', type: 'Bank', purpose: 'Savings', interest: monthly(0.00125, { min_balance: 2000000 }), note: 'Earns its rate from ₱2,000,000.' },
      card('bpi-card'),
    ],
  },
  { id: 'metrobank', name: 'Metrobank', label: 'Metrobank', initials: 'MT', kinds: ['bank', 'card'], color: 'from-blue-600 to-blue-800', products: [regularSavings('metrobank-regular', 0.000625, { min_balance: 10000 }, false), card('metrobank-card')] },
  { id: 'landbank', name: 'Landbank', label: 'Landbank', initials: 'LB', kinds: ['bank'], color: 'from-green-600 to-green-800', aliases: ['Land Bank of the Philippines'], products: [regularSavings('landbank-regular')] },
  { id: 'pnb', name: 'PNB', label: 'PNB', initials: 'PNB', kinds: ['bank', 'card'], color: 'from-sky-700 to-blue-900', aliases: ['Philippine National Bank'], products: [regularSavings('pnb-regular'), card('pnb-card')] },
  { id: 'securitybank', name: 'Security Bank', label: 'Security Bank', initials: 'SB', kinds: ['bank', 'card'], color: 'from-sky-500 to-blue-600', products: [regularSavings('securitybank-regular'), card('securitybank-card')] },
  { id: 'unionbank', name: 'UnionBank', label: 'UnionBank', initials: 'UB', kinds: ['bank', 'card'], color: 'from-orange-500 to-orange-700', products: [regularSavings('unionbank-regular'), card('unionbank-card')] },
  { id: 'rcbc', name: 'RCBC', label: 'RCBC', initials: 'RC', kinds: ['bank', 'card'], color: 'from-blue-500 to-blue-700', products: [regularSavings('rcbc-regular'), card('rcbc-card')] },
  { id: 'chinabank', name: 'China Bank', label: 'China Bank', initials: 'CBC', kinds: ['bank', 'card'], color: 'from-red-700 to-red-900', products: [regularSavings('chinabank-regular'), card('chinabank-card')] },
  { id: 'eastwest', name: 'EastWest Bank', label: 'EastWest', initials: 'EW', kinds: ['bank', 'card'], color: 'from-violet-600 to-purple-800', products: [regularSavings('eastwest-regular'), card('eastwest-card')] },
  { id: 'psbank', name: 'PSBank', label: 'PSBank', initials: 'PS', kinds: ['bank'], color: 'from-blue-600 to-cyan-700', products: [regularSavings('psbank-regular')] },
  { id: 'aub', name: 'AUB', label: 'AUB', initials: 'AUB', kinds: ['bank', 'card'], color: 'from-rose-600 to-red-700', aliases: ['Asia United Bank'], products: [regularSavings('aub-regular'), card('aub-card')] },
  { id: 'hsbc', name: 'HSBC', label: 'HSBC', initials: 'HS', kinds: ['card'], color: 'from-slate-600 to-red-700', products: [card('hsbc-card')] },
];

export const KIND_FILTERS: { id: 'all' | InstitutionKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'digital', label: 'Digital banks' },
  { id: 'bank', label: 'Banks' },
  { id: 'wallet', label: 'E-wallets' },
  { id: 'card', label: 'Credit cards' },
];

/** Institutions matching a search and filter; products are narrowed to cards under the card filter. */
export function searchInstitutions(query: string, kind: 'all' | InstitutionKind = 'all') {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return INSTITUTIONS
    .filter(institution => kind === 'all' || institution.kinds.includes(kind))
    .map(institution => ({ ...institution, products: kind === 'card' ? institution.products.filter(product => product.type === 'Card') : institution.products }))
    .filter(institution => {
      const haystack = [institution.name, institution.label, ...(institution.aliases ?? []), ...institution.products.map(product => product.name)].join(' ').toLowerCase();
      return words.every(word => haystack.includes(word));
    });
}

/** Best rate a product advertises, for the picker ("up to 15%"). */
export const headlineRate = (product: Product) => {
  const interest = product.interest;
  if (!interest) return 0;
  return Math.max(interest.rate_pa + (interest.boost?.max_pa ?? 0), ...(interest.tiers ?? []).map(tier => tier.rate_pa));
};

/** Account form values for a product. Rates are shown in the form as percentages. */
export function accountFormFromPreset(institution: Institution, product: Product) {
  const interest = product.interest;
  const percent = (value: number | undefined) => value == null ? '' : String(Math.round(value * 100000) / 1000);
  return {
    name: `${institution.label} ${product.name}`.replace(/\s+/g, ' ').trim(),
    type: product.type,
    color: institution.color,
    purpose: product.purpose ?? '',
    preset_id: product.id,
    interest_rate_pa: interest ? percent(interest.rate_pa) : '',
    interest_mode: interest && interest.rate_pa > 0 ? 'auto' : 'off',
    interest_frequency: interest?.frequency ?? 'daily',
    interest_day: interest?.day ? String(interest.day) : '',
    interest_min_balance: interest?.min_balance ? String(interest.min_balance) : '',
    interest_tax_rate: interest ? percent(interest.tax_rate ?? 0.2) : '20',
    interest_tiers: (interest?.tiers ?? []).map(tier => ({ from: String(tier.from), rate_pa: percent(tier.rate_pa) })),
    interest_boost_pa: '',
    interest_cap: interest?.boost?.cap ? String(interest.boost.cap) : '',
    interest_boost_until: interest?.boost?.until ?? '',
    interest_fixed_amount: '',
  };
}

export const findProduct = (productId: string) => {
  for (const institution of INSTITUTIONS) {
    const product = institution.products.find(item => item.id === productId);
    if (product) return { institution, product };
  }
  return null;
};
