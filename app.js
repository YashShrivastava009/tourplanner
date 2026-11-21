 // =========================================================================
// 1. GLOBAL APPLICATION STATE
// =========================================================================
let activeAccessCode = "";

let fxRatesUsd = { ...DEFAULT_FX_RATES_USD };
let fxUpdatedLabel = "Baseline Rates";
let fxFrom = "INR", fxTo = "JPY", fxAmount = 50000;
let fxMarkupPercent = 0, fxBillSplit = 1, fxTipEnabled = false, swapSpinDeg = 0;

const portalWeatherMap = {};
const dossierCache = {};

let activePlacesList = [], selectedPlacesSet = new Set(), searchTimeout = null;
let isBattleMode = false, battleCountryA = "Japan", battleCountryB = "Switzerland", battleNextSlot = "A";

let savedPlans = [], activePlanId = null;
let currentTripData = null, currentTripMeta = null, isViewingBlueprint = false, activeBlueprintId = null;
let activeDayView = 0, activeCategoryFilter = 'ALL';
let checkedStops = new Set(), favoriteStops = new Set(), stopNotes = {};

let worldGlobe = null, globeInitialized = false, hoveredCountryFeature = null;
let lastSpokenCardText = "", lastSpokenCardLang = "en-US", lastHostQuestionsText = "";

let swapTarget = null; // { dayIdx, itemIdx }
let lastBudgetTotalBase = 50000;

// =========================================================================
// 2. INITIALIZATION & STEALTH ACCESS LOCK SCREEN
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const monthTag = document.getElementById('live-month-tag');
    if (monthTag) monthTag.innerText = `Live • ${monthLabel}`;

    initBattleSelectors();
    initCurrencyDropdowns();
    initItineraryBudgetCurrencyDropdown();
    initShieldSelectors();
    renderPreplannedBlueprints();
    renderTopTicker();
    fetchLiveExchangeRates();
    renderLivePortals();
    fetchAllPortalWeather();
    setInterval(updatePortalClocks, 30000);

    loadSavedPlansFromStorage();
    updateHomeActivePlanBanner();
    updateCurrencyPlayground();

    checkStoredStealthAccess();
});

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-site-password': activeAccessCode || ''
    };
}

async function checkStoredStealthAccess() {
    const saved = localStorage.getItem('travel_os_access_code');
    if (!saved) {
        const input = document.getElementById('stealth-password-input');
        if (input) input.focus();
        return;
    }

    try {
        const res = await fetch('/api/verify-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: saved })
        });
        if (res.ok) {
            activeAccessCode = saved;
            document.getElementById('stealth-lock-screen').classList.add('hidden');
            return;
        }
    } catch (e) {}

    localStorage.removeItem('travel_os_access_code');
    const input = document.getElementById('stealth-password-input');
    if (input) input.focus();
}

async function submitStealthAccess() {
    const input = document.getElementById('stealth-password-input');
    const errEl = document.getElementById('stealth-error-msg');
    const btn = document.getElementById('stealth-unlock-btn');
    const code = (input?.value || '').trim();

    if (!code) {
        errEl.innerText = "Please enter your access code.";
        errEl.classList.remove('hidden');
        return;
    }

    errEl.classList.add('hidden');
    const orig = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Verifying Access...";

    try {
        const res = await fetch('/api/verify-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: code })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
            throw new Error(data.error || "Incorrect access code.");
        }
        activeAccessCode = code;
        localStorage.setItem('travel_os_access_code', code);
        document.getElementById('stealth-lock-screen').classList.add('hidden');
        input.value = '';
    } catch (err) {
        errEl.innerText = err.message || "Incorrect access code.";
        errEl.classList.remove('hidden');
        input.focus();
        input.select();
    } finally {
        btn.disabled = false;
        btn.innerText = orig;
    }
}

function lockStealthScreen(reasonMsg = '') {
    activeAccessCode = "";
    localStorage.removeItem('travel_os_access_code');
    const lockEl = document.getElementById('stealth-lock-screen');
    const errEl = document.getElementById('stealth-error-msg');
    lockEl.classList.remove('hidden');
    if (reasonMsg) {
        errEl.innerText = reasonMsg;
        errEl.classList.remove('hidden');
    } else {
        errEl.classList.add('hidden');
    }
    const input = document.getElementById('stealth-password-input');
    if (input) {
        input.value = '';
        input.focus();
    }
}

async function authorizedPost(url, payload) {
    const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    if (res.status === 401) {
        lockStealthScreen("Access code invalid or updated. Please re-enter to continue.");
        throw new Error("Unauthorized: Please unlock with the valid access code.");
    }
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.details || data.error || `Server error (${res.status})`);
    }
    return data;
}

