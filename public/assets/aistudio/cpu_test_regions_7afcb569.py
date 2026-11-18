
from codecarbon import OfflineEmissionsTracker
import numpy as np

#tracker = EmissionsTracker(
tracker = OfflineEmissionsTracker(
    country_iso_code="IND",     #compare ITA, SWE, IND
    project_name="cpu_matrix",
    output_file="emissions_regions.csv",
    log_level="error",
    force_ram_power=6   #check your hw to change or remove this config
)

tracker.start()

for _ in range(500):
    a = np.random.rand(1000, 1000)
    b = np.random.rand(1000, 1000)
    c = np.dot(a, b)

emissions = tracker.stop()

print(f"CPU test completed. Emissions: {emissions:.8f} kgCO2eq")
