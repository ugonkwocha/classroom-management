import { motion } from 'framer-motion';
import { clsx } from '@/lib/utils';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  draggable?: boolean;
  onDragStart?: () => void;
}

export function Card({ className, children, draggable = false, onDragStart }: CardProps) {
  if (draggable) {
    return (
      <motion.div
        className={clsx(
          'bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6',
          className
        )}
        drag
        dragElastic={0.2}
        whileDrag={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' }}
        dragTransition={{ power: 0.3, restDelta: 0.001 }}
        onDragStart={onDragStart}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={clsx(
        'bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6',
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
