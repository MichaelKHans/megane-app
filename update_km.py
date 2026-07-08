import asyncio
import aiohttp
import os
from renault_api.renault_client import RenaultClient
from supabase import create_client, Client

async def run_update():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)
    
    async with aiohttp.ClientSession() as websession:
        client = RenaultClient(websession=websession, locale="da_DK")
        await client.session.login(os.environ.get("RENAULT_USER"), os.environ.get("RENAULT_PASSWORD"))
        
        accounts = await client.get_api_accounts()
        for account_item in accounts:
            account_id = account_item.account_id
            account = await client.get_api_account(account_id)
            
            try:
                vehicles_res = await account.get_vehicles()
                if not vehicles_res.vehicleLinks:
                    continue
                
                vehicle_link = vehicles_res.vehicleLinks[0]
                vin = vehicle_link.vin
                api_vehicle = await account.get_api_vehicle(vin)
                cockpit = await api_vehicle.get_cockpit()
                current_km = int(cockpit.totalMileage) # Vi runder til heltal
                
                print(f"Bilen fundet! Stand: {current_km} km")

                # Tjek sidste stand
                res = supabase.table("km_historik").select("km").order("dato", desc=True).limit(1).execute()
                last_km = res.data[0]['km'] if res.data else 0
                
                if current_km > last_km or not res.data:
                    diff = current_km - last_km if res.data else 0
                    # Vi indsætter km og diff
                    insert_res = supabase.table("km_historik").insert({"km": current_km, "diff": diff}).execute()
                    print(f"SUCCES: Gemte {current_km} km i databasen.")
                else:
                    print(f"Ingen kørsel registreret (Sidste: {last_km}, Nu: {current_km})")
                return True # Stop når det er lykkedes
                
            except Exception as e:
                print(f"Fejl ved behandling af konto/bil: {e}")
                raise e
    return False

async def main():
    import sys
    print("Starter Megane-robotten (Med fejlhåndtering)...")
    
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
                # Afslut uden fejlkode så brugeren ikke får spam-mails fra GitHub
                sys.exit(0)

loop = asyncio.get_event_loop()
loop.run_until_complete(main())