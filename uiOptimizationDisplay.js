/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     5.1.1 (Refactor: Created from uiResultsDisplay.js)
 * @file        uiOptimizationDisplay.js
 * @created     2025-11-02
 * @description Handles running optimization comparisons and displaying optimization results (metrics, table, CSV export, D3 graph).
 * Relies on global state and functions from uiCore.js, uiResultsDisplay.js, engineCore.js.
 */

// uiOptimizationDisplay.js
// Assumes global access to: elements, translations, formatCurrency, formatYAxisLabel (from uiCore.js),
// gatherInputs (from uiDataHandler.js), runFullOptimizedSimulation (from engineCore.js), d3 (from D3 library script),
// and global state variables like lastRunWasOptimization, lastOptimizationResults, etc., from uiResultsDisplay.js

// *** MODIFICATION START v3.3.1: Add Optimizer Run Function & Display Table & New Functions ***
// --- Optimizer Execution Function ---
async function runAndDisplayOptimization(showLoader = true) {
    lastRunWasOptimization = true; // Set state for this run type
    if (showLoader && elements.optimizer_loading_indicator) {
        elements.optimizer_loading_indicator.classList.remove('hidden');
        if(elements.results_container) elements.results_container.classList.add('hidden');
        if(elements.loading_indicator) elements.loading_indicator.classList.add('hidden'); // Hide standard loader
        if (typeof switchTab === 'function') switchTab('results');
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Clear previous graph and reset state before running new analysis
    if (typeof clearD3Chart === 'function') clearD3Chart();
    chartRendered = false;
    if(elements.graph_container) elements.graph_container.classList.add('hidden');
    // Hide buttons initially, show them on success
    if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.add('hidden');
    if(elements.toggle_details_btn) elements.toggle_details_btn.classList.add('hidden');
    if(elements.export_csv_btn) elements.export_csv_btn.classList.add('hidden');
    lastResultDetails = null; // Clear standard results if running optimization
    lastMonteCarloResults = null; // *** MONTE CARLO (v5.0.0): Clear MC results ***

    // *** MONTE CARLO (v5.0.0): Clear MC container ***
    if(elements.monte_carlo_results_container) elements.monte_carlo_results_container.innerHTML = '';
    // *** END MONTE CARLO ***

    // Define the progress callback
    const progressCallback = (update) => {
        const lang = translations[currentLanguage];
        if (elements.optimizer_loading_text) {
            let statusText = update.status || lang.loadingTextOptimizer || "Running Optimization...";
            elements.optimizer_loading_text.textContent = `${statusText} (${update.progress || 0}%)`;
        }
    };

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

        if (typeof runFullOptimizedSimulation !== 'function') {
            throw new Error("Optimization engine (engineCore.js) is not loaded correctly.");
        }

        const optimizationResults = await runFullOptimizedSimulation(lastRunInputsA, lastRunInputsB, progressCallback);
        lastOptimizationResults = optimizationResults; // Store optimization results

        console.log("Optimization Complete. Results:", optimizationResults);

        // --- Display Optimization Summary Table ---
        displayOptimizationSummaryTable(optimizationResults);

        // --- Populate Detailed Table Container (A-Opt vs B-Opt) ---
        displayOptimizationDetailedTable(optimizationResults); // Populate the hidden container

        // Show buttons now that results are ready
        if(elements.toggle_details_btn) elements.toggle_details_btn.classList.remove('hidden');
        if(elements.export_csv_btn) elements.export_csv_btn.classList.remove('hidden');
        // Only show graph button if there's data to graph
        if (optimizationResults?.A_Opt?.length > 0 || optimizationResults?.B_Opt?.length > 0) {
            if(elements.toggle_graph_btn) elements.toggle_graph_btn.classList.remove('hidden');
        }

        if(elements.results_container) elements.results_container.classList.remove('hidden');

    } catch (error) {
        console.error("Optimization Failed:", error);
        const lang = translations[currentLanguage];
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = lang.errSimFailed + error.message;
        if(elements.results_container) elements.results_container.classList.remove('hidden');
        // Clear both standard and optimization tables on error
        if(elements.additional_metrics_container) elements.additional_metrics_container.innerHTML = '';
        if(elements.detailed_table_container) elements.detailed_table_container.innerHTML = '';
        if(elements.detailed_table_container) elements.detailed_table_container.classList.add('hidden'); // Hide empty table
    } finally {
        if (showLoader && elements.optimizer_loading_indicator) elements.optimizer_loading_indicator.classList.add('hidden');
        // *** MODIFICATION START v5.1.0: Re-enable all run buttons ***
        if(elements.runAnalysisBtn) elements.runAnalysisBtn.disabled = false;
        if(elements.runOptimizationBtn) elements.runOptimizationBtn.disabled = false;
        if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.disabled = false;
        if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.disabled = false;
        // *** MODIFICATION END v5.1.0 ***
    }
}

