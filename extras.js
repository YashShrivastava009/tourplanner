// =========================================================================
// EXTRAS.JS — 3D FLIGHT-ARC REPLAY, VIBE ROULETTE, CULTURAL SWIPE DECK,
//             TRIP TIME-MACHINE & MOVIE/ANIME/HERITAGE PILGRIMAGE ENGINE
// =========================================================================

const MONTHS_LIST = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Built-in coordinate lookup for instant zero-latency 3D flight arcs
const CITY_COORDS = {
    // India Hubs
    "new delhi": { lat: 28.6139, lng: 77.2090, label: "New Delhi" },
    "delhi": { lat: 28.6139, lng: 77.2090, label: "Delhi" },
    "mumbai": { lat: 19.0760, lng: 72.8777, label: "Mumbai" },
    "indore": { lat: 22.7196, lng: 75.8577, label: "Indore" },
    "bhopal": { lat: 23.2599, lng: 77.4126, label: "Bhopal" },
    "sagar": { lat: 23.8388, lng: 78.7378, label: "Sagar" },
    "bengaluru": { lat: 12.9716, lng: 77.5946, label: "Bengaluru" },
    "hyderabad": { lat: 17.3850, lng: 78.4867, label: "Hyderabad" },
    "chennai": { lat: 13.0827, lng: 80.2707, label: "Chennai" },
    "kolkata": { lat: 22.5726, lng: 88.3639, label: "Kolkata" },
    "jaipur": { lat: 26.9124, lng: 75.7873, label: "Jaipur" },
    "goa": { lat: 15.2993, lng: 74.1240, label: "Goa" },
    "kerala": { lat: 9.9312, lng: 76.2673, label: "Kerala" },
    "india": { lat: 28.6139, lng: 77.2090, label: "New Delhi" },
    // Japan
    "japan": { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
    "tokyo": { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
    "mount fuji": { lat: 35.2324, lng: 139.1069, label: "Hakone / Mt. Fuji" },
    "hakone": { lat: 35.2324, lng: 139.1069, label: "Hakone" },
    "kyoto": { lat: 35.0116, lng: 135.7681, label: "Kyoto" },
    "nara": { lat: 34.6851, lng: 135.8048, label: "Nara" },
    "osaka": { lat: 34.6937, lng: 135.5023, label: "Osaka" },
    "hiroshima": { lat: 34.3853, lng: 132.4553, label: "Hiroshima" },
    "sapporo": { lat: 43.0618, lng: 141.3545, label: "Sapporo" },
    // South Korea
    "south korea": { lat: 37.5665, lng: 126.9780, label: "Seoul" },
    "seoul": { lat: 37.5665, lng: 126.9780, label: "Seoul" },
    "gyeongju": { lat: 35.8562, lng: 129.2247, label: "Gyeongju" },
    "busan": { lat: 35.1796, lng: 129.0756, label: "Busan" },
    "jeju": { lat: 33.4996, lng: 126.5312, label: "Jeju Island" },
    // USA
    "united states": { lat: 40.7128, lng: -74.0060, label: "New York" },
    "new york": { lat: 40.7128, lng: -74.0060, label: "New York City" },
    "washington": { lat: 38.9072, lng: -77.0369, label: "Washington D.C." },
    "las vegas": { lat: 36.1699, lng: -115.1398, label: "Las Vegas" },
    "grand canyon": { lat: 36.0544, lng: -112.1401, label: "Grand Canyon" },
    "san francisco": { lat: 37.7749, lng: -122.4194, label: "San Francisco" },
    "los angeles": { lat: 34.0522, lng: -118.2437, label: "Los Angeles" },
    // Switzerland
    "switzerland": { lat: 47.3769, lng: 8.5417, label: "Zurich" },
    "zurich": { lat: 47.3769, lng: 8.5417, label: "Zurich" },
    "lucerne": { lat: 47.0502, lng: 8.3093, label: "Lucerne" },
    "interlaken": { lat: 46.6863, lng: 7.8632, label: "Interlaken" },
    "lauterbrunnen": { lat: 46.5935, lng: 7.9091, label: "Lauterbrunnen" },
    "jungfraujoch": { lat: 46.5475, lng: 7.9851, label: "Jungfraujoch" },
    "zermatt": { lat: 46.0207, lng: 7.7491, label: "Zermatt" },
    "montreux": { lat: 46.4312, lng: 6.9107, label: "Montreux" },
    // Other World Hubs
    "norway": { lat: 69.6492, lng: 18.9553, label: "Tromsø" },
    "oslo": { lat: 59.9139, lng: 10.7522, label: "Oslo" },
    "tromso": { lat: 69.6492, lng: 18.9553, label: "Tromsø" },
    "greece": { lat: 37.9838, lng: 23.7275, label: "Athens" },
    "athens": { lat: 37.9838, lng: 23.7275, label: "Athens" },
    "santorini": { lat: 36.3932, lng: 25.4615, label: "Santorini" },
    "indonesia": { lat: -8.4095, lng: 115.1889, label: "Bali" },
    "bali": { lat: -8.4095, lng: 115.1889, label: "Bali" },
    "thailand": { lat: 13.7563, lng: 100.5018, label: "Bangkok" },
    "bangkok": { lat: 13.7563, lng: 100.5018, label: "Bangkok" },
    "phuket": { lat: 7.8804, lng: 98.3923, label: "Phuket" },
    "italy": { lat: 41.9028, lng: 12.4964, label: "Rome" },
    "rome": { lat: 41.9028, lng: 12.4964, label: "Rome" },
    "venice": { lat: 45.4408, lng: 12.3155, label: "Venice" },
    "florence": { lat: 43.7696, lng: 11.2558, label: "Florence" },
    "france": { lat: 48.8566, lng: 2.3522, label: "Paris" },
    "paris": { lat: 48.8566, lng: 2.3522, label: "Paris" },
    "united arab emirates": { lat: 25.2048, lng: 55.2708, label: "Dubai" },
    "dubai": { lat: 25.2048, lng: 55.2708, label: "Dubai" },
    "united kingdom": { lat: 51.5074, lng: -0.1278, label: "London" },
    "london": { lat: 51.5074, lng: -0.1278, label: "London" },
    "singapore": { lat: 1.3521, lng: 103.8198, label: "Singapore" },
    "vietnam": { lat: 21.0285, lng: 105.8542, label: "Hanoi" },
    "turkey": { lat: 41.0082, lng: 28.9784, label: "Istanbul" },
    "spain": { lat: 41.3874, lng: 2.1686, label: "Barcelona" },
    "germany": { lat: 52.5200, lng: 13.4050, label: "Berlin" },
    "australia": { lat: -33.8688, lng: 151.2093, label: "Sydney" }
};

// State for new modules
let globeReplayTimer = null;
let globeActiveRoutePoints = [];
let rouletteHistory = [];
let lastPilgrimageData = null;

let culturalDeckCards = [];
let culturalDeckIndex = 0;
let culturalDeckLang = "en-US";
let culturalDeckCountry = "Japan";
let culturalDeckSaved = [];

// =========================================================================
// 1. INITIALIZATION & CLEAN HOOKS INTO EXISTING FUNCTIONS
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    initExtrasSelectors();
    refreshGlobeRouteOptions();
});

