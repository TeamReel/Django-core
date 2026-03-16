/**
 * Sidebar — Panel B configuration builder
 *
 * Pure function that determines which sidebar section is active
 * (work, content, templates, preferences, organisation, platform, help)
 * and delegates to the appropriate builder.
 */
import {
    LayoutDashboard, Globe, Shield, Shirt, CalendarDays, Trophy, Timer,
    Users, Library, Sparkles, Settings, Activity, Flag, Puzzle, Palette,
    LineChart, Lock, BookOpen, Scroll, LucideIcon, Folder,
    Bell, CreditCard, UserCircle, Star, Calendar, Film,
    ClipboardCheck, GitBranch, Video,
} from 'lucide-react';
import { buildWorkSectionPanelB, type PanelBResult } from './sidebarPanelBWork';

/* ------------------------------------------------------------------ */
/*  Params                                                             */
/* ------------------------------------------------------------------ */

export interface PanelBConfigParams {
    path: string;
    search: string;
    isPlayer: boolean;
    isOrgAdmin: boolean;
    isSystemAdmin: boolean;
    isStaff: boolean;
    orgSlug: string;
    clubSlugOrId: string | null;
    teamSlugOrId: string | null;
    seasonSlugOrId: string | null;
    competitionSlugOrId: string | null;
    matchId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

export function buildPanelBConfig(params: PanelBConfigParams): PanelBResult | null {
    const {
        path, search,
        isPlayer, isOrgAdmin, isSystemAdmin, isStaff,
        orgSlug, clubSlugOrId, teamSlugOrId,
        seasonSlugOrId, competitionSlugOrId, matchId,
    } = params;

    /* ── Early exits ────────────────────────────────────────────── */

    if (path.startsWith('/notifications')) return null;
    if (path === '/apps' || path === '/content' || path === '/settings') return null;

    const walletParam = new URLSearchParams(search || '').get('wallet');
    const isPersonalWallet = walletParam === 'personal';

    /* ── Section detection ──────────────────────────────────────── */

    let activeSection: 'work' | 'content' | 'templates' | 'preferences' | 'organisation' | 'platform' | 'help' = 'work';

    if (path.startsWith('/content-templates') || path.startsWith('/workflow-templates') || path.startsWith('/app-backgrounds')) activeSection = 'templates';
    else if (path.startsWith('/content') || path.startsWith('/studio') || path.startsWith('/approvals') || path.startsWith('/medialib')) activeSection = 'content';
    else if (path.startsWith('/credits')) activeSection = isPersonalWallet ? 'preferences' : 'organisation';
    else if (path.startsWith('/permissions') || path === '/users') activeSection = 'organisation';
    else if (path.startsWith('/organisation/')) activeSection = 'organisation';
    else if (path.startsWith('/profile') || path.startsWith('/preferences') || path.startsWith('/memberships') || path.startsWith('/billing') || path.startsWith('/notifications')) activeSection = 'preferences';
    else if (['/health', '/flags', '/audit', '/integration', '/design', '/observability', '/security', '/constitution', '/demo/performance'].some(pfx => path.startsWith(pfx))) activeSection = 'platform';
    else if (['/docs'].some(pfx => path.startsWith(pfx))) activeSection = 'help';

    /* ── Section items ──────────────────────────────────────────── */

    let title = '';
    let items: { label: string; path: string; icon?: LucideIcon }[] = [];

    switch (activeSection) {
        case 'work':
            return buildWorkSectionPanelB({
                path,
                isPlayer,
                isOrgRoute: path.startsWith('/organisations/'),
                orgSlug,
                clubSlugOrId,
                teamSlugOrId,
                seasonSlugOrId,
                competitionSlugOrId,
                matchId,
                locationPathname: path,
            });

        case 'content':
            if (path === '/medialib' || path.startsWith('/medialib')) {
                title = 'Media Library';
                items = [
                    { label: 'Organisation', path: '/medialib?tab=organisation', icon: Globe },
                    { label: 'Club', path: '/medialib?tab=club', icon: Shield },
                    { label: 'Team', path: '/medialib?tab=team', icon: Shirt },
                    { label: 'Member', path: '/medialib?tab=member', icon: UserCircle },
                    { label: 'Files', path: '/medialib?tab=files', icon: Folder },
                ];
            } else if (path === '/contentlib' || path.startsWith('/contentlib?')) {
                title = 'Gallery';
                items = [
                    { label: '\uD83D\uDDBC\uFE0F Gallery', path: '/studio', icon: Film },
                    { label: 'Media Library', path: '/medialib', icon: Library },
                    { label: 'Templates', path: '/content-templates', icon: Palette },
                ];
            } else if (path.startsWith('/studio') && !path.startsWith('/studio/videos')) {
                title = 'Gallery';
                items = [
                    { label: 'Alles', path: '/studio?category=all', icon: Film },
                    { label: 'Pre-Match', path: '/studio?category=pre_match', icon: Calendar },
                    { label: 'During Match', path: '/studio?category=during_match', icon: Activity },
                    { label: 'Post-Match', path: '/studio?category=post_match', icon: Trophy },
                    { label: 'Season', path: '/studio?category=season', icon: Calendar },
                    { label: 'Member', path: '/studio?category=member', icon: UserCircle },
                ];
            } else if (path === '/studio/videos' || path.startsWith('/studio/videos')) {
                title = 'Queue';
                items = [
                    { label: 'All', path: '/approvals?tab=all', icon: ClipboardCheck },
                    { label: 'Needs Review', path: '/approvals?tab=review', icon: Flag },
                    { label: 'In Progress', path: '/approvals?tab=active', icon: Activity },
                    { label: 'Approved', path: '/approvals?tab=completed', icon: ClipboardCheck },
                    { label: 'Rejected', path: '/approvals?tab=rejected', icon: Shield },
                    { label: 'AI Queue', path: '/approvals?tab=ai_queue', icon: Sparkles },
                    { label: 'Video Processing', path: '/approvals?tab=video', icon: Video },
                ];
            } else if (path === '/approvals' || path.startsWith('/approvals')) {
                title = 'Queue';
                items = [
                    { label: 'All', path: '/approvals?tab=all', icon: ClipboardCheck },
                    { label: 'Needs Review', path: '/approvals?tab=review', icon: Flag },
                    { label: 'In Progress', path: '/approvals?tab=active', icon: Activity },
                    { label: 'Approved', path: '/approvals?tab=completed', icon: ClipboardCheck },
                    { label: 'Rejected', path: '/approvals?tab=rejected', icon: Shield },
                    { label: 'AI Queue', path: '/approvals?tab=ai_queue', icon: Sparkles },
                    { label: 'Video Processing', path: '/approvals?tab=video', icon: Video },
                ];
            } else {
                title = 'Content';
                items = [
                    { label: 'Gallery', path: '/studio', icon: Sparkles },
                    { label: 'Media Library', path: '/medialib', icon: Library },
                    { label: 'Queue', path: '/approvals', icon: ClipboardCheck },
                ];
            }
            break;

        case 'templates':
            title = 'Content Templates';
            items = [
                { label: 'All Templates', path: '/content-templates?tab=all', icon: Library },
                { label: 'Season', path: '/content-templates?tab=season', icon: Calendar },
                { label: 'Pre-Match', path: '/content-templates?tab=pre_match', icon: Film },
                { label: 'During Match', path: '/content-templates?tab=during_match', icon: Sparkles },
                { label: 'Post-Match', path: '/content-templates?tab=post_match', icon: Trophy },
                { label: 'Member', path: '/content-templates?tab=member', icon: UserCircle },
                { label: 'Workflows', path: '/workflow-templates', icon: GitBranch },\n                { label: 'Achtergronden', path: '/app-backgrounds', icon: Film },
            ];
            break;

        case 'preferences':
            title = 'Personal Settings';
            items = [
                { label: 'Profile', path: '/preferences?tab=profile', icon: UserCircle },
                { label: 'Personalisation', path: '/preferences?tab=personalisation', icon: Palette },
                { label: 'Notification settings', path: '/preferences?tab=notifications', icon: Settings },
                { label: 'My Wallet', path: '/credits?wallet=personal', icon: CreditCard },
                { label: 'Memberships', path: '/memberships', icon: Users },
                { label: 'My Audit', path: '/preferences?tab=audit', icon: Scroll },
                { label: 'Billing & Licensing', path: '/billing', icon: CreditCard },
            ];
            break;

        case 'organisation':
            if (isOrgAdmin || isSystemAdmin) {
                title = 'Organisation';
                items = [
                    { label: 'Permissions', path: '/permissions', icon: Lock },
                    { label: 'Users', path: '/users', icon: Users },
                    { label: 'Audit', path: '/organisation/audit', icon: Scroll },
                    { label: 'Organisation Wallet', path: '/credits?wallet=org', icon: CreditCard },
                ];
            }
            break;

        case 'platform':
            title = 'Platform';
            items = [
                ...((isOrgAdmin || isSystemAdmin) ? [{ label: 'Audit', path: '/audit', icon: Scroll }] : []),
                ...(isStaff ? [
                    { label: 'Health', path: '/health', icon: Activity },
                    { label: 'Cache Performance', path: '/demo/performance', icon: LineChart },
                    { label: 'Features', path: '/flags', icon: Flag },
                    { label: 'Integration', path: '/integration-status', icon: Puzzle },
                    { label: 'Design System', path: '/design-system', icon: Palette },
                    { label: 'Observability', path: '/observability', icon: LineChart },
                    { label: 'Security', path: '/security', icon: Lock },
                    { label: 'Constitution', path: '/constitution', icon: Scroll },
                ] : []),
            ];
            break;

        case 'help':
            title = 'Help';
            items = [
                { label: 'User Guide', path: '/docs', icon: BookOpen },
            ];
            break;
    }

    if (items.length === 0) return null;
    return { title, items, isActive: true };
}
