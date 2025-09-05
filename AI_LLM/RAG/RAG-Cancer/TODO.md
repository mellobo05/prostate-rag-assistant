# TODO: Fix GoogleGenerativeAIError Timeout in Embedding

## Tasks
- [x] Modify src/embeddings.py: Add higher timeout (300s) and retry logic with exponential backoff to GoogleGenerativeAIEmbeddings
- [x] Modify src/vectorstore.py: Add try-except block around Chroma.from_documents for better error handling
- [x] Modify src/splitter.py: Reduce chunk_size to 500 for smaller chunks to reduce embedding load
- [x] Test embedding functionality: Run build_vectorstore with local PDF - failed due to network connectivity issue (503 error), not timeout. Retry logic worked, but connection failed.
- [ ] Test app: Run Streamlit app, upload PDF, and ensure indexing succeeds