function initExtrasSelectors() {
    const countryOpts = ALL_COUNTRIES.map(c =>
        `<option value="${escapeHtml(c)}" class="bg-[#0e1422] text-white">${escapeHtml(c)}</option>`
    ).join('');

    const cultureSel = document.getElementById('culture-country-select');
    if (cultureSel) {
        cultureSel.innerHTML = countryOpts;
        cultureSel.value = "Japan";
    }

    const tmCountry = document.getElementById('tm-country-select');
    if (tmCountry) {
        tmCountry.innerHTML = countryOpts;
        tmCountry.value = "Japan";
    }

    const monthOpts = MONTHS_LIST.map(m =>
        `<option value="${m}" class="bg-[#0e1422] text-white">${m}</option>`
    ).join('');

    const tmA = document.getElementById('tm-month-a');
    const tmB = document.getElementById('tm-month-b');
    if (tmA && tmB) {
        tmA.innerHTML = monthOpts;
        tmB.innerHTML = monthOpts;
        tmA.value = "April";
        tmB.value = "November";
    }
}

// Upgrade Travel Shield tab switcher to support all 3 tabs (Hotel BS, Scams, Cultural Deck)
window.switchShieldTab = function (tab) {
    const panels = {
        hotel: document.getElementById('shield-panel-hotel'),
        scam: document.getElementById('shield-panel-scam'),
        culture: document.getElementById('shield-panel-culture')
    };
    const btns = {
        hotel: document.getElementById('shield-tab-hotel'),
        scam: document.getElementById('shield-tab-scam'),
        culture: document.getElementById('shield-tab-culture')
    };

    const inactive = "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all text-white/60 hover:text-white";
    const activeMap = {
        hotel: "px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg",
        scam: "px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-lg",
        culture: "px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
    };

    Object.keys(panels).forEach(k => {
        if (panels[k]) panels[k].classList.toggle('hidden', k !== tab);
        if (btns[k]) btns[k].className = k === tab ? activeMap[k] : inactive;
    });
};

// Wrap closeGlobeView so closing 3D Earth always stops replay & hides HUD panels
const _origCloseGlobeView = window.closeGlobeView;
window.closeGlobeView = function () {
    stopGlobeFlightReplay();
    toggleFlightArcPanel(false);
    toggleVibeRoulettePanel(false);
    if (typeof _origCloseGlobeView === 'function') _origCloseGlobeView();
};

function ensureGlobeReady(callback) {
    openGlobeView();
    let tries = 0;
    const poll = setInterval(() => {
        tries++;
        if (typeof worldGlobe !== 'undefined' && worldGlobe) {
            clearInterval(poll);
            setTimeout(() => callback(worldGlobe), 250);
        } else if (tries > 60) {
            clearInterval(poll);
        }
    }, 150);
}

