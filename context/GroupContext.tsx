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
  const { user, isLoading: isAuthLoading } = useAuth();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(true);
  const configured = isSupabaseConfigured();

  const setActiveGroup = (group: Group | null) => {
    setActiveGroupState(group);
    if (user && group) {
      localStorage.setItem(`exammate_active_group_id_${user.id}`, group.id);
    }
  };

  const fetchUserGroups = async (): Promise<Group[]> => {
    if (isAuthLoading) {
      setIsLoadingGroups(true);
      return [];
    }

    if (!user) {
      setUserGroups([]);
      setActiveGroupState(null);
      setIsLoadingGroups(false);
      return [];
    }

    if (!configured) {
      const savedMockGroups = localStorage.getItem(`exammate_groups_${user.id}`);
      const groupsList = savedMockGroups ? JSON.parse(savedMockGroups) : MOCK_DEFAULT_GROUPS;
      setUserGroups(groupsList);

      const savedActiveId = localStorage.getItem(`exammate_active_group_id_${user.id}`);
      const foundActive = groupsList.find((g: Group) => g.id === savedActiveId);
      setActiveGroupState(foundActive || groupsList[0] || null);
      setIsLoadingGroups(false);
      return groupsList;
    }

    setIsLoadingGroups(true);
    try {
      console.log('[GroupDebug] auth user id:', user.id);

      // STEP 1: Query membership rows for the authenticated user
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      console.log('[GroupDebug] group_members response:', memberRows, 'error:', memberErr);

      if (memberErr) {
        console.error('[GroupDebug] ERROR fetching group_members:', memberErr);
        throw memberErr;
      }

      if (!memberRows || memberRows.length === 0) {
        console.log('[GroupDebug] No memberships found for user_id:', user.id);
        setUserGroups([]);
        setActiveGroupState(null);
        localStorage.removeItem(`exammate_active_group_id_${user.id}`);
        return [];
      }

      const groupIds = memberRows.map((r: any) => r.group_id);
      console.log('[GroupDebug] group ids:', groupIds);

      // STEP 2: Query groups table for those group_ids
      const { data: groupRows, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      console.log('[GroupDebug] groups response:', groupRows, 'error:', groupErr);

      if (groupErr) {
        console.error('[GroupDebug] ERROR fetching groups:', groupErr);
        throw groupErr;
      }

      const roleMap = new Map(memberRows.map((r: any) => [r.group_id, r.role]));

      const fetchedGroups: Group[] = (groupRows || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        college: g.college,
        course: g.course,
        year: g.year,
        section: g.section,
        invite_code: g.invite_code,
        created_by: g.created_by,
        created_at: g.created_at,
        role: roleMap.get(g.id) || (g.created_by === user.id ? 'admin' : 'member'),
      }));

      console.log('[GroupDebug] final userGroups:', fetchedGroups);
      setUserGroups(fetchedGroups);

      const savedActiveId = localStorage.getItem(`exammate_active_group_id_${user.id}`);
      console.log('[GroupDebug] stored active group id:', savedActiveId);

      const matchedActive = fetchedGroups.find((g) => g.id === savedActiveId) || fetchedGroups[0] || null;
      console.log('[GroupDebug] resolved activeGroup:', matchedActive);

      setActiveGroupState(matchedActive);

      if (matchedActive) {
        localStorage.setItem(`exammate_active_group_id_${user.id}`, matchedActive.id);
      } else {
        localStorage.removeItem(`exammate_active_group_id_${user.id}`);
      }

      return fetchedGroups;
    } catch (err: any) {
      console.error('[GroupDebug] EXCEPTION in fetchUserGroups:', err);
      return [];
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchUserGroups();

    if (!configured || !user) return;

    // Set up Realtime subscription for group membership and group updates
    const channel = supabase
      .channel(`group_sync_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[GroupDebug] Realtime event on group_members. Refetching groups...');
          fetchUserGroups();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups',
        },
        () => {
          console.log('[GroupDebug] Realtime event on groups. Refetching groups...');
          fetchUserGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isAuthLoading, configured]);

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
      const freshGroups = await fetchUserGroups();
      const foundCreated = freshGroups.find((g) => g.id === createdGroup.id) || createdGroup;
      setActiveGroup(foundCreated);
      return { group: foundCreated };
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

      if (error) {
        if (error.message.includes('already a member')) {
          const freshGroups = await fetchUserGroups();
          const existing = freshGroups.find((g) => g.invite_code.toUpperCase() === inviteCode.trim().toUpperCase());
          if (existing) {
            setActiveGroup(existing);
          }
          return { group: existing, error: 'You are already a member of this group' };
        }
        throw error;
      }

      const joinedGroup = data as Group;
      const freshGroups = await fetchUserGroups();
      const foundJoined = freshGroups.find((g) => g.id === joinedGroup.id) || joinedGroup;
      setActiveGroup(foundJoined);
      return { group: foundJoined };
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

  // Fetch Group Members (2-Step Query for absolute reliability)
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
      console.log('[GroupDebug] getGroupMembers target group_id:', groupId);

      // STEP 1: Query group members
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, role, joined_at')
        .eq('group_id', groupId);

      console.log('[GroupDebug] roster group_members response:', memberRows, 'error:', memberErr);

      if (memberErr) {
        console.error('[GroupDebug] ERROR in getGroupMembers member query:', memberErr);
        return { members: [], error: memberErr.message };
      }

      if (!memberRows || memberRows.length === 0) {
        console.log('[GroupDebug] Zero members returned for group_id:', groupId);
        return { members: [] };
      }

      const userIds = memberRows.map((m: any) => m.user_id);
      console.log('[GroupDebug] roster userIds:', userIds);

      // STEP 2: Query profiles for member user IDs
      let profileMap = new Map();
      try {
        const { data: profileRows, error: profileErr } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, created_at')
          .in('id', userIds);

        console.log('[GroupDebug] roster profiles response:', profileRows, 'error:', profileErr);

        if (profileErr) {
          console.warn('[GroupDebug] WARNING profile fetch error:', profileErr.message);
        } else if (profileRows) {
          profileMap = new Map(profileRows.map((p: any) => [p.id, p]));
        }
      } catch (pErr: any) {
        console.warn('[GroupDebug] Profile fetch exception:', pErr.message);
      }

      // STEP 3: Combine membership rows with profiles (NEVER dropping members)
      const members: GroupMember[] = memberRows.map((item: any) => ({
        id: item.id,
        group_id: item.group_id,
        user_id: item.user_id,
        role: item.role,
        joined_at: item.joined_at,
        profile: profileMap.get(item.user_id) || {
          id: item.user_id,
          name: 'Student',
          email: '',
          created_at: item.joined_at,
        },
      }));

      console.log('[GroupDebug] final roster members:', members);
      return { members };
    } catch (err: any) {
      console.error('[GroupDebug] EXCEPTION in getGroupMembers:', err);
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
        refreshGroups: async () => { await fetchUserGroups(); },
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
