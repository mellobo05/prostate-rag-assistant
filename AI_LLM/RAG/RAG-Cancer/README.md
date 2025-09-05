# 🩺 Prostate Research Assistant — RAG

A Retrieval-Augmented Generation (RAG) application for prostate cancer research using Streamlit, Langchain, ChromaDB, and Google Generative AI.

## Features

- **PDF Upload and Processing**: Upload research papers or reports (PDF format) for indexing and Q&A.
- **Intelligent Q&A**: Ask questions about the uploaded documents and get AI-powered answers with source references.
- **Persistent Vector Store**: Indexed documents are stored locally for quick retrieval.
- **Specialized Extraction**: Built-in functionality to extract the latest PSA values from documents.
- **Robust Embedding**: Uses Google Generative AI embeddings with timeout handling, retry logic, and batch processing for large documents.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mellobo05/prostate-rag-assistant.git
   cd prostate-rag-assistant
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your Google API key: `GOOGLE_API_KEY=your_api_key_here`

## Usage

1. Run the Streamlit app:
   ```bash
   streamlit run app.py
   ```

2. Open your browser to the provided URL (usually http://localhost:8501).

3. Upload a PDF file or use the pre-loaded local PDF.

4. Ask questions in the text input field and get answers with source references.

## Project Structure

- `app.py`: Main Streamlit application
- `src/`: Source code modules
  - `data_loader.py`: PDF loading and processing
  - `cleaning.py`: Text cleaning utilities
  - `splitter.py`: Document chunking
  - `embeddings.py`: Embedding configuration with retry logic
  - `vectorstore.py`: Vector store management
  - `qa_chain.py`: Q&A chain setup
  - `extractor.py`: Specialized data extraction
- `requirements.txt`: Python dependencies
- `TODO.md`: Development tasks and progress

## Requirements

- Python 3.8+
- Google API Key (for embeddings and LLM)
- Internet connection for API calls

## Error Handling

The application includes robust error handling for:
- Embedding timeouts (increased to 5 minutes with retry)
- Network connectivity issues
- Large document processing with batch embedding

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request


