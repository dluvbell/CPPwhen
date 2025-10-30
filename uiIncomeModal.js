/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     4.2.0 (Bugfix: Add A -> B sync logic for income/expense modal)
 * @file        uiIncomeModal.js
 * @created     2025-10-25
 * @description Handles all UI logic and data management for the "Income & Expenses" modal.
 */

// uiIncomeModal.js
// Assumes global access to: elements (from uiCore.js), translations (from uiCore.js), scenarioAData/BData (from uiDataHandler.js), formatCurrency (from uiCore.js)

// --- State Variables (Income Modal specific) ---
let otherIncomes_a = []; // Now includes both incomes and expenses
let otherIncomes_b = []; // Now includes both incomes and expenses

// --- Initialization ---
function initializeIncomeModal(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = s === 'a' ? '' : '_b';

    // Set default items if empty
    // *** MODIFICATION START v4.2.0: Sync A to B on init ***
    if (s === 'a') {
        otherIncomes_a = getDefaultIncomes(s);
    } else {
        // Ensure B starts as a clone of A's defaults
        otherIncomes_b = JSON.parse(JSON.stringify(otherIncomes_a));
    }
    // *** MODIFICATION END v4.2.0 ***

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
    // *** MODIFICATION v4.0.1: Trigger preview update on individual COLA input too ***
    elements[`add_income_form${suffix}`]?.addEventListener('input', (event) => {
        // Update preview only if amount, start age, or individual cola changes
        if (event.target.id === `income-amount${suffix}` || event.target.id === `income-start-age${suffix}` || event.target.id === `income-cola${suffix}`) {
            updateFutureValueDisplay(s);
        }
    });

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
        else if (!hasSpouseChecked && p.owner === 'spouse') {
             ownerLabel = ` (${lang.dataEntrySpouse})`; // Keep it simple
        }

        // Use formatCurrency helper from uiCore.js
        const amountDisplay = formatCurrency(p.amount || 0);
        // Add COLA display
        const colaDisplay = ` | COLA: ${((p.cola || 0) * 100).toFixed(1)}%`;
        return `${p.desc || 'Item'}: ${amountDisplay}/yr (Age ${p.startAge || '?'}-${p.endAge || '?'})${ownerLabel}${colaDisplay}`;
    };

    // Generate HTML for the list
    incomeListElement.innerHTML = incomes.map(inc => {
        // *** MODIFICATION v4.0.0: Add 'expense-item' class if type is 'expense' ***
        const itemClass = inc.type === 'expense' ? 'income-item expense-item' : 'income-item';
        // Add console log here to debug
        // console.log(`Rendering item: ID=${inc.id}, Type=${inc.type}, Class=${itemClass}`);
        return `
        <div class="${itemClass}" data-id="${inc.id}">
            <span>${incomeItemLabelWithOwner(inc)}</span>
            <div>
                <button type="button" class="edit-btn">${lang.editBtn}</button>
                <button type="button" class="delete-btn">${lang.deleteBtn}</button>
            </div>
        </div>`
    }).join('') || `<p>${lang.noIncomeAdded}</p>`; // Show message if list is empty

    // Show/hide the owner dropdown based on hasSpouse checkbox
    const ownerSelect = elements[`income_owner${suffix}`];
    if (ownerSelect) {
         const ownerGroup = ownerSelect.closest('.form-group');
         if(ownerGroup) ownerGroup.style.display = hasSpouseChecked ? 'block' : 'none';
         if (!hasSpouseChecked) {
             ownerSelect.value = 'user';
        }
    }
}


function saveIncome(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const id = parseFloat(elements[`income_id${suffix}`]?.value);
    const owner = elements[`hasSpouse${suffix}`]?.checked ? (elements[`income_owner${suffix}`]?.value || 'user') : 'user';
    let incomes = (s === 'a') ? otherIncomes_a : otherIncomes_b;

    const newItem = {
        type: elements[`income_type${suffix}`]?.value || 'income', // *** ADDED v4.0.0 ***
        desc: document.getElementById(`income-desc${suffix}`)?.value || (elements[`income_type${suffix}`]?.value === 'expense' ? 'Expense Item' : 'Income Item'), // Default description based on type
        amount: parseFloat(document.getElementById(`income-amount${suffix}`)?.value) || 0,
        startAge: parseInt(document.getElementById(`income-start-age${suffix}`)?.value) || (s === 'a' ? 61 : 70), // Use scenario retirement age as default start
        endAge: parseInt(document.getElementById(`income-end-age${suffix}`)?.value) || 95, // Use scenario max age as default end
        owner: owner,
        cola: (parseFloat(document.getElementById(`income-cola${suffix}`)?.value) / 100) || 0,
        isMedical: elements[`income_is_medical${suffix}`]?.checked || false // *** 신규 추가 (v4.1.0) ***
    };

    if (id && !isNaN(id)) { // Editing existing
        const index = incomes.findIndex(inc => inc.id === id);
        if (index > -1) {
            incomes[index] = { ...newItem, id: id };
            console.log(`Updated item (ID: ${id}, Type: ${newItem.type}) for scenario ${s}`);
        } else { // ID mismatch
             newItem.id = Date.now() + Math.random();
             incomes.push(newItem);
             console.log(`Added new item (ID: ${newItem.id}, Type: ${newItem.type}) for scenario ${s} (ID mismatch)`);
        }
    } else { // Adding new
        newItem.id = Date.now() + Math.random();
        incomes.push(newItem);
        console.log(`Added new item (ID: ${newItem.id}, Type: ${newItem.type}) for scenario ${s}`);
    }

    if (s === 'a') { otherIncomes_a = incomes; } else { otherIncomes_b = incomes; }

    // *** MODIFICATION START v4.2.0: Sync A to B on save ***
    if (s === 'a') {
        syncIncomeListAtoB();
    }
    // *** MODIFICATION END v4.2.0 ***

    renderIncomeList(s);
    clearIncomeForm(s);
}

