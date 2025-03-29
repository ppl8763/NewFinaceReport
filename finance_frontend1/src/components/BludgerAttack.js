import React from 'react';
import { Scatter, Bar } from 'react-chartjs-2';
import './BludgerAttack.css';

const BludgerAttack = ({ patterns, spotPrice }) => {
  // Enhanced attractiveness calculation
  const calculateAttractiveness = (volatility, openInterest) => 
    Math.min(100, Math.round((volatility * 0.7 + Math.log10(openInterest) * 0.3) * 100));

  // Find ATM strike range
  const atmRange = spotPrice ? [spotPrice * 0.98, spotPrice * 1.02] : null;

  // Enhanced scatter plot data
  const scatterData = {
    datasets: [
      {
        label: 'Call Options (Red Bludgers)',
        data: patterns.filter(p => p.type === 'red').map(p => ({
          x: p.strike,
          y: p.impliedVolatility * 100,
          radius: Math.min(20, 5 + p.openInterest / 500),
          expiration: p.expiration
        })),
        backgroundColor: 'rgba(255, 0, 0, 0.7)',
        borderColor: 'rgba(255, 0, 0, 1)',
        borderWidth: 1
      },
      {
        label: 'Put Options (Black Bludgers)',
        data: patterns.filter(p => p.type === 'black').map(p => ({
          x: p.strike,
          y: p.impliedVolatility * 100,
          radius: Math.min(20, 5 + p.openInterest / 500),
          expiration: p.expiration
        })),
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderColor: 'rgba(0, 0, 0, 1)',
        borderWidth: 1
      },
      // ATM zone marker
      ...(atmRange ? [{
        label: 'ATM Zone',
        data: [{ x: spotPrice, y: 0 }],
        pointRadius: 0,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderColor: 'rgba(255, 215, 0, 0.5)',
        borderWidth: 1,
        showLine: true,
        fill: true
      }] : [])
    ]
  };

  // Enhanced tooltips
  const scatterOptions = {
    scales: {
      x: {
        title: {
          display: true,
          text: 'Strike Price (Bludger Impact Zone)',
          font: { weight: 'bold' }
        },
        grid: {
          color: (ctx) => 
            atmRange && ctx.tick.value >= atmRange[0] && ctx.tick.value <= atmRange[1] 
              ? 'rgba(255, 215, 0, 0.3)' 
              : 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Implied Volatility (%)',
          font: { weight: 'bold' }
        },
        min: 0,
        max: Math.max(...patterns.map(p => p.impliedVolatility * 100)) * 1.2
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = patterns[ctx.dataIndex];
            const attractiveness = calculateAttractiveness(p.impliedVolatility, p.openInterest);
            return [
              `Type: ${p.type === 'red' ? 'Call' : 'Put'} Bludger`,
              `Strike: $${p.strike}`,
              `IV: ${(p.impliedVolatility * 100).toFixed(2)}%`,
              `Open Interest: ${p.openInterest}`,
              `Expiry: ${p.expiration}`,
              `Attack Power: ${attractiveness}%`,
              p.strike >= atmRange[0] && p.strike <= atmRange[1] ? '⚡ ATM ZONE ⚡' : ''
            ].filter(Boolean);
          }
        }
      },
      legend: {
        labels: {
          font: {
            family: 'Harry Potter, cursive',
            size: 14
          },
          padding: 20
        }
      },
      annotation: {
        annotations: {
          atmZone: {
            type: 'box',
            xMin: atmRange?.[0],
            xMax: atmRange?.[1],
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            borderColor: 'rgba(255, 215, 0, 0.3)',
            borderWidth: 1
          }
        }
      }
    }
  };

  return (
    <div className="bludger-attack">
      <h3 className="quidditch-header">
        <span className="golden-snitch">⚡</span> Bludger Attack Patterns 
        <span className="golden-snitch">⚡</span>
      </h3>
      <p className="quidditch-subtitle">Option Chain Visualized as Quidditch Bludger Attacks</p>
      
      <div className="visualization-container">
        <div className="scatter-plot">
          <Scatter data={scatterData} options={scatterOptions} />
          <div className="chart-legend">
            <p>• Bludger Size = Open Interest (Attack Strength)</p>
            <p>• Height = Implied Volatility (Attack Frequency)</p>
            <p>• Golden Zone = ATM Strike Prices (Golden Snitch Area)</p>
          </div>
        </div>
      </div>

      <div className="option-table">
        <table>
          <thead>
            <tr>
              <th>Bludger Type</th>
              <th>Strike</th>
              <th>IV%</th>
              <th>Open Interest</th>
              <th>Expiry</th>
              <th>Attack Power</th>
            </tr>
          </thead>
          <tbody>
            {patterns
              .sort((a, b) => b.impliedVolatility - a.impliedVolatility)
              .map((p, index) => {
                const isATM = atmRange && p.strike >= atmRange[0] && p.strike <= atmRange[1];
                const attractiveness = calculateAttractiveness(p.impliedVolatility, p.openInterest);
                
                return (
                  <tr 
                    key={index} 
                    className={`${p.type} ${isATM ? 'atm-row' : ''}`}
                  >
                    <td>
                      {p.type === 'red' ? '🔴 Call' : '⚫ Put'} 
                      {isATM && ' ⚡'}
                    </td>
                    <td>${p.strike}</td>
                    <td>{(p.impliedVolatility * 100).toFixed(2)}%</td>
                    <td>{p.openInterest.toLocaleString()}</td>
                    <td>{p.expiration}</td>
                    <td>
                      <div className="attack-meter">
                        <div 
                          className="meter-fill"
                          style={{
                            width: `${attractiveness}%`,
                            backgroundColor: p.type === 'red' 
                              ? 'rgba(255, 0, 0, 0.7)' 
                              : 'rgba(0, 0, 0, 0.7)'
                          }}
                        >
                          {attractiveness}%
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BludgerAttack;