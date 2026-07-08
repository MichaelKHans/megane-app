import os
import json
import urllib.request

def main():
    print("Indlæser afdragsplan til Supabase...")
    
    supabase_url = os.environ.get("SUPABASE_URL", "https://ibuaufoncymhlljgamie.supabase.co")
    # Vi bruger service-nøglen hvis den findes, ellers falder vi tilbage til anon-nøglen fra app.js
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_KEY") or "sb_publishable_r9cQCKHvlOh1RUqXdDM45A_bJEoovHh"
    
    data = [
        {"dato": "2025-10-01", "ydelse": 3234.00, "gebyr": 45.00, "rente": 1363.00, "afdrag": 1826.00, "balance": 233975.00},
        {"dato": "2025-11-01", "ydelse": 3234.00, "gebyr": 45.00, "rente": 1352.00, "afdrag": 1837.00, "balance": 232149.00},
        {"dato": "2025-12-01", "ydelse": 3234.00, "gebyr": 45.00, "rente": 1342.00, "afdrag": 1847.00, "balance": 230312.00},
        
        {"dato": "2026-01-01", "ydelse": 3234.00, "gebyr": 45.00, "rente": 1331.00, "afdrag": 1858.00, "balance": 228465.00},
        {"dato": "2026-02-01", "ydelse": 3234.00, "gebyr": 45.00, "rente": 1320.00, "afdrag": 1869.00, "balance": 226607.00},
        {"dato": "2026-03-01", "ydelse": 3234.00, "gebyr": 45.00, "rente": 1309.00, "afdrag": 1880.00, "balance": 224738.00},
        {"dato": "2026-04-01", "ydelse": 3234.00, "gebyr": 45.00, "rente": 1298.00, "afdrag": 1891.00, "balance": 222858.00},
        {"dato": "2026-05-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1287.00, "afdrag": 3168.00, "balance": 220967.00},
        {"dato": "2026-06-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1269.00, "afdrag": 3186.00, "balance": 217799.00},
        {"dato": "2026-07-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1250.00, "afdrag": 3205.00, "balance": 214613.00},
        {"dato": "2026-08-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1231.00, "afdrag": 3224.00, "balance": 211408.00},
        {"dato": "2026-09-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1213.00, "afdrag": 3242.00, "balance": 208184.00},
        {"dato": "2026-10-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1194.00, "afdrag": 3261.00, "balance": 204942.00},
        {"dato": "2026-11-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1175.00, "afdrag": 3280.00, "balance": 201681.00},
        {"dato": "2026-12-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1156.00, "afdrag": 3299.00, "balance": 198401.00},
        
        {"dato": "2027-01-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1136.00, "afdrag": 3319.00, "balance": 195102.00},
        {"dato": "2027-02-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1117.00, "afdrag": 3338.00, "balance": 191783.00},
        {"dato": "2027-03-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1098.00, "afdrag": 3357.00, "balance": 188445.00},
        {"dato": "2027-04-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1078.00, "afdrag": 3377.00, "balance": 185088.00},
        {"dato": "2027-05-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1058.00, "afdrag": 3397.00, "balance": 181711.00},
        {"dato": "2027-06-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1039.00, "afdrag": 3416.00, "balance": 178314.00},
        {"dato": "2027-07-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 1019.00, "afdrag": 3436.00, "balance": 174898.00},
        {"dato": "2027-08-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 999.00, "afdrag": 3456.00, "balance": 171462.00},
        {"dato": "2027-09-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 979.00, "afdrag": 3476.00, "balance": 168006.00},
        {"dato": "2027-10-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 958.00, "afdrag": 3497.00, "balance": 164530.00},
        {"dato": "2027-11-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 938.00, "afdrag": 3517.00, "balance": 161033.00},
        {"dato": "2027-12-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 918.00, "afdrag": 3537.00, "balance": 157516.00},
        
        {"dato": "2028-01-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 897.00, "afdrag": 3558.00, "balance": 153979.00},
        {"dato": "2028-02-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 876.00, "afdrag": 3579.00, "balance": 150421.00},
        {"dato": "2028-03-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 855.00, "afdrag": 3600.00, "balance": 146842.00},
        {"dato": "2028-04-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 834.00, "afdrag": 3621.00, "balance": 143242.00},
        {"dato": "2028-05-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 813.00, "afdrag": 3642.00, "balance": 139621.00},
        {"dato": "2028-06-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 792.00, "afdrag": 3663.00, "balance": 135979.00},
        {"dato": "2028-07-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 771.00, "afdrag": 3684.00, "balance": 132316.00},
        {"dato": "2028-08-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 749.00, "afdrag": 3706.00, "balance": 128632.00},
        {"dato": "2028-09-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 728.00, "afdrag": 3727.00, "balance": 124926.00},
        {"dato": "2028-10-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 706.00, "afdrag": 3749.00, "balance": 121199.00},
        {"dato": "2028-11-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 684.00, "afdrag": 3771.00, "balance": 117450.00},
        {"dato": "2028-12-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 662.00, "afdrag": 3793.00, "balance": 113679.00},
        
        {"dato": "2029-01-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 640.00, "afdrag": 3815.00, "balance": 109886.00},
        {"dato": "2029-02-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 618.00, "afdrag": 3837.00, "balance": 106071.00},
        {"dato": "2029-03-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 596.00, "afdrag": 3859.00, "balance": 102234.00},
        {"dato": "2029-04-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 573.00, "afdrag": 3882.00, "balance": 98375.00},
        {"dato": "2029-05-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 550.00, "afdrag": 3905.00, "balance": 94493.00},
        {"dato": "2029-06-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 528.00, "afdrag": 3927.00, "balance": 90588.00},
        {"dato": "2029-07-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 505.00, "afdrag": 3950.00, "balance": 86661.00},
        {"dato": "2029-08-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 482.00, "afdrag": 3973.00, "balance": 82711.00},
        {"dato": "2029-09-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 459.00, "afdrag": 3996.00, "balance": 78738.00},
        {"dato": "2029-10-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 435.00, "afdrag": 4020.00, "balance": 74742.00},
        {"dato": "2029-11-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 412.00, "afdrag": 4043.00, "balance": 70722.00},
        {"dato": "2029-12-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 388.00, "afdrag": 4067.00, "balance": 66679.00},
        
        {"dato": "2030-01-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 365.00, "afdrag": 4090.00, "balance": 62612.00},
        {"dato": "2030-02-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 341.00, "afdrag": 4114.00, "balance": 58522.00},
        {"dato": "2030-03-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 317.00, "afdrag": 4138.00, "balance": 54408.00},
        {"dato": "2030-04-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 293.00, "afdrag": 4162.00, "balance": 50270.00},
        {"dato": "2030-05-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 269.00, "afdrag": 4186.00, "balance": 46108.00},
        {"dato": "2030-06-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 244.00, "afdrag": 4211.00, "balance": 41922.00},
        {"dato": "2030-07-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 220.00, "afdrag": 4235.00, "balance": 37711.00},
        {"dato": "2030-08-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 195.00, "afdrag": 4260.00, "balance": 33476.00},
        {"dato": "2030-09-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 170.00, "afdrag": 4285.00, "balance": 29216.00},
        {"dato": "2030-10-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 145.00, "afdrag": 4310.00, "balance": 24931.00},
        {"dato": "2030-11-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 120.00, "afdrag": 4335.00, "balance": 20621.00},
        {"dato": "2030-12-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 95.00, "afdrag": 4360.00, "balance": 16286.00},
        
        {"dato": "2031-01-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 69.00, "afdrag": 4386.00, "balance": 11926.00},
        {"dato": "2031-02-01", "ydelse": 4500.00, "gebyr": 45.00, "rente": 44.00, "afdrag": 4411.00, "balance": 7540.00},
        {"dato": "2031-03-01", "ydelse": 3192.00, "gebyr": 45.00, "rente": 18.00, "afdrag": 3129.00, "balance": 3129.00}
    ]
    
    url = f"{supabase_url}/rest/v1/laen_afdragsplan"
    
    # Prøv at lave upsert ved at indsætte med Prefer header
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            print(f"Indlæsning fuldført. Server svarede med HTTP {status}.")
            print(f"I alt {len(data)} måneders afdragsplan er nu uploadet til Supabase.")
    except Exception as e:
        print(f"FEJL ved upload til Supabase REST API: {e}")
        # Prøv at printe fejlbesked hvis tilgængelig
        if hasattr(e, 'read'):
            try:
                print("Detaljer:", e.read().decode())
            except Exception:
                pass

if __name__ == "__main__":
    main()
