import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  MDCard, MDPlayer, MDPendingAction, PropertyColor, ActionType,
  ALL_COLORS, safeBank, safeSets, safeSet,
  isSetComplete, countCompleteSets, getRent, getOrCreatePlayerId,
  shuffleDeck,
} from '../lib/monopolyDealLogic';
export type { ActionType };
import {
  MDRoomRow,
  createMDRoom, joinMDRoom, getMDRoom, startMDGame,
  updateMDRoom, getMDHand, updateMDHand,
  subscribeToMDRoom, subscribeToMDHand,
  isSupabaseConfigured,
} from '../lib/monopolyDealSupabase';

export { isSupabaseConfigured };

// What the UI needs to show as "next step" when playing a card
export type PendingPlay =
  | { step: 'color_picker'; card: MDCard }
  | { step: 'action_choice'; card: MDCard }
  | { step: 'rent_color'; card: MDCard }
  | { step: 'rent_double'; card: MDCard; rentColor: PropertyColor }
  | { step: 'rent_target'; card: MDCard; rentColor: PropertyColor; doubleCard: MDCard | null }
  | { step: 'debt_target'; card: MDCard }
  | { step: 'deal_breaker_target'; card: MDCard }
  | { step: 'deal_breaker_set'; card: MDCard; targetId: string }
  | { step: 'sly_deal_target'; card: MDCard }
  | { step: 'sly_deal_card'; card: MDCard; targetId: string }
  | { step: 'forced_deal_my'; card: MDCard }
  | { step: 'forced_deal_target'; card: MDCard; myCardId: string; myColor: PropertyColor }
  | { step: 'forced_deal_their'; card: MDCard; myCardId: string; myColor: PropertyColor; targetId: string };

// ─── Pure helpers (outside hook — no closure needed) ──────────────────────────

