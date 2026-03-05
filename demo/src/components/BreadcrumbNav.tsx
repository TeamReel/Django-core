/**
 * BreadcrumbNav — iOS-style back-link for sub-pages.
 *
 * Shows "← Parent" as a subtle, tappable back link.
 * For deep hierarchies (3+ items), shows collapsed trail on desktop.
 * Mobile: always shows just the back arrow + immediate parent name.
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import s from './BreadcrumbNav.module.css';

export interface BreadcrumbItem {
  label: React.ReactNode;
  path: string;
  isLeaf?: boolean;
}

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  // Filter out leaf items — we only show parents (current page is in PageHeader)
  const parents = items.filter(i => !i.isLeaf);
  if (parents.length === 0) return null;

  const navigate = useNavigate();
  // The immediate parent is the last parent item
  const parent = parents[parents.length - 1];

  return (
    <nav aria-label="Back" className={s.breadcrumbNav}>
      <Link
        to={parent.path}
        className={s.backLink}
        onClick={(e) => {
          // Use navigate(-1) if possible for natural back behaviour,
          // fallback to the parent path
          e.preventDefault();
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate(parent.path);
          }
        }}
      >
        <ChevronLeft size={18} strokeWidth={2} className={s.backIcon} />
        <span className={s.backLabel}>
          {typeof parent.label === 'string' ? parent.label : parent.label}
        </span>
      </Link>
    </nav>
  );
}
