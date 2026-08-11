'use client';

import React from 'react';
import { Users, KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  onJoinGroup,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center space-y-6 py-2">
        <div className="w-12 h-12 rounded-2xl bg-white text-black font-black text-2xl flex items-center justify-center mx-auto shadow-glow">
          E
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Welcome to ExamMate</h2>
          <p className="text-xs font-mono text-neutral-400">
            Never ask &quot;When&apos;s the exam?&quot; again. What would you like to do first?
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            icon={<Users size={18} />}
            onClick={() => {
              onClose();
              onCreateGroup();
            }}
          >
            Create a Group for your Class
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full flex items-center justify-center gap-2"
            icon={<KeyRound size={18} />}
            onClick={() => {
              onClose();
              onJoinGroup();
            }}
          >
            Join a Group with Invite Code
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono text-neutral-500 hover:text-neutral-300 transition-colors pt-2 block mx-auto cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>
    </Modal>
  );
};
