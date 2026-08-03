// PROXY_URL removed - using Vite/Vercel proxy
// TARGET_URL removed - using /api/lotto prefix

export const LottoService = {
    // ... (getExpectedRound and checkUpdateNeeded remain same)
    getExpectedRound: () => {
        const baseRound = 1100;
        const baseDate = new Date('2023-12-30T20:45:00+09:00'); // KST

        const now = new Date();
        const diffMs = now - baseDate;
        const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));

        return baseRound + diffWeeks;
    },

    getExpectedDate: (drwNo) => {
        const baseRound = 1100;
        // Calculate date safely using midday UTC to avoid timezone boundary shifts
        const baseDate = new Date(Date.UTC(2023, 11, 30, 12, 0, 0)); // 2023-12-30
        const diffWeeks = drwNo - baseRound;
        const targetDate = new Date(baseDate.getTime() + diffWeeks * 7 * 24 * 60 * 60 * 1000);
        return targetDate.toISOString().split('T')[0];
    },

    checkUpdateNeeded: (currentLatestRound, history) => {
        const expected = LottoService.getExpectedRound();

        let isLatestInvalid = false;
        if (history && history.length > 0) {
            const latestRecord = history.find(h => h.drwNo === currentLatestRound);
            if (latestRecord) {
                isLatestInvalid = !latestRecord.numbers ||
                    !Array.isArray(latestRecord.numbers) ||
                    latestRecord.numbers.length < 6 ||
                    latestRecord.numbers.some(n => n === null || isNaN(n));
            }
        }

        if (currentLatestRound >= expected && !isLatestInvalid) return false;

        const lastAttempt = localStorage.getItem('lastLottoFetchAttempt');
        if (lastAttempt) {
            const timeSince = Date.now() - parseInt(lastAttempt);
            if (timeSince < 5000) { // Keep 5s for testing
                console.log('Skipping auto-update: Rate limit active.');
                return false;
            }
        }

        console.log(`Update needed: Have ${currentLatestRound}, Expecting ${expected}${isLatestInvalid ? ' (Invalid Data Detected)' : ''}`);
        return isLatestInvalid ? currentLatestRound : expected;
    },

    fetchRound: async (drwNo) => {
        localStorage.setItem('lastLottoFetchAttempt', Date.now().toString());
        console.log(`[LottoService] Fetching Round ${drwNo} (smok95 JSON)...`);

        try {
            // smok95 GitHub Pages 정적 JSON (soledot 대체)
            // https://smok95.github.io/lotto/results/1235.json
            // -> /api/lottodata/1235.json  (프록시: vite.config.js / vercel.json)
            const timeHash = Math.floor(Date.now() / 600000); // 10 minutes cache
            const url = `/api/lottodata/${drwNo}.json?_t=${timeHash}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, {
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);

            // 아직 개최 전인 회차는 404 → 조용히 null 반환
            if (!response.ok) {
                console.warn(`[LottoService] Round ${drwNo} not available yet (HTTP ${response.status}).`);
                return null;
            }

            const data = await response.json();

            if (!data.numbers || !Array.isArray(data.numbers) || data.numbers.length < 6) {
                console.warn('[LottoService] Invalid data structure.', data);
                return null;
            }

            // divisions: [1등, 2등, 3등, 4등, 5등] { prize, winners }
            const div = Array.isArray(data.divisions) ? data.divisions : [];
            const drwNoDate = data.date ? String(data.date).split('T')[0] : '';
            const wc = data.winners_combination || {};
            const firstHow = (wc.auto != null || wc.manual != null)
                ? `자동 ${wc.auto ?? 0} / 수동 ${wc.manual ?? 0}`
                : '';

            const result = {
                drwNo: parseInt(drwNo, 10),
                drwNoDate,
                numbers: [...data.numbers].sort((a, b) => a - b),
                bonus: data.bonus_no,
                firstWinamnt: div[0]?.prize || 0,
                firstPrzwnerCo: div[0]?.winners || 0,

                // Detailed Fields for DB
                totalSellAmnt: data.total_sales_amount || 0,
                firstHow,
                secondWinAmnt: div[1]?.prize || 0,
                secondPrzwnerCo: div[1]?.winners || 0,
                thirdWinAmnt: div[2]?.prize || 0,
                thirdPrzwnerCo: div[2]?.winners || 0,
                fourthWinAmnt: div[3]?.prize || 50000, // Default fixed prize
                fourthPrzwnerCo: div[3]?.winners || 0,
                fifthWinAmnt: div[4]?.prize || 5000,   // Default fixed prize
                fifthPrzwnerCo: div[4]?.winners || 0,
            };

            console.log('[LottoService] Fetched Data:', result);
            return result;

        } catch (error) {
            console.error('[LottoService] Failed fetch:', error);
            return null;
        }
    }
};
