import React from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

export function StatusBadge({ type, value }) {
  const norm = String(value || type || '').toUpperCase();

  if (norm === 'ALLOW' || norm === 'SAFE' || norm === 'LOW' || norm === 'PROTECTED' || norm === 'ACTIVE') {
    return (
      <span className="badge badge-safe">
        <ShieldCheck size={12} />
        {value || 'Allowed'}
      </span>
    );
  }

  if (norm === 'WARN' || norm === 'MEDIUM') {
    return (
      <span className="badge badge-warn">
        <AlertTriangle size={12} />
        {value || 'Warning'}
      </span>
    );
  }

  return (
    <span className="badge badge-block">
      <ShieldAlert size={12} />
      {value || 'Blocked'}
    </span>
  );
}
