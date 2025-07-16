// backend/server.js (Correct and Final Version)

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// This is the route we are debugging. Check it carefully.
app.post('/api/generate-passage', async (req, res) => {
    try {
        const { difficulty } = req.body;
        if (!difficulty) {
            return res.status(400).json({ error: 'Difficulty level is required.' });
        }
        const prompt = `Create a short English passage for a language learner. The difficulty level is "${difficulty}". The passage must be between 5 and 10 sentences long. The topic should be simple and common, like daily life, hobbies, or nature. Do not include a title or any extra formatting. Just the passage text.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        res.json({ passage: text });
    } catch (error) {
        console.error("Error generating passage:", error);
        res.status(500).json({ error: 'Failed to generate passage.' });
    }
});

// The second route for analysis.
app.post('/api/analyze-reading', async (req, res) => {
    try {
        const { originalPassage, userTranscript } = req.body;
        if (!originalPassage || !userTranscript) {
            return res.status(400).json({ error: 'Original passage and user transcript are required.' });
        }
        const prompt = `You are an expert English pronunciation coach. A user was given a text to read aloud. Your task is to compare the original text with the user's speech-to-text transcription and provide detailed feedback in a structured JSON format. The JSON object must have two keys: "overallFeedback" and "mistakes". "overallFeedback": A brief, encouraging summary of the performance (1-2 sentences). "mistakes": An array of objects, where each object represents a specific error. Each mistake object should have: "type" ("mispronunciation", "omission", or "insertion"), "originalWord", "userWord", and "context". Now, analyze the provided texts and return only the JSON object. Do not include any other text or markdown formatting like \`\`\`json. --- ORIGINAL TEXT --- ${originalPassage} --- END ORIGINAL TEXT --- --- USER'S TRANSCRIPTION --- ${userTranscript} --- END USER'S TRANSCRIPTION ---`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let feedbackJsonText = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const feedback = JSON.parse(feedbackJsonText);
        res.json(feedback);
    } catch (error) {
        console.error("Error analyzing reading:", error);
        res.status(500).json({ error: 'Failed to analyze reading.' });
    }
});
app.get('/api/test', (req, res) => {
  console.log("SUCCESS: /api/test route was hit!");
  res.status(200).send("Backend test route is working!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
