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

const checkPassword = (req, res, next) => {
    if (req.headers['x-site-password'] === 'mysecretpassword') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Password mismatch' });
    }
};

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is missing in your Render Environment Variables.');
    }
    return new GoogleGenAI({ apiKey });
}

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
                return await ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: { responseMimeType: "application/json", maxOutputTokens }
                });
            } catch (err) {
                lastError = err;
                const msg = err && err.message ? err.message : JSON.stringify(err);
                const matches = msg.match(/models\/([a-zA-Z0-9._-]+)/g);
                if (matches && matches.length > 1) {
                    const suggested = matches[1].replace('models/', '');
                    if (!candidateModels.includes(suggested)) candidateModels.push(suggested);
                }
                const isBusy = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('overloaded');
                if (isBusy) {
                    sawHighDemand = true;
                    if (attempt === 1) { await sleep(2000); continue; }
                    break;
                }
                if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available')) break;
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
    if (!rawText) throw new Error('Gemini returned an empty response. Please try again.');
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(rawText);
}

// ROUTE 1: Place Recommender
app.post('/api/recommend-places', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { country } = req.body;
        const prompt = `List the top 10 best cities, regions, or iconic travel destinations to visit in ${country}. Return ONLY a strict JSON array of strings.`;
        const response = await generateJsonWithGemini(ai, prompt, 2048);
        res.json({ places: parseCleanJson(response) });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch recommendations", details: error.message });
    }
});

// ROUTE 2: Live World Portal AI Dossier
app.post('/api/country-dossier', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { country, homeCity, currentMonth, liveWeather } = req.body;
        const prompt = `Act as a brutally honest, elite global travel scout. Generate a concise Live Intelligence Dossier for visiting ${country} in ${currentMonth || 'this month'}.
${homeCity ? `Traveler home base: ${homeCity}.` : ''} ${liveWeather ? `Live weather: ${liveWeather}.` : ''}
Return ONLY valid JSON:
{
  "country": "${country}",
  "goNowVerdict": "GO NOW | GOOD WITH CAVEATS | BETTER TO WAIT",
  "goNowReason": "2 crisp sentences on weather, crowds, and seasonal vibe right now",
  "currencyAndCost": "Local currency + realistic daily budget vs mid-range hotels",
  "visaSnapshot": "Concise visa/entry guidance",
  "bestRightNowSpot": "One specific city/region inside ${country} that shines right now",
  "touristTrapToAvoid": "One overpriced trap or local mistake to dodge",
  "topHighlights": ["Spot 1", "Spot 2", "Spot 3"]
}`;
        const response = await generateJsonWithGemini(ai, prompt, 2048);
        res.json(parseCleanJson(response));
    } catch (error) {
        res.status(500).json({ error: "Failed to generate country dossier", details: error.message });
    }
});

