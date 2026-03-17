# Rodinha API

A Next.js-based API server that serves as a gatekeeper and cache for the Rodinha gateway, providing access to music beats through Pinata IPFS integration.

## Features

- **Pinata IPFS Integration:** Fetch and manage audio files stored on IPFS via Pinata
- **CORS Support:** Configured to serve allowed origins
- **Type-Safe:** Built with TypeScript strict mode
- **Fast Development:** Turbo-powered dev server for rapid iteration

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
PINATA_JWT=your_pinata_jwt_here
```

### Development

Start the development server:

```bash
npm run dev
```

The server will be available at [http://localhost:3000](http://localhost:3000)

### Production

Build for production:

```bash
npm run build
npm start
```

## API Endpoints

### GET /api/pinata/tracks

Fetches audio tracks from Pinata IPFS.

**Query Parameters:**
- `group` (string): Filter tracks by group

**Response:**
```json
{
  "tracks": [
    {
      "name": "track_name",
      "artist": "artist_name",
      "url": "https://gateway.pinata.cloud/ipfs/..."
    }
  ]
}
```

**Allowed Origins:**
- `http://localhost:3000`
- `https://rodinha.pt`
- `https://rodinha.umaboaquestao.pt`

## Development Guidelines

Refer to [AGENTS.md](./AGENTS.md) for detailed development guidelines, code style conventions, and common tasks.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Pinata Documentation](https://docs.pinata.cloud/)
- [IPFS Documentation](https://docs.ipfs.tech/)
