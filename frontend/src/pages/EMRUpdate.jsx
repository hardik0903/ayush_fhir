import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Search, User, FileText, CheckCircle, ArrowRight, AlertCircle, Check } from 'lucide-react';

export default function EMRUpdate() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [patient, setPatient] = useState(null);
    const [patientSearch, setPatientSearch] = useState('');
    const [patientResults, setPatientResults] = useState([]);

    const [diagnosisSearch, setDiagnosisSearch] = useState('');
    const [diagnosisResults, setDiagnosisResults] = useState([]);
    const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
    const [selectedICD11, setSelectedICD11] = useState(null);

    const [clinicalNotes, setClinicalNotes] = useState('');
    const [consentGiven, setConsentGiven] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const searchPatients = async () => {
            if (patientSearch.length < 2) {
                setPatientResults([]);
                return;
            }

            try {
                const response = await api.get('/api/patients/search', {
                    params: { query: patientSearch }
                });
                setPatientResults(response.data.patients || []);
            } catch (error) {
                console.error('Patient search error:', error);
                setPatientResults([]);
            }
        };

        const debounce = setTimeout(searchPatients, 300);
        return () => clearTimeout(debounce);
    }, [patientSearch]);

    useEffect(() => {
        const searchDiagnoses = async () => {
            if (diagnosisSearch.length < 2) {
                setDiagnosisResults([]);
                return;
            }

            try {
                const response = await api.get('/api/search/diagnosis', {
                    params: { query: diagnosisSearch, limit: 10 }
                });
                setDiagnosisResults(response.data.results || []);
            } catch (error) {
                console.error('Diagnosis search error:', error);
                setDiagnosisResults([]);
            }
        };

        const debounce = setTimeout(searchDiagnoses, 300);
        return () => clearTimeout(debounce);
    }, [diagnosisSearch]);

    const handleSelectDiagnosis = (diagnosis) => {
        setSelectedDiagnosis(diagnosis);
        if (diagnosis.mappings && diagnosis.mappings.length > 0) {
            setSelectedICD11(diagnosis.mappings[0]);
        } else {
            setSelectedICD11(null);
        }
    };

    const handleSubmit = async () => {
        if (!patient || !selectedDiagnosis || !consentGiven) {
            return;
        }

        setLoading(true);

        try {
            await api.post('/api/treatments', {
                patient_id: patient.id,
                namaste_code: selectedDiagnosis.namaste_code,
                icd11_code: selectedICD11?.icd_code,
                clinical_notes: clinicalNotes,
                consent_given: consentGiven
            });

            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (error) {
            console.error('Error creating treatment:', error);
            alert('Failed to create treatment record');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { number: 1, title: 'Select Patient', icon: User },
        { number: 2, title: 'Choose Diagnosis', icon: Search },
        { number: 3, title: 'Clinical Notes', icon: FileText },
        { number: 4, title: 'Review & Submit', icon: CheckCircle }
    ];

    return (
        <div className="container fade-in" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h1 style={{ marginBottom: 'var(--space-sm)' }}>Update EMR</h1>
                <p style={{ color: 'var(--slate)', fontSize: '1.125rem', margin: 0 }}>
                    Create dual-coded treatment records with FHIR compliance
                </p>
            </div>

            {/* Progress Steps */}
            <div style={{ marginBottom: 'var(--space-3xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {steps.map((s, index) => (
                        <div key={s.number} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: step >= s.number ? 'var(--teal)' : 'var(--mist)',
                                    color: step >= s.number ? 'white' : 'var(--slate)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto var(--space-sm)',
                                    transition: 'all var(--transition-base)'
                                }}>
                                    {step > s.number ? <Check size={24} /> : <s.icon size={24} />}
                                </div>
                                <div style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: step >= s.number ? 'var(--charcoal)' : 'var(--slate)'
                                }}>
                                    {s.title}
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div style={{
                                    height: '2px',
                                    flex: 0.5,
                                    background: step > s.number ? 'var(--teal)' : 'var(--mist)',
                                    transition: 'all var(--transition-base)'
                                }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            {step === 1 && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>Select Patient</h3>
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: 'var(--space-sm)'
                        }}>
                            Search Patient
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
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                placeholder="Search by name or ABHA ID..."
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>

                    {patientResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            {patientResults.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setPatient(p);
                                        setStep(2);
                                    }}
                                    style={{
                                        padding: 'var(--space-md)',
                                        border: '1px solid var(--mist)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--teal)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--mist)'}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--slate)' }}>
                                        ABHA: <code>{p.abha_id}</code>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {step === 2 && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>Choose Diagnosis</h3>
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: 'var(--space-sm)'
                        }}>
                            Search NAMASTE Code
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
                                value={diagnosisSearch}
                                onChange={(e) => setDiagnosisSearch(e.target.value)}
                                placeholder="Search diagnosis..."
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>

                    {diagnosisResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                            {diagnosisResults.map((d, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSelectDiagnosis(d)}
                                    style={{
                                        padding: 'var(--space-md)',
                                        border: selectedDiagnosis?.namaste_code === d.namaste_code ? '2px solid var(--teal)' : '1px solid var(--mist)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        background: selectedDiagnosis?.namaste_code === d.namaste_code ? 'rgba(0, 201, 167, 0.05)' : 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                                        <code style={{ fontWeight: 600 }}>{d.namaste_code}</code>
                                        <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>{d.system_type}</span>
                                    </div>
                                    <div style={{ fontWeight: 500 }}>{d.namaste_display}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                        <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!selectedDiagnosis}>
                            Next <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>Clinical Notes</h3>
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <label style={{
                            display: 'block',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            marginBottom: 'var(--space-sm)'
                        }}>
                            Notes
                        </label>
                        <textarea
                            className="textarea"
                            value={clinicalNotes}
                            onChange={(e) => setClinicalNotes(e.target.value)}
                            placeholder="Enter clinical notes..."
                            rows={6}
                        />
                    </div>

                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem' }}>
                                Patient consent obtained for data sharing
                            </span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                        <button className="btn btn-primary" onClick={() => setStep(4)} disabled={!consentGiven}>
                            Next <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>Review & Submit</h3>

                    {success ? (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--space-3xl)',
                            background: 'rgba(16, 185, 129, 0.05)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--success)'
                        }}>
                            <CheckCircle size={64} style={{ color: 'var(--success)', margin: '0 auto var(--space-lg)' }} />
                            <h3 style={{ color: 'var(--success)', marginBottom: 'var(--space-sm)' }}>Success!</h3>
                            <p style={{ color: 'var(--slate)', margin: 0 }}>Treatment record created successfully</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ background: 'var(--snow)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--slate)', marginBottom: 'var(--space-xs)' }}>Patient</div>
                                    <div style={{ fontWeight: 600 }}>{patient?.name}</div>
                                </div>
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--slate)', marginBottom: 'var(--space-xs)' }}>NAMASTE Code</div>
                                    <div><code>{selectedDiagnosis?.namaste_code}</code> - {selectedDiagnosis?.namaste_display}</div>
                                </div>
                                {selectedICD11 && (
                                    <div style={{ marginBottom: 'var(--space-md)' }}>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate)', marginBottom: 'var(--space-xs)' }}>ICD-11 Mapping</div>
                                        <div><code>{selectedICD11.icd_code}</code> - {selectedICD11.icd_display}</div>
                                    </div>
                                )}
                                {clinicalNotes && (
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate)', marginBottom: 'var(--space-xs)' }}>Clinical Notes</div>
                                        <div style={{ fontSize: '0.875rem' }}>{clinicalNotes}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
                                <button className="btn btn-accent" onClick={handleSubmit} disabled={loading}>
                                    {loading ? 'Submitting...' : 'Submit Record'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
