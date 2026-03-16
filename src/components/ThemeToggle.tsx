import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useGameStore();

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-12 h-6 rounded-full bg-blue-800 dark:bg-blue-700 border border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs"
        animate={{ x: theme === 'dark' ? 2 : 26 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ backgroundColor: theme === 'dark' ? '#1e40af' : '#fbbf24' }}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </motion.div>
    </motion.button>
  );
}
