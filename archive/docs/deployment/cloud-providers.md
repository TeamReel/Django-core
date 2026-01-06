# Cloud Provider Deployment Guide
**Feature**: B19 Deployment Templates & Configuration
**Document Type**: Cloud Provider Guide
**Last Updated**: 2025-12-04

---

## Table of Contents

1. [AWS Deployment](#aws-deployment)
2. [Google Cloud Platform (GCP)](#google-cloud-platform-gcp)
3. [Microsoft Azure](#microsoft-azure)
4. [Comparison Matrix](#comparison-matrix)
5. [Multi-Cloud Considerations](#multi-cloud-considerations)

---

## AWS Deployment

### Overview

Deploy Django Core-App using AWS managed services:
- **Compute**: ECS (Fargate) or EKS (Kubernetes)
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **Storage**: S3 for static/media files
- **Load Balancer**: Application Load Balancer (ALB)
- **Secrets**: AWS Secrets Manager or Parameter Store

---

### Prerequisites

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region name: us-east-1
Default output format: json
```

---

### 1. RDS PostgreSQL Setup

#### Create Database Instance

```bash
# Via AWS CLI
aws rds create-db-instance \
  --db-instance-identifier django-core-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username dbadmin \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-0123456789abcdef \
  --db-subnet-group-name django-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234

# Wait for availability
aws rds wait db-instance-available --db-instance-identifier django-core-db
```

#### Get Connection Details

```bash
# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier django-core-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# Output: django-core-db.abc123.us-east-1.rds.amazonaws.com
```

#### Configure DATABASE_URL

```bash
DATABASE_URL=postgresql://dbadmin:<password>@django-core-db.abc123.us-east-1.rds.amazonaws.com:5432/django_core
```

**Best Practices**:
- Enable automatic backups (7-35 days retention)
- Use Multi-AZ for high availability
- Enable encryption at rest
- Use IAM authentication (optional, more secure)
- Configure security groups (allow only from ECS/EKS)

---

### 2. ElastiCache Redis Setup

#### Create Redis Cluster

```bash
# Via AWS CLI
aws elasticache create-replication-group \
  --replication-group-id django-core-redis \
  --replication-group-description "Redis for Django Core" \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token <secure-token> \
  --cache-subnet-group-name django-redis-subnet \
  --security-group-ids sg-0123456789abcdef

# Wait for availability
aws elasticache wait replication-group-available \
  --replication-group-id django-core-redis
```

#### Get Connection Details

```bash
# Get primary endpoint
aws elasticache describe-replication-groups \
  --replication-group-id django-core-redis \
  --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' \
  --output text

# Output: django-core-redis.abc123.0001.use1.cache.amazonaws.com
```

#### Configure REDIS_URL

```bash
# With encryption (port 6380)
REDIS_URL=rediss://:your-auth-token@django-core-redis.abc123.0001.use1.cache.amazonaws.com:6380/0

# Without encryption (port 6379)
REDIS_URL=redis://:your-auth-token@django-core-redis.abc123.0001.use1.cache.amazonaws.com:6379/0
```

**Best Practices**:
- Enable automatic failover (Multi-AZ)
- Enable encryption in transit and at rest
- Use AUTH token
- Configure appropriate node size based on memory needs
- Enable automatic backups

---

### 3. S3 for Static/Media Files

#### Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://django-core-static-prod --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket django-core-static-prod \
  --versioning-configuration Status=Enabled

# Configure CORS
cat > cors.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://example.com"],
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket django-core-static-prod \
  --cors-configuration file://cors.json
```

#### Configure Django for S3

```python
# settings/production.py
import os

# S3 Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = 'django-core-static-prod'
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# Static files
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Media files
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

**Environment Variables**:
```bash
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_STORAGE_BUCKET_NAME=django-core-static-prod
AWS_S3_REGION_NAME=us-east-1
```

**Best Practices**:
- Use CloudFront CDN for static files
- Enable versioning for backup
- Use IAM roles instead of access keys (ECS/EKS)
- Configure bucket policies to restrict access
- Enable server-side encryption

---

### 4. ECS Deployment (Fargate)

#### Create Task Definition

```bash
# task-definition.json
cat > task-definition.json <<EOF
{
  "family": "django-core",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "django-web",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/django-core:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "DEBUG", "value": "False"},
        {"name": "ALLOWED_HOSTS", "value": "example.com"}
      ],
      "secrets": [
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:django/SECRET_KEY"
        },
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:django/DATABASE_URL"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/django-core",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/health/live || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### Create ECS Service

```bash
aws ecs create-service \
  --cluster django-core-cluster \
  --service-name django-web \
  --task-definition django-core:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0123456789abcdef],securityGroups=[sg-0123456789abcdef],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/django-web/abcd1234,containerName=django-web,containerPort=8000" \
  --health-check-grace-period-seconds 60
```

**IAM Role Policies** (ecsTaskRole):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::django-core-static-prod/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:django/*"
    }
  ]
}
```

---

### 5. EKS Deployment (Kubernetes)

#### Create EKS Cluster

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster
eksctl create cluster \
  --name django-core \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name django-core
```

#### Deploy Application

```bash
# Push image to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
docker tag django-core:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/django-core:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/django-core:latest

# Create secrets
kubectl create secret generic django-core-secrets \
  --from-literal=SECRET_KEY="$(aws secretsmanager get-secret-value --secret-id django/SECRET_KEY --query SecretString --output text)" \
  --from-literal=DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id django/DATABASE_URL --query SecretString --output text)"

# Update image in k8s manifests
sed -i 's|your-registry/django-core:latest|123456789012.dkr.ecr.us-east-1.amazonaws.com/django-core:latest|g' k8s/*.yaml

# Deploy
kubectl apply -f k8s/
```

**Best Practices**:
- Use IAM roles for service accounts (IRSA)
- Enable cluster autoscaler
- Use AWS Load Balancer Controller for ingress
- Enable CloudWatch Container Insights
- Use AWS App Mesh for service mesh (optional)

---

### AWS Cost Optimization

| Service | Instance Type | Monthly Cost (estimate) |
|---------|---------------|-------------------------|
| RDS PostgreSQL | db.t3.micro | ~$15 |
| ElastiCache Redis | cache.t3.micro (2 nodes) | ~$25 |
| ECS Fargate | 0.5 vCPU, 1GB (3 tasks) | ~$30 |
| ALB | Standard | ~$20 |
| S3 | 50GB storage + transfer | ~$5 |
| **Total** | | **~$95/month** |

**Savings Tips**:
- Use Reserved Instances for RDS/ElastiCache (40-60% savings)
- Use Savings Plans for ECS Fargate
- Enable S3 Intelligent-Tiering
- Use CloudFront to reduce S3 transfer costs
- Right-size instances based on CloudWatch metrics

---

## Google Cloud Platform (GCP)

### Overview

Deploy Django Core-App using GCP managed services:
- **Compute**: Cloud Run or GKE (Kubernetes)
- **Database**: Cloud SQL PostgreSQL
- **Cache**: Memorystore Redis
- **Storage**: Cloud Storage for static/media files
- **Load Balancer**: Cloud Load Balancing
- **Secrets**: Secret Manager

---

### Prerequisites

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize and authenticate
gcloud init
gcloud auth login
gcloud config set project django-core-prod
```

---

### 1. Cloud SQL PostgreSQL Setup

#### Create Database Instance

```bash
# Create instance
gcloud sql instances create django-core-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --database-flags=max_connections=100

# Create database
gcloud sql databases create django_core --instance=django-core-db

# Create user
gcloud sql users create dbadmin \
  --instance=django-core-db \
  --password=<secure-password>

# Enable Cloud SQL Admin API
gcloud services enable sqladmin.googleapis.com
```

#### Connection Options

**Option 1: Unix Socket (Cloud SQL Proxy)**

```bash
# Download Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Get connection name
gcloud sql instances describe django-core-db --format="value(connectionName)"
# Output: django-core-prod:us-central1:django-core-db

# Run proxy
./cloud_sql_proxy -instances=django-core-prod:us-central1:django-core-db=tcp:5432

# DATABASE_URL (unix socket - for Cloud Run/GKE)
DATABASE_URL=postgresql://dbadmin:password@/django_core?host=/cloudsql/django-core-prod:us-central1:django-core-db
```

**Option 2: Public IP** (not recommended for production)

```bash
# Assign public IP
gcloud sql instances patch django-core-db --assign-ip

# Get IP address
gcloud sql instances describe django-core-db --format="value(ipAddresses[0].ipAddress)"

# DATABASE_URL
DATABASE_URL=postgresql://dbadmin:password@34.123.45.67:5432/django_core
```

**Best Practices**:
- Use Private IP with VPC peering
- Enable automatic backups (point-in-time recovery)
- Use high availability configuration (multi-zone)
- Enable encryption at rest
- Use IAM authentication (optional)

---

### 2. Memorystore Redis Setup

#### Create Redis Instance

```bash
# Create instance
gcloud redis instances create django-core-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0 \
  --tier=basic \
  --redis-config maxmemory-policy=allkeys-lru

# Get connection info
gcloud redis instances describe django-core-redis \
  --region=us-central1 \
  --format="value(host,port)"

# Output: 10.0.0.3 6379
```

#### Configure REDIS_URL

```bash
# Basic tier (no AUTH)
REDIS_URL=redis://10.0.0.3:6379/0

# Standard tier with AUTH
gcloud redis instances get-auth-string django-core-redis --region=us-central1
REDIS_URL=redis://:AUTH_STRING@10.0.0.3:6379/0
```

**Best Practices**:
- Use Standard tier for production (high availability)
- Configure AUTH string
- Use VPC peering for secure access
- Enable Redis persistence (Standard tier only)
- Monitor memory usage with Cloud Monitoring

---

### 3. Cloud Storage for Static/Media Files

#### Create Bucket

```bash
# Create bucket
gsutil mb -p django-core-prod -c STANDARD -l us-central1 gs://django-core-static-prod/

# Set bucket policy (public read for static files)
gsutil iam ch allUsers:objectViewer gs://django-core-static-prod/

# Enable versioning
gsutil versioning set on gs://django-core-static-prod/

# Configure CORS
cat > cors.json <<EOF
[
  {
    "origin": ["https://example.com"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://django-core-static-prod/
```

#### Configure Django for Cloud Storage

```python
# settings/production.py
import os
from google.oauth2 import service_account

# GCS Configuration
GS_BUCKET_NAME = 'django-core-static-prod'
GS_CREDENTIALS = service_account.Credentials.from_service_account_file(
    os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
)

# Static files
STATIC_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/static/'
STATICFILES_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'

# Media files
MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/media/'
DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
```

**Environment Variables**:
```bash
GCS_BUCKET_NAME=django-core-static-prod
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**Best Practices**:
- Use Cloud CDN for global distribution
- Configure lifecycle rules (delete old versions)
- Use signed URLs for private files
- Enable object versioning
- Use Workload Identity (GKE) instead of service account keys

---

### 4. Cloud Run Deployment (Serverless)

#### Build and Deploy

```bash
# Build image with Cloud Build
gcloud builds submit --tag gcr.io/django-core-prod/django-core:latest

# Deploy to Cloud Run
gcloud run deploy django-core \
  --image gcr.io/django-core-prod/django-core:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --concurrency 80 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars DEBUG=False,ALLOWED_HOSTS=example.com \
  --set-secrets SECRET_KEY=django-secret-key:latest,DATABASE_URL=django-database-url:latest \
  --add-cloudsql-instances django-core-prod:us-central1:django-core-db \
  --vpc-connector django-vpc-connector

# Get service URL
gcloud run services describe django-core --region us-central1 --format="value(status.url)"
```

**Cloud Run Advantages**:
- Pay only for requests (no idle costs)
- Automatic scaling (0 to thousands)
- Built-in HTTPS
- Easy CI/CD integration

**Limitations**:
- 300s request timeout (not suitable for long tasks)
- Requires Cloud SQL Proxy for database
- Cold start latency (~2-3s)

---

### 5. GKE Deployment (Kubernetes)

#### Create GKE Cluster

```bash
# Create cluster
gcloud container clusters create django-core \
  --region us-central1 \
  --num-nodes 3 \
  --machine-type n1-standard-1 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 5 \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-stackdriver-kubernetes \
  --workload-pool=django-core-prod.svc.id.goog

# Get credentials
gcloud container clusters get-credentials django-core --region us-central1
```

#### Deploy Application

```bash
# Push image to GCR
docker tag django-core:latest gcr.io/django-core-prod/django-core:latest
docker push gcr.io/django-core-prod/django-core:latest

# Create secrets
kubectl create secret generic django-core-secrets \
  --from-literal=SECRET_KEY="$(gcloud secrets versions access latest --secret=django-secret-key)" \
  --from-literal=DATABASE_URL="$(gcloud secrets versions access latest --secret=django-database-url)"

# Update image in k8s manifests
sed -i 's|your-registry/django-core:latest|gcr.io/django-core-prod/django-core:latest|g' k8s/*.yaml

# Deploy
kubectl apply -f k8s/
```

**Workload Identity** (secure service account access):

```bash
# Create Kubernetes service account
kubectl create serviceaccount django-core-sa

# Bind to Google service account
gcloud iam service-accounts add-iam-policy-binding \
  django-core@django-core-prod.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:django-core-prod.svc.id.goog[default/django-core-sa]"

# Annotate Kubernetes service account
kubectl annotate serviceaccount django-core-sa \
  iam.gke.io/gcp-service-account=django-core@django-core-prod.iam.gserviceaccount.com

# Update deployment to use service account
spec:
  serviceAccountName: django-core-sa
```

---

### GCP Cost Optimization

| Service | Instance Type | Monthly Cost (estimate) |
|---------|---------------|-------------------------|
| Cloud SQL | db-f1-micro | ~$7 |
| Memorystore | Basic 1GB | ~$40 |
| Cloud Run | 1M requests | ~$10 |
| Cloud Load Balancing | | ~$18 |
| Cloud Storage | 50GB + egress | ~$5 |
| **Total** | | **~$80/month** |

**Savings Tips**:
- Use committed use discounts (30-70% savings)
- Use preemptible VMs for non-critical workloads
- Enable sustained use discounts (automatic)
- Use Cloud CDN to reduce egress costs
- Right-size instances with Recommender

---

## Microsoft Azure

### Overview

Deploy Django Core-App using Azure managed services:
- **Compute**: Azure App Service or AKS (Kubernetes)
- **Database**: Azure Database for PostgreSQL
- **Cache**: Azure Cache for Redis
- **Storage**: Azure Blob Storage
- **Load Balancer**: Azure Load Balancer / Application Gateway
- **Secrets**: Azure Key Vault

---

### Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Set subscription
az account set --subscription "Your Subscription Name"

# Create resource group
az group create --name django-core-rg --location eastus
```

---

### 1. Azure Database for PostgreSQL Setup

#### Create Database Server

```bash
# Create PostgreSQL server (Flexible Server)
az postgres flexible-server create \
  --resource-group django-core-rg \
  --name django-core-db \
  --location eastus \
  --admin-user dbadmin \
  --admin-password <secure-password> \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --backup-retention 7 \
  --high-availability Disabled

# Create database
az postgres flexible-server db create \
  --resource-group django-core-rg \
  --server-name django-core-db \
  --database-name django_core

# Configure firewall (allow Azure services)
az postgres flexible-server firewall-rule create \
  --resource-group django-core-rg \
  --name django-core-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### Configure DATABASE_URL

```bash
# Get connection string
az postgres flexible-server show-connection-string \
  --server-name django-core-db \
  --admin-user dbadmin \
  --admin-password <password> \
  --database-name django_core

# DATABASE_URL (SSL required)
DATABASE_URL=postgresql://dbadmin:<password>@django-core-db.postgres.database.azure.com:5432/django_core?sslmode=require
```

**Best Practices**:
- Enable high availability (zone-redundant)
- Use Private Link for secure access
- Enable automated backups
- Configure maintenance window
- Use Azure AD authentication (optional)

---

### 2. Azure Cache for Redis Setup

#### Create Redis Cache

```bash
# Create Redis cache
az redis create \
  --resource-group django-core-rg \
  --name django-core-redis \
  --location eastus \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port false

# Get connection details
az redis show \
  --resource-group django-core-rg \
  --name django-core-redis \
  --query '[hostName,sslPort,accessKeys.primaryKey]' \
  --output tsv
```

#### Configure REDIS_URL

```bash
# SSL required (port 6380)
REDIS_URL=redis://:PRIMARY_KEY@django-core-redis.redis.cache.windows.net:6380/0?ssl_cert_reqs=required
```

**Best Practices**:
- Use Standard or Premium tier for production
- Enable data persistence (Premium tier only)
- Configure VNet integration
- Enable geo-replication (Premium tier only)
- Monitor with Azure Monitor

---

### 3. Azure Blob Storage for Static/Media Files

#### Create Storage Account

```bash
# Create storage account
az storage account create \
  --resource-group django-core-rg \
  --name djangocorestatic \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Create container
az storage container create \
  --account-name djangocorestatic \
  --name static \
  --public-access blob

# Get connection string
az storage account show-connection-string \
  --resource-group django-core-rg \
  --name djangocorestatic \
  --output tsv
```

#### Configure Django for Azure Blob

```python
# settings/production.py
import os

# Azure Storage Configuration
AZURE_ACCOUNT_NAME = os.getenv('AZURE_ACCOUNT_NAME')
AZURE_ACCOUNT_KEY = os.getenv('AZURE_ACCOUNT_KEY')
AZURE_CONTAINER = 'static'

# Static files
STATIC_URL = f'https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/static/'
STATICFILES_STORAGE = 'storages.backends.azure_storage.AzureStorage'

# Media files
MEDIA_URL = f'https://{AZURE_ACCOUNT_NAME}.blob.core.windows.net/{AZURE_CONTAINER}/media/'
DEFAULT_FILE_STORAGE = 'storages.backends.azure_storage.AzureStorage'
```

**Environment Variables**:
```bash
AZURE_ACCOUNT_NAME=djangocorestatic
AZURE_ACCOUNT_KEY=<storage-account-key>
AZURE_CONTAINER=static
```

---

### 4. Azure App Service Deployment

#### Create App Service Plan

```bash
# Create App Service plan
az appservice plan create \
  --resource-group django-core-rg \
  --name django-core-plan \
  --location eastus \
  --is-linux \
  --sku B1

# Create Web App
az webapp create \
  --resource-group django-core-rg \
  --plan django-core-plan \
  --name django-core-app \
  --runtime "PYTHON:3.12"

# Configure container
az webapp config container set \
  --resource-group django-core-rg \
  --name django-core-app \
  --docker-custom-image-name djangocore.azurecr.io/django-core:latest \
  --docker-registry-server-url https://djangocore.azurecr.io

# Configure environment variables
az webapp config appsettings set \
  --resource-group django-core-rg \
  --name django-core-app \
  --settings \
    DEBUG=False \
    ALLOWED_HOSTS=django-core-app.azurewebsites.net \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://django-kv.vault.azure.net/secrets/DATABASE-URL/)" \
    SECRET_KEY="@Microsoft.KeyVault(SecretUri=https://django-kv.vault.azure.net/secrets/SECRET-KEY/)"
```

---

### 5. AKS Deployment (Kubernetes)

#### Create AKS Cluster

```bash
# Create AKS cluster
az aks create \
  --resource-group django-core-rg \
  --name django-core-aks \
  --node-count 3 \
  --node-vm-size Standard_B2s \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 5 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials \
  --resource-group django-core-rg \
  --name django-core-aks
```

#### Deploy Application

```bash
# Create Azure Container Registry
az acr create \
  --resource-group django-core-rg \
  --name djangocore \
  --sku Basic

# Attach ACR to AKS
az aks update \
  --resource-group django-core-rg \
  --name django-core-aks \
  --attach-acr djangocore

# Push image
az acr login --name djangocore
docker tag django-core:latest djangocore.azurecr.io/django-core:latest
docker push djangocore.azurecr.io/django-core:latest

# Deploy to AKS
kubectl apply -f k8s/
```

---

### Azure Cost Optimization

| Service | Instance Type | Monthly Cost (estimate) |
|---------|---------------|-------------------------|
| PostgreSQL Flexible | Burstable B1ms | ~$12 |
| Redis Cache | Basic C0 | ~$17 |
| App Service | B1 | ~$13 |
| Blob Storage | 50GB + egress | ~$5 |
| **Total** | | **~$47/month** |

**Savings Tips**:
- Use Azure Reservations (save up to 72%)
- Use Dev/Test pricing (eligible subscriptions)
- Use autoscaling to reduce idle costs
- Enable Azure Hybrid Benefit (if applicable)
- Use cool/archive tiers for infrequent data

---

## Comparison Matrix

| Feature | AWS | GCP | Azure |
|---------|-----|-----|-------|
| **Database** | RDS PostgreSQL | Cloud SQL | Azure Database for PostgreSQL |
| **Cache** | ElastiCache | Memorystore | Azure Cache for Redis |
| **Storage** | S3 | Cloud Storage | Blob Storage |
| **Serverless** | ECS Fargate | Cloud Run | Azure Container Instances |
| **Kubernetes** | EKS | GKE | AKS |
| **Secrets** | Secrets Manager | Secret Manager | Key Vault |
| **CDN** | CloudFront | Cloud CDN | Azure CDN |
| **Load Balancer** | ALB | Cloud Load Balancing | Application Gateway |
| **Monitoring** | CloudWatch | Cloud Monitoring | Azure Monitor |
| **Typical Monthly Cost** | ~$95 | ~$80 | ~$47 |
| **Free Tier** | 12 months | 90 days + always-free | 12 months |

---

## Multi-Cloud Considerations

### Benefits of Multi-Cloud

- **Avoid vendor lock-in**: Easier migration between providers
- **Geographic distribution**: Serve users from nearest region
- **Disaster recovery**: Failover to secondary provider
- **Cost optimization**: Use cheapest provider for each service

### Challenges

- **Complexity**: Multiple CLIs, APIs, billing systems
- **Data transfer costs**: Egress fees between clouds
- **Consistency**: Different service capabilities
- **Monitoring**: Unified observability across clouds

### Multi-Cloud Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Traffic Manager                     │
│                   (Route 53 / Cloud DNS)                │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
    ┌───────▼───────┐             ┌───────▼───────┐
    │   AWS Region  │             │   GCP Region  │
    │   (Primary)   │             │  (Secondary)  │
    ├───────────────┤             ├───────────────┤
    │ ECS + RDS     │             │ GKE + Cloud SQL│
    │ ElastiCache   │             │ Memorystore   │
    │ S3            │             │ Cloud Storage │
    └───────────────┘             └───────────────┘
            │                             │
            └──────────┬──────────────────┘
                       │
              ┌────────▼────────┐
              │ Database Sync   │
              │ (pg_dump + S3)  │
              └─────────────────┘
```

### Multi-Cloud Best Practices

1. **Use standard formats**: Docker containers, Kubernetes manifests
2. **Externalize configuration**: Environment variables, not hardcoded
3. **Abstract cloud services**: Use interfaces (e.g., django-storages)
4. **Automate deployments**: Terraform, Ansible for infrastructure
5. **Monitor everything**: Datadog, New Relic for unified view
6. **Test failover**: Regular DR drills

---

## See Also

- [Quickstart Guide](quickstart.md) - Deployment instructions
- [Configuration Reference](configuration-reference.md) - Environment variables
- [Troubleshooting Guide](troubleshooting.md) - Cloud-specific issues
- [Alternatives Guide](alternatives.md) - Alternative deployment options
