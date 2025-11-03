/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     5.3.1 (Bugfix: Handle 0 years in Canada, Fix spouse data reset)
 * @file        uiDataHandler.js
 * @created     2025-10-25
 * @description Manages internal data state (user/spouse for A/B), handles form sync, gathers final inputs, syncs A->B.
 */

// uiDataHandler.js
// Assumes global access to: elements (from uiCore.js), otherIncomes_a/_b (from uiIncomeModal.js), renderIncomeList (from uiIncomeModal.js), translations (from uiCore.js)

// --- State Variables (Data Handling) ---
let scenarioAData = { user: {}, spouse: {} };
let scenarioBData = { user: {}, spouse: {} };
let currentUserSelection_a = 'user';
let currentUserSelection_b = 'user';

// --- Initialization ---
function initializeScenarioData(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const dataStore = (s === 'a') ? scenarioAData : scenarioBData;

    // Initialize user data from form defaults or empty
    dataStore.user = {
        birthYear: parseInt(elements[`userBirthYear${suffix}`]?.value) || 1980,
        cppStartAge: parseInt(elements[`cppStartAge_${s}`]?.value) || 65,
        cppAt65: parseFloat(elements[`userCppAt65${suffix}`]?.value) || 0,
        oasStartAge: parseInt(elements[`oasStartAge_${s}`]?.value) || 65,
        userYearsInCanada: parseInt(elements[`userYearsInCanada${suffix}`]?.value) || 40, // *** NEW v5.3.0 ***
        assets: {
            rrsp: parseFloat(elements[`asset_rrsp${suffix}`]?.value) || 0,
            tfsa: parseFloat(elements[`asset_tfsa${suffix}`]?.value) || 0,
            nonreg: parseFloat(elements[`asset_nonreg${suffix}`]?.value) || 0,
            lif: parseFloat(elements[`asset_lif${suffix}`]?.value) || 0,
            nonreg_acb: parseFloat(elements[`asset_nonreg_acb${suffix}`]?.value) || 0,
        },
    };

    // Initialize spouse data with defaults (will be overwritten if spouse exists and is loaded)
    dataStore.spouse = {
        birthYear: (parseInt(elements[`userBirthYear${suffix}`]?.value) || 1980) + 1, // Default to user+1
        cppStartAge: dataStore.user.cppStartAge, // Default same as user
        cppAt65: (s === 'a' ? 4000 : 4000),      // Example default, might be 0
        oasStartAge: dataStore.user.oasStartAge,  // Default same as user
        userYearsInCanada: dataStore.user.userYearsInCanada, // *** NEW v5.3.0 ***
        assets: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, nonreg_acb: 0 }
    };

    console.log(`Initialized data store for scenario ${s}:`, JSON.parse(JSON.stringify(dataStore)));

    // Set up initial event listeners specific to data handling
    elements[`dataEntryTarget_${s}`]?.addEventListener('change', () => handleDataEntryTargetChange(s));
    elements[`hasSpouse${suffix}`]?.addEventListener('change', () => handleHasSpouseChange(s));

    // Populate withdrawal dropdowns initially (depends on language being set first by uiCore)
    populateWithdrawalDropdowns(s);

    // *** MODIFICATION START v3.3.2: Add listeners for A -> B sync ***
    if (s === 'a') {
        const scenarioAInputs = [
            // Basic Info & Assumptions (Global - apply to B directly)
            'province', 'lifeExpectancy', 'cola',
            // Retirement Age (Scenario specific - apply to B directly)
            'retirementAge_a',
            // User/Spouse Specific (Apply based on dataEntryTarget_a)
            'userBirthYear', 'cppStartAge_a', 'userCppAt65', 'oasStartAge_a',
            'userYearsInCanada', // *** NEW v5.3.0 ***
            'asset_rrsp', 'asset_tfsa', 'asset_nonreg', 'asset_lif', 'asset_nonreg_acb',
            'income-type', // *** ADDED v4.0.0 ***
            // Returns (Global - apply to B directly)
            'return_rrsp', 'return_tfsa', 'return_nonreg', 'return_lif',
            // Withdrawal Strategy (Scenario specific - apply to B directly)
            'phase1_startAge_a', 'phase1_endAge_a', 
            'phase1_order1_a', 'phase1_order2_a', 'phase1_order3_a', 'phase1_order4_a',
            'phase2_startAge_a', 'phase2_endAge_a', 
            'phase2_order1_a', 'phase2_order2_a', 'phase2_order3_a', 'phase2_order4_a',
            'phase3_startAge_a', 'phase3_endAge_a', 
            'phase3_order1_a', 'phase3_order2_a', 'phase3_order3_a', 'phase3_order4_a',
            // phaseX_expenses_a keys REMOVED v4.0.0
        ];

        scenarioAInputs.forEach(idA => {
            const elementA = elements[idA.replace(/-/g, '_')]; // Use camelCase key
            if (elementA) {
                // Use 'input' for text/number, 'change' for select
                const eventType = (elementA.tagName === 'SELECT') ? 'change' : 'input';
                elementA.addEventListener(eventType, () => syncInputAtoB(idA));
            } else {
                console.warn(`Sync listener: Element with ID ${idA} not found.`);
            }
        });

        // Special listener for the 'hasSpouse' checkbox
        const hasSpouseA = elements.hasSpouse;
        if (hasSpouseA) {
            hasSpouseA.addEventListener('change', () => syncCheckboxAtoB('hasSpouse'));
        }

        // *** 신규 추가 (v4.1.0) ***
        elements.income_is_medical?.addEventListener('change', () => syncCheckboxAtoB('income-is-medical'));

    }
    // *** MODIFICATION END v3.3.2 ***
}

