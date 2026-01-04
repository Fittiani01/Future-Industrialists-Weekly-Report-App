import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Visit, WeeklyReport, Statistics, CategoryLogos, PartnerLogo, Decoration } from './types';
import { INITIAL_REPORT } from './constants';
import { VisitCard } from './components/VisitCard';
import { StatisticsSection } from './components/StatisticsSection';
import { ReportPrintTemplate } from './components/ReportPrintTemplate';
import { LandingMap } from './components/LandingMap';
import { parseReportFromText, matchImagesToVisits, matchLogosToFactories } from './services/geminiService';
import { Edit3, Sparkles, Loader2, Plus, FileText, Image as ImageIcon, UploadCloud, Factory, Eraser, Trash2, CheckCircle2, X, FileDown, Cloud, Save, AlertCircle, Minus, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, LayoutTemplate, Move, MousePointer2, Hand, Eye, Printer, Lock, Unlock, ArrowRight, Map as MapIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import mammoth from 'mammoth';

// Firebase Imports
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { uploadReportImage } from './utils/uploadImage';

// Helper for Arabic Ordinals
const getArabicOrdinal = (n: number) => {
    const ordinals = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر"];
    return ordinals[n] || n.toString();
};

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<'map' | 'report'>('map');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  // Admin Mode State - Default to FALSE (Public User View)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Dragging State for Decorations
  const [activeDecoId, setActiveDecoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Parsing & AI State
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null); 
  
  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
  const [isAnalyzingLogos, setIsAnalyzingLogos] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isViewerImageLoading, setIsViewerImageLoading] = useState(false);

  // Refs
  const bulkImageInputRef = useRef<HTMLInputElement>(null);
  const bulkLogoInputRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const pageBgRef = useRef<HTMLInputElement>(null);
  const decorationInputRef1 = useRef<HTMLInputElement>(null);
  const decorationInputRef2 = useRef<HTMLInputElement>(null);
  const partnerRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Check Admin Mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminMode = params.get('mode') === 'admin';
    setIsAdmin(adminMode);
    setIsEditing(adminMode);
    
    // Auth
    signInAnonymously(auth).catch(console.error);
  }, []);

  // 2. Fetch Reports when Region is Selected
  useEffect(() => {
    if (!selectedRegion) return;

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Get all reports first, then filter client-side to handle "missing region field = makkah" legacy logic
            // Ideally we should update DB, but for now this is safer.
            const q = query(collection(db, "weeklyReports"), orderBy("createdAt", "asc"));
            const querySnapshot = await getDocs(q);
            
            const loadedReports: WeeklyReport[] = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data() as WeeklyReport;
                // LEGACY HANDLING: If no region is set, assume 'makkah'.
                const reportRegion = data.region || 'makkah';
                
                if (reportRegion === selectedRegion) {
                    loadedReports.push({ id: doc.id, ...data, visits: data.visits || [] } as WeeklyReport);
                }
            });

            if (loadedReports.length > 0) {
                setReports(loadedReports);
                setCurrentReportIndex(loadedReports.length - 1);
            } else {
                setReports([]); // No reports for this region
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    fetchReports();
  }, [selectedRegion]);

  // 3. Fetch Visits Subcollection
  useEffect(() => {
      if (currentView !== 'report' || reports.length === 0) return;

      const fetchVisits = async () => {
          const reportId = reports[currentReportIndex]?.id;
          if (!reportId) return;

          setVisitsLoading(true);
          try {
              const visitsRef = collection(db, "weeklyReports", reportId, "visits");
              const q = query(visitsRef); 
              const snapshot = await getDocs(q);
              
              const fetchedVisits: Visit[] = [];
              snapshot.forEach(doc => {
                  fetchedVisits.push({ id: doc.id, ...doc.data() } as Visit);
              });
              fetchedVisits.sort((a, b) => a.id.localeCompare(b.id));

              if (fetchedVisits.length > 0) {
                  setReports(prev => {
                      const newReports = [...prev];
                      if (newReports[currentReportIndex]) {
                          newReports[currentReportIndex] = {
                              ...newReports[currentReportIndex],
                              visits: fetchedVisits
                          };
                      }
                      return newReports;
                  });
              }
          } catch (e) {
              console.error("Error fetching visits:", e);
          } finally {
              setVisitsLoading(false);
          }
      };
      
      fetchVisits();
  }, [currentReportIndex, currentView, reports.length > 0 ? reports[currentReportIndex]?.id : null]);


  // --- Handlers ---

  const handleRegionSelect = (regionId: string) => {
      setSelectedRegion(regionId);
      setCurrentView('report');
  };

  const handleBackToMap = () => {
      setSelectedRegion(null);
      setCurrentView('map');
      setReports([]);
  };

  const report = reports[currentReportIndex] || { ...INITIAL_REPORT, region: selectedRegion || 'makkah' };

  // --- PDF Download Handler using Isolated Template ---
  const handleDownloadPDF = async () => {
      setIsPrinting(true);
      
      try {
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '-9999';
        container.style.background = 'white'; 
        document.body.appendChild(container);

        const root = createRoot(container);
        root.render(<ReportPrintTemplate report={report} />);

        await new Promise(resolve => setTimeout(resolve, 500));
        const images = Array.from(container.querySelectorAll('img'));
        const imagePromises = images.map((img) => {
            if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
            return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve(); 
            });
        });
        await Promise.all(imagePromises);
        await document.fonts.ready;
        await new Promise(r => setTimeout(r, 1500));

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pages = container.querySelectorAll('.strict-page');

        for (let i = 0; i < pages.length; i++) {
            const pageEl = pages[i] as HTMLElement;
            const canvas = await html2canvas(pageEl, {
                scale: 4, 
                useCORS: true, 
                backgroundColor: '#ffffff',
                logging: false,
                width: 794,
                height: 1123,
                windowWidth: 1600,
                windowHeight: 2000,
                allowTaint: true,
                imageTimeout: 30000,
                onclone: (doc) => {
                    const els = doc.querySelectorAll('*');
                    els.forEach((el) => {
                       if (el instanceof HTMLElement) {
                           el.style.fontFamily = 'Tajawal, sans-serif';
                       }
                    });
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0); 
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }

        const safeWeek = report.header.weekTitle.replace(/[\/\\?%*:|"<>]/g, '-').trim();
        const safeDate = report.header.dateRange.replace(/[\/\\?%*:|"<>]/g, '-').substring(0, 10).trim();
        const safeRegion = selectedRegion || 'report';
        pdf.save(`${safeRegion}-${safeWeek}-${safeDate}.pdf`);

        root.unmount();
        document.body.removeChild(container);

      } catch (e) {
          console.error(e);
          alert("حدث خطأ أثناء تحميل الملف");
      } finally {
          setIsPrinting(false);
      }
  };

  const updateCurrentReport = (newData: Partial<WeeklyReport> | ((prev: WeeklyReport) => WeeklyReport)) => {
      setReports(prevReports => {
          const newReports = [...prevReports];
          const current = newReports[currentReportIndex];
          let updated: WeeklyReport;
          if (typeof newData === 'function') {
              updated = newData(current);
          } else {
              updated = { ...current, ...newData };
          }
          newReports[currentReportIndex] = updated;
          return newReports;
      });
      if (isAdmin) setIsDirty(true);
  };

  // --- Drag & Drop Decoration Handlers ---
  const handleDecoStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
      if (!isEditing) return;
      e.stopPropagation();

      const decoration = report.decorations?.find(d => d.id === id);
      if (!decoration || !containerRef.current) return;

      setActiveDecoId(id);
      isDraggingRef.current = false;
      
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      const startMouseX = clientX;
      const startMouseY = clientY;
      const startDecoX = decoration.x;
      const startDecoY = decoration.y;

      const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
          if (!containerRef.current) return;
          isDraggingRef.current = true;
          
          let moveClientX, moveClientY;
          if ('touches' in moveEvent) {
               moveClientX = moveEvent.touches[0].clientX;
               moveClientY = moveEvent.touches[0].clientY;
          } else {
               moveClientX = (moveEvent as MouseEvent).clientX;
               moveClientY = (moveEvent as MouseEvent).clientY;
          }

          const rect = containerRef.current.getBoundingClientRect();
          const deltaX_px = moveClientX - startMouseX;
          const deltaY_px = moveClientY - startMouseY;
          const deltaX_percent = (deltaX_px / rect.width) * 100;
          const deltaY_percent = (deltaY_px / rect.height) * 100;

          const newX = Math.max(0, Math.min(100, startDecoX + deltaX_percent));
          const newY = Math.max(0, Math.min(100, startDecoY + deltaY_percent));

          updateCurrentReport(prev => ({
              ...prev,
              decorations: prev.decorations?.map(d => 
                  d.id === id ? { ...d, x: newX, y: newY } : d
              )
          }));
      };

      const handleEnd = () => {
          document.removeEventListener('mousemove', handleMove);
          document.removeEventListener('mouseup', handleEnd);
          document.removeEventListener('touchmove', handleMove);
          document.removeEventListener('touchend', handleEnd);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
  };

  const handleDecorationUpload = (index: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && report.id) {
          try {
              const url = await uploadReportImage(file, report.id, 'decorations');
              const defaultX = 50; 
              const defaultY = 20; 
              const newDeco: Decoration = {
                  id: `deco-${index}-${Date.now()}`,
                  url,
                  x: defaultX, 
                  y: defaultY,
                  scale: 0.8,
                  opacity: 1
              };
              updateCurrentReport(prev => {
                  const newDecos = [...(prev.decorations || [])];
                  if (index === 0) {
                      if (newDecos.length > 0) newDecos[0] = newDeco;
                      else newDecos.push(newDeco);
                  } else {
                      if (newDecos.length < 1) newDecos.push({} as any);
                      newDecos[1] = newDeco;
                  }
                  return { ...prev, decorations: newDecos.filter(d => d && d.url) };
              });
              setActiveDecoId(newDeco.id);
          } catch(e) { console.error(e); }
      }
  };

  const updateDecoScale = (id: string, delta: number) => {
      updateCurrentReport(prev => ({
          ...prev,
          decorations: prev.decorations?.map(d => 
              d.id === id ? { ...d, scale: Math.max(0.1, d.scale + delta) } : d
          )
      }));
  };

  const deleteDecoration = (id: string) => {
       updateCurrentReport(prev => ({
          ...prev,
          decorations: prev.decorations?.filter(d => d.id !== id)
      }));
      setActiveDecoId(null);
  };

  const saveReportToFirestore = async () => {
    // Basic check, though UI prevents clicking if not admin mostly
    if (!report || !isAdmin) return;
    setSaving(true);
    try {
        const reportId = report.id || `week-${Date.now()}`;
        const { visits, ...mainReportData } = report;
        const reportToSave = { 
            ...mainReportData, 
            visits: [],
            region: selectedRegion || 'makkah', // Ensure region is saved
            id: reportId,
            createdAt: report.createdAt || serverTimestamp() 
        };
        await setDoc(doc(db, "weeklyReports", reportId), reportToSave, { merge: true });
        const visitsRef = collection(db, "weeklyReports", reportId, "visits");
        const existingSnapshot = await getDocs(visitsRef);
        const existingIds = new Set(existingSnapshot.docs.map(d => d.id));
        const currentIds = new Set(visits.map(v => v.id));
        const deletePromises: Promise<void>[] = [];
        existingIds.forEach(id => {
            if (!currentIds.has(id)) deletePromises.push(deleteDoc(doc(visitsRef, id)));
        });
        await Promise.all(deletePromises);
        const savePromises = visits.map(visit => setDoc(doc(visitsRef, visit.id), visit));
        await Promise.all(savePromises);
        setIsDirty(false);
        if (!report.id) updateCurrentReport({ id: reportId });
    } catch (error: any) {
        console.error("Save Error:", error);
        alert(`فشل الحفظ: ${error.message || "تأكد من الاتصال بالإنترنت والصلاحيات"}`);
    } finally { setSaving(false); }
  };

  const handleCreateNewReport = () => {
      const nextWeekNum = reports.length + 1;
      const weekTitle = `الأسبوع ${getArabicOrdinal(nextWeekNum)}`;
      const newId = `week-${Date.now()}`;
      const newReport: WeeklyReport = {
          ...INITIAL_REPORT,
          id: newId,
          region: selectedRegion || 'makkah', // Set selected region
          header: { ...INITIAL_REPORT.header, weekTitle: weekTitle },
          logos: report.logos, 
          visits: [], 
          decorations: report.decorations || [],
          createdAt: serverTimestamp() 
      };
      setReports(prev => [...prev, newReport]); 
      setCurrentReportIndex(reports.length); 
      setIsDirty(true);
  };

  const handleDeleteCurrentReport = async () => {
      if (!isAdmin) return;
      if (reports.length <= 0) return;
      
      if (window.confirm("هل أنت متأكد من حذف هذا التقرير نهائياً من قاعدة البيانات؟")) {
          const reportId = report.id;
          if (reportId) {
              try {
                  const visitsRef = collection(db, "weeklyReports", reportId, "visits");
                  const snapshot = await getDocs(visitsRef);
                  const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
                  await Promise.all(deletePromises);
                  await deleteDoc(doc(db, "weeklyReports", reportId));
                  const newReports = reports.filter((_, idx) => idx !== currentReportIndex);
                  setReports(newReports);
                  // Focus the last report (newest)
                  setCurrentReportIndex(Math.max(0, newReports.length - 1));
                  setIsDirty(false);
              } catch (e) { console.error(e); }
          }
      }
  };

  const handleUpdateVisit = (id: string, data: Partial<Visit>) => {
    updateCurrentReport(prev => ({
      ...prev,
      visits: prev.visits.map(v => v.id === id ? { ...v, ...data } : v)
    }));
  };

  const handleDeleteVisit = (id: string) => {
    updateCurrentReport(prev => ({ ...prev, visits: prev.visits.filter(v => v.id !== id) }));
  }

  const handleAddVisit = () => {
    const newVisit: Visit = {
        id: Date.now().toString(),
        schoolName: "مدرسة جديدة",
        participants: 0,
        date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        factory: "اسم المصنع",
        images: []
    };
    updateCurrentReport(prev => ({ ...prev, visits: [...prev.visits, newVisit] }));
  }

  const handleUpdateStats = (key: keyof Statistics, value: number) => {
    updateCurrentReport(prev => ({ ...prev, stats: { ...prev.stats, [key]: value } }));
  };

  const handleUpdateHeader = (key: keyof WeeklyReport['header'], value: string) => {
      updateCurrentReport(prev => ({ ...prev, header: { ...prev.header, [key]: value } }));
  }

  const handleManualVisitImageUpload = async (files: File[], visitId: string): Promise<string[]> => {
      if (!report.id) return [];
      const urls: string[] = [];
      for (const file of files) {
          try {
              const url = await uploadReportImage(file, report.id, visitId);
              urls.push(url);
          } catch(e: any) { console.error(e); }
      }
      setIsDirty(true);
      return urls;
  };

  const handleVisitLogoUpload = async (file: File, visitId: string): Promise<string> => {
       if (!report.id) throw new Error("Report ID missing");
       return await uploadReportImage(file, report.id, visitId);
  }

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && report.id) {
        try {
            const url = await uploadReportImage(file, report.id, 'cover_page', { maxWidth: 3508 });
            updateCurrentReport({ coverImage: url });
        } catch(e) { console.error(e); }
    }
  };

  const handlePageBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && report.id) {
        try {
            const url = await uploadReportImage(file, report.id, 'page_background', { maxWidth: 3508 });
            updateCurrentReport({ pageBackgroundImage: url });
        } catch(e) { console.error(e); }
    }
  };

  const handleLogoUpdate = (section: 'main' | 'right' | 'partners' | 'categories', indexOrKey: number | string = -1) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
             const rId = report.id || `week-${Date.now()}`;
             const url = await uploadReportImage(file, rId, 'general_logos');
             updateCurrentReport(prev => {
                if (section === 'main') return { ...prev, logos: { ...prev.logos, main: url } };
                if (section === 'right' && typeof indexOrKey === 'number') {
                    const newRightLogos = [...prev.logos.rightLogos];
                    newRightLogos[indexOrKey] = url;
                    return { ...prev, logos: { ...prev.logos, rightLogos: newRightLogos } };
                }
                if (section === 'partners' && typeof indexOrKey === 'number') {
                    const newPartners = [...prev.logos.partners];
                    newPartners[indexOrKey] = { ...newPartners[indexOrKey], url: url };
                    return { ...prev, logos: { ...prev.logos, partners: newPartners } };
                }
                if (section === 'categories' && typeof indexOrKey === 'string') {
                    return { ...prev, logos: { ...prev.logos, categories: { ...prev.logos.categories, [indexOrKey]: url } } };
                }
                return prev;
             });
          } catch (e) { console.error(e); }
      }
  };

  const changePartnerScale = (index: number, delta: number) => {
      updateCurrentReport(prev => {
          const newPartners = [...prev.logos.partners];
          const currentScale = newPartners[index].scale;
          const newScale = Math.max(0.5, Math.min(3.0, currentScale + delta));
          newPartners[index] = { ...newPartners[index], scale: newScale };
          return { ...prev, logos: { ...prev.logos, partners: newPartners } };
      });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.name.endsWith('.docx')) {
          const reader = new FileReader();
          reader.onload = async (event) => {
              try {
                  const arrayBuffer = event.target?.result as ArrayBuffer;
                  const result = await mammoth.extractRawText({ arrayBuffer } as any);
                  setRawText(result.value as string);
              } catch (err: any) { console.error(err); }
          };
          reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.txt')) {
          const reader = new FileReader();
          reader.onload = (event) => setRawText(event.target?.result as string || "");
          reader.readAsText(file);
      }
  };

  const handleSmartParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError(null); 
    try {
      const parsedData = await parseReportFromText(rawText);
      updateCurrentReport(prev => ({
        ...prev,
        header: parsedData.header || prev.header,
        stats: parsedData.stats ? { ...prev.stats, ...parsedData.stats } : prev.stats,
        visits: parsedData.visits?.map((v, idx) => ({ ...v, id: Date.now().toString() + idx, images: [] })) || prev.visits
      }));
      setRawText(""); 
    } catch (error: any) { 
        setParseError(error.message || "حدث خطأ غير متوقع أثناء المعالجة");
    } finally { setIsParsing(false); }
  };

  const handleBulkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !report.id) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingImages(true);
      try {
        const filenames = files.map(f => f.name);
        const mapping = await matchImagesToVisits(filenames, report.visits);
        const newVisits = [...report.visits];
        const visitMap = new Map(newVisits.map((v: Visit) => [v.id, v]));
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const visitId = mapping[i.toString()];
            if (visitId && visitMap.has(visitId)) {
                const visit = visitMap.get(visitId)!;
                if (visit.images.length < 4) {
                    try {
                        const url = await uploadReportImage(file, report.id, visitId);
                        visit.images.push(url);
                    } catch (err) { console.error(err); }
                }
            }
        }
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
      } finally { setIsAnalyzingImages(false); if(bulkImageInputRef.current) bulkImageInputRef.current.value=""; }
  };

  const handleBulkFactoryLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !report.id) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingLogos(true);
      try {
        const filenames = files.map(f => f.name);
        const mapping = await matchLogosToFactories(filenames, report.visits);
        const newVisits = [...report.visits];
        const visitMap = new Map(newVisits.map((v: Visit) => [v.id, v]));
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const matchedVisitIds = mapping[i.toString()];
            if (matchedVisitIds?.length > 0) {
                try {
                    const url = await uploadReportImage(file, report.id, matchedVisitIds[0]);
                    matchedVisitIds.forEach(id => {
                        const visit = visitMap.get(id);
                        if (visit) visit.factoryLogo = url;
                    });
                } catch(e) { console.error(e); }
            }
        }
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
      } finally { setIsAnalyzingLogos(false); if(bulkLogoInputRef.current) bulkLogoInputRef.current.value = ""; }
  };

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
      const result: T[][] = [];
      for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
      return result;
  };
  const visitChunks = chunkArray(report.visits, 4);

  // --- Sub-Components for Render ---
  const ReportHeaderContent = () => (
      <header className="flex justify-between items-center w-full mb-1 relative z-20">
            <div className="flex items-center gap-1 md:gap-4 h-10 md:h-16 print:h-12">
                 {report.logos.rightLogos.map((logo, idx) => (
                    <React.Fragment key={idx}>
                        <div className="relative h-full flex items-center">
                            <img src={logo} alt="" className="h-full object-contain max-h-[30px] md:max-h-14 print:max-h-10" />
                        </div>
                        {idx < report.logos.rightLogos.length - 1 && <div className="h-4 md:h-8 w-px bg-gray-300 mx-1 md:mx-2"></div>}
                    </React.Fragment>
                 ))}
            </div>
            <div className="flex flex-col gap-2 relative h-12 md:h-24 print:h-14 items-end justify-center">
                 <img src={report.logos.main} alt="Future Industrialists" className="h-full object-contain" />
            </div>
      </header>
  );

  const ReportFooterContent = () => (
      <div className="w-full flex flex-col items-center mt-auto border-t border-gray-200 pt-1 relative z-50">
        <div className="text-center mb-1 text-brand-dark font-bold text-lg relative z-10 print:text-sm print:mb-0">شركاء النجاح</div>
        <div className="w-full px-2 relative z-10">
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 max-w-[95%] mx-auto print:hidden">
                {report.logos.partners.map((partner: PartnerLogo) => (
                    <div key={partner.id} className="relative flex flex-col items-center justify-center">
                        <img src={partner.url} style={{ height: `${35 * partner.scale}px`, width: 'auto', maxWidth: '100px' }} className="object-contain" alt="" />
                    </div>
                ))}
            </div>
            <div className="hidden print:flex flex-col items-center gap-3 w-full pb-2">
                <div className="flex justify-between items-center w-full px-2 flex-nowrap">
                    {report.logos.partners.slice(0, 6).map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex items-center justify-center h-7 px-1 flex-1">
                                <img src={partner.url} className="h-full w-auto object-contain max-w-[50px]" alt="" />
                            </div>
                            {idx < 5 && <div className="h-4 w-px bg-gray-300 flex-shrink-0"></div>}
                        </React.Fragment>
                    ))}
                </div>
                 <div className="flex justify-center items-center gap-6 w-full px-2 flex-nowrap">
                    {report.logos.partners.slice(6, 11).map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex items-center justify-center h-7 px-1">
                                <img src={partner.url} className="h-full w-auto object-contain max-w-[50px]" alt="" />
                            </div>
                            {idx < 4 && <div className="h-4 w-px bg-gray-300 flex-shrink-0"></div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
      </div>
  );

  const DecorationLayer = ({ isPrint = false }) => (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isEditing && !isPrint ? 'z-[2000]' : 'z-[0]'}`}>
          {report.decorations?.map(d => (
              <div 
                key={d.id}
                style={{
                    position: 'absolute',
                    left: `${d.x}%`,
                    top: `${d.y}%`,
                    transform: `translate(-50%, -50%) scale(${d.scale})`,
                    opacity: d.opacity,
                    cursor: isEditing && !isPrint ? 'move' : 'default',
                    pointerEvents: isEditing && !isPrint ? 'auto' : 'none',
                    touchAction: 'none' 
                }}
                onMouseDown={(e) => !isPrint && handleDecoStart(e, d.id)}
                onTouchStart={(e) => !isPrint && handleDecoStart(e, d.id)}
                className={`origin-center select-none ${activeDecoId === d.id && !isPrint ? 'ring-2 ring-indigo-500 rounded border border-indigo-300' : ''}`}
              >
                  <img src={d.url} className="max-w-[300px] h-auto min-w-[50px] min-h-[50px] object-contain select-none pointer-events-none" draggable={false} alt="Decoration" />
              </div>
          ))}
      </div>
  );

  // ================= MAIN RENDER =================

  // 1. Map View (Landing Page)
  if (currentView === 'map') {
      return <LandingMap onSelectRegion={handleRegionSelect} />;
  }

  // 2. Loading State (Transitioning to Report)
  if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 animate-fade-in relative z-50">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
            <p className="text-white font-medium animate-pulse">جاري تحميل تقارير {selectedRegion === 'makkah' ? 'مكة المكرمة' : selectedRegion === 'riyadh' ? 'الرياض' : selectedRegion === 'sharqiyah' ? 'المنطقة الشرقية' : 'القصيم'}...</p>
        </div>
      );
  }

  // 3. Empty State (No Reports for selected region)
  if (reports.length === 0 && !loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-6 animate-fade-in px-4 relative z-50">
              <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center max-w-md w-full">
                  <MapIcon className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedRegion === 'riyadh' ? 'منطقة الرياض' : selectedRegion === 'sharqiyah' ? 'المنطقة الشرقية' : selectedRegion === 'qassim' ? 'منطقة القصيم' : 'هذه المنطقة'}
                  </h2>
                  <p className="text-indigo-100 mb-8">
                      لم تبدأ التقارير لهذه المنطقة بعد. سيتم إضافة البيانات قريباً.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                      <button onClick={handleBackToMap} className="w-full py-3 bg-white text-brand-dark font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                          <ArrowRight size={18} /> عودة للخريطة
                      </button>
                      
                      {isAdmin && (
                          <button onClick={handleCreateNewReport} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-dark transition-colors flex items-center justify-center gap-2 border border-white/20">
                             <Plus size={18} /> البدء بإنشاء تقرير جديد (مشرف)
                          </button>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // 4. Report View
  return (
    <div className="min-h-screen pb-4 relative">
      {/* Print Loading Overlay */}
      {isPrinting && (
          <div className="fixed inset-0 z-[9999] bg-white/95 flex flex-col items-center justify-center">
              <Loader2 className="w-16 h-16 text-brand-primary animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-brand-dark mb-2">جاري تجهيز ملف PDF...</h2>
              <p className="text-gray-500">قد يستغرق هذا بضع ثوانٍ، يرجى الانتظار</p>
          </div>
      )}

      {isEditing && activeDecoId && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] bg-white shadow-2xl rounded-full px-6 py-3 border border-gray-200 flex items-center gap-6 animate-fade-in no-print">
              <span className="text-xs font-bold text-gray-500 hidden md:block">تحكم بالزخرفة:</span>
              <button onClick={() => updateDecoScale(activeDecoId, 0.1)} className="p-2 hover:bg-gray-100 rounded-full text-brand-primary transition-colors bg-gray-50" title="تكبير"><ZoomInIcon size={24}/></button>
              <button onClick={() => updateDecoScale(activeDecoId, -0.1)} className="p-2 hover:bg-gray-100 rounded-full text-brand-primary transition-colors bg-gray-50" title="تصغير"><ZoomOutIcon size={24}/></button>
              <div className="w-px h-8 bg-gray-300"></div>
              <button onClick={() => deleteDecoration(activeDecoId)} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors bg-red-50" title="حذف"><Trash2 size={24}/></button>
              <button onClick={() => setActiveDecoId(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors" title="إغلاق"><X size={20}/></button>
          </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && (
         <div className="fixed inset-0 z-[5000] bg-black/90 flex flex-col items-center overflow-y-auto pt-16 pb-20 no-print animate-fade-in">
            <div className="fixed top-0 left-0 w-full bg-gray-900/95 backdrop-blur-md text-white p-4 z-[5010] flex justify-between items-center shadow-md border-b border-gray-800">
                 <div className="flex items-center gap-4">
                     <h2 className="font-bold text-lg text-white">معاينة الطباعة (A4)</h2>
                     <span className="text-xs text-gray-400 hidden md:inline">هذا ما سيظهر في ملف PDF تماماً</span>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-dark rounded-lg font-bold text-xs text-white transition-colors"><FileDown size={14} /> تحميل PDF</button>
                     <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"><X size={20} /></button>
                 </div>
            </div>
            <div className="transform-gpu origin-top scale-[0.45] md:scale-[0.6] lg:scale-[0.75] transition-transform flex flex-col gap-10 mt-4">
                <ReportPrintTemplate report={report} />
            </div>
         </div>
      )}

      {/* Screen Image Viewer */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in no-print" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-5xl max-h-[90vh] animate-zoom-in w-full h-full flex items-center justify-center">
                 <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-2 z-50"><X size={32} /></button>
                 {isViewerImageLoading && (
                     <div className="absolute inset-0 flex items-center justify-center">
                         <Loader2 className="w-12 h-12 text-white animate-spin" />
                     </div>
                 )}
                 <img 
                    src={selectedImage} 
                    alt="View" 
                    className={`max-h-[85vh] max-w-full object-contain rounded-lg transition-opacity duration-300 ${isViewerImageLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setIsViewerImageLoading(false)}
                    onLoadStart={() => setIsViewerImageLoading(true)}
                 />
            </div>
        </div>
      )}

      <div className="max-w-[210mm] mx-auto mt-4 md:mt-8 relative z-50 no-print px-4 md:px-0">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/40 flex flex-col items-end md:flex-row md:justify-between md:items-center gap-4 shadow-xl">
            <div className="flex items-center gap-3 w-full">
                {/* Back Button */}
                <button onClick={handleBackToMap} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors" title="عودة للخريطة">
                    <ArrowRight size={20} />
                </button>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide flex-grow">
                    {reports.map((r: WeeklyReport, idx) => (
                        <button key={r.id} onClick={() => setCurrentReportIndex(idx)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentReportIndex === idx ? 'bg-brand-primary text-white shadow-md' : 'bg-white/50 text-gray-700 hover:bg-white border border-transparent hover:border-gray-200'}`}>{r.header.weekTitle}</button>
                    ))}
                    {isAdmin && <button onClick={handleCreateNewReport} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100"><Plus size={18} /></button>}
                </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-auto pl-2 md:pl-0">
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-800 text-xs font-bold shadow-lg shadow-gray-900/20 transition-all transform hover:-translate-y-0.5"><FileDown size={16} /> تحميل PDF</button>
                {isAdmin && (
                    <>
                        <div className="h-6 w-px bg-gray-300 mx-1"></div>
                        <button onClick={() => setShowPrintPreview(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"><Eye size={14} /> معاينة</button>
                        <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs ${isEditing ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{isEditing ? <Edit3 size={14} /> : <Edit3 size={14} />} {isEditing ? "تعديل" : "معاينة"}</button>
                        <button onClick={saveReportToFirestore} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all ${isDirty ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' : 'bg-brand-primary text-white hover:bg-brand-dark'}`}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "جاري الحفظ..." : isDirty ? "حفظ التغييرات" : "حفظ"}</button>
                    </>
                )}
            </div>
        </div>
      </div>

      <div ref={containerRef} className="screen-only-container max-w-[210mm] mx-4 md:mx-auto mt-6 bg-white shadow-2xl min-h-[297mm] h-auto p-6 md:p-12 relative flex flex-col z-10 rounded-[2rem] overflow-hidden border border-gray-100/50">
        
        {isEditing && isAdmin && (
            <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 rounded-xl no-print space-y-6 relative z-50">
                 <div className="border-b border-indigo-100 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-brand-dark"><LayoutTemplate className="text-pink-500" /><h2 className="font-bold text-lg">0. صورة الغلاف (اختياري)</h2></div>
                        <div className="flex gap-4 items-center">
                            <input type="file" ref={coverImageRef} accept="image/*" onChange={handleCoverImageUpload} className="hidden" />
                            <button onClick={() => coverImageRef.current?.click()} className="bg-white border border-pink-300 text-pink-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-pink-50"><ImageIcon size={16} /> رفع تصميم الغلاف (A4)</button>
                            {report.coverImage && <button onClick={() => updateCurrentReport({ coverImage: undefined })} className="text-red-500 text-xs underline">حذف</button>}
                        </div>
                    </div>
                     <div>
                        <div className="flex items-center gap-2 mb-3 text-brand-dark"><LayoutTemplate className="text-blue-500" /><h2 className="font-bold text-lg">0.1 خلفية الصفحات (الداخلية)</h2></div>
                        <div className="flex gap-4 items-center">
                            <input type="file" ref={pageBgRef} accept="image/*" onChange={handlePageBackgroundUpload} className="hidden" />
                            <button onClick={() => pageBgRef.current?.click()} className="bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-blue-50"><ImageIcon size={16} /> رفع خلفية (A4)</button>
                            {report.pageBackgroundImage && <button onClick={() => updateCurrentReport({ pageBackgroundImage: undefined })} className="text-red-500 text-xs underline">حذف</button>}
                        </div>
                    </div>
                </div>
                 <div className="border-b border-indigo-100 pb-6">
                    <div className="flex items-center gap-2 mb-3 text-brand-dark"><Move className="text-purple-500" /><h2 className="font-bold text-lg">0.2 زخارف حرة (Free SVG)</h2></div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="file" ref={decorationInputRef1} accept="image/*,.svg" onChange={handleDecorationUpload(0)} className="hidden" />
                        <button onClick={() => decorationInputRef1.current?.click()} className="bg-white border border-purple-300 text-purple-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-purple-50"><Plus size={16} /> زخرفة 1</button>
                        <input type="file" ref={decorationInputRef2} accept="image/*,.svg" onChange={handleDecorationUpload(1)} className="hidden" />
                        <button onClick={() => decorationInputRef2.current?.click()} className="bg-white border border-purple-300 text-purple-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-purple-50"><Plus size={16} /> زخرفة 2</button>
                    </div>
                </div>

                <div className="border-b border-indigo-100 pb-6">
                    <div className="flex items-center gap-2 mb-3 text-brand-dark"><Sparkles className="text-yellow-500" /><h2 className="font-bold text-lg">1. استيراد البيانات</h2></div>
                    <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="نص التقرير..." className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm mb-2" dir="rtl" />
                    <button onClick={handleSmartParse} disabled={isParsing || !rawText.trim()} className="bg-brand-primary text-white px-6 py-2 rounded-lg flex items-center gap-2">{isParsing ? <Loader2 className="animate-spin" /> : "تعبئة الجدول تلقائياً"}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => bulkImageInputRef.current?.click()} disabled={isAnalyzingImages} className="w-full border-2 border-dashed border-teal-300 bg-teal-50 text-teal-700 py-4 rounded-lg flex flex-col items-center justify-center"><input type="file" multiple accept="image/*" ref={bulkImageInputRef} onChange={handleBulkImageUpload} className="hidden" />{isAnalyzingImages ? <Loader2 className="animate-spin" /> : <UploadCloud size={24} />}<span className="font-bold text-sm">توزيع صور الزيارات</span></button>
                    <button onClick={() => bulkLogoInputRef.current?.click()} disabled={isAnalyzingLogos} className="w-full border-2 border-dashed border-purple-300 bg-purple-50 text-purple-700 py-4 rounded-lg flex flex-col items-center justify-center"><input type="file" multiple accept="image/*" ref={bulkLogoInputRef} onChange={handleBulkFactoryLogoUpload} className="hidden" />{isAnalyzingLogos ? <Loader2 className="animate-spin" /> : <Factory size={24} />}<span className="font-bold text-sm">توزيع شعارات المصانع</span></button>
                </div>
                 <div className="border-t border-indigo-100 pt-4 flex justify-end">
                    <button onClick={() => handleDeleteCurrentReport()} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"><Trash2 size={14} /> حذف هذا التقرير</button>
                </div>
            </div>
        )}

        <div className="border-b-2 border-brand-primary pb-6 mb-8 relative z-20">
            <ReportHeaderContent />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-3 md:gap-0 bg-gradient-to-l from-brand-dark via-brand-primary to-brand-accent text-white p-4 rounded-lg mb-10 shadow-lg relative z-20">
            <div className="text-right order-2 md:order-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">التقرير الأسبوعي ({selectedRegion === 'makkah' ? 'مكة المكرمة' : selectedRegion === 'riyadh' ? 'الرياض' : selectedRegion === 'sharqiyah' ? 'الشرقية' : selectedRegion === 'qassim' ? 'القصيم' : ''})</h1>
                <p className="text-indigo-100 text-sm md:text-base">مبادرة صناعيو المستقبل – النسخة الرابعة</p>
            </div>
            <div className="text-left bg-white/10 p-2 rounded backdrop-blur-sm order-1 md:order-2 w-full md:w-auto">
                {isEditing ? (
                    <div className="flex flex-col gap-1 w-full">
                        <input type="text" value={report.header.weekTitle} onChange={(e) => handleUpdateHeader('weekTitle', e.target.value)} className="bg-transparent border-b border-indigo-300 text-white font-bold w-full" />
                        <input type="text" value={report.header.dateRange} onChange={(e) => handleUpdateHeader('dateRange', e.target.value)} className="bg-transparent border-b border-indigo-300 text-white text-sm w-full" />
                    </div>
                ) : (
                    <div className="flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start gap-4 md:gap-0">
                        <h2 className="text-sm md:text-lg font-bold whitespace-nowrap">{report.header.weekTitle}</h2>
                        <div className="block md:hidden text-[10px] opacity-90 font-medium leading-snug text-left dir-ltr">
                           {report.header.dateRange}
                        </div>
                        <p className="hidden md:block text-sm md:text-base dir-ltr opacity-90 font-medium">{report.header.dateRange}</p>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-grow relative z-20">
            {visitsLoading ? (
                 <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
            ) : (
                report.visits.map((visit: Visit) => (
                    <VisitCard 
                        key={visit.id} 
                        visit={visit} 
                        isEditing={isEditing} 
                        onUpdate={handleUpdateVisit}
                        onDelete={handleDeleteVisit}
                        onImageClick={(url) => setSelectedImage(url)}
                        onUploadImages={(files) => handleManualVisitImageUpload(files, visit.id)}
                        onUploadLogo={(file) => handleVisitLogoUpload(file, visit.id)}
                    />
                ))
            )}
            
            {isEditing && !visitsLoading && (
                <button onClick={handleAddVisit} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-brand-primary hover:text-brand-primary flex items-center justify-center gap-2 mb-8 no-print">
                    <Plus size={24} /> إضافة زيارة يدوياً
                </button>
            )}
            <StatisticsSection stats={report.stats} categoryLogos={report.logos.categories} isEditing={isEditing} onUpdate={handleUpdateStats} onLogoUpdate={(key) => handleLogoUpdate('categories', key)} />
        </div>

        <div className="mt-8 pt-4 border-t border-gray-200 relative pb-4 z-20">
             <div className="text-center mb-6 text-brand-dark font-bold text-2xl relative z-10">شركاء النجاح</div>
             <div className="w-full px-4 relative z-10">
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-8">
                    {report.logos.partners.map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex flex-col items-center gap-2 group/partner">
                                <div className={`relative w-full flex items-center justify-center ${isEditing ? 'cursor-pointer p-1 rounded hover:bg-gray-100' : ''}`} onClick={() => isEditing && partnerRefs.current[idx]?.click()}>
                                    <img src={partner.url} style={{ height: `${48 * partner.scale}px` }} className="object-contain transition-all duration-200 w-auto" alt="" />
                                    <input type="file" ref={el => { partnerRefs.current[idx] = el; }} onChange={handleLogoUpdate('partners', idx)} className="hidden" accept="image/*,.svg" />
                                </div>
                                {isEditing && (
                                    <div className="flex items-center gap-1 bg-white shadow-sm border border-gray-200 rounded-md px-1 py-0.5 no-print z-20 absolute -bottom-6 left-1/2 -translate-x-1/2">
                                        <button onClick={(e) => { e.stopPropagation(); changePartnerScale(idx, 0.1); }} className="p-1 hover:bg-gray-100 text-brand-primary rounded"><Plus size={10} /></button>
                                        <div className="w-px h-3 bg-gray-300"></div>
                                        <button onClick={(e) => { e.stopPropagation(); changePartnerScale(idx, -0.1); }} className="p-1 hover:bg-gray-100 text-brand-primary rounded"><Minus size={10} /></button>
                                    </div>
                                )}
                            </div>
                            {idx < report.logos.partners.length - 1 && <div className="h-10 w-px bg-gray-200 mx-2"></div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
        <DecorationLayer />
      </div>
    </div>
  );
}