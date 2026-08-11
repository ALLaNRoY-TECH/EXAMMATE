'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { useGroup } from './GroupContext';
import { Exam, ExamType, ExamMode } from '@/types/exam';
import { INITIAL_EXAMS } from '@/data/dummyExams';

interface ExamContextType {
  exams: Exam[];
  isLoadingExams: boolean;
  createExam: (examData: Omit<Exam, 'id'>) => Promise<{ exam?: Exam; error?: string }>;
  deleteExam: (examId: string) => Promise<{ error?: string }>;
  refreshExams: () => Promise<void>;
}

const defaultValue: ExamContextType = {
  exams: INITIAL_EXAMS,
  isLoadingExams: false,
  createExam: async () => ({ error: 'ExamProvider missing' }),
  deleteExam: async () => ({ error: 'ExamProvider missing' }),
  refreshExams: async () => {},
};

const ExamContext = createContext<ExamContextType>(defaultValue);

const mapRowToExam = (row: any): Exam => ({
  id: row.id,
  group_id: row.group_id,
  created_by: row.created_by,
  subject: row.subject,
  courseCode: row.course_code,
  examType: row.exam_type as ExamType,
  date: row.exam_date,
  startTime: row.start_time || '10:00 AM',
  endTime: row.end_time || '11:30 AM',
  venue: row.venue || 'Classroom',
  mode: (row.mode as ExamMode) || 'Physical',
  portion: row.portion || '',
  pattern: row.pattern || 'MCQ & Subjective',
  marks: Number(row.marks) || 20,
  conversion: row.conversion || '',
  accentColor: 'blue',
});

export const ExamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { activeGroup } = useGroup();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  const fetchGroupExams = async () => {
    if (!user || !activeGroup) {
      setExams([]);
      setIsLoadingExams(false);
      return;
    }

    if (!configured) {
      setExams(INITIAL_EXAMS);
      setIsLoadingExams(false);
      return;
    }

    setIsLoadingExams(true);
    setExams([]); // Clear previous group exams immediately during transition

    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('group_id', activeGroup.id)
        .order('exam_date', { ascending: true });

      if (error) throw error;

      if (data) {
        setExams(data.map(mapRowToExam));
      }
    } catch (err: any) {
      console.error('Error fetching group exams:', err.message);
      setExams([]);
    } finally {
      setIsLoadingExams(false);
    }
  };

  useEffect(() => {
    fetchGroupExams();

    if (!configured || !user || !activeGroup) return;

    // Set up Realtime subscription for exams belonging to activeGroup
    const channel = supabase
      .channel(`exam_sync_${activeGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `group_id=eq.${activeGroup.id}`,
        },
        () => {
          fetchGroupExams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGroup?.id, user?.id, configured]);

  const createExam = async (examData: Omit<Exam, 'id'>): Promise<{ exam?: Exam; error?: string }> => {
    if (!user) return { error: 'Authentication required' };
    if (!activeGroup) return { error: 'No active group selected' };

    if (!configured) {
      const localExam: Exam = {
        ...examData,
        id: `exam-${Date.now()}`,
        group_id: activeGroup.id,
        created_by: user.id,
      };
      setExams((prev) => [localExam, ...prev]);
      return { exam: localExam };
    }

    try {
      const rowToInsert = {
        group_id: activeGroup.id,
        created_by: user.id,
        subject: examData.subject,
        course_code: examData.courseCode,
        exam_type: examData.examType,
        exam_date: examData.date,
        start_time: examData.startTime,
        end_time: examData.endTime,
        venue: examData.venue,
        mode: examData.mode || 'Physical',
        portion: examData.portion,
        pattern: examData.pattern,
        marks: examData.marks,
        conversion: examData.conversion,
      };

      const { data, error } = await supabase
        .from('exams')
        .insert([rowToInsert])
        .select()
        .single();

      if (error) throw error;

      const created = mapRowToExam(data);
      setExams((prev) => [created, ...prev.filter((e) => !e.id.startsWith('dummy-'))]);
      return { exam: created };
    } catch (err: any) {
      return { error: err.message || 'Failed to save exam' };
    }
  };

  const deleteExam = async (examId: string): Promise<{ error?: string }> => {
    if (!configured || examId.startsWith('exam-') || examId.startsWith('dummy-')) {
      setExams((prev) => prev.filter((e) => e.id !== examId));
      return {};
    }

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      setExams((prev) => prev.filter((e) => e.id !== examId));
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete exam' };
    }
  };

  return (
    <ExamContext.Provider
      value={{
        exams,
        isLoadingExams,
        createExam,
        deleteExam,
        refreshExams: fetchGroupExams,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => {
  const context = useContext(ExamContext);
  return context;
};
