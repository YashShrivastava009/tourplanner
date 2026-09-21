const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/plan-trip', async (req, res) => {
    try {
        const { destination, days, budget } = req.body;
        
        const prompt = `Act as a luxury travel architect. Plan a ${days}-day trip to ${destination} with a ${budget} budget. 
        Provide a day-by-day itinerary including morning, afternoon, and evening activities, plus hotel and restaurant recommendations. 
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
