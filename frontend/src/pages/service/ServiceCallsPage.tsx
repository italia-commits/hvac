import { Phone, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { ServiceCall } from '../../lib/api-types';

export default function ServiceCallsPage() {
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: ServiceCall[] }>('/service-calls', { params: { limit: 50 } })
      .then(r => setCalls(r.data?.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load service calls'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Service Calls</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage service appointments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm">
          <Plus size={18} />
          New Service Call
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">{error}</div>
      )}

      {!loading && !error && calls.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Phone size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No service calls yet</p>
        </div>
      )}

      {!loading && !error && calls.length > 0 && (
        <div className="space-y-4">
          {calls.map((call) => (
            <div key={call.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${
                    call.priority === 'high' || call.priority === 'critical'
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : call.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/20'
                      : 'bg-blue-100 dark:bg-blue-900/20'
                  }`}>
                    <Phone size={20} className={
                      call.priority === 'high' || call.priority === 'critical'
                        ? 'text-red-600 dark:text-red-400'
                        : call.priority === 'medium' ? 'text-amber-600 dark:text-amber-400'
                        : 'text-blue-600 dark:text-blue-400'
                    } />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{call.type}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{call.customer_name || `Customer #${call.customer_id}`}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  call.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                  call.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                  call.status === 'scheduled' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>{call.status}</span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{call.scheduled_date ? new Date(call.scheduled_date).toLocaleDateString() : 'Date TBD'}</span>
                {call.scheduled_time && <span>{call.scheduled_time}</span>}
                {call.technician_name && <span>{call.technician_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}