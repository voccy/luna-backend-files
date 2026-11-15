# LUNA integration pass — 14 November 2026

## Added in this pass

- **JPL Horizons:** FastAPI adapter at `GET /integrations/horizons`, proxied at `/api/horizons`. Defaults query Moon (301) relative to Earth center (500@399) as vectors. This is not the same as site-specific SPICE topocentric geometry.
- **LROC:** WMS GetMap URL adapter at `GET /integrations/lroc`, proxied at `/api/lroc`. The UI opens the returned imagery URL. WMS layer and CRS compatibility must be confirmed against provider GetCapabilities; no image bytes are mirrored.
- **NASA PDS:** Registry search adapter at `GET /integrations/pds`, proxied at `/api/pds`. The PDS public API schema and access may change; live response validation is still required.
- **Crater/ridge candidates:** `/lola/features` applies multiscale local-depression and local-prominence heuristics to a sampled LOLA DEM. It returns candidates, not geological truth. "Mountain" is represented only as local high/ridge candidate; no geological mountain classifier is claimed.
- **PSR candidate screen:** `/lola/psr-screen` intersects independently supplied epoch shadow masks. A single-date shadow is not called permanent. Multi-year SPICE illumination generation, polar completeness and uncertainty analysis remain necessary for defensible PSR mapping.
- **PostGIS:** `database/postgis_schema.sql` adds site, assessment and terrain asset tables with geography/geometry indexes. Optional Docker profile `database` starts PostGIS. Optional API endpoints `/database/status` and `/database/sites` support status, listing and site creation after schema installation. Existing assessment results are not yet automatically persisted.
- **Object storage:** S3-compatible storage environment contract, `/storage/status` endpoint and `scripts/upload_site01_to_object_storage.py` uploader added. No bucket or secrets exist in this package; no upload was performed. Original GeoTIFFs remain local.
- **IndexedDB:** Browser scenario persistence now writes to IndexedDB, retaining localStorage as fallback.
- **Alternative recommendations:** `/recommendations` assesses a caller-supplied candidate list using the actual science assessment engine and ranks only results with a real score. UI generates a small nearby coordinate lattice. Candidates without DEM/SPICE data remain unavailable; no fallback demo score is used for recommendation ranking.
- **Cloudflare:** Pages build and deployment configuration remain in `wrangler.toml`; new Functions proxy the NASA and science endpoints. A deploy cannot be completed without the user's Cloudflare account/authentication, production Python API origin, secrets, and external storage configuration.

## Already present and verified from archive

- Five NAIF kernel files are present, including `pck00011.tpc` (SHA-256 `3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1`).
- Five Site01 LOLA GeoTIFF layers and the existing terrain/WebGL UI are preserved.
- Existing FastAPI assessment and terrain endpoints are preserved.

## Required production configuration

1. Install `science_api/requirements.txt`; for optional PostGIS and S3 integrations also install `science_api/requirements-storage.txt`.
2. Set `DATABASE_URL` to a PostGIS connection string if database persistence is enabled.
3. Set `LUNA_S3_ENDPOINT_URL`, `LUNA_S3_BUCKET`, `LUNA_S3_ACCESS_KEY_ID`, `LUNA_S3_SECRET_ACCESS_KEY`, and `LUNA_S3_REGION` as secrets on the science API host.
4. Deploy the science API to a Python/Docker-capable HTTPS host with persistent access to `science_api/data/lola` and `science_api/kernels`.
5. Set Cloudflare Pages variable `LUNA_SCIENCE_API_URL` to that HTTPS API origin.
6. Authenticate Wrangler and run `node scripts/build_pages.mjs`, then `npx wrangler pages deploy public --project-name luna-lunar-navigator`.
7. Configure CORS on the science API for the deployed Pages origin and verify `/api/data-status`, `/api/horizons`, `/api/lroc`, `/api/pds`, `/api/lola-features`, `/api/recommendations`, `/api/assess`, and browser IndexedDB behavior.

## Not claimed

No NASA provider was contacted or validated during this offline code pass; no database, object bucket, or Cloudflare production deployment was provisioned; no permanent-shadow map or geological ground-truth classification is claimed. These need provider/network credentials and scientific validation.

## Provider API references

- JPL Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- NASA PDS Search API endpoints and query syntax: https://nasa-pds.github.io/pds-api/guides/search/endpoints.html
- LROC WMS: set `LUNA_LROC_WMS_URL` to a verified LROC WMS endpoint and check its `GetCapabilities` response before selecting layers/CRS. The default WMS base is a configurable starting point, not a live-validated provider assertion.
