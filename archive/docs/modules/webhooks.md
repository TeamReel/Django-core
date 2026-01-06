# Webhook Signature Verification

This document provides examples for verifying webhook signatures sent by the Notifications system.

## Overview

All webhook notifications include an `X-Notification-Signature` header containing an HMAC-SHA256 signature. This signature ensures:

1. **Authenticity**: The webhook originated from your system
2. **Integrity**: The payload hasn't been tampered with
3. **Freshness**: The webhook isn't a replay of an old request (via timestamp validation)

## Signature Format

The signature header follows this format:

```
X-Notification-Signature: t={timestamp},v1={hex_signature}
```

- **t**: Unix timestamp (seconds since epoch) when the signature was generated
- **v1**: HMAC-SHA256 signature as a hexadecimal string

## Signature Generation Process

1. Concatenate: `{timestamp}.{json_payload}` (with sorted keys)
2. Generate HMAC-SHA256 using your webhook secret key
3. Return: `t={timestamp},v1={hex_signature}`

## Verification Examples

### Python (Django/Flask)

```python
import hmac
import hashlib
import json
import time

def verify_webhook_signature(
    payload: dict,
    signature_header: str,
    secret_key: str,
    tolerance_seconds: int = 300
) -> bool:
    """Verify webhook signature and timestamp freshness.

    Args:
        payload: Received JSON payload as dictionary
        signature_header: X-Notification-Signature header value
        secret_key: Your webhook secret key
        tolerance_seconds: Maximum age of signature (default 5 minutes)

    Returns:
        True if signature is valid and within tolerance window
    """
    # Parse header: "t={timestamp},v1={signature}"
    parts = signature_header.split(",")
    if len(parts) != 2:
        return False

    try:
        timestamp = int(parts[0][2:])  # Remove "t=" prefix
        received_signature = parts[1][3:]  # Remove "v1=" prefix
    except (ValueError, IndexError):
        return False

    # Check timestamp freshness (prevent replay attacks)
    current_timestamp = int(time.time())
    if abs(current_timestamp - timestamp) > tolerance_seconds:
        return False

    # Generate expected signature
    message = f"{timestamp}.{json.dumps(payload, sort_keys=True)}"
    expected_signature = hmac.new(
        secret_key.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison (prevent timing attacks)
    return hmac.compare_digest(received_signature, expected_signature)


# Usage in Django view
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

@csrf_exempt
def webhook_handler(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # Get signature header
    signature = request.headers.get("X-Notification-Signature")
    if not signature:
        return JsonResponse({"error": "Missing signature"}, status=401)

    # Parse payload
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # Verify signature
    if not verify_webhook_signature(
        payload,
        signature,
        settings.WEBHOOK_SECRET_KEY,
        tolerance_seconds=300
    ):
        return JsonResponse({"error": "Invalid signature"}, status=401)

    # Process notification
    notification_id = payload.get("notification_id")
    notification_type = payload.get("type")
    data = payload.get("data")

    # Your business logic here
    print(f"Received notification {notification_id} of type {notification_type}")

    return JsonResponse({"status": "success"})
```

### Node.js (Express)

```javascript
const crypto = require('crypto');

/**
 * Verify webhook signature and timestamp freshness
 * @param {Object} payload - Received JSON payload
 * @param {string} signatureHeader - X-Notification-Signature header value
 * @param {string} secretKey - Your webhook secret key
 * @param {number} toleranceSeconds - Maximum age of signature (default 300)
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(
    payload,
    signatureHeader,
    secretKey,
    toleranceSeconds = 300
) {
    // Parse header: "t={timestamp},v1={signature}"
    const parts = signatureHeader.split(',');
    if (parts.length !== 2) {
        return false;
    }

    const timestamp = parseInt(parts[0].substring(2), 10);  // Remove "t="
    const receivedSignature = parts[1].substring(3);  // Remove "v1="

    if (isNaN(timestamp)) {
        return false;
    }

    // Check timestamp freshness (prevent replay attacks)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - timestamp) > toleranceSeconds) {
        return false;
    }

    // Generate expected signature (sorted keys for consistency)
    const sortedPayload = JSON.stringify(payload, Object.keys(payload).sort());
    const message = `${timestamp}.${sortedPayload}`;
    const expectedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(message)
        .digest('hex');

    // Constant-time comparison (prevent timing attacks)
    return crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
    );
}

// Usage in Express
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-notification-signature'];

    if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
    }

    const payload = req.body;
    const secretKey = process.env.WEBHOOK_SECRET_KEY;

    if (!verifyWebhookSignature(payload, signature, secretKey, 300)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process notification
    const { notification_id, type, data } = payload;
    console.log(`Received notification ${notification_id} of type ${type}`);

    // Your business logic here

    res.json({ status: 'success' });
});

app.listen(3000, () => {
    console.log('Webhook server listening on port 3000');
});
```

