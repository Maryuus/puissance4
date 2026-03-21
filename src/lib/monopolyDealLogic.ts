export type PropertyColor =
  | 'brown'
  | 'lightBlue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkBlue'
  | 'railroad'
  | 'utility';

export type ActionType =
  | 'deal_breaker'
  | 'forced_deal'
  | 'sly_deal'
  | 'debt_collector'
  | 'birthday'
  | 'rent'
  | 'wild_rent'
  | 'double_rent'
  | 'just_say_no';

export interface MDCard {
  id: string;
  type: 'money' | 'property' | 'wildProperty' | 'action';
  value: number; // face value for payment purposes
  label: string;
  denomination?: number; // for money cards
  color?: PropertyColor; // for property cards
  name?: string; // property name
  wildColors?: PropertyColor[]; // for wildProperty: valid colors (empty = rainbow = any color)
  isRainbow?: boolean;
  action?: ActionType;
  rentColors?: [PropertyColor, PropertyColor]; // for rent cards
}

export interface MDPlayer {
  id: string;
  name: string;
  bank: MDCard[]; // money cards played to bank
  sets: Partial<Record<PropertyColor, MDCard[]>>; // property sets
}

export interface MDPendingAction {
  actionType: ActionType;
  actionCardId: string;
  actorId: string;
  jsnCount: number; // 0=none, 1=target JSN'd, 2=actor counter-JSN'd, etc.
  // Payment
  paymentQueue: { playerId: string; amountOwed: number; paid: boolean }[];
  currentPayerIndex: number;
  // Rent info
  rentColor?: PropertyColor;
  doubleRent: boolean;
  // Deal Breaker
  targetPlayerId?: string;
  targetColor?: PropertyColor;
  // Forced Deal
  actorCardId?: string;
  actorCardColor?: PropertyColor;
  targetCardId?: string;
  targetCardColor?: PropertyColor;
  // Sly Deal
  stolenCardId?: string;
  stolenCardColor?: PropertyColor;
  stolenFromPlayerId?: string;
}

// ===== CONSTANTS =====

export const ALL_COLORS: PropertyColor[] = [
  'brown', 'lightBlue', 'pink', 'orange', 'red',
  'yellow', 'green', 'darkBlue', 'railroad', 'utility',
];

export const SET_SIZES: Record<PropertyColor, number> = {
  brown: 2,
  lightBlue: 3,
  pink: 3,
  orange: 3,
  red: 3,
  yellow: 3,
  green: 3,
  darkBlue: 2,
  railroad: 4,
  utility: 2,
};

// Rent values: index = number of properties in set
export const RENT_CHART: Record<PropertyColor, number[]> = {
  brown:    [0, 1, 2],
  lightBlue:[0, 1, 2, 3],
  pink:     [0, 1, 2, 4],
  orange:   [0, 1, 3, 5],
  red:      [0, 2, 3, 6],
  yellow:   [0, 2, 4, 6],
  green:    [0, 2, 4, 7],
  darkBlue: [0, 3, 8],
  railroad: [0, 1, 2, 3, 4],
  utility:  [0, 1, 2],
};

export const COLOR_LABELS: Record<PropertyColor, string> = {
  brown:    'Marron',
  lightBlue:'Bleu Clair',
  pink:     'Rose',
  orange:   'Orange',
  red:      'Rouge',
  yellow:   'Jaune',
  green:    'Vert',
  darkBlue: 'Bleu Foncé',
  railroad: 'Chemin de Fer',
  utility:  'Services',
};

export const COLOR_BG: Record<PropertyColor, string> = {
  brown:    '#92400e',
  lightBlue:'#38bdf8',
  pink:     '#f472b6',
  orange:   '#fb923c',
  red:      '#ef4444',
  yellow:   '#eab308',
  green:    '#22c55e',
  darkBlue: '#1d4ed8',
  railroad: '#475569',
  utility:  '#a855f7',
};

// ===== DECK CREATION =====

let cardCounter = 0;