// --- Data Synchronization Functions ---

// Save data from the form into the internal state for the currently selected person
function saveCurrentPersonData(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const dataStore = (s === 'a') ? scenarioAData : scenarioBData;
    const currentSelection = (s === 'a') ? currentUserSelection_a : currentUserSelection_b;

    if (!dataStore[currentSelection]) return; // Safety check

    console.log(`Saving data for Scenario ${s.toUpperCase()}, Person: ${currentSelection}`);

    dataStore[currentSelection] = {
        birthYear: parseInt(elements[`userBirthYear${suffix}`]?.value) || 0,
        cppStartAge: parseInt(elements[`cppStartAge_${s}`]?.value) || 0,
        cppAt65: parseFloat(elements[`userCppAt65${suffix}`]?.value) || 0,
        oasStartAge: parseInt(elements[`oasStartAge_${s}`]?.value) || 0,
        userYearsInCanada: parseInt(elements[`userYearsInCanada${suffix}`]?.value) || 0, // *** NEW v5.3.0 *** (Default 0, 40 is set in engine if null/undefined)
        assets: {
            rrsp: parseFloat(elements[`asset_rrsp${suffix}`]?.value) || 0,
            tfsa: parseFloat(elements[`asset_tfsa${suffix}`]?.value) || 0,
            nonreg: parseFloat(elements[`asset_nonreg${suffix}`]?.value) || 0,
            lif: parseFloat(elements[`asset_lif${suffix}`]?.value) || 0,
            nonreg_acb: parseFloat(elements[`asset_nonreg_acb${suffix}`]?.value) || 0,
        }
    };
    // Note: Other incomes are managed separately by uiIncomeModal.js
    console.log('Saved data store:', JSON.parse(JSON.stringify(dataStore)));
}

// Load data from the internal state into the form for the currently selected person
function loadPersonData(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const dataStore = (s === 'a') ? scenarioAData : scenarioBData;
    const currentSelection = (s === 'a') ? currentUserSelection_a : currentUserSelection_b;

    if (!dataStore[currentSelection]) {
        console.error(`Data for ${currentSelection} in scenario ${s} not found.`);
        return;
    }

    console.log(`Loading data into form for Scenario ${s.toUpperCase()}, Person: ${currentSelection}`);
    // console.log('Data to load:', JSON.parse(JSON.stringify(dataStore[currentSelection])));

    const personData = dataStore[currentSelection];

    // Populate form fields (ensure elements exist)
    if(elements[`userBirthYear${suffix}`]) elements[`userBirthYear${suffix}`].value = personData.birthYear || '';
    if(elements[`cppStartAge_${s}`]) elements[`cppStartAge_${s}`].value = personData.cppStartAge || '';
    if(elements[`userCppAt65${suffix}`]) elements[`userCppAt65${suffix}`].value = personData.cppAt65 || '';
    if(elements[`oasStartAge_${s}`]) elements[`oasStartAge_${s}`].value = personData.oasStartAge || '';
    if(elements[`userYearsInCanada${suffix}`]) elements[`userYearsInCanada${suffix}`].value = personData.userYearsInCanada || ''; // *** NEW v5.3.0 ***
    if(elements[`asset_rrsp${suffix}`]) elements[`asset_rrsp${suffix}`].value = personData.assets?.rrsp || '';
    if(elements[`asset_tfsa${suffix}`]) elements[`asset_tfsa${suffix}`].value = personData.assets?.tfsa || '';
    if(elements[`asset_nonreg${suffix}`]) elements[`asset_nonreg${suffix}`].value = personData.assets?.nonreg || '';
    if(elements[`asset_lif${suffix}`]) elements[`asset_lif${suffix}`].value = personData.assets?.lif || '';
    if(elements[`asset_nonreg_acb${suffix}`]) elements[`asset_nonreg_acb${suffix}`].value = personData.assets?.nonreg_acb || '';

    renderIncomeList(s); // Refresh income list view (calls function in uiIncomeModal.js)
}

