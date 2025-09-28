import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import WorkerRegistrationForm from './WorkerRegistrationForm';
import NewForm11 from './NewForm11';
import ViewForm113 from './ViewForm113';
import NewForm3 from './NewForm3';
import ViewForm3 from './ViewForm3';

interface WorkerSearchFormProps {
  onClose: () => void;
  formType?: 'Form11' | 'Form12' | 'Form3' | 'Form4';
}

interface SearchResult {
  WorkerID: string;
  WorkerFirstName: string;
  WorkerLastName: string;
  existsInForm1112?: boolean;
}

const WorkerSearchForm: React.FC<WorkerSearchFormProps> = ({ onClose, formType = 'Form11' }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showNotFound, setShowNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showForm11, setShowForm11] = useState(false);
  const [showForm12, setShowForm12] = useState(false);
  const [showForm3, setShowForm3] = useState(false);
  const [showForm4, setShowForm4] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowNotFound(false);
    setSearchResults([]);

    if (!firstName && !lastName) {
      setError('Please enter a first name or last name to search');
      return;
    }

    try {
      setLoading(true);

      // Build the query based on provided names
      let query = supabase
        .from('workerpersonaldetails')
        .select('WorkerID, WorkerFirstName, WorkerLastName');

      if (firstName && lastName) {
        // If both names provided, use AND condition
        query = query
          .ilike('WorkerFirstName', `%${firstName}%`)
          .ilike('WorkerLastName', `%${lastName}%`);
      } else if (firstName) {
        // Only first name provided
        query = query.ilike('WorkerFirstName', `%${firstName}%`);
      } else if (lastName) {
        // Only last name provided
        query = query.ilike('WorkerLastName', `%${lastName}%`);
      }

      const { data: workerData, error: workerError } = await query;

      if (workerError) throw workerError;

      if (!workerData || workerData.length === 0) {
        setShowNotFound(true);
        return;
      }

      // Check which WorkerIDs exist in form1112master
      const { data: form1112Data, error: form1112Error } = await supabase
        .from('form1112master')
        .select('WorkerID')
        .in('WorkerID', workerData.map(w => w.WorkerID));

      if (form1112Error) throw form1112Error;

      // Create Set of WorkerIDs that exist in form1112master
      const existingWorkerIds = new Set(form1112Data?.map(f => f.WorkerID) || []);

      // Combine the data
      const results = workerData.map(worker => ({
        ...worker,
        existsInForm1112: existingWorkerIds.has(worker.WorkerID)
      }));

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching for worker:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };
console.log('formType:',formType);
  const handleAction = (worker: SearchResult) => {
    if (worker.existsInForm1112) {
      // View worker details - WorkerID exists in form1112master
      console.log('Viewing worker details:', worker);
      // TODO: Implement view functionality
    } else {
      // Proceed with form creation - WorkerID does not exist in form1112master
      setSelectedWorkerId(worker.WorkerID);
      
      if (formType === 'Form11') {
        setShowForm11(true);
      } else if (formType === 'Form12') {
        setShowForm12(true);
      } else if (formType === 'Form3') {
        setShowForm3(true);
      } else if (formType === 'Form4') {
        setShowForm4(true);
      }
    }
  };

  if (showForm11 && selectedWorkerId) {
    return <NewForm11 workerId={selectedWorkerId} onClose={() => {
      setShowForm11(false);
      setSelectedWorkerId(null);
      onClose();
    }} />;
  }

  if (showForm12 && selectedWorkerId) {
    return <NewForm12 workerId={selectedWorkerId} onClose={() => {
      setShowForm12(false);
      setSelectedWorkerId(null);
      onClose();
    }} />;
  }

  if (showForm3 && selectedWorkerId) {
    return <NewForm3 workerId={selectedWorkerId} onClose={() => {
      setShowForm3(false);
      setSelectedWorkerId(null);
      onClose();
    }} />;
  }

  if (showForm4 && selectedWorkerId) {
    return <NewForm4 workerId={selectedWorkerId} onClose={() => {
      setShowForm4(false);
      setSelectedWorkerId(null);
      onClose();
    }} />;
  }

  if (showRegistrationForm) {
    return <WorkerRegistrationForm onClose={() => setShowRegistrationForm(false)} />;
  }

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Search Worker</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                placeholder="Enter first name"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </form>

        {/* Search Results */}
        <div className="mt-6 max-h-[400px] overflow-y-auto">
          {searchResults.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      First Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Worker ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((worker) => (
                    <tr key={worker.WorkerID} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.WorkerFirstName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.WorkerLastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {worker.WorkerID}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleAction(worker)}
                          className={`font-medium text-sm ${
                            worker.existsInForm1112
                              ? 'text-primary hover:text-primary-dark' 
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {worker.existsInForm1112 ? 'View' : 'Proceed'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showNotFound && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No workers found matching your search criteria.</p>
              <button
                onClick={() => setShowRegistrationForm(true)}
                className="btn btn-primary"
              >
                Register New Worker
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerSearchForm;
