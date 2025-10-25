/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.3.0 (Refactor: Split engine into core, income/tax, withdrawal modules)
 * @file        incomeTaxEngine.js
 * @created     2025-10-25
 * @description Handles calculation of non-withdrawal income (CPP, OAS, GIS, Other) and taxes (Federal, Provincial, Clawback, Capital Gains).
 */

// incomeTaxEngine.js
// Assumes global access to data.js variables: taxData, govBenefitsData

/** Step 2: Calculate Non-Withdrawal Income (Individual) */
function step2_CalculateIncome(yearData, scenario, settings, lastYearNetIncomeForGis) {
    const userAge = yearData.userAge;
    const spouseAge = yearData.spouseAge;
    const userBirthYear = scenario.user?.birthYear || 1900;
    const spouseBirthYear = scenario.spouse?.data?.birthYear || userBirthYear + 1;
    const baseYear = settings.baseYear || 2025;
    const currentYear = yearData.year;
    const yearsSinceBase = currentYear - baseYear;
    const colaMultiplier = Math.pow(1 + settings.cola, yearsSinceBase); // General COLA for thresholds, max payments

    // --- User Income ---
    let userCpp = 0, userOas = 0, userGis = 0, userOther = 0;
    if (scenario.user && userAge >= scenario.user.cppStartAge) {
        const monthsDiff = (scenario.user.cppStartAge - 65) * 12;
        const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007; // Early/Late factor
        const baseCpp = (scenario.user.cppAt65 || 0) * (1 + adjustment);
        // Apply COLA starting from the year CPP begins
        const cppStartYear = userBirthYear + (scenario.user.cppStartAge || 65);
        const yearsSinceCppStart = Math.max(0, currentYear - cppStartYear);
        userCpp = baseCpp * Math.pow(1 + settings.cola, yearsSinceCppStart);
    }
     const oasBasePayment = govBenefitsData.OAS.maxPayment2025 || 8881; // Base payment from data.js
    if (scenario.user && userAge >= scenario.user.oasStartAge) {
         const deferralMonths = Math.max(0, (scenario.user.oasStartAge - 65) * 12);
         const deferralBonus = deferralMonths * 0.006;
         const baseOas = oasBasePayment * (1 + deferralBonus);
        userOas = baseOas * colaMultiplier; // Apply general COLA
        if (userAge >= 75) userOas *= 1.10; // 10% increase at 75
    }
    // Process user-owned other incomes
    (scenario.user?.otherIncomes || []).forEach(income => {
        if (userAge >= income.startAge && userAge <= income.endAge) {
             const incomeStartYear = userBirthYear + (income.startAge || 0);
             // Calculate the value of the income in the year it starts, adjusted for COLA from base year
             const yearsFromBaseToStart = Math.max(0, incomeStartYear - baseYear);
             // *** MODIFICATION START v2.2.3: Use individual income COLA ***
             // Use global COLA to adjust PV from baseYear to startYear
             const baseAmountAtStartYear = (income.amount || 0) * Math.pow(1 + settings.cola, yearsFromBaseToStart);
             // Use the income's *individual* COLA (defaulting to 0) from startYear onwards
             const incomeColaRate = (typeof income.cola === 'number') ? income.cola : 0; // Default to 0%
             const yearsSinceIncomeStart = Math.max(0, currentYear - incomeStartYear);
             userOther += baseAmountAtStartYear * Math.pow(1 + incomeColaRate, yearsSinceIncomeStart);
             // *** MODIFICATION END v2.2.3 ***
        }
    });

     // --- Spouse Income (if applicable) ---
    let spouseCpp = 0, spouseOas = 0, spouseGis = 0, spouseOther = 0;
    if (scenario.spouse?.hasSpouse && scenario.spouse.data && spouseAge > 0) { // Ensure spouse exists and has age
        const spouse = scenario.spouse.data;
        if (spouseAge >= spouse.cppStartAge) {
             const monthsDiff = (spouse.cppStartAge - 65) * 12;
             const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007;
             const baseCpp = (spouse.cppAt65 || 0) * (1 + adjustment);
             const cppStartYear = spouseBirthYear + (spouse.cppStartAge || 65);
             const yearsSinceCppStart = Math.max(0, currentYear - cppStartYear);
            spouseCpp = baseCpp * Math.pow(1 + settings.cola, yearsSinceCppStart);
        }
         if (spouseAge >= spouse.oasStartAge) {
            const deferralMonths = Math.max(0, (spouse.oasStartAge - 65) * 12);
            const deferralBonus = deferralMonths * 0.006;
            const baseOas = oasBasePayment * (1 + deferralBonus);
            spouseOas = baseOas * colaMultiplier; // Apply general COLA
            if (spouseAge >= 75) spouseOas *= 1.10;
        }
         // Process spouse-owned other incomes
        (spouse.otherIncomes || []).forEach(income => {
             if (spouseAge >= income.startAge && spouseAge <= income.endAge) {
                 const incomeStartYear = spouseBirthYear + (income.startAge || 0);
                 const yearsFromBaseToStart = Math.max(0, incomeStartYear - baseYear);
                 // *** MODIFICATION START v2.2.3: Use individual income COLA ***
                 // Use global COLA to adjust PV from baseYear to startYear
                 const baseAmountAtStartYear = (income.amount || 0) * Math.pow(1 + settings.cola, yearsFromBaseToStart);
                 // Use the income's *individual* COLA (defaulting to 0) from startYear onwards
                 const incomeColaRate = (typeof income.cola === 'number') ? income.cola : 0; // Default to 0%
                 const yearsSinceIncomeStart = Math.max(0, currentYear - incomeStartYear);
                 spouseOther += baseAmountAtStartYear * Math.pow(1 + incomeColaRate, yearsSinceIncomeStart);
                 // *** MODIFICATION END v2.2.3 ***
            }
        });
    }

    // --- GIS Calculation (Household based on last year's income) ---
    const isGisEligibleUser = userAge >= 65;
    const isGisEligibleSpouse = scenario.spouse?.hasSpouse && spouseAge >= 65;
    const isCoupleGisEligible = isGisEligibleUser && isGisEligibleSpouse;
     // Single eligibility: User >= 65 AND (no spouse OR spouse < 65)
    const isSingleGisEligible = isGisEligibleUser && (!scenario.spouse?.hasSpouse || (scenario.spouse?.hasSpouse && spouseAge < 65));

     if (isCoupleGisEligible || isSingleGisEligible) {
         const gisData = govBenefitsData.GIS;
         const incomeForGis = lastYearNetIncomeForGis; // Use combined income from previous year

         // Determine applicable threshold and max payment based on household status
         let incomeThreshold, maxGisPaymentTotal, exemption;
         if (isCoupleGisEligible) {
             incomeThreshold = (gisData.incomeThresholdCouple || 29616) * colaMultiplier;
             maxGisPaymentTotal = (gisData.maxPaymentCoupleTotal || (gisData.maxPaymentPerPerson2025 * 2) || 15970) * colaMultiplier;
             exemption = (gisData.exemptionCouple || gisData.exemption || 5000) * colaMultiplier; // Use couple exemption if available
         } else { // Single or User eligible, Spouse not
             incomeThreshold = (gisData.incomeThresholdSingle || 21624) * colaMultiplier;
             maxGisPaymentTotal = (gisData.maxPaymentSingle || 13083) * colaMultiplier;
             exemption = (gisData.exemptionSingle || gisData.exemption || 5000) * colaMultiplier; // Use single exemption
         }

         if (incomeForGis < incomeThreshold) {
             const incomeSubjectToReduction = Math.max(0, incomeForGis - exemption);
             const gisReduction = incomeSubjectToReduction * (gisData.reductionRate || 0.5);
             const householdGis = Math.max(0, maxGisPaymentTotal - gisReduction);

            if (isCoupleGisEligible) {
                // Simplified split - assumes both receive OAS. Reality is more complex.
                userGis = householdGis / 2;
                spouseGis = householdGis / 2;
            } else { // Single eligible user
                userGis = householdGis;
                spouseGis = 0; // Spouse gets no GIS if not eligible (or no allowance modeled)
            }
        }
    }

    // Store individual incomes (before clawback is applied in Step 5)
    yearData.income.user.cpp = userCpp;
    yearData.income.user.oas = userOas;
    yearData.income.user.gis = userGis;
    yearData.income.user.other = userOther;
    yearData.income.spouse.cpp = spouseCpp;
    yearData.income.spouse.oas = spouseOas;
    yearData.income.spouse.gis = spouseGis;
    yearData.income.spouse.other = spouseOther;

     // Calculate total *non-withdrawal* income for shortfall calculation
    yearData.income.total = userCpp + userOas + userGis + userOther + spouseCpp + spouseOas + spouseGis + spouseOther;
}


