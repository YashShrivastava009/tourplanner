const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Gemini API with your Render Environment Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Password Protection Middleware
const checkPassword = (req, res, next) => {
    if (req.headers['x-site-password'] === 'mysecretpassword') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// NEW ROUTE: Gemini AI Live Place Recommender for any Country
app.post('/api/recommend-places', checkPassword, async (req, res) => {
    try {
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
        res.status(500).json({ error: "Failed to fetch recommendations" });
    }
});

// MAIN ROUTE: Complete Master Trip Planner
app.post('/api/plan-trip', checkPassword, async (req, res) => {
    try {
        const { 
            homeCity, 
            departureCity, 
            destinationCountry,
            selectedPlaces,
            days, 
            hotelBudget,
            dailySpendingBudget,
            transitStyle,
            customBudgetNote,
            isFirstTime, 
            visitedPlaces 
        } = req.body;

        const placesToVisitText = (selectedPlaces && selectedPlaces.length > 0)
            ? `The user specifically wants to visit these places in ${destinationCountry}: ${selectedPlaces.join(', ')}. Structure the route logically around these locations.`
            : `Select the best cities and regions in ${destinationCountry} for a ${days}-day trip.`;

        const exclusionRule = (isFirstTime === 'no' && visitedPlaces) 
            ? `CRITICAL RULE: The user has visited ${destinationCountry} before and already saw: ${visitedPlaces}. DO NOT include any of these already-visited places. Suggest fresh attractions and areas.` 
            : `This is the user's first time visiting ${destinationCountry}.`;

        const prompt = `Act as an elite, hyper-detailed travel architect powered by Gemini. Build a complete, minute-by-minute travel plan based on these exact parameters:
- Home City (where the user lives): ${homeCity}
- Flight Departure City (where they board their flight/main transit): ${departureCity}
- Destination Country: ${destinationCountry}
- Specific Places to Cover: ${placesToVisitText}
- Duration: ${days} Days
- CUSTOM SPLIT BUDGET PROFILE:
  * Hotel & Stay Preference: ${hotelBudget}
  * Daily Food & Sights Spending: ${dailySpendingBudget}
  * Local Transit Style: ${transitStyle}
  * Special Budget Instruction: ${customBudgetNote || 'Balance the trip according to the split budget above (e.g., if Hotel is Luxury but Daily Spending is Low, book 5-star stays while recommending affordable street food, local eateries, and free/low-cost attractions).'}
- Experience Rule: ${exclusionRule}

You must decide EVERYTHING for the traveler:
1. How to get from ${homeCity} to the airport/station in ${departureCity} (specify train, road, or domestic flight timing).
2. Flight route from ${departureCity} to ${destinationCountry}.
3. Exact hotel/stay recommendation matching the "${hotelBudget}" tier (name, neighborhood, why it fits their exact hotel preference).
4. Local transportation strategy matching "${transitStyle}" while respecting their "${dailySpendingBudget}" daily spending preference.
5. For EVERY SINGLE DAY (Day 1 to Day ${days}), provide:
   - Exact Wake-Up Time (e.g., "07:00 AM") and Sleep Time
   - Complete chronological schedule from morning until night:
     * Breakfast, Lunch, and Dinner (exact time, specific restaurant/stall name matching "${dailySpendingBudget}" food budget, and what dish to order)
     * Morning, Afternoon & Evening Activities (exact times, specific places, and EXACT transportation to take between each stop + travel duration)

Return the response in STRICT JSON format matching this exact structure (no markdown codeblocks, just raw JSON):
{
  "summary": {
    "tripTitle": "String",
    "budgetStrategySummary": "String explaining how you tailored the hotels vs daily food/activity spending",
    "homeToDepartureTransit": "String explaining how to travel from home city to departure city/airport",
    "flightStrategy": "String explaining flight route from departure city to destination country",
    "recommendedStay": {
      "name": "String (Specific Hotel/Resort/Hostel Name)",
      "area": "String (City & Neighborhood)",
      "details": "String (Why this stay matches their ${hotelBudget} hotel tier and nightly estimate)"
    },
    "localTransportGuide": "String (Best passes, apps, or transit methods matching ${transitStyle})"
  },
  "days": [
    {
      "dayNumber": 1,
      "dayTitle": "String (City & Theme of the day)",
      "wakeUpTime": "String (e.g. 06:30 AM)",
      "sleepTime": "String (e.g. 10:30 PM)",
      "schedule": [
        {
          "time": "String (e.g. 07:30 AM - 08:30 AM)",
          "category": "Meal | Activity | Transit | Stay",
          "title": "String (Name of place, restaurant, or action)",
          "location": "String (City & Neighborhood)",
          "transport": "String (Exact transit to get here + duration)",
          "costNote": "String (Estimated cost level matching their daily spending tier)",
          "description": "String (What to do, what to eat, or insider tips)"
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
            }
        });

        let rawText = typeof response.text === 'function' ? response.text() : response.text;
        rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

        const parsedData = JSON.parse(rawText);
        res.json(parsedData);

    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate itinerary", details: error.message });
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
