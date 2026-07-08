// --- Supabase Opsætning ---
const supabaseUrl = 'https://ibuaufoncymhlljgamie.supabase.co';
const supabaseKey = 'sb_publishable_r9cQCKHvlOh1RUqXdDM45A_bJEoovHh';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Globale variable ---
let START_KM = parseInt(localStorage.getItem('start_km')) || 65000;
let MAX_INSURANCE_KM = parseInt(localStorage.getItem('max_ins_km')) || 25000;
let MAX_WARRANTY_TOTAL_KM = parseInt(localStorage.getItem('max_war_km')) || 150000;

// Historikken hentes nu live fra Supabase
let kmHistory = [];
let monthlyChartInstance = null;

// --- Elementer fra siden ---
const displayKm = document.getElementById('current-km-display');
const btnLogKm = document.getElementById('btn-open-log');
const btnEditSettings = document.getElementById('btn-edit-settings');

const insuranceBar = document.getElementById('insurance-bar');
const insuranceText = document.getElementById('insurance-text');
const insuranceStatus = document.getElementById('insurance-status');
const valMaxIns = document.getElementById('val-max-ins');

const warrantyBar = document.getElementById('warranty-bar');
const warrantyText = document.getElementById('warranty-text');
const warrantyStatus = document.getElementById('warranty-status');
const valMaxWar = document.getElementById('val-max-war');

const vinDisplay = document.getElementById('vin-display'); 

// Elementer til historik & Graf
const historyList = document.getElementById('history-list');
const statThisMonth = document.getElementById('stat-this-month');
const statTotalDriven = document.getElementById('stat-total-driven');
const btnAddHistory = document.getElementById('btn-add-history');
const chartCanvas = document.getElementById('monthlyChart');

// Navigation
const navHome = document.getElementById('nav-home');
const navHistory = document.getElementById('nav-history');
const navDates = document.getElementById('nav-dates');
const navCarInfo = document.getElementById('nav-car-info');
const navEmergency = document.getElementById('nav-emergency');

const sectionDashboard = document.getElementById('dashboard');
const sectionHistory = document.getElementById('history-section');
const sectionDates = document.getElementById('dates-section');
const sectionCarInfo = document.getElementById('car-info-section');
const sectionEmergency = document.getElementById('emergency-section');

// Fragus Modal
const btnFragus = document.getElementById('btn-fragus');
const fragusModal = document.getElementById('fragus-modal');
const closeFragus = document.getElementById('close-fragus');

// Budget Modal & Elements
const btnEditBudget = document.getElementById('btn-edit-budget');
const budgetModal = document.getElementById('budget-modal');
const closeBudget = document.getElementById('close-budget');
const btnSaveBudget = document.getElementById('btn-save-budget');
const inputYdelse = document.getElementById('input-budget-ydelse');
const inputClever = document.getElementById('input-budget-clever');
const inputForsikring = document.getElementById('input-budget-forsikring');
const inputEjerafgift = document.getElementById('input-budget-ejerafgift');
const inputVedligeholdelse = document.getElementById('input-budget-vedligeholdelse');
const inputSoh = document.getElementById('input-budget-soh');

// New Loan Modal & Elements
const newLoanModal = document.getElementById('new-loan-modal');
const closeNewLoan = document.getElementById('close-new-loan');
const tabBtnAuto = document.getElementById('tab-btn-auto');
const tabBtnManual = document.getElementById('tab-btn-manual');
const formAutoPlan = document.getElementById('form-auto-plan');
const formManualPlan = document.getElementById('form-manual-plan');
const btnGenerateAutoLoan = document.getElementById('btn-generate-auto-loan');
const btnSaveManualLoan = document.getElementById('btn-save-manual-loan');
const inputLoanMonths = document.getElementById('input-loan-months');
const inputLoanJson = document.getElementById('input-loan-json');
const txtNewLoanCar = document.getElementById('txt-new-loan-car');
const txtNewLoanPrincipal = document.getElementById('txt-new-loan-principal');
const txtNewLoanRate = document.getElementById('txt-new-loan-rate');

// --- Initialisering ---
async function initApp() {
    loadDates();
    
    // Hent live-data fra databasen
    await loadDataFromCloud();
    await loadBudget();
    await loadAfdragsplan();
    await loadCandidates();

    // Tjek for MacroDroid genvej
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('handling') === 'log-kilometer') {
        window.history.replaceState({}, document.title, window.location.pathname);
        promptForKilometers();
    }
}

// --- Hent Data fra Supabase ---
async function loadDataFromCloud() {
    const { data, error } = await supabaseClient
        .from('km_historik')
        // RETTELSE HER: Henter også de nye batterikolonner
        .select('km, diff, dato, batteri_procent, raekkevidde')
        .order('dato', { ascending: false }); // Nyeste øverst

    if (error) {
        console.error("Kunne ikke hente historik fra skyen:", error);
        // Fallback til sidst kendte km, hvis der ikke er internet
        let savedKm = parseInt(localStorage.getItem('megane_km')) || 77000;
        // Kalder updateDashboard uden batteridata, hvis offline
        updateDashboard(savedKm, null, null); 
    } else {
        kmHistory = data || [];
        
        let currentKm = kmHistory.length > 0 ? kmHistory[0].km : (parseInt(localStorage.getItem('megane_km')) || 77000);
        
        // Hent de nyeste batterital fra den øverste (nyeste) række i databasen
        let currentBat = kmHistory.length > 0 ? kmHistory[0].batteri_procent : null;
        let currentRange = kmHistory.length > 0 ? kmHistory[0].raekkevidde : null;
        
        localStorage.setItem('megane_km', currentKm); // Lokal backup
        
        updateDashboard(currentKm, currentBat, currentRange);
        renderHistory();
    }
}

