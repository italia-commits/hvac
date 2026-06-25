import { Wrench, Plus, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { Equipment } from '../../lib/api-types';

export default function EquipmentPage() {
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<{ data: Equipment[] }>('/equipment', { params: { search: search || undefined, limit: 100 } })
      .then(r => setEquipment(r.data?.data || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load equipment'))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Equipment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage HVAC equipment</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm">
          <Plus size={18} />
          Add Equipment
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">{error}</div>
      )}

      {!loading && !error && equipment.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Wrench size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No equipment tracked yet</p>
          <p className="text-sm mt-1">Add equipment to start tracking service schedules.</p>
        </div>
      )}

      {!loading && !error && equipment.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipment.map((eq) => (
            <div key={eq.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Wrench size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{eq.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{eq.manufacturer || 'Unknown'} · {eq.model || ''}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  eq.status === 'good' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                  eq.status === 'aging' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                  'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                }`}>{eq.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="ml-1 text-gray-900 dark:text-gray-100">{eq.type}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Age:</span>
                  <span className="ml-1 text-gray-900 dark:text-gray-100">{eq.age_years} years</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Installed:</span>
                  <span className="ml-1 text-gray-900 dark:text-gray-100">{new Date(eq.install_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Serial:</span>
                  <span className="ml-1 text-gray-900 dark:text-gray-100">{eq.serial_number || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}