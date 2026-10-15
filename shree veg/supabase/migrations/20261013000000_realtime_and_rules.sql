-- ==============================================================================
-- SHREE PURE VEG - REALTIME & MANAGEMENT SCHEMA ENHANCEMENT
-- ==============================================================================

-- 1. Enable Supabase Realtime publication on menu_items, date_rules, and group_packages
-- so changes made in /admin appear on /book within seconds!
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.date_rules;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_packages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Verify and enforce RLS policies for Menu, Date Rules, and Packages
-- Owner & Manager can modify; Kitchen & Public are read-only!

-- Menu items RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Owner and Manager can modify menu items" ON public.menu_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Public can view active menu items" 
    ON public.menu_items FOR SELECT 
    USING (true);

CREATE POLICY "Owner and Manager can modify menu items" 
    ON public.menu_items FOR ALL 
    USING (
        restaurant_id = public.get_auth_restaurant_id() 
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    )
    WITH CHECK (
        restaurant_id = public.get_auth_restaurant_id() 
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    );

-- Date rules RLS
ALTER TABLE public.date_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view date rules" ON public.date_rules;
    DROP POLICY IF EXISTS "Owner and Manager can modify date rules" ON public.date_rules;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Public can view date rules" 
    ON public.date_rules FOR SELECT 
    USING (true);

CREATE POLICY "Owner and Manager can modify date rules" 
    ON public.date_rules FOR ALL 
    USING (
        restaurant_id = public.get_auth_restaurant_id() 
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    )
    WITH CHECK (
        restaurant_id = public.get_auth_restaurant_id() 
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    );

-- Group packages RLS
ALTER TABLE public.group_packages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active packages" ON public.group_packages;
    DROP POLICY IF EXISTS "Owner and Manager can modify group packages" ON public.group_packages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Public can view active packages" 
    ON public.group_packages FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Owner and Manager can modify group packages" 
    ON public.group_packages FOR ALL 
    USING (
        restaurant_id = public.get_auth_restaurant_id() 
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    )
    WITH CHECK (
        restaurant_id = public.get_auth_restaurant_id() 
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    );