// --- Opdater skærmen (Forside) ---
function updateDashboard(currentKm, currentBat, currentRange) {
    displayKm.innerText = currentKm.toLocaleString('da-DK');
    valMaxIns.innerText = MAX_INSURANCE_KM.toLocaleString('da-DK');
    valMaxWar.innerText = MAX_WARRANTY_TOTAL_KM.toLocaleString('da-DK');

    // TILFØJELSE HER: Indsæt batteri-info i HTML, hvis elementet findes, eller opret det.
    let batteryDiv = document.getElementById('battery-info-container');
    if (!batteryDiv) {
        // Opret containeren, hvis den ikke findes (indsættes lige under kilometer-displayet)
        batteryDiv = document.createElement('div');
        batteryDiv.id = 'battery-info-container';
        batteryDiv.style.textAlign = 'center';
        batteryDiv.style.marginTop = '10px';
        batteryDiv.style.color = 'var(--text-muted)';
        batteryDiv.style.fontSize = '14px';
        
        // Find elementet, der viser kilometer, og indsæt batteri-div'en lige efter
        const parentCard = displayKm.closest('.card') || displayKm.parentElement;
        if (parentCard) {
            displayKm.parentNode.insertBefore(batteryDiv, displayKm.nextSibling);
        }
    }
    
    // Hvis der er batteridata, vis dem
    if (currentBat !== null && currentRange !== null) {
         batteryDiv.innerHTML = `🔋 ${currentBat}% | 🎯 ${currentRange} km rækkevidde`;
    } else {
         batteryDiv.innerHTML = `<span style="font-size: 12px;">Venter på batteridata...</span>`;
    }

    // If Forsikring
    const kmDrivenSinceStart = currentKm - START_KM;
    let insuranceLeft = MAX_INSURANCE_KM - kmDrivenSinceStart;
    if (insuranceLeft < 0) insuranceLeft = 0; 
    const insurancePercent = (kmDrivenSinceStart / MAX_INSURANCE_KM) * 100;

    insuranceBar.style.width = Math.min(insurancePercent, 100) + '%';
    insuranceText.innerText = insuranceLeft.toLocaleString('da-DK') + ' km tilbage af kvoten';
    
    if (insuranceLeft < 2000) {
        insuranceStatus.innerText = 'ADVARSEL';
        insuranceStatus.style.color = 'var(--danger-red)';
        insuranceBar.style.backgroundColor = 'var(--danger-red)';
    } else {
        insuranceStatus.innerText = 'OK';
        insuranceStatus.style.color = 'var(--success-green)';
        insuranceBar.style.backgroundColor = 'var(--primary-blue)';
    }

    // GoSafe Garanti
    let warrantyLeft = MAX_WARRANTY_TOTAL_KM - currentKm;
    if (warrantyLeft < 0) warrantyLeft = 0;
    const warrantyPercent = (currentKm / MAX_WARRANTY_TOTAL_KM) * 100;

    warrantyBar.style.width = Math.min(warrantyPercent, 100) + '%';
    warrantyText.innerText = warrantyLeft.toLocaleString('da-DK') + ' km tilbage';
}

// --- Opdater Historik Liste & Tegn Graf ---
function renderHistory() {
    historyList.innerHTML = ''; 
    let currentMonthKm = 0;
    
    // kmHistory er allerede sorteret med nyeste øverst fra databasen
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const latestKm = kmHistory.length > 0 ? kmHistory[0].km : START_KM;
    statTotalDriven.innerText = (latestKm - START_KM).toLocaleString('da-DK');

    // 1. Byg selve listen (HTML)
    kmHistory.forEach(entry => {
        const entryDate = new Date(entry.dato); // Kolonnen hedder "dato" i databasen
        
        if(entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
            currentMonthKm += entry.diff;
        }

        const dateString = entryDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
        const li = document.createElement('li');
        li.className = 'history-item';
        
        const diffBadge = entry.diff > 0 
            ? `<span class="history-diff">+ ${entry.diff.toLocaleString('da-DK')} km</span>` 
            : `<span style="font-size: 13px; color: var(--text-muted);">Start</span>`;

        li.innerHTML = `
            <div class="history-info">
                <strong>${entry.km.toLocaleString('da-DK')} km</strong>
                <span>${dateString}</span>
            </div>
            ${diffBadge}
        `;
        historyList.appendChild(li);
    });

    statThisMonth.innerText = currentMonthKm.toLocaleString('da-DK');

    // 2. Klargør data til Grafen
    const monthlyData = {};
    
    // Vi kigger på historikken kronologisk for grafen
    const chronologicalHistory = [...kmHistory].sort((a, b) => new Date(a.dato) - new Date(b.dato));
    
    chronologicalHistory.forEach(entry => {
        if (entry.diff === 0) return; 

        const d = new Date(entry.dato);
        const monthLabel = d.toLocaleDateString('da-DK', { month: 'short', year: 'numeric' });
        
        if(monthlyData[monthLabel]) {
            monthlyData[monthLabel] += entry.diff;
        } else {
            monthlyData[monthLabel] = entry.diff;
        }
    });

    const labels = Object.keys(monthlyData);
    const dataPoints = Object.values(monthlyData);

    // 3. Tegn grafen med Chart.js
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy(); 
    }

    if (labels.length === 0) {
        labels.push("Denne måned");
        dataPoints.push(0);
    }

    monthlyChartInstance = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kørte kilometer',
                data: dataPoints,
                backgroundColor: '#0056b3', 
                borderRadius: 4,
                barThickness: 'flex',
                maxBarThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' km';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0' },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

