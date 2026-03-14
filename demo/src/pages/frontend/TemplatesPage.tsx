import React from 'react';
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from '../../shims/design-system';
import {
  DashboardTabPanel,
  ListDetailTabPanel,
  SettingsTabPanel,
  TablesTabPanel,
  NotificationsTabPanel,
} from './TemplatesPagePanels';

export function TemplatesPage() {
  return (
    <>
      <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Page Templates</h1>
          <p className="text-gray-500">
            Standardized layout patterns for consistent UI/UX.
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
          <TabList className="mb-4">
            <Tab value="dashboard">Dashboard</Tab>
            <Tab value="list-detail">List-Detail</Tab>
            <Tab value="settings">Settings</Tab>
            <Tab value="tables">Tables</Tab>
            <Tab value="notifications">Notifications</Tab>
          </TabList>

          <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50 relative">
            <TabPanel value="dashboard" className="h-full overflow-auto">
              <DashboardTabPanel />
            </TabPanel>

            <TabPanel value="list-detail" className="h-full">
              <ListDetailTabPanel />
            </TabPanel>

            <TabPanel value="settings" className="h-full overflow-auto">
              <SettingsTabPanel />
            </TabPanel>

            <TabPanel value="tables" className="h-full overflow-auto">
              <TablesTabPanel />
            </TabPanel>

            <TabPanel value="notifications" className="h-full overflow-auto">
              <NotificationsTabPanel />
            </TabPanel>
          </div>
        </Tabs>
      </div>
    </>
  );
}

export default TemplatesPage;
