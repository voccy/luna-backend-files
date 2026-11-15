# Terrain object storage

LUNA includes an S3-compatible uploader for Cloudflare R2, AWS S3, or compatible storage. The uploader is `scripts/upload_site01_to_object_storage.py`; it uploads the five fixed Site01 GeoTIFFs with SHA-256 metadata.

Install `science_api/requirements-storage.txt`, then set these environment variables on the machine running the uploader:

- `LUNA_S3_ENDPOINT_URL`
- `LUNA_S3_BUCKET`
- `LUNA_S3_ACCESS_KEY_ID`
- `LUNA_S3_SECRET_ACCESS_KEY`
- `LUNA_S3_REGION` (optional; defaults to `auto`)

Run `python scripts/upload_site01_to_object_storage.py`. It reports each object key and local checksum. Verify object retrieval and checksums in the bucket before changing any science API read paths. The upload script does not delete or modify the original local rasters.

No bucket, account, credentials, or remote upload are included in this archive. Keep credentials in environment/deployment secrets, never in Git or Pages variables. `/storage/status` reports configuration only and never returns secrets.
