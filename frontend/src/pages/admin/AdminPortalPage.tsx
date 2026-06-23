import { Shield, Users, Building2, CreditCard, Settings, Activity, BarChart3 } from 'lucide-react';

export default function AdminPortalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Portal</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Super admin system management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'System Health', value: 'All systems operational', icon: Activity, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
          { label: 'Active Companies', value: '24', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
          { label: 'Total Users', value: '186', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
          { label: 'MRR (All)', value: '$47,200', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
          { label: 'API Usage (24h)', value: '12,847 req', icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
          { label: 'Pending Invites', value: '8', icon: Settings, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/20' },
        ].map((item) => (
          <div key={item.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${item.bg}`}>
                <item.icon size={20} className={item.color} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Admin Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left">
            <Users size={24} className="text-primary-600 mb-2" />
            <p className="font-medium text-gray-900 dark:text-gray-100">Manage Users</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add, edit, or deactivate users</p>
          </button>
          <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left">
            <Building2 size={24} className="text-primary-600 mb-2" />
            <p className="font-medium text-gray-900 dark:text-gray-100">Manage Companies</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure tenant settings</p>
          </button>
          <button className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left">
            <Settings size={24} className="text-primary-600 mb-2" />
            <p className="font-medium text-gray-900 dark:text-gray-100">System Config</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Global settings and integrations</p>
          </button>
        </div>
      </div>
    </div>
  );
}