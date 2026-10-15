-- ==============================================================================
-- SHREE PURE VEG - COMPLETE SUPABASE DATABASE MIGRATION
-- Location: Theur Phata, Pune-Solapur Highway (Kunjirwadi, Haveli, Pune 412201)
-- Stack: Next.js App Router + Supabase (Postgres + Auth + Realtime + RLS)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLES
-- ==============================================================================

-- 1.1 Restaurants Table (Single row now, designed for multi-tenant scalability)
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    google_rating NUMERIC(2,1) DEFAULT 4.6,
    reviews_count INT DEFAULT 989,
    default_slot_capacity INT NOT NULL DEFAULT 30,       -- 30 seats per 30-min slot
    festival_slot_capacity INT NOT NULL DEFAULT 12,      -- 12 seats on festival dates
    max_table_party_size INT NOT NULL DEFAULT 12,        -- Max 12 guests per single table
    max_festival_table_party_size INT NOT NULL DEFAULT 10, -- Max 10 on festival dates
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Staff Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'kitchen')),
    full_name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, restaurant_id)
);

-- 1.3 Menu Items Table (Pure Veg specialties)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_mr TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'main_course' CHECK (category IN ('thali', 'breakfast', 'main_course', 'dessert', 'beverage')),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_sold_out BOOLEAN NOT NULL DEFAULT false,
    description_en TEXT,
    description_mr TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Group Packages Table (Pilgrim & family thali feasts)
CREATE TABLE IF NOT EXISTS public.group_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name_en TEXT NOT NULL,
    name_mr TEXT NOT NULL,
    price_per_head NUMERIC(10,2) NOT NULL CHECK (price_per_head >= 0),
    min_guests INT NOT NULL DEFAULT 6 CHECK (min_guests > 0),
    description_en TEXT,
    description_mr TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 Date Rules Table (Blocked dates & Festival modes like Angarki Chaturthi)
CREATE TABLE IF NOT EXISTS public.date_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('blocked', 'festival')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(restaurant_id, date)
);

-- 1.6 Bookings Table (Table, Group Meal, Order Ahead)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    token_number TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('table', 'group_meal', 'order_ahead')),
    party_size INT NOT NULL CHECK (party_size > 0),
    slot_start TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'seated', 'no_show', 'cancelled')),
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    notes TEXT,
    package_id UUID REFERENCES public.group_packages(id) ON DELETE SET NULL,
    estimated_prep_time_mins INT,
    rejection_reason TEXT,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.7 Booking Items Table (Order ahead & pre-order dish selections)
