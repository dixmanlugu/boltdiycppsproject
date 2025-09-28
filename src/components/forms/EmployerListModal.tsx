import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface EmployerListModalProps {
  onClose: () => void;
  onSelectEmployer: (employer: EmployerData) => void;
}

interface EmployerData {
  EMID: string;
  CPPSID: string;
  OrganizationName: string;
  Address1: string;
  Address2: string;
  City: string;
  Province: string;
  POBox: string;
  MobilePhone: string;
  LandLine: string;
  InsuranceProviderIPACode: string;
}

interface InsuranceProvider {
  IPACODE: string;
  InsuranceCompanyOrganizationName: string;
  InsuranceCompanyAddress1: string;
  InsuranceCompanyAddress2: string;
  InsuranceCompanyCity: string;
  InsuranceCompanyProvince: string;
  InsuranceCompanyPOBox: string;
  InsuranceCompanyLandLine: string;
}

const EmployerListModal: React.FC<EmployerListModalProps> = ({ onClose, onSelectEmployer }) => {
  const [employers, setEmployers] = useState<EmployerData[]>([]);
  const [filteredEmployers, setFilteredEmployers] = useState<EmployerData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployers();
  }, []);

  useEffect(() => {
    filterEmployers();
  }, [searchTerm, employers]);

  const fetchEmployers = async () => {
    try {
      setLoading(true);
      
      const { data: employerData, error: employerError } = await supabase
        .from('employermaster')
        .select('*')
        .order('OrganizationName');

      if (employerError) throw employerError;

      setEmployers(employerData || []);
    } catch (err: any) {
      console.error('Error fetching employers:', err);
      setError(err.message || 'Failed to load employers');
    } finally {
      setLoading(false);
    }
  };

  const filterEmployers = () => {
    if (!searchTerm) {
      setFilteredEmployers(employers);
      return;
    }

    const filtered = employers.filter(employer =>
      employer.OrganizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employer.CPPSID?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredEmployers(filtered);
  };

  const handleSelectEmployer = async (employer: EmployerData) => {
    try {
      // Fetch insurance provider details if available
      let insuranceProvider: InsuranceProvider | null = null;
      
      if (employer.InsuranceProviderIPACode) {
        const { data: insuranceData, error: insuranceError } = await supabase
          .from('insurancecompanymaster')
          .select('*')
          .eq('IPACODE', employer.InsuranceProviderIPACode)
          .single();

        if (!insuranceError && insuranceData) {
          insuranceProvider = insuranceData;
        }
      }

      // Pass employer data with insurance details to parent
      onSelectEmployer({
        ...employer,
        insuranceProvider
      } as any);
    } catch (err) {
      console.error('Error fetching insurance details:', err);
      // Still select employer even if insurance fetch fails
      onSelectEmployer(employer);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">Select Employer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by organization name or CPPSID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPPSID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      City
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Province
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEmployers.length > 0 ? (
                    filteredEmployers.map((employer) => (
                      <tr key={employer.EMID} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employer.CPPSID || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employer.OrganizationName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employer.City || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employer.Province || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleSelectEmployer(employer)}
                            className="text-sm font-medium bg-primary hover:bg-primary-dark text-white px-3 py-1 rounded"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        {searchTerm ? 'No employers found matching your search.' : 'No employers available.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerListModal;
