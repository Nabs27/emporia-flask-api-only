import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchApi } from './utils/api';

interface DashboardProps {
  onShowDetails: () => void;
}

interface DashboardData {
  live: number;
  today: number;
  yesterday: number;
  todayPercentage: number;
  forecast: number;
  peakValue: number;
  peakHour: string;
  monthlyTotal: number;
  hourlyData: number[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onShowDetails }) => {
  const [data, setData] = useState<DashboardData>({
    live: 0,
    today: 0,
    yesterday: 0,
    todayPercentage: 0,
    forecast: 0,
    peakValue: 0,
    peakHour: '',
    monthlyTotal: 0,
    hourlyData: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateIntervalRef = useRef<number>();

  // Récupérer la consommation live
  const fetchLiveData = async () => {
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 dernières minutes
      
      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime.toISOString().slice(0, 19).replace('T', ' '),
          end_time: now.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'SECOND'
        })
      });
      
      if (response?.usage && response.usage.length > 0) {
        // Prendre la dernière valeur (la plus récente)
        return response.usage[response.usage.length - 1] || 0;
      }
      return 0;
    } catch (error) {
      console.error('Erreur récupération live:', error);
      return 0;
    }
  };

  // Récupérer la consommation du jour (de minuit à l'heure actuelle)
  const fetchTodayData = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const currentHour = now.getHours();
      
      // Récupérer les données horaires de minuit à l'heure actuelle
      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startOfDay.toISOString().slice(0, 19).replace('T', ' '),
          end_time: now.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'HOUR'
        })
      });
      
      if (response?.usage && response.usage.length > 0) {
        // Sommer toutes les heures de minuit à l'heure actuelle
        const totalConsumption = response.usage
          .slice(0, currentHour + 1) // Prendre seulement jusqu'à l'heure actuelle
          .reduce((sum: number, value: number) => sum + (value || 0), 0);
        return totalConsumption;
      }
      return 0;
    } catch (error) {
      console.error('Erreur récupération aujourd\'hui:', error);
      return 0;
    }
  };

  // Récupérer la consommation d'hier
  const fetchYesterdayData = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      
      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startOfYesterday.toISOString().slice(0, 19).replace('T', ' '),
          end_time: endOfYesterday.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'DAY'
        })
      });
      
      if (response?.usage && response.usage.length > 0) {
        return response.usage[0] || 0;
      }
      return 0;
    } catch (error) {
      console.error('Erreur récupération hier:', error);
      return 0;
    }
  };

  // Récupérer les données horaires pour le pic et les prévisions
  const fetchHourlyData = async () => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startOfDay.toISOString().slice(0, 19).replace('T', ' '),
          end_time: endOfDay.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'HOUR'
        })
      });
      
      if (response?.usage && response.usage.length > 0) {
        // S'assurer d'avoir un tableau de 24 heures
        const hourlyData = Array(24).fill(0);
        response.usage.forEach((value: number, index: number) => {
          if (index < 24) {
            hourlyData[index] = value || 0;
          }
        });
        return hourlyData;
      }
      return Array(24).fill(0);
    } catch (error) {
      console.error('Erreur récupération horaire:', error);
      return Array(24).fill(0);
    }
  };

  // Récupérer le total de consommation du mois
  const fetchMonthlyTotal = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startOfMonth.toISOString().slice(0, 19).replace('T', ' '),
          end_time: endOfMonth.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'DAY'
        })
      });
      
      if (response?.usage && response.usage.length > 0) {
        // Sommer tous les jours du mois
        const totalConsumption = response.usage.reduce((sum: number, value: number) => sum + (value || 0), 0);
        return totalConsumption;
      }
      return 0;
    } catch (error) {
      console.error('Erreur récupération mensuelle:', error);
      return 0;
    }
  };

  // Calculer les statistiques avec prévisions améliorées
  const calculateStats = (today: number, yesterday: number, hourlyData: number[]) => {
    const currentHour = new Date().getHours();
    const todayPercentage = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0;
    
    // Trouver le pic de consommation
    const peakIndex = hourlyData.indexOf(Math.max(...hourlyData));
    const peakValue = hourlyData[peakIndex] || 0;
    const peakHour = peakIndex >= 0 ? `${peakIndex.toString().padStart(2, '0')}:00` : '';
    
    // Prévision améliorée basée sur les patterns historiques
    const forecast = calculateImprovedForecast(today, currentHour, hourlyData);
    
    return {
      todayPercentage,
      forecast,
      peakValue,
      peakHour
    };
  };

  // Calculer une prévision plus intelligente
  const calculateImprovedForecast = (today: number, currentHour: number, hourlyData: number[]) => {
    const remainingHours = 24 - currentHour;
    if (remainingHours <= 0) return today;

    // Calculer la moyenne des heures passées (en excluant les heures vides)
    const pastHours = hourlyData.slice(0, currentHour + 1).filter(val => val > 0);
    if (pastHours.length === 0) return today;

    const averagePastHours = pastHours.reduce((a, b) => a + b, 0) / pastHours.length;
    
    // Ajuster selon l'heure de la journée (patterns typiques)
    const hourMultiplier = getHourMultiplier(currentHour);
    
    // Prévision = consommation actuelle + (moyenne ajustée × heures restantes)
    const forecast = today + (averagePastHours * hourMultiplier * remainingHours);
    
    return Math.max(forecast, today); // Ne jamais prévoir moins que ce qui est déjà consommé
  };

  // Multiplicateur selon l'heure (patterns de consommation typiques)
  const getHourMultiplier = (hour: number) => {
    if (hour >= 6 && hour <= 9) return 1.2;   // Matin (réveil)
    if (hour >= 12 && hour <= 14) return 1.1; // Déjeuner
    if (hour >= 18 && hour <= 22) return 1.3; // Soirée (cuisine, TV, etc.)
    if (hour >= 22 || hour <= 6) return 0.7;  // Nuit (sommeil)
    return 1.0; // Heures normales
  };

  // Charger toutes les données
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [live, today, yesterday, hourlyData, monthlyTotal] = await Promise.all([
        fetchLiveData(),
        fetchTodayData(),
        fetchYesterdayData(),
        fetchHourlyData(),
        fetchMonthlyTotal()
      ]);
      
      const stats = calculateStats(today, yesterday, hourlyData);
      
      setData({
        live,
        today,
        yesterday,
        ...stats,
        monthlyTotal,
        hourlyData
      });
      
      setError(null);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour live
  const updateLiveData = async () => {
    try {
      const live = await fetchLiveData();
      setData(prev => ({ ...prev, live }));
    } catch (error) {
      console.error('Erreur mise à jour live:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Mise à jour live toutes les 5 secondes
    updateIntervalRef.current = setInterval(updateLiveData, 5000);
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header moderne */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
            Dashboard Énergie
          </h1>
          <p className="text-gray-600 font-medium">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* Widgets principaux - Design moderne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Widget Live - Design premium */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Consommation Live</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-500">En direct</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                  {data.live.toFixed(3)} kW
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-4">
                  <div className="text-2xl font-bold text-gray-700 mb-2">
                    Total Juillet
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {data.monthlyTotal.toFixed(1)} kWh
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Widget Aujourd'hui - Design moderne */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Aujourd'hui</h3>
              <div className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
                  {data.today.toFixed(1)} kWh
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                  data.todayPercentage >= 0 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  <span>{data.todayPercentage >= 0 ? '↗️' : '↘️'}</span>
                  <span>{data.todayPercentage >= 0 ? '+' : ''}{data.todayPercentage.toFixed(1)}% vs hier</span>
                </div>
                <div className="text-sm text-gray-500 mt-4">
                  {data.yesterday.toFixed(1)} kWh hier
                </div>
              </div>
            </div>
          </div>

          {/* Widget Prévision - Design moderne */}
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Prévision</h3>
              <div className="text-center">
                               <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-4">
                 {data.forecast.toFixed(1)} kWh
               </div>
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                 <span>🔮</span>
                 <span>Prévision</span>
               </div>
                <div className="text-sm text-gray-500 mt-4">
                  Basé sur les patterns
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget secondaire - Pic de consommation */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20 mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Pic de consommation</h3>
              <p className="text-gray-600">Plus forte consommation aujourd'hui</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                {data.peakValue.toFixed(1)} kW
              </div>
              <div className="text-lg text-gray-600">
                {data.peakHour ? `à ${data.peakHour}` : 'Aucun pic'}
              </div>
            </div>
          </div>
        </div>

        {/* Bouton Détails - Design moderne */}
        <div className="text-center">
          <button
            onClick={onShowDetails}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-10 py-5 rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 font-bold text-xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10">📈</span>
            <span className="relative z-10">Voir les graphiques détaillés</span>
            <span className="relative z-10 group-hover:translate-x-1 transition-transform duration-300">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 