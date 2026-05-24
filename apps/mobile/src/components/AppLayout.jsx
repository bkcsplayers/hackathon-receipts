import { motion } from 'framer-motion';
import LanguageToggle from './LanguageToggle.jsx';

export default function AppLayout({ children, showNav = true, showLangToggle = true, className = '' }) {
  return (
    <div className={`min-h-dvh max-w-md mx-auto relative ${className}`}>
      {showLangToggle && (
        <div className="sticky top-0 z-40 flex justify-end px-5 pt-3 pb-1 pointer-events-none">
          <div className="pointer-events-auto">
            <LanguageToggle />
          </div>
        </div>
      )}
      <motion.main
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={showNav ? 'pb-28' : ''}
      >
        {children}
      </motion.main>
    </div>
  );
}
