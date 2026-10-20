import React from 'react';
import { Circle, AlertTriangle, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function StatusBadge({ status }) {
  const normalized = (status || 'unevaluated').toLowerCase();

  switch (normalized) {
    case 'suspected_problem':
    case 'suspected':
    case 'red':
      return (
        <span className="badge badge-suspected">
          <AlertTriangle size={12} /> Suspected Issue
        </span>
      );
    case 'pending_correction':
    case 'pending':
    case 'yellow':
      return (
        <span className="badge badge-pending">
          <Clock size={12} /> Pending Review
        </span>
      );
    case 'verified':
    case 'green':
      return (
        <span className="badge badge-verified">
          <CheckCircle2 size={12} /> Verified
        </span>
      );
    case 'updated_after_feedback':
    case 'updated':
    case 'blue':
      return (
        <span className="badge badge-updated">
          <RefreshCw size={12} /> Updated Post-Feedback
        </span>
      );
    case 'unevaluated':
    default:
      return (
        <span className="badge badge-unevaluated">
          <Circle size={12} /> Unevaluated
        </span>
      );
  }
}
