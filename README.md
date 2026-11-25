# Car Rental Search CLI & Load-Balanced HTTP Service

A modular Node.js rental car application that queries the FlightOTA Car Rental API (`POST /car/v0/search`), filters and sorts vehicle results, and runs as both a terminal CLI and a load-balanced HTTP service across `Web01` and `Web02` behind an Nginx load balancer (`Lb01`).

## Features

- **FlightOTA Car Rental API Integration:** Sends `POST /car/v0/search` requests with `X-Api-Key` and `X-Api-Secret` headers and automatic fallback sample data when offline or in sandbox testing without credentials.
- **CLI & HTTP Interfaces:** Search, filter, and sort rental cars directly in the terminal (`index.js`) or over REST (`server.js`).
- **Load-Balanced Multi-Server Architecture:** Exposes `/health` and `/cars` endpoints with `X-Served-By` headers and `serverId` fields to verify round-robin traffic across `Web01` and `Web02` via `Lb01`.

## Project Structure

```text
├── index.js                      # CLI entry point
├── server.js                     # HTTP server (/health and /cars)
├── package.json                  # Project scripts (start, serve)
├── .env.example                  # Environment variable template
├── .gitignore                    # Excludes .env, node_modules/, and logs
├── ngix/
│   └── lb01.conf                 # Nginx upstream load balancer configuration
└── src/
    ├── apiClient.js              # FlightOTA POST /car/v0/search client + fallback data
    └── Formatter.js              # Filtering, sorting, and terminal table renderer

    ## Prerequisites

- **Node.js** v20.6+ (uses built-in `--env-file=.env` and native `fetch`)
- **Nginx** (on `Lb01` for load balancing)
- **FlightOTA API Credentials** (`API_KEY` and `API_SECRET` from the FlightOTA agent portal, with outbound server IPs whitelisted)

**Supported CLI Flags:**
- `--pickup <CODE>` — Airport/location IATA code (e.g., `KGL`, `LHR`)
- `--from <ISO_DATETIME>` — Pickup date/time (e.g., `2026-12-20T10:00:00`)
- `--to <ISO_DATETIME>` — Drop-off date/time (e.g., `2026-12-27T10:00:00`)
- `--driver-age <AGE>` — Main driver age (defaults to `DRIVER_AGE` or `32`)
- `--category <TYPE>` — Vehicle category (e.g., `suv`, `sedan`)
- `--transmission <TYPE>` — `automatic` or `manual`
- `--max-price <AMOUNT>` — Maximum daily rate
- `--query <TEXT>` — Keyword filter across model, supplier, and pickup location
- `--sort <ORDER>` — `price` (ascending) or `price-desc` (descending)

## Usage

### CLI Mode (`index.js`)

```bash
# List all available vehicles
npm start

# Filter by pickup location, category, and sort by ascending price
npm start -- --pickup KGL --category suv --sort price

# Search with dates, driver age, transmission, and max price
npm start -- --pickup LHR --from 2026-12-20T10:00:00 --to 2026-12-27T10:00:00 --driver-age 32 --transmission automatic --max-price 60 --sort price-desc

# Keyword search by model, supplier, or pickup code
npm start -- --query Avis
```