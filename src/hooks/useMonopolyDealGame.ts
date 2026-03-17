import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  MDCard,
  MDPlayer,
  MDPendingAction,
  PropertyColor,
  ActionType,
  ALL_COLORS,
  getOrCreatePlayerId,
  countCompleteSets,
  getRent,
} from '../lib/monopolyDealLogic';
import {
  MDRoomRow,
  createMDRoom,
  joinMDRoom,
  getMDRoom,
  startMDGame,
  updateMDRoom,
  getMDHand,
  updateMDHand,
  subscribeToMDRoom,
  subscribeToMDHand,
  isSupabaseConfigured,
} from '../lib/monopolyDealSupabase';

export type PendingPlayStep =
  | { type: 'color_picker'; card: MDCard }
  | { type: 'rent_config'; card: MDCard; doubleRentCard?: MDCard }
  | { type: 'wild_rent_target'; card: MDCard; rentColor: PropertyColor; doubleRentCard?: MDCard }
  | { type: 'debt_target'; card: MDCard }
  | { type: 'deal_breaker_target'; card: MDCard }
  | { type: 'deal_breaker_set'; card: MDCard; targetPlayerId: string }
  | { type: 'forced_deal_my_card'; card: MDCard }
  | { type: 'forced_deal_target'; card: MDCard; myCardId: string; myCardColor: PropertyColor }
  | { type: 'forced_deal_their_card'; card: MDCard; myCardId: string; myCardColor: PropertyColor; targetPlayerId: string }
  | { type: 'sly_deal_target'; card: MDCard }
  | { type: 'sly_deal_their_card'; card: MDCard; targetPlayerId: string };

