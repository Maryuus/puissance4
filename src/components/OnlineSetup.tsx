import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { createRoom, joinRoom, isSupabaseConfigured } from '../lib/supabase';
import { Player } from '../lib/gameLogic';
import { getSavedName, saveName } from '../lib/playerName';

interface OnlineSetupProps {
  onJoined: (roomCode: string, playerNum: Player, myName: string) => void;
  onBack: () => void;
}

type OnlineTab = 'create' | 'join';

export function OnlineSetup({ onJoined, onBack }: OnlineSetupProps) {
  const { player1Name } = useGameStore();
  const [tab, setTab] = useState<OnlineTab>('create');
  const [myName, setMyName] = useState(() => getSavedName() || player1Name);
  const [roomCode, setRoomCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <motion.div
        className="setup-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-5xl mb-4">🔧</div>
        <h2 className="setup-title">Supabase Not Configured</h2>
        <p className="setup-subtitle">
          To enable online multiplayer, you need to set up Supabase.
        </p>
        <div className="config-instructions">
          <p className="text-sm font-mono bg-black/20 rounded p-3 text-left">
            1. Create a project at <strong>supabase.com</strong><br />
            2. Run the SQL from <code>supabase/schema.sql</code><br />
            3. Copy your URL and anon key to <code>.env</code>:<br />
            <br />
            <span className="text-green-400">VITE_SUPABASE_URL=...</span><br />
            <span className="text-green-400">VITE_SUPABASE_ANON_KEY=...</span>
          </p>
        </div>
        <button onClick={onBack} className="btn btn-ghost mt-4">
          ← Back
        </button>
      </motion.div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myName.trim()) return;
    setLoading(true);
    setError(null);

    saveName(myName);
    const game = await createRoom(myName.trim());
    if (game) {
      setCreatedCode(game.room_code);
    } else {
      setError('Failed to create room. Please try again.');
    }
    setLoading(false);
  };

  const handleJoinRoom = () => {
    if (createdCode) {
      onJoined(createdCode, 1, myName.trim() || 'Player 1');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 4) {
      setError('Room code must be 4 characters.');
      return;
    }
    if (!myName.trim()) {
      setError('Please enter your name.');
      return;
    }
    setLoading(true);
    setError(null);

    saveName(myName);
    const game = await joinRoom(code, myName.trim());
    if (game) {
      onJoined(code, 2, myName.trim() || 'Player 2');
    } else {
      setError('Room not found or already full. Check the code and try again.');
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (createdCode) {
      try {
        await navigator.clipboard.writeText(createdCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <motion.div
      className="setup-container"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <motion.h2
        className="setup-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Online Multiplayer
      </motion.h2>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'create' ? 'tab-active' : ''}`}
          onClick={() => { setTab('create'); setError(null); setCreatedCode(null); }}
        >
          Create Room
        </button>
        <button
          className={`tab-btn ${tab === 'join' ? 'tab-active' : ''}`}
          onClick={() => { setTab('join'); setError(null); }}
        >
          Join Room
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
                  <label className="input-label">Your Name</label>
                  <input
                    type="text"
                    className="game-input"
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Your name"
                    maxLength={20}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
                <button
                  type="submit"
                  className="btn btn-primary w-full mt-4"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Room'}
                </button>
              </form>
            ) : (
              <motion.div
                className="room-created"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <p className="text-sm opacity-70 mb-2">Share this code with your friend:</p>
                <div className="room-code-display">
                  <span className="room-code-text">{createdCode}</span>
                  <motion.button
                    onClick={copyCode}
                    className="copy-btn"
                    whileTap={{ scale: 0.95 }}
                    title="Copy code"
                  >
                    {copied ? '✓' : '📋'}
                  </motion.button>
                </div>
                {copied && (
                  <motion.p
                    className="text-green-400 text-xs mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Copied to clipboard!
                  </motion.p>
                )}
                <div className="waiting-indicator mt-4">
                  <div className="waiting-dots">
                    <span /><span /><span />
                  </div>
                  <p className="text-sm opacity-60">Waiting for opponent...</p>
                </div>
                <button
                  onClick={handleJoinRoom}
                  className="btn btn-primary w-full mt-4"
                >
                  Enter Waiting Room →
                </button>
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
                <label className="input-label">Your Name</label>
                <input
                  type="text"
                  className="game-input"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  placeholder="Your name"
                  maxLength={20}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label">Room Code</label>
                <input
                  type="text"
                  className="game-input room-code-input"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="XXXX"
                  maxLength={4}
                  autoComplete="off"
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <button
                type="submit"
                className="btn btn-primary w-full mt-4"
                disabled={loading || roomCode.length !== 4}
              >
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="btn btn-ghost mt-4"
        onClick={onBack}
        whileTap={{ scale: 0.97 }}
      >
        ← Back
      </motion.button>
    </motion.div>
  );
}
