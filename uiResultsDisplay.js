/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     5.1.2 (Refactor: Split Monte Carlo logic into new file)
 * @file        uiResultsDisplay.js
 * @created     2025-10-25
 * @description Handles running standard simulation and displaying results (metrics, table, CSV export, D3 graph).
 * Optimization logic in uiOptimizationDisplay.js
 * Monte Carlo logic in uiMonteCarloDisplay.js
 */

// uiResultsDisplay.js
// Assumes global access to: elements, translations, formatCurrency, formatYAxisLabel (from uiCore.js),
// gatherInputs (from uiDataHandler.js), runFullSimulation (from engineCore.js),
// runFullOptimizedSimulation (from engineCore.js), d3 (from D3 library script),
// runMonteCarloSimulation, runOptimizedMonteCarloSimulation (from monteCarloEngine.js)

// --- State Variables (Results specific) ---
let lastResultDetails = null; // Stores the raw output { resultsA: [], resultsB: [] } for standard run
let lastOptimizationResults = null; // Stores { A_Base, A_Opt, B_Base, B_Opt }
let lastRunInputsA = null;
let lastRunInputsB = null;
let chartRendered = false; // Track if chart has been drawn
let lastRunWasOptimization = false; // Track the type of the last run

// --- Initialization ---
function initializeResultsDisplay() {
    // Add event listeners specific to results display
    elements.runAnalysisBtn?.addEventListener('click', () => runAndDisplayAnalysis(true));
    // *** MODIFICATION v5.1.1: Listener moved to uiOptimizationDisplay.js ***
    // elements.runOptimizationBtn?.addEventListener('click', () => runAndDisplayOptimization(true));
    elements.runOptimizationBtn?.addEventListener('click', () => {
        if (typeof runAndDisplayOptimization === 'function') {
            runAndDisplayOptimization(true);
        } else {
            console.error('Optimization functions not loaded. Check uiOptimizationDisplay.js');
        }
    });
    // *** END MODIFICATION v5.1.1 ***

    // *** MODIFICATION v5.1.2: MC Listeners moved to uiMonteCarloDisplay.js ***
    // elements.runMonteCarloBtn?.addEventListener('click', () => runAndDisplayMonteCarlo(true));
    // elements.runOptimizedMonteCarloBtn?.addEventListener('click', () => runAndDisplayOptimizedMonteCarlo(true));
    // *** MODIFICATION END v5.1.2 ***

    elements.toggle_details_btn?.addEventListener('click', () => {
        elements.detailed_table_container?.classList.toggle('hidden');
    });

    // *** MODIFICATION START v3.3.1: Conditional Export ***
    elements.export_csv_btn?.addEventListener('click', () => {
        // *** MODIFICATION v5.1.1: exportOptimizationToCsv is now in uiOptimizationDisplay.js ***
        if (lastRunWasOptimization && lastOptimizationResults) {
            if (typeof exportOptimizationToCsv === 'function') {
                exportOptimizationToCsv(lastOptimizationResults, lastRunInputsA, lastRunInputsB);
            } else {
                console.error('exportOptimizationToCsv function not loaded.');
            }
        } else if (!lastRunWasOptimization && lastResultDetails) {
            exportToCsv(lastResultDetails, lastRunInputsA, lastRunInputsB);
        } else {
            console.warn("No results available to export.");
            // Optionally: Show a user message
        }
    });
    // *** MODIFICATION END v3.3.1 ***

    // *** MODIFICATION START v3.3.1: Conditional Graph Toggle ***
    elements.toggle_graph_btn?.addEventListener('click', () => {
        const graphContainer = elements.graph_container;
        if (!graphContainer) return;

        const isHidden = graphContainer.classList.toggle('hidden');

        // Draw chart only when it becomes visible
        if (!isHidden) {
            clearD3Chart(); // Clear any existing chart first
            // *** MODIFICATION v5.1.1: drawOptimizationD3Chart is now in uiOptimizationDisplay.js ***
            if (lastRunWasOptimization && lastOptimizationResults) {
                if (typeof drawOptimizationD3Chart === 'function') {
                    console.log("Graph container shown, drawing Optimization chart (A-Opt vs B-Opt).");
                    drawOptimizationD3Chart(lastOptimizationResults); // Draw new optimization chart
                    chartRendered = true;
                } else {
                    console.error('drawOptimizationD3Chart function not loaded.');
                    chartRendered = false;
                }
            } else if (!lastRunWasOptimization && lastResultDetails) {
                console.log("Graph container shown, drawing Standard chart (A vs B).");
                drawD3Chart(lastResultDetails); // Draw new standard chart
                chartRendered = true;
            } else {
                 console.log("Graph container shown, but no results available to draw.");
                 chartRendered = false; // Ensure state is correct
            }
        } else {
            console.log("Graph container hidden.");
            clearD3Chart(); // Clear chart when hiding
            chartRendered = false;
        }
    });
    // *** MODIFICATION END v3.3.1 ***
}

