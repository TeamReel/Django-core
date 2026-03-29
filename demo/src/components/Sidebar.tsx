import { memo } from 'react';
import { useSidebarData } from './useSidebarData';
import { SidebarPanelA } from './SidebarPanelA';
import { SidebarPanelB } from './SidebarPanelB';
import styles from './Sidebar.module.css';

/* ────────────────────────────────────────────────────────────── */
/*  Sidebar – thin JSX shell                                      */
/*  All state, effects, and computed data live in useSidebarData  */
/* ────────────────────────────────────────────────────────────── */

interface SidebarProps {
    isOpen: boolean;
    toggle: () => void;
}

const Sidebar = memo(function Sidebar({ isOpen, toggle }: SidebarProps) {
    const {
        location,
        panelASections,
        panelBConfig,
        queueCounts,
    } = useSidebarData();

    return (
        <div className={`h-full flex-row ${styles.root}`}>
            <SidebarPanelA
                isOpen={isOpen}
                toggle={toggle}
                location={location}
                panelASections={panelASections}
                queueCounts={queueCounts}
            />

            {panelBConfig && (
                <SidebarPanelB
                    location={location}
                    panelBConfig={panelBConfig}
                    queueCounts={queueCounts}
                />
            )}
        </div>
    );
});

export default Sidebar;
