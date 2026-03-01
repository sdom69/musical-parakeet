# AltCoin Buy Desk

A lightweight crypto app for simulating alt coin purchases in USD with a fee breakdown and estimated coin output.

## Tech stack
- **JavaScript** frontend (`app.js`) for interactive UI, quote rendering, and admin actions.
- **Python** backend (`server.py`) that serves static files and exposes quote/price/admin APIs.

## Features
- Choose from popular alt coins (ETH, SOL, ADA, AVAX, DOT).
- Enter a USD amount to preview your purchase.
- Toggle instant execution to include an additional fee.
- Optional -5% price alert flag.
- Live reference prices loaded from a Python API.
- **RAT (Remote Administration Tool)** panel for authenticated operators:
  - View admin status and service uptime.
  - Update single-coin prices in real time.
  - Optional bulk price update endpoint.

## Run locally
```bash
export RAT_ADMIN_TOKEN="your-secure-token"
python3 server.py
```

Then open `http://localhost:4173`.

## Admin API quick reference
Use `X-Admin-Token: <RAT_ADMIN_TOKEN>` on every admin request.

- `GET /api/admin/status`
- `GET /api/admin/prices`
- `POST /api/admin/prices` with JSON body:
  ```json
  {"coin":"ETH","price":3200.11}
  ```
- `POST /api/admin/prices/bulk` with JSON body:
  ```json
  {"prices":{"ETH":3200.11,"SOL":150.25}}
  ```
