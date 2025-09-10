import streamlit as st
import os
from src import config
from dotenv import load_dotenv
from src.data_loader import load_pdf_from_path, save_uploadedfile_to_temp
from src.cleaning import clean_text
from src.splitter import split_documents
from src.vectorstore import build_vectorstore, load_vectorstore
from src.qa_chain import build_qa_chain
from src.extractor import extract_latest_psa

# Load API keys
try:
    if "GOOGLE_API_KEY" in st.secrets:
        os.environ["GOOGLE_API_KEY"] = st.secrets["GOOGLE_API_KEY"]
except Exception:
    load_dotenv()

st.set_page_config(page_title="Prostate Research Assistant", layout="wide")
st.title("🩺 Prostate Research Assistant — RAG")

st.sidebar.markdown("**Settings**")
uploaded = st.file_uploader("Upload PDF (research paper / report)", type=["pdf"], accept_multiple_files=True)

if uploaded:
    all_docs = []
    for file in uploaded:
        path = save_uploadedfile_to_temp(file)
        docs = load_pdf_from_path(path)
        for d in docs:
            d.page_content = clean_text(d.page_content)
        all_docs.extend(docs)

    chunks = split_documents(all_docs)
    vs = build_vectorstore(chunks, persist=True)
    st.success("Indexed uploaded PDFs.")
else:
    vs = load_vectorstore()
    if vs:
        st.info("Loaded persisted index.")
    else:
        pdf_path = "Chandraprakash_Cancer_Reports.pdf"
        if os.path.exists(pdf_path):
            st.info("Loading local PDF file...")
            docs = load_pdf_from_path(pdf_path)
            for d in docs:
                d.page_content = clean_text(d.page_content)
            chunks = split_documents(docs)
            vs = build_vectorstore(chunks, persist=True)
            st.success("Indexed local PDF.")
        else:
            st.warning("No documents indexed. Upload PDFs to index or ensure 'Chandraprakash_Cancer_Reports.pdf' is in the root directory.")

# Build QA chain
qa_chain = build_qa_chain(vs) if vs else None

user_query = st.text_input("Ask a question about the documents")
if st.button("Answer") and vs:
    docs = vs.similarity_search(user_query, k=5)

    # ✅ Special handling for PSA queries
    if "psa" in user_query.lower() or "latest result" in user_query.lower():
        psa_value = extract_latest_psa(docs)
        if psa_value:
            st.success(f"📌 Latest PSA result: **{psa_value}**")
        else:
            st.warning("⚠️ No PSA value found in the documents.")
    else:
        response = qa_chain.invoke({"query": user_query})
        st.write(response["result"])
        st.write("**Top sources**")
        for s in docs[:3]:
            st.markdown(f"- Source: `{s.metadata.get('source', 'unknown')}` ... {s.page_content[:240]}...")
