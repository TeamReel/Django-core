# Nginx Reverse Proxy Configuration

Production-ready Nginx configurations for Django Core-App with B03 security headers, static file serving, and SSL termination.

## Files

- **local.conf** - Simple HTTP proxy for local development (optional)
- **staging.conf** - HTTP configuration with security headers for staging
- **production.conf** - Full HTTPS configuration with SSL termination and comprehensive security

## Quick Start

### Local Development (Optional)

```bash
# Add nginx service to docker-compose.local.yml
docker-compose -f docker-compose.local.yml up nginx
```

Access: http://localhost/ (proxies to Django at :8000)

### Staging Deployment

```bash
# Use with docker-compose.staging.yml
docker-compose -f docker-compose.staging.yml up nginx
```

**Configuration**:
- HTTP only (port 80)
- Security headers included (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
- Static files served from `/app/staticfiles/` with 1-year cache
- Proxy to Django at `web:8000`

### Production Deployment

```bash
# Ensure SSL certificates are in place
mkdir -p ssl
# Place fullchain.pem and privkey.pem in ssl/ directory

docker-compose -f docker-compose.prod.yml up nginx
```

**Configuration**:
- HTTP → HTTPS redirect (port 80 → 443)
- Full SSL/TLS (TLS 1.2, TLS 1.3)
- Comprehensive security headers (B03 compliance)
- Static files with aggressive caching (immutable, 1 year)
- OCSP stapling for certificate validation
- Gzip compression for text assets

## Security Headers (B03 Integration)

All configurations include security headers aligned with B03 Security Baseline:

### Staging & Production

| Header | Value | Purpose |
|--------|-------|---------|
| **Strict-Transport-Security** | max-age=31536000; includeSubDomains; preload | Force HTTPS for 1 year |
| **X-Content-Type-Options** | nosniff | Prevent MIME type sniffing |
| **X-Frame-Options** | DENY | Prevent clickjacking |
| **X-XSS-Protection** | 1; mode=block | Enable XSS filter |
| **Referrer-Policy** | strict-origin-when-cross-origin | Limit referrer information |
| **Content-Security-Policy** | (see config) | Restrict resource loading |

### Production-Only

| Header | Value | Purpose |
|--------|-------|---------|
| **Permissions-Policy** | geolocation=(), microphone=(), camera=() | Restrict browser features |

## SSL/TLS Configuration

### Certificate Setup (Let's Encrypt)

```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Obtain certificate (webroot method)
certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Update production.conf with your domain and certificate paths
```

### Certificate Renewal

```bash
# Test renewal
certbot renew --dry-run

# Auto-renewal (add to crontab)
0 0 * * * certbot renew --quiet --deploy-hook "nginx -s reload"
```

## Static File Serving

Nginx serves static files directly (bypass Django) for optimal performance:

### Staging & Production

```nginx
location /static/ {
    alias /app/staticfiles/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location /media/ {
    alias /app/mediafiles/;
    expires 30d;
    add_header Cache-Control "public";
}
```

**Volume mapping** (docker-compose):
```yaml
volumes:
  - staticfiles:/app/staticfiles:ro
  - mediafiles:/app/mediafiles:ro
```

## Performance Optimization

### Gzip Compression (Production)

Text assets (CSS, JS, JSON, SVG) are compressed:

```nginx
gzip on;
gzip_vary on;
gzip_types text/css text/javascript application/javascript application/json image/svg+xml;
gzip_min_length 1000;
```

### Connection Keep-Alive

Production config uses HTTP keep-alive for reduced latency:

```nginx
upstream django {
    keepalive 32;  # Maintain 32 persistent connections
}
```

### Buffer Tuning

Optimized proxy buffers for Django responses:

```nginx
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;
```

## Health Checks (B18 Integration)

Health endpoints bypass proxy caching for fast responses:

```nginx
location /health/ {
    proxy_pass http://django;
    access_log off;
}
```

Compatible with B18 Health Check & Readiness system:
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

## Rate Limiting (Optional)

Add to `nginx.conf` http block:

```nginx
http {
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # In server block:
    limit_req zone=api_limit burst=20 nodelay;
}
```

## Monitoring (B18 Integration)

### Prometheus Metrics

Production config includes metrics endpoint:

```nginx
location /metrics {
    proxy_pass http://django;

    # Restrict to monitoring systems only
    allow 10.0.0.0/8;  # Internal network
    deny all;
}
```

### Access Logs

Location: `/var/log/nginx/access.log`

Format: Combined (default)

**Disable for performance** (already done for `/static/`, `/media/`, `/health/`):
```nginx
access_log off;
```

### Error Logs

Location: `/var/log/nginx/error.log`

Monitor for:
- Upstream connection failures (Django down)
- SSL handshake errors
- 502/504 gateway errors (Django timeout)

## Troubleshooting

### 502 Bad Gateway

**Cause**: Nginx can't connect to Django upstream.

**Solutions**:
```bash
# Check Django is running
docker-compose ps web

# Check upstream configuration
grep "upstream django" nginx/*.conf

# Verify network connectivity
docker-compose exec nginx ping web
```

### 504 Gateway Timeout

**Cause**: Django response time exceeds proxy timeout.

**Solutions**:
- Increase `proxy_read_timeout` in Nginx config
- Increase Gunicorn `--timeout` setting
- Optimize slow Django views/queries

### SSL Certificate Errors

**Cause**: Certificate expired or paths incorrect.

**Solutions**:
```bash
# Check certificate expiry
openssl x509 -in /etc/nginx/ssl/fullchain.pem -noout -dates

# Verify certificate paths in config
grep "ssl_certificate" nginx/production.conf

# Test SSL configuration
nginx -t
```

### Static Files Not Found (404)

**Cause**: Volume not mounted or collectstatic not run.

**Solutions**:
```bash
# Verify volume mapping
docker-compose config | grep staticfiles

# Run collectstatic
docker-compose exec web python manage.py collectstatic --noinput

# Check file permissions
docker-compose exec nginx ls -la /app/staticfiles/
```

## Cloud Deployment

### AWS (ELB + Nginx)

- Use AWS ELB for SSL termination (recommended)
- Or use Nginx with ACM certificates (manual renewal)
- Configure HSTS preload for production domains

### GCP (Cloud Load Balancer + Nginx)

- Use Cloud Load Balancer for SSL termination
- Or use Nginx with managed SSL certificates
- Configure Cloud CDN for static files

### Azure (Application Gateway + Nginx)

- Use Application Gateway for SSL termination
- Or use Nginx with Key Vault certificates
- Configure Azure CDN for static files

## Production Checklist

Before deploying production Nginx:

- [ ] Replace `server_name _` with actual domain
- [ ] Obtain and install SSL certificates
- [ ] Update certificate paths in production.conf
- [ ] Configure DNS to point to load balancer/Nginx
- [ ] Test SSL configuration: `nginx -t`
- [ ] Verify HSTS is working: `curl -I https://yourdomain.com`
- [ ] Test static file serving: `curl https://yourdomain.com/static/...`
- [ ] Enable access logs monitoring
- [ ] Configure log rotation
- [ ] Set up certificate auto-renewal
- [ ] Test HTTP → HTTPS redirect
- [ ] Verify security headers: `curl -I https://yourdomain.com`
- [ ] Run SSL Labs test: https://www.ssllabs.com/ssltest/

## Related Documentation

- [B03 Security Baseline](../docs/security-audit-wp10.md)
- [B18 Platform Observability](../docs/observability.md)
- [Docker Compose Configuration](../docker-compose.*.yml)
- [Environment Variables](.env.example)
