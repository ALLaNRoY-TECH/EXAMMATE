'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Users, Copy, Check, ShieldCheck, Mail, KeyRound, LogOut, Trash2, UserCheck, AlertTriangle, Smartphone, Send, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useGroup } from '@/context/GroupContext';
import { GroupMembersModal } from '@/components/groups/GroupMembersModal';
import { Modal } from '@/components/ui/Modal';
import { subscribeToPushNotifications, sendTestPushNotification } from '@/lib/push/clientPush';
import { supabase } from '@/lib/supabase/client';

interface SettingsViewProps {
  onOpenAuth?: () => void;
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenAuth, onCreateGroup, onJoinGroup }) => {
  const { user, profile, signOut } = useAuth();
  const { activeGroup, leaveGroup, deleteGroup } = useGroup();

  const [notifications, setNotifications] = useState({
    threeDays: true,
    oneDay: true,
    examDay: true,
  });

  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState('');

  const isGroupAdmin = activeGroup?.role === 'admin' || activeGroup?.created_by === user?.id;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setPushStatus('unsupported');
      } else {
        setPushStatus(Notification.permission as any);
      }
    }
  }, []);

  // Fetch notification preferences from server
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await fetch('/api/notifications/preferences', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications({
            threeDays: data.threeDays !== false,
            oneDay: data.oneDay !== false,
            examDay: data.examDay !== false,
          });
        }
      } catch (err) {
        console.warn('Failed to fetch notification preferences:', err);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  const savePreferences = async (newPrefs: typeof notifications) => {
    setNotifications(newPrefs);
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newPrefs),
      });
    } catch (err) {
      console.warn('Failed to save notification preferences:', err);
    }
  };

  const handleEnableNotifications = async () => {
    setPushFeedback(null);
    setIsSubscribing(true);

    const result = await subscribeToPushNotifications();
    setIsSubscribing(false);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission as any);
    }

    if (result.success) {
      setPushFeedback({
        text: 'Phone notifications enabled successfully!',
        type: 'success',
      });
    } else {
      setPushFeedback({
        text: result.error || 'Failed to enable notifications.',
        type: 'error',
      });
    }
  };

  const handleSendTestNotification = async () => {
    setPushFeedback(null);
    setIsSendingTest(true);

    const result = await sendTestPushNotification();
    setIsSendingTest(false);

    if (result.success) {
      setPushFeedback({
        text: 'Test notification sent to your device!',
        type: 'success',
      });
    } else {
      setPushFeedback({
        text: result.error || 'Failed to send test notification. Ensure notifications are enabled first.',
        type: 'error',
      });
    }
  };

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

  const handleDeleteGroupConfirm = async () => {
    if (!activeGroup) return;
    setDeleteGroupError('');
    setIsDeletingGroup(true);

    const { error } = await deleteGroup(activeGroup.id);
    if (error) {
      setDeleteGroupError(error);
    } else {
      setIsDeleteGroupModalOpen(false);
    }
    setIsDeletingGroup(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Manage your student profile, study groups, and phone push reminders.
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

      {/* PHONE PUSH NOTIFICATIONS SECTION */}
      <div className="p-6 rounded-3xl bg-[#0b0d13] border border-white/10 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
            <Smartphone size={16} className="text-blue-400" />
            PHONE NOTIFICATIONS (WEB PUSH)
          </div>

          <div className="flex items-center gap-1.5">
            {pushStatus === 'granted' ? (
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Notifications Enabled
              </span>
            ) : pushStatus === 'denied' ? (
              <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/60 px-2.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1">
                <XCircle size={12} />
                Permission Denied
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-500/30">
                Not Enabled
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed font-mono">
          Receive real-time phone notifications for new exams and upcoming reminders (3 days before, 1 day before, exam day) even when ExamMate is closed.
        </p>

        {pushFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              pushFeedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}
          >
            {pushFeedback.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
            )}
            <span>{pushFeedback.text}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="primary"
            size="md"
            icon={isSubscribing ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
            onClick={handleEnableNotifications}
            disabled={isSubscribing || !user}
          >
            {isSubscribing ? 'Enabling...' : 'Enable Notifications'}
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={isSendingTest ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            onClick={handleSendTestNotification}
            disabled={isSendingTest || !user}
          >
            {isSendingTest ? 'Sending Test...' : 'Send Test Notification'}
          </Button>
        </div>
      </div>

      {/* ACTIVE STUDY GROUP SECTION */}
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
                    {isGroupAdmin && (
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

            {/* UNIQUE INVITE CODE */}
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

            {/* Group Actions: Delete Group (Admin) or Leave Group */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(true)}
                className="text-xs font-mono text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Leave this group</span>
              </button>

              {isGroupAdmin && (
                <button
                  type="button"
                  onClick={() => setIsDeleteGroupModalOpen(true)}
                  className="text-xs font-mono font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Delete Group</span>
                </button>
              )}
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
            description="Receive an early phone notification to start reviewing your syllabus portion."
            checked={notifications.threeDays}
            onChange={(checked) => savePreferences({ ...notifications, threeDays: checked })}
          />

          <Toggle
            label="1 day before exam"
            description="Get a high-priority reminder with venue location and final pattern notes."
            checked={notifications.oneDay}
            onChange={(checked) => savePreferences({ ...notifications, oneDay: checked })}
          />

          <Toggle
            label="Exam day"
            description="Morning check-in on your phone with exact timing and room details."
            checked={notifications.examDay}
            onChange={(checked) => savePreferences({ ...notifications, examDay: checked })}
          />
        </div>
      </div>

      {/* Roster Modal */}
      <GroupMembersModal isOpen={isMembersOpen} onClose={() => setIsMembersOpen(false)} />

      {/* Delete Group Modal */}
      <Modal isOpen={isDeleteGroupModalOpen} onClose={() => setIsDeleteGroupModalOpen(false)} title="Delete Group">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
            <AlertTriangle size={20} className="shrink-0 text-red-400" />
            <div>
              <p className="font-bold text-white">Permanently delete {activeGroup?.name}?</p>
              <p className="text-xs mt-1 text-red-300">
                This will permanently delete the group, remove all group memberships, and delete all exams belonging to this group.
              </p>
            </div>
          </div>

          {deleteGroupError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs font-mono">
              {deleteGroupError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={isDeletingGroup} onClick={handleDeleteGroupConfirm}>
              {isDeletingGroup ? 'Deleting...' : 'Confirm Delete Group'}
            </Button>
          </div>
        </div>
      </Modal>

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
