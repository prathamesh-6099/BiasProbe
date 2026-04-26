import os
import sys
import logging

# Setup basic logging to see stdout
logging.basicConfig(level=logging.INFO)

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

try:
    from backend.services.probe_generator import ProbeGenerator
    
    gen = ProbeGenerator()
    print(f"Testing generation with model: {gen._model.model_name}")
    
    # Try generating a very small battery to test
    battery = gen.generate_probe_battery(
        scenario="customer_support",
        num_probes=10,
        attribute_filter=["gender"]
    )
    
    print(f"Generated {len(battery)} probes.")
    if len(battery) == 0:
        print("Battery is empty! The generator failed.")
    else:
        print("Success! First probe:", battery[0].prompt_text[:50])
        
except Exception as e:
    print(f"Test failed with exception: {e}")
