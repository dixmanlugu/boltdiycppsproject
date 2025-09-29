// src/components/forms/110cpoclaimreviewform.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Calendar,
  FileText,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import Form113View from './Form113View';
import CompensationCalculation from './CompensationCalculation';

interface CPOClaimReviewFormProps {
  irn: string;
  readOnly?: boolean; // NEW
  onClose: () => void;
}

const CPOClaimReviewForm: React.FC<CPOClaimReviewFormProps> = ({
  irn,
  readOnly = false,
  onClose,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<any>(null);
  const [workerData, setWorkerData] = useState<any>(null);
  const [userStaffID, setUserStaffID] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    details: true,
    history: false,
    calculation: false,
  });
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  // === EFFECTS ===

  // Get staff ID
  useEffect(() => {
    if (profile?.id) {
      fetchUserStaffID();
    }
  }, [profile?.id]);

  // Fetch claim data + lock handling
  useEffect(() => {
    if (!irn) return;
    fetchClaimData();

    if (userStaffID) {
      checkLockStatus();
      if (!readOnly) {
        lockRecord();
      }
    }

    return () => {
      // If you re-enable unlocking on close in the future, guard with !readOnly
    };
  }, [irn, userStaffID, readOnly]);

  // === HELPERS ===

  const fetchUserStaffID = async () => {
    try {
      if (!profile?.id) return;
      const { data, error } = await supabase
        .from('owcstaffmaster')
        .select('OSMStaffID')
        .eq('cppsid', profile.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.OSMStaffID) {
        setUserStaffID(data.OSMStaffID.toString());
      }
    } catch (err) {
      console.error('Error fetching staff ID:', err);
    }
  };

  const fetchClaimData = async () => {
    try {
      setLoading(true);
      const { data: claim, error: claimErr } = await supabase
        .from('form1112master')
        .select('IRN, DisplayIRN, WorkerID, IncidentType')
        .eq('IRN', irn)
        .single();
      if (claimErr) throw claimErr;

      const { data: worker, error: workerErr } = await supabase
        .from('workerpersonaldetails')
        .select('*')
        .eq('WorkerID', claim.WorkerID)
        .single();
      if (workerErr) throw workerErr;

      setClaimData(claim);
      setWorkerData(worker);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkLockStatus = async () => {
    if (!irn || !userStaffID) return;
    if (readOnly) {
      setIsLocked(false);
      setLockedBy(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('approvedclaimscporeview')
        .select('LockedByCPOID')
        .eq('IRN', irn)
        .maybeSingle();
      if (error) throw error;

      if (data?.LockedByCPOID && data.LockedByCPOID.toString() !== userStaffID) {
        const { data: user } = await supabase
          .from('owcstaffmaster')
          .select('OSMFirstName, OSMLastName')
          .eq('OSMStaffID', data.LockedByCPOID)
          .maybeSingle();
        setLockedBy(user ? `${user.OSMFirstName} ${user.OSMLastName}` : 'Unknown');
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.error('Error checking lock status:', err);
      setIsLocked(false);
    }
  };

  const lockRecord = async () => {
    if (!userStaffID || readOnly) return;
    try {
      const { data, error } = await supabase
        .from('approvedclaimscporeview')
        .select('LockedByCPOID')
        .eq('IRN', irn)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        if (!data.LockedByCPOID || data.LockedByCPOID === 0 || data.LockedByCPOID.toString() === userStaffID) {
          await supabase.from('approvedclaimscporeview').update({ LockedByCPOID: userStaffID }).eq('IRN', irn);
        }
      } else {
        await supabase.from('approvedclaimscporeview').insert({
          IRN: irn,
          LockedByCPOID: userStaffID,
          CPORStatus: 'Pending',
          IncidentType: claimData?.IncidentType || 'Injury',
        });
      }
    } catch (err) {
      console.error('Error locking record:', err);
    }
  };

  // === UI ===

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">Loading...</div>
      </div>
    );
  }

  if (!readOnly && isLocked && lockedBy) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md">
          <div className="flex items-center text-red-600 mb-2">
            <AlertCircle className="h-5 w-5 mr-2" /> <h3>Claim Locked</h3>
          </div>
          <p>This claim is currently being processed by {lockedBy}.</p>
          <button onClick={onClose} className="btn btn-primary mt-4">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
      <div className="bg-white w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">
            Injury Claim Review - {claimData?.DisplayIRN}
          </h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        {readOnly && (
          <div className="m-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            Read-only mode: no changes will be saved and the record will not be locked.
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Claim Details */}
          <div>
            <div
              className="flex justify-between items-center bg-gray-50 p-3 rounded cursor-pointer"
              onClick={() => setExpandedSections(s => ({ ...s, details: !s.details }))}
            >
              <h3 className="font-semibold">Claim Details</h3>
              {expandedSections.details ? <ChevronUp /> : <ChevronDown />}
            </div>
            {expandedSections.details && (
              <div className="border p-4 rounded">
                <Form113View irn={irn} variant="embedded" />
              </div>
            )}
          </div>

          {/* Compensation Calculation */}
          <div>
            <div
              className="flex justify-between items-center bg-gray-50 p-3 rounded cursor-pointer"
              onClick={() => setExpandedSections(s => ({ ...s, calculation: !s.calculation }))}
            >
              <h3 className="font-semibold">Compensation Calculation</h3>
              {expandedSections.calculation ? <ChevronUp /> : <ChevronDown />}
            </div>
            {expandedSections.calculation && (
              <div className="border p-4 rounded">
                <CompensationCalculation
                  irn={irn}
                  readOnly={readOnly}
                  onClose={() => setExpandedSections(s => ({ ...s, calculation: false }))}
                  onCloseAll={onClose}
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4 flex justify-end bg-gray-50">
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
};

export default CPOClaimReviewForm;