// Reset spouse data in the internal store and optionally clear form
function resetSpouseData(scenarioSuffix, clearFormIfViewing = true) {
    const s = scenarioSuffix;
    const dataStore = (s === 'a') ? scenarioAData : scenarioBData;
    const currentSelection = (s === 'a') ? currentUserSelection_a : currentUserSelection_b;

    console.log(`Resetting spouse data for scenario ${s}`);

    // Reset internal spouse data structure
    dataStore.spouse = {
        birthYear: (dataStore.user?.birthYear || 1980) + 1, // Default based on user
        // *** MODIFICATION v5.3.1: Use independent defaults instead of copying user's current values ***
        cppStartAge: 65, // *** MODIFIED: Use independent default ***
        cppAt65: 0,
        oasStartAge: 65, // *** MODIFIED: Use independent default ***
        userYearsInCanada: 40, // *** MODIFIED: Use independent default 40 ***
        // *** END MODIFICATION v5.3.1 ***
        assets: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, nonreg_acb: 0 }
    };

    // Remove spouse-owned incomes (accessing global variable from uiIncomeModal.js)
    if (s === 'a') {
        otherIncomes_a = otherIncomes_a.filter(inc => inc.owner !== 'spouse');
    } else {
        otherIncomes_b = otherIncomes_b.filter(inc => inc.owner !== 'spouse');
    }

    // If the form was showing the spouse, load the newly reset (mostly empty) spouse data
    if (clearFormIfViewing && currentSelection === 'spouse') {
         console.log("Form was viewing spouse, loading reset data into form.");
        loadPersonData(s); // Load the blank spouse data
    }
     renderIncomeList(s); // Update income list (in uiIncomeModal.js)
     console.log('Reset spouse data store:', JSON.parse(JSON.stringify(dataStore)));
}

// --- Event Handlers ---

// Handle change in the 'Data Entry For' dropdown
function handleDataEntryTargetChange(scenarioSuffix) {
    const s = scenarioSuffix;
    const targetDropdown = elements[`dataEntryTarget_${s}`];
    if (!targetDropdown) return;
    const newSelection = targetDropdown.value;
    const oldSelection = (s === 'a') ? currentUserSelection_a : currentUserSelection_b;

    if (newSelection === oldSelection) return;

    console.log(`Dropdown change for scenario ${s}: ${oldSelection} -> ${newSelection}`);

    saveCurrentPersonData(s); // Saves data for 'oldSelection' from the form

    // Update the current selection state
    if (s === 'a') { currentUserSelection_a = newSelection; }
    else { currentUserSelection_b = newSelection; }

    loadPersonData(s); // Loads data for 'newSelection' into the form
}

 // Handle change in the 'Include Spouse' checkbox
function handleHasSpouseChange(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const checkbox = elements[`hasSpouse${suffix}`];
    const targetDropdown = elements[`dataEntryTarget_${s}`];
    if (!checkbox || !targetDropdown) return;
    const spouseOption = targetDropdown.querySelector('option[value="spouse"]');

    if (!spouseOption) return;

    console.log(`hasSpouse checkbox changed for scenario ${s}: ${checkbox.checked}`);

    spouseOption.disabled = !checkbox.checked;

    if (!checkbox.checked) {
        // If spouse is currently selected, switch back to user and reset spouse data
        if (targetDropdown.value === 'spouse') {
             console.log("Spouse was selected, switching back to user and resetting spouse data.");
            targetDropdown.value = 'user';
             if (s === 'a') { currentUserSelection_a = 'user'; } else { currentUserSelection_b = 'user'; }
             resetSpouseData(s, true); // Reset internal spouse data AND load blank data into form
             // No need to call loadPersonData('user') as resetSpouseData(s, true) effectively calls loadPersonData('spouse') with blank data
        } else {
             // If user is selected, just reset the internal spouse data silently
             console.log("User was selected, resetting internal spouse data only.");
             resetSpouseData(s, false);
        }
    }
    // Always render income list to update owner dropdown visibility/content
    renderIncomeList(s); // Function in uiIncomeModal.js

    // *** MODIFICATION START v3.3.2: Explicitly sync checkbox state after handling ***
    if (s === 'a') {
        syncCheckboxAtoB('hasSpouse'); // Sync the final state to B
    }
    // *** MODIFICATION END v3.3.2 ***
}

