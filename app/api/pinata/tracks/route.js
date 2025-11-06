import { NextResponse } from 'next/server';

// Server-side API route that proxies Pinata public files endpoint and returns a simplified "tracks" list.
// Requires PINATA_JWT environment variable to be set on the server (do NOT expose this to the client).
export async function GET(req) {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "https://rodinha.pt",
    "https://rodinha.umaboaquestao.pt"
  ];

  // if your API should respond only to allowed origins:
  const isAllowed = allowedOrigins.includes(origin);

  try {
    const url = new URL(req.url);
    const group = url.searchParams.get('group');

    const PINATA_JWT = process.env.PINATA_JWT;
    if (!PINATA_JWT) {
      return NextResponse.json({ error: 'Missing PINATA_JWT env var' }, { status: 500 });
    }

    const pinataUrl = `https://api.pinata.cloud/v3/files/public?limit=50&group=${group}&order=DESC`;
    const res = await fetch(pinataUrl, {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: 'Pinata request failed', details: text }, { status: res.status });
    }

    const json = await res.json();
    const files = json?.data?.files || [];

    // Map Pinata file objects to the shape expected by MusicPlayer
    const tracks = files
      .filter(f => f.mime_type && f.mime_type.startsWith('audio'))
      .map(f => ({
        name: f.name,
        artist: f.keyvalues?.artist || '',
        url: `https://gateway.pinata.cloud/ipfs/${f.cid}`
      }));

    const response = NextResponse.json({ tracks });

    response.headers.set("Access-Control-Allow-Origin", isAllowed ? origin : allowedOrigins.last);
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    return response;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Needed to handle browser preflight (OPTIONS) requests
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
}
