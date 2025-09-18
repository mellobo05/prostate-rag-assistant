from langchain.chains import RetrievalQA
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFacePipeline
from transformers import pipeline
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_llm():
    """
    Get LLM with Gemini as primary and HuggingFace as fallback.
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    
    # First, try Gemini API
    if api_key:
        try:
            llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=api_key)
            print("Using Google Gemini LLM (primary).")
            return llm
        except Exception as e:
            print(f"Gemini API failed: {e}. Falling back to HuggingFace LLM.")

    # Fallback to HuggingFace local LLM
    try:
        print("Initializing HuggingFace local LLM...")
        # Use a lightweight model for local inference
        pipe = pipeline(
            "text2text-generation",
            model="google/flan-t5-small",
            max_length=512,
            do_sample=False
        )
        llm = HuggingFacePipeline(pipeline=pipe)
        print("Using HuggingFace local LLM (fallback).")
        return llm
    except Exception as e:
        print(f"HuggingFace LLM also failed: {e}")
    
    raise RuntimeError("Failed to initialize both Gemini and HuggingFace LLMs. Please check your internet connection and API keys.")

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
