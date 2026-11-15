"""Upload the five fixed Site01 LOLA rasters to an S3-compatible private bucket."""
import os, hashlib
from pathlib import Path
import boto3

root=Path(__file__).resolve().parents[1]
data=root/"science_api"/"data"/"lola"/"site01"
required=("LUNA_S3_ENDPOINT_URL","LUNA_S3_BUCKET","LUNA_S3_ACCESS_KEY_ID","LUNA_S3_SECRET_ACCESS_KEY")
missing=[k for k in required if not os.getenv(k)]
if missing: raise SystemExit("Missing environment variables: "+", ".join(missing))
client=boto3.client("s3",endpoint_url=os.environ["LUNA_S3_ENDPOINT_URL"],
    aws_access_key_id=os.environ["LUNA_S3_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["LUNA_S3_SECRET_ACCESS_KEY"],
    region_name=os.getenv("LUNA_S3_REGION","auto"))
names=["surf","slp","ldec","toterr","slperr"]
for layer in names:
    path=data/f"Site01_final_adj_5mpp_{layer}.tif"
    if not path.is_file(): raise SystemExit(f"Missing required raster: {path}")
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    key=f"terrain/site01/{path.name}"
    client.upload_file(str(path),os.environ["LUNA_S3_BUCKET"],key,
        ExtraArgs={"ContentType":"image/tiff","Metadata":{"sha256":digest}})
    print(f"uploaded s3://{os.environ['LUNA_S3_BUCKET']}/{key} sha256={digest}")
print("Upload complete. Verify remote object checksums before changing the science API read path.")
