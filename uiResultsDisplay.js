/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.4.1 (Refactor: Move formatCurrency helper to uiCore)
 * @file        uiResultsDisplay.js
 * @created     2025-10-25
 * @description Handles running the simulation and displaying results (metrics, table, CSV export).
 */

// uiResultsDisplay.js
// Assumes global access to: elements, translations, formatCurrency (from uiCore.js), gatherInputs (from uiDataHandler.js), runFullSimulation (from engineCore.js)

// --- State Variables (Results specific) ---
let lastResultDetails = null;
let lastRunInputsA = null;
let lastRunInputsB = null;

// --- Initialization ---
function initializeResultsDisplay() {
    // Add event listeners specific to results display
    elements.runAnalysisBtn?.addEventListener('click', () => runAndDisplayAnalysis(true));
    elements.toggle_details_btn?.addEventListener('click', () => {
        elements.detailed_table_container?.classList.toggle('hidden');
    });
    elements.export_csv_btn?.addEventListener('click', () => exportToCsv(lastResultDetails, lastRunInputsA, lastRunInputsB));
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
        if (typeof switchTab === 'function') switchTab('results'); // Use global switchTab if available
        await new Promise(resolve => setTimeout(resolve, 50));
    }

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
        lastResultDetails = results;

         console.log("Simulation Results A:", results.resultsA);
         console.log("Simulation Results B:", results.resultsB);

        displayComparisonMetrics(results);
        displayComparisonDetailedTable(results);

        const lang = translations[currentLanguage]; // Assumes global currentLanguage
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = lang.simComplete(results.resultsA?.length || 0, results.resultsB?.length || 0);

        if(elements.toggle_details_btn) elements.toggle_details_btn.classList.remove('hidden');
        if(elements.export_csv_btn) elements.export_csv_btn.classList.remove('hidden');
        if(elements.results_container) elements.results_container.classList.remove('hidden');

    } catch (error) {
        console.error("Simulation Failed:", error);
        const lang = translations[currentLanguage]; // Assumes global currentLanguage
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = lang.errSimFailed + error.message;
        if(elements.results_container) elements.results_container.classList.remove('hidden');
        if(elements.additional_metrics_container) elements.additional_metrics_container.innerHTML = '';
        if(elements.detailed_table_container) elements.detailed_table_container.innerHTML = '';
        if(elements.detailed_table_container) elements.detailed_table_container.classList.add('hidden');
        if(elements.toggle_details_btn) elements.toggle_details_btn.classList.add('hidden');
        if(elements.export_csv_btn) elements.export_csv_btn.classList.add('hidden');
    } finally {
        if (showLoader && elements.loading_indicator) elements.loading_indicator.classList.add('hidden');
    }
}

// --- Helper Functions ---
// *** MODIFICATION START v2.4.1: Removed Helper Functions (Moved to uiCore.js) ***
// --- MODIFICATION END v2.4.1 ---

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
     if (!results || (!results.resultsA && !results.resultsB)) { console.error("No results to export."); return; }
    const lang = translations[currentLanguage]; // Assumes global currentLanguage
    const resultsA = results.resultsA || [];
    const resultsB = results.resultsB || [];

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
    let csvContent = "data:text/csv;charset=utf-8,";
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