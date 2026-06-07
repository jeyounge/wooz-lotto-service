import LottoPredictorV2 from './LottoPredictorV2.js';

/**
 * LottoPredictorV5 — v5.3 (4킬 최적 기대값 전략)
 *
 * ▶ 1211회차 전체 패턴 분석 결과:
 *   - 로또 번호는 통계적으로 거의 완벽한 무작위
 *   - 유의미한 패턴: "직전 보너스 → 다음 보너스 미반복" (97%, z=10.6) 하나뿐
 *   - 직전 보너스 → 본번호 미출현: 86.3% (기준선 86.7%와 동일, z=-0.39)
 *   - 냉각/연속 등 모든 패턴: z < 2.0 (통계적 노이즈)
 *
 * ▶ 킬 수별 기대효과 (성공률 × 공간축소율):
 *   2킬: 75% × 25% = 19.0%
 *   3킬: 66% × 36% = 23.6%
 *   4킬: 55% × 45% = 24.7% ← 최고점 (채택)
 *   5킬: 46% × 53% = 24.5% (동전 던지기 수준)
 *   6킬: 40% × 60% = 23.9%
 *
 * ▶ 4킬 채택 근거:
 *   어떤 룰도 진짜 통계적 신호가 없으므로, 순수 기대값으로 최적점 결정.
 *   4킬 = 기대 공간축소 24.7%로 전 구간 최고, 성공 시 C(41,6)=4.5M 조합.
 *   5킬은 기대값이 오히려 낮고 성공률이 46%로 동전 던지기 수준이라 제외.
 *
 * ▶ 룰 선택 기준 (모두 기준선 수준이므로 "덜 해로운" 순):
 *   1순위: 직전 보너스 (매 회차 확정 발동, 86.3%)
 *   2순위: 2주 연속 출현 (발동 시 86.2%, 발동 안 하면 다음으로)
 *   3순위: 20주+ 미출현 (기준선, 매 회차 1~2개 존재)
 *   4순위: 10주+ 미출현 (기준선, 4킬 채우는 패딩 역할)
 *   제외: P1(75% 해로움), P4(57% 매우 해로움), P5(84% 해로움)
 */
class LottoPredictorV5 extends LottoPredictorV2 {
    constructor(historyData) {
        super(historyData);
        this.killList = [];
        this.killReasons = {};
        this._applyKillStrategyV5();
    }

    _applyKillStrategyV5() {
        if (!this.history || this.history.length < 10) return;

        const sorted = [...this.history].sort((a, b) => b.drwNo - a.drwNo);
        const kills = new Set();
        const killReasons = {};
        const MAX_KILLS = 4;

        const addKill = (num, reason) => {
            if (kills.size >= MAX_KILLS) return;
            if (!kills.has(num)) {
                kills.add(num);
                killReasons[num] = reason;
            }
        };

        const isColdFor = (n, weeks) => {
            for (let k = 0; k < weeks && k < sorted.length; k++) {
                if (sorted[k].numbers.includes(n)) return false;
            }
            return true;
        };

        // ── 1순위: 직전 보너스 (매 회차 발동)
        const bonus0 = sorted[0]?.bonus;
        if (bonus0) addKill(bonus0, '🎯 직전 보너스');

        // ── 2순위: 2주 연속 출현
        if (sorted.length >= 2) {
            const w0 = sorted[0].numbers, w1 = sorted[1].numbers;
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= MAX_KILLS) break;
                if (w0.includes(n) && w1.includes(n)) addKill(n, '🔥 2주 연속 출현');
            }
        }

        // ── 3순위: 20주+ 미출현 (기준선 수준, 패딩)
        for (let n = 1; n <= 45; n++) {
            if (kills.size >= MAX_KILLS) break;
            if (isColdFor(n, 20)) addKill(n, '❄️ 20주+ 미출현');
        }

        // ── 4순위: 10주+ 미출현 (기준선 수준, 4킬 보장 패딩)
        for (let n = 1; n <= 45; n++) {
            if (kills.size >= MAX_KILLS) break;
            if (isColdFor(n, 10)) addKill(n, '🌨️ 10주+ 미출현');
        }

        this.killList = Array.from(kills);
        this.killList.forEach(k => {
            if (!this.excludedNumbers.includes(k)) this.excludedNumbers.push(k);
            this.scores[k] = -9999;
        });
        this.killReasons = killReasons;
    }

    analyzeSelection(numbers) {
        const baseAnalysis = super.analyzeSelection(numbers);
        const killMsg = this.killList.length > 0
            ? this.killList.map(k => `${k}(${this.killReasons[k]})`).join(', ')
            : '없음';
        return [
            `🛡️ V5 ${this.killList.length}킬: [${killMsg}] 제외 → ${45 - this.killList.length}개 풀`,
            ...baseAnalysis
        ];
    }
}

export default LottoPredictorV5;
