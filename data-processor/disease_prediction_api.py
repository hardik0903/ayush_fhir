"""
Disease Prediction API Service
Uses 4 pre-trained ML models to predict diseases from symptoms
Models: Random Forest, Gradient Boosting, Decision Tree, Naive Bayes
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data'

# Global variables for models and symptoms
models = {}
symptom_columns = []

def load_models():
    """Load all 4 pre-trained models"""
    global models
    
    model_files = {
        'random_forest': 'random_forest.joblib',
        'gradient_boost': 'gradient_boost.joblib',
        'decision_tree': 'decision_tree.joblib',
        'naive_bayes': 'mnb.joblib'
    }
    
    print("Loading ML models...")
    for name, filename in model_files.items():
        model_path = DATA_DIR / filename
        if model_path.exists():
            try:
                models[name] = joblib.load(model_path)
                print(f"✓ Loaded {name} model")
            except Exception as e:
                print(f"✗ Error loading {name}: {e}")
        else:
            print(f"✗ Model file not found: {model_path}")
    
    print(f"Successfully loaded {len(models)} models")

import json

def load_symptoms():
    """Load symptom list from symptoms.json (generated during training)"""
    global symptom_columns
    
    symptoms_file = DATA_DIR / 'symptoms.json'
    if symptoms_file.exists():
        with open(symptoms_file, 'r') as f:
            symptom_columns = json.load(f)
        print(f"Loaded {len(symptom_columns)} symptoms from JSON")
    else:
        print(f"Symptoms JSON not found: {symptoms_file}. Fallback to CSV...")
        training_file = DATA_DIR / 'training_data.csv'
        if training_file.exists():
            df = pd.read_csv(training_file)
            symptom_columns = [col for col in df.columns if col != 'prognosis' and not col.startswith('Unnamed')]
            print(f"Loaded {len(symptom_columns)} symptoms from CSV")
        else:
            print(f"Training data not found: {training_file}")

def create_symptom_vector(selected_symptoms):
    """Create binary vector for symptoms"""
    # Initialize all symptoms to 0
    symptom_vector = {symptom: 0 for symptom in symptom_columns}
    
    # Set selected symptoms to 1
    for symptom in selected_symptoms:
        # Normalize symptom name (replace spaces with underscores, lowercase)
        normalized = symptom.lower().replace(' ', '_')
        if normalized in symptom_vector:
            symptom_vector[normalized] = 1
    
    # Convert to DataFrame with correct column order
    return pd.DataFrame([symptom_vector], columns=symptom_columns)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Disease Prediction API',
        'models_loaded': len(models),
        'symptoms_count': len(symptom_columns)
    })

@app.route('/symptoms', methods=['GET'])
def get_symptoms():
    """Get list of all available symptoms"""
    # Convert symptom names to readable format
    readable_symptoms = [
        symptom.replace('_', ' ').title() 
        for symptom in symptom_columns
    ]
    
    return jsonify({
        'symptoms': sorted(readable_symptoms),
        'count': len(readable_symptoms)
    })

@app.route('/models', methods=['GET'])
def get_models():
    """Get information about available models"""
    model_info = {
        'random_forest': {
            'name': 'Random Forest',
            'description': 'Ensemble learning method, good balance of accuracy and speed',
            'recommended': True
        },
        'gradient_boost': {
            'name': 'Gradient Boosting',
            'description': 'High accuracy, slower prediction time',
            'recommended': False
        },
        'decision_tree': {
            'name': 'Decision Tree',
            'description': 'Fast predictions, interpretable results',
            'recommended': False
        },
        'naive_bayes': {
            'name': 'Naive Bayes',
            'description': 'Probabilistic model, lightweight and fast',
            'recommended': False
        }
    }
    
    available_models = {
        name: info for name, info in model_info.items() 
        if name in models
    }
    
    return jsonify({
        'models': available_models,
        'count': len(available_models)
    })

@app.route('/predict', methods=['POST'])
def predict_disease():
    """Predict disease from symptoms"""
    try:
        data = request.get_json()
        
        if not data or 'symptoms' not in data:
            return jsonify({
                'error': 'Missing symptoms in request body'
            }), 400
        
        selected_symptoms = data['symptoms']
        model_name = data.get('model', 'random_forest')
        
        if not selected_symptoms:
            return jsonify({
                'error': 'No symptoms provided'
            }), 400
        
        if len(selected_symptoms) < 2:
            return jsonify({
                'error': 'Please select at least 2 symptoms for accurate prediction'
            }), 400
        
        # Create symptom vector
        symptom_vector = create_symptom_vector(selected_symptoms)
        
        # Predict with requested model or all models
        if model_name == 'all':
            predictions = {}
            for name, model in models.items():
                try:
                    prediction = model.predict(symptom_vector)[0]
                    
                    # Get probability if available
                    confidence = 0.0
                    if hasattr(model, 'predict_proba'):
                        proba = model.predict_proba(symptom_vector)
                        confidence = float(np.max(proba))
                    
                    predictions[name] = {
                        'disease': prediction,
                        'confidence': round(confidence, 3)
                    }
                except Exception as e:
                    predictions[name] = {
                        'error': str(e)
                    }
            
            return jsonify({
                'predictions': predictions,
                'symptoms_count': len(selected_symptoms)
            })
        
        else:
            # Single model prediction
            if model_name not in models:
                return jsonify({
                    'error': f'Model {model_name} not found',
                    'available_models': list(models.keys())
                }), 400
            
            model = models[model_name]
            prediction = model.predict(symptom_vector)[0]
            
            # Get confidence score
            confidence = 0.0
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(symptom_vector)
                confidence = float(np.max(proba))
            
            return jsonify({
                'model': model_name,
                'prediction': prediction,
                'confidence': round(confidence, 3),
                'symptoms_count': len(selected_symptoms)
            })
    
    except Exception as e:
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Disease Prediction API Service")
    print("=" * 60)
    
    # Load models and symptoms
    load_models()
    load_symptoms()
    
    if not models:
        print("ERROR: No models loaded. Please check model files.")
        exit(1)
    
    if not symptom_columns:
        print("ERROR: No symptoms loaded. Please check training data.")
        exit(1)
    
    print("\nStarting Flask server on http://localhost:5001")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5001, debug=False)
