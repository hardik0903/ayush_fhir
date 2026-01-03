import { Link } from 'react-router-dom';
import { ArrowRight, Database, TrendingUp, Shield, Zap, Globe, Lock, Github, Linkedin, ExternalLink, Check, Code, Activity } from 'lucide-react';
import '../styles/home.css';

export default function Home() {
    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <div className="hero-text">
                            <div className="hero-badge">
                                <span>FHIR R4 Compliant</span>
                            </div>
                            <h1 className="hero-title">
                                Bridging Traditional Medicine with Modern Healthcare Standards
                            </h1>
                            <p className="hero-description">
                                MediSync is a production-ready FHIR-compliant platform that enables seamless interoperability between AYUSH medical systems (Ayurveda, Siddha, Unani) and international healthcare standards through AI-powered semantic code mapping and real-time analytics.
                            </p>
                            <div className="hero-actions">
                                <Link to="/login" className="btn btn-primary btn-lg">
                                    Launch Platform
                                    <ArrowRight size={20} />
                                </Link>

                            </div>
                        </div>
                        <div className="hero-stats">
                            <div className="stat-card">
                                <div className="stat-value">7,328+</div>
                                <div className="stat-label">NAMASTE Codes</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">528+</div>
                                <div className="stat-label">ICD-11 Mappings</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">95%</div>
                                <div className="stat-label">Mapping Accuracy</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">&lt;200ms</div>
                                <div className="stat-label">Query Response</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="section" id="features">
                <div className="container">
                    <div className="section-header">
                        <h2>Core Capabilities</h2>
                        <p>Enterprise-grade features designed for healthcare interoperability</p>
                    </div>

                    <div className="grid grid-3">
                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #2D3E5F 0%, #1A2332 100%)' }}>
                                <Database size={32} />
                            </div>
                            <h3>AI Semantic Search</h3>
                            <p>
                                BioBERT-powered semantic search engine with 95%+ accuracy. Intelligently maps traditional medicine terminologies to ICD-11 codes using state-of-the-art natural language processing and vector embeddings.
                            </p>
                            <ul className="feature-list">
                                <li><Check size={16} /> Medical domain-specific BioBERT model</li>
                                <li><Check size={16} /> Cosine similarity matching</li>
                                <li><Check size={16} /> Real-time embedding generation</li>
                            </ul>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #00C9A7 0%, #00B396 100%)' }}>
                                <TrendingUp size={32} />
                            </div>
                            <h3>Advanced Analytics</h3>
                            <p>
                                Comprehensive analytics dashboard with real-time insights, trend analysis, and quality metrics. Monitor mapping performance, usage patterns, and system health with interactive visualizations.
                            </p>
                            <ul className="feature-list">
                                <li><Check size={16} /> Real-time trend analysis</li>
                                <li><Check size={16} /> Quality metric tracking</li>
                                <li><Check size={16} /> CSV data export</li>
                            </ul>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
                                <Shield size={32} />
                            </div>
                            <h3>FHIR R4 Compliance</h3>
                            <p>
                                Full HL7 FHIR R4 implementation with CodeSystem, ConceptMap, ValueSet, and Condition resources. Ensures seamless integration with global Electronic Health Record (EHR) systems and health information exchanges.
                            </p>
                            <ul className="feature-list">
                                <li><Check size={16} /> HL7 FHIR R4 specification</li>
                                <li><Check size={16} /> RESTful API endpoints</li>
                                <li><Check size={16} /> FHIR Bundle support</li>
                            </ul>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                                <Zap size={32} />
                            </div>
                            <h3>High Performance</h3>
                            <p>
                                Optimized architecture delivering sub-200ms query responses. PostgreSQL database with indexed queries, React frontend with code splitting, and efficient caching strategies for production workloads.
                            </p>
                            <ul className="feature-list">
                                <li><Check size={16} /> Sub-200ms query time</li>
                                <li><Check size={16} /> Indexed database queries</li>
                                <li><Check size={16} /> Optimized React rendering</li>
                            </ul>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                                <Globe size={32} />
                            </div>
                            <h3>Multi-System Support</h3>
                            <p>
                                Comprehensive coverage of Ayurveda, Siddha, and Unani medical systems with standardized NAMASTE code mappings. Supports WHO ICD-11 classifications and traditional medicine module (TM2).
                            </p>
                            <ul className="feature-list">
                                <li><Check size={16} /> 7,328+ NAMASTE codes</li>
                                <li><Check size={16} /> ICD-11 TM2 module</li>
                                <li><Check size={16} /> Multi-language support</li>
                            </ul>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
                                <Lock size={32} />
                            </div>
                            <h3>Security & Compliance</h3>
                            <p>
                                Comprehensive audit trails with logging, consent management, and data privacy controls. JWT authentication, role-based access control, and encrypted data transmission.
                            </p>
                            <ul className="feature-list">
                                <li><Check size={16} /> Comprehensive audit trails</li>
                                <li><Check size={16} /> JWT authentication</li>
                                <li><Check size={16} /> RBAC implementation</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="section how-it-works">
                <div className="container">
                    <div className="section-header">
                        <h2>How It Works</h2>
                        <p>Three simple steps to achieve healthcare interoperability</p>
                    </div>

                    <div className="steps-container">
                        <div className="step">
                            <div className="step-number">01</div>
                            <div className="step-content">
                                <h3>Search Traditional Codes</h3>
                                <p>
                                    Search through 7,328+ NAMASTE codes across Ayurveda, Siddha, and Unani systems using our AI-powered semantic search. Find exact matches or semantically similar codes based on symptoms, treatments, or diagnoses.
                                </p>
                            </div>
                        </div>

                        <div className="step-connector"></div>

                        <div className="step">
                            <div className="step-number">02</div>
                            <div className="step-content">
                                <h3>AI-Powered Mapping</h3>
                                <p>
                                    Our BioBERT model automatically maps traditional medicine codes to ICD-11 classifications with 95%+ confidence scores. Review suggested mappings, confidence levels, and equivalence relationships before finalizing.
                                </p>
                            </div>
                        </div>

                        <div className="step-connector"></div>

                        <div className="step">
                            <div className="step-number">03</div>
                            <div className="step-content">
                                <h3>FHIR Integration</h3>
                                <p>
                                    Export dual-coded clinical data as FHIR R4 resources (Condition, ConceptMap, CodeSystem). Seamlessly integrate with any FHIR-compliant EHR system or health information exchange for global interoperability.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Technology Stack */}
            <section className="section tech-section" id="technology">
                <div className="container">
                    <div className="section-header">
                        <h2>Technology Stack</h2>
                        <p>Built with modern, production-ready technologies</p>
                    </div>

                    <div className="tech-grid">
                        <div className="tech-category">
                            <div className="tech-icon">
                                <Code size={24} />
                            </div>
                            <h4>Frontend</h4>
                            <div className="tech-tags">
                                <span className="tech-tag">React 18</span>
                                <span className="tech-tag">Vite</span>
                                <span className="tech-tag">React Router</span>
                                <span className="tech-tag">Recharts</span>
                                <span className="tech-tag">React Three Fiber</span>
                                <span className="tech-tag">Lucide Icons</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <div className="tech-icon">
                                <Database size={24} />
                            </div>
                            <h4>Backend</h4>
                            <div className="tech-tags">
                                <span className="tech-tag">Node.js</span>
                                <span className="tech-tag">Express</span>
                                <span className="tech-tag">PostgreSQL</span>
                                <span className="tech-tag">JWT Auth</span>
                                <span className="tech-tag">FHIR R4</span>
                                <span className="tech-tag">RESTful API</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <div className="tech-icon">
                                <Activity size={24} />
                            </div>
                            <h4>AI & Machine Learning</h4>
                            <div className="tech-tags">
                                <span className="tech-tag">BioBERT</span>
                                <span className="tech-tag">Sentence Transformers</span>
                                <span className="tech-tag">PyTorch</span>
                                <span className="tech-tag">scikit-learn</span>
                                <span className="tech-tag">NumPy</span>
                            </div>
                        </div>

                        <div className="tech-category">
                            <div className="tech-icon">
                                <Shield size={24} />
                            </div>
                            <h4>Standards & Compliance</h4>
                            <div className="tech-tags">
                                <span className="tech-tag">HL7 FHIR R4</span>
                                <span className="tech-tag">ICD-11</span>
                                <span className="tech-tag">NAMASTE</span>
                                <span className="tech-tag">WHO TM2</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Use Cases */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <h2>Real-World Applications</h2>
                        <p>Solving critical challenges in healthcare interoperability</p>
                    </div>

                    <div className="grid grid-3">
                        <div className="use-case-card">
                            <h4>Clinical Documentation</h4>
                            <p>
                                Enable AYUSH practitioners to document patient encounters using traditional terminology while automatically generating ICD-11 coded data for insurance claims, research, and health information exchanges.
                            </p>
                        </div>

                        <div className="use-case-card">
                            <h4>Research & Analytics</h4>
                            <p>
                                Facilitate large-scale research on traditional medicine effectiveness by providing standardized, interoperable data. Analyze treatment patterns, outcomes, and comparative effectiveness across different medical systems.
                            </p>
                        </div>

                        <div className="use-case-card">
                            <h4>Global Interoperability</h4>
                            <p>
                                Bridge the gap between traditional and modern medicine systems in international health data exchanges. Enable seamless patient data transfer across different healthcare providers and countries.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="section about-section" id="about">
                <div className="container">
                    <div className="about-grid">
                        <div className="about-text">
                            <h2>About the Project</h2>
                            <p>
                                MediSync was developed to address a critical gap in healthcare interoperability: the lack of standardized code mappings between traditional AYUSH medical systems and modern international healthcare standards.
                            </p>
                            <p>
                                By leveraging advanced AI, FHIR compliance, and comprehensive code databases, the platform enables seamless data exchange between traditional and modern medicine practitioners, researchers, and healthcare systems worldwide.
                            </p>
                            <p>
                                The system supports over 7,000 NAMASTE codes across Ayurveda, Siddha, and Unani systems, with intelligent mappings to ICD-11 and WHO classifications. Built with a focus on accuracy, performance, regulatory compliance, and real-world usability.
                            </p>

                            <div className="project-stats">
                                <div className="project-stat">
                                    <div className="project-stat-value">7,328+</div>
                                    <div className="project-stat-label">Traditional Medicine Codes</div>
                                </div>
                                <div className="project-stat">
                                    <div className="project-stat-value">528+</div>
                                    <div className="project-stat-label">ICD-11 Code Mappings</div>
                                </div>
                                <div className="project-stat">
                                    <div className="project-stat-value">95%</div>
                                    <div className="project-stat-label">AI Mapping Accuracy</div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>Ready to Transform Healthcare Interoperability?</h2>
                        <p>
                            Experience the future of traditional medicine integration with modern healthcare standards
                        </p>
                        <Link to="/login" className="btn btn-accent btn-lg">
                            Launch Platform
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
