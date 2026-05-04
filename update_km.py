import asyncio
import aiohttp
import os
from renault_api.renault_client import RenaultClient
from supabase import create_client, Client

async def main():
    print("Starter Megane-robotten...")
    
    # 1. Forbind til Supabase (Databasen)
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # 2. Forbind til Renault og hent data
    async with aiohttp.ClientSession() as websession:
        client = RenaultClient(websession=websession, locale="da_DK")
        await client.session.login(os.environ.get("RENAULT_USER"), os.environ.get("RENAULT_PASSWORD"))
        
        # RETTELSE HER: Hent først dit specifikke Konto-ID
        accounts = await client.get_api_accounts()
        account_id = accounts[0].accountId
        account = await client.get_api_account(account_id)
        
        # Hent bilen
        vehicle = await account.get_api_vehicle("VF1RCB00468400095")
        
        print("Henter data fra bilen...")
        cockpit = await vehicle.get_cockpit()
        current_km = cockpit.totalMileage
        
        print(f"Bilen står lige nu på: {current_km} km")

        if current_km:
            # 3. Hent det seneste tal fra din database
            response = supabase.table("km_historik").select("*").order("dato", desc=True).limit(1).execute()
            
            last_km = response.data[0]['km'] if response.data else 0
            diff = current_km - last_km
            
            # 4. Gem kun, hvis bilen faktisk har kørt siden sidst
            if diff > 0 or not response.data:
                supabase.table("km_historik").insert({"km": current_km, "diff": diff}).execute()
                print(f"Succes! Gemte {current_km} km i databasen. Du har kørt {diff} km siden sidst.")
            else:
                print("Bilen har ikke kørt siden sidste tjek. Databasen opdateres ikke.")

loop = asyncio.get_event_loop()
loop.run_until_complete(main())