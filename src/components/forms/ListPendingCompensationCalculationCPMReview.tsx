import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface ListPendingCompensationCalculationCPMReviewProps {
  onClose: () => void;
  onSelectIRN?: (irn: string, incidentType: string) => void;
}

interface CPMReviewData {
  IRN: string;
  DisplayIRN: string;
  WorkerFirstName: string;
  WorkerLastName: string;
  SubmissionDate: string;
  IncidentType: string;
  CPMRID: string;
  CPMRStatus: string;
  IncidentRegion: string;
}

const ListPendingCompensationCalculationCPMReview: React.FC<ListPendingCompensationCalculationCPMReviewProps> = ({ 
  onClose,
  onSelectIRN 
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpmReviewList, setCPMReviewList] = useState<CPMReviewData[]>([]);
  const [searchIRN, setSearchIRN] = useState('');
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recordsPerPage] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [userRegion, setUserRegion] = useState<string | null>(null);

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
        setError('Failed to fetch region information. Please try again later.');
        // Default to a region for testing/development
        setUserRegion('Momase Region');
      }
    };
    
    fetchUserRegion();
  }, [profile]);

  useEffect(() => {
    if (userRegion) {
      fetchCPMReviewList();
    }
  }, [userRegion, currentPage, searchIRN, searchFirstName, searchLastName]);

  const fetchCPMReviewList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userRegion) {
        setError('Please wait while we load your region information.');
        return;
      }
      
      // Get the count of matching records
      let countQuery = supabase
        .from('compensation_calculation_cpm_pending_view')
        .select('*', { count: 'exact', head: true })
        .eq('IncidentRegion', userRegion);

      // Apply search filters if provided
      if (searchIRN) {
        countQuery = countQuery.ilike('DisplayIRN', `%${searchIRN}%`);
      }
      
      if (searchFirstName) {
        countQuery = countQuery.ilike('WorkerFirstName', `%${searchFirstName}%`);
      }
      
      if (searchLastName) {
        countQuery = countQuery.ilike('WorkerLastName', `%${searchLastName}%`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      
      const totalCount = count || 0;
      setTotalRecords(totalCount);
      setTotalPages(Math.ceil(totalCount / recordsPerPage));
      
      // Calculate pagination
      const start = (currentPage - 1) * recordsPerPage;
      
      // Execute the SQL query to get the data
      let query = supabase
        .from('compensation_calculation_cpm_pending_view')
        .select('*')
        .eq('IncidentRegion', userRegion)
        .range(start, start + recordsPerPage - 1)
        .order('SubmissionDate', { ascending: false });

      // Apply search filters if provided
      if (searchIRN) {
        query = query.ilike('DisplayIRN', `%${searchIRN}%`);
      }
      
      if (searchFirstName) {
        query = query.ilike('WorkerFirstName', `%${searchFirstName}%`);
      }
      
      if (searchLastName) {
        query = query.ilike('WorkerLastName', `%${searchLastName}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setCPMReviewList([]);
        return;
      }

      // Use the data directly from the view
      setCPMReviewList(data);
    } catch (err: any) {
      console.error('Error fetching CPM review list:', err);
      setError(err.message || 'Failed to load CPM review list');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchCPMReviewList();
  };

  const handleView = (irn: string, incidentType: string) => {
    if (onSelectIRN) {
      onSelectIRN(irn, incidentType);
    } else {
      let url = '';
      
      // Determine the correct URL based on incident type
      switch (incidentType) {
        case 'Injury':
          url = '/dashboard/cpmreview/injury-view';
          break;
        case 'Death':
          url = '/dashboard/cpmreview/death-view';
          break;
        default:
          url = '/dashboard/cpmreview/view';
      }
      
      if (url) {
        window.location.href = `${url}?IRN=${irn}`;
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            Pending Compensation Calculation CPM Review
            {userRegion && <span className="text-sm font-normal ml-2 text-gray-600">({userRegion})</span>}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="searchIRN" className="block text-sm font-medium text-gray-700 mb-1">
                  Search by Display IRN
                </label>
                <input
                  type="text"
                  id="searchIRN"
                  value={searchIRN}
                  onChange={(e) => setSearchIRN(e.target.value)}
                  className="input"
                  placeholder="Enter Display IRN"
                />
              </div>
              
              <div>
                <label htmlFor="searchFirstName" className="block text-sm font-medium text-gray-700 mb-1">
                  Search by First Name
                </label>
                <input
                  type="text"
                  id="searchFirstName"
                  value={searchFirstName}
                  onChange={(e) => setSearchFirstName(e.target.value)}
                  className="input"
                  placeholder="Enter First Name"
                />
              </div>
              
              <div>
                <label htmlFor="searchLastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Search by Last Name
                </label>
                <input
                  type="text"
                  id="searchLastName"
                  value={searchLastName}
                  onChange={(e) => setSearchLastName(e.target.value)}
                  className="input"
                  placeholder="Enter Last Name"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-primary flex items-center"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </button>
            </div>
          </form>

          <hr className="mb-6" />

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Total Records Found: {totalRecords} | 
              Total Pages: {totalPages}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : cpmReviewList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      CRN
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      First Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Last Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Submission Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Incident Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cpmReviewList.map((review, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
                        {review.DisplayIRN}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                        {review.WorkerFirstName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                        {review.WorkerLastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                        {review.SubmissionDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
                        {review.IncidentType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap border border-gray-300">
                        <button
                          onClick={() => handleView(review.IRN, review.IncidentType)}
                          className="text-sm font-medium bg-primary hover:bg-primary-dark text-white px-3 py-1 rounded"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No CPM Pending Claims.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="flex space-x-2">
                {currentPage > 1 && (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      Previous
                    </button>
                  </>
                )}
                
                {currentPage < totalPages && (
                  <>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      Last
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListPendingCompensationCalculationCPMReview;
