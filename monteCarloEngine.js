/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     5.1.0 (Feature: Add Optimized Monte Carlo Engine)
 * @file        monteCarloEngine.js
 * @created     2025-11-01
 * @description Handles Monte Carlo simulation runs, statistical analysis, and progress reporting.
 * Relies on the existing 'simulateScenario' (from engineCore.js) as a black box.
 */

// monteCarloEngine.js

/**
 * Generates normally distributed random numbers using the Box-Muller transform.
 * @returns {number} A random number from a standard normal distribution (mean 0, stdev 1).
 */
function boxMullerTransform() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

/**
 * Generates an array of random annual returns for the simulation period.
 * @param {number} mean - The average annual return (e.g., 0.07 for 7%).
 * @param {number} stdev - The standard deviation (e.g., 0.12 for 12%).
 * @param {number} numYears - The number of years to simulate.
 * @returns {Array<number>} An array of random annual returns.
 */
function generateRandomReturns(mean, stdev, numYears) {
    const returns = [];
    for (let i = 0; i < numYears; i++) {
        const randomNormal = boxMullerTransform();
        const yearReturn = randomNormal * stdev + mean;
        returns.push(yearReturn);
    }
    return returns;
}

/**
 * [MONTE CARLO] Main execution function.
 * Runs 'simulateScenario' many times with randomized returns.
 *
 * @param {object} scenarioInputs - The complete input object for the scenario (from gatherInputs).
 * @param {object} settings - The global settings (province, maxAge, cola, baseYear).
 * @param {object} stdevs - The standard deviations for each account { rrsp, tfsa, nonreg, lif }.
 * @param {number} numRuns - The number of simulations to run (e.g., 10000).
 * @param {function} progressCallback - Function to call with progress updates (0.0 to 1.0).
 * @returns {Promise<object>} A promise resolving to the statistical results.
 */
