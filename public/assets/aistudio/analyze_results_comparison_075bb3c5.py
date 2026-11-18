
import pandas as pd

df = pd.read_csv("emissionsLLM.csv")

print(df[[
    "project_name",
    "duration",
    "energy_consumed",
    "emissions",
    "cpu_energy",
    "gpu_energy",
    "ram_energy",
    "country_iso_code"
]])
