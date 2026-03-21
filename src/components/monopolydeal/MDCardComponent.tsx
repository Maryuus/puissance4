import { motion } from 'framer-motion';
import { MDCard, PropertyColor, COLOR_BG, COLOR_LABEL } from '../../lib/monopolyDealLogic';

interface MDCardProps {
  card: MDCard;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  faceDown?: boolean;
  className?: string;
}

const ACTION_BG: Record<string, string> = {
  just_say_no:   'linear-gradient(145deg,#7c3aed,#4c1d95)',
  birthday:      'linear-gradient(145deg,#f472b6,#be185d)',
  debt_collector:'linear-gradient(145deg,#ef4444,#991b1b)',
  deal_breaker:  'linear-gradient(145deg,#1e40af,#1e3a8a)',
  sly_deal:      'linear-gradient(145deg,#0891b2,#0e7490)',
  forced_deal:   'linear-gradient(145deg,#059669,#065f46)',
  rent:          'linear-gradient(145deg,#d97706,#92400e)',
  wild_rent:     'linear-gradient(145deg,#7c3aed,#0891b2)',
  double_rent:   'linear-gradient(145deg,#dc2626,#ea580c)',
};

function ColorStrip({ color }: { color: PropertyColor }) {
  return (
    <div style={{
      height: 14,
      background: COLOR_BG[color],
      borderRadius: '3px 3px 0 0',
      flexShrink: 0,
    }} />
  );
}

export function MDCardComponent({
  card, onClick, selected, disabled, size = 'md', faceDown, className = '',
}: MDCardProps) {
  const w = size === 'sm' ? 52 : 68;
  const h = size === 'sm' ? 76 : 96;
  const fs = size === 'sm' ? 8 : 10;

  if (faceDown) {
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{
          width: w, height: h, borderRadius: 6,
          background: 'linear-gradient(145deg,#1e3a5f,#0f172a)',
          border: '2px solid #334155', cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
        }}
        whileHover={onClick ? { scale: 1.06 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        onClick={onClick}
      />
    );
  }

  const baseStyle: React.CSSProperties = {
    width: w, height: h, borderRadius: 6, flexShrink: 0,
    display: 'flex', flexDirection: 'column',
    border: selected ? '2px solid #facc15' : '1.5px solid rgba(255,255,255,0.15)',
    cursor: onClick && !disabled ? 'pointer' : disabled ? 'not-allowed' : 'default',
    opacity: disabled ? 0.5 : 1,
    overflow: 'hidden',
    boxShadow: selected
      ? '0 0 0 2px #facc15, 0 4px 12px rgba(0,0,0,0.4)'
      : '0 2px 8px rgba(0,0,0,0.3)',
    position: 'relative',
  };

  const handleClick = disabled ? undefined : onClick;

  if (card.type === 'money') {
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{
          ...baseStyle,
          background: 'linear-gradient(145deg,#16a34a,#14532d)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        whileHover={onClick && !disabled ? { scale: 1.1, y: -6 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.95 } : {}}
        onClick={handleClick}
      >
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 4,
          padding: '4px 8px',
          textAlign: 'center',
        }}>
          <div style={{ color: '#bbf7d0', fontSize: fs - 1, fontWeight: 700 }}>$</div>
          <div style={{ color: 'white', fontSize: size === 'sm' ? 14 : 20, fontWeight: 900, lineHeight: 1 }}>
            {card.denomination}
          </div>
          <div style={{ color: '#86efac', fontSize: fs - 2, marginTop: 1 }}>M</div>
        </div>
      </motion.div>
    );
  }

  if (card.type === 'property' && card.color) {
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{ ...baseStyle, background: '#f8fafc' }}
        whileHover={onClick && !disabled ? { scale: 1.1, y: -6 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.95 } : {}}
        onClick={handleClick}
      >
        <ColorStrip color={card.color} />
        <div style={{ flex: 1, padding: '2px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: fs - 1, color: '#1e293b', fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-word' }}>
            {card.name}
          </div>
          <div style={{ fontSize: fs + 2, color: COLOR_BG[card.color], fontWeight: 900 }}>
            ${card.value}M
          </div>
        </div>
      </motion.div>
    );
  }

  if (card.type === 'wildProperty' && card.wildColors) {
    const colors = card.wildColors;
    return (
      <motion.div
        className={`md-card ${className}`}
        style={{ ...baseStyle, overflow: 'hidden', background: '#1e293b' }}
        whileHover={onClick && !disabled ? { scale: 1.1, y: -6 } : {}}
        whileTap={onClick && !disabled ? { scale: 0.95 } : {}}
        onClick={handleClick}
      >
        {/* Color stripes */}
        <div style={{ display: 'flex', height: '40%', flexShrink: 0 }}>
          {colors.slice(0, 3).map((c, i) => (
            <div key={i} style={{ flex: 1, background: COLOR_BG[c] }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: '2px 3px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: fs - 2, color: 'white', fontWeight: 700 }}>
            Joker
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {colors.map((c) => (
              <span key={c} style={{
                fontSize: fs - 3, padding: '0 2px', borderRadius: 2,
                background: COLOR_BG[c], color: 'white', fontWeight: 600,
              }}>
                {COLOR_LABEL[c]}
              </span>
            ))}
          </div>
          <div style={{ fontSize: fs - 1, color: '#94a3b8' }}>${card.value}M</div>
        </div>
      </motion.div>
    );
  }

  // action
  const action = card.action ?? 'rent';
  const bg = ACTION_BG[action] ?? ACTION_BG.rent;
  return (
    <motion.div
      className={`md-card ${className}`}
      style={{
        ...baseStyle,
        background: bg,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px',
        textAlign: 'center',
      }}
      whileHover={onClick && !disabled ? { scale: 1.1, y: -6 } : {}}
      whileTap={onClick && !disabled ? { scale: 0.95 } : {}}
      onClick={handleClick}
    >
      <div style={{ fontSize: fs - 1, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
        ACTION
      </div>
      <div style={{ fontSize: fs, color: 'white', fontWeight: 900, lineHeight: 1.2 }}>
        {card.name}
      </div>
      {card.rentColors && (
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {card.rentColors.map((c) => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_BG[c] }} />
          ))}
        </div>
      )}
      <div style={{ fontSize: fs - 1, color: 'rgba(255,255,255,0.8)' }}>${card.value}M</div>
    </motion.div>
  );
}