// --- Populate Withdrawal Dropdowns ---
function populateWithdrawalDropdowns(scenarioSuffix) {
    const s = scenarioSuffix;
    const lang = translations[currentLanguage]; // Assumes currentLanguage is global from uiCore.js
    const accountOptions = [
        { value: 'tfsa', text: lang.optionTFSA },
        { value: 'nonreg', text: lang.optionNonReg },
        { value: 'rrsp', text: lang.optionRRSP },
        { value: 'lif', text: lang.optionLIF },
        { value: 'none', text: lang.optionNone }
    ];
    // Define default order for each phase (can be customized)
    const defaultOrders = [
        ['tfsa', 'nonreg', 'rrsp', 'none'], // Phase 1 default
        ['nonreg', 'tfsa', 'rrsp', 'none'], // Phase 2 default
        ['nonreg', 'tfsa', 'rrsp', 'lif']   // Phase 3 default
    ];

    for (let phase = 1; phase <= 3; phase++) {
        for (let order = 1; order <= 4; order++) {
            const selectId = `phase${phase}_order${order}_${s}`;
            const selectElement = elements[selectId.replace(/-/g,'_')]; // Use elements object
            if (selectElement) {
                const currentValue = selectElement.value; // Store current value if element already exists
                selectElement.innerHTML = ''; // Clear existing options
                accountOptions.forEach(opt => {
                    selectElement.innerHTML += `<option value="${opt.value}">${opt.text}</option>`;
                });
                // Restore previous value or set default
                 if (currentValue && accountOptions.some(opt => opt.value === currentValue)) {
                     selectElement.value = currentValue;
                 } else {
                    selectElement.value = defaultOrders[phase - 1]?.[order - 1] || 'none';
                 }
            }
        }
    }
}


// --- Data Gathering for Simulation ---
function gatherInputs(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const dataStore = (s === 'a') ? scenarioAData : scenarioBData;
    let incomesAndExpenses = (s === 'a') ? otherIncomes_a : otherIncomes_b; // Access global from uiIncomeModal.js
    const hasSpouseChecked = elements[`hasSpouse${suffix}`]?.checked || false;

    saveCurrentPersonData(s); // Ensure the latest form data for the *currently viewed* person is in the internal state

    // *** MODIFICATION v4.0.0: Filter incomes AND expenses based on ownership ***
    let userItems = incomesAndExpenses.filter(inc => inc.owner === 'user');
    let spouseItems = hasSpouseChecked ? incomesAndExpenses.filter(inc => inc.owner === 'spouse') : [];

    // Function to get strategy for a specific phase
    const getPhaseStrategy = (phaseNum) => {
         const order = [
             elements[`phase${phaseNum}_order1_${s}`]?.value || 'none',
             elements[`phase${phaseNum}_order2_${s}`]?.value || 'none',
             elements[`phase${phaseNum}_order3_${s}`]?.value || 'none',
             elements[`phase${phaseNum}_order4_${s}`]?.value || 'none'
         ].filter(acc => acc !== 'none'); // Remove 'none' placeholders
         return {
             startAge: parseInt(elements[`phase${phaseNum}_startAge_${s}`]?.value) || 0,
             endAge: parseInt(elements[`phase${phaseNum}_endAge_${s}`]?.value) || 0,
             // expenses: parseFloat(elements[`phase${phaseNum}_expenses_${s}`]?.value) || 0, // REMOVED v4.0.0
             order: order
         };
    };
    const withdrawalStrategy = [getPhaseStrategy(1), getPhaseStrategy(2), getPhaseStrategy(3)];

    // Gather common scenario inputs
    const commonInputs = {
        province: elements[`province${suffix}`]?.value || 'ON',
        lifeExpectancy: parseInt(elements[`lifeExpectancy${suffix}`]?.value) || 95,
        cola: (parseFloat(elements[`cola${suffix}`]?.value) / 100) || 0.025,
        returns: {
            rrsp: (parseFloat(elements[`return_rrsp${suffix}`]?.value) || 0) / 100,
            tfsa: (parseFloat(elements[`return_tfsa${suffix}`]?.value) || 0) / 100,
            nonreg: (parseFloat(elements[`return_nonreg${suffix}`]?.value) || 0) / 100,
            lif: (parseFloat(elements[`return_lif${suffix}`]?.value) || 0) / 100
        },
        retirementAge: parseInt(elements[`retirementAge_${s}`]?.value) || 65, // Get scenario-specific retirement age,
    };

    // Prepare user data from internal store
    const userData = dataStore.user || {};
    const userInitialNonRegGains = Math.max(0, (userData.assets?.nonreg || 0) - (userData.assets?.nonreg_acb || 0));
    const userScenarioData = {
        birthYear: userData.birthYear,
        cppStartAge: userData.cppStartAge,
        cppAt65: userData.cppAt65,
        oasStartAge: userData.oasStartAge,
        userYearsInCanada: userData.userYearsInCanada, // *** NEW v5.3.0 ***
        assets: { ...userData.assets }, // Copy assets
        initialNonRegGains: userInitialNonRegGains,
        otherIncomes: userItems, // *** MODIFIED v4.0.0: Pass all items (income+expense) ***
    };

     // Prepare spouse data from internal store if included
     let spouseScenarioData = null;
     if (hasSpouseChecked) {
         const spouseData = dataStore.spouse || {};
         const spouseInitialNonRegGains = Math.max(0, (spouseData.assets?.nonreg || 0) - (spouseData.assets?.nonreg_acb || 0));
         spouseScenarioData = {
             birthYear: spouseData.birthYear,
             cppStartAge: spouseData.cppStartAge,
             cppAt65: spouseData.cppAt65,
             oasStartAge: spouseData.oasStartAge,
             userYearsInCanada: spouseData.userYearsInCanada, // *** NEW v5.3.0 ***
             assets: { ...spouseData.assets }, // Copy assets
             initialNonRegGains: spouseInitialNonRegGains,
             otherIncomes: spouseItems, // *** MODIFIED v4.0.0: Pass all items (income+expense) ***
         };
     }

    // Combine all inputs for the engine
    return {
        province: commonInputs.province,
        lifeExpectancy: commonInputs.lifeExpectancy,
        cola: commonInputs.cola, // Global COLA
        scenario: {
            // Scenario-specific settings that might differ
            province: commonInputs.province,
            retirementAge: commonInputs.retirementAge,
            returns: commonInputs.returns,
            user: userScenarioData,
            spouse: {
                hasSpouse: hasSpouseChecked,
                data: spouseScenarioData
            },
             withdrawalStrategy: withdrawalStrategy
        }
    };
}