// =========================================================================
// 3. INSTANT PRE-PLANNED BLUEPRINTS & REMIX ENGINE
// =========================================================================
function renderPreplannedBlueprints() {
    const grid = document.getElementById('preplanned-blueprints-grid');
    if (!grid || typeof PREPLANNED_TRIPS === 'undefined') return;

    grid.innerHTML = PREPLANNED_TRIPS.map(bp => {
        const totalStops = bp.data.days.reduce((sum, d) => sum + (d.schedule?.length || 0), 0);
        return `
            <div onclick="openPreplannedBlueprint('${bp.id}')" class="blueprint-card bg-[#0e1320] hover:bg-[#141b2d] border border-white/10 hover:border-indigo-400/60 rounded-3xl overflow-hidden cursor-pointer shadow-xl flex flex-col justify-between group">
                <div>
                    <div class="relative h-40 overflow-hidden">
                        <img src="${bp.image}" alt="${escapeHtml(bp.country)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        <div class="absolute inset-0 bg-gradient-to-t from-[#0e1320] via-black/30 to-transparent"></div>
                        <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-indigo-600/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg">${escapeHtml(bp.badge)}</span>
                        <span class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white/90">${totalStops} stops</span>
                    </div>
                    <div class="p-4">
                        <h3 class="text-base font-bold text-white leading-snug group-hover:text-blue-200 transition-colors">${escapeHtml(bp.cardTitle)}</h3>
                        <p class="text-xs text-white/55 mt-1.5 leading-relaxed">${escapeHtml(bp.cardSubtitle)}</p>
                        <div class="flex flex-wrap gap-1.5 mt-3">
                            ${bp.cardTags.map(t => `<span class="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/75">${escapeHtml(t)}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="px-4 pb-4 pt-1 flex items-center justify-between text-xs font-bold text-indigo-300 group-hover:text-white transition-colors">
                    <span>Explore Instant Plan</span>
                    <span>→</span>
                </div>
            </div>`;
    }).join('');
}

function openPreplannedBlueprint(blueprintId) {
    const bp = PREPLANNED_TRIPS.find(t => t.id === blueprintId);
    if (!bp) return;

    isViewingBlueprint = true;
    activeBlueprintId = bp.id;
    activePlanId = null;
    // Deep copy so user can swap stops, check items, or add notes cleanly
    currentTripData = JSON.parse(JSON.stringify(bp.data));
    currentTripMeta = {
        homeCity: "Your City",
        departureCity: "Major Hub",
        destinationCountry: bp.country,
        days: String(bp.durationDays),
        places: [...bp.places],
        hotelBudget: bp.hotelBudget,
        dailySpendingBudget: bp.dailySpendingBudget,
        budgetEstimateUsd: bp.budgetEstimateUsd
    };
    checkedStops = new Set();
    favoriteStops = new Set();
    stopNotes = {};

    ['home-page', 'globe-page', 'currency-page', 'shield-page', 'main-dock'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('globe-country-tooltip').classList.add('hidden');
    document.getElementById('itinerary-page').classList.remove('hidden');
    document.body.style.overflow = '';
    activeDayView = 0;
    activeCategoryFilter = 'ALL';
    renderDedicatedItineraryPage();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function remixCurrentBlueprint() {
    if (!currentTripMeta) return;
    const country = currentTripMeta.destinationCountry;
    const places = currentTripMeta.places || COUNTRY_PLACES_DB[country]?.slice(0, 3) || [];
    const daysVal = currentTripMeta.days || "7";
    const hotelVal = currentTripMeta.hotelBudget;
    const spendVal = currentTripMeta.dailySpendingBudget;

    goBackHome();
    setTimeout(() => {
        openWizard();
        selectCountry(country, places);
        document.getElementById('days').value = daysVal;
        if (hotelVal) document.getElementById('hotelBudget').value = hotelVal;
        if (spendVal) document.getElementById('dailySpendingBudget').value = spendVal;
        document.getElementById('homeCity').focus();
    }, 180);
}

// =========================================================================
// 4. SINGLE-STOP LIVE SWAP ENGINE
// =========================================================================
function openSwapModal(dayIdx, itemIdx) {
    const day = currentTripData?.days?.[dayIdx];
    const item = day?.schedule?.[itemIdx];
    if (!item) return;

    swapTarget = { dayIdx, itemIdx };
    document.getElementById('swap-current-title').innerText = item.title || 'Current Stop';
    document.getElementById('swap-current-meta').innerText = `Day ${day.dayNumber || dayIdx + 1} • ${item.time || ''} • ${item.location || ''}`;
    document.getElementById('swap-custom-input').value = '';
    document.getElementById('swap-error-msg').classList.add('hidden');
    document.getElementById('swap-stop-modal').classList.remove('hidden');
    document.getElementById('swap-custom-input').focus();
}

function closeSwapModal() {
    document.getElementById('swap-stop-modal').classList.add('hidden');
    swapTarget = null;
}

function selectSwapChip(text) {
    document.getElementById('swap-custom-input').value = text;
    document.getElementById('swap-custom-input').focus();
}

async function confirmSwapStop() {
    if (!swapTarget) return;
    const { dayIdx, itemIdx } = swapTarget;
    const day = currentTripData?.days?.[dayIdx];
    const currentStop = day?.schedule?.[itemIdx];
    if (!currentStop) return;

    const preference = document.getElementById('swap-custom-input').value.trim() || "Give me a better hidden-gem alternative nearby";
    const btn = document.getElementById('swap-submit-btn');
    const errEl = document.getElementById('swap-error-msg');
    errEl.classList.add('hidden');

    const orig = btn.innerText;
    btn.disabled = true;
    btn.innerText = "🔄 Finding Swap...";

    const existingTitles = [];
    (currentTripData.days || []).forEach(d => (d.schedule || []).forEach(s => { if (s.title) existingTitles.push(s.title); }));

    try {
        const data = await authorizedPost('/api/swap-stop', {
            destinationCountry: currentTripMeta?.destinationCountry || 'Destination',
            dayTitle: day.dayTitle || '',
            currentStop,
            preference,
            existingTitles
        });

        if (!data || !data.stop) throw new Error("Could not parse swapped stop.");
        currentTripData.days[dayIdx].schedule[itemIdx] = data.stop;

        if (!isViewingBlueprint && activePlanId) {
            const idx = savedPlans.findIndex(p => p.id === activePlanId);
            if (idx !== -1) {
                savedPlans[idx].data = currentTripData;
                persistPlansToStorage();
            }
        }

        closeSwapModal();
        renderDedicatedItineraryPage();
    } catch (err) {
        errEl.innerText = err.message || "Failed to swap stop.";
        errEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.innerText = orig;
    }
}

// =========================================================================
// 5. LIVE TRIP BUDGET METER (LINKED TO LIVE FX VAULT)
// =========================================================================
function initItineraryBudgetCurrencyDropdown() {
    const sel = document.getElementById('itinerary-budget-currency');
    if (!sel) return;
    sel.innerHTML = Object.values(CURRENCIES).map(c =>
        `<option value="${c.code}" class="bg-[#0e1422] text-white">${c.flag} ${c.code}</option>`
    ).join('');
    sel.value = "INR";
}

function getEstimatedTripUsdBreakdown() {
    const daysCount = Math.max((currentTripData?.days || []).length || parseInt(currentTripMeta?.days, 10) || 5, 1);
    const nights = Math.max(daysCount - 1, 1);

    if (currentTripMeta?.budgetEstimateUsd) {
        const b = currentTripMeta.budgetEstimateUsd;
        return {
            nights,
            stayUsd: b.hotelPerNight * nights,
            foodUsd: b.dailyFoodAndSights * daysCount,
            transitUsd: b.localTransitPerDay * daysCount
        };
    }

    const destCode = COUNTRY_TO_CURRENCY[currentTripMeta?.destinationCountry] || 'USD';
    const ref = CURRENCIES[destCode] || CURRENCIES.USD;

    const hText = (currentTripMeta?.hotelBudget || '').toLowerCase();
    const hotelMult = hText.includes('luxury') || hText.includes('5-star') ? 2.2 : hText.includes('budget') || hText.includes('hostel') ? 0.45 : 1.0;

    const sText = (currentTripMeta?.dailySpendingBudget || '').toLowerCase();
    const spendMult = sText.includes('high') || sText.includes('splurge') ? 2.0 : sText.includes('low') || sText.includes('economical') ? 0.65 : 1.0;

    const stayUsd = ref.hotelUsd * hotelMult * nights;
    const foodUsd = (ref.mealUsd * 2.5 + ref.coffeeUsd * 1.5 + 14) * spendMult * daysCount;
    const transitUsd = (ref.transitUsd * 4 + 6) * daysCount;

    return { nights, stayUsd, foodUsd, transitUsd };
}

function renderItineraryBudgetMeter() {
    const sel = document.getElementById('itinerary-budget-currency');
    const code = sel ? sel.value : 'INR';
    const meta = CURRENCIES[code] || CURRENCIES.INR;
    const rate = fxRatesUsd[code] || 1;
    const { nights, stayUsd, foodUsd, transitUsd } = getEstimatedTripUsdBreakdown();

    const stayVal = stayUsd * rate;
    const foodVal = foodUsd * rate;
    const transitVal = transitUsd * rate;
    const totalVal = stayVal + foodVal + transitVal;
    lastBudgetTotalBase = Math.round(totalVal);

    document.getElementById('budget-nights-label').innerText = `${nights}n`;
    document.getElementById('budget-meter-stay').innerText = `${meta.symbol}${formatMoney(stayVal, code)}`;
    document.getElementById('budget-meter-food').innerText = `${meta.symbol}${formatMoney(foodVal, code)}`;
    document.getElementById('budget-meter-transit').innerText = `${meta.symbol}${formatMoney(transitVal, code)}`;
    document.getElementById('budget-meter-total').innerText = `${meta.symbol}${formatMoney(totalVal, code)}`;
}

function openTripBudgetInVault() {
    const baseCode = document.getElementById('itinerary-budget-currency')?.value || 'INR';
    const destCode = COUNTRY_TO_CURRENCY[currentTripMeta?.destinationCountry] || (baseCode === 'USD' ? 'JPY' : 'USD');
    fxFrom = baseCode;
    fxTo = destCode === baseCode ? (baseCode === 'USD' ? 'JPY' : 'USD') : destCode;
    fxAmount = lastBudgetTotalBase || 50000;

    document.getElementById('fx-from-select').value = fxFrom;
    document.getElementById('fx-to-select').value = fxTo;
    document.getElementById('fx-amount-input').value = fxAmount;
    openCurrencyView();
}

// =========================================================================
// 6. 3D INTERACTIVE EARTH + COUNTRY COMMAND LAUNCHER
// =========================================================================
function setActiveDockButton(activeTab) {
    const activeStyle = "w-11 h-11 rounded-full bg-gradient-to-b from-white/20 to-white/5 border border-white/25 flex items-center justify-center text-white shadow-inner transition-all";
    const inactiveStyle = "w-11 h-11 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-all";
    const fxInactive = "w-11 h-11 rounded-full flex items-center justify-center text-emerald-300/85 hover:text-emerald-200 hover:bg-emerald-500/15 transition-all";
    const shieldInactive = "w-11 h-11 rounded-full flex items-center justify-center text-rose-300/85 hover:text-rose-200 hover:bg-rose-500/15 transition-all";

    document.getElementById('dock-btn-home').className = activeTab === 'home' ? activeStyle : inactiveStyle;
    document.getElementById('dock-btn-globe').className = activeTab === 'globe' ? activeStyle : inactiveStyle;
    document.getElementById('dock-btn-currency').className = activeTab === 'currency' ? activeStyle + " text-emerald-300 border-emerald-400/50" : fxInactive;
    document.getElementById('dock-btn-shield').className = activeTab === 'shield' ? activeStyle + " text-rose-300 border-rose-400/50" : shieldInactive;
}

function navigateDock(tab) {
    if (tab === 'home') goBackHome();
    else if (tab === 'globe') openGlobeView();
    else if (tab === 'currency') openCurrencyView();
    else if (tab === 'shield') openShieldView('hotel');
}

function openGlobeView() {
    ['itinerary-page', 'home-page', 'currency-page', 'shield-page'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('globe-page').classList.remove('hidden');
    document.getElementById('main-dock').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setActiveDockButton('globe');

    if (!globeInitialized) initInteractive3DGlobe();
    else if (worldGlobe) worldGlobe.width(window.innerWidth).height(window.innerHeight);
}

function closeGlobeView() {
    const globePage = document.getElementById('globe-page');
    if (!globePage.classList.contains('hidden')) {
        globePage.classList.add('hidden');
        document.getElementById('globe-country-tooltip').classList.add('hidden');
        closeGlobeLauncher();
        document.getElementById('home-page').classList.remove('hidden');
        document.body.style.overflow = '';
        setActiveDockButton('home');
    }
}

function openGlobeLauncher(rawName) {
    const country = normalizeCountryName(rawName);
    if (!country) return;

    const launcher = document.getElementById('globe-command-launcher');
    const currCode = COUNTRY_TO_CURRENCY[country] || 'USD';
    const matchingBp = PREPLANNED_TRIPS.find(b => b.country.toLowerCase() === country.toLowerCase());

    document.getElementById('globe-cmd-country').innerText = country;
    document.getElementById('globe-cmd-meta').innerText = matchingBp ? `${currCode} • Blueprint Ready` : currCode;

    document.getElementById('globe-btn-plan').onclick = () => {
        closeGlobeView();
        quickSelectCountry(country);
    };

    const bpBtn = document.getElementById('globe-btn-blueprint');
    if (matchingBp) {
        bpBtn.classList.remove('hidden');
        bpBtn.onclick = () => {
            closeGlobeLauncher();
            openPreplannedBlueprint(matchingBp.id);
        };
    } else {
        bpBtn.classList.add('hidden');
    }

    document.getElementById('globe-btn-shield').onclick = () => {
        closeGlobeView();
        openShieldView('scam');
        const sel = document.getElementById('safety-country-select');
        if (sel) {
            if (!Array.from(sel.options).some(o => o.value === country)) {
                const opt = document.createElement('option');
                opt.value = country;
                opt.textContent = country;
                opt.className = "bg-[#0e1422] text-white";
                sel.appendChild(opt);
            }
            sel.value = country;
        }
        runSafetyVault();
    };

    document.getElementById('globe-btn-currency').onclick = () => {
        closeGlobeView();
        openCurrencyPair('INR', currCode);
    };

    launcher.classList.remove('hidden');
}

function closeGlobeLauncher() {
    document.getElementById('globe-command-launcher').classList.add('hidden');
}

async function initInteractive3DGlobe() {
    globeInitialized = true;
    const container = document.getElementById('globe-canvas-container');
    const tooltip = document.getElementById('globe-country-tooltip');
    const loader = document.getElementById('globe-loader');

    container.addEventListener('mousemove', (e) => {
        if (hoveredCountryFeature) {
            tooltip.style.left = `${e.clientX}px`;
            tooltip.style.top = `${e.clientY}px`;
        }
    });
    container.addEventListener('mouseleave', () => {
        hoveredCountryFeature = null;
        tooltip.classList.add('hidden');
    });

    try {
        let worldTopo = null;
        try {
            worldTopo = await (await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')).json();
        } catch (err) {
            worldTopo = await (await fetch('https://unpkg.com/world-atlas@2/countries-110m.json')).json();
        }
        const countries = topojson.feature(worldTopo, worldTopo.objects.countries).features;

        worldGlobe = Globe()(container)
            .width(window.innerWidth).height(window.innerHeight)
            .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
            .backgroundImageUrl('https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png')
            .showAtmosphere(true).atmosphereColor('#60a5fa').atmosphereAltitude(0.18)
            .polygonsData(countries)
            .polygonAltitude(d => d === hoveredCountryFeature ? 0.025 : 0.006)
            .polygonCapColor(d => d === hoveredCountryFeature ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255, 255, 255, 0.02)')
            .polygonSideColor(() => 'rgba(96, 165, 250, 0.25)')
            .polygonStrokeColor(d => d === hoveredCountryFeature ? '#93c5fd' : 'rgba(255, 255, 255, 0.22)')
            .polygonsTransitionDuration(150)
            .onPolygonHover((hoverD) => {
                hoveredCountryFeature = hoverD || null;
                worldGlobe
                    .polygonAltitude(d => d === hoveredCountryFeature ? 0.025 : 0.006)
                    .polygonCapColor(d => d === hoveredCountryFeature ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255, 255, 255, 0.02)')
                    .polygonStrokeColor(d => d === hoveredCountryFeature ? '#93c5fd' : 'rgba(255, 255, 255, 0.22)');

                const controls = worldGlobe.controls();
                if (hoverD && hoverD.properties) {
                    const name = hoverD.properties.name || hoverD.properties.ADMIN || '';
                    if (name) {
                        tooltip.innerText = name;
                        tooltip.classList.remove('hidden');
                        container.style.cursor = 'pointer';
                        if (controls) controls.autoRotate = false;
                    }
                } else {
                    tooltip.classList.add('hidden');
                    container.style.cursor = 'grab';
                    if (controls) controls.autoRotate = true;
                }
            })
            .onPolygonClick((clickD) => {
                if (clickD && clickD.properties) {
                    const name = clickD.properties.name || clickD.properties.ADMIN || '';
                    if (name) openGlobeLauncher(name);
                }
            });

        worldGlobe.pointOfView({ lat: 22, lng: 78, altitude: 2.2 });
        const controls = worldGlobe.controls();
        controls.autoRotate = true; controls.autoRotateSpeed = 0.45;
        controls.enableDamping = true; controls.dampingFactor = 0.08;
        controls.minDistance = 140; controls.maxDistance = 520;
        loader.classList.add('hidden');

        window.addEventListener('resize', () => {
            if (worldGlobe && !document.getElementById('globe-page').classList.contains('hidden')) {
                worldGlobe.width(window.innerWidth).height(window.innerHeight);
            }
        });
    } catch (error) {
        loader.innerHTML = `<p class="text-sm text-red-300">Failed to load 3D Earth textures. Please refresh and try again.</p>`;
    }
}

// =========================================================================
// 7. TRAVEL SHIELD (HOTEL BS DETECTOR + SCAM, LAW & CRISIS VAULT)
// =========================================================================
function initShieldSelectors() {
    const sel = document.getElementById('safety-country-select');
    if (!sel) return;
    sel.innerHTML = ALL_COUNTRIES.map(c =>
        `<option value="${escapeHtml(c)}" class="bg-[#0e1422] text-white">${escapeHtml(c)}</option>`
    ).join('');
    sel.value = "Japan";
}

function openShieldView(defaultTab = 'hotel') {
    ['home-page', 'globe-page', 'currency-page', 'itinerary-page'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('shield-page').classList.remove('hidden');
    document.getElementById('main-dock').classList.remove('hidden');
    document.body.style.overflow = '';
    setActiveDockButton('shield');
    switchShieldTab(defaultTab);

    if (currentTripMeta?.destinationCountry && ALL_COUNTRIES.includes(currentTripMeta.destinationCountry)) {
        const safetySel = document.getElementById('safety-country-select');
        if (safetySel) safetySel.value = currentTripMeta.destinationCountry;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function closeShieldView() {
    const page = document.getElementById('shield-page');
    if (!page.classList.contains('hidden')) {
        page.classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
        setActiveDockButton('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function switchShieldTab(tab) {
    const hotelPanel = document.getElementById('shield-panel-hotel');
    const scamPanel = document.getElementById('shield-panel-scam');
    const hotelBtn = document.getElementById('shield-tab-hotel');
    const scamBtn = document.getElementById('shield-tab-scam');

    if (tab === 'hotel') {
        hotelPanel.classList.remove('hidden'); scamPanel.classList.add('hidden');
        hotelBtn.className = "px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg";
        scamBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold transition-all text-white/60 hover:text-white";
    } else {
        scamPanel.classList.remove('hidden'); hotelPanel.classList.add('hidden');
        scamBtn.className = "px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg";
        hotelBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold transition-all text-white/60 hover:text-white";
    }
}

function loadSampleHotelListing() {
    document.getElementById('hotel-city-input').value = "Paris, France";
    document.getElementById('hotel-price-input').value = "€185 / night";
    document.getElementById('hotel-listing-text').value =
        "Charming, cozy Parisian artist loft on the top floor of an authentic 19th-century walk-up building in a vibrant nightlife district just minutes by metro to central sights! Features compact European-style bathroom, natural breeze ventilation (no AC needed in historic building), and self-check-in after 4 PM. Note: €65 mandatory cleaning fee, €15/person linen fee, and €30 late check-in charge after 9 PM paid in cash on arrival. Recent review: 'Host was friendly but the stairs with luggage nearly killed us, bar downstairs plays bass until 3 AM, and the shower barely fits one person.'";
}

async function runHotelAudit() {
    const city = document.getElementById('hotel-city-input').value.trim();
    const price = document.getElementById('hotel-price-input').value.trim();
    const listingText = document.getElementById('hotel-listing-text').value.trim();
    const resultEl = document.getElementById('hotel-audit-result');
    const btn = document.getElementById('hotel-audit-btn');

    if (!listingText || listingText.length < 15) {
        alert("Paste a hotel/Airbnb description or click 'Load Sample Shady Listing' to test!");
        return;
    }

    const orig = btn.innerText; btn.disabled = true; btn.innerText = "🔍 Inspecting Listing...";
    resultEl.innerHTML = `<div class="bg-[#0d111b] border border-rose-500/30 rounded-3xl p-10 text-center space-y-3 panel-animate"><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rose-400 mx-auto"></div><p class="text-sm font-bold text-white">Gemini Property Inspector is dissecting marketing fluff & hidden fees...</p></div>`;

    try {
        const data = await authorizedPost('/api/hotel-audit', { city, price, listingText });
        renderHotelAuditResult(data);
    } catch (err) {
        resultEl.innerHTML = `<div class="bg-red-950/70 border border-red-500/50 rounded-3xl p-6 text-center space-y-2 text-sm text-red-200"><div class="text-xs uppercase tracking-widest font-bold text-red-300">Audit Failed</div><div>${escapeHtml(err.message)}</div></div>`;
    } finally {
        btn.disabled = false; btn.innerText = orig;
    }
}

function renderHotelAuditResult(data) {
    const resultEl = document.getElementById('hotel-audit-result');
    const score = Math.min(Math.max(Number(data.truthScore ?? 60), 0), 100);
    const verdict = data.verdict || (score >= 75 ? "SOLID BOOKING" : score >= 50 ? "BOOK WITH CAUTION" : "WALK AWAY");
    const translations = data.bsTranslations || [];
    const hiddenFees = data.hiddenFees || [];
    const redFlags = data.redFlags || [];
    const greenFlags = data.greenFlags || [];
    const questions = data.hostQuestions || [];
    lastHostQuestionsText = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

    let scoreColor = 'text-emerald-400', barColor = 'from-emerald-500 to-teal-400', verdictBadge = 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300';
    if (score < 50) { scoreColor = 'text-rose-400'; barColor = 'from-rose-600 to-red-400'; verdictBadge = 'bg-rose-500/20 border-rose-400/50 text-rose-300'; }
    else if (score < 75) { scoreColor = 'text-amber-300'; barColor = 'from-amber-500 to-orange-400'; verdictBadge = 'bg-amber-500/20 border-amber-400/50 text-amber-300'; }

    resultEl.innerHTML = `
        <div class="panel-animate space-y-6">
            <div class="bg-[#0d111b] border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div class="space-y-2 max-w-2xl">
                    <span class="inline-block px-3.5 py-1 rounded-full border text-xs font-extrabold uppercase tracking-widest ${verdictBadge}">${escapeHtml(verdict)}</span>
                    <h3 class="text-2xl font-extrabold text-white">${escapeHtml(data.headline || "Property Inspection Report")}</h3>
                    <p class="text-sm text-white/80 leading-relaxed">${escapeHtml(data.summary || '')}</p>
                </div>
                <div class="bg-[#070a12] border border-white/10 rounded-2xl p-5 min-w-[190px] text-center flex-shrink-0">
                    <div class="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-1">Real-World Truth Score</div>
                    <div class="text-5xl font-black ${scoreColor}">${score}<span class="text-lg text-white/40">/100</span></div>
                    <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3"><div class="h-full bg-gradient-to-r ${barColor} rounded-full" style="width: ${score}%"></div></div>
                </div>
            </div>
            ${translations.length ? `
                <div class="bg-[#0d111b] border border-rose-500/25 rounded-3xl p-6 space-y-4">
                    <div class="text-xs uppercase tracking-widest text-rose-300 font-bold">🎭 Marketing BS Translator</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        ${translations.map(t => `<div class="bg-[#141926] border border-white/10 rounded-2xl p-4 space-y-2"><div class="text-xs text-white/50 italic">"${escapeHtml(t.phrase || '')}"</div><div class="text-sm font-semibold text-rose-200 flex items-start gap-2"><span class="text-rose-400">→</span><span>${escapeHtml(t.reality || '')}</span></div></div>`).join('')}
                    </div>
                </div>` : ''}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div class="bg-rose-950/25 border border-rose-500/30 rounded-3xl p-5 space-y-3"><div class="text-xs uppercase tracking-widest text-rose-300 font-bold">🚩 Major Red Flags</div><ul class="space-y-2 text-xs text-rose-100/85">${(redFlags.length ? redFlags : ["None detected."]).map(r => `<li class="flex gap-2"><span>•</span><span>${escapeHtml(r)}</span></li>`).join('')}</ul></div>
                <div class="bg-amber-950/25 border border-amber-500/30 rounded-3xl p-5 space-y-3"><div class="text-xs uppercase tracking-widest text-amber-300 font-bold">💸 Hidden Fees & Traps</div><ul class="space-y-2 text-xs text-amber-100/85">${(hiddenFees.length ? hiddenFees : ["None detected."]).map(f => `<li class="flex gap-2"><span>•</span><span>${escapeHtml(f)}</span></li>`).join('')}</ul></div>
                <div class="bg-emerald-950/25 border border-emerald-500/30 rounded-3xl p-5 space-y-3"><div class="text-xs uppercase tracking-widest text-emerald-300 font-bold">✅ Genuine Positives</div><ul class="space-y-2 text-xs text-emerald-100/85">${(greenFlags.length ? greenFlags : ["Standard basics."]).map(g => `<li class="flex gap-2"><span>•</span><span>${escapeHtml(g)}</span></li>`).join('')}</ul></div>
            </div>
            ${questions.length ? `
                <div class="bg-[#0d111b] border border-blue-500/30 rounded-3xl p-6">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <span class="text-xs uppercase tracking-widest text-blue-300 font-bold">💬 Exact Questions to Message the Host Before Paying</span>
                        <button onclick="copyHostQuestions(this)" class="px-4 py-2 rounded-xl bg-blue-600/25 hover:bg-blue-600 border border-blue-400/40 text-xs font-bold text-blue-200 hover:text-white transition-all">📋 Copy All Questions</button>
                    </div>
                    <div class="space-y-2">${questions.map((q, i) => `<div class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/90 flex items-start gap-2.5"><span class="text-blue-400 font-bold">${i + 1}.</span><span>${escapeHtml(q)}</span></div>`).join('')}</div>
                </div>` : ''}
        </div>`;
}

function copyHostQuestions(btn) {
    if (!lastHostQuestionsText) return;
    navigator.clipboard?.writeText(lastHostQuestionsText);
    const old = btn.innerText; btn.innerText = "✓ Copied!";
    setTimeout(() => { btn.innerText = old; }, 2000);
}

function quickLoadSafetyCountry(country) {
    const sel = document.getElementById('safety-country-select');
    if (sel) sel.value = country;
    runSafetyVault();
}

async function runSafetyVault() {
    const country = document.getElementById('safety-country-select').value;
    const need = document.getElementById('safety-need-select').value;
    const resultEl = document.getElementById('safety-vault-result');
    const btn = document.getElementById('safety-vault-btn');

    const orig = btn.innerText; btn.disabled = true; btn.innerText = "🛡️ Scanning Intel...";
    resultEl.innerHTML = `<div class="bg-[#0d111b] border border-amber-500/30 rounded-3xl p-10 text-center space-y-3 panel-animate"><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400 mx-auto"></div><p class="text-sm font-bold text-white">Compiling Street Scams, Strict Laws & Spoken Crisis Card for ${escapeHtml(country)}...</p></div>`;

    try {
        const data = await authorizedPost('/api/safety-vault', { country, need });
        renderSafetyVaultResult(data, country, need);
    } catch (err) {
        resultEl.innerHTML = `<div class="bg-red-950/70 border border-red-500/50 rounded-3xl p-6 text-center space-y-2 text-sm text-red-200"><div class="text-xs uppercase tracking-widest font-bold text-red-300">Safety Brief Failed</div><div>${escapeHtml(err.message)}</div></div>`;
    } finally {
        btn.disabled = false; btn.innerText = orig;
    }
}

function renderSafetyVaultResult(data, country, need) {
    const resultEl = document.getElementById('safety-vault-result');
    const em = data.emergencyNumbers || {}, scams = data.scams || [], laws = data.strictLaws || [], card = data.crisisCard || {};
    lastSpokenCardText = card.nativeText || '';
    lastSpokenCardLang = card.langCode || COUNTRY_LANG_CODES[country] || 'en-US';

    resultEl.innerHTML = `
        <div class="panel-animate space-y-6">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-rose-950/35 border border-rose-500/40 rounded-2xl p-4"><span class="text-[10px] uppercase tracking-widest text-rose-300 font-bold">🚓 Police</span><div class="text-2xl font-black text-white mt-1 font-mono">${escapeHtml(em.police || '112')}</div></div>
                <div class="bg-emerald-950/35 border border-emerald-500/40 rounded-2xl p-4"><span class="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">🚑 Ambulance</span><div class="text-2xl font-black text-white mt-1 font-mono">${escapeHtml(em.ambulance || '112')}</div></div>
                <div class="bg-amber-950/35 border border-amber-500/40 rounded-2xl p-4"><span class="text-[10px] uppercase tracking-widest text-amber-300 font-bold">🛂 Tourist Help</span><div class="text-lg font-extrabold text-white mt-1 font-mono truncate">${escapeHtml(em.touristPolice || 'Local Desk')}</div></div>
                <div class="bg-blue-950/35 border border-blue-500/40 rounded-2xl p-4"><span class="text-[10px] uppercase tracking-widest text-blue-300 font-bold">🔌 Power / Tip Rule</span><div class="text-xs font-semibold text-white/90 mt-1.5 leading-snug">${escapeHtml(data.plugAndTipQuickNote || 'Check adapter')}</div></div>
            </div>
            ${lastSpokenCardText ? `
                <div class="bg-gradient-to-br from-[#161c2e] via-[#111625] to-[#1a131c] border-2 border-amber-400/50 rounded-3xl p-6 md:p-8 shadow-2xl">
                    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div><span class="text-[11px] uppercase tracking-widest text-amber-300 font-bold">🗣️ Show-To-Local Card • ${escapeHtml(country)}</span><p class="text-xs text-white/55 mt-0.5">${escapeHtml(need)}</p></div>
                        <button onclick="speakCrisisCard()" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"><span>🔊</span><span>Speak Aloud</span></button>
                    </div>
                    <div class="bg-black/50 border border-white/15 rounded-2xl p-6 text-center space-y-3">
                        <div class="text-2xl md:text-4xl font-extrabold text-white leading-snug">${escapeHtml(lastSpokenCardText)}</div>
                        ${card.pronunciation ? `<div class="text-sm font-mono text-cyan-300">"${escapeHtml(card.pronunciation)}"</div>` : ''}
                        <div class="text-xs text-white/60 pt-2 border-t border-white/10">${escapeHtml(card.englishMeaning || need)}</div>
                    </div>
                </div>` : ''}
            <div class="bg-[#0d111b] border border-rose-500/30 rounded-3xl p-6 space-y-4">
                <span class="text-xs uppercase tracking-widest text-rose-300 font-bold">🚨 Active Street Scams & Traps in ${escapeHtml(country)}</span>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${scams.map(s => `<div class="bg-[#141926] border border-white/10 rounded-2xl p-5 space-y-2.5"><div class="flex items-center justify-between gap-2"><h4 class="text-base font-bold text-white">${escapeHtml(s.name || '')}</h4><span class="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300">${escapeHtml(s.riskLevel || 'High Risk')}</span></div><p class="text-xs text-white/75 leading-relaxed"><strong class="text-amber-300">How it works:</strong> ${escapeHtml(s.howItWorks || '')}</p><div class="bg-emerald-950/35 border border-emerald-500/25 rounded-xl p-3 text-xs text-emerald-200"><strong>🛡️ Counter-Move:</strong> ${escapeHtml(s.counterMove || '')}</div></div>`).join('')}
                </div>
            </div>
            ${laws.length ? `<div class="bg-[#0d111b] border border-amber-500/30 rounded-3xl p-6 space-y-4"><span class="text-xs uppercase tracking-widest text-amber-300 font-bold">⚖️ Strict Local Laws & Fines</span><div class="grid grid-cols-1 md:grid-cols-3 gap-4">${laws.map(l => `<div class="bg-[#141926] border border-white/10 rounded-2xl p-4 space-y-1.5"><div class="text-sm font-bold text-white">${escapeHtml(l.rule || '')}</div><p class="text-xs text-white/70">${escapeHtml(l.penalty || '')}</p></div>`).join('')}</div></div>` : ''}
        </div>`;
}

function speakCrisisCard() {
    if (!lastSpokenCardText || !('speechSynthesis' in window)) { alert("Voice playback is not supported in this browser."); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(lastSpokenCardText);
    utter.lang = lastSpokenCardLang; utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
}

// =========================================================================
// 8. LIVE FX API, TICKER & QUANTUM CURRENCY VAULT
// =========================================================================
async function fetchLiveExchangeRates() {
    try {
        const data = await (await fetch('https://open.er-api.com/v6/latest/USD')).json();
        if (data?.result === 'success' && data.rates) {
            Object.keys(CURRENCIES).forEach(code => { if (data.rates[code]) fxRatesUsd[code] = data.rates[code]; });
            const d = data.time_last_update_utc ? new Date(data.time_last_update_utc) : new Date();
            fxUpdatedLabel = `Live Market • ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            document.getElementById('fx-live-badge').innerText = '● Live Market FX';
            renderTopTicker();
            updateCurrencyPlayground();
            if (currentTripData) renderItineraryBudgetMeter();
        }
    } catch (err) {
        fxUpdatedLabel = "Offline Estimate";
        renderTopTicker();
    }
}

function getRate(fromCode, toCode) { return (fxRatesUsd[toCode] || 1) / (fxRatesUsd[fromCode] || 1); }

function renderTopTicker() {
    const track = document.getElementById('top-live-ticker');
    if (!track) return;
    const tickerPairs = [
        { type: 'fx', from: 'USD', to: 'INR', unit: 1 },
        { type: 'flight', route: 'DEL ✈ HND', label: '7h 30m Nonstop', country: 'Japan' },
        { type: 'fx', from: 'JPY', to: 'INR', unit: 100 },
        { type: 'flight', route: 'BOM ✈ ZRH', label: '8h 45m Nonstop', country: 'Switzerland' },
        { type: 'fx', from: 'EUR', to: 'INR', unit: 1 },
        { type: 'flight', route: 'DEL ✈ ICN', label: '6h 40m Nonstop', country: 'South Korea' },
        { type: 'fx', from: 'CHF', to: 'INR', unit: 1 },
        { type: 'flight', route: 'DEL ✈ JFK', label: '15h 10m Nonstop', country: 'United States' },
        { type: 'fx', from: 'AED', to: 'INR', unit: 1 },
        { type: 'fx', from: 'KRW', to: 'INR', unit: 1000 },
        { type: 'fx', from: 'GBP', to: 'INR', unit: 1 }
    ];
    const single = tickerPairs.map(item => {
        if (item.type === 'fx') {
            const cFrom = CURRENCIES[item.from], cTo = CURRENCIES[item.to];
            const val = (getRate(item.from, item.to) * item.unit).toFixed(2);
            return `<button onclick="openCurrencyPair('${item.to}', '${item.from}')" class="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-400/40 text-xs transition-all flex-shrink-0 cursor-pointer"><span>${cFrom.flag}</span><span class="font-semibold text-white/90">${item.unit} ${item.from}</span><span class="text-white/35">→</span><span class="font-mono font-bold text-emerald-300">${cTo.symbol}${val}</span></button>`;
        }
        return `<button onclick="quickSelectCountry('${item.country}')" class="flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/40 hover:bg-blue-600/30 border border-blue-400/25 text-xs transition-all flex-shrink-0 cursor-pointer"><span class="font-mono font-bold text-blue-300">${item.route}</span><span class="text-white/50 text-[11px]">${item.label}</span></button>`;
    }).join('');
    track.innerHTML = single + single;
}

function initCurrencyDropdowns() {
    const fromSel = document.getElementById('fx-from-select'), toSel = document.getElementById('fx-to-select');
    const opts = Object.values(CURRENCIES).map(c => `<option value="${c.code}" class="bg-[#0e1422] text-white">${c.flag} ${c.code} — ${c.name}</option>`).join('');
    fromSel.innerHTML = opts; toSel.innerHTML = opts;
    fromSel.value = fxFrom; toSel.value = fxTo;
}

function openCurrencyPair(fromCode, toCode) {
    fxFrom = CURRENCIES[fromCode] ? fromCode : "INR";
    fxTo = CURRENCIES[toCode] ? toCode : "JPY";
    if (fxFrom === fxTo) fxTo = fxFrom === "USD" ? "JPY" : "USD";
    document.getElementById('fx-from-select').value = fxFrom;
    document.getElementById('fx-to-select').value = fxTo;
    fxAmount = CURRENCIES[fxFrom].chips[3] || 1000;
    document.getElementById('fx-amount-input').value = fxAmount;
    openCurrencyView();
}

function openCurrencyView() {
    ['home-page', 'globe-page', 'itinerary-page', 'shield-page'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('currency-page').classList.remove('hidden');
    document.getElementById('main-dock').classList.remove('hidden');
    document.body.style.overflow = '';
    setActiveDockButton('currency');
    updateCurrencyPlayground();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function closeCurrencyView() {
    const page = document.getElementById('currency-page');
    if (!page.classList.contains('hidden')) {
        page.classList.add('hidden');
        document.getElementById('home-page').classList.remove('hidden');
        setActiveDockButton('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function handleCurrencyChange() { fxFrom = document.getElementById('fx-from-select').value; fxTo = document.getElementById('fx-to-select').value; updateCurrencyPlayground(); }
function handleAmountInput(val) { const num = parseFloat(val); fxAmount = isNaN(num) || num < 0 ? 0 : num; syncSliderFromAmount(); updateCurrencyPlayground(false); }

function handleSliderScrub(sliderVal) {
    const chips = CURRENCIES[fxFrom].chips;
    const maxRef = chips[chips.length - 1] * 4, minRef = Math.max(1, chips[0] / 10), pct = Number(sliderVal) / 100;
    let computed = pct === 0 ? 0 : Math.round(minRef * Math.pow(maxRef / minRef, pct));
    if (computed > 100000) computed = Math.round(computed / 5000) * 5000;
    else if (computed > 10000) computed = Math.round(computed / 500) * 500;
    else if (computed > 1000) computed = Math.round(computed / 100) * 100;
    else if (computed > 100) computed = Math.round(computed / 10) * 10;
    fxAmount = computed; document.getElementById('fx-amount-input').value = fxAmount; updateCurrencyPlayground(false);
}

function syncSliderFromAmount() {
    const slider = document.getElementById('fx-slider'), chips = CURRENCIES[fxFrom].chips;
    const maxRef = chips[chips.length - 1] * 4, minRef = Math.max(1, chips[0] / 10);
    if (fxAmount <= 0) { slider.value = 0; return; }
    slider.value = Math.round((Math.log(Math.min(Math.max(fxAmount, minRef), maxRef) / minRef) / Math.log(maxRef / minRef)) * 100);
}

function addCashChip(val) { fxAmount = Math.round((fxAmount + val) * 100) / 100; document.getElementById('fx-amount-input').value = fxAmount; syncSliderFromAmount(); updateCurrencyPlayground(); }
function resetCurrencyAmount() { fxAmount = 0; document.getElementById('fx-amount-input').value = 0; document.getElementById('fx-slider').value = 0; updateCurrencyPlayground(); }

function swapCurrencies() {
    swapSpinDeg += 180;
    const btn = document.getElementById('fx-swap-btn');
    if (btn) btn.style.transform = `translate(${window.innerWidth >= 1024 ? '-50%, -50%' : '0, 0'}) rotate(${swapSpinDeg}deg)`;
    [fxFrom, fxTo] = [fxTo, fxFrom];
    document.getElementById('fx-from-select').value = fxFrom; document.getElementById('fx-to-select').value = fxTo;
    if (fxAmount === 0) fxAmount = CURRENCIES[fxFrom].chips[2];
    document.getElementById('fx-amount-input').value = fxAmount;
    syncSliderFromAmount(); updateCurrencyPlayground();
}

function setForexMarkup(pct) {
    fxMarkupPercent = pct;
    const map = { 0: 'markup-btn-0', 3.5: 'markup-btn-35', 8: 'markup-btn-8' };
    Object.entries(map).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (Number(k) === pct) el.className = pct === 0 ? "markup-btn py-2 px-2 rounded-xl border text-[11px] font-bold bg-emerald-500/25 border-emerald-400 text-emerald-200" : pct === 3.5 ? "markup-btn py-2 px-2 rounded-xl border text-[11px] font-bold bg-amber-500/25 border-amber-400 text-amber-200" : "markup-btn py-2 px-2 rounded-xl border text-[11px] font-bold bg-red-500/25 border-red-400 text-red-200";
        else el.className = "markup-btn py-2 px-2 rounded-xl border text-[11px] font-medium bg-white/5 border-white/10 text-white/65 hover:text-white";
    });
    updateCurrencyPlayground();
}

function setBillSplit(n) {
    fxBillSplit = n;
    [1, 2, 3, 4].forEach(num => {
        document.getElementById(`split-btn-${num}`).className = num === n ? "split-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white" : "split-btn px-3 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white";
    });
    updateCurrencyPlayground();
}

function toggleTipBoost() {
    fxTipEnabled = !fxTipEnabled;
    document.getElementById('tip-boost-btn').className = fxTipEnabled ? "px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-black border border-amber-300" : "px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 text-white/70 border border-white/10";
    updateCurrencyPlayground();
}

function formatMoney(num, code) {
    const decimals = ['JPY', 'KRW', 'IDR', 'VND'].includes(code) ? 0 : (num >= 1000 ? 0 : 2);
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatShortChip(num) { return num >= 1000000 ? `${num / 1000000}M` : num >= 1000 ? `${num / 1000}K` : String(num); }

function updateCurrencyPlayground(shouldSyncSlider = true) {
    const fromMeta = CURRENCIES[fxFrom], toMeta = CURRENCIES[fxTo];
    if (!fromMeta || !toMeta) return;
    if (shouldSyncSlider) syncSliderFromAmount();

    const rawRate = getRate(fxFrom, fxTo), effectiveRate = rawRate * (1 - fxMarkupPercent / 100);
    const effectiveBase = (fxAmount * (fxTipEnabled ? 1.10 : 1)) / fxBillSplit;
    const converted = effectiveBase * effectiveRate, lostInBase = effectiveBase * (fxMarkupPercent / 100);

    document.getElementById('fx-from-symbol').innerText = fromMeta.symbol;
    document.getElementById('fx-to-symbol').innerText = toMeta.symbol;
    document.getElementById('fx-converted-output').innerText = formatMoney(converted, fxTo);
    document.getElementById('fx-unit-rate').innerText = rawRate < 0.1 ? `100 ${fxFrom} = ${(rawRate * 100).toFixed(2)} ${fxTo}` : `1 ${fxFrom} = ${rawRate.toFixed(rawRate >= 10 ? 2 : 4)} ${fxTo}`;

    const splitNoteEl = document.getElementById('fx-split-note');
    if (fxBillSplit > 1 || fxTipEnabled) {
        const parts = []; if (fxTipEnabled) parts.push('+10% tip'); if (fxBillSplit > 1) parts.push(`split ÷${fxBillSplit}`);
        splitNoteEl.innerText = `Per person (${parts.join(', ')})`; splitNoteEl.classList.remove('hidden');
    } else splitNoteEl.classList.add('hidden');

    const feeBadge = document.getElementById('fx-fee-loss-badge');
    if (fxMarkupPercent === 0) { feeBadge.className = "text-[11px] font-bold text-emerald-300"; feeBadge.innerText = `✓ ${fromMeta.symbol}0 lost to hidden fees`; }
    else { feeBadge.className = fxMarkupPercent >= 8 ? "text-[11px] font-bold text-red-400" : "text-[11px] font-bold text-amber-300"; feeBadge.innerText = `⚠️ Losing ${fromMeta.symbol}${formatMoney(lostInBase, fxFrom)} in markup!`; }

    document.getElementById('fx-banknote-chips').innerHTML = fromMeta.chips.map(val => `<button onclick="addCashChip(${val})" class="banknote-chip px-3.5 py-2 rounded-xl bg-white/5 hover:bg-blue-600/30 border border-white/10 hover:border-blue-400/50 text-xs font-bold text-white/85">+${fromMeta.symbol}${formatShortChip(val)}</button>`).join('');
    document.getElementById('bp-country-name').innerText = toMeta.country;
    document.getElementById('bp-plan-country-btn').innerText = toMeta.country;

    const usdValue = effectiveBase / (fxRatesUsd[fxFrom] || 1) * (1 - fxMarkupPercent / 100);
    document.getElementById('buying-power-grid').innerHTML = `
        <div class="bg-[#121827] border border-emerald-500/25 rounded-2xl p-4"><div class="flex items-center justify-between mb-1"><span class="text-xl">🍜</span><span class="text-[10px] uppercase text-emerald-300 font-bold">Local Meals</span></div><div class="text-2xl font-black text-white">${Math.floor(usdValue / toMeta.mealUsd).toLocaleString()}</div><p class="text-[11px] text-white/50 mt-0.5">Street / casual meals</p></div>
        <div class="bg-[#121827] border border-amber-500/25 rounded-2xl p-4"><div class="flex items-center justify-between mb-1"><span class="text-xl">☕</span><span class="text-[10px] uppercase text-amber-300 font-bold">Cafe Coffees</span></div><div class="text-2xl font-black text-white">${Math.floor(usdValue / toMeta.coffeeUsd).toLocaleString()}</div><p class="text-[11px] text-white/50 mt-0.5">Artisan coffee stops</p></div>
        <div class="bg-[#121827] border border-cyan-500/25 rounded-2xl p-4"><div class="flex items-center justify-between mb-1"><span class="text-xl">🚆</span><span class="text-[10px] uppercase text-cyan-300 font-bold">Metro Rides</span></div><div class="text-2xl font-black text-white">${Math.floor(usdValue / toMeta.transitUsd).toLocaleString()}</div><p class="text-[11px] text-white/50 mt-0.5">Local transit trips</p></div>
        <div class="bg-[#121827] border border-blue-500/25 rounded-2xl p-4"><div class="flex items-center justify-between mb-1"><span class="text-xl">🏨</span><span class="text-[10px] uppercase text-blue-300 font-bold">3-4★ Hotel Nights</span></div><div class="text-2xl font-black text-white">${(usdValue / toMeta.hotelUsd).toFixed(1)}</div><p class="text-[11px] text-white/50 mt-0.5">Comfort hotel stays</p></div>`;

    const radarCandidates = ['USD', 'EUR', 'JPY', 'CHF', 'GBP', 'AED', 'THB', 'KRW', 'SGD'].filter(c => c !== fxFrom && c !== fxTo).slice(0, 4);
    document.getElementById('fx-last-updated').innerText = fxUpdatedLabel;
    document.getElementById('fx-radar-grid').innerHTML = radarCandidates.map(code => {
        const meta = CURRENCIES[code], val = effectiveBase * getRate(fxFrom, code) * (1 - fxMarkupPercent / 100);
        return `<button onclick="selectRadarTarget('${code}')" class="text-left bg-[#121827] hover:bg-[#192338] border border-white/10 hover:border-blue-400/50 rounded-2xl p-4 transition-all group"><div class="flex items-center justify-between mb-1.5"><span class="text-xs font-bold text-white/80">${meta.flag} ${meta.code}</span><span class="text-[10px] text-blue-300 opacity-0 group-hover:opacity-100">Select →</span></div><div class="text-lg font-extrabold text-white truncate">${meta.symbol}${formatMoney(val, code)}</div><div class="text-[11px] text-white/45 truncate mt-0.5">${meta.country}</div></button>`;
    }).join('');
}

function selectRadarTarget(code) { fxTo = code; document.getElementById('fx-to-select').value = fxTo; updateCurrencyPlayground(); }
function planTripWithCurrentCurrency() { const c = CURRENCIES[fxTo]?.country || "Japan"; closeCurrencyView(); quickSelectCountry(c); }

// =========================================================================
// 9. LIVE WORLD PORTALS & COUNTRY BATTLE MODE
// =========================================================================
function getWeatherMeta(code) {
    if (code === 0) return { icon: "☀️", desc: "Clear" };
    if ([1, 2, 3].includes(code)) return { icon: "⛅", desc: "Partly Cloudy" };
    if ([45, 48].includes(code)) return { icon: "🌫️", desc: "Misty" };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { icon: "🌧️", desc: "Rain" };
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: "❄️", desc: "Snow" };
    if ([95, 96, 99].includes(code)) return { icon: "⛈️", desc: "Storm" };
    return { icon: "🌤️", desc: "Mild" };
}

function getFormattedLocalTime(tz) {
    try { return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date()); }
    catch (e) { return "--:--"; }
}

function renderLivePortals() {
    const grid = document.getElementById('live-portals-grid');
    const currentMonthIdx = new Date().getMonth();
    grid.innerHTML = LIVE_PORTALS.map(portal => {
        const season = portal.seasonLogic(currentMonthIdx), liveTime = getFormattedLocalTime(portal.tz), weather = portalWeatherMap[portal.id];
        const weatherText = weather ? `${weather.icon} ${Math.round(weather.temp)}°C` : `🌡️ Live...`;
        let battleClass = 'border-white/10', battleBadge = '';
        if (isBattleMode) {
            if (battleCountryA === portal.country) { battleClass = 'battle-selected-a'; battleBadge = `<span class="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase">Fighter 1</span>`; }
            else if (battleCountryB === portal.country) { battleClass = 'battle-selected-b'; battleBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase">Fighter 2</span>`; }
            else battleBadge = `<span class="px-2.5 py-1 rounded-full bg-black/60 border border-white/20 text-white/70 text-[10px] font-semibold">Pick</span>`;
        }
        return `
            <div onclick="handlePortalCardClick('${portal.id}')" class="portal-card h-64 rounded-3xl overflow-hidden border ${battleClass} cursor-pointer relative group bg-[#0d111b] shadow-xl">
                <img src="${portal.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="${escapeHtml(portal.country)}">
                <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/45"></div>
                <div class="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                    <span id="portal-weather-${portal.id}" class="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white">${weatherText}</span>
                    ${battleBadge || `<span id="portal-clock-${portal.id}" class="px-2 py-1 rounded-full bg-black/55 backdrop-blur-md text-[10px] font-mono text-blue-200 border border-white/10">${liveTime}</span>`}
                </div>
                <div class="absolute bottom-3 left-3.5 right-3.5">
                    <span class="inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide mb-2 backdrop-blur-md ${season.color}">${season.label}</span>
                    <div class="flex items-end justify-between gap-2">
                        <div><h3 class="text-base font-extrabold text-white leading-tight">${escapeHtml(portal.country)}</h3><p class="text-[11px] text-white/60">${escapeHtml(portal.hubCity)} Live</p></div>
                        <span class="w-7 h-7 rounded-full bg-white/10 group-hover:bg-blue-600 border border-white/20 flex items-center justify-center text-xs text-white transition-all">${isBattleMode ? '⚔️' : '→'}</span>
                    </div>
                </div>
            </div>`;
    }).join('');
}

function updatePortalClocks() {
    if (isBattleMode) return;
    LIVE_PORTALS.forEach(p => { const el = document.getElementById(`portal-clock-${p.id}`); if (el) el.innerText = getFormattedLocalTime(p.tz); });
}

async function fetchAllPortalWeather() {
    try {
        const data = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LIVE_PORTALS.map(p => p.lat).join(',')}&longitude=${LIVE_PORTALS.map(p => p.lon).join(',')}&current=temperature_2m,weather_code`)).json();
        (Array.isArray(data) ? data : [data]).forEach((item, idx) => {
            const portal = LIVE_PORTALS[idx];
            if (portal && item?.current) {
                const meta = getWeatherMeta(item.current.weather_code);
                portalWeatherMap[portal.id] = { temp: item.current.temperature_2m, icon: meta.icon, desc: meta.desc };
                const el = document.getElementById(`portal-weather-${portal.id}`);
                if (el) el.innerText = `${meta.icon} ${Math.round(item.current.temperature_2m)}°C`;
            }
        });
    } catch (err) {}
}

function handlePortalCardClick(portalId) {
    const portal = LIVE_PORTALS.find(p => p.id === portalId);
    if (!portal) return;
    if (isBattleMode) {
        if (battleCountryA === portal.country || battleCountryB === portal.country) return;
        if (battleNextSlot === "A") { battleCountryA = portal.country; battleNextSlot = "B"; }
        else { battleCountryB = portal.country; battleNextSlot = "A"; }
        document.getElementById('battle-select-a').value = battleCountryA;
        document.getElementById('battle-select-b').value = battleCountryB;
        renderLivePortals();
    } else openPortalDossier(portal);
}

async function openPortalDossier(portal) {
    const modal = document.getElementById('dossier-modal'), body = document.getElementById('dossier-body');
    const monthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const season = portal.seasonLogic(new Date().getMonth()), weather = portalWeatherMap[portal.id];
    const weatherStr = weather ? `${weather.icon} ${Math.round(weather.temp)}°C • ${weather.desc}` : `Live conditions`;

    document.getElementById('dossier-bg').src = COUNTRY_BACKDROPS[portal.country] || portal.image;
    document.getElementById('dossier-country-title').innerText = portal.country;
    document.getElementById('dossier-pulse-badge').innerText = `${season.label} • ${monthName}`;
    document.getElementById('dossier-live-weather').innerText = weatherStr;
    document.getElementById('dossier-live-clock').innerText = `${getFormattedLocalTime(portal.tz)} (${portal.hubCity})`;

    document.getElementById('dossier-plan-btn').onclick = () => { closeDossierModal(); quickSelectCountry(portal.country, portal.defaultPlaces); };
    document.getElementById('dossier-battle-btn').onclick = () => {
        closeDossierModal();
        battleCountryA = portal.country; battleCountryB = portal.country === "Japan" ? "Switzerland" : "Japan";
        document.getElementById('battle-select-a').value = battleCountryA; document.getElementById('battle-select-b').value = battleCountryB;
        toggleBattleMode(true); document.getElementById('portals-section').scrollIntoView({ behavior: 'smooth' });
    };

    modal.classList.remove('hidden');
    const homeCity = document.getElementById('homeCity').value.trim(), cacheKey = `${portal.country}|${homeCity}`;
    if (dossierCache[cacheKey]) { renderDossierBody(dossierCache[cacheKey], portal); return; }

    body.innerHTML = `<div class="py-10 text-center space-y-3"><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400 mx-auto"></div><p class="text-sm font-semibold text-white">Gemini is compiling live ${escapeHtml(monthName)} intel for ${escapeHtml(portal.country)}...</p></div>`;
    try {
        const data = await authorizedPost('/api/country-dossier', { country: portal.country, homeCity, currentMonth: monthName, liveWeather: weatherStr });
        dossierCache[cacheKey] = data; renderDossierBody(data, portal);
    } catch (err) {
        body.innerHTML = `<div class="bg-red-950/60 border border-red-500/40 rounded-2xl p-5 text-xs text-red-200 text-center">Could not load AI Dossier: ${escapeHtml(err.message)}</div>`;
    }
}

function renderDossierBody(data, portal) {
    const body = document.getElementById('dossier-body'), verdict = (data.goNowVerdict || 'GO NOW').toUpperCase();
    const vStyle = verdict.includes('WAIT') ? 'bg-red-500/20 border-red-400/50 text-red-300' : verdict.includes('CAVEAT') ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300';
    const spots = Array.isArray(data.topHighlights) ? data.topHighlights : portal.defaultPlaces;
    document.getElementById('dossier-plan-btn').onclick = () => { closeDossierModal(); quickSelectCountry(portal.country, spots); };

    body.innerHTML = `
        <div class="bg-white/5 border border-white/10 rounded-2xl p-4"><div class="flex items-center justify-between gap-2 mb-2"><span class="text-[11px] uppercase tracking-widest text-white/50 font-bold">Right-Now Verdict</span><span class="px-3 py-1 rounded-full border text-[11px] font-extrabold ${vStyle}">${escapeHtml(verdict)}</span></div><p class="text-sm text-white/85">${escapeHtml(data.goNowReason || '')}</p></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="bg-[#131826] border border-white/10 rounded-2xl p-4"><span class="text-[11px] uppercase text-emerald-300 font-bold block mb-1">💳 Currency & Spend</span><p class="text-xs text-white/80">${escapeHtml(data.currencyAndCost || '')}</p></div>
            <div class="bg-[#131826] border border-white/10 rounded-2xl p-4"><span class="text-[11px] uppercase text-blue-300 font-bold block mb-1">🛂 Visa Reality</span><p class="text-xs text-white/80">${escapeHtml(data.visaSnapshot || '')}</p></div>
            <div class="bg-[#131826] border border-white/10 rounded-2xl p-4"><span class="text-[11px] uppercase text-cyan-300 font-bold block mb-1">💎 Best Spot Right Now</span><p class="text-xs text-white/80">${escapeHtml(data.bestRightNowSpot || '')}</p></div>
            <div class="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4"><span class="text-[11px] uppercase text-amber-300 font-bold block mb-1">⚠️ Trap to Dodge</span><p class="text-xs text-amber-100/85">${escapeHtml(data.touristTrapToAvoid || '')}</p></div>
        </div>`;
}

function closeDossierModal() { document.getElementById('dossier-modal').classList.add('hidden'); }

function initBattleSelectors() {
    const selectA = document.getElementById('battle-select-a'), selectB = document.getElementById('battle-select-b');
    const opts = ALL_COUNTRIES.map(c => `<option value="${escapeHtml(c)}" class="bg-[#10131c] text-white">${escapeHtml(c)}</option>`).join('');
    selectA.innerHTML = opts; selectB.innerHTML = opts;
    selectA.value = battleCountryA; selectB.value = battleCountryB;
}

function syncBattleDropdowns() { battleCountryA = document.getElementById('battle-select-a').value; battleCountryB = document.getElementById('battle-select-b').value; renderLivePortals(); }

function toggleBattleMode(forceState = null) {
    isBattleMode = forceState !== null ? forceState : !isBattleMode;
    document.getElementById('battle-command-bar').classList.toggle('hidden', !isBattleMode);
    document.getElementById('battle-toggle-label').innerText = isBattleMode ? "Battle Mode Active" : "Country Battle Mode";
    document.getElementById('battle-mode-toggle').className = isBattleMode
        ? "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-extrabold border bg-amber-500 text-black border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.6)]"
        : "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold border bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/35 hover:to-orange-500/35 border-amber-400/50 text-amber-200";
    renderLivePortals();
}

async function launchCountryBattle() {
    battleCountryA = document.getElementById('battle-select-a').value;
    battleCountryB = document.getElementById('battle-select-b').value;
    if (battleCountryA === battleCountryB) { alert("Pick two different countries to battle!"); return; }

    const homeCity = document.getElementById('homeCity').value.trim() || document.getElementById('departureCity').value.trim();
    const days = document.getElementById('days').value.trim() || "7";
    const hotelBudget = document.getElementById('hotelBudget').value;
    const dailySpendingBudget = document.getElementById('dailySpendingBudget').value;
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const modal = document.getElementById('battle-arena-modal'), stage = document.getElementById('battle-arena-stage');
    document.getElementById('battle-arena-context').innerText = `${days} Days • ${currentMonth}`;
    modal.classList.remove('hidden'); document.body.style.overflow = 'hidden';

    stage.innerHTML = `<div class="py-24 text-center space-y-5"><div class="inline-flex items-center gap-6"><span class="text-2xl md:text-4xl font-extrabold text-blue-400">${escapeHtml(battleCountryA)}</span><span class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-black font-black text-lg flex items-center justify-center animate-pulse">VS</span><span class="text-2xl md:text-4xl font-extrabold text-amber-400">${escapeHtml(battleCountryB)}</span></div><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-400 mx-auto"></div><p class="text-sm text-white/70">Gemini AI is judging flights, visa hassle, hotel value & weather...</p></div>`;
    try {
        const data = await authorizedPost('/api/country-battle', { countryA: battleCountryA, countryB: battleCountryB, homeCity, days, hotelBudget, dailySpendingBudget, currentMonth });
        renderBattleResults(data);
    } catch (err) {
        stage.innerHTML = `<div class="bg-red-950/70 border border-red-500/50 rounded-3xl p-8 text-center max-w-xl mx-auto my-16 space-y-3"><div class="text-xs uppercase text-red-300 font-bold">Battle Interrupted</div><p class="text-sm text-red-100">${escapeHtml(err.message)}</p><button onclick="launchCountryBattle()" class="px-6 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold">Retry</button></div>`;
    }
}

function renderBattleResults(data) {
    const stage = document.getElementById('battle-arena-stage');
    const a = data.countryA || { name: battleCountryA }, b = data.countryB || { name: battleCountryB };
    const winner = data.verdictWinner || a.name, scores = Array.isArray(data.headToHeadScores) ? data.headToHeadScores : [];
    const isAWinner = winner.toLowerCase() === a.name.toLowerCase();
    const pA = JSON.stringify(a.topPlaces || []).replace(/"/g, '&quot;'), pB = JSON.stringify(b.topPlaces || []).replace(/"/g, '&quot;');

    const scoresHtml = scores.map(r => {
        const sA = Math.min(Math.max(Number(r.scoreA) || 7, 1), 10), sB = Math.min(Math.max(Number(r.scoreB) || 7, 1), 10);
        return `<div class="space-y-1.5"><div class="flex justify-between text-xs"><span class="font-bold text-blue-300 w-10">${sA}/10</span><span class="text-white/75 text-center flex-1">${escapeHtml(r.category || '')}</span><span class="font-bold text-amber-300 w-10 text-right">${sB}/10</span></div><div class="grid grid-cols-2 gap-2"><div class="h-2 bg-white/10 rounded-full overflow-hidden flex justify-end"><div class="h-full bg-gradient-to-l from-blue-400 to-indigo-600" style="width:${sA * 10}%"></div></div><div class="h-2 bg-white/10 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-amber-400 to-orange-500" style="width:${sB * 10}%"></div></div></div></div>`;
    }).join('');

    stage.innerHTML = `
        <div class="panel-animate space-y-6 pb-12">
            <h2 class="text-3xl md:text-4xl font-extrabold text-white text-center">${escapeHtml(data.headline || `${a.name} vs. ${b.name}`)}</h2>
            <div class="bg-gradient-to-r from-blue-950/60 via-[#121829] to-amber-950/50 border border-amber-400/40 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div class="max-w-3xl space-y-1"><span class="text-[11px] uppercase text-amber-300 font-extrabold">🏆 Winner: ${escapeHtml(winner)}</span><p class="text-sm text-white/90">${escapeHtml(data.verdictReason || '')}</p></div>
                <button onclick="crownBattleWinner('${(isAWinner ? a.name : b.name).replace(/'/g, "\\'")}', ${isAWinner ? pA : pB})" class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs uppercase">Plan Winner →</button>
            </div>
            ${scores.length ? `<div class="bg-[#0d111b] border border-white/10 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">${scoresHtml}</div>` : ''}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">${renderFighterCard(a, COUNTRY_BACKDROPS[a.name] || DEFAULT_BACKDROP, 'blue', isAWinner, pA)}${renderFighterCard(b, COUNTRY_BACKDROPS[b.name] || DEFAULT_BACKDROP, 'amber', !isAWinner, pB)}</div>
        </div>`;
}

function renderFighterCard(f, bg, theme, isWinner, placesAttr) {
    const bdr = theme === 'blue' ? 'border-blue-500/40' : 'border-amber-500/40', acc = theme === 'blue' ? 'text-blue-300' : 'text-amber-300', btn = theme === 'blue' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-black';
    return `<div class="bg-[#0d111b] border ${bdr} rounded-3xl overflow-hidden flex flex-col justify-between"><div><div class="relative h-44"><img src="${bg}" class="w-full h-full object-cover opacity-75"><div class="absolute inset-0 bg-gradient-to-t from-[#0d111b] via-[#0d111b]/45 to-transparent"></div>${isWinner ? `<span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase">🏆 AI Pick</span>` : ''}<div class="absolute bottom-4 left-6"><p class="text-xs font-semibold ${acc} uppercase">${escapeHtml(f.vibeTagline || '')}</p><h3 class="text-3xl font-extrabold text-white">${escapeHtml(f.name || '')}</h3></div></div><div class="p-6 space-y-3 text-xs"><div class="bg-white/5 rounded-2xl p-3.5"><strong class="text-white/50 block text-[10px] uppercase">✈️ Flight</strong>${escapeHtml(f.flightEstimate || '')}</div><div class="bg-white/5 rounded-2xl p-3.5"><strong class="text-white/50 block text-[10px] uppercase">🛂 Visa</strong>${escapeHtml(f.visaFriction || '')}</div><div class="bg-white/5 rounded-2xl p-3.5"><strong class="text-white/50 block text-[10px] uppercase">🏨 Hotel Value</strong>${escapeHtml(f.hotelValue || '')}</div><div class="bg-white/5 rounded-2xl p-3.5"><strong class="text-white/50 block text-[10px] uppercase">🍜 Daily Spend</strong>${escapeHtml(f.dailyFoodCost || '')}</div><div class="grid grid-cols-2 gap-3"><div class="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5"><strong class="text-emerald-300 block mb-1">✅ Pro</strong>${escapeHtml(f.biggestPro || '')}</div><div class="bg-red-950/35 border border-red-500/30 rounded-2xl p-3.5"><strong class="text-red-300 block mb-1">⚠️ Catch</strong>${escapeHtml(f.biggestCatch || '')}</div></div></div></div><div class="p-6 pt-0"><button onclick="crownBattleWinner('${(f.name || '').replace(/'/g, "\\'")}', ${placesAttr})" class="w-full py-3.5 rounded-xl font-extrabold text-xs uppercase ${btn}">Crown ${escapeHtml(f.name || '')} & Build Plan →</button></div></div>`;
}

