import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../lib/useApi';
import api from '../../lib/api';
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Activity {
  id: string;
  action: string;
  customer_name?: string;
  created_at: string;
  type?: string;
}

interface StatCard {
  label: string;
  value: string;
  change: string;
  icon: any;
  color: string;
  bg: string;
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch stats from multiple endpoints
  const { data: agreements, loading: loadingAgreements } = useApi(
    () => api.get('/agreements?limit=1000').then(r => r.data),
  );

  // Compute stats from real data
  const stats: StatCard[] = (() => {
    if (!agreements?.data) return [];
    const total = agreements.data.length;
    const active = agreements.data.filter((a: any) => a.status === 'active').length;
    const expiring = agreements.data.filter((a: any) => a.status === 'expiring').length;
    const expired = agreements.data.filter((a: any) => a.status === 'expired').length;
    const totalValue = agreements.data.reduce((s: number, a: any) => s + (a.value || 0), 0);
    const renewalRate = total > 0 ? ((active / total) * 100).toFixed(1) : '0';

    return [
      { label: 'Active Agreements', value: active.toString(), change: `${total} total`, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
      { label: 'Renewal Rate', value: `${renewalRate}%`, change: `${expiring} expiring`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
      { label: 'At-Risk Accounts', value: expiring.toString(), change: `${expired} expired`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
      { label: 'Monthly Recurring', value: `$${(totalValue / 12).toLocaleString()}`, change: `$${totalValue.toLocaleString()}/yr`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
    ];
  })();

  // Activity feed
  const { data: activities } = useApi<{ data: Activity[] }>(
    () => api.get('/agreements?limit=5&sort=updated_at').then(r => ({ data: r.data?.data || [] })),
  );

  // Chart data from agreements
  const statusCounts = agreements?.data?.reduce((acc: any, a: any) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {}) || {};

  const agreementStatusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const recentActivities = (activities?.data || []).map((a: any, i: number) => ({
    id: a.id || i,
    action: a.status === 'active' ? 'Agreement active' : a.status === 'expiring' ? 'Agreement expiring soon' : 'Agreement expired',
    customer: a.customer_name || 'Unknown',
    time: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Recently',
    type: a.status === 'active' ? 'success' : a.status === 'expiring' ? 'warning' : 'error',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
      </div>

      {/* Loading state */}
      {loadingAgreements && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Stats Grid */}
      {!loadingAgreements && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {!loadingAgreements && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {agreements?.data && agreements.data.length > 0 ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Agreement Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={agreementStatusData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {agreementStatusData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Agreement Values</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agreementStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                    <Bar dataKey="value" name="Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No agreement data yet</p>
              <p className="text-sm mt-1">Agreements will appear here once customers start signing up.</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
        </div>
        {recentActivities.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="px-6 py-4 flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.action}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.customer}</p>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
                <ArrowUpRight size={16} className="text-gray-400" />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No recent activity</div>
        )}
      </div>
    </div>
  );
}