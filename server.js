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

// Self-healing JSON parser: strips fences, stray text, and trailing commas
function safeParseRawJson(rawText, expectArray = false) {
    if (!rawText) throw new Error('JSON_ERROR: Empty response from AI.');

    let cleaned = String(rawText)
        .replace(/^\uFEFF/, '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    const openChar = expectArray ? '[' : '{';
    const closeChar = expectArray ? ']' : '}';
    const firstIdx = cleaned.indexOf(openChar);
    const lastIdx = cleaned.lastIndexOf(closeChar);
    if (firstIdx !== -1 && lastIdx > firstIdx) {
        cleaned = cleaned.slice(firstIdx, lastIdx + 1);
    }

    try {
        return JSON.parse(cleaned);
    } catch (firstErr) {
        const repaired = cleaned
            .replace(/,\s*([}\]])/g, '$1')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
        try {
            return JSON.parse(repaired);
        } catch (secondErr) {
            throw new Error(`JSON_ERROR: ${secondErr.message}`);
        }
    }
}

// Optional 100% Free Groq Failover (activates automatically if GROQ_API_KEY is set in Render)
async function callGroqFallback(prompt, maxOutputTokens = 4096, expectArray = false) {
    const groqKey = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.trim() : '';
    if (!groqKey) return null;

    const groqModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
    const wrappedPrompt = expectArray
        ? `${prompt}\nReturn as JSON object: { "items": [...] }`
        : prompt;

    for (const model of groqModels) {
        try {
            const res = await withTimeout(
                fetch('[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${groqKey}`
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: 'You are an expert travel architect. Return ONLY valid strict JSON.' },
                            { role: 'user', content: wrappedPrompt }
                        ],
                        temperature: 0.35,
                        max_tokens: Math.min(maxOutputTokens, 7500),
                        response_format: { type: 'json_object' }
                    })
                }),
                30000,
                `groq:${model}`
            );

            if (!res.ok) continue;
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) continue;

            const parsed = safeParseRawJson(content, false);
            if (expectArray) {
                if (Array.isArray(parsed)) return parsed;
                if (Array.isArray(parsed.items)) return parsed.items;
                const firstArr = Object.values(parsed).find(v => Array.isArray(v));
                if (firstArr) return firstArr;
            }
            return parsed;
        } catch (e) {
            console.warn(`Groq fallback (${model}) skipped:`, e.message);
        }
    }
    return null;
}

// Smart Gemini caller with JSON repair + fallback across active Flash models + optional Groq failover
async function generateParsedJson(ai, prompt, maxOutputTokens = 6144, expectArray = false, preferRichModel = false) {
    const candidateModels = preferRichModel
        ? ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest']
        : ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

    let lastError = null;
    let sawHighDemand = false;
    let sawRateLimit = false;

    for (let i = 0; i < candidateModels.length; i++) {
        const modelName = candidateModels[i];
        const isLite = modelName.includes('lite');

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const config = {
                    responseMimeType: "application/json",
                    maxOutputTokens,
                    temperature: 0.4
                };

                if (attempt === 1 && modelName.includes('gemini-3')) {
                    config.thinkingConfig = {
                        thinkingLevel: isLite ? 'MINIMAL' : 'LOW'
                    };
                }

                const response = await withTimeout(
                    ai.models.generateContent({ model: modelName, contents: prompt, config }),
                    42000,
                    modelName
                );

                const rawText = typeof response.text === 'function' ? response.text() : response.text;
                return safeParseRawJson(rawText, expectArray);
            } catch (err) {
                lastError = err;
                const msg = err && err.message ? err.message : JSON.stringify(err);

                if (msg.startsWith('JSON_ERROR:')) {
                    console.warn(`${modelName} returned malformed JSON. Trying next model...`);
                    break;
                }

                if (attempt === 1 && (msg.includes('thinking') || msg.includes('INVALID_ARGUMENT') || msg.includes('400'))) {
                    continue;
                }

                if (msg.includes('TIMEOUT')) {
                    console.warn(`${modelName} timed out. Switching model...`);
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
                    sawRateLimit = true;
                    break;
                }

                throw err;
            }
        }
    }

    // Try free Groq fallback if configured in Render Environment Variables
    const groqResult = await callGroqFallback(prompt, maxOutputTokens, expectArray);
    if (groqResult) return groqResult;

    if (sawRateLimit) {
        throw new Error('Free-tier API rate limit reached. Wait 30 seconds and try again (or add a free GROQ_API_KEY in Render for automatic failover).');
    }

    if (sawHighDemand) {
        throw new Error('Google Gemini servers are temporarily busy. Please try again in 15 seconds.');
    }

    throw lastError;
}

