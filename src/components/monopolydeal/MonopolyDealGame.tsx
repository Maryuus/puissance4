import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MDCard,
  MDPlayer,
  PropertyColor,
  ALL_COLORS,
  COLOR_BG,
  COLOR_LABELS,
  SET_SIZES,
  isSetComplete,
  getBankTotal,
  getRent,
  getValidWildPlacements,
  canMoveWildTo,
} from '../../lib/monopolyDealLogic';
import { MDRoomRow } from '../../lib/monopolyDealSupabase';
import { MDCardComponent } from './MDCardComponent';
import { PendingPlayStep } from '../../hooks/useMonopolyDealGame';

interface MonopolyDealGameProps {
  room: MDRoomRow;
  myHand: MDCard[];
  myPlayerId: string;
  isMyTurn: boolean;
  isMyTurnToRespond: boolean;
  hasJSNInHand: boolean;
  pendingPlay: PendingPlayStep | null;
  paymentSelection: MDCard[];
  setPaymentSelection: (cards: MDCard[]) => void;
  isDiscardMode: boolean;
  onPlayMoney: (card: MDCard) => void;
  onPlayProperty: (card: MDCard, color: PropertyColor) => void;
  onInitiateAction: (card: MDCard) => void;
  onCommitDebtCollector: (card: MDCard, targetId: string) => void;
  onCommitRent: (card: MDCard, color: PropertyColor, targetId: string | null, doubleRentCard: MDCard | null) => void;
  onCommitDealBreaker: (card: MDCard, targetId: string, color: PropertyColor) => void;
  onCommitForcedDeal: (card: MDCard, myCardId: string, myCardColor: PropertyColor, targetId: string, targetCardId: string, targetCardColor: PropertyColor) => void;
  onCommitSlyDeal: (card: MDCard, targetId: string, cardId: string, cardColor: PropertyColor) => void;
  onRespondJSN: (jsnCardId: string) => void;
  onAcceptCancellation: () => void;
  onResolveAction: () => void;
  onSubmitPayment: (cardIds: string[]) => void;
  onMoveWild: (cardId: string, from: PropertyColor, to: PropertyColor) => void;
  onEndTurn: () => void;
  onDiscardCard: (card: MDCard) => void;
  onSyncYoutubeUrl: (url: string) => void;
  onLeave: () => void;
  setPendingPlay: (step: PendingPlayStep | null) => void;
}

function PlayerArea({ player, isCurrentTurn }: { player: MDPlayer; isCurrentTurn: boolean }) {
  const bankTotal = getBankTotal(player);

  return (
    <div
      className="md-player-area"
      style={{
        border: isCurrentTurn ? '2px solid #fbbf24' : '1px solid var(--border-color)',
      }}
    >
      <div className="md-player-header">
        <span className="md-player-name">{player.name}</span>
        {isCurrentTurn && <span className="md-turn-indicator">▶</span>}
        <span className="md-bank-badge">${bankTotal}M</span>
      </div>
      <div className="md-player-sets">
        {ALL_COLORS.map((color) => {
          const cards = player.sets[color];
          if (!cards || cards.length === 0) return null;
          const complete = isSetComplete(color, cards);
          return (
            <div
              key={color}
              className={`md-mini-set ${complete ? 'md-set-complete' : ''}`}
              style={{ borderColor: COLOR_BG[color] }}
            >
              {cards.map((c) => (
                <MDCardComponent key={c.id} card={c} size="sm" />
              ))}
              <span className="md-set-count" style={{ color: COLOR_BG[color] }}>
                {cards.length}/{SET_SIZES[color]}
              </span>
            </div>
          );
        })}
        {Object.values(player.sets).every((s) => !s || s.length === 0) && (
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Aucune propriété</span>
        )}
      </div>
    </div>
  );
}

