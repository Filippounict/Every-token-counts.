from codecarbon import EmissionsTracker
import ollama
import time

#testing different model size
#MODEL = "qwen2.5:0.5b"
#MODEL = "qwen2.5:3b"
MODEL = "llama3.2:3b"

prompt = """
Explain in simple terms what software carbon emissions are.
Give a concise answer in 5 bullet points.
"""

tracker = EmissionsTracker(
    project_name=MODEL,
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
    options={
    #set maximum number of tokens generated
       "num_predict": 500
        #"num_predict": 50
    }
)

elapsed = time.time() - start
emissions = tracker.stop()

answer = response["message"]["content"]

print(answer)
print(f"Characters generated: {len(answer)}")
print(f"Local LLM test completed. Emissions: {emissions:.8f} kgCO2eq")
