'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { Group, GroupMember } from '@/types/database';

interface GroupContextType {
  userGroups: Group[];
  activeGroup: Group | null;
  isLoadingGroups: boolean;
  setActiveGroup: (group: Group | null) => void;
  createGroup: (name: string, college: string, course: string, year: string, section?: string) => Promise<{ group?: Group; error?: string }>;
  joinGroup: (inviteCode: string) => Promise<{ group?: Group; error?: string }>;
  leaveGroup: (groupId: string) => Promise<{ error?: string }>;
  removeMember: (groupId: string, targetUserId: string) => Promise<{ error?: string }>;
  getGroupMembers: (groupId: string) => Promise<{ members: GroupMember[]; error?: string }>;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

// Initial Mock Group for local preview
const MOCK_DEFAULT_GROUPS: Group[] = [
  {
    id: 'group-1',
    name: 'SRM CSE — 2026',
    college: 'SRM Institute of Science and Technology',
    course: 'Computer Science and Engineering',
    year: '3rd Year',
    section: 'A',
    invite_code: 'FLA82K',
    created_by: 'mock-user-1',
    role: 'admin',
    member_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'group-2',
    name: 'DSA Study Group',
    college: 'SRM Institute of Science and Technology',
    course: 'Data Structures & Algorithms',
    year: '3rd Year',
    section: 'B',
    invite_code: 'DSA99X',
    created_by: 'friend-user-2',
    role: 'member',
    member_count: 8,
    created_at: new Date().toISOString(),
  },
];

export const GroupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  const fetchUserGroups = async () => {
    if (!user) {
      setUserGroups([]);
      setActiveGroup(null);
      setIsLoadingGroups(false);
      return;
    }

    if (!configured) {
      const savedMockGroups = localStorage.getItem(`exammate_groups_${user.id}`);
      const groupsList = savedMockGroups ? JSON.parse(savedMockGroups) : MOCK_DEFAULT_GROUPS;
      setUserGroups(groupsList);
      setActiveGroup((prev) => prev || groupsList[0] || null);
      setIsLoadingGroups(false);
      return;
    }

    setIsLoadingGroups(true);
    try {
      // Query groups user is a member of
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id, role, groups(*)')
        .eq('user_id', user.id);

      if (memberErr) throw memberErr;

      if (memberRows) {
        const fetchedGroups: Group[] = memberRows
          .filter((row: any) => row.groups)
          .map((row: any) => ({
            ...row.groups,
            role: row.role,
          }));

        setUserGroups(fetchedGroups);
        setActiveGroup((prev) => {
          if (!prev) return fetchedGroups[0] || null;
          const updatedActive = fetchedGroups.find((g) => g.id === prev.id);
          return updatedActive || fetchedGroups[0] || null;
        });
      }
    } catch (err: any) {
      console.error('Error fetching user groups:', err.message);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchUserGroups();
  }, [user, configured]);

  // Create Group RPC
  const createGroup = async (name: string, college: string, course: string, year: string, section?: string) => {
    if (!user) return { error: 'Authentication required' };

    if (!configured) {
      const newGroup: Group = {
        id: `group-${Date.now()}`,
        name,
        college,
        course,
        year,
        section,
        invite_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        created_by: user.id,
        role: 'admin',
        member_count: 1,
        created_at: new Date().toISOString(),
      };

      const updated = [newGroup, ...userGroups];
      setUserGroups(updated);
      setActiveGroup(newGroup);
      localStorage.setItem(`exammate_groups_${user.id}`, JSON.stringify(updated));
      return { group: newGroup };
    }

    try {
      const { data, error } = await supabase.rpc('create_group', {
        p_name: name,
        p_college: college,
        p_course: course,
        p_year: year,
        p_section: section || null,
      });

      if (error) throw error;

      const createdGroup = data as Group;
      await fetchUserGroups();
      setActiveGroup(createdGroup);
      return { group: createdGroup };
    } catch (err: any) {
      return { error: err.message || 'Failed to create group' };
    }
  };

