'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { useGroup } from './GroupContext';
import { Exam, ExamType, ExamMode } from '@/types/exam';

export interface ExamWithGroup extends Exam {
  groupName?: string;
}

interface ExamContextType {
  allUserExams: ExamWithGroup[];
  activeGroupExams: ExamWithGroup[];
  isLoadingExams: boolean;
  createExam: (examData: Omit<Exam, 'id'>) => Promise<{ exam?: ExamWithGroup; error?: string }>;
  updateExam: (examId: string, examData: Partial<Exam>) => Promise<{ exam?: ExamWithGroup; error?: string }>;
  deleteExam: (examId: string) => Promise<{ error?: string }>;
  refreshExams: () => Promise<void>;
  recentNotification: { text: string; type: 'info' | 'success' | 'error' } | null;
  clearNotification: () => void;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

const mapRowToExam = (row: any, groupName?: string): ExamWithGroup => ({
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
  groupName,
});

export const ExamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { userGroups, activeGroup } = useGroup();

  const [allUserExams, setAllUserExams] = useState<ExamWithGroup[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState<boolean>(true);
  const [recentNotification, setRecentNotification] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);
  const configured = isSupabaseConfigured();

  const activeGroupExams = activeGroup
    ? allUserExams.filter((e) => e.group_id === activeGroup.id)
    : [];

  const groupMap = new Map<string, string>(userGroups.map((g) => [g.id, g.name]));

  const fetchAllUserExams = async () => {
    if (!user || userGroups.length === 0) {
      setAllUserExams([]);
      setIsLoadingExams(false);
      return;
    }

    if (!configured) {
      setAllUserExams([]);
      setIsLoadingExams(false);
      return;
    }

    setIsLoadingExams(true);
    try {
      const userGroupIds = userGroups.map((g) => g.id);

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .in('group_id', userGroupIds)
        .order('exam_date', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped = data.map((row: any) => mapRowToExam(row, groupMap.get(row.group_id)));
        setAllUserExams(mapped);
      }
    } catch (err: any) {
      console.error('[ExamContext] Error fetching exams:', err.message);
      setAllUserExams([]);
    } finally {
      setIsLoadingExams(false);
    }
  };

  // Fetch exams on load or userGroups change
  useEffect(() => {
    fetchAllUserExams();
  }, [user?.id, userGroups.map((g) => g.id).join(','), configured]);

