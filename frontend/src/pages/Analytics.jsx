import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Users, Target, Download, Calendar } from 'lucide-react';

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [heatmapData, setHeatmapData] = useState([]);
    const [trendsData, setTrendsData] = useState([]);
    const [distributionData, setDistributionData] = useState([]);
    const [topCodes, setTopCodes] = useState([]);
    const [qualityMetrics, setQualityMetrics] = useState(null);
    const [timeRange, setTimeRange] = useState('30');

    useEffect(() => {
        loadAnalytics();
    }, [timeRange]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const [heatmap, trends, distribution, codes, quality] = await Promise.all([
                api.get('/api/analytics/heatmap', { params: { limit: 20 } }),
                api.get('/api/analytics/trends', { params: { days: timeRange } }),
                api.get('/api/analytics/distribution'),
                api.get('/api/analytics/top-codes', { params: { limit: 10 } }),
                api.get('/api/analytics/mapping-quality')
            ]);

            setHeatmapData(heatmap.data.heatmap || []);
            setTrendsData(trends.data.trends || []);
            setDistributionData(distribution.data.distribution || []);
            setTopCodes(codes.data.topCodes || []);
            setQualityMetrics(quality.data.quality);
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
        setLoading(false);
    };

    const COLORS = {
        ayurveda: '#EF4444',
        siddha: '#3B82F6',
        unani: '#F59E0B',
        high: '#10B981',
        medium: '#F59E0B',
        low: '#EF4444'
    };

    const exportData = () => {
        const csvData = [
            ['NAMASTE Code', 'ICD-11 Code', 'Usage Count', 'Confidence'],
            ...heatmapData.map(row => [
                row.namaste_code,
                row.icd_code,
                row.usage_count,
                row.avg_confidence
            ])
        ];

        const csv = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medisync-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="container fade-in">
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        Loading analytics data...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container fade-in" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h1 style={{ marginBottom: '0.5rem' }}>Analytics Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', margin: 0 }}>
                            Comprehensive insights into mapping usage, trends, and quality metrics
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="input"
                                style={{ width: 'auto', padding: '0.5rem 1rem' }}
                            >
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="365">Last year</option>
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={exportData}>
                            <Download size={18} />
                            Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Quality Metrics Cards */}
            {qualityMetrics && (
                <div className="grid grid-4" style={{ marginBottom: '3rem' }}>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <Target size={32} style={{ color: 'var(--success)', margin: '0 auto 1rem' }} />
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            {qualityMetrics.avgConfidence}%
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                            Average Confidence
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <Activity size={32} style={{ color: 'var(--info)', margin: '0 auto 1rem' }} />
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            {qualityMetrics.total}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                            Total Mappings
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <Users size={32} style={{ color: 'var(--warning)', margin: '0 auto 1rem' }} />
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            {qualityMetrics.verified}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                            Verified Mappings
                        </div>
                    </div>
                    <div className="card" style={{ textAlign: 'center' }}>
                        <TrendingUp size={32} style={{ color: 'var(--accent)', margin: '0 auto 1rem' }} />
                        <div style={{ fontSize: '2.5rem', fontWeight: '700', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                            {qualityMetrics.verificationRate}%
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
                            Verification Rate
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-2" style={{ marginBottom: '3rem' }}>
                {/* Trends Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Treatment Trends</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis
                                dataKey="period"
                                stroke="var(--text-secondary)"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                            />
                            <YAxis
                                stroke="var(--text-secondary)"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.875rem'
                                }}
                            />
                            <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }} />
                            <Line
                                type="monotone"
                                dataKey="total_treatments"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                name="Treatments"
                                dot={{ fill: 'var(--primary)', r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="unique_patients"
                                stroke="var(--accent)"
                                strokeWidth={3}
                                name="Patients"
                                dot={{ fill: 'var(--accent)', r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* System Distribution */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">System Distribution</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={distributionData}
                                dataKey="treatment_count"
                                nameKey="system_type"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.system_type}: ${entry.treatment_count}`}
                                labelStyle={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: '600' }}
                            >
                                {distributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.system_type] || '#999'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Codes */}
            <div className="card" style={{ marginBottom: '3rem' }}>
                <div className="card-header">
                    <h3 className="card-title">Most Frequently Used Codes</h3>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topCodes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis
                            dataKey="code"
                            stroke="var(--text-secondary)"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                        />
                        <YAxis
                            stroke="var(--text-secondary)"
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.875rem'
                            }}
                        />
                        <Legend wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }} />
                        <Bar dataKey="usage_count" fill="var(--primary)" name="Usage Count" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="patient_count" fill="var(--accent)" name="Unique Patients" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Heatmap Table */}
            <div className="card" style={{ marginBottom: '3rem' }}>
                <div className="card-header">
                    <h3 className="card-title">Mapping Heatmap</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>NAMASTE Code</th>
                                <th>Display Name</th>
                                <th>ICD-11 Code</th>
                                <th>ICD-11 Title</th>
                                <th>Usage Count</th>
                                <th>Confidence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {heatmapData.map((row, index) => (
                                <tr key={index}>
                                    <td><code>{row.namaste_code}</code></td>
                                    <td>{row.namaste_display}</td>
                                    <td><code>{row.icd_code}</code></td>
                                    <td>{row.icd_title}</td>
                                    <td>
                                        <span className="badge badge-info">
                                            {row.usage_count}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${row.avg_confidence >= 0.9 ? 'badge-success' :
                                                row.avg_confidence >= 0.7 ? 'badge-warning' : 'badge-error'
                                            }`}>
                                            {(row.avg_confidence * 100).toFixed(0)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Confidence Distribution */}
            {qualityMetrics && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Confidence Score Distribution</h3>
                    </div>
                    <div className="grid grid-3">
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{
                                fontSize: '3.5rem',
                                fontWeight: '700',
                                fontFamily: 'var(--font-mono)',
                                color: COLORS.high,
                                marginBottom: '0.5rem'
                            }}>
                                {qualityMetrics.distribution.high}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                                High Confidence (≥90%)
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{
                                fontSize: '3.5rem',
                                fontWeight: '700',
                                fontFamily: 'var(--font-mono)',
                                color: COLORS.medium,
                                marginBottom: '0.5rem'
                            }}>
                                {qualityMetrics.distribution.medium}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                                Medium Confidence (70-89%)
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{
                                fontSize: '3.5rem',
                                fontWeight: '700',
                                fontFamily: 'var(--font-mono)',
                                color: COLORS.low,
                                marginBottom: '0.5rem'
                            }}>
                                {qualityMetrics.distribution.low}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                                Low Confidence (&lt;70%)
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
