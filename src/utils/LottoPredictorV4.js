import LottoPredictorV2 from './LottoPredictorV2.js';

class LottoPredictorV4 extends LottoPredictorV2 {
    constructor(historyData, options = {}) {
        super(historyData);
        this.killCount = options.killCount || 2; // Default reduced to 2 for safety
        this.killList = [];
        this.killReasons = {};
        this.applyKillStrategy();
    }

    applyKillStrategy() {
        if (!this.history || this.history.length < 15) return;

        // Sort: 0 is Latest
        const sorted = [...this.history].sort((a,b) => b.drwNo - a.drwNo);
        const kills = new Set();
        const killReasons = {};

        // Helper: Hot Safety Valve
        // Returns true if number appeared >= 3 times in last 10 weeks
        const last10 = sorted.slice(0, 10);
        const counts10 = {};
        last10.forEach(r => r.numbers.forEach(n => counts10[n] = (counts10[n]||0) + 1));
        
        const isHot = (num) => (counts10[num] || 0) >= 3;

        const addKill = (num, reason) => {
            if (kills.size >= this.killCount) return; 
            if (!kills.has(num)) {
                kills.add(num);
                killReasons[num] = reason;
            }
        };

        // --- Priority 1: 3-Consecutive (MANDATORY KILL) ---
        // User requested to keep this rule. Analysis shows 90.5% success.
        // Ignores Safety Valve.
        const r0 = sorted[0].numbers;
        const r1 = sorted[1].numbers;
        const r2 = sorted[2].numbers;
        
        for (let i = 1; i <= 45; i++) {
            if (r0.includes(i) && r1.includes(i) && r2.includes(i)) {
                addKill(i, "3-Consecutive (3주 연속 출현 - 패턴 필살)");
                break; 
            }
        }

        // --- Priority 2: Last Bonus Number (MANDATORY KILL) ---
        // Analysis shows 90% success.
        // Ignores Safety Valve.
        if (kills.size < this.killCount) {
            const lastBonus = sorted[0].bonus;
            if (lastBonus) {
                addKill(lastBonus, "Last Bonus (직전 보너스 - 패턴 필살)");
            }
        }

        // --- Priority 3: Weakest of Hot Digit (SAFETY VALVE APPLIED) ---
        // Only if we haven't reached kill count
        if (kills.size < this.killCount) {
            const last5 = sorted.slice(0, 5);
            const digitsCount = {}; 
            const numCounts = {};
            
            last5.forEach(r => {
                r.numbers.forEach(n => {
                    const digit = n % 10;
                    digitsCount[digit] = (digitsCount[digit] || 0) + 1;
                    numCounts[n] = (numCounts[n] || 0) + 1;
                });
            });

            // Find hottest digit
            const hottestDigitEntry = Object.entries(digitsCount).sort((a,b) => b[1] - a[1])[0];
            
            if (hottestDigitEntry) {
                const targetDigit = parseInt(hottestDigitEntry[0]);
                
                // Candidates: Numbers with this digit
                const candidates = [];
                for(let i=1; i<=45; i++) {
                    if (i % 10 === targetDigit) candidates.push(i);
                }

                // Sort by Frequency Asc (Weakest first)
                candidates.sort((a,b) => (numCounts[a]||0) - (numCounts[b]||0));

                for (const cand of candidates) {
                    // CRITICAL CHANGE: Check Safety Valve
                    if (isHot(cand)) {
                        console.log(`[V4] Saved Hot Number ${cand} from execution (Digit Rule)`);
                        continue; 
                    }
                    
                    addKill(cand, `Weakest of Hot Digit ${targetDigit} (안전장치 통과)`);
                    if (kills.size >= this.killCount) break;
                }
            }
        }

        // --- Priority 4: Coldest Numbers (Filler) ---
        // If still need kills, pick from Coldest (Lowest freq in last 10)
        // MUST NOT BE HOT (Redundant check but safe)
        if (kills.size < this.killCount) {
             const allNums = Array.from({length: 45}, (_, i) => i + 1);
             // Sort by Freq Ascending (Coldest first)
             allNums.sort((a,b) => (counts10[a]||0) - (counts10[b]||0));
             
             for (const cand of allNums) {
                 if (isHot(cand)) continue; // Skip hot ones (obviously)
                 
                 // Also avoid neighbors of last round? (Optional, but let's keep it simple)
                 // Just kill the coldest one that isn't hot.
                 
                 addKill(cand, `Coldest Number (최근 10주 ${counts10[cand]||0}회)`);
                 if (kills.size >= this.killCount) break;
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

    analyzeSelection(numbers) {
        const baseAnalysis = super.analyzeSelection(numbers);
        const killMsg = this.killList.map(k => `${k}(${this.killReasons[k]})`).join(', ');
        return [
            `🛡️ V4 안전장치 적용: [${killMsg}] 제외`,
            ...baseAnalysis
        ];
    }
}

export default LottoPredictorV4;