/**
 * [OPTIMIZER DISPLAY] Displays the 5x2 summary table for optimization results.
 * @param {object} optimizationResults - The object containing A_Base, A_Opt, B_Base, B_Opt results.
 */
function displayOptimizationSummaryTable(optimizationResults) {
    const lang = translations[currentLanguage];
    const results = {
        'A-Base': optimizationResults?.A_Base || [],
        'A-Opt': optimizationResults?.A_Opt || [],
        'B-Base': optimizationResults?.B_Base || [],
        'B-Opt': optimizationResults?.B_Opt || []
    };

    // Helper functions (copied and adapted from displayComparisonMetrics)
    const getFinalAssets = (resArray) => {
        if (!resArray || resArray.length === 0) return 0;
        const lastYear = resArray[resArray.length - 1];
        return lastYear?.closingBalance ? Object.values(lastYear.closingBalance).reduce((sum, val) => sum + (val || 0), 0) : 0;
    };
    const getTotalIncome = (resArray) => {
         if (!resArray) return 0;
         return resArray.reduce((sum, yearData) => {
            const userInc = yearData?.income?.user || {};
            const spouseInc = yearData?.income?.spouse || {};
            const oasUserGross = (userInc.oas || 0) + (yearData?.oasClawback_user || 0);
            const oasSpouseGross = (spouseInc.oas || 0) + (yearData?.oasClawback_spouse || 0);
            const taxableWdUser = yearData?.withdrawals_user?.rrsp + yearData?.withdrawals_user?.lif || 0;
            const taxableWdSpouse = yearData?.withdrawals_spouse?.rrsp + yearData?.withdrawals_spouse?.lif || 0;
            const capGainsUser = yearData?.income?.user?.taxableNonRegGains * 2 || 0;
            const capGainsSpouse = yearData?.income?.spouse?.taxableNonRegGains * 2 || 0;

            return sum + (userInc.cpp || 0) + oasUserGross + (userInc.gis || 0) + (userInc.other || 0) + taxableWdUser + capGainsUser
                       + (spouseInc.cpp || 0) + oasSpouseGross + (spouseInc.gis || 0) + (spouseInc.other || 0) + taxableWdSpouse + capGainsSpouse;
        }, 0);
    };
    const getTotalTaxes = (resArray) => {
        if (!resArray) return 0;
        return resArray.reduce((sum, yearData) => sum + (yearData?.taxPayable || 0), 0);
    };

    // Calculate metrics for all 4 scenarios
    const metrics = {};
    Object.keys(results).forEach(key => {
        metrics[key] = {
            finalAssets: getFinalAssets(results[key]),
            totalIncome: getTotalIncome(results[key]),
            totalTaxes: getTotalTaxes(results[key])
        };
    });

    // Generate table HTML
    const tableHTML = `
        <h3>Optimization Comparison Summary</h3>
        <table id="additional-metrics-table">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>A (Base)</th>
                    <th>A (Optimized)</th>
                    <th>B (Base)</th>
                    <th>B (Optimized)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${lang.metricsFinalAssets}</td>
                    <td>${formatCurrency(metrics['A-Base'].finalAssets)}</td>
                    <td class="${metrics['A-Opt'].finalAssets > metrics['A-Base'].finalAssets ? 'metric-positive' : metrics['A-Opt'].finalAssets < metrics['A-Base'].finalAssets ? 'metric-negative' : ''}">${formatCurrency(metrics['A-Opt'].finalAssets)}</td>
                    <td>${formatCurrency(metrics['B-Base'].finalAssets)}</td>
                    <td class="${metrics['B-Opt'].finalAssets > metrics['B-Base'].finalAssets ? 'metric-positive' : metrics['B-Opt'].finalAssets < metrics['B-Base'].finalAssets ? 'metric-negative' : ''}">${formatCurrency(metrics['B-Opt'].finalAssets)}</td>
                </tr>
                <tr>
                    <td>${lang.metricsTotalIncomeGross}</td>
                    <td>${formatCurrency(metrics['A-Base'].totalIncome)}</td>
                    <td class="${metrics['A-Opt'].totalIncome > metrics['A-Base'].totalIncome ? 'metric-positive' : metrics['A-Opt'].totalIncome < metrics['A-Base'].totalIncome ? 'metric-negative' : ''}">${formatCurrency(metrics['A-Opt'].totalIncome)}</td>
                    <td>${formatCurrency(metrics['B-Base'].totalIncome)}</td>
                    <td class="${metrics['B-Opt'].totalIncome > metrics['B-Base'].totalIncome ? 'metric-positive' : metrics['B-Opt'].totalIncome < metrics['B-Base'].totalIncome ? 'metric-negative' : ''}">${formatCurrency(metrics['B-Opt'].totalIncome)}</td>
                </tr>
                <tr>
                    <td>${lang.metricsTotalTaxesPaid}</td>
                    <td>${formatCurrency(metrics['A-Base'].totalTaxes)}</td>
                     <td class="${metrics['A-Opt'].totalTaxes < metrics['A-Base'].totalTaxes ? 'metric-positive' : metrics['A-Opt'].totalTaxes > metrics['A-Base'].totalTaxes ? 'metric-negative' : ''}">${formatCurrency(metrics['A-Opt'].totalTaxes)}</td>
                    <td>${formatCurrency(metrics['B-Base'].totalTaxes)}</td>
                     <td class="${metrics['B-Opt'].totalTaxes < metrics['B-Base'].totalTaxes ? 'metric-positive' : metrics['B-Opt'].totalTaxes > metrics['B-Base'].totalTaxes ? 'metric-negative' : ''}">${formatCurrency(metrics['B-Opt'].totalTaxes)}</td>
                </tr>
            </tbody>
        </table>`;

    if(elements.additional_metrics_container) elements.additional_metrics_container.innerHTML = tableHTML;
    if(elements.break_even_text_result) elements.break_even_text_result.textContent = "Optimization Comparison Complete"; // Update completion message
}


