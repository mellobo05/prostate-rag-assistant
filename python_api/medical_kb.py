PROSTATE_CANCER_NCCN_GUIDELINES = """
# NCCN Prostate Cancer Treatment Guidelines Summary (2025)

## Risk Stratification
- **Very Low Risk**: T1c, Grade Group 1, PSA <10, <3 positive biopsy cores, ≤50% cancer in each core, PSA density <0.15
- **Low Risk**: T1-T2a, Grade Group 1, PSA <10
- **Favorable Intermediate**: T2b-T2c or Grade Group 2 or PSA 10-20 (only 1 intermediate factor, Grade Group 1-2, <50% positive cores)
- **Unfavorable Intermediate**: T2b-T2c or Grade Group 3 or PSA 10-20 (2-3 intermediate factors or Grade Group 3 or ≥50% positive cores)
- **High Risk**: T3a or Grade Group 4-5 or PSA >20
- **Very High Risk**: T3b-T4 or primary Gleason pattern 5 or >4 cores with Grade Group 4-5
- **Metastatic**: M1 (spread to distant sites)

## Treatment Options by Stage

### Localized Disease (Low/Intermediate Risk)
- Active surveillance (preferred for very low and low risk)
- Radical prostatectomy ± pelvic lymph node dissection
- External beam radiation therapy (EBRT) ± androgen deprivation therapy (ADT)
- Brachytherapy (low-dose or high-dose rate)

### Locally Advanced (High/Very High Risk)
- EBRT + long-term ADT (2-3 years)
- Radical prostatectomy + pelvic lymph node dissection (select patients)
- EBRT + brachytherapy boost + ADT

### Metastatic Castration-Sensitive (mCSPC)
- ADT + docetaxel
- ADT + abiraterone + prednisone
- ADT + enzalutamide
- ADT + apalutamide
- ADT + darolutamide + docetaxel
- EBRT to primary tumor (low-volume metastatic)

### Metastatic Castration-Resistant (mCRPC)
**First-line options:**
- Abiraterone + prednisone (if not used before)
- Enzalutamide (if not used before)
- Docetaxel
- Sipuleucel-T (asymptomatic/minimally symptomatic)
- Radium-223 (bone-predominant, symptomatic)

**Second-line and beyond:**
- Cabazitaxel (post-docetaxel)
- Cabazitaxel + carboplatin (aggressive variant)
- Olaparib or rucaparib (BRCA1/2 or HRR mutations)
- Pembrolizumab (MSI-H/dMMR tumors)
- Lutetium-177 PSMA (PSMA-positive, post AR-inhibitor and taxane)

## PSA Monitoring Guidelines
- Post-radical prostatectomy: PSA should be undetectable (<0.1 ng/mL)
- Post-radiation: PSA nadir + 2 ng/mL rise = biochemical recurrence
- Rising PSA after treatment: PSA doubling time <3 months suggests aggressive disease
- PSA doubling time: Key prognostic factor for treatment decisions

## Key Biomarkers
- PSA and PSA doubling time
- Gleason score / Grade Group
- PSMA PET/CT for staging
- Genomic tests: Decipher, Oncotype DX, Prolaris
- HRR gene mutations (BRCA1/2, ATM, PALB2) for PARP inhibitor eligibility
- MSI-H/dMMR status for immunotherapy eligibility
- AR-V7 splice variant for treatment resistance

## Supportive Care
- Bone-protective agents: denosumab or zoledronic acid (for bone metastases)
- Anemia management: ESAs, transfusions as needed
- Pain management: WHO analgesic ladder
- Palliative radiation for symptomatic bone metastases
"""

TREATMENT_DRUGS_INFO = {
    "docetaxel": {
        "class": "Taxane chemotherapy",
        "mechanism": "Microtubule stabilizer, prevents cell division",
        "common_use": "First-line chemo for mCRPC, or with ADT for mCSPC",
        "side_effects": "Neutropenia, fatigue, neuropathy, fluid retention",
        "typical_regimen": "75 mg/m² IV every 3 weeks for 6-10 cycles"
    },
    "cabazitaxel": {
        "class": "Taxane chemotherapy",
        "mechanism": "Second-generation taxane, active in docetaxel-resistant disease",
        "common_use": "Post-docetaxel mCRPC",
        "side_effects": "Neutropenia (severe), diarrhea, fatigue",
        "typical_regimen": "25 mg/m² IV every 3 weeks"
    },
    "enzalutamide": {
        "class": "Androgen receptor inhibitor",
        "mechanism": "Blocks AR signaling at multiple steps",
        "common_use": "mCRPC, mCSPC",
        "side_effects": "Fatigue, hypertension, seizure risk",
        "typical_regimen": "160 mg orally daily"
    },
    "abiraterone": {
        "class": "CYP17 inhibitor",
        "mechanism": "Blocks androgen synthesis",
        "common_use": "mCRPC, mCSPC (with prednisone)",
        "side_effects": "Hypertension, hypokalemia, liver toxicity",
        "typical_regimen": "1000 mg orally daily with prednisone 5mg BID"
    },
    "lutetium_177_psma": {
        "class": "Radioligand therapy",
        "mechanism": "Delivers beta radiation to PSMA-expressing tumor cells",
        "common_use": "mCRPC after AR inhibitor and taxane",
        "side_effects": "Dry mouth, nausea, fatigue, bone marrow suppression",
        "typical_regimen": "7.4 GBq IV every 6 weeks for up to 6 cycles"
    },
    "cisplatin": {
        "class": "Platinum chemotherapy",
        "mechanism": "DNA crosslinking, prevents replication",
        "common_use": "Aggressive variant/neuroendocrine prostate cancer",
        "side_effects": "Nephrotoxicity, nausea, ototoxicity, neuropathy",
        "typical_regimen": "Combined with cabazitaxel or etoposide"
    }
}
