/**
 * @project     Comprehensive Retirement Simulator
 * @author      dluvbell (https://github.com/dluvbell)
 * @version     2.5.0 (Feat: Add D3 graph elements and translation key)
 * @file        uiCore.js
 * @created     2025-10-25
 * @description Core UI setup, global event handling (language, theme, tabs), welcome modal, common UI helpers.
 */

// uiCore.js

// --- Global Variables (Core UI State & Elements) ---
let currentLanguage = 'en';
let elements = {}; // Populated in initializeCore

// --- Language Data (Moved here as it's core UI) ---
const translations = {
    en: {
        pageTitle: "Comprehensive Retirement Simulator", mainTitle: "Comprehensive Retirement Simulator", subTitle: "Compare two retirement scenarios.", darkModeLabel: "Dark Mode", langToggle: "한국어",
        tabScenarioA: "Scenario A", tabScenarioB: "Scenario B", tabResults: "Results",
        section1Title: "1. Enter Information", legendBasicInfo: "Basic Information", provinceLabel: "Province of Residence",
        legendYourInfo: "Income Plan", userBirthYearLabel: "Birth Year", userCppAt65Label: "Estimated CPP at 65 (Annual)", cppTooltip: "Check 'My Service Canada Account'.",
        legendOtherIncome: "Other Income (Non-CPP)", otherIncomeDesc: "Manage other income sources.", manageIncomeBtn: "[ Manage Other Income ]",
        legendAssumptions: "Global Assumptions", colaLabel: "Global COLA (%)", lifeExpectancyLabel: "Max Calculation Age", // Updated colaLabel
        legendGrowth: "Account Growth Rates (%)", // Kept for reference if needed elsewhere
        legendGrowthAssumptionsIncome: "Growth, Assumptions & Other Income", // *** ADDED v2.4.5 ***
        runAnalysisBtn: "Run Analysis", retirementAgeLabel: "Retirement Age", cppStartAgeLabel: "CPP Start Age", oasStartAgeLabel: "OAS Start Age",
        legendAssets: "Assets at Retirement", assetRRSP: "RRSP/RRIF", assetTFSA: "TFSA", assetNonReg: "Non-Registered", assetLIF: "LIF",
        assetNonRegACB: "Non-Reg ACB", acbTooltip: "Adjusted Cost Base. The original cost (book value) of your investment.",
        returnRRSP: "RRSP/RRIF (%)", returnTFSA: "TFSA (%)", returnNonReg: "Non-Reg (%)", returnLIF: "LIF (%)", // Added (%) for clarity
        dataEntryTargetLabel: "Data Entry For:", dataEntryMe: "Me", dataEntrySpouse: "Spouse",
        incomeOwnerLabel: "Owner",
        legendSpouseInfoControl: "Spouse Control", hasSpouseLabel: "Include Spouse's Information", spouseInfoNote: "Note: Spouse specific info (Birth Year, CPP, Assets, etc.) is entered via the 'Data Entry For' dropdown above when 'Include Spouse' is checked.",
        withdrawalStrategyNote: "Note: This strategy applies sequentially to available funds from both individuals based on account type order.", withdrawalStrategyTitle: "Withdrawal Strategy",
        phase1Title: "Phase 1", phase2Title: "Phase 2", phase3Title: "Phase 3", phaseStartAge: "Start Age", phaseEndAge: "End Age", phaseExpenses: "Annual Expenses (PV)",
        withdrawalOrder: "Withdrawal Order", optionTFSA: "TFSA", optionNonReg: "Non-Registered", optionRRSP: "RRSP/RRIF", optionLIF: "LIF", optionNone: "None",
        section2Title: "2. Analysis Results", loadingText: "Calculating...",
        toggleGraphBtn: "Show/Hide Graph", // *** ADDED v2.5.0 ***
        toggleTableBtn: "Show/Hide Detailed Data", exportCsvBtn: "Export CSV",
        modalTitle: "Manage Other Income", modalAddTitle: "Add/Edit", incomeDescLabel: "Type", incomeAmountLabel: "Amount (PV)", incomeStartAgeLabel: "Start Age", incomeEndAgeLabel: "End Age", saveIncomeBtn: "Save",
        incomeColaLabel: "COLA (%)", incomeColaTooltip: "Individual Cost of Living Adjustment for this income. Use 0 for none.",
        noIncomeAdded: "None added.", incomeItemLabel: (p) => `${p.desc}: $${p.amount.toLocaleString()}/yr (Age ${p.startAge}-${p.endAge})`, editBtn: "Edit", deleteBtn: "Delete",
        futureValueStarted: "Already started.", futureValueDisplay: (p) => `Est @ Age ${p.age}: $${p.value.toLocaleString()}`,
        breakEvenResult: "Calculation Complete.", noBreakEvenResult: "Calculation Complete.",
        disclaimerTitle: "Disclaimer", disclaimerP1: "For information only.", disclaimerP2: "Results are estimates. Not financial advice.", disclaimerP3: "Consult a professional.",
        welcomeTitle: "Welcome to the Comprehensive Retirement Simulator!",
        welcomeP1: "Compare two retirement scenarios side-by-side. This tool includes advanced features for a more realistic projection:",
        resultsHeader: "Key Features & Calculations:",
        resultsP1: `<ul>
                        <li><strong>Individual Data Entry:</strong> Enter financial details (birth year, CPP estimates, assets, ACB) separately for yourself and your spouse using the dropdown selector.</li>
                        <li><strong>Separate Tax Calculation:</strong> Calculates Federal and Provincial taxes individually for both persons based on their respective incomes and tax brackets, then combines the total.</li>
                        <li><strong>Detailed Income Sources:</strong> Simulates CPP (with adjustments for start age), OAS (with deferral bonus and age 75 increase), and GIS (based on previous year's household income).</li>
                        <li><strong>Other Income Management:</strong> Add multiple other income sources (pensions, rental, etc.) and assign ownership (Me or Spouse).</li>
                    </ul>`,
        resultsP2: `<ul>
                        <li><strong>Non-Registered Account Taxation:</strong> Calculates capital gains tax on withdrawals from Non-Registered accounts based on your provided Adjusted Cost Base (ACB).</li>
                        <li><strong>Individual OAS Clawback:</strong> Determines OAS clawback separately for each person based on their individual net income.</li>
                        <li><strong>Phased Withdrawal Strategy:</strong> Define up to three retirement phases with different annual expenses and specify the withdrawal order from TFSA, Non-Registered, RRSP/RRIF, and LIF accounts for each phase.</li>
                        <li><strong>Year-by-Year Projections:</strong> View detailed annual results including asset growth, all income sources, expenses, withdrawals, taxes, and account balances.</li>
                    </ul>`,
        createdBy: "Created by ", agreeLabel: "I understand and agree.", confirmBtn: "Confirm",
        metricsTitle: "Key Metrics Summary", metricsFinalAssets: "Final Total Assets", metricsTotalIncomeGross: "Total Income (Gross, Pre-Tax)", metricsTotalTaxesPaid: "Total Taxes Paid",
        metricsScenarioA: "Scenario A", metricsScenarioB: "Scenario B", metricsDifference: "Difference (B - A)",
        tableTitle: "Detailed Year-by-Year Comparison", colAge: "Age", colTotalAssets: "Total Assets",
        colIncomeCPP: "Inc: CPP", colIncomeOAS: "Inc: OAS", colIncomeGIS: "Inc: GIS", colIncomeOther: "Inc: Other", colIncomeTotal: "Inc: Total",
        colExpenses: "Expenses", colTaxesPaid: "Taxes Paid", colNetCashflow: "Net Cashflow",
        colWdRRSP: "WD: RRSP", colWdLIF: "WD: LIF", colWdNonReg: "WD: NonReg", colWdTFSA: "WD: TFSA", colWdTotal: "WD: Total",
        colOASClawback: "OAS Clawback", colTaxableIncome: "Taxable Inc.",
        colBalRRSP: "Bal: RRSP", colBalLIF: "Bal: LIF", colBalNonReg: "Bal: NonReg", colBalTFSA: "Bal: TFSA",
        prefixA: "A: ", prefixB: "B: ", errSimFailed: "Error during calculation: ",
        simComplete: (yrsA, yrsB) => `Simulation Complete (A: ${yrsA} years, B: ${yrsB} years)`
    },
    ko: {
        pageTitle: "종합 은퇴 시뮬레이터", mainTitle: "종합 은퇴 시뮬레이터", subTitle: "두 가지 은퇴 시나리오를 비교하세요.", darkModeLabel: "다크 모드", langToggle: "English",
        tabScenarioA: "시나리오 A", tabScenarioB: "시나리오 B", tabResults: "결과 비교",
        section1Title: "1. 정보 입력", legendBasicInfo: "기본 정보", provinceLabel: "거주 주",
        legendYourInfo: "소득 계획", userBirthYearLabel: "생년", userCppAt65Label: "65세 기준 예상 CPP (연간)", cppTooltip: "'My Service Canada Account' 확인",
        legendOtherIncome: "기타 소득 (CPP 외)", otherIncomeDesc: "다른 소득 관리", manageIncomeBtn: "[ 기타 소득 관리 ]",
        legendAssumptions: "공통 가정", colaLabel: "전체 물가상승률 (%)", lifeExpectancyLabel: "최대 계산 나이",
        legendGrowth: "계좌별 성장률 (%)", legendGrowthAssumptionsIncome: "성장률, 가정치 & 기타 소득",
        runAnalysisBtn: "분석 실행", retirementAgeLabel: "은퇴 나이", cppStartAgeLabel: "CPP 시작", oasStartAgeLabel: "OAS 시작",
        legendAssets: "은퇴 시점 자산", assetRRSP: "RRSP/RRIF", assetTFSA: "TFSA", assetNonReg: "비등록", assetLIF: "LIF",
        assetNonRegACB: "비등록(ACB)", acbTooltip: "조정 원가 기준. 투자의 원금(취득가)입니다.",
        returnRRSP: "RRSP/RRIF (%)", returnTFSA: "TFSA (%)", returnNonReg: "비등록 (%)", returnLIF: "LIF (%)",
        dataEntryTargetLabel: "데이터 입력 대상:", dataEntryMe: "본인", dataEntrySpouse: "배우자",
        incomeOwnerLabel: "소득 귀속",
        legendSpouseInfoControl: "배우자 설정", hasSpouseLabel: "배우자 포함", spouseInfoNote: "참고: 배우자 관련 정보(생년, CPP, 자산 등)는 '배우자 포함' 선택 시 상단의 '데이터 입력 대상' 드롭다운을 통해 입력합니다.",
        withdrawalStrategyNote: "참고: 이 인출 전략은 선택된 계좌 유형 순서에 따라 두 사람의 가용 자금에 순차적으로 적용됩니다.", withdrawalStrategyTitle: "생활비 및 인출 전략",
        phase1Title: "단계 1", phase2Title: "단계 2", phase3Title: "단계 3", phaseStartAge: "시작 나이", phaseEndAge: "종료 나이", phaseExpenses: "연간 생활비(현재가)",
        withdrawalOrder: "인출 순서", optionTFSA: "TFSA", optionNonReg: "비등록", optionRRSP: "RRSP/RRIF", optionLIF: "LIF", optionNone: "없음",
        section2Title: "2. 분석 결과", loadingText: "계산 중...",
        toggleGraphBtn: "그래프 보기/숨기기", // *** ADDED v2.5.0 ***
        toggleTableBtn: "상세 데이터 보기/숨기기", exportCsvBtn: "CSV 저장",
        modalTitle: "기타 소득 관리", modalAddTitle: "추가/수정", incomeDescLabel: "종류", incomeAmountLabel: "금액(현재가)", incomeStartAgeLabel: "시작 나이", incomeEndAgeLabel: "종료 나이", saveIncomeBtn: "저장",
        incomeColaLabel: "물가상승률 (%)", incomeColaTooltip: "이 소득에 적용될 개별 물가상승률입니다. 없으면 0을 사용하세요.",
        noIncomeAdded: "없음.", incomeItemLabel: (p) => `${p.desc}: $${p.amount.toLocaleString()}/년 (${p.startAge}-${p.endAge}세)`, editBtn: "수정", deleteBtn: "삭제",
        futureValueStarted: "이미 시작됨.", futureValueDisplay: (p) => `${p.age}세 시점: $${p.value.toLocaleString()}`,
        breakEvenResult: "계산 완료.", noBreakEvenResult: "계산 완료.",
        disclaimerTitle: "면책 조항", disclaimerP1: "정보 제공용.", disclaimerP2: "추정치이며 금융 조언 아님.", disclaimerP3: "전문가와 상담 필수.",
        welcomeTitle: "종합 은퇴 시뮬레이터에 오신 것을 환영합니다!", welcomeP1: "두 가지 은퇴 시나리오를 나란히 비교해 보세요. 이 도구는 보다 현실적인 예측을 위해 다음과 같은 고급 기능들을 포함합니다:",
        resultsHeader: "주요 기능 및 계산:",
        resultsP1: `<ul>
                        <li><strong>개별 데이터 입력:</strong> 드롭다운 선택기를 사용하여 본인과 배우자의 재정 정보(생년, CPP 예상액, 자산, ACB 등)를 각각 입력합니다.</li>
                        <li><strong>개별 세금 계산:</strong> 각자의 소득 및 세율 구간에 따라 연방세와 주정부세를 개인별로 계산한 후 합산합니다.</li>
                        <li><strong>상세 소득원 계산:</strong> CPP(수령 시작 연령 조정 포함), OAS(수령 연기 보너스 및 75세 인상분 포함), GIS(전년도 가구 소득 기준)를 시뮬레이션합니다.</li>
                        <li><strong>기타 소득 관리:</strong> 여러 기타 소득(회사 연금, 임대 소득 등)을 추가하고 소유자(본인 또는 배우자)를 지정할 수 있습니다.</li>
                    </ul>`,
        resultsP2: `<ul>
                        <li><strong>비등록 계좌 과세:</strong> 입력하신 조정 원가 기준(ACB)을 바탕으로 비등록 계좌 인출 시 발생하는 자본 이득세를 계산합니다.</li>
                        <li><strong>개별 OAS Clawback 계산:</strong> 각 개인의 순소득을 기준으로 OAS Clawback 여부 및 금액을 개별적으로 계산합니다.</li>
                        <li><strong>단계별 인출 전략:</strong> 최대 3단계의 은퇴 기간을 설정하고, 각 단계별 연간 생활비와 TFSA, 비등록, RRSP/RRIF, LIF 계좌에서의 인출 순서를 지정할 수 있습니다.</li>
                        <li><strong>연간 상세 예측:</strong> 자산 성장, 모든 소득원, 생활비, 인출액, 세금, 계좌 잔액 등 상세한 연간 결과를 확인할 수 있습니다.</li>
                    </ul>`,
        createdBy: "제작: ", agreeLabel: "이해했으며 동의합니다.", confirmBtn: "확인",
        metricsTitle: "주요 지표 요약", metricsFinalAssets: "최종 총 자산", metricsTotalIncomeGross: "총 소득 (세전)", metricsTotalTaxesPaid: "총 납부 세금",
        metricsScenarioA: "시나리오 A", metricsScenarioB: "시나리오 B", metricsDifference: "차이 (B - A)",
        tableTitle: "연도별 상세 비교", colAge: "나이", colTotalAssets: "총 자산",
        colIncomeCPP: "소득: CPP", colIncomeOAS: "소득: OAS", colIncomeGIS: "소득: GIS", colIncomeOther: "소득: 기타", colIncomeTotal: "소득: 합계",
        colExpenses: "생활비", colTaxesPaid: "납부 세금", colNetCashflow: "순 현금흐름",
        colWdRRSP: "인출: RRSP", colWdLIF: "인출: LIF", colWdNonReg: "인출: 비등록", colWdTFSA: "인출: TFSA", colWdTotal: "인출: 합계",
        colOASClawback: "OAS Clawback", colTaxableIncome: "과세 소득",
        colBalRRSP: "잔액: RRSP", colBalLIF: "잔액: LIF", colBalNonReg: "잔액: 비등록", colBalTFSA: "잔액: TFSA",
        prefixA: "A: ", prefixB: "B: ", errSimFailed: "계산 중 오류 발생: ",
        simComplete: (yrsA, yrsB) => `시뮬레이션 완료 (A: ${yrsA}년, B: ${yrsB}년)`
    }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeCore();
});

