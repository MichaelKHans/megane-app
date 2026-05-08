import asyncio
import aiohttp
import os
from renault_api.renault_client import RenaultClient
from supabase import create_client, Client

async def main():
    print("Starter Megane-robotten (Batteri-opgradering)...")
    
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
                if not vehicles_res.vehicleLinks: continue
                
                vin = vehicles_res.vehicleLinks[0].vin
                api_vehicle = await account.get_api_vehicle(vin)
                
                # HENT DATA
                cockpit = await api_vehicle.get_cockpit()
                battery = await api_vehicle.get_battery_status()
                
                current_km = int(cockpit.totalMileage)
                current_bat = int(battery.batteryLevel)
                current_range = int(battery.batteryAutonomy)
                
                print(f"Data hentet: {current_km} km, {current_bat}% batteri, {current_range} km rækkevidde.")

                # GEM I DATABASE
                try:
                    # Vi gemmer altid en linje hvis batteriprocenten har ændret sig
                    # eller hvis der er kørt kilometer.
                    res = supabase.table("km_historik").select("*").order("dato", desc=True).limit(1).execute()
                    last_km = res.data[0]['km'] if res.data else 0
                    diff = current_km - last_km if res.data else 0
                    
                    # Indsæt alt data
                    supabase.table("km_historik").insert({
                        "km": current_km, 
                        "diff": diff,
                        "batteri_procent": current_bat,
                        "raekkevidde": current_range
                    }).execute()
                    
                    print("SUCCES: Alt data gemt i Supabase.")
                    return 

                except Exception as db_err:
                    print(f"DATABASE FEJL: {db_err}")

            except Exception as e:
                print(f"Fejl ved hentning: {e}")
                continue

loop = asyncio.get_event_loop()
loop.run_until_complete(main())
