# Manual Test Guide: Real-time WebSockets (Feature 035)

## Overview
Test the real-time WebSocket functionality for live notifications, presence tracking, and activity monitoring.

## Prerequisites
- Django server running with WebSocket support
- Redis server running (for channels layer)
- Multiple browser tabs/windows for multi-user testing
- Valid user accounts for authentication testing

## Test Scenarios

### 1. WebSocket Connection
**Objective**: Verify WebSocket connection establishment and authentication

**Steps**:
1. Navigate to `/websocket-demo/` page
2. Open browser developer tools (Network tab)
3. Verify WebSocket connection is established
4. Check authentication status in connection headers
5. Test connection with unauthenticated user

**Expected Results**:
- [ ] WebSocket connection established successfully
- [ ] Authenticated users can connect
- [ ] Unauthenticated users receive appropriate error
- [ ] Connection shows in browser Network tab

### 2. Real-time Messaging
**Objective**: Test bidirectional real-time message delivery

**Steps**:
1. Open two browser windows with different users
2. Send message from User A
3. Verify message appears on User B's screen
4. Test different message types (notification, activity, system)
5. Test message delivery to specific scopes (user, org, project)

**Expected Results**:
- [ ] Messages delivered in real-time (< 1 second)
- [ ] Correct message format and content
- [ ] Proper scope-based message filtering
- [ ] Message ordering is maintained

### 3. Presence Tracking
**Objective**: Verify user presence status updates

**Steps**:
1. User logs in - check presence shows "online"
2. User navigates between pages - verify location updates
3. User goes idle - check "away" status after timeout
4. User closes browser - verify "offline" status
5. Test presence visibility across organization/project scopes

**Expected Results**:
- [ ] Presence status updates correctly
- [ ] Location tracking works
- [ ] Idle timeout functions properly
- [ ] Offline detection works
- [ ] Proper scope isolation for presence

### 4. Activity Feed Monitoring
**Objective**: Test activity event broadcasting

**Steps**:
1. Perform actions in the system (create project, update org, etc.)
2. Verify activity events appear in real-time
3. Test activity filtering by organization/project
4. Check activity event metadata and format
5. Test activity event persistence

**Expected Results**:
- [ ] Activity events broadcast immediately
- [ ] Correct event format and metadata
- [ ] Proper filtering by context
- [ ] Events persist in database
- [ ] Historical events load correctly

### 5. Rate Limiting
**Objective**: Verify rate limiting protects against spam

**Steps**:
1. Send many messages rapidly (> 100/minute)
2. Verify rate limiting kicks in
3. Check error messages for rate limit violations
4. Wait for rate limit reset
5. Test different rate limits per user/connection

**Expected Results**:
- [ ] Rate limiting blocks excessive messages
- [ ] Clear error messages for violations
- [ ] Rate limits reset after time period
- [ ] Different limits for different actions
- [ ] No server performance degradation

### 6. Error Handling
**Objective**: Test error scenarios and recovery

**Steps**:
1. Send malformed WebSocket messages
2. Disconnect Redis server temporarily
3. Restart Django server while clients connected
4. Test with invalid authentication tokens
5. Send messages to non-existent scopes

**Expected Results**:
- [ ] Graceful handling of malformed messages
- [ ] Proper error responses
- [ ] Automatic reconnection attempts
- [ ] Authentication errors handled properly
- [ ] Invalid scope errors handled gracefully

### 7. Performance Testing
**Objective**: Verify performance under load

**Steps**:
1. Connect multiple users (10+ concurrent)
2. Send high frequency messages
3. Monitor server memory/CPU usage
4. Test with large message payloads
5. Check connection cleanup after disconnect

**Expected Results**:
- [ ] Handles multiple concurrent connections
- [ ] Performance remains stable under load
- [ ] Memory usage doesn't leak
- [ ] Large messages handled correctly
- [ ] Proper connection cleanup

### 8. Cross-browser Compatibility
**Objective**: Ensure WebSocket works across browsers

**Steps**:
1. Test in Chrome, Firefox, Safari, Edge
2. Verify WebSocket connection in each
3. Test message delivery across different browsers
4. Check developer tools WebSocket support
5. Test mobile browser compatibility

**Expected Results**:
- [ ] Works in all major browsers
- [ ] Consistent behavior across browsers
- [ ] Mobile browsers supported
- [ ] Developer tools show WebSocket properly

## Integration Tests

### Multi-tenant Context
- [ ] Messages isolated by organization
- [ ] Project-scoped messages work correctly
- [ ] User can switch context and see appropriate messages

### Authentication Integration
- [ ] Session authentication works
- [ ] JWT authentication works (if implemented)
- [ ] Permission-based message filtering

### Database Integration
- [ ] Messages persist correctly
- [ ] Activity events stored properly
- [ ] Presence status updates in DB

## Accessibility
- [ ] Screen reader announcements for new messages
- [ ] Keyboard navigation for WebSocket controls
- [ ] High contrast mode compatibility
- [ ] ARIA labels for dynamic content

## Monitoring & Observability
- [ ] WebSocket metrics appear in Grafana
- [ ] Connection count tracking
- [ ] Message delivery rate metrics
- [ ] Error rate monitoring
- [ ] Health check endpoint responds correctly

## Security
- [ ] WebSocket connections require authentication
- [ ] CSRF protection where applicable
- [ ] No sensitive data in WebSocket messages
- [ ] Proper input sanitization
- [ ] Rate limiting prevents DoS attacks

## Notes
- Document any browser-specific quirks
- Note performance characteristics under different loads
- Record any error messages for debugging
- Test with realistic data volumes
- Verify cleanup of connections and resources

## Sign-off
- [ ] All critical scenarios pass
- [ ] Performance meets requirements
- [ ] Security measures verified
- [ ] Documentation updated
- [ ] Ready for production deployment
