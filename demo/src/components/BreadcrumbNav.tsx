/**
 * BreadcrumbNav — Shared breadcrumb `<nav><ol>` renderer.
 *
 * Desktop: full crumb trail (Dashboard / Org / Club / Team / Season / …)
 * Mobile (<640px): back arrow + collapsed trail — show first, ellipsis, last 2.
 *   e.g.  ‹  Dashboard / … / Season / Match
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNavigateBack } from '../hooks/useNavigateBack';
import s from './BreadcrumbNav.module.css';

export interface BreadcrumbItem {
  label: React.ReactNode;
  path: string;
  isLeaf?: boolean;
}

/**
 * Max visible items on mobile before collapsing middle segments.
 * When items.length > MAX_MOBILE, we show: first + … + last (MAX_MOBILE - 1).
 */
const MAX_MOBILE = 3;

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  const goBack = useNavigateBack();
  const shouldCollapse = items.length > MAX_MOBILE;

  return (
    <nav aria-label="Breadcrumb" className={s.breadcrumbNav}>
      {/* Mobile back button */}
      <button
        className={s.backButton}
        onClick={goBack}
        aria-label="Go back"
        type="button"
      >
        <ArrowLeft size={18} strokeWidth={2} />
      </button>

      <ol className={s.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          // On mobile: hide middle items when collapsing
          // Show first item, last (MAX_MOBILE - 1) items, hide the rest
          const isHiddenOnMobile = shouldCollapse && !isFirst && index < items.length - (MAX_MOBILE - 1);

          return (
            <React.Fragment key={`${index}:${item.path}`}>
              {/* Show ellipsis before the first visible-after-collapse item */}
              {shouldCollapse && index === items.length - (MAX_MOBILE - 1) && (
                <li className={s.item}>
                  <span className={s.separator}>/</span>
                  <span className={s.ellipsis}>…</span>
                </li>
              )}
              <li className={`${s.item} ${isHiddenOnMobile ? s.hiddenMobile : ''}`}>
                {index > 0 && !(shouldCollapse && index === items.length - (MAX_MOBILE - 1)) && (
                  <span className={s.separator}>/</span>
                )}
                {typeof item.label === 'string' ? (
                  <Link
                    to={item.path}
                    className={`${s.link} ${isLast ? s.linkCurrent : ''}`}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={`${s.inlineLabel} ${isLast ? s.inlineLabelCurrent : ''}`}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
