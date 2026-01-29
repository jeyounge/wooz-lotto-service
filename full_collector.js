
// full_collector.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load Env
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'https://data.soledot.com/lottowinnumberdetail/fo';
const MAX_ROUND = 1208; // Target

// Helper to parse currency string "1,234원" -> 1234
const parseMoney = (str) => {
    if (!str) return 0;
    return parseInt(str.replace(/[^0-9]/g, ''));
};

const fetchAndSave = async (drwNo) => {
    try {
        const url = `${BASE_URL}/${drwNo}/lottowinnumberdetailview.sd`;
        // console.log(`Fetching Round ${drwNo}...`);
        
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);

        // --- Selectors (User might need to adjust based on actual HTML structure) ---
        // Assuming standard table layout based on typical korean lotto sites
        // This part relies on specific DOM structure. 
        // We might need to debug this if the selector fails.
        
        // Correct Selectors based on debug.html
        
        // 0. Basic Info
        let drwNoDate = '';
        let numbers = [];
        let bonus = 0;

        // Date
        $('th').each((i, el) => {
            if ($(el).text().includes('발표일')) {
                drwNoDate = $(el).next().text().trim();
            }
        });

        // Numbers
        $('.circleNumber').each((i, el) => {
            const num = parseInt($(el).text().trim());
            if (i < 6) numbers.push(num);
            else bonus = num;
        });

        // 1. Detailed Stats
        let totalSellAmnt = 0;
        let firstHow = '';
        let ranks = {};

        $('table.table-bordered tr').each((i, row) => {
            const thText = $(row).find('th').text().trim();
            const td = $(row).find('td');

            if (thText.includes('로또 총 구매금액')) {
                totalSellAmnt = parseMoney(td.text());
            } else if (thText.includes('자동/수동/반자동')) {
                firstHow = td.text().trim();
            } else if (['1등', '2등', '3등', '4등', '5등'].includes(thText)) {
                const rankNum = parseInt(thText.replace('등', ''));
                const stats = td.find('span.text-success'); // [Count, Prize(1p), Prize(Total)]
                
                if (stats.length >= 2) {
                    ranks[rankNum] = {
                        count: parseMoney(stats.eq(0).text()),
                        prize: parseMoney(stats.eq(1).text())
                    };
                }
            }
        });
        
        // Construct Upsert Object
        const upsertData = {
            drw_no: drwNo,
            drw_date: drwNoDate,
            numbers: numbers,
            bonus: bonus,
            
            // Basic Ranks (Legacy cols)
            first_win_amnt: ranks[1]?.prize || 0,
            first_przwner_co: ranks[1]?.count || 0,

            // New Detailed Cols
            total_sell_amnt: totalSellAmnt,
            first_how: firstHow,
            second_win_amnt: ranks[2]?.prize || 0,
            second_przwner_co: ranks[2]?.count || 0,
            third_win_amnt: ranks[3]?.prize || 0,
            third_przwner_co: ranks[3]?.count || 0,
            fourth_win_amnt: ranks[4]?.prize || 0,
            fourth_przwner_co: ranks[4]?.count || 0,
            fifth_win_amnt: ranks[5]?.prize || 0,
            fifth_przwner_co: ranks[5]?.count || 0,
        };

        // console.log(`[${drwNo}] Data:`, upsertData);

        // Upsert Supabase
        const { error } = await supabase
            .from('lotto_history')
            .upsert(upsertData); // Upsert handles Insert/Update

        if (error) {
            console.error(`Error updating Round ${drwNo}:`, error.message);
        } else {
             process.stdout.write(`.${drwNo % 50 === 0 ? '\n' : ''}`); // Progress dots
        }

    } catch (err) {
        console.error(`Failed Round ${drwNo}:`, err.message);
    }
};

const run = async () => {
    console.log(`Starting Full Migration (1 ~ ${MAX_ROUND})`);
    
    // Chunking to avoid rate limits
    const CHUNK_SIZE = 20; // Increased chunk size slightly
    for (let i = 1; i <= MAX_ROUND; i += CHUNK_SIZE) {
        const chunk = [];
        for (let j = 0; j < CHUNK_SIZE && (i + j) <= MAX_ROUND; j++) {
            chunk.push(fetchAndSave(i + j));
        }
        await Promise.all(chunk);
        process.stdout.write(` [${i}-${Math.min(i+CHUNK_SIZE-1, MAX_ROUND)} done] `);
    }
    
    console.log('\nMigration Complete!');
};

run();
