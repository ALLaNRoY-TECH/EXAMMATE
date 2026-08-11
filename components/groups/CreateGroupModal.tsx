'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Building, GraduationCap, Calendar, Check, Copy, Loader2, KeyRound } from 'lucide-react';
import { useGroup } from '@/context/GroupContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Group } from '@/types/database';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [college, setCollege] = useState('SRM Institute of Science and Technology');
  const [course, setCourse] = useState('Computer Science and Engineering');
  const [year, setYear] = useState('3rd Year');
  const [section, setSection] = useState('A');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [copied, setCopied] = useState(false);

  const { createGroup } = useGroup();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !college.trim() || !course.trim()) {
      setErrorMsg('Please fill in required group fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const { group, error } = await createGroup(name, college, course, year, section);
      if (error) {
        setErrorMsg(error);
      } else if (group) {
        setCreatedGroup(group);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (createdGroup?.invite_code) {
      navigator.clipboard.writeText(createdGroup.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    setCreatedGroup(null);
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleFinish} title={createdGroup ? 'Group Created' : 'Create a Group'}>
      {!createdGroup ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-xs font-mono text-neutral-400">
            Create a shared group for your class. You will automatically become the group admin.
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-neutral-300 uppercase">Group Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. SRM CSE 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-neutral-300 uppercase">College / University *</label>
            <input
              type="text"
              required
              placeholder="e.g. SRM Institute of Science and Technology"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-neutral-300 uppercase">Course / Branch *</label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Science"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono text-neutral-300 uppercase">Year *</label>
              <input
                type="text"
                required
                placeholder="e.g. 3rd Year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono text-neutral-300 uppercase">Section (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Section A"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full pt-3"
            disabled={isSubmitting}
            icon={isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
          >
            {isSubmitting ? 'Creating Group...' : 'Create Group'}
          </Button>
        </form>
      ) : (
        <div className="space-y-5 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Check size={24} />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">{createdGroup.name}</h3>
            <p className="text-xs font-mono text-neutral-400">{createdGroup.college}</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <span className="text-[10px] font-mono text-neutral-500 block uppercase">UNIQUE GROUP INVITE CODE</span>
            <span className="text-3xl font-black font-mono tracking-widest text-white block">
              {createdGroup.invite_code}
            </span>
            <p className="text-[11px] text-neutral-400">Share this code with your classmates to let them join.</p>

            <Button
              type="button"
              variant={copied ? 'secondary' : 'primary'}
              size="sm"
              className="w-full mt-2"
              icon={copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              onClick={handleCopyCode}
            >
              {copied ? 'Copied to Clipboard' : 'Copy Invite Code'}
            </Button>
          </div>

          <Button variant="outline" size="md" className="w-full" onClick={handleFinish}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
};
