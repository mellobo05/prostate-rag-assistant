import json
import os
from openai import AsyncOpenAI
from tools import TOOL_DEFINITIONS, execute_tool

client = AsyncOpenAI(
    api_key=os.environ.get("AI_INTEGRATIONS_OPENAI_API_KEY"),
    base_url=os.environ.get("AI_INTEGRATIONS_OPENAI_BASE_URL"),
)

AGENT_SYSTEM_PROMPT = """You are OncoCare AI Agent, an expert medical oncology assistant specializing in prostate cancer.
You help caregivers understand their patient's condition by analyzing medical data and providing evidence-based information.

You have access to several medical tools. Use them strategically:
- search_pubmed: For finding recent research, clinical evidence, or treatment studies
- search_civic: For genomic variant interpretations and targeted therapy evidence
- get_treatment_guidelines: For NCCN treatment guidelines and staging information
- get_drug_info: For drug mechanism, side effects, and dosing information
- analyze_psa_trend: For calculating PSA doubling time and trend analysis
- search_clinical_trials: For finding relevant active clinical trials

IMPORTANT RULES:
1. Always use at least 2-3 tools to provide comprehensive analysis
2. When PSA data is available, ALWAYS use analyze_psa_trend
3. Cite sources (PubMed IDs, guidelines) in your response
4. Be medically accurate but explain in accessible language for caregivers
5. Include a clear "Key Takeaways" section at the end
6. NEVER provide a formal diagnosis or replace doctor's advice — always recommend discussing with the treating oncologist
7. Format your response with clear sections using markdown headers"""


async def run_agent(patient_context: dict, question: str | None = None) -> dict:
    tools_used = []
    tool_results = {}

    user_message = build_user_prompt(patient_context, question)

    messages = [
        {"role": "system", "content": AGENT_SYSTEM_PROMPT},
        {"role": "user", "content": user_message}
    ]

    max_iterations = 6
    for iteration in range(max_iterations):
        response = await client.chat.completions.create(
            model="gpt-5.1",
            messages=messages,
            tools=TOOL_DEFINITIONS,
            tool_choice="auto" if iteration < max_iterations - 1 else "none",
            max_completion_tokens=2000,
        )

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            messages.append(choice.message)

            for tool_call in choice.message.tool_calls:
                fn_name = tool_call.function.name
                try:
                    fn_args = json.loads(tool_call.function.arguments)
                except:
                    fn_args = {}

                tool_result = await execute_tool(fn_name, fn_args)
                tools_used.append({
                    "tool": fn_name,
                    "args": fn_args,
                    "iteration": iteration + 1
                })
                tool_results[fn_name] = tool_result

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result
                })
        else:
            final_response = choice.message.content or "Unable to generate analysis."
            return {
                "analysis": final_response,
                "tools_used": tools_used,
                "iterations": iteration + 1
            }

    return {
        "analysis": "Agent reached maximum iterations. Please try a more specific question.",
        "tools_used": tools_used,
        "iterations": max_iterations
    }


def build_user_prompt(ctx: dict, question: str | None = None) -> str:
    parts = ["## Patient Information"]

    profile = ctx.get("profile", {})
    parts.append(f"- Name: {profile.get('name', 'Unknown')}")
    parts.append(f"- Cancer Type: {profile.get('cancerType', 'Unknown')}")
    parts.append(f"- Stage: {profile.get('stage', 'Unknown')}")

    if profile.get("dateOfBirth"):
        parts.append(f"- Date of Birth: {profile['dateOfBirth']}")

    if profile.get("medicalHistory"):
        parts.append(f"\n### Medical History\n{profile['medicalHistory']}")

    reports = ctx.get("reports", [])
    if reports:
        parts.append("\n## Medical Reports")

        psa_reports = [r for r in reports if r.get("reportType") == "PSA" and r.get("psaLevel")]
        if psa_reports:
            parts.append("\n### PSA History")
            psa_data = []
            for r in sorted(psa_reports, key=lambda x: x.get("reportDate", "")):
                date = r["reportDate"][:10] if r.get("reportDate") else "Unknown"
                parts.append(f"- {date}: PSA = {r['psaLevel']} ng/mL")
                psa_data.append({"date": date, "value": float(r["psaLevel"])})

            parts.append(f"\nPSA data for analysis: {json.dumps(psa_data)}")

        other_reports = [r for r in reports if r.get("reportType") != "PSA"]
        if other_reports:
            parts.append("\n### Other Reports")
            for r in other_reports:
                date = r["reportDate"][:10] if r.get("reportDate") else "Unknown"
                parts.append(f"- {date} [{r.get('reportType', 'Unknown')}]: {r.get('findings', 'N/A')}")

    if question:
        parts.append(f"\n## Question\n{question}")
    else:
        parts.append("\n## Task\nProvide a comprehensive analysis of this patient's current condition, including PSA trend analysis, relevant treatment guidelines based on their stage, any applicable clinical trials, and key considerations for their next treatment line. Use all available tools to provide evidence-based insights.")

    return "\n".join(parts)
