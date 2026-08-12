'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Home, Calendar, PlusCircle, Settings, Users, AlertCircle, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { useExam } from '@/context/ExamContext';
import { GroupSelector } from '@/components/groups/GroupSelector';
import { getExamCountdown } from '@/lib/utils/examCountdown';

export type NavTab = 'home' | 'calendar' | 'add' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  examCount: number;
  onOpenAuth: () => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  examCount,
  onOpenAuth,
  onCreateGroup,
  onJoinGroup,
}) => {
  const { user, profile, signOut } = useAuth();
  const { activeGroup } = useGroup();
  const { activeGroupExams } = useExam();

  const navItems = [
    { id: 'home' as NavTab, label: 'Overview', icon: Home, badge: examCount },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar },
    { id: 'add' as NavTab, label: 'Add Exam', icon: PlusCircle },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const nextActiveExam = activeGroupExams.find(
    (e) => !getExamCountdown(e.date, e.startTime).isCompleted
  );
  const nextExamCountdown = nextActiveExam
    ? getExamCountdown(nextActiveExam.date, nextActiveExam.startTime)
    : null;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#08090e]/90 backdrop-blur-xl border-r border-white/10 p-5 z-40">
      {/* Brand Logo Header */}
      <div className="mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className="relative w-36 h-10 shrink-0">
            <Image
              src="/logo.png"
              alt="ExamMate Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
        <p className="text-[11px] text-neutral-400 mt-1 font-medium tracking-tight">
          Never ask &quot;When&apos;s the exam?&quot; again.
        </p>
      </div>

      {/* Group Selector */}
      {user && (
        <div className="mb-4">
          <GroupSelector onCreateGroup={onCreateGroup} onJoinGroup={onJoinGroup} />
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white text-black shadow-glow'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  size={18}
                  className={`transition-colors ${
                    isActive ? 'text-black' : 'text-neutral-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Alert Pill with Dynamic Countdown */}
      {activeGroup && nextActiveExam && nextExamCountdown && (
        <div className="mb-4 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-400">
          <AlertCircle size={14} className="shrink-0" />
          <span className="truncate">
            {activeGroup.name} · Next {nextActiveExam.examType} in {nextExamCountdown.statusText}
          </span>
        </div>
      )}

      {/* Bottom User Profile / Auth State */}
      <div className="pt-3 border-t border-neutral-800/80">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/40 hover:bg-neutral-900 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {profile?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{profile?.name || 'Student'}</h4>
                <p className="text-[10px] text-neutral-400 font-mono truncate">{user.email}</p>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="p-1.5 text-neutral-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs shadow-glow hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <LogIn size={16} />
            <span>Log In / Sign Up</span>
          </button>
        )}
      </div>
    </aside>
  );
};
