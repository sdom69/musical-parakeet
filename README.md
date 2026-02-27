# AltCoin Buy Desk

A lightweight crypto app for simulating alt coin purchases in USD with a fee breakdown and estimated coin output.

## Tech stack
- **JavaScript** frontend (`app.js`) for interactive UI and quote rendering.
- **Python** backend (`server.py`) that serves static files and exposes quote/price APIs.

## Features
- Choose from popular alt coins (ETH, SOL, ADA, AVAX, DOT)
- Enter a USD amount to preview your purchase
- Toggle instant execution to include an additional fee
- Optional -5% price alert flag
- Live reference prices loaded from a Python API

## Run locally
```bash
python3 server.py
```

Then open `http://localhost:4173`.