// --- Getter for other modules ---
function getLastResultDetails() {
    return lastResultDetails; // Still returns A vs B standard results
}
// *** MODIFICATION START v3.3.1 ***
function getLastOptimizationResults() {
    return lastOptimizationResults; // Returns { A_Base, A_Opt, B_Base, B_Opt }
}
// *** MODIFICATION END v3.3.1 ***

// *** MODIFICATION v5.1.2: getLastMonteCarloResults moved to uiMonteCarloDisplay.js ***


// --- Execution Function ---
async function runAndDisplayAnalysis(showLoader = true) {
    lastRunWasOptimization = false; // Set state for this run type
    if (showLoader && elements.loading_indicator) {
        elements.loading_indicator.classList.remove('hidden');
        if(elements.results_container) elements.results_container.classList.add('hidden');
        if(elements.optimizer_loading_indicator) elements.optimizer_loading_indicator.classList.add('hidden');
        if (typeof switchTab === 'function') switchTab('results');
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Clear previous graph and reset state before running new analysis
    clearD3Chart();
    chartRendered = false;
    if(elements.graph_container) elements.graph_container.classList.add('hidden'); // Ensure graph starts hidden
    lastOptimizationResults = null; // Clear optimization results if running standard analysis
    // *** MODIFICATION v5.1.2: MC Results cleared in MC-specific function ***
    // lastMonteCarloResults = null; 

    // *** MODIFICATION v5.1.2: MC Container cleared in MC-specific function ***
    if(elements.monte_carlo_results_container) elements.monte_carlo_results_container.innerHTML = '';

    try {
        // *** MODIFICATION START v5.1.0: Disable all run buttons ***
        if(elements.runAnalysisBtn) elements.runAnalysisBtn.disabled = true;
        if(elements.runOptimizationBtn) elements.runOptimizationBtn.disabled = true;
        if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.disabled = true;
        if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.disabled = true;
        // *** MODIFICATION END v5.1.0 ***

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
        displayComparisonDetailedTable(results); // Populate detailed table container

        // Show graph toggle button if results exist
        if (results.resultsA?.length > 0 || results.resultsB?.length > 0) {
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
        // *** MODIFICATION START v5.1.0: Re-enable all run buttons ***
        if(elements.runAnalysisBtn) elements.runAnalysisBtn.disabled = false;
        if(elements.runOptimizationBtn) elements.runOptimizationBtn.disabled = false;
        if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.disabled = false;
        if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.disabled = false;
        // *** MODIFICATION END v5.1.0 ***
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
            // Include taxable withdrawals and taxable capital gains in gross income metric
            const taxableWdUser = yearData?.withdrawals_user?.rrsp + yearData?.withdrawals_user?.lif || 0;
            const taxableWdSpouse = yearData?.withdrawals_spouse?.rrsp + yearData?.withdrawals_spouse?.lif || 0;
            const capGainsUser = yearData?.income?.user?.taxableNonRegGains * 2 || 0; // x2 because taxable is 50%
            const capGainsSpouse = yearData?.income?.spouse?.taxableNonRegGains * 2 || 0;

            return sum + (userInc.cpp || 0) + oasUserGross + (userInc.gis || 0) + (userInc.other || 0) + taxableWdUser + capGainsUser
                       + (spouseInc.cpp || 0) + oasSpouseGross + (spouseInc.gis || 0) + (spouseInc.other || 0) + taxableWdSpouse + capGainsSpouse;
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
    const allAges = [...new Set([...agesA, ...agesB])]; // Use Set for unique ages
    if (allAges.length === 0) {
        if(elements.detailed_table_container) {
             elements.detailed_table_container.innerHTML = `<p>No detailed data available.</p>`;
             elements.detailed_table_container.classList.add('hidden'); // Ensure it's hidden if empty
         }
         return;
    }
    const minAge = Math.min(...allAges);
    const maxAge = Math.max(...allAges);


    // Define table columns configuration
    const cols = [
        { key: 'closingBalanceTotal', label: lang.colTotalAssets, calc: d => Object.values(d?.closingBalance || {}).reduce((s,v)=>s+(v||0),0) },
        { key: 'incomeTotal', label: lang.colIncomeTotal, calc: d => (d?.income?.user?.cpp || 0) + (d?.income?.user?.oas || 0) + (d?.income?.user?.gis || 0) + (d?.income?.user?.other || 0) + (d?.income?.spouse?.cpp || 0) + (d?.income?.spouse?.oas || 0) + (d?.income?.spouse?.gis || 0) + (d?.income?.spouse?.other || 0) }, // Use calculated total from step 2 (post-clawback OAS)
        { key: 'expenses', label: lang.colExpenses, prop: 'expenses' },
        { key: 'taxPayable', label: lang.colTaxesPaid, prop: 'taxPayable' },
        { key: 'netCashflow', label: lang.colNetCashflow, calc: d => ((d?.income?.user?.cpp || 0) + (d?.income?.user?.oas || 0) + (d?.income?.user?.gis || 0) + (d?.income?.user?.other || 0) + (d?.income?.spouse?.cpp || 0) + (d?.income?.spouse?.oas || 0) + (d?.income?.spouse?.gis || 0) + (d?.income?.spouse?.other || 0)) + (d?.withdrawals?.total || 0) - (d?.expenses || 0) - (d?.taxPayable || 0) },
        { key: 'withdrawals.total', label: lang.colWdTotal, prop: 'withdrawals.total' },
        { key: 'closingBalance.tfsa', label: lang.colBalTFSA, prop: 'closingBalance.tfsa' },
        { key: 'closingBalance.nonreg', label: lang.colBalNonReg, prop: 'closingBalance.nonreg' },
        { key: 'closingBalance.rrsp', label: lang.colBalRRSP, prop: 'closingBalance.rrsp' },
        { key: 'closingBalance.lif', label: lang.colBalLIF, prop: 'closingBalance.lif' },
        // *** MODIFICATION START v3.3.1: Add Pension Split column ***
        { key: 'pensionSplit', label: 'Pension Split', calc: d => (d?.pensionSplit?.transferredFromUser || 0) + (d?.pensionSplit?.transferredFromSpouse || 0) } // Show total amount transferred
        // *** MODIFICATION END v3.3.1 ***
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
                     // *** MODIFICATION START v3.3.1: Don't format 0 pension split ***
                     value = (col.key === 'pensionSplit' && rawValue === 0) ? '-' : formatCurrency(rawValue);
                     // *** MODIFICATION END v3.3.1 ***
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
                    // *** MODIFICATION START v3.3.1: Don't format 0 pension split ***
                    value = (col.key === 'pensionSplit' && rawValue === 0) ? '-' : formatCurrency(rawValue);
                    // *** MODIFICATION END v3.3.1 ***
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
        // Don't automatically hide/show here, let the toggle button handle it
    }
}


function exportToCsv(results, inputsA, inputsB) {
     if (!results || (!results.resultsA && !results.resultsB) || !inputsA || !inputsB) { console.error("No results or inputs to export."); return; }
    const lang = translations[currentLanguage]; // Assumes global currentLanguage
    const resultsA = results.resultsA || [];
    const resultsB = results.resultsB || [];

    let csvContent = "data:text/csv;charset=utf-8,";

    // Helper function to add a row with parameter name, value A, and value B
    const addCsvRow = (param, valA, valB) => {
        // Ensure values are strings and handle potential commas
        const formatValue = (val) => {
            if (val === undefined || val === null) return "";
            let str = String(val);
            // If the string contains a comma, quote it
            if (str.includes(',')) {
                str = `"${str.replace(/"/g, '""')}"`; // Escape double quotes
            }
            return str;
        };
        return `${formatValue(param)},${formatValue(valA)},${formatValue(valB)}\r\n`;
    };

    // Helper to format percentages
    const formatPercent = (val, digits = 1) => (typeof val === 'number' ? (val * 100).toFixed(digits) + '%' : val);

    csvContent += addCsvRow("Parameter", "Scenario A", "Scenario B");
    csvContent += addCsvRow("Province", inputsA.province, inputsB.province);
    csvContent += addCsvRow("Max Age", inputsA.lifeExpectancy, inputsB.lifeExpectancy);
    csvContent += addCsvRow("Global COLA", formatPercent(inputsA.cola), formatPercent(inputsB.cola));
    csvContent += addCsvRow("Retirement Age", inputsA.scenario.retirementAge, inputsB.scenario.retirementAge);
    csvContent += "\r\n";
    csvContent += addCsvRow("User Birth Year", inputsA.scenario.user?.birthYear, inputsB.scenario.user?.birthYear);
    csvContent += addCsvRow("User CPP Start Age", inputsA.scenario.user?.cppStartAge, inputsB.scenario.user?.cppStartAge);
    csvContent += addCsvRow("User CPP @ 65", inputsA.scenario.user?.cppAt65, inputsB.scenario.user?.cppAt65);
    csvContent += addCsvRow("User OAS Start Age", inputsA.scenario.user?.oasStartAge, inputsB.scenario.user?.oasStartAge);
    csvContent += addCsvRow("User RRSP Start", inputsA.scenario.user?.assets?.rrsp, inputsB.scenario.user?.assets?.rrsp);
    csvContent += addCsvRow("User TFSA Start", inputsA.scenario.user?.assets?.tfsa, inputsB.scenario.user?.assets?.tfsa);
    csvContent += addCsvRow("User NonReg Start", inputsA.scenario.user?.assets?.nonreg, inputsB.scenario.user?.assets?.nonreg);
    csvContent += addCsvRow("User NonReg ACB", inputsA.scenario.user?.assets?.nonreg_acb, inputsB.scenario.user?.assets?.nonreg_acb);
    csvContent += addCsvRow("User LIF Start", inputsA.scenario.user?.assets?.lif, inputsB.scenario.user?.assets?.lif);
    csvContent += "\r\n";
    if (inputsA.scenario.spouse?.hasSpouse || inputsB.scenario.spouse?.hasSpouse) {
        csvContent += addCsvRow("Spouse Included", inputsA.scenario.spouse?.hasSpouse, inputsB.scenario.spouse?.hasSpouse);
        csvContent += addCsvRow("Spouse Birth Year", inputsA.scenario.spouse?.data?.birthYear, inputsB.scenario.spouse?.data?.birthYear);
        csvContent += addCsvRow("Spouse CPP Start Age", inputsA.scenario.spouse?.data?.cppStartAge, inputsB.scenario.spouse?.data?.cppStartAge);
        csvContent += addCsvRow("Spouse CPP @ 65", inputsA.scenario.spouse?.data?.cppAt65, inputsB.scenario.spouse?.data?.cppAt65);
        csvContent += addCsvRow("Spouse OAS Start Age", inputsA.scenario.spouse?.data?.oasStartAge, inputsB.scenario.spouse?.data?.oasStartAge);
        csvContent += addCsvRow("Spouse RRSP Start", inputsA.scenario.spouse?.data?.assets?.rrsp, inputsB.scenario.spouse?.data?.assets?.rrsp);
        csvContent += addCsvRow("Spouse TFSA Start", inputsA.scenario.spouse?.data?.assets?.tfsa, inputsB.scenario.spouse?.data?.assets?.tfsa);
        csvContent += addCsvRow("Spouse NonReg Start", inputsA.scenario.spouse?.data?.assets?.nonreg, inputsB.scenario.spouse?.data?.assets?.nonreg);
        csvContent += addCsvRow("Spouse NonReg ACB", inputsA.scenario.spouse?.data?.assets?.nonreg_acb, inputsB.scenario.spouse?.data?.assets?.nonreg_acb);
        csvContent += addCsvRow("Spouse LIF Start", inputsA.scenario.spouse?.data?.assets?.lif, inputsB.scenario.spouse?.data?.assets?.lif);
        csvContent += "\r\n";
    }
    csvContent += addCsvRow("Return RRSP", formatPercent(inputsA.scenario.returns?.rrsp), formatPercent(inputsB.scenario.returns?.rrsp));
    csvContent += addCsvRow("Return TFSA", formatPercent(inputsA.scenario.returns?.tfsa), formatPercent(inputsB.scenario.returns?.tfsa));
    csvContent += addCsvRow("Return NonReg", formatPercent(inputsA.scenario.returns?.nonreg), formatPercent(inputsB.scenario.returns?.nonreg));
    csvContent += addCsvRow("Return LIF", formatPercent(inputsA.scenario.returns?.lif), formatPercent(inputsB.scenario.returns?.lif));
    csvContent += "\r\n";
    // Add Other Incomes (Simplified: just list descriptions and amounts)
    const incomesA = [...(inputsA.scenario.user?.otherIncomes || []), ...(inputsA.scenario.spouse?.data?.otherIncomes || [])];
    const incomesB = [...(inputsB.scenario.user?.otherIncomes || []), ...(inputsB.scenario.spouse?.data?.otherIncomes || [])];
    csvContent += addCsvRow("Other Incomes Count", incomesA.length, incomesB.length);
    const maxIncomes = Math.max(incomesA.length, incomesB.length);
    for (let i = 0; i < maxIncomes; i++) {
        const incA = incomesA[i];
        const incB = incomesB[i];
        csvContent += addCsvRow(`Income ${i+1}`,
            incA ? `${incA.desc} ($${incA.amount}, ${incA.startAge}-${incA.endAge}, ${incA.owner}, ${formatPercent(incA.cola)})` : "",
            incB ? `${incB.desc} ($${incB.amount}, ${incB.startAge}-${incB.endAge}, ${incB.owner}, ${formatPercent(incB.cola)})` : ""
        );
    }
    csvContent += "\r\n";
    // Add Withdrawal Strategy (Simplified)
    for (let i = 1; i <= 3; i++) {
        const phaseA = inputsA.scenario.withdrawalStrategy?.[i-1];
        const phaseB = inputsB.scenario.withdrawalStrategy?.[i-1];
        csvContent += addCsvRow(`Phase ${i} Start Age`, phaseA?.startAge, phaseB?.startAge);
        csvContent += addCsvRow(`Phase ${i} End Age`, phaseA?.endAge, phaseB?.endAge);
        csvContent += addCsvRow(`Phase ${i} Expenses (PV)`, phaseA?.expenses, phaseB?.expenses);
        csvContent += addCsvRow(`Phase ${i} Order`, phaseA?.order?.join('-') || "", phaseB?.order?.join('-') || "");
    }

    csvContent += "\r\n";
    csvContent += "Year-by-Year Data\r\n";

    // Define columns based on display table + extras
    const cols = [
        { key: 'year', label: "Year", prop: 'year' },
        { key: 'userAge', label: lang.colAge, prop: 'userAge' },
        { key: 'closingBalanceTotal', label: lang.colTotalAssets, calc: d => Object.values(d?.closingBalance || {}).reduce((s,v)=>s+(v||0),0) },
        { key: 'incomeCPP', label: lang.colIncomeCPP, calc: d => (d?.income?.user?.cpp || 0) + (d?.income?.spouse?.cpp || 0)},
        { key: 'incomeOAS', label: lang.colIncomeOAS, calc: d => (d?.income?.user?.oas || 0) + (d?.income?.spouse?.oas || 0)},
        { key: 'incomeGIS', label: lang.colIncomeGIS, calc: d => (d?.income?.user?.gis || 0) + (d?.income?.spouse?.gis || 0)},
        { key: 'incomeOther', label: lang.colIncomeOther, calc: d => (d?.income?.user?.other || 0) + (d?.income?.spouse?.other || 0)},
        { key: 'incomeTotal', label: lang.colIncomeTotal, calc: d => (d?.income?.user?.cpp || 0) + (d?.income?.user?.oas || 0) + (d?.income?.user?.gis || 0) + (d?.income?.user?.other || 0) + (d?.income?.spouse?.cpp || 0) + (d?.income?.spouse?.oas || 0) + (d?.income?.spouse?.gis || 0) + (d?.income?.spouse?.other || 0) },
        { key: 'expenses', label: lang.colExpenses, prop: 'expenses' },
        { key: 'taxPayable', label: lang.colTaxesPaid, prop: 'taxPayable' },
        { key: 'netCashflow', label: lang.colNetCashflow, calc: d => ((d?.income?.user?.cpp || 0) + (d?.income?.user?.oas || 0) + (d?.income?.user?.gis || 0) + (d?.income?.user?.other || 0) + (d?.income?.spouse?.cpp || 0) + (d?.income?.spouse?.oas || 0) + (d?.income?.spouse?.gis || 0) + (d?.income?.spouse?.other || 0)) + (d?.withdrawals?.total || 0) - (d?.expenses || 0) - (d?.taxPayable || 0) },
        { key: 'wdRRSP', label: lang.colWdRRSP, prop: 'withdrawals.rrsp' },
        { key: 'wdLIF', label: lang.colWdLIF, prop: 'withdrawals.lif' },
        { key: 'wdNonReg', label: lang.colWdNonReg, prop: 'withdrawals.nonreg' },
        { key: 'wdTFSA', label: lang.colWdTFSA, prop: 'withdrawals.tfsa' },
        { key: 'wdTotal', label: lang.colWdTotal, prop: 'withdrawals.total' },
        { key: 'oasClawback', label: lang.colOASClawback, calc: d => (d?.oasClawback_user || 0) + (d?.oasClawback_spouse || 0) },
        { key: 'taxableInc', label: lang.colTaxableIncome, calc: d => (d?.taxableIncome_user || 0) + (d?.taxableIncome_spouse || 0) },
        { key: 'balRRSP', label: lang.colBalRRSP, prop: 'closingBalance.rrsp' },
        { key: 'balLIF', label: lang.colBalLIF, prop: 'closingBalance.lif' },
        { key: 'balNonReg', label: lang.colBalNonReg, prop: 'closingBalance.nonreg' },
        { key: 'balTFSA', label: lang.colBalTFSA, prop: 'closingBalance.tfsa' },
    ];

    // Build header row
    let headerRow = cols.map(c => c.label + "_A").join(',') + "," + cols.map(c => c.label + "_B").join(',') + "\r\n";
    csvContent += headerRow;

    // Helper to get value
    const getValue = (data, prop) => {
         if (!data || typeof prop !== 'string') return "";
         return prop.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), data) ?? "";
     };

    // Determine age range
    const agesA = resultsA.map(d => d?.userAge).filter(age => age !== undefined);
    const agesB = resultsB.map(d => d?.userAge).filter(age => age !== undefined);
    const allAges = [...new Set([...agesA, ...agesB])];
    const minAge = allAges.length > 0 ? Math.min(...allAges) : 0;
    const maxAge = allAges.length > 0 ? Math.max(...allAges) : 0;

    // Add data rows
    for (let age = minAge; age <= maxAge; age++) {
        const dataA = resultsA.find(d => d?.userAge === age);
        const dataB = resultsB.find(d => d?.userAge === age);
        let rowA = [], rowB = [];

        cols.forEach(col => {
            let valA = "", valB = "";
            if (dataA) valA = col.calc ? col.calc(dataA) : (col.prop ? getValue(dataA, col.prop) : "");
            if (dataB) valB = col.calc ? col.calc(dataB) : (col.prop ? getValue(dataB, col.prop) : "");
            // Format for CSV (remove currency symbols, commas might need quoting)
            const formatCsvNum = (num) => (typeof num === 'number' ? num : "");
            rowA.push(formatCsvNum(valA));
            rowB.push(formatCsvNum(valB));
        });
        csvContent += rowA.join(',') + "," + rowB.join(',') + "\r\n";
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


// Base64 Encoding Helpers removed


// Optimizer Link Generation removed


// --- D3 Chart Functions ---
function clearD3Chart() {
    chartRendered = false; // Reset render state regardless of which chart was cleared
    if (elements.results_chart) d3.select(elements.results_chart).selectAll("*").remove();
    // Ensure tooltip and focus line are hidden/removed if they exist outside the SVG
    d3.select('body').select('.d3-tooltip').style('opacity', 0).remove(); // Remove tooltip element too
    // Focus line is inside svg, removal handles it.
}

function drawD3Chart(results) {
    // Standard A vs B chart logic... (remains mostly the same)
    // Ensure D3 is loaded and elements exist
    if (typeof d3 === 'undefined' || !elements.results_chart || !elements.graph_container) {
        console.error("D3 library or chart elements not found.");
        if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.add('hidden');
        if(elements.graph_container) elements.graph_container.classList.add('hidden');
        return;
    }

    d3.select(elements.results_chart).selectAll("*").remove(); // Clear previous
    const resultsA = results?.resultsA || [];
    const resultsB = results?.resultsB || [];
    const lang = translations[currentLanguage];

    // 1. Prepare Data (A vs B)
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
                combinedDataMap.set(d.year, { year: d.year, age: d.userAge, valueB: valueB });
            }
        }
    });
    const combinedData = Array.from(combinedDataMap.values()).sort((a, b) => a.year - b.year);
    if (combinedData.length === 0) {
        console.warn("No data available to draw the standard chart.");
        // Don't hide buttons here, just don't draw
        return;
    }

    // 2. Setup SVG Dimensions (as before)
    const svg = d3.select(elements.results_chart);
    const container = elements.graph_container;
    const margin = { top: 20, right: 30, bottom: 40, left: 80 };
    const containerStyle = window.getComputedStyle(container);
    const availableWidth = parseInt(containerStyle.width) - parseInt(containerStyle.paddingLeft) - parseInt(containerStyle.paddingRight);
    const availableHeight = parseInt(containerStyle.height) - parseInt(containerStyle.paddingTop) - parseInt(containerStyle.paddingBottom);
    const titleElement = container.querySelector('h3');
    const titleHeight = titleElement ? titleElement.offsetHeight + parseInt(window.getComputedStyle(titleElement).marginBottom) : 20;
    const width = availableWidth - margin.left - margin.right;
    const height = availableHeight - margin.top - margin.bottom - titleHeight;

    if (width <= 0 || height <= 0) {
        console.error("Invalid chart dimensions calculated (width or height <= 0). Is the container visible?");
        return;
    }
    svg.attr("width", availableWidth).attr("height", availableHeight);
    const chartGroup = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip setup (ensure only one exists)
    d3.select('body').select('.d3-tooltip').remove(); // Remove existing before creating new
    const tooltip = d3.select('body').append('div').attr('class', 'd3-tooltip').style('opacity', 0);


    // 3. Define Scales (as before)
    const xMin = d3.min(combinedData, d => d.year);
    const xMax = d3.max(combinedData, d => d.year);
    const yMax = d3.max(combinedData, d => Math.max(d.valueA ?? 0, d.valueB ?? 0)) || 0;
    const yMin = 0;
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    const yScale = d3.scaleLinear().domain([yMin, yMax === 0 ? 1000 : yMax * 1.05]).nice().range([height, 0]);

    // 4. Define Axes (as before)
    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(Math.min(10, combinedData.length));
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatYAxisLabel);

    // 5. Draw Axes and Gridlines (as before)
    chartGroup.append("g").attr("class", "x axis").attr("transform", `translate(0,${height})`).call(xAxis);
    chartGroup.append("g").attr("class", "y axis").call(yAxis);
    chartGroup.append("g").attr("class", "grid").call(d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(""));

    // 6. Define Line Generators (as before)
    const lineA = d3.line().defined(d => d.valueA !== undefined && !isNaN(d.valueA)).x(d => xScale(d.year)).y(d => yScale(d.valueA));
    const lineB = d3.line().defined(d => d.valueB !== undefined && !isNaN(d.valueB)).x(d => xScale(d.year)).y(d => yScale(d.valueB));

    // 7. Draw Lines (as before)
    chartGroup.append("path").datum(combinedData).attr("class", "line line-a").attr("d", lineA);
    chartGroup.append("path").datum(combinedData).attr("class", "line line-b").attr("d", lineB);

    // 8. Add Interactivity (as before)
    const focusLine = chartGroup.append("line").attr("class", "focus-line").attr("y1", 0).attr("y2", height).style("opacity", 0); // Start hidden
    const overlay = chartGroup.append("rect").attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all");
    const bisectYear = d3.bisector(d => d.year).left;

    overlay.on("mouseover", () => { tooltip.style("opacity", 1); focusLine.style("opacity", 1); })
           .on("mouseout", () => { tooltip.style("opacity", 0); focusLine.style("opacity", 0); })
           .on("mousemove", (event) => {
                const pointer = d3.pointer(event, overlay.node()); const xCoord = pointer[0];
                if (xCoord < 0 || xCoord > width) { tooltip.style("opacity", 0); focusLine.style("opacity", 0); return; }
                const hoveredYear = Math.round(xScale.invert(xCoord));
                const index = bisectYear(combinedData, hoveredYear, 1);
                const d0 = combinedData[index - 1], d1 = combinedData[index];
                let d = (!d0) ? d1 : (!d1) ? d0 : (hoveredYear - d0.year > d1.year - hoveredYear) ? d1 : d0;
                if (!d || d.year === undefined) { tooltip.style("opacity", 0); focusLine.style("opacity", 0); return; }
                const focusX = xScale(d.year); if (isNaN(focusX)) return;
                focusLine.attr("x1", focusX).attr("x2", focusX).style("opacity", 1);
                tooltip.html(`<strong>${d.year} (${lang.colAge} ${d.age || 'N/A'})</strong><div><span class="color-a"></span>A: ${formatCurrency(d.valueA ?? 0)}</div><div><span class="color-b"></span>B: ${formatCurrency(d.valueB ?? 0)}</div>`)
                       .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px").style("opacity", 1);
           });
}