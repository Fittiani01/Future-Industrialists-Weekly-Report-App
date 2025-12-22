import React, { useState, useEffect, useRef } from 'react';
import { Visit, WeeklyReport, Statistics, CategoryLogos } from './types';
import { INITIAL_REPORT } from './constants';
import { VisitCard } from './components/VisitCard';
import { StatisticsSection } from './components/StatisticsSection';
import { parseReportFromText, matchImagesToVisits, matchLogosToFactories } from './services/geminiService';
import { Edit3, Sparkles, Loader2, Plus, FileText, Image as ImageIcon, UploadCloud, Factory, Eraser, Trash2, CheckCircle2, X, Download, MonitorPlay, Database, Settings, Activity, Printer } from 'lucide-react';
import mammoth from 'mammoth';
// Firebase Imports
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadReportImage } from './utils/uploadImage';
// Local compress for Logos
import { compressImage } from './utils/compressImage';

const DB_NAME = 'FutureIndustrialistsDB';
const STORE_NAME = 'reports_store';
const DB_KEY = 'all_reports';
const DB_FILENAME = 'db.json';

// --- IndexedDB Helpers ---
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveToDB = async (data: WeeklyReport[]) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data, DB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const loadFromDB = async (): Promise<WeeklyReport[] | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(DB_KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
        resolve(null);
    };
  });
};

const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.readAsDataURL(file);
       reader.onload = async () => {
           try {
               const compressedFile = await compressImage(file);
               const reader2 = new FileReader();
               reader2.readAsDataURL(compressedFile);
               reader2.onload = (e) => resolve(e.target?.result as string);
           } catch(e) {
               resolve(reader.result as string);
           }
       };
    });
}

const ConstellationCorner = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <svg 
        viewBox="0 0 300 300" 
        className={`${className} pointer-events-none`}
        style={style}
    >
        <defs>
             <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#837cb9" />
                <stop offset="100%" stopColor="#2a3590" />
            </linearGradient>
        </defs>
        <g stroke="url(#starGradient)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7">
            <path d="M280,280 L220,240 L160,260 L100,280" />
            <path d="M280,280 L250,180 L220,240" />
            <path d="M250,180 L180,150 L220,240" />
            <path d="M180,150 L120,200 L160,260" />
            <path d="M120,200 L80,250 L100,280" />
            <path d="M250,180 L280,100" />
            <path d="M180,150 L150,80" />
            <path d="M120,200 L60,180" />
            <path d="M220,240 L160,260" />
            <path d="M160,260 L120,200" />
            <path d="M180,150 L220,100" />
        </g>
        <g fill="#837cb9">
            <circle cx="280" cy="280" r="2.5" />
            <circle cx="220" cy="240" r="3" />
            <circle cx="160" cy="260" r="2.5" />
            <circle cx="100" cy="280" r="2" />
            <circle cx="250" cy="180" r="3" />
            <circle cx="180" cy="150" r="3.5" />
            <circle cx="120" cy="200" r="3" />
            <circle cx="80" cy="250" r="2.5" />
            <circle cx="280" cy="100" r="2" />
            <circle cx="150" cy="80" r="2" />
            <circle cx="60" cy="180" r="2" />
            <circle cx="220" cy="100" r="2" />
        </g>
    </svg>
);

