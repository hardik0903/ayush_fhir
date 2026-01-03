-- AYUSH-FHIR Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NAMASTE Code System
CREATE TABLE IF NOT EXISTS namaste_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    display VARCHAR(500) NOT NULL,
    system_type VARCHAR(20) NOT NULL CHECK (system_type IN ('ayurveda', 'siddha', 'unani')),
    definition TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- WHO International Terminologies
CREATE TABLE IF NOT EXISTS who_terminologies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(500) NOT NULL,
    system_type VARCHAR(20) NOT NULL CHECK (system_type IN ('ayurveda', 'siddha', 'unani')),
    description TEXT,
    embedding_vector FLOAT8[], -- Store embeddings directly for simple prototype
    created_at TIMESTAMP DEFAULT NOW()
);

-- ICD-11 Codes (TM2 + Biomedicine)
CREATE TABLE IF NOT EXISTS icd11_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    icd_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    module VARCHAR(20) NOT NULL CHECK (module IN ('TM2', 'biomedicine')),
    parent_code VARCHAR(50),
    definition TEXT,
    version VARCHAR(20) DEFAULT '2024-01',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Concept Mappings (NAMASTE ↔ ICD-11)
CREATE TABLE IF NOT EXISTS concept_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    namaste_code_id UUID REFERENCES namaste_codes(id) ON DELETE CASCADE,
    icd11_code_id UUID REFERENCES icd11_codes(id) ON DELETE CASCADE,
    mapping_type VARCHAR(20) DEFAULT 'equivalent',
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(namaste_code_id, icd11_code_id)
);

-- Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Doctors (ABHA Linked)
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    abha_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) UNIQUE NOT NULL,
    specialization VARCHAR(100),
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    password_hash VARCHAR(255), -- For mock authentication
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    abha_id VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    contact_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Patient Treatments (Problem List Entries)
CREATE TABLE IF NOT EXISTS patient_treatments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    encounter_date TIMESTAMP NOT NULL DEFAULT NOW(),
    namaste_code_id UUID REFERENCES namaste_codes(id) ON DELETE SET NULL,
    icd11_code_id UUID REFERENCES icd11_codes(id) ON DELETE SET NULL,
    clinical_notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
    consent_given BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_type VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    request_payload JSONB,
    response_status INTEGER,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- OAuth Sessions
CREATE TABLE IF NOT EXISTS oauth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    access_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),
    abha_token VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Consent Records (ISO 22600 Compliance)
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    purpose VARCHAR(255) NOT NULL,
    scope JSONB,
    granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_namaste_code ON namaste_codes(code);
CREATE INDEX IF NOT EXISTS idx_namaste_system ON namaste_codes(system_type);
CREATE INDEX IF NOT EXISTS idx_namaste_display ON namaste_codes USING gin(to_tsvector('english', display));

CREATE INDEX IF NOT EXISTS idx_who_term ON who_terminologies USING gin(to_tsvector('english', term));
CREATE INDEX IF NOT EXISTS idx_who_system ON who_terminologies(system_type);

CREATE INDEX IF NOT EXISTS idx_icd11_code ON icd11_codes(icd_code);
CREATE INDEX IF NOT EXISTS idx_icd11_module ON icd11_codes(module);
CREATE INDEX IF NOT EXISTS idx_icd11_title ON icd11_codes USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_concept_mappings_namaste ON concept_mappings(namaste_code_id);
CREATE INDEX IF NOT EXISTS idx_concept_mappings_icd11 ON concept_mappings(icd11_code_id);

CREATE INDEX IF NOT EXISTS idx_patient_treatments_patient ON patient_treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_treatments_doctor ON patient_treatments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patient_treatments_date ON patient_treatments(encounter_date);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_oauth_sessions_doctor ON oauth_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_token ON oauth_sessions(access_token);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_namaste_codes_updated_at BEFORE UPDATE ON namaste_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_treatments_updated_at BEFORE UPDATE ON patient_treatments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
