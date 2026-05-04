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

// --- Initialisering (Når appen starter) ---
function initApp() {
    // 1. Hent gemte kilometer fra localStorage (hvis de findes), ellers brug de 77.000 som standard
    let savedKm = localStorage.getItem('megane_km');
    if (!savedKm) {
        savedKm = 77000; 
    } else {
        savedKm = parseInt(savedKm);
    }

    // 2. Opdater skærmen med de hentede tal
    updateDashboard(savedKm);

    // 3. Tjek for MacroDroid URL parameter (deep linking)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('handling') === 'log-kilometer') {
        // Ryd URL'en så popup'en ikke bliver ved med at komme, hvis du manuelt genindlæser
        window.history.replaceState({}, document.title, window.location.pathname);
        // Åbn indtastningsboksen automatisk
        promptForKilometers(savedKm);
    }
}

// --- Logik til udregning og opdatering af skærm ---
function updateDashboard(currentKm) {
    // Vis tallet pænt med punktum (f.eks. 77.000)
    displayKm.innerText = currentKm.toLocaleString('da-DK');

    // --- Udregn If Forsikring (Forbrugt ud af 25.000) ---
    const kmDrivenSinceStart = currentKm - START_KM;
    let insuranceLeft = MAX_INSURANCE_KM - kmDrivenSinceStart;
    if (insuranceLeft < 0) insuranceLeft = 0; // Undgå negative tal
    const insurancePercent = (kmDrivenSinceStart / MAX_INSURANCE_KM) * 100;

    // Opdater If-baren på skærmen
    insuranceBar.style.width = Math.min(insurancePercent, 100) + '%';
    insuranceText.innerText = insuranceLeft.toLocaleString('da-DK') + ' km tilbage til 1. august';
    
    // Farv den rød hvis du er tæt på at overskride aftalen med If (under 2000 km tilbage)
    if (insuranceLeft < 2000) {
        insuranceStatus.innerText = 'ADVARSEL';
        insuranceStatus.style.color = 'var(--danger-red)';
        insuranceBar.style.backgroundColor = 'var(--danger-red)';
    } else {
        insuranceStatus.innerText = 'OK';
        insuranceStatus.style.color = 'var(--success-green)';
        insuranceBar.style.backgroundColor = 'var(--primary-blue)';
    }

    // --- Udregn GoSafe Garanti (Forbrugt ud af 150.000 totalt) ---
    let warrantyLeft = MAX_WARRANTY_TOTAL_KM - currentKm;
    if (warrantyLeft < 0) warrantyLeft = 0;
    const warrantyPercent = (currentKm / MAX_WARRANTY_TOTAL_KM) * 100;

    // Opdater Garanti-baren på skærmen
    warrantyBar.style.width = Math.min(warrantyPercent, 100) + '%';
    warrantyText.innerText = warrantyLeft.toLocaleString('da-DK') + ' km tilbage';
}

// --- Indtastning af nye kilometer ---
function promptForKilometers(currentSavedKm) {
    // Bruger en simpel standard browser-popup
    const input = prompt("Hvad står kilometer tælleren i Renault appen på nu?", currentSavedKm);
    
    if (input !== null && input !== "") {
        // Fjerner evt. punktummer hvis du taster "78.000" i stedet for "78000"
        const newKm = parseInt(input.replace(/\./g, '')); 
        
        if (!isNaN(newKm) && newKm >= currentSavedKm) {
            // Gemmer det nye tal i telefonens hukommelse (localStorage)
            localStorage.setItem('megane_km', newKm);
            // Genudregner og opdaterer skærmen
            updateDashboard(newKm);
        } else if (newKm < currentSavedKm) {
            alert("Fejl: Det nye tal kan ikke være lavere end det du allerede har tastet ind.");
        } else {
            alert("Fejl: Indtast venligst et rigtigt tal.");
        }
    }
}

// --- Knap-tryk og Navigation ---
btnLogKm.addEventListener('click', () => {
    const currentSavedKm = parseInt(localStorage.getItem('megane_km')) || 77000;
    promptForKilometers(currentSavedKm);
});

// Styrer menuen i bunden
function switchSection(activeNavBtn, sectionToShow) {
    // Nulstil alt
    navHome.classList.remove('active');
    navDates.classList.remove('active');
    navEmergency.classList.remove('active');
    sectionDashboard.classList.add('hidden');
    sectionDates.classList.add('hidden');
    
    // Gør det valgte aktivt
    activeNavBtn.classList.add('active');
    if (sectionToShow) sectionToShow.classList.remove('hidden');
}

navHome.addEventListener('click', () => switchSection(navHome, sectionDashboard));
navDates.addEventListener('click', () => switchSection(navDates, sectionDates));

navEmergency.addEventListener('click', () => {
    // Indtil videre popper der bare en besked op - vi bygger selve skærmen om lidt!
    alert("Klar til næste skridt! Her kommer ulykkes-guiden og nødopkaldene ind.");
    switchSection(navEmergency, null); 
});

// Sæt appen i gang!
initApp();
