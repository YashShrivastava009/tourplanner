const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory 30-minute cache for instant repeat country lookups
const responseCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(key) {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
        responseCache.delete(key);
        return null;
    }
    return entry.value;
}

function setCached(key, value) {
    if (responseCache.size > 200) {
        const firstKey = responseCache.keys().next().value;
        responseCache.delete(firstKey);
    }
    responseCache.set(key, { value, ts: Date.now() });
}

function getExpectedPassword() {
    return (process.env.SITE_PASSWORD || 'mysecretpassword').trim();
}

const checkPassword = (req, res, next) => {
    const incoming = (req.headers['x-site-password'] || '').trim();
    if (incoming && incoming === getExpectedPassword()) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid stealth access code' });
    }
};

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing in your Render Environment Variables.');
    }
    return new GoogleGenAI({ apiKey });
}

function withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`TIMEOUT: ${label} exceeded ${ms / 1000}s`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Fast Gemini caller: prioritizes ultra-fast Flash-Lite, minimizes thinking delay, fails over fast
async function generateJsonWithGemini(ai, prompt, maxOutputTokens = 4096) {
    const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest'
    ];
    let lastError = null;
    let sawHighDemand = false;

    for (let i = 0; i < candidateModels.length; i++) {
        const modelName = candidateModels[i];
        const isLite = modelName.includes('lite');

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const config = {
                    responseMimeType: "application/json",
                    maxOutputTokens
                };

                // Minimize internal thinking latency on Gemini 3 models
                if (attempt === 1 && modelName.includes('gemini-3')) {
                    config.thinkingConfig = {
                        thinkingLevel: isLite ? 'MINIMAL' : 'LOW'
                    };
                }

                const response = await withTimeout(
                    ai.models.generateContent({ model: modelName, contents: prompt, config }),
                    35000,
                    modelName
                );
                return response;
            } catch (err) {
                lastError = err;
                const msg = err && err.message ? err.message : JSON.stringify(err);

                // If a model rejects thinkingConfig, retry immediately without it
                if (attempt === 1 && (msg.includes('thinking') || msg.includes('INVALID_ARGUMENT') || msg.includes('400'))) {
                    continue;
                }

                if (msg.includes('TIMEOUT')) {
                    console.warn(`${modelName} timed out. Switching to next fast model...`);
                    break;
                }

                const isBusy =
                    msg.includes('503') ||
                    msg.includes('UNAVAILABLE') ||
                    msg.toLowerCase().includes('high demand') ||
                    msg.toLowerCase().includes('overloaded');

                if (isBusy) {
                    sawHighDemand = true;
                    if (attempt === 1) {
                        await sleep(1200);
                        continue;
                    }
                    break;
                }

                if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available')) {
                    break;
                }

                if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                    throw new Error('Free-tier API rate limit reached. Please wait 30 seconds and try again.');
                }

                throw err;
            }
        }
    }

    if (sawHighDemand) {
        throw new Error('Google Gemini servers are temporarily busy. Please try again in 15 seconds.');
    }

    throw lastError;
}

function parseCleanJson(response) {
    let rawText = typeof response.text === 'function' ? response.text() : response.text;
    if (!rawText) throw new Error('Gemini returned an empty response. Please try again.');
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(rawText);
}

// ROUTE 0: Verify Stealth Invite Code
app.post('/api/verify-access', (req, res) => {
    const code = (req.body?.password || '').trim();
    if (code && code === getExpectedPassword()) return res.json({ ok: true });
    return res.status(401).json({ ok: false, error: 'Incorrect stealth access code.' });
});

// ROUTE 1: Place Recommender
app.post('/api/recommend-places', checkPassword, async (req, res) => {
    try {
        const { country } = req.body;
        const cacheKey = `places:${(country || '').toLowerCase()}`;
        const hit = getCached(cacheKey);
        if (hit) return res.json({ places: hit });

        const ai = getGeminiClient();
        const prompt = `List the top 10 best cities or iconic regions to visit in ${country}. Return ONLY a JSON array of strings.`;
        const places = parseCleanJson(await generateJsonWithGemini(ai, prompt, 1024));
        setCached(cacheKey, places);
        res.json({ places });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch recommendations", details: error.message });
    }
});

