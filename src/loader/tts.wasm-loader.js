// src/loader/tts.wasm-loader.js
// ESM; Node 18+
// 1) Recursively find the .wasm inside the installed "text2wav" package
// 2) Intercept fetch() only for that .wasm and return bytes from disk
// 3) Keep instantiateStreaming fast-path with silent fallback

import { promises as fs } from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

async function walk(dir, depth = 0, maxDepth = 6) {
  const out = [];
  if (depth > maxDepth) return out;
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walk(p, depth + 1, maxDepth));
    } else {
      out.push(p);
    }
  }
  return out;
}

async function resolveEspeakWasmPath() {
  // 0) Allow manual override
  if (process.env.TEXT2WAV_ESPEAK_WASM_PATH) {
    return process.env.TEXT2WAV_ESPEAK_WASM_PATH;
  }

  // 1) Find the package root
  const pkgJsonPath = require.resolve("text2wav/package.json");
  const pkgDir = path.dirname(pkgJsonPath);

  // 2) Try common candidates first
  const candidates = [
    "dist/espeakng.wasm",
    "espeakng.wasm",
    "dist/assets/espeakng.wasm",
    "assets/espeakng.wasm",
    "build/espeakng.wasm",
    "esm/espeakng.wasm",
    "cjs/espeakng.wasm",
  ].map(p => path.join(pkgDir, p));

  for (const p of candidates) {
    try {
      const st = await fs.stat(p);
      if (st.isFile()) return p;
    } catch {}
  }

  // 3) Fall back to recursive search for ANY .wasm in the package
  const allFiles = await walk(pkgDir);
  const wasmFiles = allFiles.filter(f => f.toLowerCase().endsWith(".wasm"));

  // Prefer filenames that look like eSpeak
  const prefer = wasmFiles.find(f => /espeak/.test(f.toLowerCase()))
             || wasmFiles.find(f => /speak/.test(f.toLowerCase()))
             || wasmFiles[0];

  if (prefer) return prefer;

  // 4) Nothing found — print helpful debug and throw
  console.warn("[text2wav] package dir:", pkgDir);
  try {
    const dist = path.join(pkgDir, "dist");
    console.warn("[text2wav] dist/ listing:", await fs.readdir(dist).catch(() => []));
  } catch {}
  throw new Error("Could not find any *.wasm inside the installed 'text2wav' package");
}

const wasmPath = await resolveEspeakWasmPath();

// Ensure fetch exists (Node 18+ has it)
if (!globalThis.fetch) {
  const { default: nodeFetch } = await import("node-fetch");
  globalThis.fetch = nodeFetch;
}

// Intercept ONLY the WASM fetch that text2wav performs
const { readFile } = await import("fs/promises");
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const s = typeof url === "string" ? url : (url?.url ?? "");
  if (s && s.toLowerCase().endsWith(".wasm")) {
    const buf = await readFile(wasmPath);
    return new Response(buf, { status: 200, headers: { "Content-Type": "application/wasm" } });
  }
  return origFetch(url, init);
};

// Keep streaming fast-path, silently fall back if it fails
if (typeof WebAssembly.instantiateStreaming === "function") {
  const orig = WebAssembly.instantiateStreaming;
  WebAssembly.instantiateStreaming = async (respPromise, imports) => {
    try {
      return await orig(respPromise, imports);
    } catch {
      const resp = await respPromise;
      const buf = await resp.arrayBuffer();
      return await WebAssembly.instantiate(buf, imports);
    }
  };
}
