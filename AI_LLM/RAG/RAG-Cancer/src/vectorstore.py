from langchain.vectorstores import Chroma
from .embeddings import get_embeddings, embed_with_retry
import os

PERSIST_DIR = os.getenv("VECTOR_DB_DIR", "db")

def build_vectorstore(documents, persist=True):
    embeddings = get_embeddings()
    try:
        # Extract texts from documents
        texts = [doc.page_content for doc in documents]
        # Embed with retry
        embeddings_list = embed_with_retry(embeddings, texts)
        # Create Chroma with pre-computed embeddings
        chroma = Chroma.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=[doc.metadata for doc in documents],
            persist_directory=PERSIST_DIR
        )
        if persist:
            chroma.persist()
        return chroma
    except Exception as e:
        print(f"Error building vectorstore: {e}")
        raise e

def load_vectorstore():
    embeddings = get_embeddings()
    if not os.path.isdir(PERSIST_DIR):
        return None
    return Chroma(persist_directory=PERSIST_DIR, embedding_function=embeddings)