// *** MODIFICATION START v3.3.2: Add Sync Helper Functions ***

/**
 * [HELPER] Syncs the value from a Scenario A input/select to Scenario B.
 * Updates both the B element's value and the internal scenarioBData store.
 * @param {string} elementIdA - The ID of the Scenario A element that changed.
 */
function syncInputAtoB(elementIdA) {
    const elementA = elements[elementIdA.replace(/-/g, '_')];
    if (!elementA) return;

    const newValue = elementA.value;
    let elementIdB = elementIdA.endsWith('_a') ? elementIdA.slice(0, -2) + '_b' : elementIdA + '_b';

    // Handle exceptions where B ID doesn't follow the simple pattern
    if (elementIdA === 'province' || elementIdA === 'lifeExpectancy' || elementIdA === 'cola' || elementIdA === 'userBirthYear' || elementIdA === 'userCppAt65' || elementIdA.startsWith('asset_') || elementIdA.startsWith('return_') || elementIdA === 'income-type' || elementIdA === 'userYearsInCanada') { // *** 'userYearsInCanada' ADDED v5.3.0 ***
        elementIdB = elementIdA + '_b'; // e.g., province -> province_b
    }
    // else: Handles retirementAge_a -> retirementAge_b, cppStartAge_a -> cppStartAge_b, phaseX_..._a -> phaseX_..._b etc.

    const elementB = elements[elementIdB.replace(/-/g, '_')];

    if (elementB) {
        if (elementB.value !== newValue) {
            console.log(`Syncing ${elementIdA} ('${newValue}') to ${elementIdB}`);
            elementB.value = newValue;

            // Also update internal scenarioBData store
            // Determine if the field belongs to user/spouse or is global/scenario-level
            const personKey = currentUserSelection_a; // 'user' or 'spouse' based on A's dropdown
            const fieldKey = elementIdA.replace('_a', '').replace(/^(phase\d_order\d)$/, '$1'); // Normalize key

            // Update scenarioBData based on field type
            if (['province', 'lifeExpectancy', 'cola', 'retirementAge_a', 'return_rrsp', 'return_tfsa', 'return_nonreg', 'return_lif'].includes(elementIdA) || elementIdA.startsWith('phase') || elementIdA === 'income-type') { // *** 'income-type' ADDED v4.0.0 ***
                 // Update global/scenario level fields in B (less common - mostly for strategy)
                 // This part needs careful mapping if you store strategy/returns directly in scenarioBData
                 // For now, focus on user/spouse data which is more critical for consistency
                console.log(`Note: Syncing scenario-level field ${fieldKey} - internal data update skipped for simplicity.`);
            } else if (scenarioBData[personKey]) {
                // Update user/spouse specific fields
                let targetObject = scenarioBData[personKey];
                let valueToSet = (elementA.type === 'number') ? parseFloat(newValue) || 0 : newValue;

                if (fieldKey.startsWith('asset_')) {
                    if (!targetObject.assets) targetObject.assets = {};
                     targetObject.assets[fieldKey.replace('asset_', '')] = valueToSet;
                } else if (fieldKey === 'userBirthYear') {
                    targetObject.birthYear = parseInt(newValue) || 0;
                 } else if (fieldKey === 'cppStartAge') {
                     targetObject.cppStartAge = parseInt(newValue) || 0;
                 } else if (fieldKey === 'userCppAt65') {
                    targetObject.cppAt65 = valueToSet;
                 } else if (fieldKey === 'oasStartAge') {
                    targetObject.oasStartAge = parseInt(newValue) || 0;
                 } else if (fieldKey === 'userYearsInCanada') { // *** NEW v5.3.0 ***
                    targetObject.userYearsInCanada = parseInt(newValue) || 0;
                 }
                 console.log(`Updated scenarioBData.${personKey} for ${fieldKey}`);
            }
        }
    } else {
        // console.warn(`Sync target element ${elementIdB} not found for source ${elementIdA}`);
    }
}

