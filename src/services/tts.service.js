//services/transword.service.js
// Node.js TransWord AI Translation Service
//
// Usage example:
//   import { translateText } from './transword.service.js';
//   const result = await translateText("Hello world", "auto", "tl");
//   console.log(result.translated_text);

import axios from "axios";
import NodeCache from "node-cache";
import { env } from "../config/env.js";
import "../loader/tts.wasm-loader.js";
import text2wav from "text2wav";
import * as WavDecoder from "wav-decoder";
import lamejs from "@breezystack/lamejs";
import {
  getAPIKey,
  addUsage,
} from "../services/api-key-management.service.js";

// Cache (TTL = 60s)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

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

export async function getTTS(text) {
  const cachedKey = `voice_${text}`;
  const fromCache = cache.get(cachedKey);
  if (fromCache) {
    return fromCache;
  }

  const voiceId = "R1MAbyNnkCIOvchKvLeH";
  const modelId = "eleven_multilingual_v2";
  const apiKey = await getAPIKey("elevenlabs");
  if (!apiKey?.apiKey) throw new Error("Missing key");

  // Use REST streaming endpoint via fetch to keep Edge-compatible:
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey?.apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: modelId }),
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err);
  }

  await addUsage(apiKey?.id);

  const arr = await resp.arrayBuffer();
  cache.set(cachedKey, Buffer.from(arr));
  return Buffer.from(arr);
}

// helper(s) kept local for a single-file drop-in
function floatToInt16(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    let s = float32[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
function bufferToArrayBuffer(buf) {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/**
 * Generate MP3 from text using pure Node (no external APIs).
 * @param {string} text
 * @param {{ voice?: string, kbps?: number, returnType?: 'buffer'|'arraybuffer'|'base64' }} [opts]
 * @returns {Promise<Buffer|ArrayBuffer|string>}
 */
export async function textToSpeech(text, opts = {}) {
  const voice = opts.voice ?? "en"; // eSpeak-NG voice id (e.g., "en", "en+whisper")
  const kbps = opts.kbps ?? 128; // MP3 bitrate (32..320)
  const returnType = opts.returnType ?? "buffer"; // 'buffer' | 'arraybuffer' | 'base64'

  if (!text || !String(text).trim()) {
    throw new Error("textToSpeech: text is empty");
  }

  try {
    // tweaks for eSpeak-NG via text2wav
    const voice = opts.voice ?? "en-GB"; // try: "en-GB", "en-GB-x-rp", "en+f3", "en+m3"
    const speed = opts.speed ?? 150; // slower is more natural
    const pitch = opts.pitch ?? 40; // 0..99; lower reduces “chirp”
    const gapMs = opts.gapMs ?? 80; // pause between words/phrases

    // then:
    const wavU8 = await text2wav(text, {
      voice,
      speed,
      pitch,
      wordGap: Math.round(gapMs / 10),
    });

    // Exact bytes to decoder (respect offset/length)
    const ab = wavU8.buffer.slice(
      wavU8.byteOffset,
      wavU8.byteOffset + wavU8.byteLength
    );

    // 2) Decode WAV → { sampleRate, channelData: Float32Array[] }
    const { sampleRate, channelData } = await WavDecoder.decode(ab);
    const channels = channelData.length || 1;

    // 3) Encode PCM → MP3 (pure JS)
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const frameLen = 1152;
    const chunks = [];

    if (channels === 1) {
      const mono16 = floatToInt16(channelData[0]);
      for (let i = 0; i < mono16.length; i += frameLen) {
        const pcm = mono16.subarray(i, i + frameLen);
        const buf = encoder.encodeBuffer(pcm);
        if (buf && buf.length) chunks.push(Buffer.from(buf));
      }
    } else {
      const L = floatToInt16(channelData[0]);
      const R = floatToInt16(channelData[1]);
      const len = Math.min(L.length, R.length);
      for (let i = 0; i < len; i += frameLen) {
        const l = L.subarray(i, i + frameLen);
        const r = R.subarray(i, i + frameLen);
        const buf = encoder.encodeBuffer(l, r);
        if (buf && buf.length) chunks.push(Buffer.from(buf));
      }
    }

    const end = encoder.flush();
    if (end && end.length) chunks.push(Buffer.from(end));

    const mp3Buf = Buffer.concat(chunks);

    // ↩️ Return in the exact shape you want
    if (returnType === "arraybuffer") return bufferToArrayBuffer(mp3Buf);
    if (returnType === "base64") return mp3Buf.toString("base64");
    return mp3Buf; // default Buffer
  } catch (err) {
    throw new Error(`textToSpeech failed: ${err?.message || err}`);
  }
}
