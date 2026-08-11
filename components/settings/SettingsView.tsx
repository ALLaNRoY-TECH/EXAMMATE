'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Users, Copy, Check, ShieldCheck, Mail, KeyRound, LogOut, Trash2, UserCheck, AlertTriangle } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { GroupMembersModal } from '@/components/groups/GroupMembersModal';
import { Modal } from '@/components/ui/Modal';

interface SettingsViewProps {
  onOpenAuth?: () => void;
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenAuth, onCreateGroup, onJoinGroup }) => {
  const { user, profile, signOut } = useAuth();
  const { activeGroup, leaveGroup } = useGroup();

  const [notifications, setNotifications] = useState({
    threeDays: true,
    oneDay: true,
    examDay: true,
  });

  const [copiedCode, setCopiedCode] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  const handleCopyInvite = () => {
    if (activeGroup?.invite_code) {
      navigator.clipboard.writeText(activeGroup.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    setLeaveError('');
    const { error } = await leaveGroup(activeGroup.id);
    if (error) {
      setLeaveError(error);
    } else {
      setIsLeaveModalOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Manage your student profile, group membership, and reminder preferences.
          </p>
        </div>

        {user && (
          <Button variant="destructive" size="sm" icon={<LogOut size={14} />} onClick={() => signOut()}>
            Log Out
          </Button>
        )}
      </div>

      {/* USER PROFILE CARD */}
      <div className="p-6 rounded-3xl bg-[#0b0d13] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
            <User size={16} className="text-blue-400" />
            STUDENT PROFILE
          </div>

          {!user && (
            <Button variant="primary" size="sm" onClick={onOpenAuth}>
              Sign In
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center text-white text-2xl font-bold shadow-glow">
            {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {profile?.name || (user ? 'Student Account' : 'Guest Student')}
              {activeGroup && (
                <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {activeGroup.name}
                </span>
              )}
            </h3>
            <p className="text-xs font-mono text-neutral-400 flex items-center gap-1.5 mt-0.5">
              <Mail size={12} className="text-neutral-500" />
              {user ? user.email : 'Not signed in'}
            </p>
          </div>
        </div>
      </div>

      {/* SHARED GROUP SECTION */}
      <div className="p-6 rounded-3xl bg-[#0b0d13] border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
            <Users size={16} className="text-purple-400" />
            ACTIVE STUDY GROUP
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCreateGroup}>
              + Create Group
            </Button>
            <Button variant="outline" size="sm" onClick={onJoinGroup}>
              Join Group
            </Button>
          </div>
        </div>

        {activeGroup ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 block">GROUP NAME</span>
                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    {activeGroup.name}
                    {activeGroup.role === 'admin' && (
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                        <ShieldCheck size={12} />
                        Group Admin
                      </span>
                    )}
                  </h4>
                </div>
                <Button variant="secondary" size="sm" icon={<UserCheck size={14} />} onClick={() => setIsMembersOpen(true)}>
                  View Roster
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 block uppercase">COLLEGE</span>
                  <span className="font-semibold text-neutral-200 truncate block">{activeGroup.college}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 block uppercase">COURSE</span>
                  <span className="font-semibold text-neutral-200 truncate block">{activeGroup.course}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 block uppercase">YEAR / SECTION</span>
                  <span className="font-semibold text-neutral-200 truncate block">{activeGroup.year} · Sec {activeGroup.section || 'A'}</span>
                </div>
              </div>
            </div>

            {/* YOUR SOCIAL CODE */}
            <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block flex items-center gap-1.5">
                <KeyRound size={14} className="text-blue-400" />
                UNIQUE GROUP INVITE CODE
              </span>
              <p className="text-xs text-neutral-400">
                Share this code with your classmates so they can join {activeGroup.name}.
              </p>

              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black border border-neutral-800">
                <span className="text-xl font-black font-mono tracking-widest text-white pl-2">
                  {activeGroup.invite_code}
                </span>

                <Button
                  variant={copiedCode ? 'secondary' : 'primary'}
                  size="sm"
                  icon={copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  onClick={handleCopyInvite}
                >
                  {copiedCode ? 'Copied' : 'Copy Code'}
                </Button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(true)}
                className="text-xs font-mono text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Leave this group</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
            <h4 className="text-sm font-bold text-white">No active group selected</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Create a group for your class or join an existing group using an invite code.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="primary" size="sm" onClick={onCreateGroup}>
                Create Group
              </Button>
              <Button variant="secondary" size="sm" onClick={onJoinGroup}>
                Join Group
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* NOTIFICATION PREFERENCES */}
      <div className="p-6 rounded-3xl bg-[#0b0d13] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
          <Bell size={16} className="text-amber-400" />
          EXAM REMINDERS
        </div>

        <div className="space-y-3 pt-1 divide-y divide-neutral-900">
          <Toggle
            label="3 days before exam"
            description="Receive an early notification to start reviewing your syllabus portion."
            checked={notifications.threeDays}
            onChange={(checked) => setNotifications((prev) => ({ ...prev, threeDays: checked }))}
          />

          <Toggle
            label="1 day before exam"
            description="Get a high-priority reminder with venue location and final pattern notes."
            checked={notifications.oneDay}
            onChange={(checked) => setNotifications((prev) => ({ ...prev, oneDay: checked }))}
          />

          <Toggle
            label="Exam day"
            description="Morning check-in with exact timing and room details."
            checked={notifications.examDay}
            onChange={(checked) => setNotifications((prev) => ({ ...prev, examDay: checked }))}
          />
        </div>
      </div>

      {/* Roster Modal */}
      <GroupMembersModal isOpen={isMembersOpen} onClose={() => setIsMembersOpen(false)} />

      {/* Leave Group Modal */}
      <Modal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} title="Leave Group">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-500/20 text-amber-300 text-sm">
            <AlertTriangle size={20} className="shrink-0 text-amber-400" />
            <p>Are you sure you want to leave <strong>{activeGroup?.name}</strong>?</p>
          </div>

          {leaveError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs">
              {leaveError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLeaveGroup}>
              Confirm Leave
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