/**
 * [HELPER] Syncs the checked state from a Scenario A checkbox to Scenario B.
 * Updates both the B element's state and the internal scenarioBData store.
 * @param {string} checkboxIdA - The ID of the Scenario A checkbox that changed (e.g., 'hasSpouse').
 */
function syncCheckboxAtoB(checkboxIdA) {
    const checkboxA = elements[checkboxIdA.replace(/-/g, '_')];
    if (!checkboxA) return;

    const isChecked = checkboxA.checked;
    const checkboxIdB = checkboxIdA + '_b'; // Assumes simple ID pattern like 'hasSpouse_b'
    const checkboxB = elements[checkboxIdB.replace(/-/g, '_')];

    if (checkboxB) {
        if (checkboxB.checked !== isChecked) {
             console.log(`Syncing ${checkboxIdA} (${isChecked}) to ${checkboxIdB}`);
            checkboxB.checked = isChecked;
            // Trigger the change handler for B to ensure its UI updates correctly
            // *** Special handling for 'hasSpouse' checkbox ***
            if (checkboxIdA === 'hasSpouse') {
                handleHasSpouseChange('b');
            }
        }
    } else {
         console.warn(`Sync target checkbox ${checkboxIdB} not found for source ${checkboxIdA}`);
    }
}
// *** MODIFICATION END v3.3.2 ***

// *** MODIFICATION START v5.2.0: Add JSON Import/Export Handlers ***

/**
 * [JSON Export] Gathers all input data and triggers a download.
 */
function handleSaveScenarioClick() {
    console.log("Saving scenario...");
    // Ensure current data is saved from forms to the data stores
    saveCurrentPersonData('a');
    saveCurrentPersonData('b');

    // Gather all data into one object
    const dataToSave = {
        // Global settings
        province: elements.province?.value,
        lifeExpectancy: parseInt(elements.lifeExpectancy?.value),
        cola: parseFloat(elements.cola?.value),
        // StDevs (A)
        stdevs: {
            rrsp: parseFloat(elements.stdev_rrsp?.value),
            tfsa: parseFloat(elements.stdev_tfsa?.value),
            nonreg: parseFloat(elements.stdev_nonreg?.value),
            lif: parseFloat(elements.stdev_lif?.value),
        },
        // StDevs (B)
         stdevs_b: {
            rrsp: parseFloat(elements.stdev_rrsp_b?.value),
            tfsa: parseFloat(elements.stdev_tfsa_b?.value),
            nonreg: parseFloat(elements.stdev_nonreg_b?.value),
            lif: parseFloat(elements.stdev_lif_b?.value),
        },
        // Scenario A data (internal stores)
        scenarioAData: scenarioAData,
        otherIncomes_a: otherIncomes_a,
        // Scenario A strategy (from form)
        strategy_a: {
            phase1: { start: elements.phase1_startAge_a?.value, end: elements.phase1_endAge_a?.value, order: [elements.phase1_order1_a?.value, elements.phase1_order2_a?.value, elements.phase1_order3_a?.value, elements.phase1_order4_a?.value] },
            phase2: { start: elements.phase2_startAge_a?.value, end: elements.phase2_endAge_a?.value, order: [elements.phase2_order1_a?.value, elements.phase2_order2_a?.value, elements.phase2_order3_a?.value, elements.phase2_order4_a?.value] },
            phase3: { start: elements.phase3_startAge_a?.value, end: elements.phase3_endAge_a?.value, order: [elements.phase3_order1_a?.value, elements.phase3_order2_a?.value, elements.phase3_order3_a?.value, elements.phase3_order4_a?.value] },
            retirementAge: elements.retirementAge_a?.value,
            returns: { rrsp: elements.return_rrsp?.value, tfsa: elements.return_tfsa?.value, nonreg: elements.return_nonreg?.value, lif: elements.return_lif?.value }
        },
        // Scenario B data (internal stores)
        scenarioBData: scenarioBData,
        otherIncomes_b: otherIncomes_b,
        // Scenario B strategy (from form)
         strategy_b: {
            phase1: { start: elements.phase1_startAge_b?.value, end: elements.phase1_endAge_b?.value, order: [elements.phase1_order1_b?.value, elements.phase1_order2_b?.value, elements.phase1_order3_b?.value, elements.phase1_order4_b?.value] },
            phase2: { start: elements.phase2_startAge_b?.value, end: elements.phase2_endAge_b?.value, order: [elements.phase2_order1_b?.value, elements.phase2_order2_b?.value, elements.phase2_order3_b?.value, elements.phase2_order4_b?.value] },
            phase3: { start: elements.phase3_startAge_b?.value, end: elements.phase3_endAge_b?.value, order: [elements.phase3_order1_b?.value, elements.phase3_order2_b?.value, elements.phase3_order3_b?.value, elements.phase3_order4_b?.value] },
            retirementAge: elements.retirementAge_b?.value,
            returns: { rrsp: elements.return_rrsp_b?.value, tfsa: elements.return_tfsa_b?.value, nonreg: elements.return_nonreg_b?.value, lif: elements.return_lif_b?.value }
        },
        // Spouse checkboxes
        hasSpouse: elements.hasSpouse?.checked,
        hasSpouse_b: elements.hasSpouse_b?.checked
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(dataToSave, null, 2); // Pretty print
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'retirement_scenario.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * [JSON Import] Triggers the hidden file input.
 */
function handleLoadScenarioClick() {
    elements.scenario_file_input?.click();
}

/**
 * [JSON Import] Handles the file selection, reads, and parses it.
 */
function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) { return; }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            console.log("Loaded scenario data:", data);
            populateUIFromLoadedData(data);
        } catch (error) {
            console.error("Failed to parse scenario file:", error);
            alert("Error: The selected file is not a valid JSON scenario file.");
        }
        // Reset file input to allow loading the same file again
        event.target.value = null;
    };
    reader.onerror = () => {
        console.error("Failed to read file:", reader.error);
        alert("Error: Could not read the selected file.");
    };
    reader.readAsText(file);
}

