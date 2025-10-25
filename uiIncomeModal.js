/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.4.0 (Refactor: Split ui.js into core, data, modal, results modules & Integrate v2.2.3 COLA)
 * @file        uiIncomeModal.js
 * @created     2025-10-25
 * @description Handles all UI logic and data management for the "Other Income" modal.
 */

// uiIncomeModal.js
// Assumes global access to: elements (from uiCore.js), translations (from uiCore.js), scenarioAData/BData (from uiDataHandler.js)

// --- State Variables (Income Modal specific) ---
let otherIncomes_a = []; // Now managed here
let otherIncomes_b = []; // Now managed here

// --- Initialization ---
function initializeIncomeModal(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = s === 'a' ? '' : '_b';

    // Set default incomes if empty
    if (s === 'a') { otherIncomes_a = getDefaultIncomes(s); }
    else { otherIncomes_b = getDefaultIncomes(s); }

    // Add Modal Event Listeners
    elements[`manage_income_btn${suffix}`]?.addEventListener('click', () => {
        elements[`income_modal${suffix}`]?.classList.remove('hidden');
        renderIncomeList(s); // Render list when modal opens
    });
    elements[`closeButton${suffix}`]?.addEventListener('click', () => {
        elements[`income_modal${suffix}`]?.classList.add('hidden');
        clearIncomeForm(s);
    });
    elements[`income_modal${suffix}`]?.addEventListener('click', (event) => {
        if (event.target === elements[`income_modal${suffix}`]) {
            elements[`income_modal${suffix}`]?.classList.add('hidden');
            clearIncomeForm(s);
        }
    });
    elements[`save_income_btn${suffix}`]?.addEventListener('click', () => saveIncome(s));
    elements[`income_list${suffix}`]?.addEventListener('click', (e) => handleIncomeListClick(e, s));
    elements[`add_income_form${suffix}`]?.addEventListener('input', () => updateFutureValueDisplay(s));

    renderIncomeList(s); // Initial render
}

// --- Income Modal Functions ---
function renderIncomeList(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = s === 'a' ? '' : '_b';
    const incomeListElement = elements[`income_list${suffix}`];
    const incomes = (s === 'a') ? otherIncomes_a : otherIncomes_b;
    const lang = translations[currentLanguage]; // Assumes currentLanguage is global from uiCore.js
    const hasSpouseChecked = elements[`hasSpouse${suffix}`]?.checked;

    if (!incomeListElement) return; // Exit if element not found

    // Helper to generate list item text with owner info
    const incomeItemLabelWithOwner = (p) => {
        let ownerLabel = ` (${lang.dataEntryMe})`; // Default to 'Me'
        if (hasSpouseChecked && p.owner === 'spouse') {
             ownerLabel = ` (${lang.dataEntrySpouse})`;
        }
        // If spouse is unchecked, visually indicate spouse-owned incomes might not be used
        else if (!hasSpouseChecked && p.owner === 'spouse') {
             // Inactive label could be added here if desired, but filtering happens in gatherInputs
             ownerLabel = ` (${lang.dataEntrySpouse})`; // Keep it simple, or add inactive label: ` (${lang.dataEntrySpouse} - ${lang.inactive || 'Inactive'})`;
        }
        // *** v2.2.3 COLA Display (Optional): Could add ` | COLA: ${p.cola * 100}%` here if needed ***
        return `${p.desc || 'Income'}: ${formatCurrency(p.amount || 0)}/yr (Age ${p.startAge || '?'}-${p.endAge || '?'})${ownerLabel}`;
    };

    // Generate HTML for the list
    incomeListElement.innerHTML = incomes.map(inc =>
        `<div class="income-item" data-id="${inc.id}">
            <span>${incomeItemLabelWithOwner(inc)}</span>
            <div>
                <button type="button" class="edit-btn">${lang.editBtn}</button>
                <button type="button" class="delete-btn">${lang.deleteBtn}</button>
            </div>
        </div>`
    ).join('') || `<p>${lang.noIncomeAdded}</p>`; // Show message if list is empty

    // Show/hide the owner dropdown based on hasSpouse checkbox
    const ownerSelect = elements[`income_owner${suffix}`];
    if (ownerSelect) {
         const ownerGroup = ownerSelect.closest('.form-group');
         if(ownerGroup) ownerGroup.style.display = hasSpouseChecked ? 'block' : 'none';
         // If spouse is hidden, force owner to 'user' in the form
         if (!hasSpouseChecked) {
             ownerSelect.value = 'user';
        }
    }
}


