from codecarbon import EmissionsTracker
from ecologits import EcoLogits
from google import genai
from google.genai import types
import time



MODEL = "gemini-flash-latest"  #big model
#MODEL = "gemini-3.5-flash-lite" #small model

prompt = """
Explain in simple terms what software carbon emissions are.
Give a concise answer in 5 bullet points.
"""

#reasoning runs get their own name so they can be told apart in the results
project_name = MODEL + " (remote)"

#EcoLogits must be turned on BEFORE creating the client
EcoLogits.init(providers=["google_genai"])

# Make generate content request
client = genai.Client()     #TODO: add your geminiAI key


tracker = EmissionsTracker(
    project_name=project_name,
    output_file="emissionsLLM.csv",
    log_level="error",
    measure_power_secs=5,
    force_ram_power=6   #check your hw to change or remove this config
)

tracker.start()

start = time.time()

response = client.models.generate_content(
    model=MODEL,
    contents=prompt,
    config=types.GenerateContentConfig(
        max_output_tokens=8000,
    )
)

elapsed = time.time() - start
emissions = tracker.stop()

answer = response.text or ""

usage = response.usage_metadata
answer_tokens = usage.candidates_token_count or 0
thinking_tokens = usage.thoughts_token_count or 0   # hidden reasoning, if the model decided to think

print(answer)
print(f"Characters generated: {len(answer)}")
print(f"Total tokens generated: {answer_tokens + thinking_tokens} "
      f"({answer_tokens} answer + {thinking_tokens} hidden reasoning)")
print(f"Time: {elapsed:.1f} s")

#remote impact, ESTIMATED by EcoLogits as a range (min-max)
impacts = response.impacts
if impacts is None:
    print("EcoLogits returned no impacts: the model is not in its model list.")
else:
    e, g = impacts.energy.value, impacts.gwp.value
    print(f"Remote LLM energy (EcoLogits): {e.min:.8f} - {e.max:.8f} kWh")
    print(f"Remote LLM emissions (EcoLogits): {g.min:.8f} - {g.max:.8f} kgCO2eq")

#local impact, MEASURED by CodeCarbon
print(f"Local computer emissions (CodeCarbon): {emissions:.8f} kgCO2eq")