function PropertySetDisplay({
  player,
  isMyTurn,
  onMoveWild,
}: {
  player: MDPlayer;
  isMyTurn: boolean;
  onMoveWild: (cardId: string, from: PropertyColor, to: PropertyColor) => void;
}) {
  const [movingWild, setMovingWild] = useState<{ cardId: string; fromColor: PropertyColor } | null>(null);

  return (
    <div className="md-sets-area">
      {ALL_COLORS.map((color) => {
        const cards = player.sets[color] ?? [];
        if (cards.length === 0) return null;
        const complete = isSetComplete(color, cards);

        return (
          <div
            key={color}
            className={`md-property-set ${complete ? 'md-set-complete' : ''}`}
            style={{ borderColor: COLOR_BG[color] }}
          >
            <div className="md-set-header" style={{ background: COLOR_BG[color] }}>
              <span>{COLOR_LABELS[color]}</span>
              <span>{cards.length}/{SET_SIZES[color]}</span>
            </div>
            <div className="md-set-cards">
              {cards.map((c) => (
                <div key={c.id} style={{ position: 'relative' }}>
                  <MDCardComponent card={c} size="md" />
                  {isMyTurn && c.type === 'wildProperty' && (
                    <button
                      className="md-wild-move-btn"
                      onClick={() => setMovingWild({ cardId: c.id, fromColor: color })}
                      title="Déplacer ce joker"
                    >
                      ↔
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Wild move overlay */}
      {movingWild && (
        <div className="md-overlay" onClick={() => setMovingWild(null)}>
          <motion.div
            className="md-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h3 className="md-modal-title">Déplacer le joker vers...</h3>
            <div className="md-color-grid">
              {ALL_COLORS.map((c) => {
                const card = (player.sets[movingWild.fromColor] ?? []).find(
                  (x) => x.id === movingWild.cardId
                );
                if (!card || !canMoveWildTo(card, c) || c === movingWild.fromColor) return null;
                return (
                  <button
                    key={c}
                    className="md-color-btn"
                    style={{ background: COLOR_BG[c] }}
                    onClick={() => {
                      onMoveWild(movingWild.cardId, movingWild.fromColor, c);
                      setMovingWild(null);
                    }}
                  >
                    {COLOR_LABELS[c]}
                  </button>
                );
              })}
            </div>
            <button className="btn btn-ghost mt-2" onClick={() => setMovingWild(null)}>
              Annuler
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export function MonopolyDealGame({
  room,
  myHand,
  myPlayerId,
  isMyTurn,
  isMyTurnToRespond,
  hasJSNInHand,
  pendingPlay,
  paymentSelection,
  setPaymentSelection,
  isDiscardMode,
  onPlayMoney,
  onPlayProperty,
  onInitiateAction,
  onCommitDebtCollector,
  onCommitRent,
  onCommitDealBreaker,
  onCommitForcedDeal,
  onCommitSlyDeal,
  onRespondJSN,
  onAcceptCancellation,
  onResolveAction,
  onSubmitPayment,
  onMoveWild,
  onEndTurn,
  onDiscardCard,
  onSyncYoutubeUrl,
  onLeave,
  setPendingPlay,
}: MonopolyDealGameProps) {
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(room.youtube_url ?? '');
  const [selectedDoubleRent, setSelectedDoubleRent] = useState<MDCard | null>(null);

  const myPlayer = room.players.find((p) => p.id === myPlayerId)!;
  const otherPlayers = room.players.filter((p) => p.id !== myPlayerId);
  const currentPlayer = room.players[room.current_player_index];

  const topDiscard = room.discard_pile[room.discard_pile.length - 1] ?? null;
  const cardsLeft = 3 - room.cards_played_this_turn;

  const canPlayCard = isMyTurn && room.turn_drawn && room.cards_played_this_turn < 3 && !room.pending_action;
  const canEndTurn = isMyTurn && room.turn_drawn && !room.pending_action && !isDiscardMode;

  // Payment data
  const pa = room.pending_action;
  const currentPayer = pa?.paymentQueue[pa.currentPayerIndex];
  const isPaymentPhase =
    isMyTurnToRespond &&
    pa &&
    pa.paymentQueue.length > 0 &&
    currentPayer?.playerId === myPlayerId &&
    pa.jsnCount % 2 === 0;

  // All cards the payer can use
  const allPayableCards: MDCard[] = myPlayer
    ? [...myPlayer.bank, ...Object.values(myPlayer.sets).flat()]
    : [];

  const paymentTotal = paymentSelection.reduce((s, c) => s + c.value, 0);
  const amountOwed = currentPayer?.amountOwed ?? 0;

  // Actor for pending action
  const actorName = pa ? room.players.find((p) => p.id === pa.actorId)?.name ?? '?' : '';

  function handleCardClick(card: MDCard) {
    if (isDiscardMode) {
      onDiscardCard(card);
      return;
    }
    if (!canPlayCard) return;

    if (card.type === 'money') {
      onPlayMoney(card);
    } else if (card.type === 'property') {
      onPlayProperty(card, card.color!);
    } else if (card.type === 'wildProperty') {
      // Need color picker
      setPendingPlay({ type: 'color_picker', card });
    } else if (card.type === 'action') {
      if (card.action === 'just_say_no') return; // JSN can't be played normally
      onInitiateAction(card);
    }
  }

  // Render pending action overlay
  function renderPendingActionOverlay() {
    if (!pa) return null;

    const isActor = pa.actorId === myPlayerId;
    const jsnOdd = pa.jsnCount % 2 === 1;

    // Actor can counter-JSN when jsnCount is odd
    const canActorCounterJSN = isActor && jsnOdd && hasJSNInHand;
    // Actor can accept cancellation when jsnCount is odd
    const actorCanAcceptCancel = isActor && jsnOdd;

    // Target/current payer can JSN or accept when jsnCount is even
    const canTargetJSN =
      !isActor &&
      isMyTurnToRespond &&
      pa.jsnCount % 2 === 0 &&
      hasJSNInHand;

    // Show overlay to relevant players
    if (!isMyTurnToRespond && !isActor) return null;
    if (isActor && !jsnOdd) return null; // Actor only acts on odd jsnCount

    const getActionDescription = () => {
      switch (pa.actionType) {
        case 'birthday':
          return `${actorName} joue Anniversaire — payez $2M`;
        case 'debt_collector':
          return `${actorName} joue Percepteur — payez $5M`;
        case 'rent':
        case 'wild_rent': {
          const rentColor = pa.rentColor;
          const amount = currentPayer?.amountOwed ?? 0;
          return `${actorName} joue Loyer (${rentColor ? COLOR_LABELS[rentColor] : '?'}) — payez $${amount}M`;
        }
        case 'deal_breaker': {
          const color = pa.targetColor;
          return `${actorName} joue Coup de Maître — vole votre set ${color ? COLOR_LABELS[color] : '?'}`;
        }
        case 'forced_deal':
          return `${actorName} joue Échange Forcé`;
        case 'sly_deal':
          return `${actorName} joue Saisie`;
        default:
          return `${actorName} joue une action`;
      }
    };

    if (isActor && jsnOdd) {
      return (
        <div className="md-overlay" style={{ zIndex: 50 }}>
          <motion.div
            className="md-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="text-2xl mb-2">🚫</div>
            <h3 className="md-modal-title">Non Merci !</h3>
            <p className="md-modal-desc">
              {room.players.find((p) => p.id !== myPlayerId)?.name ?? '?'} a joué Non Merci !
            </p>
            <p className="md-modal-desc text-sm opacity-70">
              Votre action est annulée... sauf si vous contre-JSN.
            </p>
            {canActorCounterJSN && (
              <button
                className="btn btn-primary w-full mb-2"
                onClick={() => {
                  const jsn = myHand.find((c) => c.action === 'just_say_no');
                  if (jsn) onRespondJSN(jsn.id);
                }}
              >
                🚫 Contre Non Merci !
              </button>
            )}
            {actorCanAcceptCancel && (
              <button className="btn btn-ghost w-full" onClick={onAcceptCancellation}>
                Accepter l'annulation
              </button>
            )}
          </motion.div>
        </div>
      );
    }

    // Target player sees this
    if (isMyTurnToRespond && pa.jsnCount % 2 === 0 && !isActor) {
      if (isPaymentPhase) {
        // Show payment UI (handled below)
        return null;
      }

      return (
        <div className="md-overlay" style={{ zIndex: 50 }}>
          <motion.div
            className="md-modal"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="text-2xl mb-2">⚠️</div>
            <h3 className="md-modal-title">Action contre vous !</h3>
            <p className="md-modal-desc">{getActionDescription()}</p>
            {canTargetJSN && (
              <button
                className="btn btn-primary w-full mb-2"
                style={{ background: '#7c3aed' }}
                onClick={() => {
                  const jsn = myHand.find((c) => c.action === 'just_say_no');
                  if (jsn) onRespondJSN(jsn.id);
                }}
              >
                🚫 Non Merci !
              </button>
            )}
            <button
              className="btn btn-primary w-full"
              onClick={onResolveAction}
            >
              Accepter / Payer
            </button>
          </motion.div>
        </div>
      );
    }

    return null;
  }

  function renderPaymentModal() {
    if (!isPaymentPhase || !currentPayer) return null;

    return (
      <div className="md-overlay" style={{ zIndex: 51 }}>
        <motion.div
          className="md-modal md-payment-modal"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <h3 className="md-modal-title">Paiement requis</h3>
          <p className="md-modal-desc">
            Vous devez payer <strong>${amountOwed}M</strong>
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
            Total sélectionné: <strong>${paymentTotal}M</strong>
            {paymentTotal >= amountOwed && (
              <span style={{ color: '#22c55e', marginLeft: 6 }}>✓ Suffisant</span>
            )}
          </p>

          {/* Bank cards */}
          {(myPlayer?.bank.length ?? 0) > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Banque</p>
              <div className="md-hand-row">
                {myPlayer?.bank.map((c) => (
                  <MDCardComponent
                    key={c.id}
                    card={c}
                    size="md"
                    selected={paymentSelection.some((x) => x.id === c.id)}
                    onClick={() => {
                      const already = paymentSelection.some((x) => x.id === c.id);
                      if (already) {
                        setPaymentSelection(paymentSelection.filter((x) => x.id !== c.id));
                      } else {
                        setPaymentSelection([...paymentSelection, c]);
                      }
                    }}
                    playable
                  />
                ))}
              </div>
            </div>
          )}

          {/* Property cards */}
          {ALL_COLORS.map((color) => {
            const cards = myPlayer?.sets[color];
            if (!cards || cards.length === 0) return null;
            return (
              <div key={color} style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 11, color: COLOR_BG[color], marginBottom: 4 }}>
                  {COLOR_LABELS[color]}
                </p>
                <div className="md-hand-row">
                  {cards.map((c) => (
                    <MDCardComponent
                      key={c.id}
                      card={c}
                      size="md"
                      selected={paymentSelection.some((x) => x.id === c.id)}
                      onClick={() => {
                        const already = paymentSelection.some((x) => x.id === c.id);
                        if (already) {
                          setPaymentSelection(paymentSelection.filter((x) => x.id !== c.id));
                        } else {
                          setPaymentSelection([...paymentSelection, c]);
                        }
                      }}
                      playable
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {allPayableCards.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
              Vous n'avez rien à payer.
            </p>
          )}

          <div className="flex gap-2 mt-3">
            {hasJSNInHand && (
              <button
                className="btn btn-ghost flex-1"
                style={{ borderColor: '#7c3aed', color: '#a78bfa' }}
                onClick={() => {
                  const jsn = myHand.find((c) => c.action === 'just_say_no');
                  if (jsn) {
                    onRespondJSN(jsn.id);
                    setPaymentSelection([]);
                  }
                }}
              >
                🚫 Non Merci !
              </button>
            )}
            <button
              className="btn btn-primary flex-1"
              disabled={paymentTotal < amountOwed && allPayableCards.length > 0}
              onClick={() => onSubmitPayment(paymentSelection.map((c) => c.id))}
            >
              {allPayableCards.length === 0
                ? 'Payer (rien)'
                : paymentTotal >= amountOwed
                  ? `Payer $${paymentTotal}M`
                  : `Payer tout ($${allPayableCards.reduce((s, c) => s + c.value, 0)}M)`}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  function renderTargetingOverlay() {
    if (!pendingPlay) return null;

    switch (pendingPlay.type) {
      case 'color_picker': {
        const validColors = getValidWildPlacements(pendingPlay.card);
        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Choisir une couleur</h3>
              <div className="md-color-grid">
                {validColors.map((c) => (
                  <button
                    key={c}
                    className="md-color-btn"
                    style={{ background: COLOR_BG[c] }}
                    onClick={() => onPlayProperty(pendingPlay.card, c)}
                  >
                    {COLOR_LABELS[c]}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'rent_config': {
        const rentCard = pendingPlay.card;
        const isWildRent = rentCard.action === 'wild_rent';
        const doubleRentInHand = myHand.find((c) => c.action === 'double_rent');

        // Determine available colors
        let availableColors: PropertyColor[] = [];
        if (isWildRent) {
          availableColors = ALL_COLORS.filter((c) => (myPlayer?.sets[c]?.length ?? 0) > 0);
        } else if (rentCard.rentColors) {
          availableColors = rentCard.rentColors.filter(
            (c) => (myPlayer?.sets[c]?.length ?? 0) > 0
          );
        }

        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Choisir la couleur du loyer</h3>
              {availableColors.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Vous n'avez aucune propriété de ces couleurs.
                </p>
              )}
              <div className="md-color-grid">
                {availableColors.map((c) => {
                  const count = myPlayer?.sets[c]?.length ?? 0;
                  const rent = getRent(c, count);
                  return (
                    <button
                      key={c}
                      className="md-color-btn"
                      style={{ background: COLOR_BG[c] }}
                      onClick={() => {
                        if (isWildRent) {
                          setPendingPlay({
                            type: 'wild_rent_target',
                            card: rentCard,
                            rentColor: c,
                            doubleRentCard: selectedDoubleRent ?? undefined,
                          });
                        } else {
                          // Standard rent: all players
                          onCommitRent(rentCard, c, null, selectedDoubleRent);
                          setSelectedDoubleRent(null);
                        }
                      }}
                    >
                      <span>{COLOR_LABELS[c]}</span>
                      <span style={{ fontSize: 10 }}>
                        ${selectedDoubleRent ? rent * 2 : rent}M
                      </span>
                    </button>
                  );
                })}
              </div>

              {doubleRentInHand && !selectedDoubleRent && room.cards_played_this_turn < 2 && (
                <button
                  className="btn btn-ghost w-full mt-2"
                  style={{ borderColor: '#a78bfa', color: '#a78bfa' }}
                  onClick={() => setSelectedDoubleRent(doubleRentInHand)}
                >
                  ×2 Ajouter Double Loyer
                </button>
              )}
              {selectedDoubleRent && (
                <p style={{ color: '#a78bfa', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  ×2 Double Loyer activé
                </p>
              )}

              <button className="btn btn-ghost mt-2 w-full" onClick={() => { setPendingPlay(null); setSelectedDoubleRent(null); }}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'wild_rent_target': {
        const rentCard = pendingPlay.card;
        const rentColor = pendingPlay.rentColor;
        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Choisir le joueur ciblé</h3>
              <div className="flex flex-col gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost"
                    onClick={() => {
                      onCommitRent(rentCard, rentColor, p.id, pendingPlay.doubleRentCard ?? null);
                      setSelectedDoubleRent(null);
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'debt_target': {
        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Percepteur — Cibler un joueur</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Collectez $5M auprès d'un joueur
              </p>
              <div className="flex flex-col gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost"
                    onClick={() => onCommitDebtCollector(pendingPlay.card, p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'deal_breaker_target': {
        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Coup de Maître — Cibler un joueur</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Volez un set complet
              </p>
              <div className="flex flex-col gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost"
                    onClick={() =>
                      setPendingPlay({ type: 'deal_breaker_set', card: pendingPlay.card, targetPlayerId: p.id })
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'deal_breaker_set': {
        const targetPlayer = room.players.find((p) => p.id === pendingPlay.targetPlayerId);
        if (!targetPlayer) return null;
        const completeSets = ALL_COLORS.filter((c) => {
          const s = targetPlayer.sets[c];
          return s && isSetComplete(c, s);
        });
        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Choisir un set complet</h3>
              {completeSets.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Ce joueur n'a aucun set complet.
                </p>
              ) : (
                <div className="md-color-grid">
                  {completeSets.map((c) => (
                    <button
                      key={c}
                      className="md-color-btn"
                      style={{ background: COLOR_BG[c] }}
                      onClick={() =>
                        onCommitDealBreaker(pendingPlay.card, pendingPlay.targetPlayerId, c)
                      }
                    >
                      {COLOR_LABELS[c]}
                    </button>
                  ))}
                </div>
              )}
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'forced_deal_my_card': {
        const myProps = ALL_COLORS.flatMap((color) => {
          const set = myPlayer?.sets[color] ?? [];
          const isComplete = isSetComplete(color, set);
          return set.map((c) => ({ card: c, color, isComplete }));
        }).filter((x) => !x.isComplete);

        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Échange Forcé — Votre propriété</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Choisissez une propriété à échanger
              </p>
              {myProps.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Aucune propriété disponible.
                </p>
              ) : (
                <div className="md-hand-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  {myProps.map(({ card: c, color }) => (
                    <MDCardComponent
                      key={c.id}
                      card={c}
                      size="md"
                      playable
                      onClick={() =>
                        setPendingPlay({
                          type: 'forced_deal_target',
                          card: pendingPlay.card,
                          myCardId: c.id,
                          myCardColor: color,
                        })
                      }
                    />
                  ))}
                </div>
              )}
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'forced_deal_target': {
        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Échange Forcé — Cibler un joueur</h3>
              <div className="flex flex-col gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost"
                    onClick={() =>
                      setPendingPlay({
                        type: 'forced_deal_their_card',
                        card: pendingPlay.card,
                        myCardId: pendingPlay.myCardId,
                        myCardColor: pendingPlay.myCardColor,
                        targetPlayerId: p.id,
                      })
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'forced_deal_their_card': {
        const targetP = room.players.find((p) => p.id === pendingPlay.targetPlayerId);
        if (!targetP) return null;
        const theirProps = ALL_COLORS.flatMap((color) => {
          const set = targetP.sets[color] ?? [];
          return set.map((c) => ({ card: c, color }));
        });

        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Propriété de {targetP.name}</h3>
              {theirProps.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Ce joueur n'a aucune propriété.
                </p>
              ) : (
                <div className="md-hand-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  {theirProps.map(({ card: c, color }) => (
                    <MDCardComponent
                      key={c.id}
                      card={c}
                      size="md"
                      playable
                      onClick={() =>
                        onCommitForcedDeal(
                          pendingPlay.card,
                          pendingPlay.myCardId,
                          pendingPlay.myCardColor,
                          pendingPlay.targetPlayerId,
                          c.id,
                          color
                        )
                      }
                    />
                  ))}
                </div>
              )}
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'sly_deal_target': {
        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Saisie — Cibler un joueur</h3>
              <div className="flex flex-col gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.id}
                    className="btn btn-ghost"
                    onClick={() =>
                      setPendingPlay({ type: 'sly_deal_their_card', card: pendingPlay.card, targetPlayerId: p.id })
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      case 'sly_deal_their_card': {
        const targetP2 = room.players.find((p) => p.id === pendingPlay.targetPlayerId);
        if (!targetP2) return null;
        // Only from incomplete sets
        const incompleteProps = ALL_COLORS.flatMap((color) => {
          const set = targetP2.sets[color] ?? [];
          if (isSetComplete(color, set)) return [];
          return set.map((c) => ({ card: c, color }));
        });

        return (
          <div className="md-overlay" onClick={() => setPendingPlay(null)}>
            <motion.div
              className="md-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 className="md-modal-title">Saisie — Propriété de {targetP2.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                Sets incomplets uniquement
              </p>
              {incompleteProps.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Aucune propriété disponible.
                </p>
              ) : (
                <div className="md-hand-row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                  {incompleteProps.map(({ card: c, color }) => (
                    <MDCardComponent
                      key={c.id}
                      card={c}
                      size="md"
                      playable
                      onClick={() =>
                        onCommitSlyDeal(pendingPlay.card, pendingPlay.targetPlayerId, c.id, color)
                      }
                    />
                  ))}
                </div>
              )}
              <button className="btn btn-ghost mt-2 w-full" onClick={() => setPendingPlay(null)}>
                Annuler
              </button>
            </motion.div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  // Win screen
  if (room.status === 'finished') {
    const winner = room.players.find((p) => p.id === room.winner_id);
    const iWon = room.winner_id === myPlayerId;
    return (
      <div className="md-game-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          className="md-modal"
          style={{ maxWidth: 360 }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div style={{ fontSize: 64, textAlign: 'center' }}>{iWon ? '🏆' : '😔'}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)' }}>
            {iWon ? 'Victoire !' : `${winner?.name ?? '?'} a gagné !`}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 20 }}>
            3 sets complets collectés !
          </p>
          <button className="btn btn-primary w-full" onClick={onLeave}>
            Retour au menu
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="md-game-root">
      {/* Header */}
      <div className="md-header">
        <span className="md-room-code">{room.room_code}</span>
        <div className="md-turn-pill">
          {isMyTurn ? (
            <span style={{ color: '#4ade80' }}>Votre tour ({cardsLeft} jeu{cardsLeft > 1 ? 'x' : ''})</span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>Tour de {currentPlayer?.name}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className="md-icon-btn"
            onClick={() => setShowYoutubeInput(!showYoutubeInput)}
            title="Musique"
          >
            🎵
          </button>
          <button className="md-icon-btn" onClick={onLeave} title="Quitter">
            ✕
          </button>
        </div>
      </div>

      {/* YouTube input */}
      {showYoutubeInput && (
        <div style={{ padding: '4px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <input
            type="text"
            className="game-input"
            style={{ fontSize: 12, padding: '4px 8px' }}
            placeholder="URL YouTube..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onBlur={() => onSyncYoutubeUrl(youtubeUrl)}
          />
        </div>
      )}

      {/* Discard mode banner */}
      {isDiscardMode && (
        <div
          style={{
            background: '#7c3aed',
            color: '#fff',
            padding: '6px 12px',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Défaussez {myHand.length - 7} carte{myHand.length - 7 > 1 ? 's' : ''} pour finir votre tour
        </div>
      )}

      {/* Other players scroll area */}
      <div className="md-players-scroll-outer">
        <div className="md-players-scroll-area">
          {otherPlayers.map((p) => (
            <PlayerArea
              key={p.id}
              player={p}
              isCurrentTurn={room.players[room.current_player_index]?.id === p.id}
            />
          ))}
        </div>
      </div>

      {/* Table center */}
      <div className="md-table">
        <div className="md-deck-area">
          <div className="md-deck-pile">
            <span style={{ fontSize: 20 }}>🂠</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{room.deck.length}</span>
          </div>
          <div className="md-discard-area">
            {topDiscard ? (
              <MDCardComponent card={topDiscard} size="md" />
            ) : (
              <div className="md-empty-pile">Défausse</div>
            )}
          </div>
          <div className="md-cards-played-badge">
            <span style={{ color: room.cards_played_this_turn >= 3 ? '#ef4444' : '#22c55e' }}>
              {room.cards_played_this_turn}/3
            </span>
          </div>
        </div>
      </div>

      {/* My property sets */}
      {myPlayer && (
        <PropertySetDisplay
          player={myPlayer}
          isMyTurn={isMyTurn}
          onMoveWild={onMoveWild}
        />
      )}

      {/* My hand */}
      <div className="md-hand-section">
        <div className="md-hand-info">
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Main ({myHand.length}) · Banque: ${myPlayer ? getBankTotal(myPlayer) : 0}M
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {canEndTurn && (
              <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={onEndTurn}>
                Fin du tour
              </button>
            )}
          </div>
        </div>

        <div className="md-hand-row-wrapper">
          <div className="md-hand-row">
            {myHand.map((card) => (
              <MDCardComponent
                key={card.id}
                card={card}
                size="md"
                playable={isDiscardMode || (canPlayCard && card.action !== 'just_say_no' && card.action !== 'double_rent')}
                disabled={
                  !isDiscardMode &&
                  (!canPlayCard || card.action === 'just_say_no')
                }
                onClick={() => handleCardClick(card)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {renderTargetingOverlay()}
        {renderPendingActionOverlay()}
        {renderPaymentModal()}
      </AnimatePresence>
    </div>
  );
}