function crownBattleWinner(country, places) { closeBattleArena(); toggleBattleMode(false); quickSelectCountry(country, Array.isArray(places) && places.length ? places : null); }
function closeBattleArena() { document.getElementById('battle-arena-modal').classList.add('hidden'); document.body.style.overflow = ''; }

// =========================================================================
// 10. SAVED PLANS STORAGE, AUTOCOMPLETE & PLANNER WIZARD
// =========================================================================
function loadSavedPlansFromStorage() {
    try {
        const raw = localStorage.getItem('ai_travel_saved_plans');
        if (raw) { const list = JSON.parse(raw); if (Array.isArray(list)) savedPlans = list; }
        if (savedPlans.length > 0) setActivePlanById(savedPlans[0].id);
    } catch (e) {}
}

function persistPlansToStorage() { try { localStorage.setItem('ai_travel_saved_plans', JSON.stringify(savedPlans)); } catch (e) {} }

function setActivePlanById(planId) {
    const found = savedPlans.find(p => p.id === planId);
    if (!found) { activePlanId = null; currentTripData = null; currentTripMeta = null; checkedStops = new Set(); favoriteStops = new Set(); stopNotes = {}; return; }
    isViewingBlueprint = false; activeBlueprintId = null;
    activePlanId = found.id; currentTripData = found.data; currentTripMeta = found.meta;
    checkedStops = new Set(found.checked || []); favoriteStops = new Set(found.favorites || []); stopNotes = found.notes || {};
}