CREATE TABLE IF NOT EXISTS public.booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 Push Subscriptions Table (VAPID web push for staff devices)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.9 Message Log Table (WhatsApp wa.me link generation & Cloud API audibility)
CREATE TABLE IF NOT EXISTS public.message_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    recipient_phone TEXT NOT NULL,
    message_type TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'wa_me',
    status TEXT NOT NULL DEFAULT 'sent',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. INDEXES FOR HIGH-SPEED LOOKUPS ON NH-65 4G
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_slot ON public.bookings (restaurant_id, slot_start);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone_slot ON public.bookings (restaurant_id, guest_phone, slot_start);
CREATE INDEX IF NOT EXISTS idx_date_rules_date ON public.date_rules (restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items (booking_id);

-- ==============================================================================
-- 3. ATOMIC BOOKING FUNCTION (WITH ADVISORY LOCK & CONCURRENCY CONTROL)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_booking(
    p_restaurant_id UUID,
    p_type TEXT,
    p_party_size INT,
    p_slot_start TIMESTAMPTZ,
    p_guest_name TEXT,
    p_guest_phone TEXT,
    p_notes TEXT DEFAULT NULL,
    p_package_id UUID DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_is_demo BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_booking_date DATE;
    v_clean_phone TEXT;
    v_date_rule RECORD;
    v_is_festival BOOLEAN := false;
    v_slot_capacity INT := 30;
    v_max_table_size INT := 12;
    v_current_booked INT := 0;
    v_token_prefix TEXT;
    v_daily_seq INT;
    v_token_number TEXT;
    v_booking_id UUID;
    v_item JSONB;
    v_menu_item_id UUID;
    v_quantity INT;
    v_item_price NUMERIC(10,2);
    v_total_amount NUMERIC(10,2) := 0;
    v_package_price NUMERIC(10,2) := 0;
    v_package_min_guests INT := 0;
    v_lock_key BIGINT;
BEGIN
    -- 1. Basic validation
    IF p_party_size <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_PARTY_SIZE', 'message_mr', 'व्यक्तींची संख्या वैध असावी.', 'message_en', 'Party size must be greater than zero.');
    END IF;

    IF p_type NOT IN ('table', 'group_meal', 'order_ahead') THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_TYPE', 'message_mr', 'आरक्षण प्रकार अवैध आहे.', 'message_en', 'Invalid booking type.');
    END IF;

    -- Clean phone number (keep digits only)
    v_clean_phone := regexp_replace(p_guest_phone, '\D', '', 'g');
    IF length(v_clean_phone) < 10 THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_PHONE', 'message_mr', 'मोबाईल नंबर १० अंकी असावा.', 'message_en', 'Please enter a valid 10-digit mobile number.');
    END IF;

    v_booking_date := (p_slot_start AT TIME ZONE 'Asia/Kolkata')::date;

    -- 2. ACQUIRE TRANSACTIONAL ADVISORY LOCK
    -- Hashes (restaurant_id + slot_start) into a single 64-bit integer
    -- Serializes bookings for this exact 30-minute window without blocking other slots
    v_lock_key := ('x' || substr(md5(p_restaurant_id::text || '_' || p_slot_start::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 3. CHECK DATE RULES (Blocked or Festival)
    SELECT * INTO v_date_rule
    FROM public.date_rules
    WHERE restaurant_id = p_restaurant_id AND date = v_booking_date;

    IF FOUND THEN
        IF v_date_rule.kind = 'blocked' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'DATE_BLOCKED',
                'message_mr', COALESCE(v_date_rule.note, 'सदर तारखेसाठी बुकिंग बंद आहे (हॉटेल देखभाल किंवा विशेष कार्यक्रम).'),
                'message_en', 'This date is currently blocked for bookings: ' || COALESCE(v_date_rule.note, 'Private Event/Maintenance')
            );
        ELSIF v_date_rule.kind = 'festival' THEN
            v_is_festival := true;
            IF p_type = 'group_meal' THEN
                v_slot_capacity := 24;     -- Dedicated Pangat capacity for pilgrim groups (12-16+ guests)
            ELSE
                v_slot_capacity := 12;     -- Capacity reduced to 12 seats per 30-min slot on festival days for general tables
            END IF;
            v_max_table_size := 10;    -- Max 10 guests per table on festival days
        END IF;
    END IF;

    -- 4. CHECK TABLE SIZE LIMITS
    IF p_type = 'table' THEN
        IF v_is_festival AND p_party_size > v_max_table_size THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'EXCEEDS_FESTIVAL_TABLE_LIMIT',
                'message_mr', 'सण/उत्सव दिवशी एका टेबलवर कमाल १० व्यक्तींची मर्यादा आहे. मोठ्या समूहासाठी कृपया पंगत थाळी निवडा.',
                'message_en', 'On festival dates, single table bookings are restricted to a maximum of 10 guests. Please choose Pilgrim Group Meal.'
            );
        ELSIF p_party_size > v_max_table_size THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'EXCEEDS_TABLE_LIMIT',
                'message_mr', 'एका टेबलसाठी कमाल १२ व्यक्तींची मर्यादा आहे. १२ पेक्षा जास्त व्यक्तींसाठी कृपया "भाविक व कुटुंब पंगत थाळी" निवडा.',
                'message_en', 'Single table bookings are limited to 12 guests. For 13+ guests, please choose Pilgrim Group Meal.'
            );
        END IF;
    END IF;

    -- 5. CHECK GROUP MEAL PACKAGE VALIDATION (if package selected)
    IF p_package_id IS NOT NULL THEN
        SELECT price_per_head, min_guests INTO v_package_price, v_package_min_guests
        FROM public.group_packages
        WHERE id = p_package_id AND restaurant_id = p_restaurant_id AND is_active = true;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error_code', 'PACKAGE_NOT_FOUND', 'message_mr', 'निवडलेले पॅकेज उपलब्ध नाही.', 'message_en', 'Selected group package not found.');
        END IF;

        IF p_party_size < v_package_min_guests THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'BELOW_MIN_GUESTS',
                'message_mr', 'या थाळी पॅकेजसाठी किमान ' || v_package_min_guests || ' व्यक्ती असणे आवश्यक आहे.',
                'message_en', 'This package requires a minimum of ' || v_package_min_guests || ' guests.'
            );
        END IF;

        v_total_amount := v_package_price * p_party_size;
    END IF;

    -- 6. CHECK FOR DUPLICATE PHONE + SLOT
    -- Avoid duplicate submissions from the same guest in the same 30-min window
    IF EXISTS (
        SELECT 1 FROM public.bookings
        WHERE restaurant_id = p_restaurant_id
          AND guest_phone = v_clean_phone
          AND slot_start = p_slot_start
          AND status NOT IN ('rejected', 'cancelled')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'DUPLICATE_BOOKING',
            'message_mr', 'या मोबाईल क्रमांकावर या वेळेसाठी आधीच एक आरक्षण नोंदवले गेले आहे.',
            'message_en', 'A booking for this phone number at this time slot already exists.'
        );
    END IF;

    -- 7. CHECK REMAINING SLOT CAPACITY
    SELECT COALESCE(SUM(party_size), 0) INTO v_current_booked
    FROM public.bookings
    WHERE restaurant_id = p_restaurant_id
      AND slot_start = p_slot_start
      AND status IN ('pending', 'confirmed', 'seated');

    IF (v_current_booked + p_party_size) > v_slot_capacity THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'SLOT_CAPACITY_EXCEEDED',
            'available_seats', GREATEST(0, v_slot_capacity - v_current_booked),
            'message_mr', 'क्षमस्व! या वेळेसाठी फक्त ' || GREATEST(0, v_slot_capacity - v_current_booked) || ' जागा उपलब्ध आहेत. कृपया दुसरा स्लॉट निवडा.',
            'message_en', 'Slot full. Only ' || GREATEST(0, v_slot_capacity - v_current_booked) || ' seats remaining for this time. Please select an adjacent slot.'
        );
    END IF;

    -- 8. GENERATE DAILY TOKEN NUMBER (e.g., SV-1210-007)
    v_token_prefix := 'SV-' || to_char(p_slot_start AT TIME ZONE 'Asia/Kolkata', 'DDMM');
    SELECT COUNT(*) + 1 INTO v_daily_seq
    FROM public.bookings
    WHERE restaurant_id = p_restaurant_id
      AND (slot_start AT TIME ZONE 'Asia/Kolkata')::date = v_booking_date;

    v_token_number := v_token_prefix || '-' || LPAD(v_daily_seq::text, 3, '0');

    -- 9. INSERT BOOKING RECORD
    INSERT INTO public.bookings (
        restaurant_id,
        token_number,
        type,
        party_size,
        slot_start,
        status,
        guest_name,
        guest_phone,
        notes,
        package_id,
        is_demo
    ) VALUES (
        p_restaurant_id,
        v_token_number,
        p_type,
        p_party_size,
        p_slot_start,
        'pending',  -- Pending staff 2-tap confirmation in /admin
        p_guest_name,
        v_clean_phone,
        p_notes,
        p_package_id,
        p_is_demo
    )
    RETURNING id INTO v_booking_id;

    -- 10. INSERT PRE-ORDERED ITEMS (if any)
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_menu_item_id := (v_item->>'menu_item_id')::uuid;
            v_quantity := COALESCE((v_item->>'quantity')::int, 1);

            -- Fetch price directly from DB to prevent client tampering
            SELECT price INTO v_item_price
            FROM public.menu_items
            WHERE id = v_menu_item_id AND restaurant_id = p_restaurant_id AND is_sold_out = false;

            IF FOUND AND v_quantity > 0 THEN
                INSERT INTO public.booking_items (
                    booking_id,
                    menu_item_id,
                    quantity,
                    unit_price,
                    notes
                ) VALUES (
                    v_booking_id,
                    v_menu_item_id,
                    v_quantity,
                    v_item_price,
                    v_item->>'notes'
                );
                v_total_amount := v_total_amount + (v_item_price * v_quantity);
            END IF;
        END LOOP;
    END IF;

    -- 11. RETURN SUCCESS PAYLOAD
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'token_number', v_token_number,
        'status', 'pending',
        'type', p_type,
        'party_size', p_party_size,
        'slot_start', p_slot_start,
        'guest_name', p_guest_name,
        'guest_phone', v_clean_phone,
        'total_estimated_amount', v_total_amount,
        'is_festival', v_is_festival,
        'message_mr', 'आरक्षण यशस्वीरित्या नोंदवले गेले! टोकन #' || v_token_number,
        'message_en', 'Booking registered successfully! Token #' || v_token_number
    );
