/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.6.0 (Feat: Include all input parameters in CSV export for verification)
 * @file        uiResultsDisplay.js
 * @created     2025-10-25
 * @description Handles running the simulation and displaying results (metrics, table, CSV export, D3 graph).
 */

// uiResultsDisplay.js
// Assumes global access to: elements, translations, formatCurrency, formatYAxisLabel (from uiCore.js),
// gatherInputs (from uiDataHandler.js), runFullSimulation (from engineCore.js), d3 (from D3 library script)

// --- State Variables (Results specific) ---
let lastResultDetails = null; // Stores the raw output { resultsA: [], resultsB: [] }
let lastRunInputsA = null;
let lastRunInputsB = null;
let chartRendered = false; // *** ADDED v2.5.1: Track if chart has been drawn ***

// --- Initialization ---
function initializeResultsDisplay() {
    // Add event listeners specific to results display
    elements.runAnalysisBtn?.addEventListener('click', () => runAndDisplayAnalysis(true));
    elements.toggle_details_btn?.addEventListener('click', () => {
        elements.detailed_table_container?.classList.toggle('hidden');
    });
    elements.export_csv_btn?.addEventListener('click', () => exportToCsv(lastResultDetails, lastRunInputsA, lastRunInputsB));
    // *** MODIFIED v2.5.1: Graph Toggle Button Listener Logic ***
    elements.toggle_graph_btn?.addEventListener('click', () => {
        const graphContainer = elements.graph_container;
        if (!graphContainer) return;

        graphContainer.classList.toggle('hidden');

        // Draw chart only when it becomes visible and if results exist and it hasn't been drawn yet
        if (!graphContainer.classList.contains('hidden') && lastResultDetails && !chartRendered) {
             console.log("Graph container shown, drawing chart."); // Debug log
             drawD3Chart(lastResultDetails);
             chartRendered = true; // Mark chart as rendered
        } else if (graphContainer.classList.contains('hidden')) {
             console.log("Graph container hidden."); // Debug log
        } else if (chartRendered) {
             console.log("Graph container shown, but chart already rendered."); // Debug log
        }
    });
}

// --- Getter for other modules ---
function getLastResultDetails() {
    return lastResultDetails;
}

