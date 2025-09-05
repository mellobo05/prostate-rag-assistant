from src.data_loader import load_pdf_from_path
from src.cleaning import clean_text
from src.splitter import split_documents
from src.vectorstore import build_vectorstore
from dotenv import load_dotenv
import os

load_dotenv()

pdf_path = 'Chandraprakash_Cancer_Reports.pdf'
if os.path.exists(pdf_path):
    print("Loading PDF...")
    docs = load_pdf_from_path(pdf_path)
    print(f"Loaded {len(docs)} documents")
    for d in docs:
        d.page_content = clean_text(d.page_content)
    chunks = split_documents(docs)
    print(f"Split into {len(chunks)} chunks")
    vs = build_vectorstore(chunks, persist=False)
    print("Embedding successful")
else:
    print("PDF not found")
