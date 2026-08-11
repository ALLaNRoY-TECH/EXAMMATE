'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, ArrowRight } from 'lucide-react';
import { Exam } from '@/types/exam';
import { Badge } from '@/components/ui/Badge';

interface CalendarViewProps {
  exams: Exam[];
  onSelectExam: (exam: Exam) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ exams, onSelectExam }) => {
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-20');
  const [currentMonth] = useState({ year: 2026, month: 7 }); // August 2026 (0-indexed: 7)

  const daysInMonth = 31;
  const startDayOfWeek = 6; // Aug 1, 2026 is Saturday (0=Sun, 6=Sat)
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Map exams by date string YYYY-MM-DD
  const examMap = new Map<string, Exam>();
  exams.forEach((exam) => {
    examMap.set(exam.date, exam);
  });

  const selectedExam = examMap.get(selectedDate);

  const getFormattedDateString = (day: number) => {
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    return `2026-08-${formattedDay}`;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="text-white" size={22} />
            AUGUST 2026
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            {exams.length} exams scheduled this month
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer"
            onClick={() => {}}
          >
            <ChevronLeft size={14} />
            PREV
          </button>
          <span className="text-xs font-mono text-neutral-500 px-2">AUG</span>
          <button
            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer"
            onClick={() => {}}
          >
            NEXT
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Grid Header Day Names */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
        {dayNames.map((day) => (
          <div key={day} className="text-[11px] font-mono font-semibold text-neutral-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {/* Empty padding slots for days of previous month */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-16 md:h-20 rounded-xl bg-neutral-950/20 border border-transparent" />
        ))}

        {/* Month Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const dateStr = getFormattedDateString(dayNumber);
          const hasExam = examMap.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const examOnDay = examMap.get(dateStr);

          return (
            <motion.button
              key={dateStr}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSelectedDate(dateStr)}
              className={`relative h-16 md:h-20 rounded-xl p-2 flex flex-col justify-between items-start transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-neutral-900 border-white text-white shadow-glow z-10'
                  : hasExam
                  ? 'bg-neutral-950 border-neutral-700 text-white hover:border-neutral-500'
                  : 'bg-neutral-950/60 border-neutral-900 text-neutral-400 hover:border-neutral-800 hover:bg-neutral-900/50'
              }`}
            >
              {/* Animated Selected Background Glow */}
              {isSelected && (
                <motion.div
                  layoutId="selectedCalendarDay"
                  className="absolute inset-0 rounded-xl border-2 border-white pointer-events-none"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Day Number */}
              <div className="w-full flex items-center justify-between">
                <span
                  className={`font-mono text-sm md:text-base font-bold ${
                    isSelected ? 'text-white' : hasExam ? 'text-neutral-100' : 'text-neutral-500'
                  }`}
                >
                  {dayNumber < 10 ? `0${dayNumber}` : dayNumber}
                </span>

                {/* Exam Dot Indicator */}
                {hasExam && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      examOnDay?.accentColor === 'amber'
                        ? 'bg-amber-400'
                        : examOnDay?.accentColor === 'purple'
                        ? 'bg-purple-400'
                        : 'bg-blue-400'
                    } animate-pulse`}
                  />
                )}
              </div>

              {/* Mini Label for Mobile/Desktop */}
              {hasExam && (
                <div className="w-full truncate text-[10px] font-mono font-semibold text-neutral-300 bg-neutral-900/80 px-1 py-0.5 rounded border border-neutral-800">
                  {examOnDay?.subject}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Animated Selected Day Drawer Panel */}
      <div className="pt-4">
        <AnimatePresence mode="wait">
          {selectedExam ? (
            <motion.div
              key={selectedExam.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={() => onSelectExam(selectedExam)}
              className="p-5 md:p-6 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group shadow-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">
                      EXAM SCHEDULED
                    </span>
                    <Badge variant={selectedExam.accentColor || 'blue'}>{selectedExam.examType}</Badge>
                  </div>
                  <h3 className="text-2xl font-extrabold text-white">{selectedExam.subject}</h3>
                  <p className="text-xs font-mono text-neutral-400">{selectedExam.courseCode}</p>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex items-center gap-2 text-sm text-neutral-300 font-mono">
                    <Clock size={16} className="text-neutral-500" />
                    <span>{selectedExam.startTime} – {selectedExam.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <MapPin size={16} className="text-neutral-500" />
                    <span>{selectedExam.venue}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-sm font-semibold text-white group-hover:translate-x-1 transition-transform self-end sm:self-center">
                  <span>View Full Portion</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty-day"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 text-center rounded-2xl bg-neutral-950/40 border border-neutral-900 text-neutral-500 text-sm font-mono"
            >
              No exams scheduled for {new Date(selectedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
