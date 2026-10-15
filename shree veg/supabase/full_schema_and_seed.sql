-- ==============================================================================
-- SHREE PURE VEG - COMPLETE ALL-IN-ONE SUPABASE MIGRATION & SEED RUNNER
-- Location: Theur Phata, Pune-Solapur Highway (Kunjirwadi, Haveli, Pune 412201)
-- Copy and paste this ENTIRE file into your Supabase Dashboard > SQL Editor and click "RUN".
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES
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

CREATE TABLE IF NOT EXISTS public.date_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('blocked', 'festival')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(restaurant_id, date)
);

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

CREATE TABLE IF NOT EXISTS public.booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_slot ON public.bookings (restaurant_id, slot_start);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_phone_slot ON public.bookings (restaurant_id, guest_phone, slot_start);
CREATE INDEX IF NOT EXISTS idx_date_rules_date ON public.date_rules (restaurant_id, date);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items (booking_id);

-- 4. ATOMIC CAPACITY CHECK & BOOKING FUNCTION (WITH ADVISORY LOCK)
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
    -- 1. Validate inputs
    IF p_party_size <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_PARTY_SIZE', 'message_mr', 'व्यक्तींची संख्या वैध असावी.', 'message_en', 'Party size must be greater than zero.');
    END IF;

    IF p_type NOT IN ('table', 'group_meal', 'order_ahead') THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_TYPE', 'message_mr', 'आरक्षण प्रकार अवैध आहे.', 'message_en', 'Invalid booking type.');
    END IF;

    v_clean_phone := regexp_replace(p_guest_phone, '\D', '', 'g');
    IF length(v_clean_phone) < 10 THEN
        RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_PHONE', 'message_mr', 'मोबाईल नंबर १० अंकी असावा.', 'message_en', 'Please enter a valid 10-digit mobile number.');
    END IF;

    v_booking_date := (p_slot_start AT TIME ZONE 'Asia/Kolkata')::date;

    -- 2. Transactional advisory lock for this slot (prevents overbooking concurrency)
    v_lock_key := ('x' || substr(md5(p_restaurant_id::text || '_' || p_slot_start::text), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 3. Check Date Rules (Blocked dates or Festival Rush)
    SELECT * INTO v_date_rule
    FROM public.date_rules
    WHERE restaurant_id = p_restaurant_id AND date = v_booking_date;

    IF FOUND THEN
        IF v_date_rule.kind = 'blocked' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'DATE_BLOCKED',
                'message_mr', COALESCE(v_date_rule.note, 'सदर तारखेसाठी बुकिंग बंद आहे.'),
                'message_en', 'This date is blocked for bookings: ' || COALESCE(v_date_rule.note, 'Private Event/Maintenance')
            );
        ELSIF v_date_rule.kind = 'festival' THEN
            v_is_festival := true;
            IF p_type = 'group_meal' THEN
                v_slot_capacity := 24;      -- Dedicated Pangat capacity for pilgrim groups (12-16+ guests)
            ELSE
                v_slot_capacity := 12;      -- 12 seats per 30-min slot on festival days for general tables
            END IF;
            v_max_table_size := 10;     -- Max 10 per table on festival days
        END IF;
    END IF;

    -- 4. Check Table Party Size Limits
    IF p_type = 'table' THEN
        IF v_is_festival AND p_party_size > v_max_table_size THEN
            RETURN jsonb_build_object(
                'success', false,
                'error_code', 'EXCEEDS_FESTIVAL_TABLE_LIMIT',
                'message_mr', 'सण/उत्सव दिवशी एका टेबलवर कमाल १० व्यक्तींची मर्यादा आहे. कृपया पंगत थाळी निवडा.',
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

    -- 5. Validate Package if Group Meal
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

    -- 6. Check Duplicate Phone + Slot
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

    -- 7. Check Capacity
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
            'message_en', 'Slot full. Only ' || GREATEST(0, v_slot_capacity - v_current_booked) || ' seats remaining for this time.'
        );
    END IF;

    -- 8. Generate Daily Token Number
    v_token_prefix := 'SV-' || to_char(p_slot_start AT TIME ZONE 'Asia/Kolkata', 'DDMM');
    SELECT COUNT(*) + 1 INTO v_daily_seq
    FROM public.bookings
    WHERE restaurant_id = p_restaurant_id
      AND (slot_start AT TIME ZONE 'Asia/Kolkata')::date = v_booking_date;

    v_token_number := v_token_prefix || '-' || LPAD(v_daily_seq::text, 3, '0');

    -- 9. Insert Booking
    INSERT INTO public.bookings (
        restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, package_id, is_demo
    ) VALUES (
        p_restaurant_id, v_token_number, p_type, p_party_size, p_slot_start, 'pending', p_guest_name, v_clean_phone, p_notes, p_package_id, p_is_demo
    )
    RETURNING id INTO v_booking_id;

    -- 10. Insert Items
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            v_menu_item_id := (v_item->>'menu_item_id')::uuid;
            v_quantity := COALESCE((v_item->>'quantity')::int, 1);

            SELECT price INTO v_item_price
            FROM public.menu_items
            WHERE id = v_menu_item_id AND restaurant_id = p_restaurant_id AND is_sold_out = false;

            IF FOUND AND v_quantity > 0 THEN
                INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes)
                VALUES (v_booking_id, v_menu_item_id, v_quantity, v_item_price, v_item->>'notes');
                v_total_amount := v_total_amount + (v_item_price * v_quantity);
            END IF;
        END LOOP;
    END IF;

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

