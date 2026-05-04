// --- Konfiguration og Faste Data ---
const START_KM = 65000; // Kilometerstand da forsikring/garanti startede (29.08.2025)
const MAX_INSURANCE_KM = 25000; // Årlig grænse for If Forsikring
const MAX_WARRANTY_TOTAL_KM = 150000; // Maksimal kilometerstand for GoSafe Garanti

// --- Elementer fra siden ---
const displayKm = document.getElementById('current-km-display');
const btnLogKm = document.getElementById('btn-open-log');

// If Forsikring elementer
const insuranceBar = document.getElementById('insurance-bar');
const insuranceText = document.getElementById('insurance-text');
const insuranceStatus = document.getElementById('insurance-status');

// Garanti elementer
const warrantyBar = document.getElementById('warranty-bar');
const warrantyText = document.getElementById('warranty-text');
const warrantyStatus = document.getElementById('warranty-status');

// Navigation og sektioner
const navHome = document.getElementById('nav-home');
const navDates = document.getElementById('nav-dates');
const navEmergency = document.getElementById('nav-emergency');

const sectionDashboard = document.getElementById('dashboard');
const sectionDates = document.getElementById('dates-section');
const sectionEmergency = document.getElementById('emergency-section');

// --- Initialisering (Når appen starter) ---
function initApp() {
    // Hent gemte kilometer fra localStorage
    let savedKm = localStorage.getItem('megane_km');
    if (!savedKm) {
        savedKm = 77000; 
    } else {
        savedKm = parseInt(savedKm);
    }

    // Opdater skærmen
    updateDashboard(savedKm);

    // Tjek for MacroDroid URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('handling') === 'log-kilometer') {
        window.history.replaceState({}, document.title, window.location.pathname);
        promptForKilometers(savedKm);
    }
}

// --- Logik til udregning og opdatering af skærm ---
function updateDashboard(currentKm) {
    displayKm.innerText = currentKm.toLocaleString('da-DK');

    // --- Udregn If Forsikring ---
    const kmDrivenSinceStart = currentKm - START_KM;
    let insuranceLeft = MAX_INSURANCE_KM - kmDrivenSinceStart;
    if (insuranceLeft < 0) insuranceLeft = 0; 
    const insurancePercent = (kmDrivenSinceStart / MAX_INSURANCE_KM) * 100;

    insuranceBar.style.width = Math.min(insurancePercent, 100) + '%';
    insuranceText.innerText = insuranceLeft.toLocaleString('da-DK') + ' km tilbage til 1. august';
    
    if (insuranceLeft < 2000) {
        insuranceStatus.innerText = 'ADVARSEL';
        insuranceStatus.style.color = 'var(--danger-red)';
        insuranceBar.style.backgroundColor = 'var(--danger-red)';
    } else {
        insuranceStatus.innerText = 'OK';
        insuranceStatus.style.color = 'var(--success-green)';
        insuranceBar.style.backgroundColor = 'var(--primary-blue)';
    }

    // --- Udregn GoSafe Garanti ---
    let warrantyLeft = MAX_WARRANTY_TOTAL_KM - currentKm;
    if (warrantyLeft < 0) warrantyLeft = 0;
    const warrantyPercent = (currentKm / MAX_WARRANTY_TOTAL_KM) * 100;

    warrantyBar.style.width = Math.min(warrantyPercent, 100) + '%';
    warrantyText.innerText = warrantyLeft.toLocaleString('da-DK') + ' km tilbage';
}

// --- Indtastning af nye kilometer ---
function promptForKilometers(currentSavedKm) {
    const input = prompt("Hvad står kilometer tælleren i Renault appen på nu?", currentSavedKm);
    
    if (input !== null && input !== "") {
        const newKm = parseInt(input.replace(/\./g, '')); 
        
        if (!isNaN(newKm) && newKm >= currentSavedKm) {
            localStorage.setItem('megane_km', newKm);
            updateDashboard(newKm);
        } else if (newKm < currentSavedKm) {
            alert("Fejl: Det nye tal kan ikke være lavere end det du allerede har tastet ind.");
        } else {
            alert("Fejl: Indtast venligst et rigtigt tal.");
        }
    }
}

btnLogKm.addEventListener('click', () => {
    const currentSavedKm = parseInt(localStorage.getItem('megane_km')) || 77000;
    promptForKilometers(currentSavedKm);
});

// --- Styrer menuen i bunden ---
function switchSection(activeNavBtn, sectionToShow) {
    // 1. Skjul alle sektioner og fjern 'active' fra alle knapper
    navHome.classList.remove('active');
    navDates.classList.remove('active');
    navEmergency.classList.remove('active');
    
    sectionDashboard.classList.add('hidden');
    sectionDates.classList.add('hidden');
    sectionEmergency.classList.add('hidden');
    
    // 2. Tænd for den sektion du lige har trykket på
    activeNavBtn.classList.add('active');
    sectionToShow.classList.remove('hidden');
}

// Lyt efter tryk på knapperne i bunden
navHome.addEventListener('click', () => switchSection(navHome, sectionDashboard));
navDates.addEventListener('click', () => switchSection(navDates, sectionDates));
navEmergency.addEventListener('click', () => switchSection(navEmergency, sectionEmergency));

// Sæt appen i gang!
initApp();