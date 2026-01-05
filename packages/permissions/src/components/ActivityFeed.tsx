import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore - Workspace dependencies
import { Box, Text, Stack, Badge, Button, Select, Spinner, Card } from '@django-core/design-system';
// @ts-ignore - Workspace dependencies
import { fetchWithCSRF } from '@django-core/api-client';
import { formatDistanceToNow } from 'date-fns';

export type ActivityEventType =
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'ROLE_CHANGED'
  | 'INVITE_SENT'
  | 'PROMOTION_REQUESTED';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    email: string;
  };
  target?: {
    id: string;
    name: string;
    type: 'USER' | 'PROJECT' | 'ORGANIZATION';
  };
  details: Record<string, any>;
}

interface ActivityFeedProps {
  organizationId?: string;
  projectId?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ organizationId, projectId }) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filterType, setFilterType] = useState<ActivityEventType | 'ALL'>('ALL');

  const fetchEvents = useCallback(async (pageNum: number, typeFilter: string) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        page_size: '10',
      });

      if (typeFilter !== 'ALL') {
        queryParams.append('type', typeFilter);
      }
      if (organizationId) {
        queryParams.append('organization', organizationId);
      }
      if (projectId) {
        queryParams.append('project', projectId);
      }

      const response = await fetchWithCSRF(`/api/v1/activity/?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activity');
      }

      const data = await response.json();

      if (pageNum === 1) {
        setEvents(data.results);
      } else {
        setEvents(prev => [...prev, ...data.results]);
      }

      setHasMore(!!data.next);
    } catch (error) {
      console.error('Error fetching activity:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectId]);

  useEffect(() => {
    setPage(1);
    fetchEvents(1, filterType);
  }, [fetchEvents, filterType]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchEvents(nextPage, filterType);
  };

  const getEventIcon = (type: ActivityEventType) => {
    switch (type) {
      case 'MEMBER_ADDED': return '👤+';
      case 'MEMBER_REMOVED': return '👤-';
      case 'ROLE_CHANGED': return '🔄';
      case 'INVITE_SENT': return '✉️';
      case 'PROMOTION_REQUESTED': return '⬆️';
      default: return '📝';
    }
  };

  const getEventColor = (type: ActivityEventType) => {
    switch (type) {
      case 'MEMBER_ADDED': return 'success';
      case 'MEMBER_REMOVED': return 'danger';
      case 'ROLE_CHANGED': return 'warning';
      case 'INVITE_SENT': return 'info';
      case 'PROMOTION_REQUESTED': return 'primary';
      default: return 'neutral';
    }
  };

  const renderEventMessage = (event: ActivityEvent) => {
    const actorName = event.actor.name || event.actor.email;
    const targetName = event.target?.name || 'Unknown';

    switch (event.type) {
      case 'MEMBER_ADDED':
        return <Text><strong>{actorName}</strong> added <strong>{targetName}</strong> to the team.</Text>;
      case 'MEMBER_REMOVED':
        return <Text><strong>{actorName}</strong> removed <strong>{targetName}</strong> from the team.</Text>;
      case 'ROLE_CHANGED':
        return <Text><strong>{actorName}</strong> changed role of <strong>{targetName}</strong> to {event.details.new_role}.</Text>;
      case 'INVITE_SENT':
        return <Text><strong>{actorName}</strong> sent an invite to <strong>{event.details.email}</strong>.</Text>;
      case 'PROMOTION_REQUESTED':
        return <Text><strong>{actorName}</strong> requested promotion to <strong>{event.details.requested_role}</strong>.</Text>;
      default:
        return <Text><strong>{actorName}</strong> performed an action.</Text>;
    }
  };

  return (
    <Box className="activity-feed">
      <Stack direction="row" justify="space-between" align="center" className="mb-4">
        <Text variant="h3">Activity Feed</Text>
        <Select
          value={filterType}
          onChange={(e: any) => setFilterType(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Events' },
            { value: 'MEMBER_ADDED', label: 'Member Added' },
            { value: 'MEMBER_REMOVED', label: 'Member Removed' },
            { value: 'ROLE_CHANGED', label: 'Role Changed' },
            { value: 'INVITE_SENT', label: 'Invite Sent' },
            { value: 'PROMOTION_REQUESTED', label: 'Promotion Requested' },
          ]}
        />
      </Stack>

      {error && (
        <Box padding="md" className="error-message">
          <Text color="error">{error}</Text>
        </Box>
      )}

      <Stack spacing="md">
        {events.map(event => (
          <Card key={event.id} padding="sm">
            <Stack direction="row" spacing="sm" align="start">
              <Badge variant={getEventColor(event.type)}>{getEventIcon(event.type)}</Badge>
              <Box flex={1}>
                {renderEventMessage(event)}
                <Text variant="caption" color="text.secondary">
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </Text>
              </Box>
            </Stack>
          </Card>
        ))}
      </Stack>

      {loading && (
        <Box display="flex" justifyContent="center" padding="md">
          <Spinner />
        </Box>
      )}

      {!loading && hasMore && (
        <Box display="flex" justifyContent="center" padding="md">
          <Button onClick={handleLoadMore} variant="outline">Load More</Button>
        </Box>
      )}

      {!loading && events.length === 0 && (
        <Box textAlign="center" padding="xl">
          <Text color="text.secondary">No activity found.</Text>
        </Box>
      )}
    </Box>
  );
};
