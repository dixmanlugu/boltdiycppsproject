import React, { useState, useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { supabase } from '../../services/supabase';

const normalizeStoragePath = (p?: string) => {
  if (!p) return '';
  if (p.startsWith('http')) return p;        // already a URL, use as-is
  let s = p.replace(/^\/+/, '');             // remove leading slash(es)
  s = s.replace(/^(?:cpps\/)+/i, '');        // remove leading "cpps/" (even if repeated)
  return s;
};

// Safe accessors for rendering
const s = (v: unknown) => (v ?? '') as string;                         // strings/dates/selects/textarea
const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0); // number inputs
const b = (v: unknown) => !!v;                                            // checkboxes



interface NewForm11Props {
  workerId: string;
  onClose: () => void;
}

interface Form11Data {
  // Worker Personal Details (pre-filled)
  WorkerID: string;
  WorkerFirstName: string;
  WorkerLastName: string;
  WorkerDOB: string;
  WorkerGender: string;
  WorkerMarried: string;
  WorkerHanded: string;
  WorkerPlaceOfOriginVillage: string;
  WorkerPlaceOfOriginDistrict: string;
  WorkerPlaceOfOriginProvince: string;
  WorkerAddress1: string;
  WorkerAddress2: string;
  WorkerCity: string;
  WorkerProvince: string;
  WorkerPOBox: string;
  WorkerEmail: string;
  WorkerMobile: string;
  WorkerLandline: string;
	WorkerPassportPhoto?: string;

  // Employment Details
  EmploymentID: string;
  Occupation: string;
  PlaceOfEmployment: string;
  NatureOfEmployment: string;
  AverageWeeklyWage: number;
  WeeklyPaymentRate: number;
  WorkedUnderSubContractor: boolean;
  SubContractorOrganizationName: string;
  SubContractorLocation: string;
  SubContractorNatureOfBusiness: string;

  // Incident Details
  IncidentDate: string;
  IncidentLocation: string;
  IncidentProvince: string;
  IncidentRegion: string;
  NatureExtentInjury: string;
  InjuryCause: string;
  HandInjury: boolean;
  InjuryMachinery: boolean;
  MachineType: string;
  MachinePartResponsible: string;
  MachinePowerSource: string;
  GradualProcessInjury: boolean;

  // Dependant Details
  SpouseFirstName: string;
  SpouseLastName: string;
  SpouseDOB: string;
  SpousePlaceOfOriginVillage: string;
  SpousePlaceOfOriginDistrict: string;
  SpousePlaceOfOriginProvince: string;
  SpouseAddress1: string;
  SpouseAddress2: string;
  SpouseCity: string;
  SpouseProvince: string;
  SpousePOBox: string;
  SpouseEmail: string;
  SpouseMobile: string;
  SpouseLandline: string;
  WorkerHaveDependants: boolean;

  // Insurance Details
  InsuranceProviderIPACode: string;
  InsuranceCompanyOrganizationName: string;
  InsuranceCompanyAddress1: string;
  InsuranceCompanyAddress2: string;
  InsuranceCompanyCity: string;
  InsuranceCompanyProvince: string;
  InsuranceCompanyPOBox: string;
  InsuranceCompanyLandLine: string;

  // Form Attachments
  ImageName: string;
  PublicUrl: string;
  IMR: string; // Interim medical report
  FMR: string; // Final medical report
  SEC43: string; // Section 43 application form
  SS: string; // Supervisor statement
  WS: string; // Witness statement
  IWS: string; // Injured worker's statement
  PTA: string; // Payslip at time of accident
  TR: string; // Treatment records
  PAR: string; // Police accident report
  
  // System fields
  DisplayIRN: string;
  TimeBarred: boolean;
  FirstSubmissionDate: string;
  IncidentType: string;
}





