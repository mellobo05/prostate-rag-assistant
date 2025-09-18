# 🩺 Prostate Cancer RAG Assistant

A comprehensive Retrieval-Augmented Generation (RAG) application for prostate cancer patient data management and medical information extraction using Streamlit, Langchain, ChromaDB, and Google Generative AI.

## 🚀 Features

### Patient Management
- **Multi-Patient Support**: Add and manage multiple patients with unique IDs
- **Patient Profiles**: Store patient information including name, age, and additional details
- **Document Organization**: Organize medical documents by patient
- **Persistent Storage**: All patient data and documents are stored locally

### Medical Data Extraction
- **PSA Results**: Extract PSA values with dates and context
- **Gleason Scores**: Extract Gleason scores (primary + secondary grades)
- **Cancer Staging**: Extract TNM staging and clinical stage information
- **Treatment History**: Extract treatment information (surgery, radiation, etc.)
- **Biopsy Results**: Extract biopsy findings and results
- **Imaging Results**: Extract MRI, CT, PET scan results

### Advanced RAG Capabilities
- **Intelligent Q&A**: Ask natural language questions about patient data
- **Context-Aware Search**: Get relevant medical information with source references
- **Multi-Document Processing**: Process multiple documents per patient
- **Vector Search**: Use semantic search to find relevant information

### Data Export
- **Multiple Formats**: Export data in JSON, CSV, and text formats
- **Comprehensive Reports**: Generate detailed patient summary reports
- **Structured Data**: Export specific medical parameters as CSV files
- **Download Functionality**: Direct download of exported files

## 📦 Installation

### Quick Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/mellobo05/prostate-rag-assistant.git
   cd prostate-rag-assistant/AI_LLM/RAG/RAG-Cancer
   ```

2. Run the setup script:
   ```bash
   python setup.py
   ```

3. Edit the `.env` file and add your Google API key:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

### Manual Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create necessary directories:
   ```bash
   mkdir -p patient_data exports
   ```

3. Set up environment variables (create `.env` file):
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

## 🎯 Usage

### Starting the Application
```bash
streamlit run app.py
```

Open your browser to the provided URL (usually http://localhost:8501).

### Adding Patients
1. In the sidebar, select "Add New Patient"
2. Enter Patient ID (e.g., P001), Name, and Age
3. Click "Add Patient"

### Uploading Documents
1. Select a patient from the sidebar
2. Use the "Upload Documents" section to upload PDF files
3. Documents are automatically stored in the patient's folder

### Processing Documents
1. After uploading documents, click "Process Documents for RAG"
2. The system will process all documents and create a searchable index

### Extracting Medical Data
- Use the quick extraction buttons for specific data types:
  - 📊 Extract PSA Results
  - 🔬 Extract Gleason Scores
  - 📋 Extract Cancer Stage
  - 💊 Extract Treatments
- Or ask custom questions in the search box

### Exporting Data
1. Click "📤 Export All Data" to generate comprehensive reports
2. Download files in multiple formats (JSON, CSV, TXT)

## 📁 Project Structure

```
prostate-rag-assistant/
├── AI_LLM/RAG/RAG-Cancer/
│   ├── app.py                 # Main Streamlit application
│   ├── setup.py              # Setup script
│   ├── requirements.txt      # Python dependencies
│   ├── src/                  # Source code modules
│   │   ├── patient_manager.py    # Patient data management
│   │   ├── data_export.py        # Data export functionality
│   │   ├── extractor.py          # Medical data extraction
│   │   ├── data_loader.py        # PDF loading and processing
│   │   ├── cleaning.py           # Text cleaning utilities
│   │   ├── splitter.py           # Document chunking
│   │   ├── embeddings.py         # Embedding configuration
│   │   ├── vectorstore.py        # Vector store management
│   │   └── qa_chain.py           # Q&A chain setup
│   ├── patient_data/         # Patient data storage
│   ├── exports/              # Exported reports
│   └── db/                   # Vector database storage
```

## 🔧 Configuration

### Environment Variables
- `GOOGLE_API_KEY`: Required for Google Generative AI embeddings and LLM
- `OPENAI_API_KEY`: Optional, for OpenAI models

### API Keys Setup
1. Get a Google API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to your `.env` file:
   ```
   GOOGLE_API_KEY=your_actual_api_key_here
   ```

## 📊 Data Extraction Examples

### PSA Results
The system can extract PSA values in various formats:
- "PSA: 5.2 ng/mL"
- "Prostate Specific Antigen = 4.8"
- "PSA 3.2"

### Gleason Scores
Extracts Gleason scores in formats like:
- "Gleason score 3+4"
- "Grade 4+3"
- "3+4 Gleason"

### Cancer Staging
Identifies staging information:
- "Stage T2a N0 M0"
- "Clinical stage II"
- "TNM T3b N1 M0"

## 🛠️ Technical Details

### Dependencies
- **Streamlit**: Web application framework
- **Langchain**: RAG framework
- **ChromaDB**: Vector database
- **Google Generative AI**: Embeddings and LLM
- **PyPDF**: PDF processing
- **Pandas**: Data manipulation

### Error Handling
- Robust timeout handling for API calls
- Retry logic for failed requests
- Graceful handling of malformed documents
- Comprehensive error messages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the GitHub Issues page
2. Review the documentation
3. Create a new issue with detailed information

## 🔄 Updates

### Version 2.0 Features
- ✅ Multi-patient management system
- ✅ Enhanced medical data extraction
- ✅ Comprehensive data export functionality
- ✅ Improved user interface
- ✅ Persistent document storage
- ✅ Advanced RAG capabilities

---

**Note**: This application is designed for medical data management and should be used in compliance with healthcare data privacy regulations (HIPAA, GDPR, etc.).


