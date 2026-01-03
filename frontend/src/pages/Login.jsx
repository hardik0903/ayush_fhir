import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
    const [abhaId, setAbhaId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(abhaId, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--slate-blue) 0%, var(--deep-navy) 100%)',
            padding: 'var(--space-xl)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '440px'
            }}>
                {/* Logo & Title */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
                    <img
                        src="/logo.png"
                        alt="MediSync"
                        style={{
                            width: '64px',
                            height: '64px',
                            margin: '0 auto var(--space-md)'
                        }}
                    />
                    <h1 style={{ color: 'white', marginBottom: 'var(--space-sm)' }}>
                        MediSync
                    </h1>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1rem', margin: 0 }}>
                        Healthcare Interoperability Platform
                    </p>
                </div>

                {/* Login Card */}
                <div className="card" style={{ padding: 'var(--space-2xl)' }}>
                    <h2 style={{ marginBottom: 'var(--space-sm)', fontSize: '1.5rem' }}>
                        Sign In
                    </h2>
                    <p style={{ color: 'var(--slate)', marginBottom: 'var(--space-xl)', fontSize: '0.9375rem' }}>
                        Enter your credentials to access the platform
                    </p>

                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--error)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-md)',
                            marginBottom: 'var(--space-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-sm)'
                        }}>
                            <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.875rem', color: 'var(--error)' }}>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 'var(--space-lg)' }}>
                            <label style={{
                                display: 'block',
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                marginBottom: 'var(--space-sm)',
                                color: 'var(--charcoal)'
                            }}>
                                ABHA ID
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--slate)'
                                }} />
                                <input
                                    type="text"
                                    className="input"
                                    value={abhaId}
                                    onChange={(e) => setAbhaId(e.target.value)}
                                    placeholder="Enter your ABHA ID"
                                    required
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: 'var(--space-xl)' }}>
                            <label style={{
                                display: 'block',
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                marginBottom: 'var(--space-sm)',
                                color: 'var(--charcoal)'
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--slate)'
                                }} />
                                <input
                                    type="password"
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', marginBottom: 'var(--space-md)' }}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>


                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        © 2026 MediSync. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
