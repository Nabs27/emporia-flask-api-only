#!/usr/bin/env python3
"""
Script de test local pour l'API Emporia
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:5000"  # Pour test local Flask
# BASE_URL = "https://votre-app.vercel.app"  # Pour test Vercel

def test_health():
    """Test du health check"""
    print("🔍 Test Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_live_energy():
    """Test de la consommation live"""
    print("\n⚡ Test Live Energy...")
    try:
        response = requests.get(f"{BASE_URL}/api/energy/live")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_custom_energy():
    """Test des données personnalisées"""
    print("\n📊 Test Custom Energy...")
    try:
        # Test pour aujourd'hui
        now = datetime.now()
        start_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_time = now
        
        data = {
            "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S"),
            "scale": "HOUR"
        }
        
        response = requests.post(f"{BASE_URL}/api/energy/custom", json=data)
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Usage data length: {len(result.get('usage', []))}")
        print(f"First few values: {result.get('usage', [])[:5]}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_standard_energy():
    """Test des données standard"""
    print("\n📈 Test Standard Energy...")
    try:
        response = requests.get(f"{BASE_URL}/api/energy/standard?scale=HOUR")
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Energy data: {result.get('energy_data', {})}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    """Fonction principale de test"""
    print("🧪 Test de l'API Emporia")
    print("=" * 40)
    
    tests = [
        test_health,
        test_live_energy,
        test_custom_energy,
        test_standard_energy
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed: {e}")
            results.append(False)
    
    print("\n" + "=" * 40)
    print("📊 Résumé des tests:")
    print(f"✅ Succès: {sum(results)}/{len(results)}")
    
    if all(results):
        print("🎉 Tous les tests sont passés !")
    else:
        print("⚠️  Certains tests ont échoué")
    
    return all(results)

if __name__ == "__main__":
    main() 