import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MDCard, MDPlayer, PropertyColor,
  ALL_COLORS, COLOR_BG, COLOR_LABEL, SET_SIZES,
  safeBank, safeSet, safeSets, getBankTotal, isSetComplete, countCompleteSets,
} from '../../lib/monopolyDealLogic';
import { MDRoomRow } from '../../lib/monopolyDealSupabase';
import { PendingPlay } from '../../hooks/useMonopolyDealGame';
import { MDCardComponent } from './MDCardComponent';
import { MusicPlayer } from '../MusicPlayer';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  room: MDRoomRow;
  myHand: MDCard[];
  myPlayerId: string;
  isMyTurn: boolean;
  isMyTurnToRespond: boolean;
  hasJSNInHand: boolean;
  pendingPlay: PendingPlay | null;
  setPendingPlay: (p: PendingPlay | null) => void;
  paymentSelection: MDCard[];
  setPaymentSelection: (s: MDCard[]) => void;
  isDiscardMode: boolean;
  onPlayMoney: (card: MDCard) => void;
  onPlayProperty: (card: MDCard, color: PropertyColor) => void;
  onPlayActionAsMoney: (card: MDCard) => void;
  onInitiateAction: (card: MDCard) => void;
  onCommitPassGo: (card: MDCard) => void;
  onCommitDebt: (card: MDCard, targetId: string | null) => void;
  onCommitRent: (card: MDCard, color: PropertyColor, targetId: string | null, doubleCard: MDCard | null) => void;
  onCommitDealBreaker: (card: MDCard, targetId: string, color: PropertyColor) => void;
  onCommitSlyDeal: (card: MDCard, targetId: string, cardId: string, color: PropertyColor) => void;
  onCommitForcedDeal: (card: MDCard, myCardId: string, myColor: PropertyColor, targetId: string, theirCardId: string, theirColor: PropertyColor) => void;
  onRespondJSN: (jsnCardId: string) => void;
  onAcceptCancellation: () => void;
  onSubmitPayment: (cardIds: string[]) => void;
  onMoveWild: (cardId: string, fromColor: PropertyColor, toColor: PropertyColor) => void;
  onEndTurn: () => void;
  onDiscardCard: (card: MDCard) => void;
  onSyncYoutubeUrl: (url: string) => void;
  onLeave: () => void;
}

// ─── PropertySet sub-component ────────────────────────────────────────────────