-- 5. ROW LEVEL SECURITY
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_auth_restaurant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT restaurant_id FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_staff_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- Drop existing policies if re-running
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view restaurant details" ON public.restaurants;
    DROP POLICY IF EXISTS "Owner can update restaurant details" ON public.restaurants;
    DROP POLICY IF EXISTS "Staff can view colleague profiles in same restaurant" ON public.staff_profiles;
    DROP POLICY IF EXISTS "Owner can manage staff profiles" ON public.staff_profiles;
    DROP POLICY IF EXISTS "Public can view active menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Owner and Manager can modify menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Public can view active packages" ON public.group_packages;
    DROP POLICY IF EXISTS "Owner and Manager can modify group packages" ON public.group_packages;
    DROP POLICY IF EXISTS "Public can view date rules" ON public.date_rules;
    DROP POLICY IF EXISTS "Owner and Manager can modify date rules" ON public.date_rules;
    DROP POLICY IF EXISTS "Staff can read bookings for their restaurant" ON public.bookings;
    DROP POLICY IF EXISTS "Only Owner and Manager can update booking status" ON public.bookings;
    DROP POLICY IF EXISTS "Staff can view booking items for their restaurant" ON public.booking_items;
    DROP POLICY IF EXISTS "Authenticated users can manage their push subscriptions" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "Staff can view message log for their restaurant" ON public.message_log;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Public can view restaurant details" ON public.restaurants FOR SELECT USING (true);