/**
 * [OPTIMIZER DISPLAY] Displays the detailed year-by-year table comparing A-Opt vs B-Opt.
 * @param {object} optimizationResults - The object containing A_Base, A_Opt, B_Base, B_Opt results.
 */
function displayOptimizationDetailedTable(optimizationResults) {
    // Call the existing function, but pass the Optimized results
    // Assumes displayComparisonDetailedTable is globally available from uiResultsDisplay.js
    if (typeof displayComparisonDetailedTable === 'function') {
        displayComparisonDetailedTable({
            resultsA: optimizationResults?.A_Opt || [],
            resultsB: optimizationResults?.B_Opt || []
        });
        // Update the title if needed (optional)
        const tableTitleElement = elements.detailed_table_container?.querySelector('h3');
        if (tableTitleElement) {
            tableTitleElement.textContent = "Detailed Year-by-Year Comparison (Optimized A vs Optimized B)";
        }
    } else {
        console.error('displayComparisonDetailedTable function not found.');
    }
}

/**
 * [OPTIMIZER DISPLAY] Draws the D3 chart comparing A-Opt vs B-Opt assets.
 * @param {object} optimizationResults - The object containing A_Base, A_Opt, B_Base, B_Opt results.
 */
function drawOptimizationD3Chart(optimizationResults) {
    // Call the existing function, but pass the Optimized results
    // Assumes drawD3Chart is globally available from uiResultsDisplay.js
    if (typeof drawD3Chart === 'function') {
        drawD3Chart({
            resultsA: optimizationResults?.A_Opt || [],
            resultsB: optimizationResults?.B_Opt || []
        });
    } else {
        console.error('drawD3Chart function not found.');
    }
}

