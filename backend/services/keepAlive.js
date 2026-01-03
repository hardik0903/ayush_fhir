/**
 * Keep-Alive Service for Render Free Tier
 * Prevents the application from sleeping by pinging itself every 14 minutes
 * Render free tier sleeps after 15 minutes of inactivity
 */

import axios from 'axios';

class KeepAliveService {
    constructor() {
        this.interval = null;
        this.pingInterval = 14 * 60 * 1000; // 14 minutes in milliseconds
        this.serviceUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVICE_URL;
    }

    start() {
        // Only run keep-alive in production on Render
        if (process.env.NODE_ENV !== 'production' || !this.serviceUrl) {
            console.log('⏸️  Keep-alive service disabled (not in production or no service URL)');
            return;
        }

        console.log(`🔄 Keep-alive service started - pinging ${this.serviceUrl} every 14 minutes`);

        // Ping immediately on start
        this.ping();

        // Set up interval to ping every 14 minutes
        this.interval = setInterval(() => {
            this.ping();
        }, this.pingInterval);
    }

    async ping() {
        try {
            const response = await axios.get(`${this.serviceUrl}/health`, {
                timeout: 10000
            });
            console.log(`✅ Keep-alive ping successful at ${new Date().toISOString()} - Status: ${response.status}`);
        } catch (error) {
            console.error(`❌ Keep-alive ping failed at ${new Date().toISOString()}:`, error.message);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('⏹️  Keep-alive service stopped');
        }
    }
}

// Create singleton instance
const keepAliveService = new KeepAliveService();

export default keepAliveService;
