import { NextResponse } from 'next/server';

// Server-side API route that proxies Pinata public files endpoint and returns a simplified "tracks" list.
// Requires PINATA_JWT environment variable to be set on the server (do NOT expose this to the client).
export async function GET(req) {
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

    return NextResponse.json({ tracks });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