CREATE POLICY "Owner can update restaurant details" ON public.restaurants FOR UPDATE USING (id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() = 'owner');
CREATE POLICY "Staff can view colleague profiles in same restaurant" ON public.staff_profiles FOR SELECT USING (restaurant_id = public.get_auth_restaurant_id());
CREATE POLICY "Owner can manage staff profiles" ON public.staff_profiles FOR ALL USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() = 'owner');
CREATE POLICY "Public can view active menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Owner and Manager can modify menu items" ON public.menu_items FOR ALL USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager'));
CREATE POLICY "Public can view active packages" ON public.group_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Owner and Manager can modify group packages" ON public.group_packages FOR ALL USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager'));
CREATE POLICY "Public can view date rules" ON public.date_rules FOR SELECT USING (true);
CREATE POLICY "Owner and Manager can modify date rules" ON public.date_rules FOR ALL USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager'));
CREATE POLICY "Staff can read bookings for their restaurant" ON public.bookings FOR SELECT USING (restaurant_id = public.get_auth_restaurant_id());
CREATE POLICY "Only Owner and Manager can update booking status" ON public.bookings FOR UPDATE USING (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager')) WITH CHECK (restaurant_id = public.get_auth_restaurant_id() AND public.get_auth_staff_role() IN ('owner', 'manager'));
CREATE POLICY "Staff can view booking items for their restaurant" ON public.booking_items FOR SELECT USING (booking_id IN (SELECT id FROM public.bookings WHERE restaurant_id = public.get_auth_restaurant_id()));
CREATE POLICY "Authenticated users can manage their push subscriptions" ON public.push_subscriptions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Staff can view message log for their restaurant" ON public.message_log FOR SELECT USING (restaurant_id = public.get_auth_restaurant_id());

-- 6. REALTIME REPLICATION
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.date_rules;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_packages;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. RESET DEMO PROCEDURE & SEED POPULATION
CREATE OR REPLACE FUNCTION public.reset_demo()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id UUID;
    v_thali_item_id UUID;
    v_misal_item_id UUID;
    v_malvani_item_id UUID;
    v_bhakri_item_id UUID;
    v_shev_item_id UUID;
    v_kaju_item_id UUID;
    v_puran_item_id UUID;
    v_pilgrim_pkg_id UUID;
    v_family_pkg_id UUID;
    v_booking_id1 UUID;
    v_booking_id2 UUID;
    v_booking_id3 UUID;
    v_booking_id4 UUID;
    v_booking_id5 UUID;
    v_booking_id6 UUID;
    v_today DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date;
    v_tomorrow DATE := (now() AT TIME ZONE 'Asia/Kolkata')::date + 1;
BEGIN
    SELECT id INTO v_restaurant_id FROM public.restaurants WHERE slug = 'shree-pure-veg-theur' LIMIT 1;
    
    IF v_restaurant_id IS NULL THEN
        INSERT INTO public.restaurants (
            name, slug, phone, address, google_rating, reviews_count, default_slot_capacity, festival_slot_capacity, max_table_party_size, max_festival_table_party_size
        ) VALUES (
            'श्री प्युअर व्हेज (Shree Pure Veg)',
            'shree-pure-veg-theur',
            '+91 98765 43210',
            'थेऊर फाटा, कुंजीरवाडी, पुणे-सोलापूर महामार्ग (हवेली, पुणे ४१२२०१)',
            4.6, 989, 30, 12, 12, 10
        ) RETURNING id INTO v_restaurant_id;
    END IF;

    DELETE FROM public.booking_items WHERE booking_id IN (SELECT id FROM public.bookings WHERE restaurant_id = v_restaurant_id);
    DELETE FROM public.bookings WHERE restaurant_id = v_restaurant_id;
    DELETE FROM public.message_log WHERE restaurant_id = v_restaurant_id;
    DELETE FROM public.date_rules WHERE restaurant_id = v_restaurant_id;

    -- 7 Maharashtrian Pure Veg Specialties
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Shree Special Chintamani Mahathali', 'श्री स्पेशल चिंतामणी महाथाळी', 'thali', 220.00, false, 'Unlimited Maharashtrian satvik thali: 2 Bhajis, Dal, Pure Ghee Puran Poli, Chapati/Bhakri, Rice, Sweet, Solkadhi', 'अमर्यादित सात्विक महाथाळी: २ भाज्या, वरण, तुपातील पुरणपोळी, चपाती/भाकरी, भात, गोड, सोलकढी')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_thali_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Shree Special Chintamani Mahathali' LIMIT 1;

    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Veg Malvani Handi', 'व्हेज मालवणी हंडी', 'main_course', 240.00, false, 'Spiced Konkani coconut masala gravy with fresh garden vegetables', 'कोकणी पद्धतीचा खास वाटप मसाला आणि ताज्या भाज्यांची चवदार हंडी')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_malvani_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Veg Malvani Handi' LIMIT 1;

    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Kolhapuri Zanzanit Misal Pav', 'झणझणीत कोल्हापुरी मिसळ पाव', 'breakfast', 90.00, false, 'Authentic highway spicy sprouted matki curry served with 2 Pav, Farsan, Lemon and Curd', 'महामार्ग स्पेशल मटकी उसळ, झणझणीत कट, २ लादी पाव, फरसाण आणि कांदा-लिंबू')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_misal_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Kolhapuri Zanzanit Misal Pav' LIMIT 1;

    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Gavran Pithla Bhakri with Thecha', 'गावरान पिठलं भाकरी व ठेचा', 'main_course', 160.00, false, 'Hot traditional Gram flour besan, 2 hot Jowar/Bajra Bhakris, raw onion, and spicy spicy Mirchi Thecha', 'गरमागरम पिठलं, २ ज्वारी/बाजरी भाकरी, खमंग मिरची ठेचा आणि कांदा')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_bhakri_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Gavran Pithla Bhakri with Thecha' LIMIT 1;

    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Puneri / Khandeshi Shev Bhaji', 'पुणेरी / खान्देशी शेव भाजी', 'main_course', 180.00, false, 'Crispy Ghati Shev cooked in thick rich red onion-tomato highway gravy', 'पुणेरी चवीचा लाल रस्सा आणि कुरकुरीत घाटी शेव')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_shev_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Puneri / Khandeshi Shev Bhaji' LIMIT 1;

    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Shahi Kaju Curry Masala', 'शाही काजू करी मसाला', 'main_course', 260.00, false, 'Whole roasted cashews tossed in rich cashew-tomato Mughlai gravy', 'तूप-भाजलेले अखंड काजू आणि मखमली ग्रेव्ही')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_kaju_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Shahi Kaju Curry Masala' LIMIT 1;

    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Puran Poli with Ghee & Katachi Amti', 'शुद्ध तुपातली पुरणपोळी व कटाची आमटी', 'dessert', 140.00, false, '2 Fresh soft handmade Puran Polis drowned in pure cow ghee with traditional Katachi Amti', '२ गरमागरम मऊ पुरणपोळ्या, गाईचे शुद्ध तूप आणि अस्सल झणझणीत कटाची आमटी')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_puran_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Puran Poli with Ghee & Katachi Amti' LIMIT 1;

    -- 2 Group Packages
    INSERT INTO public.group_packages (restaurant_id, name_en, name_mr, price_per_head, min_guests, description_en, description_mr, is_active)
    VALUES (
        v_restaurant_id, 'Chintamani Pilgrim Darshan Thali Feast', 'चिंतामणी दर्शन भाविक पंगत थाळी', 210.00, 6,
        'Full satvik unlimited thali for temple pilgrim groups. Fast serving, no-onion/garlic option available on request.',
        'थेऊर चिंतामणी दर्शनासाठी येणाऱ्या भाविक मंडळांसाठी अमर्यादित पंगत जेवण. जलद सेवा, विना कांदा-लसूण पर्याय उपलब्ध.', true
    ) ON CONFLICT DO NOTHING;
    SELECT id INTO v_pilgrim_pkg_id FROM public.group_packages WHERE restaurant_id = v_restaurant_id AND name_en = 'Chintamani Pilgrim Darshan Thali Feast' LIMIT 1;

    INSERT INTO public.group_packages (restaurant_id, name_en, name_mr, price_per_head, min_guests, description_en, description_mr, is_active)
    VALUES (
        v_restaurant_id, 'Highway Royal Family Feast', 'महामार्ग रॉयल फॅमिली मेजवानी', 290.00, 8,
        'Deluxe family feast including Paneer starter, 2 Veg specialties (Kaju Curry + Malvani), Bhakri/Roti, Dal Tadka, Jeera Rice, and Puran Poli.',
        'मोठ्या कुटुंबासाठी शाही मेजवानी: स्टार्टर, काजू करी, व्हेज मालवणी, गरमागरम भाकरी, जिरा राईस आणि पुरणपोळी.', true
    ) ON CONFLICT DO NOTHING;
    SELECT id INTO v_family_pkg_id FROM public.group_packages WHERE restaurant_id = v_restaurant_id AND name_en = 'Highway Royal Family Feast' LIMIT 1;

    -- Date Rules
    INSERT INTO public.date_rules (restaurant_id, date, kind, note)
    VALUES 
        (v_restaurant_id, v_tomorrow, 'festival', 'अंगारकी संकष्टी चतुर्थी (Angarki Sankashti Chaturthi - Peak Pilgrim Rush)'),
        (v_restaurant_id, v_today + 5, 'blocked', 'हॉटेल डीप-क्लिनिंग व देखभाल (Kitchen Sanitization & Deep Cleaning)')
    ON CONFLICT (restaurant_id, date) DO UPDATE SET kind = EXCLUDED.kind, note = EXCLUDED.note;

    -- 6 Sample Demo Bookings across Today & Tomorrow
    -- 1. Table, Today 13:00, Confirmed
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_today, 'DDMM') || '-001', 'table', 4, (v_today::text || ' 13:00:00+05:30')::timestamptz, 'confirmed', 'सचिन तांबडे (Sachin Tambade)', '9822012345', 'Traveling from Pune to Solapur.', true)
    RETURNING id INTO v_booking_id1;

    -- 2. Pilgrim Group Meal, Today 14:00, Pending (Ready for staff live demo approval)
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, package_id, is_demo)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_today, 'DDMM') || '-002', 'group_meal', 14, (v_today::text || ' 14:00:00+05:30')::timestamptz, 'pending', 'रमेशजी मोरे (Ramesh More - Theur Yatra)', '9423098765', 'Chintamani Ganpati Yatra group arriving by Tempo Traveller.', v_pilgrim_pkg_id, true)
    RETURNING id INTO v_booking_id2;

    -- 3. Order Ahead, Today 19:30, Confirmed with dishes
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo, estimated_prep_time_mins)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_today, 'DDMM') || '-003', 'order_ahead', 3, (v_today::text || ' 19:30:00+05:30')::timestamptz, 'confirmed', 'डॉ. अनिकेत जोशी (Dr. Aniket Joshi)', '9881145678', 'Highway drive. Food ready for 7:30 PM sharp. Pay at counter.', true, 20)
    RETURNING id INTO v_booking_id3;

    IF v_malvani_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes) VALUES (v_booking_id3, v_malvani_item_id, 1, 240.00, 'Medium spicy');
    END IF;
    IF v_bhakri_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes) VALUES (v_booking_id3, v_bhakri_item_id, 2, 160.00, 'Jowar bhakri');
    END IF;
    IF v_puran_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes) VALUES (v_booking_id3, v_puran_item_id, 2, 140.00, 'Extra pure ghee');
    END IF;

    -- 4. Table, Today 20:30, Seated
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_today, 'DDMM') || '-004', 'table', 6, (v_today::text || ' 20:30:00+05:30')::timestamptz, 'seated', 'प्रदीप कुंजीर (Pradeep Kunjir)', '9765089012', 'Repeat local family from Kunjirwadi.', true)
    RETURNING id INTO v_booking_id4;

    -- 5. Pilgrim Group, Tomorrow (Festival Day) 12:30, Pending
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, package_id, is_demo)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_tomorrow, 'DDMM') || '-001', 'group_meal', 10, (v_tomorrow::text || ' 12:30:00+05:30')::timestamptz, 'pending', 'बाळकृष्ण शिंदे (Balkrishna Shinde)', '9921123456', 'Angarki Chaturthi darshan pilgrim group from Daund.', v_pilgrim_pkg_id, true)
    RETURNING id INTO v_booking_id5;

    -- 6. Table, Tomorrow 20:00, Confirmed
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_tomorrow, 'DDMM') || '-002', 'table', 2, (v_tomorrow::text || ' 20:00:00+05:30')::timestamptz, 'confirmed', 'अमोल व स्नेहल गायकवाड (Amol Gaikwad)', '9890076543', 'Couple returning after Ganpati Abhishek.', true)
    RETURNING id INTO v_booking_id6;

    -- 7. Table, Yesterday or Today earlier, No-Show
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_today, 'DDMM') || '-000', 'table', 5, (v_today::text || ' 11:30:00+05:30')::timestamptz, 'no_show', 'विकास जगताप (Vikas Jagtap)', '9822998877', 'Customer did not arrive and phone unreachable.', true);

    -- 8. Order Ahead, Day after tomorrow (v_today + 2), Confirmed with items
    INSERT INTO public.bookings (restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo, estimated_prep_time_mins)
    VALUES (v_restaurant_id, 'SV-' || to_char(v_today + 2, 'DDMM') || '-001', 'order_ahead', 6, ((v_today + 2)::text || ' 13:30:00+05:30')::timestamptz, 'confirmed', 'संजय गायकवाड (Sanjay Gaikwad)', '9822445566', 'Pilgrim group bus halt.', true, 15)
    RETURNING id INTO v_booking_id1;

    IF v_thali_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes) VALUES (v_booking_id1, v_thali_item_id, 4, 220.00, 'Pure ghee thali');
    END IF;
    IF v_shev_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes) VALUES (v_booking_id1, v_shev_item_id, 2, 180.00, 'Zanzanit gravy');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Shree Pure Veg demo data seeded/reset successfully!',
        'restaurant_id', v_restaurant_id
    );
