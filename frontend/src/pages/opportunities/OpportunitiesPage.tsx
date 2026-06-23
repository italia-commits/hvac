import { Target, TrendingUp } from 'lucide-react';

const mockOpportunities = [
  { id: '1', customer: 'Johnson Commercial', equipment: 'Bryant 315A Furnace', age: 10, probability: 85, value: '$4,200', reason: 'End of life expectancy', status: 'high' },
  { id: '2', customer: 'Smith Residence', equipment: 'Lennox XC25 AC', age: 8, probability: 65, value: '$3,800', reason: 'Aging equipment - efficiency loss', status: 'medium' },
  { id: '3', customer: 'Green Energy Systems', equipment: 'Carrier 24ACB7 AC Unit', age: 12, probability: 92, value: '$5,500', reason: 'Past end of life - frequent repairs', status: 'high' },
];

export default function OpportunitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Replacement Opportunities</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">AI-detected equipment replacement opportunities</p>
      </div>

      <div className="space-y-4">
        {mockOpportunities.map((opp) => (
          <div key={opp.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${opp.status === 'high' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                  <Target size={20} className={opp.status === 'high' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{opp.customer}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{opp.equipment} · {opp.age} years old</p>
                </div>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{opp.value}</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{opp.probability}% probability</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{opp.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}