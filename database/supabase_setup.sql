-- Supabase Setup SQL (FRESH START)

-- 1. DROP EXISTING TABLES (CAUTION: This deletes all data!)
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. ENABLE EXTENSIONS
create extension if not exists "uuid-ossp";

-- TABLE: offers (To store generated offer letter data)
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    emp_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    annual_ctc NUMERIC NOT NULL,
    payload JSONB NOT NULL,
    doc_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Policies for offers
CREATE POLICY "Users can view their own offers" ON public.offers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own offers" ON public.offers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offers" ON public.offers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offers" ON public.offers
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Users Table (Extended profile if not using only Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  role text default 'user'
);

-- Audit Logs Table
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  action text not null,
  resource text,
  details jsonb,
  created_at timestamp with time zone default now()
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

-- Policies for Profiles
create policy "Users can view their own profile."
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update their own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Policies for Audit Logs
create policy "Admin can view all audit logs."
  on public.audit_logs for select
  using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

-- Allow service role to insert audit logs (no RLS policy needed — service role bypasses RLS)
-- Scoped INSERT policy: users can only insert logs for their own user_id
-- The service role client bypasses RLS entirely, so this policy only affects
-- direct client usage (which shouldn't happen, but defense-in-depth).
create policy "Users can only insert their own audit logs."
  on public.audit_logs for insert
  with check (auth.uid() = user_id);

-- ── COMPANY PROFILES TABLE ──────────────────────────────────────────────────
-- Stores reusable company profiles so users don't re-enter org details for each offer.

CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    profile_name TEXT NOT NULL,
    org_name TEXT NOT NULL DEFAULT '',
    entity_type TEXT DEFAULT 'Company',
    cin TEXT DEFAULT '',
    office_address TEXT DEFAULT '',
    signatory_name TEXT DEFAULT '',
    signatory_desig TEXT DEFAULT '',
    first_aid TEXT DEFAULT 'HR Room',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company profiles"
    ON public.company_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profiles"
    ON public.company_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profiles"
    ON public.company_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company profiles"
    ON public.company_profiles FOR DELETE
    USING (auth.uid() = user_id);

CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON public.company_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── STEP 10: DATA RETENTION ──────────────────────────────────────────────────
-- Cleanup function: deletes offers older than 30 days
-- Can be called via Supabase scheduled functions (pg_cron) or manually

CREATE OR REPLACE FUNCTION cleanup_old_offers(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.offers
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup action
  INSERT INTO public.audit_logs (action, resource, details)
  VALUES (
    'data_retention_cleanup',
    'offer_letter',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'retention_days', retention_days,
      'executed_at', NOW()
    )
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To schedule this in Supabase, run in the SQL editor:
-- SELECT cron.schedule('cleanup-old-offers', '0 3 * * *', 'SELECT cleanup_old_offers(30)');
-- This runs daily at 3:00 AM UTC and deletes offers older than 30 days.

-- ── STEP 11: SUPABASE STORAGE BUCKET FOR GENERATED DOCS ─────────────────────
-- Run this in the Supabase SQL editor to create the storage bucket:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('offer-docs', 'offer-docs', false);
--
-- Then add RLS policies for the bucket:
--
-- CREATE POLICY "Users can upload their own docs"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'offer-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "Users can view their own docs"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'offer-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- CREATE POLICY "Users can delete their own docs"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'offer-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
--
-- NOTE: Files are stored under the path: {user_id}/{offer_id}/{filename}.docx
-- This ensures each user can only access their own documents via RLS.