function initializeCore() {
    // Populate elements object
    elements = {}; // Reset or define
    const allElementIds = [
        'theme-toggle', 'lang-toggle', 'modal-lang-toggle',
        // A
        'dataEntryTarget_a', 'province', 'lifeExpectancy', 'retirementAge_a', 'userBirthYear', 'cppStartAge_a', 'userCppAt65', 'oasStartAge_a', 'hasSpouse', 'manage-income-btn', 'income-modal', 'save-income-btn', 'income-list', 'income-id', 'income-owner', 'future-value-display', 'add-income-form', 'income-cola',
        'asset_rrsp', 'asset_tfsa', 'asset_nonreg', 'asset_lif', 'asset_nonreg_acb',
        'return_rrsp', 'return_tfsa', 'return_nonreg', 'return_lif', 'cola',
        'phase1_startAge_a', 'phase1_endAge_a', 'phase1_expenses_a', 'phase1_order1_a', 'phase1_order2_a', 'phase1_order3_a', 'phase1_order4_a',
        'phase2_startAge_a', 'phase2_endAge_a', 'phase2_expenses_a', 'phase2_order1_a', 'phase2_order2_a', 'phase2_order3_a', 'phase2_order4_a',
        'phase3_startAge_a', 'phase3_endAge_a', 'phase3_expenses_a', 'phase3_order1_a', 'phase3_order2_a', 'phase3_order3_a', 'phase3_order4_a',
        // B
        'dataEntryTarget_b', 'province_b', 'lifeExpectancy_b', 'retirementAge_b', 'userBirthYear_b', 'cppStartAge_b', 'userCppAt65_b', 'oasStartAge_b', 'hasSpouse_b', 'manage-income-btn_b', 'income-modal_b', 'save-income-btn_b', 'income-list_b', 'income-id_b', 'income-owner_b', 'future-value-display_b', 'add-income-form_b', 'income-cola_b',
        'asset_rrsp_b', 'asset_tfsa_b', 'asset_nonreg_b', 'asset_lif_b', 'asset_nonreg_acb_b',
        'return_rrsp_b', 'return_tfsa_b', 'return_nonreg_b', 'return_lif_b', 'cola_b',
        'phase1_startAge_b', 'phase1_endAge_b', 'phase1_expenses_b', 'phase1_order1_b', 'phase1_order2_b', 'phase1_order3_b', 'phase1_order4_b',
        'phase2_startAge_b', 'phase2_endAge_b', 'phase2_expenses_b', 'phase2_order1_b', 'phase2_order2_b', 'phase2_order3_b', 'phase2_order4_b',
        'phase3_startAge_b', 'phase3_endAge_b', 'phase3_expenses_b', 'phase3_order1_b', 'phase3_order2_b', 'phase3_order3_b', 'phase3_order4_b',
        // Common/Result
        'runAnalysisBtn', 'loading-indicator', 'results-container', 'break-even-text-result', 'additional-metrics-container',
        'toggle-graph-btn', // *** ADDED v2.5.0 ***
        'toggle-details-btn', 'detailed-table-container', 'export-csv-btn',
        'welcome-modal', 'disclaimer-agree', 'agree-btn'
    ];
     allElementIds.forEach(id => {
         const element = document.getElementById(id);
         if (element) {
             elements[id.replace(/-/g, '_')] = element; // Convert kebab-case to camelCase keys
         } else {
             console.warn(`Element with ID '${id}' not found during core initialization.`);
         }
     });
     elements.tabPanes = document.querySelectorAll('.tab-pane');
     elements.closeButton = document.querySelector('#income-modal .close-button');
     elements.closeButton_b = document.querySelector('#income-modal_b .close-button');
     elements.welcomeCloseButton = document.querySelector('#welcome-modal .close-button');
     elements.agreement_section = document.querySelector('#welcome-modal .agreement-section');
     elements.tab_nav = document.querySelector('.tab-nav');
     // *** ADDED v2.5.0: Graph elements ***
     elements.graph_container = document.getElementById('graph-container');
     elements.results_chart = document.getElementById('results-chart'); // SVG element

    // Populate Province Dropdowns
    if (typeof taxData !== 'undefined' && elements.province && elements.province_b) {
        Object.keys(taxData).filter(k => k !== 'FED').forEach(prov => {
            elements.province.innerHTML += `<option value="${prov}">${prov}</option>`;
            elements.province_b.innerHTML += `<option value="${prov}">${prov}</option>`;
        });
        elements.province.value = 'ON';
        elements.province_b.value = 'ON';
    }

    // Initialize dependent modules
    if (typeof initializeScenarioData === 'function') {
        initializeScenarioData('a');
        initializeScenarioData('b');
    }
    if (typeof initializeIncomeModal === 'function') {
        initializeIncomeModal('a');
        initializeIncomeModal('b');
    }
    if (typeof initializeResultsDisplay === 'function') {
        initializeResultsDisplay(); // Initializes results display, including graph button listener
    }
    if (typeof handleHasSpouseChange === 'function') {
        handleHasSpouseChange('a');
        handleHasSpouseChange('b');
    }

    // Add Core Event Listeners
    elements.welcomeCloseButton?.addEventListener('click', handleWelcomeModalClose);
    elements.welcome_modal?.addEventListener('click', (event) => { if (event.target === elements.welcome_modal) { handleWelcomeModalClose(); } });
    elements.agree_btn?.addEventListener('click', handleWelcomeModalClose);
    elements.disclaimer_agree?.addEventListener('change', () => { if(elements.agree_btn) elements.agree_btn.disabled = !elements.disclaimer_agree.checked; });
    elements.lang_toggle?.addEventListener('click', toggleLanguage);
    elements.modal_lang_toggle?.addEventListener('click', toggleLanguage);
    elements.theme_toggle?.addEventListener('change', toggleTheme);
    elements.tab_nav?.addEventListener('click', (e) => { if (e.target && e.target.classList.contains('tab-btn')) { switchTab(e.target.getAttribute('data-tab')); } });

    // Load saved settings & show welcome modal
    loadTheme();
    const savedLang = localStorage.getItem('language') || 'en';
    setLanguage(savedLang);
    if(elements.welcome_modal) elements.welcome_modal.classList.remove('hidden');
}