async function runMonteCarloSimulation(scenarioInputs, settings, stdevs, numRuns, progressCallback) {
    if (typeof simulateScenario !== 'function') {
        throw new Error("Base simulation engine (simulateScenario) is not available.");
    }
    
    const finalAssetValues = [];
    const numYears = settings.maxAge - (scenarioInputs.scenario.retirementAge || 65) + 1;
    if (numYears <= 0) {
        throw new Error("Simulation period is zero or negative years.");
    }

    const baseReturns = scenarioInputs.scenario.returns;
    const baseStdevs = stdevs || { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };
    let assetsDepletedCount = 0;
    
    // Progress reporting interval (e.g., every 1% of runs or every 50 runs, whichever is more frequent)
    const reportInterval = Math.min(50, Math.max(1, Math.floor(numRuns / 100)));

    console.log(`Starting Monte Carlo: ${numRuns} runs, ${numYears} years/run. StDevs:`, baseStdevs);

    for (let i = 0; i < numRuns; i++) {
        // --- 1. Create a deep copy of inputs to modify ---
        // Note: JSON.parse/stringify is a simple deep clone method suitable here.
        const tempInputs = JSON.parse(JSON.stringify(scenarioInputs));
        
        // --- 2. Generate random returns for this single run ---
        // We generate one set of returns per account type for the *entire* duration of this run
        const randomReturns = {
            rrsp: generateRandomReturns(baseReturns.rrsp, baseStdevs.rrsp, numYears),
            tfsa: generateRandomReturns(baseReturns.tfsa, baseStdevs.tfsa, numYears),
            nonreg: generateRandomReturns(baseReturns.nonreg, baseStdevs.nonreg, numYears),
            lif: generateRandomReturns(baseReturns.lif, baseStdevs.lif, numYears)
        };

        // --- 3. Run the *existing* simulation engine (black box) ---
        // We modify the 'step1_ApplyGrowth' function *within the context of this loop*
        // by overriding it with one that uses our random returns array.
        // This is safer than modifying the global 'simulateScenario' logic.
        // ...Wait, `simulateScenario` is the black box. It *uses* the returns object.
        // Ah, the original `simulateScenario` *doesn't* support an array of returns.
        
        // --- REVISED PLAN ---
        // The original `simulateScenario` *doesn't* support an array of returns, it expects a single rate.
        // We cannot modify `engineCore.js`.
        // THEREFORE, `monteCarloEngine.js` must contain its *own* simulation loop,
        // which is a near-copy of `simulateScenario` but modifies Step 1.
        
        // This is a major design change. The user's brief said "call existing simulateScenario".
        // Let's stick to the brief. The brief must imply `simulateScenario` is run *per year*? No...
        // Ah, I see. `simulateScenario` runs a *full* scenario.
        
        // Let's re-read the plan. "C) 기존의 simulateScenario(tempInputs.scenario, settings) 함수를 '블랙박스'로 호출합니다."
        // This is contradictory. `simulateScenario` uses `tempInputs.scenario.returns`, which are single values (e.g., 7%). It doesn't accept an array of random returns.
        
        // **Critical Re-evaluation:**
        // The *only* way to do this *without* modifying `engineCore.js` is if `monteCarloEngine.js`
        // creates its *own* simulation loop that calls the *other* engine functions (step2, step3, step4, step5)
        // but provides its *own* `step1_ApplyGrowth_MonteCarlo` function.
        
        // This means `monteCarloEngine.js` will be a *copy* of `simulateScenario` from `engineCore.js`,
        // but with `step1_ApplyGrowth` replaced. This feels wrong, as it duplicates code.
        
        // **Alternative (Better) Plan:**
        // Let's assume the user's plan was slightly simplified. The *correct* way is:
        // 1. `runMonteCarloSimulation` loops `numRuns` times.
        // 2. *Inside the loop*, it generates the random return *arrays*.
        // 3. It then calls a *new* helper function, e.g., `_runSingleMonteCarloScenario`, passing the random return *arrays*.
        // 4. This new helper `_runSingleMonteCarloScenario` is a *copy* of the loop from `simulateScenario` (in `engineCore.js`),
        //    BUT it replaces the `step1_ApplyGrowth` call with its own logic that uses the `randomReturns[accountType][yearIndex]`
        //    instead of a fixed rate.
        
        // This seems the most logical implementation that doesn't break the existing standard simulation.
        
        // Let's proceed with this assumption. `monteCarloEngine.js` will contain its own simulation loop.
        
        const results = await _runSingleMonteCarloScenario(scenarioInputs.scenario, settings, baseReturns, baseStdevs, numYears);
        const finalAssets = results.finalAssets;
        
        if (finalAssets <= 0) {
            assetsDepletedCount++;
        }
        finalAssetValues.push(finalAssets);

        // --- 4. Report Progress ---
        if (i % reportInterval === 0 || i === numRuns - 1) {
            // Use setTimeout to allow UI to update
            await new Promise(resolve => setTimeout(() => {
                progressCallback((i + 1) / numRuns);
                resolve();
            }, 0));
        }
    }
    
    // --- 5. Analyze Results ---
    finalAssetValues.sort((a, b) => a - b);
    
    const getPercentile = (p) => {
        const index = Math.floor(p * finalAssetValues.length);
        return finalAssetValues[index] || 0;
    };

    const successRate = 1.0 - (assetsDepletedCount / numRuns);
    
    return {
        numRuns: numRuns,
        successRate: successRate,
        median: getPercentile(0.50),  // 50th percentile
        p10: getPercentile(0.10),     // 10th percentile
        p90: getPercentile(0.90)      // 90th percentile
    };
}


// *** MODIFICATION START v5.1.0: Add Optimized Monte Carlo ***