// --- Execution Function ---
async function runAndDisplayAnalysis(showLoader = true) {
    if (showLoader && elements.loading_indicator) {
        elements.loading_indicator.classList.remove('hidden');
        if(elements.results_container) elements.results_container.classList.add('hidden');
        if (typeof switchTab === 'function') switchTab('results');
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Clear previous graph and reset state before running new analysis
    clearD3Chart();
    chartRendered = false; // *** ADDED v2.5.1: Reset chart rendered flag ***
    if(elements.graph_container) elements.graph_container.classList.add('hidden'); // Ensure graph starts hidden

    try {
        if (typeof gatherInputs !== 'function') throw new Error("gatherInputs function not available.");
        lastRunInputsA = gatherInputs('a');
        lastRunInputsB = gatherInputs('b');

        console.log("Inputs for Scenario A:", JSON.parse(JSON.stringify(lastRunInputsA)));
        console.log("Inputs for Scenario B:", JSON.parse(JSON.stringify(lastRunInputsB)));

        if (typeof runFullSimulation !== 'function') {
            throw new Error("Simulation engine (engineCore.js) is not loaded correctly.");
        }

        const results = runFullSimulation(lastRunInputsA, lastRunInputsB);
        lastResultDetails = results; // Store results

         console.log("Simulation Results A:", results.resultsA);
         console.log("Simulation Results B:", results.resultsB);

        // Display standard results
        displayComparisonMetrics(results);
        displayComparisonDetailedTable(results);

        // *** MODIFIED v2.5.1: Do NOT draw chart immediately. Just show the toggle button if results exist. ***
        if (results.resultsA || results.resultsB) {
            if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.remove('hidden');
        } else {
             if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.add('hidden');
        }

        const lang = translations[currentLanguage];
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = lang.simComplete(results.resultsA?.length || 0, results.resultsB?.length || 0);

        // Show buttons that are always available when results are generated
        if(elements.toggle_details_btn) elements.toggle_details_btn.classList.remove('hidden');
        if(elements.export_csv_btn) elements.export_csv_btn.classList.remove('hidden');
        if(elements.results_container) elements.results_container.classList.remove('hidden');

    } catch (error) {
        console.error("Simulation Failed:", error);
        const lang = translations[currentLanguage];
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = lang.errSimFailed + error.message;

        // Clear results and hide optional elements on error
        if(elements.results_container) elements.results_container.classList.remove('hidden');
        if(elements.additional_metrics_container) elements.additional_metrics_container.innerHTML = '';
        if(elements.detailed_table_container) elements.detailed_table_container.innerHTML = '';
        if(elements.detailed_table_container) elements.detailed_table_container.classList.add('hidden');
        if(elements.toggle_details_btn) elements.toggle_details_btn.classList.add('hidden');
        if(elements.export_csv_btn) elements.export_csv_btn.classList.add('hidden');
        // Also hide graph elements on error
        if(elements.graph_container) elements.graph_container.classList.add('hidden');
        if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.add('hidden');
        clearD3Chart();

    } finally {
        if (showLoader && elements.loading_indicator) elements.loading_indicator.classList.add('hidden');
    }
}

// --- Display Functions ---
function displayComparisonMetrics(results) {
   const lang = translations[currentLanguage]; // Assumes global currentLanguage
   const resultsA = results?.resultsA || [];
   const resultsB = results?.resultsB || [];

    // Safely calculate final assets
    const getFinalAssets = (resArray) => {
        if (!resArray || resArray.length === 0) return 0;
        const lastYear = resArray[resArray.length - 1];
        return lastYear?.closingBalance ? Object.values(lastYear.closingBalance).reduce((sum, val) => sum + (val || 0), 0) : 0;
    };
    const finalAssetsA = getFinalAssets(resultsA);
    const finalAssetsB = getFinalAssets(resultsB);

    // Safely calculate total gross income (pre-tax, pre-clawback OAS)
    const getTotalIncome = (resArray) => {
        if (!resArray) return 0;
        return resArray.reduce((sum, yearData) => {
            const userInc = yearData?.income?.user || {};
            const spouseInc = yearData?.income?.spouse || {};
            const oasUserGross = (userInc.oas || 0) + (yearData?.oasClawback_user || 0);
            const oasSpouseGross = (spouseInc.oas || 0) + (yearData?.oasClawback_spouse || 0);
            return sum + (userInc.cpp || 0) + oasUserGross + (userInc.gis || 0) + (userInc.other || 0)
                       + (spouseInc.cpp || 0) + oasSpouseGross + (spouseInc.gis || 0) + (spouseInc.other || 0);
        }, 0);
    };
    const totalIncomeA = getTotalIncome(resultsA);
    const totalIncomeB = getTotalIncome(resultsB);

    // Safely calculate total taxes paid
    const getTotalTaxes = (resArray) => {
        if (!resArray) return 0;
        return resArray.reduce((sum, yearData) => sum + (yearData?.taxPayable || 0), 0);
    };
    const totalTaxesA = getTotalTaxes(resultsA);
    const totalTaxesB = getTotalTaxes(resultsB);

   // Calculate differences and determine CSS classes
   const diffAssets = finalAssetsB - finalAssetsA;
   const diffIncome = totalIncomeB - totalIncomeA;
   const diffTaxes = totalTaxesB - totalTaxesA;
   const assetDiffClass = diffAssets > 0 ? 'metric-positive' : (diffAssets < 0 ? 'metric-negative' : '');
   const incomeDiffClass = diffIncome > 0 ? 'metric-positive' : (diffIncome < 0 ? 'metric-negative' : '');
   // Less tax is positive
   const taxDiffClass = diffTaxes < 0 ? 'metric-positive' : (diffTaxes > 0 ? 'metric-negative' : '');

   // Generate table HTML (uses global formatCurrency)
   const tableHTML = `
       <h3 data-lang-key="metricsTitle">${lang.metricsTitle}</h3>
       <table id="additional-metrics-table">
           <thead><tr><th>Metric</th><th>${lang.metricsScenarioA}</th><th>${lang.metricsScenarioB}</th><th>${lang.metricsDifference}</th></tr></thead>
           <tbody>
               <tr><td>${lang.metricsFinalAssets}</td><td>${formatCurrency(finalAssetsA)}</td><td>${formatCurrency(finalAssetsB)}</td><td class="${assetDiffClass}">${formatCurrency(diffAssets)}</td></tr>
               <tr><td>${lang.metricsTotalIncomeGross}</td><td>${formatCurrency(totalIncomeA)}</td><td>${formatCurrency(totalIncomeB)}</td><td class="${incomeDiffClass}">${formatCurrency(diffIncome)}</td></tr>
               <tr><td>${lang.metricsTotalTaxesPaid}</td><td>${formatCurrency(totalTaxesA)}</td><td>${formatCurrency(totalTaxesB)}</td><td class="${taxDiffClass}">${formatCurrency(diffTaxes)}</td></tr>
           </tbody>
       </table>`;

    if(elements.additional_metrics_container) elements.additional_metrics_container.innerHTML = tableHTML;
}

function displayComparisonDetailedTable(results) {
    const lang = translations[currentLanguage]; // Assumes global currentLanguage
    const resultsA = results?.resultsA || [];
    const resultsB = results?.resultsB || [];

    // Determine the full age range across both scenarios
    const agesA = resultsA.map(d => d?.userAge).filter(age => age !== undefined);
    const agesB = resultsB.map(d => d?.userAge).filter(age => age !== undefined);
    const allAges = [...agesA, ...agesB];
    const minAge = allAges.length > 0 ? Math.min(...allAges) : 0;
    const maxAge = allAges.length > 0 ? Math.max(...allAges) : 0;

    // Handle case with no results
    if (minAge === 0 && maxAge === 0 && resultsA.length === 0 && resultsB.length === 0) {
        if(elements.detailed_table_container) {
            elements.detailed_table_container.innerHTML = `<p>No detailed data available.</p>`;
            elements.detailed_table_container.classList.add('hidden'); // Ensure it's hidden if empty
        }
        return;
    }

    // Define table columns configuration
    const cols = [
        { key: 'closingBalanceTotal', label: lang.colTotalAssets, calc: d => Object.values(d?.closingBalance || {}).reduce((s,v)=>s+(v||0),0) },
        { key: 'incomeTotal', label: lang.colIncomeTotal, calc: d => d?.income?.total || 0 }, // Uses pre-calculated total non-withdrawal income
        { key: 'expenses', label: lang.colExpenses, prop: 'expenses' },
        { key: 'taxPayable', label: lang.colTaxesPaid, prop: 'taxPayable' },
        { key: 'netCashflow', label: lang.colNetCashflow, calc: d => (d?.income?.total || 0) + (d?.withdrawals?.total || 0) - (d?.expenses || 0) - (d?.taxPayable || 0) },
        { key: 'withdrawals.total', label: lang.colWdTotal, prop: 'withdrawals.total' },
        { key: 'closingBalance.tfsa', label: lang.colBalTFSA, prop: 'closingBalance.tfsa' },
        { key: 'closingBalance.nonreg', label: lang.colBalNonReg, prop: 'closingBalance.nonreg' },
        { key: 'closingBalance.rrsp', label: lang.colBalRRSP, prop: 'closingBalance.rrsp' },
        { key: 'closingBalance.lif', label: lang.colBalLIF, prop: 'closingBalance.lif' },
    ];

    // Build table header
    let tableHTML = `<h3 data-lang-key="tableTitle">${lang.tableTitle}</h3><table><thead><tr><th>${lang.colAge}</th>`;
    cols.forEach(col => tableHTML += `<th>${lang.prefixA}${col.label}</th>`);
    cols.forEach(col => tableHTML += `<th>${lang.prefixB}${col.label}</th>`);
    tableHTML += `</tr></thead><tbody>`;

    // Helper to safely get nested property values
    const getValue = (data, prop) => {
        if (!data || typeof prop !== 'string') return undefined;
        // Allows nested keys like 'closingBalance.tfsa'
        return prop.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), data);
     };

    // Build table body rows (uses global formatCurrency)
    for (let age = minAge; age <= maxAge; age++) {
        const dataA = resultsA.find(d => d?.userAge === age);
        const dataB = resultsB.find(d => d?.userAge === age);
        tableHTML += `<tr><td>${age}</td>`; // Age column

        // Scenario A columns
        cols.forEach(col => {
            let value = '-'; // Default value
            if (dataA) {
                const rawValue = col.calc ? col.calc(dataA) : (col.prop ? getValue(dataA, col.prop) : undefined);
                if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                     value = formatCurrency(rawValue); // Format if it's a valid number
                }
            }
             tableHTML += `<td>${value}</td>`;
        });

        // Scenario B columns
         cols.forEach(col => {
             let value = '-'; // Default value
             if (dataB) {
                 const rawValue = col.calc ? col.calc(dataB) : (col.prop ? getValue(dataB, col.prop) : undefined);
                 if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                    value = formatCurrency(rawValue); // Format if it's a valid number
                 }
             }
             tableHTML += `<td>${value}</td>`;
        });
        tableHTML += `</tr>`;
    }
    tableHTML += `</tbody></table>`;

    // Update the DOM and manage visibility
    if(elements.detailed_table_container) {
        elements.detailed_table_container.innerHTML = tableHTML;
    }
}


