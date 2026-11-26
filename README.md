# Car Rental Finder

A Node.js command-line application that searches rental cars by pickup location, dates, category, transmission and price. The same code also runs as a small HTTP service (`server.js`) so it can be deployed on two web servers and balanced by an Nginx load balancer.

If no API credentials are configured (or the API call fails), the app falls back to a built-in sample dataset, so it always returns results.

## Project structure

```
.
├── index.js          # CLI entry point
├── server.js         # HTTP service (/health and /cars) used behind the load balancer
├── package.json
└── src/
    ├── ApiClient.js  # Calls the rental API (or returns sample data)
    └── Formatter.js  # Filtering, sorting and terminal table output
```

## Requirements

- Node.js 20.6 or newer (needed for `--env-file`). The servers run Ubuntu 20.04, whose default Node is v10, so Node 20 is installed from NodeSource.
- (Optional) Rental API credentials

## Configuration

The repo includes a `.env.example` template. Copy it to `.env` in the project root and fill in the real values (`.env` is listed in `.gitignore`, so it is never committed and must be created separately on each server):

```bash
cp .env.example .env
```

```
API_BASE_URL=<api base url>   # see .env.example
API_KEY=<your key>
API_SECRET=<your secret>
DRIVER_AGE=32
REQUEST_TIMEOUT_MS=8000
PORT=3000
SERVER_ID=web-01
```

`SERVER_ID` identifies which server answered a request. Set it to `web-01` on Web01 and `web-02` on Web02.

## Running locally

CLI:

```bash
npm start -- --pickup KGL --from 2026-12-20 --to 2026-12-27 --category suv --max-price 80 --sort price
```

Options: `--pickup`, `--from`, `--to`, `--driver-age`, `--query`, `--category`, `--transmission`, `--max-price`, `--sort` (`price` or `price-desc`).

HTTP service:

```bash
npm run serve
curl http://localhost:3000/health
curl "http://localhost:3000/cars?category=suv"
```

Every response includes an `X-Served-By` header and a `serverId` field.

## Deployment

| Server | Role | IP |
|--------|------|----|
| 7283-web-01 | Web01 (app) | 13.135.250.7 |
| 7283-web-02 | Web02 (app) | 35.179.93.209 |
| 7283-lb-01 | Lb01 (Nginx load balancer) | 13.40.44.252 |

### 1. Deploy the app on Web01 and Web02

Repeat on each server (changing `SERVER_ID`).

```bash
ssh -i ~/.ssh/school ubuntu@<WEB_IP>

# Install git and nano
sudo apt update
sudo apt install -y git nano

# Install Node.js 20 (Ubuntu 20.04's default apt package is Node 10, which is too old)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v                                  # must be v20.6 or newer (nano is not preinstalled on these minimized images)

# Get the code
git clone https://github.com/Maxime615/Playing_around_with_APIs.git
cd ~/Playing_around_with_APIs

# Configure
nano .env                                # SERVER_ID=web-01 (or web-02), PORT=3000, API credentials
```

Run the service so it survives logouts and reboots, using systemd. Create `/etc/systemd/system/car-rental.service`:

```ini
[Unit]
Description=Car rental service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/Playing_around_with_APIs
ExecStart=/usr/bin/node --env-file=.env server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now car-rental
sudo systemctl status car-rental
curl http://localhost:3000/health        # {"ok":true,"serverId":"web-01"}
```

On Web01, `ufw` is active and only allows ports 22, 80 and 443, so the load balancer cannot reach the app on port 3000 until it is allowed. Open it only to the load balancer's IP (Web02 does not have `ufw` installed, so no rule is needed there):

```bash
sudo ufw allow from 13.40.44.252 to any port 3000 proto tcp
sudo ufw status
```

Because of this rule, port 3000 can no longer be tested directly from outside. Test through the load balancer (see Testing).

### 2. Configure the load balancer (Lb01)

```bash
ssh -i ~/.ssh/school ubuntu@13.40.44.252
sudo apt update && sudo apt install -y nginx
sudo nano /etc/nginx/conf.d/lab01.conf
```

```nginx
upstream backends {
    server 13.135.250.7:3000;
    server 35.179.93.209:3000;
}

server {
    listen 8080;
    server_name _;

    location / {
        proxy_pass http://backends;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Lb01 already runs HAProxy on ports 80 and 443 for another project (HTTPS for a separate site), so nginx cannot bind to port 80. Nginx listens on port 8080 instead, and the car rental app is reached at `http://13.40.44.252:8080`. The HAProxy configuration is left untouched.

What this does:

- `upstream backends` lists both app servers. With no other directive, Nginx uses **round-robin**, sending requests to each server in turn.
- `proxy_pass http://backends` forwards every request to that pool.
- The `proxy_set_header` lines pass the original host, client IP and protocol on to the app.

Remove the default site, then validate and start nginx:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
```

## Testing

1. Test each server locally (on the server itself):

   ```bash
   curl http://localhost:3000/health
   ```

2. Test through the load balancer and watch the server ID alternate:

   ```bash
   for i in 1 2 3 4 5 6; do curl -s http://13.40.44.252:8080/health; echo; done
   ```

   Output from the deployed setup (alternating between the two servers):

   ```
   {"ok":true,"serverId":"web-01"}
   {"ok":true,"serverId":"web-02"}
   {"ok":true,"serverId":"web-01"}
   {"ok":true,"serverId":"web-02"}
   {"ok":true,"serverId":"web-01"}
   {"ok":true,"serverId":"web-02"}
   ```

3. Test the real endpoint through the load balancer:

   ```bash
   curl -i "http://13.40.44.252:8080/cars?pickup=KGL&category=suv"
   ```

   Check the `X-Served-By` header and the `cars` array.

4. Test failover: stop the app on one server (`sudo systemctl stop car-rental` on Web01), repeat step 2, and confirm all responses now come from Web02. Start it again afterwards.

## Troubleshooting

- `nginx -t` fails: check for typos in the directive and variable names (`X-Forwarded-For`, `$proxy_add_x_forwarded_for`).
- 502 Bad Gateway: the app is not running on one of the web servers, or port 3000 is blocked. Check `systemctl status car-rental` and the firewall.
- Results say `Source: sample`: API credentials are missing in `.env`, so the fallback data is being used.
- `source` shows `fallback (fetch failed)`: the server could not reach the rental API. Check DNS from the server with `getent hosts <api host>`. If other domains resolve but the API host does not, the API base URL is wrong or the sandbox is offline, and the app serves the built-in sample cars instead. This does not affect load balancing.

## Notes

- API credentials are kept in `.env` and are not committed to the repository.

## Error handling

- If the API credentials are missing, the request times out (`REQUEST_TIMEOUT_MS`), the API returns an error status, or the response is not a list of cars, the app does not crash. It returns the built-in sample cars instead.
- The `Source` line under the CLI table and the `source` field in the HTTP response say where the data came from: `api`, `sample`, or `fallback (<reason>)`.
- Unknown routes on the HTTP service return a 404 JSON message pointing to `/health` and `/cars`.

## Credits and attribution

- Vehicle specifications (drive type, fuel type, cylinders, class, transmission): [API Ninjas Cars API](https://api-ninjas.com/api/cars)
- Node.js: https://nodejs.org
- Nginx: https://nginx.org