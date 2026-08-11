'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, ChevronRight } from 'lucide-react';
import { Exam } from '@/types/exam';
import { Badge } from '@/components/ui/Badge';

interface ExamCardProps {
  exam: Exam;
  daysLeft: number;
  onSelect: (exam: Exam) => void;
  index?: number;
}

export const ExamCard: React.FC<ExamCardProps> = ({ exam, daysLeft, onSelect, index = 0 }) => {
  const accentClasses = {
    blue: 'text-blue-400 group-hover:text-blue-300',
    amber: 'text-amber-400 group-hover:text-amber-300',
    emerald: 'text-emerald-400 group-hover:text-emerald-300',
    purple: 'text-purple-400 group-hover:text-purple-300',
    red: 'text-red-400 group-hover:text-red-300',
    cyan: 'text-cyan-400 group-hover:text-cyan-300',
  };

  const accentColor = exam.accentColor || 'blue';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.08 }}
      whileHover={{ y: -3, scale: 1.01 }}
      onClick={() => onSelect(exam)}
      className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div>
        {/* Top Header: Badge & Date */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant={accentColor as any}>{exam.examType}</Badge>
          <span className="text-xs font-mono text-neutral-400 bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
            {new Date(exam.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }).toUpperCase()}
          </span>
        </div>

        {/* Subject Title & Code */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white tracking-tight group-hover:text-neutral-100 transition-colors">
            {exam.subject}
          </h3>
          <p className="text-xs font-mono text-neutral-400">{exam.courseCode}</p>
        </div>
      </div>

      {/* Countdown & Info */}
      <div className="pt-3 border-t border-neutral-900">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-black font-mono tabular-nums ${accentClasses[accentColor]}`}>
              {daysLeft < 10 ? `0${daysLeft}` : daysLeft}
            </span>
            <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase">
              days left
            </span>
          </div>

          <ChevronRight size={16} className="text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-neutral-500" />
            {exam.startTime}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-neutral-500" />
            {exam.venue}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
