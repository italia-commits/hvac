import { Phone, Plus } from 'lucide-react';

const mockCalls = [
  { id: '1', customer: 'ABC Heating & Cooling', type: 'Emergency Repair', date: '2025-06-15', time: '2:30 PM', tech: 'Mike R.', status: 'scheduled', priority: 'high' },
  { id: '2', customer: 'Smith Residence', type: 'Filter Replacement', date: '2025-06-14', time: '10:00 AM', tech: 'Sarah L.', status: 'in-progress', priority: 'low' },
  { id: '3', customer: 'Johnson Commercial', type: 'AC Tune-Up', date: '2025-06-13', time: '9:00 AM', tech: 'Mike R.', status: 'completed', priority: 'medium' },
];

export default function ServiceCallsPage() {
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

      <div className="space-y-4">
        {mockCalls.map((call) => (
          <div key={call.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${call.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20' : call.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                  <Phone size={20} className={call.priority === 'high' ? 'text-red-600 dark:text-red-400' : call.priority === 'medium' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{call.type}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{call.customer}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                call.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                call.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              }`}>{call.status}</span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{call.date}</span>
              <span>{call.time}</span>
              <span>{call.tech}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}