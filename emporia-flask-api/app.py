from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timezone
import os
import pyemvue
from pyemvue.enums import Scale, Unit

app = Flask(__name__)
CORS(app)

# Initialize PyEmVue
vue = pyemvue.PyEmVue()
vue.login(username='n.gafsi@hotmail.com', password='Emp@233730', token_storage_file='keys.json')

@app.route('/')
def home():
    return "Emporia Flask API - Fonctionnel !"

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check pour Railway"""
    try:
        devices = vue.get_devices()
        return jsonify({
            'status': 'OK',
            'timestamp': datetime.now().isoformat(),
            'vue_connected': True,
            'devices_count': len(devices),
            'message': 'API Emporia Flask opérationnelle'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'ERROR',
            'timestamp': datetime.now().isoformat(),
            'vue_connected': False,
            'error': str(e)
        }), 500

@app.route('/api/energy/live', methods=['GET'])
def get_live_energy():
    """Endpoint pour la consommation live"""
    try:
        target_device_name = "Lord"
        devices = vue.get_devices()
        target_device = next((d for d in devices if d.device_name == target_device_name), None)

        if not target_device:
            return jsonify({"error": f"Appareil {target_device_name} non trouvé"}), 404

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
                    total_usage = channel.usage * 60

        return jsonify({'live': round(total_usage, 3)}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/energy/custom', methods=['POST'])
def get_custom_energy():
    """Endpoint pour récupérer les données d'énergie personnalisées"""
    try:
        data = request.get_json()
        start_time_str = data.get('start_time')
        end_time_str = data.get('end_time')
        scale = data.get('scale', 'HOUR').upper()

        if not start_time_str or not end_time_str:
            return jsonify({"error": "start_time et end_time requis"}), 400

        start_time = datetime.strptime(start_time_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        end_time = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)

        target_device_name = "Lord"
        devices = vue.get_devices()
        target_device = next((d for d in devices if d.device_name == target_device_name), None)

        if not target_device:
            return jsonify({"error": "Appareil Lord non trouvé"}), 404

        usage_over_time, start_time = vue.get_chart_usage(
            channel=target_device.channels[0],
            start=start_time,
            end=end_time,
            scale=Scale[scale].value,
            unit=Unit.KWH.value
        )

        if scale == "SECOND":
            usage_over_time = [value * 3600 if value is not None else 0 for value in usage_over_time]
        elif scale == "MINUTE":
            usage_over_time = [value * 60 if value is not None else 0 for value in usage_over_time]
        elif scale == "HOUR":
            usage_over_time = [value if value is not None else 0 for value in usage_over_time]

        return jsonify({"usage": usage_over_time}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/energy/standard', methods=['GET'])
def get_standard_energy():
    """Route pour récupérer les consommations pour différentes échelles standard"""
    try:
        requested_scale = request.args.get('scale', 'ALL').upper()
        target_device_name = "Lord"
        devices = vue.get_devices()
        target_device = next((d for d in devices if d.device_name == target_device_name), None)

        if not target_device:
            return jsonify({"error": f"Appareil {target_device_name} non trouvé"}), 404

        scales = {
            'SECOND': Scale.SECOND,
            'MINUTE': Scale.MINUTE,
            'HOUR': Scale.HOUR,
            'DAY': Scale.DAY,
            'MONTH': Scale.MONTH,
            'YEAR': Scale.YEAR
        }

        energy_data = {}
        if requested_scale == 'ALL':
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
        elif requested_scale in scales:
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
            return jsonify({"error": f"Échelle '{requested_scale}' invalide"}), 400

        return jsonify({"energy_data": energy_data}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False) 