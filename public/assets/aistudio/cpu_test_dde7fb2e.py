
from codecarbon import EmissionsTracker
import numpy as np

tracker = EmissionsTracker(
    project_name="cpu_matrix",
    output_file="emissions.csv",
    log_level="error",
    force_ram_power=6   #check your hw to change or remove this config
)

tracker.start()

for _ in range(500):
    a = np.random.rand(1500, 1500)
    b = np.random.rand(1500, 1500)
    c = np.dot(a, b)

emissions = tracker.stop()

print("CPU test completed. Emissions: {emissions:.8f} kgCO2eq")
