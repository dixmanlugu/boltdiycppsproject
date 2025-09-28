import React, { useState } from 'react';
import { DollarSign, TrendingUp, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoToReportsButton from '../../components/forms/GoToReportsButton';

const PaymentsManagerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = {
    'Payments': {
      items: [
        'Payment Pending',
        'Payment Approved',
        'Payment Rejected',
        'Payment Processed',
        'Payment Cheque',
        'Payment Cheque Edit',
        'Payment Cheque View',
        'Payment Cheque Print',
        'Payment Cheque Cancel',
        'Payment Cheque Reprint',
        'Payment Cheque Status',
        'Payment Bank Account',
        'Payment Bank Account Edit',
        'Payment Bank Account View'
      ]
    },
    'Reports': {
      items: [
        'Daily Summary',
        'Weekly Report',
        'Monthly Analysis',
        'Payment Trends',
        'Bank Reconciliation'
      ]
    }
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuItemClick = (menu: string, item: string) => {
    console.log(`Selected ${item} from ${menu}`);
    setActiveMenu(null);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payments Manager Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name || 'Payments Manager'}</p>
				<GoToReportsButton />
      </div>

      {/* Navigation Menu */}
      <div className="mb-8 bg-white rounded-lg shadow">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(menuItems).map(([menu, { items }]) => (
            <div key={menu} className="relative">
              <button
                onClick={() => toggleMenu(menu)}
                className="w-full flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <span className="font-medium">{menu}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    activeMenu === menu ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {activeMenu === menu && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                  {items.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleMenuItemClick(menu, item)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-blue-100 mr-4">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold">K3.2M</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-green-100 mr-4">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold">98.5%</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-amber-100 mr-4">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">23</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-red-100 mr-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Payment Queue</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Payment #{2023450 + index}</p>
                  <p className="text-sm text-gray-500">Claim #{1001 + index}</p>
                  <p className="text-sm font-medium text-primary">K{(50000 + index * 5000).toLocaleString()}</p>
                </div>
                <button className="btn btn-primary text-sm">Process</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Batch #{2023447 + index}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    index === 0 ? 'bg-amber-100 text-amber-800' :
                    index === 1 ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {index === 0 ? 'Processing' :
                     index === 1 ? 'Failed' :
                     'Completed'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {index === 1 ? 'Error: Bank rejection' : `Processed on ${new Date().toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsManagerDashboard;
