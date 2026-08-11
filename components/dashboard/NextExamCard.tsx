'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronRight, Sparkles } from 'lucide-react';
import { Exam } from '@/types/exam';
import { Badge } from '@/components/ui/Badge';

interface NextExamCardProps {
  exam: Exam;
  onSelect: (exam: Exam) => void;
}

export const NextExamCard: React.FC<NextExamCardProps> = ({ exam, onSelect }) => {
  // Calculate days remaining dynamically or mock
  const daysLeft = 9; // For FLA August 20, 2026

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ y: -3 }}
      onClick={() => onSelect(exam)}
      className="relative overflow-hidden rounded-3xl bg-neutral-950 border border-neutral-800 p-6 md:p-8 cursor-pointer group shadow-2xl transition-shadow hover:shadow-glow"
    >
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Top Header Tag & Badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping" />
          <span className="text-xs font-mono font-semibold tracking-wider text-neutral-400 uppercase">
            NEXT EXAM
          </span>
        </div>
        <Badge variant="blue" size="md">
          {exam.examType}
        </Badge>
      </div>

      {/* Main Grid: Subject & Giant Display Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Subject Details (Left 7 Cols) */}
        <div className="md:col-span-7 space-y-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {exam.subject}
            </h2>
            <span className="text-sm font-mono text-neutral-500 border border-neutral-800 px-2 py-0.5 rounded">
              {exam.courseCode}
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <CalendarIcon size={16} className="text-neutral-500 shrink-0" />
              <span className="font-semibold text-white">20 AUGUST 2026</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <Clock size={16} className="text-neutral-500 shrink-0" />
              <span>{exam.startTime} — {exam.endTime}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <MapPin size={16} className="text-neutral-500 shrink-0" />
              <span>{exam.venue} · <strong className="text-neutral-300 font-normal">{exam.mode}</strong></span>
            </div>
          </div>
        </div>

        {/* Giant Number Countdown Display (Right 5 Cols) */}
        <div className="md:col-span-5 flex flex-col items-start md:items-end justify-center pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-neutral-800/80 md:pl-8">
          <div className="flex items-baseline gap-2">
            {/* The Huge Display Digits with Vibrant Blue Accent */}
            <span className="text-6xl md:text-7xl font-black tracking-tighter text-blue-500 tabular-nums drop-shadow-md">
              0{daysLeft}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-400 uppercase">
                DAYS
              </span>
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-500 uppercase">
                LEFT
              </span>
            </div>
          </div>
          <span className="text-[11px] text-neutral-500 mt-2 font-mono">
            Prep Status: On Track
          </span>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-6 pt-4 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
        <span>Click for portions, pattern & weightage</span>
        <div className="flex items-center gap-1 font-medium text-white group-hover:translate-x-1 transition-transform">
          <span>View Details</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </motion.div>
  );
};
