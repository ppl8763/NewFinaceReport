import React, { useState, useEffect } from 'react';
import { Line, Pie } from 'react-chartjs-2';
import './QuidditchTrading.css';

const QuidditchTrading = () => {
  const [activeTab, setActiveTab] = useState('stocks');
  const [stockSymbol, setStockSymbol] = useState('AAPL');
  const [teamPerformance, setTeamPerformance] = useState({});
  
  // Sample data - replace with real API calls
  const teams = {
    gryffindor: { stocks: ['AAPL', 'MSFT'], color: '#AE0001', score: 75 },
    slytherin: { stocks: ['XOM', 'CVX'], color: '#2A623D', score: 68 },
    ravenclaw: { stocks: ['GOOGL', 'META'], color: '#222F5B', score: 82 },
    hufflepuff: { stocks: ['WMT', 'PG'], color: '#FFDB00', score: 60 }
  };

  useEffect(() => {
    // Simulate performance calculation
    const performance = {};
    Object.keys(teams).forEach(team => {
      performance[team] = {
        score: Math.max(0, teams[team].score + (Math.random() * 20 - 10)),
        momentum: Math.random() > 0.5 ? 'rising' : 'falling'
      };
    });
    setTeamPerformance(performance);
  }, [stockSymbol]);

  const getTeamData = () => ({
    labels: Object.keys(teams),
    datasets: [{
      data: Object.keys(teams).map(team => teamPerformance[team]?.score || 0),
      backgroundColor: Object.keys(teams).map(team => teams[team].color)
    }]
  });

  return (
    <div className="quidditch-trading">
      <div className="tabs">
        <button 
          className={activeTab === 'stocks' ? 'active' : ''}
          onClick={() => setActiveTab('stocks')}
        >
          📈 Stock Data
        </button>
        <button
          className={activeTab === 'match' ? 'active' : ''}
          onClick={() => setActiveTab('match')}
        >
          🏟️ Match Simulation
        </button>
      </div>

      {activeTab === 'stocks' && (
        <div className="stock-controls">
          <input
            type="text"
            value={stockSymbol}
            onChange={(e) => setStockSymbol(e.target.value)}
            placeholder="Enter stock symbol"
          />
          <div className="stock-chart">
            {/* Replace with real stock data visualization */}
            <Line data={{
              labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
              datasets: [{
                label: stockSymbol,
                data: [65, 59, 80, 81, 56],
                borderColor: '#4bc0c0'
              }]
            }} />
          </div>
        </div>
      )}

      {activeTab === 'match' && (
        <div className="match-simulation">
          <div className="team-performance">
            <Pie data={getTeamData()} />
          </div>
          <div className="team-cards">
            {Object.entries(teams).map(([team, data]) => (
              <div key={team} className="team-card" style={{ borderColor: data.color }}>
                <h3>{team.toUpperCase()}</h3>
                <p>Score: {teamPerformance[team]?.score || 0}</p>
                <p>Momentum: {teamPerformance[team]?.momentum || 'neutral'}</p>
                <p>Stocks: {data.stocks.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuidditchTrading;