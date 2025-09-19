from langchain.vectorstores import Chroma
from .embeddings import get_embeddings, embed_with_retry, HuggingFaceEmbeddings, GoogleGenerativeAIEmbeddings
import os
import shutil
import gc

def get_persist_dir(embeddings):
    """Return DB folder based on embedding provider."""
    if isinstance(embeddings, GoogleGenerativeAIEmbeddings):
        provider = "gemini"
    elif isinstance(embeddings, HuggingFaceEmbeddings):
        provider = "huggingface"
    else:
        provider = "unknown"
    return os.path.join("db", provider)

def safe_delete(path):
    gc.collect()
    try:
        shutil.rmtree(path)
        print(f"Deleted old DB at {path}")
    except PermissionError as pe:
        print(f"⚠️ Permission error deleting {path}: {pe}")
        return False
    return True

def build_vectorstore(documents, persist=True, force_rebuild=False):
    embeddings = get_embeddings()
    persist_dir = get_persist_dir(embeddings)

    if force_rebuild and os.path.isdir(persist_dir):
        safe_delete(persist_dir)

    if os.path.isdir(persist_dir) and not force_rebuild:
        try:
            chroma = Chroma(persist_directory=persist_dir,
                            embedding_function=embeddings)
            chroma.similarity_search("test", k=1)
            return chroma
        except Exception as e:
            if "dimension" in str(e).lower():
                print(f"Dimension mismatch: {e}")
                safe_delete(persist_dir)
            elif "sqlite" in str(e).lower() or "unsupported version" in str(e).lower():
                print(f"SQLite version issue: {e}")
                print("Falling back to in-memory vectorstore...")
                # Return None to trigger fallback in app.py
                return None
            else:
                print(f"DB load failed ({e}), rebuilding...")

    texts = [doc.page_content for doc in documents]
    
    # Test embeddings quickly to ensure they work
    try:
        test_embeddings = embeddings.embed_documents(["test"])
        print(f"Embeddings test successful, dimension: {len(test_embeddings[0])}")
    except Exception as e:
        print(f"Embeddings test failed: {e}")
        # If embeddings fail, try to get HuggingFace fallback
        from .embeddings import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        print("Switched to HuggingFace embeddings due to failure")

    try:
        chroma = Chroma.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=[doc.metadata for doc in documents],
            persist_directory=persist_dir
        )
        if persist:
            chroma.persist()
        return chroma
    except Exception as e:
        if "sqlite" in str(e).lower() or "unsupported version" in str(e).lower():
            print(f"SQLite version issue during creation: {e}")
            print("Falling back to in-memory vectorstore...")
            # Try creating without persistence
            try:
                chroma = Chroma.from_texts(
                    texts=texts,
                    embedding=embeddings,
                    metadatas=[doc.metadata for doc in documents]
                )
                return chroma
            except Exception as e2:
                print(f"Even in-memory vectorstore failed: {e2}")
                return None
        else:
            print(f"Vectorstore creation failed: {e}")
            return None

def load_vectorstore():
    embeddings = get_embeddings()
    persist_dir = get_persist_dir(embeddings)

    if not os.path.isdir(persist_dir):
        return None
    try:
        chroma = Chroma(persist_directory=persist_dir, embedding_function=embeddings)
        chroma.similarity_search("test", k=1)
        return chroma
    except Exception as e:
        if "dimension" in str(e).lower():
            print(f"Dimension mismatch detected: {e}. Deleting {persist_dir}")
            safe_delete(persist_dir)
            return None
        else:
            print(f"Error loading vectorstore: {e}")
            return None
