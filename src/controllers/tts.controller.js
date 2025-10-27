//controllers/tts.controller.js
import { translateText, textToSpeech, getTTS } from "../services/tts.service.js";

export async function generate(req, res) {
  try {
    const {
      text = "",
      source = "auto",
      target = "fil", // or "tl"
    } = req.body || req.query;

    if (!text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "'text' is required" });
    }

    let translated, audio;

    // 1) Translate (only if needed inside your translateText impl)
    if(target === "eng") {
      audio = await textToSpeech(text);
    } else {
      translated = await translateText(text, source, target);
      audio = await getTTS(translated);
    }

    // 2) TTS — design your service to return either:
    // - a Node Readable stream,
    // - a fetch Response (with .body as a stream),
    // - a Buffer / ArrayBuffer / base64 string.

    // 3) Set headers once before sending audio
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="tts.mp3"',
      "Cache-Control": "no-store",
      "Accept-Ranges": "bytes", // enables scrubbing/seek bar in some browsers
    });

    // 4) Send depending on the returned type
    if (audio?.pipe) {
      // Node Readable stream
      return audio.pipe(res);
    }

    if (audio?.body?.pipe) {
      // fetch Response-like object (e.g., node-fetch)
      return audio.body.pipe(res);
    }

    if (Buffer.isBuffer(audio)) {
      return res.end(audio);
    }

    if (audio instanceof ArrayBuffer) {
      return res.end(Buffer.from(audio));
    }

    if (typeof audio === "string") {
      // assume base64 MP3
      return res.end(Buffer.from(audio, "base64"));
    }

    // If your textToSpeech returns a Uint8Array
    if (audio?.constructor?.name === "Uint8Array") {
      return res.end(Buffer.from(audio));
    }

    // Fallback: unexpected type
    return res.status(500).json({
      success: false,
      message: "Unexpected TTS response type from textToSpeech()",
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error?.message || "TTS generation failed",
    });
  }
}
