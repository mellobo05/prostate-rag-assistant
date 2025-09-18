import os
import time
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_embeddings():
    """
    Get embeddings with Gemini as primary option and HuggingFace as fallback.
    """
    api_key = os.getenv("GOOGLE_API_KEY")

    # First, try Gemini API embeddings
    if api_key:
        try:
            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=api_key,
                timeout=5  # Very short timeout for quick fallback
            )
            # Quick test to see if it works
            embeddings.embed_documents(["test"])
            print("Using Google Gemini embeddings (primary).")
            return embeddings
        except Exception as e:
            print(f"Gemini API failed: {e}. Quickly falling back to HuggingFace embeddings.")

    # Fallback to HuggingFace local embeddings
    try:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        # Test embedding a small text to verify connection
        embeddings.embed_documents(["test"])
        print("Using HuggingFace local embeddings (fallback).")
        return embeddings
    except Exception as e:
        raise RuntimeError(f"Failed to initialize both Gemini and HuggingFace embeddings: {e}")

def embed_with_retry(embeddings, texts, batch_size=20, max_retries=2, backoff_factor=1):
    """
    Embed texts in batches with retry logic.
    """
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        for attempt in range(max_retries):
            try:
                batch_embeddings = embeddings.embed_documents(batch)
                all_embeddings.extend(batch_embeddings)
                break  # success, go to next batch
            except Exception as e:
                if "timeout" in str(e).lower() or "503" in str(e):
                    wait_time = min(backoff_factor * (2 ** attempt), 60)
                    print(f"[Batch {i//batch_size+1}] Failed (attempt {attempt+1}), retrying in {wait_time}s: {e}")
                    time.sleep(wait_time)
                else:
                    raise e
        else:
            # ran out of retries
            raise RuntimeError(f"Failed to embed batch {i//batch_size+1} after {max_retries} attempts")

    return all_embeddings
