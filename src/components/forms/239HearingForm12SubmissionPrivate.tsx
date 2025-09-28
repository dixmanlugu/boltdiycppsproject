import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import Form124View from './Form124View';
import ListClaimDecisions from './ListClaimDecisions';
import CompensationBreakupDetailsView from './CompensationBreakupDetailsView';
import DocumentStatus from './DocumentStatus';

interface Form239Props {
  irn: string;
  onClose: () => void;
}

const Form239HearingForm12SubmissionPrivate: React.FC<Form239Props> = ({ irn, onClose }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [validIRN, setValidIRN] = useState<number | null>(null);
  const [showDocumentStatus, setShowDocumentStatus] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState<string | null>(null);
  const [settingHearing, setSettingHearing] = useState(false);
  const [hearingMessage, setHearingMessage] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string>(''); // new
  const [hearingDecision, setHearingDecision] = useState({
    decision: '',
    details: '',
    proposedAmount: '',
    confirmedAmount: '',
    actionOfficer: ''
  });

  useEffect(() => {
    const validateIRN = () => {
      const irnNumber = parseInt(irn, 10);
      if (isNaN(irnNumber)) {
        setError('Invalid IRN: must be a number');
        setLoading(false);
        return;
      }
      setValidIRN(irnNumber);
    };

    validateIRN();
  }, [irn]);
console.log('IRN:',validIRN);

 // Fetch user full name from owcstaffmaster
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('owcstaffmaster')
        .select('OSMFirstName, OSMLastName')
        .eq('cppsid', profile.id)
        .maybeSingle();

      if (data) {
        const fullName = `${data.OSMFirstName} ${data.OSMLastName}`;
        setUserFullName(fullName);
        setHearingDecision(prev => ({
          ...prev,
          actionOfficer: fullName
        }));
      } else {
        console.warn('No matching staff profile found. Falling back to profile.full_name');
        const fallback = profile?.full_name || '';
        setUserFullName(fallback);
        setHearingDecision(prev => ({
          ...prev,
          actionOfficer: fallback
        }));
      }

      if (error) {
        console.error('Error fetching user info:', error);
      }
    };

    fetchUserDetails();
  }, [profile?.id]);

  
  useEffect(() => {
    if (validIRN === null) return;

    const fetchFormData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch form1112master data to get worker details
        const { data: form1112Data, error: form1112Error } = await supabase
          .from('form1112master')
          .select('*')
          .eq('IRN', validIRN)
          .eq('IncidentType', 'Death')
          .single();

        if (form1112Error) {
          throw form1112Error;
        }

        // Fetch worker personal details
        const { data: workerData, error: workerError } = await supabase
          .from('workerpersonaldetails')
          .select('*')
          .eq('WorkerID', form1112Data.WorkerID)
          .single();

        if (workerError) {
          throw workerError;
        }

        setFormData({
          ...form1112Data,
          ...workerData
        });

        // Set action officer to current user's name
        if (profile?.full_name) {
          setHearingDecision(prev => ({
            ...prev,
            actionOfficer: profile.full_name || ''
          }));
        }
      } catch (err: any) {
        console.error('Error fetching form data:', err);
        setError(err.message || 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [validIRN, profile?.full_name]);

  const handleSubmitDecision = async () => {
    if (!validIRN) return;

    // Validate required fields
    if (!hearingDecision.decision || !hearingDecision.details) {
      setDecisionMessage('Please fill in all required fields.');
      return;
    }

    try {
      setSubmittingDecision(true);
      setDecisionMessage(null);

      // Update tribunalhearingoutcome table
      const { error: updateError } = await supabase
        .from('tribunalhearingoutcome')
        .update({
          THODecision: hearingDecision.decision,
          THOReason: hearingDecision.details,
          THODOA: new Date().toISOString(),
          THOClaimant: `${formData.WorkerFirstName} ${formData.WorkerLastName}`,
          THOActionOfficer: hearingDecision.actionOfficer,
          THOProposedAmount: hearingDecision.proposedAmount,
          THOConfirmedAmount: hearingDecision.confirmedAmount,
          THOHearingStatus: 'Processed'
        })
        .eq('THOIRN', validIRN);

      if (updateError) {
        throw updateError;
      }

      setDecisionMessage('Decision submitted successfully.');
    } catch (err: any) {
      console.error('Error submitting decision:', err);
      setDecisionMessage(`Failed to submit decision: ${err.message}`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-semibold">Error</h3>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn bg-primary text-white hover:bg-primary-dark">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-700">Loading hearing details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            239 - Tribunal Hearing Timebarred Form 12 Submission
            {formData.DisplayIRN && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                {formData.DisplayIRN}
              </span>
            )}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Section 1: Form 124 - Death Claim Details */}
          <div className="border rounded-lg p-4" id="deathclaims-section">
            <h3 className="text-lg font-semibold mb-4 text-primary">Form 124 - Death Claim Details</h3>
            {validIRN ? (
              <Form124View irn={validIRN.toString()} onClose={onClose} />
            ) : (
              <p className="text-textSecondary">Death claim details cannot be loaded without a valid IRN.</p>
            )}
          </div>

          {/* Section 2: Claim Decisions */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-primary">Claim Decisions</h3>
            {validIRN ? (
              <ListClaimDecisions irn={validIRN} />
            ) : (
              <p className="text-textSecondary">Claim decisions cannot be loaded without a valid IRN.</p>
            )}
          </div>

          {/* Section 3: Compensation Breakup */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-primary">Compensation Breakup</h3>
            {validIRN ? (
              <CompensationBreakupDetailsView 
                IRN={validIRN.toString()} 
                DisplayIRN={formData.DisplayIRN} 
                IncidentType="Death" 
              />
            ) : (
              <p className="text-textSecondary">Compensation data cannot be loaded without a valid IRN.</p>
            )}
          </div>

          {/* Section 4: Document Status */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Document Status</h3>
              <button
                onClick={() => setShowDocumentStatus(true)}
                className="btn bg-primary text-white hover:bg-primary-dark text-sm"
              >
                View Document Status
              </button>
            </div>
            <p className="text-textSecondary">Click the button above to view required and submitted documents for this claim.</p>
          </div>

          {/* Section 5: Hearing Decision */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-primary">Hearing Decision</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="decision" className="block text-sm font-medium text-gray-700 mb-1">
                  Decision <span className="text-red-500">*</span>
                </label>
                <select
                  id="decision"
                  value={hearingDecision.decision}
                  onChange={(e) => setHearingDecision(prev => ({ ...prev, decision: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Select Decision</option>
                  <option value="Approved">Approved</option>
                  <option value="Adjourned">Adjourned</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="actionOfficer" className="block text-sm font-medium text-gray-700 mb-1">
                  Action Officer
                </label>
                <input
                  type="text"
                  id="actionOfficer"
                  value={hearingDecision.actionOfficer}
                  onChange={(e) => setHearingDecision(prev => ({ ...prev, actionOfficer: e.target.value }))}
                  className="input"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="proposedAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Proposed Amount
                </label>
                <input
                  type="number"
                  id="proposedAmount"
                  value={hearingDecision.proposedAmount}
                  onChange={(e) => setHearingDecision(prev => ({ ...prev, proposedAmount: e.target.value }))}
                  className="input"
                  placeholder="Enter proposed amount"
                />
              </div>
              
              <div>
                <label htmlFor="confirmedAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmed Amount
                </label>
                <input
                  type="number"
                  id="confirmedAmount"
                  value={hearingDecision.confirmedAmount}
                  onChange={(e) => setHearingDecision(prev => ({ ...prev, confirmedAmount: e.target.value }))}
                  className="input"
                  placeholder="Enter confirmed amount"
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
                Details <span className="text-red-500">*</span>
              </label>
              <textarea
                id="details"
                value={hearingDecision.details}
                onChange={(e) => setHearingDecision(prev => ({ ...prev, details: e.target.value }))}
                className="input"
                rows={4}
                placeholder="Enter decision details"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmitDecision}
                disabled={submittingDecision}
                className="btn bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingDecision ? 'Submitting...' : 'Submit Decision'}
              </button>
            </div>

            {decisionMessage && (
              <div className={`mt-4 p-3 rounded-md text-sm ${
                decisionMessage.includes('Failed') 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {decisionMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Status Modal */}
      {showDocumentStatus && validIRN && (
        <DocumentStatus
          irn={validIRN.toString()}
          incidentType="Death"
          onClose={() => setShowDocumentStatus(false)}
        />
      )}
    </div>
  );
};

export default Form239HearingForm12SubmissionPrivate;
