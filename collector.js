// collector.js — weekly data sync (run by .github/workflows/weekly-sync.yml)
//
// Source: smok95 static JSON, the same source the web client uses.
// The old data.soledot.com HTML scraper broke in June 2026 and every
// scheduled run failed from then on, which froze lottoHistory.json at 1227.
//
// Exit codes: 0 = data includes the expected latest round, 1 = not published yet (workflow retries).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'src', 'data', 'lottoHistory.json');
const SOURCE_URL = 'https://smok95.github.io/lotto/results/all.json';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const FIRST_DRAW_UTC = Date.UTC(2002, 11, 7, 11, 45); // round 1: 2002-12-07 20:45 KST

function loadEnv() {
    const env = { ...process.env };
    try {
        for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf-8').split('\n')) {
            const i = line.indexOf('=');
            if (i > 0 && !env[line.slice(0, i).trim()]) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
        }
    } catch {
        // .env is optional (GitHub Actions passes secrets as env vars)
    }
    return env;
}

export function expectedLatestRound(now = Date.now()) {
    return Math.floor((now - FIRST_DRAW_UTC) / WEEK_MS) + 1;
}

export function toFullRecord(r) {
    const div = Array.isArray(r.divisions) ? r.divisions : [];
    const wc = r.winners_combination || {};
    return {
        drwNo: r.draw_no,
        drwNoDate: String(r.date || '').split('T')[0],
        numbers: [...r.numbers].sort((a, b) => a - b),
        bonus: r.bonus_no,
        firstWinamnt: div[0]?.prize || 0,
        firstPrzwnerCo: div[0]?.winners || 0,
        secondWinAmnt: div[1]?.prize || 0,
        secondPrzwnerCo: div[1]?.winners || 0,
        thirdWinAmnt: div[2]?.prize || 0,
        thirdPrzwnerCo: div[2]?.winners || 0,
        fourthWinAmnt: div[3]?.prize || 50000,
        fourthPrzwnerCo: div[3]?.winners || 0,
        fifthWinAmnt: div[4]?.prize || 5000,
        fifthPrzwnerCo: div[4]?.winners || 0,
        totalSellAmnt: r.total_sales_amount || 0,
        firstHow: wc.auto != null || wc.manual != null ? `자동 ${wc.auto ?? 0} / 수동 ${wc.manual ?? 0}` : '',
    };
}

// The JSON is bundled into the client, so keep only what the app reads.
const toSlimRecord = f => ({
    drwNo: f.drwNo,
    drwNoDate: f.drwNoDate,
    numbers: f.numbers,
    bonus: f.bonus,
    firstWinamnt: f.firstWinamnt,
    firstPrzwnerCo: f.firstPrzwnerCo,
    secondWinAmnt: f.secondWinAmnt,
    thirdWinAmnt: f.thirdWinAmnt,
});

async function syncToDB(supabase, f) {
    const { error } = await supabase.rpc('sync_lotto_round', {
        p_drw_no: f.drwNo,
        p_drw_date: f.drwNoDate,
        p_numbers: f.numbers,
        p_bonus: f.bonus,
        p_first_win_amnt: f.firstWinamnt,
        p_first_przwner_co: f.firstPrzwnerCo,
        p_second_win_amnt: f.secondWinAmnt,
        p_second_przwner_co: f.secondPrzwnerCo,
        p_third_win_amnt: f.thirdWinAmnt,
        p_third_przwner_co: f.thirdPrzwnerCo,
        p_fourth_win_amnt: f.fourthWinAmnt,
        p_fourth_przwner_co: f.fourthPrzwnerCo,
        p_fifth_win_amnt: f.fifthWinAmnt,
        p_fifth_przwner_co: f.fifthPrzwnerCo,
        p_total_sell_amnt: f.totalSellAmnt,
        p_first_how: f.firstHow,
    });
    if (error) console.error(`❌ [DB] ${f.drwNo}: ${error.message}`);
    else console.log(`✅ [DB] ${f.drwNo}`);
}

async function main() {
    const res = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`source HTTP ${res.status}`);
    const source = (await res.json())
        .filter(r => Array.isArray(r.numbers) && r.numbers.length === 6 && r.bonus_no)
        .map(toFullRecord)
        .sort((a, b) => b.drwNo - a.drwNo);
    if (source.length === 0) throw new Error('source returned no draws');

    let existing = [];
    try {
        existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch {
        console.warn('No existing lottoHistory.json, building from scratch.');
    }
    const byNo = new Map(existing.map(r => [r.drwNo, r]));
    const changed = source.filter(f => {
        const old = byNo.get(f.drwNo);
        return !old || (!old.firstPrzwnerCo && f.firstPrzwnerCo) || (!old.secondWinAmnt && f.secondWinAmnt);
    });

    // One record per line: small bundle, readable git diffs.
    const body = source.map(f => JSON.stringify(toSlimRecord(f))).join(',\n');
    fs.writeFileSync(OUTPUT_FILE, `[\n${body}\n]\n`, 'utf-8');
    console.log(`Saved ${source.length} draws (latest ${source[0].drwNo}), ${changed.length} new/updated.`);

    const env = loadEnv();
    const skipDb = process.argv.includes('--no-db');
    if (!skipDb && env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY && changed.length > 0) {
        const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
        // Only push recent changes; a full re-sync is not needed every week.
        for (const f of changed.slice(0, 30)) await syncToDB(supabase, f);
    }

    const expected = expectedLatestRound();
    if (source[0].drwNo < expected) {
        console.log(`⏳ Round ${expected} not published yet (have ${source[0].drwNo}).`);
        process.exit(1);
    }
    console.log('✅ Up to date.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(err => {
        console.error('❌ Collector failed:', err.message);
        process.exit(1);
    });
}