function saveIncome(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const id = parseFloat(elements[`income_id${suffix}`]?.value); // Use parseFloat for potential timestamp IDs
    const owner = elements[`hasSpouse${suffix}`]?.checked ? (elements[`income_owner${suffix}`]?.value || 'user') : 'user';
    let incomes = (s === 'a') ? otherIncomes_a : otherIncomes_b;

    const newIncome = {
        desc: document.getElementById(`income-desc${suffix}`)?.value || 'Other Income',
        amount: parseFloat(document.getElementById(`income-amount${suffix}`)?.value) || 0,
        startAge: parseInt(document.getElementById(`income-start-age${suffix}`)?.value) || 65,
        endAge: parseInt(document.getElementById(`income-end-age${suffix}`)?.value) || 100,
        owner: owner,
        // *** MODIFICATION START v2.2.3: Read COLA input ***
        cola: (parseFloat(document.getElementById(`income-cola${suffix}`)?.value) / 100) || 0 // Default to 0 if empty or invalid
        // *** MODIFICATION END v2.2.3 ***
    };

    if (id && !isNaN(id)) { // Check if id is a valid number (editing existing)
        const index = incomes.findIndex(inc => inc.id === id);
        if (index > -1) {
            incomes[index] = { ...newIncome, id: id }; // Update existing item
            console.log(`Updated income item (ID: ${id}) for scenario ${s}`);
        } else { // ID not found, treat as new income (shouldn't happen often if UI is correct)
             newIncome.id = Date.now() + Math.random(); // Assign new unique ID
             incomes.push(newIncome);
             console.log(`Added new income item (ID: ${newIncome.id}) for scenario ${s} (ID mismatch)`);
        }
    } else { // No ID or invalid ID, treat as new income
        newIncome.id = Date.now() + Math.random(); // Assign new unique ID
        incomes.push(newIncome);
        console.log(`Added new income item (ID: ${newIncome.id}) for scenario ${s}`);
    }

    // Update the global state variable
    if (s === 'a') { otherIncomes_a = incomes; } else { otherIncomes_b = incomes; }

    renderIncomeList(s); // Refresh the list display
    clearIncomeForm(s);  // Clear the form fields
}

function handleIncomeListClick(e, scenarioSuffix) {
    const itemElement = e.target.closest('.income-item');
    if (!itemElement) return; // Click wasn't on an item or its buttons

    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    let incomes = (s === 'a') ? otherIncomes_a : otherIncomes_b;
    const id = parseFloat(itemElement.dataset.id); // Get ID from data attribute

    if (isNaN(id)) return; // Invalid ID

    if (e.target.classList.contains('delete-btn')) {
        incomes = incomes.filter(inc => inc.id !== id); // Remove item from array
         if (s === 'a') { otherIncomes_a = incomes; } else { otherIncomes_b = incomes; } // Update global state
        console.log(`Deleted income item (ID: ${id}) for scenario ${s}`);
        renderIncomeList(s); // Refresh display
        clearIncomeForm(s); // Clear form in case it was showing deleted item
    } else if (e.target.classList.contains('edit-btn')) {
        const income = incomes.find(inc => inc.id === id); // Find item to edit
        if (!income) return; // Item not found

        // Populate the form with the item's data
        if(elements[`income_id${suffix}`]) elements[`income_id${suffix}`].value = income.id;
        if(document.getElementById(`income-desc${suffix}`)) document.getElementById(`income-desc${suffix}`).value = income.desc;
        if(document.getElementById(`income-amount${suffix}`)) document.getElementById(`income-amount${suffix}`).value = income.amount;
        if(document.getElementById(`income-start-age${suffix}`)) document.getElementById(`income-start-age${suffix}`).value = income.startAge;
        if(document.getElementById(`income-end-age${suffix}`)) document.getElementById(`income-end-age${suffix}`).value = income.endAge;
        if(elements[`income_owner${suffix}`]) elements[`income_owner${suffix}`].value = elements[`hasSpouse${suffix}`]?.checked ? (income.owner || 'user') : 'user';
        // *** MODIFICATION START v2.2.3: Populate COLA input ***
        if(document.getElementById(`income-cola${suffix}`)) document.getElementById(`income-cola${suffix}`).value = (income.cola || 0) * 100; // Display as percentage
        // *** MODIFICATION END v2.2.3 ***

        updateFutureValueDisplay(s); // Update the FV preview
        console.log(`Editing income item (ID: ${id}) for scenario ${s}`);
    }
}

