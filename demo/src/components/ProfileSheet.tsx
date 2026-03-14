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
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ title, isOpen, onClose, children }) => (
  <NavigationSheet isOpen={isOpen} onClose={onClose} title={title}>
    {children}
  </NavigationSheet>
);
