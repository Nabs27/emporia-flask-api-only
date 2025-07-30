import React, { useState } from 'react';
import { EnergyCharts } from './EnergyCharts';
import { Dashboard } from './Dashboard';

export const App: React.FC = () => {
  const [showCharts, setShowCharts] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {showCharts ? (
        <EnergyCharts onClose={() => setShowCharts(false)} />
      ) : (
        <Dashboard onShowDetails={() => setShowCharts(true)} />
      )}
    </div>
  );
}; 