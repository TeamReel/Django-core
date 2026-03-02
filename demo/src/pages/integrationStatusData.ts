export interface ModuleInfo {
  id: string;
  code: string; // B01, F01, etc.
  number: number; // 001-071
  name: string;
  description: string;
  phase: number; // 1-18
  category: 'Backend' | 'Frontend' | 'Data' | 'Platform' | 'Integration' | 'Operations';
  status: 'complete' | 'in-progress' | 'planned';
  features: string[];
  testUrl?: string;
  notes?: string;
}

export type TabId = 'overview' | 'modules' | 'roadmap' | 'architecture' | 'vision' | 'metrics';

export const getStatusColor = (status: ModuleInfo['status']): string => {
  switch (status) {
    case 'complete': return '#28a745';
    case 'in-progress': return '#fd7e14';
    case 'planned': return '#6c757d';
    default: return '#6c757d';
  }
};

export const getStatusLabel = (status: ModuleInfo['status']): string => {
  switch (status) {
    case 'complete': return '✅ Complete';
    case 'in-progress': return '🚧 In Progress';
    case 'planned': return '📋 Planned';
    default: return '? Unknown';
  }
};

// Complete module database (71 modules)
export const getAllModules = (): ModuleInfo[] => {
  return [
    // Fase 1: Foundation & Governance (001-004)
    { id: '001', code: 'B01', number: 1, name: 'Core Project Skeleton', description: 'Production-ready Django structure', phase: 1, category: 'Backend', status: 'complete', features: ['Modular apps', 'Environment configs', 'CI/CD'] },
    { id: '002', code: 'B02', number: 2, name: 'Constitutional Enforcement Engine', description: 'SDD enforcement & quality gates', phase: 1, category: 'Platform', status: 'complete', features: ['Rule engine', 'SDD validation', 'CLI tool'] },
    { id: '003', code: 'B03', number: 3, name: 'Core Security Baseline', description: 'Hardened security settings', phase: 1, category: 'Backend', status: 'complete', features: ['CSRF protection', 'Rate limiting', 'Secure headers'] },
    { id: '004', code: 'B04', number: 4, name: 'Core Internationalization Base', description: 'Multi-language support', phase: 1, category: 'Backend', status: 'complete', features: ['gettext/l10n', 'Locale middleware', 'Timezone support'] },

    // Fase 2: Identity & Hierarchy (005-008)
    { id: '005', code: 'B05', number: 5, name: 'Core Accounts & Authentication', description: 'Custom user model & auth flows', phase: 2, category: 'Backend', status: 'complete', features: ['Custom User', 'Login/Logout', 'Password reset'], testUrl: '/login' },
    { id: '006', code: 'B06', number: 6, name: 'Organisation Management (Multi-Tenancy)', description: 'Generic organisation model', phase: 2, category: 'Backend', status: 'complete', features: ['Org CRUD', 'Membership management', 'API endpoints'], testUrl: '/organisations' },
    { id: '007', code: 'B07', number: 7, name: 'Projects / Workspaces Management', description: 'Project containers within orgs', phase: 2, category: 'Backend', status: 'complete', features: ['Project CRUD', 'Hierarchy', 'Context propagation'] },
    { id: '008', code: 'B08', number: 8, name: 'Hierarchical Access Control (RBAC)', description: 'Role-based permissions', phase: 2, category: 'Backend', status: 'complete', features: ['Role management', 'Permission checks', 'Context-aware'] },

    // Fase 3: Config, Audit & Transactions (009-012)
    { id: '009', code: 'B09', number: 9, name: 'Audit Logging System', description: 'Comprehensive event tracking', phase: 3, category: 'Backend', status: 'complete', features: ['Event logging', 'Query interface', 'Retention policies'] },
    { id: '010', code: 'B10', number: 10, name: 'Core Settings Management', description: 'Hierarchical configuration', phase: 3, category: 'Backend', status: 'complete', features: ['System/org/user settings', 'Validation', 'Type safety'] },
    { id: '011', code: 'B11', number: 11, name: 'Transactional Outbox Pattern', description: 'Reliable event publishing', phase: 3, category: 'Backend', status: 'complete', features: ['Outbox pattern', 'Event delivery', 'Retry logic'] },
    { id: '012', code: 'B12', number: 12, name: 'User Preferences & Customization', description: 'User-specific settings', phase: 3, category: 'Backend', status: 'complete', features: ['Preference storage', 'Validation', 'API endpoints'] },

    // Fase 4: Interfaces & Communication (013-017)
    { id: '013', code: 'B13', number: 13, name: 'API Foundation & Standards', description: 'REST API baseline with DRF', phase: 4, category: 'Backend', status: 'complete', features: ['DRF setup', 'OpenAPI', 'Versioning', 'Rate limiting'] },
    { id: '014', code: 'B14', number: 14, name: 'Web UI Integration Baseline', description: 'Frontend serving infrastructure', phase: 4, category: 'Backend', status: 'complete', features: ['Static serving', 'SPA routing', 'CSRF integration'] },
    { id: '015', code: 'B15', number: 15, name: 'Tasks & Scheduling Foundation', description: 'Celery async task infrastructure', phase: 4, category: 'Backend', status: 'complete', features: ['Celery workers', 'Task scheduling', 'Monitoring'] },
    { id: '016', code: 'B16', number: 16, name: 'Notifications Delivery Baseline', description: 'Multi-channel notifications', phase: 4, category: 'Backend', status: 'complete', features: ['Channel abstraction', 'Template engine', 'Delivery tracking'] },
    { id: '017', code: 'B17', number: 17, name: 'Contextual Notifications', description: 'Context-aware notifications', phase: 4, category: 'Backend', status: 'complete', features: ['Org/project context', 'User preferences', 'Filtering'] },

    // Fase 5: Operational & Finalization (018-021)
    { id: '018', code: 'B18', number: 18, name: 'Platform Observability Foundation', description: 'Metrics & monitoring', phase: 5, category: 'Backend', status: 'complete', features: ['Prometheus metrics', 'Health checks', 'Logging'] },
    { id: '019', code: 'B19', number: 19, name: 'Deployment Automation & Compose', description: 'Docker deployment', phase: 5, category: 'Operations', status: 'complete', features: ['Docker compose', 'Multi-stage builds', 'Health checks'] },
    { id: '020', code: 'B20', number: 20, name: 'Core Scaffolding CLI', description: 'Code generation tool', phase: 5, category: 'Platform', status: 'complete', features: ['Template engine', 'Module scaffolding', 'CLI interface'] },
    { id: '021', code: 'B21', number: 21, name: 'Documentation Baseline & MkDocs', description: 'Documentation infrastructure', phase: 5, category: 'Platform', status: 'complete', features: ['MkDocs setup', 'Auto-generated docs', 'Deployment'] },

    // Fase 6: Frontend Foundation (022)
    { id: '022', code: 'F01', number: 22, name: 'Design System & Component Library', description: 'UI primitives & tokens', phase: 6, category: 'Frontend', status: 'complete', features: ['Design tokens', 'Base components', 'Storybook'] },

    // Fase 7: Auth, Context & Core UI (023-030)
    { id: '023', code: 'F02', number: 23, name: 'Authentication UI Components', description: 'Login/logout interfaces', phase: 7, category: 'Frontend', status: 'complete', features: ['Login form', 'Session management', 'Error handling'], testUrl: '/login' },
    { id: '024', code: 'F03', number: 24, name: 'Multi-Tenancy Context Switcher', description: 'Org/project switcher UI', phase: 7, category: 'Frontend', status: 'complete', features: ['Context switcher', 'Persistence', 'Keyboard shortcuts'] },
    { id: '025', code: 'F04', number: 25, name: 'Notifications Hub UI', description: 'Notification inbox & toasts', phase: 7, category: 'Frontend', status: 'complete', features: ['Toast notifications', 'Inbox UI', 'Badge counters'], testUrl: '/notifications' },
    { id: '026', code: 'F05', number: 26, name: 'Resource Display & Alerts', description: 'Usage & alert components', phase: 7, category: 'Frontend', status: 'complete', features: ['Usage displays', 'Alert components', 'KPI tiles'], testUrl: '/resources' },
    { id: '027', code: 'F06', number: 27, name: 'Reusable Page Templates', description: 'Layout components', phase: 7, category: 'Frontend', status: 'complete', features: ['AppShell', 'Settings template', 'ListDetail pattern'], testUrl: '/settings' },
    { id: '028', code: 'F07', number: 28, name: 'Theme Support & Brand Variants', description: 'Light/dark theming', phase: 7, category: 'Frontend', status: 'complete', features: ['Theme tokens', 'Runtime switching', 'Brand variants'] },
    { id: '029', code: 'F08', number: 29, name: 'Data Visualization Components', description: 'Charts & graphs (reserved)', phase: 7, category: 'Frontend', status: 'planned', features: ['Reserved for future'] },
    { id: '030', code: 'F09', number: 30, name: 'Frontend-Backend Integration Guides', description: 'Integration docs', phase: 7, category: 'Frontend', status: 'complete', features: ['API patterns', 'Error handling', 'Caching strategies'] },

    // Fase 8: Demo Foundation (031-033)
    { id: '031', code: 'F10', number: 31, name: 'Demo Shell & Integration Dashboard', description: 'Demo app & status monitoring', phase: 8, category: 'Frontend', status: 'complete', features: ['Integration dashboard', 'Module testing', 'Visual validation'], testUrl: '/integration-status' },
    { id: '032', code: 'F10b-DB', number: 32, name: 'Demo Database & Data Seeding', description: 'Demo data infrastructure', phase: 8, category: 'Backend', status: 'complete', features: ['Data fixtures', 'Seeding scripts', 'Realistic data'] },
    { id: '033', code: 'F10b-Pages', number: 33, name: 'Demo Pages & User Journeys', description: 'Production-ready demos', phase: 8, category: 'Frontend', status: 'complete', features: ['User journeys', 'Interactive demos', 'Feature showcase'] },

    // Fase 9: Backend Infrastructure (034-037)
    { id: '034', code: 'B22', number: 34, name: 'File & Media Management', description: 'File storage & processing', phase: 9, category: 'Backend', status: 'complete', features: ['S3 integration', 'Upload handling', 'Media processing'] },
    { id: '035', code: 'B23', number: 35, name: 'Real-Time & WebSocket Foundation', description: 'WebSocket support', phase: 9, category: 'Backend', status: 'complete', features: ['WebSocket routing', 'Channel layers', 'Real-time events', 'Rate limiting', 'Demo integration'], testUrl: '/ui/demo/websockets/' },
    { id: '036', code: 'B24', number: 36, name: 'Search & Full-Text Foundation', description: 'Search infrastructure', phase: 9, category: 'Backend', status: 'planned', features: ['Elasticsearch', 'Full-text search', 'Faceted queries'] },
    { id: '037', code: 'B25', number: 37, name: 'Cache Strategy & Redis Integration', description: 'Caching layer', phase: 9, category: 'Backend', status: 'planned', features: ['Cache patterns', 'Invalidation', 'Performance'] },

    // Fase 10: Frontend & Visual Dev (038-040)
    { id: '038', code: 'F08', number: 38, name: 'Data Visualization Components (Implementation)', description: 'Charts & graphs library', phase: 10, category: 'Frontend', status: 'planned', features: ['Chart components', 'D3.js integration', 'Responsive'] },
    { id: '039', code: 'F09', number: 39, name: 'Visual Development Tools', description: 'Developer tooling', phase: 10, category: 'Frontend', status: 'planned', features: ['Component inspector', 'State viewer', 'Performance profiler'] },
    { id: '040', code: 'F13', number: 40, name: 'Rich Text Editor & Forms', description: 'Advanced input components', phase: 10, category: 'Frontend', status: 'planned', features: ['WYSIWYG editor', 'Form builder', 'Validation'] },

    // Fase 11: Workflows & Payments (041-043)
    { id: '041', code: 'B26', number: 41, name: 'Payment Gateway Adapters', description: 'Payment processing', phase: 11, category: 'Backend', status: 'planned', features: ['Stripe integration', 'Subscription handling', 'Webhooks'] },
    { id: '042', code: 'B27', number: 42, name: 'Workflow Engine & State Machine', description: 'Business process automation', phase: 11, category: 'Backend', status: 'planned', features: ['State machines', 'Workflow definition', 'Execution engine'] },
    { id: '043', code: 'B28', number: 43, name: 'Advanced Reporting & Exports', description: 'Report generation', phase: 11, category: 'Backend', status: 'planned', features: ['PDF generation', 'CSV exports', 'Scheduled reports'] },

    // Fase 12: Advanced UI (044-047)
    { id: '044', code: 'F14', number: 44, name: 'Admin Panel Components', description: 'Admin UI toolkit', phase: 12, category: 'Frontend', status: 'planned', features: ['Admin dashboard', 'CRUD interfaces', 'Bulk actions'] },
    { id: '045', code: 'F11', number: 45, name: 'Operations Console UI', description: 'Ops monitoring dashboard', phase: 12, category: 'Frontend', status: 'planned', features: ['System metrics', 'Log viewer', 'Health dashboard'] },
    { id: '046', code: 'F12', number: 46, name: 'Billing & Usage UI', description: 'Billing interfaces', phase: 12, category: 'Frontend', status: 'planned', features: ['Usage meters', 'Invoice UI', 'Payment methods'] },
    { id: '047', code: 'F15', number: 47, name: 'Frontend Form Components', description: 'Advanced form library', phase: 12, category: 'Frontend', status: 'planned', features: ['Form builder', 'Validation', 'Multi-step forms'] },

    // Fase 13: Data Foundations Part 1 (048-052)
    { id: '048', code: 'D01', number: 48, name: 'Data Storage Adapters', description: 'Multi-storage backend', phase: 13, category: 'Data', status: 'planned', features: ['Storage abstraction', 'S3/Azure/GCS', 'Versioning'] },
    { id: '049', code: 'D02', number: 49, name: 'ETL & Data Pipeline Foundation', description: 'Data transformation', phase: 13, category: 'Data', status: 'planned', features: ['ETL framework', 'Pipeline orchestration', 'Data quality'] },
    { id: '050', code: 'D03', number: 50, name: 'Dataset Management & Lineage', description: 'Dataset tracking', phase: 13, category: 'Data', status: 'planned', features: ['Dataset registry', 'Lineage tracking', 'Metadata'] },
    { id: '051', code: 'D04', number: 51, name: 'Streaming Data Adapters', description: 'Real-time data ingestion', phase: 13, category: 'Data', status: 'planned', features: ['Kafka integration', 'Stream processing', 'Event sourcing'] },
    { id: '052', code: 'D05', number: 52, name: 'Data Version Control', description: 'Dataset versioning', phase: 13, category: 'Data', status: 'planned', features: ['Git-like versioning', 'Diffs', 'Branching'] },

    // Fase 14: Data Foundations Part 2 (053-057)
    { id: '053', code: 'D06', number: 53, name: 'Structured Output Validation', description: 'Schema validation', phase: 14, category: 'Data', status: 'planned', features: ['Schema validation', 'Pydantic models', 'Type checking'] },
    { id: '054', code: 'D07', number: 54, name: 'Tool-Call Logging Infrastructure', description: 'API call tracking', phase: 14, category: 'Data', status: 'planned', features: ['Call logging', 'Performance metrics', 'Cost tracking'] },
    { id: '055', code: 'D08', number: 55, name: 'Prompt Experiment Tracking', description: 'LLM prompt management', phase: 14, category: 'Data', status: 'planned', features: ['Prompt versioning', 'A/B testing', 'Performance'] },
    { id: '056', code: 'D09', number: 56, name: 'Evaluation & Metrics Framework', description: 'Model evaluation', phase: 14, category: 'Data', status: 'planned', features: ['Eval framework', 'Metrics computation', 'Benchmarking'] },
    { id: '057', code: 'D10', number: 57, name: 'Annotation & Labeling Tools', description: 'Data labeling', phase: 14, category: 'Data', status: 'planned', features: ['Labeling UI', 'Quality control', 'Inter-annotator agreement'] },

    // Fase 15: ML/AI Platform (058-063)
    { id: '058', code: 'D11', number: 58, name: 'Feature Engineering Patterns', description: 'Feature pipelines', phase: 15, category: 'Data', status: 'planned', features: ['Feature store', 'Transformations', 'Feature serving'] },
    { id: '059', code: 'D12', number: 59, name: 'Model Registry', description: 'ML model management', phase: 15, category: 'Data', status: 'planned', features: ['Model versioning', 'Metadata', 'Deployment'] },
    { id: '060', code: 'D13', number: 60, name: 'Prompt Template Library', description: 'Prompt management', phase: 15, category: 'Data', status: 'planned', features: ['Template library', 'Variables', 'Versioning'] },
    { id: '061', code: 'D14', number: 61, name: 'Agent Operations & Orchestration', description: 'AI agent framework', phase: 15, category: 'Data', status: 'planned', features: ['Agent runtime', 'Orchestration', 'Tool integration'] },
    { id: '062', code: 'D15', number: 62, name: 'Vector Search & Retrieval Adapter', description: 'Vector DB integration', phase: 15, category: 'Data', status: 'planned', features: ['Vector search', 'Embeddings', 'RAG support'] },
    { id: '063', code: 'D16', number: 63, name: 'Model Monitoring & Feedback Loop', description: 'ML monitoring', phase: 15, category: 'Data', status: 'planned', features: ['Performance monitoring', 'Drift detection', 'Feedback'] },

    // Fase 16: Quality Gates (064-068)
    { id: '064', code: 'P01', number: 64, name: 'Constitutional Enforcement Engine', description: 'Quality gate automation', phase: 16, category: 'Platform', status: 'planned', features: ['Rule engine', 'CI integration', 'Reporting'] },
    { id: '065', code: 'P02', number: 65, name: 'Security Audit & ASVS Compliance', description: 'Security validation', phase: 16, category: 'Platform', status: 'planned', features: ['ASVS compliance', 'Vulnerability scanning', 'Audit reports'] },
    { id: '066', code: 'P03', number: 66, name: 'ML & Agent Governance Gate', description: 'AI governance', phase: 16, category: 'Platform', status: 'planned', features: ['Model governance', 'Bias detection', 'Explainability'] },
    { id: '067', code: 'P04', number: 67, name: 'Integration Security Audit', description: 'Integration security', phase: 16, category: 'Platform', status: 'planned', features: ['API security', 'OAuth validation', 'Rate limiting'] },
    { id: '068', code: 'P05', number: 68, name: 'Stack & Dependency Validation', description: 'Dependency management', phase: 16, category: 'Platform', status: 'planned', features: ['Dependency scanning', 'License compliance', 'CVE monitoring'] },

    // Fase 17: Integration Ecosystem (069-070)
    { id: '069', code: 'I01', number: 69, name: 'Connector Framework & SDK', description: 'Integration framework', phase: 17, category: 'Integration', status: 'planned', features: ['Connector SDK', 'Plugin system', 'Marketplace'] },
    { id: '070', code: 'I02', number: 70, name: 'Compliance Exports', description: 'Data export for compliance', phase: 17, category: 'Integration', status: 'planned', features: ['GDPR exports', 'Audit exports', 'Data portability'] },

    // Fase 18: Operations & Resilience (071)
    { id: '071', code: 'O01', number: 71, name: 'Resilience Testing & Health Validation', description: 'Platform resilience', phase: 18, category: 'Operations', status: 'planned', features: ['Chaos engineering', 'Load testing', 'Health validation'] },
  ];
};
