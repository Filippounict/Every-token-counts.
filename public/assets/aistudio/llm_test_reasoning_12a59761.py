from codecarbon import EmissionsTracker
import ollama
import time

#testing reasoning (only Qwen3 models support turning it on and off)
MODEL = "qwen3:1.7b"

#reasoning on/off: set True only with a reasoning model (e.g. qwen3)
#THINK = False
THINK = True

prompt = """
Explain in simple terms what software carbon emissions are.
Give a concise answer in 5 bullet points.
"""

#reasoning runs get their own name so they can be told apart in the results
project_name = MODEL + (" (reasoning)" if THINK else "")

tracker = EmissionsTracker(
    project_name=project_name,
    output_file="emissionsLLM.csv",
    log_level="error",
    measure_power_secs=5,
    force_ram_power=6   #check your hw to change or remove this config
)

tracker.start()

start = time.time()

response = ollama.chat(
    model=MODEL,
    messages=[
        {"role": "user", "content": prompt}
    ],
    think=THINK,
    options={
    #set maximum number of tokens generated
    #reasoning tokens count too: use 500 or more when THINK = True
        #"num_predict": 500
        #"num_predict": 50
    }
)

elapsed = time.time() - start
emissions = tracker.stop()

answer = response["message"]["content"]
thinking = getattr(response.message, "thinking", None) or ""
tokens = getattr(response, "eval_count", None)

print(answer)
print(f"Characters generated: {len(answer)}")
print(f"Reasoning characters generated: {len(thinking)}")
print(f"Total tokens generated (answer + reasoning): {tokens}")
print(f"Time: {elapsed:.1f} s")
print(f"Local LLM test completed. Emissions: {emissions:.8f} kgCO2eq")