// --- Indtast og Gem kilometer til Databasen ---
async function promptForKilometers() {
    const currentSavedKm = kmHistory.length > 0 ? kmHistory[0].km : (parseInt(localStorage.getItem('megane_km')) || 77000);
    
    const input = prompt("Hvad står kilometer tælleren i Renault appen på nu?", currentSavedKm);
    if (input !== null && input !== "") {
        const newKm = parseInt(input.replace(/\./g, '')); 
        
        if (!isNaN(newKm) && newKm >= currentSavedKm) {
            // Hvis det er allerførste indtastning i skyen, sæt diff til 0
            const diff = kmHistory.length === 0 ? 0 : newKm - currentSavedKm;
            
            // Vi sender ikke "falske" batteridata, når vi taster manuelt,
            // så vi beholder de gamle i viewet, indtil robotten kører igen.
            const oldBat = kmHistory.length > 0 ? kmHistory[0].batteri_procent : null;
            const oldRange = kmHistory.length > 0 ? kmHistory[0].raekkevidde : null;
            
            // 1. Opdater skærmen med det samme for hurtig reaktion
            const tempEntry = { dato: new Date().toISOString(), km: newKm, diff: diff, batteri_procent: oldBat, raekkevidde: oldRange };
            kmHistory.unshift(tempEntry);
            localStorage.setItem('megane_km', newKm);
            updateDashboard(newKm, oldBat, oldRange);
            renderHistory();

            // 2. Send data til Supabase i baggrunden (uden manuelt batteri input)
            const { error } = await supabaseClient
                .from('km_historik')
                .insert([{ km: newKm, diff: diff }]);
            
            if (error) {
                alert("Der opstod en fejl ved overførsel til skyen.");
                console.error("Supabase fejl:", error);
            } else {
                // Hent listen ned igen for at sikre at id og serverens præcise tidsstempel er med
                await loadDataFromCloud();
            }

        } else {
            alert("Fejl: Tallet er ugyldigt eller lavere end tidligere indtastninger.");
        }
    }
}

btnLogKm.addEventListener('click', promptForKilometers);
btnAddHistory.addEventListener('click', promptForKilometers);

// --- Rediger indstillinger ---
btnEditSettings.addEventListener('click', () => {
    let newStart = prompt("Hvilket kilometertal startede forsikringen på?", START_KM);
    if (newStart) { START_KM = parseInt(newStart); localStorage.setItem('start_km', START_KM); }

    let newIns = prompt("Hvor mange km må du køre årligt ifølge If?", MAX_INSURANCE_KM);
    if (newIns) { MAX_INSURANCE_KM = parseInt(newIns); localStorage.setItem('max_ins_km', MAX_INSURANCE_KM); }

    let newWar = prompt("Hvad er bilens totale kilometergrænse for garantien?", MAX_WARRANTY_TOTAL_KM);
    if (newWar) { MAX_WARRANTY_TOTAL_KM = parseInt(newWar); localStorage.setItem('max_war_km', MAX_WARRANTY_TOTAL_KM); }

    const currentSavedKm = kmHistory.length > 0 ? kmHistory[0].km : 77000;
    const currentBat = kmHistory.length > 0 ? kmHistory[0].batteri_procent : null;
    const currentRange = kmHistory.length > 0 ? kmHistory[0].raekkevidde : null;
    
    updateDashboard(currentSavedKm, currentBat, currentRange);
    renderHistory();
});

// --- Dato Redigering ---
function loadDates() {
    const dates = ['val-date-bservice', 'val-date-syn', 'val-date-aservice', 'val-date-garanti'];
    dates.forEach(id => {
        const savedDate = localStorage.getItem(id);
        if (savedDate) {
            document.getElementById(id).innerText = savedDate;
        }
    });
}

document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-edit');
        const title = e.currentTarget.getAttribute('data-title');
        const currentVal = document.getElementById(targetId).innerText;
        
        const newVal = prompt(`Indtast ny dato for ${title}:`, currentVal);
        if (newVal !== null && newVal.trim() !== "") {
            document.getElementById(targetId).innerText = newVal;
            localStorage.setItem(targetId, newVal);
        }
    });
});

// --- Stelnummer ---
if (vinDisplay) {
    vinDisplay.addEventListener('click', () => {
        vinDisplay.classList.toggle('vin-large');
    });
}

// --- Menu Styring ---
function switchSection(activeNavBtn, sectionToShow) {
    navHome.classList.remove('active');
    navHistory.classList.remove('active');
    navDates.classList.remove('active');
    if (navCarInfo) navCarInfo.classList.remove('active');
    navEmergency.classList.remove('active');
    
    sectionDashboard.classList.add('hidden');
    sectionHistory.classList.add('hidden');
    sectionDates.classList.add('hidden');
    if (sectionCarInfo) sectionCarInfo.classList.add('hidden');
    sectionEmergency.classList.add('hidden');
    
    activeNavBtn.classList.add('active');
    sectionToShow.classList.remove('hidden');
}

navHome.addEventListener('click', () => switchSection(navHome, sectionDashboard));
navHistory.addEventListener('click', () => switchSection(navHistory, sectionHistory));
navDates.addEventListener('click', () => switchSection(navDates, sectionDates));
if (navCarInfo && sectionCarInfo) {
    navCarInfo.addEventListener('click', () => switchSection(navCarInfo, sectionCarInfo));
}
navEmergency.addEventListener('click', () => switchSection(navEmergency, sectionEmergency));

// --- Fragus Modal Logik ---
if (btnFragus && fragusModal) {
    btnFragus.addEventListener('click', () => {
        fragusModal.classList.remove('hidden');
    });
}
if (closeFragus && fragusModal) {
    closeFragus.addEventListener('click', () => {
        fragusModal.classList.add('hidden');
    });
}
if (fragusModal) {
    window.addEventListener('click', (event) => {
        if (event.target === fragusModal) {
            fragusModal.classList.add('hidden');
        }
    });
}

