import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import type { HierarchyData } from '../hooks/useSearch';

import HierarchyTreeView from './HierarchyTreeView';

const hierarchy: HierarchyData = {
  anchor: { id: 'match-1', type: 'match', title: 'Match vs Rival' },
  anchor_path: ['org-1', 'team-1', 'season-1', 'match-1'],
  tree: {
    id: 'org-1',
    title: 'Test Federation',
    type: 'organisation',
    url: '/org-1',
    children: [
      {
        id: 'team-1',
        title: 'FC Test',
        type: 'team',
        url: '/org-1/team-1',
        children: [
          {
            id: 'season-1',
            title: '2024-25 Season',
            type: 'season',
            url: '/org-1/team-1/season-1',
            children: [
              {
                id: 'match-1',
                title: 'Match vs Rival',
                type: 'match',
                url: '/org-1/team-1/season-1/match-1',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('HierarchyTreeView', () => {
  it('renders the root node', () => {
    renderWithProviders(<HierarchyTreeView hierarchy={hierarchy} />);
    expect(screen.getByText('Test Federation')).toBeInTheDocument();
  });

  it('renders items in the anchor path as links', () => {
    renderWithProviders(<HierarchyTreeView hierarchy={hierarchy} />);
    // Nodes in anchor path should be auto-expanded
    expect(screen.getByText('FC Test')).toBeInTheDocument();
    expect(screen.getByText('2024-25 Season')).toBeInTheDocument();
  });

  it('highlights the anchor node', () => {
    renderWithProviders(<HierarchyTreeView hierarchy={hierarchy} />);
    // The match node is the anchor — should have data-anchor attribute
    const anchorLink = screen.getByText(/Search Result/);
    expect(anchorLink).toBeInTheDocument();
    expect(anchorLink.closest('[data-anchor]')).toBeTruthy();
  });
});
