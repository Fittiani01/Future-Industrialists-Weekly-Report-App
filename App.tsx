import React, { useState, useEffect, useRef } from 'react';
import { Visit, WeeklyReport, Statistics, CategoryLogos, PartnerLogo } from './types';
import { INITIAL_REPORT } from './constants';
import { VisitCard } from './components/VisitCard';
import { StatisticsSection } from './components/StatisticsSection';
import { parseReportFromText, matchImagesToVisits, matchLogosToFactories } from './services/geminiService';
import { Edit3, Sparkles, Loader2, Plus, FileText, Image as ImageIcon, UploadCloud, Factory, Eraser, Trash2, CheckCircle2, X, Printer, Cloud, Save, AlertCircle, Minus, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon, LayoutTemplate } from 'lucide-react';
import mammoth from 'mammoth';

// Firebase Imports
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { uploadReportImage } from './utils/uploadImage';

// Helper for Arabic Ordinals
const getArabicOrdinal = (n: number) => {
    const ordinals = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر", "الحادي عشر", "الثاني عشر"];
    return ordinals[n] || n.toString();
};

// New Subtle Tech Corner Design - Strictly Corner Hugging
const ConstellationCorner = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg 
        viewBox="0 0 300 300" 
        className={`${className} pointer-events-none`} 
        style={style}
    >
        <defs>
             <linearGradient id="cornerFade" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2a3590" stopOpacity="0" />
                <stop offset="50%" stopColor="#2a3590" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#2a3590" stopOpacity="0.15" />
            </linearGradient>
        </defs>
        
        {/* Geometric Tech Shapes */}
        <path d="M50 300 L250 300 L300 250 L300 50" fill="none" stroke="url(#cornerFade)" strokeWidth="1" />
        <g opacity="0.1" stroke="#2a3590" strokeWidth="1.5" fill="none">
            <path d="M120 300 L260 300 L300 260 L300 120" />
            <path d="M180 300 L280 300 L300 280 L300 180" />
        </g>
        <g fill="#2a3590" opacity="0.15">
            <circle cx="300" cy="250" r="3" />
            <circle cx="250" cy="300" r="3" />
            <circle cx="300" cy="180" r="2" />
            <circle cx="180" cy="300" r="2" />
        </g>
    </svg>
);

