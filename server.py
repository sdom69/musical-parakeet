#!/usr/bin/env python3
"""Simple API + static file server for AltCoin Buy Desk."""

from __future__ import annotations

import json
from dataclasses import dataclass
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HOST = "0.0.0.0"
PORT = 4173

PRICES = {
    "ETH": 3188.12,
    "SOL": 142.74,
    "ADA": 0.61,
    "AVAX": 37.28,
    "DOT": 7.54,
}

BASE_FEE_RATE = 0.012
INSTANT_FEE_RATE = 0.008


@dataclass
class OrderRequest:
    coin: str
    usd_amount: float
    instant: bool = True


class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/prices":
            self._send_json({"prices": PRICES})
            return
        return super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/quote":
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_payload = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_payload.decode("utf-8"))
            req = OrderRequest(
                coin=str(payload["coin"]).upper(),
                usd_amount=float(payload["usdAmount"]),
                instant=bool(payload.get("instant", False)),
            )
            quote = calculate_quote(req)
        except (KeyError, TypeError, ValueError):
            self._send_json({"error": "Invalid request body."}, status=HTTPStatus.BAD_REQUEST)
            return

        self._send_json(quote)

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        content = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def calculate_quote(req: OrderRequest) -> dict:
    if req.coin not in PRICES:
        raise ValueError("Unsupported coin")
    if req.usd_amount < 10:
        raise ValueError("Minimum order amount is $10")

    coin_price = PRICES[req.coin]
    base_fee = req.usd_amount * BASE_FEE_RATE
    instant_fee = req.usd_amount * INSTANT_FEE_RATE if req.instant else 0.0
    total_fees = base_fee + instant_fee
    net_usd = req.usd_amount - total_fees
    estimated_coin = net_usd / coin_price

    return {
        "coin": req.coin,
        "coinPrice": coin_price,
        "amountFunded": req.usd_amount,
        "baseFee": base_fee,
        "instantFee": instant_fee,
        "netUsd": net_usd,
        "estimatedCoin": estimated_coin,
    }


def main() -> None:
    web_root = Path(__file__).resolve().parent
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Serving AltCoin Buy Desk at http://127.0.0.1:{PORT}")
    print(f"Static root: {web_root}")
    server.serve_forever()


if __name__ == "__main__":
    main()