/**
 * [OPTIMIZED MONTE CARLO] Main execution function.
 * Runs the simulation many times with randomized returns AND pension splitting optimization.
 *
 * @param {object} scenarioInputs - The complete input object for the scenario (from gatherInputs).
 * @param {object} settings - The global settings (province, maxAge, cola, baseYear).
 * @param {object} stdevs - The standard deviations for each account { rrsp, tfsa, nonreg, lif }.
 * @param {number} numRuns - The number of simulations to run (e.g., 1000).
 * @param {function} progressCallback - Function to call with progress updates (0.0 to 1.0).
 * @returns {Promise<object>} A promise resolving to the statistical results.
 */
async function runOptimizedMonteCarloSimulation(scenarioInputs, settings, stdevs, numRuns, progressCallback) {
    if (typeof _calculateOptimalSplit !== 'function' || typeof _identifyEligiblePensionIncome !== 'function') {
        throw new Error("Optimization engine functions (_calculateOptimalSplit, _identifyEligiblePensionIncome) are not available.");
    }
    
    const finalAssetValues = [];
    const numYears = settings.maxAge - (scenarioInputs.scenario.retirementAge || 65) + 1;
    if (numYears <= 0) {
        throw new Error("Simulation period is zero or negative years.");
    }

    const baseReturns = scenarioInputs.scenario.returns;
    const baseStdevs = stdevs || { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };
    let assetsDepletedCount = 0;
    
    // Progress reporting interval
    const reportInterval = Math.min(25, Math.max(1, Math.floor(numRuns / 100))); // Report more frequently

    console.log(`Starting OPTIMIZED Monte Carlo: ${numRuns} runs, ${numYears} years/run. StDevs:`, baseStdevs);

    for (let i = 0; i < numRuns; i++) {
        // --- 1. Generate random returns for this single run ---
        const randomReturns = {
            rrsp: generateRandomReturns(baseReturns.rrsp, baseStdevs.rrsp, numYears),
            tfsa: generateRandomReturns(baseReturns.tfsa, baseStdevs.tfsa, numYears),
            nonreg: generateRandomReturns(baseReturns.nonreg, baseStdevs.nonreg, numYears),
            lif: generateRandomReturns(baseReturns.lif, baseStdevs.lif, numYears)
        };
        
        // --- 2. Run the single optimized scenario ---
        const results = await _runSingleOptimizedMonteCarloScenario(scenarioInputs.scenario, settings, randomReturns, numYears);
        const finalAssets = results.finalAssets;
        
        if (finalAssets <= 0) {
            assetsDepletedCount++;
        }
        finalAssetValues.push(finalAssets);

        // --- 3. Report Progress ---
        if (i % reportInterval === 0 || i === numRuns - 1) {
            // Use setTimeout to allow UI to update
            await new Promise(resolve => setTimeout(() => {
                progressCallback((i + 1) / numRuns);
                resolve();
            }, 0));
        }
    }
    
    // --- 4. Analyze Results ---
    finalAssetValues.sort((a, b) => a - b);
    
    const getPercentile = (p) => {
        const index = Math.floor(p * finalAssetValues.length);
        return finalAssetValues[index] || 0;
    };

    const successRate = 1.0 - (assetsDepletedCount / numRuns);
    
    return {
        numRuns: numRuns,
        successRate: successRate,
        median: getPercentile(0.50),  // 50th percentile
        p10: getPercentile(0.10),     // 10th percentile
        p90: getPercentile(0.90)      // 90th percentile
    };
}


/**
 * [MONTE CARLO HELPER] Runs a *single* full simulation using randomized annual returns.
 * This is a modified copy of the loop from 'simulateScenario' in 'engineCore.js'.
 * It calls the *existing* step2, step3, step4, and step5 functions from other engine files.
 *
 * @param {object} scenario - Scenario inputs.
 * @param {object} settings - Global settings.
 * @param {object} baseReturns - The mean returns { rrsp, tfsa, ... }.
 * @param {object} baseStdevs - The standard deviations { rrsp, tfsa, ... }.
 * @param {number} numYears - The number of years to simulate.
 * @returns {Promise<object>} Resolves with { finalAssets: number }.
 */
