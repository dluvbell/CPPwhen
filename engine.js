/**
 * @project     CPP Break-Even Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     1.8.1
 * @created     2025-10-20
 * @description Handles all core financial calculations for the simulator.
 */

// engine.js

/**
 * 특정 소득에 대한 세금을 계산하는 함수
 */
function calculateTax(income, age, taxBrackets, taxCredits) {
    if (income <= 0) return 0;
    let tax = 0;
    let lastLimit = 0;

    for (const bracket of taxBrackets) {
        const upperLimit = bracket.upTo || Infinity;
        if (income > upperLimit) {
            tax += (upperLimit - lastLimit) * bracket.rate;
        } else {
            tax += (income - lastLimit) * bracket.rate;
            break; 
        }
        lastLimit = upperLimit;
    }
    
    let totalCreditBase = taxCredits.bpa;
    if (age >= 65) totalCreditBase += taxCredits.ageAmount || 0;
    
    const creditAmount = totalCreditBase * taxBrackets[0].rate;
    tax = Math.max(0, tax - creditAmount);
    return tax;
}


/**
 * 특정 연도의 세후 CPP와 총 세후 소득을 계산하는 함수
 */
function calculateYearlyAfterTaxCpp(person, spouse, year, personCppStartAge, spouseCppStartAge, inputs) {
    const personAge = year - person.birthYear;
    const spouseAge = spouse.hasSpouse ? year - spouse.birthYear : 0;
    const baseYear = 2025;
    const yearsSinceBase = year - baseYear;
    const generalColaMultiplier = Math.pow(1 + inputs.cola / 100, yearsSinceBase);

    const adjustedOasClawbackThreshold = govBenefitsData.OAS.clawbackThreshold * generalColaMultiplier;
    const adjustedGisThreshold = (spouse.hasSpouse ? govBenefitsData.GIS.incomeThresholdCouple : 22440) * generalColaMultiplier;
    const adjustedMaxGis = govBenefitsData.GIS.maxPaymentPerPerson2025 * (spouse.hasSpouse ? 2 : 1) * generalColaMultiplier;
    const adjustedFedBpa = taxData.FED.bpa * generalColaMultiplier;
    const adjustedProvBpa = taxData[inputs.province].bpa * generalColaMultiplier;
    const adjustedFedBrackets = taxData.FED.brackets.map(b => ({ ...b, upTo: b.upTo ? b.upTo * generalColaMultiplier : undefined }));
    const adjustedProvBrackets = taxData[inputs.province].brackets.map(b => ({ ...b, upTo: b.upTo ? b.upTo * generalColaMultiplier : undefined }));

    let personCppPayment = 0;
    if (personAge >= personCppStartAge) {
        const monthsDiff = (personCppStartAge - 65) * 12;
        const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007;
        const baseCpp = person.cppAt65 * (1 + adjustment);
        const yearsSinceStart = year - (person.birthYear + personCppStartAge);
        personCppPayment = baseCpp * Math.pow(1 + inputs.cola / 100, yearsSinceStart);
    }
    let spouseCppPayment = 0;
    if (spouse.hasSpouse && spouseAge >= spouseCppStartAge) {
        const monthsDiff = (spouseCppStartAge - 65) * 12;
        const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007;
        const baseCpp = spouse.cppAt65 * (1 + adjustment);
        const yearsSinceStart = year - (spouse.birthYear + spouseCppStartAge);
        spouseCppPayment = baseCpp * Math.pow(1 + inputs.cola / 100, yearsSinceStart);
    }
    const householdPreTaxCpp = personCppPayment + spouseCppPayment;

    let personOtherIncome = 0;
    const currentYear = new Date().getFullYear();
    person.otherIncomes.forEach(income => {
        if (personAge >= income.startAge && personAge <= income.endAge) {
            const yearsToStart = (person.birthYear + income.startAge) - currentYear;
            const baseAmountAtStart = income.amount * Math.pow(1 + inputs.cola / 100, yearsToStart > 0 ? yearsToStart : 0);
            const yearsSinceStart = year - (person.birthYear + income.startAge);
            personOtherIncome += baseAmountAtStart * Math.pow(1 + inputs.cola / 100, yearsSinceStart);
        }
    });
    let spouseOtherIncome = 0;

    const personOas = (personAge >= 65) ? govBenefitsData.OAS.maxPayment2025 * generalColaMultiplier : 0;
    const spouseOas = (spouse.hasSpouse && spouseAge >= 65) ? govBenefitsData.OAS.maxPayment2025 * generalColaMultiplier : 0;

    const incomeForGis = personOtherIncome + spouseOtherIncome + householdPreTaxCpp + personOas + spouseOas;
    let householdGis = 0;
    if (personAge >= 65 && (!spouse.hasSpouse || spouseAge >= 65)) {
        if (incomeForGis < adjustedGisThreshold) {
            const gisReduction = incomeForGis * govBenefitsData.GIS.reductionRate;
            householdGis = Math.max(0, adjustedMaxGis - gisReduction);
        }
    }
    const personGis = spouse.hasSpouse ? householdGis / 2 : householdGis;
    const spouseGis = spouse.hasSpouse ? householdGis / 2 : 0;
    
    let personPreTaxTotal = personCppPayment + personOtherIncome + personGis + personOas;
    let spousePreTaxTotal = spouseCppPayment + spouseOtherIncome + spouseGis + spouseOas;
    
    if (personAge >= 65 && personPreTaxTotal > adjustedOasClawbackThreshold) {
        const clawback = (personPreTaxTotal - adjustedOasClawbackThreshold) * govBenefitsData.OAS.clawbackRate;
        personPreTaxTotal -= Math.min(personOas, clawback);
    }
    if (spouse.hasSpouse && spouseAge >= 65 && spousePreTaxTotal > adjustedOasClawbackThreshold) {
        const clawback = (spousePreTaxTotal - adjustedOasClawbackThreshold) * govBenefitsData.OAS.clawbackRate;
        spousePreTaxTotal -= Math.min(spouseOas, clawback);
    }
    
    const fedTaxCredits = { bpa: adjustedFedBpa, ...taxData.FED.credits };
    const provTaxCredits = { bpa: adjustedProvBpa, ...taxData[inputs.province].credits };

    const personTaxWithCpp = calculateTax(personPreTaxTotal, personAge, adjustedProvBrackets, provTaxCredits) + calculateTax(personPreTaxTotal, personAge, adjustedFedBrackets, fedTaxCredits);
    const spouseTaxWithCpp = spouse.hasSpouse ? calculateTax(spousePreTaxTotal, spouseAge, adjustedProvBrackets, provTaxCredits) + calculateTax(spousePreTaxTotal, spouseAge, adjustedFedBrackets, fedTaxCredits) : 0;
    const householdTaxWithCpp = personTaxWithCpp + spouseTaxWithCpp;

    const personIncomeWithoutCpp = personPreTaxTotal - personCppPayment;
    const spouseIncomeWithoutCpp = spousePreTaxTotal - spouseCppPayment;
    const personTaxWithoutCpp = calculateTax(personIncomeWithoutCpp, personAge, adjustedProvBrackets, provTaxCredits) + calculateTax(personIncomeWithoutCpp, personAge, adjustedFedBrackets, fedTaxCredits);
    const spouseTaxWithoutCpp = spouse.hasSpouse ? calculateTax(spouseIncomeWithoutCpp, spouseAge, adjustedProvBrackets, provTaxCredits) + calculateTax(spouseIncomeWithoutCpp, spouseAge, adjustedFedBrackets, fedTaxCredits) : 0;
    const householdTaxWithoutCpp = personTaxWithoutCpp + spouseTaxWithoutCpp;

    const taxOnCpp = householdTaxWithCpp - householdTaxWithoutCpp;
    const householdAfterTaxCpp = householdPreTaxCpp - taxOnCpp;

    const totalAfterTaxIncome = (personPreTaxTotal + spousePreTaxTotal) - householdTaxWithCpp;
    
    return { householdAfterTaxCpp, totalAfterTaxIncome };
}

