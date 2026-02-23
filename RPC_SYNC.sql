-- RPC: Sync Lotto Round (Security Definer)
-- This function runs with the privileges of the creator (postgres/admin), 
-- effectively bypassing RLS for the Anon key when called via RPC.

DROP FUNCTION IF EXISTS public.sync_lotto_round;

CREATE OR REPLACE FUNCTION public.sync_lotto_round(
    p_drw_no INTEGER,
    p_drw_date DATE,
    p_numbers INTEGER[],
    p_bonus INTEGER,
    p_first_win_amnt BIGINT,
    p_first_przwner_co INTEGER,
    p_second_win_amnt BIGINT DEFAULT 0,
    p_second_przwner_co INTEGER DEFAULT 0,
    p_third_win_amnt BIGINT DEFAULT 0,
    p_third_przwner_co INTEGER DEFAULT 0,
    p_fourth_win_amnt BIGINT DEFAULT 0,
    p_fourth_przwner_co INTEGER DEFAULT 0,
    p_fifth_win_amnt BIGINT DEFAULT 0,
    p_fifth_przwner_co INTEGER DEFAULT 0,
    p_total_sell_amnt BIGINT DEFAULT 0,
    p_first_how TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Critical: Runs as Admin
AS $$
DECLARE
    v_result JSONB;
BEGIN
    INSERT INTO public.lotto_history (
        drw_no, drw_date, numbers, bonus,
        first_win_amnt, first_przwner_co,
        second_win_amnt, second_przwner_co,
        third_win_amnt, third_przwner_co,
        fourth_win_amnt, fourth_przwner_co,
        fifth_win_amnt, fifth_przwner_co,
        total_sell_amnt, first_how
    ) VALUES (
        p_drw_no, p_drw_date, p_numbers, p_bonus,
        p_first_win_amnt, p_first_przwner_co,
        p_second_win_amnt, p_second_przwner_co,
        p_third_win_amnt, p_third_przwner_co,
        p_fourth_win_amnt, p_fourth_przwner_co,
        p_fifth_win_amnt, p_fifth_przwner_co,
        p_total_sell_amnt, p_first_how
    )
    ON CONFLICT (drw_no) DO UPDATE SET
        drw_date = EXCLUDED.drw_date,
        numbers = EXCLUDED.numbers,
        bonus = EXCLUDED.bonus,
        first_win_amnt = EXCLUDED.first_win_amnt,
        first_przwner_co = EXCLUDED.first_przwner_co,
        second_win_amnt = EXCLUDED.second_win_amnt,
        second_przwner_co = EXCLUDED.second_przwner_co,
        third_win_amnt = EXCLUDED.third_win_amnt,
        third_przwner_co = EXCLUDED.third_przwner_co,
        fourth_win_amnt = EXCLUDED.fourth_win_amnt,
        fourth_przwner_co = EXCLUDED.fourth_przwner_co,
        fifth_win_amnt = EXCLUDED.fifth_win_amnt,
        fifth_przwner_co = EXCLUDED.fifth_przwner_co,
        total_sell_amnt = EXCLUDED.total_sell_amnt,
        first_how = EXCLUDED.first_how
    RETURNING to_jsonb(public.lotto_history.*) INTO v_result;

    RETURN v_result;
END;
$$;

-- Grant EXECUTE to Anon
GRANT EXECUTE ON FUNCTION public.sync_lotto_round TO anon, authenticated, service_role;
