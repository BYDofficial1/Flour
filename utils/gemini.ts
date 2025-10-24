import { GoogleGenAI } from "@google/genai";

// --- Deployment Guide ---
// In your hosting provider's project settings (e.g., Vercel), set this environment variable:
//
// API_KEY="your-gemini-api-key"
//

// This environment supports process.env for accessing environment variables.
// We check for `process` to avoid errors in environments where it might not exist.
// @ts-ignore
const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;

let ai: GoogleGenAI | null = null;

// Only initialize the AI client if the API key is provided.
// The UI components will handle the case where `ai` is null.
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
    console.warn("Gemini API key is not set in the API_KEY environment variable. AI client not initialized. Please set the variable in your deployment environment (e.g., Vercel).");
}

export { ai };