END;
$$;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_log ENABLE ROW LEVEL SECURITY;

-- Helper functions to get authenticated staff's restaurant and role
CREATE OR REPLACE FUNCTION public.get_auth_restaurant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT restaurant_id
    FROM public.staff_profiles
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_staff_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.staff_profiles
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
$$;

-- 4.1 Restaurants Policies
CREATE POLICY "Public can view restaurant details"
    ON public.restaurants FOR SELECT
    USING (true);

CREATE POLICY "Owner can update restaurant details"
    ON public.restaurants FOR UPDATE
    USING (id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() = 'owner');

-- 4.2 Staff Profiles Policies
CREATE POLICY "Staff can view colleague profiles in same restaurant"
    ON public.staff_profiles FOR SELECT
    USING (restaurant_id = public.get_auth_restaurant_id());

CREATE POLICY "Owner can manage staff profiles"
    ON public.staff_profiles FOR ALL
    USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() = 'owner');

-- 4.3 Menu Items & Group Packages Policies
-- Guests on /book need to read menu & packages; staff can manage
CREATE POLICY "Public can view active menu items"
    ON public.menu_items FOR SELECT
    USING (true);

CREATE POLICY "Owner and Manager can modify menu items"
    ON public.menu_items FOR ALL
    USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager'));

