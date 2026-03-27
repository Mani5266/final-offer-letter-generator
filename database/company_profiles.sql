-- ══════════════════════════════════════════════════════════════════════════════
-- COMPANY PROFILES TABLE
-- Run this in your Supabase SQL Editor to enable the Company Profile feature.
-- Stores reusable company profiles so users don't re-enter org details for each offer.
-- ══════════════════════════════════════════════════════════════════════════════

-- Ensure uuid-ossp extension is available (should already exist from initial setup)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the table
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

-- Enable Row Level Security
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own profiles
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

-- Auto-update updated_at on row changes
-- (uses the update_updated_at_column() trigger function from supabase_setup.sql)
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON public.company_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
