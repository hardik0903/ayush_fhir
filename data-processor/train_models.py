
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score
import joblib
import json
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'
TRAINING_FILE = DATA_DIR / 'training_data.csv'

def train_models():
    print("Loading training data...")
    df = pd.read_csv(TRAINING_FILE)
    
    # Preprocessing
    # Remove prognosis from features
    X = df.drop('prognosis', axis=1)
    y = df['prognosis']
    
    # Drop any unnamed columns (artifacts from trailing commas)
    X = X.loc[:, ~X.columns.str.contains('^Unnamed')]
    
    symptoms = list(X.columns)
    print(f"Feature count: {len(symptoms)}")
    print(f"Saving symptom list to symptoms.json")
    
    with open(DATA_DIR / 'symptoms.json', 'w') as f:
        json.dump(symptoms, f)
        
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Models to train
    models = {
        'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'naive_bayes': MultinomialNB(),
        'decision_tree': DecisionTreeClassifier(random_state=42),
        'gradient_boost': GradientBoostingClassifier(n_estimators=100, random_state=42)
    }
    
    print("Training models...")
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        
        # Evaluate
        preds = model.predict(X_test)
        acc = accuracy_score(y_test, preds)
        print(f"  Accuracy: {acc:.4f}")
        
        # Save
        save_path = DATA_DIR / f"{name}.joblib"
        joblib.load = joblib.load # weird fix for some envs? no, not needed usually.
        joblib.dump(model, save_path)
        print(f"  Saved to {save_path}")
        
        # Verify load
        try:
            loaded = joblib.load(save_path)
            print(f"  Verification: Loaded successfully")
        except Exception as e:
            print(f"  Verification FAILED: {e}")

if __name__ == '__main__':
    train_models()
