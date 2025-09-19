from .data_loader import load_pdf_from_path
from .vectorstore import build_vectorstore
import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
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

def extract_medical_data(search_results: List[Any], data_type: str = "all") -> Dict[str, Any]:
    """
    Extract various medical data from search results.
    
    Args:
        search_results: List of document chunks from vector search
        data_type: Type of data to extract ("psa", "gleason", "stage", "treatment", "all")
    
    Returns:
        Dictionary containing extracted medical data
    """
    extracted_data = {}
    
    if data_type in ["psa", "all"]:
        extracted_data["psa_results"] = extract_psa_values(search_results)
    
    if data_type in ["gleason", "all"]:
        extracted_data["gleason_scores"] = extract_gleason_scores(search_results)
    
    if data_type in ["stage", "all"]:
        extracted_data["cancer_stage"] = extract_cancer_stage(search_results)
    
    if data_type in ["treatment", "all"]:
        extracted_data["treatments"] = extract_treatment_history(search_results)
    
    if data_type in ["biopsy", "all"]:
        extracted_data["biopsy_results"] = extract_biopsy_results(search_results)
    
    if data_type in ["imaging", "all"]:
        extracted_data["imaging_results"] = extract_imaging_results(search_results)
    
    return extracted_data

def extract_psa_values(search_results: List[Any]) -> List[Dict[str, Any]]:
    """
    Extract PSA values with dates from search results and sort chronologically.
    """
    psa_data = []
    
    # Comprehensive PSA patterns - order matters (most specific first)
    psa_patterns = [
        # Most specific patterns for medical reports - exact match for "PROSTATE SPECIFIC ANTIGEN - PSA (H)6.04 ng/ml"
        r"PROSTATE\s*SPECIFIC\s*ANTIGEN\s*-\s*PSA\s*\([HL]\)\s*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        r"PROSTATE\s*SPECIFIC\s*ANTIGEN[^0-9]*\([^)]*\)\s*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        r"PROSTATE\s*SPECIFIC\s*ANTIGEN[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # Pattern for "PSA (H)6.04 ng/ml" format (no space between (H) and number)
        r"PSA\s*\([HL]\)\s*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # Pattern for "-PSA (Serum) 0.02 ng/ml" format (with space)
        r"-PSA\s*\([^)]*\)\s*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # Pattern for "-TOTAL (PSA) 0.02 ng/ml" format
        r"-TOTAL\s*\(PSA\)\s*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # Pattern for "PSA (Serum) Result 0.01 ng/ml" format
        r"PSA\s*\([^)]*\)\s*Result\s*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # Pattern for "PSA, TOTAL 0.00 - 4.00 ng/mL11.440" format
        r"PSA[,\s]*TOTAL[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # Pattern for "ng/mL11.440" format (no space between ng/mL and number)
        r"ng/mL\s*([0-9]+(?:\.[0-9]+)?)\s*(?:Note|$)",
        # Pattern for values in result lines
        r"Result\s*[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # More restrictive PSA patterns
        r"PSA[^0-9]*([0-9]+(?:\.[0-9]+)?)\s*ng/mL",
        # Fallback patterns
        r"(?:PSA|Prostate\s*Specific\s*Antigen)[:\s=]*([0-9]+(?:\.[0-9]+)?)\s*(?:ng/mL|ng/ml)?",
        r"PSA\s*([0-9]+(?:\.[0-9]+)?)\s*(?:ng/mL|ng/ml)?",
        r"Prostate\s*Specific\s*Antigen\s*([0-9]+(?:\.[0-9]+)?)\s*(?:ng/mL|ng/ml)?"
    ]
    
    # Enhanced date patterns to catch more date formats including Nov/Oct
    date_patterns = [
        # Month abbreviations (Nov, Oct, etc.) - most specific first
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})",  # Month DD, YYYY
        r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",  # DD Month YYYY
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",  # Month YYYY
        # Medical report specific patterns - extract just the date part
        r"Collection\s+Date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",  # Collection Date: MM/DD/YYYY
        r"Report\s+Date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",  # Report Date: MM/DD/YYYY
        r"Received\s+On\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4})",  # Received On MM/DD/YYYY
        r"Reported\s+On\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4})",  # Reported On MM/DD/YYYY
        # Standard date formats - more restrictive to avoid invalid dates
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{4})",  # MM/DD/YYYY or DD/MM/YYYY (4-digit year)
        r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})",    # YYYY/MM/DD
        r"(\d{1,2}/\d{4})",  # MM/YYYY
        r"(\d{4}-\d{2})",  # YYYY-MM
        # Additional patterns for medical reports
        r"(\d{1,2}\s+of\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",  # DD of Month YYYY
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\s+\d{4})",  # Month DD YYYY
        # More restrictive patterns to avoid invalid dates
        r"(\d{1,2}[/-]\d{1,2}[/-]\d{2})",  # MM/DD/YY (2-digit year)
        r"(\d{4})",  # Just year (4-digit only)
    ]

    for result in search_results:
        text = result.page_content.replace("\n", " ")
        
        for pattern in psa_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    value = float(match.group(1))
                    
                    # Filter out obviously wrong PSA values
                    if value > 50:  # PSA values above 50 are extremely rare and likely wrong
                        continue
                    
                    # Look for date near the PSA value (expanded search area)
                    date = "Unknown date"
                    # Search in a larger area around the PSA value
                    search_start = max(0, match.start()-500)
                    search_end = min(len(text), match.end()+500)
                    search_text = text[search_start:search_end]
                    
                    for date_pattern in date_patterns:
                        date_match = re.search(date_pattern, search_text, re.IGNORECASE)
                        if date_match:
                            date = date_match.group(1)
                            break
                    
                    # If no date found in expanded area, try the entire document
                    if date == "Unknown date":
                        for date_pattern in date_patterns:
                            date_match = re.search(date_pattern, text, re.IGNORECASE)
                            if date_match:
                                date = date_match.group(1)
                                break
                    
                    # Extract more context around the PSA value
                    context_start = max(0, match.start()-150)
                    context_end = min(len(text), match.end()+150)
                    context = text[context_start:context_end].strip()
                    
                    psa_data.append({
                        "value": value,
                        "unit": "ng/mL",
                        "date": date,
                        "context": context,
                        "source": result.metadata.get('source', 'Unknown')
                    })
                except ValueError:
                    continue
    
    # Remove duplicates based on value, date, and context similarity
    unique_psa_data = []
    seen_combinations = set()
    
    for psa in psa_data:
        # Create a more specific key based on value, date, and context
        context_key = psa["context"][:100].strip()
        # Also include source to avoid cross-document duplicates
        source_key = psa.get("source", "")
        key = (psa["value"], psa["date"], context_key, source_key)
        
        if key not in seen_combinations:
            unique_psa_data.append(psa)
            seen_combinations.add(key)
    
    # Sort by date (chronological order - oldest first)
    unique_psa_data.sort(key=lambda x: parse_date_for_sorting(x["date"]))
    return unique_psa_data

