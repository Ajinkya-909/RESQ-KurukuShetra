-- ============================================================
-- RESQ — Disaster Relief & Emergency Resource Coordinator
-- PostgreSQL Schema v2.0 (Final Hackathon Build)
-- ============================================================
-- Changelog v2.0:
--   - Added scenario_id to zones, reports, allocations for session isolation
--   - Added severity_level and confidence_score to zones
--   - Added extracted_json and verification_status to reports
--   - Added agent_name to audit_log
--   - Added scenario_state table for simulation lifecycle
--   - Made target_lat/target_lng NOT NULL in allocations
--   - Updated duplicate_flags to reference reports (not just allocations)
--   - Added seed data for demo scenario
-- ============================================================

-- ========== LOOKUP TABLES ==========

CREATE TABLE resource_types (
    resource_id   SERIAL PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,
    unit          TEXT NOT NULL
);

-- ========== SCENARIO SESSION ==========

CREATE TABLE scenarios (
    scenario_id     TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    disaster_type   TEXT NOT NULL DEFAULT 'flood',
    status          TEXT NOT NULL DEFAULT 'setup'
                    CHECK (status IN ('setup', 'running', 'paused', 'completed')),
    sim_time        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== HELPING POINTS (Static Supply Nodes) ==========

CREATE TABLE helping_points (
    point_id                SERIAL PRIMARY KEY,
    name                    TEXT NOT NULL,
    type                    TEXT NOT NULL CHECK (type IN ('ngo', 'govt', 'private', 'hospital', 'military')),
    lat                     DOUBLE PRECISION NOT NULL,
    lng                     DOUBLE PRECISION NOT NULL,
    reliability_score       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    arrangement_capability  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'overwhelmed', 'offline')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== HELPING POINT INVENTORY ==========

CREATE TABLE helping_point_inventory (
    id              SERIAL PRIMARY KEY,
    point_id        INTEGER NOT NULL REFERENCES helping_points(point_id) ON DELETE CASCADE,
    resource_id     INTEGER NOT NULL REFERENCES resource_types(resource_id) ON DELETE CASCADE,
    total_stock     DOUBLE PRECISION NOT NULL DEFAULT 0,
    available_stock DOUBLE PRECISION NOT NULL DEFAULT 0,
    reserved_stock  DOUBLE PRECISION NOT NULL DEFAULT 0,
    in_transit      DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_capacity    DOUBLE PRECISION NOT NULL DEFAULT 0,
    replenish_rate  DOUBLE PRECISION NOT NULL DEFAULT 0,
    UNIQUE (point_id, resource_id)
);

-- ========== DISASTER ZONES ==========

CREATE TABLE zones (
    zone_id             SERIAL PRIMARY KEY,
    scenario_id         TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    center_lat          DOUBLE PRECISION NOT NULL,
    center_lng          DOUBLE PRECISION NOT NULL,
    radius_m            DOUBLE PRECISION NOT NULL,
    disaster_type       TEXT NOT NULL DEFAULT 'flood',
    severity_score      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    severity_level      TEXT NOT NULL DEFAULT 'low'
                        CHECK (severity_level IN ('low', 'moderate', 'high', 'critical')),
    confidence_score    DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    population_estimate INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'stabilizing', 'resolved')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== ZONE NEEDS (Agent Output) ==========

CREATE TABLE zone_needs (
    id                    SERIAL PRIMARY KEY,
    zone_id               INTEGER NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    resource_id           INTEGER NOT NULL REFERENCES resource_types(resource_id) ON DELETE CASCADE,
    quantity_needed       DOUBLE PRECISION NOT NULL DEFAULT 0,
    quantity_fulfilled    DOUBLE PRECISION NOT NULL DEFAULT 0,
    fulfillment_status    TEXT NOT NULL DEFAULT 'shortage'
                          CHECK (fulfillment_status IN ('shortage', 'balanced', 'surplus')),
    UNIQUE (zone_id, resource_id)
);

-- ========== FIELD SOS REPORTS ==========

CREATE TABLE reports (
    report_id             SERIAL PRIMARY KEY,
    scenario_id           TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    zone_id               INTEGER REFERENCES zones(zone_id) ON DELETE SET NULL,
    lat                   DOUBLE PRECISION NOT NULL,
    lng                   DOUBLE PRECISION NOT NULL,
    raw_text              TEXT NOT NULL,
    extracted_json        JSONB,
    severity_signal       DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    verification_status   TEXT NOT NULL DEFAULT 'unverified'
                          CHECK (verification_status IN ('unverified', 'verified', 'duplicate', 'rejected')),
    source                TEXT NOT NULL DEFAULT 'field_report'
                          CHECK (source IN ('initial_seed', 'field_report', 'agency_update', 'simulation')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== ALLOCATIONS ==========

CREATE TABLE allocations (
    allocation_id         SERIAL PRIMARY KEY,
    scenario_id           TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    zone_id               INTEGER NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    report_id             INTEGER REFERENCES reports(report_id) ON DELETE SET NULL,
    point_id              INTEGER NOT NULL REFERENCES helping_points(point_id) ON DELETE CASCADE,
    resource_id           INTEGER NOT NULL REFERENCES resource_types(resource_id) ON DELETE CASCADE,
    quantity              DOUBLE PRECISION NOT NULL,
    target_lat            DOUBLE PRECISION NOT NULL,
    target_lng            DOUBLE PRECISION NOT NULL,
    status                TEXT NOT NULL DEFAULT 'proposed'
                          CHECK (status IN (
                              'proposed', 'confirmed', 'on_hold', 'unfulfilled',
                              'en_route', 'delivered', 'cancelled'
                          )),
    hold_reason           TEXT,
    eta                   TIMESTAMPTZ,
    exhaustion_estimate   TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== DUPLICATE / CONFLICT FLAGS ==========

CREATE TABLE duplicate_flags (
    flag_id               SERIAL PRIMARY KEY,
    scenario_id           TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    zone_id               INTEGER REFERENCES zones(zone_id) ON DELETE SET NULL,
    report_id_1           INTEGER REFERENCES reports(report_id) ON DELETE SET NULL,
    report_id_2           INTEGER REFERENCES reports(report_id) ON DELETE SET NULL,
    allocation_id_1       INTEGER REFERENCES allocations(allocation_id) ON DELETE SET NULL,
    allocation_id_2       INTEGER REFERENCES allocations(allocation_id) ON DELETE SET NULL,
    duplicate_score       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    resolution            TEXT NOT NULL DEFAULT 'needs_review'
                          CHECK (resolution IN ('auto_resolved', 'needs_review', 'merged', 'kept_separate')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== AUDIT LOG (Append-Only Agent Reasoning Trail) ==========

CREATE TABLE audit_log (
    log_id                SERIAL PRIMARY KEY,
    scenario_id           TEXT NOT NULL REFERENCES scenarios(scenario_id) ON DELETE CASCADE,
    event_type            TEXT NOT NULL,
    agent_name            TEXT NOT NULL DEFAULT 'system',
    zone_id               INTEGER REFERENCES zones(zone_id) ON DELETE SET NULL,
    point_id              INTEGER REFERENCES helping_points(point_id) ON DELETE SET NULL,
    allocation_id         INTEGER REFERENCES allocations(allocation_id) ON DELETE SET NULL,
    report_id             INTEGER REFERENCES reports(report_id) ON DELETE SET NULL,
    reasoning_text        TEXT NOT NULL,
    metadata              JSONB,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== PERFORMANCE INDEXES ==========

CREATE INDEX idx_zones_scenario ON zones(scenario_id);
CREATE INDEX idx_reports_scenario ON reports(scenario_id);
CREATE INDEX idx_reports_zone ON reports(zone_id);
CREATE INDEX idx_reports_verification ON reports(verification_status);
CREATE INDEX idx_allocations_scenario ON allocations(scenario_id);
CREATE INDEX idx_allocations_zone ON allocations(zone_id);
CREATE INDEX idx_allocations_point ON allocations(point_id);
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_zone_needs_zone ON zone_needs(zone_id);
CREATE INDEX idx_audit_log_scenario ON audit_log(scenario_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_duplicate_flags_scenario ON duplicate_flags(scenario_id);

-- ============================================================
-- SEED DATA: Resource Types & Demo Helping Points
-- ============================================================

INSERT INTO resource_types (name, unit) VALUES
    ('water',        'liters'),
    ('food',         'packets'),
    ('medical',      'kits'),
    ('rescue_team',  'teams'),
    ('ambulance',    'vehicles'),
    ('shelter',      'tents'),
    ('rescue_boat',  'boats');

INSERT INTO helping_points (name, type, lat, lng, reliability_score, arrangement_capability) VALUES
    ('NDRF Base Camp Alpha',                 'govt',     18.5350, 73.8420, 0.95, 0.85),
    ('Red Cross Central Relief Depot',       'ngo',      18.5110, 73.8710, 0.90, 0.60),
    ('Municipal General Emergency Hospital', 'hospital', 18.5280, 73.8650, 0.92, 0.40),
    ('Army Logistics Forward Operating Base','military', 18.5450, 73.8300, 0.98, 0.90),
    ('Swargate Community Volunteer Center',  'private',  18.5050, 73.8550, 0.75, 0.30),
    ('NDRF Tactical Battalion 5',            'govt',     18.5600, 73.8100, 0.96, 0.88),
    ('Sassoon Trauma & Medical Staging',     'hospital', 18.5250, 73.8750, 0.94, 0.50),
    ('Air Force Relief Airfield Logistics',  'military', 18.5800, 73.9200, 0.99, 0.95),
    ('Seva Bharathi Disaster Relief Hub',    'ngo',      18.4900, 73.8300, 0.88, 0.55),
    ('Civil Defence Rapid Command Outpost',  'private',  18.5150, 73.9100, 0.82, 0.45);

-- 1. NDRF Base Camp Alpha inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (1, 1, 15000, 15000, 20000, 500),   -- water
    (1, 2, 2000,  2000,  3000,  200),   -- food
    (1, 3, 500,   500,   800,   30),    -- medical
    (1, 4, 12,    12,    15,    0.5),   -- rescue_team
    (1, 5, 4,     4,     6,     0),     -- ambulance
    (1, 7, 6,     6,     8,     0);     -- rescue_boat

-- 2. Red Cross Central Relief Depot inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (2, 1, 8000,  8000,  12000, 300),   -- water
    (2, 2, 5000,  5000,  8000,  400),   -- food
    (2, 3, 200,   200,   400,   15),    -- medical
    (2, 6, 300,   300,   500,   10);    -- shelter

-- 3. Municipal General Emergency Hospital inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (3, 1, 3000,  3000,  5000,  100),   -- water
    (3, 2, 1000,  1000,  2000,  50),    -- food
    (3, 3, 800,   800,   1200,  50),    -- medical
    (3, 5, 6,     6,     10,    0);     -- ambulance

-- 4. Army Logistics Forward Operating Base inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (4, 1, 20000, 20000, 30000, 1000),  -- water
    (4, 2, 8000,  8000,  12000, 600),   -- food
    (4, 3, 300,   300,   500,   20),    -- medical
    (4, 4, 8,     8,     12,    0.3),   -- rescue_team
    (4, 5, 3,     3,     5,     0),     -- ambulance
    (4, 7, 4,     4,     6,     0);     -- rescue_boat

-- 5. Swargate Community Volunteer Center inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (5, 1, 3000,  3000,  5000,  100),   -- water
    (5, 2, 2000,  2000,  3000,  150),   -- food
    (5, 6, 100,   100,   200,   5);     -- shelter

-- 6. NDRF Tactical Battalion 5 inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (6, 1, 12000, 12000, 15000, 400),   -- water
    (6, 2, 3000,  3000,  5000,  250),   -- food
    (6, 3, 400,   400,   600,   25),    -- medical
    (6, 4, 10,    10,    12,    1),     -- rescue_team
    (6, 7, 5,     5,     8,     0);     -- rescue_boat

-- 7. Sassoon Trauma & Medical Staging inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (7, 1, 5000,  5000,  8000,  150),   -- water
    (7, 2, 1500,  1500,  3000,  100),   -- food
    (7, 3, 1200,  1200,  1500,  60),    -- medical
    (7, 5, 8,     8,     12,    0);     -- ambulance

-- 8. Air Force Relief Airfield Logistics inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (8, 1, 25000, 25000, 35000, 1200),  -- water
    (8, 2, 10000, 10000, 15000, 800),   -- food
    (8, 3, 600,   600,   1000,  40),    -- medical
    (8, 6, 500,   500,   800,   20),    -- shelter
    (8, 7, 8,     8,     10,    0);     -- rescue_boat

-- 9. Seva Bharathi Disaster Relief Hub inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (9, 1, 6000,  6000,  10000, 200),   -- water
    (9, 2, 4000,  4000,  6000,  300),   -- food
    (9, 3, 150,   150,   300,   10),    -- medical
    (9, 6, 200,   200,   400,   10);    -- shelter

-- 10. Civil Defence Rapid Command Outpost inventory
INSERT INTO helping_point_inventory (point_id, resource_id, total_stock, available_stock, max_capacity, replenish_rate) VALUES
    (10, 1, 7500, 7500,  10000, 250),   -- water
    (10, 2, 3500, 3500,  5000,  200),   -- food
    (10, 3, 250,  250,   400,   15),    -- medical
    (10, 5, 4,    4,     6,     0);     -- ambulance
