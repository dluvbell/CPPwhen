// ui.js

document.addEventListener('DOMContentLoaded', () => {
    // UI 요소 가져오기 (이전과 동일)
    const themeToggle = document.getElementById('theme-toggle');
    const provinceSelect = document.getElementById('province');
    const hasSpouseCheckbox = document.getElementById('hasSpouse');
    const spouseInfoGroup = document.getElementById('spouse-info-group');
    const manageIncomeBtn = document.getElementById('manage-income-btn');
    const runBreakEvenBtn = document.getElementById('run-break-even-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultsContainer = document.getElementById('results-container');
    const breakEvenResultEl = document.getElementById('break-even-result');
    const breakEvenTextResult = document.getElementById('break-even-text-result');
    const toggleDetailsBtn = document.getElementById('toggle-details-btn');
    const detailedTableContainer = document.getElementById('detailed-table-container');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const incomeModal = document.getElementById('income-modal');
    const closeButton = document.querySelector('.close-button');
    const saveIncomeBtn = document.getElementById('save-income-btn');
    const incomeList = document.getElementById('income-list');
    const incomeIdInput = document.getElementById('income-id');
    const futureValueDisplay = document.getElementById('future-value-display');
    
    let breakEvenChart;
    let otherIncomes = [];
    let lastResultDetails = [];
    let lastRunInputs = {}; // CSV 내보내기를 위한 입력값 저장

    function initialize() {
        Object.keys(taxData).filter(k => k !== 'FED').forEach(prov => {
            provinceSelect.innerHTML += `<option value="${prov}">${prov}</option>`;
        });
        provinceSelect.value = 'ON';

        themeToggle.addEventListener('change', toggleTheme);
        hasSpouseCheckbox.addEventListener('change', toggleSpouseInfo);
        manageIncomeBtn.addEventListener('click', () => incomeModal.classList.remove('hidden'));
        closeButton.addEventListener('click', () => {
            incomeModal.classList.add('hidden');
            clearIncomeForm();
        });
        // 수정: 팝업 창 바깥 영역 클릭 시 닫기 기능 추가
        incomeModal.addEventListener('click', (event) => {
            if (event.target === incomeModal) {
                incomeModal.classList.add('hidden');
                clearIncomeForm();
            }
        });
        saveIncomeBtn.addEventListener('click', saveIncome);
        incomeList.addEventListener('click', handleIncomeListClick);
        runBreakEvenBtn.addEventListener('click', runAndDisplayBreakEven);
        toggleDetailsBtn.addEventListener('click', () => detailedTableContainer.classList.toggle('hidden'));
        exportCsvBtn.addEventListener('click', () => exportToCsv(lastResultDetails, lastRunInputs));
        document.getElementById('add-income-form').addEventListener('input', updateFutureValueDisplay);

        addDefaultIncome();
        populateBreakEvenSelects();
        loadTheme();
    }

    // ... (toggleTheme, loadTheme, updateChartColors, toggleSpouseInfo, populateBreakEvenSelects 함수는 이전과 동일) ...
    function toggleTheme() { document.body.classList.toggle('dark-mode', themeToggle.checked); localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light'); if (breakEvenChart) { updateChartColors(); } }
    function loadTheme() { const isDark = localStorage.getItem('theme') === 'dark'; themeToggle.checked = isDark; if (isDark) { document.body.classList.add('dark-mode'); } }
    function updateChartColors() { if (!breakEvenChart) return; const isDarkMode = document.body.classList.contains('dark-mode'); const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'; const textColor = isDarkMode ? '#ecf0f1' : '#333'; breakEvenChart.options.scales.y.ticks.color = textColor; breakEvenChart.options.scales.x.ticks.color = textColor; breakEvenChart.options.scales.y.grid.color = gridColor; breakEvenChart.options.scales.x.grid.color = gridColor; breakEvenChart.options.plugins.legend.labels.color = textColor; breakEvenChart.update(); }
    function toggleSpouseInfo() { spouseInfoGroup.style.display = hasSpouseCheckbox.checked ? 'block' : 'none'; }
    function populateBreakEvenSelects() { const baseSelect = document.getElementById('break-even-base'); const compSelect = document.getElementById('break-even-comparison'); for (let age = 60; age <= 70; age++) { baseSelect.innerHTML += `<option value="${age}">${age}세</option>`; compSelect.innerHTML += `<option value="${age}">${age}세</option>`; } baseSelect.value = 61; compSelect.value = 63; }

    // ... (renderIncomeList, saveIncome, handleIncomeListClick, clearIncomeForm, updateFutureValueDisplay, addDefaultIncome 함수는 이전과 동일) ...
    function renderIncomeList() { incomeList.innerHTML = otherIncomes.map(inc => `<div class="income-item" data-id="${inc.id}"><span>${inc.desc}: $${inc.amount.toLocaleString()}/년 (${inc.startAge}세-${inc.endAge}세)</span><div><button type="button" class="edit-btn">수정</button><button type="button" class="delete-btn">삭제</button></div></div>`).join('') || '<p>추가된 소득이 없습니다.</p>'; }
    function saveIncome() { const id = parseInt(incomeIdInput.value); const newIncome = { desc: document.getElementById('income-desc').value || '기타 소득', amount: parseFloat(document.getElementById('income-amount').value) || 0, startAge: parseInt(document.getElementById('income-start-age').value) || 65, endAge: parseInt(document.getElementById('income-end-age').value) || 100 }; if (id) { const index = otherIncomes.findIndex(inc => inc.id === id); otherIncomes[index] = { ...otherIncomes[index], ...newIncome }; } else { newIncome.id = Date.now(); otherIncomes.push(newIncome); } renderIncomeList(); clearIncomeForm(); }
    function handleIncomeListClick(e) { if (!e.target.closest('.income-item')) return; const id = parseInt(e.target.closest('.income-item').dataset.id); if (e.target.classList.contains('delete-btn')) { otherIncomes = otherIncomes.filter(inc => inc.id !== id); renderIncomeList(); } else if (e.target.classList.contains('edit-btn')) { const income = otherIncomes.find(inc => inc.id === id); incomeIdInput.value = income.id; document.getElementById('income-desc').value = income.desc; document.getElementById('income-amount').value = income.amount; document.getElementById('income-start-age').value = income.startAge; document.getElementById('income-end-age').value = income.endAge; updateFutureValueDisplay(); } }
    function clearIncomeForm() { incomeIdInput.value = ''; document.getElementById('add-income-form').reset(); futureValueDisplay.textContent = ''; }
    function updateFutureValueDisplay() { const amount = parseFloat(document.getElementById('income-amount').value) || 0; const startAge = parseInt(document.getElementById('income-start-age').value); const userBirthYear = parseInt(document.getElementById('userBirthYear').value); const cola = parseFloat(document.getElementById('cola').value) / 100; if (!amount || !startAge || !userBirthYear || isNaN(cola)) { futureValueDisplay.textContent = ''; return; } const yearsToStart = (userBirthYear + startAge) - new Date().getFullYear(); if (yearsToStart <= 0) { futureValueDisplay.textContent = '이미 시작된 소득입니다.'; return; } const futureValue = amount * Math.pow(1 + cola, yearsToStart); futureValueDisplay.textContent = `${startAge}세 시점 예상 연액: $${Math.round(futureValue).toLocaleString()}`; }
    function addDefaultIncome() { otherIncomes.push({ id: 1, desc: '회사 연금', amount: 60000, startAge: 65, endAge: 100 }); renderIncomeList(); }
    
    function gatherInputs() {
        return {
            province: provinceSelect.value,
            user: {
                birthYear: parseInt(document.getElementById('userBirthYear').value),
                cppAt65: parseFloat(document.getElementById('userCppAt65').value),
                otherIncomes: otherIncomes
            },
            spouse: {
                hasSpouse: hasSpouseCheckbox.checked,
                birthYear: parseInt(document.getElementById('spouseBirthYear').value),
                cppAt65: parseFloat(document.getElementById('spouseCppAt65').value)
            },
            investmentReturn: parseFloat(document.getElementById('investmentReturn').value),
            cola: parseFloat(document.getElementById('cola').value),
            lifeExpectancy: parseInt(document.getElementById('lifeExpectancy').value)
        };
    }
    
    async function runAndDisplayBreakEven() {
        loadingIndicator.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const inputs = gatherInputs();
        lastRunInputs = inputs; // 입력값 저장
        const baseAge = parseInt(document.getElementById('break-even-base').value);
        const comparisonAge = parseInt(document.getElementById('break-even-comparison').value);
        
        if (baseAge >= comparisonAge) {
            alert('기준 나이는 비교 나이보다 빨라야 합니다.');
            loadingIndicator.classList.add('hidden');
            return;
        }

        const result = runDeterministicBreakEven(baseAge, comparisonAge, inputs);
        lastResultDetails = result.details;
        
        breakEvenTextResult.textContent = result.breakEvenAge === -1 ?
            `예상 수명(${inputs.lifeExpectancy}세) 내에 손익분기점이 발생하지 않습니다. ${baseAge}세 시작이 더 유리합니다.` :
            `${baseAge}세와 ${comparisonAge}세 시작 시나리오의 세후 기준 손익분기점은 약 ${result.breakEvenAge}세 입니다.`;

        displayBreakEvenChart(result.details, result.headStartPot, comparisonAge);
        displayDetailedTable(result.details, baseAge);
        
        toggleDetailsBtn.classList.remove('hidden');
        exportCsvBtn.classList.remove('hidden');
        resultsContainer.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }

    function displayBreakEvenChart(details, headStartPot, lateAge) {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';

        const ctx = document.getElementById('breakEvenChart').getContext('2d');
        if (breakEvenChart) breakEvenChart.destroy();
        breakEvenChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: details.filter(d => d.age >= lateAge).map(d => d.age),
                datasets: [
                    {
                        label: '세후 기회비용 (목표 금액)',
                        data: Array(details.filter(d => d.age >= lateAge).length).fill(headStartPot),
                        borderColor: '#e74c3c', borderDash: [5, 5], pointRadius: 0, fill: false
                    },
                    {
                        label: '세후 CPP 누적 차액',
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
        let tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>나이</th>
                        <th>연간 차액</th>
                        <th>누적 차액</th>
                        <th>기회비용(목표)</th>
                        <th>따라잡아야 할 남은 금액</th>
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
                    <td>${d.age}세</td>
                    <td>${annualDiffDisplay}</td>
                    <td>${cumulativeDiffDisplay}</td>
                    <td>$${Math.round(d.potValue).toLocaleString()}</td>
                    <td>${remainingGapDisplay}</td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        detailedTableContainer.innerHTML = tableHTML;
        detailedTableContainer.classList.add('hidden');
    }

    /**
     * 상세 데이터를 CSV 파일로 변환하여 다운로드하는 함수 (수정됨)
     * 입력 정보(Inputs)를 파일 상단에 추가
     */
    function exportToCsv(details, inputs) {
        if (!details || details.length === 0 || !inputs) {
            alert('내보낼 데이터가 없습니다. 먼저 분석을 실행해 주십시오.');
            return;
        }
        
        let csvContent = "\uFEFF"; // UTF-8 BOM (엑셀 호환성)

        // 입력 정보 추가
        csvContent += "CPP 최적화 시뮬레이터 분석 리포트\n\n";
        csvContent += "입력된 정보,,,,,\n";
        csvContent += `거주 주,"${inputs.province}",,,,,\n`;
        csvContent += `나의 생년,"${inputs.user.birthYear}",,,,,\n`;
        csvContent += `나의 65세 CPP,"${inputs.user.cppAt65}",,,,,\n`;
        if (inputs.spouse.hasSpouse) {
            csvContent += `배우자 생년,"${inputs.spouse.birthYear}",,,,,\n`;
            csvContent += `배우자 65세 CPP,"${inputs.spouse.cppAt65}",,,,,\n`;
        }
        csvContent += `초기 투자 수익률,"${inputs.investmentReturn}%",,,,,\n`;
        csvContent += `물가상승률(COLA),"${inputs.cola}%",,,,,\n`;
        csvContent += `최대 계산 나이,"${inputs.lifeExpectancy}",,,,,\n`;
        
        csvContent += "\n기타 소득 정보,,,,,\n";
        inputs.user.otherIncomes.forEach(inc => {
            csvContent += `"${inc.desc}","$${inc.amount} (현재가치)",${inc.startAge}세부터,${inc.endAge}세까지,,\n`;
        });
        
        csvContent += "\n\n";
        
        // 상세 데이터 표 추가
        const headers = ["나이", "세후 CPP (기준년도)", "세후 CPP (비교년도)", "세후 CPP 연간 차액", "CPP 누적 차액", "세후 기회비용(목표)"];
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