function normalizeRoom(r: MDRoomRow): MDRoomRow {
  return {
    ...r,
    players: (r.players ?? []).map((p) => ({
      ...p,
      bank: p.bank ?? [],
      sets: p.sets ?? {},
    })),
    deck: r.deck ?? [],
    discard_pile: r.discard_pile ?? [],
    pending_action: r.pending_action ?? null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMonopolyDealGame() {
  const [room, setRoom] = useState<MDRoomRow | null>(null);
  const [myHand, setMyHand] = useState<MDCard[]>([]);
  const [myPlayerId] = useState(() => getOrCreatePlayerId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState<PendingPlay | null>(null);
  const [paymentSelection, setPaymentSelection] = useState<MDCard[]>([]);
  const [isDiscardMode, setIsDiscardMode] = useState(false);

  // Refs hold latest values so async callbacks never read stale closures
  const roomRef = useRef<MDRoomRow | null>(null);
  roomRef.current = room;
  const handRef = useRef<MDCard[]>([]);
  handRef.current = myHand;
  const drawnRef = useRef(false);

  // ── Subscriptions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!room?.room_code || !room?.id) return;
    const unsub1 = subscribeToMDRoom(room.room_code, (updated) => {
      // Merge with previous state — guards against partial Supabase Realtime payloads
      // (when REPLICA IDENTITY is not FULL, only changed columns arrive in payload.new)
      setRoom(prev => normalizeRoom(prev ? { ...prev, ...updated } as MDRoomRow : updated));
    });
    const unsub2 = subscribeToMDHand(room.id, myPlayerId, (cards) => {
      setMyHand(cards ?? []);
    });
    return () => { unsub1(); unsub2(); };
  }, [room?.room_code, room?.id, myPlayerId]);

  // ── Load hand when game starts ─────────────────────────────────────────────

  useEffect(() => {
    if (room?.status !== 'playing' && room?.status !== 'finished') return;
    getMDHand(room.id, myPlayerId).then((cards) => {
      if (cards) setMyHand(cards);
    });
  }, [room?.status, room?.id, myPlayerId]);

  // ── Auto-draw at start of turn ─────────────────────────────────────────────

  const isMyTurn = room?.status === 'playing'
    && room.players[room.current_player_index]?.id === myPlayerId;

  useEffect(() => {
    if (!isMyTurn) { drawnRef.current = false; return; }
    if (!room || room.turn_drawn || room.pending_action || drawnRef.current) return;
    drawnRef.current = true;
    drawCards();
  }, [isMyTurn, room?.turn_drawn, room?.pending_action]); // eslint-disable-line react-hooks/exhaustive-deps
  // drawCards uses refs internally — adding it to deps would cause an infinite loop

  // ── Confetti on win ────────────────────────────────────────────────────────

  useEffect(() => {
    if (room?.status === 'finished' && room.winner_id === myPlayerId) {
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });
    }
  }, [room?.status, room?.winner_id, myPlayerId]);

  // ─── Internal helpers ──────────────────────────────────────────────────────

  function checkWinner(players: MDPlayer[]): string | null {
    for (const p of players) {
      if (countCompleteSets(p) >= 3) return p.id;
    }
    return null;
  }

  function updatePlayer(players: MDPlayer[], id: string, fn: (p: MDPlayer) => MDPlayer): MDPlayer[] {
    return players.map((p) => (p.id === id ? fn(p) : p));
  }

  function addToBank(p: MDPlayer, card: MDCard): MDPlayer {
    return { ...p, bank: [...safeBank(p), card] };
  }

  function addToSet(p: MDPlayer, card: MDCard, color: PropertyColor): MDPlayer {
    const sets = safeSets(p);
    return { ...p, sets: { ...sets, [color]: [...(sets[color] ?? []), card] } };
  }

  function takeFromBank(p: MDPlayer, cardId: string): [MDPlayer, MDCard | null] {
    const bank = safeBank(p);
    const card = bank.find((c) => c.id === cardId) ?? null;
    return [{ ...p, bank: bank.filter((c) => c.id !== cardId) }, card];
  }

  function takeFromSet(p: MDPlayer, cardId: string, color: PropertyColor): [MDPlayer, MDCard | null] {
    const sets = safeSets(p);
    const set = sets[color] ?? [];
    const card = set.find((c) => c.id === cardId) ?? null;
    const newSet = set.filter((c) => c.id !== cardId);
    const newSets = { ...sets };
    if (newSet.length === 0) delete newSets[color];
    else newSets[color] = newSet;
    return [{ ...p, sets: newSets }, card];
  }

  // ─── Pass Go (draw 2 extra cards) ─────────────────────────────────────────

  const commitPassGo = useCallback(async (card: MDCard) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;

    const newHand = handRef.current.filter((c) => c.id !== card.id);
    let deck = [...(r.deck ?? [])];
    let discard = [...(r.discard_pile ?? [])];

    if (deck.length < 2 && discard.length > 1) {
      const top = discard[discard.length - 1];
      deck = [...deck, ...shuffleDeck(discard.slice(0, -1))];
      discard = [top];
    }

    const drawn = deck.splice(-Math.min(2, deck.length));
    const finalHand = [...newHand, ...drawn];
    const finalDiscard = [...discard, card];

    setPendingPlay(null);
    await Promise.all([
      updateMDHand(r.id, myPlayerId, finalHand),
      updateMDRoom(r.room_code, {
        deck,
        discard_pile: finalDiscard,
        cards_played_this_turn: r.cards_played_this_turn + 1,
      }),
    ]);
    setMyHand(finalHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const drawCards = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
    if (r.turn_drawn) return;

    // Fetch hand fresh from DB to avoid race condition: the room "playing" update
    // can arrive before the hand realtime event, leaving handRef.current empty and
    // causing count=5 (empty-hand rule) instead of count=2.
    const freshCards = await getMDHand(r.id, myPlayerId);
    const hand = freshCards ?? handRef.current;
    if (freshCards) setMyHand(freshCards);

    const count = hand.length === 0 ? 5 : 2;
    let deck = [...r.deck];
    let discard = [...r.discard_pile];

    if (deck.length < count && discard.length > 0) {
      deck = [...deck, ...shuffleDeck(discard)];
      discard = [];
    }

    const drawn = deck.splice(-count);
    const newHand = [...hand, ...drawn];

    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, { deck, discard_pile: discard, turn_drawn: true }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]);

  // ─── canPlay guard (checks current room state) ────────────────────────────

  const canPlay = (r: MDRoomRow) =>
    r.status === 'playing' &&
    r.players[r.current_player_index]?.id === myPlayerId &&
    r.turn_drawn &&
    r.cards_played_this_turn < 3 &&
    !r.pending_action;

  // ─── Play cards ────────────────────────────────────────────────────────────

  const playMoney = useCallback(async (card: MDCard) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;
    const newHand = handRef.current.filter((c) => c.id !== card.id);
    const players = updatePlayer(r.players, myPlayerId, (p) => addToBank(p, card));
    const winner = checkWinner(players);
    setPendingPlay(null);
    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, {
        players, cards_played_this_turn: r.cards_played_this_turn + 1,
        status: winner ? 'finished' : 'playing', winner_id: winner ?? null,
      }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps
  // canPlay / helpers use refs or are pure — safe to omit

  const playProperty = useCallback(async (card: MDCard, color: PropertyColor) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;
    const newHand = handRef.current.filter((c) => c.id !== card.id);
    const players = updatePlayer(r.players, myPlayerId, (p) => addToSet(p, card, color));
    const winner = checkWinner(players);
    setPendingPlay(null);
    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, {
        players, cards_played_this_turn: r.cards_played_this_turn + 1,
        status: winner ? 'finished' : 'playing', winner_id: winner ?? null,
      }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Action initiators ─────────────────────────────────────────────────────

  const initiateAction = useCallback((card: MDCard) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;
    switch (card.action) {
      case 'birthday':
      case 'debt_collector':
        setPendingPlay({ step: 'debt_target', card });
        break;
      case 'deal_breaker':
        setPendingPlay({ step: 'deal_breaker_target', card });
        break;
      case 'sly_deal':
        setPendingPlay({ step: 'sly_deal_target', card });
        break;
      case 'forced_deal':
        setPendingPlay({ step: 'forced_deal_my', card });
        break;
      case 'rent':
      case 'wild_rent':
        setPendingPlay({ step: 'rent_color', card });
        break;
      default:
        break;
    }
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Birthday / Debt collector ─────────────────────────────────────────────

  const commitDebt = useCallback(async (card: MDCard, targetId: string | null) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;
    const newHand = handRef.current.filter((c) => c.id !== card.id);
    const isBirthday = card.action === 'birthday';
    const amount = isBirthday ? 2 : 5;

    const others = r.players.filter((p) => p.id !== myPlayerId);
    const queue = isBirthday
      ? others.map((p) => ({ playerId: p.id, amount }))
      : [{ playerId: targetId!, amount }];

    const discard = [...r.discard_pile, card];
    const pending: MDPendingAction = {
      type: 'payment', actorId: myPlayerId,
      actionType: card.action as ActionType, queue, jsnCount: 0, card,
    };

    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, {
        discard_pile: discard,
        cards_played_this_turn: r.cards_played_this_turn + 1,
        pending_action: pending,
      }),
    ]);
    setPendingPlay(null);
    setMyHand(newHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Rent ──────────────────────────────────────────────────────────────────

  const commitRent = useCallback(async (
    card: MDCard, rentColor: PropertyColor, targetId: string | null, doubleCard: MDCard | null,
  ) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;

    let newHand = handRef.current.filter((c) => c.id !== card.id);
    let played = 1;
    if (doubleCard) {
      newHand = newHand.filter((c) => c.id !== doubleCard.id);
      played = 2;
    }

    const myPlayer = r.players.find((p) => p.id === myPlayerId)!;
    const cardCount = safeSet(myPlayer, rentColor).length;
    let rentAmount = getRent(rentColor, cardCount);
    if (doubleCard) rentAmount *= 2;

    const others = r.players.filter((p) => p.id !== myPlayerId);
    const targets = targetId ? others.filter((p) => p.id === targetId) : others;
    const queue = targets.map((p) => ({ playerId: p.id, amount: rentAmount }));

    const discard = [...r.discard_pile, card, ...(doubleCard ? [doubleCard] : [])];
    const pending: MDPendingAction = {
      type: 'payment', actorId: myPlayerId,
      actionType: card.action as ActionType, queue, jsnCount: 0, card,
    };

    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, {
        discard_pile: discard,
        cards_played_this_turn: r.cards_played_this_turn + played,
        pending_action: pending,
      }),
    ]);
    setPendingPlay(null);
    setMyHand(newHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Deal Breaker ──────────────────────────────────────────────────────────
  // Creates a steal_set pending action — target gets a chance to play Just Say No

  const commitDealBreaker = useCallback(async (card: MDCard, targetId: string, color: PropertyColor) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;

    const target = r.players.find((p) => p.id === targetId);
    if (!target) return;
    if (!isSetComplete(color, safeSet(target, color))) return;

    const newHand = handRef.current.filter((c) => c.id !== card.id);
    const discard = [...r.discard_pile, card];
    const pending: MDPendingAction = {
      type: 'steal_set', actorId: myPlayerId, actionType: 'deal_breaker',
      queue: [], jsnCount: 0, card, targetId, targetColor: color,
    };
    setPendingPlay(null);
    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, {
        discard_pile: discard,
        cards_played_this_turn: r.cards_played_this_turn + 1,
        pending_action: pending,
      }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sly Deal ──────────────────────────────────────────────────────────────
  // Creates a steal pending action — target gets a chance to play Just Say No

  const commitSlyDeal = useCallback(async (card: MDCard, targetId: string, cardId: string, color: PropertyColor) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;

    const newHand = handRef.current.filter((c) => c.id !== card.id);
    const discard = [...r.discard_pile, card];
    const pending: MDPendingAction = {
      type: 'steal', actorId: myPlayerId, actionType: 'sly_deal',
      queue: [], jsnCount: 0, card, targetId, targetColor: color, targetCardId: cardId,
    };
    setPendingPlay(null);
    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, {
        discard_pile: discard,
        cards_played_this_turn: r.cards_played_this_turn + 1,
        pending_action: pending,
      }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Confirm Steal (execute after JSN window passes) ──────────────────────

  const confirmSteal = useCallback(async () => {
    const r = roomRef.current;
    if (!r?.pending_action) return;
    const pa = r.pending_action;
    if ((pa.type !== 'steal' && pa.type !== 'steal_set') || !pa.targetId || !pa.targetColor) return;

    if (pa.type === 'steal_set') {
      const target = r.players.find((p) => p.id === pa.targetId);
      if (!target) return;
      const stolenSet = safeSet(target, pa.targetColor);
      let players = updatePlayer(r.players, pa.targetId, (p) => {
        const sets = { ...safeSets(p) };
        delete sets[pa.targetColor!];
        return { ...p, sets };
      });
      players = updatePlayer(players, pa.actorId, (p) => {
        const sets = safeSets(p);
        const existing = sets[pa.targetColor!] ?? [];
        return { ...p, sets: { ...sets, [pa.targetColor!]: [...existing, ...stolenSet] } };
      });
      const winner = checkWinner(players);
      await updateMDRoom(r.room_code, {
        players, pending_action: null,
        status: winner ? 'finished' : 'playing', winner_id: winner ?? null,
      });
    } else {
      if (!pa.targetCardId) return;
      const target = r.players.find((p) => p.id === pa.targetId);
      if (!target) return;
      const [newTarget, stolen] = takeFromSet(target, pa.targetCardId, pa.targetColor);
      if (!stolen) return;
      let players = updatePlayer(r.players, pa.targetId, () => newTarget);
      players = updatePlayer(players, pa.actorId, (p) => addToSet(p, stolen, pa.targetColor!));
      const winner = checkWinner(players);
      await updateMDRoom(r.room_code, {
        players, pending_action: null,
        status: winner ? 'finished' : 'playing', winner_id: winner ?? null,
      });
    }
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Forced Deal ───────────────────────────────────────────────────────────

  const commitForcedDeal = useCallback(async (
    card: MDCard, myCardId: string, myColor: PropertyColor,
    targetId: string, theirCardId: string, theirColor: PropertyColor,
  ) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;

    const target = r.players.find((p) => p.id === targetId);
    if (!target) return;

    let [me, myCard] = takeFromSet(r.players.find((p) => p.id === myPlayerId)!, myCardId, myColor);
    let [them, theirCard] = takeFromSet(target, theirCardId, theirColor);
    if (!myCard || !theirCard) return;

    let players = updatePlayer(r.players, myPlayerId, () => addToSet(me, theirCard!, theirColor));
    players = updatePlayer(players, targetId, () => addToSet(them, myCard!, myColor));

    const winner = checkWinner(players);
    const newHand = handRef.current.filter((c) => c.id !== card.id);
    const discard = [...r.discard_pile, card];
    setPendingPlay(null);
    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, {
        players, discard_pile: discard,
        cards_played_this_turn: r.cards_played_this_turn + 1,
        status: winner ? 'finished' : 'playing', winner_id: winner ?? null,
      }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Just Say No ───────────────────────────────────────────────────────────

  const respondJSN = useCallback(async (jsnCardId: string) => {
    const r = roomRef.current;
    if (!r?.pending_action) return;
    const pa = r.pending_action;
    const jsnCard = handRef.current.find((c) => c.id === jsnCardId);
    if (!jsnCard) return;

    const newHand = handRef.current.filter((c) => c.id !== jsnCardId);
    const discard = [...r.discard_pile, jsnCard];
    const updatedPa: MDPendingAction = { ...pa, jsnCount: pa.jsnCount + 1 };

    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, { discard_pile: discard, pending_action: updatedPa }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]);

  const acceptCancellation = useCallback(async () => {
    const r = roomRef.current;
    if (!r?.pending_action) return;
    const pa = r.pending_action;
    if (pa.type === 'payment') {
      // Skip current payer (the one who played JSN), continue with rest of queue
      const [, ...restQueue] = pa.queue;
      const newPa = restQueue.length > 0 ? { ...pa, queue: restQueue, jsnCount: 0 } : null;
      await updateMDRoom(r.room_code, { pending_action: newPa });
    } else {
      // steal / steal_set: actor accepts that the steal is cancelled
      await updateMDRoom(r.room_code, { pending_action: null });
    }
  }, []);

  // ─── Payment ───────────────────────────────────────────────────────────────

  const submitPayment = useCallback(async (cardIds: string[]) => {
    const r = roomRef.current;
    if (!r?.pending_action) return;
    const pa = r.pending_action;
    const [task, ...restQueue] = pa.queue;
    if (!task || task.playerId !== myPlayerId) return;

    const payer = r.players.find((p) => p.id === myPlayerId)!;
    const actor = r.players.find((p) => p.id === pa.actorId)!;

    // Track each card + which color set it came from (needed for properties)
    const selectedCards: { card: MDCard; fromColor?: PropertyColor }[] = [];
    let newPayer = { ...payer, bank: safeBank(payer), sets: { ...safeSets(payer) } };

    for (const id of cardIds) {
      const [np1, c1] = takeFromBank(newPayer, id);
      if (c1) { newPayer = np1; selectedCards.push({ card: c1 }); continue; }
      for (const color of ALL_COLORS) {
        const [np2, c2] = takeFromSet(newPayer, id, color);
        if (c2) { newPayer = np2; selectedCards.push({ card: c2, fromColor: color }); break; }
      }
    }

    // Money cards go to actor's bank; property/wild cards go to actor's sets
    let newActor = { ...actor, bank: [...safeBank(actor)], sets: { ...safeSets(actor) } };
    for (const { card, fromColor } of selectedCards) {
      if (card.type === 'money') {
        newActor = { ...newActor, bank: [...newActor.bank, card] };
      } else {
        const color = fromColor ?? card.color;
        if (color) {
          newActor = addToSet(newActor, card, color);
        } else {
          // Fallback for wild with no color context
          newActor = { ...newActor, bank: [...newActor.bank, card] };
        }
      }
    }

    let players = updatePlayer(r.players, myPlayerId, () => newPayer);
    players = updatePlayer(players, pa.actorId, () => newActor);

    const winner = checkWinner(players);
    const newPa = restQueue.length > 0 ? { ...pa, queue: restQueue, jsnCount: 0 } : null;

    await updateMDRoom(r.room_code, {
      players,
      pending_action: newPa,
      status: winner ? 'finished' : 'playing',
      winner_id: winner ?? null,
    });
    setPaymentSelection([]);
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Move wild card ────────────────────────────────────────────────────────

  const moveWild = useCallback(async (cardId: string, fromColor: PropertyColor, toColor: PropertyColor) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;
    const me = r.players.find((p) => p.id === myPlayerId);
    if (!me) return;

    const [newMe, card] = takeFromSet(me, cardId, fromColor);
    if (!card) return;

    const updatedMe = addToSet(newMe, card, toColor);
    const players = updatePlayer(r.players, myPlayerId, () => updatedMe);
    await updateMDRoom(r.room_code, { players, cards_played_this_turn: r.cards_played_this_turn + 1 });
  }, [myPlayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── End turn ──────────────────────────────────────────────────────────────

  const endTurn = useCallback(async () => {
    const r = roomRef.current;
    const hand = handRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
    if (!r.turn_drawn || r.pending_action) return;

    if (hand.length > 7) {
      setIsDiscardMode(true);
      return;
    }

    const nextIndex = (r.current_player_index + 1) % r.players.length;
    await updateMDRoom(r.room_code, {
      current_player_index: nextIndex,
      cards_played_this_turn: 0,
      turn_drawn: false,
      pending_action: null,
    });
    drawnRef.current = false;
  }, [myPlayerId]);

  const discardCard = useCallback(async (card: MDCard) => {
    const r = roomRef.current;
    const hand = handRef.current;
    if (!r) return;
    const newHand = hand.filter((c) => c.id !== card.id);
    const discard = [...r.discard_pile, card];
    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, { discard_pile: discard }),
    ]);
    setMyHand(newHand);
    if (newHand.length <= 7) {
      setIsDiscardMode(false);
      const nextIndex = (r.current_player_index + 1) % r.players.length;
      await updateMDRoom(r.room_code, {
        current_player_index: nextIndex,
        cards_played_this_turn: 0,
        turn_drawn: false,
        pending_action: null,
      });
      drawnRef.current = false;
    }
  }, [myPlayerId]);

  // ─── Room management ───────────────────────────────────────────────────────

  const createRoom = useCallback(async (playerName: string) => {
    setLoading(true); setError(null);
    const r = await createMDRoom(playerName, myPlayerId);
    if (r) setRoom(normalizeRoom(r));
    else setError('Impossible de créer la room.');
    setLoading(false);
  }, [myPlayerId]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    setLoading(true); setError(null);
    const joined = await joinMDRoom(roomCode, playerName, myPlayerId);
    if (joined) {
      const fresh = await getMDRoom(roomCode);
      setRoom(normalizeRoom(fresh ?? joined));
    } else {
      setError('Room introuvable ou déjà en cours (max 5 joueurs).');
    }
    setLoading(false);
  }, [myPlayerId]);

  const startGame = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.host_id !== myPlayerId || r.players.length < 2) return;
    setLoading(true);
    await startMDGame(r.room_code, r.id, r.players);
    setLoading(false);
  }, [myPlayerId]);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setMyHand([]);
    setPendingPlay(null);
    setPaymentSelection([]);
    setIsDiscardMode(false);
    drawnRef.current = false;
  }, []);

  const syncYoutubeUrl = useCallback(async (url: string) => {
    const r = roomRef.current;
    if (!r) return;
    await updateMDRoom(r.room_code, { youtube_url: url });
  }, []);

  // ─── Derived state for UI ──────────────────────────────────────────────────

  let isMyTurnToRespond = false;
  if (room?.pending_action) {
    const pa = room.pending_action;
    if (pa.type === 'payment') {
      if (pa.jsnCount % 2 === 0) {
        isMyTurnToRespond = pa.queue[0]?.playerId === myPlayerId;
      } else {
        isMyTurnToRespond = pa.actorId === myPlayerId;
      }
    } else {
      // steal / steal_set
      if (pa.jsnCount % 2 === 0) {
        isMyTurnToRespond = pa.targetId === myPlayerId;
      } else {
        isMyTurnToRespond = pa.actorId === myPlayerId;
      }
    }
  }

  const hasJSNInHand = myHand.some((c) => c.action === 'just_say_no');

  return {
    room, myHand, myPlayerId, loading, error,
    isMyTurn, isMyTurnToRespond, hasJSNInHand,
    pendingPlay, setPendingPlay,
    paymentSelection, setPaymentSelection,
    isDiscardMode,
    // actions
    createRoom, joinRoom, startGame, leaveRoom,
    drawCards, playMoney, playProperty,
    commitPassGo, initiateAction,
    commitDebt, commitRent,
    commitDealBreaker, commitSlyDeal, commitForcedDeal,
    confirmSteal,
    respondJSN, acceptCancellation,
    submitPayment, moveWild,
    endTurn, discardCard,
    syncYoutubeUrl,
  };
}
