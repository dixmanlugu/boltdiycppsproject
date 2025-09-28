import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface ForwardForm18ToWorkerProps {
  irn: string;
  incidentType: string;
  onClose: () => void;
}

const Form18ForwardToWorker: React.FC<ForwardForm18ToWorkerProps> = ({ 
  irn, 
  incidentType, 
  onClose 
}) => {
  const [workerID, setWorkerID] = useState('');
  const [employerCPPSID, setEmployerCPPSID] = useState('');
  const [WPD, setWPD] = useState(null);
  const [CED, setCED] = useState(null);
  const [EM, setEM] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Validate IRN format before making API call
  const isValidIRN = (value: string) => {
    return /^\d+$/.test(value);
  };

  useEffect(() => {
    if (!irn.trim()) {
      setError('IRN is required');
      return;
    }
    
    if (!isValidIRN(irn)) {
      setError('IRN must be a valid number');
      return;
    }
    
    setError('');
    
    // Read WIRN
    supabase
      .from('workerirn')
      .select()
      .eq('IRN', irn)
      .single()
      .then(({ data: WIRN, error }) => {
        if (error) {
          console.error('Error fetching WIRN:', error);
          setError('Failed to fetch worker information');
          return;
        }
        
        if (WIRN) {
          const wid = WIRN.WorkerID;
          setWorkerID(wid);

          // Read WPD
          supabase
            .from('workerpersonaldetails')
            .select()
            .eq('WorkerID', wid)
            .single()
            .then(({ data, error }) => {
              if (error) console.error('Error fetching WPD:', error);
              setWPD(data);
            });

          // Read CED
          supabase
            .from('currentemploymentdetails')
            .select()
            .eq('WorkerID', wid)
            .single()
            .then(({ data: ced, error }) => {
              if (error) console.error('Error fetching CED:', error);
              setCED(ced);
              const cpps = ced?.EmployerCPPSID;
              if (cpps) {
                setEmployerCPPSID(cpps);

                // Read EM
                supabase
                  .from('employermaster')
                  .select()
                  .eq('CPPSID', cpps)
                  .single()
                  .then(({ data, error }) => {
                    if (error) console.error('Error fetching EM:', error);
                    setEM(data);
                  });
              }
            });
        }
      });
  }, [irn]);

  const handleForward = async () => {
    try {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const { error } = await supabase
        .from('form18master')
        .update({ 
          F18MStatus: 'NotifiedToWorker', 
          F18MWorkerNotifiedDate: now 
        })
        .eq('IRN', irn);

      if (error) throw error;
      setMessage('Form 18 Notification sent to Worker');
    } catch (err) {
      console.error('Update failed:', err);
      setMessage('Failed to update Form 18 status');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          Form 18 - Application for Award by Consent
          <span className="ml-2 text-sm font-normal text-gray-600">
            Register No. {irn || '...'}
          </span>
        </h2>
      </div>

      <div className="p-6">
        <div className="bg-[#fffcf6] p-8 border border-gray-300 rounded-md">
          {/* Form Header */}
          <div className="text-center mb-6">
            <p className="italic">Workers' Compensation Act 1978.</p>
            <p className="text-sm">Act, Sec. 74.</p>
            <p className="text-sm">Reg., Sec.25.</p>
            <p className="text-right italic">Form 18</p>
            <p className="text-right">Register No. {irn || '...'}</p>
          </div>

          {/* Party Information */}
          <div className="mb-6">
            <p className="font-medium mt-4">IN RESPECT OF</p>
            
            <div className="mt-2 mb-4">
              <p className="font-bold">{WPD ? `${WPD.WorkerFirstName} ${WPD.WorkerLastName}` : ''}</p>
              <p>{WPD?.WorkerAddress1}</p>
              {WPD?.WorkerAddress2 && <p>{WPD.WorkerAddress2}</p>}
              <p>{WPD?.WorkerCity}, {WPD?.WorkerProvince}</p>
              {WPD?.WorkerPOBox && <p>P.O. Box {WPD.WorkerPOBox}</p>}
            </div>
            
            <p className="italic">, a worker</p>
            
            <p className="font-medium mt-4">AND</p>
            
            <div className="mt-2 mb-4">
              <p className="font-bold">{EM?.OrganizationName}</p>
              <p>{EM?.Address1}</p>
              {EM?.Address2 && <p>{EM.Address2}</p>}
              <p>{EM?.City}, {EM?.Province}</p>
              {EM?.POBox && <p>P.O. Box {EM.POBox}</p>}
            </div>
            
            <p className="italic">, the employer</p>
          </div>

          {/* Application Content */}
          <div className="mb-6">
            <h4 className="text-center font-semibold mb-4">APPLICATION FOR AN AWARD BY CONSENT.</h4>
            
            <p className="mb-2">The Chief Commissioner,</p>
            <p className="mb-2">Office of Workers' Compensation,</p>
            
            <p className="mb-4">
              Application is made for a consent award by a tribunal in respect of an agreement reached between the abovenamed worker and employer, particulars of the agreement are as follows:—
            </p>
            
            <div className="border p-4 rounded-md bg-white mb-4 min-h-[100px]">
              {EM && (
                <div className="mb-4">
                  <p className="font-medium">Employer Details:</p>
                  <p>{EM.OrganizationName}</p>
                  <p>{EM.Address1}</p>
                  <p>{EM.City}, {EM.Province}</p>
                </div>
              )}
              
              {WPD && (
                <div>
                  <p className="font-medium">Worker Details:</p>
                  <p>{WPD.WorkerFirstName} {WPD.WorkerLastName}</p>
                  <p>{WPD.WorkerAddress1}</p>
                  <p>{WPD.WorkerCity}, {WPD.WorkerProvince}</p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <p className="font-medium">Date: {new Date().toLocaleDateString('en-GB')}</p>
              <p>Status: {irn ? 'Pending' : 'Not Available'}</p>
            </div>
          </div>

          {/* Hidden Form Fields */}
          <form className="hidden">
            <input type="hidden" name="IRN" value={irn} />
            <input type="hidden" name="WorkerID" value={workerID} />
            <input type="hidden" name="EmployerCPPSID" value={employerCPPSID} />
          </form>

          {/* Action Button */}
          <div className="mt-8 flex justify-end">
            <button 
              onClick={handleForward}
              className={`bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-md transition-colors ${
                !irn || error ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!irn || error}
            >
              Forward to Worker
            </button>
          </div>

          {/* Success Message */}
          {message && (
            <div className={`mt-4 p-3 ${message.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'} rounded-md text-sm`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Form18ForwardToWorker;
