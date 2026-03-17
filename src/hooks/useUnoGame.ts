import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UnoCard,
  canPlay,
  getNextPlayerIndex,
  getOrCreatePlayerId,
  shuffleDeck,
} from '../lib/unoLogic';
import {
  UnoRoomRow,
  createUnoRoom,
  joinUnoRoom,
  getUnoRoom,
  startUnoGame,
  updateUnoRoom,
  getUnoHand,
  updateUnoHand,
  subscribeToUnoRoom,
  subscribeToUnoHand,
  isSupabaseConfigured,
} from '../lib/unoSupabase';

export function useUnoGame() {
  const [room, setRoom] = useState<UnoRoomRow | null>(null);
  const [myHand, setMyHand] = useState<UnoCard[]>([]);
  const [myPlayerId] = useState(() => getOrCreatePlayerId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);

  const roomRef = useRef<UnoRoomRow | null>(null);
  roomRef.current = room;

  const myHandRef = useRef<UnoCard[]>([]);
  myHandRef.current = myHand;

  const hasDrawnRef = useRef(false);
  hasDrawnRef.current = hasDrawnThisTurn;

  // Subscribe to room + hand changes
  useEffect(() => {
    if (!room?.room_code || !room?.id) return;

    const roomCode = room.room_code;
    const roomId = room.id;

    const unsubRoom = subscribeToUnoRoom(roomCode, setRoom);
    const unsubHand = subscribeToUnoHand(roomId, myPlayerId, setMyHand);

    return () => {
      unsubRoom();
      unsubHand();
    };
  }, [room?.room_code, room?.id, myPlayerId]);

  // Fetch hand when game starts
  useEffect(() => {
    if (room?.status === 'playing' && room.id) {
      getUnoHand(room.id, myPlayerId).then((cards) => {
        if (cards) setMyHand(cards);
      });
    }
  }, [room?.status, room?.id, myPlayerId]);

  // Reset draw state on turn change
  const prevTurnRef = useRef(-1);
  useEffect(() => {
    const t = room?.current_player_index ?? -1;
    if (t !== prevTurnRef.current) {
      setHasDrawnThisTurn(false);
      setPendingWild(null);
      prevTurnRef.current = t;
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

  const topCard = room ? room.discard_pile[room.discard_pile.length - 1] ?? null : null;

  const createRoom = useCallback(
    async (playerName: string) => {
      setLoading(true);
      setError(null);
      const newRoom = await createUnoRoom(playerName, myPlayerId);
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
      const joined = await joinUnoRoom(roomCode, playerName, myPlayerId);
      if (joined) {
        const fresh = await getUnoRoom(roomCode);
        setRoom(fresh ?? joined);
      } else {
        setError('Room introuvable ou complète (max 10 joueurs).');
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
    await startUnoGame(r.room_code, r.id, r.players);
    setLoading(false);
  }, [myPlayerId]);

  const NUMBER_VALUES = new Set(['0','1','2','3','4','5','6','7','8','9']);

  const playCard = useCallback(
    async (card: UnoCard, chosenColor?: string) => {
      const r = roomRef.current;
      const hand = myHandRef.current;
      if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;

      const top = r.discard_pile[r.discard_pile.length - 1];

      // Strict stacking: when draw stack active, only same card type (draw2→draw2, wild4→wild4)
      if (r.draw_stack > 0 && card.value !== top.value) return;
      if (!canPlay(card, top, r.current_color)) return;

      // Wild needs color selection
      if ((card.value === 'wild' || card.value === 'wild4') && !chosenColor) {
        setPendingWild(card);
        return;
      }

      // Multi-card: for number cards, play ALL identical (same value + color) at once
      const isNumber = NUMBER_VALUES.has(card.value);
      const cardsToPlay = isNumber
        ? hand.filter((c) => c.value === card.value && c.color === card.color)
        : [card];

      const playedIds = new Set(cardsToPlay.map((c) => c.id));
      const newHand = hand.filter((c) => !playedIds.has(c.id));
      const newDiscardPile = [...r.discard_pile, ...cardsToPlay];
      const newColor = card.color === 'wild' ? (chosenColor ?? 'red') : card.color;

      let newDirection = r.direction;
      let newDrawStack = r.draw_stack;
      // How many players to skip (beyond the natural "move to next")
      let extraSkips = 0;

      for (const c of cardsToPlay) {
        switch (c.value) {
          case 'reverse':
            newDirection = -newDirection;
            // In 2-player game, reverse = skip
            if (r.players.length === 2) extraSkips++;
            break;
          case 'skip':
            extraSkips++;
            break;
          case 'draw2':
            newDrawStack += 2;
            break;
          case 'wild4':
            newDrawStack += 4;
            break;
        }
      }

      // Move once to next player, then skip extraSkips more
      let nextPlayerIndex = (r.current_player_index + newDirection + r.players.length) % r.players.length;
      for (let i = 0; i < extraSkips; i++) {
        nextPlayerIndex = (nextPlayerIndex + newDirection + r.players.length) % r.players.length;
      }

      // Update unoSafe: going to 1 card resets the flag (must call UNO again)
      const updatedPlayers = r.players.map((p) => {
        if (p.id !== myPlayerId) return p;
        const newCount = newHand.length;
        return { ...p, cardCount: newCount, unoSafe: newCount === 1 ? false : true };
      });

      const isWinner = newHand.length === 0;

      await Promise.all([
        updateUnoHand(r.id, myPlayerId, newHand),
        updateUnoRoom(r.room_code, {
          discard_pile: newDiscardPile,
          current_color: newColor,
          direction: newDirection,
          current_player_index: nextPlayerIndex,
          draw_stack: newDrawStack,
          players: updatedPlayers,
          status: isWinner ? 'finished' : 'playing',
          winner_id: isWinner ? myPlayerId : null,
        }),
      ]);

      setPendingWild(null);
    },
    [myPlayerId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const selectWildColor = useCallback(
    async (color: string) => {
      const card = pendingWild;
      if (!card) return;
      setPendingWild(null);
      await playCard(card, color);
    },
    [pendingWild, playCard]
  );

  const drawCard = useCallback(async () => {
    const r = roomRef.current;
    const hand = myHandRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;

    let deck = [...r.deck];
    let discardPile = [...r.discard_pile];

    const reshuffleDiscard = (): UnoCard[] => {
      const top = discardPile[discardPile.length - 1];
      const toShuffle = discardPile.slice(0, -1);
      discardPile = [top];
      return shuffleDeck(toShuffle);
    };

    if (r.draw_stack > 0) {
      // Forced draw
      const drawCount = r.draw_stack;
      const drawn: UnoCard[] = [];
      for (let i = 0; i < drawCount; i++) {
        if (deck.length === 0) deck = reshuffleDiscard();
        if (deck.length === 0) break;
        drawn.push(deck.pop()!);
      }

      const newHand = [...hand, ...drawn];
      const updatedPlayers = r.players.map((p) =>
        p.id === myPlayerId ? { ...p, cardCount: newHand.length } : p
      );
      const nextPlayerIndex = getNextPlayerIndex(
        r.current_player_index,
        r.direction,
        r.players.length
      );

      await Promise.all([
        updateUnoHand(r.id, myPlayerId, newHand),
        updateUnoRoom(r.room_code, {
          deck,
          discard_pile: discardPile,
          draw_stack: 0,
          current_player_index: nextPlayerIndex,
          players: updatedPlayers,
        }),
      ]);
    } else {
      // Normal draw (1 card)
      if (hasDrawnRef.current) return;

      if (deck.length === 0) deck = reshuffleDiscard();
      if (deck.length === 0) {
        // No cards left — auto pass
        const nextPlayerIndex = getNextPlayerIndex(
          r.current_player_index,
          r.direction,
          r.players.length
        );
        await updateUnoRoom(r.room_code, { current_player_index: nextPlayerIndex });
        return;
      }

      const drawn = deck.pop()!;
      const newHand = [...hand, drawn];
      const updatedPlayers = r.players.map((p) =>
        p.id === myPlayerId ? { ...p, cardCount: newHand.length } : p
      );

      await Promise.all([
        updateUnoHand(r.id, myPlayerId, newHand),
        updateUnoRoom(r.room_code, {
          deck,
          discard_pile: discardPile,
          players: updatedPlayers,
        }),
      ]);

      setHasDrawnThisTurn(true);

      // If drawn card is not playable → auto pass
      const top = discardPile[discardPile.length - 1];
      if (!canPlay(drawn, top, r.current_color)) {
        const nextPlayerIndex = getNextPlayerIndex(
          r.current_player_index,
          r.direction,
          r.players.length
        );
        await updateUnoRoom(r.room_code, { current_player_index: nextPlayerIndex });
        setHasDrawnThisTurn(false);
      }
    }
  }, [myPlayerId]);

  const passTurn = useCallback(async () => {
    const r = roomRef.current;
    if (!r || r.players[r.current_player_index]?.id !== myPlayerId) return;
    if (!hasDrawnRef.current) return;

    const nextPlayerIndex = getNextPlayerIndex(
      r.current_player_index,
      r.direction,
      r.players.length
    );
    await updateUnoRoom(r.room_code, { current_player_index: nextPlayerIndex });
    setHasDrawnThisTurn(false);
  }, [myPlayerId]);

  const callUno = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const updatedPlayers = r.players.map((p) =>
      p.id === myPlayerId ? { ...p, unoSafe: true } : p
    );
    await updateUnoRoom(r.room_code, { players: updatedPlayers });
  }, [myPlayerId]);

  const counterUno = useCallback(async (targetPlayerId: string) => {
    const r = roomRef.current;
    if (!r) return;

    const target = r.players.find((p) => p.id === targetPlayerId);
    if (!target || target.cardCount !== 1 || target.unoSafe) return;

    const targetHand = await getUnoHand(r.id, targetPlayerId);
    if (!targetHand) return;

    let deck = [...r.deck];
    let discardPile = [...r.discard_pile];

    const reshuffleDiscard = (): UnoCard[] => {
      const top = discardPile[discardPile.length - 1];
      const toShuffle = discardPile.slice(0, -1);
      discardPile = [top];
      return shuffleDeck(toShuffle);
    };

    const penalty: UnoCard[] = [];
    for (let i = 0; i < 2; i++) {
      if (deck.length === 0) deck = reshuffleDiscard();
      if (deck.length > 0) penalty.push(deck.pop()!);
    }

    const newTargetHand = [...targetHand, ...penalty];
    const updatedPlayers = r.players.map((p) =>
      p.id === targetPlayerId
        ? { ...p, cardCount: newTargetHand.length, unoSafe: true }
        : p
    );

    await Promise.all([
      updateUnoHand(r.id, targetPlayerId, newTargetHand),
      updateUnoRoom(r.room_code, { deck, discard_pile: discardPile, players: updatedPlayers }),
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const syncYoutubeUrl = useCallback(async (url: string) => {
    const r = roomRef.current;
    if (!r) return;
    await updateUnoRoom(r.room_code, { youtube_url: url });
  }, []);

  const leaveRoom = useCallback(() => {
    setRoom(null);
    setMyHand([]);
    setHasDrawnThisTurn(false);
    setPendingWild(null);
  }, []);

  return {
    room,
    myHand,
    myPlayerId,
    loading,
    error,
    isMyTurn,
    topCard,
    hasDrawnThisTurn,
    pendingWild,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    selectWildColor,
    drawCard,
    passTurn,
    callUno,
    counterUno,
    syncYoutubeUrl,
    leaveRoom,
    isConfigured: isSupabaseConfigured,
  };
}
