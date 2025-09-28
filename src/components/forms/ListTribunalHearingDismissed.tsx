import React, { useState, useEffect } from 'react';
import { X, Search, Download } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ListTribunalHearingDismissedProps {
  onClose: () => void;
  onSelectIRN?: (irn: string, hearingNo: string) => void;
}

interface DismissedHearingData {
  THOIRN: string;
  THOClaimant: string;
  THODecision: string;
  THOHearingNo: string;
  THOOrganizationType: string;
  THOHearingStatus: string;
  THODOA: string;
  THOReason: string;
  THOActionOfficer: string;
  DisplayIRN: string;
}

const ListTribunalHearingDismissed: React.FC<ListTribunalHearingDismissedProps> = ({ 
  onClose,
  onSelectIRN 
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consentedList, setConsentedList] = useState<DismissedHearingData[]>([]);
  const [searchClaimant, setSearchClaimant] = useState('');
  const [searchCRN, setSearchCRN] = useState('');
  const [searchHearingNo, setSearchHearingNo] = useState('');
  const [filterHearingNo, setFilterHearingNo] = useState('');
  const [filterOrgType, setFilterOrgType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [hearingNumbers, setHearingNumbers] = useState<string[]>([]);
  const [organizationTypes, setOrganizationTypes] = useState<string[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingROP, setGeneratingROP] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchConsentedList();
  }, [currentPage, searchClaimant, searchCRN, searchHearingNo, filterHearingNo, filterOrgType]);

  const fetchFilterOptions = async () => {
    try {
      // Fetch unique hearing numbers
      const { data: hearingData, error: hearingError } = await supabase
        .from('tribunalhearingoutcome')
        .select('THOHearingNo')
        .eq('THODecision', 'Dismissed')
        .eq('THOHearingStatus', 'Processed')
        .not('THOHearingNo', 'is', null);

      if (hearingError) throw hearingError;

      const uniqueHearingNos = [...new Set(hearingData?.map(item => item.THOHearingNo).filter(Boolean) || [])];
      setHearingNumbers(uniqueHearingNos);

      // Fetch unique organization types
      const { data: orgData, error: orgError } = await supabase
        .from('tribunalhearingoutcome')
        .select('THOOrganizationType')
        .eq('THODecision', 'Dismissed')
        .eq('THOHearingStatus', 'Processed')
        .not('THOOrganizationType', 'is', null);

      if (orgError) throw orgError;

      const uniqueOrgTypes = [...new Set(orgData?.map(item => item.THOOrganizationType).filter(Boolean) || [])];
      setOrganizationTypes(uniqueOrgTypes);

    } catch (err: any) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchConsentedList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build the base query
      let query = supabase
        .from('tribunalhearingoutcome')
        .select('*', { count: 'exact' })
        .eq('THODecision', 'Dismissed')
        .eq('THOHearingStatus', 'Processed');

      // Apply filters
      if (filterHearingNo) {
        query = query.eq('THOHearingNo', filterHearingNo);
      }
      
      if (filterOrgType) {
        query = query.eq('THOOrganizationType', filterOrgType);
      }

      // Apply search filters
      if (searchClaimant) {
        query = query.ilike('THOClaimant', `%${searchClaimant}%`);
      }

      if (searchHearingNo) {
        query = query.ilike('THOHearingNo', `%${searchHearingNo}%`);
      }

      // For CRN search, we need to get IRNs from form1112master first
      if (searchCRN) {
        const { data: form1112Data, error: form1112Error } = await supabase
          .from('form1112master')
          .select('IRN')
          .ilike('DisplayIRN', `%${searchCRN}%`);
        
        if (form1112Error) throw form1112Error;
        
        if (form1112Data && form1112Data.length > 0) {
          const irns = form1112Data.map(item => item.IRN);
          query = query.in('THOIRN', irns);
        } else {
          // No matching CRNs found
          setConsentedList([]);
          setTotalRecords(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }
      }
      
      // Get the count
      const { count, error: countError } = await query;
      
      if (countError) throw countError;
      
      const totalCount = count || 0;
      setTotalRecords(totalCount);
      setTotalPages(Math.ceil(totalCount / recordsPerPage));
      
      // Calculate pagination
      const start = (currentPage - 1) * recordsPerPage;
      
      // Execute the query with pagination
      const { data, error } = await query
        .range(start, start + recordsPerPage - 1)
        .order('THODOA', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setConsentedList([]);
        return;
      }

      // Get DisplayIRN for each record
      const irns = data.map(item => item.THOIRN);
      
      const { data: form1112Data, error: form1112Error } = await supabase
        .from('form1112master')
        .select('IRN, DisplayIRN')
        .in('IRN', irns);

      if (form1112Error) throw form1112Error;

      // Create a map of IRN to DisplayIRN
      const irnMap = new Map();
      form1112Data?.forEach(item => {
        irnMap.set(item.IRN, item.DisplayIRN);
      });

      // Format the data with DisplayIRN
      const formattedData = data.map(item => ({
        ...item,
        DisplayIRN: irnMap.get(item.THOIRN) || 'N/A',
        THODOA: item.THODOA ? new Date(item.THODOA).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) : 'N/A'
      }));
      
      setConsentedList(formattedData);
    } catch (err: any) {
      console.error('Error fetching Dismissed hearings list:', err);
      setError(err.message || 'Failed to load Dismissed hearings list');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page when searching
    fetchConsentedList();
  };

  const generatePDF = async () => {
    try {
      setGeneratingPDF(true);
      
      // Create a new jsPDF instance
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Get page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
            // Add watermark
      doc.setFont('times', 'bold');
      doc.setFontSize(50);
      doc.setTextColor(230, 230, 230);
      
      // Add rotated watermark text
      doc.text('O R I G I N A L', pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 45,
        renderingMode: 'fill'
      });

      
      // Add logo
      try {
        const logoUrl = 'https://ennhknwwfdlaudephyly.supabase.co/storage/v1/object/sign/cpps/logocrest.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMmRkZDBlOC05MjU4LTQ5ZmEtYTUyYy03NmRlZDY5MTM4OTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjcHBzL2xvZ29jcmVzdC5wbmciLCJpYXQiOjE3NTI2MDg2MzEsImV4cCI6MjM4MzMyODYzMX0.cZ8Px1aDewyNCGugVA5WUNqSUGyu28LvfU5VfmR3jao';
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            const logoWidth = 20;
            const logoHeight = 20;
            const logoX = (pageWidth - logoWidth) / 2;
            
            doc.addImage(img, 'PNG', logoX, 10, logoWidth, logoHeight);
            resolve(true);
          };
          img.onerror = () => {
            console.warn('Could not load logo, proceeding without it');
            resolve(true);
          };
          img.src = logoUrl;
        });
      } catch (error) {
        console.warn('Error loading logo:', error);
      }
      
      // Add header text
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('times', 'bold');
        // Add commissioner stamp
        // Add commissioner stamp
      doc.text('INDEPENDENT STATE OF PAPUA NEW GUINEA', pageWidth / 2, 35, { align: 'center' });
      
      // Add title
      doc.setFontSize(14);
      doc.text('Office Of Workers Compensation - Tribunal Hearing - Consented/Approved List', pageWidth / 2, 45, { align: 'center' });
      
      // Add horizontal lines
      doc.setLineWidth(0.5);
      doc.line(10, 50, pageWidth - 10, 50);
      

      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      // Create table
      const tableColumn = [
        "#", "CRN", "Claimant", "Decision", "Reason", "DOA", "Employer", 
        "Region", "Action Officer", "Nature of Accident", "Proposed Amount", 
        "Confirmed Amount", "Hearing No", "Organization Type"
      ];
      const tableRows: any[] = [];
      
      // Add data rows
      consentedList.forEach((hearing, index) => {
        const tableRow = [
          index + 1,
          hearing.DisplayIRN,
          hearing.THOClaimant,
          hearing.THODecision,
          hearing.THOReason || 'N/A',
          hearing.THODOA,
          hearing.THOEmployer || 'N/A',
          hearing.THORegion || 'N/A',
          hearing.THOActionOfficer || 'N/A',
          hearing.THONatureOfAccident || 'N/A',
          hearing.THOProposedAmount || 'N/A',
          hearing.THOConfirmedAmount || 'N/A',
          hearing.THOHearingNo,
          hearing.THOOrganizationType || 'N/A'
        ];
        tableRows.push(tableRow);
      });
      
      // @ts-ignore - autoTable is added as a plugin
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        styles: { fontSize: 6, cellPadding: 1 },
        columnStyles: {
          0: { cellWidth: 5 },   // #
          1: { cellWidth: 20 },  // CRN
          2: { cellWidth: 25 },  // Claimant
          3: { cellWidth: 15 },  // Decision
          4: { cellWidth: 30 },  // Reason
          5: { cellWidth: 18 },  // DOA
          6: { cellWidth: 25 },  // Employer
          7: { cellWidth: 20 },  // Region
          8: { cellWidth: 25 },  // Action Officer
          9: { cellWidth: 25 },  // Nature of Accident
          10: { cellWidth: 15 }, // Proposed Amount
          11: { cellWidth: 15 }, // Confirmed Amount
          12: { cellWidth: 20 }, // Hearing No
          13: { cellWidth: 10 }  // Organization Type
        },
        headStyles: {
          fillColor: [139, 37, 0], // #8B2500 (primary color)
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      });
      
      // Add total count at the end of the report
      const finalY = (doc as any).lastAutoTable.finalY || 45;
      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      doc.text(`Total Records: ${consentedList.length}`, 14, finalY + 10);
      
      // Add generation date
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, finalY + 20);
      
      // Save the PDF
      doc.save('TribunalHearing-DismissedList.pdf');
      
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setError(`Error generating PDF: ${err.message}`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateROPPDF = async () => {
    try {
      setGeneratingROP(true);
      
      // Create a new jsPDF instance
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Get page dimensions
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      
      // Process each hearing record
      for (let i = 0; i < consentedList.length; i++) {
        const hearing = consentedList[i];
        
        // Add new page for each record (except the first one)
        if (i > 0) {
          doc.addPage();
        }
        
        let yPosition = margin;
        
        // Add logo
        try {
          const logoUrl = 'https://ennhknwwfdlaudephyly.supabase.co/storage/v1/object/sign/cpps/logocrest.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMmRkZDBlOC05MjU4LTQ5ZmEtYTUyYy03NmRlZDY5MTM4OTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjcHBzL2xvZ29jcmVzdC5wbmciLCJpYXQiOjE3NTI2MDg2MzEsImV4cCI6MjM4MzMyODYzMX0.cZ8Px1aDewyNCGugVA5WUNqSUGyu28LvfU5VfmR3jao';
          
          // Create a temporary image element to load the logo
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = () => {
              // Add logo centered at the top
              const logoWidth = 25;
              const logoHeight = 25;
              const logoX = (pageWidth - logoWidth) / 2;
              
              doc.addImage(img, 'PNG', logoX, yPosition, logoWidth, logoHeight);
              resolve(true);
            };
            img.onerror = () => {
              console.warn('Could not load logo, proceeding without it');
              resolve(true);
            };
            img.src = logoUrl;
          });
          
          yPosition += 30; // Space after logo
        } catch (error) {
          console.warn('Error loading logo:', error);
          yPosition += 10; // Minimal space if logo fails
        }
        
        // Fetch detailed hearing data
        const { data: hearingSetData, error: hearingSetError } = await supabase
          .from('tribunalhearingsethearing')
          .select('*')
          .eq('THSHHearingNo', hearing.THOHearingNo)
          .maybeSingle();
        
        if (hearingSetError) {
          console.error('Error fetching hearing set data:', hearingSetError);
        }
        
        // Fetch outcome data
        const { data: outcomeData, error: outcomeError } = await supabase
          .from('tribunalhearingoutcome')
          .select('*')
          .eq('THOIRN', hearing.THOIRN)
          .maybeSingle();
        
        if (outcomeError) {
          console.error('Error fetching outcome data:', outcomeError);
        }
        
        // Add header text
        doc.setFontSize(12);
        doc.setFont('times', 'bold');
        doc.text('PAPUA NEW GUINEA', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
        
        doc.setFontSize(14);
        doc.text('WORKERS COMPENSATION TRIBUNAL', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 20;
        
        // Claimant information
        doc.setFontSize(12);
        doc.text(hearing.THOClaimant.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        doc.text('(CLAIMANT)', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 15;
        
        // Employer information (you may need to fetch this from employer table)
        doc.text('DEPT OF EDUCATION/THE STATE', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        doc.text('(EMPLOYER/INSURER)', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 20;
        
        // File reference and hearing details
        doc.setFont('times', 'normal');
        doc.setFontSize(10);
        doc.text(`FILE REF: CRN: ${hearing.DisplayIRN}`, margin, yPosition);
        yPosition += 6;
        
        if (hearingSetData) {
          const hearingDate = hearingSetData.THSHFromDate ? new Date(hearingSetData.THSHFromDate).toLocaleDateString('en-GB') : 'N/A';
          const hearingLocation = hearingSetData.THSHLocation || 'TRIBUNAL HEARING ROOM';
          doc.text(`HEARING: ${hearingDate} AT ${hearingLocation}`, margin, yPosition);
        }
        yPosition += 15;
        
        // CORAM section
        doc.setFont('times', 'bold');
        doc.text('CORAM', margin, yPosition);
        yPosition += 8;
        
        doc.setFont('times', 'normal');
        if (hearingSetData?.THSHTribunalChair) {
          doc.text(`${hearingSetData.THSHTribunalChair.toUpperCase()} (COMMISSIONER, OWC)`, margin, yPosition);
          yPosition += 6;
        }
        doc.text('TRIBUNAL CHAIR', margin, yPosition);
        yPosition += 15;
        
        // Representing the claimant
        if (hearingSetData?.THSHClaimantRep1) {
          doc.text(`${hearingSetData.THSHClaimantRep1.toUpperCase()} (REGISTRAR OWC)`, margin, yPosition);
          yPosition += 6;
        }
        doc.text('REPRESENTING THE CLAIMANT', margin, yPosition);
        yPosition += 15;
        
        // Representing the state
        if (hearingSetData?.THSHStateRep1) {
          doc.text(`${hearingSetData.THSHStateRep1.toUpperCase()} (SENIOR LEGAL OFFICER, SGD)`, margin, yPosition);
          yPosition += 6;
        }
        if (hearingSetData?.THSHStateRep2) {
          doc.text(`${hearingSetData.THSHStateRep2.toUpperCase()} (LEGAL OFFICER, SGD)`, margin, yPosition);
          yPosition += 6;
        }
        if (hearingSetData?.THSHStateRep3) {
          doc.text(`${hearingSetData.THSHStateRep3.toUpperCase()} (LEGAL OFFICER, SGD)`, margin, yPosition);
          yPosition += 6;
        }
        doc.text('REPRESENTING THE STATE', margin, yPosition);
        yPosition += 15;
        
        // Observer
        if (hearingSetData?.THSHObserver1) {
          doc.text(`${hearingSetData.THSHObserver1.toUpperCase()} (A/S ADMINISTRATION, CORPORATE SERVICE, DEPARTMENT OF FINANCE)`, margin, yPosition);
          yPosition += 6;
        }
        doc.text('OBSERVER', margin, yPosition);
        yPosition += 15;
        
        // Tribunal members
        if (hearingSetData?.THSHTribunal1) {
          doc.text(`${hearingSetData.THSHTribunal1.toUpperCase()} (SENIOR TRIBUNAL OFFICER)`, margin, yPosition);
          yPosition += 6;
        }
        if (hearingSetData?.THSHTribunal2) {
          doc.text(`${hearingSetData.THSHTribunal2.toUpperCase()} (TRIBUNAL OFFICER)`, margin, yPosition);
          yPosition += 6;
        }
        doc.text('TRIBUNAL', margin, yPosition);
        yPosition += 15;
        
        // Officer assisting tribunal
        if (hearingSetData?.THSHOfficerAssistTribunal1) {
          doc.text(`${hearingSetData.THSHOfficerAssistTribunal1.toUpperCase()} (A/CLAIMS MANAGER-MOMASE REGION)`, margin, yPosition);
          yPosition += 6;
        }
        doc.text('OFFICER ASSISTING THE TRIBUNAL', margin, yPosition);
        yPosition += 20;
        
        // Decision section
        doc.setFont('times', 'bold');
        doc.text('DECISION:', margin, yPosition);
        yPosition += 8;
        
        doc.setFont('times', 'normal');
        if (outcomeData?.THOReason) {
          const decisionLines = doc.splitTextToSize(outcomeData.THOReason, pageWidth - (margin * 2));
          doc.text(decisionLines, margin, yPosition);
          yPosition += decisionLines.length * 6;
        } else {
          doc.text('Within time', margin, yPosition);
          yPosition += 6;
          doc.text('Liability accepted', margin, yPosition);
          yPosition += 6;
          if (outcomeData?.THOConfirmedAmount) {
            doc.text(`Consented @ K${outcomeData.THOConfirmedAmount} (Inclusive of K200 medical expenses) 35% loss of efficient use of left lower limb.`, margin, yPosition);
          }
          yPosition += 20;
        }
        
        // Signature section
        yPosition = pageHeight - 60; // Position near bottom
        
        // Add signature placeholder
        doc.setFont('times', 'bold');
        if (hearingSetData?.THSHTribunalChair) {
          doc.text(hearingSetData.THSHTribunalChair.toUpperCase(), margin, yPosition);
          yPosition += 6;
        }
        doc.text('TRIBUNAL CHAIR', margin, yPosition);
        yPosition += 15;
        
        // Date
        const decisionDate = outcomeData?.THODOA ? new Date(outcomeData.THODOA).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
        doc.text(`DATED: ${decisionDate}`, margin, yPosition);
        
        // Add tribunal seal placeholder (circular area)
        const sealX = pageWidth - 60;
        const sealY = yPosition - 30;
        
        try {
          const stampUrl = 'https://ennhknwwfdlaudephyly.supabase.co/storage/v1/object/sign/cpps/Commissionstamp.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xMmRkZDBlOC05MjU4LTQ5ZmEtYTUyYy03NmRlZDY5MTM4OTAiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjcHBzL0NvbW1pc3Npb25zdGFtcC5wbmciLCJpYXQiOjE3NTQxNTA3MDIsImV4cCI6MjA2OTUxMDcwMn0.ET2gqM5ln9zbJbb5jH1gMHFz42HazTIoQ5s-BaUlADU';
          
          const stampImg = new Image();
          stampImg.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            stampImg.onload = () => {
              // Add commissioner stamp
              const stampWidth = 50;
              const stampHeight = 50;
              doc.addImage(stampImg, 'PNG', sealX - 25, sealY - 25, stampWidth, stampHeight);
              resolve(true);
            };
            stampImg.onerror = () => {
              console.warn('Could not load stamp, proceeding without it');
              // Fallback to circle placeholder
              doc.circle(sealX, sealY, 25);
              doc.setFontSize(8);
              doc.text('COMMISSIONER', sealX, sealY - 5, { align: 'center' });
              doc.text('OFFICE OF WORKERS', sealX, sealY, { align: 'center' });
              doc.text('COMPENSATION', sealX, sealY + 5, { align: 'center' });
              resolve(true);
            };
            stampImg.src = stampUrl;
          });
        } catch (error) {
          console.warn('Error loading stamp:', error);
          // Fallback to circle placeholder
          doc.circle(sealX, sealY, 25);
          doc.setFontSize(8);
          doc.text('COMMISSIONER', sealX, sealY - 5, { align: 'center' });
          doc.text('OFFICE OF WORKERS', sealX, sealY, { align: 'center' });
          doc.text('COMPENSATION', sealX, sealY + 5, { align: 'center' });
        }
      }
      
      // Save the PDF
      doc.save('TribunalHearing-ROP-Dismissed.pdf');
      
    } catch (err: any) {
      console.error('Error generating ROP PDF:', err);
      setError(`Error generating ROP PDF: ${err.message}`);
    } finally {
      setGeneratingROP(false);
    }
  };
  const handleView = (irn: string, hearingNo: string) => {
    if (onSelectIRN) {
      onSelectIRN(irn, hearingNo);
    } else {
      // Default view action - could navigate to a detailed view
      console.log(`View hearing outcome for IRN: ${irn}, Hearing No: ${hearingNo}`);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearchClaimant('');
    setSearchCRN('');
    setSearchHearingNo('');
    setFilterHearingNo('');
    setFilterOrgType('');
    setCurrentPage(1);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            Tribunal Hearing Dismissed - Dismissed List
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Filters Section */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Filters & Search</h3>
              <button
                onClick={generatePDF}
                disabled={generatingPDF || consentedList.length === 0}
                className="btn btn-primary flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Print List PDF
                  </>
                )}
              </button>
              <button
                onClick={generateROPPDF}
                disabled={generatingROP || consentedList.length === 0}
                className="btn btn-secondary flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed ml-2"
              >
                {generatingROP ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600 mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Print ROP PDF
                  </>
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="filterHearingNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Hearing Number
                </label>
                <select
                  id="filterHearingNo"
                  value={filterHearingNo}
                  onChange={(e) => setFilterHearingNo(e.target.value)}
                  className="input"
                >
                  <option value="">All Hearing Numbers</option>
                  {hearingNumbers.map(hearingNo => (
                    <option key={hearingNo} value={hearingNo}>
                      {hearingNo}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="filterOrgType" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Organization Type
                </label>
                <select
                  id="filterOrgType"
                  value={filterOrgType}
                  onChange={(e) => setFilterOrgType(e.target.value)}
                  className="input"
                >
                  <option value="">All Organization Types</option>
                  {organizationTypes.map(orgType => (
                    <option key={orgType} value={orgType}>
                      {orgType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="searchClaimant" className="block text-sm font-medium text-gray-700 mb-1">
                  Search by Claimant
                </label>
                <input
                  type="text"
                  id="searchClaimant"
                  value={searchClaimant}
                  onChange={(e) => setSearchClaimant(e.target.value)}
                  className="input"
                  placeholder="Enter claimant name"
                />
              </div>
              
              <div>
                <label htmlFor="searchCRN" className="block text-sm font-medium text-gray-700 mb-1">
                  Search by CRN
                </label>
                <input
                  type="text"
                  id="searchCRN"
                  value={searchCRN}
                  onChange={(e) => setSearchCRN(e.target.value)}
                  className="input"
                  placeholder="Enter CRN"
                />
              </div>
              
              <div>
                <label htmlFor="searchHearingNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Search by Hearing No
                </label>
                <input
                  type="text"
                  id="searchHearingNo"
                  value={searchHearingNo}
                  onChange={(e) => setSearchHearingNo(e.target.value)}
                  className="input"
                  placeholder="Enter hearing number"
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={clearFilters}
                className="btn btn-secondary text-sm"
              >
                Clear Filters
              </button>
              <button
                onClick={handleSearch}
                className="btn btn-primary flex items-center text-sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Total Records Found: {totalRecords} | 
              Total Pages: {totalPages}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : consentedList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CRN
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Claimant
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hearing Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Decision Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action Officer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consentedList.map((hearing, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {hearing.DisplayIRN}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hearing.THOClaimant}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hearing.THOHearingNo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hearing.THOOrganizationType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hearing.THODOA}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {hearing.THOActionOfficer || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleView(hearing.THOIRN, hearing.THOHearingNo)}
                          className="text-sm font-medium bg-primary hover:bg-primary-dark text-white px-3 py-1 rounded"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No Dismissed Hearings Found.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="flex space-x-2">
                {currentPage > 1 && (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      Previous
                    </button>
                  </>
                )}
                
                <span className="px-3 py-1 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                {currentPage < totalPages && (
                  <>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="px-3 py-1 border rounded text-sm"
                    >
                      Last
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListTribunalHearingDismissed;
