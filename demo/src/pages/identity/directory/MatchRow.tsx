/**
 * MatchRow — Table row component for MatchesList
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@django-core/design-system';
import { periodPathKey } from '@/utils/periodPath';
import { routes } from '@/routes';
import { resolveRowContext } from '@/utils/directoryHelpers';
import type { Activity, Period, RowContextConfig } from '@/utils/directoryHelpers';
import { useToast } from '@/components/ui/Toast';

export interface MatchRowProps {
  match: Activity;
  rowConfig: RowContextConfig;
  orgLocked: boolean;
  clubLocked: boolean;
  teamLocked: boolean;
  seasons: Period[];
  competitions: Period[];
  navigate: ReturnType<typeof useNavigate>;
  onView: (m: Activity) => void;
  onEdit: (m: Activity) => void;
}

export const MatchRow: React.FC<MatchRowProps> = ({
  match: m,
  rowConfig,
  orgLocked,
  clubLocked,
  teamLocked,
  seasons,
  competitions,
  navigate,
  onView,
  onEdit,
}) => {
  const row = resolveRowContext(m, rowConfig);
  const { pushToast } = useToast();
  const competition = m.period;
  const compName = competition?.name || '-';
  const season = competition?.parent_period;
  const seasonName = season?.name || '-';

  const isActive = (() => {
    if (!m.start_time) return false;
    return new Date(m.start_time).getTime() >= Date.now();
  })();

  const seasonId = season?.id;
  const seasonFromList = seasonId
    ? seasons.find((s) => String(s.id) === String(seasonId))
    : undefined;
  const seasonTarget = periodPathKey(seasonFromList || season) || seasonId;
  const compId = competition?.id;
  const compFromList = compId
    ? competitions.find((c) => String(c.id) === String(compId))
    : undefined;
  const compTarget = periodPathKey(compFromList || competition) || compId;

  const matchKey = m.slug || m.id;
  const matchPath =
    row.orgSlug && row.clubSlug && row.teamSlug && seasonTarget && compTarget
      ? `/${row.orgSlug}/${row.clubSlug}/${row.teamSlug}/${seasonTarget}/${compTarget}/${matchKey}`
      : `/matches/${matchKey}`;

  return (
    <tr>
      {!orgLocked && (
        <td className="hide-mobile dir-td-text">
          {row.orgId ? (
            <a
              href={routes.orgDetailLegacy({ orgId: row.orgSlug! })}
              className="text-blue-600 hover:underline"
              onClick={(e) => { e.preventDefault(); navigate(routes.orgDetailLegacy({ orgId: row.orgSlug! })); }}
            >
              {row.orgName}
            </a>
          ) : row.orgName}
        </td>
      )}
      {!clubLocked && (
        <td className="hide-mobile dir-td-text">
          {row.clubId ? (
            <a
              href={routes.club({ orgId: row.orgSlug!, clubId: row.clubSlug! })}
              className="text-blue-600 hover:underline"
              onClick={(e) => { e.preventDefault(); navigate(routes.club({ orgId: row.orgSlug!, clubId: row.clubSlug! })); }}
            >
              {row.clubName}
            </a>
          ) : row.clubName}
        </td>
      )}
      {!teamLocked && (
        <td className="hide-mobile dir-td-text">
          {row.teamId ? (
            <a
              href={row.teamBasePath}
              className="text-blue-600 hover:underline"
              onClick={(e) => { e.preventDefault(); navigate(row.teamBasePath); }}
            >
              {row.teamName}
            </a>
          ) : row.teamName}
        </td>
      )}
      <td className="dir-td-text">
        {season ? (
          <a
            href={`${row.teamBasePath}/${seasonTarget}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (seasonTarget) navigate(`${row.teamBasePath}/${seasonTarget}`);
            }}
          >
            {seasonName}
          </a>
        ) : seasonName}
      </td>
      <td className="dir-td-text">
        {competition ? (
          <a
            href={`${row.teamBasePath}/${seasonTarget}/${compTarget}`}
            className="text-blue-600 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              if (seasonTarget && compTarget) navigate(`${row.teamBasePath}/${seasonTarget}/${compTarget}`);
            }}
          >
            {compName}
          </a>
        ) : compName}
      </td>
      <td className="hide-mobile dir-td">
        {m.period?.sport?.category_name ? (
          <span className="fs-11">{m.period.sport.category_name}</span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="hide-mobile dir-td">
        {m.period?.sport ? (
          <span className="flex-row gap-4">
            <span>{m.period.sport.sport_icon}</span>
            <span className="fs-11">{m.period.sport.name}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="dir-td-text">
        <a
          href={matchPath}
          className="text-blue-600 hover:underline"
          onClick={(e) => { e.preventDefault(); navigate(matchPath); }}
        >
          {m.title}
        </a>
      </td>
      <td className="hide-mobile dir-td">-</td>
      <td className="dir-td">
        <Badge variant={isActive ? 'success' : 'warning'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="hide-mobile dir-td">
        <div className="dir-actions">
          <button
            onClick={(e) => { e.preventDefault(); onView(m); }}
            className="action-btn action-btn-primary"
          >
            View
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onEdit(m); }}
            className="action-btn action-btn-warning"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (window.confirm('Are you sure you want to delete this match?')) {
                pushToast({ message: 'Delete functionality not yet implemented', type: 'info' });
              }
            }}
            className="action-btn action-btn-danger"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};