function syncActivePlanChanges() {
    if (isViewingBlueprint || !activePlanId) return;
    const idx = savedPlans.findIndex(p => p.id === activePlanId);
    if (idx !== -1) {
        savedPlans[idx].checked = Array.from(checkedStops);
        savedPlans[idx].favorites = Array.from(favoriteStops);
        savedPlans[idx].notes = stopNotes;
        persistPlansToStorage();
    }
}

function deleteSavedPlan(planId, event) {
    if (event) event.stopPropagation();
    savedPlans = savedPlans.filter(p => p.id !== planId);
    if (activePlanId === planId) setActivePlanById(savedPlans.length ? savedPlans[0].id : null);
    persistPlansToStorage(); updateHomeActivePlanBanner();
}

function clearAllSavedPlans() { savedPlans = []; setActivePlanById(null); persistPlansToStorage(); updateHomeActivePlanBanner(); }

document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) document.querySelectorAll('.autocomplete-menu').forEach(el => el.classList.add('hidden'));
});

function handleCityInput(inputEl, dropdownId, mode) {
    const query = inputEl.value.trim(), dropdown = document.getElementById(dropdownId);
    document.querySelectorAll('.autocomplete-menu').forEach(el => { if (el.id !== dropdownId) el.classList.add('hidden'); });
    if (!query) { dropdown.classList.add('hidden'); return; }
    const lq = query.toLowerCase();
    const local = [...QUICK_CITIES.filter(c => c.split(',')[0].trim().toLowerCase().startsWith(lq)), ...QUICK_CITIES.filter(c => { const n = c.split(',')[0].trim().toLowerCase(); return !n.startsWith(lq) && n.includes(lq); })].slice(0, 6);
    renderDropdownItems(dropdown, inputEl, local, mode);

    if (query.length >= 2) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                const data = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`)).json();
                if (data?.results) renderDropdownItems(dropdown, inputEl, Array.from(new Set([...local, ...data.results.map(i => [i.name, i.admin1, i.country].filter(Boolean).join(', '))])).slice(0, 8), mode);
            } catch (err) {}
        }, 180);
    }
}

function handleCountrySpecificPlaceInput(inputEl) {
    const query = inputEl.value.trim(), dropdown = document.getElementById('customPlaceDropdown'), country = document.getElementById('destinationCountry').value.trim();
    document.querySelectorAll('.autocomplete-menu').forEach(el => { if (el.id !== 'customPlaceDropdown') el.classList.add('hidden'); });
    if (!country) { dropdown.innerHTML = `<div class="px-4 py-3 text-xs text-amber-300">Select a Destination Country in Box 3 first.</div>`; dropdown.classList.remove('hidden'); return; }

    const db = COUNTRY_PLACES_DB[country] || [], lq = query.toLowerCase();
    if (!query) { renderCountrySpecificDropdown(dropdown, db.filter(p => !selectedPlacesSet.has(p)).slice(0, 6), country); return; }
    const local = [...db.filter(p => p.toLowerCase().startsWith(lq)), ...db.filter(p => !p.toLowerCase().startsWith(lq) && p.toLowerCase().includes(lq))].slice(0, 6);
    renderCountrySpecificDropdown(dropdown, local, country);

    if (query.length >= 2) {
        const iso = COUNTRY_ISO_MAP[country] || '';
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            try {
                const data = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=12&language=en&format=json${iso ? `&countryCode=${iso}` : ''}`)).json();
                const api = (data?.results || []).filter(i => (iso && i.country_code) ? i.country_code.toUpperCase() === iso : (i.country && i.country.toLowerCase() === country.toLowerCase())).map(i => (i.admin1 && i.admin1.toLowerCase() !== i.name.toLowerCase()) ? `${i.name} (${i.admin1})` : i.name);
                renderCountrySpecificDropdown(dropdown, Array.from(new Set([...local, ...api])).slice(0, 8), country);
            } catch (err) {}
        }, 180);
    }
}

