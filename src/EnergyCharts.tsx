import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { fetchApi } from './utils/api';
import { TimeNavigationChart } from './components/TimeNavigationChart';
import {
  getMonthlyTimeRange, 
  getYearlyTimeRange,
  getHourlyTimeRange,
  formatDateForApi, 
  TimeRange, 
  canNavigateLeft, 
  canNavigateRight 
} from './utils/timeNavigation';
import { predictConsumption, getHolidayName, DailyPrediction } from './utils/energyPrediction';
import { getDaysInMonth } from 'date-fns';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ViewMode = 'LIVE' | 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

interface EnergyChartsProps {
  onClose: () => void;
}

export const EnergyCharts: React.FC<EnergyChartsProps> = ({ onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('LIVE');
  const [chartData, setChartData] = useState<any>(null);
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [customConsumption, setCustomConsumption] = useState<string>('0.000');
  const [predictedConsumption, setPredictedConsumption] = useState<string>('0.000');
  const [predictions, setPredictions] = useState<DailyPrediction[]>([]);
  const [currentTimeRange, setCurrentTimeRange] = useState<TimeRange>(() => {
    const now = new Date();
    return getMonthlyTimeRange(now, 'right');
  });
  
  const historicalDataRef = useRef<number[]>([]);
  const hourlyDataRef = useRef<number[]>([]);
  const dailyDataRef = useRef<number[]>([]);
  const monthlyDataRef = useRef<number[]>([]);
  const yearlyDataRef = useRef<number[]>([]);
  const isInitializedRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  

  const fetchInitialHistory = async () => {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);
      
      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime.toISOString().slice(0, 19).replace('T', ' '),
          end_time: endTime.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'SECOND'
        })
      });

      if (response?.usage) {
        const newHistoricalData = response.usage;
        if (newHistoricalData.length < 300) {
          const padding = new Array(300 - newHistoricalData.length).fill(0);
          historicalDataRef.current = [...padding, ...newHistoricalData];
        } else {
          historicalDataRef.current = newHistoricalData.slice(-300); // Garder seulement les 300 dernières valeurs
        }
        updateChartData(historicalDataRef.current, 'LIVE');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
    }
  };

  const fetchHourlyData = async () => {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 heure

      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime.toISOString().slice(0, 19).replace('T', ' '),
          end_time: endTime.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'MINUTE'
        })
      });

      if (response?.usage) {
        hourlyDataRef.current = response.usage;
        if (hourlyDataRef.current.length < 60) {
          const padding = new Array(60 - hourlyDataRef.current.length).fill(0);
          hourlyDataRef.current = [...padding, ...hourlyDataRef.current];
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données horaires:', error);
    }
  };

  // Ajout d'une fonction utilitaire pour le cache local JOUR
  const getDayCacheKey = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `energy-day-${y}-${m}-${d}`;
  };

  const getDayFromCache = (date: Date): number[] | null => {
    const key = getDayCacheKey(date);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log(`[CACHE] Lecture du cache pour ${key}`, parsed);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  };

  const setDayInCache = (date: Date, data: number[]) => {
    const key = getDayCacheKey(date);
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`[CACHE] Écriture dans le cache pour ${key}`, data);
  };

  // --- CACHE MOIS ---
  const getMonthCacheKey = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `energy-month-${y}-${m}`;
  };
  const getMonthFromCache = (date: Date): number[] | null => {
    const key = getMonthCacheKey(date);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log(`[CACHE] Lecture du cache pour ${key}`, parsed);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  };
  const setMonthInCache = (date: Date, data: number[]) => {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    // Toujours écrire un tableau de la bonne taille, avec les vraies valeurs ou null
    const fullData = Array.from({ length: daysInMonth }, (_, i) => data[i] !== undefined ? data[i] : null);
    const key = getMonthCacheKey(date);
    localStorage.setItem(key, JSON.stringify(fullData));
    console.log(`[CACHE] Écriture dans le cache pour ${key}`, fullData);
  };
  // --- CACHE ANNEE ---
  const getYearCacheKey = (date: Date) => {
    const y = date.getFullYear();
    return `energy-year-${y}`;
  };
  const getYearFromCache = (date: Date): number[] | null => {
    const key = getYearCacheKey(date);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        console.log(`[CACHE] Lecture du cache pour ${key}`, parsed);
        return parsed;
      } catch {
        return null;
      }
    }
    return null;
  };
  const setYearInCache = (date: Date, data: number[]) => {
    const key = getYearCacheKey(date);
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`[CACHE] Écriture dans le cache pour ${key}`, data);
  };

  const fetchDailyData = async () => {
    try {
      const now = new Date();
      let dailyData = getDayFromCache(now) || Array(24).fill(null);
      const currentHour = now.getHours();
      // Affichage immédiat de ce qui est déjà en cache
      dailyDataRef.current = dailyData.map(v => v == null ? 0 : v);
      updateChartData(dailyDataRef.current, 'DAILY', currentTimeRange.labels);

      // Préparer les heures à requêter (manquantes ou heure courante)
      const missingHours = [];
      for (let hour = 0; hour < 24; hour++) {
        if (hour === currentHour || dailyData[hour] == null) {
          missingHours.push(hour);
        }
      }
      if (missingHours.length === 0) return; // tout est déjà en cache

      // Lancer les requêtes en parallèle
      const results = await Promise.all(missingHours.map(async (hour) => {
        const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0);
        const hourEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 59, 59);
        const response = await fetchApi('/api/energy/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: hourStart.toISOString().slice(0, 19).replace('T', ' '),
            end_time: hourEnd.toISOString().slice(0, 19).replace('T', ' '),
            scale: 'HOUR'
          })
        });
        return { hour, value: response?.usage?.[0] || 0 };
      }));

      // Mettre à jour les données avec tous les résultats
      results.forEach(({ hour, value }) => {
        dailyData[hour] = value;
      });

      // Écrire le cache une seule fois avec toutes les données
      setDayInCache(now, dailyData);
      
      // Mettre à jour l'affichage
      dailyDataRef.current = dailyData.map(v => v == null ? 0 : v);
      updateChartData(dailyDataRef.current, 'DAILY', currentTimeRange.labels);
    } catch (error) {
      console.error('Erreur lors de la récupération des données journalières:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      let monthData = getMonthFromCache(now) || Array(daysInMonth).fill(null);
      // Affichage immédiat
      monthlyDataRef.current = monthData.map(v => v == null ? 0 : v);
      updateChartData(monthlyDataRef.current, 'MONTHLY', currentTimeRange.labels);
      // Préparer les jours à requêter
      const missingDays = [];
      for (let day = 0; day < daysInMonth; day++) {
        if (monthData[day] == null) {
          missingDays.push(day);
        }
      }
      if (missingDays.length === 0) return;
      // Requêtes parallèles
      const results = await Promise.all(missingDays.map(async (day) => {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), day + 1, 0, 0, 0);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), day + 1, 23, 59, 59);
        const response = await fetchApi('/api/energy/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: dayStart.toISOString().slice(0, 19).replace('T', ' '),
            end_time: dayEnd.toISOString().slice(0, 19).replace('T', ' '),
            scale: 'DAY'
          })
        });
        return { day, value: response?.usage?.[0] || 0 };
      }));

      // Mettre à jour les données avec tous les résultats
      results.forEach(({ day, value }) => {
        monthData[day] = value;
      });

      // Écrire le cache une seule fois avec toutes les données
      setMonthInCache(now, monthData);
      
      // Mettre à jour l'affichage
      monthlyDataRef.current = monthData.map(v => v == null ? 0 : v);
      updateChartData(monthlyDataRef.current, 'MONTHLY', currentTimeRange.labels);
    } catch (error) {
      console.error('Erreur lors de la récupération des données mensuelles:', error);
    }
  };

  const fetchYearlyData = async () => {
    try {
      const now = new Date();
      let yearData = getYearFromCache(now) || Array(12).fill(null);
      // Affichage immédiat
      yearlyDataRef.current = yearData.map(v => v == null ? 0 : v);
      updateChartData(yearlyDataRef.current, 'YEARLY', currentTimeRange.labels);
      // Préparer les mois à requêter
      const missingMonths = [];
      for (let month = 0; month < 12; month++) {
        if (yearData[month] == null) {
          missingMonths.push(month);
        }
      }
      if (missingMonths.length === 0) return;
      // Requêtes parallèles
      const results = await Promise.all(missingMonths.map(async (month) => {
        const monthStart = new Date(now.getFullYear(), month, 1, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59);
        const response = await fetchApi('/api/energy/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: monthStart.toISOString().slice(0, 19).replace('T', ' '),
            end_time: monthEnd.toISOString().slice(0, 19).replace('T', ' '),
            scale: 'MONTH'
          })
        });
        return { month, value: response?.usage?.[0] || 0 };
      }));

      // Mettre à jour les données avec tous les résultats
      results.forEach(({ month, value }) => {
        yearData[month] = value;
      });

      // Écrire le cache une seule fois avec toutes les données
      setYearInCache(now, yearData);
      
      // Mettre à jour l'affichage
      yearlyDataRef.current = yearData.map(v => v == null ? 0 : v);
      updateChartData(yearlyDataRef.current, 'YEARLY', currentTimeRange.labels);
    } catch (error) {
      console.error('Erreur lors de la récupération des données annuelles:', error);
    }
  };

  const fetchCustomData = async (startDate: Date, endDate: Date) => {
    try {
      const now = new Date();
      const isInFuture = endDate > now;
      
      if (isInFuture) {
        // Pour les dates futures, utiliser la prédiction
        const predictions = await predictConsumption(
          startDate > now ? startDate : now,
          endDate
        );
        setPredictions(predictions);
        const totalPrediction = predictions.reduce((sum, pred) => sum + pred.total, 0);
        setPredictedConsumption(totalPrediction.toFixed(3));
        
        // Si la période commence dans le passé, calculer aussi la consommation réelle
        if (startDate <= now) {
          const adjustedStartDate = new Date(startDate);
          adjustedStartDate.setHours(0, 0, 0, 0);
          
          const adjustedEndDate = new Date(now);
          adjustedEndDate.setHours(23, 59, 59, 999);

          const response = await fetchApi('/api/energy/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start_time: formatDateForApi(adjustedStartDate),
              end_time: formatDateForApi(adjustedEndDate),
              scale: 'DAY'
            })
          });

          if (response?.usage) {
            const totalConsumption = response.usage.reduce((sum: number, val: number) => sum + (val || 0), 0);
            setCustomConsumption(totalConsumption.toFixed(3));
          }
        } else {
          setCustomConsumption('0.000');
        }
      } else {
        // Pour les dates passées, utiliser les données réelles
        const adjustedStartDate = new Date(startDate);
        adjustedStartDate.setHours(0, 0, 0, 0);
        
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);

        const response = await fetchApi('/api/energy/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: formatDateForApi(adjustedStartDate),
            end_time: formatDateForApi(adjustedEndDate),
            scale: 'DAY'
          })
        });

        if (response?.usage) {
          const totalConsumption = response.usage.reduce((sum: number, val: number) => sum + (val || 0), 0);
          setCustomConsumption(totalConsumption.toFixed(3));
          setPredictedConsumption('0.000');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données personnalisées:', error);
    }
  };

  const handleTimeNavigation = async (direction: 'left' | 'right') => {
    if (viewMode === 'YEARLY') {
      const newTimeRange = getYearlyTimeRange(currentTimeRange.endDate, direction);
      setCurrentTimeRange(newTimeRange);

      try {
        const yearData = new Array(12).fill(0);
        const now = new Date();
        const targetYear = newTimeRange.startDate.getFullYear();

        // Si on regarde une année passée ou l'année en cours
        if (targetYear <= now.getFullYear()) {
          const endDate = targetYear === now.getFullYear() 
            ? now 
            : newTimeRange.endDate;

          const response = await fetchApi('/api/energy/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              start_time: formatDateForApi(newTimeRange.startDate),
              end_time: formatDateForApi(endDate),
              scale: 'MONTH'
            })
          });

          if (response?.usage) {
            // Remplir les données réelles en commençant par l'index 0
            for (let i = 0; i < response.usage.length; i++) {
              yearData[i] = response.usage[i] || 0;
            }
          }
        }

        yearlyDataRef.current = yearData;
        updateChartData(yearlyDataRef.current, 'YEARLY', newTimeRange.labels);
      } catch (error) {
        console.error('Erreur lors de la navigation temporelle:', error);
      }
    } else if (viewMode === 'MONTHLY') {
      const newTimeRange = getMonthlyTimeRange(currentTimeRange.endDate, direction);
      setCurrentTimeRange(newTimeRange);

      try {
        const response = await fetchApi('/api/energy/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: formatDateForApi(newTimeRange.startDate),
            end_time: formatDateForApi(newTimeRange.endDate),
            scale: 'DAY'
          })
        });

        if (response?.usage) {
          const daysInMonth = getDaysInMonth(newTimeRange.startDate);
          const monthData = Array(daysInMonth).fill(0);
          
          // Remplir les données pour tous les jours du mois
          for (let i = 0; i < response.usage.length && i < daysInMonth; i++) {
            monthData[i] = response.usage[i] || 0;
          }
          
          monthlyDataRef.current = monthData;
          updateChartData(monthlyDataRef.current, 'MONTHLY', newTimeRange.labels);
        }
      } catch (error) {
        console.error('Erreur lors de la navigation temporelle:', error);
      }
    } else if (viewMode === 'DAILY') {
      const newTimeRange = getHourlyTimeRange(currentTimeRange.endDate, direction);
      setCurrentTimeRange(newTimeRange);

      try {
        const response = await fetchApi('/api/energy/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: formatDateForApi(newTimeRange.startDate),
            end_time: formatDateForApi(newTimeRange.endDate),
            scale: 'HOUR'
          })
        });

        if (response?.usage) {
          const dayData = Array(24).fill(0);
          
          // Remplir les données pour les 24 heures
          for (let i = 0; i < response.usage.length && i < 24; i++) {
            dayData[i] = response.usage[i] || 0;
          }
          
          dailyDataRef.current = dayData;
          updateChartData(dailyDataRef.current, 'DAILY', newTimeRange.labels);
        }
      } catch (error) {
        console.error('Erreur lors de la navigation temporelle:', error);
      }
    }
  };

  const updateChartData = (data: number[], mode: ViewMode, customLabels?: string[]) => {
    let labels: string[] = [];
    
    switch (mode) {
      case 'YEARLY':
      case 'MONTHLY':
        labels = customLabels || currentTimeRange.labels;
        break;
      case 'LIVE': {
        const now = new Date();
        labels = Array.from({ length: 300 }, (_, i) => {
          const d = new Date(now);
          d.setSeconds(d.getSeconds() - (299 - i));
          return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
        });
        break;
      }
      case 'HOURLY': {
        const now = new Date();
        labels = Array.from({ length: 60 }, (_, i) => {
          const d = new Date(now);
          d.setMinutes(d.getMinutes() - (59 - i));
          return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        });
        break;
      }
      case 'DAILY': {
        // Utiliser les labels passés en paramètre ou les labels du currentTimeRange
        labels = customLabels || currentTimeRange.labels || Array.from({ length: 24 }, (_, i) => 
          `${i.toString().padStart(2, '0')}h`
        );
        break;
      }
    }

    const chartConfig = {
      labels,
      datasets: [{
        label: getChartTitle(mode),
        data: data,
        fill: mode === 'LIVE',
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: mode === 'LIVE' ? 0.4 : 0,
        pointRadius: mode === 'LIVE' ? 0 : 3
      }]
    };

    setChartData(chartConfig);
  };

  useEffect(() => {
    // Nettoyer l'ancien contrôleur s'il existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Créer un nouveau contrôleur pour le nouveau mode
    abortControllerRef.current = new AbortController();

    const getUpdateInterval = (mode: ViewMode) => {
      switch (mode) {
        case 'LIVE': return 1000;
        case 'HOURLY': return 60000;
        case 'DAILY': return null;
        case 'MONTHLY': return null;
        case 'YEARLY': return null;
        default: return 1000;
      }
    };

    const fetchChartData = async () => {
      try {
        if (viewMode !== 'LIVE') {
          return;
        }

        const startTime = getStartTime('LIVE');
        const response = await fetchApi('/api/energy/standard?scale=SECOND&start_time=' + startTime, {
          signal: abortControllerRef.current?.signal
        });
        
        if (response?.energy_data?.SECOND) {
          const secondData = response.energy_data.SECOND;
          const values = Object.values(secondData);
          if (values.length > 0) {
            const rawValue = Number(values[0]) || 0;
            const newValue = rawValue * 3600;
      
            const newHistoricalData = [...historicalDataRef.current];
            newHistoricalData.shift();
            newHistoricalData.push(newValue);
            historicalDataRef.current = newHistoricalData;
            updateChartData(historicalDataRef.current, 'LIVE');
          }
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.log('Requête annulée');
        } else {
          console.error('Erreur lors de la récupération des données:', error);
        }
      }
    };

    const initialize = async () => {
      try {
        if (viewMode === 'LIVE') {
          // Afficher immédiatement un graphique avec des données vides
          historicalDataRef.current = Array(300).fill(0);
          updateChartData(historicalDataRef.current, 'LIVE');
          
          // En parallèle, récupérer les données réelles
          Promise.all([
            fetchApi('/api/energy/SECOND', {
              signal: abortControllerRef.current?.signal
            }),
            fetchInitialHistory()
          ]).then(([currentResponse]) => {
            if (currentResponse?.energy_data?.total_usage) {
              const currentValue = currentResponse.energy_data.total_usage;
              historicalDataRef.current[historicalDataRef.current.length - 1] = currentValue;
              updateChartData(historicalDataRef.current, 'LIVE');
            }
          }).catch(error => {
            console.error('Erreur lors de la récupération des données LIVE:', error);
          });
        } else if (viewMode === 'HOURLY') {
          // Afficher immédiatement avec des données vides
          hourlyDataRef.current = Array(60).fill(0);
          updateChartData(hourlyDataRef.current, 'HOURLY');
          // Puis charger les vraies données
          await fetchHourlyData();
          updateChartData(hourlyDataRef.current, 'HOURLY');
        } else if (viewMode === 'DAILY') {
          // Afficher immédiatement avec des données vides
          dailyDataRef.current = Array(24).fill(0);
          updateChartData(dailyDataRef.current, 'DAILY', currentTimeRange.labels);
          // Puis charger les vraies données
          await fetchDailyData();
          updateChartData(dailyDataRef.current, 'DAILY', currentTimeRange.labels);
        } else if (viewMode === 'MONTHLY') {
          // Afficher immédiatement avec des données vides
          const daysInMonth = new Date().getDate();
          monthlyDataRef.current = Array(daysInMonth).fill(0);
          updateChartData(monthlyDataRef.current, 'MONTHLY', currentTimeRange.labels);
          // Puis charger les vraies données
          await fetchMonthlyData();
          updateChartData(monthlyDataRef.current, 'MONTHLY', currentTimeRange.labels);
        } else {
          // Afficher immédiatement avec des données vides
          yearlyDataRef.current = Array(12).fill(0);
          updateChartData(yearlyDataRef.current, 'YEARLY', currentTimeRange.labels);
          // Puis charger les vraies données
          await fetchYearlyData();
          updateChartData(yearlyDataRef.current, 'YEARLY', currentTimeRange.labels);
        }
        isInitializedRef.current = true;
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.log('Initialisation annulée');
        } else {
          console.error('Erreur lors de l\'initialisation:', error);
        }
      }
    };

    initialize();

    const updateInterval = getUpdateInterval(viewMode);
    let intervalId: number | null = null;

    if (updateInterval !== null) {
      intervalId = window.setInterval(async () => {
        await fetchChartData();
      }, updateInterval);
    }

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      // Annuler les requêtes en cours lors du nettoyage
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [viewMode]);

  useEffect(() => {
    // Réinitialiser la période temporelle lors du changement de mode
    const now = new Date();
    if (viewMode === 'YEARLY') {
      const currentYear = now.getFullYear();
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);
      const labels = Array.from({ length: 12 }, (_, i) => {
        const monthDate = new Date(currentYear, i, 1);
        return format(monthDate, 'MMMM yyyy', { locale: fr });
      });
      setCurrentTimeRange({ startDate: yearStart, endDate: yearEnd, labels });
    } else if (viewMode === 'MONTHLY') {
      // Initialiser avec le mois en cours
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);
      
      // Générer les labels pour tous les jours du mois
      const daysInMonth = getDaysInMonth(monthStart);
      const labels = Array.from({ length: daysInMonth }, (_, i) => {
        const dayDate = new Date(currentYear, currentMonth, i + 1);
        return format(dayDate, 'd MMMM yyyy', { locale: fr });
      });

      setCurrentTimeRange({ 
        startDate: monthStart,
        endDate: monthEnd,
        labels 
      });
    } else if (viewMode === 'DAILY') {
      // Initialiser avec le jour en cours
      const dayEnd = new Date(now);
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0); // Commencer à minuit
      dayEnd.setHours(23, 59, 59, 999); // Finir à 23:59:59

      // Générer les labels simples pour les 24 heures
      const labels = Array.from({ length: 24 }, (_, i) => 
        `${i.toString().padStart(2, '0')}h`
      );

      setCurrentTimeRange({ 
        startDate: dayStart,
        endDate: dayEnd,
        labels,
        currentHour: now.getHours()
      });
    } else if (viewMode === 'CUSTOM') {
      // Réinitialiser les états personnalisés
      setCustomStartDate(null);
      setCustomEndDate(null);
      setCustomConsumption('0.000');
    }
  }, [viewMode]);

  const getChartTitle = (mode: ViewMode) => {
    switch (mode) {
      case 'LIVE': return 'Consommation en temps réel (5 dernières minutes)';
      case 'HOURLY': return 'Consommation par minute (dernière heure)';
      case 'DAILY': return 'Consommation par heure (aujourd\'hui)';
      case 'MONTHLY': return 'Consommation par jour (ce mois)';
      case 'YEARLY': return 'Consommation par mois (cette année)';
      case 'CUSTOM': return 'Consommation personnalisée';
      default: return '';
    }
  };

  const getCurrentConsumption = () => {
    if (viewMode === 'LIVE') {
      return historicalDataRef.current[historicalDataRef.current.length - 1]?.toFixed(3);
    } else if (viewMode === 'HOURLY') {
      const values = hourlyDataRef.current;
      if (values.length > 0) {
        const sum = values.reduce((acc, val) => acc + (val || 0), 0);
        const average = sum / values.length;
        return average.toFixed(3);
      }
      return '0.000';
    } else if (viewMode === 'DAILY') {
      const currentHour = new Date().getHours();
      const totalConsumption = dailyDataRef.current
        .slice(0, currentHour + 1)
        .reduce((sum, value) => sum + (value || 0), 0);
      return totalConsumption.toFixed(3);
    } else if (viewMode === 'MONTHLY') {
      const totalConsumption = monthlyDataRef.current
        .reduce((sum, value) => sum + (value || 0), 0);
      return totalConsumption.toFixed(3);
    } else {
      // Pour le mode YEARLY
      const now = new Date();
      const targetYear = currentTimeRange.startDate.getFullYear();
      
      // Si on regarde l'année en cours, on somme jusqu'au mois actuel
      // Sinon, on somme tous les mois
      const totalConsumption = yearlyDataRef.current
        .reduce((sum, value, index) => {
          if (targetYear < now.getFullYear() || (targetYear === now.getFullYear() && index <= now.getMonth())) {
            return sum + (value || 0);
          }
          return sum;
        }, 0);
      return totalConsumption.toFixed(3);
    }
  };

  const getHourlyConsumption = (hour: number) => {
    if (viewMode === 'DAILY' && hour >= 0 && hour < 24) {
      return dailyDataRef.current[hour]?.toFixed(3) || '0.000';
    }
    return '0.000';
  };

  const getStartTime = (mode: ViewMode) => {
    const now = new Date();
    let startTime;
    
    switch (mode) {
      case 'HOURLY':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'DAILY':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'MONTHLY':
        startTime = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'YEARLY':
        startTime = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes pour le mode LIVE
    }
    
    // Format: YYYY-MM-DD HH:mm:ss
    return startTime.toISOString().slice(0, 19).replace('T', ' ');
  };

  const getHolidaysInRange = (startDate: Date | null, endDate: Date | null): string => {
    if (!startDate || !endDate) return 'Aucun';
    
    const holidays: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const holidayName = getHolidayName(currentDate);
      if (holidayName && !holidays.includes(holidayName)) {
        holidays.push(holidayName);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return holidays.length > 0 ? holidays.join(', ') : 'Aucun';
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-lg p-3 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-800"
              aria-label="Retour au dashboard"
            >
              ← Retour
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-1 sm:gap-2 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('LIVE')}
              className={`min-w-[60px] px-2 sm:px-3 py-1 rounded text-sm sm:text-base whitespace-nowrap ${
                viewMode === 'LIVE' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setViewMode('HOURLY')}
              className={`min-w-[60px] px-2 sm:px-3 py-1 rounded text-sm sm:text-base ${
                viewMode === 'HOURLY' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Heure
            </button>
            <button
              onClick={() => setViewMode('DAILY')}
              className={`min-w-[60px] px-2 sm:px-3 py-1 rounded text-sm sm:text-base ${
                viewMode === 'DAILY' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setViewMode('MONTHLY')}
              className={`min-w-[60px] px-2 sm:px-3 py-1 rounded text-sm sm:text-base ${
                viewMode === 'MONTHLY' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setViewMode('YEARLY')}
              className={`min-w-[60px] px-2 sm:px-3 py-1 rounded text-sm sm:text-base ${
                viewMode === 'YEARLY' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Année
            </button>
            <button
              onClick={() => setViewMode('CUSTOM')}
              className={`min-w-[60px] px-2 sm:px-3 py-1 rounded text-sm sm:text-base ${
                viewMode === 'CUSTOM' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Période
            </button>
          </div>
        </div>
        <div className="h-[calc(100vh-240px)] sm:h-[450px] pb-4 sm:pb-6">
          {chartData ? (
            <>
              <div className="mb-2 text-center">
                {viewMode === 'DAILY' ? (
                  <p className="text-base sm:text-lg font-semibold">
                    Consommation totale depuis minuit: {getCurrentConsumption()} kW
                    <br />
                    <span className="text-xs sm:text-sm">
                      Consommation à {new Date().getHours()}h: {getHourlyConsumption(new Date().getHours())} kW
                    </span>
                  </p>
                ) : viewMode === 'MONTHLY' ? (
                  <p className="text-base sm:text-lg font-semibold">
                    Consommation totale du mois: {getCurrentConsumption()} kW
                  </p>
                ) : viewMode === 'YEARLY' ? (
                  <p className="text-base sm:text-lg font-semibold">
                    Consommation totale de l'année: {getCurrentConsumption()} kW
                  </p>
                ) : viewMode === 'CUSTOM' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-4">
                      <input
                        type="date"
                        value={customStartDate ? customStartDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => setCustomStartDate(new Date(e.target.value))}
                        className="border rounded px-2 py-1"
                      />
                      <input
                        type="date"
                        value={customEndDate ? customEndDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => setCustomEndDate(new Date(e.target.value))}
                        className="border rounded px-2 py-1"
                      />
                      <button
                        onClick={() => {
                          if (customStartDate && customEndDate) {
                            fetchCustomData(customStartDate, customEndDate);
                          }
                        }}
                        className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600"
                        disabled={!customStartDate || !customEndDate}
                      >
                        Calculer
                      </button>
                    </div>
                    {customConsumption !== '0.000' && (
                      <p className="text-base sm:text-lg font-semibold">
                        Consommation totale pour la période passée: {customConsumption} kW
                      </p>
                    )}
                    {predictedConsumption !== '0.000' && (
                      <div className="text-base sm:text-lg">
                        <p className="font-semibold text-blue-600">
                          Prédiction de consommation: {predictedConsumption} kW
                        </p>
                        <div className="mt-2 text-sm text-gray-600 text-left">
                          <p className="font-semibold mb-1">Détails du calcul :</p>
                          <p>• Consommation totale estimée : {(Number(customConsumption) + Number(predictedConsumption)).toFixed(3)} kW</p>
                          <p>• Période : {customStartDate?.toLocaleDateString('fr-FR')} au {customEndDate?.toLocaleDateString('fr-FR')}</p>
                          <p>• Jours fériés dans la période : {getHolidaysInRange(customStartDate, customEndDate)}</p>
                          <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full border-collapse border border-gray-300">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 px-4 py-2">Date</th>
                                  <th className="border border-gray-300 px-4 py-2">Consommation</th>
                                  <th className="border border-gray-300 px-4 py-2">Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {predictions.map((pred, index) => (
                                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="border border-gray-300 px-4 py-2">{pred.date}</td>
                                    <td className="border border-gray-300 px-4 py-2">{pred.total.toFixed(3)} kW</td>
                                    <td className="border border-gray-300 px-4 py-2">
                                      {pred.details.isHoliday ? `Férié (${pred.details.holidayName})` : 'Normal'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-base sm:text-lg font-semibold">
                    Consommation actuelle: {getCurrentConsumption()} kW
                  </p>
                )}
              </div>
              <div className="h-[calc(100%-3rem)]">
                {(viewMode === 'YEARLY' || viewMode === 'MONTHLY' || viewMode === 'DAILY') ? (
                  <TimeNavigationChart
                    key={`${viewMode}-chart`}
                    data={viewMode === 'YEARLY' 
                      ? yearlyDataRef.current 
                      : viewMode === 'MONTHLY'
                        ? monthlyDataRef.current
                        : dailyDataRef.current}
                    labels={currentTimeRange.labels}
                    title={getChartTitle(viewMode)}
                    onPeriodChange={handleTimeNavigation}
                    canNavigateLeft={canNavigateLeft(currentTimeRange.endDate, viewMode === 'YEARLY' ? 'month' : 'day')}
                    canNavigateRight={canNavigateRight(currentTimeRange.endDate, viewMode === 'YEARLY' ? 'month' : 'day')}
                    mode={viewMode === 'YEARLY' ? 'month' : 'day'}
                  />
                ) : viewMode === 'LIVE' ? (
                  <Line
                    key="live-chart"
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: { duration: 0 },
                      plugins: {
                        legend: { display: false },
                        title: {
                          display: true,
                          text: getChartTitle(viewMode),
                          font: { size: window.innerWidth < 640 ? 12 : 14 },
                          padding: { bottom: 10 }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'kW',
                            font: { size: window.innerWidth < 640 ? 10 : 12 }
                          },
                          ticks: {
                            font: { size: window.innerWidth < 640 ? 10 : 12 }
                          }
                        },
                        x: {
                          grid: { display: false },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: window.innerWidth < 640 ? 6 : 10,
                            font: { size: window.innerWidth < 640 ? 10 : 12 }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <Bar
                    key={`${viewMode}-chart`}
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: { duration: 0 },
                      plugins: {
                        legend: { display: false },
                        title: {
                          display: true,
                          text: getChartTitle(viewMode),
                          font: { size: window.innerWidth < 640 ? 12 : 14 },
                          padding: { bottom: 10 }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'kW',
                            font: { size: window.innerWidth < 640 ? 10 : 12 }
                          },
                          ticks: {
                            font: { size: window.innerWidth < 640 ? 10 : 12 }
                          }
                        },
                        x: {
                          grid: { display: false },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: (viewMode as ViewMode) === 'DAILY' 
                              ? (window.innerWidth < 640 ? 12 : 24) 
                              : (window.innerWidth < 640 ? 8 : 15),
                            font: { size: window.innerWidth < 640 ? 10 : 12 }
                          }
                        }
                      }
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              Chargement...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};