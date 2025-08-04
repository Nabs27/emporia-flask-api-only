from http.server import BaseHTTPRequestHandler
import requests
import os
import json
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, parse_qs
import pyemvue
from pyemvue.enums import Scale, Unit

# Configuration Emporia
EMPORIA_USERNAME = os.environ.get('EMPORIA_USERNAME', 'n.gafsi@hotmail.com')
EMPORIA_PASSWORD = os.environ.get('EMPORIA_PASSWORD', 'Emp@233730')

# Initialiser PyEmVue globalement
vue = None

def initialize_vue():
    """Initialise la connexion PyEmVue"""
    global vue
    if vue is None:
        try:
            vue = pyemvue.PyEmVue()
            vue.login(username=EMPORIA_USERNAME, password=EMPORIA_PASSWORD)
            print("✅ Connexion PyEmVue réussie")
            return True
        except Exception as e:
            print(f"❌ Erreur connexion PyEmVue: {e}")
            return False
    return True

def get_device_by_name(device_name):
    """Récupère un appareil par son nom"""
    try:
        if not initialize_vue():
            return None
            
        devices = vue.get_devices()
        target_device = next((d for d in devices if d.device_name == device_name), None)
        return target_device
    except Exception as e:
        print(f"Erreur récupération appareil {device_name}: {e}")
        return None

