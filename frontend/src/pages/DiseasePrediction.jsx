import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Activity,
    Search,
    AlertCircle,
    CheckCircle,
    RefreshCw,
    Info,
    Stethoscope,
    ChevronRight,
    TrendingUp,
    Brain
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

const DiseasePrediction = () => {
    const [symptoms, setSymptoms] = useState([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [models, setModels] = useState({});
    const [selectedModel, setSelectedModel] = useState('random_forest');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [predicting, setPredicting] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    const { logout } = useAuth();

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('accessToken');
                const headers = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                };

                const [symptomsRes, modelsRes, historyRes] = await Promise.all([
                    fetch('http://localhost:5000/api/prediction/symptoms', { headers }),
                    fetch('http://localhost:5000/api/prediction/models', { headers }),
                    fetch('http://localhost:5000/api/prediction/history', { headers })
                ]);

                // Handle session expiry
                if (historyRes.status === 401) {
                    console.warn('Session expired, logging out...');
                    logout();
                    return;
                }

                const symptomsData = await symptomsRes.json();
                const modelsData = await modelsRes.json();

                // Safely handle history
                let historyData = { history: [] };
                if (historyRes.ok) {
                    historyData = await historyRes.json();
                }

                setSymptoms(symptomsData.symptoms || []);
                setModels(modelsData.models || {});
                setHistory(historyData.history || []);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load initial data. Please ensure the backend is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [logout]);

    const handleSymptomToggle = (symptom) => {
        if (selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
        } else {
            setSelectedSymptoms([...selectedSymptoms, symptom]);
        }
    };

    const handlePredict = async () => {
        console.log('Starting prediction for:', selectedSymptoms);
        if (selectedSymptoms.length < 2) {
            setError('Please select at least 2 symptoms for accurate prediction');
            return;
        }

        try {
            setPredicting(true);
            setError(null);
            setPrediction(null);

            const token = localStorage.getItem('accessToken');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const response = await fetch('http://localhost:5000/api/prediction/disease', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    symptoms: selectedSymptoms,
                    model: selectedModel
                })
            });

            console.log('Prediction response status:', response.status);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Prediction failed');
            }

            console.log('Prediction success:', data);
            setPrediction(data);

            // Refresh history
            const historyRes = await fetch('http://localhost:5000/api/prediction/history', { headers });

            if (historyRes.status === 401) {
                // If 401 on history update, just logout - session invalid
                logout();
                return;
            }

            if (historyRes.ok) {
                const historyData = await historyRes.json();
                setHistory(historyData.history || []);
            }

        } catch (err) {
            console.error('Prediction error:', err);
            setError(err.message);
        } finally {
            setPredicting(false);
        }
    };

    const filteredSymptoms = symptoms.filter(s =>
        s.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return 'var(--success)';
        if (confidence >= 0.5) return 'var(--warning)';
        return 'var(--error)';
    };

    if (loading) {
        return (
            <div className="container fade-in">
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '1rem', color: 'var(--slate)', fontFamily: 'var(--font-display)' }}>
                        Loading prediction engine...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container fade-in" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>

            {/* Header */}
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-lg)' }}>
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-xs)' }}>
                            <Stethoscope size={36} style={{ color: 'var(--primary)' }} />
                            Disease Prediction
                        </h1>
                        <p style={{ color: 'var(--slate)', fontSize: '1.125rem', margin: 0 }}>
                            AI-powered symptom analysis using multi-model machine learning
                        </p>
                    </div>

                    <div className="card" style={{ padding: 'var(--space-md)', background: 'var(--snow)', maxWidth: '400px', border: '1px solid var(--info)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <Info size={20} style={{ color: 'var(--info)', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ fontSize: '0.875rem', color: 'var(--deep-navy)', margin: 0, lineHeight: 1.5 }}>
                                <strong>Medical Disclaimer:</strong> This tool is for educational purposes only. Results are generated by ML models and should not replace professional medical advice.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--space-xl)' }}>

                {/* Left Column: Input Section */}
                <div style={{ gridColumn: 'span 7' }}>

                    {/* Symptoms Selection */}
                    <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="card-title">Symptom Analysis</h3>
                            <span className="badge badge-info">
                                {selectedSymptoms.length} Selected
                            </span>
                        </div>

                        <div style={{ marginBottom: 'var(--space-lg)', position: 'relative' }}>
                            <Search className="absolute" size={18} style={{ color: 'var(--slate)', position: 'absolute', left: '12px', top: '12px' }} />
                            <input
                                type="text"
                                placeholder="Search symptoms (e.g., headache, fatigue, nausea)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input"
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>

                        {/* Selected Symptoms Chips */}
                        {selectedSymptoms.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--snow)', borderRadius: 'var(--radius-md)' }}>
                                {selectedSymptoms.map(symptom => (
                                    <span
                                        key={symptom}
                                        className="badge"
                                        style={{ background: 'var(--slate-blue)', color: 'white', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {symptom}
                                        <button
                                            onClick={() => handleSymptomToggle(symptom)}
                                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex' }}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                                <button
                                    onClick={() => setSelectedSymptoms([])}
                                    style={{ background: 'none', border: 'none', color: 'var(--error)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                    Clear all
                                </button>
                            </div>
                        )}

                        {/* Symptoms List */}
                        <div style={{
                            height: '400px',
                            overflowY: 'auto',
                            border: '1px solid var(--mist)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            {filteredSymptoms.length === 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--slate)' }}>
                                    No symptoms found matching "{searchTerm}"
                                </div>
                            ) : (
                                filteredSymptoms.map(symptom => (
                                    <div
                                        key={symptom}
                                        onClick={() => handleSymptomToggle(symptom)}
                                        style={{
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderBottom: '1px solid var(--snow)',
                                            background: selectedSymptoms.includes(symptom) ? 'rgba(0, 201, 167, 0.05)' : 'transparent',
                                            color: selectedSymptoms.includes(symptom) ? 'var(--deep-navy)' : 'var(--charcoal)',
                                            fontWeight: selectedSymptoms.includes(symptom) ? '600' : '400',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!selectedSymptoms.includes(symptom)) e.currentTarget.style.background = 'var(--snow)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!selectedSymptoms.includes(symptom)) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <span style={{ textTransform: 'capitalize' }}>{symptom.replaceAll('_', ' ')}</span>
                                        {selectedSymptoms.includes(symptom) && (
                                            <CheckCircle size={18} style={{ color: 'var(--teal)' }} />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Model Selection & Action */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-md)' }}>Select Model</h3>
                        <div className="grid grid-2" style={{ marginBottom: 'var(--space-lg)' }}>
                            {Object.entries(models).map(([key, info]) => (
                                <div
                                    key={key}
                                    onClick={() => setSelectedModel(key)}
                                    style={{
                                        padding: 'var(--space-md)',
                                        borderRadius: 'var(--radius-md)',
                                        border: selectedModel === key ? '2px solid var(--teal)' : '1px solid var(--mist)',
                                        background: selectedModel === key ? 'rgba(0, 201, 167, 0.02)' : 'var(--white)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{info.name}</span>
                                        {info.recommended && (
                                            <span className="badge badge-success" style={{ fontSize: '0.625rem' }}>RECOMMENDED</span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--slate)', margin: 0 }}>{info.description}</p>
                                </div>
                            ))}
                            <div
                                onClick={() => setSelectedModel('all')}
                                style={{
                                    padding: 'var(--space-md)',
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedModel === 'all' ? '2px solid var(--teal)' : '1px solid var(--mist)',
                                    background: selectedModel === 'all' ? 'rgba(0, 201, 167, 0.02)' : 'var(--white)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Ensemble Comparison</span>
                                    <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>ADVANCED</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--slate)', margin: 0 }}>Run all models simultaneously to compare predictions</p>
                            </div>
                        </div>

                        <button
                            onClick={handlePredict}
                            disabled={predicting || selectedSymptoms.length < 2}
                            className={`btn ${predicting || selectedSymptoms.length < 2 ? 'btn-secondary' : 'btn-accent'}`}
                            style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
                        >
                            {predicting ? (
                                <>
                                    <RefreshCw className="spinner" size={20} style={{ borderTopColor: 'currentColor', width: '20px', height: '20px', borderWidth: '2px' }} />
                                    Processing Analysis...
                                </>
                            ) : (
                                <>
                                    <Brain size={20} />
                                    Generate Prediction
                                </>
                            )}
                        </button>

                        {error && (
                            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                <AlertCircle size={20} />
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>{error}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Results & History */}
                <div style={{ gridColumn: 'span 5' }}>

                    {/* Prediction Result */}
                    {prediction && (
                        <div className="card fade-in" style={{ marginBottom: 'var(--space-lg)', borderTop: '4px solid var(--teal)' }}>
                            <div className="card-header">
                                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <Activity size={20} style={{ color: 'var(--teal)' }} />
                                    Clinical Assessment
                                </h3>
                            </div>

                            {selectedModel === 'all' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    {Object.entries(prediction.predictions).map(([model, result]) => (
                                        <div key={model} style={{ padding: 'var(--space-md)', background: 'var(--snow)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                                                    {model.replace('_', ' ')}
                                                </span>
                                                <span style={{
                                                    fontWeight: 700,
                                                    color: getConfidenceColor(result.confidence),
                                                    fontFamily: 'var(--font-display)'
                                                }}>
                                                    {(result.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--deep-navy)' }}>
                                                {result.disease}
                                            </div>
                                            <div style={{ marginTop: '8px', height: '4px', background: 'var(--mist)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${result.confidence * 100}%`,
                                                    height: '100%',
                                                    background: getConfidenceColor(result.confidence)
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--space-xs)' }}>
                                        Primary Diagnosis
                                    </div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--deep-navy)', marginBottom: 'var(--space-md)', lineHeight: 1.2 }}>
                                        {prediction.prediction}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
                                        <div style={{
                                            padding: '8px 16px',
                                            borderRadius: 'var(--radius-full)',
                                            background: `rgba(0,0,0,0.05)`, /* Fallback if var doesn't work in rgba */
                                            border: `1px solid ${getConfidenceColor(prediction.confidence)}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getConfidenceColor(prediction.confidence) }} />
                                            <span style={{ fontWeight: 600, color: 'var(--deep-navy)', fontSize: '0.875rem' }}>
                                                {(prediction.confidence * 100).toFixed(1)}% Confidence
                                            </span>
                                        </div>
                                    </div>

                                    {data_visualization(prediction.confidence)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Assessments</h3>
                        </div>
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {history.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--slate)', padding: 'var(--space-xl) 0' }}>No history available</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    {history.map((item, idx) => (
                                        <div key={item.id || idx} style={{ padding: 'var(--space-md)', border: '1px solid var(--mist)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 600, color: 'var(--deep-navy)' }}>{item.predicted_disease}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                                {item.symptoms.slice(0, 3).map((sym, i) => (
                                                    <span key={i} style={{ fontSize: '0.75rem', background: 'var(--snow)', padding: '2px 6px', borderRadius: '4px', color: 'var(--charcoal)' }}>
                                                        {sym}
                                                    </span>
                                                ))}
                                                {item.symptoms.length > 3 && (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>+{item.symptoms.length - 3}</span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                                <span style={{ textTransform: 'capitalize', color: 'var(--slate)' }}>{item.model_used.replace('_', ' ')}</span>
                                                <span style={{ fontWeight: 600, color: getConfidenceColor(item.confidence) }}>
                                                    {(item.confidence * 100).toFixed(0)}% Conf.
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// Helper for single prediction visualization
const data_visualization = (confidence) => (
    <div style={{ height: '80px', width: '100%', marginTop: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={[{ name: 'Confidence', value: confidence * 100 }]}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" hide />
                <Bar dataKey="value" barSize={20} radius={[4, 4, 4, 4]}>
                    <Cell fill={confidence >= 0.8 ? 'var(--success)' : confidence >= 0.5 ? 'var(--warning)' : 'var(--error)'} />
                </Bar>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--mist)" />
            </BarChart>
        </ResponsiveContainer>
    </div>
);

export default DiseasePrediction;
