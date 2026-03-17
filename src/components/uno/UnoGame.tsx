import { motion, AnimatePresence } from 'framer-motion';
import { UnoCard, canPlay, UNO_COLORS } from '../../lib/unoLogic';
import { UnoRoomRow } from '../../lib/unoSupabase';
import { UnoCardComponent } from './UnoCardComponent';

interface UnoGameProps {
  room: UnoRoomRow;
  myHand: UnoCard[];
  myPlayerId: string;
  isMyTurn: boolean;
  topCard: UnoCard | null;
  hasDrawnThisTurn: boolean;
  pendingWild: UnoCard | null;
  onPlayCard: (card: UnoCard) => void;
  onSelectWildColor: (color: string) => void;
  onDrawCard: () => void;
  onPassTurn: () => void;
  onCallUno: () => void;
  onCounterUno: (targetId: string) => void;
  onLeave: () => void;
}

const PLAYER_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308',
  '#a855f7', '#f97316', '#14b8a6', '#ec4899',
  '#64748b', '#84cc16',
];

export function UnoGame({
  room,
  myHand,
  myPlayerId,
  isMyTurn,
  topCard,
  hasDrawnThisTurn,
  pendingWild,
  onPlayCard,
  onSelectWildColor,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onCounterUno,
  onLeave,
}: UnoGameProps) {
  const otherPlayers = room.players.filter((p) => p.id !== myPlayerId);
  const currentPlayerName = room.players[room.current_player_index]?.name ?? '?';
  const isForced = room.draw_stack > 0;
  const myPlayer = room.players.find((p) => p.id === myPlayerId);
  const iNeedUno = myHand.length === 1 && !myPlayer?.unoSafe;
  const unoCandidates = room.players.filter(
    (p) => p.id !== myPlayerId && p.cardCount === 1 && !p.unoSafe
  );

  const colorBg: Record<string, string> = {
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  };

  // Check if a card in hand is playable
  const isPlayable = (card: UnoCard): boolean => {
    if (!isMyTurn) return false;
    if (isForced && card.value !== 'draw2' && card.value !== 'wild4') return false;
    return topCard ? canPlay(card, topCard, room.current_color) : false;
  };

  if (room.status === 'finished') {
    const winner = room.players.find((p) => p.id === room.winner_id);
    const iWon = room.winner_id === myPlayerId;
    return (
      <div className="app-root">
        <div className="screen-wrapper">
          <motion.div
            className="setup-container"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <div className="text-6xl mb-4">{iWon ? '🏆' : '😔'}</div>
            <h2 className="setup-title" style={{ fontSize: '2rem' }}>
              {iWon ? 'Tu as gagné !' : `${winner?.name ?? '?'} a gagné !`}
            </h2>
            <p className="setup-subtitle">Partie terminée</p>
            <button className="btn btn-primary w-full mt-6" onClick={onLeave}>
              Retour au menu
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="uno-game-root">
      {/* Header */}
      <div className="uno-header">
        <div className="uno-room-badge">Room: {room.room_code}</div>
        <div
          className="uno-turn-indicator"
          style={{
            color: isMyTurn ? '#34d399' : 'var(--text-secondary)',
            borderColor: isMyTurn ? '#34d399' : 'var(--border-color)',
          }}
        >
          {isMyTurn ? (
            <>
              <div className="connection-dot connected" style={{ width: 6, height: 6 }} />
              {isForced ? `Pioche ${room.draw_stack} cartes !` : 'C\'est ton tour'}
            </>
          ) : (
            <>
              <div className="connection-dot waiting" style={{ width: 6, height: 6 }} />
              Tour de {currentPlayerName}
            </>
          )}
        </div>
        <button className="btn btn-ghost text-xs" onClick={onLeave}>Quitter</button>
      </div>

      {/* Other players */}
      <div className="uno-players-row">
        {otherPlayers.map((player) => {
          const playerIdx = room.players.findIndex((p) => p.id === player.id);
          const isCurrent = playerIdx === room.current_player_index;
          const color = PLAYER_COLORS[playerIdx % PLAYER_COLORS.length];
          return (
            <motion.div
              key={player.id}
              className={`uno-player-chip ${isCurrent ? 'uno-player-chip-active' : ''}`}
              animate={isCurrent ? { scale: 1.05 } : { scale: 1 }}
              style={isCurrent ? { borderColor: color, boxShadow: `0 0 10px ${color}40` } : {}}
            >
              <div
                className="uno-player-avatar"
                style={{ background: color }}
              >
                {player.name[0]?.toUpperCase()}
              </div>
              <div className="uno-player-info">
                <span className="uno-player-name">{player.name}</span>
                <span className="uno-player-cards">
                  {player.cardCount} carte{player.cardCount !== 1 ? 's' : ''}
                  {player.cardCount === 1 && ' 🔔 UNO!'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* UNO / Counter-UNO bar */}
      {(iNeedUno || unoCandidates.length > 0) && (
        <div className="uno-alert-bar">
          {iNeedUno && (
            <motion.button
              className="uno-btn-uno"
              onClick={onCallUno}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              🔔 UNO !
            </motion.button>
          )}
          {unoCandidates.map((p) => (
            <motion.button
              key={p.id}
              className="uno-btn-counter"
              onClick={() => onCounterUno(p.id)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
            >
              ⚡ Contre-UNO {p.name}!
            </motion.button>
          ))}
        </div>
      )}

      {/* Table area: deck + discard */}
      <div className="uno-table">
        <div className="uno-table-inner">
          {/* Direction indicator */}
          <div className="uno-direction">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {room.direction === 1 ? '→ Sens horaire' : '← Sens anti-horaire'}
            </span>
          </div>

          <div className="uno-piles">
            {/* Draw pile */}
            <div className="uno-pile">
              <div className="uno-pile-label">Pioche ({room.deck.length})</div>
              <motion.div
                whileHover={isMyTurn && !hasDrawnThisTurn ? { scale: 1.08 } : {}}
                whileTap={isMyTurn && !hasDrawnThisTurn ? { scale: 0.95 } : {}}
                onClick={isMyTurn ? onDrawCard : undefined}
                style={{ cursor: isMyTurn ? 'pointer' : 'default' }}
              >
                <UnoCardComponent
                  faceDown
                  size="lg"
                  playable={isMyTurn && !hasDrawnThisTurn}
                />
              </motion.div>
              {isForced && isMyTurn && (
                <motion.div
                  className="uno-forced-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                >
                  +{room.draw_stack}
                </motion.div>
              )}
            </div>

            {/* Discard pile */}
            <div className="uno-pile">
              <div className="uno-pile-label">Défausse</div>
              <div className="uno-discard-wrapper">
                {topCard && (
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={topCard.id}
                      initial={{ scale: 0.8, rotateZ: -10, opacity: 0 }}
                      animate={{ scale: 1, rotateZ: 0, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <UnoCardComponent card={topCard} size="lg" />
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
              {/* Current active color badge */}
              <div
                className="uno-color-badge"
                style={{ background: colorBg[room.current_color] ?? '#888' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* My hand */}
      <div className="uno-hand-section">
        <div className="uno-hand-label">
          Tes cartes ({myHand.length})
          {myHand.length === 1 && (
            <motion.span
              className="uno-uno-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              UNO!
            </motion.span>
          )}
        </div>

        {myHand.length === 0 ? (
          <div className="text-center py-4 opacity-50 text-sm">Plus de cartes !</div>
        ) : (
          <div className="uno-hand">
            <AnimatePresence>
              {myHand.map((card) => {
                const playable = isPlayable(card);
                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0, y: -30 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    <UnoCardComponent
                      card={card}
                      playable={playable}
                      disabled={!playable}
                      onClick={playable ? () => onPlayCard(card) : undefined}
                      size="md"
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons */}
        {isMyTurn && (
          <div className="uno-actions">
            {hasDrawnThisTurn && (
              <motion.button
                className="btn btn-secondary"
                onClick={onPassTurn}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Passer le tour
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* Wild color picker overlay */}
      <AnimatePresence>
        {pendingWild && (
          <motion.div
            className="uno-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="uno-color-picker"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <p className="text-sm font-semibold mb-3 text-center" style={{ color: 'var(--text-secondary)' }}>
                {pendingWild.value === 'wild4' ? '+4 — ' : '★ — '}Choisir une couleur
              </p>
              <div className="uno-color-grid">
                {UNO_COLORS.map((c) => (
                  <motion.button
                    key={c.value}
                    className="uno-color-btn"
                    style={{ background: c.bg }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelectWildColor(c.value)}
                  >
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>
                      {c.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
