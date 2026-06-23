import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Wrench, FileText, Calendar, DollarSign, Plus } from 'lucide-react';

const mockCustomer = {
  id: '1',
  name: 'ABC Heating & Cooling',
  contact: 'John Smith',
  email: 'john@abcheating.com',
  phone: '(555) 123-4567',
  address: '123 Main St, Anytown, USA 12345',
  status: 'active',
  agreements: [
    { id: 'a1', type: 'Premium HVAC Maintenance', start: '2025-01-15', end: '2026-01-15', value: '$1,200/yr', status: 'active' },
    { id: 'a2', type: 'Basic AC Service', start: '2025-03-01', end: '2026-03-01', value: '$600/yr', status: 'active' },
  ],
  equipment: [
    { id: 'e1', name: 'Carrier 24ACB7 AC Unit', type: 'AC', installDate: '2019-06-15', status: 'good', age: 6 },
    { id: 'e2', name: 'Bryant 315A Furnace', type: 'Furnace', installDate: '2015-11-20', status: 'aging', age: 10 },
    { id: 'e3', name: 'Honeywell T9 Thermostat', type: 'Thermostat', installDate: '2023-02-10', status: 'good', age: 2 },
  ],
  recentServices: [
    { id: 's1', date: '2025-06-10', type: 'Spring Tune-Up', tech: 'Mike R.', status: 'completed' },
    { id: 's2', date: '2025-04-22', type: 'Filter Replacement', tech: 'Sarah L.', status: 'completed' },
    { id: 's3', date: '2025-03-15', type: 'Emergency Repair', tech: 'Mike R.', status: 'completed' },
  ],
  invoices: [
    { id: 'i1', date: '2025-06-01', description: 'Premium Maintenance Agreement', amount: '$1,200', status: 'paid' },
    { id: 'i2', date: '2025-05-15', description: 'Emergency Service Call', amount: '$350', status: 'paid' },
  ],
};

export default function CustomerProfilePage() {
  const { id } = useParams();
  const customer = mockCustomer;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} />
        Back to Customers
      </Link>

      {/* Customer Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{customer.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customer.name}</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">{customer.status}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{customer.contact}</p>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><Mail size={14} />{customer.email}</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><Phone size={14} />{customer.phone}</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"><MapPin size={14} />{customer.address}</span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shrink-0">
            <Plus size={16} />
            Add Agreement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Equipment</h2>
            <div className="space-y-3">
              {customer.equipment.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Wrench size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{eq.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Installed {eq.installDate} · {eq.age} years old</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    eq.status === 'good' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                    eq.status === 'aging' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                    'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>{eq.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Service History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Service History</h2>
            <div className="space-y-3">
              {customer.recentServices.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{svc.type}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{svc.date} · {svc.tech}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">{svc.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agreements */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Agreements</h2>
            <div className="space-y-3">
              {customer.agreements.map((ag) => (
                <div key={ag.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ag.type}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ag.start} - {ag.end}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{ag.value}</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">{ag.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invoices</h2>
            <div className="space-y-3">
              {customer.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.amount}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{inv.date}</p>
                  </div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">{inv.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}