/**
 * HeroBanner — Full-width hero banner with team branding.
 *
 * Normal mode: club background photo + logo + team name.
 * Match-day mode: Logo vs Logo with countdown/LIVE badge.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useBrandProfile } from '../../hooks/useBrandProfile';
import { Avatar } from '../ui/Avatar';
import type { Match } from './ActiveMatchCard';
import type { MatchDayMode } from '../../hooks/useMatchDayMode';
import styles from './HeroBanner.module.css';

export interface HeroBannerProps {
  matchDay?: MatchDayMode;
  activeMatch?: Match | null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ matchDay, activeMatch }) => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation;
  const project = context.project;

  const { getAssetUrl, getAssets, profile, loading } = useBrandProfile({
    organisationId: org?.id?.toString(),
    projectId: project?.id,
  });

  const clubLogoUrl = getAssetUrl('club_logo');
  const backgrounds = getAssets('club_background');
  const heroImageUrl = backgrounds.length > 0 && backgrounds[0].url
    ? backgrounds[0].url.startsWith('http') ? backgrounds[0].url : null
    : null;

  const bgUrl = heroImageUrl || (backgrounds.length > 0 && backgrounds[0].url
    ? getAssetUrl('club_background')
    : null);

  const teamName = project?.name || org?.name || '';
  const displayName = teamName;

  const primaryToken = profile?.tokens?.find(t => t.key === 'primary_color');
  const primaryColor = primaryToken?.value || 'var(--app-primary)';

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const hasBgImage = !!bgUrl && !imgError;
  const isMatchMode = !!matchDay?.isMatchDay && !!activeMatch;

  // Match-day data
  const opponentName = activeMatch?.opponent_project?.club_name
    || activeMatch?.opponent_project?.name || 'Tegenstander';
  const homeLogo = activeMatch?.metadata?.identity?.home_team_logo_url as string | undefined;
  const awayLogo = activeMatch?.metadata?.identity?.away_team_logo_url as string | undefined;
  const isHome = activeMatch?.metadata?.is_home !== false;
  const ownLogo = isHome ? homeLogo : awayLogo;
  const oppLogo = isHome ? awayLogo : homeLogo;

  const isLive = matchDay?.countdown === 'LIVE';
  const homeScore = activeMatch?.metadata?.home_score as number | undefined;
  const awayScore = activeMatch?.metadata?.away_score as number | undefined;
  const hasScore = homeScore != null && awayScore != null;

  if (loading) {
    return (
      <div className={styles.banner} aria-busy="true">
        <div className={styles.skeleton} />
      </div>
    );
  }

  // ── Match-day hero ──
  if (isMatchMode) {
    return (
      <div
        className={`${styles.banner} ${styles.matchBanner}`}
        onClick={() => activeMatch && navigate(`/matches/${activeMatch.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && activeMatch) { e.preventDefault(); navigate(`/matches/${activeMatch.id}`); } }}
      >
        <div className={styles.matchOverlay} />
        <div className={styles.matchContent}>
          <div className={styles.matchLogos}>
            <div className={styles.matchTeamCol}>
              <Avatar
                src={ownLogo || clubLogoUrl}
                name={displayName}
                size="lg"
                alt={`${displayName} logo`}
                className={styles.logo}
              />
              <span className={styles.matchTeamLabel}>{displayName}</span>
            </div>

            <div className={styles.matchCenter}>
              {isLive && hasScore ? (
                <div className={styles.liveScore}>
                  <span className={styles.liveBadge} aria-live="polite">LIVE</span>
                  <span className={styles.scoreText}>{homeScore} – {awayScore}</span>
                </div>
              ) : isLive ? (
                <span className={styles.liveBadge} aria-live="polite">LIVE</span>
              ) : (
                <>
                  <span className={styles.vsText}>VS</span>
                  {matchDay.countdown && (
                    <span className={styles.countdownText} aria-live="polite">
                      {matchDay.countdown}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className={styles.matchTeamCol}>
              <Avatar
                src={oppLogo}
                name={opponentName}
                size="lg"
                alt={`${opponentName} logo`}
                className={styles.logo}
              />
              <span className={styles.matchTeamLabel}>{opponentName}</span>
            </div>
          </div>

          {activeMatch.location && (
            <p className={styles.matchLocation}>{activeMatch.location}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Normal hero ──
  return (
    <div
      className={styles.banner}
      style={!hasBgImage ? {
        background: `linear-gradient(135deg, ${primaryColor} 0%, var(--app-surface) 100%)`,
      } : undefined}
    >
      {hasBgImage && (
        <>
          <img
            src={bgUrl}
            alt=""
            className={`${styles.bgImage} ${imgLoaded ? styles.bgImageLoaded : ''}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          <div className={styles.overlay} />
        </>
      )}

      <div className={styles.content}>
        <Avatar
          src={clubLogoUrl}
          name={displayName}
          size="lg"
          alt={`${displayName} logo`}
          className={styles.logo}
        />
        <div className={styles.textGroup}>
          <h2 className={styles.teamName}>{displayName}</h2>
        </div>
      </div>
    </div>
  );
};