function renderCountrySpecificDropdown(dropdown, places, country) {
    if (!places?.length) { dropdown.innerHTML = `<div class="px-4 py-3 text-xs text-white/50">No match in <strong class="text-white">${escapeHtml(country)}</strong>. Press Enter to add.</div>`; dropdown.classList.remove('hidden'); return; }
    dropdown.innerHTML = places.map(p => `<div class="autocomplete-item" onclick="selectPlaceInCountry('${p.replace(/'/g, "\\'")}')"><span>📍 ${escapeHtml(p)} <span class="text-white/40 text-[11px] ml-1">• ${escapeHtml(country)}</span></span><span class="text-[10px] text-emerald-400 uppercase font-semibold">+ Add</span></div>`).join('');
    dropdown.classList.remove('hidden');
}

function selectPlaceInCountry(place) { if (!activePlacesList.includes(place)) activePlacesList.push(place); selectedPlacesSet.add(place); document.getElementById('customPlaceInput').value = ''; document.getElementById('customPlaceDropdown').classList.add('hidden'); renderPlaceChips(); }
function renderDropdownItems(dropdown, inputEl, items, mode) { if (!items?.length) { dropdown.classList.add('hidden'); return; } const icon = mode === 'airport' ? '✈️' : '📍'; dropdown.innerHTML = items.map(c => `<div class="autocomplete-item" onclick="selectAutocompleteValue('${inputEl.id}', '${dropdown.id}', '${c.replace(/'/g, "\\'")}')"><span>${icon} ${escapeHtml(c)}</span><span class="text-[10px] text-blue-400 uppercase">Select</span></div>`).join(''); dropdown.classList.remove('hidden'); }
function selectAutocompleteValue(inputId, dropdownId, value) { document.getElementById(inputId).value = value; document.getElementById(dropdownId).classList.add('hidden'); }