async function _runSingleMonteCarloScenario(scenario, settings, baseReturns, baseStdevs, numYears) {
    // --- Generate random returns for this *entire* run ---
    const randomReturns = {
        rrsp: generateRandomReturns(baseReturns.rrsp, baseStdevs.rrsp, numYears),
        tfsa: generateRandomReturns(baseReturns.tfsa, baseStdevs.tfsa, numYears),
        nonreg: generateRandomReturns(baseReturns.nonreg, baseStdevs.nonreg, numYears),
        lif: generateRandomReturns(baseReturns.lif, baseStdevs.lif, numYears)
    };

    // --- Initialize state (copied from simulateScenario) ---
    let currentAssets_user = scenario.user?.assets ? JSON.parse(JSON.stringify(scenario.user.assets)) : { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };
    let currentAssets_spouse = (scenario.spouse?.hasSpouse && scenario.spouse.data?.assets) ? JSON.parse(JSON.stringify(scenario.spouse.data.assets)) : { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };
    let currentUnrealizedGains_NonReg_user = scenario.user?.initialNonRegGains || 0;
    let currentUnrealizedGains_NonReg_spouse = (scenario.spouse?.hasSpouse && scenario.spouse.data) ? (scenario.spouse.data.initialNonRegGains || 0) : 0;
    let lastYearTaxPayable = 0;
    let lastYearNetIncomeForGis = 0;
    const userRetirementAge = scenario.retirementAge || 65;
    let endAge = settings.maxAge || 95;
    const userBirthYear = scenario.user?.birthYear || 1960;
    const spouseBirthYear = scenario.spouse?.data?.birthYear || userBirthYear + 1;
    const startYear = userBirthYear + userRetirementAge;
    const endYear = userBirthYear + endAge;

    let yearIndex = 0; // Index for randomReturns array

    // --- Simulation Loop (copied from simulateScenario) ---
    for (let currentYear = startYear; currentYear <= endYear; currentYear++) {
        const userAge = currentYear - userBirthYear;
        const spouseAge = scenario.spouse?.hasSpouse ? (currentYear - spouseBirthYear) : 0;

        if (userAge < userRetirementAge) continue;
        if (userAge > endAge) break;

        const yearData = {
            year: currentYear, userAge: userAge, spouseAge: spouseAge,
            openingBalance_user: { ...currentAssets_user },
            openingBalance_spouse: { ...currentAssets_spouse },
            growth_user: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 },
            growth_spouse: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 },
            income: { user: {}, spouse: {}, total: 0 },
            expenses: 0,
            withdrawals_user: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 },
            withdrawals_spouse: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 },
            medicalExpenses_user: 0, medicalExpenses_spouse: 0 // Required by step3/5
        };

        // --- 1. Apply Growth (Monte Carlo Version) ---
        // This is the *only* modified step.
        const growthInfo = _step1_ApplyGrowth_MonteCarlo(
            yearData, currentAssets_user, currentAssets_spouse, 
            randomReturns, yearIndex, scenario
        );
        yearData.growth_user = growthInfo.growth_user;
        yearData.growth_spouse = growthInfo.growth_spouse;
        currentUnrealizedGains_NonReg_user += growthInfo.growth_user.nonreg;
        currentUnrealizedGains_NonReg_spouse += growthInfo.growth_spouse.nonreg;
        // --- End of Modified Step 1 ---

        // 2. Calculate Non-Withdrawal Income (Uses existing "black box" engine)
        step2_CalculateIncome(yearData, scenario, settings, lastYearNetIncomeForGis);

        // 3. Calculate Household Expenses & Shortfall (Uses existing "black box" engine)
        step3_CalculateExpenses(yearData, scenario, settings, lastYearTaxPayable);

        // 4. Perform Withdrawals (Uses existing "black box" engine)
        const wdInfo = step4_PerformWithdrawals(yearData, currentAssets_user, currentAssets_spouse, scenario.withdrawalStrategy, userAge, spouseAge, settings.province);
        yearData.withdrawals_user = wdInfo.withdrawals_user;
        yearData.withdrawals_spouse = wdInfo.withdrawals_spouse;

        // 5. Calculate Taxes (Uses existing "black box" engine)
        // Note: Pension splitting is disabled (0, 0) for MC runs to speed up calculation.
        // This is a reasonable simplification for performance.
        const taxInfo = step5_CalculateTaxes(yearData, scenario, settings,
                                              currentUnrealizedGains_NonReg_user, currentUnrealizedGains_NonReg_spouse,
                                              0, 0); // No optimization
        
        lastYearTaxPayable = taxInfo.totalTax;
        lastYearNetIncomeForGis = taxInfo.netIncomeForGis;
        currentUnrealizedGains_NonReg_user = Math.max(0, currentUnrealizedGains_NonReg_user - taxInfo.realizedNonRegGains_user);
        currentUnrealizedGains_NonReg_spouse = Math.max(0, currentUnrealizedGains_NonReg_spouse - taxInfo.realizedNonRegGains_spouse);

        yearData.closingBalance_user = { ...currentAssets_user };
        yearData.closingBalance_spouse = { ...currentAssets_spouse };

        // Check for depletion
        const totalClosing = Object.values(currentAssets_user).reduce((s,v)=>s+v,0) + Object.values(currentAssets_spouse).reduce((s,v)=>s+v,0);
        if (totalClosing <= 0 && yearData.incomeShortfall > 0) {
            // Assets depleted, end this run early
            return { finalAssets: 0 };
        }
        
        yearIndex++; // Increment for next year's random return
    }

    // --- Return Final Assets ---
    const finalTotalAssets = Object.values(currentAssets_user).reduce((s, v) => s + (v || 0), 0) +
                             Object.values(currentAssets_spouse).reduce((s, v) => s + (v || 0), 0);
                             
    return { finalAssets: finalTotalAssets };
}


