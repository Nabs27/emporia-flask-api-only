import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useChartDrag } from '../hooks/useChartDrag';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimeNavigationChartProps {
  data: number[];
  labels: string[];
  title: string;
  onPeriodChange: (direction: 'left' | 'right') => void;
  canNavigateLeft: boolean;
  canNavigateRight: boolean;
  mode: 'month' | 'day';
}

export const TimeNavigationChart: React.FC<TimeNavigationChartProps> = ({
  data,
  labels,
  title,
  onPeriodChange,
  canNavigateLeft,
  canNavigateRight,
  mode
}) => {
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useChartDrag({
    onDragComplete: (direction) => {
      if ((direction === 'left' && !canNavigateLeft) || 
          (direction === 'right' && !canNavigateRight)) {
        return;
      }
      onPeriodChange(direction);
    },
    continuousScrollInterval: mode === 'day' ? 150 : 200 // Plus rapide pour les jours
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: title,
        data: data,
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: title
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Consommation (kW)'
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: mode === 'day' ? 15 : 12 // Plus de labels pour les jours
        }
      }
    }
  };

  return (
    <div
      className="chart-container"
      style={{ 
        height: '400px', 
        userSelect: 'none', 
        position: 'relative',
        cursor: 'grab'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <Bar data={chartData} options={options} />
    </div>
  );
}; 