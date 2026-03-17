import { motion, AnimatePresence } from 'framer-motion';
import { UnoCard, UNO_COLORS } from '../../lib/unoLogic';

interface UnoColorPickerProps {
  card: UnoCard;
  onSelect: (color: string) => void;
  onCancel: () => void;
}

export function UnoColorPicker({ card, onSelect, onCancel }: UnoColorPickerProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="uno-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      >
        <motion.div
          className="uno-color-picker"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold mb-3 text-center" style={{ color: 'var(--text-secondary)' }}>
            {card.value === 'wild4' ? 'Wild +4 — ' : 'Wild — '}Choisir une couleur
          </p>
          <div className="uno-color-grid">
            {UNO_COLORS.map((c) => (
              <motion.button
                key={c.value}
                className="uno-color-btn"
                style={{ background: c.bg }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect(c.value)}
              >
                <span className="sr-only">{c.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
