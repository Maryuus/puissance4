import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicPlayerProps {
  onUrlChange?: (url: string) => void;
  syncedUrl?: string;
  inline?: boolean;
}

// ── YouTube IFrame API ────────────────────────────────────────────────────────

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
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
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

const YT_STATE_PLAYING = 1;

// ── Component ─────────────────────────────────────────────────────────────────

export function MusicPlayer({ onUrlChange, syncedUrl, inline = false }: MusicPlayerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState('');
  // true once the player is ready but not yet playing (iOS PWA needs a manual tap)
  const [needsTap, setNeedsTap] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

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

  // Mount / update YouTube player
  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    playerRef.current?.destroy();
    playerRef.current = null;
    setNeedsTap(false);

    const container = containerRef.current;
    container.innerHTML = '';
    const target = document.createElement('div');
    container.appendChild(target);

    onYTReady(() => {
      if (!container.isConnected) return;
      playerRef.current = new window.YT.Player(target, {
        videoId,
        width: '100%',
        height: '120',
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            e.target.playVideo();
            // On iOS PWA the call above is silently ignored; we detect it via onStateChange
          },
          onStateChange: (e) => {
            if (e.data === YT_STATE_PLAYING) {
              // Video is playing — hide the tap prompt if it was showing
              setNeedsTap(false);
            } else if (e.data === -1 /* unstarted */ || e.data === 5 /* cued */) {
              // onReady fired but autoplay was blocked → show tap-to-play
              setNeedsTap(true);
            }
          },
        },
      });
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  const handleTapToPlay = () => {
    // Called directly from a user tap → iOS allows playVideo() here
    playerRef.current?.playVideo();
    setNeedsTap(false);
  };

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
    setNeedsTap(false);
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
                {/* YT IFrame API renders here */}
                <div
                  ref={containerRef}
                  className="rounded-lg overflow-hidden"
                  style={{ width: '100%', minHeight: '120px', background: '#000' }}
                />

                {/* Tap-to-play button — only shown on iOS PWA where autoplay is blocked */}
                <AnimatePresence>
                  {needsTap && (
                    <motion.button
                      className="music-tap-play"
                      onClick={handleTapToPlay}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ▶ Appuyer pour lancer
                    </motion.button>
                  )}
                </AnimatePresence>

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
