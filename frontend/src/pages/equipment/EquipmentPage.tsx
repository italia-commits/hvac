import { Wrench, Plus, Search } from 'lucide-react';
import { useState } from 'react';

const mockEquipment = [
  { id: '1', name: 'Carrier 24ACB7 AC Unit', customer: 'ABC Heating & Cooling', type: 'AC', installDate: '2019-06-15', status: 'good', nextService: '2025-12-15' },
  { id: '2', name: 'Bryant 315A Furnace', customer: 'Smith Residence', type: 'Furnace', installDate: '2015-11-20', status: 'aging', nextService: '2025-09-20' },
  { id: '3', name: 'Lennox XC25 AC', customer: 'Johnson Commercial', type: 'AC', installDate: '2023-04-10', status: 'good', nextService: '2026-04-10' },
  { id: '4', name: 'Rheem R96V Furnace', customer: 'Green Energy Systems', type: 'Furnace', installDate: '2012-08-05', status: 'end-of-life', nextService: '2025-08-05' },
];

export default function EquipmentPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Equipment</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage HVAC equipment</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm">
          <Plus size={18} />
          Add Equipment
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockEquipment.map((eq) => (
          <div key={eq.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Wrench size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{eq.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{eq.customer}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                eq.status === 'good' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                eq.status === 'aging' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>{eq.status}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">{eq.type}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Installed:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">{eq.installDate}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Next Service:</span>
                <span className="ml-1 text-gray-900 dark:text-gray-100">{eq.nextService}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}