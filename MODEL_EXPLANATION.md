# AI Model & Code Documentation: Zaytuna Drawing Classification

This document provides a technical explanation of the AI model and the code structure used in the `ai_prototype` for the Zaytuna educational game. Use this as a reference for integrating the logic into other web applications.

---

## 1. The Model Architecture: CLIP (Contrastive Language-Image Pre-training)
The core of this prototype is the **CLIP model** (`Xenova/clip-vit-base-patch32`), running locally via **Transformers.js**.

### Key Concept: Zero-Shot Classification
Unlike standard AI models that need to be trained on fixed categories (e.g., "Cat" vs "Dog"), CLIP was pre-trained on millions of pairs of images and text from the internet.
- **Natural Language Understanding**: CLIP understands descriptions like *"a child's messy sketch of a mosque"* because it knows what "sketch" and "mosque" look like visually.
- **Flexibility**: You can change the "Theme Tags" (Apple, House, Flower) without ever retraining the model.

---

## 2. Backend Logic: `server.js`

### Model Initialization
The model is loaded using the `pipeline` function from `@huggingface/transformers`.
```javascript
classifier = await pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32');
```
*Note: This runs on the server CPU/GPU. It requires significant RAM (approx. 1-2GB) during initialization.*

### The Verification Algorithm
1. **Prompt Engineering**: We don't just ask the AI "Is this an Apple?". We ask it to compare the image against variations like:
   - `a sketch of a [theme]`
   - `a drawing of a [theme]`
   - `random disorganized scribbles` (to identify non-drawings)
2. **Negative Baselines**: To prevent "false positives," we provide 15+ other objects (cat, house, tree) for the AI to consider. If the drawing of a 'Car' scores higher as a 'Car' than as an 'Apple', the verification fails.
3. **Age-Based Thresholds**:
   - **Age <= 6**: Very lenient (Threshold: ~0.08).
   - **Age 7-12**: Moderate (Threshold: ~0.15).
   - **Age > 12**: Standard (Threshold: ~0.22).

---

## 3. Frontend Logic: `script.js`

### Image Pipeline
- **Canvas to Blob**: In the game, the drawing canvas is converted to a Blob (image file).
- **FormData**: The blob is wrapped in a `FormData` object along with the `theme` and `age` metadata.
- **Fetch**: It is sent via a standard `POST` request to `/api/verify`.

---

## 4. Path to "Relearning" (Active Learning)
To improve the model over time, you should log data to a database (e.g., Supabase).

### Database Schema for Logging
Every verification attempt should be logged to a table like this:
- `id` (uuid)
- `theme_label` (text): What the user was *supposed* to draw.
- `ai_best_match` (text): What the AI *thought* it was.
- `confidence_score` (float): The AI's score.
- `is_verified` (boolean): Did it pass?
- `image_url` (text): Path to the stored `.png` file.
- `user_flagged` (boolean): A field for admins to mark if the AI was wrong.

### How to Improve the Model
By collecting these drawings, you can:
1. **Adjust Thresholds**: If most "Apples" by 5-year-olds score 0.05, you can lower your threshold for that age group.
2. **Fine-Tuning**: Periodically take the drawings you've collected and use them to train a secondary classifier specifically for children's art styles.

---

## 5. Integration Checklist
- [ ] Install dependencies: `npm install @huggingface/transformers multer cors express`
- [ ] Ensure the server has sufficient RAM (2GB+).
- [ ] Implement the `FormData` handler for file uploads.
- [ ] Set up the `initModel()` function to run on server startup.
