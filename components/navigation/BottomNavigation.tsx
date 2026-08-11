'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Home, Calendar, PlusCircle, Settings } from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Overview', icon: Home },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar },
    { id: 'add' as NavTab, label: 'Add Exam', icon: PlusCircle, isSpecial: true },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#08090e]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer select-none ${
                isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomTab"
                  className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-1">
                {tab.isSpecial ? (
                  <div
                    className={`p-1.5 rounded-full transition-transform ${
                      isActive ? 'bg-white text-black scale-105 shadow-glow' : 'bg-neutral-800 text-white'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                ) : (
                  <Icon size={20} className={isActive ? 'text-white' : 'text-neutral-400'} />
                )}
                <span className="text-[10px] font-semibold tracking-tight">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
