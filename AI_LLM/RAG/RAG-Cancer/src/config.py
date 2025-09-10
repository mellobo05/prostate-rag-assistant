import os
import streamlit as st
from dotenv import load_dotenv

def load_keys():
    """Ensure API keys are available in os.environ"""
    try:
        if "GOOGLE_API_KEY" in st.secrets:
            os.environ["GOOGLE_API_KEY"] = st.secrets["GOOGLE_API_KEY"]
        if "OPENAI_API_KEY" in st.secrets:
            os.environ["OPENAI_API_KEY"] = st.secrets["OPENAI_API_KEY"]
    except Exception:
        # Local dev fallback
        load_dotenv()

# run immediately
load_keys()