function handleCountryInput(inputEl) {
    const q = inputEl.value.trim().toLowerCase(), dropdown = document.getElementById('countryDropdown');
    document.querySelectorAll('.autocomplete-menu').forEach(el => { if (el.id !== 'countryDropdown') el.classList.add('hidden'); });
    const matches = [...(q ? ALL_COUNTRIES.filter(c => c.toLowerCase().startsWith(q)) : ALL_COUNTRIES), ...(q ? ALL_COUNTRIES.filter(c => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q)) : [])].slice(0, 8);
    dropdown.innerHTML = matches.map(c => `<div class="autocomplete-item" onclick="selectCountry('${c.replace(/'/g, "\\'")}')"><span>🌍 ${escapeHtml(c)}</span><span class="text-[10px] text-blue-400 uppercase">Pick</span></div>`).join('');
    dropdown.classList.remove('hidden');
}

function selectCountry(country, preselected = null) {
    document.getElementById('destinationCountry').value = country;
    document.getElementById('countryDropdown').classList.add('hidden');
    document.getElementById('selected-country-label').innerText = country;
    document.getElementById('selected-country-subtext').innerText = country;
    document.getElementById('customPlaceInput').value = '';
    document.getElementById('customPlaceInput').placeholder = `Search cities & places in ${country}...`;
    document.getElementById('country-places-section').classList.remove('hidden');
    const defaults = COUNTRY_PLACES_DB[country] || [`Highlights of ${country}`];
    activePlacesList = [...defaults.slice(0, 10)];
    if (Array.isArray(preselected)) preselected.forEach(p => { if (!activePlacesList.includes(p)) activePlacesList.unshift(p); });
    selectedPlacesSet = new Set(preselected || defaults.slice(0, 3));
    renderPlaceChips();
}

