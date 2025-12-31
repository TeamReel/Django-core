// @django-core/page-templates
// Main entry point for the page templates package

export const version = '0.1.0';

// Export types
export * from './types';

// Export hooks
export * from './hooks';

// Export state components
export * from './components/states';

// Export PageHeader and PageContent
export { PageHeader, type PageHeaderProps, type BreadcrumbItem } from './components/PageHeader';
export { PageContent, type PageContentProps } from './components/PageContent';

// Export BreadcrumbContextSwitcher
export { BreadcrumbContextSwitcher, type BreadcrumbContextSwitcherProps, type BreadcrumbSwitcherOption } from './components/BreadcrumbContextSwitcher';
export * from './hooks/useBreadcrumbContextSwitcher';

// Export Dashboard template
export * from './components/Dashboard';

// Export ListDetail template
export * from './components/ListDetail';

// Export Wizard template
export * from './components/Wizard';

// Export Settings template
export * from './components/Settings';
