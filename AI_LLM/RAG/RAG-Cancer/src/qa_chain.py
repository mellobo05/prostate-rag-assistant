from langchain.chains import RetrievalQA
from langchain_google_genai import ChatGoogleGenerativeAI
import os

def get_llm():
    """
    Get Google LLM.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not set")
    return ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=api_key)

def build_qa_chain(vectorstore):
    """
    Build a QA chain using the vectorstore.
    """
    llm = get_llm()
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vectorstore.as_retriever()
    )
    return qa_chain
