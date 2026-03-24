import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MDCard, PropertyColor, COLOR_BG, COLOR_LABEL, SET_SIZES,
  ACTION_DESCRIPTIONS,
} from '../../lib/monopolyDealLogic';

interface MDCardProps {
  card: MDCard;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  faceDown?: boolean;
  className?: string;
  /** How many cards the player already has in this color (for hand display only) */
  setCount?: number;
}

// ─── Gradients par action ─────────────────────────────────────────────────────

const ACTION_BG: Record<string, string> = {
  just_say_no:    'linear-gradient(145deg,#7c3aed,#4c1d95)',
  birthday:       'linear-gradient(145deg,#f472b6,#be185d)',
  debt_collector: 'linear-gradient(145deg,#ef4444,#991b1b)',
  deal_breaker:   'linear-gradient(145deg,#1e40af,#1e3a8a)',
  sly_deal:       'linear-gradient(145deg,#0891b2,#0e7490)',
  forced_deal:    'linear-gradient(145deg,#059669,#065f46)',
  rent:           'linear-gradient(145deg,#d97706,#92400e)',
  wild_rent:      'linear-gradient(145deg,#7c3aed,#0891b2)',
  double_rent:    'linear-gradient(145deg,#dc2626,#ea580c)',
  pass_go:        'linear-gradient(145deg,#0ea5e9,#0369a1)',
};

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ColorStrip({ color, height = 18 }: { color: PropertyColor; height?: number }) {
  return (
    <div style={{
      height,
      background: `linear-gradient(90deg, ${COLOR_BG[color]}, ${COLOR_BG[color]}cc)`,
      flexShrink: 0,
      borderRadius: '5px 5px 0 0',
    }} />
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function MDCardComponent({
  card, onClick, selected, disabled, size = 'md', faceDown, className = '', setCount,
}: MDCardProps) {
  const [showTip, setShowTip] = useState(false);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const w = size === 'sm' ? 58 : 80;
  const h = size === 'sm' ? 82 : 112;
  const fs = size === 'sm' ? 8 : 10;

  if (faceDown) {
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{
          width: w, height: h, borderRadius: 7, flexShrink: 0,
          background: 'repeating-linear-gradient(45deg,#1e3a5f,#1e3a5f 4px,#0f2744 4px,#0f2744 8px)',
          border: '2px solid #334155', cursor: onClick ? 'pointer' : 'default',
        }}
        whileHover={onClick ? { scale: 1.06 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        onClick={onClick}
      />
    );
  }

  const baseStyle: React.CSSProperties = {
    width: w, height: h, borderRadius: 7, flexShrink: 0,
    display: 'flex', flexDirection: 'column',
    border: selected ? '2.5px solid #facc15' : '1.5px solid rgba(255,255,255,0.12)',
    cursor: onClick && !disabled ? 'pointer' : disabled ? 'not-allowed' : 'default',
    opacity: disabled ? 0.5 : 1,
    overflow: 'hidden',
    boxShadow: selected
      ? '0 0 0 3px rgba(250,204,21,0.4), 0 6px 20px rgba(0,0,0,0.5)'
      : '0 3px 10px rgba(0,0,0,0.35)',
    position: 'relative',
    transition: 'border-color 0.15s',
  };

  const handleClick = disabled ? undefined : onClick;

  // ── Billet ──────────────────────────────────────────────────────────────────

  if (card.type === 'money') {
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{
          ...baseStyle,
          background: 'linear-gradient(145deg,#15803d,#14532d)',
          alignItems: 'center', justifyContent: 'center',
        }}
        whileHover={onClick && !disabled ? { scale: 1.12, y: -8 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.96 } : {}}
        onClick={handleClick}
      >
        {/* Cadre décoratif */}
        <div style={{
          position: 'absolute', inset: 3,
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5,
          pointerEvents: 'none',
        }} />
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ color: '#86efac', fontSize: fs - 1, fontWeight: 700, letterSpacing: 1 }}>$</div>
          <div style={{ color: 'white', fontSize: size === 'sm' ? 22 : 30, fontWeight: 900, lineHeight: 1 }}>
            {card.denomination}
          </div>
          <div style={{ color: '#86efac', fontSize: fs - 1, fontWeight: 700, marginTop: 1 }}>MILLION</div>
        </div>
      </motion.div>
    );
  }

  // ── Propriété ────────────────────────────────────────────────────────────────

  if (card.type === 'property' && card.color) {
    const hasSetInfo = setCount !== undefined;
    const total = SET_SIZES[card.color];
    const current = setCount ?? 0;
    const isFull = current >= total;
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{ ...baseStyle, background: '#f8fafc' }}
        whileHover={onClick && !disabled ? { scale: 1.12, y: -8 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.96 } : {}}
        onClick={handleClick}
      >
        <ColorStrip color={card.color} height={size === 'sm' ? 14 : 20} />
        {/* Badge set progress */}
        {hasSetInfo && (
          <div style={{
            position: 'absolute', top: size === 'sm' ? 16 : 22, right: 3,
            background: isFull ? '#16a34a' : 'rgba(0,0,0,0.55)',
            color: 'white', fontSize: 7, fontWeight: 800,
            padding: '1px 4px', borderRadius: 4, lineHeight: 1.4,
            border: isFull ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.2)',
          }}>
            {current}/{total}
          </div>
        )}
        <div style={{ flex: 1, padding: '3px 4px 3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: fs - 1, color: '#1e293b', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}>
            {card.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: fs + 2, color: COLOR_BG[card.color], fontWeight: 900 }}>
              ${card.value}M
            </div>
            <div style={{ fontSize: 7, color: '#64748b', fontWeight: 600 }}>
              set&nbsp;{total}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Joker propriété ───────────────────────────────────────────────────────

  if (card.type === 'wildProperty' && card.wildColors) {
    const colors = card.wildColors;
    const isRainbow = colors.length >= 3;
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{ ...baseStyle, background: '#0f172a' }}
        whileHover={onClick && !disabled ? { scale: 1.12, y: -8 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.96 } : {}}
        onClick={handleClick}
      >
        {/* Bandes de couleur */}
        <div style={{ display: 'flex', height: size === 'sm' ? '38%' : '40%', flexShrink: 0, borderRadius: '5px 5px 0 0', overflow: 'hidden' }}>
          {colors.slice(0, 4).map((c, i) => (
            <div key={i} style={{ flex: 1, background: COLOR_BG[c] }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: '3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: fs - 1, color: 'white', fontWeight: 800, textAlign: 'center' }}>
            {isRainbow ? '🌈' : '🃏'} Joker
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {colors.map((c) => (
              <span key={c} style={{
                fontSize: fs - 3, padding: '1px 3px', borderRadius: 3,
                background: COLOR_BG[c], color: 'white', fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                {COLOR_LABEL[c]}
              </span>
            ))}
          </div>
          <div style={{ fontSize: fs, color: '#94a3b8', textAlign: 'center' }}>${card.value}M</div>
        </div>
      </motion.div>
    );
  }

  // ── Carte action ──────────────────────────────────────────────────────────

  const action = card.action ?? 'rent';
  const bg = ACTION_BG[action] ?? ACTION_BG.rent;
  const desc = ACTION_DESCRIPTIONS[action as keyof typeof ACTION_DESCRIPTIONS];

  const handleEnter = () => {
    if (!desc || !wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    setTipPos({ x: r.left + r.width / 2, y: r.top });
    setShowTip(true);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flexShrink: 0 }}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShowTip(false)}
    >
      <motion.div
        className={`md-card ${className}`}
        style={{
          ...baseStyle,
          background: bg,
          alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 4px',
          textAlign: 'center',
        }}
        whileHover={onClick && !disabled ? { scale: 1.12, y: -8 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.96 } : {}}
        onClick={handleClick}
      >
        {/* Bouton ⓘ mobile (arrête la propagation) */}
        {desc && (
          <button
            style={{
              position: 'absolute', top: 3, right: 3,
              width: 14, height: 14, borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)', border: 'none',
              color: 'white', fontSize: 8, fontWeight: 900,
              cursor: 'pointer', lineHeight: 1, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={(e) => { e.stopPropagation(); setShowTip(t => !t); }}
            aria-label="Info"
          >
            i
          </button>
        )}

        <div style={{ fontSize: fs - 2, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: 0.5 }}>
          ACTION
        </div>
        <div style={{ fontSize: fs + 1, color: 'white', fontWeight: 900, lineHeight: 1.15, padding: '0 2px' }}>
          {card.name}
        </div>

        {card.rentColors && (
          <div style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            {card.rentColors.map((c) => (
              <div key={c} style={{
                width: 9, height: 9, borderRadius: '50%',
                background: COLOR_BG[c],
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }} />
            ))}
          </div>
        )}

        <div style={{ fontSize: fs - 1, color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
          ${card.value}M
        </div>
      </motion.div>

      {/* Tooltip description */}
      <AnimatePresence>
        {showTip && desc && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              left: tipPos.x,
              top: tipPos.y - 8,
              transform: 'translateX(-50%) translateY(-100%)',
              background: '#0f172a', color: '#e2e8f0',
              fontSize: 10, lineHeight: 1.4,
              padding: '6px 10px', borderRadius: 8,
              zIndex: 9999, width: 160, textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.12)',
              pointerEvents: 'none',
              whiteSpace: 'normal',
            }}
          >
            {desc}
            {/* Flèche */}
            <div style={{
              position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
              borderTop: '5px solid #0f172a',
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