/** Step 5: Calculate Taxes (Individual then Combined) */
function step5_CalculateTaxes(yearData, scenario, settings, currentUnrealizedGains_NonReg_user, currentUnrealizedGains_NonReg_spouse) {
    const userAge = yearData.userAge;
    const spouseAge = yearData.spouseAge;
    const hasSpouse = scenario.spouse?.hasSpouse && spouseAge > 0;
    const baseYear = settings.baseYear || 2025;
    const currentYear = yearData.year;
    const yearsSinceBase = currentYear - baseYear;
    const colaMultiplier = Math.pow(1 + settings.cola, yearsSinceBase);

    const wd_user = yearData.withdrawals_user;
    const wd_spouse = yearData.withdrawals_spouse;
    let realizedNonRegGains_user = 0;
    let taxableNonRegGains_user = 0;
    let realizedNonRegGains_spouse = 0;
    let taxableNonRegGains_spouse = 0;

    const nonRegBalanceBeforeWithdrawal_user = (yearData.openingBalance_user.nonreg || 0) + (yearData.growth_user.nonreg || 0);
    if ((wd_user.nonreg || 0) > 0 && nonRegBalanceBeforeWithdrawal_user > 0) {
        const gainRatio = Math.max(0, Math.min(1, (currentUnrealizedGains_NonReg_user || 0) / nonRegBalanceBeforeWithdrawal_user));
        realizedNonRegGains_user = wd_user.nonreg * gainRatio;
        taxableNonRegGains_user = realizedNonRegGains_user * 0.50;
    }

     if (hasSpouse) {
         const nonRegBalanceBeforeWithdrawal_spouse = (yearData.openingBalance_spouse.nonreg || 0) + (yearData.growth_spouse.nonreg || 0);
         if ((wd_spouse.nonreg || 0) > 0 && nonRegBalanceBeforeWithdrawal_spouse > 0) {
             const gainRatio = Math.max(0, Math.min(1, (currentUnrealizedGains_NonReg_spouse || 0) / nonRegBalanceBeforeWithdrawal_spouse));
            realizedNonRegGains_spouse = wd_spouse.nonreg * gainRatio;
            taxableNonRegGains_spouse = realizedNonRegGains_spouse * 0.50;
        }
    }

    yearData.income.user.taxableNonRegGains = taxableNonRegGains_user;
    yearData.income.spouse.taxableNonRegGains = taxableNonRegGains_spouse;
    yearData.income.user.taxableWithdrawals = (wd_user.rrsp || 0) + (wd_user.lif || 0);
    yearData.income.spouse.taxableWithdrawals = (wd_spouse.rrsp || 0) + (wd_spouse.lif || 0);

    // Get OAS amounts calculated in Step 2 BEFORE clawback is applied
    const oasBeforeClawback_user = yearData.income.user.oas || 0; // Default to 0 if undefined
    const oasBeforeClawback_spouse = hasSpouse ? (yearData.income.spouse.oas || 0) : 0; // Default to 0

    // Net Income for Clawback calculation (excludes GIS)
    let netIncome_user =
        (yearData.income.user.cpp || 0) +
        oasBeforeClawback_user +
        (yearData.income.user.other || 0) +
        yearData.income.user.taxableWithdrawals +
        taxableNonRegGains_user;

    let netIncome_spouse = 0;
    if (hasSpouse) {
        netIncome_spouse =
            (yearData.income.spouse.cpp || 0) +
            oasBeforeClawback_spouse +
            (yearData.income.spouse.other || 0) +
            yearData.income.spouse.taxableWithdrawals +
            taxableNonRegGains_spouse;
    }

    const oasData = govBenefitsData.OAS;
    // Apply COLA to the base threshold
    const adjustedClawbackThreshold = (oasData.clawbackThreshold || 90997) * colaMultiplier;
    let oasClawback_user = 0;
    let oasClawback_spouse = 0; // Initialize here

     if (netIncome_user > adjustedClawbackThreshold) {
        const calculatedClawback = (netIncome_user - adjustedClawbackThreshold) * (oasData.clawbackRate || 0.15);
        oasClawback_user = Math.max(0, Math.min(oasBeforeClawback_user, calculatedClawback));
    }
    // Update final OAS received by user
    yearData.income.user.oas = Math.max(0, oasBeforeClawback_user - oasClawback_user);

     if (hasSpouse) {
         if (netIncome_spouse > adjustedClawbackThreshold) {
            const calculatedClawback = (netIncome_spouse - adjustedClawbackThreshold) * (oasData.clawbackRate || 0.15);
            oasClawback_spouse = Math.max(0, Math.min(oasBeforeClawback_spouse, calculatedClawback)); // Correct variable assignment
        }
         // Update final OAS received by spouse
         yearData.income.spouse.oas = Math.max(0, oasBeforeClawback_spouse - oasClawback_spouse);
    }

    // Taxable Income = Net Income - Deductions (like OAS Clawback)
    let taxableIncome_user = netIncome_user - oasClawback_user;
    taxableIncome_user = Math.max(0, taxableIncome_user);

    let taxableIncome_spouse = 0;
    if (hasSpouse) {
        taxableIncome_spouse = netIncome_spouse - oasClawback_spouse;
        taxableIncome_spouse = Math.max(0, taxableIncome_spouse);
    }

    const province = settings.province || 'ON';
    if (!taxData || !taxData.FED || !taxData[province]) {
        console.error(`Tax data missing for Federal or Province: ${province} in year ${currentYear}`);
        return { totalTax: 0, netIncomeForGis: netIncome_user + netIncome_spouse, realizedNonRegGains_user, realizedNonRegGains_spouse, tax_user: 0, tax_spouse: 0, taxableIncome_user, taxableIncome_spouse, oasClawback_user, oasClawback_spouse };
    }

    // Helper function to adjust brackets and credits with COLA
    const adjustBrackets = (brackets) => (brackets || []).map(b => ({
        ...b,
        upTo: b.upTo ? b.upTo * colaMultiplier : undefined,
        over: b.over ? b.over * colaMultiplier : undefined
    }));
     const adjustCredits = (credits, bpa) => ({
        bpa: (bpa || 0) * colaMultiplier,
        ageAmount: (credits?.ageAmount || 0) * colaMultiplier,
        ageAmountThreshold: (credits?.ageAmountThreshold || 42335) * colaMultiplier, // Example base
        pensionIncomeAmount: credits?.pensionIncomeAmount || 0
    });

    const adjustedFedBrackets = adjustBrackets(taxData.FED.brackets);
    const adjustedProvBrackets = adjustBrackets(taxData[province].brackets);
    const adjustedFedCredits = adjustCredits(taxData.FED.credits, taxData.FED.bpa);
    const adjustedProvCredits = adjustCredits(taxData[province].credits, taxData[province].bpa);

    // Calculate taxes individually
    const federalTax_user = calculateSingleTax(taxableIncome_user, userAge, adjustedFedBrackets, adjustedFedCredits, yearData.income.user, currentYear, province);
    const provincialTax_user = calculateSingleTax(taxableIncome_user, userAge, adjustedProvBrackets, adjustedProvCredits, yearData.income.user, currentYear, province);
    const tax_user = federalTax_user + provincialTax_user;

    let tax_spouse = 0;
    if (hasSpouse) {
        const federalTax_spouse = calculateSingleTax(taxableIncome_spouse, spouseAge, adjustedFedBrackets, adjustedFedCredits, yearData.income.spouse, currentYear, province);
        const provincialTax_spouse = calculateSingleTax(taxableIncome_spouse, spouseAge, adjustedProvBrackets, adjustedProvCredits, yearData.income.spouse, currentYear, province);
        tax_spouse = federalTax_spouse + provincialTax_spouse;
    }
    const totalTax = tax_user + tax_spouse; // Combine for household total

    // Net Income For GIS (includes GIS itself, OAS before clawback)
    const netIncomeForGis_user =
        (yearData.income.user.cpp || 0) +
        oasBeforeClawback_user +
        (yearData.income.user.gis || 0) + // Include GIS
        (yearData.income.user.other || 0) +
        yearData.income.user.taxableWithdrawals +
        taxableNonRegGains_user;
    let netIncomeForGis_spouse = 0;
     if (hasSpouse) {
         netIncomeForGis_spouse =
            (yearData.income.spouse.cpp || 0) +
            oasBeforeClawback_spouse +
            (yearData.income.spouse.gis || 0) + // Include GIS
            (yearData.income.spouse.other || 0) +
            yearData.income.spouse.taxableWithdrawals +
            taxableNonRegGains_spouse;
     }
    const netIncomeForGis = netIncomeForGis_user + netIncomeForGis_spouse;

    // Return all calculated tax components
    return {
        totalTax: totalTax,
        netIncomeForGis: netIncomeForGis,
        realizedNonRegGains_user: realizedNonRegGains_user,
        realizedNonRegGains_spouse: realizedNonRegGains_spouse,
        tax_user: tax_user,
        tax_spouse: tax_spouse,
        taxableIncome_user: taxableIncome_user,
        taxableIncome_spouse: taxableIncome_spouse,
        oasClawback_user: oasClawback_user,
        oasClawback_spouse: oasClawback_spouse
    };
}


