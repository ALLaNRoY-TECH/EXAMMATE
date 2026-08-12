'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, ArrowRight, Users } from 'lucide-react';
import { ExamWithGroup } from '@/context/ExamContext';
import { Badge } from '@/components/ui/Badge';

interface CalendarViewProps {
  exams: ExamWithGroup[];
  onSelectExam: (exam: ExamWithGroup) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ exams, onSelectExam }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState<{ year: number; month: number }>({
    year: today.getFullYear(),
    month: today.getMonth(), // 0-indexed
  });

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  const monthShortNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // Dynamic calculation of days in month & starting weekday
  const daysInMonth = new Date(currentDate.year, currentDate.month + 1, 0).getDate();
  const startDayOfWeek = new Date(currentDate.year, currentDate.month, 1).getDay();

  // Helper for formatting YYYY-MM-DD
  const formatYearMonthDay = (day: number) => {
    const m = (currentDate.month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${currentDate.year}-${m}-${d}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(formatYearMonthDay(today.getDate()));

  // Map exams by date YYYY-MM-DD
  const examMap = new Map<string, ExamWithGroup[]>();
  exams.forEach((exam) => {
    const list = examMap.get(exam.date) || [];
    list.push(exam);
    examMap.set(exam.date, list);
  });

  const examsOnSelectedDate = examMap.get(selectedDate) || [];
  const selectedExam = examsOnSelectedDate[0] || null;

  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  };

  const monthlyExamsCount = exams.filter((e) => {
    if (!e.date) return false;
    const parts = e.date.split('-');
    if (parts.length !== 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    return y === currentDate.year && m === currentDate.month;
  }).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="text-white" size={22} />
            {monthNames[currentDate.month]} {currentDate.year}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            {monthlyExamsCount} {monthlyExamsCount === 1 ? 'exam' : 'exams'} scheduled across your groups this month
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer"
            onClick={handlePrevMonth}
          >
            <ChevronLeft size={14} />
            PREV
          </button>
          <span className="text-xs font-mono text-neutral-400 font-bold px-2">
            {monthShortNames[currentDate.month]}
          </span>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors text-xs font-mono flex items-center gap-1 cursor-pointer"
            onClick={handleNextMonth}
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
          const dateStr = formatYearMonthDay(dayNumber);
          const dayExams = examMap.get(dateStr) || [];
          const hasExam = dayExams.length > 0;
          const isSelected = selectedDate === dateStr;
          const examOnDay = dayExams[0];

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
              {/* Animated Selected Background Border */}
              {isSelected && (
                <motion.div
                  layoutId="selectedCalendarDay"
                  className="absolute inset-0 rounded-xl border-2 border-white pointer-events-none"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Day Number & Indicator */}
              <div className="w-full flex items-center justify-between">
                <span
                  className={`font-mono text-sm md:text-base font-bold ${
                    isSelected ? 'text-white' : hasExam ? 'text-neutral-100' : 'text-neutral-500'
                  }`}
                >
                  {dayNumber < 10 ? `0${dayNumber}` : dayNumber}
                </span>

                {/* Exam Indicator */}
                {hasExam && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                )}
              </div>

              {/* Mini Exam Badge for Cell */}
              {hasExam && (
                <div className="w-full truncate text-[10px] font-mono font-semibold text-neutral-300 bg-neutral-900/90 px-1 py-0.5 rounded border border-neutral-800 flex items-center gap-1">
                  <span className="truncate">{examOnDay.subject}</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Day Drawer Panel */}
      <div className="pt-4">
        <AnimatePresence mode="wait">
          {examsOnSelectedDate.length > 0 ? (
            <div className="space-y-3">
              {examsOnSelectedDate.map((exam) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  onClick={() => onSelectExam(exam)}
                  className="p-5 md:p-6 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">
                          EXAM SCHEDULED
                        </span>
                        <Badge variant={exam.accentColor || 'blue'}>{exam.examType}</Badge>
                        {exam.groupName && (
                          <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30 flex items-center gap-1">
                            <Users size={12} />
                            {exam.groupName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-extrabold text-white">{exam.subject}</h3>
                      <p className="text-xs font-mono text-neutral-400">{exam.courseCode}</p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="flex items-center gap-2 text-sm text-neutral-300 font-mono">
                        <Clock size={16} className="text-neutral-500" />
                        <span>{exam.startTime} – {exam.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-400">
                        <MapPin size={16} className="text-neutral-500" />
                        <span>{exam.venue}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-sm font-semibold text-white group-hover:translate-x-1 transition-transform self-end sm:self-center">
                      <span>View Full Portion</span>
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
