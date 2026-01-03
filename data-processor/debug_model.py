
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
import sklearn
import sys

DATA_DIR = Path(r"C:\Users\Hardik\OneDrive\Desktop\Projects\ayush-fhir\data")
MODEL_PATH = DATA_DIR / "random_forest.joblib"

print(f"Python version: {sys.version}")
print(f"Scikit-learn version: {sklearn.__version__}")
print(f"Joblib version: {joblib.__version__}")

try:
    print(f"Attempting to load {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)
    print("Successfully loaded model")
    
    if hasattr(model, 'n_features_in_'):
        print(f"Expected features: {model.n_features_in_}")
    elif hasattr(model, 'n_features_'):
         print(f"Expected features: {model.n_features_}")
         
    if hasattr(model, 'feature_names_in_'):
        print(f"Feature names: {model.feature_names_in_}")
        
except Exception as e:
    print(f"Error loading model: {e}")

# Check columns in CSV
csv_path = DATA_DIR / "training_data.csv"
if csv_path.exists():
    df = pd.read_csv(csv_path)
    cols = [c for c in df.columns if c != 'prognosis']
    print(f"CSV Feature count: {len(cols)}")
    
