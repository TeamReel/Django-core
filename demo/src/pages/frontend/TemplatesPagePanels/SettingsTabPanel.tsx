import React, { useState } from 'react';
import { Card, Button, Input } from '@/shims/design-system';
import { Settings } from '@/shims/page-templates';
import { SETTINGS_SECTIONS } from './mockData';

export function SettingsTabPanel() {
  const [activeSettingsSection, setActiveSettingsSection] = useState('profile');

  return (
    <>
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <p className="text-sm text-gray-900 font-medium">Settings: Used for configuration and preference pages.</p>
        <p className="text-xs text-gray-500 mt-1">Used in: <a href="/config/preferences" className="hover:underline">Preferences</a>, <a href="/preferences?tab=profile" className="hover:underline">Profile</a></p>
      </div>
      <Settings
        sections={SETTINGS_SECTIONS}
        activeSection={activeSettingsSection}
        onActiveSectionChange={setActiveSettingsSection}
      >
        <Settings.Section sectionId="profile">
          <Card className="p-6 max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Profile Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <Input defaultValue="Brian User" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input defaultValue="brian@example.com" type="email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  defaultValue="Software Engineer at Django Core."
                />
              </div>
              <div className="pt-4 flex gap-2">
                <Button variant="primary">Save Changes</Button>
                <Button variant="secondary">Cancel</Button>
              </div>
            </div>
          </Card>
        </Settings.Section>

        <Settings.Section sectionId="notifications">
          <Card className="p-6 max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Email Notifications</div>
                  <div className="text-sm text-gray-500">Receive daily summaries</div>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-gray-500">Receive real-time alerts</div>
                </div>
                <input type="checkbox" className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </Settings.Section>

        <Settings.Section sectionId="security">
          <Card className="p-6 max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Security</h2>
            <div className="space-y-4">
              <Button variant="secondary">Change Password</Button>
              <Button variant="secondary">Enable 2FA</Button>
            </div>
          </Card>
        </Settings.Section>
      </Settings>
    </>
  );
}
