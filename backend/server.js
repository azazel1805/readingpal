// backend/server.js
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON bodies

const PORT = process.env.PORT || 3000;

// Initialize the Gemini AI model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Endpoint 1: Generate a reading passage
app.post('/generate-passage', async (req, res) => {
    try {
        const { difficulty } = req.body;

        if (!difficulty) {
            return res.status(400).json({ error: 'Difficulty level is required.' });
        }

        const prompt = `
            Create a short English passage for a language learner.
            The difficulty level is "${difficulty}".
            The passage must be between 5 and 10 sentences long.
            The topic should be simple and common, like daily life, hobbies, or nature.
            Do not include a title or any extra formatting. Just the passage text.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ passage: text });

    } catch (error) {
        console.error("Error generating passage:", error);
        res.status(500).json({ error: 'Failed to generate passage.' });
    }
});

// Endpoint 2: Analyze the user's reading and provide feedback
app.post('/analyze-reading', async (req, res) => {
    try {
        const { originalPassage, userTranscript } = req.body;

        if (!originalPassage || !userTranscript) {
            return res.status(400).json({ error: 'Original passage and user transcript are required.' });
        }

        const prompt = `
            You are an expert English pronunciation coach. A user was given a text to read aloud.
            Your task is to compare the original text with the user's speech-to-text transcription and provide detailed feedback.

            --- ORIGINAL TEXT ---
            ${originalPassage}
            --- END ORIGINAL TEXT ---

            --- USER'S TRANSCRIPTION ---
            ${userTranscript}
            --- END USER'S TRANSCRIPTION ---

            Analyze the differences and provide feedback in a structured JSON format.
            The JSON object must have two keys: "overallFeedback" and "mistakes".
            - "overallFeedback": A brief, encouraging summary of the performance (1-2 sentences).
            - "mistakes": An array of objects, where each object represents a specific error.

            Each mistake object in the array should have the following keys:
            - "type": Can be "mispronunciation", "omission" (missed word), or "insertion" (added word).
            - "originalWord": The word from the original text that was misread or omitted. Should be null for an "insertion".
            - "userWord": The word the user said instead. Should be null for an "omission".
            - "context": The part of the original sentence where the error occurred to provide context.

            Example of a perfect response (no mistakes):
            {
              "overallFeedback": "Excellent reading! You pronounced everything perfectly.",
              "mistakes": []
            }

            Example of a response with mistakes:
            {
              "overallFeedback": "Good job! You have a few areas to work on, particularly with vowel sounds.",
              "mistakes": [
                { "type": "mispronunciation", "originalWord": "live", "userWord": "leave", "context": "I live in a small apartment." },
                { "type": "omission", "originalWord": "very", "userWord": null, "context": "The weather is very sunny." },
                { "type": "insertion", "originalWord": null, "userWord": "like", "context": "I enjoy to reading books." }
              ]
            }

            Now, analyze the provided texts and return only the JSON object. Do not include any other text or markdown formatting like \`\`\`json.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let feedbackJsonText = response.text();
        
        // Clean up the response to ensure it's valid JSON
        feedbackJsonText = feedbackJsonText.replace(/```json/g, '').replace(/```/g, '').trim();

        const feedback = JSON.parse(feedbackJsonText);
        res.json(feedback);

    } catch (error) {
        console.error("Error analyzing reading:", error);
        res.status(500).json({ error: 'Failed to analyze reading.' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});