export default function App() {
  const [reports, setReports] = useState<WeeklyReport[]>([INITIAL_REPORT]);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const report = reports[currentReportIndex];

  const [isEditing, setIsEditing] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  // NEW: State to check if user has admin privileges via URL
  const [isUrlAdmin, setIsUrlAdmin] = useState(false);
  
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dbSource, setDbSource] = useState<'local' | 'remote'>('local');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
  const [isAnalyzingLogos, setIsAnalyzingLogos] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [imageMatchStatus, setImageMatchStatus] = useState<string>("");
  const [logoMatchStatus, setLogoMatchStatus] = useState<string>("");

  const wordInputRef = useRef<HTMLInputElement>(null);
  const bulkImageInputRef = useRef<HTMLInputElement>(null);
  const bulkLogoInputRef = useRef<HTMLInputElement>(null);
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const rightLogoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const partnerRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Check for admin param
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'admin') {
        setIsUrlAdmin(true);
        setIsAdminMode(true);
        setIsEditing(true);
    }

    if(!process.env.API_KEY) setApiKeyMissing(true);

    const initializeData = async () => {
        try {
            const response = await fetch(`./${DB_FILENAME}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data) && data.length > 0) {
                    setReports(data);
                    setCurrentReportIndex(0);
                    setDbSource('remote');
                    if (!params.get('mode')) setIsEditing(false); // Only force view mode if not admin
                    return;
                }
            }
        } catch (e) {
            console.log("Remote DB not found, trying local IndexedDB...");
        }

        try {
            const localData = await loadFromDB();
            if (localData && Array.isArray(localData) && localData.length > 0) {
                setReports(localData);
                setCurrentReportIndex(0);
                setDbSource('local');
                // Only enable editing automatically if we loaded local DB and are likely the admin
                if (params.get('mode') === 'admin') {
                    setIsEditing(true);
                    setIsAdminMode(true);
                }
            }
        } catch (e) {
            console.error("Failed to load from DB", e);
        }
    };

    initializeData();
  }, []);

  useEffect(() => {
      let isMounted = true;
      const save = async () => {
          try {
              await saveToDB(reports);
              if (isMounted) {
                  setLastSaved(new Date());
                  setSaveError(null);
              }
          } catch (e) {
              console.error("Failed to save to DB", e);
              if (isMounted) setSaveError("فشل الحفظ التلقائي");
          }
      };
      const timeout = setTimeout(save, 500);
      return () => { isMounted = false; clearTimeout(timeout); };
  }, [reports]);

  const handleTestFirestore = async () => {
    try {
        await addDoc(collection(db, "reporter_tests"), {
            ok: true,
            createdAt: serverTimestamp()
        });
        alert("Saved ✅");
    } catch (e: any) {
        console.error("Firestore Error:", e);
        alert(e.message || "Error saving to Firestore");
    }
  };

  const updateCurrentReport = (newData: Partial<WeeklyReport> | ((prev: WeeklyReport) => WeeklyReport)) => {
      setReports(prevReports => {
          const newReports = [...prevReports];
          const current = newReports[currentReportIndex];
          if (typeof newData === 'function') {
              newReports[currentReportIndex] = newData(current);
          } else {
              newReports[currentReportIndex] = { ...current, ...newData };
          }
          return newReports;
      });
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

  const handleLogoUpdate = (section: 'main' | 'right' | 'partners' | 'categories', indexOrKey: number | string = -1) => async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
             const base64String = await compressImageToBase64(file);
             updateCurrentReport(prev => {
                if (section === 'main') return { ...prev, logos: { ...prev.logos, main: base64String } };
                if (section === 'right' && typeof indexOrKey === 'number' && indexOrKey >= 0) {
                    const newRightLogos = [...prev.logos.rightLogos];
                    newRightLogos[indexOrKey] = base64String;
                    return { ...prev, logos: { ...prev.logos, rightLogos: newRightLogos } };
                }
                if (section === 'partners' && typeof indexOrKey === 'number' && indexOrKey >= 0) {
                    const newPartners = [...prev.logos.partners];
                    newPartners[indexOrKey] = { ...newPartners[indexOrKey], url: base64String };
                    return { ...prev, logos: { ...prev.logos, partners: newPartners } };
                }
                if (section === 'categories' && typeof indexOrKey === 'string') {
                    return { ...prev, logos: { ...prev.logos, categories: { ...prev.logos.categories, [indexOrKey]: base64String } } };
                }
                return prev;
             });
          } catch (e) { console.error("Compression failed", e); }
      }
  };

  const handlePartnerScale = (index: number, newScale: number) => {
      updateCurrentReport(prev => {
          const newPartners = [...prev.logos.partners];
          newPartners[index] = { ...newPartners[index], scale: newScale };
          return { ...prev, logos: { ...prev.logos, partners: newPartners } };
      });
  };

  const handleCreateNewReport = () => {
      const nextWeekNum = reports.length + 1;
      const newReport: WeeklyReport = {
          ...INITIAL_REPORT,
          id: `report-${Date.now()}`,
          header: { ...INITIAL_REPORT.header, weekTitle: `الأسبوع ${nextWeekNum}` },
          logos: report.logos
      };
      setReports(prev => [...prev, newReport]);
      setCurrentReportIndex(reports.length); 
      setIsEditing(true);
  };

  const handleDownloadDB = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", DB_FILENAME);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      alert(`تم تحميل ملف ${DB_FILENAME}.\n\nالخطوة القادمة: ارفع هذا الملف إلى مستودع GitHub الخاص بك.`);
  };

  const handleDeleteCurrentReport = () => {
      if (reports.length <= 1) { alert("لا يمكن حذف التقرير الأخير."); return; }
      if (window.confirm("هل أنت متأكد من حذف هذا التقرير الأسبوعي؟")) {
          const newReports = reports.filter((_, idx) => idx !== currentReportIndex);
          setReports(newReports);
          setCurrentReportIndex(0);
      }
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
              } catch (err) { alert("تعذر قراءة ملف Word."); }
          };
          reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.txt')) {
          const reader = new FileReader();
          reader.onload = (event) => setRawText(event.target?.result as string || "");
          reader.readAsText(file);
      } else { alert("يرجى اختيار ملف Word (.docx) أو Text (.txt)"); }
  };

  const handleSmartParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const parsedData = await parseReportFromText(rawText);
      updateCurrentReport(prev => ({
        ...prev,
        header: parsedData.header || prev.header,
        stats: parsedData.stats ? { ...prev.stats, ...parsedData.stats } : prev.stats,
        visits: parsedData.visits?.map((v, idx) => ({ ...v, id: Date.now().toString() + idx, images: [] })) || prev.visits
      }));
      setRawText(""); 
      alert("تم استيراد البيانات بنجاح!");
    } catch (error) { alert("حدث خطأ أثناء معالجة النص."); } finally { setIsParsing(false); }
  };

  const handleBulkImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingImages(true);
      setImageMatchStatus("جاري التوزيع الذكي للصور...");
      try {
        const filenames = files.map(f => f.name);
        const mapping = await matchImagesToVisits(filenames, report.visits);
        const newVisits = [...report.visits];
        let matchCount = 0;
        const visitMap = new Map(newVisits.map(v => [v.id, v]));
        const currentReportId = report.id || `report-${Date.now()}`;
        if (!report.id) updateCurrentReport({ id: currentReportId });

        for (const file of files) {
            const visitId = mapping[file.name];
            if (visitId && visitMap.has(visitId)) {
                const visit = visitMap.get(visitId)!;
                if (visit.images.length < 4) {
                    try {
                        const url = await uploadReportImage(file, currentReportId, visitId);
                        visit.images.push(url);
                        matchCount++;
                    } catch (err) { console.error("Failed to upload image", file.name, err); }
                }
            }
        }
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
        setImageMatchStatus(`تم مطابقة ورفع ${matchCount} صورة بنجاح!`);
      } catch (error) { setImageMatchStatus("فشل التوزيع."); } finally {
          setIsAnalyzingImages(false);
          if (bulkImageInputRef.current) bulkImageInputRef.current.value = "";
      }
  };

  const handleManualVisitImageUpload = async (files: File[], visitId: string): Promise<string[]> => {
      const currentReportId = report.id || `report-${Date.now()}`;
      if (!report.id) updateCurrentReport({ id: currentReportId });
      const urls: string[] = [];
      for (const file of files) {
          try {
              const url = await uploadReportImage(file, currentReportId, visitId);
              urls.push(url);
          } catch(e) { console.error(e); }
      }
      return urls;
  };
  
  const handleBulkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingLogos(true);
      setLogoMatchStatus("جاري المعالجة...");
      try {
          const filenames = files.map(f => f.name);
          const mapping = await matchLogosToFactories(filenames, report.visits);
          const newVisits = [...report.visits];
          let matchCount = 0;
          const visitMap = new Map(newVisits.map(v => [v.id, v]));
          for (const file of files) {
              const visitIds = mapping[file.name]; 
              if (visitIds && Array.isArray(visitIds) && visitIds.length > 0) {
                  const base64 = await compressImageToBase64(file);
                  visitIds.forEach(id => {
                      if (visitMap.has(id)) {
                          const visit = visitMap.get(id)!;
                          visit.factoryLogo = base64;
                          matchCount++;
                      }
                  });
              }
          }
          updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
          setLogoMatchStatus(`تم التوزيع على ${matchCount} زيارة!`);
      } catch (error) { setLogoMatchStatus("فشل توزيع الشعارات."); } finally {
          setIsAnalyzingLogos(false);
          if (bulkLogoInputRef.current) bulkLogoInputRef.current.value = "";
      }
  }

  const handleFactoryReset = async () => {
      if(window.confirm("سيتم حذف كل شيء. هل أنت متأكد؟")) {
          const db = await initDB();
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(DB_KEY);
          setReports([INITIAL_REPORT]);
          window.location.reload();
      }
  }

  // --- Header Component (Reusable for Print Overlay) ---
  const ReportHeaderContent = () => (
      <header className="flex justify-between items-center w-full h-full">
            <div className="flex items-center gap-2 h-16">
                 {report.logos.rightLogos.map((logo, idx) => (
                    <React.Fragment key={idx}>
                        <div className="relative h-full flex items-center">
                            <img 
                                src={logo} 
                                alt={`Right Logo ${idx+1}`} 
                                className="h-full object-contain max-h-14"
                            />
                        </div>
                        {idx < report.logos.rightLogos.length - 1 && (
                            <div className="h-8 w-px bg-gray-300 mx-2"></div>
                        )}
                    </React.Fragment>
                 ))}
            </div>

            <div className="flex flex-col gap-2 relative h-20 items-end">
                 <img 
                    src={report.logos.main} 
                    alt="Future Industrialists" 
                    className="h-full object-contain"
                 />
            </div>
      </header>
  );

  // --- Footer Component (Reusable for Print Overlay) ---
  const ReportFooterContent = () => (
      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-4 text-brand-dark font-bold text-xl relative z-10">شركاء النجاح</div>
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-4 px-4 relative z-10">
            {report.logos.partners.map((partner, idx) => {
                const baseHeight = 40; // Slightly smaller for print/footer
                const computedHeight = baseHeight * partner.scale;
                return (
                    <div key={partner.id} className="relative flex flex-col items-center">
                        <img 
                            src={partner.url} 
                            style={{ height: `${computedHeight}px`, width: 'auto' }}
                            className="object-contain" 
                            alt={`Partner ${idx + 1}`} 
                        />
                    </div>
                );
            })}
        </div>
      </div>
  );

  return (
    <div className="min-h-screen pb-4 relative">
      
      {/* --- HIDDEN PRINT OVERLAYS --- */}
      {/* These only appear in @media print */}
      <div className="print-header-fixed hidden print:flex">
         <ReportHeaderContent />
      </div>
      <div className="print-footer-fixed hidden print:flex">
         <ReportFooterContent />
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in no-print"
          onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-5xl max-h-[90vh] animate-zoom-in">
                 <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300"><X size={32} /></button>
                 <img src={selectedImage} alt="Full view" className="max-h-[85vh] max-w-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            </div>
        </div>
      )}

      {/* Main Content Area */}
      {/* Added 'print-content-wrapper' for padding in print mode */}
      <div className="max-w-[210mm] mx-auto mt-8 bg-white shadow-2xl min-h-[297mm] h-auto p-8 md:p-12 relative flex flex-col print:shadow-none print:mt-0 print:w-full print:max-w-none print:h-auto z-10 rounded-[2.5rem] overflow-hidden print-content-wrapper">
        
        {/* INTERNAL CONTROL STRIP */}
        <div className="no-print mb-8 bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-inner">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
                {reports.map((r, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentReportIndex(idx)}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentReportIndex === idx ? 'bg-brand-primary text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                    >
                        {r.header.weekTitle}
                    </button>
                ))}
                {isUrlAdmin && <button onClick={handleCreateNewReport} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200"><Plus size={18} /></button>}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                {/* Print Button - Available to everyone */}
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 text-xs font-bold shadow-sm transition-colors"
                >
                    <Printer size={14} />
                    حفظ PDF
                </button>

                {/* Only show Admin Tools if ?mode=admin */}
                {isUrlAdmin && (
                   <div className="flex items-center gap-2 animate-fade-in">
                         <div className="h-6 w-px bg-gray-300 mx-1"></div>
                         <button onClick={handleTestFirestore} className="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold" title="Test Firestore"><Activity size={14} /> Test DB</button>
                         <button onClick={handleDownloadDB} className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold" title="Download DB"><Database size={14} /> Save DB</button>
                         <button 
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs ${isEditing ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-700 text-white'}`}
                         >
                            {isEditing ? <><MonitorPlay size={14} /> معاينة</> : <><Edit3 size={14} /> تعديل</>}
                        </button>
                   </div>
                )}
            </div>
        </div>

        {/* Save Status Indicator - Only for Admin */}
        {isUrlAdmin && (
            <div className="absolute top-4 left-4 no-print text-[10px] text-gray-400 flex flex-col items-end">
                {lastSaved && <span className="flex items-center gap-1"><CheckCircle2 size={10}/> محفوظ {lastSaved.toLocaleTimeString()}</span>}
                {saveError && <span className="text-red-500 font-bold">{saveError}</span>}
            </div>
        )}

        {/* Smart Import Area (Only in Edit Mode) */}
        {isEditing && isUrlAdmin && (
            <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 rounded-xl no-print space-y-6">
                <div className="border-b border-indigo-100 pb-6">
                    <div className="flex items-center gap-2 mb-3 text-brand-dark"><Sparkles className="text-yellow-500" /><h2 className="font-bold text-lg">1. استيراد البيانات</h2></div>
                    <div className="flex gap-4 mb-4 items-start">
                        <div className="flex-1">
                            <input type="file" ref={wordInputRef} accept=".docx, .txt" onChange={handleFileSelect} className="hidden" />
                            <div className="flex gap-2">
                                <button onClick={() => wordInputRef.current?.click()} className="bg-white border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><FileText size={16} /> رفع ملف (Word/Txt)</button>
                            </div>
                        </div>
                    </div>
                    <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="نص التقرير..." className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm mb-2" dir="rtl" />
                    <button onClick={handleSmartParse} disabled={isParsing || apiKeyMissing || !rawText.trim()} className="bg-gradient-to-r from-brand-primary to-brand-dark text-white px-6 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center">{isParsing ? <Loader2 className="animate-spin" /> : "تعبئة الجدول تلقائياً"}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <input type="file" multiple accept="image/*" ref={bulkImageInputRef} onChange={handleBulkImageUpload} className="hidden" />
                        <button onClick={() => bulkImageInputRef.current?.click()} disabled={isAnalyzingImages} className="w-full border-2 border-dashed border-teal-300 bg-teal-50 text-teal-700 py-4 rounded-lg flex flex-col items-center justify-center">{isAnalyzingImages ? <Loader2 className="animate-spin" /> : <UploadCloud size={24} />}<span className="font-bold text-sm">توزيع صور الزيارات</span></button>
                        {imageMatchStatus && <div className="mt-2 p-1 text-xs text-center">{imageMatchStatus}</div>}
                    </div>
                    <div>
                        <input type="file" multiple accept="image/*" ref={bulkLogoInputRef} onChange={handleBulkLogoUpload} className="hidden" />
                        <button onClick={() => bulkLogoInputRef.current?.click()} disabled={isAnalyzingLogos} className="w-full border-2 border-dashed border-purple-300 bg-purple-50 text-purple-700 py-4 rounded-lg flex flex-col items-center justify-center">{isAnalyzingLogos ? <Loader2 className="animate-spin" /> : <UploadCloud size={24} />}<span className="font-bold text-sm">توزيع شعارات المصانع</span></button>
                        {logoMatchStatus && <div className="mt-2 p-1 text-xs text-center">{logoMatchStatus}</div>}
                    </div>
                </div>
                <div className="pt-6 border-t border-indigo-100 mt-6 flex gap-4">
                     <button onClick={handleDeleteCurrentReport} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm flex gap-2"><Trash2 size={16} /> حذف الأسبوع</button>
                     <button onClick={handleFactoryReset} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm flex gap-2"><Eraser size={16} /> ضبط المصنع</button>
                </div>
            </div>
        )}

        {/* --- SCREEN HEADER (Hidden in Print) --- */}
        <div className="screen-header border-b-2 border-brand-primary pb-6 mb-8">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-2 h-16">
                    {report.logos.rightLogos.map((logo, idx) => (
                        <React.Fragment key={idx}>
                            <div className="relative group h-full flex items-center">
                                <img src={logo} alt={`Right Logo ${idx+1}`} className={`h-full object-contain max-h-14 ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => isEditing && rightLogoRefs.current[idx]?.click()} />
                                <input type="file" ref={el => { rightLogoRefs.current[idx] = el; }} onChange={handleLogoUpdate('right', idx)} className="hidden" accept="image/*,.svg" />
                            </div>
                            {idx < report.logos.rightLogos.length - 1 && <div className="h-8 w-px bg-gray-300 mx-2"></div>}
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex flex-col gap-2 relative group h-20 items-end">
                    <img src={report.logos.main} alt="Future Industrialists" className={`h-full object-contain ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => isEditing && mainLogoRef.current?.click()} />
                    <input type="file" ref={mainLogoRef} onChange={handleLogoUpdate('main')} className="hidden" accept="image/*,.svg" />
                </div>
            </header>
        </div>

        {/* Title Bar */}
        <div className="flex justify-between items-end bg-gradient-to-l from-brand-dark via-brand-primary to-brand-accent text-white p-4 rounded-lg mb-10 shadow-lg print-break-inside">
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

        {/* Visits Section */}
        <div className="flex-grow">
            {report.visits.map((visit) => (
                <VisitCard 
                    key={visit.id} 
                    visit={visit} 
                    isEditing={isEditing} 
                    onUpdate={handleUpdateVisit}
                    onDelete={handleDeleteVisit}
                    onImageClick={(url) => setSelectedImage(url)}
                    onUploadImages={(files) => handleManualVisitImageUpload(files, visit.id)}
                />
            ))}
            
            {isEditing && (
                <button onClick={handleAddVisit} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-brand-primary hover:text-brand-primary flex items-center justify-center gap-2 mb-8 no-print">
                    <Plus size={24} /> إضافة زيارة يدوياً
                </button>
            )}

            <div className="print-break-inside">
                <StatisticsSection 
                    stats={report.stats} 
                    categoryLogos={report.logos.categories}
                    isEditing={isEditing}
                    onUpdate={handleUpdateStats}
                    onLogoUpdate={(key) => handleLogoUpdate('categories', key)}
                />
            </div>
        </div>

        {/* --- SCREEN FOOTER (Hidden in Print) --- */}
        <footer className="screen-footer mt-8 pt-4 border-t border-gray-200 relative pb-4">
            <div className="absolute bottom-0 right-0 w-32 h-24 overflow-hidden pointer-events-none z-0"><ConstellationCorner className="w-full h-full" /></div>
            <div className="absolute bottom-0 left-0 w-32 h-24 overflow-hidden pointer-events-none z-0"><ConstellationCorner className="w-full h-full" style={{ transform: 'scaleX(-1)' }} /></div>
            <div className="text-center mb-6 text-brand-dark font-bold text-2xl relative z-10">شركاء النجاح</div>
            <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-6 px-4 relative z-10">
                {report.logos.partners.map((partner, idx) => {
                    const baseHeight = 48;
                    const computedHeight = baseHeight * partner.scale;
                    return (
                        <div key={partner.id} className="relative flex flex-col items-center group">
                            <img 
                                src={partner.url} 
                                style={{ height: `${computedHeight}px`, width: 'auto' }}
                                className={`object-contain transition-all duration-200 ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`} 
                                alt={`Partner ${idx + 1}`} 
                                onClick={() => isEditing && partnerRefs.current[idx]?.click()}
                            />
                            <input type="file" ref={el => { partnerRefs.current[idx] = el; }} onChange={handleLogoUpdate('partners', idx)} className="hidden" accept="image/*,.svg" />
                            {isEditing && (
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24 bg-white shadow-md rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center border border-gray-200 no-print">
                                    <input type="range" min="0.5" max="3.0" step="0.1" value={partner.scale} onChange={(e) => handlePartnerScale(idx, parseFloat(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </footer>

      </div>
    </div>
  );
}