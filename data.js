// data.js

// Note: All data are examples simplified based on 2025 or latest available info.
// Real applications require annual updates.

const taxData = {
    FED: {
        bpa: 15705, // Basic Personal Amount for 2025 (Example)
        brackets: [
            { upTo: 55867, rate: 0.15 },    // Up to $55,867
            { upTo: 111733, rate: 0.205 }, // Over $55,867 up to $111,733
            { upTo: 173205, rate: 0.26 },  // Over $111,733 up to $173,205
            { upTo: 246752, rate: 0.29 },  // Over $173,205 up to $246,752
            { over: 246752, rate: 0.33 }  // Over $246,752
        ],
        credits: {
            ageAmount: 8790,           // Base amount for Age Amount credit (65+)
            ageAmountThreshold: 42335, // Income threshold for Age Amount reduction (Needs indexing)
            pensionIncomeAmount: 2000  // Maximum base for Pension Income credit
        }
    },
    ON: {
        bpa: 12399, // Ontario BPA 2025 (Example)
        brackets: [
            { upTo: 51446, rate: 0.0505 }, // Up to $51,446
            { upTo: 102894, rate: 0.0915 }, // Over $51,446 up to $102,894
            { upTo: 150000, rate: 0.1116 }, // Over $102,894 up to $150,000
            { upTo: 220000, rate: 0.1216 }, // Over $150,000 up to $220,000
            { over: 220000, rate: 0.1316 }  // Over $220,000
        ],
        credits: {
            ageAmount: 5543,            // Ontario Age Amount base
            ageAmountThreshold: 42335,  // Assumed same threshold as Federal for simplicity
            pensionIncomeAmount: 1629   // Ontario Pension Income credit base
        },
        // Ontario Surtax (Example values, needs verification and indexing)
        surtax: {
            threshold1: 5503, // Provincial tax threshold 1
            rate1: 0.20,       // Surtax rate 1 (20% on tax between threshold1 and threshold2)
            threshold2: 6980, // Provincial tax threshold 2
            rate2: 0.36        // Surtax rate 2 (36% on tax over threshold2, added to rate1 effect)
        }
    },
    BC: { // British Columbia - Example Data
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
            // BC does not have a general surtax, so it's omitted.
        }
    },
    AB: { // Alberta - Example Data
        bpa: 21885,
        brackets: [ // Note: Alberta tax system might have changes not reflected here
            { upTo: 148269, rate: 0.10 },
            { upTo: 177922, rate: 0.12 },
            { upTo: 237230, rate: 0.13 },
            { upTo: 355845, rate: 0.14 },
            { over: 355845, rate: 0.15 }
        ],
        credits: {
            ageAmount: 6413,
            pensionIncomeAmount: 1000
            // Alberta credits/deductions might differ
        }
    }
    // Add other provinces as needed...
};

const govBenefitsData = {
    OAS: {
        clawbackThreshold: 90997, // 2025 threshold (Example, needs indexing)
        clawbackRate: 0.15,
        maxPayment2025: 8881 // Annual max OAS at 65 (Example for Jan-Mar 2025 rate annualized)
    },
    GIS: {
        // Example thresholds and payments for 2025 (Need annual updates)
        // Scenario: Couple, both receiving OAS
        maxPaymentCoupleTotal: 15970, // Max GIS for the couple combined, annually
        incomeThresholdCouple: 29616, // Combined income threshold for couple
        // Scenario: Single person
        maxPaymentSingle: 13083, // Max GIS for a single person, annually
        incomeThresholdSingle: 21624, // Income threshold for single
        // General Rules (Simplified)
        exemption: 5000, // First $5000 of employment income exempt (simplified rule application)
        reductionRate: 0.5 // GIS reduced by $0.50 for every $1 of income over exemption
    }
};