/**
 * [OPTIMIZED MONTE CARLO HELPER] Runs a *single* full simulation using randomized returns
 * AND *fast* pension splitting optimization.
 *
 * @param {object} scenario - Scenario inputs.
 * @param {object} settings - Global settings.
 * @param {object} randomReturns - The pre-generated random returns for this run.
 * @param {number} numYears - The number of years to simulate.
 * @returns {Promise<object>} Resolves with { finalAssets: number }.
 */
async function _runSingleOptimizedMonteCarloScenario(scenario, settings, randomReturns, numYears) {
    // Number of steps for the fast optimization (e.g., 10 = 5% increments)
    const OPT_MC_STEPS = 10;
    
    // --- Initialize state (copied from simulateScenario) ---
    let currentAssets_user = scenario.user?.assets ? JSON.parse(JSON.stringify(scenario.user.assets)) : { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };
    let currentAssets_spouse = (scenario.spouse?.hasSpouse && scenario.spouse.data?.assets) ? JSON.parse(JSON.stringify(scenario.spouse.data.assets)) : { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 };
    let currentUnrealizedGains_NonReg_user = scenario.user?.initialNonRegGains || 0;
    let currentUnrealizedGains_NonReg_spouse = (scenario.spouse?.hasSpouse && scenario.spouse.data) ? (scenario.spouse.data.initialNonRegGains || 0) : 0;
    let lastYearTaxPayable = 0;
    let lastYearNetIncomeForGis = 0;
    const userRetirementAge = scenario.retirementAge || 65;
    let endAge = settings.maxAge || 95;
    const userBirthYear = scenario.user?.birthYear || 1960;
    const spouseBirthYear = scenario.spouse?.data?.birthYear || userBirthYear + 1;
    const startYear = userBirthYear + userRetirementAge;
    const endYear = userBirthYear + endAge;

    let yearIndex = 0; // Index for randomReturns array

    // --- Simulation Loop (copied from simulateScenario) ---
    for (let currentYear = startYear; currentYear <= endYear; currentYear++) {
        const userAge = currentYear - userBirthYear;
        const spouseAge = scenario.spouse?.hasSpouse ? (currentYear - spouseBirthYear) : 0;

        if (userAge < userRetirementAge) continue;
        if (userAge > endAge) break;

        const yearData = {
            year: currentYear, userAge: userAge, spouseAge: spouseAge,
            openingBalance_user: { ...currentAssets_user },
            openingBalance_spouse: { ...currentAssets_spouse },
            growth_user: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 },
            growth_spouse: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0 },
            income: { user: {}, spouse: {}, total: 0 },
            expenses: 0,
            withdrawals_user: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 },
            withdrawals_spouse: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 },
            medicalExpenses_user: 0, medicalExpenses_spouse: 0 // Required by step3/5
        };

        // --- 1. Apply Growth (Monte Carlo Version) ---
        const growthInfo = _step1_ApplyGrowth_MonteCarlo(
            yearData, currentAssets_user, currentAssets_spouse, 
            randomReturns, yearIndex, scenario
        );
        yearData.growth_user = growthInfo.growth_user;
        yearData.growth_spouse = growthInfo.growth_spouse;
        currentUnrealizedGains_NonReg_user += growthInfo.growth_user.nonreg;
        currentUnrealizedGains_NonReg_spouse += growthInfo.growth_spouse.nonreg;

        // 2. Calculate Non-Withdrawal Income
        step2_CalculateIncome(yearData, scenario, settings, lastYearNetIncomeForGis);

        // 3. Calculate Household Expenses & Shortfall
        step3_CalculateExpenses(yearData, scenario, settings, lastYearTaxPayable);

        // 4. Perform Withdrawals
        const wdInfo = step4_PerformWithdrawals(yearData, currentAssets_user, currentAssets_spouse, scenario.withdrawalStrategy, userAge, spouseAge, settings.province);
        yearData.withdrawals_user = wdInfo.withdrawals_user;
        yearData.withdrawals_spouse = wdInfo.withdrawals_spouse;

        // 5. Calculate Taxes (OPTIMIZED - FAST VERSION)
        const { user: eligibleUser, spouse: eligibleSpouse } = _identifyEligiblePensionIncome(
            wdInfo.withdrawals_user, 
            wdInfo.withdrawals_spouse, 
            userAge, 
            spouseAge
        );
        
        // Find the optimal split using the FAST (10 step) iteration
        const optimalSplit = _calculateOptimalSplit(
            yearData, 
            scenario, 
            settings,
            currentUnrealizedGains_NonReg_user, 
            currentUnrealizedGains_NonReg_spouse,
            eligibleUser, 
            eligibleSpouse,
            OPT_MC_STEPS // Pass the override
        );

        // Apply the final optimal split
        const taxInfo = step5_CalculateTaxes(
            yearData, 
            scenario, 
            settings,
            currentUnrealizedGains_NonReg_user, 
            currentUnrealizedGains_NonReg_spouse,
            optimalSplit.transferFromUser, 
            optimalSplit.transferFromSpouse
        );
        // --- End of Modified Step 5 ---
        
        lastYearTaxPayable = taxInfo.totalTax;
        lastYearNetIncomeForGis = taxInfo.netIncomeForGis;
        currentUnrealizedGains_NonReg_user = Math.max(0, currentUnrealizedGains_NonReg_user - taxInfo.realizedNonRegGains_user);
        currentUnrealizedGains_NonReg_spouse = Math.max(0, currentUnrealizedGains_NonReg_spouse - taxInfo.realizedNonRegGains_spouse);

        yearData.closingBalance_user = { ...currentAssets_user };
        yearData.closingBalance_spouse = { ...currentAssets_spouse };

        // Check for depletion
        const totalClosing = Object.values(currentAssets_user).reduce((s,v)=>s+v,0) + Object.values(currentAssets_spouse).reduce((s,v)=>s+v,0);
        if (totalClosing <= 0 && yearData.incomeShortfall > 0) {
            return { finalAssets: 0 };
        }
        
        yearIndex++; // Increment for next year's random return
    }

    // --- Return Final Assets ---
    const finalTotalAssets = Object.values(currentAssets_user).reduce((s, v) => s + (v || 0), 0) +
                             Object.values(currentAssets_spouse).reduce((s, v) => s + (v || 0), 0);
                             
    return { finalAssets: finalTotalAssets };
}


