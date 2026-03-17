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

const COLOR_BG: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
};

/** Mini stacked face-down cards showing how many cards a player has */
function CardStack({ count, color }: { count: number; color: string }) {
  const visible = Math.min(count, 6);
  const width = 22 + visible * 5;
  return (
    <div className="uno-card-stack" style={{ width, minWidth: width }}>
      {Array.from({ length: visible }).map((_, i) => (
        <div
          key={i}
          className="uno-card-stack-item"
          style={{
            left: i * 5,
            zIndex: i,
            transform: `rotate(${(i - visible / 2) * 3}deg)`,
            borderColor: `${color}60`,
          }}
        />
      ))}
      {count > 0 && (
        <div className="uno-card-stack-count" style={{ color }}>
          {count}
        </div>
      )}
    </div>
  );
}

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
  const myPlayerIdx = room.players.findIndex((p) => p.id === myPlayerId);
  const iNeedUno = myHand.length === 1 && !myPlayer?.unoSafe;
  const unoCandidates = room.players.filter(
    (p) => p.id !== myPlayerId && p.cardCount === 1 && !p.unoSafe
  );

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

      {/* ── Header ───────────────────────────────────────── */}
      <div className="uno-header">
        <div className="uno-room-badge">🃏 {room.room_code}</div>
        <motion.div
          className="uno-turn-pill"
          animate={{
            background: isMyTurn
              ? 'rgba(52,211,153,0.15)'
              : 'rgba(255,255,255,0.04)',
            borderColor: isMyTurn ? '#34d399' : 'var(--border-color)',
            color: isMyTurn ? '#34d399' : 'var(--text-secondary)',
          }}
        >
          {isMyTurn ? (
            <>
              <span className="uno-turn-dot uno-turn-dot-active" />
              {isForced ? `⚠️ Pioche ${room.draw_stack} !` : '✨ Ton tour'}
            </>
          ) : (
            <>
              <span className="uno-turn-dot" />
              {currentPlayerName}…
            </>
          )}
        </motion.div>
        <button className="btn btn-ghost text-xs" onClick={onLeave} style={{ padding: '0.3rem 0.6rem' }}>
          ✕
        </button>
      </div>

      {/* ── Players around the table ─────────────────────── */}
      <div className="uno-seats-area">
        <div className="uno-seats-row">
          {otherPlayers.map((player) => {
            const playerIdx = room.players.findIndex((p) => p.id === player.id);
            const isCurrent = playerIdx === room.current_player_index;
            const color = PLAYER_COLORS[playerIdx % PLAYER_COLORS.length];
            return (
              <motion.div
                key={player.id}
                className={`uno-seat ${isCurrent ? 'uno-seat-active' : ''}`}
                animate={isCurrent ? { scale: 1.06 } : { scale: 1 }}
                style={isCurrent ? { '--seat-color': color } as React.CSSProperties : {}}
              >
                {/* Cards stack on top */}
                <CardStack count={player.cardCount} color={color} />

                {/* Avatar + name */}
                <div className="uno-seat-bottom">
                  <motion.div
                    className="uno-seat-avatar"
                    style={{ background: color }}
                    animate={isCurrent ? { boxShadow: `0 0 0 3px ${color}60` } : { boxShadow: 'none' }}
                  >
                    {player.name[0]?.toUpperCase()}
                  </motion.div>
                  <span className="uno-seat-name">{player.name}</span>
                  {isCurrent && (
                    <motion.span
                      className="uno-seat-turn-arrow"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    >
                      ▼
                    </motion.span>
                  )}
                </div>
                {player.cardCount === 1 && !player.unoSafe && (
                  <div className="uno-seat-uno-badge">UNO!</div>
                )}
              </motion.div>
            );
          })}

          {/* Me */}
          <motion.div
            className={`uno-seat uno-seat-me ${isMyTurn ? 'uno-seat-active' : ''}`}
            style={isMyTurn ? { '--seat-color': PLAYER_COLORS[myPlayerIdx % PLAYER_COLORS.length] } as React.CSSProperties : {}}
          >
            <CardStack count={myHand.length} color={PLAYER_COLORS[myPlayerIdx % PLAYER_COLORS.length]} />
            <div className="uno-seat-bottom">
              <div
                className="uno-seat-avatar"
                style={{ background: PLAYER_COLORS[myPlayerIdx % PLAYER_COLORS.length], border: '2px solid white' }}
              >
                {myPlayer?.name[0]?.toUpperCase()}
              </div>
              <span className="uno-seat-name" style={{ fontWeight: 800 }}>
                {myPlayer?.name} <span style={{ opacity: 0.5, fontWeight: 400 }}>(toi)</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── UNO / Counter-UNO bar ─────────────────────────── */}
      <AnimatePresence>
        {(iNeedUno || unoCandidates.length > 0) && (
          <motion.div
            className="uno-alert-bar"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {iNeedUno && (
              <motion.button
                className="uno-btn-uno"
                onClick={onCallUno}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table: deck + discard + direction ────────────── */}
      <div className="uno-table">
        <div className="uno-direction-badge">
          {room.direction === 1 ? '↻ Horaire' : '↺ Anti-horaire'}
        </div>

        <div className="uno-piles">
          {/* Draw pile */}
          <div className="uno-pile">
            <div className="uno-pile-header">
              <span className="uno-pile-title">PIOCHE</span>
              <span className="uno-pile-count">{room.deck.length}</span>
            </div>
            <motion.div
              className={`uno-deck-stack ${isMyTurn && !hasDrawnThisTurn ? 'uno-deck-clickable' : ''} ${isMyTurn && !hasDrawnThisTurn && !isForced ? 'uno-deck-can-draw' : ''} ${isMyTurn && isForced ? 'uno-deck-must-draw' : ''}`}
              whileHover={isMyTurn && !hasDrawnThisTurn ? { scale: 1.08, y: -6 } : {}}
              whileTap={isMyTurn && !hasDrawnThisTurn ? { scale: 0.96 } : {}}
              onClick={isMyTurn && !hasDrawnThisTurn ? onDrawCard : undefined}
            >
              {/* Stacked deck effect */}
              <div className="uno-deck-shadow-2" />
              <div className="uno-deck-shadow-1" />
              <UnoCardComponent faceDown size="lg" />
              {isForced && isMyTurn && (
                <motion.div
                  className="uno-forced-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ type: 'spring', repeat: Infinity, duration: 0.7 }}
                >
                  +{room.draw_stack}
                </motion.div>
              )}
              {isMyTurn && !hasDrawnThisTurn && !isForced && (
                <motion.div
                  className="uno-draw-hint"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Piocher
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Active color dot center */}
          <div className="uno-color-indicator">
            <div
              className="uno-active-color-dot"
              style={{
                background: COLOR_BG[room.current_color] ?? '#888',
                boxShadow: `0 0 20px ${COLOR_BG[room.current_color] ?? '#888'}80`,
              }}
            />
          </div>

          {/* Discard pile */}
          <div className="uno-pile">
            <div className="uno-discard-wrapper">
              <AnimatePresence mode="popLayout">
                {topCard && (
                  <motion.div
                    key={topCard.id}
                    initial={{ scale: 0.7, rotateZ: -15, opacity: 0 }}
                    animate={{ scale: 1, rotateZ: 0, opacity: 1 }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    <UnoCardComponent card={topCard} size="lg" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="uno-pile-label">Défausse</span>
          </div>
        </div>
      </div>

      {/* ── My hand ──────────────────────────────────────── */}
      <div className="uno-hand-section">
        <div className="uno-hand-label">
          <span>Tes cartes</span>
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
          {isMyTurn && !isForced && !hasDrawnThisTurn && (
            <span className="uno-hand-hint">Joue une carte ou pioche</span>
          )}
          {isMyTurn && isForced && (
            <span className="uno-hand-hint" style={{ color: '#f87171' }}>
              Pioche {room.draw_stack} ou stack !
            </span>
          )}
        </div>

        {myHand.length === 0 ? (
          <div className="text-center py-4 opacity-50 text-sm">Plus de cartes !</div>
        ) : (
          <div className="uno-hand-fan-wrapper">
            <div className="uno-hand-fan">
              <AnimatePresence>
                {myHand.map((card, i) => {
                  const total = myHand.length;
                  const mid = (total - 1) / 2;
                  const maxAngle = Math.min(total * 2.5, 28);
                  const angle = total > 1 ? ((i - mid) / (mid || 1)) * maxAngle : 0;
                  const yLift = total > 1 ? Math.pow(Math.abs(i - mid) / (mid || 1), 1.5) * 10 : 0;
                  const overlap = total > 10 ? -20 : total > 6 ? -14 : -10;
                  const playable = isPlayable(card);
                  return (
                    <motion.div
                      key={card.id}
                      layout
                      initial={{ scale: 0, opacity: 0, y: 30 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0, opacity: 0, y: -30 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      style={{
                        marginLeft: i > 0 ? `${overlap}px` : 0,
                        zIndex: playable ? total + i : i,
                        position: 'relative',
                        transform: `rotate(${angle}deg) translateY(${yLift}px)`,
                        transformOrigin: 'bottom center',
                      }}
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
          </div>
        )}

        {isMyTurn && (
          <div className="uno-actions">
            {!hasDrawnThisTurn && (
              <motion.button
                className="uno-draw-btn"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={onDrawCard}
              >
                {isForced ? `Piocher ${room.draw_stack}` : 'Piocher'}
              </motion.button>
            )}
            {hasDrawnThisTurn && (
              <motion.button
                className="btn btn-secondary"
                onClick={onPassTurn}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                Passer le tour
              </motion.button>
            )}
          </div>
        )}
      </div>

      {/* ── Wild color picker overlay ─────────────────────── */}
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
              <p className="text-sm font-semibold mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>
                {pendingWild.value === 'wild4' ? '⚡ +4 — ' : '★ Wild — '}Choisis une couleur
              </p>
              <div className="uno-color-grid">
                {UNO_COLORS.map((c) => (
                  <motion.button
                    key={c.value}
                    className="uno-color-btn"
                    style={{ background: c.bg }}
                    whileHover={{ scale: 1.12, boxShadow: `0 0 20px ${c.bg}80` }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelectWildColor(c.value)}
                  >
                    <span style={{ color: 'white', fontWeight: 800, fontSize: '0.8rem', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
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
