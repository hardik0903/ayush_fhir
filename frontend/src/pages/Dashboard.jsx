import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { FileText, Activity, Users, TrendingUp, Search, Box, Download, Clock, ArrowRight, Stethoscope } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const [statsRes, activityRes] = await Promise.all([
                api.get('/api/terminology/stats'),
                api.get('/api/audit/recent', { params: { limit: 10 } })
            ]);

            setStats(statsRes.data);
            setRecentActivity(activityRes.data.logs || []);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
        setLoading(false);
    };

    const exportReport = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text('MediSync Dashboard Report', 14, 20);

        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`User: ${user?.name || 'N/A'}`, 14, 37);

        let currentY = 50;

        // System Statistics Section
        if (stats) {
            doc.setFontSize(14);
            doc.text('System Statistics', 14, currentY);

            const statsData = [
                ['Total NAMASTE Codes', stats.namaste_count || 0],
                ['Total ICD-11 Codes', stats.icd11_count || 0],
                ['Total Mappings', stats.mapping_count || 0],
                ['Verified Mappings', stats.verified_count || 0]
            ];

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Metric', 'Value']],
                body: statsData,
                theme: 'grid',
                headStyles: { fillColor: [45, 62, 95] }
            });

            currentY = doc.lastAutoTable.finalY + 15;
        }

        // Recent Activity Section
        if (recentActivity && recentActivity.length > 0) {
            // Add new page if needed
            if (currentY > 200) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.text('Recent Activity Audit Log', 14, currentY);

            const activityData = recentActivity.map(log => [
                log.action || 'N/A',
                log.user_type || 'System',
                log.resource_type || 'N/A',
                new Date(log.timestamp).toLocaleString()
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Action', 'User', 'Resource', 'Timestamp']],
                body: activityData,
                theme: 'grid',
                headStyles: { fillColor: [0, 201, 167] },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 45 }
                }
            });
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(150);
            doc.text(
                `Page ${i} of ${pageCount} | MediSync © 2026`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }

        doc.save(`medisync-audit-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const features = [
        {
            title: 'Diagnosis Search',
            description: 'Search NAMASTE codes with AI-powered semantic matching',
            icon: Search,
            link: '/search',
            color: 'var(--slate-blue)'
        },
        {
            title: 'Disease Prediction',
            description: 'AI-assisted disease prediction from patient symptoms',
            icon: Stethoscope,
            link: '/prediction',
            color: 'var(--primary)'
        },
        {
            title: 'Update EMR',
            description: 'Create dual-coded treatment records with FHIR compliance',
            icon: FileText,
            link: '/emr',
            color: 'var(--teal)'
        },
        {
            title: '3D Mapping',
            description: 'Visualize code relationships in interactive 3D space',
            icon: Box,
            link: '/mapping-3d',
            color: 'var(--info)'
        },
        {
            title: 'Browse Mappings',
            description: 'Explore comprehensive ConceptMap database',
            icon: Activity,
            link: '/browse',
            color: 'var(--success)'
        },
        {
            title: 'Analytics',
            description: 'View trends, insights, and quality metrics',
            icon: TrendingUp,
            link: '/analytics',
            color: 'var(--warning)'
        }
    ];

    if (loading) {
        return (
            <div className="container fade-in">
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: 'var(--space-md)', color: 'var(--slate)', fontFamily: 'var(--font-display)' }}>
                        Loading dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container fade-in" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-4xl)' }}>
            {/* Welcome Header */}
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h1 style={{ marginBottom: 'var(--space-sm)' }}>
                    Welcome back, {user?.name || 'User'}
                </h1>
                <p style={{ color: 'var(--slate)', fontSize: '1.125rem', margin: 0 }}>
                    Your healthcare interoperability dashboard
                </p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-4" style={{ marginBottom: 'var(--space-3xl)' }}>
                    <div className="card stat-card">
                        <FileText size={32} style={{ color: 'var(--slate-blue)', marginBottom: 'var(--space-md)' }} />
                        <div className="stat-value">{stats.namaste_count || 0}</div>
                        <div className="stat-label">NAMASTE Codes</div>
                    </div>
                    <div className="card stat-card">
                        <Activity size={32} style={{ color: 'var(--teal)', marginBottom: 'var(--space-md)' }} />
                        <div className="stat-value">{stats.icd11_count || 0}</div>
                        <div className="stat-label">ICD-11 Codes</div>
                    </div>
                    <div className="card stat-card">
                        <Users size={32} style={{ color: 'var(--info)', marginBottom: 'var(--space-md)' }} />
                        <div className="stat-value">{stats.mapping_count || 0}</div>
                        <div className="stat-label">Total Mappings</div>
                    </div>
                    <div className="card stat-card">
                        <TrendingUp size={32} style={{ color: 'var(--success)', marginBottom: 'var(--space-md)' }} />
                        <div className="stat-value">
                            {stats.mapping_count > 0
                                ? Math.round((stats.verified_count / stats.mapping_count) * 100)
                                : 0}%
                        </div>
                        <div className="stat-label">Verification Rate</div>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div style={{ marginBottom: 'var(--space-3xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                    <h2>Quick Actions</h2>
                    <button className="btn btn-secondary btn-sm" onClick={exportReport}>
                        <Download size={16} />
                        Export Report
                    </button>
                </div>

                <div className="grid grid-3">
                    {features.map((feature, index) => (
                        <Link
                            key={index}
                            to={feature.link}
                            className="card"
                            style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)`,
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 'var(--space-md)'
                            }}>
                                <feature.icon size={24} style={{ color: 'white' }} />
                            </div>
                            <h4 style={{ marginBottom: 'var(--space-sm)' }}>{feature.title}</h4>
                            <p style={{ fontSize: '0.9375rem', color: 'var(--slate)', marginBottom: 'var(--space-md)' }}>
                                {feature.description}
                            </p>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                color: feature.color,
                                fontFamily: 'var(--font-display)',
                                fontSize: '0.875rem',
                                fontWeight: 600
                            }}>
                                <span>Launch</span>
                                <ArrowRight size={16} />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div>
                <div className="card-header" style={{ marginBottom: 'var(--space-lg)' }}>
                    <h2 className="card-title">Recent Activity</h2>
                </div>

                {recentActivity.length > 0 ? (
                    <div className="card">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Action</th>
                                        <th>User</th>
                                        <th>Resource</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentActivity.map((log, index) => (
                                        <tr key={index}>
                                            <td>
                                                <span className="badge badge-info">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>{log.user_type || 'System'}</td>
                                            <td>
                                                <code>{log.resource_type || 'N/A'}</code>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: '0.8125rem', color: 'var(--slate)' }}>
                                                    <Clock size={14} />
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
                        <Activity size={48} style={{ color: 'var(--mist)', margin: '0 auto var(--space-md)' }} />
                        <p style={{ color: 'var(--slate)', margin: 0 }}>No recent activity</p>
                    </div>
                )}
            </div>
        </div>
    );
}
