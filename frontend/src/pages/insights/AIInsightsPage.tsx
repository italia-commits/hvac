import { useState, useEffect } from 'react';
import api from '../../lib/api';
import type { RenewalPrediction, ChurnRisk, RevenueForecast, PriorityOpportunity } from '../../lib/api-types';
import { Brain, TrendingUp, AlertTriangle, Target, DollarSign, RefreshCw, ThumbsUp, Activity, BarChart3, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AIInsightsPage() {
  const [predictions, setPredictions] = useState<RenewalPrediction[]>([]);
  const [churnRisks, setChurnRisks] = useState<ChurnRisk[]>([]);
  const [opportunities, setOpportunities] = useState<PriorityOpportunity[]>([]);
  const [forecast, setForecast] = useState<RevenueForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runAnalysisLoading, setRunAnalysisLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<{ data: RenewalPrediction[] }>('/insights/renewal-predictions?limit=5').then(r => r.data?.data || []),
      api.get<{ data: ChurnRisk[] }>('/insights/churn-risk?limit=5').then(r => r.data?.data || []),
      api.get<{ data: PriorityOpportunity[] }>('/insights/replacement-opportunities?limit=5').then(r => r.data?.data || []),
      api.get<{ data: RevenueForecast }>('/insights/revenue-forecast').then(r => r.data?.data).catch(() => null),
    ])
      .then(([pred, churn, opp, fcst]) => {
        setPredictions(pred);
        setChurnRisks(churn);
        setOpportunities(opp);
        setForecast(fcst);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load insights'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const runAnalysis = async () => {
    setRunAnalysisLoading(true);
    try {
      await api.post('/insights/run-analysis');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Analysis failed');
    } finally {
      setRunAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Brain size={28} className="text-primary-600 dark:text-primary-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Insights</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">AI-powered predictions, risk analysis, and revenue forecasting</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={runAnalysisLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium text-sm"
        >
          {runAnalysisLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {runAnalysisLoading ? 'Running Analysis...' : 'Run AI Analysis'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg border border-red-200 dark:border-red-800">{error}</div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Revenue Forecast Banner */}
          {forecast && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                    <DollarSign size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${forecast.current_mrr?.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current MRR</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <ThumbsUp size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{forecast.active_agreements}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active Agreements</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20">
                    <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-amber-600">${forecast.at_risk_revenue?.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">At-Risk Revenue</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <BarChart3 size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monthly Expirations</p>
                <p className="text-xs text-gray-400 mt-1">
                  {forecast.monthly_expirations?.slice(0, 3).map(e => `${e.month}: ${e.count}`).join(', ') || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {/* Revenue Forecast Chart */}
          {forecast?.monthly_expirations && forecast.monthly_expirations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Forecast — Monthly Expirations</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={forecast.monthly_expirations}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" name="Revenue at Risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="count" name="Expiring Count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Three Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Renewal Predictions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Top Renewal Predictions</h3>
              </div>
              {predictions.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No predictions yet</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {predictions.map((p, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.customer_name}</p>
                        <span className="text-sm font-bold text-green-600">{p.renewal_probability}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{p.agreement_type} · Ends {new Date(p.end_date).toLocaleDateString()}</p>
                      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${p.renewal_probability}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Churn Risk */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">High Churn Risk</h3>
              </div>
              {churnRisks.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No risks detected</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {churnRisks.map((c, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.customer_name}</p>
                        <span className="text-sm font-bold text-red-600">{c.churn_risk_score}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{c.agreement_type} · {c.days_remaining} days left</p>
                      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${c.churn_risk_score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Replacement Opportunities */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Target size={18} className="text-purple-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Priority Replacements</h3>
              </div>
              {opportunities.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No opportunities</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {opportunities.map((o, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{o.customer_name}</p>
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">${o.estimated_value?.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500">{o.equipment_name || 'Equipment'} · {o.equipment_age} years old</p>
                      <p className="text-xs text-gray-400 mt-1">{o.reason}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Activity size={14} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Priority: {o.priority_score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}