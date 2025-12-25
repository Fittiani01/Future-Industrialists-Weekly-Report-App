import React, { useState, useEffect, useRef } from 'react';
import { Visit, WeeklyReport, Statistics, CategoryLogos, PartnerLogo, Decoration } from './types';
import { INITIAL_REPORT } from './constants';
import { VisitCard } from './components/VisitCard';
import { StatisticsSection } from './components/StatisticsSection';
import { parseReportFromText, matchImagesToVisits, matchLogosToFactories } from './services/geminiService';
import { Edit3, Sparkles, Loader2, Plus, FileText, Image as ImageIcon, UploadCloud, Factory, Eraser, Trash2, CheckCircle2, X, Printer, Cloud, Save, AlertCircle, Minus, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, LayoutTemplate, Move, MousePointer2, Hand, Download } from 'lucide-react';
import mammoth from 'mammoth';

// Firebase Imports
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { uploadReportImage } from './utils/uploadImage';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

// Helper for Arabic Ordinals
const getArabicOrdinal = (n: number) => {
    const ordinals = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر"];
    return ordinals[n] || n.toString();
};

export default function App() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false); // New state for PDF generation
  
  // Admin Mode State - Default to FALSE (Public view)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Dragging State for Decorations
  const [activeDecoId, setActiveDecoId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track dragging state to distinguish between click and drag
  const isDraggingRef = useRef(false);

  // Parsing & AI State
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null); 
  
  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
  const [isAnalyzingLogos, setIsAnalyzingLogos] = useState(false);
  const [imageMatchStatus, setImageMatchStatus] = useState<string>("");
  const [logoMatchStatus, setLogoMatchStatus] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Refs
  const wordInputRef = useRef<HTMLInputElement>(null);
  const bulkImageInputRef = useRef<HTMLInputElement>(null);
  const bulkLogoInputRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);
  const decorationInputRef1 = useRef<HTMLInputElement>(null);
  const decorationInputRef2 = useRef<HTMLInputElement>(null);
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const rightLogoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const partnerRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Initial Load from Firebase
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminMode = params.get('mode') === 'admin';
    
    setIsAdmin(adminMode);
    setIsEditing(adminMode);

    const init = async () => {
        setLoading(true);
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Auth Error", error);
        }

        try {
            const q = query(collection(db, "weeklyReports"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const loadedReports: WeeklyReport[] = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                loadedReports.push({ id: doc.id, ...data, visits: data.visits || [] } as WeeklyReport);
            });

            if (loadedReports.length > 0) {
                setReports(loadedReports);
            } else {
                setReports([{...INITIAL_REPORT, id: `week-${Date.now()}`}]);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
            setReports([INITIAL_REPORT]);
        } finally {
            setLoading(false);
        }
    };

    init();
  }, []);

  // 2. Fetch Visits Subcollection
  useEffect(() => {
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
      if (reports.length > 0) fetchVisits();
  }, [currentReportIndex, reports.length > 0 ? reports[currentReportIndex]?.id : null]);


  const report = reports[currentReportIndex] || INITIAL_REPORT;

  // --- PDF GENERATION HELPERS ---
  
  // Wait for images to load before capturing
  const waitImages = async (element: HTMLElement) => {
    const imgs = Array.from(element.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        // Add a timeout to prevent hanging forever if an image fails
        const timer = setTimeout(() => resolve(), 3000);
        img.onload = () => { clearTimeout(timer); resolve(); };
        img.onerror = () => { clearTimeout(timer); resolve(); };
      });
    }));
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    // 1. Prepare for Export (Visible mode)
    // IMPORTANT: This must happen BEFORE window.print() or html2pdf
    document.body.classList.add('export-mode');
    window.scrollTo(0, 0);

    const element = document.querySelector('.print-only-container') as HTMLElement;
    if (element) {
        await new Promise(r => requestAnimationFrame(() => setTimeout(r, 100))); // Small delay to let DOM render
        await waitImages(element);
    }

    // 2. MOBILE/iOS OPTIMIZATION:
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        const originalTitle = document.title;
        const safeWeek = report.header.weekTitle.replace(/[\/\\?%*:|"<>]/g, '-').trim();
        const safeDate = report.header.dateRange.replace(/[\/\\?%*:|"<>]/g, '-').trim();
        document.title = `${safeWeek} - ${safeDate}`;
        
        // Native Print Dialog
        window.print();
        
        // Cleanup after print dialog closes (approximate)
        setTimeout(() => { 
            document.title = originalTitle; 
            document.body.classList.remove('export-mode');
            setIsGeneratingPDF(false);
        }, 1000); // 1s delay gives enough time for the OS to grab the content
        return;
    }

    // 3. DESKTOP LOGIC (html2pdf):
    if (!element) {
        setIsGeneratingPDF(false);
        document.body.classList.remove('export-mode');
        return;
    }

    await new Promise(r => setTimeout(r, 800)); 

    const safeWeek = report.header.weekTitle.replace(/[\/\\?%*:|"<>]/g, '-').trim();
    const safeDate = report.header.dateRange.replace(/[\/\\?%*:|"<>]/g, '-').trim();
    const filename = `${safeWeek} - ${safeDate}.pdf`;

    const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            scrollY: 0, 
            windowWidth: 794 
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
        const worker = html2pdf().set(opt).from(element);
        await worker.save();
    } catch (e) {
        console.error("PDF Generation Error:", e);
        alert("حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    } finally {
        document.body.classList.remove('export-mode');
        setIsGeneratingPDF(false);
    }
  };

  // --- Update Helpers ---
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
          } catch(e) {
              console.error(e);
              alert("فشل رفع الزخرفة");
          }
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
    if (!report || !isAdmin) return;
    setSaving(true);
    try {
        const reportId = report.id || `week-${Date.now()}`;
        const { visits, ...mainReportData } = report;
        
        // Prepare object and sanitize undefined values
        const reportToSave: any = { 
            ...mainReportData, 
            visits: [], 
            id: reportId,
            createdAt: report.createdAt || serverTimestamp() 
        };

        // CRITICAL FIX: Remove undefined keys to prevent Firestore crashes
        Object.keys(reportToSave).forEach(key => {
            if (reportToSave[key] === undefined) {
                delete reportToSave[key];
            }
        });

        await setDoc(doc(db, "weeklyReports", reportId), reportToSave, { merge: true });
        const visitsRef = collection(db, "weeklyReports", reportId, "visits");
        
        const existingSnapshot = await getDocs(visitsRef);
        const existingIds = new Set(existingSnapshot.docs.map(d => d.id));
        const currentIds = new Set(visits.map(v => v.id));

        const deletePromises: Promise<void>[] = [];
        existingIds.forEach(id => {
            if (!currentIds.has(id)) {
                deletePromises.push(deleteDoc(doc(visitsRef, id)));
            }
        });
        await Promise.all(deletePromises);

        const savePromises = visits.map(visit => {
            // Ensure no undefined in visits as well, though usually they are clean
            const visitToSave: any = { ...visit };
            Object.keys(visitToSave).forEach(key => {
                if (visitToSave[key] === undefined) delete visitToSave[key];
            });
            return setDoc(doc(visitsRef, visit.id), visitToSave);
        });
        await Promise.all(savePromises);
        
        setIsDirty(false);
        if (!report.id) {
            updateCurrentReport({ id: reportId });
        }
    } catch (error: any) {
        console.error("Error saving report:", error);
        alert(`فشل الحفظ: ${error.message || "تأكد من الاتصال بالإنترنت"}`);
    } finally {
        setSaving(false);
    }
  };

  const handleCreateNewReport = () => {
      const nextWeekNum = reports.length + 1;
      const weekTitle = `الأسبوع ${getArabicOrdinal(nextWeekNum)}`;
      const newId = `week-${Date.now()}`;
      const newReport: WeeklyReport = {
          ...INITIAL_REPORT,
          id: newId,
          header: { ...INITIAL_REPORT.header, weekTitle: weekTitle },
          logos: report.logos, 
          visits: [], 
          decorations: report.decorations || [],
          createdAt: serverTimestamp() 
      };
      setReports(prev => [newReport, ...prev]); 
      setCurrentReportIndex(0);
      setIsDirty(true);
  };

  const handleDeleteCurrentReport = async () => {
      if (!isAdmin) return;
      if (reports.length <= 1) {
          alert("لا يمكن حذف التقرير الأخير.");
          return;
      }
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
                  setCurrentReportIndex(0);
                  setIsDirty(false);
              } catch (e) {
                  console.error("Error deleting doc:", e);
              }
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
          } catch(e: any) { 
              console.error(e); 
          }
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
            const url = await uploadReportImage(file, report.id, 'cover_page');
            updateCurrentReport({ coverImage: url });
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
                  const result = await mammoth.extractRawText({ arrayBuffer });
                  setRawText(result.value);
              } catch (err) { console.error(err); }
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
      setImageMatchStatus("جاري التوزيع الذكي...");
      try {
        const filenames = files.map(f => f.name);
        const mapping = await matchImagesToVisits(filenames, report.visits);
        const newVisits = [...report.visits];
        const visitMap = new Map(newVisits.map((v: Visit) => [v.id, v]));
        let matchCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const visitId = mapping[i.toString()];
            if (visitId && visitMap.has(visitId)) {
                const visit = visitMap.get(visitId)!;
                if (visit.images.length < 4) {
                    try {
                        const url = await uploadReportImage(file, report.id, visitId);
                        visit.images.push(url);
                        matchCount++;
                    } catch (err) { console.error(err); }
                }
            }
        }
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
        setImageMatchStatus(`تم رفع ${matchCount} صورة.`);
      } catch (error: any) { setImageMatchStatus(`خطأ: ${error.message}`); } 
      finally { setIsAnalyzingImages(false); if(bulkImageInputRef.current) bulkImageInputRef.current.value=""; }
  };

  const handleBulkFactoryLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !report.id) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingLogos(true);
      setLogoMatchStatus("جاري التحليل...");
      try {
        const filenames = files.map(f => f.name);
        const mapping = await matchLogosToFactories(filenames, report.visits);
        const newVisits = [...report.visits];
        const visitMap = new Map(newVisits.map((v: Visit) => [v.id, v]));
        let matchCount = 0;
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
                    matchCount++;
                } catch(e) { console.error(e); }
            }
        }
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
        setLogoMatchStatus(`تم توزيع ${matchCount} شعار.`);
      } catch (e: any) { setLogoMatchStatus(`خطأ: ${e.message}`); } 
      finally { setIsAnalyzingLogos(false); if(bulkLogoInputRef.current) bulkLogoInputRef.current.value = ""; }
  };

  const chunkArray = <T,>(array: T[], size: number): T[][] => {
      const result: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size));
      }
      return result;
  };
  const visitChunks = chunkArray(report.visits, 4);

  // --- Render Sub-components ---
  const ReportHeaderContent = () => (
      <header className="flex justify-between items-center w-full mb-1 relative z-20">
            <div className="flex items-center gap-1 md:gap-4 h-5 md:h-16 print:h-12 flex-shrink-0">
                 {report.logos.rightLogos.map((logo, idx) => (
                    <React.Fragment key={idx}>
                        <div className="relative h-full flex items-center">
                            <img src={logo} alt="" crossOrigin="anonymous" className="h-full object-contain max-h-4 md:max-h-14 print:max-h-10" />
                        </div>
                        {idx < report.logos.rightLogos.length - 1 && <div className="h-4 md:h-8 w-px bg-gray-300 mx-1 md:mx-2"></div>}
                    </React.Fragment>
                 ))}
            </div>
            <div className="flex-grow mx-8"></div>
            <div className="flex flex-col gap-2 relative h-9 md:h-20 print:h-14 items-end justify-center flex-shrink-0">
                 <img src={report.logos.main} alt="Future Industrialists" crossOrigin="anonymous" className="h-full object-contain" />
            </div>
      </header>
  );

  const ReportFooterContent = () => {
    const partnersTop = report.logos.partners.slice(0, 6);
    const partnersBottom = report.logos.partners.slice(6, 11);
    return (
      <div className="w-full flex flex-col items-center mt-auto border-t border-gray-200 pt-1 pb-1 relative z-50">
        <div className="text-center mb-1 text-brand-dark font-bold text-sm">شركاء النجاح</div>
        <div className="w-full px-2 relative z-10">
            <div className="flex flex-col items-center gap-3 w-full pb-2">
                <div className="flex justify-between items-center w-full px-2 flex-nowrap">
                    {partnersTop.map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex items-center justify-center h-7 px-1 flex-1">
                                <img src={partner.url} crossOrigin="anonymous" className="h-full w-auto object-contain max-w-[50px]" alt="" />
                            </div>
                            {idx < partnersTop.length - 1 && <div className="h-4 w-px bg-gray-300 flex-shrink-0"></div>}
                        </React.Fragment>
                    ))}
                </div>
                 <div className="flex justify-center items-center gap-6 w-full px-2 flex-nowrap">
                    {partnersBottom.map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex items-center justify-center h-7 px-1">
                                <img src={partner.url} crossOrigin="anonymous" className="h-full w-auto object-contain max-w-[50px]" alt="" />
                            </div>
                            {idx < partnersBottom.length - 1 && <div className="h-4 w-px bg-gray-300 flex-shrink-0"></div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
      </div>
  )};

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
                  <img src={d.url} crossOrigin="anonymous" className="max-w-[300px] h-auto min-w-[50px] min-h-[50px] object-contain select-none pointer-events-none" draggable={false} alt="Decoration" />
              </div>
          ))}
      </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 text-brand-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-4 relative">
      
      {/* ======================= FIXED EDIT CONTROLS (Active Decoration) ======================= */}
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

      {/* ======================= PRINT VIEW ======================= */}
      <div className="print-only-container" dir="rtl">
          {/* ... (Print logic same as before) ... */}
          {/* 1. Cover Page (PRINT) */}
          {report.coverImage && (
            <div className="print-page">
                {/* Full Bleed Image */}
                <img src={report.coverImage} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover z-0" alt="Cover" />
                
                {/* Overlay Text */}
                <div className="absolute bottom-0 pb-12 left-0 w-full flex flex-col items-center justify-end z-10 text-white px-8">
                    <h1 className="text-2xl font-bold font-sans mb-1 drop-shadow-md tracking-wide text-center">{report.header.weekTitle}</h1>
                    <div className="w-24 h-0.5 bg-white/90 my-3 rounded-full shadow-sm"></div>
                    <p className="text-lg font-bold font-sans dir-ltr drop-shadow-md opacity-95 text-center">{report.header.dateRange}</p>
                </div>
            </div>
          )}

          {/* 2. Content Pages */}
          {visitChunks.map((chunk, pageIndex) => (
              <div key={pageIndex} className="print-page">
                  <DecorationLayer isPrint={true} />
                  
                  {/* Content Container (Safe Area) */}
                  <div className="print-content-safe-area">
                      <div className="relative z-10 w-full">
                        <ReportHeaderContent />
                        {/* Changed border opacity and text opacity to solid colors for better print quality */}
                        <div className="mb-4 mt-2 border-b-2 border-indigo-200 pb-2">
                                <div className="flex justify-between items-end px-2">
                                    <div className="flex flex-col">
                                        <h1 className="text-xl font-bold text-brand-dark">التقرير الأسبوعي ({report.header.weekTitle})</h1>
                                        <span className="text-xs font-bold text-brand-primary">مبادرة صناعيو المستقبل – النسخة الرابعة</span>
                                    </div>
                                    <span className="text-sm text-gray-500 dir-ltr font-medium mb-0.5">{report.header.dateRange}</span>
                                </div>
                        </div>
                      </div>

                      <div className="flex-grow flex flex-col justify-start gap-1 pt-4 relative z-10 w-full">
                          {chunk.map((visit: Visit) => (
                               <VisitCard key={visit.id} visit={visit} isEditing={false} isPrint={true} onUpdate={() => {}} onDelete={() => {}} onImageClick={() => {}} />
                          ))}
                      </div>

                      <ReportFooterContent />
                  </div>
              </div>
          ))}

          {/* 3. Statistics Page - Added 'last-page' class to force page break behavior */}
          <div className="print-page last-page">
               <DecorationLayer isPrint={true} />
               
               {/* Content Container (Safe Area) */}
               <div className="print-content-safe-area">
                   <div className="relative z-10 w-full">
                       <ReportHeaderContent />
                        <div className="mb-4 mt-2 border-b-2 border-indigo-200 pb-2">
                                <div className="flex justify-between items-end px-2">
                                    <div className="flex flex-col">
                                        <h1 className="text-xl font-bold text-brand-dark">التقرير الأسبوعي ({report.header.weekTitle})</h1>
                                        <span className="text-xs font-bold text-brand-primary">مبادرة صناعيو المستقبل – النسخة الرابعة</span>
                                    </div>
                                    <span className="text-sm text-gray-500 dir-ltr font-medium mb-0.5">{report.header.dateRange}</span>
                                </div>
                        </div>
                       <div className="mb-2 border-b-2 border-indigo-200 pb-2 mt-1">
                            <h2 className="text-xl font-bold text-center text-brand-dark">إحصائيات المبادرة</h2>
                       </div>
                   </div>
                   
                   <div className="flex-grow flex flex-col justify-start py-0 relative z-10 w-full">
                        <StatisticsSection stats={report.stats} categoryLogos={report.logos.categories} isEditing={false} isPrint={true} onUpdate={() => {}} onLogoUpdate={() => (() => {})} />
                   </div>
                   
                   <ReportFooterContent />
               </div>
          </div>
      </div>

      {/* ======================= SCREEN VIEW ======================= */}
      {/* ... rest of the app ... */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in no-print" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-5xl max-h-[90vh] animate-zoom-in">
                 <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300"><X size={32} /></button>
                 <img src={selectedImage} alt="View" className="max-h-[85vh] max-w-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            </div>
        </div>
      )}

      {/* --- CONTROLS (MOVED OUTSIDE PAPER) --- */}
      <div className="max-w-[210mm] mx-auto mt-4 md:mt-8 relative z-50 no-print px-4 md:px-0">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/40 flex flex-col items-end md:flex-row md:justify-between md:items-center gap-4 shadow-xl">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
                {reports.map((r: WeeklyReport, idx) => (
                    <button key={r.id} onClick={() => setCurrentReportIndex(idx)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentReportIndex === idx ? 'bg-brand-primary text-white shadow-md' : 'bg-white/50 text-gray-700 hover:bg-white border border-transparent hover:border-gray-200'}`}>{r.header.weekTitle}</button>
                ))}
                {isAdmin && <button onClick={handleCreateNewReport} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-100"><Plus size={18} /></button>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-auto pl-2 md:pl-0">
                <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-lg shadow-gray-900/20 transition-all transform hover:-translate-y-0.5 ${isGeneratingPDF ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}`}>{isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {isGeneratingPDF ? "جاري التجهيز..." : "تنزيل PDF"}</button>
                {isAdmin && (
                    <>
                        <div className="h-6 w-px bg-gray-300 mx-1"></div>
                        <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs ${isEditing ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{isEditing ? <Edit3 size={14} /> : <Edit3 size={14} />} {isEditing ? "وضع التعديل" : "معاينة"}</button>
                        <button onClick={saveReportToFirestore} disabled={!isDirty || saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all ${isDirty ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' : 'bg-gray-200 text-gray-400'}`}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}{saving ? "جاري الحفظ..." : isDirty ? "حفظ التغييرات" : "تم الحفظ"}</button>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Main Paper Container */}
      <div ref={containerRef} className="screen-only-container max-w-[210mm] mx-4 md:mx-auto mt-6 bg-white shadow-2xl min-h-[297mm] h-auto p-6 md:p-12 relative flex flex-col z-10 rounded-[2rem] overflow-hidden border border-gray-100/50">
        
        {/* Only Render Decorations here if NOT editing, otherwise we render later for z-index issues, wait... 
            Actually, to ensure it's on top of everything including white backgrounds of cards, it MUST be last.
        */}

        {/* --- ADMIN IMPORT AREA --- */}
        {isEditing && isAdmin && (
            <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 rounded-xl no-print space-y-6 relative z-50">
                {/* 1. Cover & Decoration */}
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
                        <div className="flex items-center gap-2 mb-3 text-brand-dark"><Move className="text-purple-500" /><h2 className="font-bold text-lg">0.1 زخارف حرة (Free SVG)</h2></div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Decoration 1 Button */}
                            <div className="flex flex-col gap-1">
                                <input type="file" ref={decorationInputRef1} accept="image/*,.svg" onChange={handleDecorationUpload(0)} className="hidden" />
                                <button onClick={() => decorationInputRef1.current?.click()} className="bg-white border border-purple-300 text-purple-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-purple-50">
                                    <Plus size={16} /> زخرفة 1
                                </button>
                                {report.decorations?.[0] && <span className="text-[10px] text-green-600 text-center">موجودة</span>}
                            </div>
                            
                            {/* Decoration 2 Button */}
                            <div className="flex flex-col gap-1">
                                <input type="file" ref={decorationInputRef2} accept="image/*,.svg" onChange={handleDecorationUpload(1)} className="hidden" />
                                <button onClick={() => decorationInputRef2.current?.click()} className="bg-white border border-purple-300 text-purple-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-purple-50">
                                    <Plus size={16} /> زخرفة 2
                                </button>
                                {report.decorations?.[1] && <span className="text-[10px] text-green-600 text-center">موجودة</span>}
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1"><Hand size={12}/> <span>اضغط واسحب الزخرفة على الشاشة</span></div>
                    </div>
                </div>

                {/* 2. Text Parser */}
                <div className="border-b border-indigo-100 pb-6">
                    <div className="flex items-center gap-2 mb-3 text-brand-dark"><Sparkles className="text-yellow-500" /><h2 className="font-bold text-lg">1. استيراد البيانات</h2></div>
                    <div className="flex gap-4 mb-4 items-start">
                        <div className="flex-1">
                            <input type="file" ref={wordInputRef} accept=".docx, .txt" onChange={handleFileSelect} className="hidden" />
                            <button onClick={() => wordInputRef.current?.click()} className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FileText size={16} /> رفع ملف (Word/Txt)</button>
                        </div>
                    </div>
                    <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="نص التقرير..." className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm mb-2" dir="rtl" />
                    <button onClick={handleSmartParse} disabled={isParsing || !rawText.trim()} className="bg-brand-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center transition-opacity hover:opacity-90">{isParsing ? <Loader2 className="animate-spin" /> : "تعبئة الجدول تلقائياً"}</button>
                    {parseError && <div className="text-red-600 bg-red-50 border border-red-200 p-2 rounded text-sm flex items-center gap-2 mt-2"><AlertCircle size={16} /><span>{parseError}</span></div>}
                </div>
                
                {/* 3. Bulk Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button onClick={() => bulkImageInputRef.current?.click()} disabled={isAnalyzingImages} className="w-full border-2 border-dashed border-teal-300 bg-teal-50 text-teal-700 py-4 rounded-lg flex flex-col items-center justify-center"><input type="file" multiple accept="image/*" ref={bulkImageInputRef} onChange={handleBulkImageUpload} className="hidden" />{isAnalyzingImages ? <Loader2 className="animate-spin" /> : <UploadCloud size={24} />}<span className="font-bold text-sm">توزيع صور الزيارات</span></button>
                    <button onClick={() => bulkLogoInputRef.current?.click()} disabled={isAnalyzingLogos} className="w-full border-2 border-dashed border-purple-300 bg-purple-50 text-purple-700 py-4 rounded-lg flex flex-col items-center justify-center"><input type="file" multiple accept="image/*" ref={bulkLogoInputRef} onChange={handleBulkFactoryLogoUpload} className="hidden" />{isAnalyzingLogos ? <Loader2 className="animate-spin" /> : <Factory size={24} />}<span className="font-bold text-sm">توزيع شعارات المصانع</span></button>
                </div>
                 <div className="border-t border-indigo-100 pt-4 flex justify-end">
                    <button onClick={() => handleDeleteCurrentReport()} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 border border-red-200 px-3 py-2 rounded bg-red-50"><Trash2 size={14} /> حذف هذا التقرير</button>
                </div>
            </div>
        )}

        {/* --- REPORT HEADER --- */}
        <div className="border-b-2 border-brand-primary pb-6 mb-8 relative z-20">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-2 h-16">
                    {report.logos.rightLogos.map((logo, idx) => (
                        <React.Fragment key={idx}>
                            <div className="relative group h-full flex items-center">
                                <img src={logo} alt="" className={`h-full object-contain max-h-14 ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => isEditing && rightLogoRefs.current[idx]?.click()} />
                                <input type="file" ref={el => { rightLogoRefs.current[idx] = el; }} onChange={handleLogoUpdate('right', idx)} className="hidden" accept="image/*,.svg" />
                            </div>
                            {idx < report.logos.rightLogos.length - 1 && <div className="h-8 w-px bg-gray-300 mx-2"></div>}
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex flex-col gap-2 relative group h-20 items-end justify-center">
                    <img src={report.logos.main} alt="Future Industrialists" className={`h-full object-contain ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => isEditing && mainLogoRef.current?.click()} />
                    <input type="file" ref={mainLogoRef} onChange={handleLogoUpdate('main')} className="hidden" accept="image/*,.svg" />
                </div>
            </header>
        </div>

        {/* Title */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-3 md:gap-0 bg-gradient-to-l from-brand-dark via-brand-primary to-brand-accent text-white p-4 rounded-lg mb-10 shadow-lg relative z-20">
            <div className="text-right order-2 md:order-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">التقرير الأسبوعي</h1>
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
                        
                        {/* Mobile Date Split */}
                        <div className="block md:hidden text-[10px] opacity-90 font-medium leading-snug text-left dir-ltr">
                           {report.header.dateRange.includes(' الى ') ? (
                                <div className="flex flex-col items-end">
                                    <span>{report.header.dateRange.split(' الى ')[0]}</span>
                                    <span>الى {report.header.dateRange.split(' الى ')[1]}</span>
                                </div>
                           ) : (
                                <span>{report.header.dateRange}</span>
                           )}
                        </div>

                        {/* Desktop Date */}
                        <p className="hidden md:block text-sm md:text-base dir-ltr opacity-90 font-medium">{report.header.dateRange}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Body */}
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

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 relative pb-4 z-20">
             <div className="text-center mb-6 text-brand-dark font-bold text-2xl relative z-10">شركاء النجاح</div>
             <div className="w-full px-4 relative z-10">
                
                {/* --- MOBILE: Modern Flex Layout with Simple Dividers --- */}
                <div className="md:hidden w-full flex flex-wrap justify-center items-center gap-y-6 px-2">
                    {report.logos.partners.map((partner: PartnerLogo, idx) => (
                        <div key={partner.id} className="relative flex items-center justify-center px-3 border-r border-gray-200 last:border-none">
                             <div className={`relative flex items-center justify-center ${isEditing ? 'cursor-pointer' : ''}`} onClick={() => isEditing && partnerRefs.current[idx]?.click()}>
                                <img 
                                    src={partner.url} 
                                    className="object-contain h-8 w-auto max-w-[80px]"
                                    alt="" 
                                />
                                <input type="file" ref={el => { partnerRefs.current[idx] = el; }} onChange={handleLogoUpdate('partners', idx)} className="hidden" accept="image/*,.svg" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- DESKTOP: Flex Layout (Original) --- */}
                <div className="hidden md:flex md:flex-wrap md:justify-center md:items-center md:gap-x-4 md:gap-y-8">
                    {report.logos.partners.map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex flex-col items-center gap-2 group/partner">
                                <div className={`relative w-full flex items-center justify-center ${isEditing ? 'cursor-pointer p-1 rounded hover:bg-gray-100' : ''}`} onClick={() => isEditing && partnerRefs.current[idx]?.click()}>
                                    <img 
                                        src={partner.url} 
                                        style={{ height: `${48 * partner.scale}px` }} 
                                        className="object-contain transition-all duration-200 w-auto" 
                                        alt="" 
                                    />
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

        {/* Render Decorations LAST to ensure they are on top of everything (z-index alone sometimes fails with nested relative contexts) */}
        <DecorationLayer />

      </div>
    </div>
  );
}