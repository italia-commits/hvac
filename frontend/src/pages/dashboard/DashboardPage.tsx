import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Activity,
  AlertTriangle,
  Calendar,
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const renewalData = [
  { month: 'Jan', renewals: 45, expiring: 52 },
  { month: 'Feb', renewals: 52, expiring: 48 },
  { month: 'Mar', renewals: 48, expiring: 55 },
  { month: 'Apr', renewals: 55, expiring: 50 },
  { month: 'May', renewals: 58, expiring: 53 },
  { month: 'Jun', renewals: 62, expiring: 58 },
];

const agreementStatusData = [
  { name: 'Active', value: 340 },
  { name: 'Expiring Soon', value: 85 },
  { name: 'Expired', value: 45 },
  { name: 'Pending Renewal', value: 30 },
];

const recentActivities = [
  { id: 1, action: 'Agreement renewed', customer: 'ABC Heating', time: '2 hours ago', type: 'success' },
  { id: 2, action: 'Churn risk detected', customer: 'Smith Residence', time: '3 hours ago', type: 'warning' },
  { id: 3, action: 'Service call completed', customer: 'Johnson Commercial', time: '5 hours ago', type: 'info' },
  { id: 4, action: 'Replacement opportunity', customer: 'Green Energy Systems', time: '1 day ago', type: 'opportunity' },
  { id: 5, action: 'Agreement expiring in 7 days', customer: 'Miller & Sons', time: '1 day ago', type: 'warning' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    { label: 'Active Agreements', value: '340', change: '+12%', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { label: 'Renewal Rate', value: '94.2%', change: '+2.1%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
    { label: 'At-Risk Accounts', value: '23', change: '-5', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    { label: 'Monthly Recurring', value: '$47,200', change: '+8.3%', icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name?.split(' ')[0] || 'User'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.change.startsWith('+') || stat.change.startsWith('−')
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                  : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renewal Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Renewal Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={renewalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="renewals" name="Renewals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expiring" name="Expiring" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agreement Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Agreement Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={agreementStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {agreementStatusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="px-6 py-4 flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'success' ? 'bg-green-500' :
                activity.type === 'warning' ? 'bg-amber-500' :
                activity.type === 'opportunity' ? 'bg-purple-500' : 'bg-blue-500'
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
      </div>
    </div>
  );
}