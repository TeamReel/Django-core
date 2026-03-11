import React from 'react';

export interface ToastProps {
  notification: { id?: string; message?: string; type?: string; [k: string]: unknown };
  onDismiss: (id: string) => void;
  variant?: string;
}

export function Toast({ notification, onDismiss, variant }: ToastProps) {
  const colors: Record<string, string> = { success: 'bg-green-100 text-green-800', warning: 'bg-yellow-100 text-yellow-800', error: 'bg-red-100 text-red-800' };
  return (
    <div className={`px-4 py-2 rounded flex justify-between items-center ${colors[variant || 'success'] || colors.success}`}>
      <span className="text-sm">{notification.message}</span>
      <button onClick={() => onDismiss(notification.id || '')} className="ml-2 opacity-60 hover:opacity-100">&times;</button>
    </div>
  );
}
