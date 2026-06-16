import { Users, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const mockCustomers = [
  { id: '1', name: 'ABC Heating & Cooling', contact: 'John Smith', email: 'john@abcheating.com', phone: '(555) 123-4567', agreements: 12, status: 'active' },
  { id: '2', name: 'Smith Residence', contact: 'Bob Smith', email: 'bob@gmail.com', phone: '(555) 234-5678', agreements: 2, status: 'active' },
  { id: '3', name: 'Johnson Commercial', contact: 'Alice Johnson', email: 'alice@johnson.com', phone: '(555) 345-6789', agreements: 8, status: 'at-risk' },
  { id: '4', name: 'Green Energy Systems', contact: 'Mike Green', email: 'mike@greenenergy.com', phone: '(555) 456-7890', agreements: 5, status: 'active' },
];

export default function CustomerListPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your customer accounts</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm">
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agreements</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <Link to={`/customers/${customer.id}`} className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">
                    {customer.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{customer.contact}</td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{customer.email}</td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{customer.agreements}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  }`}>
                    {customer.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}