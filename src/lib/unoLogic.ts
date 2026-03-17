export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  id: string;
  color: CardColor;
  value: CardValue;
}

export interface UnoPlayer {
  id: string;
  name: string;
  cardCount: number;
  unoSafe?: boolean; // true = player has said UNO or has >1 card
}

let cardCounter = 0;

function makeCard(color: CardColor, value: CardValue): UnoCard {
  return { id: `${color}-${value}-${cardCounter++}`, color, value };
}

export function createDeck(): UnoCard[] {
  cardCounter = 0;
  const deck: UnoCard[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];

  for (const color of colors) {
    deck.push(makeCard(color, '0'));
    for (let i = 0; i < 2; i++) {
      for (const v of ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as CardValue[]) {
        deck.push(makeCard(color, v));
      }
      deck.push(makeCard(color, 'skip'));
      deck.push(makeCard(color, 'reverse'));
      deck.push(makeCard(color, 'draw2'));
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push(makeCard('wild', 'wild'));
    deck.push(makeCard('wild', 'wild4'));
  }

  return deck;
}

export function shuffleDeck(deck: UnoCard[]): UnoCard[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function canPlay(card: UnoCard, topCard: UnoCard, currentColor: string): boolean {
  if (card.value === 'wild' || card.value === 'wild4') return true;
  if (card.color === currentColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function getNextPlayerIndex(
  currentIndex: number,
  direction: number,
  playerCount: number,
  skipExtra = false
): number {
  let next = (currentIndex + direction + playerCount) % playerCount;
  if (skipExtra) {
    next = (next + direction + playerCount) % playerCount;
  }
  return next;
}

export function getOrCreatePlayerId(): string {
  const key = 'uno_player_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export const CARD_LABEL: Record<CardValue, string> = {
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  skip: '⊘', reverse: '⇄', draw2: '+2', wild: '★', wild4: '+4',
};

export const UNO_COLORS: Array<{ value: string; label: string; bg: string }> = [
  { value: 'red',    label: 'Rouge',  bg: '#ef4444' },
  { value: 'blue',   label: 'Bleu',   bg: '#3b82f6' },
  { value: 'green',  label: 'Vert',   bg: '#22c55e' },
  { value: 'yellow', label: 'Jaune',  bg: '#eab308' },
];
