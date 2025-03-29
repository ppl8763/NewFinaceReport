import React from 'react';
import './OptionChain.css';

const OptionChain = ({ data, spotPrice }) => {
    if (!data || !data.calls || !data.puts) return <div>No options data available</div>;

    // Find common strikes between calls and puts
    const commonStrikes = [...new Set([
        ...data.calls.map(c => c.strike),
        ...data.puts.map(p => p.strike)
    ])].sort((a, b) => a - b);

    return (
        <div className="option-chain-container">
            <h3>📊 Option Chain</h3>
            <div className="spot-price">
                Current Price: ${spotPrice?.toFixed(2) || 'N/A'}
            </div>
            <div className="option-chain-header">
                <div className="calls-header">Calls</div>
                <div className="strike-header">Strike</div>
                <div className="puts-header">Puts</div>
            </div>
            
            <div className="option-chain-table">
                {commonStrikes.map((strike, index) => {
                    const call = data.calls.find(c => c.strike === strike);
                    const put = data.puts.find(p => p.strike === strike);
                    const isATM = spotPrice && Math.abs(strike - spotPrice) < (spotPrice * 0.01);
                    
                    return (
                        <div 
                            key={index} 
                            className={`option-chain-row ${isATM ? 'atm-row' : ''}`}
                        >
                            <div className="calls-data">
                                {call ? (
                                    <>
                                        <div>{call.bid} x {call.ask}</div>
                                        <div>Vol: {call.volume}</div>
                                        <div>OI: {call.openInterest}</div>
                                        <div>IV: {(call.impliedVolatility * 100).toFixed(2)}%</div>
                                    </>
                                ) : <div>-</div>}
                            </div>
                            
                            <div className="strike-data">
                                {strike.toFixed(2)}
                            </div>
                            
                            <div className="puts-data">
                                {put ? (
                                    <>
                                        <div>{put.bid} x {put.ask}</div>
                                        <div>Vol: {put.volume}</div>
                                        <div>OI: {put.openInterest}</div>
                                        <div>IV: {(put.impliedVolatility * 100).toFixed(2)}%</div>
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

export default OptionChain;