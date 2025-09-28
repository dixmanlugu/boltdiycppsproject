import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

interface WorkerDetails {
  CCWDWorkerFirstName: string;
  CCWDWorkerLastName: string;
  CCWDWorkerDOB?: string | null;
  CCWDAnnualWage: string;
  CCWDCompensationAmount: string;
  CCWDMedicalExpenses: string;
  CCWDMiscExpenses: string;
  CCWDDeductions: string;
  CCWDDeductionsNotes: string;
}

interface InjuryCheckList {
  ICCLCriteria: string;
  ICCLFactor: string;
  ICCLDoctorPercentage: string;
  ICCLCompensationAmount: string;
}

interface PersonalDetails {
  CCPDPersonFirstName: string;
  CCPDPersonLastName: string;
 CCPDPersonDOB: string | null;  
  CCPDRelationToWorker: string;
  CCPDDegreeOfDependance: string;
  CCPDCompensationAmount: string;
}

interface CompensationBreakupDetailsViewProps {
  IRN: string;
  DisplayIRN: string;
  IncidentType: string;
}

// currency → K
const money = (n: number) => `K${(n || 0).toLocaleString()}`;

// dd/mm/yyyy (safe)
const pretty = (d?: string | Date | null) => {
  if (!d) return '--';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d; // show raw if unparsable
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const CompensationBreakupDetailsView: React.FC<CompensationBreakupDetailsViewProps> = ({ IRN, DisplayIRN, IncidentType }) => {
  const [workerDetails, setWorkerDetails] = useState<WorkerDetails | null>(null);
  const [injuryCheckList, setInjuryCheckList] = useState<InjuryCheckList[]>([]);
  const [personalDetails, setPersonalDetails] = useState<PersonalDetails[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        setError(null);

        const irnNumber = parseInt(IRN, 10);
        if (isNaN(irnNumber)) throw new Error('Invalid IRN: must be a number');

        const { data: workerRow, error: workerError } = await supabase
          .from('claimcompensationworkerdetails')
          .select('*')
          .eq('IRN', irnNumber)
          .maybeSingle();
        if (workerError) throw workerError;
       setWorkerDetails(workerRow as unknown as WorkerDetails | null);

        if (IncidentType === 'Injury') {
         const { data: injuryRows, error: injuryError } = await supabase
            .from('injurycasechecklist')
            .select('*')
            .eq('IRN', irnNumber);
          if (injuryError) throw injuryError;
          setInjuryCheckList(injuryRows || []); // ← was injuryCheckList
        }

      const { data: personalRows, error: personalError } = await supabase
          .from('claimcompensationpersonaldetails')
          .select('*')
          .eq('IRN', irnNumber);
        if (personalError) throw personalError;
        setPersonalDetails(personalRows || []); // ← was personalDetails

        setLoadingData(false);
      } catch (err: any) {
        setError(`Error loading compensation details: ${err.message}`);
        setLoadingData(false);
      }
    };

    fetchData();
  }, [IRN, IncidentType]);

  if (error) {
    return (
      <div className="bg-surface p-5 rounded-lg shadow-md w-full">
        <h1 className="text-xl font-semibold mb-4 text-primary">Compensation Breakup Details</h1>
        <div className="bg-error/10 border border-error text-error p-3 rounded-md text-sm">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="bg-surface p-5 rounded-lg shadow-md w-full">
        <h1 className="text-xl font-semibold mb-4 text-primary">Compensation Breakup Details</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!workerDetails) {
    return (
      <div className="bg-surface p-5 rounded-lg shadow-md w-full">
        <h1 className="text-xl font-semibold mb-4 text-primary">Compensation Breakup Details</h1>
        <div className="bg-warning/10 border border-warning text-warning p-3 rounded-md text-sm">
          <p>No worker details found for this claim.</p>
        </div>
      </div>
    );
  }

  // tolerate either CCWDWorkerDOB (preferred) or WorkerDOB (legacy)
  const workerDOBRaw =
    workerDetails.CCWDWorkerDOB ??
    (workerDetails as any).WorkerDOB ??
    null;
	
  const data = {
    display_irn: DisplayIRN,
    worker_first_name: workerDetails.CCWDWorkerFirstName,
    worker_last_name: workerDetails.CCWDWorkerLastName,
    worker_date_of_birth: pretty(workerDOBRaw),          // ← now formatted + shown
    annual_wage: parseFloat(workerDetails.CCWDAnnualWage) || 0,
    total_compensation: parseFloat(workerDetails.CCWDCompensationAmount) || 0,
    medical_expenses: parseFloat(workerDetails.CCWDMedicalExpenses) || 0,
    miscellaneous_expenses: parseFloat(workerDetails.CCWDMiscExpenses) || 0,
    deductions: parseFloat(workerDetails.CCWDDeductions) || 0,
    deduction_notes: workerDetails.CCWDDeductionsNotes || '',
    is_injury_case: IncidentType === 'Injury',
    dependents: personalDetails.map(detail => ({
      name: `${detail.CCPDPersonFirstName} ${detail.CCPDPersonLastName}`.trim(),
      relationship: detail.CCPDRelationToWorker,
      date_of_birth: pretty(detail.CCPDPersonDOB),       // ← pretty format dependents' DOB to
      degree_of_dependence: detail.CCPDDegreeOfDependance,
      compensation_amount: parseFloat(detail.CCPDCompensationAmount) || 0
    }))
  };

  return (
    <div className="bg-surface p-5 rounded-lg shadow-md w-full">
      <h1 className="text-xl font-semibold mb-4 text-primary">Compensation Breakup Details</h1>

      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3 text-textSecondary">Claim Reference</h2>
        <div className="bg-surface-dark p-3 rounded-md text-sm">
          <p className="text-textSecondary">
            <span className="font-medium">Display IRN (CRN): </span>
            {data.display_irn}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3 text-textSecondary">Worker Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-dark p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2 text-textSecondary">Personal Details</h3>
            <p className="text-textSecondary text-sm">
              <span className="font-medium">Name: </span>
              {data.worker_first_name} {data.worker_last_name}
            </p>
            <p className="text-textSecondary text-sm mt-2">
              <span className="font-medium">Date of Birth: </span>
            {data.worker_date_of_birth || '--'}
            </p>
          </div>

          <div className="bg-surface-dark p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2 text-textSecondary">Financial Details</h3>
            <p className="text-textSecondary text-sm">
              <span className="font-medium">Annual Wage: </span>
              {money(data.annual_wage)}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-base font-semibold mb-3 text-textSecondary">Compensation Breakup</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-dark p-3 rounded-md">
            <p className="text-textSecondary text-xs">Total Compensation</p>
            <p className="text-primary font-semibold text-lg mt-0.5">
              {money(data.total_compensation)}
            </p>
          </div>

          <div className="bg-surface-dark p-3 rounded-md">
            <p className="text-textSecondary text-xs">Medical Expenses</p>
            <p className="text-success font-semibold text-lg mt-0.5">
              {money(data.medical_expenses)}
            </p>
          </div>

          <div className="bg-surface-dark p-3 rounded-md">
            <p className="text-textSecondary text-xs">Miscellaneous Expenses</p>
            <p className="text-accent font-semibold text-lg mt-0.5">
              {money(data.miscellaneous_expenses)}
            </p>
          </div>

          <div className="bg-surface-dark p-3 rounded-md">
            <p className="text-textSecondary text-xs">Deductions</p>
            <p className="text-error font-semibold text-lg mt-0.5">
              {money(data.deductions)}
            </p>
          </div>
        </div>

        {data.deduction_notes && (
          <div className="mt-3 bg-surface-dark p-3 rounded-md border border-gray-700">
            <p className="text-textSecondary text-xs">Deduction Notes:</p>
            <p className="text-textSecondary text-sm mt-1">{data.deduction_notes}</p>
          </div>
        )}
      </div>

      {data.is_injury_case && injuryCheckList.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 text-textSecondary">Injury Checklist</h2>
          <div className="bg-surface-dark rounded-md overflow-hidden w-full">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Criteria</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Factor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Doctor's Percentage</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Compensation Amount</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-gray-700">
                {injuryCheckList.map((item, index) => (
                  <tr key={index} className="hover:bg-surface-dark transition-colors duration-150">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-textSecondary">{item.ICCLCriteria}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-textSecondary">{item.ICCLFactor}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-accent font-medium">{item.ICCLDoctorPercentage}%</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-success font-medium">
                      {money(parseFloat(item.ICCLCompensationAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-2">
        <h2 className="text-base font-semibold mb-3 text-textSecondary">Dependent/Applicant Details</h2>
        {data.dependents.length > 0 ? (
          <div className="bg-surface-dark rounded-md overflow-hidden w-full">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Relationship</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Date Of Birth</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Dependence Degree</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">Compensation</th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-gray-700">
                {data.dependents.map((d, index) => (
                  <tr key={index} className="hover:bg-surface-dark transition-colors duration-150">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-textSecondary">{d.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-textSecondary">{d.relationship}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-textSecondary">{d.date_of_birth}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-textSecondary">{d.degree_of_dependence}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-success font-medium">{money(d.compensation_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-surface-dark p-3 rounded-md text-sm">
            <p className="text-textSecondary">No dependents/applicants found for this claim.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompensationBreakupDetailsView;
