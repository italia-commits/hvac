import { Building2, Plus, Search } from 'lucide-react';
import { useState } from 'react';

const mockCompanies = [
  { id: '1', name: 'ABC Heating & Cooling', users: 12, agreements: 45, plan: 'Pro', status: 'active', mrr: '$1,200' },
  { id: '2', name: 'Smith HVAC Services', users: 5, agreements: 28, plan: 'Growth', status: 'active', mrr: '$299' },
  { id: '3', name: 'Johnson Comfort Systems', users: 3, agreements: 15, plan: 'Starter', status: 'active', mrr: '$99' },
  { id: '4', name: 'Green Tech Mechanical', users: 1, agreements: 8, plan: 'Starter', status: 'trial', mrr: '$0' },
];

export default function CompaniesPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Companies</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage tenant organizations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm">
          <Plus size={18} />
          Add Company
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Agreements</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">MRR</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <Building2 size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{company.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{company.users}</td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{company.agreements}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{company.plan}</span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{company.mrr}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    company.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  }`}>{company.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}