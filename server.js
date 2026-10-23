const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Password Protection Middleware
const checkPassword = (req, res, next) => {
    if (req.headers['x-site-password'] === 'mysecretpassword') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.post('/api/plan-trip', checkPassword, async (req, res) => {
    try {
        const { 
            homeCity, 
            departureCity, 
            destination, 
            days, 
            budget, 
            isFirstTime, 
            visitedPlaces 
        } = req.body;

        const exclusionRule = (isFirstTime === 'no' && visitedPlaces) 
            ? `CRITICAL RULE: The user has visited ${destination} before and already saw: ${visitedPlaces}. DO NOT include any of these places in the itinerary. Suggest completely different, fresh attractions and neighborhoods.` 
            : `This is the user's first time visiting ${destination}, so include the best iconic highlights alongside hidden gems.`;

        const prompt = `Act as an elite, hyper-detailed travel architect. Build a complete, minute-by-minute travel plan based on these exact parameters:
- Home City (where the user lives): ${homeCity}
- Departure Flight City (where they take the flight/main transit from): ${departureCity}
- Destination: ${destination}
- Duration: ${days} Days
- Budget Tier: ${budget}
- Experience Rule: ${exclusionRule}

You must decide EVERYTHING for the traveler:
1. How to get from ${homeCity} to the airport/station in ${departureCity} (if they are different cities, specify train/drive/domestic flight; if the same, specify local airport transfer).
2. Exact hotel/stay recommendation matching the ${budget} budget (name, neighborhood, why it fits).
3. Local transportation strategy at the destination.
4. For EVERY SINGLE DAY (Day 1 to Day ${days}), provide:
   - Exact Wake-Up Time (e.g., "07:00 AM")
   - A complete chronological schedule from morning until night including:
     * Wake up & morning routine
     * Breakfast (exact time, specific restaurant/cafe name, what to eat)
     * Morning & Afternoon Activities (exact times, specific places, and EXACT transportation to take between each stop + travel duration)
     * Lunch (exact time, specific restaurant name, dish recommendation)
     * Evening Activities & Dinner (exact time, specific restaurant name, transportation back to the hotel)
     * Sleep / Return to hotel time

Return the response in STRICT JSON format matching this exact structure (no markdown formatting, just raw JSON):
{
  "summary": {
    "tripTitle": "String",
    "homeToDepartureTransit": "String explaining how to travel from home city to departure city/airport",
    "flightStrategy": "String explaining flight route from departure city to destination",
    "recommendedStay": {
      "name": "String (Hotel/Hostel/Resort Name)",
      "area": "String (Neighborhood)",
      "details": "String (Why this stay fits the budget and nightly estimate)"
    },
    "localTransportGuide": "String (Best passes, apps, or transit methods to use)"
  },
  "days": [
    {
      "dayNumber": 1,
      "dayTitle": "String (Theme of the day)",
      "wakeUpTime": "String (e.g. 06:30 AM)",
      "sleepTime": "String (e.g. 10:30 PM)",
      "schedule": [
        {
          "time": "String (e.g. 07:30 AM - 08:30 AM)",
          "category": "Meal | Activity | Transit | Stay",
          "title": "String (Name of place, restaurant, or action)",
          "location": "String (Neighborhood or address area)",
          "transport": "String (Exact transit to get here, e.g. 'Take Metro Line 2 for 15 mins' or '5 min walk')",
          "description": "String (What to do, what to eat, or tips)"
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

        // Safely extract text whether SDK returns property or function
        let rawText = typeof response.text === 'function' ? response.text() : response.text;
        
        // Clean markdown codeblocks if present
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