// Helper to run async tasks in parallel with a concurrency limit
async function runWithConcurrency(tasks, maxConcurrent = 3) {
    const results = new Array(tasks.length);
    let nextIdx = 0;

    async function worker() {
        while (nextIdx < tasks.length) {
            const current = nextIdx++;
            results[current] = await tasks[current]();
        }
    }

    const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
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
        const prompt = `List the top 10 best cities or iconic regions to visit in ${country}. Return ONLY a strict JSON array of double-quoted strings with no trailing commas.`;
        const places = await generateParsedJson(ai, prompt, 1024, true);
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
Return ONLY valid strict JSON:
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
        const data = await generateParsedJson(ai, prompt, 1400);
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

        const prompt = `Compare ${countryA} vs ${countryB} for a ${days || 7}-day trip in ${currentMonth || 'this month'} from ${homeCity || 'abroad'} (Hotel: ${hotelBudget || 'Comfort'}, Spend: ${dailySpendingBudget || 'Moderate'}). Keep every field crisp (1-2 sentences).
Return ONLY valid strict JSON:
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
        res.json(await generateParsedJson(ai, prompt, 2800));
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
Return ONLY valid strict JSON:
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
        res.json(await generateParsedJson(ai, prompt, 2200));
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
Return ONLY valid strict JSON with 4 scams and 3 strict laws:
{
  "emergencyNumbers": { "police": "String", "ambulance": "String", "touristPolice": "String" },
  "plugAndTipQuickNote": "1 short line",
  "crisisCard": { "nativeText": "Local script", "pronunciation": "Phonetic", "englishMeaning": "English", "langCode": "BCP-47 e.g. ja-JP" },
  "scams": [{ "name": "String", "riskLevel": "High Risk | Medium Risk", "howItWorks": "1-2 sentences", "counterMove": "1-2 sentences" }],
  "strictLaws": [{ "rule": "String", "penalty": "1 short sentence" }]
}`;
        const data = await generateParsedJson(ai, prompt, 2400);
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
Return ONLY valid strict JSON:
{ "time": "${currentStop.time || ''}", "category": "${currentStop.category || 'Activity'}", "title": "Real place", "location": "Area", "transport": "Transit + time", "costNote": "Est cost", "description": "2 detailed sentences with what to do/eat and an insider tip" }`;
        res.json({ stop: await generateParsedJson(ai, prompt, 1100) });
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
Return ONLY valid strict JSON:
{ "country": "String", "hubCity": "String", "lat": 35.6762, "lng": 139.6503, "tagline": "String", "whyItFits": "2 sentences", "signatureMoment": "1 sentence", "budgetFeel": "1 short line", "bestSpots": ["S1","S2","S3"] }`;
        res.json(await generateParsedJson(ai, prompt, 1100));
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
Return ONLY valid strict JSON:
{
  "country": "${country}",
  "langCode": "BCP-47 e.g. ja-JP",
  "cards": [
    { "type": "TABOO | SLANG", "tag": "String", "title": "String", "nativeScript": "Native phrase or empty", "pronunciation": "Phonetic or empty", "explanation": "String", "proTip": "Short tip" }
  ]
}`;
        const data = await generateParsedJson(ai, prompt, 2600);
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
Return ONLY valid strict JSON:
{
  "country": "${country}", "headline": "String", "winnerMonth": "${monthA} or ${monthB}", "winnerReason": "2 sentences",
  "monthA": { "name": "${monthA}", "vibeLabel": "String", "weather": "String", "daylight": "String", "crowdScore": 7, "priceSurgeScore": 8, "festivals": ["F1","F2"], "bestFor": "String", "biggestCatch": "String" },
  "monthB": { "name": "${monthB}", "vibeLabel": "String", "weather": "String", "daylight": "String", "crowdScore": 5, "priceSurgeScore": 6, "festivals": ["F1","F2"], "bestFor": "String", "biggestCatch": "String" }
}`;
        const data = await generateParsedJson(ai, prompt, 2200);
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
        const prompt = `Build a 6-stop real-world Pilgrimage Route for: "${theme}" with accurate decimal lat/lng coordinates. Keep every field punchy (1-2 sentences).
Return ONLY valid strict JSON:
{
  "missionTitle": "String", "themeName": "${theme}", "country": "Primary country", "daysSuggested": 5, "heroQuote": "1 short line", "overview": "2 sentences",
  "stops": [
    { "order": 1, "dayLabel": "Day 1", "realLocation": "Real place", "city": "City", "lat": 35.6852, "lng": 139.7235, "sceneConnection": "1-2 sentences", "photoTip": "1 sentence", "transitTip": "Short transit", "costNote": "Free or ticket" }
  ]
}`;
        const data = await generateParsedJson(ai, prompt, 2800);
        setCached(cacheKey, data);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to generate pilgrimage route", details: error.message });
    }
});

