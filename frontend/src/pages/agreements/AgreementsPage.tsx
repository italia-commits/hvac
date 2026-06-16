import { FileText, Plus, Search } from 'lucide-react';
import { useState } from 'react';

const mockAgreements = [
  { id: '1', customer: 'ABC Heating & Cooling', type: 'Premium HVAC Maintenance', start: '2025-01-15', end: '2026-01-15', value: '$1,200/yr', status: 'active', renewalProbability: 92 },
  { id: '2', customer: 'Smith Residence', type: 'Basic AC Service', start: '2025-03-01', end: '2026-03-01', value: '$600/yr', status: 'active', renewalProbability: 85 },
  { id: '3', customer: 'Johnson Commercial', type: 'Full HVAC Coverage', start: '2024-06-01', end: '2025-06-01', value: '$3,600/yr', status: 'expiring', renewalProbability: 45 },
  { id: '4', customer: 'Green Energy Systems', type: 'Commercial Maintenance', start: '2024-01-01', end: '2025-01-01', value: '$2,400/yr', status: 'expired', renewalProbability: 30 },
];

export default function AgreementsPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Maintenance Agreements</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage renewals and track agreement status</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm">
          <Plus size={18} />
          New Agreement
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agreements..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockAgreements.map((ag) => (
              <tr key={ag.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{ag.customer}</td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{ag.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{ag.start} - {ag.end}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{ag.value}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div className={`h-full rounded-full ${ag.renewalProbability >= 80 ? 'bg-green-500' : ag.renewalProbability >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${ag.renewalProbability}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-500">{ag.renewalProbability}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    ag.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    ag.status === 'expiring' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                    'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>{ag.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}