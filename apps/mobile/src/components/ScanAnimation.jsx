import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../lib/utils.js';

const PHASES = {
  scan: { label: 'AI is scanning...', duration: 3000 },
  extract: { label: 'Extracting data...', duration: 3000 },
  complete: { label: 'Manifested! ✅', duration: 1000 },
};

export default function ScanAnimation({
  imageUrl,
  active,
  progress,
  result,
  onPhaseChange,
}) {
  const [phase, setPhase] = useState('idle');
  const [typedStore, setTypedStore] = useState('');
  const [typedAmount, setTypedAmount] = useState('');

  useEffect(() => {
    if (!active) {
      setPhase('idle');
      return undefined;
    }

    setPhase('scan');
    onPhaseChange?.('scan');

    const t1 = setTimeout(() => {
      setPhase('extract');
      onPhaseChange?.('extract');
    }, PHASES.scan.duration);

    const t2 = setTimeout(() => {
      setPhase('complete');
      onPhaseChange?.('complete');
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#FF8C42', '#38B000', '#FFD700'],
      });
    }, PHASES.scan.duration + PHASES.extract.duration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, onPhaseChange]);

  useEffect(() => {
    if (phase !== 'extract') return undefined;

    const store = result?.store_name || 'Unknown Store';
    const amount = result?.total_amount != null ? formatCurrency(result.total_amount) : '$0.00';

    let i = 0;
    let j = 0;
    setTypedStore('');
    setTypedAmount('');

    const storeTimer = setInterval(() => {
      i += 1;
      setTypedStore(store.slice(0, i));
      if (i >= store.length) clearInterval(storeTimer);
    }, 40);

    const amountTimer = setInterval(() => {
      j += 1;
      setTypedAmount(amount.slice(0, j));
      if (j >= amount.length) clearInterval(amountTimer);
    }, 30);

    return () => {
      clearInterval(storeTimer);
      clearInterval(amountTimer);
    };
  }, [phase, result]);

  if (!active && phase === 'idle') return null;

  const message = progress?.message || PHASES[phase]?.label || 'Processing...';

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-black/5 dark:bg-white/5">
        {imageUrl && (
          <img src={imageUrl} alt="Receipt preview" className="w-full h-full object-cover" />
        )}

        <AnimatePresence>
          {(phase === 'scan' || phase === 'extract') && (
            <motion.div
              key="scan-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20"
            />
          )}
        </AnimatePresence>

        {phase === 'scan' && (
          <motion.div
            className="absolute left-0 right-0 h-1 bg-secondary"
            style={{ boxShadow: '0 0 20px 4px rgba(56, 176, 0, 0.8), 0 0 40px 8px rgba(56, 176, 0, 0.4)' }}
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
          />
        )}

        {phase === 'extract' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20, x: -20 }}
              animate={{ opacity: 1, y: -60, x: 20 }}
              className="absolute bottom-1/3 left-4 glass-card rounded-xl px-3 py-2 text-sm font-medium shadow-lg"
            >
              {typedStore || '...'}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20, x: 20 }}
              animate={{ opacity: 1, y: -100, x: -10 }}
              className="absolute bottom-1/3 right-4 glass-card rounded-xl px-3 py-2 text-lg font-display font-bold text-accent shadow-lg"
            >
              {typedAmount || '...'}
            </motion.div>
          </>
        )}
      </div>

      <div className="text-center space-y-2">
        <motion.p
          key={message}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display font-semibold text-lg"
        >
          {message}
        </motion.p>

        {progress?.total > 0 && (
          <div className="mx-auto max-w-xs">
            <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
              <motion.div
                className="h-full gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((progress.step || 0) / progress.total) * 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-xs text-ink/50 dark:text-dark-text/50 mt-1">
              Step {progress.step || 0} of {progress.total}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {phase === 'complete' && result && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="glass-card rounded-2xl p-5 gradient-card"
          >
            <p className="font-brand text-2xl text-primary mb-2">Manifested! ✅</p>
            <p className="font-display text-xl font-bold">{result.store_name}</p>
            <p className="text-accent font-display text-2xl font-bold mt-1">
              {formatCurrency(result.total_amount, result.currency)}
            </p>
            {result.category && (
              <p className="text-sm text-ink/60 dark:text-dark-text/60 mt-2">{result.category}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
