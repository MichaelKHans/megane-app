import asyncio
import aiohttp
import os
from renault_api.renault_client import RenaultClient
from supabase import create_client, Client

async def main():
    print("Starter Megane-robotten (Debug-mode)...")
    
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

                # Forsøg at gemme
                try:
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
                    return # Stop når det er lykkedes
                    
                except Exception as db_err:
                    print(f"DATABASE FEJL: {db_err}")
                    # Dette vil afsløre hvis det er RLS eller manglende kolonner!

            except Exception as e:
                print(f"Kunne ikke hente data fra konto {account_id}: {e}")
                continue

loop = asyncio.get_event_loop()
loop.run_until_complete(main())