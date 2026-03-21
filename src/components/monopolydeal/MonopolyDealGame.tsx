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

// ─── Player sets display ──────────────────────────────────────────────────────

function PropertySet({
  color, cards, size = 'sm',
  onCardClick,
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
        {complete && ' ✓'}
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

function PlayerArea({
  player, label, size = 'sm', highlight,
  onSetCardClick,
}: {
  player: MDPlayer;
  label: string;
  size?: 'sm' | 'md';
  highlight?: boolean;
  onSetCardClick?: (card: MDCard, color: PropertyColor, player: MDPlayer) => void;
}) {
  const sets = safeSets(player);
  const bank = safeBank(player);
  const completeSets = countCompleteSets(player);

  return (
    <div style={{
      borderRadius: 10,
      padding: '8px 10px',
      border: highlight ? '2px solid #facc15' : '1.5px solid rgba(255,255,255,0.1)',
      background: highlight ? 'rgba(250,204,21,0.06)' : 'rgba(0,0,0,0.2)',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          💰 ${getBankTotal(player)}M · {completeSets} sets complets
        </span>
        {completeSets >= 3 && (
          <span style={{ fontSize: 11, background: '#16a34a', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
            GAGNE!
          </span>
        )}
      </div>
      {/* Bank cards */}
      {bank.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
          {bank.map((c) => (
            <MDCardComponent key={c.id} card={c} size="sm" />
          ))}
        </div>
      )}
      {/* Sets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALL_COLORS.filter((color) => (sets[color]?.length ?? 0) > 0).map((color) => (
          <PropertySet
            key={color}
            color={color}
            cards={sets[color] ?? []}
            size={size}
            onCardClick={onSetCardClick ? (card, c) => onSetCardClick(card, c, player) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Overlay for multi-step plays ─────────────────────────────────────────────

function Overlay({
  children, onCancel,
}: { children: React.ReactNode; onCancel?: () => void }) {
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
  onPlayMoney, onPlayProperty, onPlayActionAsMoney, onInitiateAction,
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

  // Handle clicking a card in my hand
  function handleHandCardClick(card: MDCard) {
    if (isDiscardMode) {
      onDiscardCard(card);
      return;
    }
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
      if (card.action === 'double_rent') return; // played automatically with rent
      setPendingPlay({ step: 'action_choice', card });
    }
  }

  // Handle clicking a card in my sets (for wild move or forced deal)
  function handleMySetCardClick(card: MDCard, color: PropertyColor) {
    if (pendingPlay?.step === 'forced_deal_my') {
      // Pick my card to give away
      if (!card.wildColors || !isSetComplete(color, safeSet(myPlayer, color))) {
        // Can't give away a card from a complete set (rules) — we'll allow any non-complete set card
        const mySet = safeSet(myPlayer, color);
        if (isSetComplete(color, mySet)) return; // can't steal from complete set in forced deal
        setPendingPlay({ step: 'forced_deal_target', card: pendingPlay.card, myCardId: card.id, myColor: color });
      }
    } else if (isMyTurn && !pa) {
      // Move wild card
      if (card.type === 'wildProperty' || (card.type === 'property' && !card.color)) {
        setMovingWild({ cardId: card.id, fromColor: color });
      }
    }
  }

  // Payment panel: select cards from bank + properties
  function togglePaymentCard(card: MDCard) {
    setPaymentSelection(
      paymentSelection.find((c) => c.id === card.id)
        ? paymentSelection.filter((c) => c.id !== card.id)
        : [...paymentSelection, card],
    );
  }

  const task = pa?.queue[0];
  const isMyPaymentTurn = task?.playerId === myPlayerId && (pa?.jsnCount ?? 0) % 2 === 0;
  const isMyJSNCounterTurn = pa && (pa.jsnCount ?? 0) % 2 === 1 && pa.actorId === myPlayerId;

  // Determine if myPlayer can JSN (is target and even jsnCount)
  const canJSN = isMyTurnToRespond && (pa?.jsnCount ?? 0) % 2 === 0 && hasJSNInHand && pa?.queue[0]?.playerId === myPlayerId;

  const winner = room.winner_id ? room.players.find((p) => p.id === room.winner_id) : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 900,
      margin: '0 auto',
      padding: '8px',
      gap: 8,
    }}>
      {/* ── Header ── */}
      <div className="md-header" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 10,
        background: 'var(--bg-secondary)', flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
          Monopoly Deal
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
          {room.status === 'finished'
            ? winner ? `${winner.name} a gagné !` : 'Fin de partie'
            : isMyTurn
              ? `Ton tour · ${cardsLeft} carte(s) restante(s)`
              : `Tour de ${currentPlayer?.name ?? '?'}`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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

      {/* ── Winner banner ── */}
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
          🏆 {winner.name} a gagné avec 3 sets complets !
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-ghost" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.4)' }} onClick={onLeave}>
              Retour au menu
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Other players ── */}
      {otherPlayers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {otherPlayers.map((p) => (
            <PlayerArea
              key={p.id}
              player={p}
              label={p.name + (p.id === currentPlayer?.id ? ' 🎯' : '')}

              size="sm"
              highlight={p.id === currentPlayer?.id}
            />
          ))}
        </div>
      )}

      {/* ── Center info ── */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '8px 12px', borderRadius: 10,
        background: 'var(--bg-secondary)',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Pioche: <strong style={{ color: 'var(--text-primary)' }}>{room.deck.length}</strong> cartes
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Défausse: <strong style={{ color: 'var(--text-primary)' }}>{room.discard_pile.length}</strong> cartes
        </div>
        {room.discard_pile.length > 0 && (
          <MDCardComponent card={room.discard_pile[room.discard_pile.length - 1]} size="sm" />
        )}
        {isDiscardMode && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>
            Défaussez jusqu'à 7 cartes !
          </span>
        )}
        {/* MusicPlayer */}
        <div style={{ marginLeft: 'auto' }}>
          <MusicPlayer
            inline
            syncedUrl={room.youtube_url ?? undefined}
            onUrlChange={onSyncYoutubeUrl}
          />
        </div>
      </div>

      {/* ── Pending action panel (payment / JSN) ── */}
      {pa && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          border: '2px solid #f59e0b',
          background: 'rgba(245,158,11,0.1)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
            {pa.actionType === 'birthday' ? '🎂 Anniversaire' :
             pa.actionType === 'debt_collector' ? '💸 Percepteur' :
             pa.actionType === 'rent' || pa.actionType === 'wild_rent' ? '🏠 Loyer' :
             'Action en cours'}
            {' '}— demandé par {room.players.find((p) => p.id === pa.actorId)?.name}
          </div>

          {/* Remaining payers */}
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

          {/* Just Say No status */}
          {pa.jsnCount > 0 && (
            <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 8 }}>
              Non Merci joué {pa.jsnCount} fois
            </div>
          )}

          {/* My turn to pay */}
          {isMyPaymentTurn && pa.jsnCount % 2 === 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Tu dois payer ${task!.amount}M. Sélectionne les cartes à payer :
              </div>
              {/* My bank cards */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>Banque</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {safeBank(myPlayer).map((c) => (
                    <MDCardComponent
                      key={c.id}
                      card={c}
                      size="sm"
                      selected={!!paymentSelection.find((s) => s.id === c.id)}
                      onClick={() => togglePaymentCard(c)}
                    />
                  ))}
                </div>
              </div>
              {/* My property cards */}
              {ALL_COLORS.map((color) => {
                const cards = safeSet(myPlayer, color);
                if (!cards.length) return null;
                const isComplete = isSetComplete(color, cards);
                return (
                  <div key={color} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: isComplete ? '#f87171' : 'var(--text-muted)', marginBottom: 2 }}>
                      {COLOR_LABEL[color]}{isComplete ? ' (set complet — non volable)' : ''}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {cards.map((c) => (
                        <MDCardComponent
                          key={c.id}
                          card={c}
                          size="sm"
                          selected={!!paymentSelection.find((s) => s.id === c.id)}
                          disabled={isComplete}
                          onClick={isComplete ? undefined : () => togglePaymentCard(c)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
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
                  style={{ fontSize: 12 }}
                  onClick={() => onSubmitPayment(paymentSelection.map((c) => c.id))}
                >
                  Payer ({paymentSelection.reduce((s, c) => s + c.value, 0)}M / {task!.amount}M)
                </button>
              </div>
            </div>
          )}

          {/* Actor's turn: can counter-JSN or accept cancellation */}
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

      {/* ── My area ── */}
      <PlayerArea
        player={myPlayer}
        label={`Toi (${myPlayer?.name})`}
        size="md"
        highlight={isMyTurn}
        onSetCardClick={handleMySetCardClick}
      />

      {/* ── My hand ── */}
      <div style={{
        borderRadius: 10, padding: '10px 12px',
        background: 'var(--bg-secondary)',
        border: isMyTurn ? '2px solid rgba(250,204,21,0.4)' : '1.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {isDiscardMode
            ? `Main (${myHand.length} cartes — cliquer pour défausser)`
            : canPlay
              ? `Main (${myHand.length} cartes — ${cardsLeft} jeu(x) restant(s))`
              : `Main (${myHand.length} cartes)`}
        </div>
        <div className="md-hand-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {myHand.map((card) => (
            <MDCardComponent
              key={card.id}
              card={card}
              size="md"
              className="md-card"
              onClick={() => handleHandCardClick(card)}
              disabled={!canPlay && !isDiscardMode}
            />
          ))}
        </div>
      </div>

      {/* ── Wild move overlay ── */}
      <AnimatePresence>
        {movingWild && (
          <Overlay onCancel={() => setMovingWild(null)}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Déplacer vers quelle couleur ?
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
                    onClick={() => {
                      onMoveWild(movingWild.cardId, movingWild.fromColor, color);
                      setMovingWild(null);
                    }}
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

  // Color picker for wild property
  if (pendingPlay.step === 'color_picker') {
    const { card } = pendingPlay;
    const colors = card.wildColors ?? [];
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Choisir la couleur pour ce joker
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {colors.map((color) => (
            <button
              key={color}
              style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                background: COLOR_BG[color], color: 'white',
                fontWeight: 700, fontSize: 13, border: 'none',
              }}
              onClick={() => { onPlayProperty(card, color); }}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Action choice: play as action or bank as money
  if (pendingPlay.step === 'action_choice') {
    const { card } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          {card.name}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Jouer comme action ou mettre à la banque (${card.value}M) ?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => { onInitiateAction(card); }}
          >
            Jouer l'action
          </button>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={() => { onPlayActionAsMoney(card); }}
          >
            Banque (${card.value}M)
          </button>
        </div>
      </Overlay>
    );
  }

  // Rent: choose which color to charge
  if (pendingPlay.step === 'rent_color') {
    const { card } = pendingPlay;
    const myColors = card.action === 'wild_rent'
      ? ALL_COLORS.filter((c) => (safeSets(myPlayer)[c]?.length ?? 0) > 0)
      : (card.rentColors ?? []).filter((c) => (safeSets(myPlayer)[c]?.length ?? 0) > 0);

    if (myColors.length === 0) {
      return (
        <Overlay onCancel={cancel}>
          <p style={{ color: 'var(--text-muted)' }}>
            Tu n'as aucune propriété des couleurs de cette carte.
          </p>
        </Overlay>
      );
    }

    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Choisir la couleur pour le loyer
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {myColors.map((color) => (
            <button
              key={color}
              style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                background: COLOR_BG[color], color: 'white',
                fontWeight: 700, fontSize: 13, border: 'none',
              }}
              onClick={() => setPendingPlay({ step: 'rent_double', card, rentColor: color })}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Rent double: offer to play double rent
  if (pendingPlay.step === 'rent_double') {
    const { card, rentColor } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Utiliser Double Loyer ?
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          {doubleRentCard && (
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
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
            className="btn btn-ghost"
            style={{ flex: 1 }}
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

  // Wild rent: choose target player
  if (pendingPlay.step === 'rent_target') {
    const { card, rentColor, doubleCard } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Qui doit payer le loyer ?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {others.map((p) => (
            <button
              key={p.id}
              className="btn btn-ghost"
              style={{ textAlign: 'left' }}
              onClick={() => onCommitRent(card, rentColor, p.id, doubleCard)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Debt target
  if (pendingPlay.step === 'debt_target') {
    const { card } = pendingPlay;
    const isBirthday = card.action === 'birthday';
    if (isBirthday) {
      return (
        <Overlay onCancel={cancel}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            🎂 Anniversaire — tous les joueurs te paient $2M
          </h3>
          <button className="btn btn-primary w-full" onClick={() => onCommitDebt(card, null)}>
            Confirmer
          </button>
        </Overlay>
      );
    }
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Qui doit payer $5M ?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {others.map((p) => (
            <button
              key={p.id}
              className="btn btn-ghost"
              style={{ textAlign: 'left' }}
              onClick={() => onCommitDebt(card, p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Deal breaker: pick target
  if (pendingPlay.step === 'deal_breaker_target') {
    const { card } = pendingPlay;
    const targets = others.filter((p) =>
      ALL_COLORS.some((c) => isSetComplete(c, safeSet(p, c)))
    );
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Voler le set complet de qui ?
        </h3>
        {targets.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>Aucun joueur n'a de set complet.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {targets.map((p) => (
            <button
              key={p.id}
              className="btn btn-ghost"
              style={{ textAlign: 'left' }}
              onClick={() => setPendingPlay({ step: 'deal_breaker_set', card, targetId: p.id })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Deal breaker: pick which set
  if (pendingPlay.step === 'deal_breaker_set') {
    const { card, targetId } = pendingPlay;
    const target = room.players.find((p) => p.id === targetId)!;
    const completeSets = ALL_COLORS.filter((c) => isSetComplete(c, safeSet(target, c)));
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Quel set complet voler à {target.name} ?
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {completeSets.map((color) => (
            <button
              key={color}
              style={{
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                background: COLOR_BG[color], color: 'white',
                fontWeight: 700, fontSize: 13, border: 'none',
              }}
              onClick={() => onCommitDealBreaker(card, targetId, color)}
            >
              {COLOR_LABEL[color]}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Sly deal: pick target
  if (pendingPlay.step === 'sly_deal_target') {
    const { card } = pendingPlay;
    const targets = others.filter((p) =>
      ALL_COLORS.some((c) => {
        const set = safeSet(p, c);
        return set.length > 0 && !isSetComplete(c, set);
      })
    );
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Voler une propriété de qui ?
        </h3>
        {targets.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>Aucun joueur n'a de propriété volable.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {targets.map((p) => (
            <button
              key={p.id}
              className="btn btn-ghost"
              style={{ textAlign: 'left' }}
              onClick={() => setPendingPlay({ step: 'sly_deal_card', card, targetId: p.id })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Sly deal: pick which card
  if (pendingPlay.step === 'sly_deal_card') {
    const { card, targetId } = pendingPlay;
    const target = room.players.find((p) => p.id === targetId)!;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Quelle propriété voler à {target.name} ?
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_COLORS.map((color) => {
            const set = safeSet(target, color);
            if (!set.length || isSetComplete(color, set)) return null;
            return set.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MDCardComponent
                  card={c}
                  size="md"
                  onClick={() => onCommitSlyDeal(card, targetId, c.id, color)}
                />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{COLOR_LABEL[color]}</span>
              </div>
            ));
          })}
        </div>
      </Overlay>
    );
  }

  // Forced deal: pick my card to give
  if (pendingPlay.step === 'forced_deal_my') {
    const { card } = pendingPlay;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Quelle propriété donner en échange ?
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_COLORS.map((color) => {
            const set = safeSet(myPlayer, color);
            if (!set.length || isSetComplete(color, set)) return null;
            return set.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MDCardComponent
                  card={c}
                  size="md"
                  onClick={() => setPendingPlay({ step: 'forced_deal_target', card, myCardId: c.id, myColor: color })}
                />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{COLOR_LABEL[color]}</span>
              </div>
            ));
          })}
        </div>
      </Overlay>
    );
  }

  // Forced deal: pick target player
  if (pendingPlay.step === 'forced_deal_target') {
    const { card, myCardId, myColor } = pendingPlay;
    const targets = others.filter((p) =>
      ALL_COLORS.some((c) => {
        const set = safeSet(p, c);
        return set.length > 0 && !isSetComplete(c, set);
      })
    );
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Échanger avec qui ?
        </h3>
        {targets.length === 0 && (
          <p style={{ color: 'var(--text-muted)' }}>Aucun joueur n'a de propriété échangeable.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {targets.map((p) => (
            <button
              key={p.id}
              className="btn btn-ghost"
              style={{ textAlign: 'left' }}
              onClick={() => setPendingPlay({ step: 'forced_deal_their', card, myCardId, myColor, targetId: p.id })}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Overlay>
    );
  }

  // Forced deal: pick their card
  if (pendingPlay.step === 'forced_deal_their') {
    const { card, myCardId, myColor, targetId } = pendingPlay;
    const target = room.players.find((p) => p.id === targetId)!;
    return (
      <Overlay onCancel={cancel}>
        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
          Quelle propriété de {target.name} prendre ?
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ALL_COLORS.map((color) => {
            const set = safeSet(target, color);
            if (!set.length || isSetComplete(color, set)) return null;
            return set.map((c) => (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <MDCardComponent
                  card={c}
                  size="md"
                  onClick={() => onCommitForcedDeal(card, myCardId, myColor, targetId, c.id, color)}
                />
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
