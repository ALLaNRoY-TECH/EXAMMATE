'use client';

import React, { useState } from 'react';
import { KeyRound, Check, Loader2, AlertCircle } from 'lucide-react';
import { useGroup } from '@/context/GroupContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({ isOpen, onClose }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { joinGroup } = useGroup();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!inviteCode.trim()) {
      setErrorMsg('Please enter an invite code');
      return;
    }

    setIsSubmitting(true);

    try {
      const { group, error } = await joinGroup(inviteCode);
      if (error) {
        setErrorMsg(error);
      } else if (group) {
        setSuccessMsg(`Joined ${group.name}`);
        setTimeout(() => {
          setSuccessMsg('');
          setInviteCode('');
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join a Group">
      <form onSubmit={handleJoin} className="space-y-4">
        <p className="text-xs font-mono text-neutral-400">
          Enter the 6-character invite code shared by your classmate or course representative.
        </p>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs">
            <Check size={16} className="text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-mono text-neutral-300 uppercase">INVITE CODE</label>
          <div className="relative">
            <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              required
              maxLength={8}
              placeholder="e.g. FLA82K"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-lg font-mono font-bold tracking-widest focus:outline-none focus:border-white transition-colors uppercase"
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full pt-3"
          disabled={isSubmitting}
          icon={isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
        >
          {isSubmitting ? 'Verifying Code...' : 'Join Group'}
        </Button>
      </form>
    </Modal>
  );
};