  // Realtime subscriptions for all user groups
  useEffect(() => {
    if (!configured || !user || userGroups.length === 0) return;

    const userGroupIds = userGroups.map((g) => g.id);
    const channels: ReturnType<typeof supabase.channel>[] = [];

    userGroupIds.forEach((groupId) => {
      const groupName = groupMap.get(groupId);

      const channel = supabase
        .channel(`exam_sync_group_${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'exams',
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            if (payload.new) {
              const newExam = mapRowToExam(payload.new, groupName);
              setAllUserExams((prev) => {
                if (prev.some((e) => e.id === newExam.id)) return prev;
                return [...prev, newExam].sort((a, b) => a.date.localeCompare(b.date));
              });

              if (newExam.created_by !== user.id) {
                setRecentNotification({
                  text: `New exam added: ${newExam.subject} (${groupName || 'Group'})`,
                  type: 'info',
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'exams',
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            if (payload.new) {
              const updatedExam = mapRowToExam(payload.new, groupName);
              setAllUserExams((prev) =>
                prev.map((e) => (e.id === updatedExam.id ? updatedExam : e))
              );

              if (updatedExam.created_by !== user.id) {
                setRecentNotification({
                  text: `Exam updated: ${updatedExam.subject}`,
                  type: 'info',
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'exams',
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            const deletedId = payload.old?.id;
            if (deletedId) {
              setAllUserExams((prev) => prev.filter((e) => e.id !== deletedId));
              setRecentNotification({
                text: 'Exam removed',
                type: 'info',
              });
            } else {
              fetchAllUserExams();
            }
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [userGroups.map((g) => g.id).join(','), user?.id, configured]);

  const triggerPushNotification = async (type: 'new_exam' | 'updated_exam' | 'deleted_exam', exam: Exam, groupId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type, exam, groupId }),
      });
    } catch (err) {
      console.warn('[PushTrigger] Warning:', err);
    }
  };

  // Create Exam
  const createExam = async (examData: Omit<Exam, 'id'>): Promise<{ exam?: ExamWithGroup; error?: string }> => {
    if (!user) return { error: 'Authentication required' };
    if (!activeGroup) return { error: 'No active group selected' };

    if (!configured) {
      const localExam: ExamWithGroup = {
        ...examData,
        id: `exam-${Date.now()}`,
        group_id: activeGroup.id,
        created_by: user.id,
        groupName: activeGroup.name,
      };
      setAllUserExams((prev) => [...prev, localExam]);
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

      const created = mapRowToExam(data, activeGroup.name);
      setAllUserExams((prev) => {
        if (prev.some((e) => e.id === created.id)) return prev;
        return [...prev, created].sort((a, b) => a.date.localeCompare(b.date));
      });

      triggerPushNotification('new_exam', created, activeGroup.id);

      return { exam: created };
    } catch (err: any) {
      return { error: err.message || 'Failed to save exam' };
    }
  };

  // Update Exam
  const updateExam = async (examId: string, examData: Partial<Exam>): Promise<{ exam?: ExamWithGroup; error?: string }> => {
    if (!user) return { error: 'Authentication required' };

    if (!configured) {
      setAllUserExams((prev) =>
        prev.map((e) => (e.id === examId ? { ...e, ...examData } : e))
      );
      return {};
    }

    try {
      const rowToUpdate: any = {};
      if (examData.subject !== undefined) rowToUpdate.subject = examData.subject;
      if (examData.courseCode !== undefined) rowToUpdate.course_code = examData.courseCode;
      if (examData.examType !== undefined) rowToUpdate.exam_type = examData.examType;
      if (examData.date !== undefined) rowToUpdate.exam_date = examData.date;
      if (examData.startTime !== undefined) rowToUpdate.start_time = examData.startTime;
      if (examData.endTime !== undefined) rowToUpdate.end_time = examData.endTime;
      if (examData.venue !== undefined) rowToUpdate.venue = examData.venue;
      if (examData.mode !== undefined) rowToUpdate.mode = examData.mode;
      if (examData.portion !== undefined) rowToUpdate.portion = examData.portion;
      if (examData.pattern !== undefined) rowToUpdate.pattern = examData.pattern;
      if (examData.marks !== undefined) rowToUpdate.marks = examData.marks;
      if (examData.conversion !== undefined) rowToUpdate.conversion = examData.conversion;

      const { data, error } = await supabase
        .from('exams')
        .update(rowToUpdate)
        .eq('id', examId)
        .select()
        .single();

      if (error) throw error;

      const updated = mapRowToExam(data, groupMap.get(data.group_id));
      setAllUserExams((prev) =>
        prev.map((e) => (e.id === examId ? updated : e))
      );

      triggerPushNotification('updated_exam', updated, data.group_id);

      return { exam: updated };
    } catch (err: any) {
      return { error: err.message || 'Failed to update exam' };
    }
  };

  // Delete Exam
  const deleteExam = async (examId: string): Promise<{ error?: string }> => {
    const targetExam = allUserExams.find((e) => e.id === examId);

    if (!configured || examId.startsWith('exam-')) {
      setAllUserExams((prev) => prev.filter((e) => e.id !== examId));
      return {};
    }

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      setAllUserExams((prev) => prev.filter((e) => e.id !== examId));

      if (targetExam && targetExam.group_id) {
        triggerPushNotification('deleted_exam', targetExam, targetExam.group_id);
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete exam' };
    }
  };

  return (
    <ExamContext.Provider
      value={{
        allUserExams,
        activeGroupExams,
        isLoadingExams,
        createExam,
        updateExam,
        deleteExam,
        refreshExams: fetchAllUserExams,
        recentNotification,
        clearNotification: () => setRecentNotification(null),
      }}
    >
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam must be used within an ExamProvider');
  }
  return context;
};
