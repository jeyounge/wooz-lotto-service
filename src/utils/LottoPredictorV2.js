class LottoPredictorV2 {
    constructor(historyData) {
        this.history = historyData;
        
        // Configuration for Weights (Lotto 2.1)
        this.WEIGHT_LAST_5 = 40;  // Reduced slightly from 50
        this.WEIGHT_LAST_10 = 10; // New: Recent 10 context
        this.WEIGHT_LAST_30 = 20; 
        
        this.scores = {};
        this.excludedNumbers = [];
        this.init();
    }

    init() {
        // Initialize scores with base value
        for (let i = 1; i <= 45; i++) this.scores[i] = 20; 

        if (!this.history || this.history.length === 0) return;

        // Sort history by Date Descending (Newest first)
        const sorted = [...this.history].sort((a,b) => b.drwNo - a.drwNo);

        // 1. Scoring (Weights)
        // A. Last 5 (Hot)
        sorted.slice(0, 5).forEach(round => {
            round.numbers.forEach(n => this.scores[n] += this.WEIGHT_LAST_5);
        });

        // B. Last 10 (Semi-Hot)
        sorted.slice(0, 10).forEach(round => {
            round.numbers.forEach(n => this.scores[n] += this.WEIGHT_LAST_10);
        });

        // C. Last 30 (Trend)
        sorted.slice(0, 30).forEach(round => {
            round.numbers.forEach(n => this.scores[n] += this.WEIGHT_LAST_30);
        });
        
        // D. Cold Numbers (Haven't appeared in last 15)
        const recent15 = new Set();
        sorted.slice(0, 15).forEach(r => r.numbers.forEach(n => recent15.add(n)));
        
        for(let i=1; i<=45; i++) {
            if(!recent15.has(i)) {
                this.scores[i] += 15; // Boost cold numbers slightly to prevent total starvation
            }
        }

        // 2. Exclusion: 3-Consecutive Weeks (Keep this, it's a strong negative signal)
        if (sorted.length >= 3) {
            const r1 = sorted[0].numbers;
            const r2 = sorted[1].numbers;
            const r3 = sorted[2].numbers;
            
            for (let i = 1; i <= 45; i++) {
                if (r1.includes(i) && r2.includes(i) && r3.includes(i)) {
                    this.excludedNumbers.push(i);
                    this.scores[i] = 0; 
                }
            }
        }
    }

    pickNumber(currentSelection) {
        let pool = [];
        let totalWeight = 0;

        for (let i = 1; i <= 45; i++) {
            if (!currentSelection.includes(i) && !this.excludedNumbers.includes(i)) {
                // Add randomness (0~10) - Increased randomness for variety
                const w = this.scores[i] + (Math.random() * 10); 
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
        // Retry loop
        const MAX_RETRIES = 2000;
        for (let i = 0; i < MAX_RETRIES; i++) {
            const candidate = this.generateCandidate(); 
            if (this.validate(candidate)) {
                return {
                    numbers: candidate,
                    analysis: this.analyzeSelection(candidate)
                };
            }
        }
        // Fallback
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
        // 1. Consecutive: Max 2 consecutive (e.g. 11,12 ok. 11,12,13 fail)
        let consecutiveCount = 1;
        let hasConsecutivePair = false;
        
        for (let i = 1; i < numbers.length; i++) {
            if (numbers[i] === numbers[i-1] + 1) {
                consecutiveCount++;
                if (consecutiveCount > 2) return false; // Reject 3-consecutive immediately
                if (consecutiveCount === 2) hasConsecutivePair = true;
            } else {
                consecutiveCount = 1;
            }
        }

        // Algo Option 3: Reduce frequency of consecutive pairs
        // If a consecutive pair exists (e.g. 21, 22), only keep it 30% of the time.
        // This makes "clean" combinations more frequent while maintaining valid probability.
        if (hasConsecutivePair) {
             if (Math.random() > 0.3) return false; 
        }

        // 2. Odd/Even: Reject 6:0 or 0:6
        const odds = numbers.filter(n => n % 2 !== 0).length;
        if (odds === 6 || odds === 0) return false; 

        // 3. Sum: WIDENED to 80 ~ 200 (was 100~170)
        const sum = numbers.reduce((a, b) => a + b, 0);
        if (sum < 80 || sum > 200) return false;
        
        // 4. History Match: RELAXED (Reject only if EXACT match with past 1st prize)
        // Previously rejected if 5 matches found. Now only 6.
        for (const round of this.history) {
            const matchCount = numbers.filter(n => round.numbers.includes(n)).length;
            if (matchCount === 6) return false; 
        }

        // 5. AC: >= 5 (Keep)
        const stats = this.calculateStats(numbers);
        if (stats.ac < 5) return false;

        return true;
    }
    
    calculateStats(numbers) {
        const sum = numbers.reduce((a, b) => a + b, 0);
        const diffs = new Set();
        for (let i = 0; i < numbers.length; i++) {
            for (let j = i + 1; j < numbers.length; j++) {
                diffs.add(Math.abs(numbers[i] - numbers[j]));
            }
        }
        const ac = diffs.size - (numbers.length - 1);
        return { sum, ac };
    }

    analyzeSelection(numbers) {
        const stats = this.calculateStats(numbers);
        return [
            `🚀 Lotto 2.1 업그레이드 알고리즘 적용`,
            `⚖️ 합계 구간 확장 (80~200) 및 Cold Number 가중치 반영`,
            `📊 AC:${stats.ac}, 합계:${stats.sum}`,
            `🛡️ 과거 1등 완전중복만 제외 (2/3등 가능성 확대)`
        ];
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


export default LottoPredictorV2;
