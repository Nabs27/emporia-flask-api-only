import axios from 'axios';

interface EmporiaAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface EmporiaDevice {
  device_gid: number;
  device_name: string;
  channels: any[];
}

interface EmporiaUsageData {
  [deviceGid: string]: {
    channels: {
      [channelNum: string]: {
        usage: number | null;
      };
    };
  };
}

class EmporiaVueAPI {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(
    private username: string,
    private password: string
  ) {}

  private async authenticate(): Promise<void> {
    try {
      const response = await axios.post('/api/emporia-proxy', {
        action: 'authenticate',
        username: this.username,
        password: this.password
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

      // Stocker le token dans localStorage pour la persistance
      localStorage.setItem('emporia_token', JSON.stringify({
        access_token: this.accessToken,
        refresh_token: this.refreshToken,
        expires_in: this.tokenExpiry
      }));
    } catch (error) {
      console.error('Erreur d\'authentification Emporia:', error);
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    // Vérifier si on a un token valide
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      // Essayer de récupérer depuis localStorage
      const storedToken = localStorage.getItem('emporia_token');
      if (storedToken) {
        const tokenData = JSON.parse(storedToken);
        if (tokenData.expires_in > Date.now()) {
          this.accessToken = tokenData.access_token;
          this.refreshToken = tokenData.refresh_token;
          this.tokenExpiry = tokenData.expires_in;
          return;
        }
      }
      
      // Authentification nécessaire
      await this.authenticate();
    }
  }

  async getDevices(): Promise<EmporiaDevice[]> {
    await this.ensureAuthenticated();
    
    const response = await axios.post('/api/emporia-proxy', {
      action: 'getDevices',
      accessToken: this.accessToken
    });
    
    return response.data;
  }

  async getDeviceUsage(
    deviceGids: number[],
    instant: Date,
    scale: string,
    unit: string = 'KWH'
  ): Promise<EmporiaUsageData> {
    await this.ensureAuthenticated();
    
    const response = await axios.post('/api/emporia-proxy', {
      action: 'getDeviceUsage',
      accessToken: this.accessToken,
      deviceGids,
      instant: instant.toISOString(),
      scale,
      unit
    });
    
    return response.data;
  }

  async getChartUsage(
    channel: any,
    start: Date,
    end: Date,
    scale: string,
    unit: string = 'KWH'
  ): Promise<{ usage: number[], start_time: Date }> {
    await this.ensureAuthenticated();
    
    const response = await axios.post('/api/emporia-proxy', {
      action: 'getChartUsage',
      accessToken: this.accessToken,
      channel,
      start: start.toISOString(),
      end: end.toISOString(),
      scale,
      unit
    });
    
    return {
      usage: response.data.usage,
      start_time: new Date(response.data.start_time)
    };
  }
}

// Instance singleton
const emporiaApi = new EmporiaVueAPI(
  'n.gafsi@hotmail.com', // Remplacer par tes vraies credentials
  'Emp@233730'
);

export default emporiaApi; 