function makeCard(partial: Omit<MDCard, 'id'>): MDCard {
  return { ...partial, id: `md-${cardCounter++}` };
}

export function createMonopolyDealDeck(): MDCard[] {
  cardCounter = 0;
  const deck: MDCard[] = [];

  // ---- MONEY CARDS (20) ----
  const moneyDefs: [number, number][] = [
    [1, 6], [2, 5], [3, 3], [4, 3], [5, 2], [10, 1],
  ];
  for (const [denom, count] of moneyDefs) {
    for (let i = 0; i < count; i++) {
      deck.push(makeCard({
        type: 'money',
        value: denom,
        denomination: denom,
        label: `$${denom}M`,
      }));
    }
  }

  // ---- PROPERTY CARDS (28) ----
  const propertyDefs: [PropertyColor, string, number][] = [
    // [color, name, value]
    ['brown', 'Méd.', 1],
    ['brown', 'Baltic', 1],
    ['lightBlue', 'Orient', 1],
    ['lightBlue', 'Vermont', 1],
    ['lightBlue', 'Connecticut', 1],
    ['pink', 'St-Charles', 2],
    ['pink', 'States', 2],
    ['pink', 'Virginia', 2],
    ['orange', 'St-James', 2],
    ['orange', 'Tennessee', 2],
    ['orange', 'New York', 2],
    ['red', 'Kentucky', 3],
    ['red', 'Indiana', 3],
    ['red', 'Illinois', 3],
    ['yellow', 'Atlantic', 3],
    ['yellow', 'Ventnor', 3],
    ['yellow', 'Marvin', 3],
    ['green', 'Pacifique', 4],
    ['green', 'N. Carolina', 4],
    ['green', 'Pennsylvania', 4],
    ['darkBlue', 'Parc Place', 4],
    ['darkBlue', 'Boardwalk', 4],
    ['railroad', 'Reading', 2],
    ['railroad', 'Pennsylvania RR', 2],
    ['railroad', 'B&O', 2],
    ['railroad', 'Short Line', 2],
    ['utility', 'Électrique', 2],
    ['utility', 'Eau', 2],
  ];
  for (const [color, name, value] of propertyDefs) {
    deck.push(makeCard({
      type: 'property',
      value,
      label: name,
      color,
      name,
    }));
  }

  // ---- WILD PROPERTY CARDS (10) ----
  // rainbow × 2 (value $0, can go in ANY color)
  for (let i = 0; i < 2; i++) {
    deck.push(makeCard({
      type: 'wildProperty',
      value: 0,
      label: 'Joker Arc-en-ciel',
      wildColors: [],
      isRainbow: true,
    }));
  }
  // brown/lightBlue × 1 ($1)
  deck.push(makeCard({
    type: 'wildProperty',
    value: 1,
    label: 'Joker Marron/Bleu Clair',
    wildColors: ['brown', 'lightBlue'],
  }));
  // lightBlue/railroad × 2 ($1)
  for (let i = 0; i < 2; i++) {
    deck.push(makeCard({
      type: 'wildProperty',
      value: 1,
      label: 'Joker Bleu Clair/Chemin de Fer',
      wildColors: ['lightBlue', 'railroad'],
    }));
  }
  // pink/orange × 1 ($2)
  deck.push(makeCard({
    type: 'wildProperty',
    value: 2,
    label: 'Joker Rose/Orange',
    wildColors: ['pink', 'orange'],
  }));
  // red/yellow × 1 ($3)
  deck.push(makeCard({
    type: 'wildProperty',
    value: 3,
    label: 'Joker Rouge/Jaune',
    wildColors: ['red', 'yellow'],
  }));
  // green/darkBlue × 1 ($4)
  deck.push(makeCard({
    type: 'wildProperty',
    value: 4,
    label: 'Joker Vert/Bleu Foncé',
    wildColors: ['green', 'darkBlue'],
  }));
  // green/railroad × 1 ($4)
  deck.push(makeCard({
    type: 'wildProperty',
    value: 4,
    label: 'Joker Vert/Chemin de Fer',
    wildColors: ['green', 'railroad'],
  }));

  // ---- ACTION CARDS (38) ----
  // deal_breaker × 2 ($5)
  for (let i = 0; i < 2; i++) {
    deck.push(makeCard({ type: 'action', value: 5, label: 'Coup de Maître', action: 'deal_breaker' }));
  }
  // forced_deal × 3 ($3)
  for (let i = 0; i < 3; i++) {
    deck.push(makeCard({ type: 'action', value: 3, label: 'Échange Forcé', action: 'forced_deal' }));
  }
  // sly_deal × 3 ($3)
  for (let i = 0; i < 3; i++) {
    deck.push(makeCard({ type: 'action', value: 3, label: 'Saisie', action: 'sly_deal' }));
  }
  // debt_collector × 3 ($3)
  for (let i = 0; i < 3; i++) {
    deck.push(makeCard({ type: 'action', value: 3, label: 'Percepteur', action: 'debt_collector' }));
  }
  // birthday × 3 ($2)
  for (let i = 0; i < 3; i++) {
    deck.push(makeCard({ type: 'action', value: 2, label: 'Anniversaire', action: 'birthday' }));
  }
  // rent × 10 ($1 each, 2 per color pair)
  const rentPairs: [PropertyColor, PropertyColor][] = [
    ['brown', 'lightBlue'],
    ['pink', 'orange'],
    ['red', 'yellow'],
    ['green', 'darkBlue'],
    ['railroad', 'utility'],
  ];
  for (const pair of rentPairs) {
    for (let i = 0; i < 2; i++) {
      deck.push(makeCard({
        type: 'action',
        value: 1,
        label: `Loyer ${COLOR_LABELS[pair[0]]}/${COLOR_LABELS[pair[1]]}`,
        action: 'rent',
        rentColors: pair,
      }));
    }
  }
  // wild_rent × 3 ($3)
  for (let i = 0; i < 3; i++) {
    deck.push(makeCard({ type: 'action', value: 3, label: 'Loyer Universel', action: 'wild_rent' }));
  }
  // double_rent × 3 ($1)
  for (let i = 0; i < 3; i++) {
    deck.push(makeCard({ type: 'action', value: 1, label: 'Double Loyer', action: 'double_rent' }));
  }
  // just_say_no × 3 ($4)
  for (let i = 0; i < 3; i++) {
    deck.push(makeCard({ type: 'action', value: 4, label: 'Non Merci!', action: 'just_say_no' }));
  }

  return deck;
}

