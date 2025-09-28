import React from 'react';
import { FileText, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import GoToReportsButton from '../../components/forms/GoToReportsButton';

const CPODashboard: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">CPO Dashboard</h1>
				  
        <p className="text-gray-600">Welcome back, {profile?.full_name || 'CPO Officer'}</p>
				<GoToReportsButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-blue-100 mr-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Claims</p>
              <p className="text-2xl font-bold">24</p>
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
              <p className="text-2xl font-bold">8</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-amber-100 mr-4">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Requires Attention</p>
              <p className="text-2xl font-bold">5</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-purple-100 mr-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Claimants</p>
              <p className="text-2xl font-bold">156</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Claims Requiring Review</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Claim #{2023450 + index}</p>
                  <p className="text-sm text-gray-500">Submitted on {new Date().toLocaleDateString()}</p>
                </div>
                <button className="btn btn-primary text-sm">Process</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Claim #{2023447 + index}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    index % 2 === 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {index % 2 === 0 ? 'Processed' : 'In Review'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Updated on {new Date().toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CPODashboard;
