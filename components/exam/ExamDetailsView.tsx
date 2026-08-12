'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, MapPin, Edit3, Trash2, BookOpen, FileText, Award, Layers, AlertTriangle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useExam, ExamWithGroup } from '@/context/ExamContext';
import { useGroup } from '@/context/GroupContext';
import { useAuth } from '@/context/AuthContext';
import { getExamCountdown } from '@/lib/utils/examCountdown';

interface ExamDetailsViewProps {
  exam: ExamWithGroup;
  onBack: () => void;
  onDelete: (examId: string) => void;
  onEdit?: (exam: ExamWithGroup) => void;
}

export const ExamDetailsView: React.FC<ExamDetailsViewProps> = ({ exam, onBack, onDelete, onEdit }) => {
  const { deleteExam } = useExam();
  const { activeGroup, userGroups } = useGroup();
  const { user } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Find target group for this exam
  const examGroup = userGroups.find((g) => g.id === exam.group_id) || activeGroup;
  const isGroupAdmin = examGroup?.role === 'admin' || examGroup?.created_by === user?.id || exam.created_by === user?.id;

  const countdown = getExamCountdown(exam.date, exam.startTime);

  const formattedDate = new Date(exam.date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const handleDeleteConfirm = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      const { error } = await deleteExam(exam.id);
      if (error) {
        setDeleteError(error);
      } else {
        setIsDeleteModalOpen(false);
        onDelete(exam.id);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete exam');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        BACK TO DASHBOARD
      </button>

      {/* Main Details Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-950 border border-neutral-800 p-6 md:p-8 space-y-6">
        {/* Header Badges & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="blue" size="md">
              {exam.examType}
            </Badge>
            <span className="text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-md">
              {exam.courseCode}
            </span>
            {exam.groupName && (
              <span className="text-xs font-mono text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Users size={12} />
                {exam.groupName}
              </span>
            )}
          </div>

          {/* Admin Actions */}
          {isGroupAdmin && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit3 size={14} />}
                onClick={() => onEdit && onEdit(exam)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setIsDeleteModalOpen(true)}
              >
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Title & Giant Display Countdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end pb-6 border-b border-neutral-900">
          <div className="md:col-span-8">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              {exam.subject}
            </h1>
            <p className="text-sm text-neutral-400 mt-1 font-mono">
              Faculty Announcement Verified · {exam.mode} Exam
            </p>
          </div>

          <div className="md:col-span-4 flex flex-col items-start md:items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-blue-500 font-mono tracking-tighter tabular-nums drop-shadow-md">
                {countdown.isToday ? 'TODAY' : countdown.isCompleted ? 'DONE' : countdown.daysLeft < 10 ? `0${countdown.daysLeft}` : countdown.daysLeft}
              </span>
              {!countdown.isToday && !countdown.isCompleted && (
                <div className="flex flex-col">
                  <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
                    DAYS
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-500 uppercase">
                    LEFT
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date, Time & Venue Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <Calendar size={18} className="text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">DATE</span>
              <span className="text-sm font-semibold text-white">{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <Clock size={18} className="text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">TIME</span>
              <span className="text-sm font-semibold text-white">{exam.startTime} – {exam.endTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
            <MapPin size={18} className="text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] font-mono text-neutral-500 block uppercase">LOCATION</span>
              <span className="text-sm font-semibold text-white">{exam.venue} ({exam.mode})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sections: Portion, Pattern, Marks, Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Portion Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
            <BookOpen size={16} className="text-blue-400" />
            SYLLABUS & PORTION
          </div>
          <p className="text-base text-neutral-100 font-medium leading-relaxed pt-1">
            {exam.portion || 'No specific portion detailed yet.'}
          </p>
        </motion.div>

        {/* Pattern Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
            <FileText size={16} className="text-purple-400" />
            QUESTION PATTERN
          </div>
          <p className="text-sm text-neutral-200 font-medium">
            {exam.pattern || 'Standard Question Pattern'}
          </p>
        </motion.div>

        {/* Marks & Conversion */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3"
        >
          <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
            <span className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase">
              <Award size={16} className="text-amber-400" />
              TOTAL MARKS
            </span>
            <span className="text-lg font-bold font-mono text-white">{exam.marks} Marks</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase">
              <Layers size={16} className="text-emerald-400" />
              WEIGHTAGE CONVERSION
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30">
              {exam.conversion || `${exam.examType} = 10 Marks`}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Modal for Delete */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Exam"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
            <AlertTriangle size={20} className="shrink-0 text-red-400" />
            <p>Are you sure you want to delete <strong>{exam.subject} ({exam.examType})</strong>? This will remove the exam for all group members.</p>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs font-mono">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="md" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>

            <Button variant="destructive" size="md" disabled={isDeleting} onClick={handleDeleteConfirm}>
              {isDeleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