export function shuffleDeck(deck: MDCard[]): MDCard[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function isSetComplete(color: PropertyColor, cards: MDCard[]): boolean {
  return cards.length >= SET_SIZES[color];
}

export function getRent(color: PropertyColor, cardCount: number): number {
  const chart = RENT_CHART[color];
  const idx = Math.min(cardCount, chart.length - 1);
  return chart[idx];
}

export function countCompleteSets(player: MDPlayer): number {
  let count = 0;
  const sets = player.sets ?? {};
  for (const color of ALL_COLORS) {
    const cards = sets[color];
    if (cards && cards.length > 0 && isSetComplete(color, cards)) count++;
  }
  return count;
}

export function getBankTotal(player: MDPlayer): number {
  return (player.bank ?? []).reduce((sum, c) => sum + (c?.value ?? 0), 0);
}

export function getOrCreatePlayerId(): string {
  const key = 'md_player_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function getValidWildPlacements(card: MDCard): PropertyColor[] {
  if (card.type !== 'wildProperty') return [];
  if (card.isRainbow || !card.wildColors || card.wildColors.length === 0) {
    return [...ALL_COLORS];
  }
  return card.wildColors;
}

export function canMoveWildTo(card: MDCard, targetColor: PropertyColor): boolean {
  const valid = getValidWildPlacements(card);
  return valid.includes(targetColor);
}