// RRIF/LIF Minimum Withdrawal Rates (Applies to all provinces)
// Source: Government of Canada, Income Tax Act Regulations, Schedule. Adjusted to percentage.
const rrifLifMinimumRates = [
    { age: 71, rate: 0.0528 }, { age: 72, rate: 0.0540 }, { age: 73, rate: 0.0553 },
    { age: 74, rate: 0.0567 }, { age: 75, rate: 0.0582 }, { age: 76, rate: 0.0598 },
    { age: 77, rate: 0.0617 }, { age: 78, rate: 0.0636 }, { age: 79, rate: 0.0658 },
    { age: 80, rate: 0.0681 }, { age: 81, rate: 0.0708 }, { age: 82, rate: 0.0738 },
    { age: 83, rate: 0.0771 }, { age: 84, rate: 0.0808 }, { age: 85, rate: 0.0851 },
    { age: 86, rate: 0.0899 }, { age: 87, rate: 0.0955 }, { age: 88, rate: 0.1021 },
    { age: 89, rate: 0.1099 }, { age: 90, rate: 0.1192 }, { age: 91, rate: 0.1306 },
    { age: 92, rate: 0.1449 }, { age: 93, rate: 0.1634 }, { age: 94, rate: 0.1879 },
    // Age 95 and over use a flat 20% rate
];
const rrifLifMinRateAge95Plus = 0.20;


// --- *** MODIFICATION START: Provincial LIF Maximum Withdrawal Factors *** ---

// Ontario LIF Maximum Withdrawal Factors
// Source: FSRAO website or financial institution summaries based on Pension Benefits Act, R.S.O. 1990, c. P.8, Reg 909.
// Factor = 1 / (90 - age) for ages below 80, specific factors thereafter. Simplified below.
const ontarioLifMaximumFactors = [
    // Example: Using the standard 1/(90-age) for ages < 80 and simplified factors after.
    // Real implementation should use the precise factors from regulation for each age.
    { age: 55, factor: 1/(90-55) }, { age: 56, factor: 1/(90-56) }, { age: 57, factor: 1/(90-57) },
    { age: 58, factor: 1/(90-58) }, { age: 59, factor: 1/(90-59) }, { age: 60, factor: 1/(90-60) },
    { age: 61, factor: 1/(90-61) }, { age: 62, factor: 1/(90-62) }, { age: 63, factor: 1/(90-63) },
    { age: 64, factor: 1/(90-64) }, { age: 65, factor: 1/(90-65) }, { age: 66, factor: 1/(90-66) },
    { age: 67, factor: 1/(90-67) }, { age: 68, factor: 1/(90-68) }, { age: 69, factor: 1/(90-69) },
    { age: 70, factor: 1/(90-70) }, { age: 71, factor: 1/(90-71) }, { age: 72, factor: 1/(90-72) },
    { age: 73, factor: 1/(90-73) }, { age: 74, factor: 1/(90-74) }, { age: 75, factor: 1/(90-75) },
    { age: 76, factor: 1/(90-76) }, { age: 77, factor: 1/(90-77) }, { age: 78, factor: 1/(90-78) },
    { age: 79, factor: 1/(90-79) }, // Up to here uses 1/(90-age)
    // Ages 80+ factors (Example - use precise regulated factors if needed)
    { age: 80, factor: 0.088 }, { age: 81, factor: 0.093 }, { age: 82, factor: 0.099 },
    { age: 83, factor: 0.106 }, { age: 84, factor: 0.114 }, { age: 85, factor: 0.123 },
    { age: 86, factor: 0.134 }, { age: 87, factor: 0.147 }, { age: 88, factor: 0.163 },
    { age: 89, factor: 0.183 }, { age: 90, factor: 0.200 }, // Assume 20% cap from 90 onwards for simplicity
];
const lifMaxFactorAge90Plus_ON = 0.20; // Simplified assumption for Ontario


