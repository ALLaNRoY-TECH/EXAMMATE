'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Loader2, CheckCircle2, Calendar, Clock, MapPin, BookOpen, Layers, FileText, AlertCircle, AlertTriangle } from 'lucide-react';
import { Exam, ExamType, ExamMode } from '@/types/exam';
import { Button } from '@/components/ui/Button';
import { useExam, ExamWithGroup } from '@/context/ExamContext';
import { useGroup } from '@/context/GroupContext';

interface AddExamViewProps {
  onSaveExam: (exam: ExamWithGroup) => void;
  examToEdit?: ExamWithGroup | null;
}

export const AddExamView: React.FC<AddExamViewProps> = ({ onSaveExam, examToEdit }) => {
  const { createExam, updateExam, activeGroupExams } = useExam();
  const { activeGroup } = useGroup();

  const [activeTab, setActiveTab] = useState<'paste' | 'manual'>(examToEdit ? 'manual' : 'paste');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // Option A: Paste State
  const [pasteText, setPasteText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseStep, setParseStep] = useState<number>(0);
  const [parsedExam, setParsedExam] = useState<Exam | null>(null);

  // Option B: Form State
  const todayStr = new Date().toISOString().split('T')[0];

  const [subject, setSubject] = useState(examToEdit?.subject || '');
  const [courseCode, setCourseCode] = useState(examToEdit?.courseCode || '');
  const [examType, setExamType] = useState<ExamType>(examToEdit?.examType || 'FT-1');
  const [date, setDate] = useState(examToEdit?.date || todayStr);
  const [startTime, setStartTime] = useState(examToEdit?.startTime || '10:00 AM');
  const [endTime, setEndTime] = useState(examToEdit?.endTime || '11:30 AM');
  const [venue, setVenue] = useState(examToEdit?.venue || 'Classroom 301');
  const [mode, setMode] = useState<ExamMode>(examToEdit?.mode || 'Physical');
  const [portion, setPortion] = useState(examToEdit?.portion || '');
  const [pattern, setPattern] = useState(examToEdit?.pattern || 'MCQ and Subjective');
  const [marks, setMarks] = useState<number>(examToEdit?.marks || 20);
  const [conversion, setConversion] = useState(examToEdit?.conversion || '');

  // Check duplicate exam type within active group
  useEffect(() => {
    if (!examToEdit && activeGroupExams.some((e) => e.examType === examType)) {
      setDuplicateWarning(`Duplicate exam type: ${activeGroup?.name || 'This group'} already has an ${examType} exam.`);
    } else {
      setDuplicateWarning('');
    }
  }, [examType, activeGroupExams, activeGroup?.id, examToEdit]);

  // AI Parser Simulation
  const handleParse = () => {
    if (!pasteText.trim()) return;

    setIsParsing(true);
    setParseStep(1);

    setTimeout(() => setParseStep(2), 700);
    setTimeout(() => setParseStep(3), 1400);
    setTimeout(() => {
      setIsParsing(false);

      // Simple regex extractors or fallback
      const text = pasteText;
      const parsedSubj = text.match(/(?:subject|exam for|in)\s+([A-Za-z\s]+)/i)?.[1]?.trim() || 'Exam Subject';
      const parsedCode = text.match(/\(([A-Z0-9]+)\)/i)?.[1] || 'COURSE101';
      const parsedType: ExamType = (text.match(/FT-1|FT-2|CT-1|CT-2|End Semester|Practical/i)?.[0] as ExamType) || 'FT-1';

      setParsedExam({
        id: `exam-${Date.now()}`,
        subject: parsedSubj,
        courseCode: parsedCode,
        examType: parsedType,
        date: todayStr,
        startTime: '10:00 AM',
        endTime: '11:30 AM',
        venue: 'Classroom',
        mode: 'Physical',
        portion: text.length > 20 ? text.substring(0, 150) + '...' : text,
        pattern: 'MCQ & Subjective',
        marks: 20,
        conversion: `${parsedType} = 10 Marks`,
        accentColor: 'blue',
      });
    }, 2100);
  };

  const handleConfirmParsed = async () => {
    if (parsedExam) {
      if (duplicateWarning && !allowDuplicate) {
        setErrorMsg('Please confirm duplicate override before saving.');
        return;
      }

      setIsSubmitting(true);
      const { exam, error } = await createExam(parsedExam);
      setIsSubmitting(false);

      if (error) {
        setErrorMsg(error);
      } else if (exam) {
        onSaveExam(exam);
      }
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!subject.trim()) {
      setErrorMsg('Please enter a subject name');
      return;
    }

    if (duplicateWarning && !allowDuplicate && !examToEdit) {
      setErrorMsg(`Warning: This group already has an ${examType} exam. Check "Allow Duplicate" to proceed.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (examToEdit) {
        const { exam, error } = await updateExam(examToEdit.id, {
          subject,
          courseCode: courseCode || 'COURSE101',
          examType,
          date,
          startTime,
          endTime,
          venue: venue || 'Classroom',
          mode,
          portion: portion || 'Covered syllabus',
          pattern,
          marks: Number(marks) || 20,
          conversion: conversion || `${examType} = 10 Marks`,
        });

        if (error) {
          setErrorMsg(error);
        } else if (exam) {
          onSaveExam(exam);
        }
      } else {
        const { exam, error } = await createExam({
          subject,
          courseCode: courseCode || 'COURSE101',
          examType,
          date,
          startTime,
          endTime,
          venue: venue || 'Classroom',
          mode,
          portion: portion || 'Covered syllabus',
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
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {examToEdit ? 'Edit Exam' : 'Add Exam'}
        </h1>
        <p className="text-xs font-mono text-neutral-400 mt-1">
          {examToEdit ? `Updating ${examToEdit.subject} for ${activeGroup?.name}` : `Create a new exam entry for ${activeGroup?.name || 'your group'}`}
        </p>
      </div>

      {/* Tab Selector */}
      {!examToEdit && (
        <div className="flex items-center p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800">
          <button
            type="button"
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
            type="button"
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
      )}

      {/* Duplicate Warning Banner */}
      {duplicateWarning && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <span>{duplicateWarning}</span>
          </div>
          <label className="flex items-center gap-2 pt-1 text-neutral-300 font-mono cursor-pointer">
            <input
              type="checkbox"
              checked={allowDuplicate}
              onChange={(e) => setAllowDuplicate(e.target.checked)}
              className="rounded bg-neutral-900 border-neutral-700 text-amber-500 focus:ring-amber-400"
            />
            <span>I intend to add a duplicate exam of type {examType}</span>
          </label>
        </div>
      )}

      {/* OPTION A: PASTE ANNOUNCEMENT */}
      {activeTab === 'paste' && !examToEdit && (
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
              placeholder="Paste WhatsApp or portal announcement from your faculty here..."
              className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-white focus:ring-1 focus:ring-white text-sm leading-relaxed resize-none transition-all font-sans"
            />
          </div>

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
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-neutral-800">
                  <Button variant="outline" size="md" className="flex-1" onClick={() => setParsedExam(null)}>
                    Re-parse
                  </Button>
                  <Button variant="primary" size="md" className="flex-1" disabled={isSubmitting} onClick={handleConfirmParsed}>
                    {isSubmitting ? 'Saving...' : 'Confirm & Save Exam'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* OPTION B: MANUAL FORM */}
      {(activeTab === 'manual' || examToEdit) && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onSubmit={handleManualSave}
          className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">SUBJECT NAME *</label>
              <input
                type="text"
                required
                placeholder="e.g. Data Structures & Algorithms"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-neutral-300">COURSE CODE</label>
              <input
                type="text"
                placeholder="e.g. 21CSC303T"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

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

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-medium text-neutral-300">SYLLABUS PORTION</label>
            <textarea
              rows={3}
              placeholder="e.g. Units 1 & 2 complete syllabus"
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
            {isSubmitting ? (examToEdit ? 'Updating Exam...' : 'Saving Exam...') : (examToEdit ? 'Update Exam' : 'Save Exam')}
          </Button>
        </motion.form>
      )}
    </div>
  );
};
