import streamlit as st
import os
import pandas as pd
from src import config
from dotenv import load_dotenv
from src.data_loader import load_pdf_from_path, save_uploadedfile_to_temp
from src.cleaning import clean_text
from src.splitter import split_documents
from src.vectorstore import build_vectorstore, load_vectorstore
from src.qa_chain import build_qa_chain
from src.extractor import extract_medical_data, extract_latest_psa
from src.patient_manager import PatientManager
from src.data_export import export_comprehensive_report, export_all_patients_summary

# Load API keys
try:
    if "GOOGLE_API_KEY" in st.secrets:
        os.environ["GOOGLE_API_KEY"] = st.secrets["GOOGLE_API_KEY"]
except Exception:
    load_dotenv()

st.set_page_config(page_title="Prostate Cancer RAG Assistant", layout="wide")
st.title("🩺 Prostate Cancer RAG Assistant")

# Initialize patient manager
patient_manager = PatientManager()

# Sidebar for patient management
st.sidebar.title("👤 Patient Management")

# Patient selection/creation
patient_tab = st.sidebar.selectbox("Select Action", ["Select Patient", "Add New Patient", "View All Patients"])

if patient_tab == "Add New Patient":
    st.sidebar.subheader("Add New Patient")
    new_patient_id = st.sidebar.text_input("Patient ID", placeholder="e.g., P001")
    new_patient_name = st.sidebar.text_input("Patient Name", placeholder="e.g., John Doe")
    new_patient_age = st.sidebar.number_input("Age", min_value=0, max_value=120, value=None)

    if st.sidebar.button("Add Patient"):
        if new_patient_id and new_patient_name:
            if patient_manager.add_patient(new_patient_id, new_patient_name, new_patient_age):
                st.sidebar.success(f"Patient {new_patient_name} added successfully!")
            else:
                st.sidebar.error("Patient ID already exists!")
        else:
            st.sidebar.error("Please fill in Patient ID and Name")

elif patient_tab == "View All Patients":
    st.sidebar.subheader("All Patients")
    patients = patient_manager.get_all_patients()
    if patients:
        for patient_id, patient_data in patients.items():
            with st.sidebar.expander(f"{patient_data['name']} ({patient_id})"):
                st.write(f"**Age:** {patient_data.get('age', 'Not specified')}")
                st.write(f"**Documents:** {len(patient_data.get('documents', []))}")
                st.write(f"**Created:** {patient_data['created_date'][:10]}")
    else:
        st.sidebar.info("No patients found. Add a new patient to get started.")

# Patient selection
patients = patient_manager.get_all_patients()
if patients:
    patient_options = {f"{data['name']} ({pid})": pid for pid, data in patients.items()}
    selected_patient_display = st.sidebar.selectbox("Select Patient", ["None"] + list(patient_options.keys()))
    selected_patient_id = patient_options.get(selected_patient_display) if selected_patient_display != "None" else None
else:
    selected_patient_id = None
    st.sidebar.info("No patients available. Add a patient first.")

