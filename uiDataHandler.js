/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.4.0 (Refactor: Split ui.js into core, data, modal, results modules)
 * @file        uiDataHandler.js
 * @created     2025-10-25
 * @description Manages internal data state (user/spouse for A/B), handles form sync, gathers final inputs.
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
        assets: { rrsp: 0, tfsa: 0, nonreg: 0, lif: 0, nonreg_acb: 0 }
    };

    console.log(`Initialized data store for scenario ${s}:`, JSON.parse(JSON.stringify(dataStore)));

    // Set up initial event listeners specific to data handling
    elements[`dataEntryTarget_${s}`]?.addEventListener('change', () => handleDataEntryTargetChange(s));
    elements[`hasSpouse${suffix}`]?.addEventListener('change', () => handleHasSpouseChange(s));

    // Populate withdrawal dropdowns initially (depends on language being set first by uiCore)
    populateWithdrawalDropdowns(s);
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
        cppStartAge: dataStore.user?.cppStartAge || 65,
        cppAt65: 0,
        oasStartAge: dataStore.user?.oasStartAge || 65,
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
    let incomes = (s === 'a') ? otherIncomes_a : otherIncomes_b; // Access global from uiIncomeModal.js
    const hasSpouseChecked = elements[`hasSpouse${suffix}`]?.checked || false;

    saveCurrentPersonData(s); // Ensure the latest form data for the *currently viewed* person is in the internal state

    // Filter incomes based on ownership, considering the 'hasSpouse' checkbox
    let userIncomes = incomes.filter(inc => inc.owner === 'user');
    let spouseIncomes = hasSpouseChecked ? incomes.filter(inc => inc.owner === 'spouse') : [];

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
             expenses: parseFloat(elements[`phase${phaseNum}_expenses_${s}`]?.value) || 0,
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
        retirementAge: parseInt(elements[`retirementAge_${s}`]?.value) || 65, // Get scenario-specific retirement age
    };

    // Prepare user data from internal store
    const userData = dataStore.user || {};
    const userInitialNonRegGains = Math.max(0, (userData.assets?.nonreg || 0) - (userData.assets?.nonreg_acb || 0));
    const userScenarioData = {
        birthYear: userData.birthYear,
        cppStartAge: userData.cppStartAge,
        cppAt65: userData.cppAt65,
        oasStartAge: userData.oasStartAge,
        assets: { ...userData.assets }, // Copy assets
        initialNonRegGains: userInitialNonRegGains,
        otherIncomes: userIncomes,
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
             assets: { ...spouseData.assets }, // Copy assets
             initialNonRegGains: spouseInitialNonRegGains,
             otherIncomes: spouseIncomes,
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