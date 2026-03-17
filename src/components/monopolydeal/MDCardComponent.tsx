import { motion } from 'framer-motion';
import { MDCard, COLOR_BG, COLOR_LABELS } from '../../lib/monopolyDealLogic';

interface MDCardProps {
  card: MDCard;
  size?: 'sm' | 'md' | 'lg';
  playable?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

const SIZE_MAP = {
  sm: { w: 44, h: 62, fontSize: 8, valueFontSize: 10 },
  md: { w: 60, h: 84, fontSize: 10, valueFontSize: 12 },
  lg: { w: 80, h: 112, fontSize: 12, valueFontSize: 14 },
};

const ACTION_EMOJI: Record<string, string> = {
  debt_collector: '💰',
  birthday: '🎂',
  deal_breaker: '💣',
  forced_deal: '🔄',
  sly_deal: '🥷',
  rent: '🏠',
  wild_rent: '🌍',
  double_rent: '×2',
  just_say_no: '🚫',
};

function MoneyCard({ card, dim }: { card: MDCard; dim: typeof SIZE_MAP['md'] }) {
  return (
    <div
      style={{
        width: dim.w,
        height: dim.h,
        background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        border: '2px solid #a16207',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Corner value */}
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 3,
          fontSize: dim.valueFontSize - 2,
          fontWeight: 700,
          color: '#fde68a',
          lineHeight: 1,
        }}
      >
        ${card.denomination}
      </span>
      <span
        style={{
          position: 'absolute',
          bottom: 2,
          right: 3,
          fontSize: dim.valueFontSize - 2,
          fontWeight: 700,
          color: '#fde68a',
          lineHeight: 1,
          transform: 'rotate(180deg)',
        }}
      >
        ${card.denomination}
      </span>
      {/* Center amount */}
      <span
        style={{
          fontSize: dim.h * 0.28,
          fontWeight: 900,
          color: '#fde68a',
          lineHeight: 1,
        }}
      >
        ${card.denomination}
      </span>
      <span
        style={{
          fontSize: dim.fontSize - 1,
          color: '#86efac',
          fontWeight: 600,
          marginTop: 1,
        }}
      >
        millions
      </span>
    </div>
  );
}

