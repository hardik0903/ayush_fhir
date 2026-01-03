import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import terminologyRoutes from './routes/terminology.js';
import encounterRoutes from './routes/encounter.js';
import apiRoutes from './routes/api.js';
import semanticRoutes from './routes/semantic.js';
import analyticsRoutes from './routes/analytics.js';
import treatmentsRoutes from './routes/treatments.js';
import predictionRoutes from './routes/prediction.js';
import bodyRegionsRoutes from './routes/bodyRegions.js';
import { auditLog } from './middleware/audit.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Audit logging middleware (log all requests)
app.use(auditLog);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'AYUSH-FHIR Terminology Microservice',
        version: '1.0.0'
    });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/fhir', terminologyRoutes);
app.use('/fhir', encounterRoutes);
app.use('/api', apiRoutes);
app.use('/api', treatmentsRoutes);
app.use('/api/search', semanticRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/body-regions', bodyRegionsRoutes);

// FHIR metadata endpoint
app.get('/fhir/metadata', (req, res) => {
    res.json({
        resourceType: 'CapabilityStatement',
        status: 'active',
        date: new Date().toISOString(),
        kind: 'instance',
        software: {
            name: 'AYUSH-FHIR Terminology Server',
            version: '1.0.0'
        },
        implementation: {
            description: 'FHIR R4 compliant AYUSH terminology microservice',
            url: `http://localhost:${PORT}/fhir`
        },
        fhirVersion: '4.0.1',
        format: ['json'],
        rest: [{
            mode: 'server',
            resource: [
                {
                    type: 'CodeSystem',
                    interaction: [{ code: 'read' }, { code: 'search-type' }],
                    operation: [{ name: 'lookup', definition: 'http://hl7.org/fhir/OperationDefinition/CodeSystem-lookup' }]
                },
                {
                    type: 'ConceptMap',
                    interaction: [{ code: 'read' }, { code: 'search-type' }],
                    operation: [{ name: 'translate', definition: 'http://hl7.org/fhir/OperationDefinition/ConceptMap-translate' }]
                },
                {
                    type: 'ValueSet',
                    interaction: [{ code: 'read' }, { code: 'search-type' }],
                    operation: [{ name: 'expand', definition: 'http://hl7.org/fhir/OperationDefinition/ValueSet-expand' }]
                },
                {
                    type: 'Condition',
                    interaction: [{ code: 'create' }, { code: 'read' }, { code: 'search-type' }]
                },
                {
                    type: 'Bundle',
                    interaction: [{ code: 'create' }]
                }
            ]
        }]
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [{
            severity: 'error',
            code: 'not-found',
            diagnostics: `Resource not found: ${req.method} ${req.path}`
        }]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    res.status(err.status || 500).json({
        resourceType: 'OperationOutcome',
        issue: [{
            severity: 'error',
            code: 'exception',
            diagnostics: process.env.NODE_ENV === 'development'
                ? err.message
                : 'Internal server error'
        }]
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║   AYUSH-FHIR Terminology Microservice                     ║
║   FHIR R4 Compliant                                       ║
╠═══════════════════════════════════════════════════════════╣
║   Server running on: http://localhost:${PORT.toString().padEnd(22)}║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(35)}║
║   FHIR Endpoint: http://localhost:${PORT}/fhir${' '.repeat(13)}║
╚═══════════════════════════════════════════════════════════╝
  `);

    console.log('📋 Available endpoints:');
    console.log('   POST   /auth/login');
    console.log('   GET    /fhir/metadata');
    console.log('   GET    /fhir/CodeSystem/namaste');
    console.log('   GET    /fhir/CodeSystem/icd11');
    console.log('   GET    /fhir/ConceptMap/namaste-icd11');
    console.log('   GET    /fhir/ValueSet/$expand');
    console.log('   POST   /fhir/ConceptMap/$translate');
    console.log('   POST   /fhir/Condition');
    console.log('   GET    /fhir/Condition');
    console.log('   POST   /fhir/Bundle');
    console.log('');
});

export default app;
