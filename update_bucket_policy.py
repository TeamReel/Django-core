"""Update S3 bucket policy to add public read for members/*/uploads/*."""
import boto3, json

bucket = "teamreel-assets-demo"
region = "eu-north-1"
s3 = boto3.client("s3", region_name=region)

# Get current policy
policy = json.loads(s3.get_bucket_policy(Bucket=bucket)["Policy"])
print("Current policy:")
print(json.dumps(policy, indent=2))

# Add uploads statement if not already present
uploads_arn = f"arn:aws:s3:::{bucket}/members/*/uploads/*"
already_exists = any(
    stmt.get("Resource") == uploads_arn
    for stmt in policy.get("Statement", [])
)

if already_exists:
    print("\nUploads policy already exists — no change needed.")
else:
    policy["Statement"].append({
        "Sid": "PublicReadForMemberUploads",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": uploads_arn,
    })
    s3.put_bucket_policy(Bucket=bucket, Policy=json.dumps(policy))
    print("\nUpdated policy:")
    print(json.dumps(policy, indent=2))
    print("\nDone — members/*/uploads/* is now publicly readable.")
