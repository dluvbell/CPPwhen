// ui.js

// --- 언어 데이터 관리 ---
const translations = {
    en: {
        pageTitle: "CPP Break-Even Simulator",
        mainTitle: "CPP Break-Even Simulator",
        subTitle: "Compare two CPP start dates to find your after-tax break-even point.",
        darkModeLabel: "Dark Mode",
        langToggle: "한국어",
        section1Title: "1. Enter Information",
        legendBasicInfo: "Basic Information",
        provinceLabel: "Province of Residence",
        legendYourInfo: "Your Information",
        userBirthYearLabel: "Birth Year",
        userCppAt65Label: "Estimated CPP at 65 (Annual)",
        cppTooltip: "Search for 'My Service Canada Account' on Google to log in to the official government website and check your estimated CPP pension amount. For security reasons, a direct link is not provided.",
        legendSpouseInfo: "Spouse's Information",
        hasSpouseLabel: "Include Spouse's Information",
        spouseBirthYearLabel: "Spouse's Birth Year",
        spouseCppAt65Label: "Spouse's Est. CPP at 65 (Annual)",
        legendOtherIncome: "Other Income (Non-CPP)",
        otherIncomeDesc: "Manage other sources of income you expect in retirement.",
        manageIncomeBtn: "[ Manage Other Income ]",
        legendAssumptions: "Key Assumptions",
        investmentReturnLabel: "Initial Investment Return (%)",
        investmentTooltip: "This is the average annual rate of return if you invest the CPP payments received earlier, up until the point you would have started receiving them in the later scenario.",
        colaLabel: "Cost of Living Adj. (COLA, %)",
        lifeExpectancyLabel: "Maximum Calculation Age",
        legendAnalysisScenario: "Analysis Scenario",
        baseAgeLabel: "Base Age (Start Earlier):",
        comparisonAgeLabel: "Comparison Age (Start Later):",
        runAnalysisBtn: "Run Break-Even Analysis",
        section2Title: "2. Analysis Results",
        loadingText: "Calculating...",
        chartTitle: "Break-Even Visualization",
        toggleTableBtn: "Show Detailed Data Table",
        exportCsvBtn: "Export to CSV",
        modalTitle: "Manage Other Income",
        modalAddTitle: "Add/Edit Income",
        incomeDescLabel: "Income Type",
        incomeAmountLabel: "Amount (Annual, Present Value)",
        incomeStartAgeLabel: "Start Age",
        incomeEndAgeLabel: "End Age",
        saveIncomeBtn: "Add/Update",
        noIncomeAdded: "No other income added.",
        incomeItemLabel: (p) => `${p.desc}: $${p.amount.toLocaleString()}/year (Age ${p.startAge}-${p.endAge})`,
        editBtn: "Edit",
        deleteBtn: "Delete",
        futureValueStarted: "This income has already started.",
        futureValueDisplay: (p) => `Est. annual amount at age ${p.age}: $${p.value.toLocaleString()}`,
        alertBaseAge: "The base age must be earlier than the comparison age.",
        breakEvenResult: (p) => `The after-tax break-even point between starting at age ${p.baseAge} and ${p.comparisonAge} is approximately age ${p.breakEvenAge}.`,
        noBreakEvenResult: (p) => `A break-even point is not reached within the expected lifespan (${p.lifeExpectancy}). Starting at age ${p.baseAge} is more advantageous.`,
        chartLabelOpportunityCost: "After-Tax Opportunity Cost (Target)",
        chartLabelCumulativeDiff: "Cumulative After-Tax CPP Difference",
        tableHeaderAge: "Age",
        tableHeaderAnnualDiff: "Annual Diff.",
        tableHeaderCumulativeDiff: "Cumulative Diff.",
        tableHeaderTarget: "Target (Opp. Cost)",
        tableHeaderRemaining: "Remaining Gap",
        csvReportTitle: "CPP Optimization Simulator Analysis Report",
        csvInputInfo: "Input Information",
        csvProvince: "Province",
        csvMyBirthYear: "My Birth Year",
        csvMyCpp: "My CPP at 65",
        csvSpouseBirthYear: "Spouse Birth Year",
        csvSpouseCpp: "Spouse CPP at 65",
        csvInvestReturn: "Investment Return",
        csvCola: "COLA",
        csvMaxAge: "Max Calc Age",
        csvOtherIncome: "Other Income Information",
        csvIncomeDesc: (p) => `"${p.desc}","$${p.amount} (Present Value)",From age ${p.startAge},To age ${p.endAge},,`,
        csvDetailHeader: ["Age", "After-Tax CPP (Base)", "After-Tax CPP (Comparison)", "Annual After-Tax CPP Diff", "Cumulative CPP Diff", "After-Tax Opp. Cost (Target)"],
        disclaimerTitle: "Disclaimer",
        disclaimerP1: "This simulator is for informational and educational purposes only.",
        disclaimerP2: "The results are based on the data provided and simplified assumptions and may not accurately reflect your actual financial situation. This content should not be considered financial, tax, or legal advice.",
        disclaimerP3: "You must consult with a qualified professional (e.g., CPA, CFP) before making any significant financial decisions.",
        welcomeTitle: "Welcome to the CPP Simulator!",
        welcomeP1: "This tool helps you compare two different CPP start dates to find the financial break-even point.",
        resultsHeader: "Understanding the Results",
        resultsP1: "<strong>Important:</strong> All key financial values in the results (e.g., Opportunity Cost, Cumulative Difference) are calculated on an <strong>after-tax basis</strong> to reflect the real amount of money you would have.",
        resultsP2: "The detailed table shows key metrics:<br>- <strong>Target (Opp. Cost):</strong> The amount of money gained by taking CPP early and investing it. This is the \"target\" the later, larger CPP payments need to overcome.<br>- <strong>Cumulative Diff.:</strong> The running total of the extra after-tax money you get from starting CPP later.<br>- <strong>The break-even age</strong> is when the 'Cumulative Diff.' first surpasses the 'Target'."
    },
    ko: {
        pageTitle: "CPP 손익분기점 시뮬레이터",
        mainTitle: "CPP 손익분기점 시뮬레이터",
        subTitle: "두 개의 CPP 시작 시점을 비교하여, 세후 기준 손익분기점을 찾아보세요.",
        darkModeLabel: "다크 모드",
        langToggle: "English",
        section1Title: "1. 정보 입력",
        legendBasicInfo: "기본 정보",
        provinceLabel: "거주 주 (Province)",
        legendYourInfo: "나의 정보",
        userBirthYearLabel: "생년 (Birth Year)",
        userCppAt65Label: "65세 기준 예상 CPP (연간)",
        cppTooltip: "Google에서 'My Service Canada Account'를 검색하여 공식 정부 웹사이트에 로그인 후, CPP 예상 수령액을 확인하십시오. 보안을 위해 직접 링크는 제공하지 않습니다.",
        legendSpouseInfo: "배우자 정보",
        hasSpouseLabel: "배우자 정보 포함",
        spouseBirthYearLabel: "배우자 생년 (Birth Year)",
        spouseCppAt65Label: "배우자 65세 기준 예상 CPP (연간)",
        legendOtherIncome: "기타 소득 (CPP 외)",
        otherIncomeDesc: "은퇴 후 발생할 다른 소득을 관리합니다.",
        manageIncomeBtn: "[기타 소득 관리]",
        legendAssumptions: "핵심 가정",
        investmentReturnLabel: "초기 투자 수익률 (%)",
        investmentTooltip: "더 일찍 CPP를 받기 시작했을 때, 그 돈을 더 늦게 받기 시작하는 시점까지 투자했을 경우의 연평균 수익률입니다.",
        colaLabel: "소득 물가상승률 (COLA, %)",
        lifeExpectancyLabel: "최대 계산 나이",
        legendAnalysisScenario: "분석 시나리오",
        baseAgeLabel: "기준 나이 (더 일찍 시작):",
        comparisonAgeLabel: "비교 나이 (더 늦게 시작):",
        runAnalysisBtn: "손익분기점 분석 실행",
        section2Title: "2. 분석 결과",
        loadingText: "계산 중입니다...",
        chartTitle: "손익분기점 시각화",
        toggleTableBtn: "상세 데이터 표 보기",
        exportCsvBtn: "CSV로 내보내기",
        modalTitle: "기타 소득 관리",
        modalAddTitle: "새 소득 추가",
        incomeDescLabel: "소득 종류",
        incomeAmountLabel: "금액 (연간, 현재 가치)",
        incomeStartAgeLabel: "시작 나이",
        incomeEndAgeLabel: "종료 나이",
        saveIncomeBtn: "추가/수정",
        noIncomeAdded: "추가된 소득이 없습니다.",
        incomeItemLabel: (p) => `${p.desc}: $${p.amount.toLocaleString()}/년 (${p.startAge}세-${p.endAge}세)`,
        editBtn: "수정",
        deleteBtn: "삭제",
        futureValueStarted: "이미 시작된 소득입니다.",
        futureValueDisplay: (p) => `${p.age}세 시점 예상 연액: $${p.value.toLocaleString()}`,
        alertBaseAge: "기준 나이는 비교 나이보다 빨라야 합니다.",
        breakEvenResult: (p) => `${p.baseAge}세와 ${p.comparisonAge}세 시작 시나리오의 세후 기준 손익분기점은 약 ${p.breakEvenAge}세 입니다.`,
        noBreakEvenResult: (p) => `예상 수명(${p.lifeExpectancy}세) 내에 손익분기점이 발생하지 않습니다. ${p.baseAge}세 시작이 더 유리합니다.`,
        chartLabelOpportunityCost: "세후 기회비용 (목표 금액)",
        chartLabelCumulativeDiff: "세후 CPP 누적 차액",
        tableHeaderAge: "나이",
        tableHeaderAnnualDiff: "연간 차액",
        tableHeaderCumulativeDiff: "누적 차액",
        tableHeaderTarget: "기회비용(목표)",
        tableHeaderRemaining: "따라잡아야 할 남은 금액",
        csvReportTitle: "CPP 최적화 시뮬레이터 분석 리포트",
        csvInputInfo: "입력된 정보",
        csvProvince: "거주 주",
        csvMyBirthYear: "나의 생년",
        csvMyCpp: "나의 65세 CPP",
        csvSpouseBirthYear: "배우자 생년",
        csvSpouseCpp: "배우자 65세 CPP",
        csvInvestReturn: "초기 투자 수익률",
        csvCola: "물가상승률(COLA)",
        csvMaxAge: "최대 계산 나이",
        csvOtherIncome: "기타 소득 정보",
        csvIncomeDesc: (p) => `"${p.desc}","$${p.amount} (현재가치)",${p.startAge}세부터,${p.endAge}세까지,,`,
        csvDetailHeader: ["나이", "세후 CPP (기준년도)", "세후 CPP (비교년도)", "세후 CPP 연간 차액", "CPP 누적 차액", "세후 기회비용(목표)"],
        disclaimerTitle: "면책 조항",
        disclaimerP1: "이 시뮬레이터는 정보 제공 및 교육 목적으로만 제작되었습니다.",
        disclaimerP2: "결과는 제공된 데이터와 단순화된 가정을 기반으로 하며, 실제 재정 상황을 정확하게 반영하지 않을 수 있습니다. 이 내용은 재정적, 세무적 또는 법적 조언으로 간주되어서는 안 됩니다.",
        disclaimerP3: "중요한 재정 결정을 내리기 전에는 반드시 자격을 갖춘 전문가(CPA, CFP 등)와 상담하시기 바랍니다.",
        welcomeTitle: "CPP 시뮬레이터에 오신 것을 환영합니다!",
        welcomeP1: "이 도구는 두 개의 다른 CPP 시작 날짜를 비교하여 재정적 손익분기점을 찾는 데 도움을 줍니다.",
        resultsHeader: "결과 이해하기",
        resultsP1: "<strong>중요:</strong> 결과에 표시되는 모든 주요 재무 가치(예: 기회비용, 누적 차액)는 실제 수령액을 반영하기 위해 <strong>세후 기준</strong>으로 계산됩니다.",
        resultsP2: "상세 표는 다음과 같은 주요 지표를 보여줍니다:<br>- <strong>목표 (기회비용):</strong> CPP를 일찍 받아 투자함으로써 얻는 금액입니다. 이는 더 늦게 받기 시작하는 더 많은 CPP 연금이 극복해야 할 '목표'입니다.<br>- <strong>누적 차액:</strong> CPP를 늦게 시작함으로써 얻는 추가적인 세후 금액의 누적 합계입니다.<br>- <strong>손익분기점</strong>은 '누적 차액'이 '목표'를 처음으로 넘어서는 나이입니다."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        themeToggle: document.getElementById('theme-toggle'),
        langToggle: document.getElementById('lang-toggle'),
        provinceSelect: document.getElementById('province'),
        hasSpouseCheckbox: document.getElementById('hasSpouse'),
        spouseInfoGroup: document.getElementById('spouse-info-group'),
        manageIncomeBtn: document.getElementById('manage-income-btn'),
        runBreakEvenBtn: document.getElementById('run-break-even-btn'),
        loadingIndicator: document.getElementById('loading-indicator'),
        resultsContainer: document.getElementById('results-container'),
        breakEvenTextResult: document.getElementById('break-even-text-result'),
        toggleDetailsBtn: document.getElementById('toggle-details-btn'),
        detailedTableContainer: document.getElementById('detailed-table-container'),
        exportCsvBtn: document.getElementById('export-csv-btn'),
        incomeModal: document.getElementById('income-modal'),
        closeButton: document.querySelector('#income-modal .close-button'),
        saveIncomeBtn: document.getElementById('save-income-btn'),
        incomeList: document.getElementById('income-list'),
        incomeIdInput: document.getElementById('income-id'),
        futureValueDisplay: document.getElementById('future-value-display'),
        addIncomeForm: document.getElementById('add-income-form'),
        welcomeModal: document.getElementById('welcome-modal'),
        welcomeCloseButton: document.querySelector('#welcome-modal .close-button')
    };
    
    let breakEvenChart;
    let otherIncomes = [];
    let lastResultDetails = [];
    let lastRunInputs = {};
    let currentLanguage = 'en';

    const setLanguage = (lang) => {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            if (translations[lang][key] && typeof translations[lang][key] === 'string') {
                 el.textContent = translations[lang][key];
            }
        });

        document.querySelectorAll('[data-lang-key-tooltip]').forEach(el => {
            const key = el.getAttribute('data-lang-key-tooltip');
            if (translations[lang][key]) {
                el.setAttribute('data-tooltip', translations[lang][key]);
            }
        });
        
        document.querySelectorAll('[data-lang-key="resultsP1"], [data-lang-key="resultsP2"]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            if (translations[lang][key]) {
                el.innerHTML = translations[lang][key];
            }
        });

        elements.langToggle.textContent = translations[lang].langToggle;
        
        populateBreakEvenSelects();
        renderIncomeList();
        
        if(resultsContainer.classList.contains('hidden') === false) {
             runAndDisplayBreakEven(false);
        }
    };
    
    function initialize() {
        Object.keys(taxData).filter(k => k !== 'FED').forEach(prov => {
            elements.provinceSelect.innerHTML += `<option value="${prov}">${prov}</option>`;
        });
        elements.provinceSelect.value = 'ON';
        
        addDefaultIncome();

        elements.welcomeCloseButton.addEventListener('click', () => elements.welcomeModal.classList.add('hidden'));
        elements.welcomeModal.addEventListener('click', (event) => {
            if (event.target === elements.welcomeModal) {
                elements.welcomeModal.classList.add('hidden');
            }
        });

        elements.themeToggle.addEventListener('change', toggleTheme);
        elements.langToggle.addEventListener('click', () => {
            const newLang = currentLanguage === 'en' ? 'ko' : 'en';
            setLanguage(newLang);
        });
        elements.hasSpouseCheckbox.addEventListener('change', toggleSpouseInfo);
        elements.manageIncomeBtn.addEventListener('click', () => elements.incomeModal.classList.remove('hidden'));
        elements.closeButton.addEventListener('click', () => {
            elements.incomeModal.classList.add('hidden');
            clearIncomeForm();
        });
        elements.incomeModal.addEventListener('click', (event) => {
            if (event.target === elements.incomeModal) {
                elements.incomeModal.classList.add('hidden');
                clearIncomeForm();
            }
        });
        elements.saveIncomeBtn.addEventListener('click', saveIncome);
        elements.incomeList.addEventListener('click', handleIncomeListClick);
        elements.runBreakEvenBtn.addEventListener('click', () => runAndDisplayBreakEven(true));
        elements.toggleDetailsBtn.addEventListener('click', () => elements.detailedTableContainer.classList.toggle('hidden'));
        elements.exportCsvBtn.addEventListener('click', () => exportToCsv(lastResultDetails, lastRunInputs));
        elements.addIncomeForm.addEventListener('input', updateFutureValueDisplay);
        
        loadTheme();
        const savedLang = localStorage.getItem('language') || 'en';
        setLanguage(savedLang);

        if (!sessionStorage.getItem('welcomeModalShown')) {
            elements.welcomeModal.classList.remove('hidden');
            sessionStorage.setItem('welcomeModalShown', 'true');
        }
    }

    function toggleTheme() { document.body.classList.toggle('dark-mode', elements.themeToggle.checked); localStorage.setItem('theme', elements.themeToggle.checked ? 'dark' : 'light'); if (breakEvenChart) { updateChartColors(); } }
    function loadTheme() { const isDark = localStorage.getItem('theme') === 'dark'; elements.themeToggle.checked = isDark; if (isDark) { document.body.classList.add('dark-mode'); } }
    function toggleSpouseInfo() { elements.spouseInfoGroup.style.display = elements.hasSpouseCheckbox.checked ? 'block' : 'none'; }
    
    function populateBreakEvenSelects() {
        const baseSelect = document.getElementById('break-even-base');
        const compSelect = document.getElementById('break-even-comparison');
        const currentBaseVal = baseSelect.value;
        const currentCompVal = compSelect.value;
        baseSelect.innerHTML = '';
        compSelect.innerHTML = '';
        for (let age = 60; age <= 70; age++) {
            const ageText = currentLanguage === 'ko' ? `${age}세` : `Age ${age}`;
            baseSelect.innerHTML += `<option value="${age}">${ageText}</option>`;
            compSelect.innerHTML += `<option value="${age}">${ageText}</option>`;
        }
        baseSelect.value = currentBaseVal || 61;
        compSelect.value = currentCompVal || 63;
    }

    function renderIncomeList() {
        const lang = translations[currentLanguage];
        elements.incomeList.innerHTML = otherIncomes.map(inc => `
            <div class="income-item" data-id="${inc.id}">
                <span>${lang.incomeItemLabel(inc)}</span>
                <div>
                    <button type="button" class="edit-btn">${lang.editBtn}</button>
                    <button type="button" class="delete-btn">${lang.deleteBtn}</button>
                </div>
            </div>`).join('') || `<p>${lang.noIncomeAdded}</p>`;
    }
    
    function saveIncome() {
        const id = parseInt(elements.incomeIdInput.value);
        const newIncome = {
            desc: document.getElementById('income-desc').value || 'Other Income',
            amount: parseFloat(document.getElementById('income-amount').value) || 0,
            startAge: parseInt(document.getElementById('income-start-age').value) || 65,
            endAge: parseInt(document.getElementById('income-end-age').value) || 100
        };
        if (id) {
            const index = otherIncomes.findIndex(inc => inc.id === id);
            otherIncomes[index] = { ...otherIncomes[index], ...newIncome };
        } else {
            newIncome.id = Date.now();
            otherIncomes.push(newIncome);
        }
        renderIncomeList();
        clearIncomeForm();
    }

    function handleIncomeListClick(e) {
        if (!e.target.closest('.income-item')) return;
        const id = parseInt(e.target.closest('.income-item').dataset.id);
        if (e.target.classList.contains('delete-btn')) {
            otherIncomes = otherIncomes.filter(inc => inc.id !== id);
            renderIncomeList();
        } else if (e.target.classList.contains('edit-btn')) {
            const income = otherIncomes.find(inc => inc.id === id);
            elements.incomeIdInput.value = income.id;
            document.getElementById('income-desc').value = income.desc;
            document.getElementById('income-amount').value = income.amount;
            document.getElementById('income-start-age').value = income.startAge;
            document.getElementById('income-end-age').value = income.endAge;
            updateFutureValueDisplay();
        }
    }

    function clearIncomeForm() {
        elements.incomeIdInput.value = '';
        elements.addIncomeForm.reset();
        elements.futureValueDisplay.textContent = '';
    }
    
    function updateFutureValueDisplay() {
        const amount = parseFloat(document.getElementById('income-amount').value) || 0;
        const startAge = parseInt(document.getElementById('income-start-age').value);
        const userBirthYear = parseInt(document.getElementById('userBirthYear').value);
        const cola = parseFloat(document.getElementById('cola').value) / 100;
        if (!amount || !startAge || !userBirthYear || isNaN(cola)) {
            elements.futureValueDisplay.textContent = '';
            return;
        }
        const yearsToStart = (userBirthYear + startAge) - new Date().getFullYear();
        if (yearsToStart <= 0) {
            elements.futureValueDisplay.textContent = translations[currentLanguage].futureValueStarted;
            return;
        }
        const futureValue = amount * Math.pow(1 + cola, yearsToStart);
        elements.futureValueDisplay.textContent = translations[currentLanguage].futureValueDisplay({
            age: startAge,
            value: Math.round(futureValue)
        });
    }

    function addDefaultIncome() {
        otherIncomes.push({ id: 1, desc: 'Company Pension', amount: 60000, startAge: 65, endAge: 100 });
    }
    
    function gatherInputs() {
        return {
            province: elements.provinceSelect.value,
            user: {
                birthYear: parseInt(document.getElementById('userBirthYear').value),
                cppAt65: parseFloat(document.getElementById('userCppAt65').value),
                otherIncomes: otherIncomes
            },
            spouse: {
                hasSpouse: elements.hasSpouseCheckbox.checked,
                birthYear: parseInt(document.getElementById('spouseBirthYear').value),
                cppAt65: parseFloat(document.getElementById('spouseCppAt65').value)
            },
            investmentReturn: parseFloat(document.getElementById('investmentReturn').value),
            cola: parseFloat(document.getElementById('cola').value),
            lifeExpectancy: parseInt(document.getElementById('lifeExpectancy').value)
        };
    }
    
    async function runAndDisplayBreakEven(showLoader = true) {
        if (showLoader) {
            elements.loadingIndicator.classList.remove('hidden');
            elements.resultsContainer.classList.add('hidden');
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const inputs = gatherInputs();
        lastRunInputs = inputs;
        const baseAge = parseInt(document.getElementById('break-even-base').value);
        const comparisonAge = parseInt(document.getElementById('break-even-comparison').value);
        
        if (baseAge >= comparisonAge) {
            alert(translations[currentLanguage].alertBaseAge);
            if (showLoader) elements.loadingIndicator.classList.add('hidden');
            return;
        }

        const result = runDeterministicBreakEven(baseAge, comparisonAge, inputs);
        lastResultDetails = result.details;
        
        const lang = translations[currentLanguage];
        elements.breakEvenTextResult.textContent = result.breakEvenAge === -1 ?
            lang.noBreakEvenResult({ lifeExpectancy: inputs.lifeExpectancy, baseAge: baseAge }) :
            lang.breakEvenResult({ baseAge: baseAge, comparisonAge: comparisonAge, breakEvenAge: result.breakEvenAge });

        displayBreakEvenChart(result.details, result.headStartPot, comparisonAge);
        displayDetailedTable(result.details, baseAge);
        
        elements.toggleDetailsBtn.classList.remove('hidden');
        elements.exportCsvBtn.classList.remove('hidden');
        elements.resultsContainer.classList.remove('hidden');
        if (showLoader) elements.loadingIndicator.classList.add('hidden');
    }

    function displayBreakEvenChart(details, headStartPot, lateAge) {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';
        const lang = translations[currentLanguage];

        const ctx = document.getElementById('breakEvenChart').getContext('2d');
        if (breakEvenChart) breakEvenChart.destroy();
        breakEvenChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: details.filter(d => d.age >= lateAge).map(d => d.age),
                datasets: [
                    {
                        label: lang.chartLabelOpportunityCost,
                        data: Array(details.filter(d => d.age >= lateAge).length).fill(headStartPot),
                        borderColor: '#e74c3c', borderDash: [5, 5], pointRadius: 0, fill: false
                    },
                    {
                        label: lang.chartLabelCumulativeDiff,
                        data: details.filter(d => d.age >= lateAge).map(d => d.cumulativeCppDifference),
                        borderColor: '#2ecc71', fill: false, tension: 0.1
                    }
                ]
            },
            options: { responsive: true, scales: {
                    y: { ticks: { color: textColor, callback: v => '$' + v.toLocaleString() }, grid: { color: gridColor } },
                    x: { ticks: { color: textColor }, grid: { color: gridColor } }
                }, plugins: { legend: { labels: { color: textColor } } }
            }
        });
    }

    function displayDetailedTable(details, baseAge) {
        const lang = translations[currentLanguage];
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>${lang.tableHeaderAge}</th>
                        <th>${lang.tableHeaderAnnualDiff}</th>
                        <th>${lang.tableHeaderCumulativeDiff}</th>
                        <th>${lang.tableHeaderTarget}</th>
                        <th>${lang.tableHeaderRemaining}</th>
                    </tr>
                </thead>
                <tbody>
        `;
        details.filter(d => d.age >= baseAge).forEach(d => {
            const remainingGap = d.potValue - d.cumulativeCppDifference;
            const annualDiffDisplay = d.age < details.find(item => item.annualCppDifference != 0)?.age ? '–' : `$${Math.round(d.annualCppDifference).toLocaleString()}`;
            const cumulativeDiffDisplay = d.age < details.find(item => item.cumulativeCppDifference > 0)?.age ? '–' : `$${Math.round(d.cumulativeCppDifference).toLocaleString()}`;
            const remainingGapDisplay = d.age < details.find(item => item.cumulativeCppDifference > 0)?.age ? `$${Math.round(d.potValue).toLocaleString()}` : `$${Math.round(remainingGap).toLocaleString()}`;

            tableHTML += `
                <tr>
                    <td>${currentLanguage === 'ko' ? `${d.age}세` : d.age}</td>
                    <td>${annualDiffDisplay}</td>
                    <td>${cumulativeDiffDisplay}</td>
                    <td>$${Math.round(d.potValue).toLocaleString()}</td>
                    <td>${remainingGapDisplay}</td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        elements.detailedTableContainer.innerHTML = tableHTML;
        elements.detailedTableContainer.classList.add('hidden');
    }
    
    function updateChartColors() { if (!breakEvenChart) return; const isDarkMode = document.body.classList.contains('dark-mode'); const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'; const textColor = isDarkMode ? '#ecf0f1' : '#333'; breakEvenChart.options.scales.y.ticks.color = textColor; breakEvenChart.options.scales.x.ticks.color = textColor; breakEvenChart.options.scales.y.grid.color = gridColor; breakEvenChart.options.scales.x.grid.color = gridColor; breakEvenChart.options.plugins.legend.labels.color = textColor; breakEvenChart.update(); }

    function exportToCsv(details, inputs) {
        if (!details || details.length === 0 || !inputs) return;
        
        const lang = translations[currentLanguage];
        let csvContent = "\uFEFF";

        csvContent += `${lang.csvReportTitle}\n\n`;
        csvContent += `${lang.csvInputInfo},,,,,\n`;
        csvContent += `"${lang.csvProvince}","${inputs.province}",,,,,\n`;
        csvContent += `"${lang.csvMyBirthYear}","${inputs.user.birthYear}",,,,,\n`;
        csvContent += `"${lang.csvMyCpp}","${inputs.user.cppAt65}",,,,,\n`;
        if (inputs.spouse.hasSpouse) {
            csvContent += `"${lang.csvSpouseBirthYear}","${inputs.spouse.birthYear}",,,,,\n`;
            csvContent += `"${lang.csvSpouseCpp}","${inputs.spouse.cppAt65}",,,,,\n`;
        }
        csvContent += `"${lang.csvInvestReturn}","${inputs.investmentReturn}%",,,,,\n`;
        csvContent += `"${lang.csvCola}","${inputs.cola}%",,,,,\n`;
        csvContent += `"${lang.csvMaxAge}","${inputs.lifeExpectancy}",,,,,\n`;
        
        csvContent += `\n${lang.csvOtherIncome},,,,,\n`;
        inputs.user.otherIncomes.forEach(inc => {
            csvContent += lang.csvIncomeDesc(inc) + "\n";
        });
        
        csvContent += "\n\n";
        
        const headers = lang.csvDetailHeader;
        csvContent += headers.join(",") + "\n";

        details.forEach(d => {
            const row = [
                d.age,
                Math.round(d.earlyAfterTaxCpp),
                Math.round(d.lateAfterTaxCpp),
                Math.round(d.annualCppDifference),
                Math.round(d.cumulativeCppDifference),
                Math.round(d.potValue)
            ].join(",");
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "cpp_breakeven_analysis.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    initialize();
});