CREATE POLICY "Public can view active packages"
    ON public.group_packages FOR SELECT
    USING (is_active = true);

CREATE POLICY "Owner and Manager can modify group packages"
    ON public.group_packages FOR ALL
    USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager'));

-- 4.4 Date Rules Policies
CREATE POLICY "Public can view date rules"
    ON public.date_rules FOR SELECT
    USING (true);

CREATE POLICY "Owner and Manager can modify date rules"
    ON public.date_rules FOR ALL
    USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager'));

-- 4.5 Bookings Policies (ENGINEERING RULES ENFORCED)
-- RULE: Guests CANNOT read or write bookings directly.
-- RULE: Public creation happens exclusively via SECURITY DEFINER function `create_booking`.
-- RULE: Staff can read bookings for their restaurant.
-- RULE: Kitchen role is READ-ONLY. Only owner and manager can update status!

CREATE POLICY "Staff can read bookings for their restaurant"
    ON public.bookings FOR SELECT
    USING (restaurant_id = public.get_auth_restaurant_id());

CREATE POLICY "Only Owner and Manager can update booking status"
    ON public.bookings FOR UPDATE
    USING (
        restaurant_id = public.get_auth_restaurant_id()
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    )
    WITH CHECK (
        restaurant_id = public.get_auth_restaurant_id()
        AND public.get_auth_staff_role() IN ('owner', 'manager')
    );

-- 4.6 Booking Items Policies
CREATE POLICY "Staff can view booking items for their restaurant"
    ON public.booking_items FOR SELECT
    USING (
        booking_id IN (
            SELECT id FROM public.bookings WHERE restaurant_id = public.get_auth_restaurant_id()
        )
    );

-- 4.7 Push Subscriptions Policies
CREATE POLICY "Authenticated users can manage their push subscriptions"
    ON public.push_subscriptions FOR ALL
    USING (user_id = auth.uid());

-- 4.8 Message Log Policies
CREATE POLICY "Staff can view message log for their restaurant"
    ON public.message_log FOR SELECT
    USING (restaurant_id = public.get_auth_restaurant_id());

-- ==============================================================================
-- 5. REALTIME REPLICATION CONFIGURATION
-- ==============================================================================
-- Enable Postgres Realtime on bookings so /admin live inbox gets instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
