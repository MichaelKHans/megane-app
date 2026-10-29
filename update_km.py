import asyncio
import os
import sys

import aiohttp
from renault_api.exceptions import NotAuthenticatedException
from renault_api.gigya.exceptions import PendingTwoFactorAuthenticationException
from renault_api.kamereon.exceptions import ForbiddenException, UnauthorizedException
from renault_api.renault_client import RenaultClient

from renault_auth import get_supabase, load_credentials, save_credentials


class NeedsSetup(Exception):
    """Renault kræver en ny kode fra mail – kør renault_setup.py lokalt."""


def is_auth_error(err):
    if isinstance(err, (NotAuthenticatedException, UnauthorizedException, ForbiddenException)):
        return True
    return isinstance(err, aiohttp.ClientResponseError) and err.status in (401, 403)


async def fetch_car_data(client):
    accounts = await client.get_api_accounts()
    for account_item in accounts:
        account = await client.get_api_account(account_item.account_id)
        vehicles = await account.get_vehicles()
        if not vehicles.vehicleLinks:
            continue
        vehicle = await account.get_api_vehicle(vehicles.vehicleLinks[0].vin)
        print("Henter cockpit- og batteridata...")
        cockpit = await vehicle.get_cockpit()
        battery = await vehicle.get_battery_status()
        return int(cockpit.totalMileage), int(battery.batteryLevel), int(battery.batteryAutonomy)
    return None


async def password_login(client, supabase):
    user = os.environ.get("RENAULT_USER")
    password = os.environ.get("RENAULT_PASSWORD")
    if not user or not password:
        raise NeedsSetup("RENAULT_USER/RENAULT_PASSWORD mangler, og det gemte token virker ikke.")
    print("Logger ind med brugernavn og adgangskode...")
    try:
        await client.session.login(user, password)
    except PendingTwoFactorAuthenticationException as err:
        raise NeedsSetup("Renault beder om en kode fra mail.") from err
    save_credentials(supabase, client.session)
    print("Nyt login-token gemt i Supabase.")


async def run_update():
    supabase = get_supabase()
    login_token, device_ids = load_credentials(supabase)

    async with aiohttp.ClientSession() as websession:
        client = RenaultClient(websession=websession, locale="da_DK")
        if device_ids:
            client.session.set_device_ids(device_ids)

        if login_token:
            print("Bruger gemt login-token fra Supabase.")
            client.session.set_login_token(login_token)
        else:
            await password_login(client, supabase)

        try:
            data = await fetch_car_data(client)
        except Exception as err:
            if not login_token or not is_auth_error(err):
                raise
            print(f"Gemt token afvist ({err}). Prøver nyt login...")
            await password_login(client, supabase)
            data = await fetch_car_data(client)

    if data is None:
        raise RuntimeError("Ingen bil fundet på Renault-kontoen.")

    current_km, current_bat, current_range = data
    print(f"Data hentet: {current_km} km, {current_bat}% batteri, {current_range} km rækkevidde.")

    res = supabase.table("km_historik").select("km").order("dato", desc=True).limit(1).execute()
    diff = current_km - res.data[0]["km"] if res.data else 0
    supabase.table("km_historik").insert({
        "km": current_km,
        "diff": diff,
        "batteri_procent": current_bat,
        "raekkevidde": current_range,
    }).execute()
    print("SUCCES: Data gemt i Supabase.")


async def main():
    print("Starter Megane-robotten...")
    try:
        await run_update()
    except NeedsSetup as err:
        print(f"FEJL: {err}")
        print("Kør 'python renault_setup.py' lokalt og indtast koden fra mailen.")
        sys.exit(1)
    except Exception:
        # Første forsøg kan fejle på et midlertidigt netværksproblem – prøv én gang til
        print("Fejl – prøver igen om 30 sekunder...")
        await asyncio.sleep(30)
        await run_update()


if __name__ == "__main__":
    asyncio.run(main())
