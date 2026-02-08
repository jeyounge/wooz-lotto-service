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

    checkUpdateNeeded: (currentLatestRound, history) => {
        const expected = LottoService.getExpectedRound();
        
        if (currentLatestRound >= expected) return false;

        const lastAttempt = localStorage.getItem('lastLottoFetchAttempt');
        if (lastAttempt) {
            const timeSince = Date.now() - parseInt(lastAttempt);
            if (timeSince < 5000) { // Keep 5s for testing
                console.log('Skipping auto-update: Rate limit active.');
                return false;
            }
        }

        console.log(`Update needed: Have ${currentLatestRound}, Expecting ${expected}`);
        return expected;
    },

    fetchRound: async (drwNo) => {
        localStorage.setItem('lastLottoFetchAttempt', Date.now().toString());
        console.log(`[LottoService] Scraping Round ${drwNo} Detail...`);
        
        try {
            // Use local proxy path (configured in vite.config.js and vercel.json)
            // https://data.soledot.com/lottowinnumberdetail/fo/1210/lottowinnumberdetailview.sd
            // -> /api/lotto/lottowinnumberdetail/fo/1210/lottowinnumberdetailview.sd
            const url = `/api/lotto/lottowinnumberdetail/fo/${drwNo}/lottowinnumberdetailview.sd`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); 

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            // --- Selectors ---

            // Date: <th>발표일</th>
            let drwNoDate = '';
            const ths = doc.querySelectorAll('th');
            ths.forEach(th => {
                if (th.textContent.includes('발표일')) {
                    drwNoDate = th.nextElementSibling?.textContent?.trim();
                }
            });

            // Numbers: .circleNumber
            const numEls = doc.querySelectorAll('.circleNumber');
            const numbers = [];
            let bonus = 0;
            numEls.forEach((el, idx) => {
                const num = parseInt(el.textContent.trim());
                if (idx < 6) numbers.push(num);
                else bonus = num; // 7th ball is bonus
            });

            if (numbers.length === 0) {
                 console.warn('[LottoService] No numbers found. Page might be empty or restricted.');
                 return null;
            }

            // Detailed Stats
            let totalSellAmnt = 0;
            let firstHow = '';
            let ranks = {};

            const rows = doc.querySelectorAll('table.table-bordered tr');
            rows.forEach(row => {
                const thText = row.querySelector('th')?.textContent?.trim() || '';
                const td = row.querySelector('td');
                const tdText = td?.textContent?.trim() || '';

                if (thText.includes('로또 총 구매금액')) {
                    totalSellAmnt = parseInt(tdText.replace(/[^0-9]/g, '')) || 0;
                }
                else if (thText.includes('자동/수동/반자동')) {
                    firstHow = tdText.replace(/\s+/g, ' '); // Clean whitespace
                }
                else if (['1등', '2등', '3등', '4등', '5등'].includes(thText)) {
                    const rankNum = parseInt(thText.replace('등', ''));
                    const spans = td.querySelectorAll('span.text-success');
                    // Usually: [0] Count, [1] 1-person-prize
                    if (spans.length >= 2) {
                        ranks[rankNum] = {
                            count: parseInt(spans[0].textContent.replace(/[^0-9]/g, '')) || 0,
                            prize: parseInt(spans[1].textContent.replace(/[^0-9]/g, '')) || 0
                        };
                    }
                }
            });

            const result = {
                drwNo: parseInt(drwNo, 10),
                drwNoDate,
                numbers,
                bonus,
                firstWinamnt: ranks[1]?.prize || 0,
                firstPrzwnerCo: ranks[1]?.count || 0,
                
                // Detailed Fields for DB
                totalSellAmnt,
                firstHow,
                secondWinAmnt: ranks[2]?.prize || 0,
                secondPrzwnerCo: ranks[2]?.count || 0,
                thirdWinAmnt: ranks[3]?.prize || 0,
                thirdPrzwnerCo: ranks[3]?.count || 0,
                fourthWinAmnt: ranks[4]?.prize || 50000, // Default fixed prize
                fourthPrzwnerCo: ranks[4]?.count || 0,
                fifthWinAmnt: ranks[5]?.prize || 5000,   // Default fixed prize
                fifthPrzwnerCo: ranks[5]?.count || 0,
            };

            console.log('[LottoService] Scraped Data:', result);
            return result;

        } catch (error) {
            console.error('[LottoService] Failed scrape:', error);
            return null;
        }
    }
};
