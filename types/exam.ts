export type ExamMode = 'Physical' | 'Online';

export type ExamType = 'FT-1' | 'FT-2' | 'CT-1' | 'CT-2' | 'End Semester' | 'Practical' | 'Other';

export interface Exam {
  id: string;
  group_id?: string;
  created_by?: string;
  subject: string;
  courseCode: string;
  examType: ExamType;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  venue: string;
  mode: ExamMode;
  portion: string;
  pattern: string;
  marks: number;
  conversion: string;
  accentColor?: 'blue' | 'amber' | 'emerald' | 'purple' | 'red' | 'cyan';
}

export interface NotificationSettings {
  threeDays: boolean;
  oneDay: boolean;
  examDay: boolean;
}

export interface StudyGroup {
  name: string;
  code: string;
  members: Array<{
    name: string;
    avatar: string;
    role: string;
  }>;
}