/** Helper: Calculate single person's tax (Federal or Provincial) */
function calculateSingleTax(taxableIncome, age, adjustedBrackets, adjustedCredits, incomeDetails, currentYear, province) { // Added province for surtax check
    if (taxableIncome <= 0) return 0;
    let tax = 0;
    let lastLimit = 0;

    // Apply tax brackets
    for (const bracket of adjustedBrackets) {
        const upperLimit = bracket.upTo === undefined ? Infinity : bracket.upTo;
        const lowerLimit = lastLimit;
        if (taxableIncome > lowerLimit) {
            const taxableAmountInBracket = Math.min(taxableIncome, upperLimit) - lowerLimit;
             if (taxableAmountInBracket < 0) continue;
            tax += taxableAmountInBracket * bracket.rate;
        }
        if (taxableIncome <= upperLimit) break;
        lastLimit = upperLimit;
    }

    // Apply non-refundable tax credits
    let totalCreditBase = adjustedCredits.bpa || 0;
    if (age >= 65) {
        const ageAmountBase = adjustedCredits.ageAmount || 0;
        const ageAmountThreshold = adjustedCredits.ageAmountThreshold || Infinity;
        // Use Taxable Income as proxy for Net Income for reduction calculation
        const ageAmountReduction = Math.max(0, (taxableIncome - ageAmountThreshold) * 0.15);
        totalCreditBase += Math.max(0, ageAmountBase - ageAmountReduction);

        // Pension Income Amount - based on eligible pension income (RRIF/LIF withdrawals)
        const eligiblePensionIncome = incomeDetails?.taxableWithdrawals || 0;
        if (eligiblePensionIncome > 0) {
            const pensionIncomeCreditBase = Math.min(eligiblePensionIncome, (adjustedCredits.pensionIncomeAmount || 0));
            totalCreditBase += pensionIncomeCreditBase;
        }
    }
    // Add other potential credits here if needed (e.g., disability)

    const lowestTaxRate = adjustedBrackets.length > 0 && adjustedBrackets[0].rate ? adjustedBrackets[0].rate : 0.15; // Fallback
    const creditAmount = totalCreditBase * lowestTaxRate;
    tax = Math.max(0, tax - creditAmount); // Apply non-refundable credits

    // Apply Surtaxes (Example for Ontario)
    // Needs surtax thresholds and rates from data.js
    if (province === 'ON' && taxData.ON.surtax) {
        let surtax = 0;
        // Apply COLA to surtax thresholds (assuming same rate as general COLA for simplicity)
        const baseYear = 2025; // Define base year for surtax threshold reference
        const yearsSinceBaseSurtax = currentYear - baseYear;
        const colaMultiplierSurtax = Math.pow(1 + 0.025, yearsSinceBaseSurtax); // Use a fixed 2.5% or settings.cola? Let's use fixed for now.
        const surtaxThreshold1 = (taxData.ON.surtax.threshold1 || 5503) * colaMultiplierSurtax;
        const surtaxThreshold2 = (taxData.ON.surtax.threshold2 || 6980) * colaMultiplierSurtax;
        const surtaxRate1 = taxData.ON.surtax.rate1 || 0.20;
        const surtaxRate2 = taxData.ON.surtax.rate2 || 0.36;

         if (tax > surtaxThreshold1) {
            surtax += (Math.min(tax, surtaxThreshold2) - surtaxThreshold1) * surtaxRate1;
        }
        if (tax > surtaxThreshold2) {
            surtax += (tax - surtaxThreshold2) * surtaxRate2;
        }
        tax += surtax; // Add surtax to the provincial tax calculated so far
    }
    // Add other provincial specifics if needed (e.g., AB flat tax transition, BC credits)


    return tax;
}