def get_energy_data_custom(start_time_str, end_time_str, scale='HOUR'):
    """Récupère les données d'énergie personnalisées"""
    try:
        if not initialize_vue():
            return None
            
        # Convertir les dates
        start_time = datetime.strptime(start_time_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        end_time = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        
        # Récupérer l'appareil "Lord"
        target_device = get_device_by_name("Lord")
        if not target_device:
            return None
            
        # Récupérer les données
        usage_over_time, start_time = vue.get_chart_usage(
            channel=target_device.channels[0],
            start=start_time,
            end=end_time,
            scale=Scale[scale].value,
            unit=Unit.KWH.value
        )
        
        # Ajuster les valeurs selon l'échelle
        if scale == 'SECOND':
            usage_over_time = [value * 3600 if value is not None else 0 for value in usage_over_time]
        elif scale == 'MINUTE':
            usage_over_time = [value * 60 if value is not None else 0 for value in usage_over_time]
        elif scale == 'HOUR':
            usage_over_time = [value if value is not None else 0 for value in usage_over_time]
            
        return usage_over_time
        
    except Exception as e:
        print(f"Erreur récupération données personnalisées: {e}")
        return None

def get_live_energy():
    """Récupère la consommation live"""
    try:
        if not initialize_vue():
            return 0
            
        # Récupérer l'appareil "Lord"
        target_device = get_device_by_name("Lord")
        if not target_device:
            return 0
            
        # Récupérer la consommation actuelle (MINUTE)
        instant = datetime.now(timezone.utc)
        usage_data = vue.get_device_list_usage(
            deviceGids=[target_device.device_gid],
            instant=instant,
            scale=Scale.MINUTE.value,
            unit=Unit.KWH.value
        )
        
        total_usage = 0
        if target_device.device_gid in usage_data:
            for channel in usage_data[target_device.device_gid].channels.values():
                if channel.usage is not None:
                    total_usage = channel.usage * 60  # Convertir kWh/min en kW
                    
        return round(total_usage, 3)
        
    except Exception as e:
        print(f"Erreur récupération live: {e}")
        return 0

def get_standard_energy(requested_scale='ALL'):
    """Récupère les consommations pour différentes échelles"""
    try:
        if not initialize_vue():
            return None
            
        # Sélectionner l'appareil cible
        target_device_name = "Lord"
        target_device = get_device_by_name(target_device_name)
        
        if not target_device:
            return None

        # Mappage des échelles disponibles
        scales = {
            'SECOND': Scale.SECOND,
            'MINUTE': Scale.MINUTE,
            'HOUR': Scale.HOUR,
            'DAY': Scale.DAY,
            'MONTH': Scale.MONTH,
            'YEAR': Scale.YEAR
        }

        energy_data = {}

        if requested_scale == 'ALL':  # Récupérer toutes les échelles
            for scale_name, scale_enum in scales.items():
                usage_data = vue.get_device_list_usage(
                    deviceGids=[target_device.device_gid],
                    instant=datetime.now(timezone.utc),
                    scale=scale_enum.value,
                    unit=Unit.KWH.value
                )
                energy_data[scale_name] = {
                    channel_num: channel.usage for channel_num, channel in usage_data[target_device.device_gid].channels.items() if channel.usage is not None
                }
        elif requested_scale in scales:  # Récupérer une seule échelle
            usage_data = vue.get_device_list_usage(
                deviceGids=[target_device.device_gid],
                instant=datetime.now(timezone.utc),
                scale=scales[requested_scale].value,
                unit=Unit.KWH.value
            )
            energy_data[requested_scale] = {
                channel_num: channel.usage for channel_num, channel in usage_data[target_device.device_gid].channels.items() if channel.usage is not None
            }
        else:
            return None

        return energy_data
        
    except Exception as e:
        print(f"Erreur récupération standard: {e}")
        return None

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            path = self.path
            
            if path == '/api/energy/custom':
                start_time_str = data.get('start_time')
                end_time_str = data.get('end_time')
                scale = data.get('scale', 'HOUR').upper()
                
                if not start_time_str or not end_time_str:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'start_time et end_time requis'}).encode())
                    return
                
                usage_data = get_energy_data_custom(start_time_str, end_time_str, scale)
                
                if usage_data is not None:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'usage': usage_data}).encode())
                else:
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Erreur récupération données'}).encode())
            else:
                self.send_response(404)
                self.end_headers()
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
    
    def do_GET(self):
        try:
            path = self.path
            
            if path == '/api/energy/live':
                live_value = get_live_energy()
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'live': live_value}).encode())
                    
            elif path.startswith('/api/energy/standard'):
                # Parser les paramètres de requête
                parsed_url = urlparse(path)
                params = parse_qs(parsed_url.query)
                requested_scale = params.get('scale', ['ALL'])[0].upper()
                
                energy_data = get_standard_energy(requested_scale)
                
                if energy_data is not None:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'energy_data': energy_data}).encode())
                else:
                    self.send_response(500)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Erreur récupération données'}).encode())
                    
            elif path.startswith('/api/energy/'):
                # Extraire l'échelle de l'URL (ex: /api/energy/hour)
                scale = path.split('/')[-1].upper()
                
                try:
                    scale_enum = Scale[scale]
                except KeyError:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': f'Échelle invalide: {scale}'}).encode())
                    return
                
                # Récupérer l'appareil "FRIKHA-CONCEPT"
                target_device = get_device_by_name("FRIKHA-CONCEPT")
                if not target_device:
                    self.send_response(404)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': 'Appareil FRIKHA-CONCEPT non trouvé'}).encode())
                    return
                
                instant = datetime.now(timezone.utc)
                usage_data = vue.get_device_list_usage(
                    deviceGids=[target_device.device_gid],
                    instant=instant,
                    scale=scale_enum.value,
                    unit=Unit.KWH.value
                )
                
                total_usage = 0
                if target_device.device_gid in usage_data:
                    for channel in usage_data[target_device.device_gid].channels.values():
                        if channel.usage is not None:
                            usage = channel.usage
                            # Convertir en watts pour l'affichage
                            if scale_enum == Scale.SECOND:
                                total_usage = usage * 3600  # kWh/s 
                            elif scale_enum == Scale.MINUTE:
                                total_usage = usage * 60    # kWh/min 
                            elif scale_enum == Scale.HOUR:
                                total_usage = usage         # kWh/h 
                            else:
                                total_usage = usage         # kWh 
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "energy_data": {
                        "scale": scale.upper(),
                        "total_usage": round(total_usage, 3),
                        "unit": "kW",
                        "timestamp": instant.isoformat()
                    }
                }).encode())
                    
            elif path == '/api/health':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'OK', 
                    'timestamp': datetime.now().isoformat(),
                    'vue_connected': initialize_vue()
                }).encode())
            else:
                self.send_response(404)
                self.end_headers()
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode()) 