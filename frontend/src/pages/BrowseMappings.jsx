import { useState, useEffect } from 'react';
import api from '../services/api';
import { Filter, Download, ChevronLeft, ChevronRight, Activity } from 'lucide-react';

export default function BrowseMappings() {
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        system: 'all',
        minConfidence: 0
    });

    useEffect(() => {
        loadMappings();
    }, [page, filters]);

    const loadMappings = async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 20,
                ...(filters.system !== 'all' && { system: filters.system }),
                ...(filters.minConfidence > 0 && { minConfidence: filters.minConfidence })
            };

            const response = await api.get('/api/terminology/concept-map', { params });
            setMappings(response.data.mappings || []);
            setTotalPages(Math.ceil((response.data.total || 0) / 20));
        } catch (error) {
            console.error('Error loading mappings:', error);
        }
        setLoading(false);
    };

    const exportCSV = () => {
        const csvData = [
            ['NAMASTE Code', 'Display', 'System', 'ICD-11 Code', 'ICD-11 Title', 'Confidence', 'Equivalence'],
            ...mappings.map(m => [
                m.source_code,
                m.source_display,
                m.system_type,
                m.target_code,
                m.target_display,
                (m.confidence * 100).toFixed(0) + '%',
                m.equivalence
            ])
        ];

        const csv = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medisync-mappings-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getConfidenceBadge = (confidence) => {
        if (confidence >= 0.9) return 'badge-success';
        if (confidence >= 0.7) return 'badge-warning';
        return 'badge-error';
    };

    return (
        <div className="container fade-in" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                    <div>
                        <h1 style={{ marginBottom: 'var(--space-sm)' }}>Browse Mappings</h1>
                        <p style={{ color: 'var(--slate)', fontSize: '1.125rem', margin: 0 }}>
                            Explore the comprehensive ConceptMap database
                        </p>
                    </div>
                    <button className="btn btn-secondary" onClick={exportCSV}>
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                    <Filter size={20} style={{ color: 'var(--slate)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Filters</h3>
                </div>

                <div className="grid grid-2">
                    <div>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: 'var(--space-sm)',
                            color: 'var(--charcoal)'
                        }}>
                            System Type
                        </label>
                        <select
                            className="input"
                            value={filters.system}
                            onChange={(e) => {
                                setFilters({ ...filters, system: e.target.value });
                                setPage(1);
                            }}
                        >
                            <option value="all">All Systems</option>
                            <option value="ayurveda">Ayurveda</option>
                            <option value="siddha">Siddha</option>
                            <option value="unani">Unani</option>
                        </select>
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: 'var(--space-sm)',
                            color: 'var(--charcoal)'
                        }}>
                            Minimum Confidence
                        </label>
                        <select
                            className="input"
                            value={filters.minConfidence}
                            onChange={(e) => {
                                setFilters({ ...filters, minConfidence: parseFloat(e.target.value) });
                                setPage(1);
                            }}
                        >
                            <option value="0">All Confidence Levels</option>
                            <option value="0.9">High (≥90%)</option>
                            <option value="0.7">Medium (≥70%)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Mappings Table */}
            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                    <div className="spinner" style={{ margin: '0 auto var(--space-md)' }} />
                    <p style={{ color: 'var(--slate)', margin: 0 }}>Loading mappings...</p>
                </div>
            ) : mappings.length > 0 ? (
                <>
                    <div className="card">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>NAMASTE Code</th>
                                        <th>Display</th>
                                        <th>System</th>
                                        <th>ICD-11 Code</th>
                                        <th>ICD-11 Title</th>
                                        <th>Confidence</th>
                                        <th>Equivalence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappings.map((mapping, index) => (
                                        <tr key={index}>
                                            <td><code>{mapping.source_code}</code></td>
                                            <td>{mapping.source_display}</td>
                                            <td>
                                                <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                                                    {mapping.system_type}
                                                </span>
                                            </td>
                                            <td><code>{mapping.target_code}</code></td>
                                            <td>{mapping.target_display}</td>
                                            <td>
                                                <span className={`badge ${getConfidenceBadge(mapping.confidence)}`}>
                                                    {(mapping.confidence * 100).toFixed(0)}%
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8125rem', color: 'var(--slate)' }}>
                                                {mapping.equivalence || 'equivalent'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 'var(--space-xl)'
                    }}>
                        <p style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.875rem',
                            color: 'var(--slate)',
                            margin: 0
                        }}>
                            Page {page} of {totalPages}
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={18} />
                                Previous
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                    <Activity size={48} style={{ color: 'var(--mist)', margin: '0 auto var(--space-md)' }} />
                    <p style={{ color: 'var(--slate)', margin: 0 }}>No mappings found with current filters</p>
                </div>
            )}
        </div>
    );
}
