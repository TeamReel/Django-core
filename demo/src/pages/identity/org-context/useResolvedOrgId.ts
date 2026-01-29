import { useEffect, useState } from 'react';

import { looksLikeUuid } from '../../../utils/periodPath';
import { getApiBaseUrl } from '../../../utils/apiBase';

type ResolvedOrgIdState = {
  orgId: string;
  loading: boolean;
  error?: string;
};

const looksLikeNumericId = (value: string) => /^\d+$/.test(String(value || '').trim());

export const useResolvedOrgId = (orgIdOrSlug?: string): ResolvedOrgIdState => {
  const key = String(orgIdOrSlug || '').trim();

  const [state, setState] = useState<ResolvedOrgIdState>({
    orgId: key,
    loading: false,
  });

  useEffect(() => {
    const k = String(orgIdOrSlug || '').trim();
    if (!k) {
      setState({ orgId: '', loading: false });
      return;
    }

    // Already a concrete ID.
    if (looksLikeUuid(k) || looksLikeNumericId(k)) {
      setState({ orgId: k, loading: false });
      return;
    }

    let cancelled = false;
    const run = async () => {
      setState((prev) => ({ ...prev, orgId: k, loading: true, error: undefined }));
      try {
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(`${apiBaseUrl}/api/v1/organisations/${encodeURIComponent(k)}/`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Failed to resolve organisation (${res.status})`);
        const json = await res.json();
        const resolved = String(json?.id || json?.data?.id || k).trim();

        if (cancelled) return;
        setState({ orgId: resolved || k, loading: false });
      } catch (e) {
        if (cancelled) return;
        setState({ orgId: k, loading: false, error: e instanceof Error ? e.message : 'Failed to resolve organisation' });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [orgIdOrSlug]);

  return state;
};
