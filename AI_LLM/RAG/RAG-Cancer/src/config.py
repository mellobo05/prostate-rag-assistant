import os
import streamlit as st
from dotenv import load_dotenv

def load_keys():
    """Load API keys from Streamlit secrets or .env file."""
    try:
        if "GOOGLE_API_KEY" in st.secrets:
            os.environ["GOOGLE_API_KEY"] = st.secrets["GOOGLE_API_KEY"]
    except Exception:
        # Local dev
        load_dotenv()

# Call on import
load_keys()
