import fetch from 'node-fetch';

/** Google Encoded Polyline -> [{lat,lng}, ...] */
function decodePolyline(encoded = '') {
  if (!encoded || typeof encoded !== 'string') return [];
  let index = 0, lat = 0, lng = 0;
  const coords = [];

  while (index < encoded.length) {
    let b, shift = 0, result = 0;

    // latitude
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    // longitude
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

const stripHtml = (s = '') =>
  String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

export async function getRouteByEndpoint(req, res) {
  try {
    const { origin, destination, mode = 'driving' } = req.body || {};
    if (
      !origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
      !destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        error: 'origin and destination are required as { lat: number, lng: number }'
      });
    }

    // const key = process.env.GMAPS_SERVER_KEY;
    const key = "AIzaSyDR-W089hOKqMTmH7PQWvpU1P4TxegKqXY";
    if (!key) {
      return res.status(500).json({ success: false, error: 'GMAPS_SERVER_KEY is not set' });
    }

    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    url.searchParams.set('mode', mode);
    url.searchParams.set('alternatives', 'false');
    url.searchParams.set('key', key);

    const j = await (await fetch(url)).json();

    if (j.status !== 'OK' || !j.routes?.length) {
      return res.status(422).json({
        success: false,
        error: j.error_message || 'No route found',
        gmapsStatus: j.status
      });
    }

    const route = j.routes[0];
    const leg = route.legs?.[0];

    const path = decodePolyline(route.overview_polyline?.points || '');

    const steps = (leg?.steps || []).map((s) => ({
      polyline: decodePolyline(s.polyline?.points || ''),
      distance: s.distance?.value ?? 0,
      distanceText: s.distance?.text ?? '',
      street: stripHtml(s.html_instructions ?? '')
    }));

    return res.json({
      data: {
        overviewPath: path,
        steps,
        totalDistanceText: leg?.distance?.text ?? '',
        durationText: leg?.duration?.text ?? '',
        arrivalTimeText: leg?.arrival_time?.text ?? ''
      },
      success: true
    });
  } catch (err) {
    console.error('getRouteByEndpoint error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch route' });
  }
}