function exportToCsv(results, inputsA, inputsB) {
     if (!results || (!results.resultsA && !results.resultsB) || !inputsA || !inputsB) { console.error("No results or inputs to export."); return; }
    const lang = translations[currentLanguage]; // Assumes global currentLanguage
    const resultsA = results.resultsA || [];
    const resultsB = results.resultsB || [];

    // --- *** MODIFICATION START v2.6.0: Add Input Parameters Section *** ---
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Helper function to create a CSV row
    const addCsvRow = (param, valA, valB) => {
        const cleanParam = `"${String(param || '').replace(/"/g, '""')}"`;
        const cleanValA = `"${String(valA ?? 'N/A').replace(/"/g, '""')}"`;
        const cleanValB = `"${String(valB ?? 'N/A').replace(/"/g, '""')}"`;
        return `${cleanParam},${cleanValA},${cleanValB}\r\n`;
    };

    // Helper to format percentage values
    const formatPercent = (val) => (val !== undefined && val !== null) ? val * 100 : 'N/A';

    csvContent += "Input Parameters\r\n";
    csvContent += "Parameter,Scenario A,Scenario B\r\n";

    // Basic Info
    csvContent += addCsvRow(lang.provinceLabel, inputsA.province, inputsB.province);
    csvContent += addCsvRow(lang.lifeExpectancyLabel, inputsA.lifeExpectancy, inputsB.lifeExpectancy);
    csvContent += addCsvRow(lang.retirementAgeLabel, inputsA.scenario.retirementAge, inputsB.scenario.retirementAge);
    csvContent += addCsvRow(lang.colaLabel, formatPercent(inputsA.cola), formatPercent(inputsB.cola));
    csvContent += "\r\n";

    // User Info
    const userA = inputsA.scenario.user || {};
    const userB = inputsB.scenario.user || {};
    csvContent += addCsvRow(`--- ${lang.dataEntryMe} ---`, "", "");
    csvContent += addCsvRow(lang.userBirthYearLabel, userA.birthYear, userB.birthYear);
    csvContent += addCsvRow(lang.cppStartAgeLabel, userA.cppStartAge, userB.cppStartAge);
    csvContent += addCsvRow(lang.userCppAt65Label, userA.cppAt65, userB.cppAt65);
    csvContent += addCsvRow(lang.oasStartAgeLabel, userA.oasStartAge, userB.oasStartAge);
    
    // User Assets
    csvContent += addCsvRow(`${lang.dataEntryMe} ${lang.assetRRSP}`, userA.assets?.rrsp, userB.assets?.rrsp);
    csvContent += addCsvRow(`${lang.dataEntryMe} ${lang.assetTFSA}`, userA.assets?.tfsa, userB.assets?.tfsa);
    csvContent += addCsvRow(`${lang.dataEntryMe} ${lang.assetNonReg}`, userA.assets?.nonreg, userB.assets?.nonreg);
    csvContent += addCsvRow(`${lang.dataEntryMe} ${lang.assetNonRegACB}`, userA.assets?.nonreg_acb, userB.assets?.nonreg_acb);
    csvContent += addCsvRow(`${lang.dataEntryMe} ${lang.assetLIF}`, userA.assets?.lif, userB.assets?.lif);
    csvContent += "\r\n";

    // Spouse Info
    const spouseA = inputsA.scenario.spouse || {};
    const spouseB = inputsB.scenario.spouse || {};
    csvContent += addCsvRow(`--- ${lang.dataEntrySpouse} ---`, "", "");
    csvContent += addCsvRow(lang.hasSpouseLabel, spouseA.hasSpouse, spouseB.hasSpouse);
    if (spouseA.hasSpouse || spouseB.hasSpouse) {
        csvContent += addCsvRow(lang.userBirthYearLabel, spouseA.data?.birthYear, spouseB.data?.birthYear);
        csvContent += addCsvRow(lang.cppStartAgeLabel, spouseA.data?.cppStartAge, spouseB.data?.cppStartAge);
        csvContent += addCsvRow(lang.userCppAt65Label, spouseA.data?.cppAt65, spouseB.data?.cppAt65);
        csvContent += addCsvRow(lang.oasStartAgeLabel, spouseA.data?.oasStartAge, spouseB.data?.oasStartAge);
        // Spouse Assets
        csvContent += addCsvRow(`${lang.dataEntrySpouse} ${lang.assetRRSP}`, spouseA.data?.assets?.rrsp, spouseB.data?.assets?.rrsp);
        csvContent += addCsvRow(`${lang.dataEntrySpouse} ${lang.assetTFSA}`, spouseA.data?.assets?.tfsa, spouseB.data?.assets?.tfsa);
        csvContent += addCsvRow(`${lang.dataEntrySpouse} ${lang.assetNonReg}`, spouseA.data?.assets?.nonreg, spouseB.data?.assets?.nonreg);
        csvContent += addCsvRow(`${lang.dataEntrySpouse} ${lang.assetNonRegACB}`, spouseA.data?.assets?.nonreg_acb, spouseB.data?.assets?.nonreg_acb);
        csvContent += addCsvRow(`${lang.dataEntrySpouse} ${lang.assetLIF}`, spouseA.data?.assets?.lif, spouseB.data?.assets?.lif);
    }
    csvContent += "\r\n";

    // Growth Rates
    csvContent += addCsvRow(`--- ${lang.legendGrowthAssumptionsIncome} ---`, "", "");
    csvContent += addCsvRow(lang.returnRRSP, formatPercent(inputsA.scenario.returns?.rrsp), formatPercent(inputsB.scenario.returns?.rrsp));
    csvContent += addCsvRow(lang.returnTFSA, formatPercent(inputsA.scenario.returns?.tfsa), formatPercent(inputsB.scenario.returns?.tfsa));
    csvContent += addCsvRow(lang.returnNonReg, formatPercent(inputsA.scenario.returns?.nonreg), formatPercent(inputsB.scenario.returns?.nonreg));
    csvContent += addCsvRow(lang.returnLIF, formatPercent(inputsA.scenario.returns?.lif), formatPercent(inputsB.scenario.returns?.lif));
    csvContent += "\r\n";

    // Withdrawal Strategy
    csvContent += addCsvRow(`--- ${lang.withdrawalStrategyTitle} ---`, "", "");
    for (let i = 1; i <= 3; i++) {
        const phaseA = inputsA.scenario.withdrawalStrategy[i - 1] || {};
        const phaseB = inputsB.scenario.withdrawalStrategy[i - 1] || {};
        const phaseTitle = lang[`phase${i}Title`] || `Phase ${i}`;
        csvContent += addCsvRow(`${phaseTitle} ${lang.phaseStartAge}`, phaseA.startAge, phaseB.startAge);
        csvContent += addCsvRow(`${phaseTitle} ${lang.phaseEndAge}`, phaseA.endAge, phaseB.endAge);
        csvContent += addCsvRow(`${phaseTitle} ${lang.phaseExpenses}`, phaseA.expenses, phaseB.expenses);
        csvContent += addCsvRow(`${phaseTitle} ${lang.withdrawalOrder}`, (phaseA.order || []).join(' -> '), (phaseB.order || []).join(' -> '));
    }
    csvContent += "\r\n";

    // Other Incomes (Scenario A)
    csvContent += addCsvRow(`--- ${lang.legendOtherIncome} (Scenario A) ---`, "", "");
    csvContent += "Owner,Type,Amount(PV),Start Age,End Age,COLA (%)\r\n";
    const incomesA = [...(userA.otherIncomes || []).map(i => ({...i, owner: lang.dataEntryMe})), ...((spouseA.data?.otherIncomes || []).map(i => ({...i, owner: lang.dataEntrySpouse})))];
    incomesA.forEach(inc => { csvContent += `"${inc.owner}","${inc.desc}","${inc.amount}","${inc.startAge}","${inc.endAge}","${formatPercent(inc.cola)}"\r\n`; });
    csvContent += "\r\n";

    // Other Incomes (Scenario B)
    csvContent += addCsvRow(`--- ${lang.legendOtherIncome} (Scenario B) ---`, "", "");
    csvContent += "Owner,Type,Amount(PV),Start Age,End Age,COLA (%)\r\n";
    const incomesB = [...(userB.otherIncomes || []).map(i => ({...i, owner: lang.dataEntryMe})), ...((spouseB.data?.otherIncomes || []).map(i => ({...i, owner: lang.dataEntrySpouse})))];
    incomesB.forEach(inc => { csvContent += `"${inc.owner}","${inc.desc}","${inc.amount}","${inc.startAge}","${inc.endAge}","${formatPercent(inc.cola)}"\r\n`; });
    csvContent += "\r\n";

    // --- End of Input Parameters Section ---


    // --- Start of Year-by-Year Data Section ---
    csvContent += "Year-by-Year Data\r\n";
    
    // Determine age range
    const agesA = resultsA.map(d => d?.userAge).filter(age => age !== undefined);
    const agesB = resultsB.map(d => d?.userAge).filter(age => age !== undefined);
    const allAges = [...agesA, ...agesB];
    const minAge = allAges.length > 0 ? Math.min(...allAges) : 0;
    const maxAge = allAges.length > 0 ? Math.max(...allAges) : 0;

    if (minAge === 0 && maxAge === 0 && resultsA.length === 0 && resultsB.length === 0) { console.error("No data range found for export."); return; }

    // Define CSV columns
    const csvCols = [
        { key: 'userAge', label: lang.colAge },
        // A
        { key: 'A_totalAssets', label: `${lang.prefixA}${lang.colTotalAssets}`, calc: d => Object.values(d?.closingBalance || {}).reduce((s,v)=>s+(v||0),0) },
        { key: 'A_incomeTotal', label: `${lang.prefixA}${lang.colIncomeTotal}`, calc: d => d?.income?.total || 0 },
        { key: 'A_expenses', label: `${lang.prefixA}${lang.colExpenses}`, prop: 'expenses' },
        { key: 'A_taxesPaid', label: `${lang.prefixA}${lang.colTaxesPaid}`, prop: 'taxPayable' },
        { key: 'A_netCashflow', label: `${lang.prefixA}${lang.colNetCashflow}`, calc: d => (d?.income?.total || 0) + (d?.withdrawals?.total || 0) - (d?.expenses || 0) - (d?.taxPayable || 0) },
        { key: 'A_wdTotal', label: `${lang.prefixA}${lang.colWdTotal}`, prop: 'withdrawals.total' },
        { key: 'A_balTFSA', label: `${lang.prefixA}${lang.colBalTFSA}`, prop: 'closingBalance.tfsa' },
        { key: 'A_balNonReg', label: `${lang.prefixA}${lang.colBalNonReg}`, prop: 'closingBalance.nonreg' },
        { key: 'A_balRRSP', label: `${lang.prefixA}${lang.colBalRRSP}`, prop: 'closingBalance.rrsp' },
        { key: 'A_balLIF', label: `${lang.prefixA}${lang.colBalLIF}`, prop: 'closingBalance.lif' },
        // B
        { key: 'B_totalAssets', label: `${lang.prefixB}${lang.colTotalAssets}`, calc: d => Object.values(d?.closingBalance || {}).reduce((s,v)=>s+(v||0),0) },
        { key: 'B_incomeTotal', label: `${lang.prefixB}${lang.colIncomeTotal}`, calc: d => d?.income?.total || 0 },
        { key: 'B_expenses', label: `${lang.prefixB}${lang.colExpenses}`, prop: 'expenses' },
        { key: 'B_taxesPaid', label: `${lang.prefixB}${lang.colTaxesPaid}`, prop: 'taxPayable' },
        { key: 'B_netCashflow', label: `${lang.prefixB}${lang.colNetCashflow}`, calc: d => (d?.income?.total || 0) + (d?.withdrawals?.total || 0) - (d?.expenses || 0) - (d?.taxPayable || 0) },
        { key: 'B_wdTotal', label: `${lang.prefixB}${lang.colWdTotal}`, prop: 'withdrawals.total' },
        { key: 'B_balTFSA', label: `${lang.prefixB}${lang.colBalTFSA}`, prop: 'closingBalance.tfsa' },
        { key: 'B_balNonReg', label: `${lang.prefixB}${lang.colBalNonReg}`, prop: 'closingBalance.nonreg' },
        { key: 'B_balRRSP', label: `${lang.prefixB}${lang.colBalRRSP}`, prop: 'closingBalance.rrsp' },
        { key: 'B_balLIF', label: `${lang.prefixB}${lang.colBalLIF}`, prop: 'closingBalance.lif' },
    ];

    // Build CSV header
    csvContent += csvCols.map(c => `"${c.label}"`).join(",") + "\r\n";

    // Helper to safely get nested values
    const getValue = (data, prop) => {
        if (!data || typeof prop !== 'string') return undefined;
        return prop.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), data);
    };

    // Build CSV rows
    for (let age = minAge; age <= maxAge; age++) {
        const dataA = resultsA.find(d => d?.userAge === age);
        const dataB = resultsB.find(d => d?.userAge === age);
        const row = [];

        csvCols.forEach(col => {
            let value = ''; // Default empty string for CSV
            if (col.key === 'userAge') {
                value = age;
            } else {
                const scenarioData = col.key.startsWith('A_') ? dataA : dataB;
                if (scenarioData) {
                     const rawValue = col.calc ? col.calc(scenarioData) : (col.prop ? getValue(scenarioData, col.prop) : undefined);
                     if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                        value = rawValue.toFixed(2); // Keep decimals
                     } else {
                         value = 0; // Default to 0 for missing data points
                     }
                } else {
                    value = 0; // Default to 0 if no data for that year
                }
            }
             row.push(`"${String(value).replace(/"/g, '""')}"`); // Escape quotes
        });
        csvContent += row.join(",") + "\r\n";
    }

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "retirement_simulation_comparison.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// *** ADDED START v2.5.0: D3 Chart Functions ***