// --- Core UI Functions ---
function handleWelcomeModalClose() {
    if (!elements.disclaimer_agree || !elements.welcome_modal || !elements.agreement_section) {
        console.error("Required welcome modal elements not found for closing.");
        return;
    }
    if (elements.disclaimer_agree.checked) {
        elements.welcome_modal.classList.add('hidden');
    } else {
        elements.agreement_section.classList.remove('shake');
        void elements.agreement_section.offsetWidth; // Trigger reflow
        elements.agreement_section.classList.add('shake');
    }
};

function toggleLanguage() {
    setLanguage(currentLanguage === 'en' ? 'ko' : 'en');
};

function setLanguage(lang) {
    currentLanguage = lang; localStorage.setItem('language', lang);
    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.getAttribute('data-lang-key');
        const translation = translations[lang][key];
        // Ensure translation exists before trying to use it
        if (translation !== undefined && translation !== null) {
            if (typeof translation === 'function') { el.textContent = translation({}); }
            else if (typeof translation === 'string') {
                if (key === 'resultsP1' || key === 'resultsP2') { el.innerHTML = translation; }
                else if (key === 'createdBy') { if (el.childNodes.length > 0) el.childNodes[0].nodeValue = translation; }
                else { el.textContent = translation; }
            }
        } else {
             // console.warn(`Missing translation for key: ${key} in language: ${lang}`);
        }
    });
    document.querySelectorAll('[data-lang-key-tooltip]').forEach(el => {
        const key = el.getAttribute('data-lang-key-tooltip');
        if (translations[lang] && translations[lang][key]) {
            el.setAttribute('data-tooltip', translations[lang][key]);
        }
    });
    if(elements.lang_toggle) elements.lang_toggle.textContent = translations[lang]?.langToggle || 'Lang';
    if(elements.modal_lang_toggle) elements.modal_lang_toggle.textContent = translations[lang]?.langToggle || 'Lang';

    // Trigger updates in other modules (check functions exist)
    if (typeof populateWithdrawalDropdowns === 'function') {
        populateWithdrawalDropdowns('a');
        populateWithdrawalDropdowns('b');
    }
    if (typeof renderIncomeList === 'function') {
        renderIncomeList('a');
        renderIncomeList('b');
    }
    // Update results display if results already exist
    if (typeof getLastResultDetails === 'function' && getLastResultDetails()) {
        if (typeof displayComparisonMetrics === 'function') {
            displayComparisonMetrics(getLastResultDetails());
        }
        if (typeof displayComparisonDetailedTable === 'function') {
            displayComparisonDetailedTable(getLastResultDetails());
        }
        // Redraw graph if it exists and language changed
        if (typeof drawD3Chart === 'function' && elements.graph_container && !elements.graph_container.classList.contains('hidden')) {
             drawD3Chart(getLastResultDetails());
        }
    }
};

