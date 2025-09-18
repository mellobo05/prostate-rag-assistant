import json
import csv
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

def export_patient_data_to_json(patient_data: Dict, medical_data: Dict, output_path: str):
    """
    Export patient data and extracted medical information to JSON format.
    
    Args:
        patient_data: Patient information dictionary
        medical_data: Extracted medical data dictionary
        output_path: Path to save the JSON file
    """
    export_data = {
        "patient_info": patient_data,
        "extracted_medical_data": medical_data,
        "export_timestamp": datetime.now().isoformat(),
        "export_version": "1.0"
    }
    
    with open(output_path, 'w') as f:
        json.dump(export_data, f, indent=2)

def export_psa_data_to_csv(psa_data: List[Dict], output_path: str):
    """
    Export PSA data to CSV format.
    
    Args:
        psa_data: List of PSA data dictionaries
        output_path: Path to save the CSV file
    """
    if not psa_data:
        return
    
    df = pd.DataFrame(psa_data)
    df.to_csv(output_path, index=False)

def export_gleason_data_to_csv(gleason_data: List[Dict], output_path: str):
    """
    Export Gleason score data to CSV format.
    
    Args:
        gleason_data: List of Gleason data dictionaries
        output_path: Path to save the CSV file
    """
    if not gleason_data:
        return
    
    df = pd.DataFrame(gleason_data)
    df.to_csv(output_path, index=False)

def export_treatment_data_to_csv(treatment_data: List[Dict], output_path: str):
    """
    Export treatment data to CSV format.
    
    Args:
        treatment_data: List of treatment data dictionaries
        output_path: Path to save the CSV file
    """
    if not treatment_data:
        return
    
    df = pd.DataFrame(treatment_data)
    df.to_csv(output_path, index=False)

