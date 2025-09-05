from langchain.document_loaders import PyPDFLoader
import tempfile

def load_pdf_from_path(path):
    loader = PyPDFLoader(path)
    docs = loader.load()  # returns list of langchain Document objects
    return docs

def save_uploadedfile_to_temp(uploaded_file):
    # for Streamlit file_uploader: returns a pathlib-like tmp file path
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp.write(uploaded_file.read())
    tmp.flush()
    return tmp.name