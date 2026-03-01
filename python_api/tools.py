import httpx
import json
import os
from typing import Optional
from medical_kb import PROSTATE_CANCER_NCCN_GUIDELINES, TREATMENT_DRUGS_INFO

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
CIVIC_API = "https://civicdb.org/api/graphql"
ONCOKB_API = "https://public.api.oncokb.org/api/v1"

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "search_pubmed",
            "description": "Search PubMed/MEDLINE for medical research articles. Use for finding recent studies, clinical trials, treatment evidence, and medical literature about cancer treatments, drugs, or biomarkers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for PubMed (e.g. 'cabazitaxel cisplatin prostate cancer metastatic')"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_civic",
            "description": "Search CIViC (Clinical Interpretation of Variants in Cancer) database for clinical evidence about cancer gene variants, their significance, and treatment implications.",
            "parameters": {
                "type": "object",
                "properties": {
                    "gene_name": {
                        "type": "string",
                        "description": "Gene name to search for (e.g. 'BRCA2', 'AR', 'TP53', 'ATM')"
                    },
                    "disease": {
                        "type": "string",
                        "description": "Disease to filter by (e.g. 'Prostate Cancer')",
                        "default": "Prostate Cancer"
                    }
                },
                "required": ["gene_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_treatment_guidelines",
            "description": "Get NCCN-based prostate cancer treatment guidelines summary including risk stratification, treatment options by stage, PSA monitoring, and key biomarkers.",
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {
                        "type": "string",
                        "description": "Specific section to retrieve: 'all', 'risk_stratification', 'treatment_options', 'psa_monitoring', 'biomarkers', 'supportive_care'",
                        "default": "all"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_drug_info",
            "description": "Get detailed information about a cancer treatment drug including mechanism, side effects, and typical regimen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "drug_name": {
                        "type": "string",
                        "description": "Drug name (e.g. 'docetaxel', 'cabazitaxel', 'enzalutamide', 'abiraterone', 'lutetium_177_psma', 'cisplatin')"
                    }
                },
                "required": ["drug_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_psa_trend",
            "description": "Analyze PSA (Prostate-Specific Antigen) values over time. Calculates doubling time, rate of change, and trend assessment. Input is a JSON array of PSA readings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "psa_readings": {
                        "type": "string",
                        "description": "JSON array of PSA readings, each with 'date' (YYYY-MM-DD) and 'value' (number). Example: '[{\"date\":\"2025-01-01\",\"value\":3.8},{\"date\":\"2025-03-01\",\"value\":8.6}]'"
                    }
                },
                "required": ["psa_readings"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_clinical_trials",
            "description": "Search ClinicalTrials.gov for active clinical trials related to a cancer treatment or condition.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (e.g. 'cabazitaxel prostate cancer metastatic')"
                    },
                    "status": {
                        "type": "string",
                        "description": "Trial status filter: 'RECRUITING', 'ACTIVE_NOT_RECRUITING', 'COMPLETED'",
                        "default": "RECRUITING"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum results (default 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        }
    }
]


async def search_pubmed(query: str, max_results: int = 5) -> str:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            search_resp = await client.get(
                f"{NCBI_BASE}/esearch.fcgi",
                params={
                    "db": "pubmed",
                    "term": query,
                    "retmax": max_results,
                    "retmode": "json",
                    "sort": "relevance"
                }
            )
            search_data = search_resp.json()
            ids = search_data.get("esearchresult", {}).get("idlist", [])

            if not ids:
                return json.dumps({"results": [], "message": "No PubMed articles found for this query."})

            summary_resp = await client.get(
                f"{NCBI_BASE}/esummary.fcgi",
                params={
                    "db": "pubmed",
                    "id": ",".join(ids),
                    "retmode": "json"
                }
            )
            summary_data = summary_resp.json()

            articles = []
            for pmid in ids:
                article = summary_data.get("result", {}).get(pmid, {})
                if article:
                    authors = article.get("authors", [])
                    author_str = ", ".join([a.get("name", "") for a in authors[:3]])
                    if len(authors) > 3:
                        author_str += " et al."
                    articles.append({
                        "pmid": pmid,
                        "title": article.get("title", ""),
                        "authors": author_str,
                        "journal": article.get("fulljournalname", article.get("source", "")),
                        "date": article.get("pubdate", ""),
                        "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
                    })

            return json.dumps({"results": articles, "total_found": search_data.get("esearchresult", {}).get("count", 0)})
    except Exception as e:
        return json.dumps({"error": f"PubMed search failed: {str(e)}"})


