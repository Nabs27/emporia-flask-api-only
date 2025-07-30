import { fetchApi } from './api';

// Types et interfaces
export interface DailyPrediction {
  date: string;
  total: number;
  details: {
    consumedSoFar?: number;
    estimatedRemaining?: number;
    historicalPattern?: number[];
    isHoliday: boolean;
    holidayName?: string;
  };
}

interface Holiday {
  name: string;
  isVariable: boolean;
  date?: string; // Format: MM-DD
}

// Jours fériés en Tunisie
const TUNISIA_HOLIDAYS: { [key: string]: Holiday } = {
  // Fêtes fixes
  '01-01': { name: "Jour de l'An", isVariable: false },
  '03-20': { name: "Fête de l'Indépendance", isVariable: false },
  '04-09': { name: "Journée des Martyrs", isVariable: false },
  '05-01': { name: "Fête du Travail", isVariable: false },
  '07-25': { name: "Fête de la République", isVariable: false },
  '08-13': { name: "Fête de la Femme", isVariable: false },
  '10-15': { name: "Fête de l'Évacuation", isVariable: false },
  '12-17': { name: "Fête de la Révolution", isVariable: false },
  
  // Fêtes variables (dates 2024 par défaut)
  '04-10': { name: "Aïd el-Fitr", isVariable: true },
  '06-17': { name: "Aïd el-Kébir", isVariable: true },
  '07-08': { name: "Jour de l'An de l'Hégire", isVariable: true },
  '09-16': { name: "Mouled", isVariable: true }
};

// Consommation selon le type de jour
const CONSUMPTION_RATES = {
  NORMAL: 1.0,    // Jour normal
  HOLIDAY: 0.8    // 80% de la consommation normale pour les jours fériés
};

// Fonction pour mettre à jour les dates variables
export const updateVariableHolidays = (updates: { [key: string]: string }) => {
  Object.entries(TUNISIA_HOLIDAYS).forEach(([key, holiday]) => {
    if (holiday.isVariable) {
      const newDate = Object.entries(updates).find(([name]) => name === holiday.name)?.[1];
      if (newDate) {
        delete TUNISIA_HOLIDAYS[key];
        TUNISIA_HOLIDAYS[newDate] = holiday;
      }
    }
  });
};

// Fonction pour vérifier si une date est un jour férié
const isHoliday = (date: Date): boolean => {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return monthDay in TUNISIA_HOLIDAYS;
};

// Fonction pour obtenir le nom du jour férié
export const getHolidayName = (date: Date): string | null => {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return TUNISIA_HOLIDAYS[monthDay]?.name || null;
};

const getHourlyPattern = async (date: Date): Promise<number[]> => {
  try {
    const now = new Date();
    const endDate = new Date(Math.min(date.getTime(), now.getTime()));
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 28); // 4 semaines de données

    const response = await fetchApi('/api/energy/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: startDate.toISOString().slice(0, 19).replace('T', ' '),
        end_time: endDate.toISOString().slice(0, 19).replace('T', ' '),
        scale: 'HOUR'
      })
    });

    if (response?.usage) {
      // Récupérer uniquement les mêmes jours de la semaine
      const dayOfWeek = date.getDay();
      const hoursPerDay = 24;
      const sameDaysData = [];

      // Parcourir les données par jour
      for (let i = 0; i < response.usage.length; i += hoursPerDay) {
        const currentDay = new Date(startDate);
        currentDay.setDate(currentDay.getDate() + Math.floor(i / hoursPerDay));
        
        if (currentDay.getDay() === dayOfWeek) {
          const dayData = response.usage.slice(i, i + hoursPerDay);
          if (dayData.some((val: number) => val > 0)) {
            sameDaysData.push(dayData);
          }
        }
      }

      if (sameDaysData.length > 0) {
        // Calculer la moyenne pour chaque heure
        const averageHourlyPattern = new Array(24).fill(0);
        for (let hour = 0; hour < 24; hour++) {
          const hourlyValues = sameDaysData.map(day => day[hour] || 0);
          averageHourlyPattern[hour] = hourlyValues.reduce((sum, val) => sum + val, 0) / sameDaysData.length;
        }
        return averageHourlyPattern;
      }
    }

    // Si pas de données historiques, utiliser une valeur par défaut
    return new Array(24).fill(12.0 / 24); // 12 kW par jour comme base

  } catch (error) {
    console.error('Erreur lors de la récupération du pattern horaire:', error);
    return new Array(24).fill(12.0 / 24);
  }
};

export const predictConsumption = async (startDate: Date, endDate: Date): Promise<DailyPrediction[]> => {
  const predictions: DailyPrediction[] = [];
  const currentDate = new Date(startDate);
  const now = new Date();

  // Pour toutes les dates jusqu'à aujourd'hui, on utilise les données réelles
  while (currentDate <= endDate && currentDate <= now) {
    try {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Si c'est aujourd'hui, on s'arrête à l'heure actuelle
      if (currentDate.toDateString() === now.toDateString()) {
        dayEnd.setTime(now.getTime());
      }

      const response = await fetchApi('/api/energy/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: dayStart.toISOString().slice(0, 19).replace('T', ' '),
          end_time: dayEnd.toISOString().slice(0, 19).replace('T', ' '),
          scale: 'HOUR'
        })
      });

      if (response?.usage) {
        const dailyData = Array(24).fill(0);
        const currentHour = currentDate.toDateString() === now.toDateString() ? now.getHours() : 23;
        
        // Remplir les données réelles
        for (let i = 0; i <= currentHour && i < response.usage.length; i++) {
          dailyData[i] = response.usage[i] || 0;
        }

        const consumedSoFar = dailyData.reduce((sum, val) => sum + val, 0);

        // Si c'est aujourd'hui, on prédit le reste de la journée
        if (currentDate.toDateString() === now.toDateString()) {
          const hourlyPattern = await getHourlyPattern(currentDate);
          const estimatedRemaining = hourlyPattern
            .slice(currentHour + 1)
            .reduce((sum, val) => sum + val, 0);

          // Remplir les heures restantes avec le pattern
          for (let hour = currentHour + 1; hour < 24; hour++) {
            dailyData[hour] = hourlyPattern[hour];
          }

          predictions.push({
            date: currentDate.toLocaleDateString('fr-FR'),
            total: consumedSoFar + estimatedRemaining,
            details: {
              consumedSoFar,
              estimatedRemaining,
              historicalPattern: dailyData,
              isHoliday: isHoliday(currentDate),
              holidayName: getHolidayName(currentDate) || undefined
            }
          });
        } else {
          // Pour les jours passés, on utilise uniquement les données réelles
          predictions.push({
            date: currentDate.toLocaleDateString('fr-FR'),
            total: consumedSoFar,
            details: {
              consumedSoFar,
              historicalPattern: dailyData,
              isHoliday: isHoliday(currentDate),
              holidayName: getHolidayName(currentDate) || undefined
            }
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Pour les jours futurs
  while (currentDate <= endDate) {
    const hourlyPattern = await getHourlyPattern(currentDate);
    const isHolidayDate = isHoliday(currentDate);
    
    const total = isHolidayDate 
      ? hourlyPattern.reduce((sum, val) => sum + val, 0) * CONSUMPTION_RATES.HOLIDAY
      : hourlyPattern.reduce((sum, val) => sum + val, 0);
    
    predictions.push({
      date: currentDate.toLocaleDateString('fr-FR'),
      total,
      details: {
        historicalPattern: hourlyPattern,
        isHoliday: isHolidayDate,
        holidayName: getHolidayName(currentDate) || undefined
      }
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return predictions;
}; 