import React from 'react';
import { Card, Badge } from '@/shims/design-system';

export function TablesTabPanel() {
  return (
    <>
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <p className="text-sm text-gray-900 font-medium">Tables: Used for displaying collections of data.</p>
        <p className="text-xs text-gray-500 mt-1">Used in: <a href="/identity/users" className="hover:underline">Users</a>, <a href="/config/audit" className="hover:underline">Audit Log</a></p>
      </div>
      <div className="p-6 space-y-8">
        {/* Default Table */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-medium">Default Table</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3].map(i => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-3">User {i}</td>
                    <td className="p-3 text-gray-500">Editor</td>
                    <td className="p-3"><Badge size="sm" variant="success">Active</Badge></td>
                    <td className="p-3 text-right text-orange-600 cursor-pointer hover:underline">Edit</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Empty State */}
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-medium">Empty State</div>
          <div className="p-8 text-center text-gray-500">
            <div className="text-2xl mb-2">📭</div>
            <p>No data available</p>
          </div>
        </Card>
      </div>
    </>
  );
}
