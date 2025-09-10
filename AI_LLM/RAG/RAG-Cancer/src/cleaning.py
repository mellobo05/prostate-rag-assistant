import re

def clean_text(text):
    # Remove excessive newlines and multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()

    # Remove base64-like gibberish (long uppercase/digit sequences)
    text = re.sub(r'\b[A-Z0-9]{6,}\b', '', text)

    # Remove repeated hyphen or separator lines
    text = re.sub(r'[-=]{3,}', '', text)

    return text
