'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, KeyRound, Check, Users, ShieldCheck } from 'lucide-react';
import { useGroup } from '@/context/GroupContext';
import { Group } from '@/types/database';

interface GroupSelectorProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({ onCreateGroup, onJoinGroup }) => {
  const { userGroups, activeGroup, setActiveGroup } = useGroup();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors text-left group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shrink-0">
            <Users size={16} className="text-purple-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-neutral-400 block uppercase tracking-wider">
              ACTIVE GROUP
            </span>
            <h4 className="text-xs font-bold text-white truncate">
              {activeGroup ? activeGroup.name : 'Select a Group'}
            </h4>
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`text-neutral-400 group-hover:text-white transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-2 z-40 p-2 rounded-2xl bg-[#0b0d13] border border-white/10 shadow-2xl space-y-2 max-h-72 overflow-y-auto"
            >
              <div className="px-2 py-1 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                  MY GROUPS ({userGroups.length})
                </span>
              </div>

              {userGroups.map((group) => {
                const isSelected = activeGroup?.id === group.id;

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setActiveGroup(group);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-semibold shadow-glow'
                        : 'text-neutral-300 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">{group.name}</span>
                        {group.role === 'admin' && (
                          <ShieldCheck size={12} className={isSelected ? 'text-black' : 'text-blue-400'} />
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-mono block truncate ${
                          isSelected ? 'text-neutral-700' : 'text-neutral-400'
                        }`}
                      >
                        {group.college}
                      </span>
                    </div>

                    {isSelected && <Check size={16} className="text-black shrink-0 ml-2" />}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-neutral-800/80 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onCreateGroup();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <Plus size={14} className="text-blue-400" />
                  <span>Create a Group</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onJoinGroup();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                >
                  <KeyRound size={14} className="text-purple-400" />
                  <span>Join with Invite Code</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
