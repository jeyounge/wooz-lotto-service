class LottoPredictorV2 {
    constructor(historyData) {
        this.history = historyData;

        this.scores = {};
        this.excludedNumbers = [];
        this.bucketMap = {};
        this.init();
    }

    init() {
        if (!this.history || this.history.length === 0) {
            for (let i = 1; i <= 45; i++) this.scores[i] = 40;
            return;
        }

        const sorted = [...this.history].sort((a, b) => b.drwNo - a.drwNo);

        // 1. 버킷 분류 (최근 출현 기준)
        const buckets = {
            hot: [],    // 1~5주 (0~4)
            warm: [],   // 6~10주 (5~9)
            cool: [],   // 11~15주 (10~14)
            cold: []    // 16주 이상 (15+)
        };

        for (let i = 1; i <= 45; i++) {
            let lastSeenIndex = -1;
            for (let j = 0; j < sorted.length; j++) {
                if (sorted[j].numbers.includes(i)) {
                    lastSeenIndex = j;
                    break;
                }
            }

            if (lastSeenIndex === -1 || lastSeenIndex >= 15) {
                buckets.cold.push(i);
                this.bucketMap[i] = 'cold';
            } else if (lastSeenIndex < 5) {
                buckets.hot.push(i);
                this.bucketMap[i] = 'hot';
            } else if (lastSeenIndex < 10) {
                buckets.warm.push(i);
                this.bucketMap[i] = 'warm';
            } else if (lastSeenIndex < 15) {
                buckets.cool.push(i);
                this.bucketMap[i] = 'cool';
            }
        }

        // 2. 동적 가중치(Score) 배분
        // 목표 확률 (1~5주: 50.6%, 6~10주: 27.1%, 11~15주: 12.1%, 16주+: 10.3%)
        const targetScores = {
            hot: 506,
            warm: 271,
            cool: 121,
            cold: 103
        };

        for (let i = 1; i <= 45; i++) {
            const bucketType = this.bucketMap[i];
            const bucketSize = buckets[bucketType].length;
            
            // 버킷에 배당된 총 점수를 버킷 내의 번호 개수로 N분의 1 분배
            // 최소 점수 보장을 위해 기본 10점 추가
            this.scores[i] = bucketSize > 0 ? (targetScores[bucketType] / bucketSize) + 10 : 10;
        }

        // 3. Exclusion: 3-Consecutive Weeks (Keep this, it's a strong negative signal)
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
            if (numbers[i] === numbers[i - 1] + 1) {
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

        // 6. 황금 비율 강제 필터링 (1~5주 출현 번호가 2~4개 포함되어야 함)
        if (this.bucketMap && Object.keys(this.bucketMap).length > 0) {
            const hotCount = numbers.filter(n => this.bucketMap[n] === 'hot').length;
            if (hotCount < 2 || hotCount > 4) return false;
        }

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
            `🚀 Lotto Z 다이내믹 가중치 알고리즘 (V2.5)`,
            `⚖️ 황금 비율 최적화 완료 (Hot 번호 2~4개 포함)`,
            `📊 AC:${stats.ac}, 합계:${stats.sum}`,
            `🛡️ 과거 1등 완전중복 제외, 3연속 번호 제한`
        ];
    }

    getScores(numbers) {
        return numbers.map(n => ({ num: n, score: this.scores[n] ? Math.round(this.scores[n]) : 0 }));
    }

    getAllScores() {
        const all = [];
        for (let i = 1; i <= 45; i++) {
            all.push({ num: i, score: this.scores[i] ? Math.round(this.scores[i]) : 0 });
        }
        return all.sort((a, b) => b.score - a.score);
    }
}


export default LottoPredictorV2;
