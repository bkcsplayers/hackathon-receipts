import { Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BrandLogo({ size = 'lg', spinning = false }) {
  const sizes = {
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
  };

  return (
    <motion.div
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
      className={`${sizes[size]} rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/30`}
    >
      <Receipt className="h-1/2 w-1/2 text-white" strokeWidth={2.2} />
    </motion.div>
  );
}
