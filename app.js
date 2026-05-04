// --- Globale variable der hentes fra telefonens hukommelse ---
let START_KM = parseInt(localStorage.getItem('start_km')) || 65000;
let MAX_INSURANCE_KM = parseInt(localStorage.getItem('max_ins_km')) || 25000;
let MAX_WARRANTY_TOTAL_KM = parseInt(localStorage.getItem('max_war_km')) || 150000;

// Hent kørselshistorik (et array af objekter) eller lav en tom liste
let kmHistory = JSON.parse(localStorage.getItem('km_history')) || [];

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

// Nye elementer til historik
const historyList = document.getElementById('history-list');
const statThisMonth = document.getElementById('stat-this-month');
const statTotalDriven = document.getElementById('stat-total-driven');
const btnAddHistory = document.getElementById('btn-add-history');

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
function initApp() {
    let savedKm = localStorage.getItem('megane_km') ? parseInt(localStorage.getItem('megane_km')) : 77000;
    
    // Hvis historikken er tom, men vi har et gemt km-tal, laver vi en første indtastning for at starte listen
    if (kmHistory.length === 0 && savedKm) {
        kmHistory.push({ date: new Date().toISOString(), km: savedKm, diff: 0 });
        localStorage.setItem('km_history', JSON.stringify(kmHistory));
    }

    updateDashboard(savedKm);
    renderHistory();
    loadDates();

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('handling') === 'log-kilometer') {
        window.history.replaceState({}, document.title, window.location.pathname);
        promptForKilometers();
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

// --- Opdater Historik Listen ---
function renderHistory() {
    historyList.innerHTML = ''; // Ryd listen før vi tegner den igen
    let currentMonthKm = 0;
    
    // Sortér listen så den nyeste er øverst
    const sortedHistory = [...kmHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Den nyeste km stand (til at regne total)
    const latestKm = sortedHistory.length > 0 ? sortedHistory[0].km : START_KM;
    statTotalDriven.innerText = (latestKm - START_KM).toLocaleString('da-DK');

    sortedHistory.forEach(entry => {
        const entryDate = new Date(entry.date);
        
        // Regn ud om posten er fra denne måned
        if(entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) {
            currentMonthKm += entry.diff;
        }

        // Formater datoen pænt (fx "4. maj 2026")
        const dateString = entryDate.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });

        const li = document.createElement('li');
        li.className = 'history-item';
        
        // Hvis diff er 0 (fx første post), viser vi bare "Start" i stedet for en badge
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
}

// --- Indtast kilometer ---
function promptForKilometers() {
    // Find det højeste tal indtastet hidtil
    const currentSavedKm = kmHistory.length > 0 ? Math.max(...kmHistory.map(h => h.km)) : 77000;
    
    const input = prompt("Hvad står kilometer tælleren i Renault appen på nu?", currentSavedKm);
    if (input !== null && input !== "") {
        const newKm = parseInt(input.replace(/\./g, '')); 
        
        if (!isNaN(newKm) && newKm >= currentSavedKm) {
            const diff = newKm - currentSavedKm;
            
            // Gem den nye post i historikken
            kmHistory.push({
                date: new Date().toISOString(),
                km: newKm,
                diff: diff
            });
            
            localStorage.setItem('km_history', JSON.stringify(kmHistory));
            localStorage.setItem('megane_km', newKm);
            
            updateDashboard(newKm);
            renderHistory();
        } else {
            alert("Fejl: Tallet er ugyldigt eller lavere end tidligere indtastninger.");
        }
    }
}

// Lyt efter klik på log-knapperne (både på forsiden og historik-siden)
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

    const currentSavedKm = kmHistory.length > 0 ? Math.max(...kmHistory.map(h => h.km)) : 77000;
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

// --- Stelnummer (Klik for at forstørre) ---
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