function renderPlaceChips() {
    document.getElementById('recommended-places-chips').innerHTML = activePlacesList.map(p => {
        const on = selectedPlacesSet.has(p);
        return `<button type="button" onclick="togglePlaceSelection('${p.replace(/'/g, "\\'")}')" class="px-3.5 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${on ? 'bg-blue-600/30 border-blue-400 text-white' : 'bg-[#10131c] border-white/10 text-white/60 hover:text-white'}"><span>${on ? '✓' : '+'}</span><span>${escapeHtml(p)}</span></button>`;
    }).join('');
}

function togglePlaceSelection(p) { selectedPlacesSet.has(p) ? selectedPlacesSet.delete(p) : selectedPlacesSet.add(p); renderPlaceChips(); }
function addCustomPlace() { const inp = document.getElementById('customPlaceInput'), v = inp.value.trim(); if (!v) return; if (!activePlacesList.includes(v)) activePlacesList.push(v); selectedPlacesSet.add(v); inp.value = ''; document.getElementById('customPlaceDropdown').classList.add('hidden'); renderPlaceChips(); }

async function fetchGeminiPlacesForCountry() {
    const country = document.getElementById('destinationCountry').value.trim();
    if (!country) { alert("Enter a Destination Country first."); return; }
    const btn = document.getElementById('ai-places-btn'), orig = btn.innerText;
    btn.innerText = "✨ Asking Gemini AI..."; btn.disabled = true;
    try {
        const data = await authorizedPost('/api/recommend-places', { country });
        if (Array.isArray(data.places)) { data.places.forEach(p => { if (!activePlacesList.includes(p)) activePlacesList.push(p); }); renderPlaceChips(); }
    } catch (e) { alert("Gemini Error: " + e.message); }
    finally { btn.innerText = orig; btn.disabled = false; }
}