/**
 * [OPTIMIZER EXPORT] Exports optimization results (all 4 scenarios) to CSV.
 * @param {object} optimizationResults - Object with A_Base, A_Opt, B_Base, B_Opt arrays.
 * @param {object} inputsA - Input object for Scenario A.
 * @param {object} inputsB - Input object for Scenario B.
 */
function exportOptimizationToCsv(optimizationResults, inputsA, inputsB) {
    if (!optimizationResults || !inputsA || !inputsB) { console.error("No optimization results or inputs to export."); return; }
    const lang = translations[currentLanguage];
    const results = {
        'A_Base': optimizationResults.A_Base || [],
        'A_Opt': optimizationResults.A_Opt || [],
        'B_Base': optimizationResults.B_Base || [],
        'B_Opt': optimizationResults.B_Opt || []
    };
    const scenarios = ['A_Base', 'A_Opt', 'B_Base', 'B_Opt'];

    let csvContent = "data:text/csv;charset=utf-8,";

    // --- Input Parameters ---
    csvContent += "Input Parameters\r\n";
    const addInputRow = (param, valA, valB) => {
        const formatValue = (val) => (val === undefined || val === null ? "" : `"${String(val).replace(/"/g, '""')}"`);
        return `${formatValue(param)},${formatValue(valA)},${formatValue(valB)}\r\n`; // Only A and B inputs
    };
    const formatPercent = (val, digits = 1) => (typeof val === 'number' ? (val * 100).toFixed(digits) + '%' : val);

    csvContent += addInputRow("Parameter", "Scenario A", "Scenario B");
    csvContent += addInputRow("Province", inputsA.province, inputsB.province);
    // ... (Add other relevant input parameters like in exportToCsv, comparing A and B inputs) ...
    // Example:
    csvContent += addInputRow("Max Age", inputsA.lifeExpectancy, inputsB.lifeExpectancy);
    csvContent += addInputRow("Global COLA", formatPercent(inputsA.cola), formatPercent(inputsB.cola));
    csvContent += addInputRow("Retirement Age", inputsA.scenario.retirementAge, inputsB.scenario.retirementAge);
    // ... Add User, Spouse, Assets, Returns, Strategy details for A vs B ...
    csvContent += "\r\n";


    // --- Year-by-Year Data ---
    csvContent += "Year-by-Year Optimization Data\r\n";

    // Define columns (similar to displayComparisonDetailedTable)
    const cols = [
        { key: 'year', label: "Year", prop: 'year' },
        { key: 'userAge', label: lang.colAge, prop: 'userAge' },
        { key: 'closingBalanceTotal', label: lang.colTotalAssets, calc: d => Object.values(d?.closingBalance || {}).reduce((s,v)=>s+(v||0),0) },
        { key: 'incomeTotal', label: lang.colIncomeTotal, calc: d => (d?.income?.user?.cpp || 0) + (d?.income?.user?.oas || 0) + (d?.income?.user?.gis || 0) + (d?.income?.user?.other || 0) + (d?.income?.spouse?.cpp || 0) + (d?.income?.spouse?.oas || 0) + (d?.income?.spouse?.gis || 0) + (d?.income?.spouse?.other || 0) },
        { key: 'expenses', label: lang.colExpenses, prop: 'expenses' },
        { key: 'taxPayable', label: lang.colTaxesPaid, prop: 'taxPayable' },
        { key: 'netCashflow', label: lang.colNetCashflow, calc: d => ((d?.income?.user?.cpp || 0) + (d?.income?.user?.oas || 0) + (d?.income?.user?.gis || 0) + (d?.income?.user?.other || 0) + (d?.income?.spouse?.cpp || 0) + (d?.income?.spouse?.oas || 0) + (d?.income?.spouse?.gis || 0) + (d?.income?.spouse?.other || 0)) + (d?.withdrawals?.total || 0) - (d?.expenses || 0) - (d?.taxPayable || 0) },
        { key: 'wdTotal', label: lang.colWdTotal, prop: 'withdrawals.total' },
        { key: 'pensionSplit', label: 'Pension Split', calc: d => (d?.pensionSplit?.transferredFromUser || 0) + (d?.pensionSplit?.transferredFromSpouse || 0) }, // Include split amount
        { key: 'balTFSA', label: lang.colBalTFSA, prop: 'closingBalance.tfsa' },
        { key: 'balNonReg', label: lang.colBalNonReg, prop: 'closingBalance.nonreg' },
        { key: 'balRRSP', label: lang.colBalRRSP, prop: 'closingBalance.rrsp' },
        { key: 'balLIF', label: lang.colBalLIF, prop: 'closingBalance.lif' },
    ];

    // Build header row with 4 scenarios
    let headerRow = cols[0].label + "," + cols[1].label; // Year, Age
    scenarios.forEach(scenKey => {
        cols.slice(2).forEach(col => { // Skip Year/Age for scenario columns
            headerRow += `,${col.label}_${scenKey.replace('_', '-')}`;
        });
    });
    csvContent += headerRow + "\r\n";

    // Helper to get value
    const getValue = (data, prop) => {
         if (!data || typeof prop !== 'string') return "";
         const val = prop.split('.').reduce((o, i) => (o && typeof o === 'object' ? o[i] : undefined), data);
         return (val === undefined || val === null) ? "" : val;
     };
    const formatCsvNum = (num) => (typeof num === 'number' ? num : "");

    // Determine age range across all 4 scenarios
    let allAges = new Set();
    scenarios.forEach(key => {
        results[key].forEach(d => { if (d?.userAge !== undefined) allAges.add(d.userAge); });
    });
    const sortedAges = Array.from(allAges).sort((a, b) => a - b);
    if (sortedAges.length === 0) { console.warn("No data for CSV export."); return; }
    const minAge = sortedAges[0];
    const maxAge = sortedAges[sortedAges.length - 1];

    // Add data rows
    for (let age = minAge; age <= maxAge; age++) {
        let rowValues = [];
        let year = ""; // Find the year corresponding to this age
        // Find data for this age in each scenario
        const dataMap = {};
        scenarios.forEach(key => {
            dataMap[key] = results[key].find(d => d?.userAge === age);
            if (dataMap[key] && !year) year = dataMap[key].year; // Get year from the first available data
        });

        rowValues.push(year);
        rowValues.push(age);

        scenarios.forEach(scenKey => {
            const data = dataMap[scenKey];
            cols.slice(2).forEach(col => {
                let val = "";
                if (data) {
                    val = col.calc ? col.calc(data) : (col.prop ? getValue(data, col.prop) : "");
                }
                rowValues.push(formatCsvNum(val));
            });
        });
        csvContent += rowValues.join(',') + "\r\n";
    }

    // Trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "retirement_optimization_comparison.csv"); // Different filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// *** MODIFICATION END v3.3.1 ***