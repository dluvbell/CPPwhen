/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     5.1.2 (Refactor: Created from uiResultsDisplay.js)
 * @file        uiMonteCarloDisplay.js
 * @created     2025-11-02
 * @description Handles running Monte Carlo (standard and optimized) simulations and displaying results.
 * Relies on global state and functions from uiCore.js, uiResultsDisplay.js, engineCore.js.
 */

// uiMonteCarloDisplay.js
// Assumes global access to: elements, translations, formatCurrency, formatYAxisLabel (from uiCore.js),
// gatherInputs (from uiDataHandler.js),
// runMonteCarloSimulation, runOptimizedMonteCarloSimulation (from monteCarloEngine.js)
// and global state variables like lastRunWasOptimization, etc., from uiResultsDisplay.js

// --- State Variables (Monte Carlo specific) ---
let lastMonteCarloResults = null;
let lastMCNumRuns = 0;

function initializeMonteCarloDisplay() {
    // Add event listeners specific to Monte Carlo
    elements.runMonteCarloBtn?.addEventListener('click', () => runAndDisplayMonteCarlo(true));
    elements.runOptimizedMonteCarloBtn?.addEventListener('click', () => runAndDisplayOptimizedMonteCarlo(true));

    // Register this module's functions with uiCore if needed (e.g., for language updates)
    // This is handled by uiCore checking for getLastMonteCarloResults existence.
}

// --- Getter for other modules ---
function getLastMonteCarloResults() {
    return { ...lastMonteCarloResults, numRuns: lastMCNumRuns };
}


// ======================================================
// *** MONTE CARLO (v5.0.0) START ***
// ======================================================

/**
 * [MONTE CARLO EXECUTION] Runs the Monte Carlo simulation for both scenarios and displays results.
 * @param {boolean} showLoader - Not used, progress is shown on button.
 */
