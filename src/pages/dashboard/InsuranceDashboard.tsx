import React, { useState } from 'react';
import { FileText, Users, Clock, CheckCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoToReportsButton from '../../components/forms/GoToReportsButton';

const InsuranceDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuItems = {
    'Form6': {
      items: [
        'Form6 Pending',
        'Form6 Approved'
      ]
    }
  };

  const recentClaims = [
    {
      id: 'CLM-2023-001',
      type: 'Injury Claim',
      claimant: 'John Smith',
      dateSubmitted: '2023-05-15',
      status: 'Pending Review'
    },
    {
      id: 'CLM-2023-002',
      type: 'Death Claim',
      claimant: 'Mary Johnson',
      dateSubmitted: '2023-05-14',
      status: 'Documentation Required'
    },
    {
      id: 'CLM-2023-003',
      type: 'Injury Claim',
      claimant: 'Peter Wilson',
      dateSubmitted: '2023-05-13',
      status: 'Under Review'
    }
  ];

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
        <h1 className="text-2xl font-bold text-gray-900">Insurance Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name || 'Insurance Officer'}</p>
				<GoToReportsButton />
      </div>

      {/* Navigation Menu */}
      <div className="mb-8 bg-white rounded-lg shadow">
        <div className="p-4 grid grid-cols-1 gap-4">
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

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-blue-100 mr-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Claims</p>
              <p className="text-2xl font-bold">28</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-green-100 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Processed Today</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-amber-100 mr-4">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Claimants</p>
              <p className="text-2xl font-bold">156</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-purple-100 mr-4">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Processing</p>
              <p className="text-2xl font-bold">3.2d</p>
            </div>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Claims</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Claim ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Claimant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Submitted
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                    {claim.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {claim.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {claim.claimant}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {claim.dateSubmitted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      claim.status === 'Pending Review' ? 'bg-yellow-100 text-yellow-800' : 
                      claim.status === 'Documentation Required' ? 'bg-red-100 text-red-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary hover:text-primary-dark mr-3">
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InsuranceDashboard;
