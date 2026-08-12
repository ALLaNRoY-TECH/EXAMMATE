export interface ExamCountdown {
  daysLeft: number;
  statusText: string;
  isToday: boolean;
  isCompleted: boolean;
}

/**
 * Calculates the exact remaining days / status for an exam date and optional start time.
 * @param dateStr Exam date in 'YYYY-MM-DD' format
 * @param startTimeStr Optional start time string, e.g. '10:40 AM'
 */
export function getExamCountdown(dateStr: string, startTimeStr?: string): ExamCountdown {
  if (!dateStr) {
    return { daysLeft: 0, statusText: 'NO DATE', isToday: false, isCompleted: false };
  }

  // Parse YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return { daysLeft: 0, statusText: 'INVALID DATE', isToday: false, isCompleted: false };
  }

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  const now = new Date();

  // Reset hours for exact day comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const targetDayStart = new Date(year, month, day, 0, 0, 0);

  const diffMs = targetDayStart.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      daysLeft: 0,
      statusText: 'COMPLETED',
      isToday: false,
      isCompleted: true,
    };
  }

  if (diffDays === 0) {
    return {
      daysLeft: 0,
      statusText: 'TODAY',
      isToday: true,
      isCompleted: false,
    };
  }

  const formattedDays = diffDays < 10 ? `0${diffDays}` : `${diffDays}`;
  return {
    daysLeft: diffDays,
    statusText: `${formattedDays} ${diffDays === 1 ? 'DAY LEFT' : 'DAYS LEFT'}`,
    isToday: false,
    isCompleted: false,
  };
}
