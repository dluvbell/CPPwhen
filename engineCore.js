/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.3.0 (Refactor: Split engine into core, income/tax, withdrawal modules)
 * @file        engineCore.js
 * @created     2025-10-25
 * @description Core simulation loop, growth application, and expense calculation.
 */

// engineCore.js

/**
 * Main execution function (called from ui.js)
 */
function runFullSimulation(inputsA, inputsB) {
    const baseYear = 2025; // Or potentially read from a shared config

    // Scenario A setup
    const globalSettingsA = {
        province: inputsA.province,
        maxAge: inputsA.lifeExpectancy,
        cola: inputsA.cola,
        baseYear: baseYear
    };
    console.log("Running Scenario A with individual data:", inputsA);
    const resultsA = simulateScenario(inputsA.scenario, globalSettingsA);

    // Scenario B setup
    const globalSettingsB = {
        province: inputsB.province,
        maxAge: inputsB.lifeExpectancy, // Use B's life expectancy
        cola: inputsB.cola,          // Use B's COLA
        baseYear: baseYear
    };
    console.log("Running Scenario B with individual data:", inputsB);
    const resultsB = simulateScenario(inputsB.scenario, globalSettingsB);

    return { resultsA, resultsB };
}

/**
 * Simulates a single scenario year by year, tracking user and spouse individually.
 * @param {object} scenario - Scenario inputs including user, spouse (if applicable), returns, strategy.
 * @param {object} settings - Global settings like province, maxAge, cola, baseYear.
 * @returns {Array} - Array of year-by-year detailed results.
 */
