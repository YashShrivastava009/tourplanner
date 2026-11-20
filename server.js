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

// Password Protection Middleware
const checkPassword = (req, res, next) => {
    if (req.headers['x-site-password'] === 'mysecretpassword') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Password mismatch' });
    }
};

// Helper to get Gemini client safely
function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing in your Render Environment Variables. Go to Render Dashboard -> Environment and add GEMINI_API_KEY.');
    }
    return new GoogleGenAI({ apiKey });
}

// Smart Gemini caller: auto-retries on 503 spikes and falls back across active Flash models
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
                        console.warn(`Model ${modelName} busy (503). Retrying in 2s...`);
                        await sleep(2000);
                        continue;
                    }
                    console.warn(`Model ${modelName} still busy. Trying next model...`);
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
        throw new Error('Google Gemini servers are temporarily experiencing heavy traffic across models. Please wait 15–30 seconds and try again.');
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
        const {
            countryA,
            countryB,
            homeCity,
            days,
            hotelBudget,
            dailySpendingBudget,
            currentMonth
        } = req.body;

        if (!countryA || !countryB) {
            return res.status(400).json({ error: 'Please choose two countries to battle.' });
        }

        const prompt = `Act as a sharp, brutally honest travel strategist hosting a Head-to-Head Destination Battle: ${countryA} vs. ${countryB}.
Traveler context:
- Departure/Home Base: ${homeCity || 'International Hub'}
- Trip Length: ${days || 7} Days
- Timing: ${currentMonth || 'Current Month'}
- Split Budget Style: Hotel = ${hotelBudget || '3-to-4 Star Comfort Hotels'}, Daily Food & Sights = ${dailySpendingBudget || 'Moderate'}

Compare both countries specifically for THIS traveler's split budget and THIS exact month. Name real trade-offs, flight reality, visa friction, and what their money actually buys.

Return ONLY valid JSON matching this exact structure:
{
  "headline": "String (Punchy showdown title)",
  "verdictWinner": "String (Must be either ${countryA} or ${countryB})",
  "verdictReason": "String (2-3 sharp sentences explaining why the winner beats the other right now for this specific budget)",
  "countryA": {
    "name": "${countryA}",
    "vibeTagline": "String (3-5 word cinematic vibe)",
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
    "vibeTagline": "String (3-5 word cinematic vibe)",
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
  "headline": "String (Blunt, memorable 6-10 word summary of what this place really is)",
  "summary": "String (2-3 sharp sentences giving your honest bottom-line assessment)",
  "bsTranslations": [
    {
      "phrase": "String (Exact euphemism or fluff from the listing, e.g. 'Cozy walk-up loft')",
      "reality": "String (Blunt real-world translation, e.g. 'Tiny room up 5 flights of stairs with no elevator')"
    }
  ],
  "redFlags": ["String (Major issue 1)", "String (Major issue 2)"],
  "hiddenFees": ["String (Any mandatory cash/cleaning/linen/resort/late-check-in fees found or likely)"],
  "greenFlags": ["String (Any genuine positives found in the listing)"],
  "hostQuestions": [
    "String (Exact pointed question to message the host before paying so you get proof in writing)"
  ]
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

        const prompt = `Act as a street-smart travel security & local etiquette specialist. Build a practical, high-signal Safety, Scam & Crisis Briefing for a traveler visiting ${country}.
Also generate a clear native-language Show-To-Local Card for this specific need: "${need || 'Strict Vegetarian'}".

Return ONLY valid JSON matching this exact structure:
{
  "emergencyNumbers": {
    "police": "String (Exact local police number)",
    "ambulance": "String (Exact local ambulance/medical emergency number)",
    "touristPolice": "String (Local tourist police hotline or national help number)"
  },
  "plugAndTipQuickNote": "String (1 short line with power plug type + tipping norm, e.g. 'Type A/B plugs • Never tip in Japan')",
  "crisisCard": {
    "nativeText": "String (Clear, polite, unmistakable message in the primary local script of ${country} for: ${need || 'Strict Vegetarian'})",
    "pronunciation": "String (Easy phonetic Romanized pronunciation)",
    "englishMeaning": "String (Exact English meaning of what the native card says)",
    "langCode": "String (BCP-47 voice code like ja-JP, th-TH, it-IT, fr-FR, tr-TR, ar-SA, id-ID, en-US)"
  },
  "scams": [
    {
      "name": "String (Specific real-world tourist scam in ${country})",
      "riskLevel": "High Risk | Medium Risk | Common Trap",
      "howItWorks": "String (1-2 crisp sentences explaining the exact hook/setup)",
      "counterMove": "String (1-2 crisp sentences explaining how to shut it down immediately)"
    }
  ],
  "strictLaws": [
    {
      "rule": "String (Strict or unexpected local law/etiquette rule in ${country})",
      "penalty": "String (Fine, arrest risk, or consequence to watch out for)"
    }
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
// ROUTE 6: Complete Master Trip Planner
// =========================================================================
app.post('/api/plan-trip', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();

        const {
            homeCity,
            departureCity,
            destinationCountry,
            destination,
            selectedPlaces,
            days,
            hotelBudget,
            dailySpendingBudget,
            transitStyle,
            customBudgetNote,
            isFirstTime,
            visitedPlaces
        } = req.body;

        const targetCountry = destinationCountry || destination || 'Destination';
        const numDays = Math.min(Math.max(parseInt(days, 10) || 3, 1), 14);

        const placesToVisitText = (selectedPlaces && selectedPlaces.length > 0)
            ? `The user specifically wants to visit these places in ${targetCountry}: ${selectedPlaces.join(', ')}. Structure the route logically around these locations.`
            : `Select the best cities and regions in ${targetCountry} for a ${numDays}-day trip.`;

        const exclusionRule = (isFirstTime === 'no' && visitedPlaces)
            ? `CRITICAL RULE: The user has visited ${targetCountry} before and already saw: ${visitedPlaces}. DO NOT include any of these already-visited places. Suggest fresh attractions and areas.`
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
    "budgetStrategySummary": "String explaining how you balanced the hotel tier with daily spending",
    "homeToDepartureTransit": "String explaining how to travel from ${homeCity} to ${departureCity} airport",
    "flightStrategy": "String explaining flight route from ${departureCity} to ${targetCountry}",
    "recommendedStay": {
      "name": "String (Specific Hotel/Resort/Hostel Name)",
      "area": "String (City & Neighborhood)",
      "details": "String (Why this stay fits their hotel budget and nightly estimate)"
    },
    "localTransportGuide": "String (Best passes, cards, or transit methods to use)"
  },
  "days": [
    {
      "dayNumber": 1,
      "dayTitle": "String (City & Theme of the day)",
      "wakeUpTime": "String (e.g. 07:00 AM)",
      "sleepTime": "String (e.g. 10:30 PM)",
      "schedule": [
        {
          "time": "String (e.g. 08:00 AM - 10:30 AM)",
          "category": "Meal | Activity | Transit | Stay",
          "title": "String (Name of place, restaurant, or action)",
          "location": "String (City & Neighborhood)",
          "transport": "String (Exact transit to get here + duration)",
          "costNote": "String (Estimated cost level)",
          "description": "String (What to do, what dish to eat, and key tip)"
        }
      ]
    }
  ]
}`;

        const response = await generateJsonWithGemini(ai, prompt, 8192);
        res.json(parseCleanJson(response));

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({
            error: "Failed to generate itinerary",
            details: error.message || "Unknown server error"
        });
    }
});

// Return clean JSON instead of HTML for any unknown /api route
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Serve the main frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
