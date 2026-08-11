'use client';

import React, { useEffect, useState } from 'react';
import { Users, ShieldCheck, UserX, AlertTriangle, Loader2 } from 'lucide-react';
import { useGroup } from '@/context/GroupContext';
import { useAuth } from '@/context/AuthContext';
import { GroupMember } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GroupMembersModal: React.FC<GroupMembersModalProps> = ({ isOpen, onClose }) => {
  const { activeGroup, getGroupMembers, removeMember } = useGroup();
  const { user } = useAuth();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [targetRemoveMember, setTargetRemoveMember] = useState<GroupMember | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isGroupAdmin = activeGroup?.role === 'admin' || activeGroup?.created_by === user?.id;

  const loadMembers = async () => {
    if (!activeGroup) return;
    setIsLoading(true);
    const { members: list, error } = await getGroupMembers(activeGroup.id);
    if (list) setMembers(list);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && activeGroup) {
      loadMembers();
    }
  }, [isOpen, activeGroup?.id]);

  const handleConfirmRemove = async () => {
    if (!activeGroup || !targetRemoveMember) return;
    setIsRemoving(true);
    setErrorMsg('');

    const { error } = await removeMember(activeGroup.id, targetRemoveMember.user_id);
    if (error) {
      setErrorMsg(error);
    } else {
      setMembers((prev) => prev.filter((m) => m.user_id !== targetRemoveMember.user_id));
      setTargetRemoveMember(null);
    }
    setIsRemoving(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${activeGroup?.name || 'Group'} Members`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-mono pb-2 border-b border-neutral-800">
          <span>{activeGroup?.college}</span>
          <span className="text-emerald-400 font-semibold">{members.length} Members</span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-neutral-500 font-mono text-xs flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading group roster...
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {members.map((m) => {
              const isCurrentUser = m.user_id === user?.id;
              const isMemberAdmin = m.role === 'admin' || activeGroup?.created_by === m.user_id;

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-800 text-white text-xs font-bold flex items-center justify-center border border-neutral-700">
                      {m.profile?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {m.profile?.name || 'Student'}
                        {isCurrentUser && <span className="text-[10px] text-neutral-500 font-normal">(You)</span>}
                      </h4>
                      <p className="text-[10px] text-neutral-400 font-mono">{m.profile?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMemberAdmin ? (
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30 flex items-center gap-1">
                        <ShieldCheck size={12} />
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                        Member
                      </span>
                    )}

                    {/* Group Leader Action: Remove Member */}
                    {isGroupAdmin && !isCurrentUser && !isMemberAdmin && (
                      <button
                        type="button"
                        onClick={() => setTargetRemoveMember(m)}
                        className="p-1 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                        title="Remove member from group"
                      >
                        <UserX size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Member Removal Confirmation Popover */}
      <Modal isOpen={!!targetRemoveMember} onClose={() => setTargetRemoveMember(null)} title="Remove Member">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-sm">
            <AlertTriangle size={20} className="shrink-0 text-red-400" />
            <p>
              Are you sure you want to remove <strong>{targetRemoveMember?.profile?.name}</strong> from {activeGroup?.name}? They will lose access to group exams.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setTargetRemoveMember(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isRemoving}
              onClick={handleConfirmRemove}
              icon={isRemoving ? <Loader2 size={14} className="animate-spin" /> : <UserX size={14} />}
            >
              {isRemoving ? 'Removing...' : 'Confirm Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};
