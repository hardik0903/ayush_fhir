"""
API helper for semantic search - called from Node.js
"""

import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load model (cached globally)
model = None

def get_model():
    global model
    if model is None:
        model = SentenceTransformer('pritamdeka/S-PubMedBert-MS-MARCO')
    return model

def semantic_search_api(query, search_type, top_k):
    """
    Perform semantic search and return JSON results
    """
    # Load embeddings
    with open('embeddings.json', 'r') as f:
        embeddings_data = json.load(f)
    
    # Get model
    model = get_model()
    
    # Generate query embedding
    query_embedding = model.encode([query])[0]
    
    # Get corpus embeddings
    corpus_embeddings = np.array(embeddings_data[search_type]['embeddings'])
    corpus_ids = embeddings_data[search_type]['ids']
    
    # Calculate similarities
    similarities = cosine_similarity([query_embedding], corpus_embeddings)[0]
    
    # Get top-k
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    
    results = []
    for idx in top_indices:
        results.append({
            'id': corpus_ids[idx],
            'similarity': float(similarities[idx])
        })
    
    return results

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Missing arguments'}))
        sys.exit(1)
    
    query = sys.argv[1]
    search_type = sys.argv[2]
    top_k = int(sys.argv[3])
    
    try:
        results = semantic_search_api(query, search_type, top_k)
        print(json.dumps(results))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
