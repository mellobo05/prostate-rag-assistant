from .data_loader import load_pdf_from_path
from .vectorstore import build_vectorstore
import os
import re
from dotenv import load_dotenv

load_dotenv()

def extract_data_from_pdf(pdf_path):
    """
    Load PDF documents and build vectorstore for data extraction.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    # Load documents from PDF
    documents = load_pdf_from_path(pdf_path)
    
    # Build vectorstore
    vectorstore = build_vectorstore(documents)
    
    return vectorstore

def extract_latest_psa(search_results):
    """
    Extract the latest PSA value from search results.
    Matches variations like:
    - PSA: 5.2
    - PSA 5.2 ng/mL
    - Prostate Specific Antigen = 5.2
    """
    psa_values = []
    psa_pattern = re.compile(
        r"(?:PSA|Prostate\s*Specific\s*Antigen)[:\s=]*([0-9]+(?:\.[0-9]+)?)",
        re.IGNORECASE
    )

    for result in search_results:
        text = result.page_content.replace("\n", " ")  # flatten line breaks
        matches = psa_pattern.findall(text)
        for match in matches:
            try:
                psa_values.append(float(match))
            except ValueError:
                pass
    
    if psa_values:
        latest = max(psa_values)  # assume highest = most recent
        return f"{latest} ng/mL"
    return None

# Path to the specific PDF
PDF_PATH = os.path.join(os.path.dirname(__file__), '..', 'Chandraprakash_Cancer_Reports.pdf')
vectorstore = None
