import os
import json
import shutil
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

class PatientManager:
    """
    Manages patient data and document storage.
    """
    
    def __init__(self, base_dir: str = "patient_data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        self.patients_file = self.base_dir / "patients.json"
        self.load_patients()
    
    def load_patients(self):
        """Load patient data from JSON file."""
        if self.patients_file.exists():
            with open(self.patients_file, 'r') as f:
                self.patients = json.load(f)
        else:
            self.patients = {}
    
    def save_patients(self):
        """Save patient data to JSON file."""
        with open(self.patients_file, 'w') as f:
            json.dump(self.patients, f, indent=2)
    
    def add_patient(self, patient_id: str, name: str, age: Optional[int] = None, 
                   additional_info: Optional[Dict] = None) -> bool:
        """
        Add a new patient to the system.
        
        Args:
            patient_id: Unique identifier for the patient
            name: Patient's name
            age: Patient's age (optional)
            additional_info: Additional patient information (optional)
        
        Returns:
            True if patient was added successfully, False if patient already exists
        """
        if patient_id in self.patients:
            return False
        
        patient_dir = self.base_dir / patient_id
        patient_dir.mkdir(exist_ok=True)
        
        self.patients[patient_id] = {
            "name": name,
            "age": age,
            "created_date": datetime.now().isoformat(),
            "last_updated": datetime.now().isoformat(),
            "documents": [],
            "additional_info": additional_info or {}
        }
        
        self.save_patients()
        return True
    
    def get_patient(self, patient_id: str) -> Optional[Dict]:
        """Get patient information by ID."""
        return self.patients.get(patient_id)
    
    def get_all_patients(self) -> Dict[str, Dict]:
        """Get all patients."""
        return self.patients
    
    def update_patient(self, patient_id: str, **kwargs) -> bool:
        """Update patient information."""
        if patient_id not in self.patients:
            return False
        
        for key, value in kwargs.items():
            if key in self.patients[patient_id]:
                self.patients[patient_id][key] = value
        
        self.patients[patient_id]["last_updated"] = datetime.now().isoformat()
        self.save_patients()
        return True
    
    def add_document(self, patient_id: str, file_path: str, original_filename: str, 
                    document_type: str = "medical_report") -> bool:
        """
        Add a document to a patient's record.
        
        Args:
            patient_id: Patient ID
            file_path: Path to the uploaded file
            original_filename: Original filename
            document_type: Type of document (medical_report, lab_results, etc.)
        
        Returns:
            True if document was added successfully
        """
        if patient_id not in self.patients:
            return False
        
        patient_dir = self.base_dir / patient_id / "documents"
        patient_dir.mkdir(exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = Path(original_filename).suffix
        new_filename = f"{timestamp}_{original_filename}"
        new_path = patient_dir / new_filename
        
        # Copy file to patient directory
        shutil.copy2(file_path, new_path)
        
        # Add document to patient record
        document_info = {
            "filename": new_filename,
            "original_filename": original_filename,
            "file_path": str(new_path),
            "document_type": document_type,
            "upload_date": datetime.now().isoformat(),
            "file_size": os.path.getsize(new_path)
        }
        
        self.patients[patient_id]["documents"].append(document_info)
        self.patients[patient_id]["last_updated"] = datetime.now().isoformat()
        self.save_patients()
        
        return True
    
    def get_patient_documents(self, patient_id: str) -> List[Dict]:
        """Get all documents for a patient."""
        if patient_id not in self.patients:
            return []
        return self.patients[patient_id].get("documents", [])
    
    def get_document_path(self, patient_id: str, document_filename: str) -> Optional[str]:
        """Get the full path to a specific document."""
        if patient_id not in self.patients:
            return None
        
        for doc in self.patients[patient_id]["documents"]:
            if doc["filename"] == document_filename:
                return doc["file_path"]
        return None
    
    def delete_patient(self, patient_id: str) -> bool:
        """Delete a patient and all their data."""
        if patient_id not in self.patients:
            return False
        
        # Remove patient directory
        patient_dir = self.base_dir / patient_id
        if patient_dir.exists():
            shutil.rmtree(patient_dir)
        
        # Remove from patients dict
        del self.patients[patient_id]
        self.save_patients()
        return True
    
    def search_patients(self, query: str) -> List[Dict]:
        """Search patients by name or ID."""
        results = []
        query_lower = query.lower()
        
        for patient_id, patient_data in self.patients.items():
            if (query_lower in patient_id.lower() or 
                query_lower in patient_data["name"].lower()):
                results.append({
                    "patient_id": patient_id,
                    **patient_data
                })
        
        return results
    
    def get_patient_summary(self, patient_id: str) -> Dict[str, Any]:
        """Get a summary of patient data including document counts."""
        if patient_id not in self.patients:
            return {}
        
        patient = self.patients[patient_id]
        documents = patient.get("documents", [])
        
        # Count documents by type
        doc_types = {}
        for doc in documents:
            doc_type = doc.get("document_type", "unknown")
            doc_types[doc_type] = doc_types.get(doc_type, 0) + 1
        
        return {
            "patient_id": patient_id,
            "name": patient["name"],
            "age": patient.get("age"),
            "total_documents": len(documents),
            "document_types": doc_types,
            "created_date": patient["created_date"],
            "last_updated": patient["last_updated"]
        }
