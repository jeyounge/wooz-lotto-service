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
    constructor(historyData, options = {}) {
        super(historyData);
        this.killCount = options.killCount || 5;
        this.killList = [];
        this.killReasons = {};
        this.extraKillCandidates = [];
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
        // --- 챌린지 전용 추가 킬 (killCount > 5) ---
        // ==========================================

        // P6. 2주 연속 출현 (86.3%) - 챌린지 추가
        if (kills.size < this.killCount) {
            const r0 = sorted[0]?.numbers || [];
            const r1 = sorted[1]?.numbers || [];
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (kills.has(n)) continue;
                if (r0.includes(n) && r1.includes(n)) {
                    addKill(n, '⚔️ 2주 연속 출현');
                }
            }
        }

        // P7. 끝자리 동일 5주 4회 이상 최약체 (86.5%) - 챌린지 추가
        if (kills.size < this.killCount) {
            // 5주 내 각 끝자리 출현 맵 생성
            const digitCounts = {};
            const numInDigit = {};
            sorted.slice(0, 5).forEach(r => {
                r.numbers.forEach(n => {
                    const d = n % 10;
                    digitCounts[d] = (digitCounts[d] || 0) + 1;
                    numInDigit[n] = (numInDigit[n] || 0) + 1;
                });
            });

            // 포화된 끝자리(4회+)의 가장 약한 번호 킬
            const saturatedDigits = Object.entries(digitCounts)
                .filter(([, c]) => c >= 4)
                .sort((a, b) => b[1] - a[1])
                .map(([d]) => parseInt(d));

            for (const digit of saturatedDigits) {
                if (kills.size >= this.killCount) break;
                // 해당 끝자리 번호들 중 최약체
                const candidates = [];
                for (let n = 1; n <= 45; n++) {
                    if (n % 10 === digit && !kills.has(n) && !this._isHotSafetyCheck(sorted, n)) {
                        candidates.push(n);
                    }
                }
                candidates.sort((a, b) => (numInDigit[a] || 0) - (numInDigit[b] || 0));
                if (candidates[0]) addKill(candidates[0], `🔢 끝자리 ${digit} 포화 최약체`);
            }
        }

        // P8. 10주 이상 미출현 콜드 + 핫 아닌 것 (86.7%)
        if (kills.size < this.killCount) {
            const coldNums = [];
            for (let n = 1; n <= 45; n++) {
                if (kills.has(n)) continue;
                if (this._isHotSafetyCheck(sorted, n)) continue;
                if (this._isColdFor(sorted, n, 10)) {
                    const lastSeen = this._countInLast(sorted, n, 30);
                    coldNums.push({ n, lastSeen });
                }
            }
            // 가장 오래 안 나온 순
            coldNums.sort((a, b) => a.lastSeen - b.lastSeen);
            for (const { n } of coldNums) {
                if (kills.size >= this.killCount) break;
                addKill(n, `🧊 10주+ 미출현 콜드`);
            }
        }

        // P9. 최근 10주 중 5회 이상 (86.1%) - 챌린지 마지막
        if (kills.size < this.killCount) {
            for (let n = 1; n <= 45; n++) {
                if (kills.size >= this.killCount) break;
                if (kills.has(n)) continue;
                if (this._countInLast(sorted, n, 10) >= 5) {
                    addKill(n, '🔥 10주 중 5회+(과열)');
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

        // 챌린지 미사용 모드에서 후보 노출용
        if (this.killCount <= 5) {
            this.extraKillCandidates = this._buildExtraKillCandidates(sorted, kills);
        }
    }

    _buildExtraKillCandidates(sorted, currentKills) {
        const candidates = [];
        const r0 = sorted[0]?.numbers || [];
        const r1 = sorted[1]?.numbers || [];

        for (let n = 1; n <= 45; n++) {
            if (currentKills.has(n)) continue;
            if (candidates.length >= 5) break;

            // 2연속 + 콜드 후보
            if (r0.includes(n) && r1.includes(n)) {
                candidates.push({ num: n, reason: '2주 연속 출현', rate: '86%' });
                continue;
            }
            if (this._isColdFor(sorted, n, 10) && !this._isHotSafetyCheck(sorted, n)) {
                candidates.push({ num: n, reason: '10주+ 미출현 콜드', rate: '87%' });
            }
        }
        return candidates;
    }

    analyzeSelection(numbers) {
        const baseAnalysis = super.analyzeSelection(numbers);
        const modeLabel = this.killCount >= 10 ? '10-KILL 챌린지' : '5-KILL 기본';
        const killMsg = this.killList.map(k => `${k}(${this.killReasons[k]})`).join(', ');
        return [
            `🛡️ V5 ${modeLabel} 전략: [${killMsg}] 제외`,
            ...baseAnalysis
        ];
    }
}

export default LottoPredictorV5;