// --- Bilbudget & Værdiprognose Logik ---
let currentBudget = { id: 1, bil_navn: 'Renault Megane E-Tech Iconic', ydelse: 4500, clever: 999, forsikring: 704.93, ejerafgift: 76.67, koebspris: 233975.00, registrerings_dato: '2022-06-20', stelnummer: 'VF1RCB00468400095', is_active: true, vedligeholdelse_buffer: 320.00, batteri_helbred_pct: 100.00 };
let afdragsplanData = [];
let candidatesData = [];

// Globale variable til det nye lån under oprettelse
let pendingNewBilId = null;
let pendingPrincipal = 0;
let pendingRate = 0;
let pendingCarName = '';

async function loadBudget() {
    try {
        const { data, error } = await supabaseClient
            .from('bil_finansiering')
            .select('*')
            .eq('is_active', true)
            .limit(1);
        if (!error && data && data.length > 0) {
            currentBudget = data[0];
            // Opdater bilens faste stamdata på UI hvis der er elementer
            const plateDisplay = document.querySelector('.stamdata-box p:nth-child(1) span');
            const vinDisplaySpan = document.querySelector('.stamdata-box p:nth-child(2) span');
            if (plateDisplay && currentBudget.bil_navn && currentBudget.bil_navn.includes('Megane')) {
                plateDisplay.innerText = 'EM 37 761';
            } else if (plateDisplay) {
                plateDisplay.innerText = '-';
            }
            if (vinDisplaySpan) {
                vinDisplaySpan.innerText = currentBudget.stelnummer || '-';
            }
        }
    } catch (e) {
        console.error("Fejl ved hentning af budget fra Supabase:", e);
    }
    renderBudget();
}

function renderBudget() {
    const ydelseVal = document.getElementById('budget-val-ydelse');
    const cleverVal = document.getElementById('budget-val-clever');
    const forsikringVal = document.getElementById('budget-val-forsikring');
    const ejerafgiftVal = document.getElementById('budget-val-ejerafgift');
    const vedligeholdelseVal = document.getElementById('budget-val-vedligeholdelse');
    const totalVal = document.getElementById('budget-val-total');
    
    // Vis den aktive bils navn i overskriften
    const titleEl = document.querySelector('#car-info-section h2');
    if (titleEl && currentBudget.bil_navn) {
        titleEl.innerText = 'Bil & Økonomi: ' + currentBudget.bil_navn;
    }
    
    if (ydelseVal) ydelseVal.innerText = parseFloat(currentBudget.ydelse).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.';
    if (cleverVal) cleverVal.innerText = parseFloat(currentBudget.clever).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.';
    if (forsikringVal) forsikringVal.innerText = parseFloat(currentBudget.forsikring).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.';
    if (ejerafgiftVal) ejerafgiftVal.innerText = parseFloat(currentBudget.ejerafgift).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.';
    if (vedligeholdelseVal) vedligeholdelseVal.innerText = parseFloat(currentBudget.vedligeholdelse_buffer || 320).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.';
    
    const total = parseFloat(currentBudget.ydelse) + parseFloat(currentBudget.clever) + parseFloat(currentBudget.forsikring) + parseFloat(currentBudget.ejerafgift) + parseFloat(currentBudget.vedligeholdelse_buffer || 320);
    if (totalVal) totalVal.innerText = total.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.';

    // --- Opdater Batterihelbred (SoH) progress bar ---
    const soh = parseFloat(currentBudget.batteri_helbred_pct || 100);
    const sohDisplay = document.getElementById('soh-pct-display');
    const sohBar = document.getElementById('soh-progress-bar');

    // Beregn farve: rød under 70%, gul 70-85%, grøn over 85%
    let sohColor;
    let sohStatus;
    if (soh < 70) {
        sohColor = 'var(--danger-red)';
        sohStatus = '⚠️ Under Fragus-grænse!';
    } else if (soh < 85) {
        sohColor = 'var(--warning-yellow)';
        sohStatus = '⚡ Acceptabel';
    } else {
        sohColor = 'var(--success-green)';
        sohStatus = '✅ God';
    }

    if (sohDisplay) {
        sohDisplay.innerText = soh.toFixed(2) + '% — ' + sohStatus;
        sohDisplay.style.color = sohColor;
    }
    if (sohBar) {
        sohBar.style.width = Math.min(100, Math.max(0, soh)) + '%';
    }
}

// Rediger budget modal
if (btnEditBudget && budgetModal) {
    btnEditBudget.addEventListener('click', () => {
        if (inputYdelse) inputYdelse.value = currentBudget.ydelse;
        if (inputClever) inputClever.value = currentBudget.clever;
        if (inputForsikring) inputForsikring.value = currentBudget.forsikring;
        if (inputEjerafgift) inputEjerafgift.value = currentBudget.ejerafgift;
        if (inputVedligeholdelse) inputVedligeholdelse.value = currentBudget.vedligeholdelse_buffer || 320;
        if (inputSoh) inputSoh.value = currentBudget.batteri_helbred_pct || 100;
        budgetModal.classList.remove('hidden');
    });
}
if (closeBudget && budgetModal) {
    closeBudget.addEventListener('click', () => {
        budgetModal.classList.add('hidden');
    });
}

