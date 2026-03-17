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
}

const COLOR_BG: Record<string, string> = {
  red:    'uno-card-red',
  blue:   'uno-card-blue',
  green:  'uno-card-green',
  yellow: 'uno-card-yellow',
  wild:   'uno-card-wild',
};

export function UnoCardComponent({
  card,
  faceDown = false,
  playable = false,
  selected = false,
  onClick,
  size = 'md',
  disabled = false,
}: UnoCardProps) {
  const sizeClass = size === 'sm' ? 'uno-card-sm' : size === 'lg' ? 'uno-card-lg' : 'uno-card-md';

  if (faceDown || !card) {
    return (
      <motion.div
        className={`uno-card uno-card-back ${sizeClass}`}
        whileHover={onClick ? { scale: 1.05 } : {}}
        whileTap={onClick ? { scale: 0.95 } : {}}
        onClick={onClick}
      >
        <div className="uno-card-inner">
          <span className="uno-card-back-logo">UNO</span>
        </div>
      </motion.div>
    );
  }

  const colorClass = COLOR_BG[card.color] ?? 'uno-card-wild';
  const label = CARD_LABEL[card.value];

  return (
    <motion.div
      className={`uno-card ${colorClass} ${sizeClass} ${playable ? 'uno-card-playable' : ''} ${selected ? 'uno-card-selected' : ''} ${disabled ? 'uno-card-disabled' : ''}`}
      whileHover={playable && onClick && !disabled ? { scale: 1.12, y: -8 } : {}}
      whileTap={playable && onClick && !disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      layout
    >
      <div className="uno-card-inner">
        <span className="uno-card-corner uno-card-corner-tl">{label}</span>
        <span className="uno-card-center">{label}</span>
        <span className="uno-card-corner uno-card-corner-br">{label}</span>
      </div>
    </motion.div>
  );
}