def export_comprehensive_report(patient_data: Dict, medical_data: Dict, output_dir: str):
    """
    Export a comprehensive report with all patient data in multiple formats.
    
    Args:
        patient_data: Patient information dictionary
        medical_data: Extracted medical data dictionary
        output_dir: Directory to save all export files
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    patient_id = patient_data.get('patient_id', 'unknown')
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Export JSON report
    json_path = output_path / f"{patient_id}_comprehensive_report_{timestamp}.json"
    export_patient_data_to_json(patient_data, medical_data, str(json_path))
    
    # Export individual CSV files
    if medical_data.get('psa_results'):
        psa_path = output_path / f"{patient_id}_psa_results_{timestamp}.csv"
        export_psa_data_to_csv(medical_data['psa_results'], str(psa_path))
    
    if medical_data.get('gleason_scores'):
        gleason_path = output_path / f"{patient_id}_gleason_scores_{timestamp}.csv"
        export_gleason_data_to_csv(medical_data['gleason_scores'], str(gleason_path))
    
    if medical_data.get('treatments'):
        treatment_path = output_path / f"{patient_id}_treatments_{timestamp}.csv"
        export_treatment_data_to_csv(medical_data['treatments'], str(treatment_path))
    
    # Create summary report
    summary_path = output_path / f"{patient_id}_summary_{timestamp}.txt"
    create_summary_report(patient_data, medical_data, str(summary_path))
    
    return {
        "json_report": str(json_path),
        "summary_report": str(summary_path),
        "csv_files": [str(f) for f in output_path.glob(f"{patient_id}_*_{timestamp}.csv")]
    }

def create_summary_report(patient_data: Dict, medical_data: Dict, output_path: str):
    """
    Create a human-readable summary report.
    
    Args:
        patient_data: Patient information dictionary
        medical_data: Extracted medical data dictionary
        output_path: Path to save the summary report
    """
    with open(output_path, 'w') as f:
        f.write("PROSTATE CANCER PATIENT SUMMARY REPORT\n")
        f.write("=" * 50 + "\n\n")
        
        # Patient Information
        f.write("PATIENT INFORMATION:\n")
        f.write(f"Name: {patient_data.get('name', 'N/A')}\n")
        f.write(f"Patient ID: {patient_data.get('patient_id', 'N/A')}\n")
        f.write(f"Age: {patient_data.get('age', 'N/A')}\n")
        f.write(f"Report Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        # PSA Results
        if medical_data.get('psa_results'):
            f.write("PSA RESULTS:\n")
            f.write("-" * 20 + "\n")
            for i, psa in enumerate(medical_data['psa_results'], 1):
                f.write(f"{i}. Value: {psa['value']} {psa['unit']}\n")
                f.write(f"   Date: {psa['date']}\n")
                f.write(f"   Context: {psa['context'][:100]}...\n\n")
        else:
            f.write("PSA RESULTS: No data found\n\n")
        
        # Gleason Scores
        if medical_data.get('gleason_scores'):
            f.write("GLEASON SCORES:\n")
            f.write("-" * 20 + "\n")
            for i, gleason in enumerate(medical_data['gleason_scores'], 1):
                f.write(f"{i}. Score: {gleason['primary_grade']} + {gleason['secondary_grade']} = {gleason['total_score']}\n")
                f.write(f"   Context: {gleason['context'][:100]}...\n\n")
        else:
            f.write("GLEASON SCORES: No data found\n\n")
        
        # Cancer Staging
        if medical_data.get('cancer_stage'):
            f.write("CANCER STAGING:\n")
            f.write("-" * 20 + "\n")
            for i, stage in enumerate(medical_data['cancer_stage'], 1):
                f.write(f"{i}. Stage: {stage['stage']}\n")
                f.write(f"   Context: {stage['context'][:100]}...\n\n")
        else:
            f.write("CANCER STAGING: No data found\n\n")
        
        # Treatment History
        if medical_data.get('treatments'):
            f.write("TREATMENT HISTORY:\n")
            f.write("-" * 20 + "\n")
            for i, treatment in enumerate(medical_data['treatments'], 1):
                f.write(f"{i}. Treatment: {treatment['treatment']}\n")
                f.write(f"   Context: {treatment['context'][:100]}...\n\n")
        else:
            f.write("TREATMENT HISTORY: No data found\n\n")
        
        # Biopsy Results
        if medical_data.get('biopsy_results'):
            f.write("BIOPSY RESULTS:\n")
            f.write("-" * 20 + "\n")
            for i, biopsy in enumerate(medical_data['biopsy_results'], 1):
                f.write(f"{i}. Result: {biopsy['result']}\n")
                f.write(f"   Context: {biopsy['context'][:100]}...\n\n")
        else:
            f.write("BIOPSY RESULTS: No data found\n\n")
        
        # Imaging Results
        if medical_data.get('imaging_results'):
            f.write("IMAGING RESULTS:\n")
            f.write("-" * 20 + "\n")
            for i, imaging in enumerate(medical_data['imaging_results'], 1):
                f.write(f"{i}. Type: {imaging['type']}\n")
                f.write(f"   Result: {imaging['result'][:100]}...\n\n")
        else:
            f.write("IMAGING RESULTS: No data found\n\n")

def export_all_patients_summary(patient_manager, output_path: str):
    """
    Export a summary of all patients in the system.
    
    Args:
        patient_manager: PatientManager instance
        output_path: Path to save the summary file
    """
    all_patients = patient_manager.get_all_patients()
    
    summary_data = []
    for patient_id, patient_data in all_patients.items():
        summary_data.append({
            "patient_id": patient_id,
            "name": patient_data.get('name', 'N/A'),
            "age": patient_data.get('age', 'N/A'),
            "total_documents": len(patient_data.get('documents', [])),
            "created_date": patient_data.get('created_date', 'N/A'),
            "last_updated": patient_data.get('last_updated', 'N/A')
        })
    
    df = pd.DataFrame(summary_data)
    df.to_csv(output_path, index=False)
    
    return output_path
