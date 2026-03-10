import { useState } from 'react';
import AppShell from '../components/AppShell';
import type { ModuleInfo, TabId } from './integrationStatusData';
import { getAllModules } from './integrationStatusData';
import { OverviewTab, ModulesTab, RoadmapTab, ArchitectureTab, VisionTab, MetricsTab } from './IntegrationStatusTabs';
import { ModuleDetailModal } from './IntegrationStatusModals';
import styles from './IntegrationStatusPage.module.css';

export default function IntegrationStatusPage() {
  const [allModules] = useState<ModuleInfo[]>(getAllModules());
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Module filters
  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'built' | 'roadmap'>('all');

  // Module detail modal
  const [selectedModule, setSelectedModule] = useState<ModuleInfo | null>(null);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'modules', label: '🔧 Modules' },
    { id: 'roadmap', label: '🗺️ Roadmap' },
    { id: 'architecture', label: '🏗️ Stack' },
    { id: 'vision', label: '🎯 Vision' },
    { id: 'metrics', label: '📈 Metrics' },
  ];

  return (
    <AppShell>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            🔬 Integration Status Dashboard
          </h1>
          <p className={styles.pageSubtitle}>
            Complete overview of django-core platform development (Modules 001-055)
          </p>
        </div>

        {/* Tab Bar */}
        <div className={styles.tabBar}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? styles.tabButtonActive : styles.tabButton}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <OverviewTab allModules={allModules} setActiveTab={setActiveTab} />
        )}
        {activeTab === 'modules' && (
          <ModulesTab
            allModules={allModules}
            viewMode={viewMode}
            setViewMode={setViewMode}
            phaseFilter={phaseFilter}
            setPhaseFilter={setPhaseFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSelectedModule={setSelectedModule}
          />
        )}
        {activeTab === 'roadmap' && <RoadmapTab allModules={allModules} />}
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'vision' && <VisionTab />}
        {activeTab === 'metrics' && <MetricsTab allModules={allModules} />}
      </div>

      {selectedModule && (
        <ModuleDetailModal
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
        />
      )}
    </AppShell>
  );
}
