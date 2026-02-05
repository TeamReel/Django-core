import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { HierarchyNode, HierarchyData } from '../hooks/useSearch';

interface HierarchyTreeViewProps {
  hierarchy: HierarchyData;
}

interface TreeNodeProps {
  node: HierarchyNode;
  depth?: number;
  anchorPath: string[];
  anchorId: string;
}

function TreeNode({ node, depth = 0, anchorPath, anchorId }: TreeNodeProps) {
  // Auto-expand nodes that are in the path to the anchor
  const isInPath = anchorPath.includes(node.id);
  const isAnchor = node.id === anchorId;
  const [isExpanded, setIsExpanded] = useState(isInPath || depth < 1);
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

  // Determine styling based on anchor status
  const getNodeStyle = () => {
    if (isAnchor) {
      return {
        background: 'var(--color-primary, #3b82f6)',
        border: '2px solid var(--color-primary, #3b82f6)',
        color: '#fff',
      };
    }
    if (isInPath) {
      return {
        background: 'var(--color-bg-highlight, #fef3c7)',
        border: '2px solid var(--color-warning, #f59e0b)',
      };
    }
    return {
      background: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border)',
    };
  };

  const nodeStyle = getNodeStyle();

  return (
    <div style={{ marginLeft: depth > 0 ? '24px' : 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '4px',
          ...nodeStyle,
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
              background: isAnchor ? 'rgba(255,255,255,0.2)' : 'none',
              border: isAnchor ? '1px solid rgba(255,255,255,0.3)' : '1px solid var(--color-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: isAnchor ? '#fff' : 'var(--color-text-secondary)',
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
            background: isAnchor ? 'rgba(255,255,255,0.2)' : `${getTypeColor(node.type)}20`,
            color: isAnchor ? '#fff' : getTypeColor(node.type),
            letterSpacing: '0.5px',
          }}
        >
          {getTypeIcon(node.type)} {node.type}
        </span>

        {/* Title/Link */}
        {node.url ? (
          <Link
            to={node.url}
            style={{
              color: isAnchor ? '#fff' : 'var(--color-text-primary)',
              textDecoration: 'none',
              fontWeight: isAnchor || isInPath ? '600' : '500',
              flex: 1,
            }}
          >
            {node.title}
            {isAnchor && ' ← Search Result'}
          </Link>
        ) : (
          <span
            style={{
              color: isAnchor ? '#fff' : 'var(--color-text-primary)',
              fontWeight: isAnchor || isInPath ? '600' : '500',
              flex: 1,
            }}
          >
            {node.title}
            {isAnchor && ' ← Search Result'}
          </span>
        )}

        {/* Truncation Indicator */}
        {node.is_truncated && (
          <span
            style={{
              fontSize: '11px',
              color: isAnchor ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)',
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
            borderLeft: isInPath ? '2px solid var(--color-primary, #3b82f6)' : '2px solid var(--color-border)',
            marginLeft: '12px',
            paddingLeft: '12px',
          }}
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              anchorPath={anchorPath}
              anchorId={anchorId}
            />
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

function countNodes(node: HierarchyNode): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

export default function HierarchyTreeView({ hierarchy }: HierarchyTreeViewProps) {
  const anchorPath = hierarchy.anchor_path || [];
  const anchorId = hierarchy.anchor?.id || anchorPath[anchorPath.length - 1] || '';

  const totalNodes = useMemo(() => {
    return hierarchy.tree ? countNodes(hierarchy.tree) : 0;
  }, [hierarchy.tree]);

  if (!hierarchy.tree) {
    return null;
  }

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
          {totalNodes} items • Showing "{hierarchy.anchor?.title}"
        </span>
      </div>

      <TreeNode
        node={hierarchy.tree}
        anchorPath={anchorPath}
        anchorId={anchorId}
      />
    </div>
  );
}
