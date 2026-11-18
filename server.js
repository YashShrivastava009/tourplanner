const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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

// ROUTE 1: Gemini AI Live Place Recommender for any Country
app.post('/api/recommend-places', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();
        const { country } = req.body;
        const prompt = `List the top 10 best cities, regions, or iconic travel destinations to visit in ${country}. 
        Return ONLY a strict JSON array of strings, for example: ["Place 1", "Place 2", "Place 3"]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        let rawText = typeof response.text === 'function' ? response.text() : response.text;
        rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        res.json({ places: JSON.parse(rawText) });
    } catch (error) {
        console.error("Place Recommendation Error:", error);
        res.status(500).json({ error: "Failed to fetch recommendations", details: error.message });
    }
});

// ROUTE 2: Complete Master Trip Planner
app.post('/api/plan-trip', checkPassword, async (req, res) => {
    try {
        const ai = getGeminiClient();

        const { 
            homeCity, 
            departureCity, 
            destinationCountry,
             destination, // fallback if older frontend calls it
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

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
            }
        });

        let rawText = typeof response.text === 'function' ? response.text() : response.text;
        if (!rawText) {
            throw new Error('Gemini returned an empty response. Please try fewer days or check your API quota.');
        }

        rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsedData = JSON.parse(rawText);
        res.json(parsedData);

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ 
            error: "Failed to generate itinerary", 
            details: error.message || "Unknown server error" 
        });
    }
});

// Serve the main frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