function PropertySet({
  color, cards, size = 'sm', onCardClick,
}: {
  color: PropertyColor;
  cards: MDCard[];
  size?: 'sm' | 'md';
  onCardClick?: (card: MDCard, color: PropertyColor) => void;
}) {
  const complete = isSetComplete(color, cards);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      padding: '4px 6px', borderRadius: 8,
      border: `2px solid ${complete ? COLOR_BG[color] : 'rgba(255,255,255,0.08)'}`,
      background: complete ? `${COLOR_BG[color]}22` : 'rgba(0,0,0,0.15)',
      minWidth: size === 'sm' ? 58 : 76,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: COLOR_BG[color], marginBottom: 2 }}>
        {COLOR_LABEL[color]} {cards.length}/{SET_SIZES[color]}
        {complete && ' \u2713'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cards.map((card) => (
          <MDCardComponent
            key={card.id}
            card={card}
            size={size}
            onClick={onCardClick ? () => onCardClick(card, color) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Compact opponent chip ─────────────────────────────────────────────────────

function OpponentChip({
  player, isCurrentTurn, onSetCardClick,
}: {
  player: MDPlayer;
  isCurrentTurn: boolean;
  onSetCardClick?: (card: MDCard, color: PropertyColor, player: MDPlayer) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sets = safeSets(player);
  const bank = safeBank(player);
  const bankTotal = getBankTotal(player);
  const completeSets = countCompleteSets(player);
  const colorsWithCards = ALL_COLORS.filter((c) => (sets[c]?.length ?? 0) > 0);

  // Compact denomination display e.g. "1·1·2·5"
  const denomLabel = bank.length > 0
    ? bank.map((c) => `$${c.denomination ?? c.value}M`).join(' ')
    : 'vide';

  return (
    <div
      style={{
        flexShrink: 0,
        borderRadius: 10,
        padding: '8px 10px',
        border: isCurrentTurn ? '2px solid #facc15' : '1.5px solid rgba(255,255,255,0.1)',
        background: isCurrentTurn ? 'rgba(250,204,21,0.07)' : 'rgba(0,0,0,0.25)',
        minWidth: 140, maxWidth: 220,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onClick={() => setExpanded((e) => !e)}
    >
      {/* Name + win badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {isCurrentTurn && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#facc15', flexShrink: 0,
            boxShadow: '0 0 6px #facc15',
          }} />
        )}
        <span style={{
          fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.name}
        </span>
        {completeSets >= 3 && (
          <span style={{
            fontSize: 9, background: '#16a34a', color: 'white',
            padding: '1px 5px', borderRadius: 8, fontWeight: 700,
          }}>
            GAGNE
          </span>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
        <span style={{ color: '#86efac', fontWeight: 700 }}>${bankTotal}M</span>
        <span>{completeSets}/3 sets</span>
      </div>
      {/* Bank denomination breakdown */}
      <div style={{ fontSize: 9, color: 'rgba(134,239,172,0.7)', marginBottom: 5, fontWeight: 600 }}>
        {denomLabel}
      </div>

      {/* Set color badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {colorsWithCards.map((color) => {
          const count = sets[color]?.length ?? 0;
          const total = SET_SIZES[color];
          const complete = count >= total;
          return (
            <div key={color} style={{
              display: 'flex', alignItems: 'center',
              background: complete ? COLOR_BG[color] : `${COLOR_BG[color]}55`,
              borderRadius: 4, padding: '2px 5px',
              border: complete ? `1px solid ${COLOR_BG[color]}` : '1px solid rgba(255,255,255,0.12)',
            }}>
              <span style={{ fontSize: 8, color: 'white', fontWeight: 800 }}>{count}/{total}</span>
            </div>
          );
        })}
      </div>

      {/* Expanded: bank cards + full sets */}
      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bank.length > 0 && (
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#86efac', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Banque</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {bank.map((c) => <MDCardComponent key={c.id} card={c} size="sm" />)}
              </div>
            </div>
          )}
          {colorsWithCards.length > 0 && (
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Proprietes</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {colorsWithCards.map((color) => (
                  <PropertySet
                    key={color}
                    color={color}
                    cards={sets[color] ?? []}
                    size="sm"
                    onCardClick={onSetCardClick ? (card, c) => onSetCardClick(card, c, player) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── My full player area ───────────────────────────────────────────────────────

function MyArea({
  player, isMyTurn, onSetCardClick,
}: {
  player: MDPlayer;
  isMyTurn: boolean;
  onSetCardClick?: (card: MDCard, color: PropertyColor) => void;
}) {
  const sets = safeSets(player);
  const bank = safeBank(player);
  const bankTotal = getBankTotal(player);
  const completeSets = countCompleteSets(player);
  const colorsWithCards = ALL_COLORS.filter((c) => (sets[c]?.length ?? 0) > 0);

  return (
    <div style={{
      borderRadius: 10, padding: '10px 12px',
      border: isMyTurn ? '2px solid rgba(250,204,21,0.5)' : '1.5px solid rgba(255,255,255,0.1)',
      background: isMyTurn ? 'rgba(250,204,21,0.04)' : 'rgba(0,0,0,0.2)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          Mes cartes
        </span>
        <span style={{ fontSize: 11, color: '#86efac', fontWeight: 600 }}>${bankTotal}M</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{completeSets}/3 sets</span>
        {completeSets >= 3 && (
          <span style={{
            fontSize: 11, background: '#16a34a', color: 'white',
            padding: '1px 6px', borderRadius: 10, fontWeight: 700,
          }}>
            GAGNE !
          </span>
        )}
      </div>

      {/* Bank */}
      {bank.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Banque ({bank.length} cartes)
          </div>
          {/* Two-wrapper pattern for hover lift */}
          <div style={{ overflowX: 'auto', paddingTop: 10, paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 4, paddingBottom: 2 }}>
              {bank.map((c) => <MDCardComponent key={c.id} card={c} size="sm" />)}
            </div>
          </div>
        </div>
      )}

      {/* Sets */}
      {colorsWithCards.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Proprietes ({colorsWithCards.length} couleurs)
          </div>
          <div style={{ overflowX: 'auto', paddingTop: 4, paddingBottom: 2 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {colorsWithCards.map((color) => (
                <PropertySet
                  key={color}
                  color={color}
                  cards={sets[color] ?? []}
                  size="sm"
                  onCardClick={onSetCardClick ? (card, c) => onSetCardClick(card, c) : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {bank.length === 0 && colorsWithCards.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Aucune carte posee
        </div>
      )}
    </div>
  );
}

// ─── Overlay wrapper ───────────────────────────────────────────────────────────

function Overlay({ children, onCancel }: { children: React.ReactNode; onCancel?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          background: 'var(--bg-card)', borderRadius: 16,
          padding: 20, maxWidth: 540, width: '100%',
          border: '1px solid var(--border-color)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {children}
        {onCancel && (
          <button onClick={onCancel} className="btn btn-ghost w-full mt-3">
            Annuler
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Game Component ──────────────────────────────────────────────────────

export function MonopolyDealGame({
  room, myHand, myPlayerId, isMyTurn, isMyTurnToRespond, hasJSNInHand,
  pendingPlay, setPendingPlay, paymentSelection, setPaymentSelection,
  isDiscardMode,
  onPlayMoney, onPlayProperty, onPlayActionAsMoney, onInitiateAction, onCommitPassGo,
  onCommitDebt, onCommitRent, onCommitDealBreaker, onCommitSlyDeal, onCommitForcedDeal,
  onRespondJSN, onAcceptCancellation, onSubmitPayment, onMoveWild,
  onEndTurn, onDiscardCard, onSyncYoutubeUrl, onLeave,
}: Props) {
  const [movingWild, setMovingWild] = useState<{ cardId: string; fromColor: PropertyColor } | null>(null);

  const myPlayer = room.players.find((p) => p.id === myPlayerId)!;
  const otherPlayers = room.players.filter((p) => p.id !== myPlayerId);
  const currentPlayer = room.players[room.current_player_index];
  const pa = room.pending_action;

  const canPlay = isMyTurn && room.turn_drawn && room.cards_played_this_turn < 3 && !pa;
  const cardsLeft = 3 - room.cards_played_this_turn;

  const task = pa?.queue[0];
  const isMyPaymentTurn = task?.playerId === myPlayerId && (pa?.jsnCount ?? 0) % 2 === 0;
  const isMyJSNCounterTurn = pa && (pa.jsnCount ?? 0) % 2 === 1 && pa.actorId === myPlayerId;
  const canJSN = isMyTurnToRespond && (pa?.jsnCount ?? 0) % 2 === 0 && hasJSNInHand && pa?.queue[0]?.playerId === myPlayerId;

  const winner = room.winner_id ? room.players.find((p) => p.id === room.winner_id) : null;

  function handleHandCardClick(card: MDCard) {
    if (isDiscardMode) { onDiscardCard(card); return; }
    if (!canPlay) return;
    if (card.type === 'money') {
      onPlayMoney(card);
    } else if (card.type === 'property') {
      if (card.color) onPlayProperty(card, card.color);
    } else if (card.type === 'wildProperty') {
      if (card.wildColors && card.wildColors.length === 1) {
        onPlayProperty(card, card.wildColors[0]);
      } else {
        setPendingPlay({ step: 'color_picker', card });
      }
    } else if (card.type === 'action') {
      if (card.action === 'double_rent') return;
      if (card.action === 'pass_go') {
        onCommitPassGo(card);
      } else {
        setPendingPlay({ step: 'action_choice', card });
      }
    }
  }

  function handleMySetCardClick(card: MDCard, color: PropertyColor) {
    if (pendingPlay?.step === 'forced_deal_my') {
      const mySet = safeSet(myPlayer, color);
      if (isSetComplete(color, mySet)) return;
      setPendingPlay({ step: 'forced_deal_target', card: pendingPlay.card, myCardId: card.id, myColor: color });
    } else if (isMyTurn && !pa) {
      if (card.type === 'wildProperty' || (card.type === 'property' && !card.color)) {
        setMovingWild({ cardId: card.id, fromColor: color });
      }
    }
  }

  function togglePaymentCard(card: MDCard) {
    setPaymentSelection(
      paymentSelection.find((c) => c.id === card.id)
        ? paymentSelection.filter((c) => c.id !== card.id)
        : [...paymentSelection, card],
    );
  }

  // Hand label
  const handLabel = isDiscardMode
    ? `Defaussez jusqu'a 7 cartes (${myHand.length})`
    : canPlay
      ? `Main — ${cardsLeft} carte(s) a jouer`
      : `Main (${myHand.length})`;

  // Status text for header
  const statusText = room.status === 'finished'
    ? (winner ? `${winner.name} a gagne !` : 'Fin de partie')
    : isMyTurn
      ? room.turn_drawn
        ? `Ton tour · ${cardsLeft} carte(s) restante(s)`
        : 'Ton tour — pioche !'
      : `Tour de ${currentPlayer?.name ?? '?'}`;

  return (
    <div style={{
      height: '100dvh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
    }}>
      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 14, letterSpacing: 0.3 }}>
          Monopoly Deal
        </span>
        <span style={{ fontSize: 12, color: isMyTurn ? '#facc15' : 'var(--text-muted)', flex: 1, fontWeight: isMyTurn ? 600 : 400 }}>
          {statusText}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MusicPlayer inline syncedUrl={room.youtube_url ?? undefined} onUrlChange={onSyncYoutubeUrl} />
          {isMyTurn && !pa && room.turn_drawn && (
            <motion.button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={onEndTurn}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              Fin du tour
            </motion.button>
          )}
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 10px' }} onClick={onLeave}>
            Quitter
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>

        {/* Winner banner */}
        {room.status === 'finished' && winner && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              textAlign: 'center', padding: '12px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: 'white', fontWeight: 900, fontSize: 18,
            }}
          >
            {winner.name} a gagne avec 3 sets complets !
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-ghost" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }} onClick={onLeave}>
                Retour au menu
              </button>
            </div>
          </motion.div>
        )}

        {/* Opponents row (horizontal scroll) */}
        {otherPlayers.length > 0 && (
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 8, minWidth: 'max-content' }}>
              {otherPlayers.map((p) => (
                <OpponentChip
                  key={p.id}
                  player={p}
                  isCurrentTurn={p.id === currentPlayer?.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Center table: deck / discard / draw info */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(0,80,40,0.25)',
          border: '1.5px solid rgba(0,160,80,0.2)',
          flexWrap: 'wrap',
        }}>
          {/* Deck */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{
              width: 42, height: 58, borderRadius: 6, flexShrink: 0,
              background: 'repeating-linear-gradient(45deg,#1e3a5f,#1e3a5f 4px,#0f2744 4px,#0f2744 8px)',
              border: '1.5px solid #334155',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>?</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              Pioche: {room.deck.length}
            </span>
          </div>

          {/* Arrow */}
          <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.2)' }}>{'\u2192'}</span>

          {/* Discard */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {room.discard_pile.length > 0
              ? <MDCardComponent card={room.discard_pile[room.discard_pile.length - 1]} size="sm" />
              : (
                <div style={{
                  width: 42, height: 58, borderRadius: 6,
                  border: '1.5px dashed rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>vide</span>
                </div>
              )}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              Defausse: {room.discard_pile.length}
            </span>
          </div>

          {/* Draw instruction */}
          {isMyTurn && !room.turn_drawn && (
            <div style={{
              marginLeft: 'auto',
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(250,204,21,0.15)', border: '1.5px solid rgba(250,204,21,0.4)',
              fontSize: 12, fontWeight: 700, color: '#facc15',
            }}>
              Pioche 2 cartes pour commencer !
            </div>
          )}

          {isDiscardMode && (
            <div style={{
              marginLeft: 'auto',
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(248,113,113,0.15)', border: '1.5px solid rgba(248,113,113,0.4)',
              fontSize: 12, fontWeight: 700, color: '#f87171',
            }}>
              Defaussez jusqu'a 7 cartes !
            </div>
          )}
        </div>

        {/* Pending action panel */}
        {pa && (
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            border: '2px solid #f59e0b',
            background: 'rgba(245,158,11,0.08)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
              {pa.actionType === 'birthday' ? 'Anniversaire' :
               pa.actionType === 'debt_collector' ? 'Percepteur' :
               pa.actionType === 'rent' || pa.actionType === 'wild_rent' ? 'Loyer' :
               'Action en cours'}
              {' '}&mdash; demande par {room.players.find((p) => p.id === pa.actorId)?.name}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              {pa.queue.map((t) => {
                const payer = room.players.find((p) => p.id === t.playerId);
                return (
                  <span key={t.playerId} style={{ marginRight: 10 }}>
                    {payer?.name}: ${t.amount}M
                  </span>
                );
              })}
            </div>

            {pa.jsnCount > 0 && (
              <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 8 }}>
                Non Merci joue {pa.jsnCount} fois
              </div>
            )}

            {/* My payment turn */}
            {isMyPaymentTurn && (() => {
              const owed = task!.amount;
              const bankCards = safeBank(myPlayer);
              const myBankTotal = getBankTotal(myPlayer);
              // Rule: must give all bank before giving properties
              const mustGiveAllBank = myBankTotal < owed;

              // Total of all non-complete property cards I could give
              const availPropCards = ALL_COLORS.flatMap((c) => {
                const set = safeSet(myPlayer, c);
                return isSetComplete(c, set) ? [] : set;
              });
              const availPropTotal = availPropCards.reduce((s, c) => s + c.value, 0);
              const totalAvailable = myBankTotal + availPropTotal;

              // Effective total that will be submitted
              const selectedPropTotal = paymentSelection.reduce((s, c) => s + c.value, 0);
              const effectiveTotal = mustGiveAllBank
                ? myBankTotal + selectedPropTotal
                : paymentSelection.reduce((s, c) => s + c.value, 0);

              // Can submit: paid enough, OR gave everything available
              const canSubmit = effectiveTotal >= owed || effectiveTotal >= totalAvailable;

              // Locked bank cards (mustGiveAllBank): can't deselect, always included
              // Normal bank cards: player selects until >= owed
              const propSelectable = mustGiveAllBank; // properties only selectable when bank is insufficient
              const bankSelectable = !mustGiveAllBank;

              const handleSubmit = () => {
                const ids = mustGiveAllBank
                  ? [...bankCards.map((c) => c.id), ...paymentSelection.map((c) => c.id)]
                  : paymentSelection.map((c) => c.id);
                onSubmitPayment(ids);
              };

              return (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    Tu dois payer <strong>${owed}M</strong>.{' '}
                    {mustGiveAllBank
                      ? `Ta banque ($${myBankTotal}M) sera donnee en entier. Selectionne des proprietes pour completer.`
                      : `Selectionne des billets dans ta banque.`}
                  </div>

                  {/* Bank section */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: '#86efac', fontWeight: 700, marginBottom: 4 }}>
                      Banque — ${myBankTotal}M
                      {mustGiveAllBank && (
                        <span style={{ color: '#f87171', marginLeft: 6 }}>(tout inclus automatiquement)</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {bankCards.map((c) => (
                        <MDCardComponent
                          key={c.id} card={c} size="sm"
                          selected={mustGiveAllBank || !!paymentSelection.find((s) => s.id === c.id)}
                          disabled={mustGiveAllBank}
                          onClick={bankSelectable ? () => togglePaymentCard(c) : undefined}
                        />
                      ))}
                      {bankCards.length === 0 && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Banque vide</span>
                      )}
                    </div>
                  </div>

                  {/* Properties section */}
                  {ALL_COLORS.map((color) => {
                    const cards = safeSet(myPlayer, color);
                    if (!cards.length) return null;
                    const isComplete = isSetComplete(color, cards);
                    const isLocked = isComplete || !propSelectable;
                    return (
                      <div key={color} style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 10, marginBottom: 2, color: isComplete ? '#f87171' : propSelectable ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {COLOR_LABEL[color]}
                          {isComplete ? ' (set complet — protege)' : !propSelectable ? ' (banque suffisante — non necessaire)' : ''}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {cards.map((c) => (
                            <MDCardComponent
                              key={c.id} card={c} size="sm"
                              selected={propSelectable && !isComplete && !!paymentSelection.find((s) => s.id === c.id)}
                              disabled={isLocked}
                              onClick={isLocked ? undefined : () => togglePaymentCard(c)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {canJSN && (
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: 12, background: 'linear-gradient(135deg,#7c3aed,#4c1d95)' }}
                        onClick={() => {
                          const jsnCard = myHand.find((c) => c.action === 'just_say_no');
                          if (jsnCard) onRespondJSN(jsnCard.id);
                        }}
                      >
                        Non Merci !
                      </button>
                    )}
                    <button
                      className="btn btn-primary"
                      style={{
                        fontSize: 12,
                        opacity: canSubmit ? 1 : 0.4,
                        cursor: canSubmit ? 'pointer' : 'not-allowed',
                      }}
                      disabled={!canSubmit}
                      onClick={canSubmit ? handleSubmit : undefined}
                    >
                      Payer ({effectiveTotal}M / {owed}M)
                    </button>
                    {!canSubmit && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Selectionne pour atteindre ${owed}M
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Counter-JSN or accept */}
            {isMyJSNCounterTurn && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {hasJSNInHand && (
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12, background: 'linear-gradient(135deg,#7c3aed,#4c1d95)' }}
                    onClick={() => {
                      const jsnCard = myHand.find((c) => c.action === 'just_say_no');
                      if (jsnCard) onRespondJSN(jsnCard.id);
                    }}
                  >
                    Contre-Non Merci !
                  </button>
                )}
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onAcceptCancellation}>
                  Accepter l'annulation
                </button>
              </div>
            )}
          </div>
        )}

        {/* My player area */}
        {myPlayer && (
          <MyArea
            player={myPlayer}
            isMyTurn={isMyTurn}
            onSetCardClick={(card, color) => handleMySetCardClick(card, color)}
          />
        )}
      </div>

      {/* ── Hand dock (fixed bottom) ── */}
      <div style={{
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        borderTop: isMyTurn
          ? '2px solid rgba(250,204,21,0.35)'
          : '1.5px solid rgba(255,255,255,0.07)',
        padding: '8px 12px 10px',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: isDiscardMode ? '#f87171' : isMyTurn ? '#facc15' : 'var(--text-muted)',
          marginBottom: 6,
        }}>
          {handLabel}
        </div>
        {/* Two-wrapper pattern: outer scrolls, inner allows hover overflow */}
        <div style={{ overflowX: 'auto', paddingTop: 14, paddingBottom: 2, marginTop: -14 }}>
          <div style={{ display: 'flex', gap: 6, paddingTop: 14, paddingBottom: 4 }}>
            {myHand.map((card) => (
              <MDCardComponent
                key={card.id}
                card={card}
                size="md"
                onClick={() => handleHandCardClick(card)}
                disabled={!canPlay && !isDiscardMode}
                selected={false}
                setCount={
                  card.type === 'property' && card.color
                    ? (safeSet(myPlayer, card.color)?.length ?? 0)
                    : undefined
                }
              />
            ))}
            {myHand.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', paddingTop: 4 }}>
                Main vide
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Wild move overlay ── */}
      <AnimatePresence>
        {movingWild && (
          <Overlay onCancel={() => setMovingWild(null)}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Deplacer vers quelle couleur ?
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALL_COLORS
                .filter((c) => c !== movingWild.fromColor)
                .map((color) => (
                  <button
                    key={color}
                    style={{
                      padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                      background: COLOR_BG[color], color: 'white',
                      fontWeight: 700, fontSize: 12, border: 'none',
                    }}
                    onClick={() => { onMoveWild(movingWild.cardId, movingWild.fromColor, color); setMovingWild(null); }}
                  >
                    {COLOR_LABEL[color]}
                  </button>
                ))}
            </div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── PendingPlay overlays ── */}
      <AnimatePresence>
        {pendingPlay && (
          <PendingPlayOverlay
            pendingPlay={pendingPlay}
            room={room}
            myPlayerId={myPlayerId}
            myHand={myHand}
            myPlayer={myPlayer}
            setPendingPlay={setPendingPlay}
            onPlayActionAsMoney={onPlayActionAsMoney}
            onPlayProperty={onPlayProperty}
            onInitiateAction={onInitiateAction}
            onCommitDebt={onCommitDebt}
            onCommitRent={onCommitRent}
            onCommitDealBreaker={onCommitDealBreaker}
            onCommitSlyDeal={onCommitSlyDeal}
            onCommitForcedDeal={onCommitForcedDeal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PendingPlay multi-step overlay ──────────────────────────────────────────

interface OverlayProps {
  pendingPlay: PendingPlay;
  room: MDRoomRow;
  myPlayerId: string;
  myHand: MDCard[];
  myPlayer: MDPlayer;
  setPendingPlay: (p: PendingPlay | null) => void;
  onPlayActionAsMoney: (card: MDCard) => void;
  onPlayProperty: (card: MDCard, color: PropertyColor) => void;
  onInitiateAction: (card: MDCard) => void;
  onCommitDebt: (card: MDCard, targetId: string | null) => void;
  onCommitRent: (card: MDCard, color: PropertyColor, targetId: string | null, doubleCard: MDCard | null) => void;
  onCommitDealBreaker: (card: MDCard, targetId: string, color: PropertyColor) => void;
  onCommitSlyDeal: (card: MDCard, targetId: string, cardId: string, color: PropertyColor) => void;
  onCommitForcedDeal: (card: MDCard, myCardId: string, myColor: PropertyColor, targetId: string, theirCardId: string, theirColor: PropertyColor) => void;
}

function PendingPlayOverlay({
  pendingPlay, room, myPlayerId, myHand, myPlayer, setPendingPlay,
  onPlayActionAsMoney, onPlayProperty, onInitiateAction,
  onCommitDebt, onCommitRent, onCommitDealBreaker, onCommitSlyDeal, onCommitForcedDeal,
}: OverlayProps) {
  const cancel = () => setPendingPlay(null);
  const others = room.players.filter((p) => p.id !== myPlayerId);
  const doubleRentCard = myHand.find((c) => c.action === 'double_rent');

  if (pendingPlay.step === 'color_picker') {
    const { card } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Choisir la couleur pour ce joker
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(card.wildColors ?? []).map((color) => (
            <button
              key={color}
              style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', background: COLOR_BG[color], color: 'white', fontWeight: 700, fontSize: 13, border: 'none' }}
              onClick={() => onPlayProperty(card, color)}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'action_choice') {
    const { card } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{card.name}</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Jouer comme action ou mettre a la banque (${card.value}M) ?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onInitiateAction(card)}>
            Jouer l'action
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onPlayActionAsMoney(card)}>
            Banque (${card.value}M)
          </button>
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'rent_color') {
    const { card } = pendingPlay;
    const myColors = card.action === 'wild_rent'
      ? ALL_COLORS.filter((c) => (safeSets(myPlayer)[c]?.length ?? 0) > 0)
      : (card.rentColors ?? []).filter((c) => (safeSets(myPlayer)[c]?.length ?? 0) > 0);
    if (myColors.length === 0) {
      return (
        <Overlay onCancel={cancel}>
          <p style={{ color: 'var(--text-muted)' }}>Tu n'as aucune propriete des couleurs de cette carte.</p>
        </Overlay>
      );
    }
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Choisir la couleur pour le loyer</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {myColors.map((color) => (
            <button
              key={color}
              style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', background: COLOR_BG[color], color: 'white', fontWeight: 700, fontSize: 13, border: 'none' }}
              onClick={() => setPendingPlay({ step: 'rent_double', card, rentColor: color })}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'rent_double') {
    const { card, rentColor } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Utiliser Double Loyer ?</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {doubleRentCard && (
            <button
              className="btn btn-primary" style={{ flex: 1 }}
              onClick={() => {
                if (card.action === 'wild_rent') {
                  setPendingPlay({ step: 'rent_target', card, rentColor, doubleCard: doubleRentCard });
                } else {
                  onCommitRent(card, rentColor, null, doubleRentCard);
                }
              }}
            >
              Oui, Double Loyer !
            </button>
          )}
          <button
            className="btn btn-ghost" style={{ flex: 1 }}
            onClick={() => {
              if (card.action === 'wild_rent') {
                setPendingPlay({ step: 'rent_target', card, rentColor, doubleCard: null });
              } else {
                onCommitRent(card, rentColor, null, null);
              }
            }}
          >
            Non, loyer normal
          </button>
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'rent_target') {
    const { card, rentColor, doubleCard } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Qui doit payer le loyer ?</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {others.map((p) => (
            <button key={p.id} className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => onCommitRent(card, rentColor, p.id, doubleCard)}>
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'debt_target') {
    const { card } = pendingPlay;
    if (card.action === 'birthday') {
      return (
        <Overlay onCancel={cancel}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Anniversaire &mdash; tous les joueurs te paient $2M
          </h3>
          <button className="btn btn-primary w-full" onClick={() => onCommitDebt(card, null)}>Confirmer</button>
        </Overlay>
      );
    }
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Qui doit payer $5M ?</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {others.map((p) => (
            <button key={p.id} className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => onCommitDebt(card, p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'deal_breaker_target') {
    const { card } = pendingPlay;
    const targets = others.filter((p) => ALL_COLORS.some((c) => isSetComplete(c, safeSet(p, c))));
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Voler le set complet de qui ?</h3>
        {targets.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucun joueur n'a de set complet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {targets.map((p) => (
            <button key={p.id} className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => setPendingPlay({ step: 'deal_breaker_set', card, targetId: p.id })}>
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'deal_breaker_set') {
    const { card, targetId } = pendingPlay;
    const target = room.players.find((p) => p.id === targetId)!;
    const completeSets = ALL_COLORS.filter((c) => isSetComplete(c, safeSet(target, c)));
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Quel set complet voler a {target.name} ?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {completeSets.map((color) => (
            <button
              key={color}
              style={{ padding: '8px 16px', borderRadius: 8, cursor: 'pointer', background: COLOR_BG[color], color: 'white', fontWeight: 700, fontSize: 13, border: 'none' }}
              onClick={() => onCommitDealBreaker(card, targetId, color)}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'sly_deal_target') {
    const { card } = pendingPlay;
    const targets = others.filter((p) =>
      ALL_COLORS.some((c) => { const set = safeSet(p, c); return set.length > 0 && !isSetComplete(c, set); })
    );
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Voler une propriete de qui ?</h3>
        {targets.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucun joueur n'a de propriete volable.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {targets.map((p) => (
            <button key={p.id} className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => setPendingPlay({ step: 'sly_deal_card', card, targetId: p.id })}>
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'sly_deal_card') {
    const { card, targetId } = pendingPlay;
    const target = room.players.find((p) => p.id === targetId)!;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Quelle propriete voler a {target.name} ?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_COLORS.map((color) => {
            const set = safeSet(target, color);
            if (!set.length || isSetComplete(color, set)) return null;
            return set.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MDCardComponent card={c} size="md" onClick={() => onCommitSlyDeal(card, targetId, c.id, color)} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{COLOR_LABEL[color]}</span>
              </div>
            ));
          })}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'forced_deal_my') {
    const { card } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Quelle propriete donner en echange ?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_COLORS.map((color) => {
            const set = safeSet(myPlayer, color);
            if (!set.length || isSetComplete(color, set)) return null;
            return set.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MDCardComponent card={c} size="md" onClick={() => setPendingPlay({ step: 'forced_deal_target', card, myCardId: c.id, myColor: color })} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{COLOR_LABEL[color]}</span>
              </div>
            ));
          })}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'forced_deal_target') {
    const { card, myCardId, myColor } = pendingPlay;
    const targets = others.filter((p) =>
      ALL_COLORS.some((c) => { const set = safeSet(p, c); return set.length > 0 && !isSetComplete(c, set); })
    );
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Echanger avec qui ?</h3>
        {targets.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Aucun joueur n'a de propriete echangeable.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {targets.map((p) => (
            <button key={p.id} className="btn btn-ghost" style={{ textAlign: 'left' }} onClick={() => setPendingPlay({ step: 'forced_deal_their', card, myCardId, myColor, targetId: p.id })}>
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  if (pendingPlay.step === 'forced_deal_their') {
    const { card, myCardId, myColor, targetId } = pendingPlay;
    const target = room.players.find((p) => p.id === targetId)!;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Quelle propriete de {target.name} prendre ?</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_COLORS.map((color) => {
            const set = safeSet(target, color);
            if (!set.length || isSetComplete(color, set)) return null;
            return set.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MDCardComponent card={c} size="md" onClick={() => onCommitForcedDeal(card, myCardId, myColor, targetId, c.id, color)} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{COLOR_LABEL[color]}</span>
              </div>
            ));
          })}
        </div>
      </Overlay>
    );
  }

  return null;
}
