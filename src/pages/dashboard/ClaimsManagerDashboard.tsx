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
import CompensationCalculation from '../../components/forms/CompensationCalculation';
import ListPendingRegisteredClaimsCPOReview from '../../components/forms/ListPendingRegisteredClaimsCPOReview';
import ListPendingCompensationCalculationCPMReview from '../../components/forms/ListPendingCompensationCalculationCPMReview';
import ListApprovedCompensationCalculationCPMReview from '../../components/forms/ListApprovedCompensationCalculationCPMReview';
import ListRejectedCompensationCalculationCPMReview from '../../components/forms/ListRejectedCompensationCalculationCPMReview';
import ListForm6NotificationEmployerResponsePending from '../../components/forms/ListForm6NotificationEmployerResponsePending';
import ListForm18EmployerAccepted from '../../components/forms/ListForm18EmployerAccepted';
import ListForm18WorkerResponse from '../../components/forms/ListForm18WorkerResponse';
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

const ClaimsManagerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCompensationCalculation, setShowCompensationCalculation] = useState(false);
  const [showPendingClaimsList, setShowPendingClaimsList] = useState(false);
  const [showPendingCPMReviewList, setShowPendingCPMReviewList] = useState(false);
  const [showApprovedCPMReviewList, setShowApprovedCPMReviewList] = useState(false);
  const [showRejectedCPMReviewList, setShowRejectedCPMReviewList] = useState(false);
  const [showForm6PendingList, setShowForm6PendingList] = useState(false);
  const [showForm18EmployerAcceptedList, setShowForm18EmployerAcceptedList] = useState(false);
  const [showForm18WorkerResponseList, setShowForm18WorkerResponseList] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  
  // State for counts
  const [cpmPendingCount, setCPMPendingCount] = useState<number>(0);
  const [cpmApprovedCount, setCPMApprovedCount] = useState<number>(0);
  const [cpmRejectedCount, setCPMRejectedCount] = useState<number>(0);
  const [cpmTotalCount, setCPMTotalCount] = useState<number>(0);
  const [calculationPendingCount, setCalculationPendingCount] = useState<number>(0);
  const [form6PendingCount, setForm6PendingCount] = useState<number>(0);
  const [form18EmployerAcceptedCount, setForm18EmployerAcceptedCount] = useState<number>(0);
  const [form18WorkerResponseCount, setForm18WorkerResponseCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  
  // State for charts
  const [cpmYearlyChartData, setCPMYearlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  const [cpmMonthlyChartData, setCPMMonthlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  
  const [claimsYearlyChartData, setClaimsYearlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  const [claimsMonthlyChartData, setClaimsMonthlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });

const menuItems: Record<string, { items: string[] }> = {
  'Compensation Calculation Review': { items: ['Pending', 'Approved', 'Rejected'] },
  Claims: { items: ['Calculation Pending', 'Form6 Response Pending'] },
  Form18: { items: ['Employer Accepted', 'Worker Response'] },
};


  useEffect(() => {
    const fetchUserRegion = async () => {
      try {
        if (!profile?.id) {
          console.warn('No profile ID available');
          return;
        }
        
        const { data, error } = await supabase
          .from('owcstaffmaster')
          .select('InchargeRegion')
          .eq('cppsid', profile.id)
          .maybeSingle();
        
        if (error) {
          console.error('Database error:', error);
          throw error;
        }
        
        if (data) {
          setUserRegion(data.InchargeRegion);
        } else {
          console.warn('No region found for user:', profile.id);
          // Default to a region for testing/development
          setUserRegion('Momase Region');
        }
      } catch (err) {
        console.error('Error fetching user region:', err);
        // Default to a region for testing/development
        setUserRegion('Momase Region');
      }
    };
    
    fetchUserRegion();
  }, [profile]);

  useEffect(() => {
    if (userRegion) {
      fetchCounts();
      generateChartData();
      
      // Set up interval to refresh counts every 30 seconds
      const interval = setInterval(() => {
        fetchCounts();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [userRegion]);

  const fetchCounts = async () => {
    try {
      setLoading(true);
      
      if (!userRegion) {
        return;
      }
      
      // Get form1112master IRNs for the user's region
      const { data: form1112Data, error: form1112Error } = await supabase
        .from('form1112master')
        .select('IRN')
        .eq('IncidentRegion', userRegion);

      if (form1112Error) throw form1112Error;
      
      if (!form1112Data || form1112Data.length === 0) {
        setCPMPendingCount(0);
        setCPMApprovedCount(0);
        setCPMRejectedCount(0);
        setCPMTotalCount(0);
        setCalculationPendingCount(0);
        setForm6PendingCount(0);
        setForm18EmployerAcceptedCount(0);
        setForm18WorkerResponseCount(0);
        return;
      }
      
      const regionIRNs = form1112Data.map(item => item.IRN);
      
      // Fetch CPM pending count
      const { count: cpmPendingCount, error: cpmPendingError } = await supabase
        .from('compensationcalculationcpmreview')
        .select('*', { count: 'exact', head: true })
        .eq('CPMRStatus', 'Pending')
        .in('IRN', regionIRNs);
      
      if (cpmPendingError) throw cpmPendingError;
      
      // Fetch CPM approved count
      const { count: cpmApprovedCount, error: cpmApprovedError } = await supabase
        .from('compensationcalculationcpmreview')
        .select('*', { count: 'exact', head: true })
        .eq('CPMRStatus', 'Accepted')
        .in('IRN', regionIRNs);
      
      if (cpmApprovedError) throw cpmApprovedError;
      
      // Fetch CPM rejected count
      const { count: cpmRejectedCount, error: cpmRejectedError } = await supabase
        .from('compensationcalculationcpmreview')
        .select('*', { count: 'exact', head: true })
        .eq('CPMRStatus', 'Rejected')
        .in('IRN', regionIRNs);
      
      if (cpmRejectedError) throw cpmRejectedError;
      
      // Fetch CPM total count
      const { count: cpmTotalCount, error: cpmTotalError } = await supabase
        .from('compensationcalculationcpmreview')
        .select('*', { count: 'exact', head: true })
        .in('IRN', regionIRNs);
      
      if (cpmTotalError) throw cpmTotalError;
      
      // Fetch calculation pending count
      const { count: calculationPendingCount, error: calculationPendingError } = await supabase
        .from('approvedclaimscporeview')
        .select('*', { count: 'exact', head: true })
        .neq('CPORStatus', 'CompensationCalculated')
        .in('IRN', regionIRNs);
      
      if (calculationPendingError) throw calculationPendingError;
      
      // Fetch form6 pending count
      const { count: form6PendingCount, error: form6PendingError } = await supabase
        .from('form6master')
        .select('*', { count: 'exact', head: true })
        .eq('F6MStatus', 'Pending')
        .in('IRN', regionIRNs);
      
      if (form6PendingError) throw form6PendingError;
      
      // Fetch form18 employer accepted count
      const { count: form18EmployerAcceptedCount, error: form18EmployerAcceptedError } = await supabase
        .from('form18master')
        .select('*', { count: 'exact', head: true })
        .eq('F18MStatus', 'EmployerAccepted')
        .in('IRN', regionIRNs);
      
      if (form18EmployerAcceptedError) throw form18EmployerAcceptedError;
      
      // Fetch form18 worker response count
      const { count: form18WorkerResponseCount, error: form18WorkerResponseError } = await supabase
        .from('form18master')
        .select('*', { count: 'exact', head: true })
        .neq('F18MStatus', 'EmployerAccepted')
        .in('IRN', regionIRNs);
      
      if (form18WorkerResponseError) throw form18WorkerResponseError;
      
      setCPMPendingCount(cpmPendingCount || 0);
      setCPMApprovedCount(cpmApprovedCount || 0);
      setCPMRejectedCount(cpmRejectedCount || 0);
      setCPMTotalCount(cpmTotalCount || 0);
      setCalculationPendingCount(calculationPendingCount || 0);
      setForm6PendingCount(form6PendingCount || 0);
      setForm18EmployerAcceptedCount(form18EmployerAcceptedCount || 0);
      setForm18WorkerResponseCount(form18WorkerResponseCount || 0);
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
    
    // CPM Yearly Data
    const cpmYearlyData = {
      labels: years,
      datasets: [
        {
          label: 'Pending Reviews',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
        {
          label: 'Approved Reviews',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
        {
          label: 'Rejected Reviews',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
      ]
    };
    
    setCPMYearlyChartData(cpmYearlyData);
    
    // Claims Yearly Data
    const claimsYearlyData = {
      labels: years,
      datasets: [
        {
          label: 'Calculation Pending',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
        },
        {
          label: 'Form6 Pending',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
        },
        {
          label: 'Form18 Responses',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: 'rgba(255, 205, 86, 0.5)',
        }
      ]
    };
    
    setClaimsYearlyChartData(claimsYearlyData);
    
    // Monthly data (current year)
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    // CPM Monthly Data
    const cpmMonthlyData = {
      labels: months,
      datasets: [
        {
          label: 'Pending Reviews',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
        {
          label: 'Approved Reviews',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
        {
          label: 'Rejected Reviews',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
      ]
    };
    
    setCPMMonthlyChartData(cpmMonthlyData);
    
    // Claims Monthly Data
    const claimsMonthlyData = {
      labels: months,
      datasets: [
        {
          label: 'Calculation Pending',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.5)',
        },
        {
          label: 'Form6 Pending',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.5)',
        },
        {
          label: 'Form18 Responses',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
          borderColor: 'rgb(255, 205, 86)',
          backgroundColor: 'rgba(255, 205, 86, 0.5)',
        }
      ]
    };
    
    setClaimsMonthlyChartData(claimsMonthlyData);
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

const handleMenuItemClick = (menu: string, item: string) => {
  if (menu === 'Compensation Calculation Review' && item === 'Pending') {
    setShowPendingCPMReviewList(true);
  } else if (menu === 'Compensation Calculation Review' && item === 'Approved') {
    setShowApprovedCPMReviewList(true);
  } else if (menu === 'Compensation Calculation Review' && item === 'Rejected') {
    setShowRejectedCPMReviewList(true);
  } else if (menu === 'Claims' && item === 'Calculation Pending') {
    setShowPendingClaimsList(true);
  } else if (menu === 'Claims' && item === 'Form6 Response Pending') {
    setShowForm6PendingList(true);
  } else if (menu === 'Form18' && item === 'Employer Accepted') {
    setShowForm18EmployerAcceptedList(true);
  } else if (menu === 'Form18' && item === 'Worker Response') {
    setShowForm18WorkerResponseList(true);
  }

  setActiveMenu(null);
};


  const handleWorkerSelect = (workerId: string) => {
    setSelectedWorkerId(workerId);
    setShowCompensationCalculation(true);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Claims Manager Dashboard</h1>
        <p className="text-gray-600">Welcome back, {profile?.full_name || 'Claims Manager'}</p>
        {userRegion && <p className="text-sm text-gray-500">Region: {userRegion}</p>}
				<GoToReportsButton />
      </div>

      {/* Navigation Menu */}
{/* Navigation Menu (mirrors Provincial) */}
<div className="mb-8 bg-white rounded-lg shadow">
  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Object.entries(menuItems).map(([menu, { items }]) => (
      <div key={menu} className="relative">
        <button
          onClick={() => toggleMenu(menu)}
          className="w-full flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
        >
          <span className="font-medium">{menu}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${activeMenu === menu ? 'rotate-180' : ''}`}
          />
        </button>
        {activeMenu === menu && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
            {(items.length ? items : ['View All']).map((item) => (
              <button
                key={item}
                onClick={() => handleMenuItemClick(menu, item === 'View All' ? '' : item)}
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


      {/* Compensation Calculation Review Stats */}
      <h2 className="text-xl font-semibold mb-4">Compensation Calculation Review</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-blue-100 mr-4">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">{loading ? '...' : cpmPendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-green-100 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold">{loading ? '...' : cpmApprovedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-red-100 mr-4">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold">{loading ? '...' : cpmRejectedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-purple-100 mr-4">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{loading ? '...' : cpmTotalCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compensation Calculation Review Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">CPM Reviews by Year</h2>
          <div className="h-64">
            <Line 
              data={cpmYearlyChartData} 
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
          <h2 className="text-xl font-semibold mb-4">CPM Reviews by Month (Current Year)</h2>
          <div className="h-64">
            <Line 
              data={cpmMonthlyChartData} 
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

      {/* Claims Stats */}
      <h2 className="text-xl font-semibold mb-4">Claims</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-amber-100 mr-4">
              <FileText className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Calculation Pending</p>
              <p className="text-2xl font-bold">{loading ? '...' : calculationPendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-indigo-100 mr-4">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Form6 Response Pending</p>
              <p className="text-2xl font-bold">{loading ? '...' : form6PendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Claims Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Claims by Year</h2>
          <div className="h-64">
            <Line 
              data={claimsYearlyChartData} 
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
              data={claimsMonthlyChartData} 
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

      {/* Form18 Stats */}
      <h2 className="text-xl font-semibold mb-4">Form18</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-teal-100 mr-4">
              <FileText className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Employer Accepted</p>
              <p className="text-2xl font-bold">{loading ? '...' : form18EmployerAcceptedCount}</p>
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md">
          <div className="flex items-center">
            <div className="rounded-full p-3 bg-rose-100 mr-4">
              <Users className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Worker Response</p>
              <p className="text-2xl font-bold">{loading ? '...' : form18WorkerResponseCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Claims</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Claim #{2023450 + index}</p>
                  <p className="text-sm text-gray-500">Submitted on {new Date().toLocaleDateString()}</p>
                </div>
                <button 
                  className="btn btn-primary text-sm"
                  onClick={() => setShowCompensationCalculation(true)}
                >
                  Process
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Team Performance</h2>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Claims Processing Rate</span>
                <span className="text-sm text-green-600">92%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Documentation Accuracy</span>
                <span className="text-sm text-green-600">95%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '95%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Response Time</span>
                <span className="text-sm text-amber-600">85%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-amber-500 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Client Satisfaction</span>
                <span className="text-sm text-green-600">88%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button className="btn btn-primary w-full">View Detailed Reports</button>
          </div>
        </div>
      </div>

      {/* Compensation Calculation Modal */}
      {showCompensationCalculation && (
        <CompensationCalculation 
          irn={selectedWorkerId || undefined}
          onClose={() => {
            setShowCompensationCalculation(false);
            setSelectedWorkerId(null);
          }} 
        />
      )}

      {/* Pending Claims List Modal */}
      {showPendingClaimsList && (
        <ListPendingRegisteredClaimsCPOReview 
          onClose={() => setShowPendingClaimsList(false)}
          onSelectWorker={handleWorkerSelect}
        />
      )}

      {/* Form6 Pending List Modal */}
      {showForm6PendingList && (
        <ListForm6NotificationEmployerResponsePending 
          onClose={() => setShowForm6PendingList(false)}
        />
      )}

      {/* Form18 Employer Accepted List Modal */}
      {showForm18EmployerAcceptedList && (
        <ListForm18EmployerAccepted 
          onClose={() => setShowForm18EmployerAcceptedList(false)}
        />
      )}

      {/* Form18 Worker Response List Modal */}
      {showForm18WorkerResponseList && (
        <ListForm18WorkerResponse 
          onClose={() => setShowForm18WorkerResponseList(false)}
        />
      )}

      {/* Pending CPM Review List Modal */}
      {showPendingCPMReviewList && (
        <ListPendingCompensationCalculationCPMReview 
          onClose={() => setShowPendingCPMReviewList(false)}
        />
      )}

      {/* Approved CPM Review List Modal */}
      {showApprovedCPMReviewList && (
        <ListApprovedCompensationCalculationCPMReview 
          onClose={() => setShowApprovedCPMReviewList(false)}
        />
      )}

      {/* Rejected CPM Review List Modal */}
      {showRejectedCPMReviewList && (
        <ListRejectedCompensationCalculationCPMReview 
          onClose={() => setShowRejectedCPMReviewList(false)}
        />
      )}
    </div>
  );
};

export default ClaimsManagerDashboard;
