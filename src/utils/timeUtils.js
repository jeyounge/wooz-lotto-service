/**
 * Utility functions for checking prediction availability based on time.
 */

export const getPredictionStatus = (nextRound) => {
    // Current time
    const now = new Date();
    const day = now.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
    const hours = now.getHours();
    
    // Saturday logic
    if (day === 6) {
        if (hours >= 20 && hours < 21) {
            // Saturday 20:00 ~ 20:59
            return {
                isOpen: false,
                message: `${nextRound}회차 발매가 마감되었습니다.`
            };
        }
        if (hours >= 21) {
            // Saturday 21:00 ~ 23:59
            return {
                isOpen: false,
                message: `새로운 회차 분석 중입니다. 일요일 오전 6시부터 예측이 가능합니다.`
            };
        }
    }
    
    // Sunday logic
    if (day === 0) {
        if (hours < 6) {
            // Sunday 00:00 ~ 05:59
            return {
                isOpen: false,
                message: `새로운 회차 분석 중입니다. 일요일 오전 6시부터 예측이 가능합니다.`
            };
        }
    }
    
    // Default open
    return {
        isOpen: true,
        message: ''
    };
};
