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

// Stealth Access Code (Set SITE_PASSWORD in Render Environment Variables to customize)
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

// Smart Gemini caller with 503 auto-retry & model fallback
async function generateJsonWithGemini(ai, prompt, maxOutputTokens = 8192) {
    const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.0-flash',
        'gemini-3-flash',
        'gemini-flash-latest'
    ];
    let lastError = null;
    let sawHighDemand = false;

    for (let i = 0; i < candidateModels.length; i++) {
        const modelName = candidateModels[i];

        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        maxOutputTokens
                    }
                });
                return response;
            } catch (err) {
                lastError = err;
                const msg = err && err.message ? err.message : JSON.stringify(err);

                const matches = msg.match(/models\/([a-zA-Z0-9._-]+)/g);
                if (matches && matches.length > 1) {
                    const suggestedModel = matches[1].replace('models/', '');
                    if (!candidateModels.includes(suggestedModel)) {
                        candidateModels.push(suggestedModel);
                    }
                }

                const isBusy =
                    msg.includes('503') ||
                    msg.includes('UNAVAILABLE') ||
                    msg.toLowerCase().includes('high demand') ||
                    msg.toLowerCase().includes('overloaded');

                if (isBusy) {
                    sawHighDemand = true;
                    if (attempt === 1) {
                        await sleep(2000);
                        continue;
                    }
                    break;
                }

                if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available')) {
                    break;
                }

                if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
                    throw new Error('Free-tier API rate limit reached. Please wait 30–60 seconds and try again.');
                }

                throw err;
            }
        }
    }

    if (sawHighDemand) {
        throw new Error('Google Gemini servers are temporarily experiencing heavy traffic. Please wait 15–30 seconds and try again.');
    }

    throw lastError;
}

function parseCleanJson(response) {
    let rawText = typeof response.text === 'function' ? response.text() : response.text;
    if (!rawText) {
        throw new Error('Gemini returned an empty response. Please try again.');
    }
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(rawText);
}

// =========================================================================
// ROUTE 0: Verify Stealth Invite Code
// =========================================================================
app.post('/api/verify-access', (req, res) => {
    const code = (req.body?.password || '').trim();
    if (code && code === getExpectedPassword()) {
        return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: 'Incorrect stealth access code.' });
});

// =========================================================================
// ROUTE 1: Gemini AI Live Place Recommender for any Country
// =========================================================================
app.post('/api/recommend-places', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { country } = req.body;
        const prompt = `List the top 10 best cities, regions, or iconic travel destinations to visit in ${country}.
Return ONLY a strict JSON array of strings, for example: ["Place 1", "Place 2", "Place 3"]`;

        const response = await generateJsonWithGemini(ai, prompt, 2048);
        res.json({ places: parseCleanJson(response) });
    } catch (error) {
        console.error("Place Recommendation Error:", error);
        res.status(500).json({ error: "Failed to fetch recommendations", details: error.message });
    }
});

// =========================================================================
// ROUTE 2: Live World Portal — Instant AI Country Dossier
// =========================================================================
app.post('/api/country-dossier', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { country, homeCity, currentMonth, liveWeather } = req.body;

        const originText = homeCity ? `The traveler is based in ${homeCity}.` : `The traveler is an international traveler.`;
        const weatherText = liveWeather ? `Live weather right now in ${country}: ${liveWeather}.` : '';

        const prompt = `Act as a brutally honest, elite global travel scout. Generate a concise Live Intelligence Dossier for visiting ${country} in ${currentMonth || 'this month'}.
${originText}
${weatherText}

Return ONLY valid JSON matching this exact structure:
{
  "country": "${country}",
  "goNowVerdict": "GO NOW | GOOD WITH CAVEATS | BETTER TO WAIT",
  "goNowReason": "String (2 crisp sentences on weather, crowds, and seasonal vibe right now)",
  "currencyAndCost": "String (Local currency + realistic daily budget range for food/transit vs mid-range hotels)",
  "visaSnapshot": "String (Concise visa/entry guidance for someone traveling from ${homeCity || 'abroad'})",
  "bestRightNowSpot": "String (One specific city/region inside ${country} that shines specifically in ${currentMonth || 'this month'})",
  "touristTrapToAvoid": "String (One brutally honest overpriced trap or local mistake to dodge)",
  "topHighlights": ["City/Spot 1", "City/Spot 2", "City/Spot 3"]
}`;

        const response = await generateJsonWithGemini(ai, prompt, 2048);
        res.json(parseCleanJson(response));
    } catch (error) {
        console.error("Country Dossier Error:", error);
        res.status(500).json({ error: "Failed to generate country dossier", details: error.message });
    }
});