# Main content area
if selected_patient_id:
    patient_data = patient_manager.get_patient(selected_patient_id)
    st.header(f"📋 Patient: {patient_data['name']} ({selected_patient_id})")

    # Patient summary
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Age", patient_data.get('age', 'N/A'))
    with col2:
        st.metric("Total Documents", len(patient_data.get('documents', [])))
    with col3:
        st.metric("Last Updated", patient_data['last_updated'][:10])
    with col4:
        st.metric("Created", patient_data['created_date'][:10])

    # Document upload section
    st.subheader("📄 Upload Documents")
    uploaded_files = st.file_uploader(
        "Upload medical documents (PDF)",
        type=["pdf"],
        accept_multiple_files=True,
        key=f"upload_{selected_patient_id}"
    )

    if uploaded_files:
        for file in uploaded_files:
            # Save file temporarily
            temp_path = save_uploadedfile_to_temp(file)

            # Add to patient record
            if patient_manager.add_document(selected_patient_id, temp_path, file.name):
                st.success(f"✅ Added {file.name} to patient record")
            else:
                st.error(f"❌ Failed to add {file.name}")

            # Clean up temp file
            os.unlink(temp_path)

    # Document management
    st.subheader("📚 Patient Documents")
    documents = patient_manager.get_patient_documents(selected_patient_id)

    if documents:
        # Check for duplicates
        duplicate_groups = patient_manager.find_duplicate_documents(selected_patient_id)
        
        if duplicate_groups:
            st.warning(f"⚠️ Found {len(duplicate_groups)} duplicate document groups!")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button("🗑️ Remove Duplicates (Keep Latest)", key="remove_duplicates"):
                    result = patient_manager.remove_duplicate_documents(selected_patient_id, keep_latest=True)
                    st.success(f"✅ Removed {result['documents_removed']} duplicate documents. Kept {result['unique_documents_kept']} unique documents.")
                    st.rerun()
            
            with col2:
                if st.button("📊 Show Duplicate Details", key="show_duplicates"):
                    for i, group in enumerate(duplicate_groups, 1):
                        with st.expander(f"Duplicate Group {i}: {group['original_filename']} ({group['file_size']} bytes)"):
                            for j, doc in enumerate(group['documents']):
                                st.write(f"**Copy {j+1}:** {doc['filename']} - Uploaded: {doc['upload_date'][:19]}")
        
        # Create a DataFrame for better display
        doc_df = pd.DataFrame(documents)
        doc_df['upload_date'] = pd.to_datetime(doc_df['upload_date']).dt.strftime('%Y-%m-%d %H:%M')
        doc_df = doc_df[['original_filename', 'document_type', 'upload_date', 'file_size', 'filename']]
        doc_df.columns = ['Filename', 'Type', 'Upload Date', 'Size (bytes)', 'Internal Filename']
        
        # Add delete buttons for each document
        st.subheader("📄 Document Management")
        
        for i, doc in enumerate(documents):
            col1, col2, col3, col4, col5 = st.columns([3, 1, 1, 1, 1])
            with col1:
                st.write(f"**{doc['original_filename']}**")
                st.write(f"Uploaded: {doc['upload_date'][:19]} | Size: {doc['file_size']:,} bytes")
            with col2:
                if st.button("🗑️ Delete", key=f"delete_{i}"):
                    # Delete the document
                    try:
                        if os.path.exists(doc['file_path']):
                            os.remove(doc['file_path'])
                        # Remove from patient data
                        patient_manager.patients[selected_patient_id]['documents'].remove(doc)
                        patient_manager.save_patients()
                        st.success(f"✅ Deleted {doc['original_filename']}")
                        st.rerun()
                    except Exception as e:
                        st.error(f"❌ Error deleting {doc['original_filename']}: {e}")
            with col3:
                if st.button("📊 Process", key=f"process_{i}"):
                    st.info(f"Processing {doc['original_filename']}...")
            with col4:
                if st.button("👁️ View", key=f"view_{i}"):
                    st.info(f"Viewing {doc['original_filename']}...")
            with col5:
                if st.button("📋 Info", key=f"info_{i}"):
                    st.json(doc)
            st.divider()

        # Process documents for RAG
        if st.button("🔄 Process Documents for RAG", key="process_docs"):
            with st.spinner("Processing documents..."):
                # Use unique documents only to avoid processing duplicates
                unique_documents = patient_manager.get_unique_documents(selected_patient_id)
                st.info(f"Processing {len(unique_documents)} unique documents (out of {len(documents)} total)")
                
                all_docs = []
                for doc in unique_documents:
                    if doc['file_path'] and os.path.exists(doc['file_path']):
                        docs = load_pdf_from_path(doc['file_path'])
                        for d in docs:
                            d.page_content = clean_text(d.page_content)
                            # Add patient metadata
                            d.metadata['patient_id'] = selected_patient_id
                            d.metadata['patient_name'] = patient_data['name']
                            d.metadata['source'] = doc['original_filename']  # Use original filename
                        all_docs.extend(docs)

                if all_docs:
                    chunks = split_documents(all_docs)
                    vs = build_vectorstore(chunks, persist=True)
                    st.session_state[f'vectorstore_{selected_patient_id}'] = vs
                    st.success(f"✅ Processed {len(all_docs)} document pages from {len(unique_documents)} unique documents for patient {patient_data['name']}")
                else:
                    st.error("❌ No valid documents found to process")
    else:
        st.info("No documents uploaded for this patient yet.")

    # RAG Query Section
    st.subheader("🔍 Medical Data Extraction")

    # Quick extraction buttons
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        if st.button("📊 Extract PSA Results", key="extract_psa"):
            st.session_state['extract_type'] = 'psa'
    with col2:
        if st.button("🔬 Extract Gleason Scores", key="extract_gleason"):
            st.session_state['extract_type'] = 'gleason'
    with col3:
        if st.button("📋 Extract Cancer Stage", key="extract_stage"):
            st.session_state['extract_type'] = 'stage'
    with col4:
        if st.button("💊 Extract Treatments", key="extract_treatment"):
            st.session_state['extract_type'] = 'treatment'
    with col5:
        if st.button("📤 Export All Data", key="export_data"):
            st.session_state['export_data'] = True

    # Custom query
    col1, col2 = st.columns([4, 1])
    with col1:
        user_query = st.text_input(
            "Ask a question about the patient's medical data",
            placeholder="e.g., What are the PSA results?",
            key="search_query"
        )
    with col2:
        if st.button("🗑️ Clear", key="clear_search"):
            st.session_state.search_query = ""
            st.rerun()

    if st.button("🔍 Search") and user_query:
        # Clear any previous search results
        if f'search_results_{selected_patient_id}' in st.session_state:
            del st.session_state[f'search_results_{selected_patient_id}']
        
        # Get vectorstore for this patient
        vs = st.session_state.get(f'vectorstore_{selected_patient_id}')

        if vs:
            docs = vs.similarity_search(user_query, k=5)

            # Extract medical data based on query
            if any(keyword in user_query.lower() for keyword in ['psa', 'prostate specific antigen', 'psa history', 'psa results']):
                # For PSA extraction, process PDF directly instead of using vectorstore search
                # This ensures we get ALL pages and don't miss any PSA results
                st.info("Processing PDF directly for comprehensive PSA extraction...")
                
                # Get unique documents for this patient
                unique_documents = patient_manager.get_unique_documents(selected_patient_id)
                all_docs = []
                
                for doc in unique_documents:
                    if doc['file_path'] and os.path.exists(doc['file_path']):
                        docs = load_pdf_from_path(doc['file_path'])
                        for d in docs:
                            d.page_content = clean_text(d.page_content)
                            # Add patient metadata
                            d.metadata['patient_id'] = selected_patient_id
                            d.metadata['patient_name'] = patient_data['name']
                            d.metadata['source'] = doc['original_filename']
                            d.metadata['file_path'] = doc['file_path']
                        all_docs.extend(docs)
                
                st.info(f"Processing {len(all_docs)} document pages directly...")
                medical_data = extract_medical_data(all_docs, 'psa')
                if medical_data.get('psa_results'):
                    st.subheader("📊 PSA History (Chronological Order)")

                    # Create a table for better display
                    psa_df = pd.DataFrame(medical_data['psa_results'])
                    psa_df = psa_df[['date', 'value', 'unit', 'context', 'source']]
                    psa_df.columns = ['Date', 'PSA Value', 'Unit', 'Context', 'Source']

                    # Display the table
                    st.dataframe(psa_df, use_container_width=True)

                    # Also show individual results with better formatting
                    st.write("**Detailed PSA History:**")
                    for i, psa in enumerate(medical_data['psa_results'], 1):
                        with st.expander(f"PSA Result #{i} - {psa['date']}"):
                            st.write(f"**PSA Value:** {psa['value']} {psa['unit']}")
                            st.write(f"**Date:** {psa['date']}")
                            st.write(f"**Source:** {psa['source']}")
                            st.write(f"**Context:** {psa['context']}")

                    # Summary statistics
                    if len(medical_data['psa_results']) > 1:
                        values = [psa['value'] for psa in medical_data['psa_results']]
                        st.write("**Summary:**")
                        col1, col2, col3, col4 = st.columns(4)
                        with col1:
                            st.metric("Latest PSA", f"{values[-1]:.2f} ng/mL")
                        with col2:
                            st.metric("Highest PSA", f"{max(values):.2f} ng/mL")
                        with col3:
                            st.metric("Lowest PSA", f"{min(values):.2f} ng/mL")
                        with col4:
                            st.metric("Total Tests", len(values))
                else:
                    st.warning("No PSA results found in the documents.")
            
            elif any(keyword in user_query.lower() for keyword in ['gleason', 'grade']):
                medical_data = extract_medical_data(docs, 'gleason')
                if medical_data.get('gleason_scores'):
                    st.subheader("🔬 Gleason Scores")
                    for gleason in medical_data['gleason_scores']:
                        st.write(f"**Score:** {gleason['primary_grade']} + {gleason['secondary_grade']} = {gleason['total_score']}")
                        st.write(f"**Context:** {gleason['context']}")
                        st.write("---")
                else:
                    st.warning("No Gleason scores found in the documents.")
            
            elif any(keyword in user_query.lower() for keyword in ['stage', 'staging', 'tnm']):
                medical_data = extract_medical_data(docs, 'stage')
                if medical_data.get('cancer_stage'):
                    st.subheader("📋 Cancer Staging")
                    for stage in medical_data['cancer_stage']:
                        st.write(f"**Stage:** {stage['stage']}")
                        st.write(f"**Context:** {stage['context']}")
                        st.write("---")
                else:
                    st.warning("No cancer staging information found in the documents.")
            
            elif any(keyword in user_query.lower() for keyword in ['treatment', 'therapy', 'surgery']):
                medical_data = extract_medical_data(docs, 'treatment')
                if medical_data.get('treatments'):
                    st.subheader("💊 Treatment History")
                    for treatment in medical_data['treatments']:
                        st.write(f"**Treatment:** {treatment['treatment']}")
                        st.write(f"**Context:** {treatment['context']}")
                        st.write("---")
                else:
                    st.warning("No treatment information found in the documents.")
            
            else:
                # General Q&A
                qa_chain = build_qa_chain(vs)
                if qa_chain:
                    response = qa_chain.invoke({"query": user_query})
                    st.write("**Answer:**")
                    st.write(response["result"])
                    
                    st.write("**Sources:**")
                    for i, doc in enumerate(docs[:3], 1):
                        st.write(f"{i}. {doc.metadata.get('source', 'Unknown source')}")
                        st.write(f"   {doc.page_content[:200]}...")
                        st.write("")
        else:
            st.warning("Please process documents first by clicking 'Process Documents for RAG' button.")