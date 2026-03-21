// ─── Types ────────────────────────────────────────────────────────────────────

export type PropertyColor =
  | 'brown' | 'lightBlue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'blue'
  | 'railroad' | 'utility';

export type ActionType =
  | 'just_say_no' | 'birthday' | 'debt_collector'
  | 'rent' | 'wild_rent' | 'double_rent'
  | 'deal_breaker' | 'sly_deal' | 'forced_deal';

export interface MDCard {
  id: string;
  type: 'money' | 'property' | 'wildProperty' | 'action';
  name: string;
  value: number;
  // money
  denomination?: number;
  // property / wildProperty
  color?: PropertyColor;
  wildColors?: PropertyColor[];
  // action
  action?: ActionType;
  rentColors?: PropertyColor[];
}

export interface MDPlayer {
  id: string;
  name: string;
  bank: MDCard[];
  sets: Partial<Record<PropertyColor, MDCard[]>>;
}

export interface PaymentTask {
  playerId: string;
  amount: number;
}

export interface MDPendingAction {
  type: 'payment';
  actorId: string;
  actionType: ActionType;
  queue: PaymentTask[];      // remaining payers
  jsnCount: number;          // 0=target can JSN/pay, 1=actor can counter, 2=target again…
  card: MDCard;
  doubleRent?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALL_COLORS: PropertyColor[] = [
  'brown', 'lightBlue', 'pink', 'orange',
  'red', 'yellow', 'green', 'blue',
  'railroad', 'utility',
];

export const SET_SIZES: Record<PropertyColor, number> = {
  brown: 2, lightBlue: 3, pink: 3, orange: 3,
  red: 3, yellow: 3, green: 3, blue: 2,
  railroad: 4, utility: 2,
};

export const COLOR_BG: Record<PropertyColor, string> = {
  brown: '#7c3f00', lightBlue: '#00b0f0', pink: '#e91e8c',
  orange: '#ff6600', red: '#e2001a', yellow: '#f5c400',
  green: '#00853e', blue: '#0033a0', railroad: '#555', utility: '#888',
};

export const COLOR_LABEL: Record<PropertyColor, string> = {
  brown: 'Marron', lightBlue: 'Bleu clair', pink: 'Rose',
  orange: 'Orange', red: 'Rouge', yellow: 'Jaune',
  green: 'Vert', blue: 'Bleu foncé', railroad: 'Gare', utility: 'Service',
};

// Rent chart indexed by number of cards in set
export const RENT: Record<PropertyColor, number[]> = {
  brown:     [0, 1, 2],
  lightBlue: [0, 1, 2, 3],
  pink:      [0, 1, 2, 4],
  orange:    [0, 1, 3, 5],
  red:       [0, 2, 3, 6],
  yellow:    [0, 2, 4, 6],
  green:     [0, 2, 4, 7],
  blue:      [0, 3, 8],
  railroad:  [0, 1, 2, 3, 4],
  utility:   [0, 1, 2],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function safeBank(p: MDPlayer): MDCard[] {
  return p.bank ?? [];
}

export function safeSets(p: MDPlayer): Partial<Record<PropertyColor, MDCard[]>> {
  return p.sets ?? {};
}

export function safeSet(p: MDPlayer, color: PropertyColor): MDCard[] {
  return (p.sets ?? {})[color] ?? [];
}

export function getBankTotal(p: MDPlayer): number {
  return safeBank(p).reduce((s, c) => s + c.value, 0);
}

export function isSetComplete(color: PropertyColor, cards: MDCard[]): boolean {
  return cards.length >= SET_SIZES[color];
}

export function countCompleteSets(p: MDPlayer): number {
  return ALL_COLORS.filter((c) => isSetComplete(c, safeSet(p, c))).length;
}

export function getRent(color: PropertyColor, count: number): number {
  const chart = RENT[color];
  return chart[Math.min(count, chart.length - 1)] ?? 0;
}

export function getValidWildColors(card: MDCard): PropertyColor[] {
  if (card.type === 'wildProperty' && card.wildColors) return card.wildColors;
  return [];
}

export function getOrCreatePlayerId(): string {
  const key = 'md_player_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ─── Deck ─────────────────────────────────────────────────────────────────────

let _nextId = 1;
function mk(partial: Omit<MDCard, 'id'>): MDCard {
  return { id: `md-${_nextId++}`, ...partial };
}

export function createMonopolyDealDeck(): MDCard[] {
  _nextId = 1;
  const cards: MDCard[] = [];

  // Money
  const moneyDenoms: [number, number][] = [
    [1, 6], [2, 5], [3, 3], [4, 3], [5, 2], [10, 1],
  ];
  for (const [denom, count] of moneyDenoms) {
    for (let i = 0; i < count; i++) {
      cards.push(mk({ type: 'money', name: `$${denom}M`, value: denom, denomination: denom }));
    }
  }

  // Properties
  const props: [PropertyColor, string, number, number][] = [
    ['brown',     'Mediterranean Avenue', 1, 1],
    ['brown',     'Baltic Avenue',        1, 1],
    ['lightBlue', 'Connecticut Avenue',   1, 1],
    ['lightBlue', 'Oriental Avenue',      1, 1],
    ['lightBlue', 'Vermont Avenue',       1, 1],
    ['pink',      'St. Charles Place',    2, 2],
    ['pink',      'States Avenue',        2, 2],
    ['pink',      'Virginia Avenue',      2, 2],
    ['orange',    'St. James Place',      2, 2],
    ['orange',    'Tennessee Avenue',     2, 2],
    ['orange',    'New York Avenue',      2, 2],
    ['red',       'Indiana Avenue',       3, 3],
    ['red',       'Illinois Avenue',      3, 3],
    ['red',       'Kentucky Avenue',      3, 3],
    ['yellow',    'Atlantic Avenue',      3, 3],
    ['yellow',    'Ventnor Avenue',       3, 3],
    ['yellow',    'Marvin Gardens',       3, 3],
    ['green',     'Pacific Avenue',       4, 4],
    ['green',     'North Carolina Ave',   4, 4],
    ['green',     'Pennsylvania Ave',     4, 4],
    ['blue',      'Boardwalk',            4, 4],
    ['blue',      'Park Place',           4, 4],
    ['railroad',  'Reading Railroad',     2, 2],
    ['railroad',  'Pennsylvania Railroad',2, 2],
    ['railroad',  'B&O Railroad',         2, 2],
    ['railroad',  'Short Line Railroad',  2, 2],
    ['utility',   'Electric Company',     2, 2],
    ['utility',   'Water Works',          2, 2],
  ];
  for (const [color, name, value] of props) {
    cards.push(mk({ type: 'property', name, value, color }));
  }

  // Wild properties
  const wilds: [PropertyColor[], number, number][] = [
    [['railroad', 'utility'], 0, 2],
    [['brown', 'lightBlue'],  1, 1],
    [['pink', 'orange'],      2, 2],
    [['red', 'yellow'],       3, 2],
    [['green', 'blue'],       4, 1],
    [['green', 'railroad'],   4, 1],
    [['lightBlue', 'railroad', 'utility'], 4, 1], // rainbow-ish
  ];
  for (const [wildColors, value, count] of wilds) {
    for (let i = 0; i < count; i++) {
      cards.push(mk({
        type: 'wildProperty',
        name: 'Joker propriété',
        value,
        wildColors,
      }));
    }
  }

  // Actions
  const actions: [ActionType, string, number, number, PropertyColor[]?][] = [
    ['just_say_no',   'Non Merci !',       4, 3],
    ['birthday',      'Anniversaire',      2, 3],
    ['debt_collector','Percepteur',        3, 3],
    ['double_rent',   'Double Loyer',      1, 2],
    ['deal_breaker',  'Coup de Maître',    5, 2],
    ['sly_deal',      'Saisie',            3, 3],
    ['forced_deal',   'Échange Forcé',     3, 3],
    ['rent',          'Loyer Marron/Bleu', 1, 2, ['brown', 'lightBlue']],
    ['rent',          'Loyer Rose/Orange', 1, 2, ['pink', 'orange']],
    ['rent',          'Loyer Rouge/Jaune', 3, 2, ['red', 'yellow']],
    ['rent',          'Loyer Vert/Bleu F.',4, 2, ['green', 'blue']],
    ['rent',          'Loyer Gare/Service',2, 2, ['railroad', 'utility']],
    ['wild_rent',     'Loyer Universel',   3, 3],
  ];
  for (const [action, name, value, count, rentColors] of actions) {
    for (let i = 0; i < count; i++) {
      cards.push(mk({ type: 'action', name, value, action, rentColors }));
    }
  }

  return cards;
}

export function shuffleDeck(deck: MDCard[]): MDCard[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
