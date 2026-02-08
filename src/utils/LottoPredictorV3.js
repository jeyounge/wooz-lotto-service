import LottoPredictorV2 from './LottoPredictorV2.js';

class LottoPredictorV3 extends LottoPredictorV2 {
    constructor(historyData, options = {}) {
        super(historyData);
        this.killCount = options.killCount || 3; // Default 3, can be 5
        this.killList = [];
        this.applyKillStrategy();
    }

    applyKillStrategy() {
        if (!this.history || this.history.length < 15) return;

        // Sort: 0 is Latest
        const sorted = [...this.history].sort((a,b) => b.drwNo - a.drwNo);
        const kills = new Set();
        const killReasons = {};

        const addKill = (num, reason) => {
            if (kills.size >= this.killCount) return; 
            if (!kills.has(num)) {
                kills.add(num);
                killReasons[num] = reason;
            }
        };

        // --- Priority 1: 3-Consecutive OR Max Freq in Last 10 Weeks ---
        let p1Found = false;
        
        // A. Check 3-Consecutive
        const r0 = sorted[0].numbers;
        const r1 = sorted[1].numbers;
        const r2 = sorted[2].numbers;
        
        for (let i = 1; i <= 45; i++) {
            if (r0.includes(i) && r1.includes(i) && r2.includes(i)) {
                addKill(i, "3-Consecutive (3주 연속 출현)");
                p1Found = true;
                break;
            }
        }
        
        // B. Fallback: Max Freq in Last 10 Weeks
        // Prepare counts for 10 weeks regardless (needed for fillers later)
        const last10 = sorted.slice(0, 10);
        const counts10 = {};
        last10.forEach(r => r.numbers.forEach(n => counts10[n] = (counts10[n]||0) + 1));
        
        const hotSorted10 = Object.entries(counts10)
            .sort((a, b) => b[1] - a[1] || b[0] - a[0]) // Count Desc
            .map(x => parseInt(x[0]));

        if (!p1Found && hotSorted10.length > 0) {
            const hotNum = hotSorted10[0];
            addKill(hotNum, `Max Freq last 10 (${counts10[hotNum]}회 출현)`);
        }

        // --- Priority 2: Last Bonus Number (지난주 보너스) ---
        if (kills.size < this.killCount) {
            const lastBonus = sorted[0].bonus;
            if (lastBonus) {
                addKill(lastBonus, "Last Bonus (직전 보너스)");
            }
        }

        // --- Priority 3: Last Digit Pattern (끝수 법칙) ---
        // Logic: Find most frequent last digit in last 5 weeks -> Exclude LEAST frequent number of that digit
        if (kills.size < this.killCount) {
            const last5 = sorted.slice(0, 5);
            const digitsCount = {}; // 0~9 counts
            const numCounts = {};   // 1~45 counts

            last5.forEach(r => {
                r.numbers.forEach(n => {
                    const digit = n % 10;
                    digitsCount[digit] = (digitsCount[digit] || 0) + 1;
                    numCounts[n] = (numCounts[n] || 0) + 1;
                });
            });

            // Find hottest digit
            const hottestDigit = Object.entries(digitsCount)
                .sort((a,b) => b[1] - a[1])[0]; // [digit, count]
            
            if (hottestDigit) {
                const targetDigit = parseInt(hottestDigit[0]);
                
                // Get all numbers with this digit (e.g., 1, 11, 21, 31, 41)
                const candidates = [];
                for(let i=1; i<=45; i++) {
                    if (i % 10 === targetDigit) candidates.push(i);
                }

                // Find the one that appeared LEAST in last 5 weeks
                // Sort by Count Ascending
                candidates.sort((a,b) => (numCounts[a]||0) - (numCounts[b]||0));

                for (const cand of candidates) {
                     addKill(cand, `Weakest of Hot Digit ${targetDigit} (끝수법칙)`);
                     if (kills.size >= 3) break; // Basic 3-Kill Limit Logic (Keep this soft limit for base logic)
                }
            }
        }

        // --- Always Calculate Challenge Candidates (Priorities 4 & 5) ---
        // We calculate these regardless of killCount so UI can show them
        this.extraKillCandidates = [];

        // 4. Hot Neighbor Kill (Last Week's Neighbor with Highest 5-Week Freq)
        const r0_nums = sorted[0].numbers;
        const neighbors = new Set();
        r0_nums.forEach(n => {
            if (n-1 >= 1) neighbors.add(n-1);
            if (n+1 <= 45) neighbors.add(n+1);
        });
        const neighborList = Array.from(neighbors);

        // Calculate 5-week freq for these neighbors
        const last5 = sorted.slice(0, 5);
        const counts5 = {};
        last5.forEach(r => r.numbers.forEach(n => counts5[n] = (counts5[n]||0) + 1));

        const sortedNeighbors = neighborList.sort((a,b) => (counts5[b]||0) - (counts5[a]||0)); // Descending

        if (sortedNeighbors.length > 0) {
            const bestNeighbor = sortedNeighbors[0];
            const reason = `🔥 Hot Neighbor (최근 5주 과열 이웃수)`;
            this.extraKillCandidates.push({ num: bestNeighbor, reason });
            
            // Only Apply if Challenge Mode (killCount >= 4)
            if (this.killCount >= 5) {
                addKill(bestNeighbor, reason);
            }
        }

        // 5. Hot Carryover Kill (Last Week's Number with Highest 10-Week Freq)
        // We already have hotSorted10 (all numbers sorted by 10-week freq)
        const hotCarryovers = hotSorted10.filter(n => r0_nums.includes(n));
        
        if (hotCarryovers.length > 0) {
                const bestCarryover = hotCarryovers[0];
                const reason = `🔥 Hot Carryover (최근 10주 과열 이월수)`;
                this.extraKillCandidates.push({ num: bestCarryover, reason });

                // Only Apply if Challenge Mode (killCount >= 5)
                if (this.killCount >= 5) {
                    addKill(bestCarryover, reason);
                }
        }
        
        // --- Filler: If still not enough, pick Next Hottest from 10-week stats ---
        if (kills.size < this.killCount) {
             let hotIdx = 0;
             while (kills.size < this.killCount && hotIdx < hotSorted10.length) {
                 const cand = hotSorted10[hotIdx++];
                 addKill(cand, `Fallback Hot 10 (${counts10[cand]}회)`);
             }
        }

        // Apply
        this.killList = Array.from(kills);
        this.killList.forEach(k => {
            if (!this.excludedNumbers.includes(k)) {
                this.excludedNumbers.push(k);
            }
            this.scores[k] = -9999; 
        });

        this.killReasons = killReasons;
    }

    // Override analyze to show kill info
    analyzeSelection(numbers) {
        const baseAnalysis = super.analyzeSelection(numbers);
        const killMsg = this.killList.map(k => `${k}(${this.killReasons[k]})`).join(', ');
        return [
            `☠️ 3-Kill 전략 적용: [${killMsg}] 제외`,
            ...baseAnalysis
        ];
    }
}

export default LottoPredictorV3;
