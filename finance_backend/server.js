const express = require("express");
const mysql = require("mysql");
const axios = require("axios");
const cors = require("cors");
const cache = require('memory-cache');

const app = express();
const PORT = 5000;
const ALPHA_VANTAGE_API_KEY = "B2SQXGOF2ZMZAV1Z"; // Replace with your actual key

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:3000'],
    methods: ['GET']
}));

// MySQL Connection Pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: "localhost",
    user: "root",
    password: "root@mysql",
    database: "finance_db"
});

// Health Check Endpoint
app.get("/", (req, res) => {
    res.json({
        status: "running",
        version: "1.0.0",
        endpoints: [
            "/api/financial-data",
            "/api/stock/:symbol",
            "/api/options/:symbol",
            "/api/predict-stock/:symbol",
            "/api/stock-predictions"
        ]
    });
});

// Financial Data Endpoint
app.get("/api/financial-data", (req, res) => {
    pool.query("SELECT * FROM financial_data", (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ 
                error: "Database Error",
                details: err.message 
            });
        }
        res.json(results);
    });
});

// Stock Data Endpoint
app.get("/api/stock/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `stock_${symbol}`;
    
    try {
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const response = await axios.get(
            `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`,
            { timeout: 8000 }
        );

        if (response.data["Time Series (Daily)"]) {
            cache.put(cacheKey, response.data["Time Series (Daily)"], 600000);
            return res.json(response.data["Time Series (Daily)"]);
        }

        if (response.data.Note?.includes("API call frequency")) {
            return res.status(429).json({
                error: "API limit reached",
                solution: "Use mock data or try again later"
            });
        }

        res.status(404).json({ error: "Stock data not found" });

    } catch (error) {
        console.error("Stock API Error:", error.message);
        res.status(500).json({
            error: "Failed to fetch stock data",
            details: error.message
        });
    }
});

// Enhanced Option Chain Endpoint
app.get("/api/options/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `options_${symbol}`;
    
    try {
        // Try to serve from cache first
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        // Validate symbol format
        if (!symbol.match(/^[A-Z]{1,5}$/)) {
            return res.status(400).json({ error: "Invalid stock symbol" });
        }

        // Attempt real API call
        const response = await axios.get(
            `https://www.alphavantage.co/query?function=OPTION_CHAIN&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`,
            { timeout: 10000 }
        );

        // Handle API limits
        if (response.data.Note?.includes("API call frequency")) {
            console.log("API limit reached, serving mock data");
            return res.json(generateEnhancedMockOptions(symbol));
        }

        // Process successful response
        if (response.data.optionChain?.result?.[0]) {
            const result = processEnhancedOptionsData(response.data.optionChain.result[0]);
            cache.put(cacheKey, result, 300000); // Cache for 5 minutes
            return res.json(result);
        }

        // If no data but no error, serve mock
        return res.json(generateEnhancedMockOptions(symbol));

    } catch (error) {
        console.error("Options API Error:", error.message);
        // On any error, serve mock data
        res.json(generateEnhancedMockOptions(symbol));
    }
});

// Enhanced options data processor
function processEnhancedOptionsData(data) {
    const result = {
        symbol: data.quote.symbol,
        spotPrice: data.quote.regularMarketPrice,
        expirationDates: data.expirationDates,
        calls: [],
        puts: [],
        lastUpdated: new Date().toISOString(),
        isRealData: true
    };

    // Get nearest expiration (you can modify this to show multiple expirations)
    const nearestExpiry = data.expirationDates[0];
    const optionsForExpiry = data.options.find(o => o.expirationDate === nearestExpiry);
    
    if (optionsForExpiry) {
        result.calls = optionsForExpiry.calls.map(call => ({
            strike: call.strike,
            lastPrice: call.lastPrice,
            bid: call.bid,
            ask: call.ask,
            volume: call.volume,
            openInterest: call.openInterest,
            impliedVolatility: call.impliedVolatility,
            expiration: call.expiration
        })).sort((a, b) => a.strike - b.strike);

        result.puts = optionsForExpiry.puts.map(put => ({
            strike: put.strike,
            lastPrice: put.lastPrice,
            bid: put.bid,
            ask: put.ask,
            volume: put.volume,
            openInterest: put.openInterest,
            impliedVolatility: put.impliedVolatility,
            expiration: put.expiration
        })).sort((a, b) => a.strike - b.strike);

        // Also generate bludger patterns for the Quidditch visualization
        result.bludgerPatterns = generateBludgerPatterns(result.calls, result.puts);
    }

    return result;
}