function PropertyCard({ card, dim }: { card: MDCard; dim: typeof SIZE_MAP['md'] }) {
  const bg = card.color ? COLOR_BG[card.color] : '#6b7280';
  const label = card.color ? COLOR_LABELS[card.color] : '';

  return (
    <div
      style={{
        width: dim.w,
        height: dim.h,
        background: bg,
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Color label strip at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.35)',
          fontSize: dim.fontSize - 2,
          color: '#fff',
          fontWeight: 700,
          textAlign: 'center',
          padding: '1px 2px',
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
      {/* Property name */}
      <span
        style={{
          fontSize: dim.fontSize,
          fontWeight: 700,
          color: '#fff',
          textAlign: 'center',
          padding: '0 3px',
          lineHeight: 1.2,
          textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          marginTop: 4,
          wordBreak: 'break-word',
        }}
      >
        {card.name}
      </span>
      {/* Value bottom corner */}
      <span
        style={{
          position: 'absolute',
          bottom: 2,
          right: 3,
          fontSize: dim.valueFontSize - 2,
          fontWeight: 700,
          color: '#fde68a',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 3,
          padding: '0 2px',
        }}
      >
        ${card.value}M
      </span>
    </div>
  );
}

function WildPropertyCard({ card, dim }: { card: MDCard; dim: typeof SIZE_MAP['md'] }) {
  let background: string;

  if (card.isRainbow || !card.wildColors || card.wildColors.length === 0) {
    background = 'linear-gradient(135deg, #ef4444 0%, #f97316 15%, #eab308 30%, #22c55e 50%, #38bdf8 65%, #6366f1 80%, #a855f7 100%)';
  } else if (card.wildColors.length >= 2) {
    const c1 = COLOR_BG[card.wildColors[0]];
    const c2 = COLOR_BG[card.wildColors[1]];
    background = `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
  } else {
    background = COLOR_BG[card.wildColors[0]];
  }

  return (
    <div
      style={{
        width: dim.w,
        height: dim.h,
        background,
        border: '2px solid rgba(255,255,255,0.5)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* JOKER label */}
      <div
        style={{
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 4,
          padding: '1px 4px',
          fontSize: dim.fontSize - 1,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: 1,
        }}
      >
        JOKER
      </div>
      {/* Color options */}
      {!card.isRainbow && card.wildColors && card.wildColors.length > 0 && (
        <div style={{ display: 'flex', gap: 2, marginTop: 3 }}>
          {card.wildColors.map((c) => (
            <div
              key={c}
              style={{
                width: dim.w * 0.18,
                height: dim.w * 0.18,
                borderRadius: '50%',
                background: COLOR_BG[c],
                border: '1px solid rgba(255,255,255,0.6)',
              }}
            />
          ))}
        </div>
      )}
      {card.isRainbow && (
        <span style={{ fontSize: dim.fontSize - 2, color: '#fff', marginTop: 2 }}>★</span>
      )}
      {/* Value */}
      <span
        style={{
          position: 'absolute',
          bottom: 2,
          right: 3,
          fontSize: dim.valueFontSize - 2,
          fontWeight: 700,
          color: '#fde68a',
          background: 'rgba(0,0,0,0.4)',
          borderRadius: 3,
          padding: '0 2px',
        }}
      >
        ${card.value}M
      </span>
    </div>
  );
}

function ActionCard({ card, dim }: { card: MDCard; dim: typeof SIZE_MAP['md'] }) {
  const emoji = card.action ? ACTION_EMOJI[card.action] ?? '⚡' : '⚡';
  const isDoubleRent = card.action === 'double_rent';

  return (
    <div
      style={{
        width: dim.w,
        height: dim.h,
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        border: '2px solid rgba(167,139,250,0.4)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #a78bfa, #818cf8)',
        }}
      />
      {/* Emoji */}
      <span style={{ fontSize: isDoubleRent ? dim.h * 0.22 : dim.h * 0.25, lineHeight: 1 }}>
        {emoji}
      </span>
      {/* Action name */}
      <span
        style={{
          fontSize: dim.fontSize - 1,
          fontWeight: 700,
          color: '#e0e7ff',
          textAlign: 'center',
          padding: '0 3px',
          lineHeight: 1.2,
          marginTop: 2,
        }}
      >
        {card.label}
      </span>
      {/* Value corner */}
      <span
        style={{
          position: 'absolute',
          top: 4,
          right: 3,
          fontSize: dim.valueFontSize - 2,
          fontWeight: 700,
          color: '#a78bfa',
        }}
      >
        ${card.value}
      </span>
    </div>
  );
}

export function MDCardComponent({ card, size = 'md', playable, disabled, onClick, selected }: MDCardProps) {
  const dim = SIZE_MAP[size];

  let cardContent: React.ReactNode;
  if (card.type === 'money') {
    cardContent = <MoneyCard card={card} dim={dim} />;
  } else if (card.type === 'property') {
    cardContent = <PropertyCard card={card} dim={dim} />;
  } else if (card.type === 'wildProperty') {
    cardContent = <WildPropertyCard card={card} dim={dim} />;
  } else {
    cardContent = <ActionCard card={card} dim={dim} />;
  }

  return (
    <motion.div
      onClick={!disabled ? onClick : undefined}
      whileHover={playable && !disabled ? { y: -6, scale: 1.05 } : {}}
      whileTap={!disabled && onClick ? { scale: 0.95 } : {}}
      style={{
        display: 'inline-block',
        cursor: disabled ? 'default' : onClick ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        outline: selected ? '2px solid #fbbf24' : 'none',
        outlineOffset: 2,
        borderRadius: 8,
        transition: 'opacity 0.15s',
      }}
    >
      {cardContent}
    </motion.div>
  );
}
