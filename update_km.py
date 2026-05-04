import asyncio
import aiohttp
import os
from renault_api.renault_client import RenaultClient
from supabase import create_client, Client

async def main():
    print("Starter Megane-robotten (Import-mode)...")
    
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)
    
    async with aiohttp.ClientSession() as websession:
        client = RenaultClient(websession=websession, locale="da_DK")
        await client.session.login(os.environ.get("RENAULT_USER"), os.environ.get("RENAULT_PASSWORD"))
        
        accounts = await client.get_api_accounts()
        # Vi løber alle konti igennem for at være sikker på at finde den rigtige garage
        for account_item in accounts:
            account_id = account_item.account_id
            account = await client.get_api_account(account_id)
            
            try:
                vehicles_res = await account.get_vehicles()
                if not vehicles_res.vehicleLinks:
                    continue
                
                vehicle_link = vehicles_res.vehicleLinks[0]
                vin = vehicle_link.vin
                print(f"Fundet bil med VIN: {vin}")
                
                api_vehicle = await account.get_api_vehicle(vin)
                cockpit = await api_vehicle.get_cockpit()
                current_km = cockpit.totalMileage
                
                print(f"Bilen står lige nu på: {current_km} km")

                if current_km:
                    response = supabase.table("km_historik").select("*").order("dato", desc=True).limit(1).execute()
                    last_km = response.data[0]['km'] if response.data else 0
                    diff = current_km - last_km
                    
                    if diff > 0 or not response.data:
                        supabase.table("km_historik").insert({"km": current_km, "diff": diff}).execute()
                        print(f"Succes! Gemte {current_km} km i databasen.")
                    else:
                        print("Ingen nye kilometer kørt.")
                
                # Hvis vi har fundet bilen og gemt data, kan vi stoppe robotten
                return

            except Exception as e:
                print(f"Søger videre... (Spring over konto {account_id})")
                continue

loop = asyncio.get_event_loop()
loop.run_until_complete(main())