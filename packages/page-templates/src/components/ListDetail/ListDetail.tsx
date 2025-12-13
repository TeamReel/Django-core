import * as React from 'react';
import type {
  ListDetailProps,
  ListDetailComponent,
} from '../../types';
import { useControlledState } from '../../hooks/useControlledState';
import { useResponsive } from '../../hooks/useResponsive';
import { ListDetailList } from './ListDetailList';
import { ListDetailDetail } from './ListDetailDetail';
import { DefaultLoading } from '../states/DefaultLoading';
import { DefaultEmpty } from '../states/DefaultEmpty';
import { DefaultError } from '../states/DefaultError';
import { DefaultPermissionDenied } from '../states/DefaultPermissionDenied';

interface ListDetailContextValue {
  selectedId: string | number | null;
  setSelectedId: (id: string | number | null) => void;
  isMobile: boolean;
  mobileLayout: 'stack' | 'overlay';
  showDetail: boolean;
  setShowDetail: (show: boolean) => void;
}

export const ListDetailContext = React.createContext<ListDetailContextValue | null>(null);

export const useListDetailContext = () => {
  const context = React.useContext(ListDetailContext);
  if (!context) {
    throw new Error('useListDetailContext must be used within ListDetail component');
  }
  return context;
};

/**
 * List-Detail template component for master-detail layouts
 *
 * @example
 * ```tsx
 * <ListDetail defaultSelectedId={null} onSelectedIdChange={handleSelect}>
 *   <ListDetail.List showSearch onSearchChange={handleSearch}>
 *     {projects.map(p => <ProjectItem key={p.id} project={p} />)}
 *   </ListDetail.List>
 *   <ListDetail.Detail>
 *     {selectedProject && <ProjectDetails project={selectedProject} />}
 *   </ListDetail.Detail>
 * </ListDetail>
 * ```
 */
const ListDetailFC = React.forwardRef<HTMLDivElement, ListDetailProps>(
  (
    {
      children,
      defaultSelectedId = null,
      selectedId: controlledSelectedId,
      onSelectedIdChange,
      splitRatio = [1, 2],
      listMinWidth = 300,
      mobileLayout = 'overlay',
      loading = false,
      error = null,
      isEmpty = false,
      permissionDenied = false,
      renderLoading,
      renderEmpty,
      renderError,
      renderPermissionDenied,
      className,
      'aria-label': ariaLabel = 'List-Detail Layout',
      ...props
    },
    ref
  ) => {
    const { isMobile } = useResponsive();

    // State rendering priority:
    // 1. Loading state
    if (loading) {
      return renderLoading ? <>{renderLoading()}</> : <DefaultLoading />;
    }

    // 2. Permission denied state
    if (permissionDenied) {
      return renderPermissionDenied ? <>{renderPermissionDenied()}</> : <DefaultPermissionDenied />;
    }

    // 3. Error state
    if (error) {
      return renderError ? <>{renderError(error)}</> : <DefaultError error={error} />;
    }

    // 4. Empty state
    if (isEmpty) {
      return renderEmpty ? <>{renderEmpty()}</> : <DefaultEmpty message="No items to display" />;
    }

    // 5. Success state - render children
    // Selection state (controlled/uncontrolled)
    const [selectedId, setSelectedId] = useControlledState(
      controlledSelectedId,
      defaultSelectedId,
      onSelectedIdChange
    );

    // Mobile overlay detail visibility
    const [showDetail, setShowDetail] = React.useState(false);

    // Auto-show detail when item selected on mobile
    React.useEffect(() => {
      if (isMobile && mobileLayout === 'overlay' && selectedId !== null) {
        setShowDetail(true);
      }
    }, [selectedId, isMobile, mobileLayout]);

    const contextValue: ListDetailContextValue = React.useMemo(
      () => ({
        selectedId,
        setSelectedId,
        isMobile,
        mobileLayout,
        showDetail,
        setShowDetail,
      }),
      [selectedId, setSelectedId, isMobile, mobileLayout, showDetail, setShowDetail]
    );

    // Calculate list/detail widths
    const [listFlex, detailFlex] = splitRatio;
    const listFlexBasis = `calc(${(listFlex / (listFlex + detailFlex)) * 100}%)`;
    const detailFlexBasis = `calc(${(detailFlex / (listFlex + detailFlex)) * 100}%)`;

    // Determine effective layout
    const effectiveLayout = isMobile ? mobileLayout : 'side-by-side';

    // Style based on layout
    let containerStyle: React.CSSProperties;
    let listStyle: React.CSSProperties;
    let detailStyle: React.CSSProperties;

    if (effectiveLayout === 'side-by-side') {
      // Desktop: split layout
      containerStyle = {
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        overflow: 'hidden',
      };
      listStyle = {
        flex: `0 0 ${listFlexBasis}`,
        minWidth: `${listMinWidth}px`,
        overflow: 'auto',
        borderRight: '1px solid #e0e0e0',
      };
      detailStyle = {
        flex: `1 1 ${detailFlexBasis}`,
        overflow: 'auto',
      };
    } else if (effectiveLayout === 'stack') {
      // Mobile stack: vertical layout
      containerStyle = {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      };
      listStyle = {
        flex: selectedId === null ? '1 1 100%' : '0 0 40%',
        overflow: 'auto',
        borderBottom: selectedId !== null ? '1px solid #e0e0e0' : 'none',
      };
      detailStyle = {
        flex: selectedId === null ? '0 0 0%' : '1 1 60%',
        overflow: 'auto',
        display: selectedId === null ? 'none' : 'block',
      };
    } else {
      // Mobile overlay: detail over list
      containerStyle = {
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
      };
      listStyle = {
        height: '100%',
        overflow: 'auto',
        display: showDetail ? 'none' : 'block',
      };
      detailStyle = {
        position: showDetail ? 'absolute' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
        overflow: 'auto',
        backgroundColor: 'white',
        zIndex: showDetail ? 10 : 0,
        display: showDetail ? 'block' : 'none',
      };
    }

    return (
      <ListDetailContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={className}
          style={containerStyle}
          aria-label={ariaLabel}
          {...props}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              if (child.type === ListDetailList) {
                return <div style={listStyle}>{child}</div>;
              }
              if (child.type === ListDetailDetail) {
                return <div style={detailStyle}>{child}</div>;
              }
            }
            return child;
          })}
        </div>
      </ListDetailContext.Provider>
    );
  }
);

ListDetailFC.displayName = 'ListDetail';

// Create compound component by attaching sub-components
export const ListDetail = Object.assign(ListDetailFC, {
  List: ListDetailList,
  Detail: ListDetailDetail,
}) as ListDetailComponent;
