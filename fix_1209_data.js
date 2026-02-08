
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, '.env')));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

const DRW_NO = 1209;
const URL = `https://data.soledot.com/lottowinnumberdetail/fo/${DRW_NO}/lottowinnumberdetailview.sd`;

const parseMoney = (str) => {
    if (!str) return 0;
    return parseInt(str.replace(/[^0-9]/g, ''));
};

const fixData = async () => {
    try {
        console.log(`Fetching Round ${DRW_NO}...`);
        const { data: html } = await axios.get(URL);
        const $ = cheerio.load(html);

        let totalSellAmnt = 0;
        let firstHow = '';
        
        $('table.table-bordered tr').each((i, row) => {
            const thText = $(row).find('th').text().trim();
            const td = $(row).find('td');

            if (thText.includes('로또 총 구매금액')) {
                totalSellAmnt = parseMoney(td.text());
            } else if (thText.includes('자동/수동/반자동')) {
                firstHow = td.text().trim();
            }
        });

        console.log(`Found Data -> Total Sell: ${totalSellAmnt}, First How: ${firstHow}`);

        if (totalSellAmnt === 0 || !firstHow) {
            console.error('Failed to parse data. Aborting.');
            return;
        }

        const { error } = await supabase
            .from('lotto_history')
            .update({
                total_sell_amnt: totalSellAmnt,
                first_how: firstHow
            })
            .eq('drw_no', DRW_NO);

        if (error) {
            console.error('Update Error:', error);
        } else {
            console.log('Success! Round 1209 updated with details.');
        }

    } catch (err) {
        console.error('Error:', err);
    }
};

fixData();
