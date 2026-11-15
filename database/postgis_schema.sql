-- Optional PostgreSQL/PostGIS persistence for LUNA.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS lunar_sites (
  site_id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  location GEOGRAPHY(POINT,4326) GENERATED ALWAYS AS
    (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography) STORED,
  source TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lunar_sites_location_gix ON lunar_sites USING GIST(location);
CREATE TABLE IF NOT EXISTS lunar_assessments (
  assessment_id BIGSERIAL PRIMARY KEY, site_id BIGINT REFERENCES lunar_sites(site_id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(), request JSONB NOT NULL, result JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS lunar_assessments_result_gin ON lunar_assessments USING GIN(result);
CREATE TABLE IF NOT EXISTS terrain_assets (
  asset_id BIGSERIAL PRIMARY KEY, product TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE,
  footprint GEOMETRY(POLYGON,4326), resolution_m DOUBLE PRECISION, checksum_sha256 TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS terrain_assets_footprint_gix ON terrain_assets USING GIST(footprint);