// =========================================================================
// ROUTE 3: Country Battle Mode — Head-to-Head AI Showdown
// =========================================================================
app.post('/api/country-battle', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { countryA, countryB, homeCity, days, hotelBudget, dailySpendingBudget, currentMonth } = req.body;

        if (!countryA || !countryB) {
            return res.status(400).json({ error: 'Please choose two countries to battle.' });
        }

        const prompt = `Act as a sharp, brutally honest travel strategist hosting a Head-to-Head Destination Battle: ${countryA} vs. ${countryB}.
Traveler context:
- Departure/Home Base: ${homeCity || 'International Hub'}
- Trip Length: ${days || 7} Days
- Timing: ${currentMonth || 'Current Month'}
- Split Budget Style: Hotel = ${hotelBudget || '3-to-4 Star Comfort Hotels'}, Daily Food & Sights = ${dailySpendingBudget || 'Moderate'}

Compare both countries specifically for THIS traveler's split budget and THIS exact month.

Return ONLY valid JSON matching this exact structure:
{
  "headline": "String (Punchy showdown title)",
  "verdictWinner": "String (Must be either ${countryA} or ${countryB})",
  "verdictReason": "String (2-3 sharp sentences explaining why the winner beats the other right now)",
  "countryA": {
    "name": "${countryA}",
    "vibeTagline": "String",
    "flightEstimate": "String",
    "visaFriction": "String",
    "hotelValue": "String",
    "dailyFoodCost": "String",
    "seasonRightNow": "String",
    "biggestPro": "String",
    "biggestCatch": "String",
    "topPlaces": ["Place 1", "Place 2", "Place 3"]
  },
  "countryB": {
    "name": "${countryB}",
    "vibeTagline": "String",
    "flightEstimate": "String",
    "visaFriction": "String",
    "hotelValue": "String",
    "dailyFoodCost": "String",
    "seasonRightNow": "String",
    "biggestPro": "String",
    "biggestCatch": "String",
    "topPlaces": ["Place 1", "Place 2", "Place 3"]
  },
  "headToHeadScores": [
    { "category": "Budget Stretch", "scoreA": 8, "scoreB": 6 },
    { "category": "Food & Culture", "scoreA": 9, "scoreB": 7 },
    { "category": "Scenery & Vibe", "scoreA": 8, "scoreB": 9 },
    { "category": "Ease of Getting Around", "scoreA": 9, "scoreB": 8 },
    { "category": "Weather Right Now", "scoreA": 8, "scoreB": 7 }
  ]
}`;

        const response = await generateJsonWithGemini(ai, prompt, 4096);
        res.json(parseCleanJson(response));
    } catch (error) {
        console.error("Country Battle Error:", error);
        res.status(500).json({ error: "Failed to run Country Battle", details: error.message });
    }
});

// =========================================================================
// ROUTE 4: Travel Shield — Hotel & Airbnb BS Detector
// =========================================================================
app.post('/api/hotel-audit', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { city, price, listingText } = req.body;

        if (!listingText || listingText.trim().length < 10) {
            return res.status(400).json({ error: 'Please paste a hotel or Airbnb listing description to audit.' });
        }

        const prompt = `Act as a ruthless, razor-sharp hotel & Airbnb property inspector. Dissect this listing for marketing lies, hidden fees, comfort traps, noise risks, and fine-print tricks.

Location: ${city || 'Not specified'}
Listed Price: ${price || 'Not specified'}
Listing Text & Reviews:
"""
${listingText}
"""

Return ONLY valid JSON matching this exact structure:
{
  "truthScore": 45,
  "verdict": "SOLID BOOKING | BOOK WITH CAUTION | WALK AWAY",
  "headline": "String",
  "summary": "String",
  "bsTranslations": [
    { "phrase": "String", "reality": "String" }
  ],
  "redFlags": ["String"],
  "hiddenFees": ["String"],
  "greenFlags": ["String"],
  "hostQuestions": ["String"]
}`;

        const response = await generateJsonWithGemini(ai, prompt, 3072);
        res.json(parseCleanJson(response));
    } catch (error) {
        console.error("Hotel Audit Error:", error);
        res.status(500).json({ error: "Failed to audit hotel listing", details: error.message });
    }
});

// =========================================================================
// ROUTE 5: Travel Shield — Scam, Strict Law & Spoken Crisis Vault
// =========================================================================
app.post('/api/safety-vault', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { country, need } = req.body;

        if (!country) {
            return res.status(400).json({ error: 'Please select a destination country.' });
        }

        const prompt = `Act as a street-smart travel security & local etiquette specialist. Build a practical Safety, Scam & Crisis Briefing for visiting ${country}.
Also generate a clear native-language Show-To-Local Card for: "${need || 'Strict Vegetarian'}".

Return ONLY valid JSON matching this exact structure:
{
  "emergencyNumbers": {
    "police": "String",
    "ambulance": "String",
    "touristPolice": "String"
  },
  "plugAndTipQuickNote": "String",
  "crisisCard": {
    "nativeText": "String",
    "pronunciation": "String",
    "englishMeaning": "String",
    "langCode": "String (BCP-47 like ja-JP, th-TH, it-IT, fr-FR, tr-TR, ar-SA, id-ID, en-US)"
  },
  "scams": [
    {
      "name": "String",
      "riskLevel": "High Risk | Medium Risk | Common Trap",
      "howItWorks": "String",
      "counterMove": "String"
    }
  ],
  "strictLaws": [
    { "rule": "String", "penalty": "String" }
  ]
}
Include 4 specific real scams and 3 strict local laws/customs traps.`;

        const response = await generateJsonWithGemini(ai, prompt, 3072);
        res.json(parseCleanJson(response));
    } catch (error) {
        console.error("Safety Vault Error:", error);
        res.status(500).json({ error: "Failed to build safety briefing", details: error.message });
    }
});

