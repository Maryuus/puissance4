import { motion } from 'framer-motion';
import { UnoRoomRow } from '../../lib/unoSupabase';

interface UnoWaitingProps {
  room: UnoRoomRow;
  myPlayerId: string;
  loading: boolean;
  onStart: () => void;
  onLeave: () => void;
}

export function UnoWaiting({ room, myPlayerId, loading, onStart, onLeave }: UnoWaitingProps) {
  const isHost = room.host_id === myPlayerId;
  const canStart = room.players.length >= 2;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.room_code);
    } catch { /* fallback */ }
  };

  return (
    <motion.div
      className="setup-container"
      style={{ maxWidth: 480 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="text-4xl mb-2">🃏</div>
      <h2 className="setup-title">Salle d'attente</h2>

      <div className="room-code-display mb-4">
        <span className="room-code-text">{room.room_code}</span>
        <motion.button onClick={copyCode} className="copy-btn" whileTap={{ scale: 0.95 }}>
          📋
        </motion.button>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Partage ce code pour que tes amis rejoignent ({room.players.length}/10 joueurs)
      </p>

      {/* Player list */}
      <div className="w-full mb-4">
        <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          Joueurs connectés
        </p>
        <div className="flex flex-col gap-2">
          {room.players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: `hsl(${(index * 47) % 360}, 70%, 50%)`,
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {player.name[0]?.toUpperCase()}
              </div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {player.name}
              </span>
              {player.id === room.host_id && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(251,191,36,0.2)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                  Hôte
                </span>
              )}
              {player.id === myPlayerId && player.id !== room.host_id && (
                <span className="ml-auto text-xs opacity-50">Toi</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Waiting animation if not host */}
      {!isHost && (
        <div className="waiting-indicator mb-4">
          <div className="waiting-dots"><span /><span /><span /></div>
          <p className="text-sm opacity-60">En attente que l'hôte lance la partie...</p>
        </div>
      )}

      {/* Start button for host */}
      {isHost && (
        <motion.button
          className="btn btn-primary w-full mb-3"
          onClick={onStart}
          disabled={loading || !canStart}
          whileHover={canStart ? { scale: 1.02 } : {}}
          whileTap={{ scale: 0.98 }}
        >
          {loading ? 'Lancement...' : !canStart ? 'En attente d\'un 2ème joueur...' : `Lancer la partie (${room.players.length} joueurs)`}
        </motion.button>
      )}

      <button className="btn btn-ghost w-full" onClick={onLeave}>
        Quitter
      </button>
    </motion.div>
  );
}
