import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { BodyModel } from '../components/3d/BodyModel';
import { BODY_PARTS } from '../data/bodyMappings';
import api from '../services/api';
import { Search, Info, ArrowRight, Activity, Loader } from 'lucide-react';

export default function Mapping3D() {
    const [selectedPart, setSelectedPart] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hoveredPart, setHoveredPart] = useState(null);

    const handlePartSelect = async (partId) => {
        const part = BODY_PARTS[partId];
        if (!part) return;

        setSelectedPart(part);
        setLoading(true);

        try {
            // Use the new database-driven API endpoint
            const response = await api.get(`/api/body-regions/${partId}/diagnoses`, {
                params: {
                    verified_only: false,
                    min_relevance: 0.5,
                    limit: 50
                }
            });

            setResults(response.data.diagnoses || []);
        } catch (error) {
            console.error("Error fetching mappings:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 72px)', display: 'flex', overflow: 'hidden' }}>

            {/* Left: 3D Canvas Area */}
            <div style={{ flex: '1.5', position: 'relative', background: 'linear-gradient(to bottom, #F8FAFB, #E8ECEF)' }}>
                <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }} shadows>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} />

                    <Suspense fallback={null}>
                        <group position={[0, -1, 0]}>
                            <BodyModel
                                onSelect={handlePartSelect}
                                selectedPart={selectedPart?.id}
                                onHover={setHoveredPart}
                            />
                            <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.25} far={10} color="#000000" />
                        </group>
                        <Environment preset="city" />
                    </Suspense>

                    <OrbitControls
                        enablePan={false}
                        minPolarAngle={Math.PI / 4}
                        maxPolarAngle={Math.PI / 2}
                        minDistance={3}
                        maxDistance={7}
                    />
                </Canvas>

                {/* Overlay Instructions */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    maxWidth: '300px'
                }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={18} color="var(--teal)" />
                        Deha Darshan
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                        Interact with the 3D model to explore body-specific mappings.
                        {hoveredPart && (
                            <span style={{ display: 'block', marginTop: '8px', color: 'var(--slate-blue)', fontWeight: 'bold' }}>
                                Found: {BODY_PARTS[hoveredPart]?.label}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Right: Information Panel */}
            <div style={{
                flex: '1',
                background: 'white',
                borderLeft: '1px solid var(--mist)',
                overflowY: 'auto',
                padding: '32px'
            }}>
                {!selectedPart ? (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--slate)',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'var(--snow)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '24px'
                        }}>
                            <Search size={40} color="var(--slate-blue)" />
                        </div>
                        <h3>Select a Body Part</h3>
                        <p style={{ maxWidth: '300px' }}>
                            Click on any region of the 3D model to discover specialized Ayurveda and ICD-11 codes.
                        </p>
                    </div>
                ) : (
                    <div className="fade-in">
                        <div style={{ marginBottom: '32px' }}>
                            <div style={{
                                display: 'inline-block',
                                padding: '4px 12px',
                                background: 'rgba(0, 201, 167, 0.1)',
                                color: 'var(--teal)',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                marginBottom: '12px'
                            }}>
                                SELECTED REGION
                            </div>
                            <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--deep-navy)' }}>
                                {selectedPart.label}
                            </h2>
                            <p style={{ fontSize: '1rem', color: 'var(--slate)' }}>
                                {selectedPart.description}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                                {selectedPart.keywords.map(k => (
                                    <span key={k} style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        background: 'var(--snow)',
                                        border: '1px solid var(--mist)',
                                        borderRadius: '4px'
                                    }}>
                                        #{k}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ height: '1px', background: 'var(--mist)', marginBottom: '32px' }} />

                        <h3 style={{ marginBottom: '24px' }}>Mapped Diagnoses</h3>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Loader className="spin" size={32} color="var(--teal)" />
                                <p style={{ marginTop: '16px', color: 'var(--slate)' }}>Finding clinical codes...</p>
                            </div>
                        ) : results.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {results.map((item, idx) => (
                                    <div key={idx} className="card" style={{ padding: '20px', cursor: 'default' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <span className={`badge ${item.system_type === 'ayurveda' ? 'badge-warning' : item.system_type === 'siddha' ? 'badge-info' : 'badge-success'}`} style={{ marginBottom: '8px' }}>
                                                    {item.system_type}
                                                </span>
                                                <h4 style={{ fontSize: '1.1rem', margin: '8px 0 4px 0' }}>{item.namaste_display}</h4>
                                                <code style={{ fontSize: '0.8rem' }}>{item.namaste_code}</code>
                                            </div>
                                            {item.mappings?.[0] && (
                                                <div style={{ textAlign: 'right' }}>
                                                    <span className="badge badge-error" style={{ opacity: 0.8 }}>ICD-11</span>
                                                    <div style={{ fontWeight: 'bold', color: 'var(--deep-navy)', marginTop: '4px' }}>
                                                        {item.mappings[0].icd_code}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {item.mappings?.[0] && (
                                            <div style={{
                                                background: 'var(--snow)',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                fontSize: '0.9rem',
                                                borderLeft: '4px solid var(--teal)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 'bold' }}>
                                                    <ArrowRight size={14} />
                                                    MAPPED TO
                                                </div>
                                                {item.mappings[0].icd_title}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '32px', background: 'var(--snow)', borderRadius: '12px' }}>
                                <Info size={32} color="var(--slate)" style={{ marginBottom: '16px' }} />
                                <p>No specific mappings found for this region.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
