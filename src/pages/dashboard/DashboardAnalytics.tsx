import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, BarChart, CartesianGrid, XAxis, YAxis, Legend, Bar } from 'recharts';
import { supabase } from '../../services/supabase';

// --- Types
interface RecentRow {
  IRN: string;
  WorkerID?: string | null;
  DisplayIRN?: string | null;
  SubmittedDate: string; // ISO
}

interface MonthDatum {
  month: number; // 0..11
  label: string; // Jan
  count: number;
}

interface DashboardAnalyticsProps {
  initialYear?: number; // defaults to current year
  onYearChange?: (year: number) => void;
  onViewForm11?: (payload: { irn: string; displayIRN?: string | null }) => void;
  onViewForm12?: (payload: { irn: string; displayIRN?: string | null }) => void;
  onViewForm3?: (payload: { irn: string; displayIRN?: string | null }) => void;
  onViewForm4?: (payload: { irn: string; displayIRN?: string | null }) => void;

  onViewForm12?: (payload: { irn: string; displayIRN?: string | null }) => void;
  onViewForm3?: (payload: { irn: string; displayIRN?: string | null }) => void;
  onViewForm4?: (payload: { irn: string; displayIRN?: string | null }) => void;
}

const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const palette = [
  '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#eab308', '#06b6d4', '#84cc16', '#ec4899', '#10b981'
];

function groupByMonth(rows: { SubmittedDate: string }[], dateKey: 'SubmittedDate'): MonthDatum[] {
  const buckets = new Array(12).fill(0) as number[];
  for (const r of rows) {
    const d = new Date(r[dateKey]);
    if (!isNaN(d.getTime())) {
      buckets[d.getMonth()] += 1;
    }
  }
  return buckets.map((count, i) => ({ month: i, label: monthLabels[i], count }));
}