END;
$$;

-- 8. REPORTS VIEWS & RPC FUNCTION
CREATE OR REPLACE VIEW public.view_reports_kpis AS
SELECT
    b.restaurant_id,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE b.status = 'confirmed') AS confirmed_count,
    COUNT(*) FILTER (WHERE b.status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE b.status = 'no_show') AS no_show_count,
    COUNT(*) FILTER (WHERE b.status = 'seated') AS seated_count,
    COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled_count,
    COUNT(*) FILTER (WHERE b.status = 'rejected') AS rejected_count,
    COALESCE(SUM(b.party_size), 0) AS total_guests,
    COALESCE(SUM(b.party_size) FILTER (WHERE b.status IN ('confirmed', 'seated')), 0) AS confirmed_guests,
    COALESCE(SUM(b.party_size) FILTER (WHERE b.status = 'pending'), 0) AS pending_guests
FROM public.bookings b
GROUP BY b.restaurant_id;

CREATE OR REPLACE VIEW public.view_reports_bookings_by_type AS
WITH type_totals AS (
    SELECT
        b.restaurant_id,
        b.type,
        COUNT(*) AS booking_count,
        COALESCE(SUM(b.party_size), 0) AS total_guests,
        COUNT(*) FILTER (WHERE b.status = 'confirmed') AS confirmed_count
    FROM public.bookings b
    GROUP BY b.restaurant_id, b.type
),
restaurant_totals AS (
    SELECT
        restaurant_id,
        SUM(booking_count) AS grand_total_bookings
    FROM type_totals
    GROUP BY restaurant_id
)
SELECT
    tt.restaurant_id,
    tt.type,
    tt.booking_count,
    tt.total_guests,
    tt.confirmed_count,
    ROUND((tt.booking_count::numeric / NULLIF(rt.grand_total_bookings, 0) * 100), 1) AS percentage
