import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { HierarchyNode, HierarchyData } from '../hooks/useSearch';
import styles from './HierarchyTreeView.module.css';

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

  const anchor = isAnchor ? 'true' : undefined;
  const inPath = isInPath ? 'true' : undefined;

  return (
    <div
      className={styles.treeNode}
      style={depth > 0 ? { marginLeft: 24 } : undefined}
    >
      <div
        className={styles.nodeRow}
        data-anchor={anchor}
        data-in-path={inPath}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren ? (
          <button
            className={styles.toggleButton}
            onClick={() => setIsExpanded(!isExpanded)}
            data-anchor={anchor}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        ) : (
          <span className={styles.spacer} />
        )}

        {/* Type Badge */}
        <span
          className={styles.typeBadge}
          data-type={node.type.toLowerCase()}
          data-anchor={anchor}
        >
          {getTypeIcon(node.type)} {node.type}
        </span>

        {/* Title/Link */}
        {node.url ? (
          <Link
            to={node.url}
            className={styles.nodeTitle}
            data-anchor={anchor}
            data-in-path={inPath}
          >
            {node.title}
            {isAnchor && ' ← Search Result'}
          </Link>
        ) : (
          <span
            className={styles.nodeTitle}
            data-anchor={anchor}
            data-in-path={inPath}
          >
            {node.title}
            {isAnchor && ' ← Search Result'}
          </span>
        )}

        {/* Truncation Indicator */}
        {node.is_truncated && (
          <span
            className={styles.truncationIndicator}
            data-anchor={anchor}
          >
            (more...)
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div
          className={styles.childrenContainer}
          data-in-path={inPath}
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
        <p className={styles.description}>
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
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>
          🌳 Context Hierarchy
        </h3>
        <span className={styles.headerInfo}>
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
