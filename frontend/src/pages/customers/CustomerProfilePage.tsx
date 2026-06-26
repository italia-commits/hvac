import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';
import { ArrowLeft, Phone, Mail, MapPin, Wrench, FileText, Calendar, Plus } from 'lucide-react';
import type { Customer, Equipment, MaintenanceAgreement, ServiceCall, Invoice } from '../../lib/api-types';

export default function CustomerProfilePage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [agreements, setAgreements] = useState<MaintenanceAgreement[]>([]);
  const [services, setServices] = useState<ServiceCall[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<Customer>(`/customers/${id}`).then(r => r.data),
      api.get<{ data: Equipment[] }>('/equipment', { params: { customer_id: id } }).then(r => r.data?.data || []),
      api.get<{ data: MaintenanceAgreement[] }>('/agreements', { params: { customer_id: id } }).then(r => r.data?.data || []),
      api.get<{ data: ServiceCall[] }>('/service-calls', { params: { customer_id: id } }).then(r => r.data?.data || []),
      api.get<{ data: Invoice[] }>('/invoices', { params: { customer_id: id } }).then(r => r.data?.data || []),
    ])
      .then(([cust, eq, ag, svc, inv]) => {
        setCustomer(cust);
        setEquipment(eq);
        setAgreements(ag);
        setServices(svc);
        setInvoices(inv);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load customer'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back to Customers
        </Link>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p className="text-lg font-medium">Customer not found</p>
        <Link to="/customers" className="text-primary-600 hover:underline mt-2 inline-block">Back to Customers</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft size={16} /> Back to Customers
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{customer.name?.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customer.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                customer.status === 'active' ? 'bg-green-100 text-green-700' :
                customer.status === 'at-risk' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>{customer.status}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{customer.contact_name}</p>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><Mail size={14} />{customer.email}</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><Phone size={14} />{customer.phone}</span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><MapPin size={14} />{customer.address}</span>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shrink-0">
            <Plus size={16} /> Add Agreement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Equipment */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Equipment ({equipment.length})</h2>
            {equipment.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No equipment records</p>
            ) : (
              <div className="space-y-3">
                {equipment.map((eq) => (
                  <div key={eq.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <Wrench size={18} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{eq.name}</p>
                        <p className="text-xs text-gray-500">Installed {new Date(eq.install_date).toLocaleDateString()} · {eq.age_years} years old</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      eq.status === 'good' ? 'bg-green-100 text-green-700' :
                      eq.status === 'aging' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>{eq.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Service History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Service History ({services.length})</h2>
            {services.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No service history</p>
            ) : (
              <div className="space-y-3">
                {services.map((svc) => (
                  <div key={svc.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{svc.type}</p>
                        <p className="text-xs text-gray-500">{new Date(svc.scheduled_date).toLocaleDateString()} · {svc.technician_name || 'Unassigned'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      svc.status === 'completed' ? 'bg-green-100 text-green-700' :
                      svc.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{svc.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Agreements */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Agreements ({agreements.length})</h2>
            {agreements.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No agreements</p>
            ) : (
              <div className="space-y-3">
                {agreements.map((ag) => (
                  <div key={ag.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ag.type}</p>
                    <p className="text-xs text-gray-500 mt-1">{new Date(ag.start_date).toLocaleDateString()} - {new Date(ag.end_date).toLocaleDateString()}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-semibold text-gray-900">${ag.value?.toLocaleString()}/yr</span>
                      <span className={`text-xs font-medium ${
                        ag.status === 'active' ? 'text-green-600' :
                        ag.status === 'expiring' ? 'text-amber-600' : 'text-red-600'
                      }`}>{ag.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invoices ({invoices.length})</h2>
            {invoices.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No invoices</p>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">${inv.amount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-medium ${
                      inv.status === 'paid' ? 'text-green-600' :
                      inv.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                    }`}>{inv.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}