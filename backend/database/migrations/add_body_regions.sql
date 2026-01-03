-- Migration: Add Body Region Mapping System
-- Created: 2026-01-03
-- Purpose: Enable dynamic body-part-to-diagnosis mapping for 3D visualization

-- =====================================================
-- Table: body_regions
-- Stores anatomical regions with hierarchical support
-- =====================================================
CREATE TABLE IF NOT EXISTS body_regions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    display_name_sanskrit VARCHAR(200),
    display_name_hindi VARCHAR(200),
    parent_region_id INTEGER REFERENCES body_regions(id) ON DELETE SET NULL,
    anatomical_system VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_body_regions_code ON body_regions(code);
CREATE INDEX idx_body_regions_system ON body_regions(anatomical_system);

-- =====================================================
-- Table: body_region_mappings
-- Links body regions to NAMASTE/ICD codes
-- =====================================================
CREATE TABLE IF NOT EXISTS body_region_mappings (
    id SERIAL PRIMARY KEY,
    body_region_id INTEGER NOT NULL REFERENCES body_regions(id) ON DELETE CASCADE,
    namaste_code VARCHAR(50),
    icd_code VARCHAR(50),
    relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    mapping_type VARCHAR(50) DEFAULT 'primary',
    verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER,
    verified_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_has_code CHECK (namaste_code IS NOT NULL OR icd_code IS NOT NULL)
);

CREATE INDEX idx_body_mappings_region ON body_region_mappings(body_region_id);
CREATE INDEX idx_body_mappings_namaste ON body_region_mappings(namaste_code);
CREATE INDEX idx_body_mappings_icd ON body_region_mappings(icd_code);
CREATE INDEX idx_body_mappings_verified ON body_region_mappings(verified);

-- =====================================================
-- Table: body_region_keywords
-- Semantic keywords for enhanced search
-- =====================================================
CREATE TABLE IF NOT EXISTS body_region_keywords (
    id SERIAL PRIMARY KEY,
    body_region_id INTEGER NOT NULL REFERENCES body_regions(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_body_keywords_region ON body_region_keywords(body_region_id);
CREATE INDEX idx_body_keywords_keyword ON body_region_keywords(keyword);

-- =====================================================
-- Seed Data: Core Body Regions
-- =====================================================
INSERT INTO body_regions (code, display_name, display_name_sanskrit, display_name_hindi, anatomical_system, description) VALUES
('head', 'Head & Neck', 'Shira', 'सिर और गर्दन', 'Nervous', 'Includes brain, eyes, ears, nose, throat, and cervical spine'),
('chest', 'Chest', 'Uras', 'छाती', 'Respiratory', 'Includes heart, lungs, and thoracic structures'),
('abdomen', 'Abdomen', 'Udara', 'पेट', 'Digestive', 'Includes stomach, liver, intestines, kidneys, and abdominal organs'),
('pelvis', 'Pelvis', 'Kati', 'श्रोणि', 'Reproductive', 'Includes reproductive organs, bladder, and pelvic structures'),
('arms', 'Upper Limbs', 'Bahu', 'बाहु', 'Musculoskeletal', 'Includes shoulders, arms, elbows, wrists, and hands'),
('legs', 'Lower Limbs', 'Sakthi', 'पैर', 'Musculoskeletal', 'Includes hips, thighs, knees, ankles, and feet')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- Seed Data: Keywords for Semantic Search
-- =====================================================
INSERT INTO body_region_keywords (body_region_id, keyword, language) 
SELECT id, keyword, 'en' FROM body_regions, unnest(ARRAY[
    'headache', 'migraine', 'eye', 'ear', 'nose', 'throat', 'neck', 'cervical', 'brain', 'sinus'
]) AS keyword WHERE code = 'head'
ON CONFLICT DO NOTHING;

INSERT INTO body_region_keywords (body_region_id, keyword, language)
SELECT id, keyword, 'en' FROM body_regions, unnest(ARRAY[
    'heart', 'lung', 'chest', 'cardiac', 'respiratory', 'cough', 'asthma', 'breathing', 'thorax'
]) AS keyword WHERE code = 'chest'
ON CONFLICT DO NOTHING;

INSERT INTO body_region_keywords (body_region_id, keyword, language)
SELECT id, keyword, 'en' FROM body_regions, unnest(ARRAY[
    'stomach', 'liver', 'intestine', 'digestion', 'gastro', 'kidney', 'pancreas', 'spleen', 'abdominal'
]) AS keyword WHERE code = 'abdomen'
ON CONFLICT DO NOTHING;

INSERT INTO body_region_keywords (body_region_id, keyword, language)
SELECT id, keyword, 'en' FROM body_regions, unnest(ARRAY[
    'pelvis', 'reproductive', 'bladder', 'urinary', 'hip', 'menstrual', 'gynecological'
]) AS keyword WHERE code = 'pelvis'
ON CONFLICT DO NOTHING;

INSERT INTO body_region_keywords (body_region_id, keyword, language)
SELECT id, keyword, 'en' FROM body_regions, unnest(ARRAY[
    'shoulder', 'arm', 'elbow', 'wrist', 'hand', 'finger', 'upper limb'
]) AS keyword WHERE code = 'arms'
ON CONFLICT DO NOTHING;

INSERT INTO body_region_keywords (body_region_id, keyword, language)
SELECT id, keyword, 'en' FROM body_regions, unnest(ARRAY[
    'leg', 'knee', 'ankle', 'foot', 'thigh', 'lower limb', 'toe', 'hip'
]) AS keyword WHERE code = 'legs'
ON CONFLICT DO NOTHING;
