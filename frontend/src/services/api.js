import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken
                    });

                    const { accessToken } = response.data;
                    localStorage.setItem('accessToken', accessToken);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, logout user
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }
        }

        return Promise.reject(error);
    }
);

// Authentication API
export const authAPI = {
    login: async (abhaId, password) => {
        const response = await api.post('/auth/login', { abhaId, password });
        return response.data;
    },

    logout: async () => {
        const response = await api.post('/auth/logout');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return response.data;
    },

    verify: async () => {
        const response = await api.get('/auth/verify');
        return response.data;
    }
};

// FHIR Terminology API
export const terminologyAPI = {
    getNamasteCodeSystem: async (system = null) => {
        const params = system ? { system } : {};
        const response = await api.get('/fhir/CodeSystem/namaste', { params });
        return response.data;
    },

    getICD11CodeSystem: async (module = null) => {
        const params = module ? { module } : {};
        const response = await api.get('/fhir/CodeSystem/icd11', { params });
        return response.data;
    },

    getConceptMap: async (system = null) => {
        const params = system ? { system } : {};
        const response = await api.get('/fhir/ConceptMap/namaste-icd11', { params });
        return response.data;
    },

    searchCodes: async (filter, system = null, count = 20) => {
        const params = { filter, count };
        if (system) params.system = system;
        const response = await api.get('/fhir/ValueSet/$expand', { params });
        return response.data;
    },

    translateCode: async (code, system, target) => {
        const response = await api.post('/fhir/ConceptMap/$translate', {
            code,
            system,
            target
        });
        return response.data;
    },

    lookupCode: async (code) => {
        const response = await api.get('/fhir/CodeSystem/icd11/$lookup', {
            params: { code }
        });
        return response.data;
    }
};

// Encounter/Condition API
export const encounterAPI = {
    createCondition: async (data) => {
        const response = await api.post('/fhir/Condition', data);
        return response.data;
    },

    getConditions: async (patientId, status = null) => {
        const params = { patient: patientId };
        if (status) params.status = status;
        const response = await api.get('/fhir/Condition', { params });
        return response.data;
    },

    uploadBundle: async (bundle) => {
        const response = await api.post('/fhir/Bundle', bundle);
        return response.data;
    }
};

// General API
export const generalAPI = {
    getStats: async () => {
        const response = await api.get('/api/stats');
        return response.data;
    },

    searchPatients: async (query) => {
        const response = await api.get('/api/patients/search', { params: { query } });
        return response.data;
    },

    getMappings: async (system = null, page = 1, limit = 50) => {
        const params = { page, limit };
        if (system) params.system = system;
        const response = await api.get('/api/mappings', { params });
        return response.data;
    }
};

export default api;