// Gem budget
if (btnSaveBudget && budgetModal) {
    btnSaveBudget.addEventListener('click', async () => {
        const ydelse = parseFloat(inputYdelse.value) || 0;
        const clever = parseFloat(inputClever.value) || 0;
        const forsikring = parseFloat(inputForsikring.value) || 0;
        const ejerafgift = parseFloat(inputEjerafgift.value) || 0;
        const vedligeholdelse_buffer = parseFloat(inputVedligeholdelse.value) || 0;
        const batteri_helbred_pct = parseFloat(inputSoh.value);
        const validSoh = isNaN(batteri_helbred_pct) ? 100.00 : Math.min(100, Math.max(0, batteri_helbred_pct));
        
        try {
            const { error } = await supabaseClient
                .from('bil_finansiering')
                .update({ ydelse, clever, forsikring, ejerafgift, vedligeholdelse_buffer, batteri_helbred_pct: validSoh })
                .eq('id', currentBudget.id);
                
            if (error) {
                alert("Kunne ikke gemme budget i Supabase: " + error.message);
            } else {
                currentBudget.ydelse = ydelse;
                currentBudget.clever = clever;
                currentBudget.forsikring = forsikring;
                currentBudget.ejerafgift = ejerafgift;
                currentBudget.vedligeholdelse_buffer = vedligeholdelse_buffer;
                currentBudget.batteri_helbred_pct = validSoh;
                renderBudget();
                budgetModal.classList.add('hidden');
                
                // Opdater også sammenligningen
                await loadCandidates();
            }
        } catch (e) {
            alert("Der opstod en fejl under lagring: " + e.message);
        }
    });
}

// Afdragsplan & Prognose
async function loadAfdragsplan() {
    try {
        const { data, error } = await supabaseClient
            .from('laen_afdragsplan')
            .select('dato, balance')
            .eq('bil_id', currentBudget.id)
            .order('dato', { ascending: true });
        if (!error && data) {
            afdragsplanData = data;
        }
    } catch (e) {
        console.error("Fejl ved hentning af afdragsplan fra Supabase:", e);
    }
    renderPrognose();
}

function getBalanceForDate(dateStr) {
    // Hvis vi er efter marts 2031 og bilen er Megane, er balance 0
    if (currentBudget.bil_navn && currentBudget.bil_navn.includes('Megane') && dateStr > '2031-03-01') {
        return 0;
    }
    const row = afdragsplanData.find(item => item.dato === dateStr);
    return row ? parseFloat(row.balance) : 0;
}

function updateCurrentBalance() {
    // Vi bruger dags dato i 2026 (f.eks. juli 2026) som specificeret af brugeren
    const datoStr = '2026-07-01';
    
    const balance = getBalanceForDate(datoStr);
    const displayBalance = document.getElementById('santander-balance');
    if (displayBalance) {
        if (balance > 0 || afdragsplanData.length > 0) {
            displayBalance.innerText = balance.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr.';
        } else {
            displayBalance.innerText = '0,00 kr. (Afbetalt!)';
        }
    }
}

function getEstimatedValueForYear(yearOffset, purchasePrice, carName) {
    if (carName && carName.includes('Megane')) {
        const vaerdier = [215000, 190000, 170000, 150000, 130000, 115000, 100000, 85000, 70000, 55000, 40000];
        return vaerdier[Math.min(yearOffset, vaerdier.length - 1)];
    }
    // For andre biler bruger vi 15% årlig afskrivning
    const baseValue = purchasePrice || 300000;
    return Math.round(baseValue * Math.pow(0.85, yearOffset));
}

function renderPrognose() {
    const prognoseRows = document.getElementById('prognose-rows');
    if (!prognoseRows) return;
    
    const purchaseYear = currentBudget.registrerings_dato ? parseInt(currentBudget.registrerings_dato.substring(0, 4)) : 2022;
    // Vi vil have en 10-årig værdiprognose fra 2026 (Juli 2026 til Juli 2036)
    const startForecastYear = 2026;
    
    let rowsHtml = '';
    for (let i = 0; i <= 10; i++) {
        const forecastYear = startForecastYear + i;
        const yearOffset = forecastYear - purchaseYear;
        const label = i === 0 ? 'NU' : `Om ${i} år`;
        const dateStr = `${forecastYear}-07-01`;
        
        const estValue = getEstimatedValueForYear(Math.max(0, yearOffset), parseFloat(currentBudget.koebspris), currentBudget.bil_navn);
        const restgaeld = getBalanceForDate(dateStr);
        const overskud = estValue - restgaeld;
        
        rowsHtml += `
            <tr>
                <td><strong>${label}</strong></td>
                <td>Juli ${forecastYear}</td>
                <td>${estValue.toLocaleString('da-DK')} kr.</td>
                <td style="color: ${restgaeld > 0 ? 'var(--text-main)' : 'var(--text-muted)'};">${restgaeld > 0 ? restgaeld.toLocaleString('da-DK') + ' kr.' : 'Afbetalt'}</td>
                <td style="text-align: right; font-weight: bold; color: ${overskud >= 0 ? 'var(--success-green)' : 'var(--danger-red)'};">${overskud.toLocaleString('da-DK')} kr.</td>
            </tr>
        `;
    }
    
    prognoseRows.innerHTML = rowsHtml;
    updateCurrentBalance();
}

