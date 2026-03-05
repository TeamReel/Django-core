import React from 'react';
import { Card, Alert } from '@django-core/design-system';
import { PageHeader, PageContent } from '@django-core/page-templates';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { usePreferencesData } from './usePreferencesData';
import { PreferencesModals } from './PreferencesModals';
import { PreferencesProfileTab } from './PreferencesProfileTab';
import { PersonalisationTab, AuditTab, NotificationsTab } from './PreferencesSettingsTabs';

/**
 * T015 - Preferences Page
 *
 * Purpose: Persist theme/language/timezone via B12 preferences API
 * - Theme toggle with F07 hook integration
 * - Language dropdown (i18n integration)
 * - Timezone selection
 * - Immediate UI update on save
 * - Persists across navigation
 */

export const PreferencesPage: React.FC = () => {
  const data = usePreferencesData();
  const { loading, success, activeTab } = data;
  useSetBackNavigation({ label: 'Profile', path: '/profile' });

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Preferences"
          breadcrumbs={[
            { label: 'Profile', href: '/profile' },
            { label: 'Preferences' },
          ]}
        />
        <PageContent>
          <Card>
            <div className="text-center py-12 text-gray-500">
              Loading preferences...
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Preferences"
        breadcrumbs={[
          { label: 'Profile', href: '/profile' },
          { label: 'Preferences' },
        ]}
      />

      <PageContent>
        {success && (
          <div className="mb-24">
            <Alert variant="success" data-testid="prefs-success-alert">
              Preferences saved successfully
            </Alert>
          </div>
        )}

        <div>
          {activeTab === 'profile' && <PreferencesProfileTab d={data} />}
          {activeTab === 'personalisation' && <PersonalisationTab d={data} />}
          {activeTab === 'audit' && <AuditTab d={data} />}
          {activeTab === 'notifications' && <NotificationsTab d={data} />}
        </div>
      </PageContent>

      <PreferencesModals {...data} />
    </>
  );
};

export default PreferencesPage;
