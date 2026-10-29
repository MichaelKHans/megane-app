"""Uploader den ugentlige kandidatliste til Supabase-tabellen bil_kandidater.

Bruges af den ugentlige Claude-opgave:
    python kandidater_upload.py kandidater.json

Erstatter alle automatisk hentede rækker (auto = true). Kandidater du selv
har tilføjet i appen (auto = false) bliver ikke rørt.
Nøglen kommer fra en netværkshemmelighed i Claude-skymiljøet (apikey-header),
eller lokalt fra miljøvariablen SUPABASE_SERVICE_KEY.
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

REQUIRED = {
    "model_navn": str, "pris": (int, float), "wltp_km": (int, float),
    "ladehastighed_kw": (int, float), "bagagerum_liter": (int, float), "traek_kg": (int, float),
    "rente": (int, float), "forsikring": (int, float), "ejerafgift": (int, float),
    "salgsplacering": int, "kilde_url": str,
}
MAX_PRICE = 450000
DEFAULT_SUPABASE_URL = "https://ibuaufoncymhlljgamie.supabase.co"


def validate(cars):
    if not isinstance(cars, list) or not 3 <= len(cars) <= 15:
        raise ValueError("Forventede en liste med 3-15 biler.")
    for car in cars:
        for key, typ in REQUIRED.items():
            if not isinstance(car.get(key), typ):
                raise ValueError(f"{car.get('model_navn', '?')}: feltet '{key}' mangler eller har forkert type.")
        if not 0 < car["pris"] <= MAX_PRICE:
            raise ValueError(f"{car['model_navn']}: pris {car['pris']} er uden for 1-{MAX_PRICE} kr.")
        if not car["kilde_url"].startswith("http"):
            raise ValueError(f"{car['model_navn']}: kilde_url skal være et link.")


def request(method, path, body=None):
    url = os.environ.get("SUPABASE_URL", DEFAULT_SUPABASE_URL).rstrip("/") + "/rest/v1/" + path
    headers = {"Content-Type": "application/json", "Prefer": "return=minimal"}
    # I Claude-skymiljøet tilføjer en netværkshemmelighed "apikey"-headeren uden for
    # sessionen, så nøglen aldrig ses. Lokalt kan den sættes som miljøvariabel.
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if key:
        headers["apikey"] = key
    req = urllib.request.Request(
        url, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
    )
    with urllib.request.urlopen(req) as res:
        return res.status


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        cars = json.load(f)
    validate(cars)

    now = datetime.now(timezone.utc).isoformat()
    rows = [{**{k: car[k] for k in REQUIRED}, "auto": True, "opdateret": now} for car in cars]

    # Indsæt først, slet bagefter – så listen aldrig står tom, hvis noget fejler
    request("POST", "bil_kandidater", rows)
    request("DELETE", "bil_kandidater?auto=eq.true&opdateret=lt." + urllib.parse.quote(now))
    print(f"Uploadede {len(rows)} elbiler til bil_kandidater.")


if __name__ == "__main__":
    main()