async function runAndDisplayMonteCarlo(showLoader = true) {
    lastRunWasOptimization = false; // Not an optimization run
    
    // Switch to results tab
    if (typeof switchTab === 'function') switchTab('results');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear previous results from other run types
    if (typeof clearD3Chart === 'function') clearD3Chart();
    chartRendered = false;
    if(elements.graph_container) elements.graph_container.classList.add('hidden');
    if(elements.additional_metrics_container) elements.additional_metrics_container.innerHTML = '';
    if(elements.detailed_table_container) elements.detailed_table_container.innerHTML = '';
    if(elements.monte_carlo_results_container) elements.monte_carlo_results_container.innerHTML = ''; // Clear previous MC results
    if(elements.break_even_text_result) elements.break_even_text_result.textContent = '';
    lastResultDetails = null;
    lastOptimizationResults = null;

    const lang = translations[currentLanguage];
    const originalButtonText = lang.runMonteCarloBtn || "Run Monte Carlo";

    try {
        // --- 1. Gather Inputs ---
        if (typeof gatherInputs !== 'function') throw new Error("gatherInputs function not available.");
        lastRunInputsA = gatherInputs('a');
        lastRunInputsB = gatherInputs('b');
        
        const baseYear = 2025; // Consistent with other engines
        const globalSettingsA = { province: lastRunInputsA.province, maxAge: lastRunInputsA.lifeExpectancy, cola: lastRunInputsA.cola, baseYear: baseYear };
        const globalSettingsB = { province: lastRunInputsB.province, maxAge: lastRunInputsB.lifeExpectancy, cola: lastRunInputsB.cola, baseYear: baseYear };

        const numRuns = parseInt(elements.monteCarloRunsSelect?.value) || 10000;
        
        const stdevsA = {
            rrsp: (parseFloat(elements.stdev_rrsp?.value) / 100) || 0,
            tfsa: (parseFloat(elements.stdev_tfsa?.value) / 100) || 0,
            nonreg: (parseFloat(elements.stdev_nonreg?.value) / 100) || 0,
            lif: (parseFloat(elements.stdev_lif?.value) / 100) || 0,
        };
        const stdevsB = {
            rrsp: (parseFloat(elements.stdev_rrsp_b?.value) / 100) || 0,
            tfsa: (parseFloat(elements.stdev_tfsa_b?.value) / 100) || 0,
            nonreg: (parseFloat(elements.stdev_nonreg_b?.value) / 100) || 0,
            lif: (parseFloat(elements.stdev_lif_b?.value) / 100) || 0,
        };
        
        // --- 2. Disable UI ---
        // *** MODIFICATION START v5.1.0: Disable all run buttons ***
        if(elements.runAnalysisBtn) elements.runAnalysisBtn.disabled = true;
        if(elements.runOptimizationBtn) elements.runOptimizationBtn.disabled = true;
        if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.disabled = true;
        if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.disabled = true;
        // *** MODIFICATION END v5.1.0 ***
        if(elements.results_container) elements.results_container.classList.add('hidden'); // Hide container while running
        
        // --- 3. Run Scenario A ---
        const progressCallbackA = (progress) => {
            const percent = Math.floor(progress * 100);
            if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.textContent = `Running A... ${percent}%`;
        };
        if (typeof runMonteCarloSimulation !== 'function') {
            throw new Error("Monte Carlo engine (monteCarloEngine.js) is not loaded correctly.");
        }
        
        console.log("Starting Monte Carlo for Scenario A...");
        const resultsA = await runMonteCarloSimulation(lastRunInputsA, globalSettingsA, stdevsA, numRuns, progressCallbackA);
        console.log("Scenario A MC Results:", resultsA);

        // --- 4. Run Scenario B ---
        const progressCallbackB = (progress) => {
            const percent = Math.floor(progress * 100);
            if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.textContent = `Running B... ${percent}%`;
        };
        
        console.log("Starting Monte Carlo for Scenario B...");
        const resultsB = await runMonteCarloSimulation(lastRunInputsB, globalSettingsB, stdevsB, numRuns, progressCallbackB);
        console.log("Scenario B MC Results:", resultsB);

        // --- 5. Store and Display Results ---
        lastMonteCarloResults = { resultsA, resultsB };
        lastMCNumRuns = numRuns;
        
        displayMonteCarloResults(resultsA, resultsB, numRuns);
        
        if(elements.results_container) elements.results_container.classList.remove('hidden'); // Show results
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = "Monte Carlo Simulation Complete";

    } catch (error) {
        console.error("Monte Carlo Simulation Failed:", error);
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = lang.errFailed + error.message;
        if(elements.results_container) elements.results_container.classList.remove('hidden');
    } finally {
        // --- 6. Re-enable UI ---
        // *** MODIFICATION START v5.1.0: Re-enable all run buttons ***
        if(elements.runAnalysisBtn) elements.runAnalysisBtn.disabled = false;
        if(elements.runOptimizationBtn) elements.runOptimizationBtn.disabled = false;
        if(elements.runMonteCarloBtn) {
            elements.runMonteCarloBtn.disabled = false;
            elements.runMonteCarloBtn.textContent = originalButtonText;
        }
        if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.disabled = false;
        // *** MODIFICATION END v5.1.0 ***
    }
}

// ======================================================
// *** MONTE CARLO (v5.0.0) END ***
// ======================================================

// *** MODIFICATION START v5.1.0: Add Optimized MC Execution Function ***
/**
 * [OPTIMIZED MONTE CARLO EXECUTION] Runs the *Optimized* MC simulation.
 * @param {boolean} showLoader - Not used, progress is shown on button.
 */
