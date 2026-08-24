<p align="center">
  <img src="client/public/brand/png/GenLayer_Logo_White_Large.png" alt="GenLayer" width="320">
</p>

<h1 align="center">GenLayer TypeRace</h1>

<p align="center">A multiplayer typing race about GenLayer</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-0A0C1A?style=flat-square&labelColor=9B6AF6">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-0A0C1A?style=flat-square&labelColor=5B5AFF">
  <img alt="Socket.IO" src="https://img.shields.io/badge/Socket.IO-4-0A0C1A?style=flat-square&labelColor=E37DF7">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-0A0C1A?style=flat-square&labelColor=343A66">
</p>

## About

Type a passage and a car moves across a track above the text, driven by how fast and how
accurately you type

- **Three tiers** Genesis, Consensus and Byzantine, from plain language up to Intelligent Contract code
- **Two modes** first past the finish line, or the most correct words in 60 seconds
- **Solo practice** against a ghost car running at your own best pace
- **Live races** in hosted rooms with an invite link, a lobby and a countdown
- **On screen keyboard** under the passage, lighting the next key you need
- **Leaderboard** that remembers your name and keeps your records

Sign in is just a name, with no password, no wallet and nothing to connect

## Run it

```bash
npm install
cp .env.example server/.env
npm run dev
```

Open <http://localhost:5173>, and <http://localhost:5173/admin> to create a race room

## Configure

`server/.env`

| Variable | Default | Notes |
|---|---|---|
| `SESSION_SECRET` | random in dev | Required in production, `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | `genlayer` in dev | Required in production |
| `PUBLIC_URL` | `http://localhost:5173` | The URL players visit |
| `SERVER_PORT` | `8787` | Wins over `PORT` |
| `DATABASE_FILE` | `./data/genlayer-typerace.db` | SQLite file |

## Deploy

```bash
docker build -t genlayer-typerace .
docker run -d -p 8787:8787 \
  -v typerace-data:/app/server/data \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  -e ADMIN_PASSWORD="pick-a-strong-one" \
  -e PUBLIC_URL="https://your-domain" \
  genlayer-typerace
```

Records live in `/app/server/data`, so attach a volume there or a redeploy wipes the leaderboard

- **Railway** uses [`railway.json`](railway.json), and needs a Volume mounted at `/app/server/data`
- **Render** uses [`render.yaml`](render.yaml), which already declares the disk
- **Anywhere else** `npm ci && npm run build && node server/dist/index.js`

## Scripts

| Command | |
|---|---|
| `npm run dev` | Client and API together |
| `npm run build` | Build both |
| `npm start` | Production server |
| `node scripts/race-smoke-test.mjs` | Full two player race against a running server |
| `node scripts/seed-demo.mjs` | Fill an empty leaderboard with sample players |

## Credits

Built by [@Hellishnum1](https://x.com/Hellishnum1)

An unofficial community project. GenLayer and its brand assets belong to
[GenLayer](https://genlayer.com)

MIT, see [LICENSE](LICENSE)
