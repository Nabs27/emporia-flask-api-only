from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timezone
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Emporia Flask API - Fonctionnel !"

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check pour Railway"""
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'message': 'API Emporia Flask opérationnelle'
    }), 200

@app.route('/api/energy/live', methods=['GET'])
def get_live_energy():
    """Endpoint pour la consommation live (simulé pour test)"""
    return jsonify({'live': 2.456}), 200

@app.route('/api/energy/custom', methods=['POST'])
def get_custom_energy():
    """Endpoint pour récupérer les données d'énergie personnalisées (simulé)"""
    try:
        data = request.get_json()
        # Simuler des données pour test
        usage_data = [1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0, 2.8, 2.5, 2.2]
        return jsonify({"usage": usage_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False) 