async function runAndDisplayOptimizedMonteCarlo(showLoader = true) {
    lastRunWasOptimization = false; // Still a MC run, not an optimization comparison
    
    // Switch to results tab
    if (typeof switchTab === 'function') switchTab('results');
    await new Promise(resolve => setTimeout(resolve, 50));

    // Clear previous results from other run types
    if (typeof clearD3Chart === 'function') clearD3Chart();
    chartRendered = false;
    if(elements.graph_container) elements.graph_container.classList.add('hidden');
    if(elements.additional_metrics_container) elements.additional_metrics_container.innerHTML = '';
    if(elements.detailed_table_container) elements.detailed_table_container.innerHTML = '';
    if(elements.monte_carlo_results_container) elements.monte_carlo_results_container.innerHTML = ''; // Clear previous MC results
    if(elements.break_even_text_result) elements.break_even_text_result.textContent = '';
    lastResultDetails = null;
    lastOptimizationResults = null;

    const lang = translations[currentLanguage];
    const originalButtonText = lang.runOptimizedMonteCarloBtn || "Run Optimized MC";

    try {
        // --- 1. Gather Inputs ---
        if (typeof gatherInputs !== 'function') throw new Error("gatherInputs function not available.");
        lastRunInputsA = gatherInputs('a');
        lastRunInputsB = gatherInputs('b');
        
        const baseYear = 2025; // Consistent with other engines
        const globalSettingsA = { province: lastRunInputsA.province, maxAge: lastRunInputsA.lifeExpectancy, cola: lastRunInputsA.cola, baseYear: baseYear };
        const globalSettingsB = { province: lastRunInputsB.province, maxAge: lastRunInputsB.lifeExpectancy, cola: lastRunInputsB.cola, baseYear: baseYear };

        // *** READ FROM OPTIMIZED DROPDOWN ***
        const numRuns = parseInt(elements.optimizedMonteCarloRunsSelect?.value) || 1000;
        
        const stdevsA = {
            rrsp: (parseFloat(elements.stdev_rrsp?.value) / 100) || 0,
            tfsa: (parseFloat(elements.stdev_tfsa?.value) / 100) || 0,
            nonreg: (parseFloat(elements.stdev_nonreg?.value) / 100) || 0,
            lif: (parseFloat(elements.stdev_lif?.value) / 100) || 0,
        };
        const stdevsB = {
            rrsp: (parseFloat(elements.stdev_rrsp_b?.value) / 100) || 0,
            tfsa: (parseFloat(elements.stdev_tfsa_b?.value) / 100) || 0,
            nonreg: (parseFloat(elements.stdev_nonreg_b?.value) / 100) || 0,
            lif: (parseFloat(elements.stdev_lif_b?.value) / 100) || 0,
        };
        
        // --- 2. Disable UI ---
        if(elements.runAnalysisBtn) elements.runAnalysisBtn.disabled = true;
        if(elements.runOptimizationBtn) elements.runOptimizationBtn.disabled = true;
        if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.disabled = true;
        if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.disabled = true; // Disable self
        if(elements.results_container) elements.results_container.classList.add('hidden'); // Hide container while running
        
        // --- 3. Run Scenario A ---
        const progressCallbackA = (progress) => {
            const percent = Math.floor(progress * 100);
            // *** UPDATE OPTIMIZED BUTTON TEXT ***
            if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.textContent = `Running A-Opt... ${percent}%`;
        };
        // *** CALL OPTIMIZED ENGINE FUNCTION ***
        if (typeof runOptimizedMonteCarloSimulation !== 'function') {
            throw new Error("Optimized Monte Carlo engine (monteCarloEngine.js) is not loaded correctly.");
        }
        
        console.log("Starting Optimized Monte Carlo for Scenario A...");
        const resultsA = await runOptimizedMonteCarloSimulation(lastRunInputsA, globalSettingsA, stdevsA, numRuns, progressCallbackA);
        console.log("Scenario A Optimized MC Results:", resultsA);

        // --- 4. Run Scenario B ---
        const progressCallbackB = (progress) => {
            const percent = Math.floor(progress * 100);
            // *** UPDATE OPTIMIZED BUTTON TEXT ***
            if(elements.runOptimizedMonteCarloBtn) elements.runOptimizedMonteCarloBtn.textContent = `Running B-Opt... ${percent}%`;
        };
        
        console.log("Starting Optimized Monte Carlo for Scenario B...");
        // *** CALL OPTIMIZED ENGINE FUNCTION ***
        const resultsB = await runOptimizedMonteCarloSimulation(lastRunInputsB, globalSettingsB, stdevsB, numRuns, progressCallbackB);
        console.log("Scenario B Optimized MC Results:", resultsB);

        // --- 5. Store and Display Results ---
        lastMonteCarloResults = { resultsA, resultsB }; // Store in the *same* variable
        lastMCNumRuns = numRuns;
        
        // *** RE-USE EXISTING DISPLAY FUNCTION ***
        displayMonteCarloResults(resultsA, resultsB, numRuns); 
        
        if(elements.results_container) elements.results_container.classList.remove('hidden'); // Show results
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = "Optimized Monte Carlo Simulation Complete";

    } catch (error) {
        console.error("Optimized Monte Carlo Simulation Failed:", error);
        if(elements.break_even_text_result) elements.break_even_text_result.textContent = lang.errFailed + error.message;
        if(elements.results_container) elements.results_container.classList.remove('hidden');
    } finally {
        // --- 6. Re-enable UI ---
        if(elements.runAnalysisBtn) elements.runAnalysisBtn.disabled = false;
        if(elements.runOptimizationBtn) elements.runOptimizationBtn.disabled = false;
        if(elements.runMonteCarloBtn) elements.runMonteCarloBtn.disabled = false;
        if(elements.runOptimizedMonteCarloBtn) {
            elements.runOptimizedMonteCarloBtn.disabled = false;
            elements.runOptimizedMonteCarloBtn.textContent = originalButtonText; // Restore original text
        }
    }
}