async function resolveCoordsForPlace(placeName) {
    if (!placeName) return null;
    const clean = String(placeName).toLowerCase().trim();

    // Direct or substring match in built-in database
    if (CITY_COORDS[clean]) return { ...CITY_COORDS[clean] };
    for (const key of Object.keys(CITY_COORDS)) {
        if (clean.includes(key) || key.includes(clean.split(',')[0].trim())) {
            return { ...CITY_COORDS[key], label: placeName.split(',')[0].trim() };
        }
    }

    // Fallback to Open-Meteo free geocoder
    try {
        const searchTerm = placeName.split(',')[0].replace(/\(.*?\)/g, '').trim();
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchTerm)}&count=1&language=en&format=json`);
        const data = await res.json();
        if (data?.results?.[0]) {
            return {
                lat: data.results[0].latitude,
                lng: data.results[0].longitude,
                label: data.results[0].name
            };
        }
    } catch (e) {}
    return null;
}

function getHomeOriginCoord() {
    const dep = document.getElementById('departureCity')?.value.trim();
    const home = document.getElementById('homeCity')?.value.trim();
    const raw = dep || home || "New Delhi";
    const key = raw.split(',')[0].trim().toLowerCase();
    return CITY_COORDS[key] || { lat: 28.6139, lng: 77.2090, label: "New Delhi (Hub)" };
}

// =========================================================================
// 2. FEATURE 1: 3D FLIGHT-ARC REPLAY ON YOUR EARTH
// =========================================================================
function toggleFlightArcPanel(forceState = null) {
    const panel = document.getElementById('globe-arcs-panel');
    if (!panel) return;
    const willOpen = forceState !== null ? forceState : panel.classList.contains('hidden');
    if (willOpen) {
        toggleVibeRoulettePanel(false);
        closeGlobeLauncher();
        refreshGlobeRouteOptions();
        panel.classList.remove('hidden');
        previewSelectedGlobeRoute();
    } else {
        panel.classList.add('hidden');
    }
}

function refreshGlobeRouteOptions() {
    const sel = document.getElementById('globe-route-select');
    if (!sel) return;
    const prev = sel.value;
    let opts = [];

    if (lastPilgrimageData?.stops?.length) {
        opts.push(`<option value="pilgrimage" class="bg-[#0e1422] text-white">🎬 Pilgrimage: ${escapeHtml(lastPilgrimageData.missionTitle)}</option>`);
    }

    if (Array.isArray(savedPlans) && savedPlans.length) {
        savedPlans.forEach(p => {
            const title = p.data?.summary?.tripTitle || p.meta?.destinationCountry || "Saved Plan";
            opts.push(`<option value="saved:${p.id}" class="bg-[#0e1422] text-white">🗺️ Saved: ${escapeHtml(title.slice(0, 40))}</option>`);
        });
    }

    if (Array.isArray(PREPLANNED_TRIPS)) {
        PREPLANNED_TRIPS.forEach(bp => {
            opts.push(`<option value="bp:${bp.id}" class="bg-[#0e1422] text-white">⚡ Blueprint: ${escapeHtml(bp.cardTitle)}</option>`);
        });
    }

    sel.innerHTML = opts.join('');
    if (prev && Array.from(sel.options).some(o => o.value === prev)) sel.value = prev;
}

async function buildRouteWaypoints(routeKey) {
    const origin = getHomeOriginCoord();

    if (routeKey === 'pilgrimage' && lastPilgrimageData?.stops?.length) {
        const pts = [origin];
        lastPilgrimageData.stops.forEach(s => {
            const lat = Number(s.lat), lng = Number(s.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                pts.push({ lat, lng, label: `${s.order}. ${s.realLocation}` });
            }
        });
        return pts;
    }

    if (routeKey.startsWith('bp:')) {
        const bpId = routeKey.slice(3);
        const bp = PREPLANNED_TRIPS.find(b => b.id === bpId);
        if (!bp) return [];
        const pts = [origin];
        for (const place of bp.places) {
            const c = await resolveCoordsForPlace(place);
            if (c) pts.push({ lat: c.lat, lng: c.lng, label: place });
        }
        return pts;
    }

    if (routeKey.startsWith('saved:')) {
        const planId = routeKey.slice(6);
        const plan = savedPlans.find(p => p.id === planId);
        if (!plan) return [];
        const startC = await resolveCoordsForPlace(plan.meta?.departureCity || plan.meta?.homeCity) || origin;
        const pts = [startC];
        const places = (plan.meta?.places && plan.meta.places.length)
            ? plan.meta.places
            : [plan.meta?.destinationCountry];
        for (const place of places) {
            const c = await resolveCoordsForPlace(place);
            if (c) pts.push({ lat: c.lat, lng: c.lng, label: place });
        }
        return pts;
    }

    return [];
}

function drawArcsAndPointsOnGlobe(waypoints) {
    if (!worldGlobe || !waypoints || waypoints.length < 2) return;
    globeActiveRoutePoints = waypoints;

    const arcs = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
        arcs.push({
            startLat: waypoints[i].lat,
            startLng: waypoints[i].lng,
            endLat: waypoints[i + 1].lat,
            endLng: waypoints[i + 1].lng,
            color: i === 0 ? ['#f59e0b', '#38bdf8'] : ['#38bdf8', '#34d399']
        });
    }

    const points = waypoints.map((w, idx) => ({
        lat: w.lat,
        lng: w.lng,
        label: w.label,
        color: idx === 0 ? '#fbbf24' : '#38bdf8'
    }));

    worldGlobe
        .arcsData(arcs)
        .arcColor('color')
        .arcDashLength(0.45)
        .arcDashGap(0.22)
        .arcDashAnimateTime(1700)
        .arcStroke(0.85)
        .arcAltitudeAutoScale(0.38)
        .pointsData(points)
        .pointColor('color')
        .pointAltitude(0.025)
        .pointRadius(0.55)
        .labelsData(points)
        .labelText('label')
        .labelSize(1.25)
        .labelDotRadius(0.35)
        .labelColor(() => '#e0f2fe')
        .labelResolution(2)
        .ringsData([{ lat: waypoints[waypoints.length - 1].lat, lng: waypoints[waypoints.length - 1].lng }])
        .ringColor(() => t => `rgba(56, 189, 248, ${1 - t})`)
        .ringMaxRadius(4.5)
        .ringPropagationSpeed(2.2)
        .ringRepeatPeriod(1100);
}

async function previewSelectedGlobeRoute() {
    const sel = document.getElementById('globe-route-select');
    const status = document.getElementById('globe-replay-status');
    if (!sel || !sel.value) return;

    stopGlobeFlightReplay();
    status.innerText = "Plotting orbital flight corridors...";

    const waypoints = await buildRouteWaypoints(sel.value);
    if (waypoints.length < 2) {
        status.innerText = "Not enough waypoints to plot arcs.";
        return;
    }

    ensureGlobeReady(() => {
        drawArcsAndPointsOnGlobe(waypoints);
        const dest = waypoints[1] || waypoints[0];
        const controls = worldGlobe.controls();
        if (controls) controls.autoRotate = false;
        worldGlobe.pointOfView({ lat: dest.lat, lng: dest.lng, altitude: 2.0 }, 1300);
        status.innerText = `Ready: ${waypoints.length} stops (${waypoints[0].label} → ${waypoints[waypoints.length - 1].label})`;
    });
}

async function playGlobeFlightReplay() {
    const sel = document.getElementById('globe-route-select');
    const status = document.getElementById('globe-replay-status');
    const btn = document.getElementById('globe-play-btn');

    if (!globeActiveRoutePoints.length && sel?.value) {
        globeActiveRoutePoints = await buildRouteWaypoints(sel.value);
    }
    if (globeActiveRoutePoints.length < 2) return;

    stopGlobeFlightReplay();
    ensureGlobeReady(() => {
        drawArcsAndPointsOnGlobe(globeActiveRoutePoints);
        const controls = worldGlobe.controls();
        if (controls) controls.autoRotate = false;

        let step = 0;
        btn.innerText = "✈ Flying...";

        const flyNext = () => {
            if (step >= globeActiveRoutePoints.length) {
                btn.innerText = "▶ Replay Route";
                status.innerText = `✓ Mission complete! Landed at ${globeActiveRoutePoints[globeActiveRoutePoints.length - 1].label}`;
                globeReplayTimer = null;
                return;
            }

            const wp = globeActiveRoutePoints[step];
            const prev = step > 0 ? globeActiveRoutePoints[step - 1] : null;
            const alt = step === 0 ? 2.15 : 1.45;

            status.innerText = prev
                ? `Leg ${step}/${globeActiveRoutePoints.length - 1}: ✈ ${prev.label} → ${wp.label}`
                : `Takeoff Hub: 🛫 ${wp.label}`;

            worldGlobe
                .ringsData([{ lat: wp.lat, lng: wp.lng }])
                .ringColor(() => t => `rgba(251, 191, 36, ${1 - t})`)
                .ringMaxRadius(5)
                .ringPropagationSpeed(2.5)
                .ringRepeatPeriod(900);

            worldGlobe.pointOfView({ lat: wp.lat, lng: wp.lng, altitude: alt }, 1700);
            step++;
            globeReplayTimer = setTimeout(flyNext, 2600);
        };

        flyNext();
    });
}

function stopGlobeFlightReplay() {
    if (globeReplayTimer) {
        clearTimeout(globeReplayTimer);
        globeReplayTimer = null;
    }
    const btn = document.getElementById('globe-play-btn');
    if (btn) btn.innerText = "▶ Play Route";
}

function clearGlobeArcs() {
    stopGlobeFlightReplay();
    globeActiveRoutePoints = [];
    if (worldGlobe) {
        worldGlobe.arcsData([]).pointsData([]).labelsData([]).ringsData([]);
        const controls = worldGlobe.controls();
        if (controls) controls.autoRotate = true;
    }
    const status = document.getElementById('globe-replay-status');
    if (status) status.innerText = "Cleared. Pick any route above to plot again.";
}

function replayCurrentItineraryIn3D() {
    if (!currentTripMeta) return;
    ensureGlobeReady(async () => {
        toggleFlightArcPanel(true);
        refreshGlobeRouteOptions();
        const sel = document.getElementById('globe-route-select');

        if (isViewingBlueprint && activeBlueprintId) {
            sel.value = `bp:${activeBlueprintId}`;
            await previewSelectedGlobeRoute();
            playGlobeFlightReplay();
        } else if (activePlanId) {
            sel.value = `saved:${activePlanId}`;
            await previewSelectedGlobeRoute();
            playGlobeFlightReplay();
        }
    });
}

// =========================================================================
// 3. FEATURE 2: 3D EARTH "VIBE ROULETTE" SPIN-THE-GLOBE
// =========================================================================
function toggleVibeRoulettePanel(forceState = null) {
    const panel = document.getElementById('globe-roulette-panel');
    if (!panel) return;
    const willOpen = forceState !== null ? forceState : panel.classList.contains('hidden');
    if (willOpen) {
        toggleFlightArcPanel(false);
        closeGlobeLauncher();
        panel.classList.remove('hidden');
        document.getElementById('roulette-vibe-input')?.focus();
    } else {
        panel.classList.add('hidden');
    }
}

function selectRouletteVibe(vibeText) {
    const input = document.getElementById('roulette-vibe-input');
    if (input) input.value = vibeText;
    spinVibeRoulette();
}

async function spinVibeRoulette() {
    const input = document.getElementById('roulette-vibe-input');
    const btn = document.getElementById('roulette-spin-btn');
    const resultCard = document.getElementById('roulette-result-card');
    const vibe = (input?.value || '').trim() || "Unexpected breathtaking adventure with unforgettable food";
    const homeCity = document.getElementById('homeCity')?.value.trim() || "India";
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const orig = btn.innerText;
    btn.disabled = true;
    btn.innerText = "🌀 Spinning...";

    // Kick the 3D globe into dramatic roulette spin speed!
    stopGlobeFlightReplay();
    if (worldGlobe) {
        const controls = worldGlobe.controls();
        if (controls) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 16;
        }
        worldGlobe.pointOfView({ altitude: 2.55 }, 700);
    }

    resultCard.innerHTML = `
        <div class="bg-purple-950/35 border border-purple-400/35 rounded-2xl p-5 text-center space-y-2 panel-animate">
            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400 mx-auto"></div>
            <p class="text-xs font-bold text-purple-200">Spinning the globe to match your mood...</p>
        </div>`;

    try {
        const data = await authorizedPost('/api/vibe-roulette', {
            vibe,
            homeCity,
            currentMonth,
            excludeCountries: rouletteHistory.slice(-5)
        });

        const country = normalizeCountryName(data.country || "Japan");
        if (!rouletteHistory.includes(country)) rouletteHistory.push(country);

        const lat = Number(data.lat) || 35.6762;
        const lng = Number(data.lng) || 139.6503;
        const origin = getHomeOriginCoord();

        // Brake the spin and zoom smoothly onto the surprise country!
        if (worldGlobe) {
            const controls = worldGlobe.controls();
            if (controls) {
                controls.autoRotate = false;
                controls.autoRotateSpeed = 0.45;
            }

            worldGlobe
                .arcsData([{ startLat: origin.lat, startLng: origin.lng, endLat: lat, endLng: lng, color: ['#c084fc', '#f472b6'] }])
                .arcColor('color')
                .arcDashLength(0.5)
                .arcDashGap(0.2)
                .arcDashAnimateTime(1400)
                .arcStroke(1.0)
                .pointsData([{ lat, lng, label: `${data.hubCity}, ${country}`, color: '#f472b6' }])
                .pointColor('color')
                .pointAltitude(0.04)
                .pointRadius(0.75)
                .labelsData([{ lat, lng, label: `${data.hubCity}, ${country}` }])
                .labelText('label')
                .labelSize(1.5)
                .labelColor(() => '#f5d0fe')
                .ringsData([{ lat, lng }])
                .ringColor(() => t => `rgba(244, 114, 182, ${1 - t})`)
                .ringMaxRadius(6)
                .ringPropagationSpeed(2.4)
                .ringRepeatPeriod(950);

            worldGlobe.pointOfView({ lat, lng, altitude: 1.5 }, 1800);
        }

        const spotsAttr = JSON.stringify(data.bestSpots || []).replace(/"/g, '&quot;');
        resultCard.innerHTML = `
            <div class="bg-[#16132b] border border-purple-400/50 rounded-2xl p-4 space-y-3 panel-animate shadow-xl">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <span class="text-[10px] uppercase tracking-widest text-pink-300 font-bold">🎯 Globe Landed On</span>
                        <h4 class="text-xl font-extrabold text-white leading-tight">${escapeHtml(country)}</h4>
                        <p class="text-xs text-purple-200 font-medium">${escapeHtml(data.hubCity || '')} • ${escapeHtml(data.tagline || '')}</p>
                    </div>
                </div>
                <p class="text-xs text-white/85 leading-relaxed">${escapeHtml(data.whyItFits || '')}</p>
                ${data.signatureMoment ? `<div class="bg-purple-500/15 border border-purple-400/25 rounded-xl p-2.5 text-[11px] text-purple-100"><strong>✨ Signature Moment:</strong> ${escapeHtml(data.signatureMoment)}</div>` : ''}
                ${data.budgetFeel ? `<div class="text-[11px] text-emerald-300 font-medium">💳 ${escapeHtml(data.budgetFeel)}</div>` : ''}
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button onclick="closeGlobeView(); quickSelectCountry('${country.replace(/'/g, "\\'")}', ${spotsAttr})" class="py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg">✈️ Plan This Trip</button>
                    <button onclick="spinVibeRoulette()" class="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-purple-500/30 border border-purple-400/35 text-purple-100 text-xs font-bold">🎲 Spin Again</button>
                </div>
            </div>`;
    } catch (err) {
        if (worldGlobe?.controls()) worldGlobe.controls().autoRotateSpeed = 0.45;
        resultCard.innerHTML = `<div class="bg-red-950/70 border border-red-500/40 rounded-2xl p-4 text-xs text-red-200 text-center">${escapeHtml(err.message)}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = orig;
    }
}