### PHP

```php
<?php

/**
 * Verify webhook signature and timestamp freshness
 *
 * @param array $payload Received JSON payload as associative array
 * @param string $signatureHeader X-Notification-Signature header value
 * @param string $secretKey Your webhook secret key
 * @param int $toleranceSeconds Maximum age of signature (default 300)
 * @return bool True if signature is valid
 */
function verifyWebhookSignature(
    array $payload,
    string $signatureHeader,
    string $secretKey,
    int $toleranceSeconds = 300
): bool {
    // Parse header: "t={timestamp},v1={signature}"
    $parts = explode(',', $signatureHeader);
    if (count($parts) !== 2) {
        return false;
    }

    $timestamp = intval(substr($parts[0], 2));  // Remove "t="
    $receivedSignature = substr($parts[1], 3);  // Remove "v1="

    // Check timestamp freshness (prevent replay attacks)
    $currentTimestamp = time();
    if (abs($currentTimestamp - $timestamp) > $toleranceSeconds) {
        return false;
    }

    // Generate expected signature (sorted keys for consistency)
    ksort($payload);
    $message = $timestamp . '.' . json_encode($payload);
    $expectedSignature = hash_hmac('sha256', $message, $secretKey);

    // Constant-time comparison (prevent timing attacks)
    return hash_equals($receivedSignature, $expectedSignature);
}

// Usage
$payload = json_decode(file_get_contents('php://input'), true);
$signature = $_SERVER['HTTP_X_NOTIFICATION_SIGNATURE'] ?? '';
$secretKey = getenv('WEBHOOK_SECRET_KEY');

if (empty($signature)) {
    http_response_code(401);
    echo json_encode(['error' => 'Missing signature']);
    exit;
}

if (!verifyWebhookSignature($payload, $signature, $secretKey, 300)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

// Process notification
$notificationId = $payload['notification_id'];
$type = $payload['type'];
$data = $payload['data'];

error_log("Received notification $notificationId of type $type");

// Your business logic here

http_response_code(200);
echo json_encode(['status' => 'success']);
?>
```

### Ruby (Rails)

```ruby
require 'openssl'
require 'json'

# Verify webhook signature and timestamp freshness
#
# @param payload [Hash] Received JSON payload
# @param signature_header [String] X-Notification-Signature header value
# @param secret_key [String] Your webhook secret key
# @param tolerance_seconds [Integer] Maximum age of signature (default 300)
# @return [Boolean] True if signature is valid
def verify_webhook_signature(payload, signature_header, secret_key, tolerance_seconds = 300)
  # Parse header: "t={timestamp},v1={signature}"
  parts = signature_header.split(',')
  return false unless parts.length == 2

  timestamp = parts[0][2..-1].to_i  # Remove "t="
  received_signature = parts[1][3..-1]  # Remove "v1="

  # Check timestamp freshness (prevent replay attacks)
  current_timestamp = Time.now.to_i
  return false if (current_timestamp - timestamp).abs > tolerance_seconds

  # Generate expected signature (sorted keys for consistency)
  sorted_payload = JSON.generate(payload.sort.to_h)
  message = "#{timestamp}.#{sorted_payload}"
  expected_signature = OpenSSL::HMAC.hexdigest('SHA256', secret_key, message)

  # Constant-time comparison (prevent timing attacks)
  ActiveSupport::SecurityUtils.secure_compare(received_signature, expected_signature)
end

# Usage in Rails controller
class WebhooksController < ApplicationController
  skip_before_action :verify_authenticity_token

  def receive
    signature = request.headers['X-Notification-Signature']

    unless signature
      render json: { error: 'Missing signature' }, status: :unauthorized
      return
    end

    payload = JSON.parse(request.body.read)
    secret_key = ENV['WEBHOOK_SECRET_KEY']

    unless verify_webhook_signature(payload, signature, secret_key, 300)
      render json: { error: 'Invalid signature' }, status: :unauthorized
      return
    end

    # Process notification
    notification_id = payload['notification_id']
    notification_type = payload['type']
    data = payload['data']

    Rails.logger.info "Received notification #{notification_id} of type #{notification_type}"

    # Your business logic here

    render json: { status: 'success' }
  end
end
```