// =========================================================================
// ROUTE 6: Single-Stop Live Swap Inside Any Itinerary
// =========================================================================
app.post('/api/swap-stop', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { destinationCountry, dayTitle, currentStop, preference, existingTitles } = req.body;

        if (!currentStop || !destinationCountry) {
            return res.status(400).json({ error: 'Missing stop details to swap.' });
        }

        const avoidList = Array.isArray(existingTitles) && existingTitles.length
            ? existingTitles.join(', ')
            : currentStop.title;

        const prompt = `Act as an elite local travel architect in ${destinationCountry}.
Replace ONLY this single itinerary stop with a fresh, real-world alternative in the same city/area and same time slot:
- Day Theme: ${dayTitle || destinationCountry}
- Current Stop Being Replaced: "${currentStop.title}" (${currentStop.category || 'Activity'}) at ${currentStop.location || destinationCountry} during ${currentStop.time || 'this slot'}
- Traveler's Swap Request: "${preference || 'Give me a fresh, better hidden-gem alternative'}"
- Do NOT repeat any of these already-planned stops: ${avoidList}

Keep the exact same time window ("${currentStop.time || ''}") and category ("${currentStop.category || 'Activity'}").

Return ONLY valid JSON matching this exact structure:
{
  "time": "${currentStop.time || ''}",
  "category": "${currentStop.category || 'Activity'}",
  "title": "String (Specific real venue, restaurant, or attraction name)",
  "location": "String (City & Neighborhood)",
  "transport": "String (Exact transit to get here + duration)",
  "costNote": "String (Estimated cost level)",
  "description": "String (1-2 sharp sentences explaining what to do/eat and why this swap fits '${preference || 'the request'}')"
}`;

        const response = await generateJsonWithGemini(ai, prompt, 1536);
        res.json({ stop: parseCleanJson(response) });
    } catch (error) {
        console.error("Swap Stop Error:", error);
        res.status(500).json({ error: "Failed to swap stop", details: error.message });
    }
});

// =========================================================================
// ROUTE 7: Complete Master Trip Planner
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

        const placesToVisitText = (selectedPlaces && selectedPlaces.length > 0)
            ? `The user specifically wants to visit these places in ${targetCountry}: ${selectedPlaces.join(', ')}. Structure the route logically around these locations.`
            : `Select the best cities and regions in ${targetCountry} for a ${numDays}-day trip.`;

        const exclusionRule = (isFirstTime === 'no' && visitedPlaces)
            ? `CRITICAL RULE: The user has visited ${targetCountry} before and already saw: ${visitedPlaces}. DO NOT include any of these already-visited places.`
            : `This is the user's first time visiting ${targetCountry}.`;

        const prompt = `Act as an elite travel architect. Build a complete, day-by-day travel plan based on these parameters:
- Home City: ${homeCity}
- Flight Departure City: ${departureCity}
- Destination Country: ${targetCountry}
- Specific Places to Cover: ${placesToVisitText}
- Duration: ${numDays} Days
- SPLIT BUDGET PROFILE:
  * Hotel & Stay Comfort: ${hotelBudget || 'Comfort 3-4 Star'}
  * Daily Food & Sights Spending: ${dailySpendingBudget || 'Moderate'}
  * Local Transit Style: ${transitStyle || 'Smart Mix'}
  * Special Budget Note: ${customBudgetNote || 'Respect the split between hotel comfort and daily spending.'}
- Experience Rule: ${exclusionRule}

Keep descriptions concise (1 to 2 sentences per item) so the JSON is clean and complete. For EVERY DAY (Day 1 to Day ${numDays}), include 4 to 5 chronological schedule items covering Morning Activity, Breakfast/Lunch, Afternoon Activity, and Dinner/Evening, plus exact wake-up and sleep times.

Return ONLY valid JSON matching this exact structure:
{
  "summary": {
    "tripTitle": "String",
    "budgetStrategySummary": "String",
    "homeToDepartureTransit": "String",
    "flightStrategy": "String",
    "recommendedStay": {
      "name": "String",
      "area": "String",
      "details": "String"
    },
    "localTransportGuide": "String"
  },
  "days": [
    {
      "dayNumber": 1,
      "dayTitle": "String",
      "wakeUpTime": "String",
      "sleepTime": "String",
      "schedule": [
        {
          "time": "String",
          "category": "Meal | Activity | Transit | Stay",
          "title": "String",
          "location": "String",
          "transport": "String",
          "costNote": "String",
          "description": "String"
        }
      ]
    }
  ]
}`;

        const response = await generateJsonWithGemini(ai, prompt, 8192);
        res.json(parseCleanJson(response));
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
