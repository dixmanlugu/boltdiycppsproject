import React, { useEffect, useState } from 'react'
//import format from 'date-fns/format'
//import './styles.css'
import { supabase } from '../../services/supabase'
import { Search, Filter, Calendar, AlertCircle, FileText } from 'lucide-react';


interface Decision {
  submissionType: string
  status: string
  reason: string
  takenBy: string
  decisionDate?: string
  displayIRN?: string
  IRN?: number
}

interface PaymentDetail {
  bankName: string
  chequeNo: string
  issueDate: string
  compensationAmount: string
  issuedBy: string
}

interface CaseHistoryContainerProps {
  irn: number
}

const ListClaimDecisions: React.FC<CaseHistoryContainerProps> = ({ irn }) => {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [payments, setPayments] = useState<PaymentDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAllCaseData = async (irn: number) => {
      let allDecisions: Decision[] = []
      let allPayments: PaymentDetail[] = []

const pretty = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB') : '';


			
      const fetchAndFormat = async (
        table: string,
        selectFields: string,
        formatter: (row: any) => Decision
      ) => {
        const { data, error } = await supabase.from(table).select(selectFields).eq('IRN', irn)
        if (error) throw error
        return (data || []).map(formatter)
      }

      const tables = await Promise.all([
        fetchAndFormat('timebarredclaimsregistrarreview', 'IRN, TBCRRFormType, TBCRRReviewStatus, TBCRRDecisionReason, TBCRRDecisionDate', row => ({
          IRN: row.IRN, submissionType: `${row.TBCRRFormType} - TimeBarred`, status: row.TBCRRReviewStatus, reason: row.TBCRRDecisionReason, takenBy: 'Registrar', decisionDate: pretty(row.TBCRRDecisionDate)
        })),
        fetchAndFormat('prescreening_view', '*', row => ({
          IRN: row.IRN, submissionType: row.PRFormType, status: row.PRStatus, reason: row.PRDecisionReason, takenBy: 'Deputy Registrar', decisionDate: pretty(row.PRSubmissionDate)
        })),
        fetchAndFormat('registrarreview', 'IRN, IncidentType, RRStatus, RRDecisionReason, RRDecisionDate', row => ({
          IRN: row.IRN, submissionType: row.IncidentType, status: row.RRStatus, reason: row.RRDecisionReason, takenBy: 'Registrar', decisionDate: pretty(row.RRDecisionDate)
        })),
        fetchAndFormat('form6master', 'IRN, IncidentType, F6MStatus, F6MApprovalDate', row => ({
          IRN: row.IRN, submissionType: `${row.IncidentType} (Form6)`, status: `${row.F6MStatus} (Notification Received - Insurance Company)`, reason: '--', takenBy: '--', decisionDate: pretty(row.F6MApprovalDate)
        })),
        fetchAndFormat('form18master', 'IRN, IncidentType, F18MStatus, F18MEmployerDecisionReason, F18MWorkerDecisionReason, F18MWorkerAcceptedDate', row => {
          let reason = '--', by = '--'
          if (row.F18MStatus === 'EmployerAccepted') {
            reason = row.F18MEmployerDecisionReason
            by = 'Employer'
          } else if (row.F18MStatus === 'WorkerAccepted') {
            reason = row.F18MWorkerDecisionReason
            by = 'Worker'
          } else if (row.F18MStatus === 'NotifiedToWorker') {
            by = 'PCO'
          }
          return { IRN: row.IRN, submissionType: `${row.IncidentType} - Form18 Notification`, status: row.F18MStatus, reason, takenBy: by, decisionDate: pretty(row.F18MWorkerAcceptedDate) }
        }),
     /*   fetchAndFormat('tribunalhearingschedule', 'IRN, THSHearingType, THSHearingStatus, THSDecisionDate', row => ({
          IRN: row.IRN, submissionType: `${row.THSHearingType || 'Tribunal'} Schedule`, status: row.THSHearingStatus || 'Pending', reason: 'To Be Taken', takenBy: 'Tribunal', decisionDate: row.THSDecisionDate
        })),
        fetchAndFormat('tribunalhearingoutcome', 'IRN, THOStatus, THODetails, THODecisionDate', row => ({
          IRN: row.IRN, submissionType: `Tribunal Outcome`, status: row.THOStatus || '', reason: row.THODetails || '', takenBy: 'Tribunal', decisionDate: row.THODecisionDate
        })), */
        fetchAndFormat('approvedclaimscporeview', 'IRN, IncidentType, CPORStatus, LockedByCPOID, CPORApprovedDate', row => {
          let status = row.CPORStatus || 'Review Pending'
          let takenBy = 'Provincial Claims Officer'
          if (status === 'CompensationCalculated') takenBy = 'CPO'
          else if (row.LockedByCPOID > 0) takenBy = 'CPO'
          return { IRN: row.IRN, submissionType: row.IncidentType, status, reason: '--', takenBy, decisionDate: pretty(row.CPORApprovedDate) }
        }),
        fetchAndFormat('compensationcalculationcommissionersreview', 'IRN, IncidentType, CCCRReviewStatus, CCCRDecisionReason, CCCRDecisionDate', row => ({
          IRN: row.IRN, submissionType: row.IncidentType, status: row.CCCRReviewStatus, reason: row.CCCRDecisionReason, takenBy: row.CCCRReviewStatus?.startsWith('Chief') ? 'Chief Commissioner' : 'Commissioner', decisionDate: pretty(row.CCCRDecisionDa)
        })),
        fetchAndFormat('claimsawardedcommissionersreview', 'IRN, IncidentType, CACRReviewStatus, CACRDecisionReason, CACRDecisionDate', row => ({
          IRN: row.IRN, submissionType: row.IncidentType, status: row.CACRReviewStatus, reason: row.CACRDecisionReason, takenBy: row.CACRReviewStatus?.startsWith('Chief') ? 'Chief Commissioner' : 'Commissioner', decisionDate: pretty(row.CACRDecisionDate)
        })),
       fetchAndFormat('compensationcalculationcpmreview', 'IRN, IncidentType, CPMRStatus, CPMRDecisionReason, CPMRDecisionDate', row => ({
          IRN: row.IRN, submissionType: row.IncidentType, status: row.CPMRStatus, reason: row.CPMRDecisionReason, takenBy: 'CPM', decisionDate: pretty(row.CPMRDecisionDate)
        })), 
        fetchAndFormat('claimsawardedregistrarreview', 'IRN, IncidentType, CARRReviewStatus, CARRDecisionReason, CARRDecisionDate', row => ({
          IRN: row.IRN, submissionType: row.IncidentType, status: row.CARRReviewStatus, reason: row.CARRDecisionReason, takenBy: 'Registrar', decisionDate: pretty(row.CARRDecisionDate)
        })),
      /*  fetchAndFormat('compensationcalculationregistrarreview', 'IRN, IncidentType, CCRReviewStatus, CCRDecisionReason, CCRDecisionDate', row => ({
          IRN: row.IRN, submissionType: row.IncidentType, status: row.CCRReviewStatus, reason: row.CCRDecisionReason, takenBy: 'Registrar', decisionDate: pretty(row.CCRDecisionDate)
        })),
        fetchAndFormat('claimsawardedcpmreview', 'IRN, IncidentType, CPMRStatus, CPMRDecisionReason, CPMRDecisionDate', row => ({
        IRN: row.IRN, submissionType: row.IncidentType, status: row.CPMRStatus, reason: row.CPMRDecisionReason, takenBy: 'CPM', decisionDate: pretty(row.CPMRDecisionDate)
        })), 
        fetchAndFormat('tribunalreview', 'IRN, TRReviewStatus, TRReviewReason, TRReviewDate', row => ({
          IRN: row.IRN, submissionType: 'Tribunal Review', status: row.TRReviewStatus, reason: row.TRReviewReason, takenBy: 'Tribunal', decisionDate: row.TRReviewDate
        }))*/
      ])

      allDecisions = tables.flat()

      const irns = allDecisions.map(d => d.IRN)
      const { data: irnData } = await supabase.from('form1112master').select('IRN, DisplayIRN').in('IRN', irns)
      const irnMap = new Map<number, string>()
      irnData?.forEach(row => irnMap.set(row.IRN, row.DisplayIRN))
      allDecisions = allDecisions.map(d => ({ ...d, displayIRN: irnMap.get(d.IRN!) || 'N/A' }))

      const { data: badmData } = await supabase.from('bankaccountdepositmaster').select('*').eq('IRN', irn)
      if (badmData?.length) {
        const b = badmData[0]
        allPayments.push({
          bankName: b.BankName,
          chequeNo: b.CheckNo,
          issueDate: format(new Date(b.IssuedDate), 'dd/MM/yyyy'),
          compensationAmount: b.ChequeCompensationAmount,
          issuedBy: 'Insurance Provider',
        })
      }

      const { data: occdData } = await supabase.from('owcclaimchequedetails').select('*').eq('IRN', irn)
      if (occdData?.length) {
        const o = occdData[0]
        allPayments.push({
          bankName: o.OCCDBankName,
          chequeNo: o.OCCDChequeNumber,
          issueDate: format(new Date(o.OCCDIssueDate), 'dd/MM/yyyy'),
          compensationAmount: o.OCCDChequeAmount,
          issuedBy: 'OWC Trust',
        })
      }

      return { decisions: allDecisions, payments: allPayments }
    }

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const { decisions, payments } = await fetchAllCaseData(irn)
        setDecisions(decisions)
        setPayments(payments)
      } catch (err: any) {
        setError(err.message || 'Failed to load case data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [irn])

  const parseDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  if (loading) return <div className="p-4 text-center text-gray-600">Loading...</div>
  if (error) return <div className="p-4 text-center text-red-600">{error}</div>

  return (
    <div>
      <h3 className="header">Case History</h3>
      <table className="case-table">
        <thead>
          <tr>
            <th>Display IRN</th>
            <th>Submission Type</th>
            <th>Status of Approval</th>
            <th>Decision Reason</th>
            <th>Decision Taken By</th>
            <th>Decision Date</th>
          </tr>
        </thead>
        <tbody>
          {decisions.map((d, i) => (
            <tr key={i}>
              <td>{d.displayIRN || 'N/A'}</td>
              <td>{d.submissionType}</td>
              <td>{d.status}</td>
              <td>{d.reason}</td>
              <td>{d.takenBy}</td>
              <td>{d.decisionDate ? parseDate(d.decisionDate) : '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {payments.length > 0 && (
        <>
          <h3 className="header">Payment Details</h3>
          <table className="payment-table">
            <thead>
              <tr>
                <th>Bank Name</th>
                <th>Cheque No.</th>
                <th>Issue Date</th>
                <th>Compensation Amount</th>
                <th>Issued By</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i}>
                  <td>{p.bankName}</td>
                  <td>{p.chequeNo}</td>
                  <td>{p.issueDate}</td>
                  <td>{p.compensationAmount}</td>
                  <td>{p.issuedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

export default ListClaimDecisions;
