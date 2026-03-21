import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  MDCard, MDPlayer, MDPendingAction, PropertyColor, ActionType,
  ALL_COLORS, safeBank, safeSets, safeSet,
  isSetComplete, countCompleteSets, getRent, getOrCreatePlayerId,
  shuffleDeck,
} from '../lib/monopolyDealLogic';
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
  | { step: 'color_picker'; card: MDCard }                                   // wildProperty placement
  | { step: 'action_choice'; card: MDCard }                                  // action: bank vs play
  | { step: 'rent_color'; card: MDCard }                                     // choose which color to rent
  | { step: 'rent_double'; card: MDCard; rentColor: PropertyColor }          // offer to add double rent
  | { step: 'rent_target'; card: MDCard; rentColor: PropertyColor; doubleCard: MDCard | null }  // wild rent: pick target
  | { step: 'debt_target'; card: MDCard }
  | { step: 'deal_breaker_target'; card: MDCard }
  | { step: 'deal_breaker_set'; card: MDCard; targetId: string }
  | { step: 'sly_deal_target'; card: MDCard }
  | { step: 'sly_deal_card'; card: MDCard; targetId: string }
  | { step: 'forced_deal_my'; card: MDCard }
  | { step: 'forced_deal_target'; card: MDCard; myCardId: string; myColor: PropertyColor }
  | { step: 'forced_deal_their'; card: MDCard; myCardId: string; myColor: PropertyColor; targetId: string };

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

  const roomRef = useRef<MDRoomRow | null>(null);
  roomRef.current = room;
  const handRef = useRef<MDCard[]>([]);
  handRef.current = myHand;
  const drawnRef = useRef(false);

  // ── Subscriptions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!room?.room_code || !room?.id) return;
    const unsub1 = subscribeToMDRoom(room.room_code, (updated) => {
      setRoom(normalizeRoom(updated));
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
  }, [isMyTurn, room?.turn_drawn, room?.pending_action]);

  // ── Confetti on win ────────────────────────────────────────────────────────

  useEffect(() => {
    if (room?.status === 'finished' && room.winner_id === myPlayerId) {
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });
    }
  }, [room?.status, room?.winner_id, myPlayerId]);

  // ─── Helpers ───────────────────────────────────────────────────────────────

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

  function checkWinner(players: MDPlayer[]): string | null {
    for (const p of players) {
      if (countCompleteSets(p) >= 3) return p.id;
    }
    return null;
  }

  // Update player in list (null-safe)
  function updatePlayer(players: MDPlayer[], id: string, fn: (p: MDPlayer) => MDPlayer): MDPlayer[] {
    return players.map((p) => (p.id === id ? fn(p) : p));
  }

  // Add card to player's bank
  function addToBank(p: MDPlayer, card: MDCard): MDPlayer {
    return { ...p, bank: [...safeBank(p), card] };
  }

  // Add card to player's set
  function addToSet(p: MDPlayer, card: MDCard, color: PropertyColor): MDPlayer {
    const sets = safeSets(p);
    return { ...p, sets: { ...sets, [color]: [...(sets[color] ?? []), card] } };
  }

  // Remove card from player's bank or sets, return [newPlayer, card|null]
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

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const drawCards = useCallback(async () => {
    const r = roomRef.current;
    const hand = handRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
    if (r.turn_drawn) return;

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

  // ─── Play cards ────────────────────────────────────────────────────────────

  const canPlay = (r: MDRoomRow) =>
    r.status === 'playing' &&
    r.players[r.current_player_index]?.id === myPlayerId &&
    r.turn_drawn &&
    r.cards_played_this_turn < 3 &&
    !r.pending_action;

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
  }, [myPlayerId]);

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
  }, [myPlayerId]);

  const playActionAsMoney = useCallback(async (card: MDCard) => {
    await playMoney(card);
  }, [playMoney]);

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
  }, [myPlayerId]);

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
  }, [myPlayerId]);

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
  }, [myPlayerId]);

  // ─── Deal Breaker ──────────────────────────────────────────────────────────

  const commitDealBreaker = useCallback(async (card: MDCard, targetId: string, color: PropertyColor) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;

    const target = r.players.find((p) => p.id === targetId);
    if (!target) return;
    const stolenSet = safeSet(target, color);
    if (!isSetComplete(color, stolenSet)) return;

    const newHand = handRef.current.filter((c) => c.id !== card.id);
    let players = updatePlayer(r.players, targetId, (p) => {
      const sets = { ...safeSets(p) };
      delete sets[color];
      return { ...p, sets };
    });
    players = updatePlayer(players, myPlayerId, (p) => {
      const sets = safeSets(p);
      const existing = sets[color] ?? [];
      return { ...p, sets: { ...sets, [color]: [...existing, ...stolenSet] } };
    });

    const winner = checkWinner(players);
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
  }, [myPlayerId]);

  // ─── Sly Deal ──────────────────────────────────────────────────────────────

  const commitSlyDeal = useCallback(async (card: MDCard, targetId: string, cardId: string, color: PropertyColor) => {
    const r = roomRef.current;
    if (!r || !canPlay(r)) return;

    let [newTarget, stolen] = takeFromSet(r.players.find((p) => p.id === targetId)!, cardId, color);
    if (!stolen) return;

    let players = updatePlayer(r.players, targetId, () => newTarget);
    players = updatePlayer(players, myPlayerId, (p) => addToSet(p, stolen!, color));

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
  }, [myPlayerId]);

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
  }, [myPlayerId]);

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

  // Accept cancellation (actor sees JSN odd count, accepts)
  const acceptCancellation = useCallback(async () => {
    const r = roomRef.current;
    if (!r?.pending_action) return;
    await updateMDRoom(r.room_code, { pending_action: null });
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

    // Collect selected cards from payer's bank + sets
    const selectedCards: MDCard[] = [];
    let newPayer = { ...payer, bank: safeBank(payer), sets: { ...safeSets(payer) } };

    for (const id of cardIds) {
      // Try bank first
      const [np1, c1] = takeFromBank(newPayer, id);
      if (c1) { newPayer = np1; selectedCards.push(c1); continue; }
      // Try sets
      for (const color of ALL_COLORS) {
        const [np2, c2] = takeFromSet(newPayer, id, color);
        if (c2) { newPayer = np2; selectedCards.push(c2); break; }
      }
    }

    // Give selected cards to actor's bank
    let newActor = { ...actor, bank: [...safeBank(actor), ...selectedCards], sets: { ...safeSets(actor) } };

    let players = updatePlayer(r.players, myPlayerId, () => newPayer);
    players = updatePlayer(players, pa.actorId, () => newActor);

    const winner = checkWinner(players);
    const newPa = restQueue.length > 0
      ? { ...pa, queue: restQueue, jsnCount: 0 }
      : null;

    await updateMDRoom(r.room_code, {
      players,
      pending_action: newPa,
      status: winner ? 'finished' : 'playing',
      winner_id: winner ?? null,
    });
    setPaymentSelection([]);
  }, [myPlayerId]);

  // ─── Move wild card ────────────────────────────────────────────────────────

  const moveWild = useCallback(async (cardId: string, fromColor: PropertyColor, toColor: PropertyColor) => {
    const r = roomRef.current;
    if (!r) return;
    const me = r.players.find((p) => p.id === myPlayerId);
    if (!me) return;

    const [newMe, card] = takeFromSet(me, cardId, fromColor);
    if (!card) return;

    const updatedMe = addToSet(newMe, card, toColor);
    const players = updatePlayer(r.players, myPlayerId, () => updatedMe);
    await updateMDRoom(r.room_code, { players });
  }, [myPlayerId]);

  // ─── End turn ──────────────────────────────────────────────────────────────

  const endTurn = useCallback(async () => {
    const r = roomRef.current;
    const hand = handRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
    if (!r.turn_drawn || r.pending_action) return;

    // Must discard to 7
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
    const room = await createMDRoom(playerName, myPlayerId);
    if (room) setRoom(normalizeRoom(room));
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

  const isMyTurnToRespond = (() => {
    if (!room?.pending_action) return false;
    const pa = room.pending_action;
    const isEvenJsn = pa.jsnCount % 2 === 0;
    if (isEvenJsn) {
      // Target / current payer acts
      const task = pa.queue[0];
      return task?.playerId === myPlayerId;
    } else {
      // Odd: actor can counter-JSN or accept cancellation
      return pa.actorId === myPlayerId;
    }
  })();

  const hasJSNInHand = myHand.some((c) => c.action === 'just_say_no');

  return {
    room, myHand, myPlayerId, loading, error,
    isMyTurn, isMyTurnToRespond, hasJSNInHand,
    pendingPlay, setPendingPlay,
    paymentSelection, setPaymentSelection,
    isDiscardMode,
    // actions
    createRoom, joinRoom, startGame, leaveRoom,
    drawCards, playMoney, playProperty, playActionAsMoney,
    initiateAction,
    commitDebt, commitRent,
    commitDealBreaker, commitSlyDeal, commitForcedDeal,
    respondJSN, acceptCancellation,
    submitPayment, moveWild,
    endTurn, discardCard,
    syncYoutubeUrl,
  };
}
