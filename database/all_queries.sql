-- ══════════════════════════════════════════════════════════════════════════════
-- COMPLETE DATABASE SETUP (NO AUTH)
-- Run this in your Supabase SQL Editor to set up all tables.
-- All auth references (user_id, RLS, policies, profiles, audit_logs) removed.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. DROP EXISTING TABLES (CAUTION: This deletes all data!)
DROP TABLE IF EXISTS public.company_profiles CASCADE;
DROP TABLE IF EXISTS public.offers CASCADE;

-- Drop legacy auth remnants if they exist
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: offers
-- Stores generated offer letter data
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emp_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    annual_ctc NUMERIC NOT NULL,
    payload JSONB NOT NULL,
    doc_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════════════════════
-- TABLE: company_profiles
-- Reusable company profiles so users don't re-enter org details for each offer
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