// British Columbia (BC) LIF Maximum Withdrawal Factors
// Source: BC Pension Benefits Standards Act Regulation, Schedule 3.
// These factors are representative and may change.
const bcLifMaximumFactors = [
    { age: 55, factor: 0.0685 }, { age: 56, factor: 0.0697 }, { age: 57, factor: 0.0708 },
    { age: 58, factor: 0.0720 }, { age: 59, factor: 0.0732 }, { age: 60, factor: 0.0745 },
    { age: 61, factor: 0.0759 }, { age: 62, factor: 0.0773 }, { age: 63, factor: 0.0788 },
    { age: 64, factor: 0.0803 }, { age: 65, factor: 0.0819 }, { age: 66, factor: 0.0835 },
    { age: 67, factor: 0.0853 }, { age: 68, factor: 0.0871 }, { age: 69, factor: 0.0890 },
    { age: 70, factor: 0.0910 }, { age: 71, factor: 0.0931 }, { age: 72, factor: 0.0954 },
    { age: 73, factor: 0.0978 }, { age: 74, factor: 0.1004 }, { age: 75, factor: 0.1032 },
    { age: 76, factor: 0.1062 }, { age: 77, factor: 0.1094 }, { age: 78, factor: 0.1129 },
    { age: 79, factor: 0.1167 }, { age: 80, factor: 0.1208 }, { age: 81, factor: 0.1253 },
    { age: 82, factor: 0.1302 }, { age: 83, factor: 0.1356 }, { age: 84, factor: 0.1415 },
    { age: 85, factor: 0.1481 }, { age: 86, factor: 0.1554 }, { age: 87, factor: 0.1636 },
    { age: 88, factor: 0.1728 }, { age: 89, factor: 0.1833 }, { age: 90, factor: 0.1953 },
    { age: 91, factor: 0.2000 }, { age: 92, factor: 0.2000 }, { age: 93, factor: 0.2000 },
    { age: 94, factor: 0.2000 },
];
const lifMaxFactorAge95Plus_BC = 0.20;


// *** NEW DATA ***
// Alberta (AB) LIF Maximum Withdrawal Factors
// Source: Alberta Employment Pension Plans Regulation, Schedule 2, Section 5(2).
// Also consistent with Federal (PBSA) LIF maximums found in many financial documents (e.g., Source 1.2, 1.5).
const albertaLifMaximumFactors = [
    { age: 55, factor: 0.0651 }, { age: 56, factor: 0.0657 }, { age: 57, factor: 0.0663 },
    { age: 58, factor: 0.0670 }, { age: 59, factor: 0.0677 }, { age: 60, factor: 0.0685 },
    { age: 61, factor: 0.0694 }, { age: 62, factor: 0.0704 }, { age: 63, factor: 0.0714 },
    { age: 64, factor: 0.0726 }, { age: 65, factor: 0.0738 }, { age: 66, factor: 0.0752 },
    { age: 67, factor: 0.0767 }, { age: 68, factor: 0.0783 }, { age: 69, factor: 0.0802 },
    { age: 70, factor: 0.0822 }, { age: 71, factor: 0.0845 }, { age: 72, factor: 0.0871 },
    { age: 73, factor: 0.0900 }, { age: 74, factor: 0.0934 }, { age: 75, factor: 0.0971 },
    { age: 76, factor: 0.1015 }, { age: 77, factor: 0.1066 }, { age: 78, factor: 0.1125 },
    { age: 79, factor: 0.1196 }, { age: 80, factor: 0.1282 }, { age: 81, factor: 0.1387 },
    { age: 82, factor: 0.1519 }, { age: 83, factor: 0.1690 }, { age: 84, factor: 0.1919 },
    { age: 85, factor: 0.2240 }, { age: 86, factor: 0.2723 }, { age: 87, factor: 0.3529 },
    { age: 88, factor: 0.5146 }, { age: 89, factor: 1.0000 }, { age: 90, factor: 1.0000 },
];
const lifMaxFactorAge90Plus_AB = 1.00; // From age 89 onwards, it's 100%

// *** MODIFICATION END ***


// Portfolio Profiles - Not currently used by the engine but kept for potential future Monte Carlo integration
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