// ROUTE 2: Live World Portal — Country Dossier
app.post('/api/country-dossier', checkPassword, async (req, res) => {
    try {
        const { country, homeCity, currentMonth, liveWeather } = req.body;
        const cacheKey = `dossier:${country}:${homeCity || ''}:${currentMonth || ''}`;
        const hit = getCached(cacheKey);
        if (hit) return res.json(hit);

        const ai = getGeminiClient();
        const prompt = `Act as a sharp travel scout. Concise dossier for ${country} in ${currentMonth || 'this month'} for a traveler from ${homeCity || 'abroad'}. Live weather: ${liveWeather || 'N/A'}.
Return ONLY JSON:
{
  "country": "${country}",
  "goNowVerdict": "GO NOW | GOOD WITH CAVEATS | BETTER TO WAIT",
  "goNowReason": "2 crisp sentences",
  "currencyAndCost": "Currency + realistic daily spend",
  "visaSnapshot": "Short visa reality",
  "bestRightNowSpot": "Best city/region this month",
  "touristTrapToAvoid": "One overpriced trap to dodge",
  "topHighlights": ["Spot 1", "Spot 2", "Spot 3"]
}`;
        const data = parseCleanJson(await generateJsonWithGemini(ai, prompt, 1200));
        setCached(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate country dossier", details: error.message });
    }
});

// ROUTE 3: Country Battle Mode
app.post('/api/country-battle', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { countryA, countryB, homeCity, days, hotelBudget, dailySpendingBudget, currentMonth } = req.body;
        if (!countryA || !countryB) return res.status(400).json({ error: 'Pick two countries.' });

        const prompt = `Compare ${countryA} vs ${countryB} for a ${days || 7}-day trip in ${currentMonth || 'this month'} from ${homeCity || 'abroad'} (Hotel: ${hotelBudget || 'Comfort'}, Spend: ${dailySpendingBudget || 'Moderate'}). Keep every field crisp (1 sentence).
Return ONLY JSON:
{
  "headline": "String",
  "verdictWinner": "${countryA} or ${countryB}",
  "verdictReason": "2 sentences",
  "countryA": { "name": "${countryA}", "vibeTagline": "String", "flightEstimate": "String", "visaFriction": "String", "hotelValue": "String", "dailyFoodCost": "String", "seasonRightNow": "String", "biggestPro": "String", "biggestCatch": "String", "topPlaces": ["P1","P2","P3"] },
  "countryB": { "name": "${countryB}", "vibeTagline": "String", "flightEstimate": "String", "visaFriction": "String", "hotelValue": "String", "dailyFoodCost": "String", "seasonRightNow": "String", "biggestPro": "String", "biggestCatch": "String", "topPlaces": ["P1","P2","P3"] },
  "headToHeadScores": [
    { "category": "Budget Stretch", "scoreA": 8, "scoreB": 6 },
    { "category": "Food & Culture", "scoreA": 9, "scoreB": 7 },
    { "category": "Scenery & Vibe", "scoreA": 8, "scoreB": 9 },
    { "category": "Ease of Getting Around", "scoreA": 9, "scoreB": 8 },
    { "category": "Weather Right Now", "scoreA": 8, "scoreB": 7 }
  ]
}`;
        res.json(parseCleanJson(await generateJsonWithGemini(ai, prompt, 2400)));
    } catch (error) {
        res.status(500).json({ error: "Failed to run Country Battle", details: error.message });
    }
});

// ROUTE 4: Hotel & Airbnb BS Detector
app.post('/api/hotel-audit', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { city, price, listingText } = req.body;
        if (!listingText || listingText.trim().length < 10) return res.status(400).json({ error: 'Paste a listing first.' });

        const prompt = `Ruthless hotel/Airbnb inspector. Audit this listing (${city || 'N/A'}, ${price || 'N/A'}):
"""${listingText}"""
Return ONLY JSON:
{
  "truthScore": 45,
  "verdict": "SOLID BOOKING | BOOK WITH CAUTION | WALK AWAY",
  "headline": "String",
  "summary": "2 sentences",
  "bsTranslations": [{ "phrase": "String", "reality": "String" }],
  "redFlags": ["String"],
  "hiddenFees": ["String"],
  "greenFlags": ["String"],
  "hostQuestions": ["String"]
}`;
        res.json(parseCleanJson(await generateJsonWithGemini(ai, prompt, 1800)));
    } catch (error) {
        res.status(500).json({ error: "Failed to audit hotel listing", details: error.message });
    }
});

