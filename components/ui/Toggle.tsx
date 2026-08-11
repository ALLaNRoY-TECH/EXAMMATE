'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description }) => {
  return (
    <div
      className="flex items-center justify-between py-2 cursor-pointer group select-none"
      onClick={() => onChange(!checked)}
    >
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">{label}</span>}
          {description && <span className="text-xs text-neutral-500">{description}</span>}
        </div>
      )}
      <div
        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
          checked ? 'bg-white' : 'bg-neutral-800'
        }`}
      >
        <motion.div
          className={`w-4 h-4 rounded-full shadow-md ${checked ? 'bg-black' : 'bg-neutral-500'}`}
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          animate={{ x: checked ? 24 : 0 }}
        />
      </div>
    </div>
  );
};