/**
 * [MONTE CARLO DISPLAY] Displays the statistical results from the MC run.
 * @param {object} resultsA - The statistics object for Scenario A.
 * @param {object} resultsB - The statistics object for Scenario B.
 * @param {number} numRuns - The number of runs performed.
 */
function displayMonteCarloResults(resultsA, resultsB, numRuns) {
    const lang = translations[currentLanguage];
    if (!elements.monte_carlo_results_container) return;

    const formatPercent = (val) => `${(val * 100).toFixed(1)}%`;
    
    // Use inline styles for the description text as style.css is fixed
    const descStyle = "font-size: 0.9em; font-weight: normal; color: var(--text-secondary);";

    const tableHTML = `
        <h3 data-lang-key="mcTitle">${lang.mcTitle}</h3>
        <p style="text-align: center; margin-top: -0.5rem; color: var(--text-secondary);" data-lang-key="mcSubTitle">${lang.mcSubTitle(numRuns)}</p>
        <table id="monte-carlo-results-table">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>${lang.metricsScenarioA}</th>
                    <th>${lang.metricsScenarioB}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${lang.mcSuccessRate}<br><span style="${descStyle}">(${lang.mcSuccessDesc})</span></td>
                    <td>${formatPercent(resultsA.successRate)}</td>
                    <td>${formatPercent(resultsB.successRate)}</td>
                </tr>
                <tr>
                    <td>${lang.mcP10}<br><span style="${descStyle}">(${lang.mcP10Desc})</span></td>
                    <td>${formatCurrency(resultsA.p10)}</td>
                    <td>${formatCurrency(resultsB.p10)}</td>
                </tr>
                <tr>
                    <td>${lang.mcMedian}<br><span style="${descStyle}">(${lang.mcMedianDesc})</span></td>
                    <td>${formatCurrency(resultsA.median)}</td>
                    <td>${formatCurrency(resultsB.median)}</td>
                </tr>
                 <tr>
                    <td>${lang.mcP90}<br><span style="${descStyle}">(${lang.mcP90Desc})</span></td>
                    <td>${formatCurrency(resultsA.p90)}</td>
                    <td>${formatCurrency(resultsB.p90)}</td>
                </tr>
            </tbody>
        </table>`;

    elements.monte_carlo_results_container.innerHTML = tableHTML;
}
// *** MODIFICATION END v5.1.0 ***