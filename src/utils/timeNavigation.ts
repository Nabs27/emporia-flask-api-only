import { format, subMonths, addMonths, subDays, startOfMonth, endOfMonth, startOfDay, getDaysInMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface TimeRange {
  startDate: Date;
  endDate: Date;
  labels: string[];
  currentDay?: number;
  currentHour?: number;
}

const OLDEST_DATA_DATE = new Date(2023, 0, 1);

export const getDailyTimeRange = (currentDate: Date, direction: 'left' | 'right'): TimeRange => {
  const now = new Date();
  const targetDate = new Date(currentDate);
  
  // Déterminer le jour cible
  if (direction === 'left') {
    // Reculer d'un jour
    targetDate.setDate(targetDate.getDate() - 1);
  } else {
    // Avancer d'un jour, mais pas au-delà du jour actuel
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    if (nextDay <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  // Calculer la période de 30 jours à partir du jour cible
  const endDate = new Date(targetDate); // Le jour cible est le dernier jour
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 29); // Commencer 29 jours avant le jour cible

  // Générer les labels pour les 30 jours
  const labels = Array.from({ length: 30 }, (_, i) => {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + i);
    return format(dayDate, 'd MMMM yyyy', { locale: fr });
  });

  return { 
    startDate,
    endDate,
    labels,
    currentDay: targetDate.getDate()
  };
};

export const getMonthlyTimeRange = (currentDate: Date, direction: 'left' | 'right'): TimeRange => {
  const now = new Date();
  
  if (direction === 'right' && currentDate.getMonth() === now.getMonth() && 
      currentDate.getFullYear() === now.getFullYear()) {
    const endDate = endOfMonth(now);
    const startDate = startOfMonth(subMonths(now, 11));
    
    const labels = Array.from({ length: 12 }, (_, i) => {
      const monthDate = addMonths(startDate, i);
      return format(monthDate, 'MMMM yyyy', { locale: fr });
    });

    return { startDate, endDate, labels };
  }

  const targetDate = direction === 'left' 
    ? subMonths(currentDate, 1) 
    : addMonths(currentDate, 1);

  const endDate = endOfMonth(targetDate);
  const startDate = startOfMonth(subMonths(targetDate, 11));

  const labels = Array.from({ length: 12 }, (_, i) => {
    const monthDate = addMonths(startDate, i);
    return format(monthDate, 'MMMM yyyy', { locale: fr });
  });

  return {
    startDate,
    endDate,
    labels
  };
};

export const getYearlyTimeRange = (currentDate: Date, direction: 'left' | 'right'): TimeRange => {
  const now = new Date();
  const targetDate = new Date(currentDate);
  
  // Déterminer le mois cible
  if (direction === 'left') {
    // Reculer d'un mois
    targetDate.setMonth(targetDate.getMonth() - 1);
  } else {
    // Avancer d'un mois, mais pas au-delà du mois actuel
    const nextMonth = new Date(targetDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    if (nextMonth <= now) {
      targetDate.setMonth(targetDate.getMonth() + 1);
    }
  }

  // Calculer la période de 12 mois
  const startDate = new Date(targetDate);
  startDate.setMonth(startDate.getMonth() - 11); // Commencer 11 mois avant le mois cible
  const endDate = new Date(targetDate); // Le mois cible est le dernier mois

  // Générer les labels pour les 12 mois
  const labels = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(startDate);
    monthDate.setMonth(monthDate.getMonth() + i);
    return format(monthDate, 'MMMM yyyy', { locale: fr });
  });

  return { startDate, endDate, labels };
};

export const getHourlyTimeRange = (currentDate: Date, direction: 'left' | 'right'): TimeRange => {
  const now = new Date();
  const targetDate = new Date(currentDate);
  
  // Déterminer l'heure cible
  if (direction === 'left') {
    // Reculer d'une heure
    targetDate.setHours(targetDate.getHours() - 1);
  } else {
    // Avancer d'une heure, mais pas au-delà de l'heure actuelle
    const nextHour = new Date(targetDate);
    nextHour.setHours(nextHour.getHours() + 1);
    
    if (nextHour <= now) {
      targetDate.setHours(targetDate.getHours() + 1);
    }
  }

  // Calculer la période de 24 heures
  const endDate = new Date(targetDate); // L'heure cible est la dernière heure
  const startDate = new Date(targetDate);
  startDate.setHours(startDate.getHours() - 23); // Commencer 23 heures avant l'heure cible

  // Générer les labels pour les 24 heures
  const labels = Array.from({ length: 24 }, (_, i) => {
    const hourDate = new Date(startDate);
    hourDate.setHours(hourDate.getHours() + i);
    return format(hourDate, 'HH:mm', { locale: fr });
  });

  return { 
    startDate,
    endDate,
    labels,
    currentHour: targetDate.getHours()
  };
};

export const canNavigateLeft = (currentDate: Date, mode: 'month' | 'day'): boolean => {
  if (mode === 'day') {
    const startOfPeriod = startOfDay(subDays(currentDate, getDaysInMonth(currentDate) - 1));
    return startOfPeriod.getTime() >= OLDEST_DATA_DATE.getTime();
  } else {
    const startOfPeriod = startOfMonth(subMonths(currentDate, 11));
    return startOfPeriod.getTime() >= OLDEST_DATA_DATE.getTime();
  }
};

export const canNavigateRight = (currentDate: Date, mode: 'month' | 'day'): boolean => {
  const now = new Date();
  if (mode === 'day') {
    return startOfDay(currentDate).getTime() < startOfDay(now).getTime();
  } else {
    return startOfMonth(currentDate).getTime() < startOfMonth(now).getTime();
  }
};

export const formatDateForApi = (date: Date): string => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}; 