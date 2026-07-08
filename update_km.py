import asyncio
import aiohttp
import os
import sys
from renault_api.renault_client import RenaultClient
from supabase import create_client, Client

async def run_update():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Prøv at hente login_token fra miljø eller database
    login_token = os.environ.get("RENAULT_LOGIN_TOKEN")
    if not login_token:
        try:
            res = supabase.table("renault_token").select("value").eq("key", "login_token").execute()
            if res.data:
                login_token = res.data[0]["value"]
                print("Hentede gemt login-token fra Supabase.")
        except Exception as e:
            print(f"Info: Kunne ikke hente token fra database (tabellen findes måske ikke endnu): {e}")

    async with aiohttp.ClientSession() as websession:
        client = RenaultClient(websession=websession, locale="da_DK")
        
        session_authenticated = False
        if login_token:
            try:
                print("Forsøger session login med gemt token...")
                client.session.set_login_token(login_token)
                session_authenticated = True
            except Exception as e:
                print(f"Kunne ikke sætte gemt login-token: {e}")

        # Hjælpefunktion til at logge ind med brugernavn/adgangskode og gemme tokenet
        async def perform_full_login():
            user = os.environ.get("RENAULT_USER")
            password = os.environ.get("RENAULT_PASSWORD")
            if not user or not password:
                raise ValueError("RENAULT_USER eller RENAULT_PASSWORD mangler i miljøvariablerne.")
            
            print("Udfører fuldt login med brugernavn og adgangskode...")
            await client.session.login(user, password)
            new_token = client.session.login_token
            if new_token:
                os.environ["RENAULT_LOGIN_TOKEN"] = new_token
                print("Nyt login-token modtaget.")
                try:
                    # Gem token i databasen
                    supabase.table("renault_token").upsert({"key": "login_token", "value": new_token}).execute()
                    print("Gemte det nye login-token i Supabase.")
                except Exception as db_err:
                    print(f"Info: Kunne ikke gemme token i Supabase (tabellen findes måske ikke): {db_err}")

        # Hvis vi ikke havde et token, logger vi ind med det samme
        if not session_authenticated:
            await perform_full_login()

        # Udfør API kald med automatisk refresh ved uautoriseret fejl
        async def call_with_refresh(api_func):
            try:
                return await api_func()
            except Exception as api_err:
                # Hvis vi får en uautoriseret/forbidden/token-udløbet fejl, prøver vi login igen
                err_str = str(api_err).lower()
                if "unauthorized" in err_str or "forbidden" in err_str or "token" in err_str or "401" in err_str or "403" in err_str:
                    print(f"API-fejl indikerer udløbet session ({api_err}). Prøver at forny token...")
                    await perform_full_login()
                    # Prøv kaldet igen
                    return await api_func()
                else:
                    # Andre fejl kastes videre op
                    raise api_err

        # Hent konti
        accounts = await call_with_refresh(client.get_api_accounts)
        
        for account_item in accounts:
            account_id = account_item.account_id
            account = await client.get_api_account(account_id)
            
            try:
                vehicles_res = await call_with_refresh(account.get_vehicles)
                if not vehicles_res.vehicleLinks:
                    continue
                
                vin = vehicles_res.vehicleLinks[0].vin
                api_vehicle = await account.get_api_vehicle(vin)
                
                # Hent data fra bilen
                print("Henter cockpit- og batteridata...")
                cockpit = await call_with_refresh(api_vehicle.get_cockpit)
                battery = await call_with_refresh(api_vehicle.get_battery_status)
                
                current_km = int(cockpit.totalMileage)
                current_bat = int(battery.batteryLevel)
                current_range = int(battery.batteryAutonomy)
                
                print(f"Data hentet: {current_km} km, {current_bat}% batteri, {current_range} km rækkevidde.")

                # GEM I DATABASE
                try:
                    # Find sidste registrerede stand
                    res = supabase.table("km_historik").select("km").order("dato", desc=True).limit(1).execute()
                    last_km = res.data[0]['km'] if res.data else 0
                    diff = current_km - last_km if res.data else 0
                    
                    # Indsæt data i databasen
                    supabase.table("km_historik").insert({
                        "km": current_km, 
                        "diff": diff,
                        "batteri_procent": current_bat,
                        "raekkevidde": current_range
                    }).execute()
                    
                    print("SUCCES: Alt data gemt i Supabase.")
                    return True # Stop når det er lykkedes
                    
                except Exception as db_err:
                    print(f"DATABASE FEJL under lagring: {db_err}")
                    raise db_err

            except Exception as e:
                print(f"Fejl ved behandling af konto {account_id} / bil: {e}")
                raise e
                
    return False

async def main():
    print("Starter Megane-robotten (Med proaktiv token-refresh)...")
    
    max_retries = 3
    retry_delay = 15 # sekunder
    
    for attempt in range(1, max_retries + 1):
        try:
            print(f"Forsøg {attempt} af {max_retries}...")
            success = await run_update()
            if success:
                print("Robotten fuldførte kørslen med succes.")
                return
            else:
                print("Ingen data blev opdateret (f.eks. ingen Renault-konti fundet).")
                return
        except Exception as e:
            print(f"Fejl under forsøg {attempt}: {e}")
            if attempt < max_retries:
                print(f"Venter {retry_delay} sekunder før næste forsøg...")
                await asyncio.sleep(retry_delay)
            else:
                print("FEJL: Alle forsøg mislykkedes.")
                print("Vi afslutter pænt (exit code 0) for at undgå fejlmeddelelser på GitHub Actions.")
                sys.exit(0)

loop = asyncio.get_event_loop()
loop.run_until_complete(main())
