import asyncio
import aiohttp
import os
from renault_api.renault_client import RenaultClient
from supabase import create_client, Client

async def main():
    print("Starter Megane-robotten...")
    
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)
    
    async with aiohttp.ClientSession() as websession:
        client = RenaultClient(websession=websession, locale="da_DK")
        await client.session.login(os.environ.get("RENAULT_USER"), os.environ.get("RENAULT_PASSWORD"))
        
        accounts = await client.get_api_accounts()
        account_id = accounts[0].account_id
        account = await client.get_api_account(account_id)
        
        # RETTELSE: Vi henter listen over biler og tager den første
        vehicles = await account.get_vehicles()
        vehicle = vehicles.vehicles[0]
        
        print(f"Fundet bil: {vehicle.vin}")
        
        # Vi skal bruge den "rigtige" bil-model til at hente cockpit-data
        api_vehicle = await account.get_api_vehicle(vehicle.vin)
        
        print("Henter data fra bilen...")
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

loop = asyncio.get_event_loop()
loop.run_until_complete(main())