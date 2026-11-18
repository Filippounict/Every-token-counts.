
from codecarbon import EmissionsTracker
import time

tracker = EmissionsTracker(
    project_name="idle",
    log_level="error",
    output_file="emissions.csv",
    force_ram_power=6   #check your hw to change or remove this config
)

tracker.start()

time.sleep(50)

emissions = tracker.stop()

print(f"Idle test completed. Emissions: {emissions:.8f} kgCO2eq")
