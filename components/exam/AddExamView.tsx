'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Loader2, CheckCircle2, Calendar, Clock, MapPin, BookOpen, Layers, FileText, AlertCircle } from 'lucide-react';
import { Exam, ExamType, ExamMode } from '@/types/exam';
import { Button } from '@/components/ui/Button';
import { useExam } from '@/context/ExamContext';

interface AddExamViewProps {
  onSaveExam: (exam: Exam) => void;
}

export const AddExamView: React.FC<AddExamViewProps> = ({ onSaveExam }) => {
  const { createExam } = useExam();
  const [activeTab, setActiveTab] = useState<'paste' | 'manual'>('paste');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Option A: Paste State
  const [pasteText, setPasteText] = useState<string>(
    'Dear students, the FT-1 exam for Formal Language & Automata (21CSC301T) is scheduled on 20th August 2026 from 10:40 AM to 11:30 AM in Classroom 301. Portion will be Unit 1 till NFA DFA Construction. Pattern includes MCQ and Subjective (15 Marks total, converted to 5 marks).'
  );
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseStep, setParseStep] = useState<number>(0);
  const [parsedExam, setParsedExam] = useState<Exam | null>(null);

  // Option B: Form State
  const [subject, setSubject] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [examType, setExamType] = useState<ExamType>('FT-1');
  const [date, setDate] = useState('2026-08-30');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('11:30 AM');
  const [venue, setVenue] = useState('Hall 402');
  const [mode, setMode] = useState<ExamMode>('Physical');
  const [portion, setPortion] = useState('');
  const [pattern, setPattern] = useState('MCQ and Subjective');
  const [marks, setMarks] = useState<number>(20);
  const [conversion, setConversion] = useState('Converted to 10 Marks');

  // Simulate AI Parser
  const handleParse = () => {
    if (!pasteText.trim()) return;

    setIsParsing(true);
    setParseStep(1);

    setTimeout(() => setParseStep(2), 700);
    setTimeout(() => setParseStep(3), 1400);
    setTimeout(() => {
      setIsParsing(false);
      setParsedExam({
        id: `exam-${Date.now()}`,
        subject: 'Formal Language & Automata',
        courseCode: '21CSC301T',
        examType: 'FT-1',
        date: '2026-08-20',
        startTime: '10:40 AM',
        endTime: '11:30 AM',
        venue: 'Classroom 301',
        mode: 'Physical',
        portion: 'Unit 1 — till NFA, DFA Construction',
        pattern: 'MCQ and Subjective',
        marks: 15,
        conversion: 'FT-1 = 5 Marks',
        accentColor: 'blue',
      });
    }, 2100);
  };

  const handleConfirmParsed = async () => {
    if (parsedExam) {
      const { exam } = await createExam(parsedExam);
      onSaveExam(exam || parsedExam);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!subject.trim()) {
      setErrorMsg('Please enter a subject name');
      return;
    }

    setIsSubmitting(true);
    try {
      const { exam, error } = await createExam({
        subject,
        courseCode: courseCode || '21CSC000T',
        examType,
        date,
        startTime,
        endTime,
        venue: venue || 'Classroom',
        mode,
        portion: portion || 'All covered topics',
        pattern,
        marks: Number(marks) || 20,
        conversion: conversion || `${examType} = 10 Marks`,
        accentColor: 'emerald',
      });

      if (error) {
        setErrorMsg(error);
      } else if (exam) {
        onSaveExam(exam);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const examTypeOptions: ExamType[] = ['FT-1', 'FT-2', 'CT-1', 'CT-2', 'End Semester', 'Practical', 'Other'];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Add Exam</h1>
        <p className="text-xs font-mono text-neutral-400 mt-1">
          Choose your preferred method to add upcoming exams to ExamMate.
        </p>
      </div>

      {/* Tab Selector */}
      <div className="flex items-center p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800">
        <button
          onClick={() => setActiveTab('paste')}
          className={`relative flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'paste' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          {activeTab === 'paste' && (
            <motion.div
              layoutId="activeAddTab"
              className="absolute inset-0 bg-neutral-900 border border-neutral-700/80 rounded-xl"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <FileText size={16} className={activeTab === 'paste' ? 'text-blue-400 relative z-10' : 'relative z-10'} />
          <span className="relative z-10">Option A · AI Announcement Parser</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`relative flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'manual' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          {activeTab === 'manual' && (
            <motion.div
              layoutId="activeAddTab"
              className="absolute inset-0 bg-neutral-900 border border-neutral-700/80 rounded-xl"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <Edit3 size={16} className="relative z-10" />
          <span className="relative z-10">Option B · Enter Manually</span>
        </button>
      </div>

      {/* OPTION A: PASTE ANNOUNCEMENT */}
      {activeTab === 'paste' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-6"
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-200">
              Paste Faculty Announcement
            </label>
            <textarea
              rows={5}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste the message from your faculty here..."
              className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-sm leading-relaxed resize-none transition-all font-sans"
            />
            <p className="text-xs text-neutral-500 font-mono flex items-center gap-1">
              <span>Hint: Paste the full WhatsApp or Portal announcement. ExamMate will auto-extract exam dates, syllabus, and timing.</span>
            </p>
          </div>

          {/* Action Trigger */}
          {!parsedExam && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              icon={isParsing ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              onClick={handleParse}
              disabled={isParsing || !pasteText.trim()}
            >
              {isParsing ? 'Parsing Exam Announcement...' : 'Parse Exam'}
            </Button>
          )}

          {/* Parsing Sequence Progress */}
          {isParsing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-2 font-mono text-xs"
            >
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 size={14} className={parseStep >= 1 ? 'text-blue-400' : 'text-neutral-700'} />
                <span>Extracting subject and course code...</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 size={14} className={parseStep >= 2 ? 'text-blue-400' : 'text-neutral-700'} />
                <span>Parsing exam date, time, and venue...</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <CheckCircle2 size={14} className={parseStep >= 3 ? 'text-blue-400' : 'text-neutral-700'} />
                <span>Structuring syllabus portion and weightage...</span>
              </div>
            </motion.div>
          )}

          {/* Extracted Details Preview */}
          <AnimatePresence>
            {parsedExam && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-neutral-900 border border-neutral-700 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    PARSED SUCCESSFULLY
                  </span>
                  <span className="text-xs font-mono text-neutral-400">Review Before Saving</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500 font-mono block">SUBJECT</span>
                    <span className="text-sm font-bold text-white">{parsedExam.subject} ({parsedExam.courseCode})</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 font-mono block">EXAM TYPE & MODE</span>
                    <span className="text-sm font-semibold text-white">{parsedExam.examType} · {parsedExam.mode}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 font-mono block">DATE & TIME</span>
                    <span className="text-sm font-semibold text-white">{parsedExam.date} ({parsedExam.startTime})</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 font-mono block">VENUE</span>
                    <span className="text-sm font-semibold text-white">{parsedExam.venue}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-neutral-500 font-mono text-xs block">SYLLABUS PORTION</span>
                  <p className="text-xs text-neutral-200 font-medium">{parsedExam.portion}</p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-neutral-800">
                  <Button variant="outline" size="md" className="flex-1" onClick={() => setParsedExam(null)}>
                    Re-parse
                  </Button>
                  <Button variant="primary" size="md" className="flex-1" onClick={handleConfirmParsed}>
                    Confirm & Save Exam
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* OPTION B: MANUAL FORM */}
      {activeTab === 'manual' && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleManualSave}
          className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">SUBJECT NAME *</label>
              <input
                type="text"
                required
                placeholder="e.g. Formal Language & Automata"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Course Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">COURSE CODE</label>
              <input
                type="text"
                placeholder="e.g. 21CSC301T"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Exam Type Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-medium text-neutral-300">EXAM TYPE</label>
            <div className="flex flex-wrap gap-2">
              {examTypeOptions.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setExamType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    examType === type
                      ? 'bg-white text-black font-bold border-white shadow-glow'
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">EXAM DATE *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">START TIME</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">END TIME</label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Venue & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">VENUE / ROOM</label>
              <input
                type="text"
                placeholder="e.g. Classroom 301"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">MODE</label>
              <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setMode('Physical')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'Physical' ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-400'
                  }`}
                >
                  Physical
                </button>
                <button
                  type="button"
                  onClick={() => setMode('Online')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'Online' ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-400'
                  }`}
                >
                  Online
                </button>
              </div>
            </div>
          </div>

          {/* Portion & Pattern */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-neutral-300">SYLLABUS PORTION</label>
            <textarea
              rows={3}
              placeholder="e.g. Unit 1 — till NFA, DFA Construction"
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">PATTERN</label>
              <input
                type="text"
                placeholder="e.g. MCQ & Subjective"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">TOTAL MARKS</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">CONVERSION</label>
              <input
                type="text"
                placeholder="e.g. FT-1 = 5 Marks"
                value={conversion}
                onChange={(e) => setConversion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full pt-3"
            disabled={isSubmitting}
            icon={isSubmitting ? <Loader2 size={18} className="animate-spin" /> : undefined}
          >
            {isSubmitting ? 'Saving Exam...' : 'Save Exam'}
          </Button>
        </motion.form>
      )}
    </div>
  );
};
