/**
 * Sidebar — Recents recorder sub-hook
 *
 * Watches location changes and records navigation entries into the
 * recents store so the "Recents" panel is always up to date.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { addRecent } from '../utils/navStorage';
import type { ResolvedAppContext } from './useResolvedAppContext';

export function useSidebarRecents(resolvedAppContext: ResolvedAppContext | null): void {
    const location = useLocation();

    useEffect(() => {
        const pathname = String(location.pathname || '').trim();
        const search = String(location.search || '');
        const fullPath = `${pathname}${search}`;

        if (!pathname || pathname === '/' || pathname.startsWith('/recents') || pathname.startsWith('/favorites')) {
            return;
        }

        const segs = pathname.split('/').map(s => s.trim()).filter(Boolean);
        if (segs.length === 0) return;

        // Track common pages (no backend needed; this makes Recents feel alive immediately).
        if (pathname === '/directory') {
            const tab = new URLSearchParams(search).get('tab');
            const label = tab ? `Directory \u2022 ${String(tab).trim()}` : 'Directory';
            addRecent({ kind: 'page', label, path: fullPath });
            return;
        }

        if (pathname.startsWith('/content')) {
            addRecent({ kind: 'page', label: 'Library', path: fullPath });
            return;
        }

        if (pathname.startsWith('/studio')) {
            addRecent({ kind: 'page', label: 'Gallery', path: fullPath });
            return;
        }

        if (pathname.startsWith('/credits')) {
            const wallet = new URLSearchParams(search).get('wallet');
            addRecent({ kind: 'page', label: wallet === 'personal' ? 'My Wallet' : 'Credits', path: fullPath });
            return;
        }

        if (pathname === '/profile' || pathname === '/preferences' || pathname.startsWith('/notifications')) {
            const label = pathname === '/profile' ? 'My Profile' : (pathname === '/preferences' ? 'Preferences' : 'Notifications');
            addRecent({ kind: 'page', label, path: fullPath });
            return;
        }

        // Canonical vanity hierarchy (best labels from resolved context).
        const reservedRoots = new Set([
            'dashboard', 'directory', 'content', 'studio', 'permissions',
            'settings', 'health', 'docs', 'constitution', 'search',
            'login', 'logout', 'register', 'organisations', 'projects',
            'matches', 'users', 'credits', 'profile', 'notifications',
            'preferences', 'audit', 'flags', 'integration-status',
            'design-system', 'observability', 'security', 'api-docs',
            'demo', 'usage-events', 'routing-logs', 'auth-flows',
            'context', 'resources', 'recents', 'favorites',
        ]);

        // If it's not a reserved root, assume it's a vanity hierarchy route.
        if (!reservedRoots.has(segs[0])) {
            // Org-scoped list routes like /:orgId/clubs should be treated as pages.
            const orgSectionLike = new Set(['clubs', 'teams', 'seasons', 'competitions', 'matches', 'users', 'projects']);
            if (segs[1] && orgSectionLike.has(segs[1])) {
                const orgLabel = String(resolvedAppContext?.orgName || segs[0]).trim();
                addRecent({ kind: 'page', label: `${orgLabel} \u2022 ${segs[1]}`, path: fullPath });
                return;
            }

            const kindOrder = ['federation', 'club', 'team', 'season', 'competition', 'match'] as const;
            const depth = Math.min(segs.length, kindOrder.length) - 1;
            const kind = kindOrder[Math.max(0, depth)];

            let label = '';
            if (kind === 'federation') label = resolvedAppContext?.orgName || segs[0];
            else if (kind === 'club') label = resolvedAppContext?.club?.name || segs[1];
            else if (kind === 'team') label = resolvedAppContext?.team?.name || segs[2];
            else if (kind === 'season') label = resolvedAppContext?.season?.name || segs[3];
            else if (kind === 'competition') label = resolvedAppContext?.competition?.name || segs[4];
            else if (kind === 'match') label = resolvedAppContext?.match?.label || segs[5];

            const cleanLabel = String(label || '').trim();
            if (!cleanLabel) return;

            addRecent({ kind, label: cleanLabel, path: fullPath });
            return;
        }
    }, [location.pathname, location.search, resolvedAppContext]);
}