  // Join Group RPC (Normalized & Validated)
  const joinGroup = async (inviteCode: string) => {
    if (!user) return { error: 'Authentication required' };

    if (!configured) {
      const normalized = inviteCode.trim().toUpperCase();
      if (normalized === 'FLA82K') {
        const joined = MOCK_DEFAULT_GROUPS[0];
        if (!userGroups.some((g) => g.id === joined.id)) {
          const updated = [joined, ...userGroups];
          setUserGroups(updated);
          setActiveGroup(joined);
          localStorage.setItem(`exammate_groups_${user.id}`, JSON.stringify(updated));
        }
        return { group: joined };
      }
      return { error: 'Group not found with code: ' + inviteCode };
    }

    try {
      const { data, error } = await supabase.rpc('join_group_by_code', {
        p_invite_code: inviteCode,
      });

      if (error) throw error;

      const joinedGroup = data as Group;
      await fetchUserGroups();
      setActiveGroup(joinedGroup);
      return { group: joinedGroup };
    } catch (err: any) {
      return { error: err.message || 'Failed to join group' };
    }
  };

  // Leave Group
  const leaveGroup = async (groupId: string) => {
    if (!user) return { error: 'Authentication required' };

    const targetGroup = userGroups.find((g) => g.id === groupId);
    if (targetGroup?.role === 'admin' && targetGroup.created_by === user.id) {
      return { error: 'As group admin, you cannot leave your group directly. Delete the group or transfer admin ownership.' };
    }

    if (!configured) {
      const updated = userGroups.filter((g) => g.id !== groupId);
      setUserGroups(updated);
      if (activeGroup?.id === groupId) {
        setActiveGroup(updated[0] || null);
      }
      localStorage.setItem(`exammate_groups_${user.id}`, JSON.stringify(updated));
      return {};
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserGroups();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to leave group' };
    }
  };

  // Remove Member RPC (Admin Control)
  const removeMember = async (groupId: string, targetUserId: string) => {
    if (!user) return { error: 'Authentication required' };

    if (!configured) {
      return {};
    }

    try {
      const { error } = await supabase.rpc('remove_group_member', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      });

      if (error) throw error;
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to remove member' };
    }
  };

  // Fetch Group Members
  const getGroupMembers = async (groupId: string) => {
    if (!configured) {
      return {
        members: [
          {
            id: 'm1',
            group_id: groupId,
            user_id: user?.id || 'mock-user-1',
            role: 'admin',
            joined_at: new Date().toISOString(),
            profile: {
              id: user?.id || 'mock-user-1',
              name: 'Allan Roy',
              email: 'allan@srmist.edu.in',
              created_at: new Date().toISOString(),
            },
          },
          {
            id: 'm2',
            group_id: groupId,
            user_id: 'friend-user-2',
            role: 'member',
            joined_at: new Date().toISOString(),
            profile: {
              id: 'friend-user-2',
              name: 'Classmate Friend',
              email: 'friend@srmist.edu.in',
              created_at: new Date().toISOString(),
            },
          },
        ] as GroupMember[],
      };
    }

    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, role, joined_at, profiles(id, name, email, avatar_url, created_at)')
        .eq('group_id', groupId);

      if (error) throw error;

      const members: GroupMember[] = (data || []).map((item: any) => ({
        id: item.id,
        group_id: item.group_id,
        user_id: item.user_id,
        role: item.role,
        joined_at: item.joined_at,
        profile: item.profiles,
      }));

      return { members };
    } catch (err: any) {
      return { members: [], error: err.message || 'Failed to fetch members' };
    }
  };

  return (
    <GroupContext.Provider
      value={{
        userGroups,
        activeGroup,
        isLoadingGroups,
        setActiveGroup,
        createGroup,
        joinGroup,
        leaveGroup,
        removeMember,
        getGroupMembers,
        refreshGroups: fetchUserGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};
