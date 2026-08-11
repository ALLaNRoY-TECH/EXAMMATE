'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronRight, Users, KeyRound, LogIn, UserCheck, Loader2 } from 'lucide-react';
import { Exam } from '@/types/exam';
import { INITIAL_EXAMS } from '@/data/dummyExams';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { GroupProvider, useGroup } from '@/context/GroupContext';
import { ExamProvider, useExam } from '@/context/ExamContext';

import { Sidebar, NavTab } from '@/components/navigation/Sidebar';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import { NextExamCard } from '@/components/dashboard/NextExamCard';
import { ExamCard } from '@/components/dashboard/ExamCard';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ExamDetailsView } from '@/components/exam/ExamDetailsView';
import { AddExamView } from '@/components/exam/AddExamView';
import { SettingsView } from '@/components/settings/SettingsView';
import { HandwrittenLoader } from '@/components/loader/HandwrittenLoader';

import { AuthModal } from '@/components/auth/AuthModal';
import { OnboardingModal } from '@/components/auth/OnboardingModal';
import { CreateGroupModal } from '@/components/groups/CreateGroupModal';
import { JoinGroupModal } from '@/components/groups/JoinGroupModal';
import { GroupMembersModal } from '@/components/groups/GroupMembersModal';

import { Button } from '@/components/ui/Button';
import { Toast, ToastMessage } from '@/components/ui/Toast';