const NewForm11: React.FC<NewForm11Props> = ({ workerId, onClose }) => {
  const [currentTab, setCurrentTab] = useState(1);
  const [formData, setFormData] = useState<Form11Data>({
    // Initialize with default values
    WorkerID: workerId,
    WorkerFirstName: '',
    WorkerLastName: '',
    WorkerDOB: '',
    WorkerGender: '',
    WorkerMarried: '',
    WorkerHanded: 'Right',
    WorkerPlaceOfOriginVillage: '',
    WorkerPlaceOfOriginDistrict: '',
    WorkerPlaceOfOriginProvince: '',
    WorkerAddress1: '',
    WorkerAddress2: '',
    WorkerCity: '',
    WorkerProvince: '',
    WorkerPOBox: '',
    WorkerEmail: '',
    WorkerMobile: '',
    WorkerLandline: '',
    EmploymentID: '',
    Occupation: '',
    PlaceOfEmployment: '',
    NatureOfEmployment: '',
    AverageWeeklyWage: 0,
    WeeklyPaymentRate: 0,
    WorkedUnderSubContractor: false,
    SubContractorOrganizationName: '',
    SubContractorLocation: '',
    SubContractorNatureOfBusiness: '',
    IncidentDate: '',
    IncidentLocation: '',
    IncidentProvince: '',
    IncidentRegion: '',
    NatureExtentInjury: '',
    InjuryCause: '',
    HandInjury: false,
    InjuryMachinery: false,
    MachineType: '',
    MachinePartResponsible: '',
    MachinePowerSource: '',
    GradualProcessInjury: false,
    SpouseFirstName: '',
    SpouseLastName: '',
    SpouseDOB: '',
    SpousePlaceOfOriginVillage: '',
    SpousePlaceOfOriginDistrict: '',
    SpousePlaceOfOriginProvince: '',
    SpouseAddress1: '',
    SpouseAddress2: '',
    SpouseCity: '',
    SpouseProvince: '',
    SpousePOBox: '',
    SpouseEmail: '',
    SpouseMobile: '',
    SpouseLandline: '',
    WorkerHaveDependants: false,
    InsuranceProviderIPACode: '',
    InsuranceCompanyOrganizationName: '',
    InsuranceCompanyAddress1: '',
    InsuranceCompanyAddress2: '',
    InsuranceCompanyCity: '',
    InsuranceCompanyProvince: '',
    InsuranceCompanyPOBox: '',
    InsuranceCompanyLandLine: '',
    ImageName: '',
    PublicUrl: '',
    IMR: '',
    FMR: '',
    SEC43: '',
    SS: '',
    WS: '',
    IWS: '',
    PTA: '',
    TR: '',
    PAR: '',
    DisplayIRN: '',
    TimeBarred: false,
    FirstSubmissionDate: new Date().toISOString(),
    IncidentType: 'Injury',
		WorkerPassportPhoto: '', // ADDEDWorkerPassportPhoto: '', // ADDED
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<{ DKey: string; DValue: string }[]>([]);
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
  const [dependants, setDependants] = useState<any[]>([]);
  const [workHistory, setWorkHistory] = useState<any[]>([]);
  const [currentemployerData, setCurrentemployerData] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File}>({});
  const [generatedFileNames, setGeneratedFileNames] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState<string | null>(null);

// put this utility inside the component (or a utils file)
const sanitizeForForm = <T extends Record<string, any>>(
  base: T, // your initial defaults (formData initial state)
  incoming: Partial<T>
): Partial<T> => {
  const out: Partial<T> = {};
  const merged = { ...incoming };
  for (const k in merged) {
    const v = merged[k];
    const baseV = (base as any)[k];

    // decide by the type of your initial defaults
    if (typeof baseV === 'string') {
      (out as any)[k] = v == null ? '' : String(v);
    } else if (typeof baseV === 'number') {
      (out as any)[k] = v == null || v === '' ? 0 : Number(v);
    } else if (typeof baseV === 'boolean') {
      (out as any)[k] = !!v;
    } else {
      // for objects/arrays or anything else, leave as-is unless null/undefined
      (out as any)[k] = v ?? baseV ?? '';
    }
  }
  return out;
};

// Image/file preview helpers & state (add after your existing useStates)
const [scanUrl, setScanUrl] = useState<string>('');                     // remote Form11 scan preview
const [isScanOpen, setIsScanOpen] = useState<boolean>(false);           // lightbox for Form11 scan
const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({}); // remote previews per key

// Local (pre-upload) previews – shown immediately on file select
const [scanLocalUrl, setScanLocalUrl] = useState<string>('');           // local Form11 scan preview
const [attachmentLocalPreviews, setAttachmentLocalPreviews] = useState<Record<string, string>>({}); // local previews

const [openAttachmentKey, setOpenAttachmentKey] = useState<string | null>(null);

// tiny helpers
const isImagePath = (p?: string) => /\.(png|jpe?g|gif|webp)$/i.test(p || '');

const resolveStorageUrl = async (rawPath: string): Promise<string | null> => {
  try {
    if (!rawPath) return null;
    if (/^https?:\/\//i.test(rawPath)) return rawPath;       // already a URL
    const path = normalizeStoragePath(rawPath);              // your util above
    if (!path) return null;
    const { data: pub } = supabase.storage.from('cpps').getPublicUrl(path);
    if (pub?.publicUrl) return pub.publicUrl;
    const { data: signed } = await supabase.storage.from('cpps').createSignedUrl(path, 60 * 60 * 24);
    return signed?.signedUrl ?? null;
  } catch (e) {
    console.error('resolveStorageUrl failed', rawPath, e);
    return null;
  }
};


	
// Helper: load insurance company details by IPA code and push into formData
const loadInsuranceByIPACode = async (ipaCode?: string | null) => {
  try {
    if (!ipaCode) {
      // clear insurance details if none
      setFormData(prev => ({
        ...prev,
        InsuranceProviderIPACode: '',
        InsuranceCompanyOrganizationName: '',
        InsuranceCompanyAddress1: '',
        InsuranceCompanyAddress2: '',
        InsuranceCompanyCity: '',
        InsuranceCompanyProvince: '',
        InsuranceCompanyPOBox: '',
        InsuranceCompanyLandLine: '',
      }));
      return;
    }

    const { data: provider, error: providerErr } = await supabase
      .from('insurancecompanymaster')
      .select('IPACODE, InsuranceCompanyOrganizationName, InsuranceCompanyAddress1, InsuranceCompanyAddress2, InsuranceCompanyCity, InsuranceCompanyProvince, InsuranceCompanyPOBox, InsuranceCompanyLandLine')
      .eq('IPACODE', ipaCode)
      .single();

    if (providerErr) throw providerErr;

    setFormData(prev => ({
      ...prev,
      InsuranceProviderIPACode: provider.IPACODE,
      InsuranceCompanyOrganizationName: provider.InsuranceCompanyOrganizationName || '',
      InsuranceCompanyAddress1: provider.InsuranceCompanyAddress1 || '',
      InsuranceCompanyAddress2: provider.InsuranceCompanyAddress2 || '',
      InsuranceCompanyCity: provider.InsuranceCompanyCity || '',
      InsuranceCompanyProvince: provider.InsuranceCompanyProvince || '',
      InsuranceCompanyPOBox: provider.InsuranceCompanyPOBox || '',
      InsuranceCompanyLandLine: provider.InsuranceCompanyLandLine || '',
    }));
  } catch (e) {
    console.error('Failed to load insurance by IPACode:', e);
    // keep whatever is already in the form rather than hard failing UI
  }
};


	
  // Auto-populate region when province changes
  useEffect(() => {
    const fetchRegion = async () => {
      if (!formData.IncidentProvince) {
        setFormData(prev => ({ ...prev, IncidentRegion: '' }));
        return;
      }

      try {
        const { data: regionData, error: regionError } = await supabase
          .from('dictionary')
          .select('DValue')
          .eq('DType', 'ProvinceRegion')
          .eq('DKey', formData.IncidentProvince)
          .single();

        if (regionError) {
          if (regionError.code === 'PGRST116') {
            // No region found for this province
            setFormData(prev => ({ ...prev, IncidentRegion: '' }));
            return;
          }
          throw regionError;
        }

        setFormData(prev => ({ ...prev, IncidentRegion: regionData.DValue }));

      } catch (err) {
        console.error('Error fetching region:', err);
        setFormData(prev => ({ ...prev, IncidentRegion: '' }));
      }
    };

    fetchRegion();
  }, [formData.IncidentProvince]);


// ADDED: holds a public URL for the passport image & preview modal
const [passportUrl, setPassportUrl] = useState<string>('');
const [isPhotoOpen, setIsPhotoOpen] = useState<boolean>(false);


interface SaveSummary {
  irn: number | string;
  crn: string;
  incidentType: string;
  submitDate: string; // ISO date or formatted
  workerId: string;
  workerName: string;
}

const [showSummary, setShowSummary] = useState(false);
const [summary, setSummary] = useState<SaveSummary | null>(null);


// Form 11 scan (remote) whenever ImageName path changes (but prefer local preview)
useEffect(() => {
  if (scanLocalUrl) return;  // local takes precedence
  (async () => {
    const path = s((formData as any).ImageName);
    if (path && isImagePath(path)) {
      const url = await resolveStorageUrl(path);
      setScanUrl(url || '');
    } else {
      setScanUrl('');
    }
  })();
}, [formData.ImageName, scanLocalUrl]);

// Supporting documents (remote) for image paths; prefer local previews if present
useEffect(() => {
  (async () => {
    const keys = ['IMR','FMR','SEC43','SS','WS','IWS','PTA','TR','PAR','F18','MEX','MISC','DED'];
    const updates: Record<string, string> = {};
    for (const key of keys) {
      if (attachmentLocalPreviews[key]) continue;       // local beats remote
      const path = s((formData as any)[key]);
      if (!path || !isImagePath(path)) continue;
      if (attachmentPreviews[key]) continue;            // already resolved
      const url = await resolveStorageUrl(path);
      if (url) updates[key] = url;
    }
    if (Object.keys(updates).length) {
      setAttachmentPreviews(prev => ({ ...prev, ...updates }));
    }
  })();
}, [formData, attachmentPreviews, attachmentLocalPreviews]);

	useEffect(() => {
  return () => {
    try { if (scanLocalUrl) URL.revokeObjectURL(scanLocalUrl); } catch {}
    Object.values(attachmentLocalPreviews).forEach(url => { try { URL.revokeObjectURL(url); } catch {} });
  };
}, [scanLocalUrl, attachmentLocalPreviews]);



  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch worker personal details
        const { data: workerData, error: workerError } = await supabase
          .from('workerpersonaldetails')
          .select('*')
          .eq('WorkerID', workerId)
          .single();

        if (workerError) throw workerError;

        // Fetch current employment details
				{/*}    const { data: employmentData, error: employmentError } = await supabase
          .from('currentemploymentdetails')
          .select('*')
          .eq('WorkerID', workerId)
          .single();

        if (employmentError) throw employmentError; */}


  // After: const { data: workerData, error: workerError } = await supabase...
// --- Build a usable URL for the passport photo ---
const rawPath = workerData?.WorkerPassportPhoto || '';
const path = normalizeStoragePath(rawPath);

if (path) {
  try {
    const { data: pub } = supabase.storage.from('cpps').getPublicUrl(path);
    const publicUrl = pub?.publicUrl;

    if (publicUrl) {
      // Probe; if private bucket, fallback to signed URL
      fetch(publicUrl, { method: 'HEAD' }).then((res) => {
        if (res.ok) {
          setPassportUrl(publicUrl);
        } else {
          supabase.storage.from('cpps').createSignedUrl(path, 60 * 60 * 24)
            .then(({ data: signed }) => signed?.signedUrl && setPassportUrl(signed.signedUrl));
        }
      }).catch(() => {
        supabase.storage.from('cpps').createSignedUrl(path, 60 * 60 * 24)
          .then(({ data: signed }) => signed?.signedUrl && setPassportUrl(signed.signedUrl));
      });
    }
  } catch (e) {
    console.error('Passport URL resolution failed:', e);
  }
}



   console.log('Worker passport path:',workerData.WorkerPassportPhoto);     

        // Fetch provinces
 // Fetch provinces
const { data: provinceData, error: provinceError } = await supabase
  .from('dictionary')
  .select('DKey, DValue')
  .eq('DType', 'Province');
if (provinceError) throw provinceError;
setProvinces(provinceData || []);

// Fetch current employment details (includes InsuranceIPACode)
const { data: employmentData, error: employmentError } = await supabase
  .from('currentemploymentdetails')
  .select('*')
  .eq('WorkerID', workerId)
  .single();
if (employmentError) throw employmentError;

// Optional: fallback provider from employer if employment missing IPA code
let employerIPACode: string | null = null;
if (employmentData?.EmployerCPPSID) {
  const { data: employermasterData, error: employermasterError } = await supabase
    .from('employermaster')
    .select('InsuranceProviderIPACode')
    .eq('CPPSID', employmentData.EmployerCPPSID)
    .single();
  if (employermasterError && employermasterError.code !== 'PGRST116') {
    throw employermasterError;
  }
  employerIPACode = employermasterData?.InsuranceProviderIPACode ?? null;
}

// Insurance list for dropdown
const { data: insuranceData, error: insuranceError } = await supabase
  .from('insurancecompanymaster')
  .select('IPACODE, InsuranceCompanyOrganizationName');
if (insuranceError) throw insuranceError;
setInsuranceProviders(insuranceData || []);

// Dependants (MUST be before building `merged`)
const { data: dependantData, error: dependantError } = await supabase
  .from('dependantpersonaldetails')
  .select('*')
  .eq('WorkerID', workerId);
if (dependantError) throw dependantError;
setDependants(dependantData || []);

// Work history (order here is fine)
const { data: historyData, error: historyError } = await supabase
  .from('workhistory')
  .select('*')
  .eq('WorkerID', workerId);
if (historyError) throw historyError;
setWorkHistory(historyData || []);

// Build the merged payload (dependantData now defined)
const merged = {
  ...formData,
  ...workerData,
  ...employmentData,
  WorkerHaveDependants: (dependantData || []).length > 0,
};

// Sanitize once so there are no undefined/nulls
const sanitized = {
  ...formData,
  ...sanitizeForForm(formData, merged),
};

// 1) Set the base form data first
setFormData(sanitized);

// 2) THEN load insurance details so they aren't overwritten
const ipaFromEmployment = employmentData?.InsuranceIPACode || employerIPACode || null;
await loadInsuranceByIPACode(ipaFromEmployment);

// (optional) fetch full employer object for other UI fields
if (employmentData?.EmployerCPPSID) {
  const { data: employerData, error: employerError } = await supabase
    .from('employermaster')
    .select('*')
    .eq('CPPSID', employmentData.EmployerCPPSID)
    .single();
  if (!employerError && employerData) {
    setCurrentemployerData(employerData);
  }
}




      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load worker details');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [workerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Upload all selected files first
      const uploadedFilePaths: {[key: string]: string} = {};
      
      for (const [fieldName, file] of Object.entries(selectedFiles)) {
        if (file && generatedFileNames[fieldName]) {
          const folderMapping: {[key: string]: string} = {
            'IMR': '/attachments/formattachments/IMR/',
            'FMR': '/attachments/formattachments/FMR/',
            'SEC43': '/attachments/formattachments/SEC43/',
            'SS': '/attachments/formattachments/Supervisorstatement/',
            'WS': '/attachments/formattachments/Witnessstatement/',
            'IWS': '/attachments/formattachments/Injuredworkerstatement/',
            'PTA': '/attachments/formattachments/Payslipattimeofaccident/',
            'TR': '/attachments/formattachments/Treatmentrecords/',
            'PAR': '/attachments/formattachments/Policeaccidentreport/',
            'F18': '/attachments/formattachments/Form18Scan/',
            'MEX': '/attachments/formattachments/MedicalExpenses/',
            'MISC': '/attachments/formattachments/MiscExpenses/',
            'DED': '/attachments/formattachments/Deductions/'
          };
          
          const folderPath = folderMapping[fieldName] || 'attachments/form11scan/';
          const fileName = generatedFileNames[fieldName];
          const filePath = `${folderPath}${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('cpps')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error(`Failed to upload ${fieldName}: ${uploadError.message}`);
          }
          
          uploadedFilePaths[fieldName] = filePath;
          console.log(`Successfully uploaded ${fieldName} to:`, filePath);
        }
      }

    // === UPDATE WEEKLY PAYMENT RATE ===
      {/*}   const { error: employmentUpdateError } = await supabase
      .from('currentemploymentdetails')
      .update({ AverageWeeklyWage: currentemployerData.AverageWeeklyWage, WeeklyPaymentRate: currentemployerData.WeeklyPaymentRate })
      .eq('WorkerID', formData.WorkerID);

    if (employmentUpdateError) throw employmentUpdateError; */}



      
      // Update form data with uploaded file paths
      const finalFormData = {
        ...formData,
        ...uploadedFilePaths
      };

      // Check if incident date is more than 365 days old
      const incidentDate = new Date(finalFormData.IncidentDate);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24));
      const isTimeBarred = daysDiff > 365;

      // Save to form1112master
      const { data: form1112Data, error: form1112Error } = await supabase
        .from('form1112master')
        .insert([{
          DisplayIRN: formData.DisplayIRN,
          WorkerID: formData.WorkerID,
          IncidentDate: formData.IncidentDate,
          IncidentLocation: formData.IncidentLocation,
          IncidentProvince: formData.IncidentProvince,
          IncidentRegion: formData.IncidentRegion,
          NatureExtentInjury: formData.NatureExtentInjury,
          InjuryCause: formData.InjuryCause,
          InjuryMachinery: formData.InjuryMachinery ? 1 : 0,
          MachineType: formData.MachineType,
          MachinePartResponsible: formData.MachinePartResponsible,
          MachinePowerSource: formData.MachinePowerSource,
          GradualProcessInjury: formData.GradualProcessInjury ? 1 : 0,
          IncidentType: formData.IncidentType,
          ImageName: formData.ImageName,
          PublicUrl: formData.PublicUrl,
          TimeBarred: isTimeBarred ? 'Yes' : 'No',
          HandInjury: formData.HandInjury ? 1 : 0,
          FirstSubmissionDate: new Date().toISOString().split('T')[0],
          InsuranceProviderIPACode: formData.InsuranceProviderIPACode
        }])
        .select()
        .single();

      if (form1112Error) throw form1112Error;

      // Get the new IRN and FirstSubmissionDate after insertion
      const newIRN = form1112Data.IRN;
      const firstSubmissionDate = form1112Data.FirstSubmissionDate;

      // Get OrganizationType from employermaster
      const { data: employerData, error: employerError } =await supabase
        .from('employermaster')
        .select('OrganizationType')
        .eq('CPPSID', formData.EmployerCPPSID)
        .single();

      if (employerError) throw employerError;

      // Get minIRN for this month & year
      const { data: minIrnRow, error: minIrnError } = await supabase
        .from('form1112master')
        .select('IRN')
        .gte('FirstSubmissionDate', new Date(new Date(firstSubmissionDate).getFullYear(), new Date(firstSubmissionDate).getMonth(), 1).toISOString())
        .lte('FirstSubmissionDate', new Date(new Date(firstSubmissionDate).getFullYear(), new Date(firstSubmissionDate).getMonth() + 1, 0, 23, 59, 59, 999).toISOString())
        .order('IRN', { ascending: true })
        .limit(1)
        .single();

      if (minIrnError) throw minIrnError;

      const minIRN = minIrnRow ? minIrnRow.IRN : newIRN;
      const currentIRN = (newIRN - minIRN) + 1;

      // Pad digitCounter
      const digitCounter = String(currentIRN).padStart(3, '0');

      // Format date part (SECOND PARAM)
      const dateObj = new Date(firstSubmissionDate);
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = String(dateObj.getFullYear()).slice(-2);
      const firstSubDateStr = `${month}${year}`;

      // Get org type
      let otype = '';
      if (employerData.OrganizationType && employerData.OrganizationType.toLowerCase() === 'private') {
        otype = employerData.OrganizationType.toUpperCase();
      } else {
        otype = "STATE";
      }
      const ot = otype.substring(0, 2);

      // Province
      const incidentProv = (formData.IncidentProvince || '').substring(0, 3).toUpperCase();

      // Incident date
      const incidentDateObj = new Date(formData.IncidentDate);
      const iday = String(incidentDateObj.getDate()).padStart(2, '0');
      const imonth = String(incidentDateObj.getMonth() + 1).padStart(2, '0');
      const iyear = String(incidentDateObj.getFullYear()).slice(-2);
      const incidentDateStr = `${iday}${imonth}${iyear}`;

      // Build DisplayIRN
      const DisplayIRN = `${ot}-CRN-${digitCounter}${firstSubDateStr}-F11${incidentProv}${incidentDateStr}`;

      // Update Form1112Master with DisplayIRN
      const { error: updateError } = await supabase
        .from('form1112master')
        .update({ DisplayIRN })
        .eq('IRN', newIRN);

      if (updateError) throw updateError;

      // If time barred, create entry in timebarredclaimsregistrarreview
      if (isTimeBarred) {
        const { error: timeBarredError } = await supabase
          .from('timebarredclaimsregistrarreview')
          .insert([{
            IRN: form1112Data.IRN,
            TBCRRSubmissionDate: new Date().toISOString(),
            TBCRRFormType: 'Form11',
            TBCRRReviewStatus: 'Pending'
          }]);

        if (timeBarredError) throw timeBarredError;
      } else {
        // If not time barred, create entry in prescreeningreview
        const { error: prescreeningError } = await supabase
          .from('prescreeningreview')
          .insert([{
            IRN: form1112Data.IRN,
            PRHSubmissionDate: new Date().toISOString(),
            PRHFormType: 'Form11',
            PRHDecisionReason: 'Automatically Approved'
          }]);

        if (prescreeningError) throw prescreeningError;
      }

      // Save form attachments
      const attachments = [
        { type: 'Interim medical report', file: finalFormData.IMR },
        { type: 'Final medical report', file: finalFormData.FMR },
        { type: 'Section 43 application form', file: finalFormData.SEC43 },
        { type: 'Supervisor statement', file: finalFormData.SS },
        { type: 'Witness statement', file: finalFormData.WS },
        { type: 'Injured workers statement', file: finalFormData.IWS },
        { type: 'Payslip at time of accident', file: finalFormData.PTA },
        { type: 'Treatment records', file: finalFormData.TR },
        { type: 'Police accident report', file: finalFormData.PAR },
        { type: 'Form 18 Scan', file: finalFormData.F18 },
        { type: 'MedicalExpenses', file: finalFormData.MEX },
        { type: 'MiscExpenses', file: finalFormData.MISC },
        { type: 'Deductions', file: finalFormData.DED }
        
      ];

      for (const attachment of attachments) {
        if (attachment.file) {
          const { error: attachmentError } = await supabase
            .from('formattachments')
            .insert([{
              IRN: form1112Data.IRN,
              AttachmentType: attachment.type,
              FileName: attachment.file
            }]);

          if (attachmentError) throw attachmentError;
        }
      }

// After computing `finalFormData` and successful uploads, add:
setFormData(prev => ({ ...prev, ...uploadedFilePaths })); // triggers remote preview effects

			
     // setSuccess('Form 11 submitted successfully!');
     // onClose();
			
// Prepare & show the success summary modal
setSummary({
  irn: newIRN,
  crn: DisplayIRN,
  incidentType: formData.IncidentType,
  submitDate: firstSubmissionDate, // already an ISO string 'YYYY-MM-DD'
  workerId: formData.WorkerID,
  workerName: `${formData.WorkerFirstName || ''} ${formData.WorkerLastName || ''}`.trim()
});
setShowSummary(true);

// keep your original toast/inline success
setSuccess('Form 11 submitted successfully!');

			
			
//--------------------------
			
    } catch (err) {
      console.error('Error saving form:', err);
      setError('Failed to save form. Please try again.');
    } finally {
      setLoading(false);
    }

{success && (
  <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
    {success}
  </div>
)}





		
  };
const handleInsuranceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
  const code = e.target.value;
  setFormData(prev => ({ ...prev, InsuranceProviderIPACode: code }));
  await loadInsuranceByIPACode(code);
};




	
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

// REPLACE your current handleFileChange with this enhanced version:
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
  const file = e.target.files?.[0];

  // Revoke previous local previews for this field
  if (fieldName === 'ImageName' && scanLocalUrl) {
    try { URL.revokeObjectURL(scanLocalUrl); } catch {}
    setScanLocalUrl('');
  }
  if (attachmentLocalPreviews[fieldName]) {
    try { URL.revokeObjectURL(attachmentLocalPreviews[fieldName]); } catch {}
    setAttachmentLocalPreviews(prev => { const x = { ...prev }; delete x[fieldName]; return x; });
  }

  if (!file) {
    // Your original clearing logic (unchanged)
    setSelectedFiles(prev => { const nf = { ...prev }; delete nf[fieldName]; return nf; });
    setGeneratedFileNames(prev => { const nn = { ...prev }; delete nn[fieldName]; return nn; });
    setFormData(prev => ({ ...prev, [fieldName]: '' } as any));
    return;
  }

  try {
    // === Your original timestamped naming (kept) ===
    const currentDate = new Date();
    const day = String(currentDate.getDate()).padStart(2, '0');
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const year = currentDate.getFullYear();
    const hh = String(currentDate.getHours()).padStart(2, '0');
    const min = String(currentDate.getMinutes()).padStart(2, '0');
    const ss = String(currentDate.getSeconds()).padStart(2, '0');
    const datePrefix = `${day}${month}${year}`;
    const timestamp = `${hh}${min}${ss}`;

    const fileExt = file.name.split('.').pop();
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    const newFileName = `${datePrefix}_${timestamp}_${originalName}.${fileExt}`;

    const folderMapping: {[key: string]: string} = {
      'IMR': '/attachments/formattachments/IMR/',
      'FMR': '/attachments/formattachments/FMR/',
      'SEC43': '/attachments/formattachments/SEC43/',
      'SS': '/attachments/formattachments/Supervisorstatement/',
      'WS': '/attachments/formattachments/Witnessstatement/',
      'IWS': '/attachments/formattachments/Injuredworkerstatement/',
      'PTA': '/attachments/formattachments/Payslipattimeofaccident/',
      'TR': '/attachments/formattachments/Treatmentrecords/',
      'PAR': '/attachments/formattachments/Policeaccidentreport/',
      'F18': '/attachments/formattachments/Form18Scan/',
      'MEX': '/attachments/formattachments/MedicalExpenses/',
      'MISC': '/attachments/formattachments/MiscExpenses/',
      'DED': '/attachments/formattachments/Deductions/'
      // NOTE: intentionally NOT changing your default for others
    };
    const folderPath = folderMapping[fieldName] || '/attachments/form11scan/'; // keep your existing default
    const filePath = `${folderPath}${newFileName}`;

    // keep your existing state updates
    setSelectedFiles(prev => ({ ...prev, [fieldName]: file }));
    setGeneratedFileNames(prev => ({ ...prev, [fieldName]: newFileName }));
    setFormData(prev => ({ ...prev, [fieldName]: filePath } as any));

    // === New: local previews for images ===
    const ext = (fileExt || '').toLowerCase();
    const looksImage = file.type.startsWith('image/') || ['png','jpg','jpeg','gif','webp'].includes(ext);
    if (looksImage) {
      const blobUrl = URL.createObjectURL(file);
      if (fieldName === 'ImageName') setScanLocalUrl(blobUrl);
      else setAttachmentLocalPreviews(prev => ({ ...prev, [fieldName]: blobUrl }));
    }

    console.log(`File selected for upload to ${folderPath}:`, newFileName);
  } catch (err) {
    console.error('Error processing file:', err);
    setError('Failed to process file. Please try again.');
  }
};


  const renderWorkerPersonalDetails = () => (
    <div className="space-y-4">

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
  {/* Worker ID (read-only) */}
  <div>
    <label className="block text-sm font-medium text-gray-700">Worker ID</label>
    <input
      type="text"
      name="WorkerID"
      value={s(formData.WorkerID)}
      onChange={handleInputChange}
      className="input"
      readOnly
    />
  </div>

  {/* Passport Photo (thumbnail -> enlarge on click) */}
  <div className="md:col-span-2">
   <label className="block text-sm font-medium text-gray-700">Passport Photo</label>
{passportUrl ? (
  <img
    src={passportUrl}
    alt="Worker passport photo"
    className="w-48h-42rounded object-cover border cursor-zoom-in"
    onClick={() => setIsPhotoOpen(true)}
    loading="lazy"
  />
) : (
  <div className="w-24 h-24 rounded border grid place-content-center text-xs text-gray-500">
    No photo
  </div>
)}


    {/* Lightbox-style preview */}
    {isPhotoOpen && passportUrl && (
      <div
        className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
        onClick={() => setIsPhotoOpen(false)}
      >
        <img
          src={passportUrl}
          alt="Worker passport photo enlarged"
          className="max-h-[85vh] max-w-[90vw] rounded shadow-xl"
        />
      </div>
    )}
  </div>
</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">






				
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            name="WorkerFirstName"
            value={s(formData.WorkerFirstName)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            name="WorkerLastName"
            value={s(formData.WorkerLastName)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
						
            type="date"
            name="WorkerDOB"
            value={s(formData.WorkerDOB)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            name="WorkerGender"
            value={s(formData.WorkerGender)}
            onChange={handleInputChange}
            className="input"
            disabled
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Marital Status</label>
          <select
            name="WorkerMarried"
            value={s(formData.WorkerMarried)}
            onChange={handleInputChange}
            className="input"
            disabled
          >
            <option value="1">Married</option>
            <option value="0">Single</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Dominant Hand</label>
          <select
            name="WorkerHanded"
            value={s(formData.WorkerHanded)}
            onChange={handleInputChange}
            className="input"
            disabled
          >
            <option value="Right">Right</option>
            <option value="Left">Left</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
          <textarea
            name="WorkerAddress1"
            value={s(formData.WorkerAddress1)}
            onChange={handleInputChange}
            className="input"
            rows={3}
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
          <textarea
            name="WorkerAddress2"
            value={s(formData.WorkerAddress2)}
            onChange={handleInputChange}
            className="input"
            rows={3}
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">City</label>
          <input
            type="text"
            name="WorkerCity"
            value={s(formData.WorkerCity)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Province</label>
          <input
            type="text"
            name="WorkerProvince"
            value={s(formData.WorkerProvince)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">P.O. Box</label>
          <input
            type="text"
            name="WorkerPOBox"
            value={s(formData.WorkerPOBox)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="WorkerEmail"
            value={s(formData.WorkerEmail)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile</label>
          <input
            type="tel"
            name="WorkerMobile"
            value={s(formData.WorkerMobile)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Landline</label>
          <input
            type="tel"
            name="WorkerLandline"
            value={s(formData.WorkerLandline)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
      </div>
    </div>
  );

  const renderEmploymentDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Employment ID</label>
          <input
            type="text"
            name="EmploymentID"
            value={s(formData.EmploymentID)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Occupation</label>
          <input
            type="text"
            name="Occupation"
            value={s(formData.Occupation)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Place of Employment</label>
        <input
          type="text"
          name="PlaceOfEmployment"
          value={s(formData.PlaceOfEmployment)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Nature of Employment</label>
        <input
          type="text"
          name="NatureOfEmployment"
          value={s(formData.NatureOfEmployment)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Average Weekly Wage</label>
          <input
            type="number"
            name="AverageWeeklyWage"
            value={s(formData.AverageWeeklyWage)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Weekly Payment Rate</label>
          <input
            type="number"
            name="WeeklyPaymentRate"
            value={s(formData.WeeklyPaymentRate)}
            onChange={handleInputChange}
            className="input"
            disabled
          />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="WorkedUnderSubContractor"
            checked={b(formData.WorkedUnderSubContractor)}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Worked Under Sub-Contractor
          </label>
        </div>

        {formData.WorkedUnderSubContractor && (
          <div className="space-y-4 pl-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sub-Contractor Organization Name</label>
              <input
                type="text"
                name="SubContractorOrganizationName"
                value={s(formData.SubContractorOrganizationName)}
                onChange={handleInputChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sub-Contractor Location</label>
              <input
                type="text"
                name="SubContractorLocation"
                value={s(formData.SubContractorLocation)}
                onChange={handleInputChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nature of Business</label>
              <input
                type="text"
                name="SubContractorNatureOfBusiness"
                value={s(formData.SubContractorNatureOfBusiness)}
                onChange={handleInputChange}
                className="input"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderInjuryDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Incident Date</label>
          <input
            type="date"
            name="IncidentDate"
            value={s(formData.IncidentDate)}
            onChange={handleInputChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Incident Location</label>
          <input
            type="text"
            name="IncidentLocation"
            value={s(formData.IncidentLocation)}
            onChange={handleInputChange}
            className="input"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Province</label>
          <select
            name="IncidentProvince"
            value={s(formData.IncidentProvince)}
            onChange={handleInputChange}
            className="input"
            required
          >
            <option value="">Select Province</option>
            {provinces.map(province => (
              <option key={province.DValue} value={province.DValue}>
                {province.DValue}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Region</label>
          <input
            type="text"
            name="IncidentRegion"
            value={s(formData.IncidentRegion)}
            onChange={handleInputChange}
            className="input"
            readOnly
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Nature and Extent of Injury</label>
        <textarea
          name="NatureExtentInjury"
          value={s(formData.NatureExtentInjury)}
          onChange={handleInputChange}
          className="input"
          rows={3}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Cause of Injury</label>
        <textarea
          name="InjuryCause"
          value={s(formData.InjuryCause)}
          onChange={handleInputChange}
          className="input"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            name="HandInjury"
            checked={b(formData.HandInjury)}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Hand Injury
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="InjuryMachinery"
            checked={b(formData.InjuryMachinery)}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary border-gray-300 rounded"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Injury due to Machinery
          </label>
        </div>
      </div>

      {formData.InjuryMachinery && (
        <div className="space-y-4 border-l-4 border-primary pl-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Machine Type</label>
            <input
              type="text"
              name="MachineType"
              value={s(formData.MachineType)}
              onChange={handleInputChange}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Machine Part Responsible</label>
            <input
              type="text"
              name="MachinePartResponsible"
              value={s(formData.MachinePartResponsible)}
              onChange={handleInputChange}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Machine Power Source</label>
            <input
              type="text"
              name="MachinePowerSource"
              value={s(formData.MachinePowerSource)}
              onChange={handleInputChange}
              className="input"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderDependantDetails = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Spouse First Name</label>
        <input
          type="text"
          name="SpouseFirstName"
          value={s(formData.SpouseFirstName)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Spouse Last Name</label>
        <input
          type="text"
          name="SpouseLastName"
          value={s(formData.SpouseLastName)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Spouse Date of Birth</label>
        <input
          type="date"
          name="SpouseDOB"
          value={s(formData.SpouseDOB)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
    </div>

    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Spouse Address Line 1</label>
        <textarea
          name="SpouseAddress1"
          value={s(formData.SpouseAddress1)}
          onChange={handleInputChange}
          className="input"
          rows={3}
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Spouse Address Line 2</label>
        <textarea
          name="SpouseAddress2"
          value={s(formData.SpouseAddress2)}
          onChange={handleInputChange}
          className="input"
          rows={3}
          disabled
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">City</label>
        <input
          type="text"
          name="SpouseCity"
          value={s(formData.SpouseCity)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Province</label>
        <input
          type="text"
          name="SpouseProvince"
          value={s(formData.SpouseProvince)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">P.O. Box</label>
        <input
          type="text"
          name="SpousePOBox"
          value={s(formData.SpousePOBox)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          name="SpouseEmail"
          value={s(formData.SpouseEmail)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Mobile</label>
        <input
          type="tel"
          name="SpouseMobile"
          value={s(formData.SpouseMobile)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Landline</label>
        <input
          type="tel"
          name="SpouseLandline"
          value={s(formData.SpouseLandline)}
          onChange={handleInputChange}
          className="input"
          disabled
        />
      </div>
    </div>

    <div className="mt-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Other Dependants</h3>

      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          name="WorkerHaveDependants"
          checked={b(formData.WorkerHaveDependants)}
          onChange={handleInputChange}
          className="h-4 w-4 text-primary border-gray-300 rounded"
          disabled
        />
        <label className="ml-2 block text-sm text-gray-900">
          Worker has other dependants
        </label>
      </div>

      {formData.WorkerHaveDependants && dependants.length > 0 && (
        <div className="space-y-4">
          {dependants.map((dependant, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {dependant.DependantFirstName} {dependant.DependantLastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Relationship</label>
                  <p className="mt-1 text-sm text-gray-900">{dependant.DependantType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(dependant.DependantDOB).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);


  const renderWorkHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          name="GradualProcessInjury"
          checked={b(formData.GradualProcessInjury)}
          onChange={handleInputChange}
          className="h-4 w-4 text-primary border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Gradual Process Injury
        </label>
      </div>

      {formData.GradualProcessInjury && workHistory.length > 0 && (
        <div className="space-y-4">
          {workHistory.map((history, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                  <p className="mt-1 text-sm text-gray-900">{history.OrganizationName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Period</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(history.WorkerJoiningDate).toLocaleDateString()} - 
                    {history.WorkerLeavingDate ? new Date(history.WorkerLeavingDate).toLocaleDateString() : 'Present'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-sm text-gray-900">
                  {history.OrganizationAddress1}
                  {history.OrganizationAddress2 && <>, {history.OrganizationAddress2}</>}
                  {history.OrganizationCity && <>, {history.OrganizationCity}</>}
                  {history.OrganizationProvince && <>, {history.OrganizationProvince}</>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderInsuranceDetails = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Insurance Provider</label>
        <select
  name="InsuranceProviderIPACode"
  value={s(formData.InsuranceProviderIPACode)}
  onChange={handleInsuranceChange}
  className="input"
  required
>
  <option value="">Select Insurance Provider</option>
  {insuranceProviders.map(p => (
    <option key={p.IPACODE} value={p.IPACODE}>
      {p.InsuranceCompanyOrganizationName}
    </option>
  ))}
</select>

      </div>

      {formData.InsuranceProviderIPACode && (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
              <textarea
                name="InsuranceCompanyAddress1"
                value={s(formData.InsuranceCompanyAddress1)}
                onChange={handleInputChange}
                className="input"
                rows={3}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
              <textarea
                name="InsuranceCompanyAddress2"
                value={s(formData.InsuranceCompanyAddress2)}
                onChange={handleInputChange}
                className="input"
                rows={3}
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                name="InsuranceCompanyCity"
                value={s(formData.InsuranceCompanyCity)}
                onChange={handleInputChange}
                className="input"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Province</label>
              <input
                type="text"
                name="InsuranceCompanyProvince"
                value={s(formData.InsuranceCompanyProvince)}
                onChange={handleInputChange}
                className="input"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">P.O. Box</label>
              <input
                type="text"
                name="InsuranceCompanyPOBox"
                value={s(formData.InsuranceCompanyPOBox)}
                onChange={handleInputChange}
                className="input"
                readOnly
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Landline</label>
            <input
              type="text"
              name="InsuranceCompanyLandLine"
              value={s(formData.InsuranceCompanyLandLine)}
              onChange={handleInputChange}
              className="input"
              readOnly
            />
          </div>
        </>
      )}
    </div>
  );

  const renderWeeklyPayment = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Weekly Payment Rate</label>

				
        <input
          type="number"
          name="WeeklyPaymentRate"
          value={s(formData.WeeklyPaymentRate)}
          onChange={handleInputChange}
          className="input"
          required
        />
      </div>
    </div>
  );

  const renderForm11Scan = () => (
    <div className="space-y-4">
			{s(formData.ImageName) && (
  <p className="text-xs text-gray-600">
    Current scan: <span className="font-mono">{s(formData.ImageName)}</span>
  </p>
)}

{(scanLocalUrl || scanUrl) && (
  <div className="mt-2">
    <img
      src={scanLocalUrl || scanUrl}
      alt="Form 11 scan preview"
      className="w-40 h-40 rounded object-cover border cursor-zoom-in"
      onClick={() => setIsScanOpen(true)}
      loading="lazy"
    />
  </div>
)}

{isScanOpen && (scanLocalUrl || scanUrl) && (
  <div
    className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
    onClick={() => setIsScanOpen(false)}
  >
    <img
      src={scanLocalUrl || scanUrl}
      alt="Form 11 scan enlarged"
      className="max-h-[85vh] max-w-[90vw] rounded shadow-xl"
    />
  </div>
)}
      <div>
        <label className="block text-sm font-medium text-gray-700">Form 11 Scanned Image</label>


				
        <input
          type="file"
          name="ImageName"
          onChange={(e) => handleFileChange(e, 'ImageName')}
          className="input"
          accept=".png,.jpg,.pdf,.jpeg"
          required
        />
      </div>



			
    {/*  <div>
        <label className="block text-sm font-medium text-gray-700">Additional Form 11 Scan (Optional)</label>
        <input
          type="file"
          name="ImageName2"
          onChange={(e) => handleFileChange(e, 'ImageName2')}
          className="input"
          accept=".png,.jpg,.pdf,.jpeg"
        />
      </div> */}
    </div>
  );

 const renderSupportingDocuments = () => {
  // Key → Human label
  const docLabels: Record<string, string> = {
    IMR:  'Interim Medical Report',
    FMR:  'Final Medical Report',
    SEC43:'Section 43 Application Form',
    SS:   'Supervisor Statement (letterhead)',
    WS:   'Witness Statement',
    IWS:  "Injured Worker's Statement",
    PTA:  'Payslip at Time of Accident',
    TR:   'Treatment Records',
    PAR:  'Police Accident Report',
    F18:  'Form 18 Scan',
    MEX:  'Medical Expenses',
    MISC: 'Misc Expenses',
    DED:  'Deductions',
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Note: Images attached here must be more than 5 KB and less than 500 KB.
      </p>

      {Object.entries(docLabels).map(([key, label]) => {
        const path = s((formData as any)[key]);
        const preview = attachmentLocalPreviews[key] || attachmentPreviews[key];
        const isPdf = /\.pdf$/i.test(path || '');

        return (
          <div key={key} className="border rounded-lg p-4 space-y-2">
            {/* 1) Label */}
            <label className="block text-sm font-medium text-gray-900">
              {label}
            </label>

            {/* (optional) show the current storage path */}
            {path && (
              <p className="text-xs text-gray-600">
                Path: <span className="font-mono">{path}</span>
                {isPdf && <span className="ml-2 italic text-gray-500">(PDF – no image preview)</span>}
              </p>
            )}

            {/* 2) Image preview (if available & not PDF) */}
            {!isPdf && preview && (
              <>
                <img
                  src={preview}
                  alt={`${label} preview`}
                  className="w-40 h-40 rounded object-cover border cursor-zoom-in"
                  onClick={() => setOpenAttachmentKey(key)}
                  loading="lazy"
                />

                {openAttachmentKey === key && (
                  <div
                    className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setOpenAttachmentKey(null)}
                  >
                    <img
                      src={preview}
                      alt={`${label} enlarged`}
                      className="max-h-[85vh] max-w-[90vw] rounded shadow-xl"
                    />
                  </div>
                )}
              </>
            )}

            {/* 3) Select button (file input) */}
            <div className="pt-1">
              <input
                type="file"
                name={key}
                onChange={(e) => handleFileChange(e, key)}
                className="input"
                accept=".png,.jpg,.pdf,.jpeg"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};


  const renderTabContent = () => {
    switch (currentTab) {
      case 1:
        return renderWorkerPersonalDetails();
      case 2:
        return renderEmploymentDetails();
      case 3:
        return renderInjuryDetails();
      case 4:
        return renderDependantDetails();
      case 5:
        return renderWorkHistory();
      case 6:
        return renderInsuranceDetails();
      case 7:
        return renderWeeklyPayment();
      case 8:
        return renderForm11Scan();
      case 9:
        return renderSupportingDocuments();
      default:
        return null;
    }
  };

  const tabs = [
    'Worker Personal Details',
    'Details of Employment',
    'Details of Injury',
    'Details of Dependants',
    'Other Employment Details',
    'Insurance Details',
    'Weekly Payment',
    'Form11 Scan',
    'Supporting Documents'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">New Form 11</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="flex space-x-2 overflow-x-auto pb-4 mb-6">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => setCurrentTab(index + 1)}
                className={`px-4 py-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors
                  ${currentTab === index + 1 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {renderTabContent()}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Submit Form'}
              </button>
            </div>
          </form>

{showSummary && summary && (
  <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
    {/* print-only styles */}
    <style>{`
      @media print {
        /* Hide everything by default */
        body * { visibility: hidden !important; }

        /* Only show the summary content */
        .print-area, .print-area * { visibility: visible !important; }

        /* Make the printed card layout naturally */
        .print-area {
          position: static !important;
          inset: auto !important;
          box-shadow: none !important;
          background: white !important;
        }

        /* Hide buttons/controls */
        .no-print { display: none !important; }
      }
    `}</style>

    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h3 className="font-semibold">Submission Summary</h3>
        <button className="p-2 hover:bg-gray-100 rounded no-print" onClick={() => setShowSummary(false)}>
          <X size={18} />
        </button>
      </div>

      {/* mark this block as the printable area */}
      <div className="p-5 space-y-2 text-sm print-area" id="summary-content">
        {/* Adjust the fields below only if your Form 11 summary shape differs */}
        <div className="flex justify-between">
          <span className="text-gray-600">IRN</span>
          <span className="font-medium">{summary.irn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">CRN</span>
          <span className="font-medium">{summary.crn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Incident Type</span>
          <span className="font-medium">{summary.incidentType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">First Submission Date</span>
          <span className="font-medium">{summary.submitDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Worker</span>
          <span className="font-medium">
            {summary.workerName} ({summary.workerId})
          </span>
        </div>
      </div>

      <div className="px-5 pb-5 pt-2 flex justify-end gap-2 no-print">


        <button
          type="button"
          className="px-3 py-1.5 rounded border"
          onClick={() => {
            try { document.getElementById("summary-content")?.scrollIntoView({ block: "center" }); } catch {}
            window.print();
          }}
          title="Open system print dialog"
        >
          Print
        </button>

        <button
          type="button"
          className="px-3 py-1.5 rounded bg-blue-600 text-white"
          onClick={() => {
            setShowSummary(false);
            onClose();
          }}
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}




					
        </div>
      </div>
    </div>
  );
};

export default NewForm11;
