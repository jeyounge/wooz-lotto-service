import LottoPredictorV2 from './LottoPredictorV2.js';

/**
 * LottoPredictorV5
 * - 기본 모드  : 5-KILL (데이터 기반 >86% 성공률 룰 적용)
 * - 챌린지 모드: 10-KILL (추가 콜드/패턴 룰 적용)
 *
 * 1211회차 실측 분석 기반 룰 우선순위:
 *  P1. 최근 10주 중 6회 이상 출현 (92.5%)   ← 신규
 *  P2. 3주 연속 출현 (90.9%)                ← 기존 유지
 *  P3. 직전 보너스 번호 (86.1%)              ← 기존 유지
 *  P4. 최근 5주 중 4회 이상 (88.0%)          ← 기존 강화
 *  P5. ±1 인접번호 2주 연속 출현 (87.2%)     ← 신규
 *  P6. 20주 이상 미출현 콜드 (87.6%)         ← 챌린지 추가
 *  P7. 끝자리 동일 5주 4회 이상 최약체 (86.5%) ← 챌린지 추가
 *  P8. 2주 연속 출현 (86.3%)                ← 챌린지 추가
 *  P9. 10주 이상 미출현 콜드 (86.7%)         ← 챌린지 추가
 * P10. 최근 10주 중 5회 이상 (86.1%)         ← 챌린지 추가
 */
class LottoPredictorV5 extends LottoPredictorV2 {
    constructor(historyData) {
        super(historyData);
        this.killCount = 5;
        this.killList = [];
        this.killReasons = {};
        this._applyKillStrategyV5();
    }

    _countInLast(sorted, num, n) {
        let c = 0;
        for (let k = 0; k < n && k < sorted.length; k++) {
            if (sorted[k].numbers.includes(num)) c++;
        }
        return c;
    }

    _isColdFor(sorted, num, weeks) {
        for (let k = 0; k < weeks && k < sorted.length; k++) {
            if (sorted[k].numbers.includes(num)) return false;
        }
        return true;
    }

    _isHotSafetyCheck(sorted, num) {
        // 안전장치: 최근 10주 3회 이상이면 '핫'으로 간주 → hot 번호는 콜드킬에서 제외
        return this._countInLast(sorted, num, 10) >= 3;
    }

    _applyKillStrategyV5() {
        if (!this.history || this.history.length < 20) return;

        const sorted = [...this.history].sort((a, b) => b.drwNo - a.drwNo);
        const kills = new Set();
        const killReasons = {};

        const addKill = (num, reason) => {
            if (kills.size >= this.killCount) return false;
            if (!kills.has(num)) {
                kills.add(num);
                killReasons[num] = reason;
                return true;
            }
            return false;
        };

        // ==========================================
        // P1. 최근 10주 중 6회 이상 (92.5%) ← 최우선
        // ==========================================
        for (let n = 1; n <= 45; n++) {
            if (kills.size >= this.killCount) break;
            if (this._countInLast(sorted, n, 10) >= 6) {
                addKill(n, '🔥 10주 중 6회+(과열 최강)');
            }
        }

        // ==========================================
        // P2. 3주 연속 출현 (90.9%)
        // ==========================================
        if (kills.size < this.killCount && sorted.length >= 3) {
            const r0 = sorted[0].numbers;
            const r1 = sorted[1].numbers;
            const r2 = sorted[2].numbers;
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (r0.includes(n) && r1.includes(n) && r2.includes(n)) {
                    addKill(n, '☠️ 3주 연속 출현');
                }
            }
        }

        // ==========================================
        // P3. 직전 보너스 번호 (86.1%)
        // ==========================================
        if (kills.size < this.killCount) {
            const lastBonus = sorted[0]?.bonus;
            if (lastBonus && !kills.has(lastBonus)) {
                addKill(lastBonus, '🎯 직전 보너스');
            }
        }

        // ==========================================
        // P4. 최근 5주 중 4회 이상 (88.0%)
        // ==========================================
        if (kills.size < this.killCount) {
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (this._countInLast(sorted, n, 5) >= 4) {
                    addKill(n, '🔥 5주 중 4회+(과열)');
                }
            }
        }

        // ==========================================
        // P5. ±1 인접번호 2주 연속 출현 (87.2%) ← 신규
        // (n-1 또는 n+1이 최근 2주 연속 나왔는데 n은 안 나온 경우)
        // ==========================================
        if (kills.size < this.killCount) {
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (kills.has(n)) continue;
                if (this._isHotSafetyCheck(sorted, n)) continue; // 핫 번호는 보호

                const nbr1 = n - 1, nbr2 = n + 1;
                const w0 = sorted[0]?.numbers || [];
                const w1 = sorted[1]?.numbers || [];

                const nbrHit0 = (nbr1 >= 1 && w0.includes(nbr1)) || (nbr2 <= 45 && w0.includes(nbr2));
                const nbrHit1 = (nbr1 >= 1 && w1.includes(nbr1)) || (nbr2 <= 45 && w1.includes(nbr2));
                const selfAbsent = !w0.includes(n) && !w1.includes(n);

                if (nbrHit0 && nbrHit1 && selfAbsent) {
                    addKill(n, '📍 인접번호 2주 연속(±1 포위)');
                }
            }
        }

        // ==========================================
        // P6. 20주 이상 미출현 콜드 (Fallback)
        // ==========================================
        if (kills.size < this.killCount) {
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (!kills.has(n) && this._isColdFor(sorted, n, 20)) {
                    addKill(n, '❄️ 20주 이상 장기 콜드');
                }
            }
        }

        // ==========================================
        // P8. 2주 연속 출현 (Fallback)
        // ==========================================
        if (kills.size < this.killCount) {
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (!kills.has(n) && sorted[0]?.numbers.includes(n) && sorted[1]?.numbers.includes(n)) {
                    addKill(n, '🔥 2주 연속 출현');
                }
            }
        }

        // ==========================================
        // P9. 10주 이상 미출현 콜드 (Fallback)
        // ==========================================
        if (kills.size < this.killCount) {
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (!kills.has(n) && this._isColdFor(sorted, n, 10)) {
                    addKill(n, '❄️ 10주 이상 콜드');
                }
            }
        }

        // ==========================================
        // 최종 적용
        // ==========================================
        this.killList = Array.from(kills);
        this.killList.forEach(k => {
            if (!this.excludedNumbers.includes(k)) this.excludedNumbers.push(k);
            this.scores[k] = -9999;
        });
        this.killReasons = killReasons;
    }

    analyzeSelection(numbers) {
        const baseAnalysis = super.analyzeSelection(numbers);
        const killMsg = this.killList.map(k => `${k}(${this.killReasons[k]})`).join(', ');
        return [
            `🛡️ V5 5-KILL 전략: [${killMsg}] 제외`,
            ...baseAnalysis
        ];
    }
}

export default LottoPredictorV5;
