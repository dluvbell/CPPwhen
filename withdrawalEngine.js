/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.3.0 (Refactor: Split engine into core, income/tax, withdrawal modules)
 * @file        withdrawalEngine.js
 * @created     2025-10-25
 * @description Handles withdrawal logic including shortfall coverage and RRIF/LIF minimum/maximum rules.
 */

// withdrawalEngine.js
// Assumes global access to data.js variables: rrifLifMinimumRates, rrifLifMinRateAge95Plus, ontarioLifMaximumFactors, lifMaxFactorAge90Plus

/** Step 4: Perform Withdrawals (Household Need, Individual Pools, Sequential) */
function step4_PerformWithdrawals(yearData, currentAssets_user, currentAssets_spouse, strategy, userAge, spouseAge) {
    let amountToWithdraw = yearData.incomeShortfall; // Total household shortfall
    const withdrawals_user = { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 };
    const withdrawals_spouse = { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 };
    const withdrawals_total = { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, total: 0 };
    const hasSpouse = yearData.spouseAge > 0 && currentAssets_spouse; // Check if spouse exists and has assets

    // *** MODIFICATION START v2.2.2: LIF Max Calculation ***
    // Calculate max allowed withdrawal based on opening balance for the year
    const maxAllowedLifUser = (yearData.openingBalance_user.lif || 0) * getLifMaximumFactor(userAge);
    const maxAllowedLifSpouse = hasSpouse ? ((yearData.openingBalance_spouse.lif || 0) * getLifMaximumFactor(spouseAge)) : 0;
    // Track LIF withdrawals made this year to stay under the max
    let alreadyWithdrawnLifUser = 0;
    let alreadyWithdrawnLifSpouse = 0;
    // *** MODIFICATION END v2.2.2 ***

    let currentPhase = null;
    for (const phase of (strategy || [])) {
         const startAge = parseInt(phase.startAge, 10);
         const endAge = parseInt(phase.endAge, 10);
         if (!isNaN(startAge) && !isNaN(endAge) && userAge >= startAge && userAge <= endAge) {
            currentPhase = phase;
            break;
        }
    }

    // *** MODIFICATION START v2.2.2: Shortfall Withdrawals with LIF Max logic ***
    if (currentPhase && amountToWithdraw > 0) {
        for (const accountType of (currentPhase.order || [])) {
            if (amountToWithdraw <= 0) break;

            // Try withdrawing from User's account
            if (currentAssets_user) {
                let availableAmountUser = currentAssets_user[accountType] || 0;
                if (availableAmountUser > 0) {
                    let withdrawAmount = 0;
                    if (accountType === 'lif') {
                        const roomAvailableBelowMax = Math.max(0, maxAllowedLifUser - alreadyWithdrawnLifUser);
                        withdrawAmount = Math.min(amountToWithdraw, availableAmountUser, roomAvailableBelowMax);
                        alreadyWithdrawnLifUser += withdrawAmount; // Track LIF withdrawal
                    } else {
                        withdrawAmount = Math.min(amountToWithdraw, availableAmountUser);
                    }

                    if (withdrawAmount > 0) {
                        withdrawals_user[accountType] = (withdrawals_user[accountType] || 0) + withdrawAmount;
                        currentAssets_user[accountType] -= withdrawAmount;
                        amountToWithdraw -= withdrawAmount;
                        withdrawals_user.total += withdrawAmount;
                        withdrawals_total[accountType] = (withdrawals_total[accountType] || 0) + withdrawAmount;
                        withdrawals_total.total += withdrawAmount;
                    }
                }
            }

            if (amountToWithdraw <= 0) break;

             // Try withdrawing from Spouse's account if needed
             if (hasSpouse) {
                 let availableAmountSpouse = currentAssets_spouse[accountType] || 0;
                 if (availableAmountSpouse > 0) {
                    let withdrawAmount = 0;
                    if (accountType === 'lif') {
                        const roomAvailableBelowMax = Math.max(0, maxAllowedLifSpouse - alreadyWithdrawnLifSpouse);
                        withdrawAmount = Math.min(amountToWithdraw, availableAmountSpouse, roomAvailableBelowMax);
                        alreadyWithdrawnLifSpouse += withdrawAmount; // Track LIF withdrawal
                    } else {
                        withdrawAmount = Math.min(amountToWithdraw, availableAmountSpouse);
                    }

                    if (withdrawAmount > 0) {
                        withdrawals_spouse[accountType] = (withdrawals_spouse[accountType] || 0) + withdrawAmount;
                        currentAssets_spouse[accountType] -= withdrawAmount;
                        amountToWithdraw -= withdrawAmount;
                        withdrawals_spouse.total += withdrawAmount;
                        withdrawals_total[accountType] = (withdrawals_total[accountType] || 0) + withdrawAmount;
                        withdrawals_total.total += withdrawAmount;
                    }
                }
             }
        }
    }
    // *** MODIFICATION END v2.2.2 ***

    if (amountToWithdraw > 0) {
        console.warn(`Year ${yearData.year}: Income shortfall of $${amountToWithdraw.toFixed(2)} could not be fully covered.`);
    }

    // --- RRIF/LIF Minimum Withdrawals (Individual) ---
    const rrifMinAge = 71;
    // *** MODIFICATION v2.2.2: Removed old 'getMinWithdrawalRate' helper function (now in helper file) ***

    // User RRIF/LIF Minimums
    if (userAge >= rrifMinAge && currentAssets_user) {
        // *** MODIFICATION v2.2.2: Use new helper function from data.js ***
        const minRate = getRrifLifMinimumRate(userAge);
        // RRIF
        const openingRRSP = yearData.openingBalance_user.rrsp || 0;
        const minRequired = openingRRSP * minRate;
        const currentRRSPWithdrawal = withdrawals_user.rrsp || 0;
        if (openingRRSP > 0 && currentRRSPWithdrawal < minRequired) {
            const additionalNeeded = minRequired - currentRRSPWithdrawal;
            const canWithdraw = Math.min(additionalNeeded, currentAssets_user.rrsp || 0); // Check current balance
            if (canWithdraw > 0) {
                withdrawals_user.rrsp += canWithdraw;
                currentAssets_user.rrsp -= canWithdraw;
                withdrawals_user.total += canWithdraw;
                withdrawals_total.rrsp += canWithdraw;
                withdrawals_total.total += canWithdraw;
            }
        }
        // LIF
        const openingLIF = yearData.openingBalance_user.lif || 0;
        const minRequiredLIF = openingLIF * minRate;
        const currentLIFWithdrawal = withdrawals_user.lif || 0;
         if (openingLIF > 0 && currentLIFWithdrawal < minRequiredLIF) {
             const additionalNeeded = minRequiredLIF - currentLIFWithdrawal;
             // *** MODIFICATION START v2.2.2: Check against LIF Max ***
             let roomAvailableBelowMax = Math.max(0, maxAllowedLifUser - alreadyWithdrawnLifUser);
             const canWithdraw = Math.min(additionalNeeded, currentAssets_user.lif || 0, roomAvailableBelowMax);
             // *** MODIFICATION END v2.2.2 ***
             if (canWithdraw > 0) {
                withdrawals_user.lif += canWithdraw;
                currentAssets_user.lif -= canWithdraw;
                alreadyWithdrawnLifUser += canWithdraw; // Track withdrawal against max
                withdrawals_user.total += canWithdraw;
                withdrawals_total.lif += canWithdraw;
                withdrawals_total.total += canWithdraw;
            }
        }
    }

    // Spouse RRIF/LIF Minimums
    if (hasSpouse && spouseAge >= rrifMinAge && currentAssets_spouse) {
         // *** MODIFICATION v2.2.2: Use new helper function from data.js ***
         const minRate = getRrifLifMinimumRate(spouseAge);
         // RRIF
        const openingRRSP = yearData.openingBalance_spouse.rrsp || 0;
        const minRequired = openingRRSP * minRate;
         const currentRRSPWithdrawal = withdrawals_spouse.rrsp || 0;
        if (openingRRSP > 0 && currentRRSPWithdrawal < minRequired) {
             const additionalNeeded = minRequired - currentRRSPWithdrawal;
             const canWithdraw = Math.min(additionalNeeded, currentAssets_spouse.rrsp || 0);
             if (canWithdraw > 0) {
                withdrawals_spouse.rrsp += canWithdraw;
                currentAssets_spouse.rrsp -= canWithdraw;
                withdrawals_spouse.total += canWithdraw;
                withdrawals_total.rrsp += canWithdraw;
                withdrawals_total.total += canWithdraw;
            }
        }
        // LIF
         const openingLIF = yearData.openingBalance_spouse.lif || 0;
         const minRequiredLIF = openingLIF * minRate;
         const currentLIFWithdrawal = withdrawals_spouse.lif || 0;
         if (openingLIF > 0 && currentLIFWithdrawal < minRequiredLIF) {
             const additionalNeeded = minRequiredLIF - currentLIFWithdrawal;
             // *** MODIFICATION START v2.2.2: Check against LIF Max ***
             let roomAvailableBelowMax = Math.max(0, maxAllowedLifSpouse - alreadyWithdrawnLifSpouse);
             const canWithdraw = Math.min(additionalNeeded, currentAssets_spouse.lif || 0, roomAvailableBelowMax);
             // *** MODIFICATION END v2.2.2 ***
             if (canWithdraw > 0) {
                withdrawals_spouse.lif += canWithdraw;
                currentAssets_spouse.lif -= canWithdraw;
                alreadyWithdrawnLifSpouse += canWithdraw; // Track withdrawal against max
                withdrawals_spouse.total += canWithdraw;
                withdrawals_total.lif += canWithdraw;
                withdrawals_total.total += canWithdraw;
            }
        }
    }

    return { withdrawals_user, withdrawals_spouse, withdrawals_total };
}


