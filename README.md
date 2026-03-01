# Remote Administration Tool (RAT)

A lightweight, legitimate administration console for service operations.

## Tech stack
- **JavaScript** frontend (`app.js`) for public status display and authenticated admin controls.
- **Python** backend (`server.py`) serving static files and token-protected admin APIs.

## Features
- Public status endpoint for maintenance mode and service message.
- Admin authentication via `X-Admin-Token`.
- Admin configuration updates for:
  - maintenance mode toggle
  - service message
  - allowed origins list

## Run locally
```bash
export RAT_ADMIN_TOKEN="your-secure-token"
python3 server.py
```

Then open `http://localhost:4173`.

## API quick reference
Public:
- `GET /api/public/status`

Admin (requires `X-Admin-Token: <RAT_ADMIN_TOKEN>`):
- `GET /api/admin/status`
- `GET /api/admin/config`
- `POST /api/admin/config` with JSON body:
  ```json
  {
    "maintenanceMode": true,
    "serviceMessage": "Scheduled maintenance in progress.",
    "allowedOrigins": ["127.0.0.1", "localhost"]
  }
  ```