// --- Digital Garage & TCO Sammenligning ---
function calculateAnnuityPayment(principal, annualRate, months = 84) {
    if (principal <= 0) return 0;
    const monthlyRate = (annualRate / 100) / 12;
    if (monthlyRate === 0) return principal / months;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

function getCurrentCarEquity() {
    const currentCarValue = currentBudget.bil_navn && currentBudget.bil_navn.includes('Megane') ? 215000 : (parseFloat(currentBudget.koebspris) || 233975);
    const currentRestgaeld = getBalanceForDate('2026-07-01');
    const equity = currentCarValue - currentRestgaeld;
    return Math.max(0, equity);
}

async function loadCandidates() {
    try {
        const { data, error } = await supabaseClient
            .from('bil_kandidater')
            .select('*')
            .order('model_navn', { ascending: true });
        if (!error && data) {
            candidatesData = data;
        }
    } catch (e) {
        console.error("Fejl ved hentning af kandidater:", e);
    }
    renderCandidates();
    renderComparison();
}

function renderCandidates() {
    const garageList = document.getElementById('garage-list');
    if (!garageList) return;
    
    if (candidatesData.length === 0) {
        garageList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Ingen kandidater fundet i databasen.</p>';
        return;
    }
    
    let html = '';
    candidatesData.forEach(c => {
        const cPrice = parseFloat(c.pris);
        const dp = getSelectedDownPayment(cPrice);
        const loanAmount = Math.max(0, cPrice - dp);
        const monthlyLoan = calculateAnnuityPayment(loanAmount, parseFloat(c.rente), 84);
        const monthlyTotal = monthlyLoan + parseFloat(c.forsikring) + parseFloat(c.ejerafgift) + 999 + 320.00; // 999 kr Clever + 320 kr buffer
        
        html += `
            <div class="candidate-card">
                <h4 style="margin: 0 0 8px 0; font-size: 15px; color: var(--text-main);">${c.model_navn}</h4>
                <div style="font-size: 18px; font-weight: 800; color: var(--primary-blue); margin-bottom: 8px;">
                    ${parseFloat(c.pris).toLocaleString('da-DK')} kr.
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
                    Månedlig TCO: <strong>${monthlyTotal.toLocaleString('da-DK', { maximumFractionDigits: 0 })} kr./md.</strong>
                </div>
                <div class="spec-grid">
                    <div class="spec-item">
                        <strong>Rækkevidde</strong>
                        <span>${c.wltp_km} km (WLTP)</span>
                    </div>
                    <div class="spec-item">
                        <strong>Ladehastighed</strong>
                        <span>${c.ladehastighed_kw} kW</span>
                    </div>
                    <div class="spec-item">
                        <strong>Bagagerum</strong>
                        <span>${c.bagagerum_liter} L</span>
                    </div>
                    <div class="spec-item">
                        <strong>Anhængertræk</strong>
                        <span>${c.traek_kg} kg</span>
                    </div>
                </div>
                <button class="primary-btn btn-buy-candidate" data-id="${c.id}" style="width: 100%; margin-top: 8px; font-size: 13px; background-color: var(--success-green); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);">Markér som købt</button>
            </div>
        `;
    });
    
    garageList.innerHTML = html;
    
    // Bind "Markér som købt" event-listeners
    const buyButtons = garageList.querySelectorAll('.btn-buy-candidate');
    buyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const candidateId = btn.getAttribute('data-id');
            const candidate = candidatesData.find(c => String(c.id) === String(candidateId));
            if (candidate) {
                markCarAsBought(candidate);
            }
        });
    });
}

function renderComparison() {
    const compareHeader = document.getElementById('compare-header');
    const compareRows = document.getElementById('compare-rows');
    const txtEquity = document.getElementById('txt-current-equity');
    if (!compareHeader || !compareRows) return;
    
    const equity = getCurrentCarEquity();
    if (txtEquity) txtEquity.innerText = equity.toLocaleString('da-DK', { minimumFractionDigits: 2 }) + ' kr.';

    // Beregn en repræsentativ udbetaling til brug i tabellens aktiv-bil kolonne (vises altid som 0 for aktiv bil)
    const samplePrice = candidatesData.length > 0 ? parseFloat(candidatesData[0].pris) : 300000;
    
    // Opbyg header-kolonner
    let headerHtml = '<th>Specifikation</th>';
    headerHtml += `<th style="background-color: #f8fafc;">Aktiv: ${currentBudget.bil_navn || 'Renault Megane'}</th>`;
    candidatesData.forEach(c => {
        headerHtml += `<th>${c.model_navn}</th>`;
    });
    compareHeader.innerHTML = headerHtml;
    
    // Beregn værdier for aktiv bil
    const activeYdelse = parseFloat(currentBudget.ydelse);
    const activeClever = parseFloat(currentBudget.clever);
    const activeForsikring = parseFloat(currentBudget.forsikring);
    const activeEjerafgift = parseFloat(currentBudget.ejerafgift);
    const activeVedligeholdelse = parseFloat(currentBudget.vedligeholdelse_buffer || 320);
    const activeTotal = activeYdelse + activeClever + activeForsikring + activeEjerafgift + activeVedligeholdelse;
    
    // Opret data-rækker til sammenligning
    const specs = [
        { label: 'Købspris', key: 'pris', suffix: ' kr.', format: true, activeVal: currentBudget.koebspris || 233975 },
        { label: 'Udbetaling/Friværdi', key: 'udbetaling', suffix: ' kr.', format: true, activeVal: 0, isEquity: true },
        { label: 'Lånebehov', key: 'laanebehov', suffix: ' kr.', format: true, activeVal: 0, isLoanNeed: true },
        { label: 'Månedlig ydelse', key: 'ydelse', suffix: ' kr.', format: true, activeVal: activeYdelse },
        { label: 'Clever abonnement', key: 'clever', suffix: ' kr.', format: true, activeVal: activeClever },
        { label: 'Forsikring', key: 'forsikring', suffix: ' kr.', format: true, activeVal: activeForsikring },
        { label: 'Grøn ejerafgift', key: 'ejerafgift', suffix: ' kr.', format: true, activeVal: activeEjerafgift },
        { label: 'Dæk & Vedligeholdelse', key: 'vedligeholdelse_buffer', suffix: ' kr.', format: true, activeVal: activeVedligeholdelse },
        { label: 'Månedlig TCO total', key: 'tco', suffix: ' kr.', format: true, activeVal: activeTotal, isTotal: true },
        { label: 'WLTP Rækkevidde', key: 'wltp_km', suffix: ' km', activeVal: 450 }, // Standard for Megane E-Tech Iconic
        { label: 'Max Ladehastighed', key: 'ladehastighed_kw', suffix: ' kW', activeVal: 130 },
        { label: 'Bagagerum', key: 'bagagerum_liter', suffix: ' L', activeVal: 440 },
        { label: 'Anhængertræk', key: 'traek_kg', suffix: ' kg', activeVal: 900 }
    ];
    
    let rowsHtml = '';
    specs.forEach(s => {
        let isTotalRow = s.isTotal ? 'class="total-row" style="background-color: #f0fdf4; font-weight: bold;"' : '';
        rowsHtml += `<tr ${isTotalRow}><td><strong>${s.label}</strong></td>`;
        
        // Aktiv bil værdi
        let activeValStr = '';
        if (s.isEquity) {
            activeValStr = '0,00 kr.';
        } else if (s.isLoanNeed) {
            activeValStr = '0,00 kr.';
        } else if (s.format) {
            activeValStr = parseFloat(s.activeVal).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
        } else {
            activeValStr = s.activeVal + s.suffix;
        }
        rowsHtml += `<td style="background-color: #f8fafc; font-weight: ${s.isTotal ? '800' : 'normal'};">${activeValStr}</td>`;
        
        // Kandidat værdier
        candidatesData.forEach(c => {
            let val = '';
            const cPrice = parseFloat(c.pris);
            const dp = getSelectedDownPayment(cPrice);
            const cLoanAmount = Math.max(0, cPrice - dp);
            const cMonthlyLoan = calculateAnnuityPayment(cLoanAmount, parseFloat(c.rente), 84);
            
            if (s.isEquity) {
                val = dp.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
            } else if (s.isLoanNeed) {
                val = cLoanAmount.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
            } else if (s.key === 'ydelse') {
                val = cMonthlyLoan.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
            } else if (s.key === 'clever') {
                val = (999.00).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
            } else if (s.key === 'vedligeholdelse_buffer') {
                val = (320.00).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
            } else if (s.key === 'tco') {
                const total = cMonthlyLoan + parseFloat(c.forsikring) + parseFloat(c.ejerafgift) + 999 + 320.00;
                val = total.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
            } else if (s.format) {
                val = parseFloat(c[s.key]).toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + s.suffix;
            } else {
                val = c[s.key] + s.suffix;
            }
            rowsHtml += `<td>${val}</td>`;
        });
        rowsHtml += '</tr>';
    });
    
    compareRows.innerHTML = rowsHtml;
}

