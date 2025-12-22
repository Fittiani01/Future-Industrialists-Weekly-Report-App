import React, { useState, useEffect, useRef } from 'react';
import { Visit, WeeklyReport, Statistics, CategoryLogos } from './types';
import { INITIAL_REPORT } from './constants';
import { VisitCard } from './components/VisitCard';
import { StatisticsSection } from './components/StatisticsSection';
import { parseReportFromText, matchImagesToVisits, matchLogosToFactories } from './services/geminiService';
import { Edit3, Sparkles, Loader2, Plus, FileText, Image as ImageIcon, UploadCloud, Factory, Eraser, Trash2, CheckCircle2, X, Printer, Cloud, Save, AlertCircle, Minus, ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon } from 'lucide-react';
import mammoth from 'mammoth';

// Firebase Imports
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { uploadReportImage } from './utils/uploadImage';
// Local compress for Logos
import { compressImage } from './utils/compressImage';

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

export default function App() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // Admin Mode State - Default to TRUE as requested
  const [isAdmin, setIsAdmin] = useState(true);
  const [isEditing, setIsEditing] = useState(true);

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
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const rightLogoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const partnerRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Initial Load from Firebase
  useEffect(() => {
    // Check URL override, but default to true if not present
    const params = new URLSearchParams(window.location.search);
    if (params.has('mode')) {
        const adminMode = params.get('mode') === 'admin';
        setIsAdmin(adminMode);
        setIsEditing(adminMode);
    } else {
        // Default behavior: Admin Mode ON
        setIsAdmin(true);
        setIsEditing(true);
    }

    const fetchReports = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "weeklyReports"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const loadedReports: WeeklyReport[] = [];
            
            querySnapshot.forEach((doc) => {
                loadedReports.push({ id: doc.id, ...doc.data() } as WeeklyReport);
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

    fetchReports();
  }, []);

  const report = reports[currentReportIndex] || INITIAL_REPORT;

  // 2. Save Logic
  const saveReportToFirestore = async () => {
    if (!report || !isAdmin) return;
    setSaving(true);
    try {
        const reportId = report.id || `week-${Date.now()}`;
        const reportToSave = { ...report, id: reportId };
        
        if (!report.createdAt) {
             reportToSave.createdAt = serverTimestamp();
        }

        await setDoc(doc(db, "weeklyReports", reportId), reportToSave, { merge: true });
        
        setIsDirty(false);
        if (!report.id) {
            updateCurrentReport({ id: reportId });
        }
    } catch (error) {
        console.error("Error saving report:", error);
        alert("فشل الحفظ. تأكد من الاتصال بالإنترنت.");
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
      const newId = `week-${Date.now()}`;
      const newReport: WeeklyReport = {
          ...INITIAL_REPORT,
          id: newId,
          header: { ...INITIAL_REPORT.header, weekTitle: `الأسبوع ${nextWeekNum}` },
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

  // --- Field Updates ---

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
          } catch(e) { 
              console.error(e); 
              alert(`فشل رفع الصورة ${file.name}`);
          }
      }
      setIsDirty(true);
      return urls;
  };

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

  const changePartnerScale = (index: number, delta: number) => {
      updateCurrentReport(prev => {
          const newPartners = [...prev.logos.partners];
          const currentScale = newPartners[index].scale;
          const newScale = Math.max(0.5, Math.min(3.0, currentScale + delta));
          newPartners[index] = { ...newPartners[index], scale: newScale };
          return { ...prev, logos: { ...prev.logos, partners: newPartners } };
      });
  };

  // --- AI & Bulk Ops (UPDATED TO USE INDEX MATCHING) ---

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
        // Returns { "0": "visit_id", "1": "visit_id" }
        const mapping = await matchImagesToVisits(filenames, report.visits);
        
        const newVisits = [...report.visits];
        let matchCount = 0;
        const visitMap = new Map(newVisits.map(v => [v.id, v]));

        // Iterate by index to match the AI response keys
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const visitId = mapping[i.toString()]; // Key is index as string

            if (visitId && visitMap.has(visitId)) {
                const visit = visitMap.get(visitId)!;
                if (visit.images.length < 4) {
                    try {
                        const url = await uploadReportImage(file, report.id, visitId);
                        visit.images.push(url);
                        matchCount++;
                    } catch (err) { 
                        console.error("Failed to upload image", file.name, err);
                        // Optional: setImageMatchStatus(`فشل رفع ${file.name}`);
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
        // Returns { "0": ["id1", "id2"], "1": ["id3"] }
        const mapping = await matchLogosToFactories(filenames, report.visits);
        
        const newVisits = [...report.visits];
        const visitMap = new Map(newVisits.map(v => [v.id, v]));
        let matchCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const matchedVisitIds = mapping[i.toString()];

            if (matchedVisitIds && matchedVisitIds.length > 0) {
                // Upload ONCE for the first visit, then use URL for all matches
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
                } catch(e) {
                    console.error("Failed logo upload", file.name);
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

  // --- Render Components ---

  const ReportHeaderContent = () => (
      <header className="flex justify-between items-center w-full h-full">
            <div className="flex items-center gap-2 h-16">
                 {report.logos.rightLogos.map((logo, idx) => (
                    <React.Fragment key={idx}>
                        <div className="relative h-full flex items-center">
                            <img src={logo} alt="" className="h-full object-contain max-h-14" />
                        </div>
                        {idx < report.logos.rightLogos.length - 1 && <div className="h-8 w-px bg-gray-300 mx-2"></div>}
                    </React.Fragment>
                 ))}
            </div>
            <div className="flex flex-col gap-2 relative h-20 items-end">
                 <img src={report.logos.main} alt="Future Industrialists" className="h-full object-contain" />
            </div>
      </header>
  );

  const ReportFooterContent = () => (
      <div className="w-full flex flex-col items-center">
        <div className="text-center mb-4 text-brand-dark font-bold text-xl relative z-10">شركاء النجاح</div>
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-4 px-4 relative z-10">
            {report.logos.partners.map((partner, idx) => (
                <div key={partner.id} className="relative flex flex-col items-center">
                    <img src={partner.url} style={{ height: `${40 * partner.scale}px`, width: 'auto' }} className="object-contain" alt="" />
                </div>
            ))}
        </div>
      </div>
  );

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 text-brand-primary animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen pb-4 relative">
      
      {/* --- PRINT OVERLAYS --- */}
      <div className="print-header-fixed hidden print:flex"><ReportHeaderContent /></div>
      <div className="print-footer-fixed hidden print:flex"><ReportFooterContent /></div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in no-print" onClick={() => setSelectedImage(null)}>
            <div className="relative max-w-5xl max-h-[90vh] animate-zoom-in">
                 <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300"><X size={32} /></button>
                 <img src={selectedImage} alt="View" className="max-h-[85vh] max-w-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
            </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[210mm] mx-auto mt-8 bg-white shadow-2xl min-h-[297mm] h-auto p-8 md:p-12 relative flex flex-col print:shadow-none print:mt-0 print:w-full print:max-w-none print:h-auto z-10 rounded-[2.5rem] overflow-hidden print-content-wrapper">
        
        {/* --- ADMIN CONTROL STRIP (Only if Admin) --- */}
        {isAdmin && (
            <div className="no-print mb-8 bg-gray-50 rounded-xl p-3 border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 shadow-inner">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
                    {reports.map((r, idx) => (
                        <button
                            key={r.id}
                            onClick={() => setCurrentReportIndex(idx)}
                            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentReportIndex === idx ? 'bg-brand-primary text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                        >
                            {r.header.weekTitle}
                        </button>
                    ))}
                    <button onClick={handleCreateNewReport} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200"><Plus size={18} /></button>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 text-xs font-bold shadow-sm transition-colors"><Printer size={14} /> PDF</button>
                    
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
                </div>
            </div>
        )}

        {/* --- SMART IMPORT AREA (Admin Only) --- */}
        {isEditing && isAdmin && (
            <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 rounded-xl no-print space-y-6">
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

        {/* --- REPORT HEADER (Screen Only) --- */}
        <div className="screen-header border-b-2 border-brand-primary pb-6 mb-8">
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
                <div className="flex flex-col gap-2 relative group h-20 items-end">
                    <img src={report.logos.main} alt="Future Industrialists" className={`h-full object-contain ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => isEditing && mainLogoRef.current?.click()} />
                    <input type="file" ref={mainLogoRef} onChange={handleLogoUpdate('main')} className="hidden" accept="image/*,.svg" />
                </div>
            </header>
        </div>

        {/* Report Title */}
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

        {/* Visits & Stats */}
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

        {/* --- REPORT FOOTER (Screen Only) --- */}
        <footer className="screen-footer mt-8 pt-4 border-t border-gray-200 relative pb-4">
            {/* Geometric Corners - Bottom Aligned */}
            <div className="absolute -bottom-1 -right-1 w-40 h-40 overflow-hidden pointer-events-none z-0">
                <ConstellationCorner className="w-full h-full" />
            </div>
            <div className="absolute -bottom-1 -left-1 w-40 h-40 overflow-hidden pointer-events-none z-0">
                <ConstellationCorner className="w-full h-full" style={{ transform: 'scaleX(-1)' }} />
            </div>
            
            <div className="text-center mb-6 text-brand-dark font-bold text-2xl relative z-10">شركاء النجاح</div>
            <div className="flex flex-wrap justify-center items-start gap-x-8 gap-y-8 px-4 relative z-10">
                {report.logos.partners.map((partner, idx) => (
                    <div key={partner.id} className="relative flex flex-col items-center gap-2 group/partner">
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
                        
                        {/* Precision Zoom Controls */}
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
                ))}
            </div>
        </footer>

      </div>
    </div>
  );
}