## Best Practices

### 1. Always Verify Signatures

Never process webhooks without signature verification. This prevents:
- Unauthorized webhook injections
- Man-in-the-middle attacks
- Replay attacks

### 2. Use Constant-Time Comparison

Always use constant-time comparison functions to prevent timing attacks:
- Python: `hmac.compare_digest()`
- Node.js: `crypto.timingSafeEqual()`
- PHP: `hash_equals()`
- Ruby: `ActiveSupport::SecurityUtils.secure_compare()`

### 3. Validate Timestamp Freshness

Set a reasonable tolerance window (recommended: 5 minutes) to prevent replay attacks. Reject webhooks with timestamps outside this window.

### 4. Handle Errors Gracefully

Return appropriate HTTP status codes:
- `401 Unauthorized`: Invalid or missing signature
- `400 Bad Request`: Malformed payload or headers
- `200 OK`: Successfully processed

### 5. Secure Your Secret Key

- Store webhook secret key in environment variables
- Never commit secret keys to version control
- Rotate keys periodically
- Use different keys for production and staging

### 6. Implement Idempotency

Process each webhook notification only once by tracking `notification_id`. Store processed IDs to prevent duplicate processing.

### 7. Implement Retry Logic

If processing fails, return a 5xx status code so the notification system will retry:
- `500 Internal Server Error`: Temporary processing failure
- `503 Service Unavailable`: System overloaded

Return 2xx only when successfully processed.

## Configuration

### Django Settings

```python
# settings.py
WEBHOOK_SECRET_KEY = os.environ.get('WEBHOOK_SECRET_KEY')

if not WEBHOOK_SECRET_KEY:
    raise ValueError("WEBHOOK_SECRET_KEY environment variable must be set")
```

### Environment Variables

```bash
# .env
WEBHOOK_SECRET_KEY=your-secret-key-here-min-32-chars
```

Generate a secure secret key:

```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OpenSSL
openssl rand -base64 32
```

## Testing

When testing webhook handlers, generate valid signatures:

```python
# Python test example
import time
from notifications.services.webhook_signature_service import WebhookSignatureService

def test_webhook_handler():
    payload = {"notification_id": "123", "type": "alert"}
    timestamp = int(time.time())
    signature = WebhookSignatureService.generate_signature(payload, timestamp)

    response = client.post(
        "/webhook",
        json=payload,
        headers={"X-Notification-Signature": signature}
    )

    assert response.status_code == 200
```

## Troubleshooting

### "Invalid signature" Errors

1. **Clock skew**: Ensure server clocks are synchronized (use NTP)
2. **Key mismatch**: Verify you're using the correct secret key
3. **Payload modification**: Ensure payload isn't modified before verification
4. **JSON key ordering**: The signature uses sorted keys - don't manually sort before verification

### Webhook Not Received

1. **Firewall**: Ensure your webhook endpoint is publicly accessible
2. **HTTPS**: Use HTTPS in production for security
3. **Response time**: Return 2xx status within 30 seconds to avoid timeout
4. **Error logs**: Check application logs for processing errors

## Support

For issues or questions:
- Check application logs for detailed error messages
- Verify environment configuration
- Review signature verification implementation
- Contact support with `notification_id` for specific deliveries
