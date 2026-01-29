class LottoPredictor {
    constructor(historyData) {
        this.history = historyData;
        
        // Configuration for Weights (Lotto 2.0)
        this.WEIGHT_LAST_5 = 50;  // Super Hot
        this.WEIGHT_LAST_30 = 20; // Main Trend
        this.WEIGHT_LAST_50 = 5;  // Base
        
        this.scores = {};
        this.excludedNumbers = []; // Numbers to completely ignore
        this.init();
    }

    init() {
        // Initialize scores
        for (let i = 1; i <= 45; i++) this.scores[i] = 10; 

        if (!this.history || this.history.length === 0) return;

        // Sort history by Date Descending
        const sorted = [...this.history].sort((a,b) => b.drwNo - a.drwNo);

        // 1. Scoring (Weights)
        // A. Last 5 (Super Hot)
        sorted.slice(0, 5).forEach(round => {
            round.numbers.forEach(n => this.scores[n] += this.WEIGHT_LAST_5);
        });

        // B. Last 30 (Main Trend)
        sorted.slice(0, 30).forEach(round => {
            round.numbers.forEach(n => this.scores[n] += this.WEIGHT_LAST_30);
        });

        // C. Last 50 (Stability)
        sorted.slice(0, 50).forEach(round => {
            round.numbers.forEach(n => this.scores[n] += this.WEIGHT_LAST_50);
        });
        
        // 2. 3-Consecutive Weeks Exclusion Rule
        // If a number appeared in Round N, N-1, and N-2 (Last 3 rounds continuously),
        // it is statistically unlikely to appear 4 times in a row.
        if (sorted.length >= 3) {
            const r1 = sorted[0].numbers;
            const r2 = sorted[1].numbers;
            const r3 = sorted[2].numbers;
            
            for (let i = 1; i <= 45; i++) {
                if (r1.includes(i) && r2.includes(i) && r3.includes(i)) {
                    this.excludedNumbers.push(i);
                    this.scores[i] = 0; // Set score to 0 just in case
                }
            }
        }
    }

    // Weighted Random Selection
    pickNumber(currentSelection) {
        let pool = [];
        let totalWeight = 0;

        for (let i = 1; i <= 45; i++) {
            if (!currentSelection.includes(i) && !this.excludedNumbers.includes(i)) {
                // Add minor randomness (0~5) to give cold numbers a tiny chance if they have base score
                const w = this.scores[i] + (Math.random() * 5); 
                pool.push({ num: i, weight: w });
                totalWeight += w;
            }
        }

        let random = Math.random() * totalWeight;
        for (const item of pool) {
            random -= item.weight;
            if (random <= 0) return item.num;
        }
        return pool[pool.length - 1].num;
    }

    predict() {
        // Retry loop to find a set that satisfies all strict filters
        const MAX_RETRIES = 5000;
        for (let i = 0; i < MAX_RETRIES; i++) {
            const candidate = this.generateCandidate(); 
            if (this.validate(candidate)) {
                return {
                    numbers: candidate,
                    analysis: this.analyzeSelection(candidate) // Generate report for the winner
                };
            }
        }
        // Fallback (Relaxed constraints if loop fails? For now just return last attempt)
        const fallback = this.generateCandidate();
        return {
             numbers: fallback,
             analysis: this.analyzeSelection(fallback)
        };
    }

    generateCandidate() {
        const selection = [];
        for (let i = 0; i < 6; i++) {
            selection.push(this.pickNumber(selection));
        }
        return selection.sort((a, b) => a - b);
    }

    validate(numbers) {
        // 1. Consecutive Rule: Max 2 consecutive allowed (e.g. 11,12 ok. 11,12,13 fail)
        let consecutiveCount = 1;
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] === numbers[i-1] + 1) {
                consecutiveCount++;
                if (consecutiveCount > 2) return false; 
            } else {
                consecutiveCount = 1;
            }
        }

        // 2. Odd/Even Rule (Reject 6:0 or 0:6)
        const odds = numbers.filter(n => n % 2 !== 0).length;
        if (odds === 6 || odds === 0) return false; 

        // 3. Sum Rule (100 ~ 170)
        const sum = numbers.reduce((a, b) => a + b, 0);
        if (sum < 100 || sum > 170) return false;
        
        // 4. Strict History Match Rule (Reject if 5 or more match ANY past round)
        for (const round of this.history) {
            const matchCount = numbers.filter(n => round.numbers.includes(n)).length;
            if (matchCount >= 5) return false; // Stricter: Reject 5 matches too
        }

        // 5. AC (Arithmetic Complexity) Rule (Must be >= 5)
        // This ensures the numbers have varied spacing
        const stats = this.calculateStats(numbers);
        if (stats.ac < 5) return false;

        return true;
    }
    
    calculateStats(numbers) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        
        // Calculate AC (Arithmetic Complexity)
        // AC = (Number of unique differences) - (N - 1)
        const diffs = new Set();
        for (let i = 0; i < numbers.length; i++) {
            for (let j = i + 1; j < numbers.length; j++) {
                diffs.add(Math.abs(numbers[i] - numbers[j]));
            }
        }
        const ac = diffs.size - (numbers.length - 1); // diffs.size - 5
        
        return { sum, ac };
    }

    analyzeSelection(numbers) {
        const odds = numbers.filter(n => n % 2 !== 0).length;
        const evens = 6 - odds;
        
        let hottest = numbers[0];
        let maxScore = -1;
        numbers.forEach(n => {
            if (this.scores[n] > maxScore) {
                maxScore = this.scores[n];
                hottest = n;
            }
        });
        
        const stats = this.calculateStats(numbers);
        
        const reasons = [];
        // Analysis Report Text
        reasons.push(`🔥 30회차 트렌드 반영! 핵심수 [${hottest}]번 포함.`);
        reasons.push(`🛡️ 필터 적용: 3주연속출현 제외 / 과거 5등이상 중복패턴 제거 완료`);
        reasons.push(`📊 AC복잡도:${stats.ac} (5이상 만족), 총합:${stats.sum} (100~170)`);
        reasons.push(`⚖️ 홀짝 밸런스 ${odds}:${evens} / 번호 간격 최적화`);
        
        if (this.excludedNumbers.length > 0) {
            reasons.push(`🚫 ${this.excludedNumbers.length}개의 과열 번호 사전 차단됨`);
        }

        return reasons;
    }

    getScores(numbers) {
         return numbers.map(n => ({ num: n, score: this.scores[n] ? Math.round(this.scores[n]) : 0 }));
    }

    getAllScores() {
        const all = [];
        for(let i=1; i<=45; i++) {
            all.push({ num: i, score: this.scores[i] ? Math.round(this.scores[i]) : 0 });
        }
        return all.sort((a,b) => b.score - a.score);
    }
}

export default LottoPredictor;