export default function App() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Admin Mode State - Default to FALSE (Public view)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const rightLogoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const partnerRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Initial Load from Firebase (Metadata Only)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const adminMode = params.get('mode') === 'admin';
    
    setIsAdmin(adminMode);
    setIsEditing(adminMode);

    const init = async () => {
        setLoading(true);
        
        try {
            await signInAnonymously(auth);
            console.log("Signed in anonymously");
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

  // 2. Fetch Visits Subcollection when Report Changes
  useEffect(() => {
      const fetchVisits = async () => {
          const reportId = reports[currentReportIndex]?.id;
          if (!reportId) return;

          setVisitsLoading(true);
          try {
              // Fetch visits subcollection
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
              console.error("Error fetching visits subcollection:", e);
          } finally {
              setVisitsLoading(false);
          }
      };

      if (reports.length > 0) {
          fetchVisits();
      }
  }, [currentReportIndex, reports.length > 0 ? reports[currentReportIndex]?.id : null]);


  const report = reports[currentReportIndex] || INITIAL_REPORT;

  // 3. Save Logic (Split Schema)
  const saveReportToFirestore = async () => {
    if (!report || !isAdmin) return;
    setSaving(true);
    try {
        const reportId = report.id || `week-${Date.now()}`;
        const { visits, ...mainReportData } = report;
        const reportToSave = { 
            ...mainReportData, 
            visits: [], 
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
            if (!currentIds.has(id)) {
                deletePromises.push(deleteDoc(doc(visitsRef, id)));
            }
        });
        await Promise.all(deletePromises);

        const savePromises = visits.map(visit => {
            return setDoc(doc(visitsRef, visit.id), visit);
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

  // --- Handlers ---
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

  // --- Images & Logos ---
  const handleManualVisitImageUpload = async (files: File[], visitId: string): Promise<string[]> => {
      if (!report.id) return [];
      const urls: string[] = [];
      for (const file of files) {
          try {
              const url = await uploadReportImage(file, report.id, visitId);
              urls.push(url);
          } catch(e: any) { 
              console.error(e); 
              if (e.code === 'storage/unauthorized') {
                  alert("خطأ في الصلاحيات! (Storage 403).\nيرجى التأكد من تفعيل 'Anonymous Auth' في Firebase Console أو تعديل قواعد التخزين.");
                  break;
              } else {
                  alert(`فشل رفع الصورة ${file.name}: ${e.message}`);
              }
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
        } catch(e) {
            console.error("Cover upload failed", e);
            alert("فشل رفع صورة الغلاف");
        }
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
                if (section === 'right' && typeof indexOrKey === 'number' && indexOrKey >= 0) {
                    const newRightLogos = [...prev.logos.rightLogos];
                    newRightLogos[indexOrKey] = url;
                    return { ...prev, logos: { ...prev.logos, rightLogos: newRightLogos } };
                }
                if (section === 'partners' && typeof indexOrKey === 'number' && indexOrKey >= 0) {
                    const newPartners = [...prev.logos.partners];
                    newPartners[indexOrKey] = { ...newPartners[indexOrKey], url: url };
                    return { ...prev, logos: { ...prev.logos, partners: newPartners } };
                }
                if (section === 'categories' && typeof indexOrKey === 'string') {
                    return { ...prev, logos: { ...prev.logos, categories: { ...prev.logos.categories, [indexOrKey]: url } } };
                }
                return prev;
             });
          } catch (e) { 
              console.error("Upload failed", e); 
              alert("فشل رفع الشعار، يرجى المحاولة مرة أخرى");
          }
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

  // --- AI & Bulk Ops ---
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
        console.error(error);
        setParseError(error.message || "حدث خطأ غير متوقع أثناء المعالجة");
    } finally { 
        setIsParsing(false); 
    }
  };

  const handleBulkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !report.id) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingImages(true);
      setImageMatchStatus("جاري التوزيع الذكي للصور...");
      try {
        const filenames = files.map(f => f.name);
        const mapping = await matchImagesToVisits(filenames, report.visits);
        
        const newVisits = [...report.visits];
        let matchCount = 0;
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
                        matchCount++;
                    } catch (err: any) { 
                        console.error("Failed to upload image", file.name, err);
                         if (err.code === 'storage/unauthorized') {
                             alert("خطأ 403: يرجى التحقق من صلاحيات Firebase.");
                             setImageMatchStatus("توقف الرفع بسبب خطأ في الصلاحيات.");
                             return;
                         }
                    }
                }
            }
        }
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
        setImageMatchStatus(`تم مطابقة ورفع ${matchCount} صورة بنجاح!`);
      } catch (error: any) { 
          setImageMatchStatus(`فشل التوزيع: ${error.message}`); 
      } finally {
          setIsAnalyzingImages(false);
          if (bulkImageInputRef.current) bulkImageInputRef.current.value = "";
      }
  };

  const handleBulkFactoryLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !report.id) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingLogos(true);
      setLogoMatchStatus("جاري تحليل ومطابقة الشعارات...");
      
      try {
        const filenames = files.map(f => f.name);
        const mapping = await matchLogosToFactories(filenames, report.visits);
        
        const newVisits = [...report.visits];
        const visitMap = new Map(newVisits.map((v: Visit) => [v.id, v]));
        let matchCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const matchedVisitIds = mapping[i.toString()];

            if (matchedVisitIds && matchedVisitIds.length > 0) {
                const primaryVisitId = matchedVisitIds[0];
                try {
                    const url = await uploadReportImage(file, report.id, primaryVisitId);
                    
                    matchedVisitIds.forEach(id => {
                        const visit = visitMap.get(id);
                        if (visit) {
                            visit.factoryLogo = url;
                        }
                    });
                    matchCount++;
                } catch(e: any) {
                    console.error("Failed logo upload", file.name);
                    if (e.code === 'storage/unauthorized') {
                         alert("خطأ 403: يرجى التحقق من صلاحيات Firebase.");
                         return;
                    }
                }
            }
        }
        
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
        setLogoMatchStatus(`تم توزيع ${matchCount} شعار بنجاح!`);
      } catch (e: any) {
          setLogoMatchStatus(`حدث خطأ في المطابقة: ${e.message}`);
      } finally {
          setIsAnalyzingLogos(false);
          if (bulkLogoInputRef.current) bulkLogoInputRef.current.value = "";
      }
  };

  // CHANGE: Increased chunk size to 4 as requested
  const chunkArray = <T,>(array: T[], size: number): T[][] => {
      const result: T[][] = [];
      for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size));
      }
      return result;
  };

  const visitChunks = chunkArray(report.visits, 4); // CHANGED TO 4

  // --- Render Components ---

  const ReportHeaderContent = () => (
      <header className="flex justify-between items-center w-full mb-1">
            <div className="flex items-center gap-2 h-16 print:h-12">
                 {report.logos.rightLogos.map((logo, idx) => (
                    <React.Fragment key={idx}>
                        <div className="relative h-full flex items-center">
                            <img src={logo} alt="" className="h-full object-contain max-h-14 print:max-h-10" />
                        </div>
                        {/* Vertical line separator */}
                        {idx < report.logos.rightLogos.length - 1 && <div className="h-8 w-px bg-gray-300 mx-2"></div>}
                    </React.Fragment>
                 ))}
            </div>
            <div className="flex flex-col gap-2 relative h-20 print:h-14 items-end justify-center">
                 <img src={report.logos.main} alt="Future Industrialists" className="h-full object-contain" />
            </div>
      </header>
  );

  const ReportFooterContent = () => {
    // Split partners into top 6 and bottom 5 for print
    const partnersTop = report.logos.partners.slice(0, 6);
    const partnersBottom = report.logos.partners.slice(6, 11);

    return (
      <div className="w-full flex flex-col items-center mt-auto border-t border-gray-200 pt-1">
        <div className="text-center mb-1 text-brand-dark font-bold text-lg relative z-10 print:text-sm print:mb-0">شركاء النجاح</div>
        <div className="w-full px-2 relative z-10">
            {/* Screen Version (Flexible) */}
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 max-w-[95%] mx-auto print:hidden">
                {report.logos.partners.map((partner: PartnerLogo, idx) => (
                    <div key={partner.id} className="relative flex flex-col items-center justify-center">
                        <img 
                            src={partner.url} 
                            style={{ height: `${35 * partner.scale}px`, width: 'auto', maxWidth: '100px' }} 
                            className="object-contain" 
                            alt="" 
                        />
                    </div>
                ))}
            </div>

            {/* Print Version (Strict 2 Lines: 6 Top, 5 Bottom) */}
            <div className="hidden print:flex flex-col items-center gap-1 w-full">
                {/* Row 1: 6 Items */}
                <div className="flex justify-center items-center gap-x-2 w-full">
                    {partnersTop.map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex flex-col items-center justify-center h-5">
                                <img 
                                    src={partner.url} 
                                    className="h-full w-auto object-contain" 
                                    alt="" 
                                />
                            </div>
                            {idx < partnersTop.length - 1 && <div className="h-3 w-px bg-gray-300"></div>}
                        </React.Fragment>
                    ))}
                </div>
                {/* Row 2: 5 Items */}
                 <div className="flex justify-center items-center gap-x-2 w-full">
                    {partnersBottom.map((partner: PartnerLogo, idx) => (
                        <React.Fragment key={partner.id}>
                            <div className="relative flex flex-col items-center justify-center h-5">
                                <img 
                                    src={partner.url} 
                                    className="h-full w-auto object-contain" 
                                    alt="" 
                                />
                            </div>
                            {idx < partnersBottom.length - 1 && <div className="h-3 w-px bg-gray-300"></div>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
      </div>
  )};

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 text-brand-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen pb-4 relative">
      
      {/* =======================
          PRINT VIEW (Hidden on Screen) 
          ======================= */}
      <div className="hidden print-only-container">
          
          {/* OPTIONAL: Full Page Cover Image (First Page) */}
          {report.coverImage && (
            <div className="print-page w-full h-full p-0 overflow-hidden relative">
                <img src={report.coverImage} className="w-full h-full object-cover absolute inset-0 z-0" alt="Cover" />
                
                {/* DYNAMIC TEXT OVERLAY FOR COVER PAGE */}
                <div className="absolute bottom-[13%] left-0 w-full flex flex-col items-center justify-center z-10 text-white">
                    <h1 className="text-6xl font-extrabold mb-4 drop-shadow-lg tracking-wide">{report.header.weekTitle}</h1>
                    <p className="text-2xl font-bold dir-ltr drop-shadow-md opacity-90">{report.header.dateRange}</p>
                </div>
            </div>
          )}

          {/* Loop over chunks of visits to create pages */}
          {visitChunks.map((chunk, pageIndex) => (
              <div key={pageIndex} className="print-page flex flex-col justify-between">
                  
                  {/* Fixed Header */}
                  <div>
                    <ReportHeaderContent />
                    {/* Header Title Block - Visible on ALL pages now */}
                    <div className="mb-4 mt-2 border-b-2 border-brand-primary/20 pb-2">
                            <div className="flex justify-between items-center px-2">
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-bold text-brand-dark">التقرير الأسبوعي ({report.header.weekTitle})</h1>
                                    <span className="text-xs font-bold text-brand-primary/80">مبادرة صناعيو المستقبل – النسخة الرابعة</span>
                                </div>
                                <span className="text-sm text-gray-500 dir-ltr font-medium">{report.header.dateRange}</span>
                            </div>
                    </div>
                  </div>

                  {/* Flexible Content Area: 
                      CHANGE: Use justify-start and gap-4 to stack from top.
                      Added pt-4 for top spacing as requested.
                  */}
                  <div className="flex-grow flex flex-col justify-start gap-4 pt-4">
                      {chunk.map((visit: Visit) => (
                           <VisitCard 
                                key={visit.id} 
                                visit={visit} 
                                isEditing={false} // Force editing off for print
                                onUpdate={() => {}}
                                onDelete={() => {}}
                                onImageClick={() => {}}
                            />
                      ))}
                  </div>

                  {/* Fixed Footer */}
                  <ReportFooterContent />
              </div>
          ))}

          {/* Statistics Page (Always the last page) - Reorganized to full page with Footer */}
          <div className="print-page flex flex-col justify-between">
               <div>
                   <ReportHeaderContent />
                    {/* Header Title Block - Visible on Stats page too */}
                    <div className="mb-4 mt-2 border-b-2 border-brand-primary/20 pb-2">
                            <div className="flex justify-between items-center px-2">
                                <div className="flex flex-col">
                                    <h1 className="text-xl font-bold text-brand-dark">التقرير الأسبوعي ({report.header.weekTitle})</h1>
                                    <span className="text-xs font-bold text-brand-primary/80">مبادرة صناعيو المستقبل – النسخة الرابعة</span>
                                </div>
                                <span className="text-sm text-gray-500 dir-ltr font-medium">{report.header.dateRange}</span>
                            </div>
                    </div>
                   <div className="mb-6 print:mb-2 border-b-2 border-brand-primary/20 pb-2 mt-4 print:mt-1">
                        <h2 className="text-3xl print:text-xl font-bold text-center text-brand-dark">إحصائيات المبادرة</h2>
                   </div>
               </div>
               
               <div className="flex-grow flex flex-col justify-start py-4 print:py-0">
                    <StatisticsSection 
                        stats={report.stats} 
                        categoryLogos={report.logos.categories}
                        isEditing={false}
                        onUpdate={() => {}}
                        onLogoUpdate={() => (() => {})}
                    />
               </div>
               
               <ReportFooterContent />
          </div>
      </div>


      {/* =======================
          SCREEN VIEW (Hidden on Print) 
          ======================= */}

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in no-print" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-5xl max-h-[90vh] animate-zoom-in">
                 <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300"><X size={32} /></button>
                 <img src={selectedImage} alt="View" className="max-h-[85vh] max-w-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            </div>
        </div>
      )}

      {/* Screen Container */}
      <div className="screen-only-container max-w-[210mm] mx-auto mt-8 bg-white shadow-2xl min-h-[297mm] h-auto p-8 md:p-12 relative flex flex-col z-10 rounded-[2.5rem] overflow-hidden">
        
        {/* --- NAVIGATION & CONTROL BAR (VISIBLE TO ALL) --- */}
        <div className="no-print mb-8 bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-inner">
            
            {/* Week Selector - Accessible to Everyone */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
                {reports.map((r: WeeklyReport, idx) => (
                    <button
                        key={r.id}
                        onClick={() => setCurrentReportIndex(idx)}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentReportIndex === idx ? 'bg-brand-primary text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                    >
                        {r.header.weekTitle}
                    </button>
                ))}
                {/* Admin Only: Add New Report */}
                {isAdmin && (
                    <button onClick={handleCreateNewReport} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200" title="إضافة تقرير جديد">
                        <Plus size={18} />
                    </button>
                )}
            </div>

            {/* Actions Area */}
            <div className="flex items-center gap-3 flex-shrink-0">
                {/* Print Button - Accessible to Everyone */}
                <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 text-xs font-bold shadow-sm transition-colors">
                    <Printer size={14} /> طباعة PDF
                </button>
                
                {/* Admin Only Actions */}
                {isAdmin && (
                    <>
                        <div className="h-6 w-px bg-gray-300 mx-1"></div>
                        
                        <button 
                            onClick={() => setIsEditing(!isEditing)} 
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs ${isEditing ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}
                        >
                            {isEditing ? <Edit3 size={14} /> : <Edit3 size={14} />} {isEditing ? "وضع التعديل" : "معاينة"}
                        </button>

                        <button 
                            onClick={saveReportToFirestore} 
                            disabled={!isDirty || saving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all ${
                                isDirty 
                                ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' 
                                : 'bg-gray-200 text-gray-400'
                            }`}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? "جاري الحفظ..." : isDirty ? "حفظ التغييرات" : "تم الحفظ"}
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* --- SMART IMPORT AREA (Admin Only) --- */}
        {isEditing && isAdmin && (
            <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 rounded-xl no-print space-y-6">
                {/* Cover Page Uploader */}
                 <div className="border-b border-indigo-100 pb-6">
                    <div className="flex items-center gap-2 mb-3 text-brand-dark"><LayoutTemplate className="text-pink-500" /><h2 className="font-bold text-lg">0. صورة الغلاف (اختياري)</h2></div>
                    <div className="flex gap-4 items-center">
                        <input type="file" ref={coverImageRef} accept="image/*" onChange={handleCoverImageUpload} className="hidden" />
                        <button onClick={() => coverImageRef.current?.click()} className="bg-white border border-pink-300 text-pink-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-pink-50">
                            <ImageIcon size={16} /> رفع تصميم صفحة الغلاف (A4 كاملة)
                        </button>
                        {report.coverImage && (
                            <div className="flex items-center gap-2">
                                <span className="text-green-600 text-sm font-bold flex items-center gap-1"><CheckCircle2 size={14}/> تم الرفع</span>
                                <button onClick={() => updateCurrentReport({ coverImage: undefined })} className="text-red-500 text-xs underline">حذف</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Text Parser */}
                <div className="border-b border-indigo-100 pb-6">
                    <div className="flex items-center gap-2 mb-3 text-brand-dark"><Sparkles className="text-yellow-500" /><h2 className="font-bold text-lg">1. استيراد البيانات</h2></div>
                    <div className="flex gap-4 mb-4 items-start">
                        <div className="flex-1">
                            <input type="file" ref={wordInputRef} accept=".docx, .txt" onChange={handleFileSelect} className="hidden" />
                            <button onClick={() => wordInputRef.current?.click()} className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FileText size={16} /> رفع ملف (Word/Txt)</button>
                        </div>
                    </div>
                    <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="نص التقرير..." className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm mb-2" dir="rtl" />
                    
                    <div className="flex flex-col gap-2">
                        <button onClick={handleSmartParse} disabled={isParsing || !rawText.trim()} className="bg-brand-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center transition-opacity hover:opacity-90">
                            {isParsing ? <Loader2 className="animate-spin" /> : "تعبئة الجدول تلقائياً"}
                        </button>
                        {parseError && (
                            <div className="text-red-600 bg-red-50 border border-red-200 p-2 rounded text-sm flex items-center gap-2 mt-2">
                                <AlertCircle size={16} />
                                <span>{parseError}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Bulk Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <input type="file" multiple accept="image/*" ref={bulkImageInputRef} onChange={handleBulkImageUpload} className="hidden" />
                        <button onClick={() => bulkImageInputRef.current?.click()} disabled={isAnalyzingImages} className="w-full border-2 border-dashed border-teal-300 bg-teal-50 text-teal-700 py-4 rounded-lg flex flex-col items-center justify-center">{isAnalyzingImages ? <Loader2 className="animate-spin" /> : <UploadCloud size={24} />}<span className="font-bold text-sm">توزيع صور الزيارات (Upload)</span></button>
                        {imageMatchStatus && <div className="mt-2 p-1 text-xs text-center text-teal-700">{imageMatchStatus}</div>}
                    </div>
                    <div>
                        <input type="file" multiple accept="image/*" ref={bulkLogoInputRef} onChange={handleBulkFactoryLogoUpload} className="hidden" />
                        <button onClick={() => bulkLogoInputRef.current?.click()} disabled={isAnalyzingLogos} className="w-full border-2 border-dashed border-purple-300 bg-purple-50 text-purple-700 py-4 rounded-lg flex flex-col items-center justify-center hover:bg-purple-100 transition-colors">
                            {isAnalyzingLogos ? <Loader2 className="animate-spin" /> : <Factory size={24} />}
                            <span className="font-bold text-sm">توزيع شعارات المصانع</span>
                        </button>
                        {logoMatchStatus && <div className="mt-2 p-1 text-xs text-center text-purple-700">{logoMatchStatus}</div>}
                    </div>
                </div>
                
                <div className="border-t border-indigo-100 pt-4 flex justify-end">
                    <button onClick={() => handleDeleteCurrentReport()} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 border border-red-200 px-3 py-2 rounded bg-red-50"><Trash2 size={14} /> حذف هذا التقرير</button>
                </div>
            </div>
        )}

        {/* --- REPORT HEADER (Editable Screen View) --- */}
        <div className="border-b-2 border-brand-primary pb-6 mb-8">
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

        {/* Report Title */}
        <div className="flex justify-between items-end bg-gradient-to-l from-brand-dark via-brand-primary to-brand-accent text-white p-4 rounded-lg mb-10 shadow-lg">
            <div className="text-right">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">التقرير الأسبوعي</h1>
                <p className="text-indigo-100 text-sm md:text-base">مبادرة صناعيو المستقبل – النسخة الرابعة</p>
            </div>
            <div className="text-left bg-white/10 p-2 rounded backdrop-blur-sm">
                {isEditing ? (
                    <div className="flex flex-col gap-1">
                        <input type="text" value={report.header.weekTitle} onChange={(e) => handleUpdateHeader('weekTitle', e.target.value)} className="bg-transparent border-b border-indigo-300 text-white font-bold" />
                        <input type="text" value={report.header.dateRange} onChange={(e) => handleUpdateHeader('dateRange', e.target.value)} className="bg-transparent border-b border-indigo-300 text-white text-sm" />
                    </div>
                ) : (
                    <>
                        <h2 className="text-lg font-bold">{report.header.weekTitle}</h2>
                        <p className="text-sm md:text-base dir-ltr opacity-90 font-medium">{report.header.dateRange}</p>
                    </>
                )}
            </div>
        </div>

        {/* Visits & Stats */}
        <div className="flex-grow">
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

            <StatisticsSection 
                stats={report.stats} 
                categoryLogos={report.logos.categories}
                isEditing={isEditing}
                onUpdate={handleUpdateStats}
                onLogoUpdate={(key) => handleLogoUpdate('categories', key)}
            />
        </div>

        {/* --- REPORT FOOTER (Screen Only - Updated) --- */}
        <div className="mt-8 pt-4 border-t border-gray-200 relative pb-4">
             <div className="text-center mb-6 text-brand-dark font-bold text-2xl relative z-10">شركاء النجاح</div>
             <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-8 px-4 relative z-10">
                {report.logos.partners.map((partner: PartnerLogo, idx) => (
                    <React.Fragment key={partner.id}>
                        <div className="relative flex flex-col items-center gap-2 group/partner">
                            <div 
                            className={`relative ${isEditing ? 'cursor-pointer p-1 rounded hover:bg-gray-100' : ''}`}
                            onClick={() => isEditing && partnerRefs.current[idx]?.click()}
                            >
                                <img 
                                    src={partner.url} 
                                    style={{ height: `${48 * partner.scale}px`, width: 'auto' }}
                                    className="object-contain transition-all duration-200" 
                                    alt="" 
                                />
                                <input type="file" ref={el => { partnerRefs.current[idx] = el; }} onChange={handleLogoUpdate('partners', idx)} className="hidden" accept="image/*,.svg" />
                            </div>
                            
                            {/* Precision Zoom Controls (Only in Screen Mode) */}
                            {isEditing && (
                                <div className="flex items-center gap-1 bg-white shadow-sm border border-gray-200 rounded-md px-1 py-0.5 no-print z-20">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); changePartnerScale(idx, 0.1); }} 
                                        className="p-1 hover:bg-gray-100 text-brand-primary rounded"
                                        title="تكبير"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    <div className="w-px h-3 bg-gray-300"></div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); changePartnerScale(idx, -0.1); }} 
                                        className="p-1 hover:bg-gray-100 text-brand-primary rounded"
                                        title="تصغير"
                                    >
                                        <Minus size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Gray Vertical Separator (Only between items, not after the last one) */}
                        {idx < report.logos.partners.length - 1 && (
                            <div className="h-10 w-px bg-gray-200 mx-2 hidden md:block"></div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            
            <div className="absolute -bottom-1 -right-1 w-40 h-40 overflow-hidden pointer-events-none z-0">
                <ConstellationCorner className="w-full h-full" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-40 h-40 overflow-hidden pointer-events-none z-0">
                <ConstellationCorner className="w-full h-full" style={{ transform: 'scaleX(-1)' }} />
            </div>
        </div>

      </div>
    </div>
  );
}