function clearD3Chart() {
    chartRendered = false; // *** ADDED v2.5.1: Reset flag ***
    if (elements.results_chart) {
        d3.select(elements.results_chart).selectAll("*").remove(); // Clear previous SVG content
    }
    // Hide tooltip if it exists
    d3.select('body').select('.d3-tooltip').style('opacity', 0);
    // Hide focus line if it exists (using a class selector)
    d3.select('#results-chart .focus-line').style('opacity', 0);
}

function drawD3Chart(results) {
    // Ensure D3 is loaded and required elements exist
    if (typeof d3 === 'undefined' || !elements.results_chart || !elements.graph_container) {
        console.error("D3 library or chart elements not found.");
        if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.add('hidden'); // Hide button if chart can't be drawn
        if(elements.graph_container) elements.graph_container.classList.add('hidden');
        return;
    }

    // Clear previous chart content explicitly before drawing
    d3.select(elements.results_chart).selectAll("*").remove();

    const resultsA = results?.resultsA || [];
    const resultsB = results?.resultsB || [];
    const lang = translations[currentLanguage]; // Assumes global currentLanguage

    // 1. Prepare Data in a combined format for D3
    const combinedDataMap = new Map();
    resultsA.forEach(d => {
        if (d && d.year !== undefined && d.userAge !== undefined) {
             combinedDataMap.set(d.year, { year: d.year, age: d.userAge, valueA: Object.values(d.closingBalance || {}).reduce((s, v) => s + (v || 0), 0) });
        }
    });
    resultsB.forEach(d => {
        if (d && d.year !== undefined && d.userAge !== undefined) {
            const existing = combinedDataMap.get(d.year);
            const valueB = Object.values(d.closingBalance || {}).reduce((s, v) => s + (v || 0), 0);
            if (existing) {
                existing.valueB = valueB;
            } else {
                // Important: Ensure age is consistent if B starts later/earlier than A for the same year (unlikely but possible)
                // Use a consistent age source if possible, or handle potential discrepancies. Here we assume year is the primary key.
                combinedDataMap.set(d.year, { year: d.year, age: d.userAge, valueB: valueB });
            }
        }
    });
    const combinedData = Array.from(combinedDataMap.values()).sort((a, b) => a.year - b.year);

    // Exit if no valid data points
    if (combinedData.length === 0) {
        console.warn("No data available to draw the chart.");
        if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.add('hidden');
        if(elements.graph_container) elements.graph_container.classList.add('hidden');
        return;
    }

    // 2. Setup SVG Dimensions and Margins
    const svg = d3.select(elements.results_chart);
    const container = elements.graph_container;
    const margin = { top: 20, right: 30, bottom: 40, left: 80 }; // Increased left margin

    // Get dimensions dynamically AFTER CSS is applied and container is VISIBLE
    const containerStyle = window.getComputedStyle(container);
    const availableWidth = parseInt(containerStyle.width) - parseInt(containerStyle.paddingLeft) - parseInt(containerStyle.paddingRight);
    const availableHeight = parseInt(containerStyle.height) - parseInt(containerStyle.paddingTop) - parseInt(containerStyle.paddingBottom);
    const titleElement = container.querySelector('h3');
    const titleHeight = titleElement ? titleElement.offsetHeight + parseInt(window.getComputedStyle(titleElement).marginBottom) : 20; // Include margin-bottom
    const width = availableWidth - margin.left - margin.right;
    const height = availableHeight - margin.top - margin.bottom - titleHeight;

    console.log(`Chart dimensions: available=${availableWidth}x${availableHeight}, drawing=${width}x${height}`); // Debug log

    if (width <= 0 || height <= 0) {
        console.error("Invalid chart dimensions calculated (width or height <= 0). Is the container visible?");
        return; // Cannot draw chart with invalid dimensions
    }

    svg.attr("width", availableWidth)
       .attr("height", availableHeight);

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Ensure Tooltip Div exists
    let tooltip = d3.select('body').select('.d3-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body').append('div')
            .attr('class', 'd3-tooltip')
            .style('opacity', 0);
    }

    // 3. Define Scales based on data range
    const xMin = d3.min(combinedData, d => d.year);
    const xMax = d3.max(combinedData, d => d.year);
    const yMax = d3.max(combinedData, d => Math.max(d.valueA ?? 0, d.valueB ?? 0)) || 0;
    const yMin = 0;

    const xScale = d3.scaleLinear()
        .domain([xMin, xMax])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([yMin, yMax === 0 ? 1000 : yMax * 1.05]) // Handle zero max, add 5% padding
        .nice()
        .range([height, 0]);

    // 4. Define Axes generators
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(Math.min(10, combinedData.length)); // Limit ticks
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatYAxisLabel);

    // 5. Draw Axes and Gridlines
    chartGroup.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    chartGroup.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    chartGroup.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .ticks(5)
            .tickSize(-width)
            .tickFormat("")
        );

    // 6. Define Line Generators
    const lineA = d3.line()
        .defined(d => d.valueA !== undefined && !isNaN(d.valueA))
        .x(d => xScale(d.year))
        .y(d => yScale(d.valueA));

    const lineB = d3.line()
        .defined(d => d.valueB !== undefined && !isNaN(d.valueB))
        .x(d => xScale(d.year))
        .y(d => yScale(d.valueB));

    // 7. Draw the Lines
    chartGroup.append("path")
        .datum(combinedData)
        .attr("class", "line line-a")
        .attr("d", lineA);

    chartGroup.append("path")
        .datum(combinedData)
        .attr("class", "line line-b")
        .attr("d", lineB);

    // 8. Add Interactivity Elements (Tooltip and Focus Line)
    const focusLine = chartGroup.append("line")
        .attr("class", "focus-line")
        .attr("y1", 0)
        .attr("y2", height);

    const overlay = chartGroup.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all");

    const bisectYear = d3.bisector(d => d.year).left;

    overlay.on("mouseover", () => {
        tooltip.style("opacity", 1);
        focusLine.style("opacity", 1);
    })
    .on("mouseout", () => {
        tooltip.style("opacity", 0);
        focusLine.style("opacity", 0);
    })
    .on("mousemove", (event) => {
        const pointer = d3.pointer(event, overlay.node());
        const xCoord = pointer[0];
        // Ensure xCoord is within the drawable area before inverting
        if (xCoord < 0 || xCoord > width) {
             tooltip.style("opacity", 0);
             focusLine.style("opacity", 0);
             return;
        }
        const hoveredYear = Math.round(xScale.invert(xCoord));

        const index = bisectYear(combinedData, hoveredYear, 1);
        const d0 = combinedData[index - 1];
        const d1 = combinedData[index];

        // Choose the closest data point, handling edge cases
        let d;
        if (d0 && d1) {
            d = (hoveredYear - d0.year > d1.year - hoveredYear) ? d1 : d0;
        } else if (d0) {
            d = d0;
        } else if (d1) {
            d = d1;
        } else {
             tooltip.style("opacity", 0); // Hide if no data found
             focusLine.style("opacity", 0);
            return;
        }

        if (!d || d.year === undefined) return;

        const focusX = xScale(d.year);
        // Ensure focusX is a valid number before positioning elements
        if (isNaN(focusX)) return;

        focusLine.attr("x1", focusX).attr("x2", focusX).style("opacity", 1); // Ensure line is visible

        tooltip.html(`<strong>${d.year} (${lang.colAge} ${d.age || 'N/A'})</strong>
                      <div><span class="color-a"></span>A: ${formatCurrency(d.valueA ?? 0)}</div>
                      <div><span class="color-b"></span>B: ${formatCurrency(d.valueB ?? 0)}</div>`)
               .style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 28) + "px")
               .style("opacity", 1); // Ensure tooltip is visible
    });

}
// *** ADDED END v2.5.0 ***