function clearIncomeForm(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';

    if(elements[`income_id${suffix}`]) elements[`income_id${suffix}`].value = '';
    if(document.getElementById(`income-desc${suffix}`)) document.getElementById(`income-desc${suffix}`).value = '';
    if(document.getElementById(`income-amount${suffix}`)) document.getElementById(`income-amount${suffix}`).value = '';
    if(document.getElementById(`income-start-age${suffix}`)) document.getElementById(`income-start-age${suffix}`).value = '';
    if(document.getElementById(`income-end-age${suffix}`)) document.getElementById(`income-end-age${suffix}`).value = '';
    if(elements[`income_owner${suffix}`]) elements[`income_owner${suffix}`].value = 'user';
    // *** MODIFICATION START v2.2.3: Clear COLA input ***
    if(document.getElementById(`income-cola${suffix}`)) document.getElementById(`income-cola${suffix}`).value = ''; // Or set to '0'
    // *** MODIFICATION END v2.2.3 ***
    if(elements[`future_value_display${suffix}`]) elements[`future_value_display${suffix}`].textContent = '';

    renderIncomeList(s); // Update display, especially owner dropdown visibility
}

 function updateFutureValueDisplay(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const amountInput = document.getElementById(`income-amount${suffix}`);
    const startAgeInputEl = document.getElementById(`income-start-age${suffix}`);
    const displayElement = elements[`future_value_display${suffix}`];
    const colaInputEl = elements[`cola${suffix}`]; // Use the GLOBAL COLA input for this preview

    if (!amountInput || !startAgeInputEl || !displayElement || !colaInputEl) return;

    const amount = parseFloat(amountInput.value) || 0;
    const startAge = parseInt(startAgeInputEl.value);
    const globalColaRate = (parseFloat(colaInputEl.value) / 100); // Global COLA rate

    // Determine birth year based on the income owner dropdown and data store
    const owner = elements[`income_owner${suffix}`]?.value || 'user';
    const dataStore = (s === 'a') ? scenarioAData : scenarioBData; // Access global from uiDataHandler.js
    // Use the birth year from the *main form*, not necessarily the data store, for immediate feedback
    const birthYearEl = elements[`userBirthYear${suffix}`];
    let birthYear;
     if (owner === 'spouse' && dataStore.spouse && elements[`hasSpouse${suffix}`]?.checked) {
         // If editing spouse income, try to get spouse birth year from store, fallback to user+1
         birthYear = dataStore.spouse.birthYear || ((parseInt(birthYearEl?.value) || 1980) + 1);
     } else {
         // Use user's birth year from the main form
         birthYear = parseInt(birthYearEl?.value) || 1980;
     }


    if (!amount || isNaN(startAge) || isNaN(birthYear) || isNaN(globalColaRate)) {
        displayElement.textContent = '';
        return;
    }

    const currentYear = new Date().getFullYear();
    const incomeStartYear = birthYear + startAge;
    const yearsToStart = incomeStartYear - currentYear;

    if (yearsToStart <= 0) {
        displayElement.textContent = translations[currentLanguage].futureValueStarted;
        return;
    }

    const futureValue = amount * Math.pow(1 + globalColaRate, yearsToStart);
    displayElement.textContent = translations[currentLanguage].futureValueDisplay({ age: startAge, value: Math.round(futureValue) });
}


function getDefaultIncomes(scenarioSuffix) {
    const currentIncomes = scenarioSuffix === 'a' ? otherIncomes_a : otherIncomes_b;
    // Only return defaults if the array is truly empty or undefined
    if (currentIncomes && currentIncomes.length > 0) {
        return currentIncomes;
    }

    // Return default examples if list is empty
    if (scenarioSuffix === 'a') {
        // *** MODIFICATION v2.2.3: Add default cola ***
        return [{ id: Date.now() + 1, desc: 'Company Pension', amount: 20000, startAge: 65, endAge: 95, owner: 'user', cola: 0 }];
    } else {
         // *** MODIFICATION v2.2.3: Add default cola ***
         return [{ id: Date.now() + 2, desc: 'Rental Income', amount: 15000, startAge: 62, endAge: 95, owner: 'user', cola: 0.02 }]; // Example 2% COLA
    }
}