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
const navEmergency = document.getElementById('nav-emergency');

const sectionDashboard = document.getElementById('dashboard');
const sectionHistory = document.getElementById('history-section');
const sectionDates = document.getElementById('dates-section');
const sectionEmergency = document.getElementById('emergency-section');

// --- Initialisering ---
async function initApp() {
    loadDates();
    
    // Hent live-data fra databasen
    await loadDataFromCloud();

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
        .select('*')
        .order('dato', { ascending: false }); // Nyeste øverst

    if (error) {
        console.error("Kunne ikke hente historik fra skyen:", error);
        // Fallback til sidst kendte km, hvis der ikke er internet
        let savedKm = parseInt(localStorage.getItem('megane_km')) || 77000;
        updateDashboard(savedKm);
    } else {
        kmHistory = data || [];
        
        let currentKm = kmHistory.length > 0 ? kmHistory[0].km : (parseInt(localStorage.getItem('megane_km')) || 77000);
        localStorage.setItem('megane_km', currentKm); // Lokal backup
        
        updateDashboard(currentKm);
        renderHistory();
    }
}

// --- Opdater skærmen (Forside) ---
function updateDashboard(currentKm) {
    displayKm.innerText = currentKm.toLocaleString('da-DK');
    valMaxIns.innerText = MAX_INSURANCE_KM.toLocaleString('da-DK');
    valMaxWar.innerText = MAX_WARRANTY_TOTAL_KM.toLocaleString('da-DK');

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
            
            // 1. Opdater skærmen med det samme for hurtig reaktion
            const tempEntry = { dato: new Date().toISOString(), km: newKm, diff: diff };
            kmHistory.unshift(tempEntry);
            localStorage.setItem('megane_km', newKm);
            updateDashboard(newKm);
            renderHistory();

            // 2. Send data til Supabase i baggrunden
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
    updateDashboard(currentSavedKm);
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
    navEmergency.classList.remove('active');
    
    sectionDashboard.classList.add('hidden');
    sectionHistory.classList.add('hidden');
    sectionDates.classList.add('hidden');
    sectionEmergency.classList.add('hidden');
    
    activeNavBtn.classList.add('active');
    sectionToShow.classList.remove('hidden');
}

navHome.addEventListener('click', () => switchSection(navHome, sectionDashboard));
navHistory.addEventListener('click', () => switchSection(navHistory, sectionHistory));
navDates.addEventListener('click', () => switchSection(navDates, sectionDates));
navEmergency.addEventListener('click', () => switchSection(navEmergency, sectionEmergency));

// Start
initApp();