async def search_civic(gene_name: str, disease: str = "Prostate Cancer") -> str:
    query = """
    query($geneName: String!) {
      genes(name: $geneName) {
        nodes {
          name
          description
          variants {
            nodes {
              name
              evidenceItems {
                nodes {
                  status
                  evidenceType
                  evidenceLevel
                  evidenceDirection
                  significance
                  description
                  disease {
                    name
                  }
                  therapies {
                    name
                  }
                  source {
                    citation
                    sourceUrl
                  }
                }
              }
            }
          }
        }
      }
    }
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                CIVIC_API,
                json={"query": query, "variables": {"geneName": gene_name}},
                headers={"Content-Type": "application/json"}
            )
            data = resp.json()

            genes = data.get("data", {}).get("genes", {}).get("nodes", [])
            if not genes:
                return json.dumps({"message": f"No CIViC data found for gene {gene_name}"})

            gene = genes[0]
            results = {
                "gene": gene["name"],
                "description": gene.get("description", "")[:500],
                "variants": []
            }

            for variant in gene.get("variants", {}).get("nodes", [])[:5]:
                evidence_items = []
                for ev in variant.get("evidenceItems", {}).get("nodes", [])[:3]:
                    ev_disease = ev.get("disease", {})
                    if disease and ev_disease and disease.lower() not in ev_disease.get("name", "").lower():
                        continue
                    therapies = [t["name"] for t in ev.get("therapies", [])]
                    evidence_items.append({
                        "type": ev.get("evidenceType"),
                        "level": ev.get("evidenceLevel"),
                        "significance": ev.get("significance"),
                        "description": ev.get("description", "")[:300],
                        "disease": ev_disease.get("name", "") if ev_disease else "",
                        "therapies": therapies,
                        "citation": ev.get("source", {}).get("citation", "")
                    })

                if evidence_items:
                    results["variants"].append({
                        "name": variant["name"],
                        "evidence": evidence_items
                    })

            return json.dumps(results)
    except Exception as e:
        return json.dumps({"error": f"CIViC search failed: {str(e)}"})


def get_treatment_guidelines(section: str = "all") -> str:
    if section == "all":
        return PROSTATE_CANCER_NCCN_GUIDELINES
    sections = {
        "risk_stratification": "## Risk Stratification",
        "treatment_options": "## Treatment Options by Stage",
        "psa_monitoring": "## PSA Monitoring Guidelines",
        "biomarkers": "## Key Biomarkers",
        "supportive_care": "## Supportive Care"
    }
    header = sections.get(section)
    if not header:
        return PROSTATE_CANCER_NCCN_GUIDELINES

    start = PROSTATE_CANCER_NCCN_GUIDELINES.find(header)
    if start == -1:
        return PROSTATE_CANCER_NCCN_GUIDELINES

    next_section = PROSTATE_CANCER_NCCN_GUIDELINES.find("\n## ", start + len(header))
    if next_section == -1:
        return PROSTATE_CANCER_NCCN_GUIDELINES[start:]
    return PROSTATE_CANCER_NCCN_GUIDELINES[start:next_section]


def get_drug_info(drug_name: str) -> str:
    key = drug_name.lower().replace(" ", "_").replace("-", "_")
    if key in TREATMENT_DRUGS_INFO:
        info = TREATMENT_DRUGS_INFO[key]
        return json.dumps({"drug": drug_name, **info})

    for k, v in TREATMENT_DRUGS_INFO.items():
        if drug_name.lower() in k or k in drug_name.lower():
            return json.dumps({"drug": k, **v})

    return json.dumps({"message": f"Drug '{drug_name}' not found in database. Available drugs: {', '.join(TREATMENT_DRUGS_INFO.keys())}"})


def analyze_psa_trend(psa_readings_json: str) -> str:
    import math
    try:
        readings = json.loads(psa_readings_json)
    except:
        return json.dumps({"error": "Invalid JSON for PSA readings"})

    if len(readings) < 2:
        return json.dumps({"error": "Need at least 2 PSA readings to analyze trend"})

    from datetime import datetime
    parsed = []
    for r in readings:
        try:
            dt = datetime.strptime(r["date"], "%Y-%m-%d")
            parsed.append({"date": dt, "value": float(r["value"]), "date_str": r["date"]})
        except:
            continue

    parsed.sort(key=lambda x: x["date"])

    if len(parsed) < 2:
        return json.dumps({"error": "Could not parse enough valid PSA readings"})

    first = parsed[0]
    last = parsed[-1]
    days_diff = (last["date"] - first["date"]).days

    trend = "stable"
    if last["value"] > first["value"] * 1.1:
        trend = "rising"
    elif last["value"] < first["value"] * 0.9:
        trend = "declining"

    doubling_time_months = None
    if last["value"] > first["value"] and first["value"] > 0:
        try:
            dt_months = days_diff / 30.44
            doubling_time_months = round(
                (dt_months * math.log(2)) / math.log(last["value"] / first["value"]),
                1
            )
        except:
            pass

    velocity = None
    if days_diff > 0:
        velocity = round((last["value"] - first["value"]) / (days_diff / 365.25), 2)

    result = {
        "readings_analyzed": len(parsed),
        "period": f"{first['date_str']} to {last['date_str']}",
        "first_psa": first["value"],
        "latest_psa": last["value"],
        "trend": trend,
        "psa_velocity_per_year": velocity,
        "doubling_time_months": doubling_time_months,
        "interpretation": "",
        "all_values": [{"date": p["date_str"], "psa": p["value"]} for p in parsed]
    }

    if doubling_time_months is not None:
        if doubling_time_months < 3:
            result["interpretation"] = f"CRITICAL: PSA doubling time of {doubling_time_months} months is very short (<3 months), suggesting highly aggressive disease. Urgent treatment escalation recommended per NCCN guidelines."
        elif doubling_time_months < 6:
            result["interpretation"] = f"CONCERNING: PSA doubling time of {doubling_time_months} months (<6 months) suggests aggressive disease progression. Consider treatment change."
        elif doubling_time_months < 12:
            result["interpretation"] = f"MODERATE: PSA doubling time of {doubling_time_months} months (6-12 months) indicates disease progression. Close monitoring and potential treatment adjustment."
        else:
            result["interpretation"] = f"PSA doubling time of {doubling_time_months} months (>12 months) suggests relatively slow progression."
    elif trend == "declining":
        result["interpretation"] = "PSA is declining, suggesting treatment response."

    return json.dumps(result)


async def search_clinical_trials(query: str, status: str = "RECRUITING", max_results: int = 5) -> str:
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://clinicaltrials.gov/api/v2/studies",
                params={
                    "query.term": query,
                    "filter.overallStatus": status,
                    "pageSize": max_results,
                    "format": "json"
                }
            )
            data = resp.json()
            studies = data.get("studies", [])

            results = []
            for study in studies:
                proto = study.get("protocolSection", {})
                ident = proto.get("identificationModule", {})
                status_mod = proto.get("statusModule", {})
                desc = proto.get("descriptionModule", {})

                results.append({
                    "nct_id": ident.get("nctId", ""),
                    "title": ident.get("briefTitle", ""),
                    "status": status_mod.get("overallStatus", ""),
                    "phase": ", ".join(proto.get("designModule", {}).get("phases", [])),
                    "summary": (desc.get("briefSummary", "") or "")[:300],
                    "url": f"https://clinicaltrials.gov/study/{ident.get('nctId', '')}"
                })

            return json.dumps({"trials": results, "total_found": data.get("totalCount", 0)})
    except Exception as e:
        return json.dumps({"error": f"ClinicalTrials.gov search failed: {str(e)}"})


TOOL_HANDLERS = {
    "search_pubmed": lambda args: search_pubmed(args["query"], args.get("max_results", 5)),
    "search_civic": lambda args: search_civic(args["gene_name"], args.get("disease", "Prostate Cancer")),
    "get_treatment_guidelines": lambda args: get_treatment_guidelines(args.get("section", "all")),
    "get_drug_info": lambda args: get_drug_info(args["drug_name"]),
    "analyze_psa_trend": lambda args: analyze_psa_trend(args["psa_readings"]),
    "search_clinical_trials": lambda args: search_clinical_trials(args["query"], args.get("status", "RECRUITING"), args.get("max_results", 5)),
}


async def execute_tool(tool_name: str, arguments: dict) -> str:
    handler = TOOL_HANDLERS.get(tool_name)
    if not handler:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    result = handler(arguments)
    if hasattr(result, "__await__"):
        return await result
    return result if isinstance(result, str) else json.dumps(result)
