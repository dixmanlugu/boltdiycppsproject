// /src/pages/dashboard/CommissionerDashboard.tsx
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

// ✅ Use the SAME list components as Chief Commissioner
import ListPendingClaimsForChiefCommissionerReview from '../../components/forms/ListPendingClaimsForChiefCommissionerReview';
import ListApproveClaimsForCommissionerReview from '../../components/forms/ListApprovedClaimsForCommissionerReview';

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

  // Keep friendly defaults; title already says "Commissioner"
  const [userFullName, setUserFullName] = useState<string>(profile?.full_name || 'Commissioner');
  const [userStaffID, setUserStaffID] = useState<string>('1000');

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showPendingClaimsList, setShowPendingClaimsList] = useState(false);
  const [showApprovedClaimsList, setShowApprovedClaimsList] = useState(false);

  // Counts
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Charts
  const [yearlyChartData, setYearlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });
  const [monthlyChartData, setMonthlyChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: []
  });

  // ✅ Match Chief dashboard menu wording
  const menuItems = {
    'Awarded Claim Review': {
      items: ['Pending', 'Approved']
    }
  };

  useEffect(() => {
    fetchCounts();
    generateChartData();

    const interval = setInterval(() => {
      fetchCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchCounts = async () => {
    try {
      setLoading(true);

      // Keep using the Commissioner-specific views for counts
      const { count: pendingCnt, error: pendingErr } = await supabase
        .from('commissioner_pending_view')
        .select('*', { count: 'exact', head: true });
      if (pendingErr) throw pendingErr;

      const { count: approvedCnt, error: approvedErr } = await supabase
        .from('commissioner_approved_view')
        .select('*', { count: 'exact', head: true });
      if (approvedErr) throw approvedErr;

      setPendingCount(pendingCnt || 0);
      setApprovedCount(approvedCnt || 0);
    } catch (error) {
      console.error('Error fetching counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!profile?.id) {
          setUserFullName('Commissioner');
          setUserStaffID('1000');
          return;
        }
        const { data, error } = await supabase
          .from('owcstaffmaster')
          .select('OSMFirstName, OSMFirstName, OSMStaffID, OSMLastName')
          .eq('cppsid', profile.id)
          .maybeSingle();

        if (error) throw error;

        const fullName =
          data ? `${data.OSMFirstName} ${data.OSMLastName}` : (profile.full_name || 'Commissioner');
        const staffId = data?.OSMStaffID ? String(data.OSMStaffID) : '1000';

        setUserFullName(fullName);
        setUserStaffID(staffId);
      } catch (e) {
        console.error('Failed to load user profile for dashboard header:', e);
        setUserFullName(profile?.full_name || 'Commissioner');
        setUserStaffID('1000');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateChartData = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString());

    const yearlyData = {
      labels: years,
      datasets: [
        {
          label: 'Pending Claims',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
        },
        {
          label: 'Approved Claims',
          data: years.map(() => Math.floor(Math.random() * 100) + 10),
        }
      ]
    };
    setYearlyChartData(yearlyData);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyData = {
      labels: months,
      datasets: [
        {
          label: 'Pending Claims',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
        },
        {
          label: 'Approved Claims',
          data: months.map(() => Math.floor(Math.random() * 50) + 5),
        }
      ]
    };
    setMonthlyChartData(monthlyData);
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuItemClick = (menu: string, item: string) => {
    if (menu === 'Awarded Claim Review' && item === 'Pending') {
      setShowPendingClaimsList(true);
    } else if (menu === 'Awarded Claim Review' && item === 'Approved') {
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
                  className={`h-4 w-4 transition-transform ${activeMenu === menu ? 'transform rotate-180' : ''}`}
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
                  legend: { position: 'top' as const },
                  title: { display: false },
                },
                scales: { y: { beginAtZero: true } }
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
                  legend: { position: 'top' as const },
                  title: { display: false },
                },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
      </div>

      {/* ⬇️ Use the SAME list modals as Chief Commissioner */}
      {showPendingClaimsList && (
        <ListPendingClaimsForChiefCommissionerReview 
          onClose={() => setShowPendingClaimsList(false)}
        />
      )}

      {showApprovedClaimsList && (
        <ListApproveClaimsForCommissionerReview
          onClose={() => setShowApprovedClaimsList(false)}
        />
      )}
    </div>
  );
};

export default CommissionerDashboard;
