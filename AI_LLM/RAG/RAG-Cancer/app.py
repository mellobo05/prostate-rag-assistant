import streamlit as st
import os
from dotenv import load_dotenv
from src.data_loader import load_pdf_from_path, save_uploadedfile_to_temp
from src.cleaning import clean_text
from src.splitter import split_documents
from src.vectorstore import build_vectorstore, load_vectorstore
from src.qa_chain import build_qa_chain
from src.extractor import extract_latest_psa

load_dotenv()

st.set_page_config(page_title="Prostate Research Assistant", layout="wide")
st.title("🩺 Prostate Research Assistant — RAG")

st.sidebar.markdown("**Settings**")
uploaded = st.file_uploader("Upload PDF (research paper / report)", type=["pdf"], accept_multiple_files=True)

if uploaded:
    # save and load
    all_docs = []
    for file in uploaded:
        path = save_uploadedfile_to_temp(file)
        docs = load_pdf_from_path(path)
        # clean pages
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
        # Check for local PDF file
        pdf_path = "Chandraprakash_Cancer_Reports.pdf"
        if os.path.exists(pdf_path):
            st.info("Loading local PDF file...")
            docs = load_pdf_from_path(pdf_path)
            # clean pages
            for d in docs:
                d.page_content = clean_text(d.page_content)
            chunks = split_documents(docs)
            vs = build_vectorstore(chunks, persist=True)
            st.success("Indexed local PDF.")
        else:
            st.warning("No documents indexed. Upload PDFs to index or ensure 'Chandraprakash_Cancer_Reports.pdf' is in the root directory.")

query = st.text_input("Ask a question about the documents")
if st.button("Answer") and query and vs:
    qa = build_qa_chain(vs)
    # quick PSA shortcut
    if "psa" in query.lower() and "latest" in query.lower():
        # do keyword-first search
        results = vs.similarity_search(query, k=8)
        latest = extract_latest_psa(results)
        st.write("**Latest PSA**")
        st.write(latest or "No PSA found in indexed docs.")
    else:
        with st.spinner("Running retrieval + LLM..."):
            answer = qa.run(query)
        st.write("**Answer**")
        st.info(answer)
        st.write("**Top sources**")
        sources = vs.similarity_search(query, k=3)
        for s in sources:
            st.markdown(f"- Source: `{s.metadata.get('source', 'unknown')}` ... {s.page_content[:240]}...")
