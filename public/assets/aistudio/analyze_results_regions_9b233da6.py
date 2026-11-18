
import pandas as pd

df = pd.read_csv("emissions_regions.csv")

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
