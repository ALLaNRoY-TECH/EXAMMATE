-- ====================================================================
-- EXAMMATE SECURE SUPABASE DATABASE SCHEMA, RPCs & RLS POLICIES
-- Paste this complete SQL file into your Supabase Project's SQL Editor
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. PROFILES TABLE
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger Function: Automatically create profile record when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Student'
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Safe Backfill: Create profiles for existing auth.users who signed in before schema creation
INSERT INTO public.profiles (id, name, email, avatar_url)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    'Student'
  ) AS name,
  u.email,
  u.raw_user_meta_data->>'avatar_url' AS avatar_url
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);


-- --------------------------------------------------------------------
-- 2. GROUPS TABLE & SECURE INVITE CODE GENERATOR
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  college TEXT NOT NULL,
  course TEXT NOT NULL,
  year TEXT NOT NULL,
  section TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Helper Function: Generate unique 6-character uppercase alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_unique_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS (SELECT 1 FROM public.groups WHERE invite_code = result) INTO code_exists;
    IF NOT code_exists THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- --------------------------------------------------------------------
-- 3. GROUP MEMBERS TABLE WITH ROLE CONSTRAINT
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);


-- --------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- --------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);


-- --------------------------------------------------------------------
-- 5. SECURE RLS HELPER FUNCTIONS (PREVENTS RLS RECURSION)
-- --------------------------------------------------------------------

-- Check if caller is a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members 
    WHERE group_id = p_group_id 
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Check if caller shares any group with target user
CREATE OR REPLACE FUNCTION public.shares_group_with(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid() 
      AND gm2.user_id = p_target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Check if caller is the creator/admin of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.groups 
    WHERE id = p_group_id 
      AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- --------------------------------------------------------------------
-- 6. SECURE ATOMIC DATABASE RPC FUNCTIONS
-- --------------------------------------------------------------------

-- RPC 1: Create Group (Atomic creation + creator added as admin)
CREATE OR REPLACE FUNCTION public.create_group(
  p_name TEXT,
  p_college TEXT,
  p_course TEXT,
  p_year TEXT,
  p_section TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_code TEXT;
  v_group_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_code := public.generate_unique_invite_code();

  INSERT INTO public.groups (name, college, course, year, section, invite_code, created_by)
  VALUES (p_name, p_college, p_course, p_year, p_section, v_code, v_user_id)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'admin');

  SELECT json_build_object(
    'id', g.id,
    'name', g.name,
    'college', g.college,
    'course', g.course,
    'year', g.year,
    'section', g.section,
    'invite_code', g.invite_code,
    'created_by', g.created_by,
    'role', 'admin',
    'created_at', g.created_at
  )::jsonb INTO v_result
  FROM public.groups g WHERE g.id = v_group_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- RPC 2: Join Group By Code (Case-insensitive, normalized, secure validation)
CREATE OR REPLACE FUNCTION public.join_group_by_code(p_invite_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_normalized_code TEXT;
  v_group RECORD;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_normalized_code := UPPER(TRIM(p_invite_code));

  SELECT * INTO v_group FROM public.groups WHERE UPPER(invite_code) = v_normalized_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found with invite code: %', p_invite_code;
  END IF;

  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = v_group.id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'You are already a member of this group';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group.id, v_user_id, 'member');

  SELECT json_build_object(
    'id', v_group.id,
    'name', v_group.name,
    'college', v_group.college,
    'course', v_group.course,
    'year', v_group.year,
    'section', v_group.section,
    'invite_code', v_group.invite_code,
    'created_by', v_group.created_by,
    'role', 'member',
    'created_at', v_group.created_at
  )::jsonb INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- RPC 3: Remove Member (Group Leader Control)
CREATE OR REPLACE FUNCTION public.remove_group_member(p_group_id UUID, p_target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Group admin cannot remove themselves using member removal';
  END IF;

  v_is_admin := public.is_group_admin(p_group_id);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only the group admin can remove members';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id AND user_id = p_target_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot remove group admin';
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- --------------------------------------------------------------------
-- 7. FUNCTION PRIVILEGE RESTRICTIONS
-- --------------------------------------------------------------------

-- Revoke permissions from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_unique_invite_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.shares_group_with(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_group(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_group_by_code(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID) FROM PUBLIC, anon;

-- Grant permissions only to authenticated users
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_group_with(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID) TO authenticated;


-- --------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- --------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
CREATE POLICY "Profiles read policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.shares_group_with(id)
  );

DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;
CREATE POLICY "Profiles update policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Groups Policies
DROP POLICY IF EXISTS "Groups read policy" ON public.groups;
CREATE POLICY "Groups read policy"
  ON public.groups FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR public.is_group_member(id)
  );

DROP POLICY IF EXISTS "Groups update policy" ON public.groups;
CREATE POLICY "Groups update policy"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Groups delete policy" ON public.groups;
CREATE POLICY "Groups delete policy"
  ON public.groups FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Group Members Policies
DROP POLICY IF EXISTS "Group members read policy" ON public.group_members;
CREATE POLICY "Group members read policy"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_group_member(group_id)
  );

DROP POLICY IF EXISTS "Group members delete policy" ON public.group_members;
CREATE POLICY "Group members delete policy"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_group_admin(group_id)
  );

-- --------------------------------------------------------------------
-- 9. EXAMS TABLE, INDEXES & RLS POLICIES
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  course_code TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  exam_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  venue TEXT,
  mode TEXT DEFAULT 'Physical',
  portion TEXT,
  pattern TEXT,
  marks INTEGER DEFAULT 0,
  conversion TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for fast query execution
CREATE INDEX IF NOT EXISTS idx_exams_group_id ON public.exams(group_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON public.exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- Exams RLS Policies
DROP POLICY IF EXISTS "Exams read policy" ON public.exams;
CREATE POLICY "Exams read policy"
  ON public.exams FOR SELECT
  TO authenticated
  USING (
    public.is_group_member(group_id)
  );

DROP POLICY IF EXISTS "Exams insert policy" ON public.exams;
CREATE POLICY "Exams insert policy"
  ON public.exams FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_group_member(group_id) AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Exams update policy" ON public.exams;
CREATE POLICY "Exams update policy"
  ON public.exams FOR UPDATE
  TO authenticated
  USING (
    public.is_group_member(group_id)
  );

DROP POLICY IF EXISTS "Exams delete policy" ON public.exams;
CREATE POLICY "Exams delete policy"
  ON public.exams FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR public.is_group_admin(group_id)
  );

-- --------------------------------------------------------------------
-- 10. REALTIME PUBLICATION SETUP (IDEMPOTENT)
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'groups') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_members') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'exams') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
    END IF;
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 11. RESET UTILITY (RUN IN SUPABASE SQL EDITOR TO RESET ALL GROUPS & EXAMS)
-- --------------------------------------------------------------------
-- TRUNCATE TABLE public.exams, public.group_members, public.groups CASCADE;