// ROUTE 3: Country Battle Mode
app.post('/api/country-battle', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { countryA, countryB, homeCity, days, hotelBudget, dailySpendingBudget, currentMonth } = req.body;
        if (!countryA || !countryB) return res.status(400).json({ error: 'Please choose two countries to battle.' });
        const prompt = `Act as a brutally honest travel strategist hosting a Head-to-Head Battle: ${countryA} vs. ${countryB}.
Context: Home=${homeCity || 'International'}, Days=${days || 7}, Month=${currentMonth || 'Current'}, Hotel=${hotelBudget || 'Comfort'}, DailySpend=${dailySpendingBudget || 'Moderate'}.
Return ONLY valid JSON:
{
  "headline": "Punchy showdown title",
  "verdictWinner": "${countryA} or ${countryB}",
  "verdictReason": "2-3 sharp sentences explaining why the winner beats the other right now",
  "countryA": { "name": "${countryA}", "vibeTagline": "3-5 words", "flightEstimate": "String", "visaFriction": "String", "hotelValue": "String", "dailyFoodCost": "String", "seasonRightNow": "String", "biggestPro": "String", "biggestCatch": "String", "topPlaces": ["P1","P2","P3"] },
  "countryB": { "name": "${countryB}", "vibeTagline": "3-5 words", "flightEstimate": "String", "visaFriction": "String", "hotelValue": "String", "dailyFoodCost": "String", "seasonRightNow": "String", "biggestPro": "String", "biggestCatch": "String", "topPlaces": ["P1","P2","P3"] },
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
        res.status(500).json({ error: "Failed to run Country Battle", details: error.message });
    }
});

// ROUTE 4: NEW — Hotel & Airbnb BS Detector
app.post('/api/analyze-stay', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { propertyName, listingText } = req.body;
        if (!listingText || listingText.trim().length < 15) {
            return res.status(400).json({ error: 'Please paste a hotel/Airbnb description or guest reviews to inspect.' });
        }
        const prompt = `Act as a ruthless, forensic hospitality inspector and BS detector. Analyze this hotel/Airbnb listing or review text for hidden catches, marketing euphemisms, noise risks, size tricks, location traps, and surprise fees.
Property Name/Location: ${propertyName || 'Unspecified Property'}
Listing / Reviews Text:
"""
${listingText.slice(0, 6000)}
"""

Be brutally honest, sharp, and practical. Return ONLY valid JSON:
{
  "truthScore": 65,
  "verdictLabel": "SAFE BOOKING | PROCEED WITH CAUTION | MARKETING TRAP | WALK AWAY",
  "verdictSummary": "2-sentence no-nonsense summary of what staying here will actually feel like",
  "bsTranslations": [
    { "theyWrote": "Exact quote or phrase from the text", "realMeaning": "Brutally honest translation of what this actually means", "severity": "HIGH | MEDIUM | LOW" }
  ],
  "redFlags": [
    { "title": "Short red flag title (e.g. Hidden Resort Fee / 2 AM Club Noise)", "detail": "Specific explanation of the catch" }
  ],
  "greenFlags": ["Genuine positive found in the text"],
  "hostQuestions": [
    "Sharp, polite question #1 to message the host/hotel before paying",
    "Sharp question #2",
    "Sharp question #3"
  ]
}`;
        const response = await generateJsonWithGemini(ai, prompt, 3072);
        res.json(parseCleanJson(response));
    } catch (error) {
        res.status(500).json({ error: "Failed to analyze property listing", details: error.message });
    }
});

// ROUTE 5: NEW — Street Scam, Weird-Law & Crisis Vault
app.post('/api/scam-vault', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { country, city } = req.body;
        if (!country) return res.status(400).json({ error: 'Please select a country to scan.' });
        const targetArea = city ? `${city}, ${country}` : country;

        const prompt = `Act as an elite international travel security advisor. Build a tactical Street Scam, Weird-Law & Crisis Vault for a traveler visiting ${targetArea}.
Include real, notorious local scams with exact counter-moves, strict local laws/customs traps that cause heavy fines or arrest (including banned OTC medicines, vaping/drones, photography/etiquette laws), real emergency numbers for ${country}, and 5 essential safety/taxi/dietary voice phrases in the primary local language of ${country}.

Return ONLY valid JSON:
{
  "location": "${targetArea}",
  "threatLevel": "LOW | MODERATE | ELEVATED",
  "streetSmartsSummary": "2 crisp sentences on overall safety vibe and the #1 rule for staying sharp here",
  "scams": [
    {
      "name": "Scam Name",
      "risk": "HIGH | MEDIUM",
      "whereItHappens": "Exact hotspot (e.g. Airport arrivals, train stations, nightlife districts)",
      "theSetup": "How scammers hook the traveler step-by-step",
      "counterMove": "Exact action or words to shut it down immediately"
    }
  ],
  "weirdLaws": [
    {
      "law": "Rule or Ban Title (e.g. Cold Medicine Ban / Drone Restriction)",
      "penalty": "Fine or legal consequence",
      "tip": "How to stay 100% compliant"
    }
  ],
  "emergencyNumbers": {
    "police": "Number",
    "ambulance": "Number",
    "touristPoliceOrHelpline": "Number or local helpline info"
  },
  "speechLangCode": "BCP-47 language tag for browser speech synthesis (e.g. ja-JP, th-TH, fr-FR, it-IT, ko-KR, de-DE, ar-AE, hi-IN, es-ES, el-GR, id-ID, nb-NO)",
  "voiceCards": [
    {
      "situation": "Taxi Meter",
      "english": "Please turn on the meter.",
      "localScript": "Phrase in native script",
      "phonetic": "Easy English pronunciation"
    }
  ]
}`;
        const response = await generateJsonWithGemini(ai, prompt, 4096);
        res.json(parseCleanJson(response));
    } catch (error) {
        res.status(500).json({ error: "Failed to load Scam & Crisis Vault", details: error.message });
    }
});

// ROUTE 6: Complete Master Trip Planner
app.post('/api/plan-trip', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const {
            homeCity, departureCity, destinationCountry, destination, selectedPlaces,
            days, hotelBudget, dailySpendingBudget, transitStyle, customBudgetNote, isFirstTime, visitedPlaces
        } = req.body;

        const targetCountry = destinationCountry || destination || 'Destination';
        const numDays = Math.min(Math.max(parseInt(days, 10) || 3, 1), 14);
        const placesToVisitText = (selectedPlaces && selectedPlaces.length > 0)
            ? `Cover these places in ${targetCountry}: ${selectedPlaces.join(', ')}.`
            : `Select the best cities/regions in ${targetCountry} for ${numDays} days.`;
        const exclusionRule = (isFirstTime === 'no' && visitedPlaces)
            ? `CRITICAL: User already visited ${visitedPlaces}. DO NOT include any of them.`
            : `First time visiting ${targetCountry}.`;

        const prompt = `Act as an elite travel architect. Build a complete day-by-day plan:
- Home: ${homeCity} | Departure Airport City: ${departureCity} | Country: ${targetCountry} | Days: ${numDays}
- Places: ${placesToVisitText}
- Split Budget: Hotel=${hotelBudget || 'Comfort'}, Daily Food/Sights=${dailySpendingBudget || 'Moderate'}, Transit=${transitStyle || 'Smart Mix'}, Note=${customBudgetNote || 'Respect split budget'}
- Rule: ${exclusionRule}
Keep descriptions concise (1-2 sentences). Include 4-5 chronological schedule items per day (Day 1 to Day ${numDays}) plus exact wakeUpTime and sleepTime.
Return ONLY valid JSON:
{
  "summary": {
    "tripTitle": "String",
    "budgetStrategySummary": "String",
    "homeToDepartureTransit": "String",
    "flightStrategy": "String",
    "recommendedStay": { "name": "String", "area": "String", "details": "String" },
    "localTransportGuide": "String"
  },
  "days": [
    {
      "dayNumber": 1,
      "dayTitle": "String",
      "wakeUpTime": "07:00 AM",
      "sleepTime": "10:30 PM",
      "schedule": [
        { "time": "08:00 AM - 10:00 AM", "category": "Meal | Activity | Transit | Stay", "title": "String", "location": "String", "transport": "String", "costNote": "String", "description": "String" }
      ]
    }
  ]
}`;
        const response = await generateJsonWithGemini(ai, prompt, 8192);
        res.json(parseCleanJson(response));
    } catch (error) {
        res.status(500).json({ error: "Failed to generate itinerary", details: error.message || "Unknown server error" });
    }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
