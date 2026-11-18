
import pandas as pd

df = pd.read_csv("emissions.csv")

print(df[[
    "project_name",
    "duration",
    "energy_consumed",
    "emissions",
    "cpu_power",
    "gpu_power",
    "ram_power",
    "cpu_energy",
    "gpu_energy",
    "ram_energy",
    "country_iso_code"
]])