function AppContent() {
  const { user, profile, isLoading: isAuthLoading, signInWithGoogle } = useAuth();
  const { activeGroup, userGroups } = useGroup();
  const { exams } = useExam();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<NavTab | 'details'>('home');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const currentSelectedExam = selectedExam || exams[0] || INITIAL_EXAMS[0];

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsSigningIn(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) setAuthError(error.message || 'Failed to sign in with Google');
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Modals State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState<boolean>(false);
  const [isJoinGroupOpen, setIsJoinGroupOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: `${Date.now()}`, text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleSelectExam = (exam: Exam) => {
    setSelectedExam(exam);
    setActiveTab('details');
  };

  const handleSaveExam = (newExam: Exam) => {
    setSelectedExam(newExam);
    showToast('Exam added successfully', 'success');
    setActiveTab('home');
  };

  const handleDeleteExam = (_examId: string) => {
    setSelectedExam(null);
    showToast('Exam deleted', 'info');
    setActiveTab('home');
  };

  const nextExam = exams[0] || INITIAL_EXAMS[0];

  const getDaysLeft = (dateStr: string) => {
    if (dateStr.includes('20')) return 9;
    if (dateStr.includes('25')) return 14;
    if (dateStr.includes('29')) return 18;
    return 12;
  };

  if (!isAuthLoading && !isLoading && !user) {
    return (
      <div className="min-h-screen bg-[#050508] bg-grid-pattern text-white flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 rounded-3xl bg-[#0b0d13] border border-white/10 text-center space-y-6 shadow-2xl"
        >
          <div className="inline-flex w-12 h-12 rounded-2xl bg-white text-black font-black text-2xl items-center justify-center shadow-glow mb-1">
            E
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to ExamMate
            </h1>
            <p className="text-xs font-mono text-neutral-400">
              Never ask &quot;When&apos;s the exam?&quot; again.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs text-left">
              {authError}
            </div>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-bold flex items-center justify-center gap-3 transition-all rounded-xl shadow-glow"
            disabled={isSigningIn}
            onClick={handleGoogleSignIn}
          >
            {isSigningIn ? (
              <Loader2 size={18} className="animate-spin text-black" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] bg-grid-pattern text-white flex">
      {/* HANDWRITTEN EXAM MATE INTRO LOADER */}
      <AnimatePresence>
        {isLoading && <HandwrittenLoader onComplete={() => setIsLoading(false)} />}
      </AnimatePresence>

      {/* Desktop Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab === 'details' ? 'home' : activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        examCount={exams.length}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onJoinGroup={() => setIsJoinGroupOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-72 px-4 sm:px-8 py-6 sm:py-8 pb-28 md:pb-12 max-w-6xl w-full mx-auto">
        <AnimatePresence mode="wait">
          {/* PAGE 1: DASHBOARD / OVERVIEW */}
          {activeTab === 'home' && (
            <motion.div
              key="dashboard-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Top Header Bar — Overview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Welcome back, {profile?.name || (user ? 'Student' : 'Allan Roy')}!
                  </h1>
                  <p className="text-xs font-mono text-neutral-400 mt-1">
                    {activeGroup
                      ? `Viewing ${activeGroup.name} (${activeGroup.college})`
                      : 'Here is your shared exam overview'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {user ? (
                    <div className="flex items-center gap-2">
                      {activeGroup && (
                        <button
                          type="button"
                          onClick={() => setIsMembersModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck size={14} className="text-emerald-400" />
                          <span>Group Roster</span>
                        </button>
                      )}
                      <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-xs font-bold">
                        {profile?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'}
                      </div>
                    </div>
                  ) : (
                    <Button variant="primary" size="sm" icon={<LogIn size={14} />} onClick={() => setIsAuthModalOpen(true)}>
                      Sign In
                    </Button>
                  )}
                </div>
              </div>

              {/* Group Empty State Banner if no groups exist */}
              {user && userGroups.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 rounded-3xl bg-[#0b0d13] border border-white/10 text-center space-y-4 shadow-2xl"
                >
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-purple-400">
                    <Users size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white">No groups joined yet</h3>
                    <p className="text-xs text-neutral-400 max-w-md mx-auto font-mono">
                      Create a shared group for your college class or enter an invite code shared by your classmate.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={() => setIsCreateGroupOpen(true)}>
                      Create Group
                    </Button>
                    <Button variant="secondary" size="md" icon={<KeyRound size={16} />} onClick={() => setIsJoinGroupOpen(true)}>
                      Join with Code
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Metric Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d13] border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                    TOTAL EXAMS
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tabular-nums">
                    {exams.length}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">
                    {activeGroup ? activeGroup.name : 'Scheduled Term'}
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d13] border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                    NEXT EXAM
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-400 font-mono tabular-nums">
                    09<span className="text-xs text-neutral-400 ml-1">DAYS</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">FLA · FT-1</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d13] border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                    TOTAL MARKS
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono tabular-nums">
                    60<span className="text-xs text-neutral-400 ml-1">PTS</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">3 Subjects</span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d13] border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                    PREP STATUS
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                    ON TRACK
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">Verified Syllabus</span>
                </div>
              </div>

              {/* Imminent Exam Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Imminent Exam</h2>
                  <p className="text-xs font-mono text-neutral-400 mt-0.5">Highest priority upcoming evaluation</p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus size={16} />}
                  onClick={() => setActiveTab('add')}
                >
                  Add Exam
                </Button>
              </div>

              {/* Next Exam Hero Card */}
              {nextExam && (
                <NextExamCard exam={nextExam} onSelect={handleSelectExam} />
              )}

              {/* Upcoming Exams Grid */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white tracking-tight">Scheduled Exams</h3>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="text-xs font-mono text-neutral-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    View Calendar
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exams.map((exam, idx) => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      daysLeft={getDaysLeft(exam.date)}
                      index={idx}
                      onSelect={handleSelectExam}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* PAGE 2: CALENDAR */}
          {activeTab === 'calendar' && (
            <motion.div
              key="calendar-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <CalendarView exams={exams} onSelectExam={handleSelectExam} />
            </motion.div>
          )}

          {/* PAGE 3: EXAM DETAILS */}
          {activeTab === 'details' && currentSelectedExam && (
            <motion.div
              key="details-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ExamDetailsView
                exam={currentSelectedExam}
                onBack={() => setActiveTab('home')}
                onDelete={handleDeleteExam}
                onEdit={() => setActiveTab('add')}
              />
            </motion.div>
          )}

          {/* PAGE 4: ADD EXAM */}
          {activeTab === 'add' && (
            <motion.div
              key="add-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AddExamView onSaveExam={handleSaveExam} />
            </motion.div>
          )}

          {/* PAGE 5: SETTINGS */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings-page"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsView
                onOpenAuth={() => setIsAuthModalOpen(true)}
                onCreateGroup={() => setIsCreateGroupOpen(true)}
                onJoinGroup={() => setIsJoinGroupOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab === 'details' ? 'home' : activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {/* Auth & Group Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <CreateGroupModal isOpen={isCreateGroupOpen} onClose={() => setIsCreateGroupOpen(false)} />
      <JoinGroupModal isOpen={isJoinGroupOpen} onClose={() => setIsJoinGroupOpen(false)} />
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCreateGroup={() => setIsCreateGroupOpen(true)}
        onJoinGroup={() => setIsJoinGroupOpen(true)}
      />
      <GroupMembersModal isOpen={isMembersModalOpen} onClose={() => setIsMembersModalOpen(false)} />

      {/* Floating Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <GroupProvider>
        <ExamProvider>
          <AppContent />
        </ExamProvider>
      </GroupProvider>
    </AuthProvider>
  );
}
