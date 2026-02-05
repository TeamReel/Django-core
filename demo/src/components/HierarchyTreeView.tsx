import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { HierarchyNode, HierarchyData } from '../hooks/useSearch';

interface HierarchyTreeViewProps {
  hierarchy: HierarchyData;
}

function TreeNode({ node, depth = 0 }: { node: HierarchyNode; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      organisation: '🏛️',
      federation: '🏛️',
      club: '🏟️',
      team: '👕',
      season: '🗓️',
      competition: '🏆',
      match: '🎯',
      period: '📅',
      activity: '📋',
    };
    return icons[type.toLowerCase()] || '📄';
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      organisation: '#9333ea',
      federation: '#9333ea',
      club: '#dc2626',
      team: '#2563eb',
      season: '#059669',
      competition: '#d97706',
      match: '#0891b2',
    };
    return colors[type.toLowerCase()] || '#6b7280';
  };

  return (
    <div style={{ marginLeft: depth > 0 ? '24px' : 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: depth === 0 ? 'var(--color-bg-highlight, #fef3c7)' : 'var(--color-bg-surface)',
          borderRadius: '6px',
          marginBottom: '4px',
          border: depth === 0 ? '2px solid var(--color-primary, #f59e0b)' : '1px solid var(--color-border)',
        }}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        {!hasChildren && <span style={{ width: '24px' }} />}

        {/* Type Badge */}
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: '4px',
            background: `${getTypeColor(node.type)}20`,
            color: getTypeColor(node.type),
            letterSpacing: '0.5px',
          }}
        >
          {getTypeIcon(node.type)} {node.type}
        </span>

        {/* Title/Link */}
        <Link
          to={node.url}
          style={{
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            fontWeight: depth === 0 ? '600' : '500',
            flex: 1,
          }}
        >
          {node.title}
        </Link>

        {/* Truncation Indicator */}
        {node.is_truncated && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--color-text-tertiary)',
              fontStyle: 'italic',
            }}
          >
            (more...)
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div
          style={{
            borderLeft: '2px solid var(--color-border)',
            marginLeft: '12px',
            paddingLeft: '12px',
          }}
        >
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* Description */}
      {node.description && depth === 0 && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            margin: '4px 0 8px 32px',
          }}
        >
          {node.description}
        </p>
      )}
    </div>
  );
}

export default function HierarchyTreeView({ hierarchy }: HierarchyTreeViewProps) {
  return (
    <div
      style={{
        padding: '16px',
        background: 'var(--color-bg-secondary)',
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🌳 Context Hierarchy
        </h3>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
          }}
        >
          {hierarchy.total_nodes} items
          {hierarchy.truncated && ' (truncated)'}
        </span>
      </div>

      <TreeNode node={hierarchy.tree} />
    </div>
  );
}
