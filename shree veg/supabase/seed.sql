-- ==============================================================================
-- SHREE PURE VEG - SEED DATA & RESET DEMO PROCEDURE
-- Location: Theur Phata, Pune-Solapur Highway (Kunjirwadi, Haveli, Pune 412201)
-- ==============================================================================

-- 1. Create or Replace Demo Reset Stored Procedure
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
    -- 1. Ensure primary Restaurant row exists
    SELECT id INTO v_restaurant_id FROM public.restaurants WHERE slug = 'shree-pure-veg-theur' LIMIT 1;
    
    IF v_restaurant_id IS NULL THEN
        INSERT INTO public.restaurants (
            name,
            slug,
            phone,
            address,
            google_rating,
            reviews_count,
            default_slot_capacity,
            festival_slot_capacity,
            max_table_party_size,
            max_festival_table_party_size
        ) VALUES (
            'श्री प्युअर व्हेज (Shree Pure Veg)',
            'shree-pure-veg-theur',
            '+91 98765 43210',
            'थेऊर फाटा, कुंजीरवाडी, पुणे-सोलापूर महामार्ग (हवेली, पुणे ४१२२०१)',
            4.6,
            989,
            30,
            12,
            12,
            10
        )
        RETURNING id INTO v_restaurant_id;
    END IF;

    -- 2. Clear existing bookings, items, and demo logs
    DELETE FROM public.booking_items WHERE booking_id IN (SELECT id FROM public.bookings WHERE restaurant_id = v_restaurant_id);
    DELETE FROM public.bookings WHERE restaurant_id = v_restaurant_id;
    DELETE FROM public.message_log WHERE restaurant_id = v_restaurant_id;
    DELETE FROM public.date_rules WHERE restaurant_id = v_restaurant_id;

    -- 3. Upsert Menu Items (7 Maharashtrian Pure Veg Specialties)
    -- Thali
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Shree Special Chintamani Mahathali', 'श्री स्पेशल चिंतामणी महाथाळी', 'thali', 220.00, false, 'Unlimited Maharashtrian satvik thali: 2 Bhajis, Dal, Pure Ghee Puran Poli, Chapati/Bhakri, Rice, Sweet, Solkadhi', 'अमर्यादित सात्विक महाथाळी: २ भाज्या, वरण, तुपातील पुरणपोळी, चपाती/भाकरी, भात, गोड, सोलकढी')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_thali_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Shree Special Chintamani Mahathali' LIMIT 1;

    -- Veg Malvani Handi
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Veg Malvani Handi', 'व्हेज मालवणी हंडी', 'main_course', 240.00, false, 'Spiced Konkani coconut masala gravy with fresh garden vegetables', 'कोकणी पद्धतीचा खास वाटप मसाला आणि ताज्या भाज्यांची चवदार हंडी')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_malvani_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Veg Malvani Handi' LIMIT 1;

    -- Misal Pav
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Kolhapuri Zanzanit Misal Pav', 'झणझणीत कोल्हापुरी मिसळ पाव', 'breakfast', 90.00, false, 'Authentic highway spicy sprouted matki curry served with 2 Pav, Farsan, Lemon and Curd', 'महामार्ग स्पेशल मटकी उसळ, झणझणीत कट, २ लादी पाव, फरसाण आणि कांदा-लिंबू')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_misal_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Kolhapuri Zanzanit Misal Pav' LIMIT 1;

    -- Pithla Bhakri
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Gavran Pithla Bhakri with Thecha', 'गावरान पिठलं भाकरी व ठेचा', 'main_course', 160.00, false, 'Hot traditional Gram flour besan, 2 hot Jowar/Bajra Bhakris, raw onion, and spicy spicy Mirchi Thecha', 'गरमागरम पिठलं, २ ज्वारी/बाजरी भाकरी, खमंग मिरची ठेचा आणि कांदा')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_bhakri_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Gavran Pithla Bhakri with Thecha' LIMIT 1;

    -- Shev Bhaji
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Puneri / Khandeshi Shev Bhaji', 'पुणेरी / खान्देशी शेव भाजी', 'main_course', 180.00, false, 'Crispy Ghati Shev cooked in thick rich red onion-tomato highway gravy', 'पुणेरी चवीचा लाल रस्सा आणि कुरकुरीत घाटी शेव')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_shev_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Puneri / Khandeshi Shev Bhaji' LIMIT 1;

    -- Kaju Kari Masala
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Shahi Kaju Curry Masala', 'शाही काजू करी मसाला', 'main_course', 260.00, false, 'Whole roasted cashews tossed in rich cashew-tomato Mughlai gravy', 'तूप-भाजलेले अखंड काजू आणि मखमली ग्रेव्ही')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_kaju_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Shahi Kaju Curry Masala' LIMIT 1;

    -- Puran Poli
    INSERT INTO public.menu_items (restaurant_id, name_en, name_mr, category, price, is_sold_out, description_en, description_mr)
    VALUES (v_restaurant_id, 'Puran Poli with Ghee & Katachi Amti', 'शुद्ध तुपातली पुरणपोळी व कटाची आमटी', 'dessert', 140.00, false, '2 Fresh soft handmade Puran Polis drowned in pure cow ghee with traditional Katachi Amti', '२ गरमागरम मऊ पुरणपोळ्या, गाईचे शुद्ध तूप आणि अस्सल झणझणीत कटाची आमटी')
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_puran_item_id FROM public.menu_items WHERE restaurant_id = v_restaurant_id AND name_en = 'Puran Poli with Ghee & Katachi Amti' LIMIT 1;

    -- 4. Upsert Group Packages (2 Packages)
    INSERT INTO public.group_packages (restaurant_id, name_en, name_mr, price_per_head, min_guests, description_en, description_mr, is_active)
    VALUES (
        v_restaurant_id,
        'Chintamani Pilgrim Darshan Thali Feast',
        'चिंतामणी दर्शन भाविक पंगत थाळी',
        210.00,
        6,
        'Full satvik unlimited thali for temple pilgrim groups. Fast serving, no-onion/garlic option available on request.',
        'थेऊर चिंतामणी दर्शनासाठी येणाऱ्या भाविक मंडळांसाठी अमर्यादित पंगत जेवण. जलद सेवा, विना कांदा-लसूण पर्याय उपलब्ध.',
        true
    )
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_pilgrim_pkg_id FROM public.group_packages WHERE restaurant_id = v_restaurant_id AND name_en = 'Chintamani Pilgrim Darshan Thali Feast' LIMIT 1;

    INSERT INTO public.group_packages (restaurant_id, name_en, name_mr, price_per_head, min_guests, description_en, description_mr, is_active)
    VALUES (
        v_restaurant_id,
        'Highway Royal Family Feast',
        'महामार्ग रॉयल फॅमिली मेजवानी',
        290.00,
        8,
        'Deluxe family feast including Paneer starter, 2 Veg specialties (Kaju Curry + Malvani), Bhakri/Roti, Dal Tadka, Jeera Rice, and Puran Poli.',
        'मोठ्या कुटुंबासाठी शाही मेजवानी: स्टार्टर, काजू करी, व्हेज मालवणी, गरमागरम भाकरी, जिरा राईस आणि पुरणपोळी.',
        true
    )
    ON CONFLICT DO NOTHING;
    SELECT id INTO v_family_pkg_id FROM public.group_packages WHERE restaurant_id = v_restaurant_id AND name_en = 'Highway Royal Family Feast' LIMIT 1;

    -- 5. Insert Date Rules (Festival date tomorrow, blocked maintenance date next week)
    INSERT INTO public.date_rules (restaurant_id, date, kind, note)
    VALUES 
        (v_restaurant_id, v_tomorrow, 'festival', 'अंगारकी संकष्टी चतुर्थी (Angarki Sankashti Chaturthi - Peak Pilgrim Rush)'),
        (v_restaurant_id, v_today + 5, 'blocked', 'हॉटेल डीप-क्लिनिंग व देखभाल (Kitchen Sanitization & Deep Cleaning)')
    ON CONFLICT (restaurant_id, date) DO UPDATE 
    SET kind = EXCLUDED.kind, note = EXCLUDED.note;

    -- 6. Insert 6 Sample Demo Bookings Across Today & Tomorrow
    
    -- Booking 1: Table booking (4 guests, Today 13:00, CONFIRMED)
    INSERT INTO public.bookings (
        restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo
    ) VALUES (
        v_restaurant_id,
        'SV-' || to_char(v_today, 'DDMM') || '-001',
        'table',
        4,
        (v_today::text || ' 13:00:00+05:30')::timestamptz,
        'confirmed',
        'सचिन तांबडे (Sachin Tambade)',
        '9822012345',
        'Family traveling from Pune to Solapur. Prefer corner table.',
        true
    ) RETURNING id INTO v_booking_id1;

    -- Booking 2: Pilgrim Group Meal (14 pilgrims, Today 14:00, PENDING - Perfect for Admin Live Demo)
    INSERT INTO public.bookings (
        restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, package_id, is_demo
    ) VALUES (
        v_restaurant_id,
        'SV-' || to_char(v_today, 'DDMM') || '-002',
        'group_meal',
        14,
        (v_today::text || ' 14:00:00+05:30')::timestamptz,
        'pending',
        'रमेशजी मोरे (Ramesh More - Theur Yatra)',
        '9423098765',
        'Chintamani Ganpati Yatra group arriving by Tempo Traveller. Need fast satvik serving.',
        v_pilgrim_pkg_id,
        true
    ) RETURNING id INTO v_booking_id2;

    -- Booking 3: Order Ahead (3 guests, Today 19:30, CONFIRMED with items)
    INSERT INTO public.bookings (
        restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo, estimated_prep_time_mins
    ) VALUES (
        v_restaurant_id,
        'SV-' || to_char(v_today, 'DDMM') || '-003',
        'order_ahead',
        3,
        (v_today::text || ' 19:30:00+05:30')::timestamptz,
        'confirmed',
        'डॉ. अनिकेत जोशी (Dr. Aniket Joshi)',
        '9881145678',
        'Driving on highway, keep food ready for 7:30 PM sharp. Pay at counter.',
        true,
        20
    ) RETURNING id INTO v_booking_id3;

    -- Attach items for Order Ahead Booking 3
    IF v_malvani_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes)
        VALUES (v_booking_id3, v_malvani_item_id, 1, 240.00, 'Medium spicy');
    END IF;
    IF v_bhakri_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes)
        VALUES (v_booking_id3, v_bhakri_item_id, 2, 160.00, 'Jowar bhakri');
    END IF;
    IF v_puran_item_id IS NOT NULL THEN
        INSERT INTO public.booking_items (booking_id, menu_item_id, quantity, unit_price, notes)
        VALUES (v_booking_id3, v_puran_item_id, 2, 140.00, 'Extra ghee');
    END IF;

    -- Booking 4: Table booking (6 guests, Today 20:30, SEATED)
    INSERT INTO public.bookings (
        restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo
    ) VALUES (
        v_restaurant_id,
        'SV-' || to_char(v_today, 'DDMM') || '-004',
        'table',
        6,
        (v_today::text || ' 20:30:00+05:30')::timestamptz,
        'seated',
        'प्रदीप कुंजीर (Pradeep Kunjir)',
        '9765089012',
        'Repeat local family from Kunjirwadi.',
        true
    ) RETURNING id INTO v_booking_id4;

    -- Booking 5: Pilgrim Group Meal (10 pilgrims, Tomorrow Festival Day 12:30, PENDING)
    INSERT INTO public.bookings (
        restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, package_id, is_demo
    ) VALUES (
        v_restaurant_id,
        'SV-' || to_char(v_tomorrow, 'DDMM') || '-001',
        'group_meal',
        10,
        (v_tomorrow::text || ' 12:30:00+05:30')::timestamptz,
        'pending',
        'बाळकृष्ण शिंदे (Balkrishna Shinde)',
        '9921123456',
        'Angarki Chaturthi darshan pilgrim group from Daund.',
        v_pilgrim_pkg_id,
        true
    ) RETURNING id INTO v_booking_id5;

    -- Booking 6: Table booking (2 guests, Tomorrow 20:00, CONFIRMED)
    INSERT INTO public.bookings (
        restaurant_id, token_number, type, party_size, slot_start, status, guest_name, guest_phone, notes, is_demo
    ) VALUES (
        v_restaurant_id,
        'SV-' || to_char(v_tomorrow, 'DDMM') || '-002',
        'table',
        2,
        (v_tomorrow::text || ' 20:00:00+05:30')::timestamptz,
        'confirmed',
        'अमोल व स्नेहल गायकवाड (Amol Gaikwad)',
        '9890076543',
        'Couple returning after Ganpati Abhishek.',
        true
    ) RETURNING id INTO v_booking_id6;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Demo data reset successfully for Shree Pure Veg!',
        'restaurant_id', v_restaurant_id,
        'seeded_counts', jsonb_build_object(
            'menu_items', 7,
            'group_packages', 2,
            'date_rules', 2,
            'sample_bookings', 6
        )
    );
END;
$$;

-- Run reset_demo() immediately to populate initial data
SELECT public.reset_demo();
