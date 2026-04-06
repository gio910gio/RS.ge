import pandas as pd
import requests
import time
import os

# RS.GE REST API
BASE_URL = "https://eapi.rs.ge"


def authenticate(username, password):
    """Bearer Token-ის მიღება"""
    url = f"{BASE_URL}/Users/Authenticate"
    payload = {
        "AUTH_TYPE": 0,
        "DEVICE_CODE": None,
        "PASSWORD": password,
        "USERNAME": username
    }
    try:
        resp = requests.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        # Token სხვადასხვა ველში შეიძლება იყოს
        token = (
            data.get("Token") or
            data.get("token") or
            data.get("ACCESS_TOKEN") or
            (data.get("DATA", {}) or {}).get("Token")
        )
        return token
    except Exception as e:
        print(f"Authentication error: {e}")
        return None


def get_org_info(token, tin):
    """ორგანიზაციის ინფო TIN-ით"""
    url = f"{BASE_URL}/Org/GetOrgInfoByTin"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(url, json={"Tin": str(tin)}, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("STATUS", {})
        if status.get("ID") == 0:
            d = data.get("DATA", {})
            return {
                "name":    d.get("Name", ""),
                "address": d.get("Address", ""),
                "is_vat":  d.get("IsVatPayer"),
                "ok":      True
            }
        else:
            return {"name": "Invalid TIN", "address": "N/A", "is_vat": None, "ok": False}
    except Exception as e:
        return {"name": f"Error: {e}", "address": "N/A", "is_vat": None, "ok": False}


def validate_organizations(input_file, output_file, username, password):
    try:
        # Excel წაკითხვა
        df = pd.read_excel(input_file)

        # Token მიღება
        print("Authenticating with RS.GE...")
        token = authenticate(username, password)
        if not token:
            print("ERROR: Authentication failed! Check username/password.")
            return

        print(f"✅ Authenticated successfully!")

        # TIN სვეტის პოვნა
        tin_column = None
        for col in df.columns:
            vals = df[col].dropna().astype(str)
            if len(vals) > 0:
                sample = vals.iloc[0].strip()
                if sample.isdigit() and len(sample) in (9, 11):
                    tin_column = col
                    break

        if not tin_column:
            # პირველი სვეტი სცადეთ
            tin_column = df.columns[0]
            print(f"Warning: Using first column '{tin_column}' as TIN column.")

        print(f"TIN column: '{tin_column}'")
        print(f"Processing {len(df)} rows...\n")

        names      = []
        addresses  = []
        vat_statuses = []

        for index, row in df.iterrows():
            tin = str(row[tin_column]).strip().split(".")[0]  # .0 მოვაშოროთ

            if tin.isdigit() and len(tin) in (9, 11):
                result = get_org_info(token, tin)
                names.append(result["name"])
                addresses.append(result["address"])
                if result["is_vat"] is True:
                    vat_statuses.append("დღგ-ს გადამხდელი ✓")
                elif result["is_vat"] is False:
                    vat_statuses.append("არა დღგ-ს გადამხდელი ✗")
                else:
                    vat_statuses.append("N/A")

                print(f"  [{index+1}] {tin} → {result['name']} | VAT: {vat_statuses[-1]}")
            else:
                names.append("Invalid Format")
                addresses.append("N/A")
                vat_statuses.append("N/A")
                print(f"  [{index+1}] {tin} → Invalid format (must be 9 or 11 digits)")

            time.sleep(0.2)

        # სვეტების დამატება
        df["Organization Name"] = names
        df["Address"]           = addresses
        df["VAT Status"]        = vat_statuses

        # Excel-ში შენახვა
        df.to_excel(output_file, index=False)
        print(f"\n✅ Saved to: {output_file}")

        # სტატისტიკა
        print(f"\n📊 Summary:")
        print(f"   Total:     {len(df)}")
        print(f"   VAT payers: {vat_statuses.count('დღგ-ს გადამხდელი ✓')}")
        print(f"   Not VAT:   {vat_statuses.count('არა დღგ-ს გადამხდელი ✗')}")
        print(f"   Errors:    {vat_statuses.count('N/A')}")

    except Exception as e:
        print(f"An error occurred: {e}")
        raise


if __name__ == "__main__":
    import sys

    # Credentials — შეცვალეთ თქვენსაზე
    USERNAME = os.environ.get("RS_USERNAME", "tbilisi")
    PASSWORD = os.environ.get("RS_PASSWORD", "123456")

    if len(sys.argv) >= 3:
        input_file  = sys.argv[1]
        output_file = sys.argv[2]
    else:
        input_file  = "input.xlsx"
        output_file = "output.xlsx"

    validate_organizations(input_file, output_file, USERNAME, PASSWORD)