/**
 * [JSON Import] Populates all internal states and UI forms from the loaded data.
 */
function populateUIFromLoadedData(data) {
    if (!data || !data.scenarioAData || !data.scenarioBData) {
        alert("Error: Invalid scenario file structure.");
        return;
    }

    // --- 1. Restore Internal State ---
    scenarioAData = data.scenarioAData;
    scenarioBData = data.scenarioBData;
    otherIncomes_a = data.otherIncomes_a || [];
    otherIncomes_b = data.otherIncomes_b || [];

    // --- 2. Restore Global Form Inputs ---
    if(elements.province) elements.province.value = data.province || 'ON';
    if(elements.lifeExpectancy) elements.lifeExpectancy.value = data.lifeExpectancy || 95;
    if(elements.cola) elements.cola.value = data.cola || 2.5;
    // StDevs A
    if(elements.stdev_rrsp) elements.stdev_rrsp.value = data.stdevs?.rrsp || 12;
    if(elements.stdev_tfsa) elements.stdev_tfsa.value = data.stdevs?.tfsa || 12;
    if(elements.stdev_nonreg) elements.stdev_nonreg.value = data.stdevs?.nonreg || 12;
    if(elements.stdev_lif) elements.stdev_lif.value = data.stdevs?.lif || 8;
    // StDevs B
    if(elements.stdev_rrsp_b) elements.stdev_rrsp_b.value = data.stdevs_b?.rrsp || 12;
    if(elements.stdev_tfsa_b) elements.stdev_tfsa_b.value = data.stdevs_b?.tfsa || 12;
    if(elements.stdev_nonreg_b) elements.stdev_nonreg_b.value = data.stdevs_b?.nonreg || 12;
    if(elements.stdev_lif_b) elements.stdev_lif_b.value = data.stdevs_b?.lif || 8;
    
    // --- 3. Restore Scenario A Strategy ---
    if(elements.retirementAge_a) elements.retirementAge_a.value = data.strategy_a?.retirementAge || 61;
    if(elements.return_rrsp) elements.return_rrsp.value = data.strategy_a?.returns?.rrsp || 7;
    if(elements.return_tfsa) elements.return_tfsa.value = data.strategy_a?.returns?.tfsa || 7;
    if(elements.return_nonreg) elements.return_nonreg.value = data.strategy_a?.returns?.nonreg || 7;
    if(elements.return_lif) elements.return_lif.value = data.strategy_a?.returns?.lif || 5;
    if(elements.phase1_startAge_a) elements.phase1_startAge_a.value = data.strategy_a?.phase1?.start || 61;
    if(elements.phase1_endAge_a) elements.phase1_endAge_a.value = data.strategy_a?.phase1?.end || 64;
    ['1','2','3','4'].forEach(i => { if(elements[`phase1_order${i}_a`]) elements[`phase1_order${i}_a`].value = data.strategy_a?.phase1?.order[i-1] || 'none'; });
    if(elements.phase2_startAge_a) elements.phase2_startAge_a.value = data.strategy_a?.phase2?.start || 65;
    if(elements.phase2_endAge_a) elements.phase2_endAge_a.value = data.strategy_a?.phase2?.end || 71;
    ['1','2','3','4'].forEach(i => { if(elements[`phase2_order${i}_a`]) elements[`phase2_order${i}_a`].value = data.strategy_a?.phase2?.order[i-1] || 'none'; });
    if(elements.phase3_startAge_a) elements.phase3_startAge_a.value = data.strategy_a?.phase3?.start || 72;
    if(elements.phase3_endAge_a) elements.phase3_endAge_a.value = data.strategy_a?.phase3?.end || 95;
    ['1','2','3','4'].forEach(i => { if(elements[`phase3_order${i}_a`]) elements[`phase3_order${i}_a`].value = data.strategy_a?.phase3?.order[i-1] || 'none'; });
    
    // --- 4. Restore Scenario B Strategy ---
    if(elements.retirementAge_b) elements.retirementAge_b.value = data.strategy_b?.retirementAge || 70;
    if(elements.return_rrsp_b) elements.return_rrsp_b.value = data.strategy_b?.returns?.rrsp || 7;
    if(elements.return_tfsa_b) elements.return_tfsa_b.value = data.strategy_b?.returns?.tfsa || 7;
    if(elements.return_nonreg_b) elements.return_nonreg_b.value = data.strategy_b?.returns?.nonreg || 7;
    if(elements.return_lif_b) elements.return_lif_b.value = data.strategy_b?.returns?.lif || 5;
    if(elements.phase1_startAge_b) elements.phase1_startAge_b.value = data.strategy_b?.phase1?.start || 70;
    if(elements.phase1_endAge_b) elements.phase1_endAge_b.value = data.strategy_b?.phase1?.end || 71;
    ['1','2','3','4'].forEach(i => { if(elements[`phase1_order${i}_b`]) elements[`phase1_order${i}_b`].value = data.strategy_b?.phase1?.order[i-1] || 'none'; });
    if(elements.phase2_startAge_b) elements.phase2_startAge_b.value = data.strategy_b?.phase2?.start || 72;
    if(elements.phase2_endAge_b) elements.phase2_endAge_b.value = data.strategy_b?.phase2?.end || 95;
    ['1','2','3','4'].forEach(i => { if(elements[`phase2_order${i}_b`]) elements[`phase2_order${i}_b`].value = data.strategy_b?.phase2?.order[i-1] || 'none'; });
    if(elements.phase3_startAge_b) elements.phase3_startAge_b.value = data.strategy_b?.phase3?.start || 96;
    if(elements.phase3_endAge_b) elements.phase3_endAge_b.value = data.strategy_b?.phase3?.end || 95;
    ['1','2','3','4'].forEach(i => { if(elements[`phase3_order${i}_b`]) elements[`phase3_order${i}_b`].value = data.strategy_b?.phase3?.order[i-1] || 'none'; });
    
    // --- 5. Restore Spouse Checkboxes ---
    if(elements.hasSpouse) elements.hasSpouse.checked = data.hasSpouse || false;
    if(elements.hasSpouse_b) elements.hasSpouse_b.checked = data.hasSpouse_b || false;

    // --- 6. Refresh UI ---
    // Ensure dropdowns switch back to 'user' before loading
    if(elements.dataEntryTarget_a) elements.dataEntryTarget_a.value = 'user';
    if(elements.dataEntryTarget_b) elements.dataEntryTarget_b.value = 'user';
    currentUserSelection_a = 'user';
    currentUserSelection_b = 'user';
    
    // Load data into forms (will load 'user' data first)
    loadPersonData('a');
    loadPersonData('b');
    
    // Trigger spouse checkbox handlers to correctly enable/disable spouse dropdowns
    handleHasSpouseChange('a');
    handleHasSpouseChange('b');

    // Re-render income lists (which are now populated from state)
    renderIncomeList('a');
    renderIncomeList('b');
    
    // Sync A to B (optional, but good for consistency if sync is enabled)
    syncInputAtoB('province'); // Sync global settings
    syncInputAtoB('lifeExpectancy');
    syncInputAtoB('cola');

    console.log("Scenario loaded and UI populated.");
    alert("Scenario loaded successfully.");
}
// *** MODIFICATION END v5.2.0 ***