export function useMonopolyDealGame() {
  const [room, setRoom] = useState<MDRoomRow | null>(null);
  const [myHand, setMyHand] = useState<MDCard[]>([]);
  const [myPlayerId] = useState(() => getOrCreatePlayerId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPlay, setPendingPlay] = useState<PendingPlayStep | null>(null);
  const [paymentSelection, setPaymentSelection] = useState<MDCard[]>([]);
  const [isDiscardMode, setIsDiscardMode] = useState(false);

  const roomRef = useRef<MDRoomRow | null>(null);
  roomRef.current = room;

  const myHandRef = useRef<MDCard[]>([]);
  myHandRef.current = myHand;

  const autoDrawFiredRef = useRef(false);

  // Subscribe to room + hand changes
  useEffect(() => {
    if (!room?.room_code || !room?.id) return;
    const roomCode = room.room_code;
    const roomId = room.id;
    const unsubRoom = subscribeToMDRoom(roomCode, setRoom);
    const unsubHand = subscribeToMDHand(roomId, myPlayerId, setMyHand);
    return () => {
      unsubRoom();
      unsubHand();
    };
  }, [room?.room_code, room?.id, myPlayerId]);

  // Fetch hand when game starts
  useEffect(() => {
    if (room?.status === 'playing' && room.id) {
      getMDHand(room.id, myPlayerId).then((cards) => {
        if (cards) setMyHand(cards);
      });
    }
  }, [room?.status, room?.id, myPlayerId]);

  // Reset draw ref on turn change
  const prevTurnRef = useRef(-1);
  useEffect(() => {
    const t = room?.current_player_index ?? -1;
    if (t !== prevTurnRef.current) {
      prevTurnRef.current = t;
      autoDrawFiredRef.current = false;
      setPendingPlay(null);
      setIsDiscardMode(false);
    }
  }, [room?.current_player_index]);

  // Confetti on win
  useEffect(() => {
    if (room?.status === 'finished' && room.winner_id === myPlayerId) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } });
      }, 250);
    }
  }, [room?.status, room?.winner_id, myPlayerId]);

  const isMyTurn =
    room?.status === 'playing' &&
    room.players[room.current_player_index]?.id === myPlayerId;

  // Auto-draw when it becomes my turn and I haven't drawn
  useEffect(() => {
    if (
      isMyTurn &&
      room &&
      !room.turn_drawn &&
      !room.pending_action &&
      !autoDrawFiredRef.current
    ) {
      autoDrawFiredRef.current = true;
      drawCards();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, room?.turn_drawn, room?.pending_action]);

  // ====== HELPERS ======

  function checkWin(players: MDPlayer[]): string | null {
    for (const p of players) {
      if (countCompleteSets(p) >= 3) return p.id;
    }
    return null;
  }

  function findCardInSets(player: MDPlayer, cardId: string): { color: PropertyColor; card: MDCard } | null {
    for (const color of ALL_COLORS) {
      const set = player.sets[color];
      if (set) {
        const card = set.find((c) => c.id === cardId);
        if (card) return { color, card };
      }
    }
    return null;
  }

  function removeCardFromSet(player: MDPlayer, cardId: string, color: PropertyColor): MDPlayer {
    const set = player.sets[color] ?? [];
    const newSet = set.filter((c) => c.id !== cardId);
    const newSets = { ...player.sets };
    if (newSet.length === 0) {
      delete newSets[color];
    } else {
      newSets[color] = newSet;
    }
    return { ...player, sets: newSets };
  }

  function addCardToSet(player: MDPlayer, card: MDCard, color: PropertyColor): MDPlayer {
    const set = player.sets[color] ?? [];
    return {
      ...player,
      sets: { ...player.sets, [color]: [...set, card] },
    };
  }

  // ====== CORE ACTIONS ======

  const createRoom = useCallback(
    async (playerName: string) => {
      setLoading(true);
      setError(null);
      const newRoom = await createMDRoom(playerName, myPlayerId);
      if (newRoom) {
        setRoom(newRoom);
      } else {
        setError('Impossible de créer la room.');
      }
      setLoading(false);
      return newRoom;
    },
    [myPlayerId]
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string) => {
      setLoading(true);
      setError(null);
      const joined = await joinMDRoom(roomCode, playerName, myPlayerId);
      if (joined) {
        const fresh = await getMDRoom(roomCode);
        setRoom(fresh ?? joined);
      } else {
        setError('Room introuvable ou complète (max 5 joueurs).');
      }
      setLoading(false);
      return joined;
    },
    [myPlayerId]
  );

  const startGame = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.host_id !== myPlayerId || r.players.length < 2) return;
    setLoading(true);
    await startMDGame(r.room_code, r.id, r.players);
    setLoading(false);
  }, [myPlayerId]);

  const drawCards = useCallback(async () => {
    const r = roomRef.current;
    const hand = myHandRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
    if (r.turn_drawn) return;

    const drawCount = hand.length === 0 ? 5 : 2;
    let deck = [...r.deck];
    const discard = [...r.discard_pile];

    // Reshuffle discard into deck if needed
    if (deck.length < drawCount && discard.length > 0) {
      const reshuffled = [...discard];
      for (let i = reshuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]];
      }
      deck = [...deck, ...reshuffled];
    }

    const drawn = deck.splice(-drawCount);
    const newHand = [...hand, ...drawn];

    await Promise.all([
      updateMDHand(r.id, myPlayerId, newHand),
      updateMDRoom(r.room_code, { deck, turn_drawn: true }),
    ]);
    setMyHand(newHand);
  }, [myPlayerId]);

  const playMoney = useCallback(
    async (card: MDCard) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
      if (r.cards_played_this_turn >= 3) return;
      if (!r.turn_drawn) return;

      const newHand = hand.filter((c) => c.id !== card.id);
      const players = r.players.map((p) => {
        if (p.id !== myPlayerId) return p;
        return { ...p, bank: [...p.bank, card] };
      });

      const winnerId = checkWin(players);

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          players,
          cards_played_this_turn: r.cards_played_this_turn + 1,
          status: winnerId ? 'finished' : 'playing',
          winner_id: winnerId ?? null,
        }),
      ]);
      setMyHand(newHand);
    },
    [myPlayerId]
  );

  const playProperty = useCallback(
    async (card: MDCard, color: PropertyColor) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
      if (r.cards_played_this_turn >= 3) return;
      if (!r.turn_drawn) return;

      const newHand = hand.filter((c) => c.id !== card.id);
      const players = r.players.map((p) => {
        if (p.id !== myPlayerId) return p;
        const existingSet = p.sets[color] ?? [];
        return {
          ...p,
          sets: { ...p.sets, [color]: [...existingSet, card] },
        };
      });

      const winnerId = checkWin(players);
      setPendingPlay(null);

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          players,
          cards_played_this_turn: r.cards_played_this_turn + 1,
          status: winnerId ? 'finished' : 'playing',
          winner_id: winnerId ?? null,
        }),
      ]);
      setMyHand(newHand);
    },
    [myPlayerId]
  );

  const initiateAction = useCallback(
    (card: MDCard) => {
      const r = roomRef.current;
      if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
      if (r.cards_played_this_turn >= 3) return;
      if (!r.turn_drawn) return;

      switch (card.action) {
        case 'debt_collector':
          setPendingPlay({ type: 'debt_target', card });
          break;
        case 'birthday':
          commitBirthday(card);
          break;
        case 'deal_breaker':
          setPendingPlay({ type: 'deal_breaker_target', card });
          break;
        case 'forced_deal':
          setPendingPlay({ type: 'forced_deal_my_card', card });
          break;
        case 'sly_deal':
          setPendingPlay({ type: 'sly_deal_target', card });
          break;
        case 'rent':
          setPendingPlay({ type: 'rent_config', card });
          break;
        case 'wild_rent':
          setPendingPlay({ type: 'rent_config', card });
          break;
        case 'double_rent':
          // double_rent must be combined with a rent card — handle in UI
          break;
        default:
          break;
      }
    },
    [myPlayerId]
  );

  // Called after targeting steps for birthday (no targeting needed)
  const commitBirthday = useCallback(
    async (card: MDCard) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r) return;

      const newHand = hand.filter((c) => c.id !== card.id);
      const otherPlayers = r.players.filter((p) => p.id !== myPlayerId);
      const paymentQueue = otherPlayers.map((p) => ({
        playerId: p.id,
        amountOwed: 2,
        paid: false,
      }));

      const pending: MDPendingAction = {
        actionType: 'birthday',
        actionCardId: card.id,
        actorId: myPlayerId,
        jsnCount: 0,
        paymentQueue,
        currentPayerIndex: 0,
        doubleRent: false,
      };

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, card],
          pending_action: pending,
          cards_played_this_turn: r.cards_played_this_turn + 1,
        }),
      ]);
      setMyHand(newHand);
      setPendingPlay(null);
    },
    [myPlayerId]
  );

  const commitDebtCollector = useCallback(
    async (card: MDCard, targetPlayerId: string) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r) return;

      const newHand = hand.filter((c) => c.id !== card.id);
      const pending: MDPendingAction = {
        actionType: 'debt_collector',
        actionCardId: card.id,
        actorId: myPlayerId,
        jsnCount: 0,
        paymentQueue: [{ playerId: targetPlayerId, amountOwed: 5, paid: false }],
        currentPayerIndex: 0,
        targetPlayerId,
        doubleRent: false,
      };

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, card],
          pending_action: pending,
          cards_played_this_turn: r.cards_played_this_turn + 1,
        }),
      ]);
      setMyHand(newHand);
      setPendingPlay(null);
    },
    [myPlayerId]
  );

  const commitRent = useCallback(
    async (
      card: MDCard,
      rentColor: PropertyColor,
      targetPlayerId: string | null, // null = all players (standard rent)
      doubleRentCard: MDCard | null
    ) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r) return;

      const myPlayer = r.players.find((p) => p.id === myPlayerId);
      if (!myPlayer) return;

      const setCards = myPlayer.sets[rentColor] ?? [];
      let rentAmount = getRent(rentColor, setCards.length);
      if (doubleRentCard) rentAmount *= 2;

      const otherPlayers = r.players.filter((p) => p.id !== myPlayerId);
      const targets = targetPlayerId
        ? otherPlayers.filter((p) => p.id === targetPlayerId)
        : otherPlayers;

      const paymentQueue = targets.map((p) => ({
        playerId: p.id,
        amountOwed: rentAmount,
        paid: false,
      }));

      let cardsPlayed = r.cards_played_this_turn + 1;
      let newHand = hand.filter((c) => c.id !== card.id);
      const toDiscard: MDCard[] = [card];

      if (doubleRentCard) {
        newHand = newHand.filter((c) => c.id !== doubleRentCard.id);
        toDiscard.push(doubleRentCard);
        cardsPlayed += 1;
      }

      const pending: MDPendingAction = {
        actionType: card.action as ActionType,
        actionCardId: card.id,
        actorId: myPlayerId,
        jsnCount: 0,
        paymentQueue,
        currentPayerIndex: 0,
        rentColor,
        doubleRent: !!doubleRentCard,
        targetPlayerId: targetPlayerId ?? undefined,
      };

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, ...toDiscard],
          pending_action: pending,
          cards_played_this_turn: cardsPlayed,
        }),
      ]);
      setMyHand(newHand);
      setPendingPlay(null);
    },
    [myPlayerId]
  );

  const commitDealBreaker = useCallback(
    async (card: MDCard, targetPlayerId: string, targetColor: PropertyColor) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r) return;

      const newHand = hand.filter((c) => c.id !== card.id);
      const pending: MDPendingAction = {
        actionType: 'deal_breaker',
        actionCardId: card.id,
        actorId: myPlayerId,
        jsnCount: 0,
        paymentQueue: [],
        currentPayerIndex: 0,
        targetPlayerId,
        targetColor,
        doubleRent: false,
      };

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, card],
          pending_action: pending,
          cards_played_this_turn: r.cards_played_this_turn + 1,
        }),
      ]);
      setMyHand(newHand);
      setPendingPlay(null);
    },
    [myPlayerId]
  );

  const commitForcedDeal = useCallback(
    async (
      card: MDCard,
      myCardId: string,
      myCardColor: PropertyColor,
      targetPlayerId: string,
      targetCardId: string,
      targetCardColor: PropertyColor
    ) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r) return;

      const newHand = hand.filter((c) => c.id !== card.id);
      const pending: MDPendingAction = {
        actionType: 'forced_deal',
        actionCardId: card.id,
        actorId: myPlayerId,
        jsnCount: 0,
        paymentQueue: [],
        currentPayerIndex: 0,
        targetPlayerId,
        actorCardId: myCardId,
        actorCardColor: myCardColor,
        targetCardId,
        targetCardColor,
        doubleRent: false,
      };

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, card],
          pending_action: pending,
          cards_played_this_turn: r.cards_played_this_turn + 1,
        }),
      ]);
      setMyHand(newHand);
      setPendingPlay(null);
    },
    [myPlayerId]
  );

  const commitSlyDeal = useCallback(
    async (
      card: MDCard,
      targetPlayerId: string,
      targetCardId: string,
      targetCardColor: PropertyColor
    ) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r) return;

      const newHand = hand.filter((c) => c.id !== card.id);
      const pending: MDPendingAction = {
        actionType: 'sly_deal',
        actionCardId: card.id,
        actorId: myPlayerId,
        jsnCount: 0,
        paymentQueue: [],
        currentPayerIndex: 0,
        targetPlayerId,
        stolenCardId: targetCardId,
        stolenCardColor: targetCardColor,
        stolenFromPlayerId: targetPlayerId,
        doubleRent: false,
      };

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, card],
          pending_action: pending,
          cards_played_this_turn: r.cards_played_this_turn + 1,
        }),
      ]);
      setMyHand(newHand);
      setPendingPlay(null);
    },
    [myPlayerId]
  );

  // ====== JSN FLOW ======

  const respondJSN = useCallback(
    async (jsnCardId: string) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r || !r.pending_action) return;

      const jsnCard = hand.find((c) => c.id === jsnCardId);
      if (!jsnCard) return;

      const newHand = hand.filter((c) => c.id !== jsnCardId);
      const newJsnCount = r.pending_action.jsnCount + 1;

      const updatedPending: MDPendingAction = {
        ...r.pending_action,
        jsnCount: newJsnCount,
      };

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, jsnCard],
          pending_action: updatedPending,
        }),
      ]);
      setMyHand(newHand);
    },
    [myPlayerId]
  );

  const acceptCancellation = useCallback(async () => {
    // Actor accepts that their action was cancelled (jsnCount is odd)
    const r = roomRef.current;
    if (!r || !r.pending_action) return;

    await updateMDRoom(r.room_code, { pending_action: null });
  }, []);

  const resolveActionEffect = useCallback(async () => {
    const r = roomRef.current;
    if (!r || !r.pending_action) return;

    const pa = r.pending_action;
    let players = [...r.players];

    if (pa.actionType === 'deal_breaker' && pa.targetPlayerId && pa.targetColor) {
      // Transfer entire set
      const targetIdx = players.findIndex((p) => p.id === pa.targetPlayerId);
      const actorIdx = players.findIndex((p) => p.id === pa.actorId);
      if (targetIdx === -1 || actorIdx === -1) {
        await updateMDRoom(r.room_code, { pending_action: null });
        return;
      }

      const setToSteal = players[targetIdx].sets[pa.targetColor] ?? [];
      const newTargetSets = { ...players[targetIdx].sets };
      delete newTargetSets[pa.targetColor];
      players[targetIdx] = { ...players[targetIdx], sets: newTargetSets };

      const actorExisting = players[actorIdx].sets[pa.targetColor] ?? [];
      players[actorIdx] = {
        ...players[actorIdx],
        sets: { ...players[actorIdx].sets, [pa.targetColor]: [...actorExisting, ...setToSteal] },
      };

    } else if (pa.actionType === 'forced_deal' && pa.actorCardId && pa.actorCardColor && pa.targetCardId && pa.targetCardColor && pa.targetPlayerId) {
      const actorIdx = players.findIndex((p) => p.id === pa.actorId);
      const targetIdx = players.findIndex((p) => p.id === pa.targetPlayerId);
      if (actorIdx === -1 || targetIdx === -1) {
        await updateMDRoom(r.room_code, { pending_action: null });
        return;
      }

      // Find actor card
      const actorCardResult = findCardInSets(players[actorIdx], pa.actorCardId);
      const targetCardResult = findCardInSets(players[targetIdx], pa.targetCardId);

      if (!actorCardResult || !targetCardResult) {
        await updateMDRoom(r.room_code, { pending_action: null });
        return;
      }

      // Remove actor card from actor, add to target
      players[actorIdx] = removeCardFromSet(players[actorIdx], pa.actorCardId, actorCardResult.color);
      players[targetIdx] = addCardToSet(players[targetIdx], actorCardResult.card, actorCardResult.color);

      // Remove target card from target, add to actor
      players[targetIdx] = removeCardFromSet(players[targetIdx], pa.targetCardId, targetCardResult.color);
      players[actorIdx] = addCardToSet(players[actorIdx], targetCardResult.card, targetCardResult.color);

    } else if (pa.actionType === 'sly_deal' && pa.stolenCardId && pa.stolenCardColor && pa.stolenFromPlayerId) {
      const fromIdx = players.findIndex((p) => p.id === pa.stolenFromPlayerId);
      const toIdx = players.findIndex((p) => p.id === pa.actorId);
      if (fromIdx === -1 || toIdx === -1) {
        await updateMDRoom(r.room_code, { pending_action: null });
        return;
      }

      const stolenSet = players[fromIdx].sets[pa.stolenCardColor] ?? [];
      const stolenCard = stolenSet.find((c) => c.id === pa.stolenCardId);
      if (!stolenCard) {
        await updateMDRoom(r.room_code, { pending_action: null });
        return;
      }

      players[fromIdx] = removeCardFromSet(players[fromIdx], pa.stolenCardId, pa.stolenCardColor);
      players[toIdx] = addCardToSet(players[toIdx], stolenCard, pa.stolenCardColor);

    } else if (pa.paymentQueue.length > 0) {
      // Payment action — move to payment phase (pending action stays, payment happens)
      // Nothing to do here — payment is handled by submitPayment
      return;
    }

    const winnerId = checkWin(players);

    // If it's a payment action, keep pending to process payments
    if (pa.paymentQueue.length > 0 && (pa.actionType === 'birthday' || pa.actionType === 'debt_collector' || pa.actionType === 'rent' || pa.actionType === 'wild_rent')) {
      // Keep pending_action, just update players in case needed
      await updateMDRoom(r.room_code, {
        players,
        status: winnerId ? 'finished' : 'playing',
        winner_id: winnerId ?? null,
      });
      return;
    }

    await updateMDRoom(r.room_code, {
      players,
      pending_action: null,
      status: winnerId ? 'finished' : 'playing',
      winner_id: winnerId ?? null,
    });
  }, []);

  const submitPayment = useCallback(
    async (selectedCardIds: string[]) => {
      const r = roomRef.current;
      if (!r || !r.pending_action) return;

      const pa = r.pending_action;
      const currentPayer = pa.paymentQueue[pa.currentPayerIndex];
      if (!currentPayer || currentPayer.playerId !== myPlayerId) return;

      let players = [...r.players];
      const payerIdx = players.findIndex((p) => p.id === myPlayerId);
      const actorIdx = players.findIndex((p) => p.id === pa.actorId);
      if (payerIdx === -1 || actorIdx === -1) return;

      const payer = players[payerIdx];
      const actor = players[actorIdx];

      // Gather all payable cards
      const allPayableCards: MDCard[] = [
        ...payer.bank,
        ...Object.values(payer.sets).flat(),
      ];

      const selectedCards = allPayableCards.filter((c) => selectedCardIds.includes(c.id));

      // Remove selected cards from payer
      let newPayer = { ...payer };

      // Remove from bank
      newPayer = {
        ...newPayer,
        bank: newPayer.bank.filter((c) => !selectedCardIds.includes(c.id)),
      };

      // Remove from sets
      const newSets: typeof newPayer.sets = {};
      for (const color of ALL_COLORS) {
        const set = newPayer.sets[color];
        if (set) {
          const filtered = set.filter((c) => !selectedCardIds.includes(c.id));
          if (filtered.length > 0) newSets[color] = filtered;
        }
      }
      newPayer = { ...newPayer, sets: newSets };

      // Add to actor
      let newActor = { ...actor };
      for (const card of selectedCards) {
        if (card.type === 'money') {
          newActor = { ...newActor, bank: [...newActor.bank, card] };
        } else if (card.type === 'property') {
          const col = card.color!;
          newActor = addCardToSet(newActor, card, col);
        } else if (card.type === 'wildProperty') {
          // Use the color it was in when paid
          // Find it in payer original sets to know color
          let payerColor: PropertyColor | null = null;
          for (const color of ALL_COLORS) {
            const set = payer.sets[color];
            if (set?.find((c) => c.id === card.id)) {
              payerColor = color;
              break;
            }
          }
          if (payerColor) {
            newActor = addCardToSet(newActor, card, payerColor);
          } else {
            // fallback: treat as money-like into bank? No - add to first valid color
            const validColors = card.isRainbow ? ALL_COLORS : (card.wildColors ?? []);
            if (validColors.length > 0) {
              newActor = addCardToSet(newActor, card, validColors[0]);
            }
          }
        } else {
          // action cards used as payment go to bank as face value? No — to discard
          // Actually in standard rules, action/wild used as payment = treated as $
          // But here we put money cards in bank
        }
      }

      players[payerIdx] = newPayer;
      players[actorIdx] = newActor;

      // Mark paid
      const newQueue = pa.paymentQueue.map((item, idx) =>
        idx === pa.currentPayerIndex ? { ...item, paid: true } : item
      );

      const nextIndex = pa.currentPayerIndex + 1;
      const allPaid = nextIndex >= newQueue.length;

      const winnerId = checkWin(players);

      if (allPaid || winnerId) {
        await updateMDRoom(r.room_code, {
          players,
          pending_action: null,
          status: winnerId ? 'finished' : 'playing',
          winner_id: winnerId ?? null,
        });
      } else {
        // Move to next payer
        const updatedPending: MDPendingAction = {
          ...pa,
          paymentQueue: newQueue,
          currentPayerIndex: nextIndex,
          jsnCount: 0, // Reset JSN for next payer
        };
        await updateMDRoom(r.room_code, {
          players,
          pending_action: updatedPending,
          status: winnerId ? 'finished' : 'playing',
          winner_id: winnerId ?? null,
        });
      }

      setPaymentSelection([]);
    },
    [myPlayerId]
  );

  const moveWild = useCallback(
    async (cardId: string, fromColor: PropertyColor, toColor: PropertyColor) => {
      const r = roomRef.current;
      if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;

      const players = r.players.map((p) => {
        if (p.id !== myPlayerId) return p;
        const card = (p.sets[fromColor] ?? []).find((c) => c.id === cardId);
        if (!card) return p;
        let updated = removeCardFromSet(p, cardId, fromColor);
        updated = addCardToSet(updated, card, toColor);
        return updated;
      });

      await updateMDRoom(r.room_code, { players });
    },
    [myPlayerId]
  );

  const endTurn = useCallback(async () => {
    const r = roomRef.current;
    const hand = myHandRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;

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
  }, [myPlayerId]);

  const discardCard = useCallback(
    async (card: MDCard) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r || !isDiscardMode) return;

      const newHand = hand.filter((c) => c.id !== card.id);

      await Promise.all([
        updateMDHand(r.id, myPlayerId, newHand),
        updateMDRoom(r.room_code, {
          discard_pile: [...r.discard_pile, card],
        }),
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
      }
    },
    [myPlayerId, isDiscardMode]
  );

  const syncYoutubeUrl = useCallback(async (url: string) => {
    const r = roomRef.current;
    if (!r) return;
    await updateMDRoom(r.room_code, { youtube_url: url });
  }, []);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setMyHand([]);
    setPendingPlay(null);
    setPaymentSelection([]);
    setIsDiscardMode(false);
  }, []);

  // Determine if it's my turn to respond to a pending action
  const isMyTurnToRespond = (() => {
    if (!room?.pending_action) return false;
    const pa = room.pending_action;

    // Payment actions: it's my turn if I'm the current payer and jsnCount is even
    if (
      pa.paymentQueue.length > 0 &&
      pa.currentPayerIndex < pa.paymentQueue.length &&
      pa.jsnCount % 2 === 0
    ) {
      return pa.paymentQueue[pa.currentPayerIndex].playerId === myPlayerId;
    }

    // Non-payment actions (deal_breaker, forced_deal, sly_deal)
    if (pa.targetPlayerId && pa.jsnCount % 2 === 0) {
      return pa.targetPlayerId === myPlayerId;
    }

    // Actor can counter-JSN when jsnCount is odd
    if (pa.jsnCount % 2 === 1 && pa.actorId === myPlayerId) {
      return true;
    }

    return false;
  })();

  const hasJSNInHand = myHand.some((c) => c.action === 'just_say_no');

  return {
    room,
    myHand,
    myPlayerId,
    loading,
    error,
    isMyTurn,
    isMyTurnToRespond,
    hasJSNInHand,
    pendingPlay,
    paymentSelection,
    setPaymentSelection,
    isDiscardMode,
    createRoom,
    joinRoom,
    startGame,
    drawCards,
    playMoney,
    playProperty,
    initiateAction,
    commitBirthday,
    commitDebtCollector,
    commitRent,
    commitDealBreaker,
    commitForcedDeal,
    commitSlyDeal,
    respondJSN,
    acceptCancellation,
    resolveActionEffect,
    submitPayment,
    moveWild,
    endTurn,
    discardCard,
    syncYoutubeUrl,
    leaveRoom,
    setPendingPlay,
    isConfigured: isSupabaseConfigured,
  };
}
