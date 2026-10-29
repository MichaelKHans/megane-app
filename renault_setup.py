"""Engangs-opsætning af Renault-login med kode fra mail.

Kør lokalt i en terminal (kræver Python 3.11+):
    pip install -r requirements.txt
    python renault_setup.py

Scriptet spørger om Renault-mail/adgangskode og Supabase "secret"-nøglen
(Supabase > Project Settings > API Keys). Intet gemmes på din computer –
kun login-token og enheds-ID'er gemmes i Supabase-tabellen renault_token.
Kør det igen, hvis robotten melder at der kræves en ny kode.
"""
import asyncio
import getpass
import os

import aiohttp
from renault_api.gigya.exceptions import (
    InvalidCredentialsException,
    InvalidVerificationCodeException,
    PendingTwoFactorAuthenticationException,
)
from renault_api.renault_client import RenaultClient

from renault_auth import get_supabase, load_credentials, save_credentials

DEFAULT_SUPABASE_URL = "https://ibuaufoncymhlljgamie.supabase.co"


def ask(prompt, env_name, secret=False):
    value = os.environ.get(env_name)
    if value:
        return value
    return (getpass.getpass if secret else input)(prompt).strip()


async def complete_two_factor(client):
    emails = await client.session.get_two_factor_auth_emails()
    email_id = None
    if len(emails) > 1:
        for i, email in enumerate(emails, 1):
            print(f"  {i}. {email.obfuscated}")
        email_id = emails[int(input("Vælg mail (nummer): ")) - 1].id
    await client.session.request_two_factor_auth_code(email_id)
    print("Renault har sendt en kode til din mail.")
    while True:
        code = input("Indtast koden: ").strip()
        try:
            await client.session.complete_two_factor_auth(code)
            print("Logget ind med kode.")
            return
        except InvalidVerificationCodeException:
            print("Forkert kode – prøv igen.")


async def main():
    supabase_url = os.environ.get("SUPABASE_URL") or DEFAULT_SUPABASE_URL
    supabase_key = ask("Supabase secret/service key: ", "SUPABASE_SERVICE_KEY", secret=True)
    supabase = get_supabase(supabase_url, supabase_key)

    user = ask("Renault e-mail: ", "RENAULT_USER")
    password = ask("Renault adgangskode: ", "RENAULT_PASSWORD", secret=True)

    async with aiohttp.ClientSession() as websession:
        client = RenaultClient(websession=websession, locale="da_DK")

        # Genbrug tidligere enheds-ID'er, så Renault genkender "enheden"
        _, device_ids = load_credentials(supabase)
        if device_ids:
            client.session.set_device_ids(device_ids)

        while True:
            try:
                await client.session.login(user, password)
                print("Logget ind uden kode (enheden er allerede husket).")
                break
            except InvalidCredentialsException:
                print("Forkert e-mail eller adgangskode – prøv igen.")
                user = input("Renault e-mail: ").strip()
                password = getpass.getpass("Renault adgangskode: ").strip()
            except PendingTwoFactorAuthenticationException:
                await complete_two_factor(client)
                break

        # Test at vi faktisk kan læse bilen, før vi gemmer
        accounts = await client.get_api_accounts()
        for account_item in accounts:
            account = await client.get_api_account(account_item.account_id)
            vehicles = await account.get_vehicles()
            if not vehicles.vehicleLinks:
                continue
            vehicle = await account.get_api_vehicle(vehicles.vehicleLinks[0].vin)
            cockpit = await vehicle.get_cockpit()
            print(f"Test OK: bilen har kørt {int(cockpit.totalMileage)} km.")
            break
        else:
            print("Advarsel: login virker, men der blev ikke fundet nogen bil på kontoen.")

        save_credentials(supabase, client.session)
        print("Login-token og enheds-ID'er er gemt i Supabase. Robotten kan nu køre.")


if __name__ == "__main__":
    asyncio.run(main())
