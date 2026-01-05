import React, { useState } from 'react';
// @ts-ignore - Workspace dependencies
import { Button, Spinner, Text } from '@django-core/design-system';
// @ts-ignore - Workspace dependencies
import { fetchWithCSRF } from '@django-core/api-client';

interface ResendInviteButtonProps {
  projectId: string;
  invitationId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const ResendInviteButton: React.FC<ResendInviteButtonProps> = ({
  projectId,
  invitationId,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      const response = await fetchWithCSRF(
        `/api/v1/projects/${projectId}/invitations/${invitationId}/resend/`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error resending invitation:', err);
      if (onError) {
        onError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleResend}
      disabled={loading}
      variant="outline"
      size="sm"
      data-testid="resend-invite-button"
    >
      {loading ? <Spinner /> : 'Resend Invite'}
    </Button>
  );
};