// --- Udbetalingstype state ---
let downPaymentMode = 'equity'; // 'equity' | 'zero' | 'custom'
let customDownPayment = 0;

/**
 * Beregner den faktiske udbetaling baseret på valgt mode og bilens pris.
 * @param {number} carPrice - Kandidatbilens pris
 * @returns {number} - Udbetalingsbeløb (aldrig negativt)
 */
function getSelectedDownPayment(carPrice) {
    if (downPaymentMode === 'zero') return 0;
    if (downPaymentMode === 'custom') return Math.min(customDownPayment, carPrice);
    // 'equity' mode: friværdi, men minimum 0
    return getCurrentCarEquity();
}

// Bind udbetalingstype vælger
(function bindDownPaymentControls() {
    const radioEquity = document.getElementById('dp-mode-equity');
    const radioZero   = document.getElementById('dp-mode-zero');
    const radioCustom = document.getElementById('dp-mode-custom');
    const customWrap  = document.getElementById('dp-custom-input-wrap');
    const customInput = document.getElementById('dp-custom-amount');
    const equityInfo  = document.getElementById('dp-equity-info');

    function onModeChange() {
        const selected = document.querySelector('input[name="down-payment-mode"]:checked');
        if (!selected) return;
        downPaymentMode = selected.value;

        // Vis/skjul custom inputfelt og friværdi-infobox
        if (customWrap) customWrap.style.display = downPaymentMode === 'custom' ? 'block' : 'none';
        if (equityInfo) equityInfo.style.display = downPaymentMode === 'equity' ? 'block' : 'none';

        renderCandidates();
        renderComparison();
    }

    if (radioEquity) radioEquity.addEventListener('change', onModeChange);
    if (radioZero)   radioZero.addEventListener('change', onModeChange);
    if (radioCustom) radioCustom.addEventListener('change', onModeChange);

    if (customInput) {
        customInput.addEventListener('input', () => {
            customDownPayment = parseFloat(customInput.value) || 0;
            renderCandidates();
            renderComparison();
        });
    }
})();

// Markér som købt proces
async function markCarAsBought(candidate) {
    const equity = getCurrentCarEquity();
    const principal = Math.max(0, candidate.pris - equity);
    const monthlyYdelse = calculateAnnuityPayment(principal, parseFloat(candidate.rente), 84);

    try {
        // 1. Sæt alle eksisterende biler til is_active = false
        const { error: updateError } = await supabaseClient
            .from('bil_finansiering')
            .update({ is_active: false })
            .eq('is_active', true);
            
        if (updateError) {
            alert("Kunne ikke deaktivere tidligere bil: " + updateError.message);
            return;
        }

        // 2. Opret den nye bil i bil_finansiering
        const newCarObj = {
            id: Math.floor(Math.random() * 100000000) + 10,
            bil_navn: candidate.model_navn,
            ydelse: parseFloat(monthlyYdelse.toFixed(2)),
            clever: 999.00,
            forsikring: parseFloat(candidate.forsikring),
            ejerafgift: parseFloat(candidate.ejerafgift),
            koebspris: parseFloat(candidate.pris),
            registrerings_dato: new Date().toISOString().substring(0, 10),
            stelnummer: 'VF1-SIMULERET-' + Math.floor(Math.random() * 1000000),
            is_active: true
        };

        const { data: newCarData, error: insertError } = await supabaseClient
            .from('bil_finansiering')
            .insert([newCarObj])
            .select();

        if (insertError || !newCarData || newCarData.length === 0) {
            alert("Kunne ikke oprette den nye bil: " + (insertError ? insertError.message : "Ingen data returneret"));
            return;
        }

        const newCarId = newCarData[0].id;
        
        // 3. Forbered modalen til afdragsplanen
        pendingNewBilId = newCarId;
        pendingPrincipal = principal;
        pendingRate = parseFloat(candidate.rente);
        pendingCarName = candidate.model_navn;

        if (txtNewLoanCar) txtNewLoanCar.innerText = pendingCarName;
        if (txtNewLoanPrincipal) txtNewLoanPrincipal.innerText = principal.toLocaleString('da-DK', { minimumFractionDigits: 2 }) + ' kr.';
        if (txtNewLoanRate) txtNewLoanRate.innerText = pendingRate + '%';

        // Åben modal
        if (newLoanModal) {
            newLoanModal.classList.remove('hidden');
        }
    } catch (e) {
        alert("Der opstod en fejl under processen: " + e.message);
    }
}

