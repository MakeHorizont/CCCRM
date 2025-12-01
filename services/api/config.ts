
export interface ApiConfig {
  USE_REAL_API: boolean;
  BASE_URL: string;
  MODULES: {
    AUTH: boolean;
    USERS: boolean; // General user data
    HR: boolean;    // Payroll, Attendance, KTU
    WAREHOUSE: boolean;
    ORDERS: boolean;
    PRODUCTION: boolean;
    FINANCE: boolean;
    SYSTEM: boolean; // Audit Log & System Events
    STRATEGY: boolean;
    KANBAN: boolean;
    KNOWLEDGE_BASE: boolean;
    DISCUSSIONS: boolean;
    COUNCIL: boolean; // Governance & Voting
    QUALITY: boolean; // Quality Control (OTK)
    MAINTENANCE: boolean; // Equipment Maintenance & Repairs
  };
  MOCK_DELAY: number;
}

export const API_CONFIG: ApiConfig = {
  USE_REAL_API: false, // Set to true to enable real backend connection globally
  BASE_URL: 'http://localhost:3001/api/v1', // Adjust to your NestJS port
  MODULES: {
    AUTH: false,
    USERS: false,
    HR: false,
    WAREHOUSE: false,
    ORDERS: false,
    PRODUCTION: false,
    FINANCE: false,
    SYSTEM: false,
    STRATEGY: false,
    KANBAN: false,
    KNOWLEDGE_BASE: false,
    DISCUSSIONS: false,
    COUNCIL: false,
    QUALITY: false,
    MAINTENANCE: false,
  },
  MOCK_DELAY: 300,
};

export const getHeaders = (): HeadersInit => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};