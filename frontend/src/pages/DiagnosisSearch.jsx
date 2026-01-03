import { useState } from 'react';
import api from '../services/api';
import { Search, ArrowRight, Sparkles, Info } from 'lucide-react';

export default function DiagnosisSearch() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState('namaste');
    const [results, setResults] = useState([]);
    const [selectedCode, setSelectedCode] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (query) => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/api/terminology/${searchType}/search`, {
                params: { q: query }
            });
            setResults(response.data.results || []);
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        }
        setLoading(false);
    };

    const handleSelectCode = async (code) => {
        setSelectedCode(code);

        if (searchType === 'namaste') {
            try {
                const response = await api.get('/api/terminology/concept-map/translate', {
                    params: {
                        system: 'namaste',
                        code: code.code
                    }
                });
                setMappings(response.data.mappings || []);
            } catch (error) {
                console.error('Mapping error:', error);
                setMappings([]);
            }
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.9) return 'var(--success)';
        if (confidence >= 0.7) return 'var(--warning)';
        return 'var(--error)';
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
                <h1 style={{ marginBottom: 'var(--space-sm)' }}>Diagnosis Search</h1>
                <p style={{ color: 'var(--slate)', fontSize: '1.125rem', margin: 0 }}>
                    Search traditional medicine codes with AI-powered semantic matching
                </p>
            </div>

            {/* Search Section */}
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <label style={{
                        display: 'block',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: 'var(--space-sm)',
                        color: 'var(--charcoal)'
                    }}>
                        Search Type
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button
                            className={`btn ${searchType === 'namaste' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => {
                                setSearchType('namaste');
                                setResults([]);
                                setSelectedCode(null);
                                setMappings([]);
                            }}
                        >
                            NAMASTE Codes
                        </button>
                        <button
                            className={`btn ${searchType === 'icd11' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => {
                                setSearchType('icd11');
                                setResults([]);
                                setSelectedCode(null);
                                setMappings([]);
                            }}
                        >
                            ICD-11 Codes
                        </button>
                    </div>
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
                        Search Query
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--slate)'
                        }} />
                        <input
                            type="text"
                            className="input"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            placeholder={`Search ${searchType === 'namaste' ? 'traditional medicine' : 'ICD-11'} codes...`}
                            style={{ paddingLeft: '40px' }}
                        />
                        {loading && (
                            <div style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)'
                            }}>
                                <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
                {/* Search Results */}
                <div>
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>
                        Search Results
                        {results.length > 0 && (
                            <span style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.875rem',
                                fontWeight: 400,
                                color: 'var(--slate)',
                                marginLeft: 'var(--space-sm)'
                            }}>
                                ({results.length} found)
                            </span>
                        )}
                    </h3>

                    {results.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {results.map((result, index) => (
                                <div
                                    key={index}
                                    className="card"
                                    onClick={() => handleSelectCode(result)}
                                    style={{
                                        cursor: 'pointer',
                                        padding: 'var(--space-md)',
                                        border: selectedCode?.id === result.id ? '2px solid var(--teal)' : undefined,
                                        background: selectedCode?.id === result.id ? 'rgba(0, 201, 167, 0.05)' : undefined
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-sm)' }}>
                                        <code style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                            {searchType === 'namaste' ? result.code : result.icd_code}
                                        </code>
                                        {result.system_type && (
                                            <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                                                {result.system_type}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: 'var(--space-xs)' }}>
                                        {searchType === 'namaste' ? result.display : result.title}
                                    </div>
                                    {result.definition && (
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate)' }}>
                                            {result.definition}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : searchQuery.length >= 2 && !loading ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                            <Search size={48} style={{ color: 'var(--mist)', margin: '0 auto var(--space-md)' }} />
                            <p style={{ color: 'var(--slate)', margin: 0 }}>No results found</p>
                        </div>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                            <Sparkles size={48} style={{ color: 'var(--mist)', margin: '0 auto var(--space-md)' }} />
                            <p style={{ color: 'var(--slate)', margin: 0 }}>Start typing to search</p>
                        </div>
                    )}
                </div>

                {/* Mappings */}
                <div>
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>
                        ICD-11 Mappings
                        {mappings.length > 0 && (
                            <span style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.875rem',
                                fontWeight: 400,
                                color: 'var(--slate)',
                                marginLeft: 'var(--space-sm)'
                            }}>
                                ({mappings.length} found)
                            </span>
                        )}
                    </h3>

                    {selectedCode && searchType === 'namaste' ? (
                        mappings.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                {mappings.map((mapping, index) => (
                                    <div key={index} className="card" style={{ padding: 'var(--space-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-sm)' }}>
                                            <code style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                                {mapping.target_code}
                                            </code>
                                            <span className={`badge ${getConfidenceBadge(mapping.confidence)}`}>
                                                {(mapping.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.9375rem', fontWeight: 500, marginBottom: 'var(--space-sm)' }}>
                                            {mapping.target_display}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)',
                                            fontSize: '0.8125rem',
                                            color: 'var(--slate)'
                                        }}>
                                            <Info size={14} />
                                            <span>Equivalence: {mapping.equivalence || 'equivalent'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                                <Info size={48} style={{ color: 'var(--mist)', margin: '0 auto var(--space-md)' }} />
                                <p style={{ color: 'var(--slate)', margin: 0 }}>No mappings available</p>
                            </div>
                        )
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                            <ArrowRight size={48} style={{ color: 'var(--mist)', margin: '0 auto var(--space-md)' }} />
                            <p style={{ color: 'var(--slate)', margin: 0 }}>Select a code to view mappings</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Card */}
            <div className="card" style={{ background: 'var(--snow)', border: '1px solid var(--mist)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <Info size={24} style={{ color: 'var(--info)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: 'var(--space-sm)' }}>About Semantic Search</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--slate)', margin: 0, lineHeight: 1.6 }}>
                            Our AI-powered search uses BioBERT to understand medical terminology semantically.
                            Search by symptoms, treatments, or diagnoses to find relevant traditional medicine codes
                            and their ICD-11 mappings with confidence scores.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
