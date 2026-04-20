---
title: Zaytuna AI Drawing Prototype
emoji: 🎨
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Zaytuna AI Drawing Prototype

This is a standalone AI prototype for the Zaytuna educational game. It uses CLIP (specifically `Xenova/clip-vit-base-patch32`) to classify and verify children's drawings against specific theme tags.

## API Usage

You can use this Space as a backend API for your website.

### Verify Drawing
- **Endpoint**: `POST /api/verify`
- **Content-Type**: `multipart/form-data`
- **Body**:
    - `image`: The drawing file (PNG/JPG).
    - `theme`: The target theme (e.g., "apple", "house").
    - `age`: User's age (helps adjust the strictly/threshold).

### Running Locally with Docker
1. Build: `docker build -t zaytuna-ai .`
2. Run: `docker run -p 7860:7860 zaytuna-ai`

## Development
This app uses Express.js and `@huggingface/transformers` (Transformers.js).
