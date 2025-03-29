import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PieChart from "./PieChart";
import LineGraph from "./LineGraph";
import { Scatter } from 'react-chartjs-2';
import "./Dashboard.css";

const Dashboard = () => {
    const navigate = useNavigate();
    const [financialData, setFinancialData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [symbol, setSymbol] = useState("");
    const [stockData, setStockData] = useState(null);
    const [predictedPrice, setPredictedPrice] = useState(null);
    const [filterDays, setFilterDays] = useState(30);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [quidditchMode, setQuidditchMode] = useState(false);
    const [teamPerformance, setTeamPerformance] = useState({});
    const [bludgerPatterns, setBludgerPatterns] = useState([]);
    const [optionsChain, setOptionsChain] = useState(null);
    const [selectedExpiry, setSelectedExpiry] = useState(null);

    // Quidditch team configuration
    const teams = {
        gryffindor: { stocks: ['AAPL', 'MSFT'], color: '#AE0001', score: 75 },
        slytherin: { stocks: ['XOM', 'CVX'], color: '#2A623D', score: 68 },
        ravenclaw: { stocks: ['GOOGL', 'META'], color: '#222F5B', score: 82 },
        hufflepuff: { stocks: ['WMT', 'PG'], color: '#FFDB00', score: 60 }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("http://localhost:5000/api/financial-data");
                const data = await response.json();
                setFinancialData(data);
                setFilteredData(data);
            } catch (error) {
                console.error("Error fetching MySQL data:", error);
                setError("Failed to load financial data");
            }
        };
        fetchData();
    }, []);

    const fetchStockData = async () => {
        if (!symbol) {
            setError("Please enter a stock symbol");
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const [stockResponse, optionsResponse] = await Promise.all([
                fetch(`http://localhost:5000/api/stock/${symbol}`),
                fetch(`http://localhost:5000/api/options/${symbol}`)
            ]);

            if (!stockResponse.ok) throw new Error("Failed to fetch stock data");
            if (!optionsResponse.ok) throw new Error("Failed to fetch options data");

            const stockData = await stockResponse.json();
            const optionsData = await optionsResponse.json();

            setStockData(stockData);
            setOptionsChain(optionsData);
            setBludgerPatterns(optionsData.bludgerPatterns || []);
            
            // Set the first expiry as default if available
            if (optionsData.expirationDates?.length > 0) {
                setSelectedExpiry(optionsData.expirationDates[0]);
            }

            if (quidditchMode) {
                calculateTeamPerformance(stockData, optionsData);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateTeamPerformance = (stockData, optionsData) => {
        const performance = {};
        Object.keys(teams).forEach(team => {
            const teamOptions = optionsData.bludgerPatterns.filter(opt => 
                teams[team].stocks.includes(opt.symbol)
            );
            const avgVolatility = teamOptions.length > 0 ? 
                teamOptions.reduce((sum, opt) => sum + opt.impliedVolatility, 0) / teamOptions.length : 
                0.3;
            
            performance[team] = {
                score: Math.max(0, Math.round(teams[team].score + (avgVolatility * 50))),
                momentum: avgVolatility > 0.35 ? 'rising' : 'falling',
                seekerDistance: Math.round(50 - (avgVolatility * 100)),
                bludgers: Math.round(3 + (avgVolatility * 10))
            };
        });
        setTeamPerformance(performance);
    };

    const getFilteredStockData = () => {
        if (!stockData) return [];
        const dates = Object.keys(stockData).sort().slice(-filterDays);
        return dates.map((date) => ({
            date,
            open: stockData[date]["1. open"],
            close: stockData[date]["4. close"],
            volume: stockData[date]["5. volume"],
        }));
    };

    const getCurrentPrice = () => {
        if (!stockData) return null;
        const dates = Object.keys(stockData).sort();
        const latestDate = dates[dates.length - 1];
        return parseFloat(stockData[latestDate]["4. close"]);
    };

    const renderOptionChain = () => {
        if (!optionsChain || !optionsChain.calls || !optionsChain.puts) return null;
        
        const currentPrice = getCurrentPrice();
        const filteredCalls = optionsChain.calls.filter(opt => 
            !selectedExpiry || opt.expiration === selectedExpiry
        );
        const filteredPuts = optionsChain.puts.filter(opt => 
            !selectedExpiry || opt.expiration === selectedExpiry
        );
        
        // Get common strikes for display
        const strikes = [...new Set([
            ...filteredCalls.map(c => c.strike),
            ...filteredPuts.map(p => p.strike)
        ])].sort((a, b) => a - b);

        return (
            <div className="option-chain-container">
                <h3>📊 Option Chain for {symbol.toUpperCase()}</h3>
                <div className="option-chain-header">
                    <div className="current-price">
                        Current Price: ${currentPrice?.toFixed(2) || 'N/A'}
                    </div>
                    {optionsChain.expirationDates?.length > 0 && (
                        <div className="expiry-selector">
                            <label>Expiry: </label>
                            <select 
                                value={selectedExpiry || optionsChain.expirationDates[0]} 
                                onChange={(e) => setSelectedExpiry(e.target.value)}
                            >
                                {optionsChain.expirationDates.map((date, index) => (
                                    <option key={index} value={date}>{date}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                
                <div className="option-chain-table">
                    <div className="option-chain-row header">
                        <div className="call-data">Calls</div>
                        <div className="strike-data">Strike</div>
                        <div className="put-data">Puts</div>
                    </div>
                    
                    {strikes.map((strike, index) => {
                        const call = filteredCalls.find(c => c.strike === strike);
                        const put = filteredPuts.find(p => p.strike === strike);
                        const isATM = currentPrice && Math.abs(strike - currentPrice) < (currentPrice * 0.01);
                        
                        return (
                            <div 
                                key={index} 
                                className={`option-chain-row ${isATM ? 'atm-row' : ''}`}
                            >
                                <div className="call-data">
                                    {call ? (
                                        <>
                                            <div className="bid-ask">{call.bid} x {call.ask}</div>
                                            <div className="details">
                                                <span>Vol: {call.volume || '0'}</span>
                                                <span>OI: {call.openInterest || '0'}</span>
                                                <span>IV: {(call.impliedVolatility * 100)?.toFixed(2) || '0.00'}%</span>
                                            </div>
                                        </>
                                    ) : <div>-</div>}
                                </div>
                                
                                <div className="strike-data">
                                    {strike.toFixed(2)}
                                </div>
                                
                                <div className="put-data">
                                    {put ? (
                                        <>
                                            <div className="bid-ask">{put.bid} x {put.ask}</div>
                                            <div className="details">
                                                <span>Vol: {put.volume || '0'}</span>
                                                <span>OI: {put.openInterest || '0'}</span>
                                                <span>IV: {(put.impliedVolatility * 100)?.toFixed(2) || '0.00'}%</span>
                                            </div>
                                        </>
                                    ) : <div>-</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderBludgerAttackChart = () => {
        const data = {
            datasets: [
                {
                    label: 'Call Options (Red Bludgers)',
                    data: bludgerPatterns.filter(p => p.type === 'red').map(p => ({
                        x: p.strike,
                        y: p.impliedVolatility * 100,
                        r: p.openInterest / 1000
                    })),
                    backgroundColor: 'rgba(255, 0, 0, 0.7)',
                },
                {
                    label: 'Put Options (Black Bludgers)',
                    data: bludgerPatterns.filter(p => p.type === 'black').map(p => ({
                        x: p.strike,
                        y: p.impliedVolatility * 100,
                        r: p.openInterest / 1000
                    })),
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                }
            ]
        };

        const options = {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Strike Price (Bludger Impact Zone)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Volatility % (Attack Frequency)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const data = bludgerPatterns[context.dataIndex];
                            return [
                                `Strike: $${data.strike}`,
                                `Type: ${data.type === 'red' ? 'Call' : 'Put'}`,
                                `Volatility: ${(data.impliedVolatility * 100).toFixed(2)}%`,
                                `Open Interest: ${data.openInterest}`
                            ];
                        }
                    }
                }
            }
        };

        return (
            <div className="bludger-attack-container">
                <h3>⚡ Bludger Attack Patterns (Option Chain)</h3>
                <Scatter data={data} options={options} />
            </div>
        );
    };

    const renderQuidditchSimulation = () => (
        <div className="quidditch-simulation">
            <h3>🏆 Quidditch Match Simulation</h3>
            <div className="teams-container">
                {Object.entries(teams).map(([team, data]) => (
                    <div key={team} className="team-card" style={{ borderColor: data.color }}>
                        <h4>{team.toUpperCase()}</h4>
                        <p>Score: {teamPerformance[team]?.score || data.score}</p>
                        <p>Momentum: {teamPerformance[team]?.momentum || 'stable'}</p>
                        <p>Seeker Distance: {teamPerformance[team]?.seekerDistance || 50}m</p>
                        <p>Bludgers: {teamPerformance[team]?.bludgers || 3}/min</p>
                        <p>Stocks: {data.stocks.join(', ')}</p>
                    </div>
                ))}
            </div>
            {renderBludgerAttackChart()}
            <button 
                className="quidditch-toggle"
                onClick={() => setQuidditchMode(false)}
            >
                Back to Regular View
            </button>
        </div>
    );

    return (
        <div className="dashboard-container">
            <h2>📊 Financial Dashboard</h2>

            {quidditchMode ? (
                renderQuidditchSimulation()
            ) : (
                <>
                    <div className="mode-toggle">
                        <button 
                            className="quidditch-toggle"
                            onClick={() => setQuidditchMode(true)}
                        >
                            🏟️ View Quidditch Mode
                        </button>
                    </div>

                    <div className="search-container">
                        <input
                            type="text"
                            value={symbol}
                            onChange={(e) => {
                                setSymbol(e.target.value);
                                setError(null);
                            }}
                            placeholder="Enter Stock Symbol (AAPL, GOOGL, TESL etc)"
                            disabled={isLoading}
                        />
                        <button 
                            onClick={fetchStockData}
                            disabled={isLoading || !symbol}
                        >
                            {isLoading ? "⌛ Loading..." : "🔍 Search"}
                        </button>
                        <button 
                            onClick={() => navigate(`/stock-prediction/${symbol}`)}
                            disabled={!symbol || !stockData}
                        >
                            📊 View Detailed Prediction
                        </button>
                    </div>

                    {error && <p className="error-message">❌ {error}</p>}

                    <div className="filter-container">
                        <label>Filter: </label>
                        <select 
                            value={filterDays} 
                            onChange={(e) => setFilterDays(Number(e.target.value))}
                            disabled={!stockData}
                        >
                            <option value="7">Last 7 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="90">Last 3 Months</option>
                            <option value="365">Last 1 Year</option>
                        </select>
                    </div>

                    {stockData && (
                        <div className="stock-data-container">
                            <h3>📈 Stock Data for {symbol.toUpperCase()}</h3>
                            <table className="financial-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Open</th>
                                        <th>Close</th>
                                        <th>Volume</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFilteredStockData().map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.date}</td>
                                            <td>${parseFloat(item.open).toFixed(2)}</td>
                                            <td>${parseFloat(item.close).toFixed(2)}</td>
                                            <td>{parseInt(item.volume).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <LineGraph data={getFilteredStockData()} />
                            {renderOptionChain()}
                            {bludgerPatterns.length > 0 && renderBludgerAttackChart()}
                        </div>
                    )}

                    {filteredData.length > 0 ? (
                        <>
                            <h3>📊 Financial Insights</h3>
                            <PieChart data={filteredData} />
                        </>
                    ) : (
                        <p className="no-data">No financial data available</p>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;