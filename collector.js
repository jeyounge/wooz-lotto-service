import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'src', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'lottoHistory.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Configuration
const BASE_URL = 'https://data.soledot.com/lottowinnumber/fo/lottowinnumberlist.sd';
const TOTAL_ROUNDS = 1208; // Approx, can be detected dynamically or set high
const ITEMS_PER_PAGE = 20; // Observation from debug
const MAX_PAGE = Math.ceil(TOTAL_ROUNDS / ITEMS_PER_PAGE) + 2; // +2 buffer

async function scrape() {
    console.log('Starting Scraper for data.soledot.com...');
    let history = [];
    
    // Load existing data to avoid overwrite
    if (fs.existsSync(OUTPUT_FILE)) {
        try {
            history = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`Loaded ${history.length} existing records.`);
        } catch (e) {
            console.error('Failed to load existing history:', e);
        }
    }
    
    // Optimized: Check only first page for quick update
    for (let page = 1; page <= 1; page++) {
        try {
            console.log(`Fetching Page ${page}...`);
            const response = await axios.get(`${BASE_URL}?s_pagenum=${page}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const $ = cheerio.load(response.data);
            const rows = $('#table1 tbody tr');
            
            if (rows.length === 0) {
                console.log('No more rows found. Stopping.');
                break;
            }

            rows.each((i, el) => {
                const tds = $(el).find('td');
                if (tds.length === 0) return;

                const roundStr = $(tds[0]).text().trim();
                const round = parseInt(roundStr, 10);
                
                if (!round) return; 

                // Numbers are in .circleNumber divs
                const numberDivs = $(tds[1]).find('.circleNumber');
                const numbers = [];
                numberDivs.each((j, numEl) => {
                    numbers.push(parseInt($(numEl).text().trim(), 10));
                });
                // Sort numbers just in case
                numbers.sort((a, b) => a - b);

                // Bonus
                const bonusStr = $(tds[2]).find('.circleNumber').text().trim();
                const bonus = parseInt(bonusStr, 10);

                // 1st Prize Winners
                const winnersStr = $(tds[3]).text().trim().replace(/,/g, '');
                const winners = parseInt(winnersStr, 10);

                // Prize Amount
                const prizeStr = $(tds[4]).text().trim().replace(/,/g, '').replace(/원/g, '');
                const prize = parseInt(prizeStr, 10);

                // Date
                const date = $(tds[5]).text().trim();

                const record = {
                    drwNo: round,
                    drwNoDate: date,
                    numbers: numbers,
                    bonus: bonus,
                    firstWinamnt: prize,
                    firstPrzwnerCo: winners
                };
                
                // Avoid duplicates if pages overlap (though likely distinct)
                if (!history.find(h => h.drwNo === round)) {
                    history.push(record);
                }
            });

            // Brief pause
            await new Promise(r => setTimeout(r, 200));

        } catch (e) {
            console.error(`Error on page ${page}:`, e.message);
        }
    }

    // Sort by round descending
    history.sort((a, b) => b.drwNo - a.drwNo);

    // Remove duplicates just in case
    history = history.filter((v,i,a)=>a.findIndex(t=>(t.drwNo === v.drwNo))===i);

    console.log(`\nCollected ${history.length} records.`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`Saved to ${OUTPUT_FILE}`);
}

scrape();
