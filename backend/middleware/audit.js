import db from '../database/db.js';

/**
 * Audit middleware - log all requests
 */
export const auditLog = async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    let responseStatus = 200;

    // Override send to capture response status
    res.send = function (data) {
        responseStatus = res.statusCode;
        res.send = originalSend;
        return originalSend.call(this, data);
    };

    // Continue with request
    next();

    // Log after response is sent
    res.on('finish', async () => {
        try {
            const userId = req.user?.id || null;
            const userType = req.user ? 'doctor' : 'anonymous';
            const action = `${req.method} ${req.path}`;
            const resourceType = extractResourceType(req.path);
            const resourceId = extractResourceId(req.path);

            // Get client IP
            const ipAddress = req.ip || req.connection.remoteAddress;

            // Get user agent
            const userAgent = req.headers['user-agent'];

            // Sanitize request payload (remove sensitive data)
            const requestPayload = sanitizePayload(req.body);

            await db.query(`
        INSERT INTO audit_logs (user_id, user_type, action, resource_type, resource_id, ip_address, user_agent, request_payload, response_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [userId, userType, action, resourceType, resourceId, ipAddress, userAgent, JSON.stringify(requestPayload), responseStatus]);

        } catch (error) {
            console.error('Audit logging error:', error);
            // Don't fail the request if audit logging fails
        }
    });
};

/**
 * Extract resource type from path
 */
function extractResourceType(path) {
    const fhirMatch = path.match(/\/fhir\/([A-Za-z]+)/);
    if (fhirMatch) return fhirMatch[1];

    const apiMatch = path.match(/\/api\/([A-Za-z]+)/);
    if (apiMatch) return apiMatch[1];

    return null;
}

/**
 * Extract resource ID from path
 */
function extractResourceId(path) {
    const idMatch = path.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return idMatch ? idMatch[1] : null;
}

/**
 * Sanitize payload - remove sensitive fields
 */
function sanitizePayload(payload) {
    if (!payload) return null;

    const sanitized = { ...payload };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'password_hash', 'token', 'access_token', 'refresh_token'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

export default {
    auditLog
};
