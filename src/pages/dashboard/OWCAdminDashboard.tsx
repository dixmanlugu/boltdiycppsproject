import React, { useState } from 'react';
import { Users, Settings, Shield, Activity, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NewOWCStaffForm from '../../components/forms/NewOWCStaffForm';
import GoToReportsButton from '../../components/forms/GoToReportsButton';

const OWCAdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNewStaffForm, setShowNewStaffForm] = useState(false);

  const menuItems = {
    'Master Data': {
      items: [
        'Search Employer',
        'Search Worker',
        'Employer - Workers List',
        'Province',
        'Insurance Company',
        'Employer Password Change',
        'OWC Bank Accounts'
      ],
      submenus: {
        'Province': ['New', 'Edit', 'View'],
        'Insurance Company': ['New', 'Edit', 'View'],
        'OWC Bank Accounts': ['New', 'Edit', 'View']
      }
    },
    'Region': {
      items: ['New', 'Edit', 'View']
    },
    'Import Organization': {
      items: []
    },
    'OWCStaff': {
      items: ['New', 'Edit', 'View']
    },
    'System Parameter': {
      items: ['Edit']
    },
    'Reports': {
      items: [
        'Data Entry',
        'CPM Compensation Status',
        'Form 6 Notifications',
        'Form 18 Notifications'
      ]
    },
    'Archives': {
      items: [
        'Registrars Basket',
        'Payment Section',
        'Tribunal'
      ],
      submenus: {
        'Registrars Basket': ['Closed Time Barred Files', 'Non Work Related Cases']
      }
    }
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuItemClick = (menu: string, item: string) => {
    if (menu === 'OWCStaff' && item === 'New') {
      setShowNewStaffForm(true);
    }
    setActiveMenu(null);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">OWC Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name || 'Administrator'}</p>
				<GoToReportsButton />
      </div>

      {/* Navigation Menu */}
      <div className="mb-8 bg-white rounded-lg shadow">
        <div className="p-4 grid grid-cols-1 gap-4">
          {Object.entries(menuItems).map(([menu, { items, submenus = {} }]) => (
            <div key={menu} className="relative">
              <button
                onClick={() => toggleMenu(menu)}
                className="w-full flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <span className="font-medium">{menu}</span>
                {items.length > 0 && (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      activeMenu === menu ? 'transform rotate-180' : ''
                    }`}
                  />
                )}
              </button>
              {activeMenu === menu && items.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                  {items.map((item) => (
                    <div key={item}>
                      <button
                        onClick={() => handleMenuItemClick(menu, item)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                      >
                        {item}
                      </button>
                      {submenus[item] && (
                        <div className="pl-8 bg-gray-50">
                          {submenus[item].map((subitem) => (
                            <button
                              key={subitem}
                              onClick={() => handleMenuItemClick(item, subitem)}
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                            >
                              {subitem}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">256</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-green-100 mr-4">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold">42</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-amber-100 mr-4">
              <Settings className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">System Health</p>
              <p className="text-2xl font-bold">98%</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-purple-100 mr-4">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">API Requests</p>
              <p className="text-2xl font-bold">1.2K</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">System Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">
                      {[
                        'User account created',
                        'System backup completed',
                        'Security patch applied',
                        'Database optimization'
                      ][index]}
                    </p>
                    <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    index % 2 === 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {index % 2 === 0 ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Database Performance</span>
                <span className="text-sm text-green-600">Excellent</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">API Response Time</span>
                <span className="text-sm text-green-600">Good</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Storage Usage</span>
                <span className="text-sm text-amber-600">Moderate</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-amber-500 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-green-600">Good</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button className="btn btn-primary w-full">View Detailed Reports</button>
          </div>
        </div>
      </div>

      {showNewStaffForm && (
        <NewOWCStaffForm onClose={() => setShowNewStaffForm(false)} />
      )}
    </div>
  );
};

export default OWCAdminDashboard;