function simulateScenario(scenario, settings) {
    const results = [];
    // Initialize assets safely, defaulting to 0 if objects/properties are missing
    let currentAssets_user = scenario.user?.assets ? JSON.parse(JSON.stringify(scenario.user.assets)) : { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };
    let currentAssets_spouse = (scenario.spouse?.hasSpouse && scenario.spouse.data?.assets) ? JSON.parse(JSON.stringify(scenario.spouse.data.assets)) : { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };

    // Initialize unrealized gains safely
    let currentUnrealizedGains_NonReg_user = scenario.user?.initialNonRegGains || 0;
    let currentUnrealizedGains_NonReg_spouse = (scenario.spouse?.hasSpouse && scenario.spouse.data) ? (scenario.spouse.data.initialNonRegGains || 0) : 0;

    let lastYearTaxPayable = 0; // Total household tax paid last year
    let lastYearNetIncomeForGis = 0; // Combined income for GIS calc

    const userRetirementAge = scenario.retirementAge || 65; // Use global scenario retirement age, default 65
    let endAge = settings.maxAge || 95; // Use global max age, default 95
    const userBirthYear = scenario.user?.birthYear || 1960; // Default birth year
    const spouseBirthYear = scenario.spouse?.data?.birthYear || userBirthYear + 1; // Default spouse birth year

    // Determine start and end years based on user's timeline
    const startYear = userBirthYear + userRetirementAge;
    const endYear = userBirthYear + endAge;

    console.log(`Simulating Scenario: Province ${settings.province}, COLA ${settings.cola * 100}%`);
    console.log(`User: Born ${userBirthYear}, Retires ${userRetirementAge}, Max Age ${endAge}`);
    if (scenario.spouse?.hasSpouse) {
        console.log(`Spouse: Born ${spouseBirthYear}, Included.`);
    }
    console.log(`Simulation Period: Year ${startYear} to ${endYear}`);


    // =============================================
    // Year-by-year simulation main loop
    // =============================================
    for (let currentYear = startYear; currentYear <= endYear; currentYear++) {
        const userAge = currentYear - userBirthYear;
        const spouseAge = scenario.spouse?.hasSpouse ? (currentYear - spouseBirthYear) : 0;

        // Skip year if user is before their retirement age
        if (userAge < userRetirementAge) {
            continue;
        }
        // Stop simulation if user exceeds their max age
         if (userAge > endAge) {
             console.log(`Stopping simulation loop at year ${currentYear}, User age ${userAge} exceeds max age ${endAge}`);
             break;
         }

        // Initialize data structure for the current year
        const yearData = {
            year: currentYear,
            userAge: userAge,
            spouseAge: spouseAge,
            openingBalance_user: { ...currentAssets_user },
            openingBalance_spouse: { ...currentAssets_spouse },
            // ... (other yearData properties initialized)
            growth_user: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 },
            growth_spouse: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 },
            income: { user: {}, spouse: {}, total: 0 },
            withdrawals_user: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 },
            withdrawals_spouse: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 },
        };
        // Add combined opening balance dynamically if needed
        yearData.openingBalance = {
             rrsp: (yearData.openingBalance_user?.rrsp || 0) + (yearData.openingBalance_spouse?.rrsp || 0),
             tfsa: (yearData.openingBalance_user?.tfsa || 0) + (yearData.openingBalance_spouse?.tfsa || 0),
             nonreg: (yearData.openingBalance_user?.nonreg || 0) + (yearData.openingBalance_spouse?.nonreg || 0),
             lif: (yearData.openingBalance_user?.lif || 0) + (yearData.openingBalance_spouse?.lif || 0),
        };


        // --- Simulation Steps ---
        // 1. Apply Growth (Logic in this file)
        const growthInfo = step1_ApplyGrowth(yearData, currentAssets_user, currentAssets_spouse, scenario.returns, scenario);
        yearData.growth_user = growthInfo.growth_user;
        yearData.growth_spouse = growthInfo.growth_spouse;
        yearData.growth = growthInfo.growth_total;
        currentUnrealizedGains_NonReg_user += growthInfo.growth_user.nonreg;
        currentUnrealizedGains_NonReg_spouse += growthInfo.growth_spouse.nonreg;

        // 2. Calculate Non-Withdrawal Income (Function from incomeTaxEngine.js)
        step2_CalculateIncome(yearData, scenario, settings, lastYearNetIncomeForGis);

        // 3. Calculate Household Expenses & Shortfall (Logic in this file)
        step3_CalculateExpenses(yearData, scenario, settings, lastYearTaxPayable);

        // 4. Perform Withdrawals (Function from withdrawalEngine.js)
        // *** MODIFICATION START: Pass province to withdrawal function ***
        const wdInfo = step4_PerformWithdrawals(yearData, currentAssets_user, currentAssets_spouse, scenario.withdrawalStrategy, userAge, spouseAge, settings.province);
        // *** MODIFICATION END ***
        yearData.withdrawals_user = wdInfo.withdrawals_user;
        yearData.withdrawals_spouse = wdInfo.withdrawals_spouse;
        yearData.withdrawals = wdInfo.withdrawals_total;

        // 5. Calculate Taxes (Function from incomeTaxEngine.js)
        const taxInfo = step5_CalculateTaxes(yearData, scenario, settings,
                                              currentUnrealizedGains_NonReg_user, currentUnrealizedGains_NonReg_spouse);
        yearData.taxPayable = taxInfo.totalTax;
        yearData.taxPayable_user = taxInfo.tax_user;
        yearData.taxPayable_spouse = taxInfo.tax_spouse;
        yearData.taxableIncome_user = taxInfo.taxableIncome_user;
        yearData.taxableIncome_spouse = taxInfo.taxableIncome_spouse;
        yearData.oasClawback_user = taxInfo.oasClawback_user;
        yearData.oasClawback_spouse = taxInfo.oasClawback_spouse;

        // Update values for next year's calculation
        lastYearTaxPayable = taxInfo.totalTax;
        lastYearNetIncomeForGis = taxInfo.netIncomeForGis;

        // Reduce unrealized gains by realized amounts
        currentUnrealizedGains_NonReg_user = Math.max(0, currentUnrealizedGains_NonReg_user - taxInfo.realizedNonRegGains_user);
        currentUnrealizedGains_NonReg_spouse = Math.max(0, currentUnrealizedGains_NonReg_spouse - taxInfo.realizedNonRegGains_spouse);

        // Record closing balances
        yearData.closingBalance_user = { ...currentAssets_user };
        yearData.closingBalance_spouse = { ...currentAssets_spouse };
        // Add combined closing balance dynamically
        yearData.closingBalance = {
            rrsp: (yearData.closingBalance_user?.rrsp || 0) + (yearData.closingBalance_spouse?.rrsp || 0),
            tfsa: (yearData.closingBalance_user?.tfsa || 0) + (yearData.closingBalance_spouse?.tfsa || 0),
            nonreg: (yearData.closingBalance_user?.nonreg || 0) + (yearData.closingBalance_spouse?.nonreg || 0),
            lif: (yearData.closingBalance_user?.lif || 0) + (yearData.closingBalance_spouse?.lif || 0),
        };

        results.push(yearData); // Add current year's data to results array
    }
    return results; // Return array of all simulated years
}


// =============================================
// Simulation Step Functions (Core Engine)
// =============================================

