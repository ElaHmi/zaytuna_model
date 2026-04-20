import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { pipeline } from '@huggingface/transformers';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads (to disk)
const upload = multer({ dest: 'uploads/' });

// Initialize the transformers.js pipeline
let classifier = null;
const modelName = 'Xenova/clip-vit-base-patch32';

async function initModel() {
    console.log(`Loading model ${modelName}... This may take a while the first time.`);
    try {
        // Use 'zero-shot-image-classification' pipeline for CLIP
        classifier = await pipeline('zero-shot-image-classification', modelName);
        console.log('Model loaded successfully!');
    } catch (error) {
        console.error('Error loading model:', error);
    }
}

// Start loading the model in the background
initModel();

// Helper to determine threshold based on age
function getThreshold(age) {
    const parsedAge = parseInt(age, 10);
    // CLIP probabilities sum to 1. With many negative labels, a correct sketch
    // usually gets between 0.15 and 0.50.
    if (isNaN(parsedAge)) return 0.20; 
    if (parsedAge <= 6) return 0.08; // Super lenient for toddlers (just needs to slightly prefer the target)
    if (parsedAge <= 12) return 0.15; // Moderate for older kids
    return 0.22; // Standard for teens/adults
}

// API endpoint to process the image and verify against the theme
app.post('/api/verify', upload.single('image'), async (req, res) => {
    if (!classifier) {
        return res.status(503).json({ error: 'Model is still loading. Please try again in a few seconds.' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No image provided.' });
    }

    const themeTag = req.body.theme;
    const age = req.body.age;

    if (!themeTag) {
        return res.status(400).json({ error: 'Theme tag required.' });
    }

    try {
        const filepath = path.join(__dirname, req.file.path);

        // To prevent "false positives", we must give CLIP other objects to choose from.
        // If we only offer "Apple" and "Empty Paper", a drawing of a "Car" will score highest as "Apple"
        const baselineObjects = [
            'person', 'face', 'cat', 'dog', 'car', 'house', 'tree', 'sun', 
            'flower', 'boat', 'bird', 'airplane', 'ball', 'sword', 'monster',
            'plate of food', 'mosque', 'embroidery'
        ];

        // Filter out the requested theme from the baselines to avoid duplicates
        const negativeLabels = baselineObjects
            .filter(obj => obj.toLowerCase() !== themeTag.toLowerCase())
            .map(obj => `a sketch of a ${obj}`);

        // We use prompt engineering to help CLIP understand it's evaluating a simple drawing
        const labels = [
            `a sketch of a ${themeTag}`, 
            `a drawing of a ${themeTag}`,
            `a photo of a ${themeTag}`,
            ...negativeLabels,
            'random disorganized scribbles'
        ];

        console.log(`Processing verification for theme: "${themeTag}", age: ${age}`);

        const results = await classifier(filepath, labels);
        
        // Cleanup temp file
        fs.unlink(filepath, (err) => {
            if (err) console.error("Could not delete temp file:", err);
        });

        // Find the combined score for positive matches (child's drawing + general photo + scribble)
        // versus the negative matches (random noise, empty)
        let positiveScore = 0;
        let bestMatch = null;
        let highestConfidence = 0;

        results.forEach(result => {
            if (result.label.includes(themeTag)) {
                positiveScore += result.score;
            }
            if (result.score > highestConfidence) {
                highestConfidence = result.score;
                bestMatch = result.label;
            }
        });

        const threshold = getThreshold(age);
        const isVerified = positiveScore >= threshold;

        res.json({
            isVerified,
            aiMatchScore: parseFloat(positiveScore.toFixed(4)),
            thresholdRequired: threshold,
            ageUsed: age,
            themeTag: themeTag,
            bestMatchLabel: bestMatch,
            rawResults: results // send back raw results for debugging in sandbox
        });

    } catch (error) {
        console.error('Error during verification:', error);
        res.status(500).json({ error: 'Error processing the image.' });
    }
});

app.listen(port, () => {
    console.log(`AI Prototype Server listening at http://localhost:${port}`);
    console.log(`Test UI available at http://localhost:${port}/index.html`);
});