FROM type_totals tt
JOIN restaurant_totals rt ON tt.restaurant_id = rt.restaurant_id;

CREATE OR REPLACE VIEW public.view_reports_top_dishes AS
SELECT
    b.restaurant_id,
    bi.menu_item_id,
    m.name_mr,
    m.name_en,
    m.category,
    m.price,
    SUM(bi.quantity) AS total_quantity,
    COUNT(DISTINCT b.id) AS order_count,
    SUM(bi.quantity * bi.unit_price) AS total_revenue
FROM public.booking_items bi
JOIN public.bookings b ON bi.booking_id = b.id
JOIN public.menu_items m ON bi.menu_item_id = m.id
WHERE b.status NOT IN ('rejected', 'cancelled')
GROUP BY b.restaurant_id, bi.menu_item_id, m.name_mr, m.name_en, m.category, m.price
ORDER BY total_quantity DESC;

CREATE OR REPLACE FUNCTION public.get_admin_reports(
    p_restaurant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rest_id UUID := p_restaurant_id;
    v_today DATE;
    v_kpis JSONB;
    v_next_7_days JSONB;
    v_bookings_by_type JSONB;
    v_top_dishes JSONB;
    v_total_req INT := 0;
    v_conf INT := 0;
    v_pend INT := 0;
    v_noshow INT := 0;
    v_seated INT := 0;
    v_canc INT := 0;
    v_rej INT := 0;
    v_tot_guests INT := 0;
    v_conf_guests INT := 0;
    v_pend_guests INT := 0;
BEGIN
    IF v_rest_id IS NULL THEN
        SELECT id INTO v_rest_id FROM public.restaurants LIMIT 1;
    END IF;

    v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'confirmed'),
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'no_show'),
        COUNT(*) FILTER (WHERE status = 'seated'),
        COUNT(*) FILTER (WHERE status = 'cancelled'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COALESCE(SUM(party_size), 0),
        COALESCE(SUM(party_size) FILTER (WHERE status IN ('confirmed', 'seated')), 0),
        COALESCE(SUM(party_size) FILTER (WHERE status = 'pending'), 0)
    INTO
        v_total_req, v_conf, v_pend, v_noshow, v_seated, v_canc, v_rej,
        v_tot_guests, v_conf_guests, v_pend_guests
    FROM public.bookings
    WHERE (v_rest_id IS NULL OR restaurant_id = v_rest_id);

    v_kpis := jsonb_build_object(
        'total_requests', v_total_req,
        'confirmed', v_conf,
        'pending', v_pend,
        'no_shows', v_noshow,
        'seated', v_seated,
        'cancelled', v_canc,
        'rejected', v_rej,
        'total_guests', v_tot_guests,
        'confirmed_guests', v_conf_guests,
        'pending_guests', v_pend_guests
    );

    WITH series AS (
        SELECT (v_today + s.day_offset)::date AS day_date, s.day_offset
        FROM generate_series(0, 6) AS s(day_offset)
    ),
    day_stats AS (
        SELECT
            ser.day_date,
            ser.day_offset,
            COALESCE(SUM(b.party_size) FILTER (WHERE b.status NOT IN ('rejected', 'cancelled')), 0) AS total_guests,
            COALESCE(SUM(b.party_size) FILTER (WHERE b.status IN ('confirmed', 'seated')), 0) AS confirmed_guests,
            COALESCE(SUM(b.party_size) FILTER (WHERE b.status = 'pending'), 0) AS pending_guests,
            COUNT(b.id) FILTER (WHERE b.status NOT IN ('rejected', 'cancelled')) AS booking_count,
            dr.kind AS rule_kind,
            dr.note AS rule_note
        FROM series ser
        LEFT JOIN public.bookings b
            ON (b.slot_start AT TIME ZONE 'Asia/Kolkata')::date = ser.day_date
            AND (v_rest_id IS NULL OR b.restaurant_id = v_rest_id)
        LEFT JOIN public.date_rules dr
            ON dr.date = ser.day_date
            AND (v_rest_id IS NULL OR dr.restaurant_id = v_rest_id)
        GROUP BY ser.day_date, ser.day_offset, dr.kind, dr.note
        ORDER BY ser.day_date ASC
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', to_char(day_date, 'YYYY-MM-DD'),
            'day_offset', day_offset,
            'day_name_en', to_char(day_date, 'Dy'),
            'day_name_mr', CASE EXTRACT(ISODOW FROM day_date)
                WHEN 1 THEN 'सोम'
                WHEN 2 THEN 'मंगळ'
                WHEN 3 THEN 'बुध'
                WHEN 4 THEN 'गुरु'
                WHEN 5 THEN 'शुक्र'
                WHEN 6 THEN 'शनि'
                WHEN 7 THEN 'रवि'
            END,
            'formatted_date_en', to_char(day_date, 'DD Mon'),
            'formatted_date_mr', to_char(day_date, 'DD') || ' ' || CASE to_char(day_date, 'Mon')
                WHEN 'Jan' THEN 'जाने'
                WHEN 'Feb' THEN 'फेब्रु'
                WHEN 'Mar' THEN 'मार्च'
                WHEN 'Apr' THEN 'एप्रिल'
                WHEN 'May' THEN 'मे'
                WHEN 'Jun' THEN 'जून'
                WHEN 'Jul' THEN 'जुलै'
                WHEN 'Aug' THEN 'ऑग'
                WHEN 'Sep' THEN 'सप्टें'
                WHEN 'Oct' THEN 'ऑक्टो'
                WHEN 'Nov' THEN 'नोव्हें'
                WHEN 'Dec' THEN 'डिसें'
                ELSE to_char(day_date, 'Mon')
            END,
            'total_guests', total_guests,
            'confirmed_guests', confirmed_guests,
            'pending_guests', pending_guests,
            'booking_count', booking_count,
            'is_festival', (rule_kind = 'festival'),
            'is_blocked', (rule_kind = 'blocked'),
            'note', rule_note
        )
    ) INTO v_next_7_days
    FROM day_stats;

    WITH type_stats AS (
        SELECT
            b.type,
            COUNT(*) AS booking_count,
            COALESCE(SUM(b.party_size), 0) AS total_guests
        FROM public.bookings b
        WHERE (v_rest_id IS NULL OR b.restaurant_id = v_rest_id)
        GROUP BY b.type
    ),
    all_types AS (
        SELECT 'table' AS type, 'नेहमीचे जेवण टेबल' AS name_mr, 'Standard Dining Table' AS name_en, '🍽️' AS icon
        UNION ALL
        SELECT 'group_meal', 'भाविक व कुटुंब पंगत थाळी', 'Pilgrim / Group Feast', '🚩'
        UNION ALL
        SELECT 'order_ahead', 'हायवे एक्सप्रेस आगाऊ ऑर्डर', 'Order Ahead Quick Halt', '⚡'
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'type', at.type,
            'name_mr', at.name_mr,
            'name_en', at.name_en,
            'icon', at.icon,
            'count', COALESCE(ts.booking_count, 0),
            'guests', COALESCE(ts.total_guests, 0),
            'percentage', CASE 
                WHEN v_total_req > 0 THEN ROUND((COALESCE(ts.booking_count, 0)::numeric / v_total_req * 100), 1)
                ELSE 0
            END
        )
    ), '[]'::jsonb) INTO v_bookings_by_type
    FROM all_types at
    LEFT JOIN type_stats ts ON at.type = ts.type;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', m.id,
            'name_mr', m.name_mr,
            'name_en', m.name_en,
            'category', m.category,
            'price', m.price,
            'total_quantity', sub.total_qty,
            'order_count', sub.orders_cnt,
            'total_revenue', sub.total_rev
        )
    ), '[]'::jsonb) INTO v_top_dishes
    FROM (
        SELECT
            bi.menu_item_id,
            SUM(bi.quantity) AS total_qty,
            COUNT(DISTINCT b.id) AS orders_cnt,
            SUM(bi.quantity * bi.unit_price) AS total_rev
        FROM public.booking_items bi
        JOIN public.bookings b ON bi.booking_id = b.id
        WHERE (v_rest_id IS NULL OR b.restaurant_id = v_rest_id)
          AND b.status NOT IN ('rejected', 'cancelled')
        GROUP BY bi.menu_item_id
        ORDER BY total_qty DESC
        LIMIT 10
    ) sub
    JOIN public.menu_items m ON sub.menu_item_id = m.id;

    RETURN jsonb_build_object(
        'success', true,
        'restaurant_id', v_rest_id,
        'kpis', v_kpis,
        'next_7_days', COALESCE(v_next_7_days, '[]'::jsonb),
        'bookings_by_type', v_bookings_by_type,
        'top_dishes', v_top_dishes,
        'computed_at', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_reports(UUID) TO anon, authenticated, service_role;

-- Run initial seed
SELECT public.reset_demo();

