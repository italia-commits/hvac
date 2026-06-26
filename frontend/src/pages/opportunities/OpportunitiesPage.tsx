import { Target, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { ReplacementOpportunity } from '../../lib/api-types';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<ReplacementOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: ReplacementOpportunity[] }>('/opportunities', { params: { limit: 50 } })
      .then(r => setOpportunities(r.data?.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load opportunities'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Replacement Opportunities</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">AI-detected equipment replacement opportunities</p>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">{error}</div>
      )}

      {!loading && !error && opportunities.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Target size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No opportunities identified yet</p>
          <p className="text-sm mt-1">Opportunities will appear when equipment is nearing end of life.</p>
        </div>
      )}

      {!loading && !error && opportunities.length > 0 && (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${opp.probability >= 80 ? 'bg-red-100 dark:bg-red-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                    <Target size={20} className={opp.probability >= 80 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{opp.customer_name || `Customer #${opp.customer_id}`}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{opp.equipment_name || 'Equipment'} · {opp.equipment_age} years old</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">${opp.estimated_value?.toLocaleString()}</span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{opp.probability}% probability</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{opp.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}