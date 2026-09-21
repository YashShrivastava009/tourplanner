const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
    res.send('Million-Dollar AI Travel Planner API is online and secure.');
});

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/plan-trip', async (req, res) => {
    try {
        const { origin, destination, days, budget } = req.body;
        
        const prompt = `Act as an expert travel architect. The user is traveling from ${origin} to ${destination} for ${days} days on a ${budget} budget.
        Determine if this is a domestic or international trip and account for travel time.
        Provide a detailed day-by-day itinerary including morning, afternoon, and evening activities, plus hotel and restaurant recommendations. 
        Format the response in strict JSON format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        res.json(JSON.parse(response.text()));
    } catch (error) {
        console.error("AI Generation Error:", error);
        res.status(500).json({ error: "Failed to generate itinerary" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Million-dollar server running on port ${PORT}`);
});
