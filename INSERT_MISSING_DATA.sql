-- INSERT STATEMENTS FOR 1210, 1211
-- Run this in Supabase SQL Editor to manually fix the missing data

INSERT INTO public.lotto_history (drw_no,drw_no_date,numbers,bonus,first_win_amnt,first_przwner_co,second_win_amnt,second_przwner_co,third_win_amnt,third_przwner_co,fourth_win_amnt,fourth_przwner_co,fifth_win_amnt,fifth_przwner_co,total_sell_amnt,first_how) VALUES (1210,'2026-02-07','{1,7,9,17,27,38}',31,1102298407,24,0,0,0,0,50000,0,5000,0,0,'') ON CONFLICT (drw_no) DO UPDATE SET updated_at = now();

INSERT INTO public.lotto_history (drw_no,drw_no_date,numbers,bonus,first_win_amnt,first_przwner_co,second_win_amnt,second_przwner_co,third_win_amnt,third_przwner_co,fourth_win_amnt,fourth_przwner_co,fifth_win_amnt,fifth_przwner_co,total_sell_amnt,first_how) VALUES (1211,'2026-02-14','{23,26,27,35,38,40}',10,0,0,0,0,0,0,50000,0,5000,0,0,'') ON CONFLICT (drw_no) DO UPDATE SET updated_at = now();