function openWizard() {
    const q = document.getElementById('quickDestinationInput').value.trim();
    if (q && !document.getElementById('destinationCountry').value) selectCountry(q);
    const d = document.getElementById('planner-drawer');
    d.classList.remove('hidden'); d.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeWizard() { document.getElementById('planner-drawer').classList.add('hidden'); }
function quickSelectCountry(country, places = null) { document.getElementById('quickDestinationInput').value = country; openWizard(); selectCountry(country, places); document.getElementById('homeCity').focus(); }

function setFirstTime(choice) {
    document.getElementById('isFirstTime').value = choice;
    const on = "py-3.5 px-4 rounded-xl border border-blue-400 bg-blue-500/20 text-xs font-semibold text-white";
    const off = "py-3.5 px-4 rounded-xl border border-white/10 bg-[#181c28] text-xs font-medium text-white/60 hover:text-white";
    document.getElementById('btn-first-yes').className = choice === 'yes' ? on : off;
    document.getElementById('btn-first-no').className = choice === 'no' ? on : off;
    document.getElementById('visited-places-container').classList.toggle('hidden', choice === 'yes');
}

function goBackHome() {
    ['itinerary-page', 'globe-page', 'currency-page', 'shield-page'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('globe-country-tooltip').classList.add('hidden');
    closeGlobeLauncher();
    document.getElementById('home-page').classList.remove('hidden');
    document.getElementById('main-dock').classList.remove('hidden');
    document.body.style.overflow = '';
    setActiveDockButton('home');
    updateHomeActivePlanBanner();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function modifyCurrentTrip() { goBackHome(); setTimeout(() => openWizard(), 150); }

function openItineraryPage(planId = null) {
    if (planId) setActivePlanById(planId);
    else if (savedPlans.length && isViewingBlueprint) setActivePlanById(savedPlans[0].id);
    if (!currentTripData) return;

    ['home-page', 'globe-page', 'currency-page', 'shield-page', 'main-dock'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('itinerary-page').classList.remove('hidden');
    document.body.style.overflow = '';
    activeDayView = 0; activeCategoryFilter = 'ALL';
    renderDedicatedItineraryPage();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function updateHomeActivePlanBanner() {
    const banner = document.getElementById('saved-plan-banner'), headerBtn = document.getElementById('header-resume-btn'), countPill = document.getElementById('places-count');
    if (!savedPlans.length) {
        banner.classList.add('hidden'); banner.innerHTML = '';
        headerBtn.classList.add('hidden'); headerBtn.classList.remove('flex');
        countPill.innerText = '6 live portals'; return;
    }
    headerBtn.classList.remove('hidden'); headerBtn.classList.add('flex');
    countPill.innerText = `${savedPlans.length} saved plan${savedPlans.length > 1 ? 's' : ''}`;

    const cardsHtml = savedPlans.map(plan => {
        const summary = plan.data?.summary || {}, meta = plan.meta || {}, daysCount = (plan.data?.days || []).length;
        let stops = 0; (plan.data?.days || []).forEach(d => stops += (d.schedule?.length || 0));
        const bg = COUNTRY_BACKDROPS[meta.destinationCountry] || DEFAULT_BACKDROP;
        return `<div onclick="openItineraryPage('${plan.id}')" class="bg-gradient-to-r from-[#121a2d] via-[#101625] to-[#0d121d] hover:border-blue-400 border border-blue-500/35 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer transition-all shadow-lg"><div class="flex items-center gap-4 min-w-0 w-full sm:w-auto"><img src="${bg}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover flex-shrink-0 border border-white/15"><div class="min-w-0"><span class="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">● Generated Master Plan Ready</span><h3 class="text-base sm:text-lg font-bold text-white truncate mt-0.5">${escapeHtml(summary.tripTitle || meta.destinationCountry)}</h3><p class="text-xs text-white/60 mt-1 truncate">✈️ ${escapeHtml(meta.departureCity || '')} → ${escapeHtml(meta.destinationCountry || '')} • ${daysCount} Days • ${stops} Stops</p></div></div><div class="flex items-center gap-2.5 flex-shrink-0 w-full sm:w-auto justify-end"><button onclick="event.stopPropagation(); openItineraryPage('${plan.id}')" class="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-lg">Open Interactive Plan →</button><button onclick="deleteSavedPlan('${plan.id}', event)" class="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-600 border border-red-500/35 text-red-300 hover:text-white text-xs font-semibold px-3.5 py-3 rounded-xl"><span>🗑️</span><span class="hidden md:inline">Delete</span></button></div></div>`;
    }).join('');

    banner.innerHTML = `<div class="space-y-3"><div class="flex items-center justify-between bg-[#0d111b] border border-white/10 rounded-2xl px-4 py-2.5"><div class="flex items-center gap-2.5 text-xs"><span class="w-2 h-2 rounded-full bg-emerald-400"></span><span class="font-semibold text-white/90">Your Saved Master Plans</span><span class="px-2 py-0.5 rounded-md bg-white/10 text-white/60 text-[11px] font-bold">${savedPlans.length}</span></div><button onclick="clearAllSavedPlans()" class="flex items-center gap-1.5 text-xs font-semibold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-600/80 border border-red-500/30 px-3.5 py-1.5 rounded-xl"><span>🗑️</span><span>Delete All</span></button></div>${cardsHtml}</div>`;
    banner.classList.remove('hidden');
}

async function planTrip() {
    const homeCity = document.getElementById('homeCity').value.trim();
    const departureCity = document.getElementById('departureCity').value.trim();
    const destinationCountry = document.getElementById('destinationCountry').value.trim() || document.getElementById('quickDestinationInput').value.trim();
    const days = document.getElementById('days').value.trim();
    const hotelBudget = document.getElementById('hotelBudget').value;
    const dailySpendingBudget = document.getElementById('dailySpendingBudget').value;
    const transitStyle = document.getElementById('transitStyle').value;
    const customBudgetNote = document.getElementById('customBudgetNote').value.trim();
    const isFirstTime = document.getElementById('isFirstTime').value;
    const visitedPlaces = document.getElementById('visitedPlaces').value.trim();
    const selectedPlaces = Array.from(selectedPlacesSet);

    if (!homeCity || !departureCity || !destinationCountry || !days) { alert("Please fill in Home City, Departure City, Destination Country, and Tour Days."); return; }
    if (isFirstTime === 'no' && !visitedPlaces) { alert("Please list already-visited places so Gemini excludes them."); return; }

    const errorBanner = document.getElementById('error-banner');
    errorBanner.classList.add('hidden'); errorBanner.innerHTML = '';

    const loader = document.getElementById('loading-overlay'), statusText = document.getElementById('loading-status-text');
    loader.classList.remove('hidden');
    const steps = [`Mapping transit from ${homeCity} to ${departureCity}...`, `Selecting stays in ${destinationCountry}...`, `Balancing ${days} days of food & sights...`, `Finalizing wake-up & transit timings...`];
    let idx = 0; statusText.innerText = steps[0];
    const timer = setInterval(() => { idx = (idx + 1) % steps.length; statusText.innerText = steps[idx]; }, 2500);

    try {
        const data = await authorizedPost('/api/plan-trip', { homeCity, departureCity, destinationCountry, selectedPlaces, days, hotelBudget, dailySpendingBudget, transitStyle, customBudgetNote, isFirstTime, visitedPlaces });
        clearInterval(timer); loader.classList.add('hidden');

        const newPlan = { id: 'plan_' + Date.now(), data, meta: { homeCity, departureCity, destinationCountry, days, places: selectedPlaces, hotelBudget, dailySpendingBudget }, checked: [], favorites: [], notes: {}, createdAt: Date.now() };
        savedPlans.unshift(newPlan);
        if (savedPlans.length > 8) savedPlans = savedPlans.slice(0, 8);
        persistPlansToStorage(); closeWizard(); openItineraryPage(newPlan.id);
    } catch (error) {
        clearInterval(timer); loader.classList.add('hidden');
        errorBanner.innerHTML = `<div class="bg-red-950/80 border border-red-500/50 p-6 rounded-2xl text-red-200 text-sm text-center space-y-2"><div class="font-bold text-red-300 uppercase text-xs">Diagnostic Server Message</div><div class="break-words">${escapeHtml(error.message)}</div></div>`;
        errorBanner.classList.remove('hidden'); errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// =========================================================================
// 11. DEDICATED ITINERARY PAGE RENDERER
// =========================================================================
function renderDedicatedItineraryPage() {
    const summary = currentTripData.summary || {}, stay = summary.recommendedStay || {}, daysList = currentTripData.days || [];

    document.getElementById('btn-remix-blueprint').classList.toggle('hidden', !isViewingBlueprint);
    document.getElementById('btn-edit-trip').classList.toggle('hidden', isViewingBlueprint);
    document.getElementById('hero-plan-type-badge').innerText = isViewingBlueprint ? '⚡ Instant Pre-Planned Blueprint' : 'Gemini AI Master Plan';

    document.getElementById('hero-bg-image').src = COUNTRY_BACKDROPS[currentTripMeta.destinationCountry] || DEFAULT_BACKDROP;
    document.getElementById('hero-trip-title').innerText = summary.tripTitle || `${currentTripMeta.destinationCountry} Expedition`;
    document.getElementById('hero-route-badge').innerText = isViewingBlueprint ? `🌍 ${currentTripMeta.destinationCountry} Curated Route` : `✈️ ${currentTripMeta.departureCity} → ${currentTripMeta.destinationCountry}`;
    document.getElementById('hero-days-badge').innerText = `📅 ${daysList.length} Days`;
    document.getElementById('nav-trip-route').innerText = `${summary.tripTitle || currentTripMeta.destinationCountry} (${daysList.length} Days)`;
    document.getElementById('hero-budget-summary').innerText = summary.budgetStrategySummary || `Stay: ${currentTripMeta.hotelBudget}`;

    document.getElementById('sidebar-hotel-name').innerText = stay.name || 'Recommended Stay';
    document.getElementById('sidebar-hotel-area').innerText = stay.area ? `📍 ${stay.area}` : '';
    document.getElementById('sidebar-hotel-details').innerText = stay.details || '';
    document.getElementById('sidebar-hotel-map').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stay.name || ''} ${stay.area || ''} ${currentTripMeta.destinationCountry}`)}`;

    document.getElementById('sidebar-home-transit').innerText = summary.homeToDepartureTransit || '';
    document.getElementById('sidebar-flight-strategy').innerText = summary.flightStrategy || '';
    document.getElementById('sidebar-local-transit').innerText = summary.localTransportGuide || '';

    let acts = 0, meals = 0, trans = 0;
    daysList.forEach(d => (d.schedule || []).forEach(i => {
        const c = (i.category || '').toLowerCase();
        if (c.includes('meal') || c.includes('food')) meals++;
        else if (c.includes('transit') || c.includes('flight')) trans++;
        else acts++;
    }));
    document.getElementById('stat-activities').innerText = acts;
    document.getElementById('stat-meals').innerText = meals;
    document.getElementById('stat-transit').innerText = trans;

    renderItineraryBudgetMeter();
    renderDayTabs(); updateFilterButtonsUI(); renderTimelineStage(); updateProgressWidget();
}

function renderDayTabs() {
    const daysList = currentTripData.days || [];
    let html = daysList.map((day, idx) => `<button onclick="selectDayTab(${idx})" class="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${activeDayView === idx ? 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}"><span>Day ${day.dayNumber || idx + 1}</span><span class="text-[10px] opacity-75 hidden sm:inline">• ${(day.schedule || []).length} stops</span></button>`).join('');
    html += `<button onclick="selectDayTab('ALL')" class="flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold border ml-auto ${activeDayView === 'ALL' ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}">View All Days</button>`;
    document.getElementById('day-tabs-bar').innerHTML = html;
}

function selectDayTab(t) { activeDayView = t; renderDayTabs(); renderTimelineStage(); }
function setCategoryFilter(f) { activeCategoryFilter = f; updateFilterButtonsUI(); renderTimelineStage(); }

function updateFilterButtonsUI() {
    document.querySelectorAll('.filter-pill').forEach(btn => {
        btn.className = btn.getAttribute('data-filter') === activeCategoryFilter
            ? "filter-pill px-4 py-1.5 rounded-full text-xs font-semibold border bg-blue-600/30 border-blue-400 text-white"
            : "filter-pill px-4 py-1.5 rounded-full text-xs font-medium border bg-white/5 border-white/10 text-white/60 hover:text-white";
    });
}

function renderTimelineStage() {
    const stage = document.getElementById('timeline-stage'), daysList = currentTripData.days || [];
    const daysToRender = activeDayView === 'ALL' ? daysList.map((d, i) => ({ day: d, dayIdx: i })) : (daysList[activeDayView] ? [{ day: daysList[activeDayView], dayIdx: activeDayView }] : []);

    let html = '';
    daysToRender.forEach(({ day, dayIdx }) => {
        const filtered = (day.schedule || []).map((item, itemIdx) => ({ item, itemIdx, key: `${dayIdx}-${itemIdx}` })).filter(({ item, key }) => {
            if (activeCategoryFilter === 'ALL') return true;
            if (activeCategoryFilter === 'FAVORITES') return favoriteStops.has(key);
            return (item.category || '').toLowerCase().includes(activeCategoryFilter.toLowerCase());
        });

        const itemsHtml = !filtered.length
            ? `<div class="bg-[#0d111b] border border-white/10 rounded-2xl p-8 text-center text-sm text-white/50">No stops match <strong class="text-white">${escapeHtml(activeCategoryFilter)}</strong> on Day ${day.dayNumber}.</div>`
            : `<div class="timeline-track space-y-5">` + filtered.map(({ item, itemIdx, key }) => {
                const isChecked = checkedStops.has(key), isFav = favoriteStops.has(key), note = stopNotes[key] || '', style = getCategoryStyle(item.category);
                return `
                    <div class="relative pl-12 panel-animate">
                        <div class="absolute left-0 top-5 w-10 h-10 rounded-2xl ${style.nodeBg} border ${style.nodeBorder} flex items-center justify-center text-base shadow-lg z-10">${style.icon}</div>
                        <div class="print-card bg-[#0e1320] hover:bg-[#131929] border ${isChecked ? 'border-emerald-500/40 opacity-85' : 'border-white/10 hover:border-blue-400/40'} rounded-2xl p-5 transition-all shadow-lg">
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                <div class="flex items-center gap-2.5">
                                    <span class="text-xs font-mono font-bold ${style.timeColor} bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">${escapeHtml(item.time || '')}</span>
                                    <span class="text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-lg border ${style.badgeClass}">${escapeHtml(item.category || 'Stop')}</span>
                                </div>
                                <div class="no-print flex items-center gap-1.5">
                                    <button onclick="openSwapModal(${dayIdx}, ${itemIdx})" title="Swap this single stop with AI" class="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/35 border border-cyan-400/40 text-[11px] font-semibold text-cyan-200 transition-all">🔄 Swap</button>
                                    <button onclick="openStopInMaps(${dayIdx}, ${itemIdx})" class="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-blue-600/30 border border-white/10 text-[11px] text-white/75 hover:text-white transition-all">📍 Maps ↗</button>
                                    <button onclick="toggleFavoriteStop('${key}')" class="w-8 h-7 rounded-lg border flex items-center justify-center text-xs ${isFav ? 'bg-amber-500/25 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-amber-300'}">${isFav ? '★' : '☆'}</button>
                                    <button onclick="toggleCheckedStop('${key}')" class="w-8 h-7 rounded-lg border flex items-center justify-center text-xs font-bold ${isChecked ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-emerald-300'}">✓</button>
                                </div>
                            </div>
                            <h4 class="text-lg font-bold ${isChecked ? 'line-through text-white/60' : 'text-white'} mb-1.5">${escapeHtml(item.title || '')}</h4>
                            <div class="flex flex-wrap items-center gap-2 text-xs mb-3">
                                ${item.location ? `<span class="text-blue-200/80 bg-blue-500/10 px-2.5 py-1 rounded-lg">📍 ${escapeHtml(item.location)}</span>` : ''}
                                ${item.transport ? `<span class="text-cyan-200/80 bg-cyan-500/10 px-2.5 py-1 rounded-lg">🚆 ${escapeHtml(item.transport)}</span>` : ''}
                                ${item.costNote ? `<span class="text-emerald-300/90 bg-emerald-500/10 px-2.5 py-1 rounded-lg">💳 ${escapeHtml(item.costNote)}</span>` : ''}
                            </div>
                            <p class="text-sm text-white/80 leading-relaxed">${escapeHtml(item.description || '')}</p>
                            <div class="no-print mt-3 pt-3 border-t border-white/5">
                                ${note ? `<div class="flex items-start justify-between gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3.5 py-2 mb-2"><p class="text-xs text-amber-200"><strong>📝 Note:</strong> ${escapeHtml(note)}</p><button onclick="toggleNoteEditor('${key}')" class="text-[11px] text-amber-300 hover:underline flex-shrink-0">Edit</button></div>`
                                : `<button onclick="toggleNoteEditor('${key}')" class="text-[11px] text-white/40 hover:text-blue-300">+ Add personal reminder or booking note</button>`}
                                <div id="note-editor-${key}" class="hidden mt-2 flex gap-2"><input type="text" id="note-input-${key}" value="${escapeHtml(note)}" placeholder="Booking note..." onkeydown="if(event.key === 'Enter') saveStopNote('${key}')" class="flex-1 bg-[#090c14] border border-blue-400/40 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"><button onclick="saveStopNote('${key}')" class="bg-blue-600 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg">Save</button></div>
                            </div>
                        </div>
                    </div>`;
            }).join('') + `</div>`;

        html += `<div class="space-y-5"><div class="print-card bg-gradient-to-r from-[#111726] to-[#0c101a] border border-white/10 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl"><div><span class="text-xs uppercase tracking-widest text-blue-400 font-bold">Day ${day.dayNumber || dayIdx + 1}</span><h2 class="text-2xl font-extrabold text-white mt-0.5">${escapeHtml(day.dayTitle || '')}</h2></div><div class="flex items-center gap-3 text-xs"><div class="bg-amber-500/10 border border-amber-400/30 text-amber-200 px-4 py-2 rounded-xl">☀️ Wake: <strong>${escapeHtml(day.wakeUpTime || '07:00 AM')}</strong></div><div class="bg-indigo-500/10 border border-indigo-400/30 text-indigo-200 px-4 py-2 rounded-xl">🌙 Sleep: <strong>${escapeHtml(day.sleepTime || '10:30 PM')}</strong></div></div></div>${itemsHtml}</div>`;
    });

    if (activeDayView !== 'ALL' && daysList.length > 1) {
        const hasPrev = activeDayView > 0, hasNext = activeDayView < daysList.length - 1;
        html += `<div class="no-print flex items-center justify-between pt-4 border-t border-white/10"><button onclick="${hasPrev ? `selectDayTab(${activeDayView - 1}); window.scrollTo({top: 280, behavior: 'smooth'})` : ''}" class="px-5 py-3 rounded-xl text-xs font-semibold border ${hasPrev ? 'bg-white/5 hover:bg-white/15 border-white/15 text-white' : 'opacity-30 border-white/5 text-white/40 cursor-not-allowed'}">← Previous Day</button><span class="text-xs text-white/45">Day ${activeDayView + 1} of ${daysList.length}</span><button onclick="${hasNext ? `selectDayTab(${activeDayView + 1}); window.scrollTo({top: 280, behavior: 'smooth'})` : ''}" class="px-5 py-3 rounded-xl text-xs font-semibold border ${hasNext ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-lg' : 'opacity-30 border-white/5 text-white/40 cursor-not-allowed'}">Next Day →</button></div>`;
    }
    stage.innerHTML = html;
}

function getCategoryStyle(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('meal') || cat.includes('food') || cat.includes('dining')) return { icon: '🍜', nodeBg: 'bg-emerald-950', nodeBorder: 'border-emerald-400/60', timeColor: 'text-emerald-300', badgeClass: 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300' };
    if (cat.includes('transit') || cat.includes('flight') || cat.includes('train')) return { icon: '🚆', nodeBg: 'bg-cyan-950', nodeBorder: 'border-cyan-400/60', timeColor: 'text-cyan-300', badgeClass: 'bg-cyan-500/15 border-cyan-400/35 text-cyan-300' };
    if (cat.includes('stay') || cat.includes('hotel')) return { icon: '🏨', nodeBg: 'bg-amber-950', nodeBorder: 'border-amber-400/60', timeColor: 'text-amber-300', badgeClass: 'bg-amber-500/15 border-amber-400/35 text-amber-300' };
    return { icon: '🧭', nodeBg: 'bg-blue-950', nodeBorder: 'border-blue-400/60', timeColor: 'text-blue-300', badgeClass: 'bg-blue-500/15 border-blue-400/35 text-blue-300' };
}

function toggleCheckedStop(key) { checkedStops.has(key) ? checkedStops.delete(key) : checkedStops.add(key); syncActivePlanChanges(); updateProgressWidget(); renderTimelineStage(); }
function toggleFavoriteStop(key) { favoriteStops.has(key) ? favoriteStops.delete(key) : favoriteStops.add(key); syncActivePlanChanges(); updateProgressWidget(); renderTimelineStage(); }
function toggleNoteEditor(key) { const ed = document.getElementById(`note-editor-${key}`); if (ed) { ed.classList.toggle('hidden'); const inp = document.getElementById(`note-input-${key}`); if (inp && !ed.classList.contains('hidden')) inp.focus(); } }
function saveStopNote(key) { const inp = document.getElementById(`note-input-${key}`); if (!inp) return; const v = inp.value.trim(); if (v) stopNotes[key] = v; else delete stopNotes[key]; syncActivePlanChanges(); renderTimelineStage(); }
function openStopInMaps(dayIdx, itemIdx) { const i = currentTripData?.days?.[dayIdx]?.schedule?.[itemIdx]; if (i) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${i.title || ''} ${i.location || ''} ${currentTripMeta?.destinationCountry || ''}`)}`, '_blank', 'noopener,noreferrer'); }

function updateProgressWidget() {
    let total = 0; (currentTripData?.days || []).forEach(d => total += (d.schedule?.length || 0));
    const done = checkedStops.size, pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById('progress-percent').innerText = `${pct}%`;
    document.getElementById('progress-bar-fill').style.width = `${pct}%`;
    document.getElementById('progress-stops-label').innerText = `${done} / ${total} stops checked`;
    document.getElementById('progress-favs-label').innerText = `★ ${favoriteStops.size} saved`;
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
