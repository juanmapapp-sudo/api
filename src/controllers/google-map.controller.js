import fetch from "node-fetch";
import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// GeoJSON → array of rings with {lat,lng}
function geojsonToLatLngPaths(geojson) {
  const toRing = (ring) => ring.map(([lng, lat]) => ({ lat, lng }));
  if (!geojson) return [];
  if (geojson.type === "Polygon") return geojson.coordinates.map(toRing);
  if (geojson.type === "MultiPolygon") return geojson.coordinates.flat(1).map(toRing);
  return [];
}

// pick the best candidate near a hint coordinate using bounding box
function pickBestCandidate(candidates, hint) {
  const score = (d) => {
    const bb = (d.boundingbox || []).map(parseFloat); // [south, north, west, east]
    if (bb.length !== 4) return Number.POSITIVE_INFINITY;
    const [south, north, west, east] = bb;
    const inside = hint && hint.lat >= south && hint.lat <= north && hint.lng >= west && hint.lng <= east;
    if (inside) return 0;
    const cx = (west + east) / 2, cy = (south + north) / 2;
    const dx = hint ? (hint.lng - cx) : 0, dy = hint ? (hint.lat - cy) : 0;
    return Math.hypot(dx, dy);
  };
  return candidates.sort((a, b) => score(a) - score(b))[0];
}

export async function getGeoBoundary(req, res) {
  try {
    const q = (req.query.q || "San Juan City").toString();
    const hintLat = req.query.hintLat ? parseFloat(req.query.hintLat) : undefined;
    const hintLng = req.query.hintLng ? parseFloat(req.query.hintLng) : undefined;
    if (!q) return res.status(400).json({ success: false, message: "q is required" });

    const cacheKey = `nominatim:${q}:${hintLat ?? "14.603179674407787"}:${hintLng ?? "121.03603853653271"}`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json(hit);

    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "JuanMap/1.0 (support@yourdomain.com)",
      },
    });

    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
    const data = await r.json();

    const candidates = (data || []).filter(
      (d) => d?.geojson && (d.geojson.type === "Polygon" || d.geojson.type === "MultiPolygon")
    );
    if (!candidates.length)
      return res.status(404).json({ success: false, message: "No polygon found" });

    const best = pickBestCandidate(
      candidates,
      hintLat && hintLng ? { lat: hintLat, lng: hintLng } : undefined
    );

    const paths = geojsonToLatLngPaths(best.geojson);

    // 👇 NEW: compute outer rings only (first ring of each polygon)
    let outerRings = [];
    if (best.geojson.type === "Polygon") {
      outerRings = [paths[0]]; // first ring is the outer boundary
    } else if (best.geojson.type === "MultiPolygon") {
      // keep polygon structure to get the first ring of each polygon
      outerRings = best.geojson.coordinates.map(poly =>
        poly[0].map(([lng, lat]) => ({ lat, lng }))
      );
    }

    const payload = {
      name: best?.name || q,
      displayName: best?.display_name || q,
      bbox: best?.boundingbox || null,
      paths,        // all rings (outer + holes)
      outerRings,   // 👈 add this: only outers (for outline + mask + geofence)
    };

    cache.set(cacheKey, payload);
    return res.status(200).json({ success: true, data: payload });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ success: false, message: String(e) });
  }
}
