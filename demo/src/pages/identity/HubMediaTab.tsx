/**
 * HubMediaTab — Content view for "Media" tab.
 *
 * Renders generated content (lineup flyers, match flyers, etc.) via the
 * existing SeasonContentTab. Asset management (member photo slots) has been
 * moved to the Beheer tab where it logically belongs.
 */
import React from 'react';
import s from './HubMediaTab.module.css';

interface HubMediaTabProps {
  /** Slot for the content tab (per-wedstrijd / per-seizoen content views) */
  children: React.ReactNode;
}

export const HubMediaTab: React.FC<HubMediaTabProps> = ({ children }) => {
  return <div className={s.root}>{children}</div>;
};
