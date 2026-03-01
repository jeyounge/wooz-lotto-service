import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://data.soledot.com/lottowinnumberdetail/fo';

const parseMoney = (str) => {
    if (!str) return 0;
    return parseInt(str.replace(/[^0-9]/g, ''));
};

const fetchAndSave = async (drwNo) => {
    try {
        const url = `${BASE_URL}/${drwNo}/lottowinnumberdetailview.sd`;
        console.log(`Fetching Round ${drwNo} metrics...`);
        
        const { data: html } = await axios.get(url, {
             headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(html);

        // 1. Detailed Stats
        let totalSellAmnt = 0;
        let firstHow = '';

        $('table.table-bordered tr').each((i, row) => {
            const th = $(row).find('th');
            const td = $(row).find('td');

            th.each((idx, thEl) => {
                const thText = $(thEl).text().trim();
                const tdEl = td.eq(idx);
                
                if (thText.includes('로또 총 구매금액')) {
                    totalSellAmnt = parseMoney(tdEl.text());
                } else if (thText.includes('자동/수동/반자동')) {
                    firstHow = tdEl.text().trim();
                }
            });
        });

        if (totalSellAmnt > 0) {
            console.log(`[${drwNo}] totalSellAmnt: ${totalSellAmnt}, firstHow: ${firstHow}`);
            const { error } = await supabase
                .from('lotto_history')
                .update({
                    total_sell_amnt: totalSellAmnt,
                    first_how: firstHow
                })
                .eq('drw_no', drwNo);

            if (error) {
                console.error(`Error updating Round ${drwNo} in DB:`, error.message);
            } else {
                console.log(`✅ Success updating DB for Round ${drwNo}`);
            }
        } else {
            console.warn(`⚠️ Could not parse data for Round ${drwNo}`);
        }

    } catch (err) {
        console.error(`Failed Round ${drwNo}:`, err.message);
    }
};

const run = async () => {
    const targets = [1209, 1210, 1211];
    for (const t of targets) {
        await fetchAndSave(t);
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log('Done!');
};

run();