const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ initialYear = new Date().getFullYear(), onYearChange, onViewForm11, onViewForm12, onViewForm3, onViewForm4 }) => {
  const [year, setYear] = useState(initialYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monthly datasets
  const [f11Monthly, setF11Monthly] = useState<MonthDatum[]>([]);
  const [f12Monthly, setF12Monthly] = useState<MonthDatum[]>([]);
  const [f3Monthly, setF3Monthly] = useState<MonthDatum[]>([]);
  const [f4Monthly, setF4Monthly] = useState<MonthDatum[]>([]);

  // Recents
  const [recentF11, setRecentF11] = useState<RecentRow[]>([]);
  const [recentF12, setRecentF12] = useState<RecentRow[]>([]);
  const [recentF3, setRecentF3] = useState<RecentRow[]>([]);
  const [recentF4, setRecentF4] = useState<RecentRow[]>([]);

  const startISO = `${year}-01-01`;
  const endISO = `${year + 1}-01-01`;

  useEffect(() => {
    setYear(initialYear);
  }, [initialYear]);

  useEffect(() => {
    onYearChange?.(year);
  }, [year, onYearChange]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Form11 (Injury) this year by month + recents
        {
          const { data, error } = await supabase
            .from('form1112master')
            .select('IRN, WorkerID, DisplayIRN, IncidentType, FirstSubmissionDate')
            .eq('IncidentType', 'Injury')
            .gte('FirstSubmissionDate', startISO)
            .lt('FirstSubmissionDate', endISO)
            .order('FirstSubmissionDate', { ascending: false });
          if (error) throw error;
          const rows = (data ?? []).map(d => ({
            IRN: String(d.IRN),
            WorkerID: d.WorkerID ?? null,
            DisplayIRN: d.DisplayIRN ?? null,
            SubmittedDate: d.FirstSubmissionDate,
          }));
          setF11Monthly(groupByMonth(rows, 'SubmittedDate'));
          setRecentF11(rows.slice(0, 5));
        }

        // 2) Form12 (Death) this year by month + recents
        {
          const { data, error } = await supabase
            .from('form1112master')
            .select('IRN, WorkerID, DisplayIRN, IncidentType, FirstSubmissionDate')
            .eq('IncidentType', 'Death')
            .gte('FirstSubmissionDate', startISO)
            .lt('FirstSubmissionDate', endISO)
            .order('FirstSubmissionDate', { ascending: false });
          if (error) throw error;
          const rows = (data ?? []).map(d => ({
            IRN: String(d.IRN),
            WorkerID: d.WorkerID ?? null,
            DisplayIRN: d.DisplayIRN ?? null,
            SubmittedDate: d.FirstSubmissionDate,
          }));
          setF12Monthly(groupByMonth(rows, 'SubmittedDate'));
          setRecentF12(rows.slice(0, 5));
        }

        // 3) Form3 this year by month + recents
 // 3) Form3 this year by month + recents
{
  const { data, error } = await supabase
    .from('form3master')
    .select('IRN, Form3SubmissionDate')
    .gte('Form3SubmissionDate', startISO)
    .lt('Form3SubmissionDate', endISO)
    .order('Form3SubmissionDate', { ascending: false });
  if (error) throw error;

  const irns3 = Array.from(new Set((data ?? []).map(d => d.IRN)));
  let byIrn3 = new Map<string, { WorkerID: string | null; DisplayIRN: string | null }>();

  if (irns3.length > 0) {
    const { data: link3, error: link3Err } = await supabase
      .from('workerirn')
      .select('IRN, WorkerID, DisplayIRN')
      .in('IRN', irns3)
      .eq('INCIDENTTYPE', 'Injury'); // Form3 = Injury
    if (link3Err) throw link3Err;

    byIrn3 = new Map(
      (link3 ?? []).map(r => [
        String(r.IRN),
        { WorkerID: r.WorkerID ?? null, DisplayIRN: r.DisplayIRN ?? null },
      ])
    );
  }

  const rows = (data ?? []).map(d => ({
    IRN: String(d.IRN),
    WorkerID: byIrn3.get(String(d.IRN))?.WorkerID ?? null,
    DisplayIRN: byIrn3.get(String(d.IRN))?.DisplayIRN ?? null,
    SubmittedDate: d.Form3SubmissionDate,
  }));

  setF3Monthly(groupByMonth(rows, 'SubmittedDate'));
  setRecentF3(rows.slice(0, 5));
}


// 4) Form4 this year by month + recents
// 4) Form4 this year by month + recents
{
  const { data, error } = await supabase
    .from('form4master')
    .select('IRN, Form4SubmissionDate')
    .gte('Form4SubmissionDate', startISO)
    .lt('Form4SubmissionDate', endISO)
    .order('Form4SubmissionDate', { ascending: false });
  if (error) throw error;

  const irns4 = Array.from(new Set((data ?? []).map(d => d.IRN)));
  let byIrn4 = new Map<string, { WorkerID: string | null; DisplayIRN: string | null }>();

  if (irns4.length > 0) {
    const { data: link4, error: link4Err } = await supabase
      .from('workerirn')
      .select('IRN, WorkerID, DisplayIRN')
      .in('IRN', irns4)
      .eq('INCIDENTTYPE', 'Death'); // Form4 = Death
    if (link4Err) throw link4Err;

    byIrn4 = new Map(
      (link4 ?? []).map(r => [
        String(r.IRN),
        { WorkerID: r.WorkerID ?? null, DisplayIRN: r.DisplayIRN ?? null },
      ])
    );
  }

  const rows = (data ?? []).map(d => ({
    IRN: String(d.IRN),
    WorkerID: byIrn4.get(String(d.IRN))?.WorkerID ?? null,
    DisplayIRN: byIrn4.get(String(d.IRN))?.DisplayIRN ?? null,
    SubmittedDate: d.Form4SubmissionDate,
  }));

  setF4Monthly(groupByMonth(rows, 'SubmittedDate'));
  setRecentF4(rows.slice(0, 5));
}


      } catch (e: any) {
        console.error(e);
        setError(e.message ?? 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    })();
  }, [year]);

  const pieF11 = useMemo(() => f11Monthly.filter(d => d.count > 0), [f11Monthly]);
  const pieF12 = useMemo(() => f12Monthly.filter(d => d.count > 0), [f12Monthly]);

  const totalF11 = useMemo(() => f11Monthly.reduce((s, d) => s + d.count, 0), [f11Monthly]);
  const totalF12 = useMemo(() => f12Monthly.reduce((s, d) => s + d.count, 0), [f12Monthly]);
  const totalF3 = useMemo(() => f3Monthly.reduce((s, d) => s + d.count, 0), [f3Monthly]);
  const totalF4 = useMemo(() => f4Monthly.reduce((s, d) => s + d.count, 0), [f4Monthly]);

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">{error}</div>
      )}

      {/* Year picker */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard Analytics</h2>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">←</button>
          <input
            type="number"
            className="w-24 px-2 py-1 border rounded"
            value={year}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setYear(v);
            }}
          />
          <button className="px-2 py-1 border rounded" onClick={() => setYear((y) => y + 1)} aria-label="Next year">→</button>
          <button className="px-2 py-1 border rounded" onClick={() => setYear(new Date().getFullYear())}>This Year</button>
        </div>
      </div>

      {/* CHARTS: Pies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Form 11 – Injury submissions by month ({year}) · Total: {totalF11}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="count" data={pieF11} nameKey="label" label>
                  {pieF11.map((entry, index) => (
                    <Cell key={`f11-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Form 12 – Death submissions by month ({year}) · Total: {totalF12}</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="count" data={pieF12} nameKey="label" label>
                  {pieF12.map((entry, index) => (
                    <Cell key={`f12-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

  {/* CHARTS: Bars */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div className="card">
    <h3 className="text-lg font-semibold mb-4">
      Form 3 – Injury submissions by month ({year}) · Total: {totalF3}
    </h3>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={f3Monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" name="Form 3">
            {f3Monthly.map((_, i) => (
              <Cell key={`f3-${i}`} fill={palette[i % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>

  <div className="card">
    <h3 className="text-lg font-semibold mb-4">
      Form 4 – Death submissions by month ({year}) · Total: {totalF4}
    </h3>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={f4Monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" name="Form 4">
            {f4Monthly.map((_, i) => (
              <Cell key={`f4-${i}`} fill={palette[i % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
</div>


      {/* RECENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Form 11 Submissions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WorkerID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DisplayIRN</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentF11.map((r, i) => (
                  <tr key={`rf11-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{r.WorkerID ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{r.DisplayIRN ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{new Date(r.SubmittedDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm"><button className="text-primary hover:text-primary-dark" onClick={() => onViewForm11?.({ irn: r.IRN, displayIRN: r.DisplayIRN })}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Form 12 Submissions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WorkerID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DisplayIRN</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentF12.map((r, i) => (
                  <tr key={`rf12-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{r.WorkerID ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{r.DisplayIRN ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{new Date(r.SubmittedDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm"><button className="text-primary hover:text-primary-dark" onClick={() => onViewForm12?.({ irn: r.IRN, displayIRN: r.DisplayIRN })}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Form 3 Submissions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WorkerID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DisplayIRN</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentF3.map((r, i) => (
                  <tr key={`rf3-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{r.WorkerID ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{r.DisplayIRN ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{new Date(r.SubmittedDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm"><button className="text-primary hover:text-primary-dark" onClick={() => onViewForm3?.({ irn: r.IRN, displayIRN: r.DisplayIRN })}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Form 4 Submissions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WorkerID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DisplayIRN</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentF4.map((r, i) => (
                  <tr key={`rf4-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{r.WorkerID ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{r.DisplayIRN ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{new Date(r.SubmittedDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm"><button className="text-primary hover:text-primary-dark" onClick={() => onViewForm4?.({ irn: r.IRN, displayIRN: r.DisplayIRN })}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardAnalytics;
