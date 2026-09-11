-- ============================================================
-- Disaster Relief & Emergency Resource Coordinator — DB Schema
-- ============================================================

-- ---------- Lookup table ----------

CREATE TABLE resource_types (
    resource_id   SERIAL PRIMARY KEY,
    name          TEXT NOT NULL UNIQUE,        -- food, medical, shelter, rescue_team, water
    unit          TEXT NOT NULL                -- kg, kits, people, units
);

-- ---------- Zones (affected regions — have a radius) ----------

CREATE TABLE zones (
    zone_id             SERIAL PRIMARY KEY,
    name                TEXT NOT NULL,
    center_lat          DOUBLE PRECISION NOT NULL,
    center_lng          DOUBLE PRECISION NOT NULL,
    radius_m            DOUBLE PRECISION NOT NULL,   -- only zones carry a radius
    disaster_type       TEXT NOT NULL,               -- flood, earthquake, cyclone, etc.
    severity_score      DOUBLE PRECISION DEFAULT 0,  -- recomputed on every report
    population_estimate INTEGER,
    status              TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','stabilizing','resolved')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Helping points (NGOs / govt / private — coordinates only) ----------

CREATE TABLE helping_points (
    point_id                SERIAL PRIMARY KEY,
    name                    TEXT NOT NULL,
    type                    TEXT NOT NULL CHECK (type IN ('ngo','govt','private')),
    lat                     DOUBLE PRECISION NOT NULL,
    lng                     DOUBLE PRECISION NOT NULL,
    reliability_score       DOUBLE PRECISION DEFAULT 1.0,
    arrangement_capability  DOUBLE PRECISION DEFAULT 0,   -- ability to source extra beyond current stock
    status                  TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','overwhelmed','offline')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Helping point inventory (many resources per point, varying amounts) ----------

CREATE TABLE helping_point_inventory (
    id              SERIAL PRIMARY KEY,
    point_id        INTEGER NOT NULL REFERENCES helping_points(point_id) ON DELETE CASCADE,
    resource_id     INTEGER NOT NULL REFERENCES resource_types(resource_id),
    current_stock   DOUBLE PRECISION NOT NULL DEFAULT 0,
    max_capacity    DOUBLE PRECISION NOT NULL DEFAULT 0,
    replenish_rate  DOUBLE PRECISION DEFAULT 0,   -- units per hour, powers exhaustion estimate
    UNIQUE (point_id, resource_id)
);

-- ---------- Zone needs (output of needs-assessment agent) ----------

CREATE TABLE zone_needs (
    id                    SERIAL PRIMARY KEY,
    zone_id               INTEGER NOT NULL REFERENCES zones(zone_id) ON DELETE CASCADE,
    resource_id           INTEGER NOT NULL REFERENCES resource_types(resource_id),
    quantity_needed       DOUBLE PRECISION NOT NULL DEFAULT 0,
    quantity_fulfilled    DOUBLE PRECISION NOT NULL DEFAULT 0,
    fulfillment_status    TEXT NOT NULL DEFAULT 'shortage'
                          CHECK (fulfillment_status IN ('shortage','balanced','surplus')),
    UNIQUE (zone_id, resource_id)
);

-- ---------- Reports (initial seed or dynamic incoming — coordinates only) ----------

CREATE TABLE reports (
    report_id            SERIAL PRIMARY KEY,
    zone_id               INTEGER REFERENCES zones(zone_id),   -- nullable: may create a new zone
    lat                   DOUBLE PRECISION NOT NULL,
    lng                   DOUBLE PRECISION NOT NULL,
    raw_text               TEXT,
    severity_signal        DOUBLE PRECISION,
    resources_requested    JSONB,                    -- quick structured hint pre-parsing
    source                 TEXT NOT NULL DEFAULT 'field_report'
                           CHECK (source IN ('initial_seed','field_report','agency_update')),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Allocations (who helps whom, with what, live state) ----------

CREATE TABLE allocations (
    allocation_id        SERIAL PRIMARY KEY,
    zone_id               INTEGER NOT NULL REFERENCES zones(zone_id),
    report_id             INTEGER REFERENCES reports(report_id) ON DELETE SET NULL, -- nullable: links to specific Red Dot SOS report if applicable
    point_id              INTEGER NOT NULL REFERENCES helping_points(point_id),
    resource_id           INTEGER NOT NULL REFERENCES resource_types(resource_id),
    quantity               DOUBLE PRECISION NOT NULL,
    target_lat            DOUBLE PRECISION,         -- destination coordinate for UI dotted lines (report lat or zone center lat)
    target_lng            DOUBLE PRECISION,         -- destination coordinate for UI dotted lines (report lng or zone center lng)
    status                 TEXT NOT NULL DEFAULT 'proposed'
                           CHECK (status IN (
                               'proposed','confirmed','on_hold','unfulfilled',
                               'en_route','delivered','cancelled'
                           )),
    hold_reason             TEXT,                     -- populated when status = on_hold/unfulfilled
    eta                     TIMESTAMPTZ,
    exhaustion_estimate      TIMESTAMPTZ,               -- when this commitment drains the point's stock
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Duplicate / conflict flags ----------

CREATE TABLE duplicate_flags (
    flag_id               SERIAL PRIMARY KEY,
    zone_id                INTEGER NOT NULL REFERENCES zones(zone_id),
    allocation_id_1         INTEGER NOT NULL REFERENCES allocations(allocation_id),
    allocation_id_2          INTEGER NOT NULL REFERENCES allocations(allocation_id),
    resolution                 TEXT NOT NULL DEFAULT 'needs_review'
                              CHECK (resolution IN ('auto_resolved','needs_review','resolved_manually')),
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Audit log (append-only reasoning trail) ----------

CREATE TABLE audit_log (
    log_id             SERIAL PRIMARY KEY,
    event_type          TEXT NOT NULL CHECK (event_type IN (
                            'report_received','priority_scored','allocation_proposed',
                            'allocation_confirmed','reallocation','duplicate_flagged',
                            'conflict_resolved','allocation_on_hold'
                        )),
    zone_id               INTEGER REFERENCES zones(zone_id),
    point_id              INTEGER REFERENCES helping_points(point_id),
    allocation_id          INTEGER REFERENCES allocations(allocation_id),
    reasoning_text          TEXT NOT NULL,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Helpful indexes for live dashboard queries ----------

CREATE INDEX idx_reports_zone ON reports(zone_id);
CREATE INDEX idx_allocations_zone ON allocations(zone_id);
CREATE INDEX idx_allocations_point ON allocations(point_id);
CREATE INDEX idx_allocations_status ON allocations(status);
CREATE INDEX idx_zone_needs_zone ON zone_needs(zone_id);
CREATE INDEX idx_audit_log_zone ON audit_log(zone_id);
