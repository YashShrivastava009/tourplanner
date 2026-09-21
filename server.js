const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- PASSWORD PROTECTION START ---
// We check for a password header. If it's missing or wrong, we send back a 401 Unauthorized status.
const checkPassword = (req, res, next) => {
    // You can change 'mysecretpassword' to anything you want
    if (req.headers['x-site-password'] === 'mysecretpassword') {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};

// Protect the API route
app.post('/api/plan-trip', checkPassword, async (req, res) => {
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
// --- PASSWORD PROTECTION END ---

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Million-dollar server running on port ${PORT}`);
});
