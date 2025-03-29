import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import './StockPredictionPage.css';

const StockPredictionPage = () => {
    const { symbol } = useParams();
    const navigate = useNavigate();
    const [prediction, setPrediction] = useState(null);
    const [historicalData, setHistoricalData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPredictionData = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // First fetch historical data
                const historicalRes = await fetch(`http://localhost:5000/api/stock/${symbol}`);
                if (!historicalRes.ok) {
                    throw new Error('Failed to fetch historical data');
                }
                const historicalData = await historicalRes.json();
                processHistoricalData(historicalData);

                // Then fetch prediction (from the correct port 5001)
                const predictionRes = await fetch(`http://localhost:5001/predict/${symbol}`);
                if (!predictionRes.ok) {
                    throw new Error('Failed to fetch prediction');
                }
                const predictionData = await predictionRes.json();
                
                if (predictionData.error) {
                    throw new Error(predictionData.error);
                }
                
                setPrediction(predictionData.predicted_price);
            } catch (err) {
                setError(err.message);
                console.error("Fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPredictionData();
    }, [symbol]);

    const processHistoricalData = (rawData) => {
        const dates = Object.keys(rawData).sort();
        const closes = dates.map(date => parseFloat(rawData[date]["4. close"]));
        setHistoricalData({ dates, closes });
    };

    if (isLoading) return <div className="loading">🔮 Predicting...</div>;
    if (error) return <div className="error">❌ Error: {error}</div>;

    return (
        <div className="prediction-page">
            <button onClick={() => navigate(-1)} className="back-button">
                ← Back to Dashboard
            </button>

            <h1>{symbol} Stock Prediction</h1>
            
            {prediction && (
                <div className="prediction-card">
                    <h2>Predicted Price: ${prediction.toFixed(2)}</h2>
                    <p className="explanation">
                        This prediction is based on Random Forest regression analysis of recent stock performance.
                        The model considers historical closing prices and technical indicators to forecast potential future values.
                    </p>
                </div>
            )}

            <div className="chart-container">
                <h3>Historical Closing Prices</h3>
                <Line
                    data={{
                        labels: historicalData.dates,
                        datasets: [{
                            label: 'Closing Price ($)',
                            data: historicalData.closes,
                            borderColor: '#4bc0c0',
                            tension: 0.1
                        }]
                    }}
                    options={{ 
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: false
                            }
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default StockPredictionPage;