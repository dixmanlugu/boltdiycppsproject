import React, { useState, useEffect } from 'react';
import { FileText, Users, Clock, CheckCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData
} from 'chart.js';
import ListPendingClaimsForCommissionerReview from '../../components/forms/ListPendingClaimsForCommissionerReview';
import ListApprovedClaimsForCommissionerReview from '../../components/forms/ListApprovedClaimsForCommissionerReview';
import GoToReportsButton from '../../components/forms/GoToReportsButton';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CommissionerDashboard: React.FC = () => {
  const { profile } = useAuth();

  const [userFullName, setUserFullName] = useState<string>(profile?.full_name || 'Chief Commissioner');
  const [userStaffID, setUserStaffID] = useState<string>('1000'); // sensible default
	
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showPendingClaimsList, setShowPendingClaimsList] = useState(false);
  const [showApprovedClaimsList, setShowApprovedClaimsList] = useState(false);
  
  // State for counts
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // State for charts
  const [yearlyChartData, setYearlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  const [monthlyChartData, setMonthlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });

  const menuItems = {
    'Awarded Claims': {
      items: ['Pending', 'Approved']
    }
  };

  useEffect(() => {
    fetchCounts();
    generateChartData();
    
    // Set up interval to refresh counts every 30 seconds
    const interval = setInterval(() => {
      fetchCounts();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch pending claims count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('commissioner_pending_view')
        .select('*', { count: 'exact', head: true });
      
      if (pendingError) throw pendingError;
      
      // Fetch approved claims count
      const { count: approvedCount, error: approvedError } = await supabase
        .from('commissioner_approved_view')
        .select('*', { count: 'exact', head: true });
      
      if (approvedError) throw approvedError;
      
      setPendingCount(pendingCount || 0);
      setApprovedCount(approvedCount || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoading(false);
    }
  };

useEffect(() => {
  (async () => {
    try {
      // If there is no profile yet, keep defaults
      if (!profile?.id) {
        setUserFullName('Chief Commissioner');
        setUserStaffID('1000');
        return;
      }

      const { data, error } = await supabase
        .from('owcstaffmaster')
        .select('OSMFirstName, OSMLastName, OSMStaffID')
        .eq('cppsid', profile.id)
        .maybeSingle();

      if (error) throw error;

      const fullName =
        data ? `${data.OSMFirstName} ${data.OSMLastName}` : (profile.full_name || 'Chief Commissioner');
      const staffId = data?.OSMStaffID ? String(data.OSMStaffID) : '1000';

      setUserFullName(fullName);
      setUserStaffID(staffId);
    } catch (e) {
      console.error('Failed to load user profile for dashboard header:', e);
      // fallbacks
      setUserFullName(profile?.full_name || 'Chief Commissioner');
      setUserStaffID('1000');
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


	
  const generateChartData = () => {
    // Generate yearly data (last 5 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString());
    
    const yearlyData = {
      labels: years,
      datasets: [
        {
          label: 'Pending Claims',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
        {
          label: 'Approved Claims',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
      ]
    };
    
    setYearlyChartData(yearlyData);
    
    // Monthly data (current year)
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const monthlyData = {
      labels: months,
      datasets: [
        {
          label: 'Pending Claims',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
        {
          label: 'Approved Claims',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
        }
      ]
    };
    
    setMonthlyChartData(monthlyData);
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuItemClick = (menu: string, item: string) => {
    console.log(`Selected ${item} from ${menu}`);
    
    if (menu === 'Awarded Claims' && item === 'Pending') {
      setShowPendingClaimsList(true);
    } else if (menu === 'Awarded Claims' && item === 'Approved') {
      setShowApprovedClaimsList(true);
    }
    
    setActiveMenu(null);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Commissioner Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name || 'Commissioner'}</p>
				 <p className="text-gray-500 text-sm -mt-1">User ID: {userStaffID}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-blue-100 mr-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Claims</p>
              <p className="text-2xl font-bold">{loading ? '...' : (pendingCount + approvedCount)}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-green-100 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved Claims</p>
              <p className="text-2xl font-bold">{loading ? '...' : approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-amber-100 mr-4">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold">{loading ? '...' : pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-purple-100 mr-4">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Officers</p>
              <p className="text-2xl font-bold">24</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Claims by Year</h2>
          <div className="h-64">
            <Line 
              data={yearlyChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Claims by Month (Current Year)</h2>
          <div className="h-64">
            <Line 
              data={monthlyChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Pending Claims List Modal */}
      {showPendingClaimsList && (
        <ListPendingClaimsForCommissionerReview 
          onClose={() => setShowPendingClaimsList(false)}
        />
      )}

      {/* Approved Claims List Modal */}
      {showApprovedClaimsList && (
        <ListApprovedClaimsForCommissionerReview 
          onClose={() => setShowApprovedClaimsList(false)}
        />
      )}
    </div>
  );
};

export default CommissionerDashboard;
