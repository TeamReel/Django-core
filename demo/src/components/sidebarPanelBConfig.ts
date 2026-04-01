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
    BarChart3, Database,
} from 'lucide-react';
import { buildWorkSectionPanelB, type PanelBResult } from './sidebarPanelBWork';

/* ------------------------------------------------------------------ */
/*  Params                                                             */
/* ------------------------------------------------------------------ */

export interface PanelBConfigParams {
    path: string;
    search: string;
    isPlayer: boolean;
    isSupporter?: boolean;
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
        isPlayer, isSupporter, isOrgAdmin, isSystemAdmin, isStaff,
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
    else if (['/health', '/flags', '/audit', '/integration', '/design', '/observability', '/security', '/constitution', '/demo/performance', '/platform-stats'].some(pfx => path.startsWith(pfx))) activeSection = 'platform';
    else if (['/docs'].some(pfx => path.startsWith(pfx))) activeSection = 'help';

    /* ── Section items ──────────────────────────────────────────── */

    /* Special case: Stats Dashboard gets its own Panel B with date range tabs */
    if (path.startsWith('/platform-stats') && isSystemAdmin) {
        return {
            title: 'Stats Dashboard',
            isActive: true,
            items: [
                { label: '7 dagen', path: '/platform-stats?range=7d', icon: CalendarDays },
                { label: '30 dagen', path: '/platform-stats?range=30d', icon: CalendarDays },
                { label: '90 dagen', path: '/platform-stats?range=90d', icon: CalendarDays },
                { label: 'Seizoen', path: '/platform-stats?range=season', icon: CalendarDays },
            ],
        };
    }

    let title = '';
    let items: { label: string; path: string; icon?: LucideIcon }[] = [];

    switch (activeSection) {
        case 'work':
            return buildWorkSectionPanelB({
                path,
                isPlayer,
                isSupporter: isSupporter ?? false,
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
                title = 'Mediabibliotheek';
                items = [
                    { label: 'Organisatie', path: '/medialib?tab=organisation', icon: Globe },
                    { label: 'Club', path: '/medialib?tab=club', icon: Shield },
                    { label: 'Team', path: '/medialib?tab=team', icon: Shirt },
                    { label: 'Lid', path: '/medialib?tab=member', icon: UserCircle },
                    { label: 'Bestanden', path: '/medialib?tab=files', icon: Folder },
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
                    { label: 'Seizoen', path: '/studio?category=season', icon: Calendar },
                    { label: 'Lid', path: '/studio?category=member', icon: UserCircle },
                ];
            } else if (path === '/studio/videos' || path.startsWith('/studio/videos')) {
                title = 'Queue';
                items = [
                    { label: 'Alle', path: '/approvals?tab=all', icon: ClipboardCheck },
                    { label: 'Te beoordelen', path: '/approvals?tab=review', icon: Flag },
                    { label: 'In behandeling', path: '/approvals?tab=active', icon: Activity },
                    { label: 'Goedgekeurd', path: '/approvals?tab=completed', icon: ClipboardCheck },
                    { label: 'Afgewezen', path: '/approvals?tab=rejected', icon: Shield },
                    { label: 'AI Queue', path: '/approvals?tab=ai_queue', icon: Sparkles },
                    { label: 'Videoverwerking', path: '/approvals?tab=video', icon: Video },
                ];
            } else if (path === '/approvals' || path.startsWith('/approvals')) {
                title = 'Queue';
                items = [
                    { label: 'Alle', path: '/approvals?tab=all', icon: ClipboardCheck },
                    { label: 'Te beoordelen', path: '/approvals?tab=review', icon: Flag },
                    { label: 'In behandeling', path: '/approvals?tab=active', icon: Activity },
                    { label: 'Goedgekeurd', path: '/approvals?tab=completed', icon: ClipboardCheck },
                    { label: 'Afgewezen', path: '/approvals?tab=rejected', icon: Shield },
                    { label: 'AI Queue', path: '/approvals?tab=ai_queue', icon: Sparkles },
                    { label: 'Videoverwerking', path: '/approvals?tab=video', icon: Video },
                ];
            } else {
                title = 'Content';
                items = [
                    { label: 'Gallery', path: '/studio', icon: Sparkles },
                    { label: 'Mediabibliotheek', path: '/medialib', icon: Library },
                    { label: 'Queue', path: '/approvals', icon: ClipboardCheck },
                ];
            }
            break;

        case 'templates':
            title = 'Content Templates';
            items = [
                { label: 'Alle templates', path: '/content-templates?tab=all', icon: Library },
                { label: 'Seizoen', path: '/content-templates?tab=season', icon: Calendar },
                { label: 'Pre-Match', path: '/content-templates?tab=pre_match', icon: Film },
                { label: 'During Match', path: '/content-templates?tab=during_match', icon: Sparkles },
                { label: 'Post-Match', path: '/content-templates?tab=post_match', icon: Trophy },
                { label: 'Lid', path: '/content-templates?tab=member', icon: UserCircle },
                { label: 'Workflows', path: '/workflow-templates', icon: GitBranch },
                { label: 'Achtergronden', path: '/app-backgrounds', icon: Film },
            ];
            break;

        case 'preferences':
            title = 'Persoonlijke instellingen';
            items = [
                { label: 'Profiel', path: '/preferences?tab=profile', icon: UserCircle },
                { label: 'Personalisatie', path: '/preferences?tab=personalisation', icon: Palette },
                { label: 'Meldingen', path: '/preferences?tab=notifications', icon: Settings },
                { label: 'Mijn Portemonnee', path: '/credits?wallet=personal', icon: CreditCard },
                { label: 'Lidmaatschappen', path: '/memberships', icon: Users },
                { label: 'Mijn Audit', path: '/preferences?tab=audit', icon: Scroll },
                { label: 'Facturering & Licenties', path: '/billing', icon: CreditCard },
            ];
            break;

        case 'organisation':
            if (isOrgAdmin || isSystemAdmin) {
                title = 'Organisatie';
                items = [
                    { label: 'Rechten', path: '/permissions', icon: Lock },
                    { label: 'Gebruikers', path: '/users', icon: Users },
                    { label: 'Audit', path: '/organisation/audit', icon: Scroll },
                    { label: 'Organisatie Portemonnee', path: '/credits?wallet=org', icon: CreditCard },
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
                ...(isSystemAdmin ? [
                    { label: 'Stats Dashboard', path: '/platform-stats', icon: LineChart },
                ] : []),
            ];
            break;

        case 'help':
            title: 'Hulp';
            items = [
                { label: 'Gebruikershandleiding', path: '/docs', icon: BookOpen },
            ];
            break;
    }

    if (items.length === 0) return null;
    return { title, items, isActive: true };
}
