import streamlit as st
import pandas as pd
import requests
import io

st.title("RS.GE REST Data Fetcher")

user = st.text_input("Username")
pw = st.text_input("Password", type="password")
file = st.file_uploader("Upload Excel", type=["xlsx"])

BASE_URL = "https://eapi.rs.ge"

def authenticate(username, password):
    try:
        payload = {"AUTH_TYPE": 0, "DEVICE_CODE": None, "PASSWORD": password, "USERNAME": username}
        res = requests.post(f"{BASE_URL}/Users/Authenticate", json=payload, timeout=15)
        data = res.json()
        # Flexible token extraction from user's script
        token = (
            data.get("Token") or
            data.get("token") or
            data.get("ACCESS_TOKEN") or
            (data.get("DATA", {}) or {}).get("Token") or
            (data.get("DATA") if data.get("STATUS", {}).get("ID") == 0 else None)
        )
        return token
    except:
        return None

def get_org_info(token, tin):
    try:
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        res = requests.post(f"{BASE_URL}/Org/GetOrgInfoByTin", json={"Tin": str(tin)}, headers=headers, timeout=15)
        data = res.json()
        if data.get("STATUS", {}).get("ID") == 0:
            d = data.get("DATA", {})
            vat_status = "დღგ-ს გადამხდელი ✓" if d.get("IsVatPayer") is True else ("არა დღგ-ს გადამხდელი ✗" if d.get("IsVatPayer") is False else "N/A")
            return d.get("Name", "Not Found"), d.get("Address", "N/A"), vat_status
        return "Invalid TIN", "N/A", "N/A"
    except Exception as e:
        return f"Error: {e}", "N/A", "N/A"

if file and user and pw:
    if st.button("Process"):
        token = authenticate(user, pw)
        if not token:
            st.error("Authentication Failed")
        else:
            try:
                df = pd.read_excel(file)
                tin_col = df.columns[1] # Column B
                
                names, addrs, vats = [], [], []
                
                progress = st.progress(0)
                for i, tin in enumerate(df[tin_col]):
                    tin_str = str(tin).split('.')[0].strip()
                    name, addr, vat = get_org_info(token, tin_str)
                    names.append(name)
                    addrs.append(addr)
                    vats.append(vat)
                    progress.progress((i + 1) / len(df))
                
                df["Organization Name"] = names
                df["Address"] = addrs
                df["VAT Status"] = vats
                
                output = io.BytesIO()
                df.to_excel(output, index=False)
                st.download_button("Download Result", output.getvalue(), "processed.xlsx")
            except Exception as e:
                st.error(f"Error: {e}")
