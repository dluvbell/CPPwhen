// data.js

// 참고: 모든 데이터는 2025년 기준 또는 가장 최신 정보를 단순화한 예시입니다.
// 실제 애플리케이션에서는 매년 업데이트가 필요합니다.

const taxData = {
    FED: {
        bpa: 15705,
        brackets: [
            { upTo: 55867, rate: 0.15 },
            { upTo: 111733, rate: 0.205 },
            { upTo: 173205, rate: 0.26 },
            { upTo: 246752, rate: 0.29 },
            { over: 246752, rate: 0.33 }
        ],
        credits: {
            ageAmount: 8790, // 65세 이상 소득 공제
            pensionIncomeAmount: 2000 // 연금 소득 공제
        }
    },
    ON: {
        bpa: 12399,
        brackets: [
            { upTo: 51446, rate: 0.0505 },
            { upTo: 102894, rate: 0.0915 },
            { upTo: 150000, rate: 0.1116 },
            { upTo: 220000, rate: 0.1216 },
            { over: 220000, rate: 0.1316 }
        ],
        credits: {
            ageAmount: 5543,
            pensionIncomeAmount: 1629
        }
    },
    BC: {
        bpa: 12580,
        brackets: [
            { upTo: 47937, rate: 0.0506 },
            { upTo: 95875, rate: 0.077 },
            { upTo: 110070, rate: 0.105 },
            { upTo: 133664, rate: 0.1229 },
            { upTo: 181232, rate: 0.147 },
            { upTo: 252752, rate: 0.168 },
            { over: 252752, rate: 0.205 }
        ],
        credits: {
            ageAmount: 5267,
            pensionIncomeAmount: 1000
        }
    },
    AB: {
        bpa: 21885,
        brackets: [
            { upTo: 148269, rate: 0.10 },
            { upTo: 177922, rate: 0.12 },
            { upTo: 237230, rate: 0.13 },
            { upTo: 355845, rate: 0.14 },
            { over: 355845, rate: 0.15 }
        ],
        credits: {
            ageAmount: 6413,
            pensionIncomeAmount: 1000
        }
    }
};

const govBenefitsData = {
    OAS: {
        clawbackThreshold: 90997,
        clawbackRate: 0.15,
        maxPayment2025: 8881 // 연간 기준
    },
    GIS: {
        // 2025년 기준, 부부 모두 OAS 수령 시
        maxPaymentPerPerson2025: 7985, // 연간 기준
        incomeThresholdCouple: 29616,
        reductionRate: 0.5 // GIS는 합산 소득 $2당 $1 감소 ($1당 $0.5)
    }
};

const portfolioProfiles = {
    conservative: {
        name: "보수적 (Conservative)",
        avgReturn: 0.04,
        stdDev: 0.06
    },
    balanced: {
        name: "안정형 (Balanced)",
        avgReturn: 0.07,
        stdDev: 0.12
    },
    aggressive: {
        name: "성장형 (Growth)",
        avgReturn: 0.09,
        stdDev: 0.18
    }
};