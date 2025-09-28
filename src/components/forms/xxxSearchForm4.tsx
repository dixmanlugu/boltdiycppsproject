import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../services/supabase';
import NewForm4 from './NewForm4';
import Form124View from './Form124View';
import ViewForm4 from './ViewForm4';
//import EditForm4 from './EditForm4';

interface SearchForm4Props {
  onClose: () => void;
  onSelectIRN?: (irn: string) => void;
  formType?: 'new' | 'view' | 'edit' | 'death-case';
}

interface SearchResult {
  IRN: string;
  WorkerID: string;
  workerpersonaldetails: {
    WorkerFirstName: string;
    WorkerLastName: string;
  };
  hasForm4?: boolean;
}

const SearchForm4: React.FC<SearchForm4Props> = ({ 
  onClose, 
  onSelectIRN,
  formType = 'new'
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showNotFound, setShowNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm4, setShowNewForm4] = useState(false);
  const [showViewForm4, setShowViewForm4] = useState(false);
  const [showViewForm4Component, setShowViewForm4Component] = useState(false);
  const [showEditForm4, setShowEditForm4] = useState(false);
  const [selectedIRN, setSelectedIRN] = useState<string | null>(null);

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
        .from('form1112master')
        .select(`
          IRN,
          WorkerID,
          workerpersonaldetails!inner(
            WorkerFirstName,
            WorkerLastName
          )
        `);

      if (firstName && lastName) {
        query = query
          .ilike('workerpersonaldetails.WorkerFirstName', `%${firstName}%`)
          .ilike('workerpersonaldetails.WorkerLastName', `%${lastName}%`);
      } else if (firstName) {
        query = query.ilike('workerpersonaldetails.WorkerFirstName', `%${firstName}%`);
      } else if (lastName) {
        query = query.ilike('workerpersonaldetails.WorkerLastName', `%${lastName}%`);
      }

      const { data, error: searchError } = await query;

      if (searchError) throw searchError;

      if (!data || data.length === 0) {
        setShowNotFound(true);
        return;
      }

      // If formType is 'new', 'view', or 'edit', check form4master for existing Form4 records
      if (formType === 'new' || formType === 'view' || formType === 'edit') {
        const workerIds = data.map(item => item.WorkerID);
        
        const { data: form4Data, error: form4Error } = await supabase
          .from('form4master')
          .select('WorkerID, IRN')
          .in('WorkerID', workerIds);

        if (form4Error) throw form4Error;

        // Create Set of WorkerIDs that have Form4 records
        const form4WorkerIds = new Set(form4Data?.map(f => f.WorkerID) || []);

        // Add hasForm4 flag to results
        const resultsWithForm4Check = data.map(item => ({
          ...item,
          hasForm4: form4WorkerIds.has(item.WorkerID)
        }));

        setSearchResults(resultsWithForm4Check);
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Error searching for workers:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setFirstName('');
    setLastName('');
    setSearchResults([]);
    setShowNotFound(false);
    setError(null);
    setCurrentPage(1);
  };

  const handleAction = (result: SearchResult) => {
    const irn = result.IRN;
    
    if (formType === 'new') {
      if (result.hasForm4) {
        // WorkerID exists in both form1112master and form4master - View
        setSelectedIRN(irn);
        setShowViewForm4Component(true);
      } else {
        // WorkerID exists in form1112master but not in form4master - New
        setSelectedIRN(irn);
        setShowNewForm4(true);
      }
    } else if (formType === 'view') {
      if (result.hasForm4) {
        // WorkerID exists in both form1112master and form4master - View
        setSelectedIRN(irn);
        setShowViewForm4Component(true);
      }
      // If no Form4 exists, do nothing or show message
    } else if (formType === 'edit') {
      if (result.hasForm4) {
        // WorkerID exists in both form1112master and form4master - Edit
        setSelectedIRN(irn);
        setShowEditForm4(true);
      }
      // If no Form4 exists, do nothing or show message
    } else {
      // For other formTypes (like 'death-case'), use existing logic
      setSelectedIRN(irn);
      setShowViewForm4(true);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = searchResults.slice(startIndex, endIndex);

  if (showNewForm4 && selectedIRN) {
    return (
      <NewForm4 
        irn={selectedIRN} 
        onClose={() => {
          setShowNewForm4(false);
          setSelectedIRN(null);
          onClose();
        }} 
      />
    );
  }

  if (showViewForm4 && selectedIRN) {
    return (
      <Form124View 
        irn={selectedIRN} 
        onClose={() => {
          setShowViewForm4(false);
          setSelectedIRN(null);
          onClose();
        }} 
      />
    );
  }

  if (showViewForm4Component && selectedIRN) {
    return (
      <ViewForm4 
        irn={selectedIRN} 
        onClose={() => {
          setShowViewForm4Component(false);
          setSelectedIRN(null);
          onClose();
        }} 
      />
    );
  }

  if (showEditForm4 && selectedIRN) {
    return (
      <EditForm4 
        irn={selectedIRN} 
        onClose={() => {
          setShowEditForm4(false);
          setSelectedIRN(null);
          onClose();
        }} 
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          Search Workers - Form 4 ({formType === 'new' ? 'New' : formType === 'view' ? 'View' : formType === 'edit' ? 'Edit' : 'Death Case'})
        </h2>
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

          <div className="flex justify-between">
            <button
              type="button"
              onClick={clearSearch}
              className="btn btn-secondary"
            >
              Clear
            </button>
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
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Search Results */}
        <div className="mt-6">
          {searchResults.length > 0 && (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IRN
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Worker ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          First Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentResults.map((result) => (
                        <tr key={result.IRN} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.IRN}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.WorkerID}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.workerpersonaldetails.WorkerFirstName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.workerpersonaldetails.WorkerLastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleAction(result)}
                              className={`font-medium text-sm ${
                                (formType === 'view' || formType === 'edit') && !result.hasForm4
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-primary hover:text-primary-dark'
                              }`}
                              disabled={(formType === 'view' || formType === 'edit') && !result.hasForm4}
                            >
                              {formType === 'new' 
                                ? (result.hasForm4 ? 'View' : 'New')
                                : formType === 'edit' 
                                  ? (result.hasForm4 ? 'Edit' : 'No Form4')
                                  : (result.hasForm4 ? 'View' : 'No Form4')
                              }
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, searchResults.length)} of {searchResults.length} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {showNotFound && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                No workers found matching your search criteria.
              </p>
              <p className="text-sm text-gray-500">
                Try adjusting your search terms or check if the worker is registered in Form 11/12.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchForm4;
