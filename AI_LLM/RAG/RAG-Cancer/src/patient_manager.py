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
    
    def find_duplicate_documents(self, patient_id: str) -> List[Dict[str, Any]]:
        """
        Find duplicate documents for a patient based on original filename and file size.
        
        Returns:
            List of duplicate groups, where each group contains documents that are duplicates
        """
        if patient_id not in self.patients:
            return []
        
        documents = self.patients[patient_id].get("documents", [])
        duplicate_groups = []
        seen_combinations = {}
        
        for doc in documents:
            # Create a key based on original filename and file size
            key = (doc["original_filename"], doc["file_size"])
            
            if key in seen_combinations:
                # This is a duplicate
                if key not in [group["key"] for group in duplicate_groups]:
                    # First time seeing this duplicate, create a new group
                    duplicate_groups.append({
                        "key": key,
                        "original_filename": doc["original_filename"],
                        "file_size": doc["file_size"],
                        "documents": [seen_combinations[key], doc]
                    })
                else:
                    # Add to existing group
                    for group in duplicate_groups:
                        if group["key"] == key:
                            group["documents"].append(doc)
                            break
            else:
                seen_combinations[key] = doc
        
        return duplicate_groups
    
    def remove_duplicate_documents(self, patient_id: str, keep_latest: bool = True) -> Dict[str, Any]:
        """
        Remove duplicate documents for a patient, keeping only one copy of each unique document.
        
        Args:
            patient_id: Patient ID
            keep_latest: If True, keep the latest uploaded version. If False, keep the first uploaded version.
        
        Returns:
            Dictionary with removal statistics
        """
        if patient_id not in self.patients:
            return {"error": "Patient not found"}
        
        duplicate_groups = self.find_duplicate_documents(patient_id)
        removed_count = 0
        kept_count = 0
        
        for group in duplicate_groups:
            documents = group["documents"]
            
            if len(documents) > 1:
                # Sort by upload date
                documents.sort(key=lambda x: x["upload_date"], reverse=keep_latest)
                
                # Keep the first one (latest if keep_latest=True, oldest if False)
                keep_doc = documents[0]
                remove_docs = documents[1:]
                
                # Remove files from filesystem
                for doc in remove_docs:
                    try:
                        if os.path.exists(doc["file_path"]):
                            os.remove(doc["file_path"])
                        removed_count += 1
                    except Exception as e:
                        print(f"Error removing file {doc['file_path']}: {e}")
                
                # Remove from patient documents list
                self.patients[patient_id]["documents"] = [
                    d for d in self.patients[patient_id]["documents"] 
                    if d not in remove_docs
                ]
                
                kept_count += 1
        
        # Update last_updated timestamp
        self.patients[patient_id]["last_updated"] = datetime.now().isoformat()
        self.save_patients()
        
        return {
            "duplicate_groups_found": len(duplicate_groups),
            "documents_removed": removed_count,
            "unique_documents_kept": kept_count,
            "total_documents_after": len(self.patients[patient_id]["documents"])
        }
    
    def get_unique_documents(self, patient_id: str) -> List[Dict]:
        """
        Get unique documents for a patient (one per original filename + file size combination).
        """
        if patient_id not in self.patients:
            return []
        
        documents = self.patients[patient_id].get("documents", [])
        unique_docs = []
        seen_combinations = set()
        
        for doc in documents:
            key = (doc["original_filename"], doc["file_size"])
            if key not in seen_combinations:
                unique_docs.append(doc)
                seen_combinations.add(key)
        
        return unique_docs