function switchTab(tabName) {
    elements.tab_nav?.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    elements.tabPanes?.forEach(pane => pane.classList.remove('active'));
    elements.tab_nav?.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    const targetPane = document.getElementById(`${tabName}-pane`);
    if (targetPane) targetPane.classList.add('active');
};

function toggleTheme() {
    if (!elements.theme_toggle) return;
    document.body.classList.toggle('dark-mode', elements.theme_toggle.checked);
    localStorage.setItem('theme', elements.theme_toggle.checked ? 'dark' : 'light');
    // Redraw graph if visible, as colors might need to update
    if (typeof getLastResultDetails === 'function' && getLastResultDetails() && typeof drawD3Chart === 'function' && elements.graph_container && !elements.graph_container.classList.contains('hidden')) {
        drawD3Chart(getLastResultDetails());
    }
}
function loadTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (elements.theme_toggle) elements.theme_toggle.checked = isDark;
    if (isDark) { document.body.classList.add('dark-mode'); }
}

/**
 * Formats a number as currency.
 * @param {number} value - The number to format.
 * @returns {string} - Formatted currency string or '-'.
 */
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '-'; // Handle non-numeric or NaN
    return `$${Math.round(value).toLocaleString()}`;
}

/**
 * Formats a number for Y-axis labels (e.g., $1.2M, $500k).
 * @param {number} value - The number to format.
 * @returns {string} - Formatted label string.
 */
function formatYAxisLabel(value) { // Used if charting is re-introduced
    if (typeof value !== 'number' || isNaN(value)) return '$0';
    if (Math.abs(value) >= 1e9) { return '$' + (value / 1e9).toFixed(1) + 'B'; }
    else if (Math.abs(value) >= 1e6) { return '$' + (value / 1e6).toFixed(1) + 'M'; }
    else if (Math.abs(value) >= 1e3) { return '$' + (value / 1e3).toFixed(0) + 'k'; }
    else { return '$' + value.toFixed(0); }
}