// ROUTE 5: Scam, Strict Law & Spoken Crisis Vault
app.post('/api/safety-vault', checkPassword, async (req, res) => {
    try {
        const { country, need } = req.body;
        if (!country) return res.status(400).json({ error: 'Select a country.' });

        const cacheKey = `safety:${country}:${need || ''}`;
        const hit = getCached(cacheKey);
        if (hit) return res.json(hit);

        const ai = getGeminiClient();
        const prompt = `Street-smart safety briefing for ${country} + native Show-To-Local card for: "${need || 'Strict Vegetarian'}".
Return ONLY JSON with 4 scams and 3 strict laws:
{
  "emergencyNumbers": { "police": "String", "ambulance": "String", "touristPolice": "String" },
  "plugAndTipQuickNote": "1 short line",
  "crisisCard": { "nativeText": "Local script", "pronunciation": "Phonetic", "englishMeaning": "English", "langCode": "BCP-47 e.g. ja-JP" },
  "scams": [{ "name": "String", "riskLevel": "High Risk | Medium Risk", "howItWorks": "1 sentence", "counterMove": "1 sentence" }],
  "strictLaws": [{ "rule": "String", "penalty": "1 short sentence" }]
}`;
        const data = parseCleanJson(await generateJsonWithGemini(ai, prompt, 2000));
        setCached(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to build safety briefing", details: error.message });
    }
});

// ROUTE 6: Single-Stop Live Swap
app.post('/api/swap-stop', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { destinationCountry, dayTitle, currentStop, preference, existingTitles } = req.body;
        if (!currentStop || !destinationCountry) return res.status(400).json({ error: 'Missing stop details.' });

        const avoidList = Array.isArray(existingTitles) ? existingTitles.slice(0, 20).join(', ') : currentStop.title;
        const prompt = `Replace ONE stop in ${destinationCountry} (${dayTitle || ''}): "${currentStop.title}" (${currentStop.time || ''}).
User wants: "${preference || 'Fresh hidden gem'}". Do NOT repeat: ${avoidList}.
Return ONLY JSON:
{ "time": "${currentStop.time || ''}", "category": "${currentStop.category || 'Activity'}", "title": "Real place", "location": "Area", "transport": "Transit + time", "costNote": "Est cost", "description": "1-2 crisp sentences" }`;
        res.json({ stop: parseCleanJson(await generateJsonWithGemini(ai, prompt, 800)) });
    } catch (error) {
        res.status(500).json({ error: "Failed to swap stop", details: error.message });
    }
});

// ROUTE 7: 3D Earth Vibe Roulette
app.post('/api/vibe-roulette', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { vibe, homeCity, currentMonth, excludeCountries } = req.body;
        const excl = Array.isArray(excludeCountries) && excludeCountries.length ? `Exclude: ${excludeCountries.join(', ')}.` : '';

        const prompt = `Pick ONE exciting country matching vibe "${vibe}" in ${currentMonth || 'this month'} for traveler from ${homeCity || 'India'}. ${excl} Include exact decimal lat/lng for hubCity.
Return ONLY JSON:
{ "country": "String", "hubCity": "String", "lat": 35.6762, "lng": 139.6503, "tagline": "String", "whyItFits": "2 sentences", "signatureMoment": "1 sentence", "budgetFeel": "1 short line", "bestSpots": ["S1","S2","S3"] }`;
        res.json(parseCleanJson(await generateJsonWithGemini(ai, prompt, 900)));
    } catch (error) {
        res.status(500).json({ error: "Vibe Roulette failed", details: error.message });
    }
});

