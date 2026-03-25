import boto3

s3 = boto3.client("s3", region_name="eu-north-1")
bucket = "teamreel-assets-demo"
prefix = "members/e1961bdf-ef58-49ae-9618-29e6820d09d5/processed/"

paginator = s3.get_paginator("list_objects_v2")
count = 0
for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
    for obj in page.get("Contents", []):
        count += 1
        key = obj["Key"]
        size = obj["Size"]
        print(f"  {key}  ({size})")

print(f"\nTotal: {count}")
