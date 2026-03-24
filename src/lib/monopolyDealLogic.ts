import { shuffleDeck, createPlayerId } from './utils';

export { shuffleDeck };

// ─── Types ────────────────────────────────────────────────────────────────────

export type PropertyColor =
  | 'brown' | 'lightBlue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'blue'
  | 'railroad' | 'utility';

export type ActionType =
  | 'just_say_no' | 'birthday' | 'debt_collector'
  | 'rent' | 'wild_rent' | 'double_rent'
  | 'deal_breaker' | 'sly_deal' | 'forced_deal'
  | 'pass_go';

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
  type: 'payment' | 'steal' | 'steal_set';
  actorId: string;
  actionType: ActionType;
  queue: PaymentTask[];      // remaining payers (payment only)
  jsnCount: number;          // 0=target can JSN/pay, 1=actor can counter, 2=target again…
  card: MDCard;
  doubleRent?: boolean;
  // steal / steal_set fields
  targetId?: string;
  targetColor?: PropertyColor;
  targetCardId?: string;     // steal only (sly deal)
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

/** Rules data for the in-game / hub rules modal */
export const MD_RULES: { title: string; body: string }[] = [
  { title: 'But du jeu', body: 'Être le premier à former 3 sets complets de propriétés.' },
  { title: 'Tour de jeu', body: "Piochez 2 cartes (5 si votre main est vide). Jouez jusqu'à 3 cartes. Défaussez si vous avez plus de 7 cartes en fin de tour." },
  { title: 'Passe par Go', body: "Piochez 2 cartes supplémentaires immédiatement. Peut aussi être jouée comme argent ($1M)." },
  { title: 'Jouer une carte', body: "Propriété → dans vos sets. Argent → dans votre banque. Carte action → effet immédiat. N'importe quelle carte → banque pour sa valeur en $." },
  { title: 'Loyer', body: 'Collectez un loyer auprès des autres joueurs selon le nombre de propriétés dans la couleur choisie.' },
  { title: 'Double Loyer', body: 'Jouez avec un loyer pour doubler le montant (compte comme 1 carte jouée supplémentaire).' },
  { title: 'Loyer Universel', body: 'Choisissez une couleur ET un joueur ciblé.' },
  { title: 'Percepteur', body: "Collectez $5M auprès d'un joueur de votre choix." },
  { title: 'Anniversaire', body: 'Collectez $2M auprès de TOUS les autres joueurs.' },
  { title: 'Saisie', body: "Volez 1 propriété dans un set INCOMPLET d'un adversaire." },
  { title: 'Échange Forcé', body: "Échangez une de vos propriétés (set incomplet) contre une propriété d'un adversaire (set incomplet)." },
  { title: 'Coup de Maître', body: "Volez un set COMPLET entier d'un adversaire." },
  { title: 'Non Merci !', body: "Annule n'importe quelle action jouée contre vous. Peut être contré avec un autre Non Merci ! (chaîne)." },
  { title: 'Paiement', body: "Payez depuis votre banque et/ou vos sets de propriétés. Si vous ne pouvez pas tout payer, donnez tout ce que vous avez." },
  { title: 'Jokers de propriété', body: "Peuvent être placés dans l'une de leurs couleurs valides. Déplaçables librement entre ces couleurs pendant votre tour (action gratuite)." },
];

/** Short descriptions shown in action card info tooltips */
export const ACTION_DESCRIPTIONS: Partial<Record<ActionType, string>> = {
  just_say_no:    'Annule toute action jouée contre toi. Chaînable.',
  birthday:       'Tous les joueurs te paient 2M.',
  debt_collector: 'Un joueur de ton choix te paie 5M.',
  rent:           'Collecte le loyer de tes propriétés d\'une couleur.',
  wild_rent:      'Loyer d\'une couleur contre UN joueur ciblé.',
  double_rent:    'Joue avec un loyer pour doubler le montant.',
  deal_breaker:   'Vole un set COMPLET entier à un adversaire.',
  sly_deal:       'Vole 1 propriété dans un set INCOMPLET.',
  forced_deal:    'Échange une de tes propriétés contre celle d\'un adversaire.',
  pass_go:        'Pioche 2 cartes supplémentaires immédiatement.',
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
  return createPlayerId('md_player_id');
}

// ─── Deck ─────────────────────────────────────────────────────────────────────

// Counter never resets — guarantees unique IDs across multiple deck creations
let _nextId = 1;
function mk(partial: Omit<MDCard, 'id'>): MDCard {
  return { id: `md-${_nextId++}`, ...partial };
}

export function createMonopolyDealDeck(): MDCard[] {
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

  // Properties: [color, name, value]
  const props: [PropertyColor, string, number][] = [
    ['brown',     'Rue Lecourbe',              1],
    ['brown',     'Rue de Vaugirard',          1],
    ['lightBlue', 'Bvd de la Villette',        1],
    ['lightBlue', 'Avenue de Clichy',          1],
    ['lightBlue', 'Rue La Fayette',            1],
    ['pink',      'Rue Saint-Lazare',          2],
    ['pink',      'Rue Championnet',           2],
    ['pink',      "Avenue d'Iéna",             2],
    ['orange',    'Rue de Lyon',               2],
    ['orange',    "Rue d'Alésia",              2],
    ['orange',    'Boulevard Voltaire',        2],
    ['red',       'Avenue de Villiers',        3],
    ['red',       'Rue Oberkampf',             3],
    ['red',       'Boulevard Haussmann',       3],
    ['yellow',    'Rue de Rivoli',             3],
    ['yellow',    'Avenue Kléber',             3],
    ['yellow',    'Avenue de Breteuil',        3],
    ['green',     'Rue Molière',               4],
    ['green',     'Bvd Beaumarchais',          4],
    ['green',     'Avenue de Wagram',          4],
    ['blue',      'Av. des Champs-Élysées',    4],
    ['blue',      'Rue de la Paix',            4],
    ['railroad',  'Gare du Nord',              2],
    ['railroad',  "Gare de l'Est",             2],
    ['railroad',  'Gare de Lyon',              2],
    ['railroad',  'Gare Montparnasse',         2],
    ['utility',   "Cie d'Électricité",         2],
    ['utility',   'Cie des Eaux',              2],
  ];
  for (const [color, name, value] of props) {
    cards.push(mk({ type: 'property', name, value, color }));
  }

  // Wild properties: [wildColors, value, count]
  const wilds: [PropertyColor[], number, number][] = [
    [['railroad', 'utility'], 0, 2],
    [['brown', 'lightBlue'],  1, 1],
    [['pink', 'orange'],      2, 2],
    [['red', 'yellow'],       3, 2],
    [['green', 'blue'],       4, 1],
    [['green', 'railroad'],   4, 1],
    [['lightBlue', 'railroad', 'utility'], 4, 1],
  ];
  for (const [wildColors, value, count] of wilds) {
    for (let i = 0; i < count; i++) {
      cards.push(mk({ type: 'wildProperty', name: 'Joker propriété', value, wildColors }));
    }
  }

  // Actions: [action, name, value, count, rentColors?]
  const actions: [ActionType, string, number, number, PropertyColor[]?][] = [
    ['pass_go',       'Passe par Go',      1, 10],
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