def parse_date_for_sorting(date_str: str) -> tuple:
    """
    Parse date string for sorting purposes.
    Returns a tuple (year, month, day) for chronological sorting.
    """
    if date_str == "Unknown date":
        return (1900, 1, 1)  # Put unknown dates at the beginning
    
    # Try to parse different date formats
    import re
    from datetime import datetime
    
    # Common date patterns
    patterns = [
        # Month abbreviations first (Nov, Oct, etc.)
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})",  # Month DD, YYYY
        r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})",  # DD Month YYYY
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})",  # Month YYYY
        # Standard date formats - handle both MM/DD/YYYY and DD/MM/YYYY
        r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})",  # MM/DD/YYYY or DD/MM/YYYY
        r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})",  # YYYY/MM/DD
        r"(\d{4})",  # Just year
        r"(\d{1,2})/(\d{4})",  # MM/YYYY
        r"(\d{4})-(\d{2})"  # YYYY-MM
    ]
    
    month_names = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    
    for pattern in patterns:
        match = re.search(pattern, date_str, re.IGNORECASE)
        if match:
            groups = match.groups()
            try:
                if len(groups) == 3:
                    if pattern == patterns[0]:  # Month DD, YYYY
                        month_name, day, year = groups
                        month = month_names.get(month_name.lower(), 1)
                        return (int(year), month, int(day))
                    elif pattern == patterns[1]:  # DD Month YYYY
                        day, month_name, year = groups
                        month = month_names.get(month_name.lower(), 1)
                        return (int(year), month, int(day))
                    elif pattern == patterns[3]:  # MM/DD/YYYY or DD/MM/YYYY
                        # Try to determine if it's DD/MM/YYYY or MM/DD/YYYY
                        first, second, year = map(int, groups)
                        if first > 12:  # First number > 12, must be DD/MM/YYYY
                            day, month = first, second
                        elif second > 12:  # Second number > 12, must be MM/DD/YYYY
                            month, day = first, second
                        else:  # Ambiguous, assume DD/MM/YYYY (more common in medical reports)
                            day, month = first, second
                        return (year, month, day)
                    elif pattern == patterns[4]:  # YYYY/MM/DD
                        year, month, day = map(int, groups)
                        return (year, month, day)
                elif len(groups) == 2:
                    if pattern == patterns[2]:  # Month YYYY
                        month_name, year = groups
                        month = month_names.get(month_name.lower(), 1)
                        return (int(year), month, 1)
                    elif pattern == patterns[6]:  # MM/YYYY
                        month, year = map(int, groups)
                        return (year, month, 1)
                    elif pattern == patterns[7]:  # YYYY-MM
                        year, month = map(int, groups)
                        return (year, month, 1)
                elif len(groups) == 1:
                    if pattern == patterns[5]:  # Just year
                        year = int(groups[0])
                        return (year, 1, 1)
            except (ValueError, KeyError):
                continue
    
    return (1900, 1, 1)  # Default for unparseable dates

