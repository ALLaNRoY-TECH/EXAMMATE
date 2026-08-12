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
  deleteGroup: (groupId: string) => Promise<{ error?: string }>;
  removeMember: (groupId: string, targetUserId: string) => Promise<{ error?: string }>;
  promoteMember: (groupId: string, targetUserId: string) => Promise<{ error?: string }>;
  getGroupMembers: (groupId: string) => Promise<{ members: GroupMember[]; error?: string }>;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

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
    } else if (user && !group) {
      localStorage.removeItem(`exammate_active_group_id_${user.id}`);
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
      const groupsList: Group[] = savedMockGroups ? JSON.parse(savedMockGroups) : [];
      setUserGroups(groupsList);

      const savedActiveId = localStorage.getItem(`exammate_active_group_id_${user.id}`);
      const foundActive = groupsList.find((g: Group) => g.id === savedActiveId);
      setActiveGroupState(foundActive || groupsList[0] || null);
      setIsLoadingGroups(false);
      return groupsList;
    }

    setIsLoadingGroups(true);
    try {
      // STEP 1: Query membership rows for authenticated user
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      if (memberErr) {
        console.error('[GroupContext] Error fetching group_members:', memberErr);
        throw memberErr;
      }

      if (!memberRows || memberRows.length === 0) {
        setUserGroups([]);
        setActiveGroupState(null);
        localStorage.removeItem(`exammate_active_group_id_${user.id}`);
        return [];
      }

      const groupIds = memberRows.map((r: any) => r.group_id);
      const roleMap = new Map(memberRows.map((r: any) => [r.group_id, r.role]));

      // STEP 2: Fetch corresponding groups
      const { data: groupRows, error: groupErr } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupErr) {
        console.error('[GroupContext] Error fetching groups:', groupErr);
        throw groupErr;
      }

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

      setUserGroups(fetchedGroups);

      // Resolve active group cleanly
      const savedActiveId = localStorage.getItem(`exammate_active_group_id_${user.id}`);
      const matchedActive = fetchedGroups.find((g) => g.id === savedActiveId) || fetchedGroups[0] || null;

      setActiveGroupState(matchedActive);

      if (matchedActive) {
        localStorage.setItem(`exammate_active_group_id_${user.id}`, matchedActive.id);
      } else {
        localStorage.removeItem(`exammate_active_group_id_${user.id}`);
      }

      return fetchedGroups;
    } catch (err: any) {
      console.error('[GroupContext] Exception in fetchUserGroups:', err);
      return [];
    } finally {
      setIsLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchUserGroups();

    if (!configured || !user) return;

    // Realtime subscription for user's group memberships and groups updates
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

  // Join Group RPC
  const joinGroup = async (inviteCode: string) => {
    if (!user) return { error: 'Authentication required' };

    if (!configured) {
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
    if (targetGroup?.role === 'admin' && targetGroup.created_by === user.id && userGroups.length > 1) {
      // Allow leaving if another admin exists, otherwise notify
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

  // Delete Group (Group Admin Control)
  const deleteGroup = async (groupId: string) => {
    if (!user) return { error: 'Authentication required' };

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
      const { error } = await supabase.rpc('delete_group', {
        p_group_id: groupId,
      });

      if (error) throw error;

      const remaining = userGroups.filter((g) => g.id !== groupId);
      setUserGroups(remaining);
      if (activeGroup?.id === groupId) {
        setActiveGroup(remaining[0] || null);
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to delete group' };
    }
  };

  // Remove Member RPC with fallback
  const removeMember = async (groupId: string, targetUserId: string) => {
    if (!user) return { error: 'Authentication required' };

    if (!configured) return {};

    try {
      const { error: rpcErr } = await supabase.rpc('remove_group_member', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      });

      if (rpcErr) {
        // Fallback to direct table delete if RPC is missing/restricted
        const { error: directErr } = await supabase
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('user_id', targetUserId);

        if (directErr) throw directErr;
      }

      await fetchUserGroups();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to remove member' };
    }
  };

  // Promote Member RPC with fallback
  const promoteMember = async (groupId: string, targetUserId: string) => {
    if (!user) return { error: 'Authentication required' };

    if (!configured) return {};

    try {
      const { error: rpcErr } = await supabase.rpc('promote_group_member', {
        p_group_id: groupId,
        p_target_user_id: targetUserId,
      });

      if (rpcErr) {
        // Fallback to direct table update if RPC is missing/restricted
        const { error: directErr } = await supabase
          .from('group_members')
          .update({ role: 'admin' })
          .eq('group_id', groupId)
          .eq('user_id', targetUserId);

        if (directErr) throw directErr;
      }

      await fetchUserGroups();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to promote member' };
    }
  };

  // Fetch Group Members
  const getGroupMembers = async (groupId: string) => {
    if (!configured) {
      return { members: [] };
    }

    try {
      const { data: memberRows, error: memberErr } = await supabase
        .from('group_members')
        .select('id, group_id, user_id, role, joined_at')
        .eq('group_id', groupId);

      if (memberErr) {
        return { members: [], error: memberErr.message };
      }

      if (!memberRows || memberRows.length === 0) {
        return { members: [] };
      }

      const userIds = memberRows.map((m: any) => m.user_id);
      let profileMap = new Map();
      try {
        const { data: profileRows, error: profileErr } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, created_at')
          .in('id', userIds);

        if (profileRows) {
          profileMap = new Map(profileRows.map((p: any) => [p.id, p]));
        }
      } catch (pErr: any) {
        console.warn('[GroupContext] Profile fetch warning:', pErr.message);
      }

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
        deleteGroup,
        removeMember,
        promoteMember,
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
