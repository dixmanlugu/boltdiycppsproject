import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, ChevronDown, ChevronUp, Search, Filter, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import Form124View from './Form124View';
import CompensationCalculation from './CompensationCalculation';


interface CPOClaimReviewFormProps {
  irn: string;
  onClose: () => void;
}

// This component is specifically for Death claims only
const CPODeathClaimReviewForm: React.FC<CPOClaimReviewFormProps> = ({ irn, onClose }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<any>(null);
  const [workerData, setWorkerData] = useState<any>(null); 
  const [userStaffID, setUserStaffID] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    details: true,
    history: false,
    calculation: false
  });
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  // Claim Decisions state
  const [claimDecisions, setClaimDecisions] = useState<any[]>([]);
  const [filteredDecisions, setFilteredDecisions] = useState<any[]>([]);
  const [decisionLoading, setDecisionLoading] = useState(true);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  
  // Filter states for claim decisions
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedReviewType, setSelectedReviewType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Filter options
  const [statuses, setStatuses] = useState<string[]>([]);
  const [submissionTypes, setSubmissionTypes] = useState<string[]>([]);

  useEffect(() => {
    if (profile?.id) {
      fetchUserStaffID();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (userStaffID) {
      fetchClaimData();
      checkLockStatus();
      lockRecord();
    }

    return () => {
      if (userStaffID) {
 //       unlockRecord();
      }
    };
  }, [irn, userStaffID]);

  useEffect(() => {
    if (profile?.id) {
      fetchUserStaffID();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (userStaffID) {
      fetchClaimData();
      checkLockStatus();
      lockRecord();
    }

    return () => {
      if (userStaffID) {
   //     unlockRecord();
      }
    };
  }, [irn, userStaffID]);

  const fetchUserStaffID = async () => {
    try {
      if (!profile?.id) return;
      
      const { data: staffData, error: staffError } = await supabase
        .from('owcstaffmaster')
        .select('OSMStaffID')
        .eq('cppsid', profile.id)
        .maybeSingle();
        
      if (staffError) throw staffError;
      
      if (staffData && staffData.OSMStaffID) {
        setUserStaffID(staffData.OSMStaffID.toString());
      }
    } catch (err) {
      console.error('Error fetching user staff ID:', err);
    }
  };

  useEffect(() => {
    fetchClaimData();
    checkLockStatus();

    // Set up lock on component mount
    lockRecord();

    // Clean up lock on component unmount
    return () => {
      unlockRecord();
    };
  }, [irn]); 

  useEffect(() => {
    if (expandedSections.history) {
      fetchClaimDecisions();
    }
  }, [expandedSections.history, irn]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedStatus, selectedReviewType, dateFrom, dateTo, claimDecisions]);

  const fetchClaimData = async () => {
    try {
      setLoading(true);
      
      // Fetch claim data from form1112master
      const { data: claimData, error: claimError } = await supabase
        .from('form1112master') 
        .select(`
          IRN,
          DisplayIRN,
          WorkerID,
          IncidentDate,
          IncidentType,
          IncidentLocation,
          IncidentProvince,
          IncidentRegion,
          NatureExtentInjury,
          InjuryCause,
          HandInjury, 
          InsuranceProviderIPACode
        `)
        .eq('IRN', irn)
        .single();

      if (claimError) throw claimError;

      // Fetch worker details
      const { data: workerData, error: workerError } = await supabase
        .from('workerpersonaldetails')
        .select('*')
        .eq('WorkerID', claimData.WorkerID)
        .single();

      if (workerError) throw workerError;

      setClaimData(claimData);
      setWorkerData(workerData);
    } catch (err: any) {
      console.error('Error fetching claim data:', err);
      setError(err.message || 'Failed to load claim data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimDecisions = async () => {
    try {
      setDecisionLoading(true);
      let allDecisions: any[] = [];

      // 1. Fetch from timebarredclaimsregistrarreview
      const { data: timeBarredData, error: timeBarredError } = await supabase
        .from('timebarredclaimsregistrarreview')
        .select('IRN, TBCRRFormType, TBCRRReviewStatus, TBCRRDecisionReason, TBCRRDecisionDate')
        .eq('IRN', irn)
        .order('TBCRRDecisionDate', { ascending: false });

      if (timeBarredError) throw timeBarredError;

      const formattedTimeBarredData = timeBarredData?.map(item => ({
        IRN: item.IRN,
        DisplayIRN: '', // Will be populated later
        SubmissionType: `${item.TBCRRFormType} - TimeBarred`,
        Status: item.TBCRRReviewStatus || '',
        DecisionReason: item.TBCRRDecisionReason || '',
        DecisionTakenBy: 'Registrar',
        DecisionDate: item.TBCRRDecisionDate || ''
      })) || [];

      // 2. Fetch from prescreeningreview
      const { data: prescreeningData, error: prescreeningError } = await supabase
        .from('prescreening_view')
        .select('*')
        .eq('IRN', irn)
        .eq('IRN', irn)
        .order('PRSubmissionDate', { ascending: false });

      if (prescreeningError) throw prescreeningError;

      const formattedPrescreeningData = prescreeningData?.map(item => ({
        IRN: item.IRN,
        DisplayIRN: '', // Will be populated later
        SubmissionType: item.PRFormType || 'Form Review', 
        Status: item.PRStatus || 'Pending', 
        DecisionReason: item.PRDecisionReason || 'Under Review', 
        DecisionTakenBy: 'Deputy Registrar',
        DecisionDate: item.PRSubmissionDate || ''
      })) || [];

      // 3. Fetch from registrarreview
      const { data: registrarData, error: registrarError } = await supabase
        .from('registrarreview')
        .select('IRN, IncidentType, RRStatus, RRDecisionReason, RRDecisionDate')
        .eq('IRN', irn)
        .order('RRDecisionDate', { ascending: false });

      if (registrarError) throw registrarError;

      const formattedRegistrarData = registrarData?.map(item => ({
        IRN: item.IRN,
        DisplayIRN: '', // Will be populated later
        SubmissionType: item.IncidentType || '',
        Status: item.RRStatus || '',
        DecisionReason: item.RRDecisionReason || '',
        DecisionTakenBy: 'Registrar',
        DecisionDate: item.RRDecisionDate || ''
      })) || [];

      // 4. Fetch from approvedclaimscporeview
      const { data: cpoData, error: cpoError } = await supabase
        .from('approvedclaimscporeview')
        .select('IRN, IncidentType, CPORStatus, LockedByCPOID, CPORSubmissionDate')
        .eq('IRN', irn)
        .order('CPORSubmissionDate', { ascending: false });

      if (cpoError) throw cpoError;

      // Process CPO data with locked status
      const formattedCPOData = await Promise.all(cpoData?.map(async item => {
        let status = '';
        let decisionReason = '--';
        let decisionTakenBy = 'Provincial Claims Officer';

        if (item.CPORStatus !== 'CompensationCalculated') {
          if (item.LockedByCPOID === 0) {
            status = 'Review Pending';
          } else {
            status = 'Review in Progress';
            
            // Get locked by user name
            if (item.LockedByCPOID) {
              const { data: userData, error: userError } = await supabase
                .from('owcstaffmaster')
                .select('OSMFirstName, OSMLastName')
                .eq('OSMStaffID', item.LockedByCPOID)
                .maybeSingle();
                
              if (!userError && userData) {
                decisionTakenBy = `${userData.OSMFirstName} ${userData.OSMLastName}`;
              }
            }
          }
        } else {
          status = 'Compensation Calculated';
          
          // Get locked by user name
          if (item.LockedByCPOID) {
            const { data: userData, error: userError } = await supabase
              .from('owcstaffmaster')
              .select('OSMFirstName, OSMLastName')
              .eq('OSMStaffID', item.LockedByCPOID)
              .maybeSingle();
              
            if (!userError && userData) {
              decisionTakenBy = `${userData.OSMFirstName} ${userData.OSMLastName}`;
            }
          }
        }

        return {
          IRN: item.IRN,
          DisplayIRN: '', // Will be populated later
          SubmissionType: item.IncidentType || '',
          Status: status,
          DecisionReason: decisionReason,
          DecisionTakenBy: decisionTakenBy,
          DecisionDate: item.CPORSubmissionDate || ''
        };
      }) || []);

      // 5. Fetch from compensationcalculationreview
      const { data: ccrData, error: ccrError } = await supabase
        .from('compensationcalculationreview')
        .select('IRN, IncidentType, CCRReviewStatus, CCRDecisionReason, CCRSubmissionDate')
        .eq('IRN', irn)
        .order('CCRSubmissionDate', { ascending: false });

      if (ccrError) throw ccrError;

      const formattedCCRData = ccrData?.map(item => ({
        IRN: item.IRN,
        DisplayIRN: '', // Will be populated later
        SubmissionType: item.IncidentType || '',
        Status: item.CCRReviewStatus || '',
        DecisionReason: item.CCRDecisionReason || '',
        DecisionTakenBy: 'Registrar',
        DecisionDate: item.CCRSubmissionDate || ''
      })) || [];

      // 6. Fetch from compensationcalculationcommissionerreview
      const { data: cccData, error: cccError } = await supabase
        .from('compensationcalculationcommissionersreview')
        .select('IRN, IncidentType, CCCRReviewStatus, CCCRDecisionReason, CCCRSubmissionDate')
        .eq('IRN', irn)
        .order('CCCRSubmissionDate', { ascending: false });

      if (cccError) throw cccError;

      const formattedCCCData = cccData?.map(item => {
        let decisionTakenBy = 'Commissioner';
        
        // Check if status contains "Chief" or "Comm"
        if (item.CCCRReviewStatus && item.CCCRReviewStatus.includes('Chief')) {
          decisionTakenBy = 'ChiefCommissioner';
        } else if (item.CCCRReviewStatus && item.CCCRReviewStatus.includes('Comm')) {
          decisionTakenBy = 'Commissioner';
        }
        
        return {
          IRN: item.IRN,
          DisplayIRN: '', // Will be populated later
          SubmissionType: item.IncidentType || '',
          Status: item.CCCRReviewStatus || '',
          DecisionReason: item.CCCRDecisionReason || '',
          DecisionTakenBy: decisionTakenBy,
          DecisionDate: item.CCCRSubmissionDate || ''
        };
      }) || [];

      // 7. Fetch from compensationcalculationcpmreview
      const { data: cpmData, error: cpmError } = await supabase
        .from('compensationcalculationcpmreview')
        .select('IRN, IncidentType, CPMRStatus, CPMRDecisionReason, CPMRSubmissionDate')
        .eq('IRN', irn)
        .order('CPMRSubmissionDate', { ascending: false });

      if (cpmError) throw cpmError;

      // Process CPM data with region-based CPM name
      const formattedCPMData = await Promise.all(cpmData?.map(async item => {
        // Get incident region from form1112master
        const { data: form1112Data, error: form1112Error } = await supabase
          .from('form1112master')
          .select('IncidentRegion')
          .eq('IRN', item.IRN)
          .maybeSingle();
          
        let cpmName = 'Claims Manager';
        
        if (!form1112Error && form1112Data && form1112Data.IncidentRegion) {
          // Get CPM details based on region
          const { data: cpmUserData, error: cpmUserError } = await supabase
            .from('owcstaffmaster')
            .select('OSMFirstName, OSMLastName')
            .eq('InchargeRegion', form1112Data.IncidentRegion)
            .eq('OSMDesignation', 'Claims Manager')
            .maybeSingle();
            
          if (!cpmUserError && cpmUserData) {
            cpmName = `${cpmUserData.OSMFirstName} ${cpmUserData.OSMLastName} (Claims Manager)`;
          }
        }
        
        return {
          IRN: item.IRN,
          DisplayIRN: '', // Will be populated later
          SubmissionType: item.IncidentType || '',
          Status: item.CPMRStatus || '',
          DecisionReason: item.CPMRDecisionReason || '',
          DecisionTakenBy: cpmName,
          DecisionDate: item.CPMRSubmissionDate || ''
        };
      }) || []);

      // 8. Fetch from form6master
      const { data: form6Data, error: form6Error } = await supabase
        .from('form6master')
        .select('IRN, IncidentType, F6MStatus, F6MApprovalDate')
        .eq('IRN', irn)
        .order('F6MApprovalDate', { ascending: false });

      if (form6Error) throw form6Error;

      const formattedForm6Data = form6Data?.map(item => ({
        IRN: item.IRN,
        DisplayIRN: '', // Will be populated later
        SubmissionType: `${item.IncidentType} - Form6`,
        Status: item.F6MStatus || '',
        DecisionReason: 'Notification Received - Insurance Company',
        DecisionTakenBy: '--',
        DecisionDate: item.F6MApprovalDate || ''
      })) || [];

      // 9. Fetch from form18master
      const { data: form18Data, error: form18Error } = await supabase
        .from('form18master')
        .select('IRN, IncidentType, F18MStatus, F18MEmployerDecisionReason, F18MWorkerDecisionReason, F18MEmployerAcceptedDate, F18MWorkerAcceptedDate')
        .eq('IRN', irn)
        .order('F18MEmployerAcceptedDate', { ascending: false });

      if (form18Error) throw form18Error;

      const formattedForm18Data: any[] = [];
      
      // Process Form18 data based on status
      form18Data?.forEach(item => {
        // Employer Accepted
        if (item.F18MStatus === 'EmployerAccepted' || item.F18MStatus === 'NotifiedToWorker' || item.F18MStatus === 'WorkerAccepted') {
          formattedForm18Data.push({
            IRN: item.IRN,
            DisplayIRN: '', // Will be populated later
            SubmissionType: `${item.IncidentType} - Form18 Notification`,
            Status: 'EmployerAccepted',
            DecisionReason: item.F18MEmployerDecisionReason || '',
            DecisionTakenBy: 'Employer',
            DecisionDate: item.F18MEmployerAcceptedDate || ''
          });
        }
        
        // Notified to Worker
        if (item.F18MStatus === 'NotifiedToWorker' || item.F18MStatus === 'WorkerAccepted') {
          // Get locked by user name
          formattedForm18Data.push({
            IRN: item.IRN,
            DisplayIRN: '', // Will be populated later
            SubmissionType: `${item.IncidentType} - Form18 Notification`,
            Status: 'NotifiedToWorker',
            DecisionReason: '--',
            DecisionTakenBy: 'Provincial Claims Officer',
            DecisionDate: item.F18MEmployerAcceptedDate || ''
          });
        }
        
        // Worker Accepted
        if (item.F18MStatus === 'WorkerAccepted') {
          formattedForm18Data.push({
            IRN: item.IRN,
            DisplayIRN: '', // Will be populated later
            SubmissionType: `${item.IncidentType} - Form18 Notification`,
            Status: 'WorkerAccepted',
            DecisionReason: item.F18MWorkerDecisionReason || '',
            DecisionTakenBy: 'Worker',
            DecisionDate: item.F18MWorkerAcceptedDate || ''
          });
        }
      });

      // 10. Fetch from claimsawardedcommissionersreview
      const { data: cacrData, error: cacrError } = await supabase
        .from('claimsawardedcommissionersreview')
        .select('IRN, IncidentType, CACRReviewStatus, CACRDecisionReason, CACRSubmissionDate')
        .eq('IRN', irn)
        .order('CACRSubmissionDate', { ascending: false });

      if (cacrError) throw cacrError;

      const formattedCACRData = cacrData?.map(item => {
        let decisionTakenBy = 'Commissioner';
        
        // Check if status contains "Chief"
        if (item.CACRReviewStatus && item.CACRReviewStatus.includes('Chief')) {
          decisionTakenBy = 'Chief Commissioner';
        }
        
        return {
          IRN: item.IRN,
          DisplayIRN: '', // Will be populated later
          SubmissionType: item.IncidentType || '',
          Status: item.CACRReviewStatus || '',
          DecisionReason: item.CACRDecisionReason || '',
          DecisionTakenBy: decisionTakenBy,
          DecisionDate: item.CACRSubmissionDate || ''
        };
      }) || [];

      // 11. Fetch from claimsawardedregistrarreview
      const { data: carrData, error: carrError } = await supabase
        .from('claimsawardedregistrarreview')
        .select('IRN, IncidentType, CARRReviewStatus, CARRDecisionReason, CARRSubmissionDate')
        .eq('IRN', irn)
        .order('CARRSubmissionDate', { ascending: false });

      if (carrError) throw carrError;

      const formattedCARRData = carrData?.map(item => ({
        IRN: item.IRN,
        DisplayIRN: '', // Will be populated later
        SubmissionType: item.IncidentType || '',
        Status: item.CARRReviewStatus || '',
        DecisionReason: item.CARRDecisionReason || '',
        DecisionTakenBy: 'Registrar',
        DecisionDate: item.CARRSubmissionDate || ''
      })) || [];

      // Combine all data
      allDecisions = [
        ...formattedTimeBarredData,
        ...formattedPrescreeningData,
        ...formattedRegistrarData,
        ...formattedCPOData,
        ...formattedCCRData,
        ...formattedCCCData,
        ...formattedCPMData,
        ...formattedForm6Data,
        ...formattedForm18Data,
        ...formattedCACRData,
        ...formattedCARRData
      ];

      // Get DisplayIRN for all IRNs
      const { data: form1112Data, error: form1112Error } = await supabase
        .from('form1112master')
        .select('IRN, DisplayIRN')
        .eq('IRN', irn);

      if (form1112Error) throw form1112Error;

      // Update DisplayIRN in all decisions
      if (form1112Data && form1112Data.length > 0) {
        const displayIRN = form1112Data[0].DisplayIRN;
        allDecisions = allDecisions.map(decision => ({
          ...decision,
          DisplayIRN: displayIRN
        }));
      }

      // Extract unique values for filters
      const uniqueStatuses = [...new Set(allDecisions.map(item => item.Status))].filter(Boolean);
      const uniqueSubmissionTypes = [...new Set(allDecisions.map(item => item.SubmissionType))].filter(Boolean);
      
      console.log('Prescreening data:', prescreeningData);
      console.log('Formatted prescreening data:', formattedPrescreeningData);

      setStatuses(uniqueStatuses);
      setSubmissionTypes(uniqueSubmissionTypes);
      setClaimDecisions(allDecisions);
      setFilteredDecisions(allDecisions);
    } catch (err: any) {
      console.error('Error fetching claim data:', err);
      setDecisionError(err.message || 'Failed to load claim decisions');
    } finally {
      setDecisionLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = claimDecisions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(decision =>
        decision.DisplayIRN.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decision.SubmissionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decision.Status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decision.DecisionReason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decision.DecisionTakenBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(decision => decision.Status === selectedStatus);
    }

    // Review type filter
    if (selectedReviewType) {
      filtered = filtered.filter(decision => decision.SubmissionType === selectedReviewType);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(decision => {
        const decisionDate = new Date(decision.DecisionDate);
        return decisionDate >= new Date(dateFrom);
      });
    }

    if (dateTo) {
      filtered = filtered.filter(decision => {
        const decisionDate = new Date(decision.DecisionDate);
        return decisionDate <= new Date(dateTo);
      });
    }

    setFilteredDecisions(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedReviewType('');
    setDateFrom('');
    setDateTo('');
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('approved') || statusLower.includes('accepted')) {
      return 'bg-green-100 text-green-800';
    } else if (statusLower.includes('rejected') || statusLower.includes('denied')) {
      return 'bg-red-100 text-red-800';
    } else if (statusLower.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (statusLower.includes('progress')) {
      return 'bg-blue-100 text-blue-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const checkLockStatus = async () => {
    if (!irn || !userStaffID) return;

    try {
      setLoading(true);
      
      // Check if there's an existing lock record
      const { data, error } = await supabase
        .from('approvedclaimscporeview')
        .select('LockedByCPOID')
        .eq('IRN', irn)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

      if (error) throw error;

      let lockedByName = null;
      let lockedByCPOID = null;

      if (!error && data && data.LockedByCPOID != null) {
        lockedByCPOID = data.LockedByCPOID.toString();

        if (data.LockedByCPOID === 0) {
          // Explicitly state no lock
          lockedByName = null;
          lockedByCPOID = null;
          setIsLocked(false);
        } else if (data.LockedByCPOID.toString() !== userStaffID) {
          // Only consider it locked if it's locked by someone else
          // Get the name of the user who locked the record
          const { data: userData, error: userError } = await supabase
            .from('owcstaffmaster')
            .select('OSMFirstName, OSMLastName')
            .eq('OSMStaffID', data.LockedByCPOID)
            .maybeSingle();

          if (!userError && userData) {
            lockedByName = `${userData.OSMFirstName} ${userData.OSMLastName}`;
          } else {
            lockedByName = 'Unknown User';
          }
          
          setIsLocked(true);
        } else {
          // Locked by current user, so not considered locked for UI purposes
          setIsLocked(false);
        }
      } else {
        setIsLocked(false);
      }
      
      setLockedBy(lockedByName);
    } catch (err) {
      console.error('Error checking lock status:', err);
      // Don't set error state here as it's not critical
      setIsLocked(false);
      setLockedBy(null);
    } finally {
      setLoading(false);
    }
  };

  const lockRecord = async () => {
    if (!userStaffID) return;
    
    try {
      // Check if a record exists
      const { data: existingRecord, error: checkError } = await supabase
        .from('approvedclaimscporeview')
        .select('LockedByCPOID')
        .eq('IRN', irn)
        .maybeSingle();
        
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingRecord) {
        // If record exists and is not locked or locked by current user, update it
        if (!existingRecord.LockedByCPOID || existingRecord.LockedByCPOID === 0 || existingRecord.LockedByCPOID.toString() === userStaffID) {
          const { error: updateError } = await supabase
            .from('approvedclaimscporeview')
            .update({ LockedByCPOID: userStaffID })
            .eq('IRN', irn);
            
          if (updateError) throw updateError;
        }
      } else {
        // If record doesn't exist, create it
        const { error: insertError } = await supabase
          .from('approvedclaimscporeview')
          .insert({
            IRN: irn,
            LockedByCPOID: userStaffID,
            CPORStatus: 'Pending',
            IncidentType: claimData?.IncidentType || 'Injury'
          });
          
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Error locking record:', err);
    }
  };

	{/* const unlockRecord = async () => {
    if (!userStaffID) return;
    
    try {
      // Unlock the record only if it's locked by the current user
      const { error: unlockError } = await supabase
        .from('approvedclaimscporeview')
        .update({ LockedByCPOID: 0 })
        .eq('IRN', irn)
        .eq('LockedByCPOID', userStaffID);
        
      if (unlockError) throw unlockError;
    } catch (err) {
      console.error('Error unlocking record:', err);
    }
  }; */}

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

const handleCloseAllFromChild = () => {
  // Optionally collapse/open sections if you want:
  setExpandedSections({ details: false, history: false, calculation: false });

  // Then close THIS parent (returns to dashboard or whatever your onClose does)
  onClose();
};


	
  const handleCloseForm = () => {
    // Unlock the record before closing
  //  unlockRecord();
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"> 
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-700">Loading claim data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked && lockedBy) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-semibold">Claim Locked</h3>
          </div>
          <p className="text-gray-700 mb-4">
            This claim is currently being processed by {lockedBy}. Please try again later.
          </p>
          <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-semibold">Error</h3>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto"> 
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">
            Death Claim Review - {claimData?.DisplayIRN}
            {workerData && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                {workerData.WorkerFirstName} {workerData.WorkerLastName}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Form124View Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg cursor-pointer" 
                onClick={() => toggleSection('details')}>
              <h3 className="text-lg font-semibold text-primary">Death Claim Details</h3>
              <button className="text-primary hover:text-primary-dark">
                {expandedSections.details ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div> 
            {expandedSections.details && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <Form124View irn={irn}  variant="embedded" className="mt-4" />
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="my-8 border-t border-gray-300" />

          {/* ListClaimDecisions Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg cursor-pointer" 
                 onClick={() => toggleSection('history')}>
              <h3 className="text-lg font-semibold text-primary">Claim History</h3>
              <button className="text-primary hover:text-primary-dark">
                {expandedSections.history ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
            {expandedSections.history && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="space-y-6">
                  {/* Filters */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input 
                          type="text" 
                          placeholder="Search by status, reason..." 
                          className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <div className="relative">
                          <select 
                            className="py-2 px-3 border border-gray-300 rounded-md appearance-none pr-8"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                          >
                            <option value="">All Statuses</option>
                            {statuses.map((status, index) => (
                              <option key={index} value={status}>{status}</option>
                            ))}
                          </select>
                          <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4 pointer-events-none" />
                        </div>
                        
                        <div className="relative">
                          <select 
                            className="py-2 px-3 border border-gray-300 rounded-md appearance-none pr-8"
                            value={selectedReviewType}
                            onChange={(e) => setSelectedReviewType(e.target.value)}
                          >
                            <option value="">All Submission Types</option>
                            {submissionTypes.map((type, index) => (
                              <option key={index} value={type}>{type}</option>
                            ))}
                          </select>
                          <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4 pointer-events-none" />
                        </div>
                        
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input 
                            type="date" 
                            placeholder="From Date" 
                            className="pl-10 py-2 px-3 border border-gray-300 rounded-md"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                          />
                        </div>
                        
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input 
                            type="date" 
                            placeholder="To Date" 
                            className="pl-10 py-2 px-3 border border-gray-300 rounded-md"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                          />
                        </div>
                        
                        <button 
                          onClick={clearFilters}
                          className="py-2 px-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Submission Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status of Approval
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Decision Reason
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Decision Taken By
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Decision Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {decisionLoading ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 text-center">
                                <div className="flex justify-center">
                                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                                </div>
                              </td>
                            </tr>
                          ) : decisionError ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-4 text-center text-red-600">
                                {decisionError}
                              </td>
                            </tr>
                          ) : filteredDecisions.length > 0 ? (
                            filteredDecisions.map((decision, index) => (
                              <tr key={`${decision.IRN}-${decision.SubmissionType}-${index}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {decision.SubmissionType}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(decision.Status)}`}>
                                    {decision.Status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {decision.DecisionReason || '--'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {decision.DecisionTakenBy || '--'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {decision.DecisionDate ? new Date(decision.DecisionDate).toLocaleDateString() : '--'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="text-lg font-medium">No decisions found</p>
                                <p className="text-sm">Try adjusting your filters or search criteria</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="my-8 border-t border-gray-300" />

          {/* CompensationCalculation Section */}
          <div>
            <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-lg cursor-pointer" 
                 onClick={() => toggleSection('calculation')}>
              <h3 className="text-lg font-semibold text-primary">Compensation Calculation</h3>
              <button className="text-primary hover:text-primary-dark">
                {expandedSections.calculation ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
            {expandedSections.calculation && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                {/* Pass the irn directly without additional lock check since it's already handled at form load */}
                <CompensationCalculation 
                  irn={irn} 
                  onClose={() => toggleSection('calculation')} 
									onCloseAll={handleCloseAllFromChild}   // ✅ key line
                />
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <button
            onClick={handleCloseForm}
            className="btn btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CPODeathClaimReviewForm;
