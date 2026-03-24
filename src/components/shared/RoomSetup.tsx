import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSavedName, saveName } from '../../lib/playerName';

// ─── Generic room setup screen (create / join tabs) ───────────────────────────
// Used by UNO, Monopoly Deal, and any future online game.

interface RoomSetupProps {
  emoji: string;
  title: string;
  subtitle: string;
  /** Length of the room code expected when joining */
  codeLength: number;
  isConfigured: boolean;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  createRoom: (name: string) => Promise<unknown>;
  joinRoom: (code: string, name: string) => Promise<unknown>;
}

type Tab = 'create' | 'join';

export function RoomSetup({
  emoji, title, subtitle, codeLength,
  isConfigured, loading, error,
  onBack, createRoom, joinRoom,
}: RoomSetupProps) {
  const [tab, setTab] = useState<Tab>('create');
  const [myName, setMyName] = useState(() => getSavedName());
  const [roomCode, setRoomCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isConfigured) {
    return (
      <motion.div className="setup-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-5xl mb-4">🔧</div>
        <h2 className="setup-title">Supabase non configuré</h2>
        <p className="setup-subtitle">Le multijoueur en ligne nécessite Supabase.</p>
        <button onClick={onBack} className="btn btn-ghost mt-4">← Retour</button>
      </motion.div>
    );
  }

  const displayError = localError || error;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myName.trim()) { setLocalError('Entre ton prénom.'); return; }
    setLocalError(null);
    saveName(myName);
    const room = await createRoom(myName.trim()) as { room_code: string } | null;
    if (room?.room_code) setCreatedCode(room.room_code);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length !== codeLength) {
      setLocalError(`Le code doit faire ${codeLength} caractères.`);
      return;
    }
    if (!myName.trim()) { setLocalError('Entre ton prénom.'); return; }
    setLocalError(null);
    saveName(myName);
    await joinRoom(code, myName.trim());
  };

  const copyCode = async () => {
    if (!createdCode) return;
    try {
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setLocalError(null);
    if (next === 'create') setCreatedCode(null);
  };

  return (
    <motion.div
      className="setup-container"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className="text-4xl mb-2">{emoji}</div>
      <h2 className="setup-title">{title}</h2>
      <p className="setup-subtitle">{subtitle}</p>

      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'create' ? 'tab-active' : ''}`} onClick={() => switchTab('create')}>
          Créer
        </button>
        <button className={`tab-btn ${tab === 'join' ? 'tab-active' : ''}`} onClick={() => switchTab('join')}>
          Rejoindre
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
            {!createdCode ? (
              <form onSubmit={handleCreate} className="setup-form">
                <div className="input-group">
                  <label className="input-label">Ton prénom</label>
                  <input
                    type="text" className="game-input" value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Prénom" maxLength={20} autoFocus
                  />
                </div>
                {displayError && <p className="error-text">{displayError}</p>}
                <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
                  {loading ? 'Création...' : 'Créer la room'}
                </button>
              </form>
            ) : (
              <motion.div
                className="room-created"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <p className="text-sm opacity-70 mb-2">Partage ce code :</p>
                <div className="room-code-display">
                  <span className="room-code-text">{createdCode}</span>
                  <motion.button onClick={copyCode} className="copy-btn" whileTap={{ scale: 0.95 }}>
                    {copied ? '✓' : '📋'}
                  </motion.button>
                </div>
                {copied && <p className="text-green-400 text-xs mt-1">Copié !</p>}
                <div className="waiting-indicator mt-3">
                  <div className="waiting-dots"><span /><span /><span /></div>
                  <p className="text-sm opacity-60">En attente de joueurs...</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {tab === 'join' && (
          <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
            <form onSubmit={handleJoin} className="setup-form">
              <div className="input-group">
                <label className="input-label">Ton prénom</label>
                <input
                  type="text" className="game-input" value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  placeholder="Prénom" maxLength={20} autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label">Code de la room</label>
                <input
                  type="text" className="game-input room-code-input"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder={'X'.repeat(codeLength)} maxLength={codeLength}
                />
              </div>
              {displayError && <p className="error-text">{displayError}</p>}
              <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading || roomCode.length !== codeLength}>
                {loading ? 'Connexion...' : 'Rejoindre'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button className="btn btn-ghost mt-4" onClick={onBack}>← Retour</button>
    </motion.div>
  );
}
