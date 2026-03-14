/**
 * ProfileSheet — Thin wrapper around NavigationSheet for profile sub-pages.
 *
 * Maintains backward compatibility with the ProfileHubPage API while
 * delegating all sheet behavior to the universal NavigationSheet component.
 */
import React from 'react';
import { NavigationSheet } from './ui/NavigationSheet';

interface ProfileSheetProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional footer content (e.g. action buttons) */
  footer?: React.ReactNode;
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ title, isOpen, onClose, children, footer }) => (
  <NavigationSheet isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
    {children}
  </NavigationSheet>
);
