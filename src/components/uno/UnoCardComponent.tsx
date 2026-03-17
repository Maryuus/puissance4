import { motion } from 'framer-motion';
import { UnoCard, CARD_LABEL } from '../../lib/unoLogic';

interface UnoCardProps {
  card?: UnoCard;
  faceDown?: boolean;
  playable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: React.CSSProperties;
}

const COLOR_SOLID: Record<string, { bg: string; dark: string }> = {
  red:    { bg: 'linear-gradient(145deg,#ff6b6b,#c0392b)', dark: '#7b1e1e' },
  blue:   { bg: 'linear-gradient(145deg,#5b9cf6,#1a56d0)', dark: '#0e2e70' },
  green:  { bg: 'linear-gradient(145deg,#4ade80,#16a34a)', dark: '#0d5c2a' },
  yellow: { bg: 'linear-gradient(145deg,#fde047,#ca8a04)', dark: '#6b4600' },
};

function WildCardInner({ value, size }: { value: string; size: string }) {
  const centerSize = size === 'sm' ? '1rem' : size === 'lg' ? '1.75rem' : '1.35rem';
  const cornerSize = size === 'sm' ? '0.55rem' : size === 'lg' ? '0.8rem' : '0.65rem';
  const label = value === 'wild' ? '★' : '+4';
  return (
    <>
      {/* 4-quadrant background */}
      <div className="uno-wild-bg">
        <div className="uno-wild-q uno-wild-q-tl" />
        <div className="uno-wild-q uno-wild-q-tr" />
        <div className="uno-wild-q uno-wild-q-bl" />
        <div className="uno-wild-q uno-wild-q-br" />
      </div>
      {/* Black oval with symbol */}
      <div className="uno-wild-oval">
        <span style={{ fontSize: centerSize, fontWeight: 900, color: 'white', transform: 'rotate(30deg)', display: 'block' }}>
          {label}
        </span>
      </div>
      {/* Corners */}
      <span className="uno-card-corner uno-card-corner-tl" style={{ fontSize: cornerSize, color: 'white', zIndex: 3 }}>{label}</span>
      <span className="uno-card-corner uno-card-corner-br" style={{ fontSize: cornerSize, color: 'white', zIndex: 3 }}>{label}</span>
    </>
  );
}

export function UnoCardComponent({
  card,
  faceDown = false,
  playable = false,
  selected = false,
  onClick,
  size = 'md',
  disabled = false,
  style,
}: UnoCardProps) {
  const sizeClass = size === 'sm' ? 'uno-card-sm' : size === 'lg' ? 'uno-card-lg' : 'uno-card-md';

  if (faceDown || !card) {
    return (
      <motion.div
        className={`uno-card uno-card-back ${sizeClass} ${playable ? 'uno-card-playable' : ''}`}
        style={style}
        whileHover={onClick ? { scale: 1.05 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        onClick={onClick}
      >
        <div className="uno-card-back-inner">
          <div className="uno-card-back-logo">UNO</div>
        </div>
      </motion.div>
    );
  }

  const isWild = card.color === 'wild';
  const label = CARD_LABEL[card.value];
  const colors = !isWild ? COLOR_SOLID[card.color] : null;
  const centerSize = size === 'sm' ? '1.1rem' : size === 'lg' ? '2rem' : '1.6rem';
  const cornerSize = size === 'sm' ? '0.55rem' : size === 'lg' ? '0.82rem' : '0.7rem';

  return (
    <motion.div
      className={`uno-card ${sizeClass} ${playable ? 'uno-card-playable' : ''} ${selected ? 'uno-card-selected' : ''} ${disabled ? 'uno-card-disabled' : ''}`}
      style={style}
      whileHover={playable && onClick && !disabled ? { scale: 1.14, y: -10 } : {}}
      whileTap={playable && onClick && !disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      layout
    >
      {isWild ? (
        <WildCardInner value={card.value} size={size} />
      ) : (
        <div
          className="uno-card-solid-inner"
          style={{ background: colors!.bg }}
        >
          {/* White oval backdrop */}
          <div className="uno-card-oval" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
            <span style={{ fontSize: centerSize, fontWeight: 900, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)', lineHeight: 1 }}>
              {label}
            </span>
          </div>
          <span className="uno-card-corner uno-card-corner-tl" style={{ fontSize: cornerSize }}>{label}</span>
          <span className="uno-card-corner uno-card-corner-br" style={{ fontSize: cornerSize }}>{label}</span>
        </div>
      )}
    </motion.div>
  );
}