// Enhanced mock data generator
function generateEnhancedMockOptions(symbol) {
    const basePrice = symbol === 'AAPL' ? 150 : 
                     symbol === 'MSFT' ? 300 : 
                     symbol === 'TSLA' ? 700 : 100;
    
    const strikes = [];
    for (let i = -10; i <= 10; i++) {
        strikes.push(basePrice + i * 5);
    }

    const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expirationDates = [
        expirationDate,
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    ];

    const calls = strikes.map(strike => ({
        strike,
        lastPrice: (Math.random() * 10).toFixed(2),
        bid: (Math.random() * 10).toFixed(2),
        ask: (Math.random() * 10 + 0.5).toFixed(2),
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 1000),
        impliedVolatility: (0.2 + Math.random() * 0.3).toFixed(4),
        expiration: expirationDate
    }));

    const puts = strikes.map(strike => ({
        strike,
        lastPrice: (Math.random() * 10).toFixed(2),
        bid: (Math.random() * 10).toFixed(2),
        ask: (Math.random() * 10 + 0.5).toFixed(2),
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 1000),
        impliedVolatility: (0.2 + Math.random() * 0.3).toFixed(4),
        expiration: expirationDate
    }));

    const result = {
        symbol,
        spotPrice: basePrice,
        expirationDates,
        calls: calls.sort((a, b) => a.strike - b.strike),
        puts: puts.sort((a, b) => a.strike - b.strike),
        lastUpdated: new Date().toISOString(),
        isMockData: true,
        bludgerPatterns: generateBludgerPatterns(calls, puts)
    };

    return result;
}

// Generate bludger patterns for Quidditch visualization
function generateBludgerPatterns(calls, puts) {
    const patterns = [];
    
    // Process calls
    calls.forEach(call => {
        patterns.push({
            strike: call.strike,
            type: 'red',
            openInterest: call.openInterest,
            impliedVolatility: call.impliedVolatility,
            expiration: call.expiration,
            isRealData: call.isRealData || false
        });
    });

    // Process puts
    puts.forEach(put => {
        patterns.push({
            strike: put.strike,
            type: 'black',
            openInterest: put.openInterest,
            impliedVolatility: put.impliedVolatility,
            expiration: put.expiration,
            isRealData: put.isRealData || false
        });
    });

    return patterns
        .sort((a, b) => b.openInterest - a.openInterest)
        .slice(0, 100);
}

// Stock Prediction Endpoint
app.get("/api/predict-stock/:symbol", async (req, res) => {
    const { symbol } = req.params;
    
    try {
        const response = await axios.get(`http://localhost:5001/predict/${symbol}`, {
            timeout: 8000
        });

        if (response.data.error) {
            return res.status(400).json(response.data);
        }

        // Store prediction
        pool.query(
            `INSERT INTO stock_predictions (symbol, predicted_price) 
             VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE predicted_price=?`,
            [symbol, response.data.predicted_price, response.data.predicted_price],
            (err) => {
                if (err) console.error("Prediction save error:", err);
            }
        );

        res.json(response.data);

    } catch (error) {
        console.error("Prediction Error:", error.message);
        res.status(500).json({
            error: "Prediction service unavailable",
            details: error.message
        });
    }
});

// Historical Predictions Endpoint
app.get("/api/stock-predictions", (req, res) => {
    pool.query(
        "SELECT * FROM stock_predictions ORDER BY created_at DESC",
        (err, results) => {
            if (err) {
                console.error("Prediction query error:", err);
                return res.status(500).json({ error: "Database error" });
            }
            res.json(results);
        }
    );
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Server Error:", err.stack);
    res.status(500).json({
        error: "Internal Server Error",
        message: err.message
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Available Endpoints:`);
    console.log(`- GET /api/financial-data`);
    console.log(`- GET /api/stock/:symbol`);
    console.log(`- GET /api/options/:symbol`);
    console.log(`- GET /api/predict-stock/:symbol`);
    console.log(`- GET /api/stock-predictions`);
});