function handleIncomeListClick(e, scenarioSuffix) {
    const itemElement = e.target.closest('.income-item');
    if (!itemElement) return;

    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    let incomes = (s === 'a') ? otherIncomes_a : otherIncomes_b;
    const id = parseFloat(itemElement.dataset.id);

    if (isNaN(id)) return;

    if (e.target.classList.contains('delete-btn')) {
        incomes = incomes.filter(inc => inc.id !== id);
         if (s === 'a') { otherIncomes_a = incomes; } else { otherIncomes_b = incomes; }
        
        // *** MODIFICATION START v4.2.0: Sync A to B on delete ***
        if (s === 'a') {
            syncIncomeListAtoB();
        }
        // *** MODIFICATION END v4.2.0 ***

        console.log(`Deleted item (ID: ${id}) for scenario ${s}`);
        renderIncomeList(s);
        clearIncomeForm(s);
    } else if (e.target.classList.contains('edit-btn')) {
        const item = incomes.find(inc => inc.id === id);
        if (!item) return;

        // Populate form
        if(elements[`income_id${suffix}`]) elements[`income_id${suffix}`].value = item.id;
        if(elements[`income_type${suffix}`]) elements[`income_type${suffix}`].value = item.type || 'income'; // *** ADDED v4.0.0 ***
        if(document.getElementById(`income-desc${suffix}`)) document.getElementById(`income-desc${suffix}`).value = item.desc;
        if(document.getElementById(`income-amount${suffix}`)) document.getElementById(`income-amount${suffix}`).value = item.amount;
        if(document.getElementById(`income-start-age${suffix}`)) document.getElementById(`income-start-age${suffix}`).value = item.startAge;
        if(document.getElementById(`income-end-age${suffix}`)) document.getElementById(`income-end-age${suffix}`).value = item.endAge;
        if(elements[`income_owner${suffix}`]) elements[`income_owner${suffix}`].value = elements[`hasSpouse${suffix}`]?.checked ? (item.owner || 'user') : 'user';
        if(document.getElementById(`income-cola${suffix}`)) document.getElementById(`income-cola${suffix}`).value = (item.cola || 0) * 100;
        if(elements[`income_is_medical${suffix}`]) elements[`income_is_medical${suffix}`].checked = item.isMedical || false; // *** 신규 추가 (v4.1.0) ***

        updateFutureValueDisplay(s);
        console.log(`Editing item (ID: ${id}, Type: ${item.type}) for scenario ${s}`);
    }
}

function clearIncomeForm(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';

    if(elements[`income_id${suffix}`]) elements[`income_id${suffix}`].value = '';
    if(elements[`income_type${suffix}`]) elements[`income_type${suffix}`].value = 'income'; // *** ADDED v4.0.0 ***
    if(document.getElementById(`income-desc${suffix}`)) document.getElementById(`income-desc${suffix}`).value = '';
    if(document.getElementById(`income-amount${suffix}`)) document.getElementById(`income-amount${suffix}`).value = '';
    if(document.getElementById(`income-start-age${suffix}`)) document.getElementById(`income-start-age${suffix}`).value = '';
    if(document.getElementById(`income-end-age${suffix}`)) document.getElementById(`income-end-age${suffix}`).value = '';
    if(elements[`income_owner${suffix}`]) elements[`income_owner${suffix}`].value = 'user';
    if(document.getElementById(`income-cola${suffix}`)) document.getElementById(`income-cola${suffix}`).value = '';
    if(elements[`income_is_medical${suffix}`]) elements[`income_is_medical${suffix}`].checked = false; // *** 신규 추가 (v4.1.0) ***
    if(elements[`future_value_display${suffix}`]) elements[`future_value_display${suffix}`].textContent = '';

    renderIncomeList(s); // Update display
}

// *** MODIFICATION START v4.2.0: Add Sync Helper ***
/**
 * [HELPER] Syncs the income/expense list from Scenario A to Scenario B.
 * Deep clones the array and re-renders B's modal list.
 */
