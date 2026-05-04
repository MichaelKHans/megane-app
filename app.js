// --- Globale variable der hentes fra telefonens hukommelse ---
let START_KM = parseInt(localStorage.getItem('start_km')) || 65000;
let MAX_INSURANCE_KM = parseInt(localStorage.getItem('max_ins_km')) || 25000;
let MAX_WARRANTY_TOTAL_KM = parseInt(localStorage.getItem('max_war_km')) || 150000;

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

// Navigation
const navHome = document.getElementById('nav-home');
const navDates = document.getElementById('nav-dates');
const navEmergency = document.getElementById('nav-emergency');
const sectionDashboard = document.getElementById('dashboard');
const sectionDates = document.getElementById('dates-section');
const sectionEmergency = document.getElementById('emergency-section');

// --- Initialisering ---
function initApp() {
    // Indlæs gemte kilometer
    let savedKm = localStorage.getItem('megane_km') ? parseInt(localStorage.getItem('megane_km')) : 77000;
    updateDashboard(savedKm);

    // Indlæs gemte datoer
    loadDates();

    // Tjek for MacroDroid
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('handling') === 'log-kilometer') {
        window.history.replaceState({}, document.title, window.location.pathname);
        promptForKilometers(savedKm);
    }
}

// --- Opdater skærmen ---
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

// --- Rediger indstillinger (Start KM, osv.) ---
btnEditSettings.addEventListener('click', () => {
    let newStart = prompt("Hvilket kilometertal startede forsikringen på?", START_KM);
    if (newStart) { START_KM = parseInt(newStart); localStorage.setItem('start_km', START_KM); }

    let newIns = prompt("Hvor mange km må du køre årligt ifølge If?", MAX_INSURANCE_KM);
    if (newIns) { MAX_INSURANCE_KM = parseInt(newIns); localStorage.setItem('max_ins_km', MAX_INSURANCE_KM); }

    let newWar = prompt("Hvad er bilens totale kilometergrænse for garantien?", MAX_WARRANTY_TOTAL_KM);
    if (newWar) { MAX_WARRANTY_TOTAL_KM = parseInt(newWar); localStorage.setItem('max_war_km', MAX_WARRANTY_TOTAL_KM); }

    let currentSavedKm = parseInt(localStorage.getItem('megane_km')) || 77000;
    updateDashboard(currentSavedKm);
});

// --- Indtast kilometer ---
function promptForKilometers(currentSavedKm) {
    const input = prompt("Hvad står kilometer tælleren i Renault appen på nu?", currentSavedKm);
    if (input !== null && input !== "") {
        const newKm = parseInt(input.replace(/\./g, '')); 
        if (!isNaN(newKm) && newKm >= currentSavedKm) {
            localStorage.setItem('megane_km', newKm);
            updateDashboard(newKm);
        } else {
            alert("Fejl: Tallet er ugyldigt eller lavere end tidligere.");
        }
    }
}

btnLogKm.addEventListener('click', () => {
    const currentSavedKm = parseInt(localStorage.getItem('megane_km')) || 77000;
    promptForKilometers(currentSavedKm);
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

// --- Menu Styring ---
function switchSection(activeNavBtn, sectionToShow) {
    navHome.classList.remove('active');
    navDates.classList.remove('active');
    navEmergency.classList.remove('active');
    sectionDashboard.classList.add('hidden');
    sectionDates.classList.add('hidden');
    sectionEmergency.classList.add('hidden');
    
    activeNavBtn.classList.add('active');
    sectionToShow.classList.remove('hidden');
}

navHome.addEventListener('click', () => switchSection(navHome, sectionDashboard));
navDates.addEventListener('click', () => switchSection(navDates, sectionDates));
navEmergency.addEventListener('click', () => switchSection(navEmergency, sectionEmergency));

// Start
initApp();