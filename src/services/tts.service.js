//services/transword.service.js
// Node.js TransWord AI Translation Service
//
// Usage example:
//   import { translateText } from './transword.service.js';
//   const result = await translateText("Hello world", "auto", "tl");
//   console.log(result.translated_text);

import axios from "axios";
import NodeCache from "node-cache";
import { env } from '../config/env.js';
// Cache (TTL = 60s)
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

/**
 * Translates text using TransWord AI public API.
 * @param {string} text - The text to translate
 * @param {string} source - Source language code (e.g., "en", "auto")
 * @param {string} target - Target language code (e.g., "tl", "ja", "fr")
 * @param {object} [options] - Optional parameters
 * @returns {Promise<object>} { translated_text, source_language, target_language }
 */
export async function translateText(
  text,
  source = "auto",
  target = "en",
  options = {}
) {
  if (!text?.trim()) throw new Error("No text provided for translation.");

  const cachedKey = `${text}_${source}_${target}`;
  
  const fromCache = cache.get(cachedKey);
  if (fromCache) {
    return fromCache;
  }

  const payload = {
    source_text: text,
    source_language: source,
    target_language: target,
    category: options.category || "general",
    creativity: options.creativity || "medium",
    audience: options.audience || "general",
    special_considerations: options.special_considerations || "",
    avoidRepetition: options.avoidRepetition ?? false,
    useSynonyms: options.useSynonyms ?? false,
    multipleAlternatives: options.multipleAlternatives ?? false,
  };

  try {
    const { data } = await axios.post(
      "https://api.transword.ai/api/translate/",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          Origin: "https://transword.ai",
          Referer: "https://transword.ai/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        },
        timeout: 20000,
      }
    );

    cache.set(cachedKey, data?.translated_text);
    return data?.translated_text;
  } catch (err) {
    const message = err.response?.data || err.message;
    throw new Error(`TransWord API error: ${message}`);
  }
}


export async function textToSpeech(text) {
  const cachedKey = `voice_${text}`;
  const fromCache = cache.get(cachedKey);
  if (fromCache) {
    return fromCache;
  }


  const voiceId = "R1MAbyNnkCIOvchKvLeH";
  const modelId = "eleven_multilingual_v2";
  const apiKey = env?.elevenLabs?.TTS_KEY;
  if (!apiKey) throw new Error("Missing key");

  // Use REST streaming endpoint via fetch to keep Edge-compatible:
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg"
    },
    body: JSON.stringify({ text, model_id: modelId })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err);
  }

  const arr = await resp.arrayBuffer();
  cache.set(cachedKey, Buffer.from(arr));
  return Buffer.from(arr);
}