// *** MODIFICATION START v2.2.2: Add RRIF/LIF Helper Functions ***

/**
 * Helper: Get RRIF/LIF Minimum Withdrawal Rate from data.js
 * @param {number} age - The individual's age.
 * @returns {number} The minimum withdrawal rate (e.g., 0.0528 for age 71).
 */
function getRrifLifMinimumRate(age) {
    if (age < 71) return 0;
    if (age >= 95) {
        // Assume rrifLifMinRateAge95Plus is globally available from data.js
        return typeof rrifLifMinRateAge95Plus !== 'undefined' ? rrifLifMinRateAge95Plus : 0.20;
    }
    // Assume rrifLifMinimumRates is globally available from data.js
    if (typeof rrifLifMinimumRates === 'undefined') return 0; // Safety check
    const rateData = rrifLifMinimumRates.find(d => d.age === age);
    return rateData ? rateData.rate : 0; // Return 0 if age not found (e.g., < 71)
}

/**
 * Helper: Get Ontario LIF Maximum Withdrawal Factor from data.js
 * @param {number} age - The individual's age.
 * @returns {number} The maximum withdrawal factor (e.g., 1/(90-age) or specific factor).
 */
function getLifMaximumFactor(age) {
    // Assuming min age for LIF is 55 based on data.js table
    if (age < 55) return 0;

    // Assume ontarioLifMaximumFactors is globally available from data.js
    if (typeof ontarioLifMaximumFactors === 'undefined') return 0; // Safety check

    const factorData = ontarioLifMaximumFactors.find(d => d.age === age);
    if (factorData) {
        return factorData.factor;
    }

    // Assume lifMaxFactorAge90Plus is globally available from data.js
    const age90PlusFactor = typeof lifMaxFactorAge90Plus !== 'undefined' ? lifMaxFactorAge90Plus : 0.20;

    // If age is over the max in the table (e.g., > 90), use the 90+ constant
    // Find the max age in the table dynamically to be more robust
    const maxAgeInTable = Math.max(...ontarioLifMaximumFactors.map(d => d.age));
    if (age > maxAgeInTable) {
         return age90PlusFactor;
    }

    return 0; // Age is within range but not found (e.g., < 55 or gap in table)
}
// *** MODIFICATION END v2.2.2 ***