import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  /** When provided (online mode), called when URL changes so it can be synced */
  onUrlChange?: (url: string) => void;
  /** URL synced from the other player (online mode) */
  syncedUrl?: string;
}

function extractYouTubeId(input: string): string | null {
  if (!input.trim()) return null;
  try {
    // Handle youtu.be short links
    const short = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (short) return short[1];
    // Handle youtube.com/watch?v= and /embed/
    const url = new URL(input);
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? null;
    }
  } catch {
    // If not a URL, try treating as bare ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  }
  return null;
}

export function MusicPlayer({ onUrlChange, syncedUrl }: MusicPlayerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from online partner
  useEffect(() => {
    if (syncedUrl && syncedUrl !== inputValue) {
      const id = extractYouTubeId(syncedUrl);
      if (id) {
        setVideoId(id);
        setInputValue(syncedUrl);
        setError('');
        setOpen(true);
      }
    }
  }, [syncedUrl]);

  const handleLoad = () => {
    const id = extractYouTubeId(inputValue);
    if (!id) {
      setError('Lien YouTube invalide');
      return;
    }
    setError('');
    setVideoId(id);
    onUrlChange?.(inputValue);
  };

  const handleClear = () => {
    setVideoId(null);
    setInputValue('');
    setError('');
    onUrlChange?.('');
  };

  return (
    <div className="music-player-wrapper">
      {/* Toggle button */}
      <motion.button
        className={`music-toggle-btn ${videoId ? 'music-active' : ''}`}
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.92 }}
        title="Musique YouTube"
      >
        <span className="text-lg">{videoId ? '🎵' : '🎵'}</span>
        {videoId && <span className="music-playing-dot" />}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="music-panel"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="music-panel-header">
              <span className="font-semibold text-sm">Musique de fond</span>
              <button
                className="music-close-btn"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {!videoId ? (
              <div className="music-input-area">
                <p className="text-xs opacity-60 mb-2">
                  Colle un lien YouTube — la musique joue en fond
                  {onUrlChange && ' pour vous deux'}
                </p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    className="game-input flex-1 text-sm"
                    placeholder="https://youtube.com/watch?v=..."
                    value={inputValue}
                    onChange={e => {
                      setInputValue(e.target.value);
                      setError('');
                    }}
                    onKeyDown={e => e.key === 'Enter' && handleLoad()}
                  />
                  <motion.button
                    className="btn btn-primary text-sm px-3"
                    onClick={handleLoad}
                    whileTap={{ scale: 0.95 }}
                  >
                    ▶
                  </motion.button>
                </div>
                {error && (
                  <p className="text-red-400 text-xs mt-1">{error}</p>
                )}
                <p className="text-xs opacity-40 mt-2">
                  Soundboard, ambiance, musique... à toi de choisir 🎭
                </p>
              </div>
            ) : (
              <div className="music-player-area">
                <iframe
                  key={videoId}
                  width="100%"
                  height="120"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title="YouTube music player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  allowFullScreen
                  className="rounded-lg"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="btn btn-ghost text-xs flex-1"
                    onClick={handleClear}
                  >
                    Changer de musique
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