// =========================================================================
// ROUTE 11: HYPER-DETAILED PARALLEL-CHUNKED MASTER TRIP PLANNER
// (6 Rich Stops/Day Even on 14-Day Trips — Fast & 100% Free!)
// =========================================================================
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

        const placesText = (selectedPlaces && selectedPlaces.length > 0)
            ? `Cover these requested places logically: ${selectedPlaces.join(', ')}.`
            : `Select the best cities and scenic regions in ${targetCountry}.`;

        const exclRule = (isFirstTime === 'no' && visitedPlaces)
            ? `CRITICAL: Exclude already visited places: ${visitedPlaces}.`
            : `First-time visitor to ${targetCountry}.`;

        const budgetBlock = `Hotel=${hotelBudget || 'Comfort 3-4 Star'}, Daily Food & Sights=${dailySpendingBudget || 'Moderate'}, Transit=${transitStyle || 'Smart Mix'}. Note: ${customBudgetNote || 'None'}.`;

        // CASE A: Short trips (1–4 days) -> 1 single rich call with 6 full stops/day
        if (numDays <= 4) {
            const singlePrompt = `Act as an elite, detail-obsessed local travel architect. Build a richly detailed ${numDays}-day itinerary.
Route: ${homeCity} -> ${departureCity} -> ${targetCountry}. ${placesText} ${exclRule}
Budget: ${budgetBlock}

QUALITY RULES:
- Generate EXACTLY 6 chronological stops per day for EVERY day (Day 1 to Day ${numDays}):
  1) Morning Breakfast / Local Cafe
  2) Morning Iconic Landmark / Activity
  3) Late-Morning / Midday Neighborhood, Market, or Hidden Gem
  4) Specific Local Lunch Restaurant (name exact signature dishes to order)
  5) Afternoon Major Experience / Sight / Excursion
  6) Sunset Spot, Evening Walk & Dinner (with exact local vibe & tip)
- Write 2 to 3 vivid, specific sentences per stop (exact dishes, ticket/crowd hacks, best photo angles—never generic one-liners).

Return ONLY valid strict JSON (double-quoted keys, no trailing commas):
{
  "summary": {
    "tripTitle": "String",
    "budgetStrategySummary": "2 sentences explaining how stays and daily spending are balanced",
    "homeToDepartureTransit": "2 sentences on reaching ${departureCity} from ${homeCity}",
    "flightStrategy": "2 sentences on best flight corridors and arrival logistics",
    "recommendedStay": { "name": "Specific real hotel name", "area": "City & Neighborhood", "details": "2 sentences + realistic nightly estimate" },
    "localTransportGuide": "2 sentences on exact transit cards, rail apps, and cab tips"
  },
  "days": [
    {
      "dayNumber": 1, "dayTitle": "City & Rich Theme", "wakeUpTime": "07:00 AM", "sleepTime": "10:30 PM",
      "schedule": [
        { "time": "08:00 AM - 09:00 AM", "category": "Meal | Activity | Transit | Stay", "title": "Specific real place", "location": "Neighborhood, City", "transport": "Exact transit + duration", "costNote": "Realistic cost estimate", "description": "2-3 vivid, specific sentences with insider tips and what to order/see." }
      ]
    }
  ]
}`;
            const result = await generateParsedJson(ai, singlePrompt, 8192, false, true);
            return res.json(result);
        }

        // CASE B: Longer trips (5–14 days) -> Step 1: Fast Master Outline + Summary
        const outlinePrompt = `Act as an elite travel architect designing the master route for a ${numDays}-day expedition in ${targetCountry}.
Origin: ${homeCity} -> Departure Airport: ${departureCity} -> Destination: ${targetCountry}.
${placesText} ${exclRule}
Budget: ${budgetBlock}

Return ONLY valid strict JSON with the trip summary and a logical, geographically connected day-by-day outline for ALL ${numDays} days (Day 1 to Day ${numDays}):
{
  "summary": {
    "tripTitle": "String",
    "budgetStrategySummary": "2 crisp sentences",
    "homeToDepartureTransit": "2 crisp sentences",
    "flightStrategy": "2 crisp sentences",
    "recommendedStay": { "name": "Specific real hotel(s) along the route", "area": "Main base cities", "details": "2 sentences + realistic nightly cost" },
    "localTransportGuide": "2 crisp sentences on passes, trains & local apps"
  },
  "dayOutlines": [
    { "dayNumber": 1, "city": "City/Region", "theme": "Distinct focus of this day", "mustHit": "3-4 key spots/districts for this day" }
  ]
}`;

        const outlineData = await generateParsedJson(ai, outlinePrompt, 2600, false, false);
        const summary = outlineData.summary || {};
        const dayOutlines = Array.isArray(outlineData.dayOutlines) && outlineData.dayOutlines.length >= numDays
            ? outlineData.dayOutlines.slice(0, numDays)
            : Array.from({ length: numDays }, (_, i) => ({
                dayNumber: i + 1,
                city: targetCountry,
                theme: `Day ${i + 1} Highlights in ${targetCountry}`,
                mustHit: selectedPlaces?.join(', ') || targetCountry
            }));

        // Step 2: Split into 4-day chunks and generate 6 rich stops/day IN PARALLEL
        const chunkSize = 4;
        const chunks = [];
        for (let start = 0; start < dayOutlines.length; start += chunkSize) {
            chunks.push(dayOutlines.slice(start, start + chunkSize));
        }

        const chunkTasks = chunks.map((chunkSlice) => async () => {
            const firstDay = chunkSlice[0].dayNumber;
            const lastDay = chunkSlice[chunkSlice.length - 1].dayNumber;
            const sliceText = chunkSlice
                .map(d => `Day ${d.dayNumber} (${d.city}): ${d.theme} — Focus areas: ${d.mustHit}`)
                .join('\n');

            const chunkPrompt = `Act as an elite local insider in ${targetCountry}. Flesh out ONLY Days ${firstDay} to ${lastDay} of this ${numDays}-day trip into a deeply detailed, real-world schedule.
Budget: ${budgetBlock} ${exclRule}

Assigned Days for this block:
${sliceText}

STRICT QUALITY RULES:
- Generate ALL days from Day ${firstDay} through Day ${lastDay}.
- Include EXACTLY 6 chronological stops per day (covering Morning Breakfast/Cafe, Morning Major Sight, Midday Market/Alley/Hidden Gem, Local Lunch with exact dishes, Afternoon Landmark/Experience, and Sunset/Evening Activity & Dinner).
- Every stop MUST use a real, specific place/restaurant name and have 2 to 3 detailed, useful sentences (exact dish to try, crowd-beating timing, photo tip, or local secret). Never write lazy 1-sentence filler.

Return ONLY valid strict JSON:
{
  "days": [
    {
      "dayNumber": ${firstDay},
      "dayTitle": "City & Theme",
      "wakeUpTime": "07:00 AM",
      "sleepTime": "10:30 PM",
      "schedule": [
        { "time": "08:00 AM - 09:00 AM", "category": "Meal | Activity | Transit | Stay", "title": "Real Venue Name", "location": "Neighborhood, City", "transport": "Exact transit + time", "costNote": "Est cost", "description": "2-3 vivid, actionable sentences." }
      ]
    }
  ]
}`;
            const chunkJson = await generateParsedJson(ai, chunkPrompt, 8192, false, true);
            return Array.isArray(chunkJson.days) ? chunkJson.days : [];
        });

        const chunkResults = await runWithConcurrency(chunkTasks, 3);
        const allDays = chunkResults
            .flat()
            .sort((a, b) => (Number(a.dayNumber) || 0) - (Number(b.dayNumber) || 0));

        if (!allDays.length) {
            throw new Error('Failed to assemble itinerary days. Please try again.');
        }

        res.json({ summary, days: allDays });
    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate itinerary", details: error.message || "Unknown server error" });
    }
});

app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
