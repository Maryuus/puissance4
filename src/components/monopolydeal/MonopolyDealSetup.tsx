import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { isSupabaseConfigured } from '../../lib/monopolyDealSupabase';
import { getSavedName, saveName } from '../../lib/playerName';

type Tab = 'create' | 'join';

interface MonopolyDealSetupProps {
  onBack: () => void;
  createRoom: (name: string) => Promise<unknown>;
  joinRoom: (code: string, name: string) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function MonopolyDealSetup({ onBack, createRoom, joinRoom, loading, error }: MonopolyDealSetupProps) {
  const [tab, setTab] = useState<Tab>('create');
  const [myName, setMyName] = useState(() => getSavedName());
  const [roomCode, setRoomCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <motion.div className="setup-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="text-5xl mb-4">🔧</div>
        <h2 className="setup-title">Supabase Non Configuré</h2>
        <p className="setup-subtitle">Le multijoueur en ligne nécessite Supabase.</p>
        <div className="config-instructions">
          <p className="text-sm font-mono bg-black/20 rounded p-3 text-left">
            1. Créer un projet sur <strong>supabase.com</strong><br />
            2. Exécuter la migration SQL<br />
            3. Ajouter dans <code>.env</code> :<br /><br />
            <span className="text-green-400">VITE_SUPABASE_URL=...</span><br />
            <span className="text-green-400">VITE_SUPABASE_ANON_KEY=...</span>
          </p>
        </div>
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
    if (room) setCreatedCode(room.room_code);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) { setLocalError('Le code doit faire 6 caractères.'); return; }
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

  return (
    <motion.div
      className="setup-container"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className="text-4xl mb-2">🎩</div>
      <h2 className="setup-title">Monopoly Deal — En ligne</h2>
      <p className="setup-subtitle">2 à 5 joueurs</p>

      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'create' ? 'tab-active' : ''}`}
          onClick={() => { setTab('create'); setLocalError(null); setCreatedCode(null); }}
        >
          Créer
        </button>
        <button
          className={`tab-btn ${tab === 'join' ? 'tab-active' : ''}`}
          onClick={() => { setTab('join'); setLocalError(null); }}
        >
          Rejoindre
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            {!createdCode ? (
              <form onSubmit={handleCreate} className="setup-form">
                <div className="input-group">
                  <label className="input-label">Ton prénom</label>
                  <input
                    type="text"
                    className="game-input"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Prénom"
                    maxLength={20}
                    autoFocus
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
                <p className="text-sm opacity-70 mb-2">Partage ce code (6 caractères) :</p>
                <div className="room-code-display">
                  <span className="room-code-text" style={{ fontSize: '1.5rem', letterSpacing: '0.15em' }}>
                    {createdCode}
                  </span>
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
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full"
          >
            <form onSubmit={handleJoin} className="setup-form">
              <div className="input-group">
                <label className="input-label">Ton prénom</label>
                <input
                  type="text"
                  className="game-input"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  placeholder="Prénom"
                  maxLength={20}
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label">Code de la room (6 caractères)</label>
                <input
                  type="text"
                  className="game-input room-code-input"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX"
                  maxLength={6}
                />
              </div>
              {displayError && <p className="error-text">{displayError}</p>}
              <button
                type="submit"
                className="btn btn-primary w-full mt-4"
                disabled={loading || roomCode.length !== 6}
              >
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
