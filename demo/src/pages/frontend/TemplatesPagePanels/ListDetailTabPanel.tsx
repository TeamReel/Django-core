import React, { useState } from 'react';
import { Card, Badge, Button } from '@/shims/design-system';
import { ListDetail } from '@/shims/page-templates';
import { MOCK_TASKS } from './mockData';

export function ListDetailTabPanel() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | number | null>(null);

  return (
    <>
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <p className="text-sm text-gray-900 font-medium">List–Detail: Used for resource, user, and entity management pages.</p>
        <p className="text-xs text-gray-500 mt-1">Used in: <a href="/resources" className="hover:underline">Resources</a>, <a href="/identity/users" className="hover:underline">Users</a></p>
      </div>
      <ListDetail
        selectedId={selectedTaskId}
        onSelectedIdChange={setSelectedTaskId}
        listMinWidth={300}
      >
        <ListDetail.List showSearch searchPlaceholder="Search tasks...">
          <div className="divide-y">
            {MOCK_TASKS.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedTaskId === task.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="font-medium text-gray-900">{task.title}</div>
                <div className="flex gap-2 mt-1">
                  <Badge size="sm" variant={task.status === 'completed' ? 'success' : 'info'}>
                    {task.status}
                  </Badge>
                  <span className="text-xs text-gray-500 self-center">
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ListDetail.List>
        <ListDetail.Detail>
          {selectedTaskId ? (
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <button
                    onClick={() => setSelectedTaskId(null)}
                    className="md:hidden mb-4 text-sm text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    ← Back to List
                  </button>
                  <h2 className="text-2xl font-bold">
                    {MOCK_TASKS.find(t => t.id === selectedTaskId)?.title}
                  </h2>
                </div>
                <Button variant="warning" size="sm">Edit</Button>
              </div>
              <Card className="p-6 mb-6">
                <h3 className="font-semibold mb-4">Description</h3>
                <p className="text-gray-600">
                  This is a detailed description for the selected task.
                  In a real application, this would contain the full content
                  fetched from the backend.
                </p>
              </Card>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-gray-500">Assignee</div>
                  <div className="font-medium">John Doe</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-gray-500">Due Date</div>
                  <div className="font-medium">Tomorrow</div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a task to view details
            </div>
          )}
        </ListDetail.Detail>
      </ListDetail>
    </>
  );
}
