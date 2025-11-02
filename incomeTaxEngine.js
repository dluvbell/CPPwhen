/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     4.2.0 (Bugfix: Correct Pension Income Amount logic to apply >= age 65)
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
    const colaMultiplier = Math.pow(1 + settings.cola, yearsSinceBase); // General COLA for Gov benefits, thresholds

    // --- User Income ---
    let userCpp = 0, userOas = 0, userGis = 0, userOther = 0;
    // Calculate CPP (uses global COLA applied from start year)
    if (scenario.user && userAge >= scenario.user.cppStartAge) {
        const monthsDiff = (scenario.user.cppStartAge - 65) * 12;
        const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007;
        const baseCpp = (scenario.user.cppAt65 || 0) * (1 + adjustment);
        const cppStartYear = userBirthYear + (scenario.user.cppStartAge || 65);
        const yearsSinceCppStart = Math.max(0, currentYear - cppStartYear);
        userCpp = baseCpp * Math.pow(1 + settings.cola, yearsSinceCppStart); // CPP uses global COLA
    }
    // Calculate OAS (uses global COLA applied from base year)
     const oasBasePayment = govBenefitsData.OAS.maxPayment2025 || 8881;
    if (scenario.user && userAge >= scenario.user.oasStartAge) {
         const deferralMonths = Math.max(0, (scenario.user.oasStartAge - 65) * 12);
         const deferralBonus = deferralMonths * 0.006;
         const baseOas = oasBasePayment * (1 + deferralBonus);
        userOas = baseOas * colaMultiplier; // OAS uses global COLA
        if (userAge >= 75) userOas *= 1.10;
    }

    // *** MODIFICATION START v4.0.0: Process 'otherIncomes' using individual COLA ***
    // Process user-owned items from the combined list
    (scenario.user?.otherIncomes || []).forEach(item => {
        // Only process items marked as 'income' (or default if 'type' is missing for older data)
        if ((item.type === 'income' || item.type === undefined) && userAge >= item.startAge && userAge <= item.endAge) {
             const itemStartYear = userBirthYear + (item.startAge || 0);
             // Years from baseYear to the year the income starts
             const yearsFromBaseToStart = Math.max(0, itemStartYear - baseYear);
             // Individual COLA rate for this income item
             const itemColaRate = (typeof item.cola === 'number') ? item.cola : 0; // Default 0%
             // Years elapsed since the income started
             const yearsSinceItemStart = Math.max(0, currentYear - itemStartYear);

             // Calculate the income amount for the current year:
             // 1. Inflate the PV amount from baseYear to itemStartYear using GLOBAL COLA
             const baseAmountAtStartYear = (item.amount || 0) * Math.pow(1 + settings.cola, yearsFromBaseToStart);
             // 2. Inflate from itemStartYear to currentYear using the item's INDIVIDUAL COLA
             const currentYearIncomeAmount = baseAmountAtStartYear * Math.pow(1 + itemColaRate, yearsSinceItemStart);

             userOther += currentYearIncomeAmount;
        }
    });
    // *** MODIFICATION END v4.0.0 ***

     // --- Spouse Income (if applicable) ---
    let spouseCpp = 0, spouseOas = 0, spouseGis = 0, spouseOther = 0;
    if (scenario.spouse?.hasSpouse && scenario.spouse.data && spouseAge > 0) {
        const spouse = scenario.spouse.data;
        // Calculate Spouse CPP (uses global COLA applied from start year)
        if (spouseAge >= spouse.cppStartAge) {
             const monthsDiff = (spouse.cppStartAge - 65) * 12;
             const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007;
             const baseCpp = (spouse.cppAt65 || 0) * (1 + adjustment);
             const cppStartYear = spouseBirthYear + (spouse.cppStartAge || 65);
             const yearsSinceCppStart = Math.max(0, currentYear - cppStartYear);
            spouseCpp = baseCpp * Math.pow(1 + settings.cola, yearsSinceCppStart); // CPP uses global COLA
        }
        // Calculate Spouse OAS (uses global COLA applied from base year)
         if (spouseAge >= spouse.oasStartAge) {
            const deferralMonths = Math.max(0, (spouse.oasStartAge - 65) * 12);
            const deferralBonus = deferralMonths * 0.006;
            const baseOas = oasBasePayment * (1 + deferralBonus);
            spouseOas = baseOas * colaMultiplier; // OAS uses global COLA
            if (spouseAge >= 75) spouseOas *= 1.10;
        }

        // *** MODIFICATION START v4.0.0: Process spouse's 'otherIncomes' using individual COLA ***
         // Process spouse-owned items from the combined list
        (spouse.otherIncomes || []).forEach(item => {
             // Only process items marked as 'income' (or default)
             if ((item.type === 'income' || item.type === undefined) && spouseAge >= item.startAge && spouseAge <= item.endAge) {
                 const itemStartYear = spouseBirthYear + (item.startAge || 0);
                 const yearsFromBaseToStart = Math.max(0, itemStartYear - baseYear);
                 const itemColaRate = (typeof item.cola === 'number') ? item.cola : 0;
                 const yearsSinceItemStart = Math.max(0, currentYear - itemStartYear);
                 const baseAmountAtStartYear = (item.amount || 0) * Math.pow(1 + settings.cola, yearsFromBaseToStart);
                 const currentYearIncomeAmount = baseAmountAtStartYear * Math.pow(1 + itemColaRate, yearsSinceItemStart);
                 spouseOther += currentYearIncomeAmount;
            }
        });
         // *** MODIFICATION END v4.0.0 ***
    }

    // --- GIS Calculation (Household based on last year's income) ---
    // GIS calculation itself still uses global COLA for thresholds/max payments
    const isGisEligibleUser = userAge >= 65;
    const isGisEligibleSpouse = scenario.spouse?.hasSpouse && spouseAge >= 65;
    const isCoupleGisEligible = isGisEligibleUser && isGisEligibleSpouse;
    const isSingleGisEligible = isGisEligibleUser && (!scenario.spouse?.hasSpouse || (scenario.spouse?.hasSpouse && spouseAge < 65));

     if (isCoupleGisEligible || isSingleGisEligible) {
         const gisData = govBenefitsData.GIS;
         const incomeForGis = lastYearNetIncomeForGis; // Use combined income from previous year

         let incomeThreshold, maxGisPaymentTotal, exemption;
         if (isCoupleGisEligible) {
             incomeThreshold = (gisData.incomeThresholdCouple || 29616) * colaMultiplier; // Global COLA
             maxGisPaymentTotal = (gisData.maxPaymentCoupleTotal || 15970) * colaMultiplier; // Global COLA
             exemption = (gisData.exemptionCouple || gisData.exemption || 5000) * colaMultiplier; // Global COLA
         } else { // Single or User eligible, Spouse not
             incomeThreshold = (gisData.incomeThresholdSingle || 21624) * colaMultiplier; // Global COLA
             maxGisPaymentTotal = (gisData.maxPaymentSingle || 13083) * colaMultiplier; // Global COLA
             exemption = (gisData.exemptionSingle || gisData.exemption || 5000) * colaMultiplier; // Global COLA
         }

         if (incomeForGis < incomeThreshold) {
             const incomeSubjectToReduction = Math.max(0, incomeForGis - exemption);
             const gisReduction = incomeSubjectToReduction * (gisData.reductionRate || 0.5);
             const householdGis = Math.max(0, maxGisPaymentTotal - gisReduction);

            if (isCoupleGisEligible) {
                userGis = householdGis / 2;
                spouseGis = householdGis / 2;
            } else { // Single eligible user
                userGis = householdGis;
                spouseGis = 0;
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

     // Calculate total *non-withdrawal* income for shortfall calculation in Step 3
    yearData.income.total = userCpp + userOas + userGis + userOther + spouseCpp + spouseOas + spouseGis + spouseOther;
}


/** Step 5: Calculate Taxes (Individual then Combined) */
function step5_CalculateTaxes(yearData, scenario, settings, currentUnrealizedGains_NonReg_user, currentUnrealizedGains_NonReg_spouse, pensionTransfer_user = 0, pensionTransfer_spouse = 0) {
    const userAge = yearData.userAge;
    const spouseAge = yearData.spouseAge;
    const hasSpouse = scenario.spouse?.hasSpouse && spouseAge > 0;
    const baseYear = settings.baseYear || 2025;
    const currentYear = yearData.year;
    const yearsSinceBase = currentYear - baseYear;
    const colaMultiplier = Math.pow(1 + settings.cola, yearsSinceBase); // Global COLA for tax brackets, credits, thresholds

    const wd_user = yearData.withdrawals_user;
    const wd_spouse = yearData.withdrawals_spouse;
    let realizedNonRegGains_user = 0;
    let taxableNonRegGains_user = 0;
    let realizedNonRegGains_spouse = 0;
    let taxableNonRegGains_spouse = 0;

    // Calculate Capital Gains from NonReg Withdrawals
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
    // Add these to income details for tax calculation
    yearData.income.user.taxableNonRegGains = taxableNonRegGains_user;
    yearData.income.spouse.taxableNonRegGains = taxableNonRegGains_spouse;
    yearData.income.user.taxableWithdrawals = (wd_user.rrsp || 0) + (wd_user.lif || 0);
    yearData.income.spouse.taxableWithdrawals = (wd_spouse.rrsp || 0) + (wd_spouse.lif || 0);

    // Calculate OAS Clawback
    const oasBeforeClawback_user = yearData.income.user.oas || 0;
    const oasBeforeClawback_spouse = hasSpouse ? (yearData.income.spouse.oas || 0) : 0;

    // Net Income for Clawback (excludes GIS, includes OAS before clawback)
    let netIncome_user_clawback =
        (yearData.income.user.cpp || 0) + oasBeforeClawback_user + (yearData.income.user.other || 0) +
        yearData.income.user.taxableWithdrawals + taxableNonRegGains_user;
    let netIncome_spouse_clawback = 0;
    if (hasSpouse) {
        netIncome_spouse_clawback =
            (yearData.income.spouse.cpp || 0) + oasBeforeClawback_spouse + (yearData.income.spouse.other || 0) +
            yearData.income.spouse.taxableWithdrawals + taxableNonRegGains_spouse;
    }
    // Apply pension split to net incomes used for clawback
    const pensionReceived_user = pensionTransfer_spouse;
    const pensionReceived_spouse = pensionTransfer_user;
    netIncome_user_clawback = netIncome_user_clawback - pensionTransfer_user + pensionReceived_user;
    if (hasSpouse) {
        netIncome_spouse_clawback = netIncome_spouse_clawback - pensionTransfer_spouse + pensionReceived_spouse;
    }

    const oasData = govBenefitsData.OAS;
    const adjustedClawbackThreshold = (oasData.clawbackThreshold || 90997) * colaMultiplier; // Global COLA
    let oasClawback_user = 0;
    let oasClawback_spouse = 0;
     if (netIncome_user_clawback > adjustedClawbackThreshold) {
        oasClawback_user = Math.max(0, Math.min(oasBeforeClawback_user, (netIncome_user_clawback - adjustedClawbackThreshold) * (oasData.clawbackRate || 0.15)));
    }
     if (hasSpouse && netIncome_spouse_clawback > adjustedClawbackThreshold) {
        oasClawback_spouse = Math.max(0, Math.min(oasBeforeClawback_spouse, (netIncome_spouse_clawback - adjustedClawbackThreshold) * (oasData.clawbackRate || 0.15)));
    }
    // Update final OAS received
    yearData.income.user.oas = Math.max(0, oasBeforeClawback_user - oasClawback_user);
    if(hasSpouse) yearData.income.spouse.oas = Math.max(0, oasBeforeClawback_spouse - oasClawback_spouse);

    // Calculate Taxable Income (Net Income - Deductions like OAS Clawback)
    // Note: Net Income for Tax purposes includes the *final* OAS amount (after clawback) and excludes GIS.
    let netIncome_user_tax =
        (yearData.income.user.cpp || 0) + yearData.income.user.oas + (yearData.income.user.other || 0) + // Use OAS *after* clawback
        yearData.income.user.taxableWithdrawals + taxableNonRegGains_user;
    let netIncome_spouse_tax = 0;
     if (hasSpouse) {
         netIncome_spouse_tax =
            (yearData.income.spouse.cpp || 0) + yearData.income.spouse.oas + (yearData.income.spouse.other || 0) + // Use OAS *after* clawback
            yearData.income.spouse.taxableWithdrawals + taxableNonRegGains_spouse;
     }
    // Apply pension split again for taxable income calc (redundant but explicit)
    netIncome_user_tax = netIncome_user_tax - pensionTransfer_user + pensionReceived_user;
    if(hasSpouse) netIncome_spouse_tax = netIncome_spouse_tax - pensionTransfer_spouse + pensionReceived_spouse;

    // Taxable income might have other deductions, but for simplicity:
    let taxableIncome_user = Math.max(0, netIncome_user_tax);
    let taxableIncome_spouse = Math.max(0, netIncome_spouse_tax);


    // Calculate Taxes Individually
    const province = settings.province || 'ON';
    if (!taxData || !taxData.FED || !taxData[province]) {
        console.error(`Tax data missing for Federal or Province: ${province} in year ${currentYear}`);
        return { totalTax: 0, netIncomeForGis: 0, realizedNonRegGains_user, realizedNonRegGains_spouse, tax_user: 0, tax_spouse: 0, taxableIncome_user, taxableIncome_spouse, oasClawback_user, oasClawback_spouse };
    }

    const adjustBrackets = (brackets) => (brackets || []).map(b => ({
        ...b,
        upTo: b.upTo ? b.upTo * colaMultiplier : undefined, // Global COLA
        over: b.over ? b.over * colaMultiplier : undefined // Global COLA
    }));
     const adjustCredits = (credits, bpa) => ({
        bpa: (bpa || 0) * colaMultiplier, // Global COLA
        ageAmount: (credits?.ageAmount || 0) * colaMultiplier, // Global COLA
        ageAmountThreshold: (credits?.ageAmountThreshold || 42335) * colaMultiplier, // Global COLA
        pensionIncomeAmount: credits?.pensionIncomeAmount || 0, // Base amount doesn't inflate? Check rules. Assuming not for now.
        medicalExpenseThresholdLimit: (credits?.medicalExpenseThresholdLimit || 2830) * colaMultiplier // *** 신규 추가 (v4.1.0) ***
    });

    const adjustedFedBrackets = adjustBrackets(taxData.FED.brackets);
    const adjustedProvBrackets = adjustBrackets(taxData[province].brackets);
    const adjustedFedCredits = adjustCredits(taxData.FED.credits, taxData.FED.bpa);
    const adjustedProvCredits = adjustCredits(taxData[province].credits, taxData[province].bpa);

    // Pass pension received for pension income credit calculation
    // *** MODIFICATION (v4.1.0): Pass medical expenses and threshold ***
    const federalTax_user = calculateSingleTax(taxableIncome_user, userAge, adjustedFedBrackets, adjustedFedCredits, yearData.income.user, currentYear, province, settings, pensionReceived_user, yearData.medicalExpenses_user, adjustedFedCredits.medicalExpenseThresholdLimit);
    const provincialTax_user = calculateSingleTax(taxableIncome_user, userAge, adjustedProvBrackets, adjustedProvCredits, yearData.income.user, currentYear, province, settings, pensionReceived_user, yearData.medicalExpenses_user, adjustedProvCredits.medicalExpenseThresholdLimit);
    const tax_user = federalTax_user + provincialTax_user;

    let tax_spouse = 0;
    if (hasSpouse) {
        const federalTax_spouse = calculateSingleTax(taxableIncome_spouse, spouseAge, adjustedFedBrackets, adjustedFedCredits, yearData.income.spouse, currentYear, province, settings, pensionReceived_spouse, yearData.medicalExpenses_spouse, adjustedFedCredits.medicalExpenseThresholdLimit);
        const provincialTax_spouse = calculateSingleTax(taxableIncome_spouse, spouseAge, adjustedProvBrackets, adjustedProvCredits, yearData.income.spouse, currentYear, province, settings, pensionReceived_spouse, yearData.medicalExpenses_spouse, adjustedProvCredits.medicalExpenseThresholdLimit);
        tax_spouse = federalTax_spouse + provincialTax_spouse;
    }
    const totalTax = tax_user + tax_spouse;

    // Calculate Net Income For GIS (Used for NEXT year's GIS)
    // Includes taxable income sources, OAS *before* clawback, but excludes GIS received this year.
    // Basically netIncome_user_clawback/netIncome_spouse_clawback from above.
    const netIncomeForGis = netIncome_user_clawback + netIncome_spouse_clawback;


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
// *** MODIFICATION (v4.1.0): Add medical expense arguments ***
function calculateSingleTax(taxableIncome, age, adjustedBrackets, adjustedCredits, incomeDetails, currentYear, province, settings, pensionIncomeReceived = 0, totalMedicalExpenses = 0, medicalExpenseThresholdLimit = Infinity) {
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
        // Use net income before deductions (approximated by taxable income here) for reduction calc
        const ageAmountReduction = Math.max(0, (taxableIncome - ageAmountThreshold) * 0.15);
        totalCreditBase += Math.max(0, ageAmountBase - ageAmountReduction);

        // *** MODIFICATION START v4.2.0: Move Pension Income Amount logic inside age >= 65 check ***
        // Pension Income Amount - based on eligible income (taxable withdrawals + received split income)
        // RRIF/LIF withdrawals are only eligible pension income if age >= 65.
        const eligiblePensionIncome = (incomeDetails?.taxableWithdrawals || 0) + pensionIncomeReceived;
        if (eligiblePensionIncome > 0) {
            // Pension Income Amount base itself doesn't inflate with COLA
            const pensionIncomeCreditBase = Math.min(eligiblePensionIncome, (adjustedCredits.pensionIncomeAmount || 0)); 
            totalCreditBase += pensionIncomeCreditBase;
        }
        // *** MODIFICATION END v4.2.0 ***
    }

    // *** 신규 추가 (v4.1.0): 의료비 세액 공제 (METC) 계산 ***
    if (totalMedicalExpenses > 0) {
        // 순소득(taxableIncome)의 3%와 연간 한도액(COLA 적용됨) 중 *낮은* 금액을 계산
        const incomeThreshold = Math.min(taxableIncome * 0.03, medicalExpenseThresholdLimit);
        // 총 의료비가 위 한도액을 초과하는 금액만 공제 대상
        const medicalCreditBase = Math.max(0, totalMedicalExpenses - incomeThreshold);
        totalCreditBase += medicalCreditBase;
    }

    const lowestTaxRate = adjustedBrackets.length > 0 && adjustedBrackets[0].rate ? adjustedBrackets[0].rate : 0.15;
    const creditAmount = totalCreditBase * lowestTaxRate;
    tax = Math.max(0, tax - creditAmount);

    // Apply Surtaxes (Example for Ontario)
    if (province === 'ON' && taxData.ON.surtax) {
        let surtax = 0;
        const baseYearSurtax = 2025; // Surtax thresholds likely indexed from a specific year
        const yearsSinceBaseSurtax = currentYear - baseYearSurtax;
        const colaMultiplierSurtax = Math.pow(1 + (settings?.cola || 0.025), yearsSinceBaseSurtax); // Global COLA

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
        tax += surtax;
    }

    return tax;
}