// Modal navigation til ny afdragsplan
if (tabBtnAuto && tabBtnManual && formAutoPlan && formManualPlan) {
    tabBtnAuto.addEventListener('click', () => {
        tabBtnAuto.classList.add('active');
        tabBtnManual.classList.remove('active');
        formAutoPlan.classList.remove('hidden');
        formManualPlan.classList.add('hidden');
    });
    tabBtnManual.addEventListener('click', () => {
        tabBtnManual.classList.add('active');
        tabBtnAuto.classList.remove('active');
        formManualPlan.classList.remove('hidden');
        formAutoPlan.classList.add('hidden');
    });
}

if (closeNewLoan && newLoanModal) {
    closeNewLoan.addEventListener('click', () => {
        newLoanModal.classList.add('hidden');
    });
}

// Generer automatisk afdragsplan (Simuleret)
if (btnGenerateAutoLoan && newLoanModal) {
    btnGenerateAutoLoan.addEventListener('click', async () => {
        const months = parseInt(inputLoanMonths.value) || 84;
        const rows = generateAutoLoanPlan(pendingNewBilId, pendingPrincipal, pendingRate, months);
        
        try {
            const { error } = await supabaseClient
                .from('laen_afdragsplan')
                .insert(rows);
                
            if (error) {
                alert("Kunne ikke gemme afdragsplan i Supabase: " + error.message);
            } else {
                newLoanModal.classList.add('hidden');
                alert(`${pendingCarName} er nu din aktive bil, og en ${months}-måneders afdragsplan er blevet genereret.`);
                // Genindlæs app
                await loadBudget();
                await loadAfdragsplan();
                await loadCandidates();
            }
        } catch (e) {
            alert("Der opstod en fejl under oprettelse af afdragsplan: " + e.message);
        }
    });
}

// Gem manuel JSON afdragsplan
if (btnSaveManualLoan && newLoanModal) {
    btnSaveManualLoan.addEventListener('click', async () => {
        const jsonText = inputLoanJson.value;
        try {
            const plan = JSON.parse(jsonText);
            if (!Array.isArray(plan)) {
                alert("Afdragsplanen skal være et array af objekter.");
                return;
            }
            
            // Flet bil_id ind i hvert objekt
            const rows = plan.map(item => ({
                bil_id: pendingNewBilId,
                dato: item.dato,
                ydelse: parseFloat(item.ydelse) || 0,
                gebyr: parseFloat(item.gebyr) || 0,
                rente: parseFloat(item.rente) || 0,
                afdrag: parseFloat(item.afdrag) || 0,
                balance: parseFloat(item.balance) || 0
            }));
            
            const { error } = await supabaseClient
                .from('laen_afdragsplan')
                .insert(rows);
                
            if (error) {
                alert("Kunne ikke indsætte manuel afdragsplan: " + error.message);
            } else {
                newLoanModal.classList.add('hidden');
                alert(`${pendingCarName} er nu din aktive bil med din manuelle afdragsplan.`);
                await loadBudget();
                await loadAfdragsplan();
                await loadCandidates();
            }
        } catch (e) {
            alert("Ugyldigt JSON format eller fejl ved parsing: " + e.message);
        }
    });
}

function generateAutoLoanPlan(bilId, principal, annualRate, løbetidMåneder) {
    const monthlyRate = (annualRate / 100) / 12;
    const monthlyPayment = calculateAnnuityPayment(principal, annualRate, løbetidMåneder);
    
    let balance = principal;
    const rows = [];
    const startDate = new Date(2026, 7, 1); // August 1st, 2026
    
    for (let i = 0; i < løbetidMåneder; i++) {
        const rente = balance * monthlyRate;
        const afdrag = monthlyPayment - rente;
        balance = Math.max(0, balance - afdrag);
        
        const dateObj = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const datoStr = `${y}-${m}-01`;
        
        rows.push({
            bil_id: bilId,
            dato: datoStr,
            ydelse: parseFloat(monthlyPayment.toFixed(2)),
            gebyr: 0,
            rente: parseFloat(rente.toFixed(2)),
            afdrag: parseFloat(afdrag.toFixed(2)),
            balance: parseFloat(balance.toFixed(2))
        });
    }
    return rows;
}

// Modal baggrunds lukning for modals
if (budgetModal) {
    window.addEventListener('click', (event) => {
        if (event.target === budgetModal) {
            budgetModal.classList.add('hidden');
        }
    });
}
if (newLoanModal) {
    window.addEventListener('click', (event) => {
        if (event.target === newLoanModal) {
            newLoanModal.classList.add('hidden');
        }
    });
}

// Start
initApp();
