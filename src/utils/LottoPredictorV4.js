
import LottoPredictorV3 from './LottoPredictorV3.js';

class LottoPredictorV4 extends LottoPredictorV3 {
    constructor(historyData, options = {}) {
        super(historyData, options);
    }

    // Override: Hybrid Generation (Hot + Cold Mix)
    generateCandidate() {
        const coldCount = Math.random() < 0.7 ? 1 : 2; // 70% chance for 1 Cold, 30% for 2 Cold
        const hotCount = 6 - coldCount;

        const selection = [];
        
        // 1. Pick Cold Numbers (Forced Injection)
        // Cold Definition: Bottom 15 numbers by score (excluding 3-KILLs)
        const allScores = this.getAllScores()
            .filter(s => !this.excludedNumbers.includes(s.num)) // Remove Kill List
            .sort((a,b) => a.score - b.score); // Ascending (Lowest first)
            
        const coldPool = allScores.slice(0, 15).map(s => s.num);
        
        for(let i=0; i<coldCount; i++) {
            if(coldPool.length > 0) {
                // Random pick from cold pool
                const idx = Math.floor(Math.random() * coldPool.length);
                const num = coldPool[idx];
                
                // Avoid duplicates
                if(!selection.includes(num)) {
                    selection.push(num);
                    // Remove from pool to avoid double pick
                    coldPool.splice(idx, 1);
                }
            }
        }

        // 2. Pick Hot/Trend Numbers (Weighted Random from V2/V3 logic)
        // We use the parent's pickNumber which uses the score weights
        while(selection.length < 6) {
            const num = this.pickNumber(selection);
            if (!selection.includes(num)) {
                selection.push(num);
            }
        }

        return selection.sort((a, b) => a - b);
    }

    // Override: Analyze
    analyzeSelection(numbers) {
        // Identify Cold Numbers in the selection
        const allScores = this.getAllScores(); // Sorted Desc
        // Bottom 15 scores threshold
        const sortedAsc = [...allScores].sort((a,b) => a.score - b.score);
        const coldThresholdScore = sortedAsc[14]?.score || 0;

        const coldPicked = numbers.filter(n => this.scores[n] <= coldThresholdScore);
        
        const baseAnalysis = super.analyzeSelection(numbers);
        
        // Replace the "V2 Upgrade" msg with V4
        // V3 adds its msg at the top, so we add ours at the very top or modify
        
        return [
            `🔥 V4 하이브리드 전략 (Hot + Cold)`,
            `❄️ 콜드넘버(이변) ${coldPicked.length}개 포함: [${coldPicked.join(', ')}]`,
            ...baseAnalysis
        ];
    }
}

export default LottoPredictorV4;