function syncIncomeListAtoB() {
    console.log("Syncing income/expense list from A to B...");
    otherIncomes_b = JSON.parse(JSON.stringify(otherIncomes_a));
    renderIncomeList('b'); // Re-render B's modal list
}
// *** MODIFICATION END v4.2.0 ***


// *** MODIFICATION v4.0.1: Use individual COLA for preview calculation ***
 function updateFutureValueDisplay(scenarioSuffix) {
    const s = scenarioSuffix;
    const suffix = (s === 'a') ? '' : '_b';
    const amountInput = document.getElementById(`income-amount${suffix}`);
    const startAgeInputEl = document.getElementById(`income-start-age${suffix}`);
    const displayElement = elements[`future_value_display${suffix}`];
    // Read the INDIVIDUAL COLA input from the modal form
    const individualColaInputEl = document.getElementById(`income-cola${suffix}`);

    if (!amountInput || !startAgeInputEl || !displayElement || !individualColaInputEl) return;

    const amount = parseFloat(amountInput.value) || 0;
    const startAge = parseInt(startAgeInputEl.value);
    // Use the INDIVIDUAL COLA rate entered in the modal
    const itemColaRate = (parseFloat(individualColaInputEl.value) / 100) || 0; // Default to 0 if empty or invalid

    const owner = elements[`income_owner${suffix}`]?.value || 'user';
    const dataStore = (s === 'a') ? scenarioAData : scenarioBData;
    const birthYearEl = elements[`userBirthYear${suffix}`];
    let birthYear;
     if (owner === 'spouse' && dataStore.spouse && elements[`hasSpouse${suffix}`]?.checked) {
         birthYear = dataStore.spouse.birthYear || ((parseInt(birthYearEl?.value) || 1980) + 1);
     } else {
         birthYear = parseInt(birthYearEl?.value) || 1980;
     }

    if (!amount || isNaN(startAge) || isNaN(birthYear) || isNaN(itemColaRate)) {
        displayElement.textContent = ''; return;
    }

    const baseYear = 2025; // Define base year consistently
    const itemStartYear = birthYear + startAge;
    // Years from baseYear to the year the item starts
    const yearsFromBaseToStart = Math.max(0, itemStartYear - baseYear);

    if (itemStartYear <= new Date().getFullYear()) {
        displayElement.textContent = translations[currentLanguage].futureValueStarted; return;
    }

    // Calculate future value using the INDIVIDUAL item's COLA rate
    // Note: This preview still simplifies by assuming the individual COLA applies from the baseYear.
    // The engine's calculation (Global COLA to start year, then individual COLA) is more precise.
    // However, using the individual COLA here provides a more relevant estimate than using global.
    const futureValue = amount * Math.pow(1 + itemColaRate, yearsFromBaseToStart);
    displayElement.textContent = translations[currentLanguage].futureValueDisplay({ age: startAge, value: Math.round(futureValue) });
}
// *** END MODIFICATION v4.0.1 ***


function getDefaultIncomes(scenarioSuffix) {
    const currentItems = scenarioSuffix === 'a' ? otherIncomes_a : otherIncomes_b;
    if (currentItems && currentItems.length > 0) {
        return currentItems;
    }

    // *** MODIFICATION v4.0.0: Add default expenses and 'type' property ***
    // Default retirement ages for placing expenses
    const retAgeA = parseInt(elements.retirementAge_a?.value) || 61;
    const retAgeB = parseInt(elements.retirementAge_b?.value) || 70;
    const maxAge = parseInt(elements.lifeExpectancy?.value) || 95; // Use global max age

    if (scenarioSuffix === 'a') {
        return [
            { id: Date.now() + 1, type: 'income', desc: 'Company Pension', amount: 20000, startAge: 65, endAge: maxAge, owner: 'user', cola: 0.01, isMedical: false }, // *** v4.1.0 ***
            { id: Date.now() + 2, type: 'expense', desc: 'Base Living Expenses', amount: 55000, startAge: retAgeA, endAge: maxAge, owner: 'user', cola: 0.025, isMedical: false }, // *** v4.1.0 ***
            { id: Date.now() + 3, type: 'expense', desc: 'Travel Fund', amount: 5000, startAge: retAgeA, endAge: 75, owner: 'user', cola: 0.03, isMedical: false } // *** v4.1.0 ***
        ];
    } else { // Scenario B defaults
         return [
            { id: Date.now() + 4, type: 'income', desc: 'Rental Income', amount: 15000, startAge: 62, endAge: maxAge, owner: 'user', cola: 0.02, isMedical: false }, // *** v4.1.0 ***
            { id: Date.now() + 5, type: 'expense', desc: 'Base Living Expenses', amount: 65000, startAge: retAgeB, endAge: maxAge, owner: 'user', cola: 0.025, isMedical: true } // *** v4.1.0 (Example) ***
         ];
    }
}