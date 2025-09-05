import re

def clean_text(text):
    """
    Clean and normalize text content.
    - Remove extra whitespace
    - Normalize line breaks
    - Remove non-printable characters
    """
    if not text:
        return ""
    
    # Remove extra whitespace and normalize
    text = re.sub(r'\s+', ' ', text.strip())
    
    # Remove non-printable characters
    text = ''.join(char for char in text if char.isprintable())
    
    return text
