'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HandwrittenLoaderProps {
  onComplete: () => void;
}

export const HandwrittenLoader: React.FC<HandwrittenLoaderProps> = ({ onComplete }) => {
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 700);
    const t3 = setTimeout(() => setStage(3), 1400);
    const t4 = setTimeout(() => {
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white select-none overflow-hidden"
    >
      <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
        {/* SVG Animated Logo Container - Perfectly Aligned */}
        <div className="relative flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 320 220"
            className="w-72 sm:w-80 md:w-96 h-auto overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* EXAM Text - Left aligned at x=25 */}
            <motion.text
              x="25"
              y="75"
              fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
              fontWeight="900"
              fontSize="70"
              fill="white"
              letterSpacing="3"
              initial={{ opacity: 0, y: -8 }}
              animate={stage >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              EXAM
            </motion.text>

            {/* Underline 1 under EXAM (x=25 to x=195) */}
            <motion.path
              d="M 25 90 Q 110 87 195 89"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={stage >= 1 ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
            />

            {/* MATE Text - Left aligned at x=25 (matches EXAM) */}
            <motion.text
              x="25"
              y="165"
              fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
              fontWeight="900"
              fontSize="70"
              fill="white"
              letterSpacing="3"
              initial={{ opacity: 0, y: 8 }}
              animate={stage >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              MATE
            </motion.text>

            {/* Underline 2 under MATE (x=25 to x=295) */}
            <motion.path
              d="M 25 180 Q 160 177 295 179"
              stroke="white"
              strokeWidth="6"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={stage >= 2 ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
            />
          </svg>
        </div>

        {/* Tagline - Centered & Crisp Typography */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={stage >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.4 }}
          className="text-xs sm:text-sm font-mono font-semibold tracking-[0.2em] text-neutral-400 uppercase mt-4 text-center"
        >
          NEVER ASK &quot;WHEN&apos;S THE EXAM?&quot; AGAIN.
        </motion.p>
      </div>
    </motion.div>
  );
};