// ROUTE 8: Cultural Taboo & Survival Slang Deck
app.post('/api/cultural-deck', checkPassword, async (req, res) => {
    try {
        const { country, fresh } = req.body;
        if (!country) return res.status(400).json({ error: 'Select a country.' });

        const cacheKey = `deck:${country}`;
        if (!fresh) {
            const hit = getCached(cacheKey);
            if (hit) return res.json(hit);
        }

        const ai = getGeminiClient();
        const prompt = `Create a 10-card swipe deck for ${country}: 5 TABOO cards + 5 SLANG cards interleaved. Keep explanations 1-2 short sentences.
Return ONLY JSON:
{
  "country": "${country}",
  "langCode": "BCP-47 e.g. ja-JP",
  "cards": [
    { "type": "TABOO | SLANG", "tag": "String", "title": "String", "nativeScript": "Native phrase or empty", "pronunciation": "Phonetic or empty", "explanation": "String", "proTip": "Short tip" }
  ]
}`;
        const data = parseCleanJson(await generateJsonWithGemini(ai, prompt, 2200));
        setCached(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to build cultural deck", details: error.message });
    }
});

// ROUTE 9: Trip Time-Machine
app.post('/api/time-machine', checkPassword, async (req, res) => {
    try {
        const { country, monthA, monthB, homeCity } = req.body;
        if (!country || !monthA || !monthB) return res.status(400).json({ error: 'Pick country and two months.' });

        const cacheKey = `tm:${country}:${monthA}:${monthB}`;
        const hit = getCached(cacheKey);
        if (hit) return res.json(hit);

        const ai = getGeminiClient();
        const prompt = `Compare visiting ${country} in ${monthA} vs ${monthB} (traveler from ${homeCity || 'abroad'}). Be concise.
Return ONLY JSON:
{
  "country": "${country}", "headline": "String", "winnerMonth": "${monthA} or ${monthB}", "winnerReason": "2 sentences",
  "monthA": { "name": "${monthA}", "vibeLabel": "String", "weather": "String", "daylight": "String", "crowdScore": 7, "priceSurgeScore": 8, "festivals": ["F1","F2"], "bestFor": "String", "biggestCatch": "String" },
  "monthB": { "name": "${monthB}", "vibeLabel": "String", "weather": "String", "daylight": "String", "crowdScore": 5, "priceSurgeScore": 6, "festivals": ["F1","F2"], "bestFor": "String", "biggestCatch": "String" }
}`;
        const data = parseCleanJson(await generateJsonWithGemini(ai, prompt, 1800));
        setCached(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to run Trip Time-Machine", details: error.message });
    }
});

// ROUTE 10: Movie, Anime & Heritage Pilgrimage Mode
app.post('/api/pilgrimage-route', checkPassword, async (req, res) => {
    try {
        const { theme } = req.body;
        if (!theme || theme.trim().length < 2) return res.status(400).json({ error: 'Enter a theme.' });

        const cacheKey = `pil:${theme.trim().toLowerCase()}`;
        const hit = getCached(cacheKey);
        if (hit) return res.json(hit);

        const ai = getGeminiClient();
        const prompt = `Build a 6-stop real-world Pilgrimage Route for: "${theme}" with accurate decimal lat/lng coordinates. Keep every field punchy (1 sentence).
Return ONLY JSON:
{
  "missionTitle": "String", "themeName": "${theme}", "country": "Primary country", "daysSuggested": 5, "heroQuote": "1 short line", "overview": "2 sentences",
  "stops": [
    { "order": 1, "dayLabel": "Day 1", "realLocation": "Real place", "city": "City", "lat": 35.6852, "lng": 139.7235, "sceneConnection": "1 sentence", "photoTip": "1 sentence", "transitTip": "Short transit", "costNote": "Free or ticket" }
  ]
}`;
        const data = parseCleanJson(await generateJsonWithGemini(ai, prompt, 2400));
        setCached(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate pilgrimage route", details: error.message });
    }
});

// ROUTE 11: Complete Master Trip Planner (Optimized for 5–12s generation)
app.post('/api/plan-trip', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const {
            homeCity, departureCity, destinationCountry, destination,
            selectedPlaces, days, hotelBudget, dailySpendingBudget,
            transitStyle, customBudgetNote, isFirstTime, visitedPlaces
        } = req.body;

        const targetCountry = destinationCountry || destination || 'Destination';
        const numDays = Math.min(Math.max(parseInt(days, 10) || 3, 1), 14);
        const stopsPerDay = numDays >= 8 ? 3 : 4;

        const placesText = (selectedPlaces && selectedPlaces.length > 0)
            ? `Cover: ${selectedPlaces.join(', ')}.`
            : `Pick top cities in ${targetCountry}.`;

        const exclRule = (isFirstTime === 'no' && visitedPlaces)
            ? `EXCLUDE already visited: ${visitedPlaces}.`
            : `First-time visitor.`;

        const prompt = `Build a fast, punchy ${numDays}-day travel itinerary JSON.
Route: ${homeCity} -> ${departureCity} -> ${targetCountry}. ${placesText} ${exclRule}
Budget: Hotel=${hotelBudget || 'Comfort'}, Daily=${dailySpendingBudget || 'Moderate'}, Transit=${transitStyle || 'Smart Mix'}. Note: ${customBudgetNote || 'None'}.
Keep every description to 1 crisp sentence. Exactly ${stopsPerDay} stops per day for all ${numDays} days.

Return ONLY valid JSON:
{
  "summary": {
    "tripTitle": "String",
    "budgetStrategySummary": "1 sentence",
    "homeToDepartureTransit": "1 sentence",
    "flightStrategy": "1 sentence",
    "recommendedStay": { "name": "Hotel name", "area": "Neighborhood", "details": "1 sentence + nightly estimate" },
    "localTransportGuide": "1 sentence"
  },
  "days": [
    {
      "dayNumber": 1, "dayTitle": "String", "wakeUpTime": "07:30 AM", "sleepTime": "10:30 PM",
      "schedule": [
        { "time": "08:30 AM - 10:30 AM", "category": "Meal | Activity | Transit | Stay", "title": "Place name", "location": "Area", "transport": "Short transit", "costNote": "Est cost", "description": "1 crisp sentence" }
      ]
    }
  ]
}`;

        const maxTokens = Math.min(2
