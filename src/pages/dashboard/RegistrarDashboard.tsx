import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertTriangle, ChevronDown, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import GoToReportsButton from '../../components/forms/GoToReportsButton';
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
import ListClaimDecisions from '../../components/forms/ListClaimDecisions';
import ListPendingRegisteredClaimsRegistrarReview from '../../components/forms/ListPendingRegisteredClaimsRegistrarReview';
import ListApprovedRegisteredClaimsRegistrarReview from '../../components/forms/ListApprovedRegisteredClaimsRegistrarReview';
import ListRejectedRegisteredClaimsRegistrarReview from '../../components/forms/ListRejectedRegisteredClaimsRegistrarReview';
import ListPendingAwardedClaimsForRegistrarReview from '../../components/forms/ListPendingAwardedClaimsForRegistrarReview';
import ListApprovedAwardedClaimsForRegistrarReview from '../../components/forms/ListApprovedAwardedClaimsForRegistrarReview';
import ListPendingTimeBarredFormsRegistrarReview from '../../components/forms/ListPendingTimeBarredFormsRegistrarReview';
import ListApprovedTimeBarredFormsRegistrarReview from '../../components/forms/ListApprovedTimeBarredFormsRegistrarReview';
import ListRejectedTimeBarredFormsRegistrarReview from '../../components/forms/ListRejectedTimeBarredFormsRegistrarReview';
import ListForwardToTribunalTimeBarredFormsRegistrarReview from '../../components/forms/ListForwardToTribunalTimeBarredFormsRegistrarReview';

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

const RegistrarDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showListClaimDecisions, setShowListClaimDecisions] = useState(false);
  const [showPendingRegisteredClaims, setShowPendingRegisteredClaims] = useState(false);
  const [showApprovedRegisteredClaims, setShowApprovedRegisteredClaims] = useState(false);
  const [showRejectedRegisteredClaims, setShowRejectedRegisteredClaims] = useState(false);
  const [showPendingAwardedClaims, setShowPendingAwardedClaims] = useState(false);
  const [showApprovedAwardedClaims, setShowApprovedAwardedClaims] = useState(false);
  const [showPendingTimeBarredForms, setShowPendingTimeBarredForms] = useState(false);
  const [showApprovedTimeBarredForms, setShowApprovedTimeBarredForms] = useState(false);
  const [showRejectedTimeBarredForms, setShowRejectedTimeBarredForms] = useState(false);
  const [showForwardToTribunalTimeBarredForms, setShowForwardToTribunalTimeBarredForms] = useState(false);
  
  // State for counts
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  
  // State for Awarded Claims counts
  const [awardedPendingCount, setAwardedPendingCount] = useState<number>(0);
  const [awardedApprovedCount, setAwardedApprovedCount] = useState<number>(0);
  const [awardedRejectedCount, setAwardedRejectedCount] = useState<number>(0);
  const [awardedTotalCount, setAwardedTotalCount] = useState<number>(0);
  
  // State for Time Barred Claims counts
  const [timeBarredPendingCount, setTimeBarredPendingCount] = useState<number>(0);
  const [timeBarredApprovedCount, setTimeBarredApprovedCount] = useState<number>(0);
  const [timeBarredRejectedCount, setTimeBarredRejectedCount] = useState<number>(0);
  const [timeBarredForwardToTribunalCount, setTimeBarredForwardToTribunalCount] = useState<number>(0);
  const [timeBarredTotalCount, setTimeBarredTotalCount] = useState<number>(0);
  
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
    'Registered Claims': {
      items: ['Pending', 'Approved', 'Rejected']
    },
    'Awarded Claims': {
      items: ['Pending', 'Approved']
    },
    'Time Barred Claims': {
      items: ['Pending', 'Approved', 'Rejected', 'Forward To Tribunal']
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
        .from('registrar_pending_view')
        .select('*', { count: 'exact', head: true });
      
      if (pendingError) throw pendingError;
      
      // Fetch approved claims count
      const { count: approvedCount, error: approvedError } = await supabase
        .from('registrar_approved_view')
        .select('*', { count: 'exact', head: true });
      
      if (approvedError) throw approvedError;
      
      // Fetch rejected claims count
      const { count: rejectedCount, error: rejectedError } = await supabase
        .from('registrar_rejected_view')
        .select('*', { count: 'exact', head: true });
      
      if (rejectedError) throw rejectedError;
      
      // Fetch awarded claims counts
      // These would need corresponding views in the database
      const { count: awardedPendingCount, error: awardedPendingError } = await supabase
        .from('claimsawardedregistrarreview')
        .select('*', { count: 'exact', head: true })
        .eq('CARRReviewStatus', 'RegistrarReviewPending');
      
      const { count: awardedApprovedCount, error: awardedApprovedError } = await supabase
        .from('claimsawardedregistrarreview')
        .select('*', { count: 'exact', head: true })
        .eq('CARRReviewStatus', 'RegistrarAccepted');
      
      const { count: awardedRejectedCount, error: awardedRejectedError } = await supabase
        .from('claimsawardedregistrarreview')
        .select('*', { count: 'exact', head: true })
        .eq('CARRReviewStatus', 'Rejected');
      
      const { count: awardedTotalCount, error: awardedTotalError } = await supabase
        .from('claimsawardedregistrarreview')
        .select('*', { count: 'exact', head: true });
      
      // Fetch time barred claims counts
      const { count: timeBarredPendingCount, error: timeBarredPendingError } = await supabase
        .from('timebarredclaimsregistrarreview')
        .select('*', { count: 'exact', head: true })
        .eq('TBCRRReviewStatus', 'Pending');
      
      const { count: timeBarredApprovedCount, error: timeBarredApprovedError } = await supabase
        .from('timebarredclaimsregistrarreview')
        .select('*', { count: 'exact', head: true })
        .eq('TBCRRReviewStatus', 'Approved');
      
      const { count: timeBarredRejectedCount, error: timeBarredRejectedError } = await supabase
        .from('timebarredclaimsregistrarreview')
        .select('*', { count: 'exact', head: true })
        .eq('TBCRRReviewStatus', 'Rejected');
      
      const { count: timeBarredForwardToTribunalCount, error: timeBarredForwardToTribunalError } = await supabase
        .from('timebarredclaimsregistrarreview')
        .select('*', { count: 'exact', head: true })
        .eq('TBCRRReviewStatus', 'ForwardToTribunal');
      
      const { count: timeBarredTotalCount, error: timeBarredTotalError } = await supabase
        .from('timebarredclaimsregistrarreview')
        .select('*', { count: 'exact', head: true });
      
      setPendingCount(pendingCount || 0);
      setApprovedCount(approvedCount || 0);
      setRejectedCount(rejectedCount || 0);
      
      setAwardedPendingCount(awardedPendingCount || 0);
      setAwardedApprovedCount(awardedApprovedCount || 0);
      setAwardedRejectedCount(awardedRejectedCount || 0);
      setAwardedTotalCount(awardedTotalCount || 0);
      
      setTimeBarredPendingCount(timeBarredPendingCount || 0);
      setTimeBarredApprovedCount(timeBarredApprovedCount || 0);
      setTimeBarredRejectedCount(timeBarredRejectedCount || 0);
      setTimeBarredForwardToTribunalCount(timeBarredForwardToTribunalCount || 0);
      setTimeBarredTotalCount(timeBarredTotalCount || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoading(false);
    }
  };

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
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
        {
          label: 'Rejected Claims',
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
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
        },
        {
          label: 'Approved Claims',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
        },
        {
          label: 'Rejected Claims',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: 'rgba(255, 205, 86, 0.5)',
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
    
    if (menu === 'Registered Claims' && item === 'Pending') {
      setShowPendingRegisteredClaims(true);
    } else if (menu === 'Registered Claims' && item === 'Approved') {
      setShowApprovedRegisteredClaims(true);
    } else if (menu === 'Registered Claims' && item === 'Rejected') {
      setShowRejectedRegisteredClaims(true);
    } else if (menu === 'Awarded Claims' && item === 'Approved') {
      setShowApprovedAwardedClaims(true);
    } else if (menu === 'Awarded Claims' && item === 'Pending') {
      setShowPendingAwardedClaims(true);
    } else if (menu === 'Time Barred Claims' && item === 'Pending') {
      setShowPendingTimeBarredForms(true);
    } else if (menu === 'Time Barred Claims' && item === 'Approved') {
      setShowApprovedTimeBarredForms(true);
    } else if (menu === 'Time Barred Claims' && item === 'Rejected') {
      setShowRejectedTimeBarredForms(true);
    } else if (menu === 'Time Barred Claims' && item === 'Forward To Tribunal') {
      setShowForwardToTribunalTimeBarredForms(true);
    }
    
    setActiveMenu(null);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Registrar Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name || 'Registrar'}</p>
				<GoToReportsButton />
      </div>

      {/* Navigation Menu */}
      <div className="mb-8 bg-white rounded-lg shadow">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Registered Claims Stats */}
      <h2 className="text-xl font-semibold mb-4">Registered Claims</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-blue-100 mr-4">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Claims</p>
              <p className="text-2xl font-bold">{loading ? '...' : pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-green-100 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved Today</p>
              <p className="text-2xl font-bold">{loading ? '...' : approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-red-100 mr-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold">{loading ? '...' : rejectedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-purple-100 mr-4">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Claims</p>
              <p className="text-2xl font-bold">{loading ? '...' : (pendingCount + approvedCount + rejectedCount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Awarded Claims Stats */}
      <h2 className="text-xl font-semibold mb-4">Awarded Claims</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-amber-100 mr-4">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">{loading ? '...' : awardedPendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-emerald-100 mr-4">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">{loading ? '...' : awardedApprovedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-rose-100 mr-4">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold">{loading ? '...' : awardedRejectedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-indigo-100 mr-4">
              <Shield className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{loading ? '...' : awardedTotalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Barred Claims Stats */}
      <h2 className="text-xl font-semibold mb-4">Time Barred Claims</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-cyan-100 mr-4">
              <Clock className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">{loading ? '...' : timeBarredPendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-teal-100 mr-4">
              <CheckCircle className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">{loading ? '...' : timeBarredApprovedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-pink-100 mr-4">
              <AlertTriangle className="h-6 w-6 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold">{loading ? '...' : timeBarredRejectedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-orange-100 mr-4">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">To Tribunal</p>
              <p className="text-2xl font-bold">{loading ? '...' : timeBarredForwardToTribunalCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-violet-100 mr-4">
              <Calendar className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{loading ? '...' : timeBarredTotalCount}</p>
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

      {/* List Claim Decisions Modal */}
      {showListClaimDecisions && (
        <ListClaimDecisions onClose={() => setShowListClaimDecisions(false)} />
      )}

      {/* List Pending Registered Claims Modal */}
      {showPendingRegisteredClaims && (
        <ListPendingRegisteredClaimsRegistrarReview onClose={() => setShowPendingRegisteredClaims(false)} />
      )}

      {/* List Approved Registered Claims Modal */}
      {showApprovedRegisteredClaims && (
        <ListApprovedRegisteredClaimsRegistrarReview onClose={() => setShowApprovedRegisteredClaims(false)} />
      )}

      {/* List Rejected Registered Claims Modal */}
      {showRejectedRegisteredClaims && (
        <ListRejectedRegisteredClaimsRegistrarReview onClose={() => setShowRejectedRegisteredClaims(false)} />
      )}

      {/* List Pending Awarded Claims Modal */}
      {showPendingAwardedClaims && (
        <ListPendingAwardedClaimsForRegistrarReview onClose={() => setShowPendingAwardedClaims(false)} />
      )}

      {/* List Approved Awarded Claims Modal */}
      {showApprovedAwardedClaims && (
        <ListApprovedAwardedClaimsForRegistrarReview onClose={() => setShowApprovedAwardedClaims(false)} />
      )}

      {/* List Pending Time Barred Forms Modal */}
      {showPendingTimeBarredForms && (
        <ListPendingTimeBarredFormsRegistrarReview onClose={() => setShowPendingTimeBarredForms(false)} />
      )}

      {/* List Approved Time Barred Forms Modal */}
      {showApprovedTimeBarredForms && (
        <ListApprovedTimeBarredFormsRegistrarReview onClose={() => setShowApprovedTimeBarredForms(false)} />
      )}

      {/* List Rejected Time Barred Forms Modal */}
      {showRejectedTimeBarredForms && (
        <ListRejectedTimeBarredFormsRegistrarReview onClose={() => setShowRejectedTimeBarredForms(false)} />
      )}

      {/* List Forward To Tribunal Time Barred Forms Modal */}
      {showForwardToTribunalTimeBarredForms && (
        <ListForwardToTribunalTimeBarredFormsRegistrarReview onClose={() => setShowForwardToTribunalTimeBarredForms(false)} />
      )}
    </div>
  );
};

export default RegistrarDashboard;
