/**
 * @project     CPP Break-Even Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     1.3.0
 * @created     2025-10-19
 * @description Handles all core financial calculations for the simulator.
 */

// engine.js

/**
 * 특정 소득에 대한 세금을 계산하는 함수 (최종 수정 버전)
 */
function calculateTax(income, age, taxBrackets, taxCredits) {
    if (income <= 0) return 0;

    let tax = 0;
    let lastLimit = 0;

    // 1. 소득 구간별 세금 계산
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

    // 2. 비환급성 세액 공제 계산
    let totalCreditBase = taxCredits.bpa;
    if (age >= 65) totalCreditBase += taxCredits.ageAmount || 0;
    // 연금 소득 공제 (pension income credit)는 더 정확한 계산을 위해 실제 연금 소득을 별도로 받아야 하지만, 여기서는 단순화하여 포함하지 않음
    
    const creditAmount = totalCreditBase * taxBrackets[0].rate;
    
    tax = Math.max(0, tax - creditAmount);
    return tax;
}


/**
 * 특정 연도의 최종 세후 소득과 '평균 세율이 적용된 세후 CPP'를 계산하는 핵심 함수
 */
function calculateYearlyIncome(person, spouse, year, personCppStartAge, spouseCppStartAge, inputs) {
    const personAge = year - person.birthYear;
    const spouseAge = spouse.hasSpouse ? year - spouse.birthYear : 0;
    const currentYear = new Date().getFullYear();
    const baseYear = 2025; // 데이터 기준 연도
    const yearsSinceBase = year - baseYear;
    const generalColaMultiplier = Math.pow(1 + inputs.cola / 100, yearsSinceBase);

    // --- 1. COLA가 적용된 연간 기준액 계산 ---
    const adjustedOasClawbackThreshold = govBenefitsData.OAS.clawbackThreshold * generalColaMultiplier;
    const adjustedGisThreshold = (spouse.hasSpouse ? govBenefitsData.GIS.incomeThresholdCouple : 22440) * generalColaMultiplier;
    const adjustedMaxGis = govBenefitsData.GIS.maxPaymentPerPerson2025 * (spouse.hasSpouse ? 2 : 1) * generalColaMultiplier;
    const adjustedFedBpa = taxData.FED.bpa * generalColaMultiplier;
    const adjustedProvBpa = taxData[inputs.province].bpa * generalColaMultiplier;
    const adjustedFedBrackets = taxData.FED.brackets.map(b => ({ ...b, upTo: b.upTo ? b.upTo * generalColaMultiplier : undefined }));
    const adjustedProvBrackets = taxData[inputs.province].brackets.map(b => ({ ...b, upTo: b.upTo ? b.upTo * generalColaMultiplier : undefined }));

    // --- 2. 모든 세전 소득 항목 계산 ---
    let personCppPayment = 0;
    if (personAge >= personCppStartAge) {
        const monthsDiff = (personCppStartAge - 65) * 12;
        const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007; // 올바른 공식
        const baseCpp = person.cppAt65 * (1 + adjustment);
        const yearsSinceStart = year - (person.birthYear + personCppStartAge);
        personCppPayment = baseCpp * Math.pow(1 + inputs.cola / 100, yearsSinceStart);
    }
    let spouseCppPayment = 0;
    if (spouse.hasSpouse && spouseAge >= spouseCppStartAge) {
        const monthsDiff = (spouseCppStartAge - 65) * 12;
        const adjustment = monthsDiff < 0 ? monthsDiff * 0.006 : monthsDiff * 0.007; // 올바른 공식
        const baseCpp = spouse.cppAt65 * (1 + adjustment);
        const yearsSinceStart = year - (spouse.birthYear + spouseCppStartAge);
        spouseCppPayment = baseCpp * Math.pow(1 + inputs.cola / 100, yearsSinceStart);
    }
    const householdPreTaxCpp = personCppPayment + spouseCppPayment;

    let personOtherIncome = 0;
    person.otherIncomes.forEach(income => {
        if (personAge >= income.startAge && personAge <= income.endAge) {
            const yearsToStart = (person.birthYear + income.startAge) - currentYear;
            const baseAmountAtStart = income.amount * Math.pow(1 + inputs.cola / 100, yearsToStart > 0 ? yearsToStart : 0);
            const yearsSinceStart = year - (person.birthYear + income.startAge);
            personOtherIncome += baseAmountAtStart * Math.pow(1 + inputs.cola / 100, yearsSinceStart);
        }
    });
    let spouseOtherIncome = 0;

    // [수정 1] OAS를 GIS 계산 전에 먼저 계산합니다 (COLA 오류 수정 포함)
    const personOas = (personAge >= 65) ? govBenefitsData.OAS.maxPayment2025 * generalColaMultiplier : 0;
    const spouseOas = (spouse.hasSpouse && spouseAge >= 65) ? govBenefitsData.OAS.maxPayment2025 * generalColaMultiplier : 0;

    // [수정 2] incomeForGis에 OAS를 포함시킵니다.
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
    
    // OAS Clawback 계산
    if (personAge >= 65 && personPreTaxTotal > adjustedOasClawbackThreshold) {
        const clawback = (personPreTaxTotal - adjustedOasClawbackThreshold) * govBenefitsData.OAS.clawbackRate;
        personPreTaxTotal -= Math.min(personOas, clawback);
    }
    if (spouse.hasSpouse && spouseAge >= 65 && spousePreTaxTotal > adjustedOasClawbackThreshold) {
        const clawback = (spousePreTaxTotal - adjustedOasClawbackThreshold) * govBenefitsData.OAS.clawbackRate;
        spousePreTaxTotal -= Math.min(spouseOas, clawback);
    }
    
    // [수정 3] '세후 CPP' 계산 로직을 한계세율 방식으로 전면 교체
    const fedTaxCredits = { bpa: adjustedFedBpa, ...taxData.FED.credits };
    const provTaxCredits = { bpa: adjustedProvBpa, ...taxData[inputs.province].credits };

    // 1. CPP를 포함한 전체 소득에 대한 세금 계산
    const personTaxWithCpp = calculateTax(personPreTaxTotal, personAge, adjustedProvBrackets, provTaxCredits) + calculateTax(personPreTaxTotal, personAge, adjustedFedBrackets, fedTaxCredits);
    const spouseTaxWithCpp = spouse.hasSpouse ? calculateTax(spousePreTaxTotal, spouseAge, adjustedProvBrackets, provTaxCredits) + calculateTax(spousePreTaxTotal, spouseAge, adjustedFedBrackets, fedTaxCredits) : 0;
    const householdTaxWithCpp = personTaxWithCpp + spouseTaxWithCpp;

    // 2. CPP를 제외한 소득에 대한 세금 계산
    const personIncomeWithoutCpp = personPreTaxTotal - personCppPayment;
    const spouseIncomeWithoutCpp = spousePreTaxTotal - spouseCppPayment;

    const personTaxWithoutCpp = calculateTax(personIncomeWithoutCpp, personAge, adjustedProvBrackets, provTaxCredits) + calculateTax(personIncomeWithoutCpp, personAge, adjustedFedBrackets, fedTaxCredits);
    const spouseTaxWithoutCpp = spouse.hasSpouse ? calculateTax(spouseIncomeWithoutCpp, spouseAge, adjustedProvBrackets, provTaxCredits) + calculateTax(spouseIncomeWithoutCpp, spouseAge, adjustedFedBrackets, fedTaxCredits) : 0;
    const householdTaxWithoutCpp = personTaxWithoutCpp + spouseTaxWithoutCpp;

    // 3. CPP로 인해 순수하게 발생한 세금을 계산
    const taxOnCpp = householdTaxWithCpp - householdTaxWithoutCpp;

    // 4. 진짜 '세후 CPP' 계산
    const householdAfterTaxCpp = householdPreTaxCpp - taxOnCpp;
    
    return { householdAfterTaxCpp };
}


