-- ==============================================================================
-- MIGRATION: 20261013010000_reports_views_and_rpc.sql
-- Admin Reports SQL Views & RPC Function
-- Shree Pure Veg (Theur Phata, Pune-Solapur Highway)
-- Computes KPIs, 7-Day Guests, Bookings By Type, and Top Pre-ordered Dishes
-- ==============================================================================

-- 1. VIEW: Booking KPIs
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

-- 2. VIEW: Bookings By Type
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

-- 3. VIEW: Top Pre-Ordered Dishes
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

-- 4. MASTER RPC FUNCTION: get_admin_reports
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
    -- Determine default restaurant if none provided
    IF v_rest_id IS NULL THEN
        SELECT id INTO v_rest_id FROM public.restaurants LIMIT 1;
    END IF;

    -- Local date in IST
    v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;

    -- (a) Compute KPI numbers in database
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

    -- (b) Compute Next 7 Days Rolling Guests Bar Chart
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

    -- (c) Compute Bookings by Type
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

    -- (d) Compute Top Pre-Ordered Dishes
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

-- Grant permissions for staff execution
GRANT EXECUTE ON FUNCTION public.get_admin_reports(UUID) TO anon, authenticated, service_role;