/** Step 1: Apply Growth (Individual Assets) */
// *** MODIFICATION v2.2.3: Added scenario parameter ***
function step1_ApplyGrowth(yearData, currentAssets_user, currentAssets_spouse, returns, scenario) {
    // *** MODIFICATION START v2.2.3: Skip growth in the first simulation year ***
    const userRetirementStartYear = (scenario.user?.birthYear || 0) + (scenario.retirementAge || 0);
    if (yearData.year === userRetirementStartYear) {
        // This is the first simulation year. Skip growth.
        return { growth_user: {rrsp:0, tfsa:0, nonreg:0, lif:0}, growth_spouse: {rrsp:0, tfsa:0, nonreg:0, lif:0}, growth_total: {rrsp:0, tfsa:0, nonreg:0, lif:0} };
    }
    // *** MODIFICATION END v2.2.3 ***

    const safeReturns = returns || { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };

    // Apply growth to user assets
    const growth_user = {
        rrsp: (currentAssets_user?.rrsp || 0) * safeReturns.rrsp,
        tfsa: (currentAssets_user?.tfsa || 0) * safeReturns.tfsa,
        nonreg: (currentAssets_user?.nonreg || 0) * safeReturns.nonreg,
        lif: (currentAssets_user?.lif || 0) * safeReturns.lif
    };
    if (currentAssets_user) {
        currentAssets_user.rrsp = (currentAssets_user.rrsp || 0) + growth_user.rrsp;
        currentAssets_user.tfsa = (currentAssets_user.tfsa || 0) + growth_user.tfsa;
        currentAssets_user.nonreg = (currentAssets_user.nonreg || 0) + growth_user.nonreg;
        currentAssets_user.lif = (currentAssets_user.lif || 0) + growth_user.lif;
    }

    // Apply growth to spouse assets
    const growth_spouse = {
        rrsp: (currentAssets_spouse?.rrsp || 0) * safeReturns.rrsp,
        tfsa: (currentAssets_spouse?.tfsa || 0) * safeReturns.tfsa,
        nonreg: (currentAssets_spouse?.nonreg || 0) * safeReturns.nonreg,
        lif: (currentAssets_spouse?.lif || 0) * safeReturns.lif
    };
     if (currentAssets_spouse) {
        currentAssets_spouse.rrsp = (currentAssets_spouse.rrsp || 0) + growth_spouse.rrsp;
        currentAssets_spouse.tfsa = (currentAssets_spouse.tfsa || 0) + growth_spouse.tfsa;
        currentAssets_spouse.nonreg = (currentAssets_spouse.nonreg || 0) + growth_spouse.nonreg;
        currentAssets_spouse.lif = (currentAssets_spouse.lif || 0) + growth_spouse.lif;
     }

     // Calculate total growth
     const growth_total = {
        rrsp: growth_user.rrsp + growth_spouse.rrsp,
        tfsa: growth_user.tfsa + growth_spouse.tfsa,
        nonreg: growth_user.nonreg + growth_spouse.nonreg,
        lif: growth_user.lif + growth_spouse.lif,
    };

    return { growth_user, growth_spouse, growth_total };
}


/** Step 3: Calculate Household Expenses & Cash Needed */
function step3_CalculateExpenses(yearData, scenario, settings, lastYearTaxPayable) {
     const currentUserAge = yearData.userAge;
    let currentExpensePV = 0;
    const strategy = scenario.withdrawalStrategy || [];

    for (const phase of strategy) {
        const startAge = parseInt(phase.startAge, 10);
        const endAge = parseInt(phase.endAge, 10);
        if (!isNaN(startAge) && !isNaN(endAge) && currentUserAge >= startAge && currentUserAge <= endAge) {
            currentExpensePV = parseFloat(phase.expenses) || 0;
            break;
        }
    }
    // *** MODIFICATION START v2.2.3: Change COLA base to baseYear ***
    // const yearsSinceRetirementStart = Math.max(0, currentUserAge - (scenario.retirementAge || currentUserAge));
    // const colaMultiplier = Math.pow(1 + settings.cola, yearsSinceRetirementStart);
    const baseYear = settings.baseYear || 2025;
    const currentYear = yearData.year;
    const yearsSinceBase = Math.max(0, currentYear - baseYear);
    const colaMultiplier = Math.pow(1 + settings.cola, yearsSinceBase);
    // *** MODIFICATION END v2.2.3 ***
    yearData.expenses = currentExpensePV * colaMultiplier;

    // Use total tax paid last year as estimate for cash flow need this year
    yearData.taxPayable = lastYearTaxPayable;
    yearData.totalCashNeeded = yearData.expenses + yearData.taxPayable;
    // Shortfall based on non-withdrawal income (calculated in step 2)
    yearData.incomeShortfall = Math.max(0, yearData.totalCashNeeded - yearData.income.total);
}