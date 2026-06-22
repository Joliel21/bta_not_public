import { motion } from "motion/react";
import { MagazineCover } from "./MagazineCover";

interface FirstOpenAnimationProps {
  coverImageUrl: string;
  onComplete: () => void;
  width?: number;
  height?: number;
}

export function FirstOpenAnimation({ 
  onComplete,
  width = 480,
  height = 660
}: FirstOpenAnimationProps) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    setTimeout(onComplete, 100);
    return null;
  }
  
  const paperColor = '#F5F2EA';

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ perspective: '2000px' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="relative"
        initial={{ scale: 1, rotateY: 0, x: 0 }}
        animate={{ scale: 1, rotateY: -90, x: width / 2 }}
        transition={{ duration: 1, ease: [0.19, 1.0, 0.22, 1.0] }}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transformStyle: 'preserve-3d',
          transformOrigin: 'left center'
        }}
      >
        <div 
          className="relative w-full h-full shadow-2xl overflow-hidden"
          style={{ backgroundColor: paperColor }}
        >
             <MagazineCover />
             
            {/* Gloss/Highlight overlay for realism during turn */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
                    mixBlendMode: 'overlay'
                }}
            />
        </div>
      </motion.div>
    </motion.div>
  );
}