/**
 * 손익분기점을 계산하는 메인 함수
 */
function runDeterministicBreakEven(baseAge, comparisonAge, inputs) {
    const earlyAge = Math.min(baseAge, comparisonAge);
    const lateAge = Math.max(baseAge, comparisonAge);
    const investmentReturn = inputs.investmentReturn / 100;
    const earlyCppInvestmentRate = inputs.earlyCppInvestmentRate / 100;

    let simple_target = 0;
    for (let age = earlyAge; age < lateAge; age++) {
        const year = inputs.user.birthYear + age;
        const result = calculateYearlyAfterTaxCpp(inputs.user, inputs.spouse, year, earlyAge, earlyAge, inputs);
        if (result && typeof result.householdAfterTaxCpp === 'number') {
            const investableAmount = result.householdAfterTaxCpp * earlyCppInvestmentRate;
            simple_target = simple_target * (1 + investmentReturn) + investableAmount;
        }
    }

    let detailedData = [];
    let totalAfterTaxIncomeBase = 0;
    let totalAfterTaxIncomeComparison = 0;
    
    let earlyStartPot_FV = 0;
    let lateStartPot_FV = 0;
    let simple_cumulativeDifference = 0;
    
    let breakEvenAge = -1;

    for (let age = earlyAge; age <= inputs.lifeExpectancy; age++) {
        const year = inputs.user.birthYear + age;

        earlyStartPot_FV *= (1 + investmentReturn);
        lateStartPot_FV *= (1 + investmentReturn);

        const earlyResult = calculateYearlyAfterTaxCpp(inputs.user, inputs.spouse, year, earlyAge, earlyAge, inputs);
        totalAfterTaxIncomeBase += earlyResult.totalAfterTaxIncome || 0;
        
        const lateResult = (age >= lateAge) 
            ? calculateYearlyAfterTaxCpp(inputs.user, inputs.spouse, year, lateAge, lateAge, inputs)
            : { householdAfterTaxCpp: 0, totalAfterTaxIncome: (earlyResult.totalAfterTaxIncome || 0) - (earlyResult.householdAfterTaxCpp || 0) };
        totalAfterTaxIncomeComparison += lateResult.totalAfterTaxIncome || 0;
        
        const annualCppDifference = (lateResult.householdAfterTaxCpp || 0) - (earlyResult.householdAfterTaxCpp || 0);
        
        if (age < lateAge) {
            const investableAmount = (earlyResult.householdAfterTaxCpp || 0) * earlyCppInvestmentRate;
            earlyStartPot_FV += investableAmount;
        } else {
            lateStartPot_FV += annualCppDifference;
            simple_cumulativeDifference += annualCppDifference;
        }

        if (breakEvenAge === -1 && age >= lateAge && lateStartPot_FV >= earlyStartPot_FV) {
            const prevLateStartPot_FV = (lateStartPot_FV - annualCppDifference) / (1 + investmentReturn);
            const prevEarlyStartPot_FV = earlyStartPot_FV / (1 + investmentReturn);
            const gapAtStartOfYear = prevEarlyStartPot_FV - prevLateStartPot_FV;
            const gainDuringYear = (lateStartPot_FV - prevLateStartPot_FV) - (earlyStartPot_FV - prevEarlyStartPot_FV);
            const fractionOfYear = gainDuringYear > 0 ? gapAtStartOfYear / gainDuringYear : 0;
            breakEvenAge = (age - 1) + fractionOfYear;
        }

        detailedData.push({
            age: age,
            earlyPotValue: earlyStartPot_FV,
            latePotValue: lateStartPot_FV,
            simple_target: simple_target,
            simple_cumulativeDifference: simple_cumulativeDifference
        });
    }
    
    const finalEstateValueDifference = lateStartPot_FV - earlyStartPot_FV;

    return {
        breakEvenAge: breakEvenAge === -1 ? -1 : Math.round(breakEvenAge * 10) / 10,
        details: detailedData,
        totalAfterTaxIncomeBase,
        totalAfterTaxIncomeComparison,
        finalEstateValueDifference
    };
}
