export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  college: string;
  course: string;
  year: string;
  section?: string;
  invite_code: string;
  created_by: string;
  role?: 'admin' | 'member';
  member_count?: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: Profile;
}
