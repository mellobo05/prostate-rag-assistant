import os
import time
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

def get_embeddings():
    """
    Get embeddings with fallback: First try Google Gemini API, then fallback to HuggingFace local embeddings.
    Requires GOOGLE_API_KEY to be set in the environment for Gemini.
    """
    api_key = os.getenv("GOOGLE_API_KEY")

    # First, try Gemini API embeddings
    if api_key:
        try:
            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001",
                google_api_key=api_key,
                timeout=300  # 5 minutes
            )
            # Test embedding a small text to verify connection
            embeddings.embed_documents(["test"])
            print("Using Google Gemini embeddings.")
            return embeddings
        except Exception as e:
            print(f"Gemini API failed: {e}. Falling back to HuggingFace embeddings.")

    # Fallback to HuggingFace local embeddings
    try:
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        # Test embedding a small text to verify connection
        embeddings.embed_documents(["test"])
        print("Using HuggingFace local embeddings.")
        return embeddings
    except Exception as e:
        raise RuntimeError(f"Failed to initialize both Gemini and HuggingFace embeddings: {e}")

def embed_with_retry(embeddings, texts, batch_size=20, max_retries=5, backoff_factor=2):
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
