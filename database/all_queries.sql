-- ══════════════════════════════════════════════════════════════════════════════
-- COMPLETE DATABASE SETUP (WITH AUTH)
-- Run this in your Supabase SQL Editor to set up all tables.
-- Includes user_id columns, RLS policies, and profiles table.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. DROP EXISTING TABLES (CAUTION: This deletes all data!)
DROP TABLE IF EXISTS public.company_profiles CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: profiles
-- Auto-created when a user signs up (via trigger)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: offers
-- Stores generated offer letter data (scoped to authenticated user)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emp_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    annual_ctc NUMERIC NOT NULL,
    payload JSONB NOT NULL,
    doc_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offers"
    ON public.offers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own offers"
    ON public.offers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offers"
    ON public.offers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offers"
    ON public.offers FOR DELETE
    USING (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: company_profiles
-- Reusable company profiles so users don't re-enter org details for each offer
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE POLICY "Users can view own company profiles"
    ON public.company_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company profiles"
    ON public.company_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company profiles"
    ON public.company_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own company profiles"
    ON public.company_profiles FOR DELETE
    USING (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER: Auto-update updated_at on row changes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON public.offers
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_company_profiles_updated_at
    BEFORE UPDATE ON public.company_profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ══════════════════════════════════════════════════════════════════════════════
-- FUNCTION: Data Retention Cleanup
-- Deletes offers older than N days (default 30)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION cleanup_old_offers(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.offers
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- To schedule cleanup daily at 3:00 AM UTC:
-- SELECT cron.schedule('cleanup-old-offers', '0 3 * * *', 'SELECT cleanup_old_offers(30)');