// =========================================================================
// 4. FEATURE 3: SWIPEABLE CULTURAL TABOO & SURVIVAL SLANG DECK
// =========================================================================
function quickLoadCulturalDeck(country) {
    const sel = document.getElementById('culture-country-select');
    if (sel) sel.value = country;
    runCulturalDeck();
}

async function runCulturalDeck() {
    const country = document.getElementById('culture-country-select')?.value || "Japan";
    const btn = document.getElementById('culture-load-btn');
    const stage = document.getElementById('culture-deck-stage');

    const orig = btn.innerText;
    btn.disabled = true;
    btn.innerText = "🃏 Dealing...";

    stage.innerHTML = `
        <div class="bg-[#0d111b] border border-purple-500/30 rounded-3xl p-12 text-center space-y-3 panel-animate">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-400 mx-auto"></div>
            <p class="text-sm font-bold text-white">Dealing 10 Local Taboos &amp; Street Slang Cards for ${escapeHtml(country)}...</p>
        </div>`;

    try {
        const data = await authorizedPost('/api/cultural-deck', { country });
        culturalDeckCards = Array.isArray(data.cards) ? data.cards : [];
        culturalDeckIndex = 0;
        culturalDeckLang = data.langCode || COUNTRY_LANG_CODES[country] || 'en-US';
        culturalDeckCountry = country;
        culturalDeckSaved = [];
        renderCulturalDeckCard();
    } catch (err) {
        stage.innerHTML = `<div class="bg-red-950/70 border border-red-500/50 rounded-3xl p-6 text-center text-sm text-red-200">${escapeHtml(err.message)}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerText = orig;
    }
}

function renderCulturalDeckCard() {
    const stage = document.getElementById('culture-deck-stage');
    if (!stage) return;

    if (!culturalDeckCards.length) {
        stage.innerHTML = `<div class="bg-[#0d111b] border border-white/10 rounded-3xl p-8 text-center text-sm text-white/50">No cards returned. Try dealing again.</div>`;
        return;
    }

    // Finished deck -> show cheat-sheet summary
    if (culturalDeckIndex >= culturalDeckCards.length) {
        stage.innerHTML = `
            <div class="bg-[#0d111b] border border-purple-500/35 rounded-3xl p-6 md:p-8 panel-animate space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                        <span class="text-[11px] uppercase tracking-widest text-emerald-300 font-bold">✓ Deck Complete • ${escapeHtml(culturalDeckCountry)}</span>
                        <h3 class="text-2xl font-extrabold text-white mt-0.5">Your Street-Smart Cheat Sheet (${culturalDeckSaved.length} Saved)</h3>
                    </div>
                    <button onclick="culturalDeckIndex = 0; culturalDeckSaved = []; renderCulturalDeckCard();" class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg">↻ Replay Deck</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    ${(culturalDeckSaved.length ? culturalDeckSaved : culturalDeckCards).map((c, idx) => `
                        <div class="bg-[#141926] border border-white/10 rounded-2xl p-4 space-y-1.5">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${c.type === 'TABOO' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'}">${escapeHtml(c.tag || c.type)}</span>
                                ${c.nativeScript ? `<button onclick="speakCulturalPhrase('${c.nativeScript.replace(/'/g, "\\'")}')" class="text-[11px] px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 font-bold">🔊 Speak</button>` : ''}
                            </div>
                            <h4 class="text-sm font-bold text-white">${escapeHtml(c.title)}</h4>
                            ${c.nativeScript ? `<div class="text-base font-extrabold text-cyan-200">${escapeHtml(c.nativeScript)} <span class="text-xs font-mono text-white/60">(${escapeHtml(c.pronunciation || '')})</span></div>` : ''}
                            <p class="text-xs text-white/75 leading-relaxed">${escapeHtml(c.explanation)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        return;
    }

    const card = culturalDeckCards[culturalDeckIndex];
    const isTaboo = (card.type || '').toUpperCase() === 'TABOO';
    const progressPct = Math.round(((culturalDeckIndex + 1) / culturalDeckCards.length) * 100);
    const nextCard = culturalDeckCards[culturalDeckIndex + 1];

    stage.innerHTML = `
        <div class="max-w-xl mx-auto space-y-5 panel-animate">
            <!-- Progress Counter -->
            <div class="flex items-center justify-between text-xs px-1">
                <span class="text-white/60 font-semibold">${escapeHtml(culturalDeckCountry)} Deck • Card <strong class="text-white">${culturalDeckIndex + 1}</strong> / ${culturalDeckCards.length}</span>
                <span class="text-amber-300 font-bold">★ ${culturalDeckSaved.length} Saved</span>
            </div>
            <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-300" style="width: ${progressPct}%"></div>
            </div>

            <!-- Stacked Swipeable Card Stage -->
            <div class="deck-stage">
                ${nextCard ? `
                    <div class="absolute inset-x-4 top-4 bottom-0 rounded-3xl bg-[#0e121e] border border-white/10 opacity-45 scale-95 pointer-events-none"></div>
                ` : ''}

                <div id="active-swipe-card" class="swipe-card relative z-10 rounded-3xl p-7 md:p-8 border-2 shadow-[0_25px_70px_rgba(0,0,0,0.85)] cursor-grab ${
                    isTaboo
                    ? 'bg-gradient-to-br from-[#23101a] via-[#130d18] to-[#0c0d16] border-rose-500/50'
                    : 'bg-gradient-to-br from-[#0e1d2b] via-[#0e1526] to-[#0c0e18] border-cyan-400/50'
                }">
                    <div class="flex items-center justify-between gap-2 mb-5">
                        <span class="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border ${
                            isTaboo ? 'bg-rose-500/20 border-rose-400/50 text-rose-200' : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                        }">
                            ${isTaboo ? '🚫 ' : '🗣️ '}${escapeHtml(card.tag || card.type)}
                        </span>
                        <span class="text-[11px] text-white/40 font-mono">Drag left or right ↔</span>
                    </div>

                    <h3 class="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-4">${escapeHtml(card.title || '')}</h3>

                    ${card.nativeScript ? `
                        <div class="bg-black/45 border border-cyan-400/30 rounded-2xl p-5 mb-5 flex items-center justify-between gap-4">
                            <div class="min-w-0">
                                <div class="text-2xl md:text-3xl font-black text-cyan-200 leading-snug">${escapeHtml(card.nativeScript)}</div>
                                ${card.pronunciation ? `<div class="text-sm font-mono text-white/75 mt-1">"${escapeHtml(card.pronunciation)}"</div>` : ''}
                            </div>
                            <button type="button" onclick="event.stopPropagation(); speakCulturalPhrase('${card.nativeScript.replace(/'/g, "\\'")}')" class="w-12 h-12 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-lg font-bold flex items-center justify-center shadow-lg flex-shrink-0 transition-all" title="Listen to pronunciation">
                                🔊
                            </button>
                        </div>
                    ` : ''}

                    <p class="text-sm md:text-base text-white/85 leading-relaxed mb-5">${escapeHtml(card.explanation || '')}</p>

                    ${card.proTip ? `
                        <div class="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs text-amber-200 leading-relaxed">
                            <strong>💡 Street-Smart Tip:</strong> ${escapeHtml(card.proTip)}
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- Swipe Action Buttons -->
            <div class="flex items-center justify-center gap-4 pt-2">
                <button onclick="swipeCulturalCard('left')" class="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/50 text-xs font-bold text-white/80 hover:text-rose-200 transition-all">
                    ← Next Card
                </button>
                <button onclick="swipeCulturalCard('right')" class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-extrabold text-white shadow-lg transition-all">
                    ★ Save to Cheat Sheet →
                </button>
            </div>
        </div>`;

    attachCardDragHandlers();
}

function attachCardDragHandlers() {
    const el = document.getElementById('active-swipe-card');
    if (!el) return;

    let startX = 0, currentX = 0, isDragging = false;

    const onDown = (e) => {
        if (e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        currentX = 0;
        el.classList.add('dragging');
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        currentX = x - startX;
        el.style.transform = `translateX(${currentX}px) rotate(${currentX * 0.05}deg)`;
    };

    const onUp = () => {
        if (!isDragging) return;
        isDragging = false;
        el.classList.remove('dragging');
        if (currentX > 95) swipeCulturalCard('right');
        else if (currentX < -95) swipeCulturalCard('left');
        else el.style.transform = '';
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: false });

    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onUp);
}

function swipeCulturalCard(dir) {
    const el = document.getElementById('active-swipe-card');
    const currentCard = culturalDeckCards[culturalDeckIndex];
    if (dir === 'right' && currentCard && !culturalDeckSaved.includes(currentCard)) {
        culturalDeckSaved.push(currentCard);
    }

    if (el) {
        el.classList.add(dir === 'right' ? 'fly-right' : 'fly-left');
        setTimeout(() => {
            culturalDeckIndex++;
            renderCulturalDeckCard();
        }, 260);
    } else {
        culturalDeckIndex++;
        renderCulturalDeckCard();
    }
}

function speakCulturalPhrase(text) {
    if (!text || !('speechSynthesis' in window)) {
        alert("Speech playback is not supported in this browser.");
        return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = culturalDeckLang;
    utter.rate = 0.88;
    window.speechSynthesis.speak(utter);
}

// =========================================================================
// 5. FEATURE 4: DISCOVERY LAB — TRIP TIME-MACHINE (MONTH A VS MONTH B)
// =========================================================================
function switchDiscoveryTab(tab) {
    const tmPanel = document.getElementById('disc-panel-timemachine');
    const pilPanel = document.getElementById('disc-panel-pilgrimage');
    const tmBtn = document.getElementById('disc-tab-timemachine');
    const pilBtn = document.getElementById('disc-tab-pilgrimage');

    if (tab === 'timemachine') {
        tmPanel.classList.remove('hidden'); pilPanel.classList.add('hidden');
        tmBtn.className = "px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg";
        pilBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold transition-all text-white/60 hover:text-white";
    } else {
        pilPanel.classList.remove('hidden'); tmPanel.classList.add('hidden');
        pilBtn.className = "px-4 py-2 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg";
        tmBtn.className = "px-4 py-2 rounded-xl text-xs font-semibold transition-all text-white/60 hover:text-white";
    }
}

function quickTimeMachine(country, monthA, monthB) {
    document.getElementById('tm-country-select').value = country;
    document.getElementById('tm-month-a').value = monthA;
    document.getElementById('tm-month-b').value = monthB;
    runTimeMachine();
}

async function runTimeMachine() {
    const country = document.getElementById('tm-country-select').value;
    const monthA = document.getElementById('tm-month-a').value;
    const monthB = document.getElementById('tm-month-b').value;
    const homeCity = document.getElementById('homeCity')?.value.trim() || "India";
    const resultEl = document.getElementById('tm-result');
    const btn = document.getElementById('tm-run-btn');

    if (monthA === monthB) {
        alert("Pick two different months to compare!");
        return;
    }

    const orig = btn.innerText; btn.disabled = true; btn.innerText = "⏳ Warping Time...";
    resultEl.innerHTML = `
        <div class="bg-[#0d111b] border border-cyan-500/30 rounded-3xl p-10 text-center space-y-3 panel-animate">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
            <p class="text-sm font-bold text-white">Simulating ${escapeHtml(country)} in ${escapeHtml(monthA)} vs. ${escapeHtml(monthB)}...</p>
        </div>`;

    try {
        const data = await authorizedPost('/api/time-machine', { country, monthA, monthB, homeCity });
        renderTimeMachineResult(data, country);
    } catch (err) {
        resultEl.innerHTML = `<div class="bg-red-950/70 border border-red-500/50 rounded-3xl p-6 text-center text-sm text-red-200">${escapeHtml(err.message)}</div>`;
    } finally {
        btn.disabled = false; btn.innerText = orig;
    }
}

function renderTimeMachineResult(data, country) {
    const resultEl = document.getElementById('tm-result');
    const a = data.monthA || {}, b = data.monthB || {};
    const winner = data.winnerMonth || a.name;

    const renderMonthCard = (m, accent) => {
        const isWin = (m.name || '').toLowerCase() === (winner || '').toLowerCase();
        const crowd = Math.min(Math.max(Number(m.crowdScore) || 5, 1), 10);
        const surge = Math.min(Math.max(Number(m.priceSurgeScore) || 5, 1), 10);
        const bdr = accent === 'blue' ? 'border-blue-500/40' : 'border-amber-500/40';
        const txt = accent === 'blue' ? 'text-blue-300' : 'text-amber-300';

        return `
            <div class="bg-[#0d111b] border ${bdr} rounded-3xl p-6 space-y-4 shadow-xl">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <span class="text-[11px] uppercase tracking-widest ${txt} font-bold">${escapeHtml(m.vibeLabel || '')}</span>
                        <h4 class="text-2xl font-extrabold text-white">${escapeHtml(m.name || '')}</h4>
                    </div>
                    ${isWin ? `<span class="px-3 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase">🏆 Better Month</span>` : ''}
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="bg-white/5 rounded-2xl p-3.5"><strong class="text-white/50 block text-[10px] uppercase mb-1">🌤️ Weather Reality</strong><span class="text-white/90">${escapeHtml(m.weather || '')}</span></div>
                    <div class="bg-white/5 rounded-2xl p-3.5"><strong class="text-white/50 block text-[10px] uppercase mb-1">☀️ Daylight Hours</strong><span class="text-white/90">${escapeHtml(m.daylight || '')}</span></div>
                </div>

                <div class="space-y-3 bg-black/35 border border-white/10 rounded-2xl p-4 text-xs">
                    <div>
                        <div class="flex justify-between mb-1"><span class="text-white/70">👥 Tourist Crowd Crush</span><span class="font-bold ${crowd >= 8 ? 'text-rose-400' : crowd <= 4 ? 'text-emerald-400' : 'text-amber-300'}">${crowd}/10</span></div>
                        <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div class="h-full ${crowd >= 8 ? 'bg-rose-500' : crowd <= 4 ? 'bg-emerald-500' : 'bg-amber-400'}" style="width:${crowd * 10}%"></div></div>
                    </div>
                    <div>
                        <div class="flex justify-between mb-1"><span class="text-white/70">💸 Hotel &amp; Flight Price Surge</span><span class="font-bold ${surge >= 8 ? 'text-rose-400' : surge <= 4 ? 'text-emerald-400' : 'text-amber-300'}">${surge}/10</span></div>
                        <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div class="h-full ${surge >= 8 ? 'bg-rose-500' : surge <= 4 ? 'bg-emerald-500' : 'bg-amber-400'}" style="width:${surge * 10}%"></div></div>
                    </div>
                </div>

                ${Array.isArray(m.festivals) && m.festivals.length ? `
                    <div class="text-xs"><span class="text-[10px] uppercase tracking-wider text-purple-300 font-bold block mb-1.5">🎉 Festivals &amp; Seasonal Events</span>
                    <div class="flex flex-wrap gap-1.5">${m.festivals.map(f => `<span class="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-400/30 text-purple-200">${escapeHtml(f)}</span>`).join('')}</div></div>` : ''}

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div class="bg-emerald-950/35 border border-emerald-500/30 rounded-2xl p-3.5"><strong class="text-emerald-300 block mb-1">✅ Best For</strong><span class="text-emerald-100/85">${escapeHtml(m.bestFor || '')}</span></div>
                    <div class="bg-rose-950/35 border border-rose-500/30 rounded-2xl p-3.5"><strong class="text-rose-300 block mb-1">⚠️ Watch Out</strong><span class="text-rose-100/85">${escapeHtml(m.biggestCatch || '')}</span></div>
                </div>
            </div>`;
    };

    resultEl.innerHTML = `
        <div class="panel-animate space-y-5">
            <div class="bg-gradient-to-r from-cyan-950/60 via-[#121829] to-blue-950/50 border border-cyan-400/40 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
                <div class="max-w-3xl space-y-1">
                    <span class="text-[11px] uppercase tracking-widest text-cyan-300 font-extrabold">⏳ Time-Machine Verdict • Winner: ${escapeHtml(winner)}</span>
                    <h3 class="text-xl font-extrabold text-white">${escapeHtml(data.headline || `${country}: ${a.name} vs ${b.name}`)}</h3>
                    <p class="text-sm text-white/85 leading-relaxed">${escapeHtml(data.winnerReason || '')}</p>
                </div>
                <button onclick="quickSelectCountry('${country.replace(/'/g, "\\'")}')" class="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex-shrink-0">
                    Plan ${escapeHtml(country)} for ${escapeHtml(winner)} →
                </button>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                ${renderMonthCard(a, 'blue')}
                ${renderMonthCard(b, 'amber')}
            </div>
        </div>`;
}

// =========================================================================
// 6. FEATURE 5: DISCOVERY LAB — MOVIE, ANIME & HERITAGE PILGRIMAGE MODE
// =========================================================================
function quickPilgrimage(theme) {
    document.getElementById('pilgrimage-theme-input').value = theme;
    runPilgrimageRoute();
}

async function runPilgrimageRoute() {
    const theme = document.getElementById('pilgrimage-theme-input').value.trim();
    const btn = document.getElementById('pilgrimage-run-btn');
    const resultEl = document.getElementById('pilgrimage-result');

    if (!theme) {
        alert("Type any movie, anime, K-drama, or heritage theme—or click one of the instant themes!");
        return;
    }

    const orig = btn.innerText; btn.disabled = true; btn.innerText = "🎬 Scouting Locations...";
    resultEl.innerHTML = `
        <div class="bg-[#0d111b] border border-purple-500/30 rounded-3xl p-10 text-center space-y-3 panel-animate">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-400 mx-auto"></div>
            <p class="text-sm font-bold text-white">Scouting real-world coordinates &amp; scene-to-reality framing angles...</p>
        </div>`;

    try {
        const data = await authorizedPost('/api/pilgrimage-route', { theme });
        lastPilgrimageData = data;
        renderPilgrimageResult(data);
    } catch (err) {
        resultEl.innerHTML = `<div class="bg-red-950/70 border border-red-500/50 rounded-3xl p-6 text-center text-sm text-red-200">${escapeHtml(err.message)}</div>`;
    } finally {
        btn.disabled = false; btn.innerText = orig;
    }
}

function renderPilgrimageResult(data) {
    const resultEl = document.getElementById('pilgrimage-result');
    const stops = Array.isArray(data.stops) ? data.stops : [];
    const country = normalizeCountryName(data.country || "Japan");
    const stopNamesAttr = JSON.stringify(stops.map(s => s.city || s.realLocation).slice(0, 5)).replace(/"/g, '&quot;');

    resultEl.innerHTML = `
        <div class="panel-animate space-y-5">
            <!-- Mission Banner -->
            <div class="bg-gradient-to-r from-purple-950/60 via-[#151226] to-pink-950/45 border border-purple-400/45 rounded-3xl p-6 md:p-7 shadow-2xl space-y-4">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div class="space-y-1.5 max-w-3xl">
                        <span class="text-[10px] uppercase tracking-widest text-pink-300 font-extrabold">🎬 Pilgrimage Mission • ${escapeHtml(country)} • ${escapeHtml(data.daysSuggested || 5)} Days</span>
                        <h3 class="text-2xl md:text-3xl font-extrabold text-white">${escapeHtml(data.missionTitle || data.themeName)}</h3>
                        ${data.heroQuote ? `<p class="text-xs italic text-purple-200">"${escapeHtml(data.heroQuote)}"</p>` : ''}
                        <p class="text-sm text-white/80 leading-relaxed pt-1">${escapeHtml(data.overview || '')}</p>
                    </div>
                    <div class="flex flex-wrap gap-2.5 flex-shrink-0">
                        <button onclick="flyPilgrimageIn3D()" class="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all">
                            🌍 Fly Route in 3D
                        </button>
                        <button onclick="quickSelectCountry('${country.replace(/'/g, "\\'")}', ${stopNamesAttr})" class="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all">
                            ✈️ Build Full Plan →
                        </button>
                    </div>
                </div>
            </div>

            <!-- 6 Real-World Scene Locations -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${stops.map((s, idx) => {
                    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.realLocation || ''} ${s.city || ''} ${country}`)}`;
                    return `
                        <div class="bg-[#0d111b] border border-white/10 hover:border-purple-400/50 rounded-3xl p-5 flex flex-col justify-between space-y-3.5 transition-all shadow-xl">
                            <div class="space-y-2.5">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-400/35 text-[10px] font-black uppercase text-purple-200">Stop ${s.order || idx + 1} • ${escapeHtml(s.dayLabel || '')}</span>
                                    <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-blue-600/35 border border-white/10 text-white/75 hover:text-white transition-all">📍 Maps ↗</a>
                                </div>
                                <div>
                                    <h4 class="text-base font-extrabold text-white leading-snug">${escapeHtml(s.realLocation || '')}</h4>
                                    <p class="text-xs text-purple-300/80 mt-0.5">📍 ${escapeHtml(s.city || country)}</p>
                                </div>
                                <p class="text-xs text-white/80 leading-relaxed"><strong class="text-pink-300">Scene / Story:</strong> ${escapeHtml(s.sceneConnection || '')}</p>
                                ${s.photoTip ? `<div class="bg-amber-950/30 border border-amber-500/25 rounded-xl p-3 text-[11px] text-amber-100/90"><strong>📸 Shot Framing:</strong> ${escapeHtml(s.photoTip)}</div>` : ''}
                            </div>
                            <div class="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/55">
                                <span class="truncate">🚆 ${escapeHtml(s.transitTip || '')}</span>
                                <span class="text-emerald-300 font-semibold flex-shrink-0">${escapeHtml(s.costNote || 'Free')}</span>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>`;
}

function flyPilgrimageIn3D() {
    if (!lastPilgrimageData?.stops?.length) return;
    ensureGlobeReady(async () => {
        toggleFlightArcPanel(true);
        refreshGlobeRouteOptions();
        const sel = document.getElementById('globe-route-select');
        if (sel) sel.value = 'pilgrimage';
        await previewSelectedGlobeRoute();
        playGlobeFlightReplay();
    });
}