def extract_gleason_scores(search_results: List[Any]) -> List[Dict[str, Any]]:
    """
    Extract Gleason scores from search results.
    """
    gleason_data = []
    gleason_patterns = [
        r"Gleason\s*score[:\s]*([0-9]+)\s*\+\s*([0-9]+)",
        r"Gleason\s*([0-9]+)\s*\+\s*([0-9]+)",
        r"Grade\s*([0-9]+)\s*\+\s*([0-9]+)",
        r"([0-9]+)\s*\+\s*([0-9]+)\s*Gleason"
    ]
    
    for result in search_results:
        text = result.page_content.replace("\n", " ")
        
        for pattern in gleason_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    primary = int(match.group(1))
                    secondary = int(match.group(2))
                    total = primary + secondary
                    
                    gleason_data.append({
                        "primary_grade": primary,
                        "secondary_grade": secondary,
                        "total_score": total,
                        "context": text[max(0, match.start()-100):match.end()+100]
                    })
                except ValueError:
                    continue
    
    return gleason_data

def extract_cancer_stage(search_results: List[Any]) -> List[Dict[str, Any]]:
    """
    Extract cancer staging information from search results.
    """
    stage_data = []
    stage_patterns = [
        r"Stage\s*([I1-4]+[ABC]?)",
        r"T([0-4][ABC]?)\s*N([0-3])\s*M([0-1])",
        r"TNM\s*([0-4][ABC]?)\s*([0-3])\s*([0-1])",
        r"Clinical\s*stage[:\s]*([I1-4]+[ABC]?)"
    ]
    
    for result in search_results:
        text = result.page_content.replace("\n", " ")
        
        for pattern in stage_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                stage_data.append({
                    "stage": match.group(1),
                    "context": text[max(0, match.start()-100):match.end()+100]
                })
    
    return stage_data

def extract_treatment_history(search_results: List[Any]) -> List[Dict[str, Any]]:
    """
    Extract treatment history from search results.
    """
    treatments = []
    treatment_keywords = [
        "surgery", "prostatectomy", "radiation", "chemotherapy", "hormone therapy",
        "androgen deprivation", "brachytherapy", "cryotherapy", "immunotherapy"
    ]
    
    for result in search_results:
        text = result.page_content.replace("\n", " ")
        
        for keyword in treatment_keywords:
            if keyword.lower() in text.lower():
                # Extract sentence containing the treatment
                sentences = text.split('.')
                for sentence in sentences:
                    if keyword.lower() in sentence.lower():
                        treatments.append({
                            "treatment": keyword.title(),
                            "context": sentence.strip(),
                            "source": result.metadata.get('source', 'Unknown')
                        })
                        break
    
    return treatments

def extract_biopsy_results(search_results: List[Any]) -> List[Dict[str, Any]]:
    """
    Extract biopsy results from search results.
    """
    biopsy_data = []
    biopsy_patterns = [
        r"biopsy[:\s]*([^.]*)",
        r"needle\s*biopsy[:\s]*([^.]*)",
        r"core\s*biopsy[:\s]*([^.]*)"
    ]
    
    for result in search_results:
        text = result.page_content.replace("\n", " ")
        
        for pattern in biopsy_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                biopsy_data.append({
                    "result": match.group(1).strip(),
                    "context": text[max(0, match.start()-100):match.end()+100]
                })
    
    return biopsy_data

def extract_imaging_results(search_results: List[Any]) -> List[Dict[str, Any]]:
    """
    Extract imaging results from search results.
    """
    imaging_data = []
    imaging_keywords = ["MRI", "CT", "PET", "ultrasound", "bone scan", "imaging"]
    
    for result in search_results:
        text = result.page_content.replace("\n", " ")
        
        for keyword in imaging_keywords:
            if keyword.lower() in text.lower():
                sentences = text.split('.')
                for sentence in sentences:
                    if keyword.lower() in sentence.lower():
                        imaging_data.append({
                            "type": keyword.upper(),
                            "result": sentence.strip(),
                            "context": sentence.strip()
                        })
                        break
    
    return imaging_data

def extract_latest_psa(search_results):
    """
    Extract the latest PSA value from search results (legacy function for compatibility).
    """
    psa_data = extract_psa_values(search_results)
    if psa_data:
        latest = psa_data[0]  # Already sorted by value (highest first)
        return f"{latest['value']} ng/mL"
    return None

# Path to the specific PDF
PDF_PATH = os.path.join(os.path.dirname(__file__), '..', 'Chandraprakash_Cancer_Reports.pdf')
vectorstore = None
