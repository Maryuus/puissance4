import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  onUrlChange?: (url: string) => void;
  syncedUrl?: string;
  inline?: boolean;
}

// ── YouTube IFrame API loader ─────────────────────────────────────────────────
// Using the JS API (instead of plain iframe) lets us call playVideo() explicitly,
// which iOS Safari accepts because it's triggered within a user-gesture chain.

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: { playVideo: () => void } }) => void;
          };
        }
      ) => { destroy: () => void };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytScriptLoaded = false;
let ytReady = false;
const ytQueue: Array<() => void> = [];

function onYTReady(cb: () => void) {
  if (ytReady) { cb(); return; }
  ytQueue.push(cb);
  if (!ytScriptLoaded) {
    ytScriptLoaded = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      ytReady = true;
      ytQueue.splice(0).forEach(fn => fn());
      prev?.();
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractYouTubeId(input: string): string | null {
  if (!input.trim()) return null;
  try {
    const short = input.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (short) return short[1];
    const url = new URL(input);
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') ?? url.pathname.split('/').pop() ?? null;
    }
  } catch {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  }
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MusicPlayer({ onUrlChange, syncedUrl, inline = false }: MusicPlayerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<{ destroy: () => void } | null>(null);

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
  }, [syncedUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mount/update YouTube player via IFrame API (works on iOS)
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    // Destroy previous player
    playerRef.current?.destroy();
    playerRef.current = null;

    // Clear container and create a fresh target div
    const container = containerRef.current;
    container.innerHTML = '';
    const target = document.createElement('div');
    container.appendChild(target);

    onYTReady(() => {
      if (!container.isConnected) return; // component unmounted
      playerRef.current = new window.YT.Player(target, {
        videoId,
        width: '100%',
        height: '120',
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1, // prevents iOS fullscreen takeover
        },
        events: {
          // Explicit playVideo() call — the only way iOS Safari allows autoplay
          onReady: (e) => e.target.playVideo(),
        },
      });
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  const handleLoad = () => {
    const id = extractYouTubeId(inputValue);
    if (!id) { setError('Lien YouTube invalide'); return; }
    setError('');
    setVideoId(id);
    onUrlChange?.(inputValue);
  };

  const handleClear = () => {
    playerRef.current?.destroy();
    playerRef.current = null;
    setVideoId(null);
    setInputValue('');
    setError('');
    onUrlChange?.('');
  };

  return (
    <div className={inline ? 'music-player-inline' : 'music-player-wrapper'}>
      <motion.button
        className={`music-toggle-btn ${videoId ? 'music-active' : ''}`}
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.92 }}
        title="Musique YouTube"
      >
        <span className="text-lg">🎵</span>
        {videoId && <span className="music-playing-dot" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={inline ? 'music-panel music-panel-inline' : 'music-panel'}
            initial={{ opacity: 0, y: inline ? 4 : 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: inline ? 4 : 8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="music-panel-header">
              <span className="font-semibold text-sm">Musique de fond</span>
              <button className="music-close-btn" onClick={() => setOpen(false)}>✕</button>
            </div>

            {!videoId ? (
              <div className="music-input-area">
                <p className="text-xs opacity-60 mb-2">
                  Colle un lien YouTube — la musique joue en fond
                  {onUrlChange && ' pour vous deux'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="game-input flex-1 text-sm"
                    placeholder="https://youtube.com/watch?v=..."
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); setError(''); }}
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
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
                <p className="text-xs opacity-40 mt-2">Soundboard, ambiance, musique... 🎭</p>
              </div>
            ) : (
              <div className="music-player-area">
                {/* YT IFrame API renders into this div */}
                <div
                  ref={containerRef}
                  className="rounded-lg overflow-hidden"
                  style={{ width: '100%', minHeight: '120px', background: '#000' }}
                />
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-ghost text-xs flex-1" onClick={handleClear}>
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
