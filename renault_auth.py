"""Fælles Renault-login: gemmer login-token og enheds-ID'er i Supabase.

Renault kræver nu en kode på mail (totrinsbekræftelse). Koden indtastes én gang
med renault_setup.py, og derefter husker Renault "enheden" via device_ids,
så robotten kan logge ind om natten uden kode.
"""
import json
import os

from supabase import Client, create_client

TOKEN_KEY = "login_token"
DEVICE_KEY = "device_ids"


def get_supabase(url=None, key=None) -> Client:
    url = url or os.environ.get("SUPABASE_URL")
    key = key or os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL eller SUPABASE_SERVICE_KEY mangler.")
    return create_client(url, key)


def load_credentials(supabase: Client):
    """Returnerer (login_token, device_ids) fra tabellen renault_token."""
    res = supabase.table("renault_token").select("key,value").in_("key", [TOKEN_KEY, DEVICE_KEY]).execute()
    values = {row["key"]: row["value"] for row in res.data}
    device_ids = json.loads(values[DEVICE_KEY]) if values.get(DEVICE_KEY) else {}
    return values.get(TOKEN_KEY), device_ids


def save_credentials(supabase: Client, session):
    """Gemmer sessionens login-token og enheds-ID'er i tabellen renault_token."""
    rows = []
    if session.login_token:
        rows.append({"key": TOKEN_KEY, "value": session.login_token})
    if session.device_ids:
        rows.append({"key": DEVICE_KEY, "value": json.dumps(session.device_ids)})
    if rows:
        supabase.table("renault_token").upsert(rows).execute()