/**
 * 손익분기점을 계산하는 유일한 메인 함수 (최종 논리 적용)
 */
function runDeterministicBreakEven(baseAge, comparisonAge, inputs) {
    const earlyAge = Math.min(baseAge, comparisonAge);
    const lateAge = Math.max(baseAge, comparisonAge);
    
    let headStartPot = 0;
    let detailedData = [];

    // 1. '기회비용' 계산: '세후 CPP'를 '투자 수익률'로 복리 계산
    for (let age = earlyAge; age < lateAge; age++) {
        const year = inputs.user.birthYear + age;
        const result = calculateYearlyIncome(inputs.user, inputs.spouse, year, earlyAge, earlyAge, inputs);
        headStartPot = headStartPot * (1 + inputs.investmentReturn / 100) + result.householdAfterTaxCpp;
    }

    // 2. 연간 '세후 CPP 차액' 누적 계산
    let cumulativeCppDifference = 0;
    let breakEvenAge = -1;

    for (let age = earlyAge; age <= inputs.lifeExpectancy; age++) {
        const year = inputs.user.birthYear + age;
        
        const earlyResult = calculateYearlyIncome(inputs.user, inputs.spouse, year, earlyAge, earlyAge, inputs);
        const lateResult = (age >= lateAge) 
            ? calculateYearlyIncome(inputs.user, inputs.spouse, year, lateAge, lateAge, inputs)
            : { householdAfterTaxCpp: 0 };
        
        const annualCppDifference = lateResult.householdAfterTaxCpp - earlyResult.householdAfterTaxCpp;
        
        if (age >= lateAge) {
            cumulativeCppDifference += annualCppDifference;
        }

        detailedData.push({
            age: age,
            earlyAfterTaxCpp: earlyResult.householdAfterTaxCpp,
            lateAfterTaxCpp: lateResult.householdAfterTaxCpp,
            annualCppDifference: annualCppDifference,
            potValue: headStartPot,
            cumulativeCppDifference: cumulativeCppDifference
        });

        if (breakEvenAge === -1 && age >= lateAge && cumulativeCppDifference >= headStartPot) {
            const prevCumulativeDiff = cumulativeCppDifference - annualCppDifference;
            const diffNeeded = headStartPot - prevCumulativeDiff;
            const fractionOfYear = annualCppDifference > 0 ? diffNeeded / annualCppDifference : 0;
            breakEvenAge = (age - 1) + fractionOfYear;
        }
    }

    return {
        breakEvenAge: breakEvenAge === -1 ? -1 : Math.round(breakEvenAge * 10) / 10,
        headStartPot: headStartPot,
        details: detailedData
    };
}
