import React, { useEffect, useMemo, useState } from "react";
import { X, Printer } from "lucide-react";
import { supabase } from "../../services/supabase";

/**
 * ViewForm11.tsx
 * Read-only, printable "View mode" for Form 11 (Injury)
 * - Resolves WorkerID/DisplayIRN from workerirn when not passed
 * - Guards all queries to avoid eq('WorkerID', undefined)
 */

// -----------------------------
// Helpers
// -----------------------------
const normalizeStoragePath = (p?: string) => {
  if (!p) return "";
  if (p.startsWith("http")) return p; // already URL
  let s = p.replace(/^\/*/, ""); // trim leading slashes
  s = s.replace(/^(?:cpps\/+)+/i, ""); // strip leading 'cpps/'
  return s;
};

const isImagePath = (p?: string) => /\.(png|jpe?g|gif|webp)$/i.test(p || "");
const s = (v: unknown) => (v ?? "") as string;
const n = (v: unknown) =>
  typeof v === "number" && isFinite(v as number) ? (v as number) : 0;
const b = (v: unknown) => !!v;

const resolveStorageUrl = async (rawPath: string): Promise<string | null> => {
  try {
    if (!rawPath) return null;
    if (/^https?:\/\//i.test(rawPath)) return rawPath;
    const path = normalizeStoragePath(rawPath);
    if (!path) return null;
    const { data: pub } = supabase.storage.from("cpps").getPublicUrl(path);
    if (pub?.publicUrl) return pub.publicUrl;
    const { data: signed } = await supabase.storage
      .from("cpps")
      .createSignedUrl(path, 60 * 60 * 24);
    return signed?.signedUrl ?? null;
  } catch (e) {
    console.error("resolveStorageUrl failed:", e);
    return null;
  }
};

// -----------------------------
// Types
// -----------------------------
export interface ViewForm11Props {
  irn?: number | string | null;     // optional, we can resolve via workerId
  workerId?: string | null;         // optional, we can resolve via workerirn using IRN
  onClose: () => void;
}

interface Form11Data {
  // Worker Personal Details
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

  // Employment
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

  // Incident (Form11)
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

  // Dependants (snapshot)
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

  // Insurance
  InsuranceProviderIPACode: string;
  InsuranceCompanyOrganizationName: string;
  InsuranceCompanyAddress1: string;
  InsuranceCompanyAddress2: string;
  InsuranceCompanyCity: string;
  InsuranceCompanyProvince: string;
  InsuranceCompanyPOBox: string;
  InsuranceCompanyLandLine: string;

  // Attachments (paths in storage)
  ImageName: string;
  PublicUrl: string;
  IMR: string;
  FMR: string;
  SEC43: string;
  SS: string;
  WS: string;
  IWS: string;
  PTA: string;
  TR: string;
  PAR: string;
  F18?: string;
  MEX?: string;
  MISC?: string;
  DED?: string;

  // System fields
  DisplayIRN: string;
  TimeBarred: boolean | string;
  FirstSubmissionDate: string;
  IncidentType: string;
}

// -----------------------------
// Component
// -----------------------------
const ViewForm11: React.FC<ViewForm11Props> = ({ irn, workerId: workerIdProp, onClose }) => {
  // header resolution state
  const [workerId, setWorkerId] = useState<string | null>(workerIdProp ?? null);
  const [displayIRN, setDisplayIRN] = useState<string | null>(null);
  const [resolvedIRN, setResolvedIRN] = useState<number | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);
  const [headerError, setHeaderError] = useState<string | null>(null);

  // body data state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIRN, setEditingIRN] = useState<number | null>(null);

  const [formData, setFormData] = useState<Form11Data>({
    WorkerID: workerId ?? "",
    WorkerFirstName: "",
    WorkerLastName: "",
    WorkerDOB: "",
    WorkerGender: "",
    WorkerMarried: "",
    WorkerHanded: "Right",
    WorkerPlaceOfOriginVillage: "",
    WorkerPlaceOfOriginDistrict: "",
    WorkerPlaceOfOriginProvince: "",
    WorkerAddress1: "",
    WorkerAddress2: "",
    WorkerCity: "",
    WorkerProvince: "",
    WorkerPOBox: "",
    WorkerEmail: "",
    WorkerMobile: "",
    WorkerLandline: "",
    WorkerPassportPhoto: "",

    EmploymentID: "",
    Occupation: "",
    PlaceOfEmployment: "",
    NatureOfEmployment: "",
    AverageWeeklyWage: 0,
    WeeklyPaymentRate: 0,
    WorkedUnderSubContractor: false,
    SubContractorOrganizationName: "",
    SubContractorLocation: "",
    SubContractorNatureOfBusiness: "",

    IncidentDate: "",
    IncidentLocation: "",
    IncidentProvince: "",
    IncidentRegion: "",
    NatureExtentInjury: "",
    InjuryCause: "",
    HandInjury: false,
    InjuryMachinery: false,
    MachineType: "",
    MachinePartResponsible: "",
    MachinePowerSource: "",
    GradualProcessInjury: false,

    SpouseFirstName: "",
    SpouseLastName: "",
    SpouseDOB: "",
    SpousePlaceOfOriginVillage: "",
    SpousePlaceOfOriginDistrict: "",
    SpousePlaceOfOriginProvince: "",
    SpouseAddress1: "",
    SpouseAddress2: "",
    SpouseCity: "",
    SpouseProvince: "",
    SpousePOBox: "",
    SpouseEmail: "",
    SpouseMobile: "",
    SpouseLandline: "",
    WorkerHaveDependants: false,

    InsuranceProviderIPACode: "",
    InsuranceCompanyOrganizationName: "",
    InsuranceCompanyAddress1: "",
    InsuranceCompanyAddress2: "",
    InsuranceCompanyCity: "",
    InsuranceCompanyProvince: "",
    InsuranceCompanyPOBox: "",
    InsuranceCompanyLandLine: "",

    ImageName: "",
    PublicUrl: "",
    IMR: "",
    FMR: "",
    SEC43: "",
    SS: "",
    WS: "",
    IWS: "",
    PTA: "",
    TR: "",
    PAR: "",
    F18: "",
    MEX: "",
    MISC: "",
    DED: "",

    DisplayIRN: "",
    TimeBarred: false,
    FirstSubmissionDate: "",
    IncidentType: "Injury",
  });

  // Previews
  const [passportUrl, setPassportUrl] = useState("");
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const [scanUrl, setScanUrl] = useState("");
  const [isScanOpen, setIsScanOpen] = useState(false);

  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({});
  const [openAttachmentKey, setOpenAttachmentKey] = useState<string | null>(null);

  // Map attachment display types in DB -> our keys
  const attachmentTypeToKey: Record<string, string> = useMemo(
    () => ({
      "Interim medical report": "IMR",
      "Final medical report": "FMR",
      "Section 43 application form": "SEC43",
      "Supervisor statement": "SS",
      "Witness statement": "WS",
      "Injured workers statement": "IWS",
      "Payslip at time of accident": "PTA",
      "Treatment records": "TR",
      "Police accident report": "PAR",
      "Form 18 Scan": "F18",
      "MedicalExpenses": "MEX",
      "MiscExpenses": "MISC",
      "Deductions": "DED",
    }),
    []
  );

  // -----------------------------
  // 1) Resolve header: WorkerID + DisplayIRN + IRN (when needed)
  // -----------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setHeaderError(null);
        setHeaderLoading(true);

        // Normalize incoming irn to number when possible
        const irnNum =
          typeof irn === "number"
            ? irn
            : irn != null
            ? parseInt(String(irn), 10)
            : null;

        if (irnNum != null) {
          // We have IRN. Always fetch DisplayIRN. Fetch WorkerID only if missing.
          const sel = workerId ? "DisplayIRN" : "WorkerID, DisplayIRN";
          const { data, error } = await supabase
            .from("workerirn")
            .select(sel)
            .eq("IRN", irnNum)
            .eq("INCIDENTTYPE", "Injury")
            .maybeSingle();
          if (error) throw error;

          if (!alive) return;
          setDisplayIRN(data?.DisplayIRN ?? null);
          setResolvedIRN(irnNum);

          if (!workerId && data?.WorkerID) {
            setWorkerId(String(data.WorkerID));
            setFormData((prev) => ({ ...prev, WorkerID: String(data.WorkerID) }));
          }
        } else if (workerId) {
          // No IRN provided: get the *latest* Injury IRN for this worker
          const { data, error } = await supabase
            .from("form1112master")
            .select("IRN, DisplayIRN")
            .eq("WorkerID", workerId)
            .eq("IncidentType", "Injury")
            .order("IRN", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) throw error;

          if (!alive) return;
          if (data) {
            setResolvedIRN(Number(data.IRN));
            setDisplayIRN(data.DisplayIRN ?? null);
          } else {
            setResolvedIRN(null);
            setDisplayIRN(null);
          }
        } else {
          // neither IRN nor WorkerID => cannot resolve
          setResolvedIRN(null);
          setDisplayIRN(null);
          setHeaderError("Cannot resolve record: missing IRN and WorkerID.");
        }
      } catch (e: any) {
        if (!alive) return;
        console.error(e);
        setHeaderError(e.message ?? "Failed to resolve worker/IRN");
      } finally {
        if (alive) setHeaderLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [irn, workerId]);

  // -----------------------------
  // 2) Load body data once WorkerID (and ideally IRN) is known
  // -----------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!workerId) return; // guard — don't hit tables with undefined WorkerID

      try {
        setLoading(true);
        setError(null);

        // Worker
        const wpd = await supabase
          .from("workerpersonaldetails")
          .select("*")
          .eq("WorkerID", workerId)
          .maybeSingle();

        // Employment
        const ced = await supabase
          .from("currentemploymentdetails")
          .select("*")
          .eq("WorkerID", workerId)
          .maybeSingle();

        // Dependants
        const dpd = await supabase
          .from("dependantpersonaldetails")
          .select("*")
          .eq("WorkerID", workerId);

        // Work history
        const wh = await supabase
          .from("workhistory")
          .select("*")
          .eq("WorkerID", workerId);

        // Form 11/12 master (prefer resolvedIRN if present)
        let formRow: any = null;
        if (resolvedIRN != null) {
          const res = await supabase
            .from("form1112master")
            .select("*")
            .eq("IRN", resolvedIRN)
            .maybeSingle();
          if (res.error) throw res.error;
          formRow = res.data;
        } else {
          // fallback: latest for worker
          const res = await supabase
            .from("form1112master")
            .select("*")
            .eq("WorkerID", workerId)
            .eq("IncidentType", "Injury")
            .order("IRN", { ascending: false })
            .limit(1);
          if (res.error) throw res.error;
          formRow = res.data?.[0] ?? null;
        }

        if (!cancelled && formRow?.IRN) {
          setEditingIRN(Number(formRow.IRN));
        }

        // Merge snapshot -> formData (keep only known keys)
        const base = formData;
        const merged: any = {
          ...base,
          ...(wpd.data || {}),
          ...(ced.data || {}),
          ...(formRow || {}),
          WorkerHaveDependants: (dpd.data || []).length > 0,
        };
        const sanitized: any = {};
        for (const k in base) sanitized[k] = merged[k] ?? base[k];
        if (!cancelled) setFormData(sanitized as Form11Data);

        // Passport resolve
        const rawPath = (wpd.data as any)?.WorkerPassportPhoto || "";
        const path = normalizeStoragePath(rawPath);
        if (path) {
          try {
            const { data: pub } = supabase.storage.from("cpps").getPublicUrl(path);
            const publicUrl = pub?.publicUrl;
            if (publicUrl) {
              try {
                const head = await fetch(publicUrl, { method: "HEAD" });
                if (!cancelled) {
                  if (head.ok) setPassportUrl(publicUrl);
                  else {
                    const { data: signed } = await supabase.storage
                      .from("cpps")
                      .createSignedUrl(path, 60 * 60 * 24);
                    if (signed?.signedUrl) setPassportUrl(signed.signedUrl);
                  }
                }
              } catch {
                const { data: signed } = await supabase.storage
                  .from("cpps")
                  .createSignedUrl(path, 60 * 60 * 24);
                if (!cancelled && signed?.signedUrl) setPassportUrl(signed.signedUrl);
              }
            }
          } catch (e) {
            console.error("Passport URL resolution failed:", e);
          }
        }

        // Form 11 scan preview URL
        const imgPath = s((formRow || {}).ImageName || "");
        if (imgPath) {
          const url = await resolveStorageUrl(imgPath);
          if (!cancelled) setScanUrl(url || "");
        }

        // Insurance hydrate (by IPACODE)
        const ipa = (formRow || {}).InsuranceProviderIPACode || "";
        if (ipa) {
          try {
            const prov = await supabase
              .from("insurancecompanymaster")
              .select(
                "IPACODE, InsuranceCompanyOrganizationName, InsuranceCompanyAddress1, InsuranceCompanyAddress2, InsuranceCompanyCity, InsuranceCompanyProvince, InsuranceCompanyPOBox, InsuranceCompanyLandLine"
              )
              .eq("IPACODE", ipa)
              .maybeSingle();
            if (prov.data && !cancelled) {
              setFormData((prev) => ({
                ...prev,
                InsuranceProviderIPACode:
                  prov.data.IPACODE || prev.InsuranceProviderIPACode,
                InsuranceCompanyOrganizationName:
                  prov.data.InsuranceCompanyOrganizationName ||
                  prev.InsuranceCompanyOrganizationName,
                InsuranceCompanyAddress1:
                  prov.data.InsuranceCompanyAddress1 ||
                  prev.InsuranceCompanyAddress1,
                InsuranceCompanyAddress2:
                  prov.data.InsuranceCompanyAddress2 ||
                  prev.InsuranceCompanyAddress2,
                InsuranceCompanyCity:
                  prov.data.InsuranceCompanyCity || prev.InsuranceCompanyCity,
                InsuranceCompanyProvince:
                  prov.data.InsuranceCompanyProvince ||
                  prev.InsuranceCompanyProvince,
                InsuranceCompanyPOBox:
                  prov.data.InsuranceCompanyPOBox || prev.InsuranceCompanyPOBox,
                InsuranceCompanyLandLine:
                  prov.data.InsuranceCompanyLandLine ||
                  prev.InsuranceCompanyLandLine,
              }));
            }
          } catch (e) {
            console.error("Insurance hydrate failed", e);
          }
        }

        // Attachments
        if (!cancelled && (formRow?.IRN ?? resolvedIRN) != null) {
          await fetchAndHydrateAttachments(Number(formRow?.IRN ?? resolvedIRN));
        }
      } catch (e) {
        console.error("Initial load failed", e);
        if (!cancelled) setError("Failed to load form data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId, resolvedIRN]);

  // Load attachments (paths + image previews where applicable)
  const fetchAndHydrateAttachments = async (irnNum: number) => {
    try {
      const { data: rows, error } = await supabase
        .from("formattachments")
        .select("AttachmentType, FileName")
        .eq("IRN", irnNum);
      if (error) throw error;

      const newPaths: Partial<Form11Data> = {};
      const previewUpdates: Record<string, string> = {};

      for (const r of rows || []) {
        const key = attachmentTypeToKey[(r as any).AttachmentType];
        const filePath = (r as any).FileName as string;
        if (!key || !filePath) continue;
        (newPaths as any)[key] = filePath;
        if (isImagePath(filePath)) {
          const url = await resolveStorageUrl(filePath);
          if (url) previewUpdates[key] = url;
        }
      }
      if (Object.keys(newPaths).length)
        setFormData((prev) => ({ ...prev, ...(newPaths as any) }));
      if (Object.keys(previewUpdates).length)
        setAttachmentPreviews((prev) => ({ ...prev, ...previewUpdates }));
    } catch (e) {
      console.error("Failed to load attachments", e);
    }
  };

  const HeaderTitle = () => (
    <>Form 11 — {displayIRN ?? (editingIRN ? `IRN ${editingIRN}` : "")}</>
  );

  // -----------------------------
  // JSX
  // -----------------------------
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            <HeaderTitle />
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                try {
                  window.print();
                } catch {}
              }}
              className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900"
              title="Print"
            >
              <Printer className="h-5 w-5" />
              <span className="sr-only">Print</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Header resolution state */}
        {headerError && (
          <div className="m-4 bg-red-50 text-red-700 p-3 rounded">{headerError}</div>
        )}
        {headerLoading && (
          <div className="p-6 animate-pulse text-gray-500">Resolving record…</div>
        )}

        {/* Body */}
        {!headerLoading && (
          <div className="p-5 space-y-8">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>}
            {loading && <div className="text-sm text-gray-500">Loading…</div>}

            {/* Worker Personal Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Worker Personal Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Worker ID
                  </label>
                  <div className="text-sm">{s(formData.WorkerID)}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Passport Photo
                  </label>
                  {passportUrl ? (
                    <img
                      src={passportUrl}
                      alt="Worker passport"
                      className="w-84 h-42 rounded object-cover border cursor-zoom-in"
                      onClick={() => setIsPhotoOpen(true)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-84 h-42 rounded border grid place-content-center text-xs text-gray-500">
                      No photo
                    </div>
                  )}
                  {isPhotoOpen && passportUrl && (
                    <div
                      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
                      onClick={() => setIsPhotoOpen(false)}
                    >
                      <img
                        src={passportUrl}
                        alt="Passport enlarged"
                        className="max-h-[85vh] max-w-[90vw] rounded shadow-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <div className="text-sm">{s(formData.WorkerFirstName)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <div className="text-sm">{s(formData.WorkerLastName)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="text-sm">{s(formData.WorkerDOB)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <div className="text-sm">
                    {s(formData.WorkerGender) === "M"
                      ? "Male"
                      : s(formData.WorkerGender) === "F"
                      ? "Female"
                      : s(formData.WorkerGender)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Marital Status
                  </label>
                  <div className="text-sm">
                    {s(formData.WorkerMarried) === "1"
                      ? "Married"
                      : s(formData.WorkerMarried) === "0"
                      ? "Single"
                      : s(formData.WorkerMarried)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Dominant Hand
                  </label>
                  <div className="text-sm">{s(formData.WorkerHanded)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address Line 1
                  </label>
                  <div className="text-sm whitespace-pre-wrap">
                    {s(formData.WorkerAddress1)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address Line 2
                  </label>
                  <div className="text-sm whitespace-pre-wrap">
                    {s(formData.WorkerAddress2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <div className="text-sm">{s(formData.WorkerCity)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Province
                  </label>
                  <div className="text-sm">{s(formData.WorkerProvince)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    P.O. Box
                  </label>
                  <div className="text-sm">{s(formData.WorkerPOBox)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="text-sm break-all">{s(formData.WorkerEmail)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile
                  </label>
                  <div className="text-sm">{s(formData.WorkerMobile)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Landline
                  </label>
                  <div className="text-sm">{s(formData.WorkerLandline)}</div>
                </div>
              </div>
            </section>

            {/* Employment Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Details of Employment</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Employment ID
                  </label>
                  <div className="text-sm">{s(formData.EmploymentID)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Occupation
                  </label>
                  <div className="text-sm">{s(formData.Occupation)}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Place of Employment
                </label>
                <div className="text-sm">{s(formData.PlaceOfEmployment)}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nature of Employment
                </label>
                <div className="text-sm">{s(formData.NatureOfEmployment)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Average Weekly Wage
                  </label>
                  <div className="text-sm">{n(formData.AverageWeeklyWage)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Weekly Payment Rate
                  </label>
                  <div className="text-sm">{n(formData.WeeklyPaymentRate)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Worked Under Sub-Contractor: </span>
                  {b(formData.WorkedUnderSubContractor) ? "Yes" : "No"}
                </div>

                {formData.WorkedUnderSubContractor && (
                  <div className="space-y-2 border-l-4 border-primary pl-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Sub-Contractor Organization Name
                      </label>
                      <div className="text-sm">
                        {s(formData.SubContractorOrganizationName)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Sub-Contractor Location
                      </label>
                      <div className="text-sm">
                        {s(formData.SubContractorLocation)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nature of Business
                      </label>
                      <div className="text-sm">
                        {s(formData.SubContractorNatureOfBusiness)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Injury Details */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Details of Injury</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Incident Date
                  </label>
                  <div className="text-sm">{s(formData.IncidentDate)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Incident Location
                  </label>
                  <div className="text-sm">{s(formData.IncidentLocation)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Province
                  </label>
                  <div className="text-sm">{s(formData.IncidentProvince)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Region
                  </label>
                  <div className="text-sm">{s(formData.IncidentRegion)}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nature and Extent of Injury
                </label>
                <div className="text-sm whitespace-pre-wrap">
                  {s(formData.NatureExtentInjury)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cause of Injury
                </label>
                <div className="text-sm whitespace-pre-wrap">
                  {s(formData.InjuryCause)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Hand Injury: </span>
                  {b(formData.HandInjury) ? "Yes" : "No"}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Injury due to Machinery: </span>
                  {b(formData.InjuryMachinery) ? "Yes" : "No"}
                </div>
                {formData.InjuryMachinery && (
                  <div className="space-y-2 border-l-4 border-primary pl-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Machine Type
                      </label>
                      <div className="text-sm">{s(formData.MachineType)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Machine Part Responsible
                      </label>
                      <div className="text-sm">
                        {s(formData.MachinePartResponsible)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Machine Power Source
                      </label>
                      <div className="text-sm">{s(formData.MachinePowerSource)}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Dependants */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Details of Dependants</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Spouse First Name
                  </label>
                  <div className="text-sm">{s(formData.SpouseFirstName)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Spouse Last Name
                  </label>
                  <div className="text-sm">{s(formData.SpouseLastName)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Spouse Date of Birth
                  </label>
                  <div className="text-sm">{s(formData.SpouseDOB)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Spouse Address Line 1
                  </label>
                  <div className="text-sm whitespace-pre-wrap">
                    {s(formData.SpouseAddress1)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Spouse Address Line 2
                  </label>
                  <div className="text-sm whitespace-pre-wrap">
                    {s(formData.SpouseAddress2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <div className="text-sm">{s(formData.SpouseCity)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Province
                  </label>
                  <div className="text-sm">{s(formData.SpouseProvince)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    P.O. Box
                  </label>
                  <div className="text-sm">{s(formData.SpousePOBox)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="text-sm break-all">{s(formData.SpouseEmail)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile
                  </label>
                  <div className="text-sm">{s(formData.SpouseMobile)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Landline
                  </label>
                  <div className="text-sm">{s(formData.SpouseLandline)}</div>
                </div>
              </div>

              <div className="flex items-center">
                <span className="text-sm">
                  <span className="font-medium">Worker has other dependants: </span>
                  {b(formData.WorkerHaveDependants) ? "Yes" : "No"}
                </span>
              </div>
            </section>

            {/* Insurance */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Insurance Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Insurance Provider
                </label>
                <div className="text-sm">
                  {s(formData.InsuranceCompanyOrganizationName) ||
                    s(formData.InsuranceProviderIPACode)}
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address Line 1
                  </label>
                  <div className="text-sm whitespace-pre-wrap">
                    {s(formData.InsuranceCompanyAddress1)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address Line 2
                  </label>
                  <div className="text-sm whitespace-pre-wrap">
                    {s(formData.InsuranceCompanyAddress2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <div className="text-sm">{s(formData.InsuranceCompanyCity)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Province
                  </label>
                  <div className="text-sm">{s(formData.InsuranceCompanyProvince)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    P.O. Box
                  </label>
                  <div className="text-sm">{s(formData.InsuranceCompanyPOBox)}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Landline
                </label>
                <div className="text-sm">
                  {s(formData.InsuranceCompanyLandLine)}
                </div>
              </div>
            </section>

            {/* Weekly Payment */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Weekly Payment</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Weekly Payment Rate
                </label>
                <div className="text-sm">{n(formData.WeeklyPaymentRate)}</div>
              </div>
            </section>

            {/* Form 11 Scan */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold">Form 11 Scan</h3>

              {formData.ImageName && (
                <p className="text-xs text-gray-600">
                  Storage path:{" "}
                  <span className="font-mono break-all">{s(formData.ImageName)}</span>
                </p>
              )}

              {isImagePath(formData.ImageName) && scanUrl ? (
                <>
                  <div className="mt-2">
                    <img
                      src={scanUrl}
                      alt="Form 11 scan preview"
                      className="w-40 h-40 rounded object-cover border cursor-zoom-in"
                      onClick={() => setIsScanOpen(true)}
                      loading="lazy"
                    />
                  </div>

                  {isScanOpen && (
                    <div
                      className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
                      onClick={() => setIsScanOpen(false)}
                    >
                      <img
                        src={scanUrl}
                        alt="Form 11 scan enlarged"
                        className="max-h-[85vh] max-w-[90vw] rounded shadow-xl"
                      />
                    </div>
                  )}
                </>
              ) : (
                scanUrl && (
                  <a
                    href={scanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    Open current scan
                  </a>
                )
              )}
            </section>

            {/* Supporting Documents */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold">Supporting Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "IMR", label: "Interim medical report" },
                  { key: "FMR", label: "Final medical report" },
                  { key: "SEC43", label: "Section 43 application form" },
                  { key: "SS", label: "Supervisor statement" },
                  { key: "WS", label: "Witness statement" },
                  { key: "IWS", label: "Injured worker's statement" },
                  { key: "PTA", label: "Payslip at time of accident" },
                  { key: "TR", label: "Treatment records" },
                  { key: "PAR", label: "Police accident report" },
                  { key: "F18", label: "Form 18 Scan" },
                  { key: "MEX", label: "Medical Expenses" },
                  { key: "MISC", label: "Misc Expenses" },
                  { key: "DED", label: "Deductions" },
                ].map(({ key, label }) => {
                  const path = s((formData as any)[key]);
                  const preview = attachmentPreviews[key];
                  const isImg = isImagePath(path);
                  return (
                    <div key={key} className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {label}
                      </label>
                      {path ? (
                        <p className="text-xs text-gray-600">
                          Path: <span className="font-mono break-all">{path}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">No file</p>
                      )}
                      {path && isImg && preview && (
                        <>
                          <img
                            src={preview}
                            alt={`${label} preview`}
                            className="w-28 h-28 object-cover rounded border cursor-zoom-in"
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
                      {path && !isImg && (
                        <a
                          href={preview || "#"}
                          onClick={async (e) => {
                            if (!preview) {
                              e.preventDefault();
                              const url = await resolveStorageUrl(path);
                              if (url) window.open(url, "_blank", "noopener,noreferrer");
                            }
                          }}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          Open file
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewForm11;