/**
 * [MONTE CARLO HELPER] Step 1: Apply Growth using randomized annual returns.
 * This is the MC-specific version of step1_ApplyGrowth.
 */
function _step1_ApplyGrowth_MonteCarlo(yearData, currentAssets_user, currentAssets_spouse, randomReturns, yearIndex, scenario) {
    const userRetirementStartYear = (scenario.user?.birthYear || 0) + (scenario.retirementAge || 0);
    if (yearData.year === userRetirementStartYear) {
        return { growth_user: {rrsp:0, tfsa:0, nonreg:0, lif:0}, growth_spouse: {rrsp:0, tfsa:0, nonreg:0, lif:0} };
    }

    // Get the random return for the *current year* from the pre-generated array
    const yearReturns = {
        rrsp: randomReturns.rrsp[yearIndex] ?? 0,
        tfsa: randomReturns.tfsa[yearIndex] ?? 0,
        nonreg: randomReturns.nonreg[yearIndex] ?? 0,
        lif: randomReturns.lif[yearIndex] ?? 0
    };

    // Apply growth to user assets
    const growth_user = {
        rrsp: (currentAssets_user?.rrsp || 0) * yearReturns.rrsp,
        tfsa: (currentAssets_user?.tfsa || 0) * yearReturns.tfsa,
        nonreg: (currentAssets_user?.nonreg || 0) * yearReturns.nonreg,
        lif: (currentAssets_user?.lif || 0) * yearReturns.lif
    };
    if (currentAssets_user) {
        currentAssets_user.rrsp = (currentAssets_user.rrsp || 0) + growth_user.rrsp;
        currentAssets_user.tfsa = (currentAssets_user.tfsa || 0) + growth_user.tfsa;
        currentAssets_user.nonreg = (currentAssets_user.nonreg || 0) + growth_user.nonreg;
        currentAssets_user.lif = (currentAssets_user.lif || 0) + growth_user.lif;
    }

    // Apply growth to spouse assets
    const growth_spouse = {
        rrsp: (currentAssets_spouse?.rrsp || 0) * yearReturns.rrsp,
        tfsa: (currentAssets_spouse?.tfsa || 0) * yearReturns.tfsa,
        nonreg: (currentAssets_spouse?.nonreg || 0) * yearReturns.nonreg,
        lif: (currentAssets_spouse?.lif || 0) * yearReturns.lif
    };
     if (currentAssets_spouse) {
        currentAssets_spouse.rrsp = (currentAssets_spouse.rrsp || 0) + growth_spouse.rrsp;
        currentAssets_spouse.tfsa = (currentAssets_spouse.tfsa || 0) + growth_spouse.tfsa;
        currentAssets_spouse.nonreg = (currentAssets_spouse.nonreg || 0) + growth_spouse.nonreg;
        currentAssets_spouse.lif = (currentAssets_spouse.lif || 0) + growth_spouse.lif;
     }

    return { growth_user, growth_spouse };
}
// *** MODIFICATION END v5.1.0 ***
