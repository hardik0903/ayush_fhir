import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DiagnosisSearch from './pages/DiagnosisSearch';
import Mapping3D from './pages/Mapping3D';
import EMRUpdate from './pages/EMRUpdate';
import BrowseMappings from './pages/BrowseMappings';
import Analytics from './pages/Analytics';
import DiseasePrediction from './pages/DiseasePrediction';
import { LogOut, LayoutDashboard, Search, Box, FileText, Activity, TrendingUp, Github, Linkedin, ExternalLink, Stethoscope } from 'lucide-react';
import './styles/index.css';
import './styles/home.css';

// Protected Route
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div className="spinner" />
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
}

// Protected Layout
function Layout({ children }) {
    const { user, logout } = useAuth();

    return (
        <div>
            <nav className="navbar">
                <div className="navbar-content">
                    <Link to="/dashboard" className="navbar-brand">
                        <img src="/logo.png" alt="MediSync" className="navbar-logo" />
                        <h1 className="navbar-title">MediSync</h1>
                    </Link>

                    <ul className="navbar-nav">
                        <li>
                            <Link to="/dashboard" className="navbar-link">
                                <LayoutDashboard size={18} />
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link to="/search" className="navbar-link">
                                <Search size={18} />
                                Search
                            </Link>
                        </li>
                        <li>
                            <Link to="/prediction" className="navbar-link">
                                <Stethoscope size={18} />
                                Prediction
                            </Link>
                        </li>
                        <li>
                            <Link to="/analytics" className="navbar-link">
                                <TrendingUp size={18} />
                                Analytics
                            </Link>
                        </li>
                        <li>
                            <Link to="/mapping-3d" className="navbar-link">
                                <Box size={18} />
                                3D View
                            </Link>
                        </li>
                        <li>
                            <Link to="/browse" className="navbar-link">
                                <Activity size={18} />
                                Browse
                            </Link>
                        </li>
                        <li>
                            <Link to="/emr" className="navbar-link">
                                <FileText size={18} />
                                EMR
                            </Link>
                        </li>
                    </ul>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <span style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.875rem',
                            color: 'var(--slate)'
                        }}>
                            {user?.name}
                        </span>
                        <button
                            onClick={logout}
                            className="btn btn-secondary btn-sm"
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main style={{ minHeight: 'calc(100vh - 72px)' }}>
                {children}
            </main>

            <footer className="footer">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-section">
                            <h4>MediSync</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--slate)', lineHeight: 1.6 }}>
                                Bridging traditional medicine with modern healthcare through intelligent FHIR-compliant code mapping.
                            </p>
                        </div>

                        <div className="footer-section">
                            <h4>Platform</h4>
                            <ul className="footer-links">
                                <li><Link to="/dashboard">Dashboard</Link></li>
                                <li><Link to="/search">Search</Link></li>
                                <li><Link to="/prediction">Prediction</Link></li>
                                <li><Link to="/analytics">Analytics</Link></li>
                                <li><Link to="/browse">Browse</Link></li>
                            </ul>
                        </div>

                        <div className="footer-section">
                            <h4>Resources</h4>
                            <ul className="footer-links">
                                <li><a href="https://www.hl7.org/fhir/" target="_blank" rel="noopener noreferrer">FHIR Spec</a></li>
                                <li><a href="https://icd.who.int/browse11" target="_blank" rel="noopener noreferrer">ICD-11</a></li>
                                <li><a href="https://github.com/hardik0903" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                            </ul>
                        </div>

                        <div className="footer-section">
                            <h4>Developer</h4>
                            <h4>Developer</h4>
                            <ul className="footer-links">
                                <li><a href="#" className="isDisabled">MediSync Team</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>© 2026 MediSync. All rights reserved.</p>
                        <p>FHIR R4 Compliant | Comprehensive Audit Trails</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

// Public Layout
function PublicLayout({ children }) {
    return (
        <div>
            <nav className="navbar">
                <div className="navbar-content">
                    <Link to="/" className="navbar-brand">
                        <img src="/logo.png" alt="MediSync" className="navbar-logo" />
                        <h1 className="navbar-title">MediSync</h1>
                    </Link>

                    <ul className="navbar-nav">
                        <li>
                            <a href="#features" className="navbar-link">Features</a>
                        </li>
                        <li>
                            <a href="#technology" className="navbar-link">Technology</a>
                        </li>
                        <li>
                            <a href="#about" className="navbar-link">About</a>
                        </li>
                    </ul>

                    <div>
                        <Link to="/login" className="btn btn-primary">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            <main>
                {children}
            </main>

            <footer className="footer">
                <div className="container">
                    <div className="footer-bottom">
                        <p>© 2026 MediSync. All rights reserved.</p>
                        <div className="social-links">
                            {/* Social links removed for deployment */}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                    <Route path="/login" element={<Login />} />

                    <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                    <Route path="/search" element={<ProtectedRoute><Layout><DiagnosisSearch /></Layout></ProtectedRoute>} />
                    <Route path="/prediction" element={<ProtectedRoute><Layout><DiseasePrediction /></Layout></ProtectedRoute>} />
                    <Route path="/mapping-3d" element={<ProtectedRoute><Layout><Mapping3D /></Layout></ProtectedRoute>} />
                    <Route path="/emr" element={<ProtectedRoute><Layout><EMRUpdate /></Layout></ProtectedRoute>} />
                    <Route path="/browse" element={<ProtectedRoute><Layout><BrowseMappings /></Layout></ProtectedRoute>} />
                    <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
