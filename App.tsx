import React, { useState, useEffect, useRef } from 'react';
import { Visit, WeeklyReport, Statistics, CategoryLogos } from './types';
import { INITIAL_REPORT } from './constants';
import { VisitCard } from './components/VisitCard';
import { StatisticsSection } from './components/StatisticsSection';
import { parseReportFromText, matchImagesToVisits, matchLogosToFactories } from './services/geminiService';
import { Edit3, Save, Sparkles, Loader2, Plus, FileText, Image as ImageIcon, UploadCloud, Info, RotateCcw, Factory, Eraser, Trash2, CheckCircle2, X, ChevronDown, Download, MonitorPlay } from 'lucide-react';
import mammoth from 'mammoth';

const STORAGE_KEY = 'future_industrialists_reports_db';

// Specific Constellation-style Corner SVG based on user's image
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
        
        {/* Lines connecting nodes - Thinner, mimicking a star chart */}
        <g stroke="url(#starGradient)" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7">
            {/* The main cluster structure based on image */}
            <path d="M280,280 L220,240 L160,260 L100,280" /> {/* Bottom curve */}
            <path d="M280,280 L250,180 L220,240" />
            <path d="M250,180 L180,150 L220,240" />
            <path d="M180,150 L120,200 L160,260" />
            <path d="M120,200 L80,250 L100,280" />
            
            {/* Upper connections */}
            <path d="M250,180 L280,100" />
            <path d="M180,150 L150,80" />
            <path d="M120,200 L60,180" />
            
            {/* Cross connections for mesh look */}
            <path d="M220,240 L160,260" />
            <path d="M160,260 L120,200" />
            <path d="M180,150 L220,100" />
        </g>

        {/* Nodes - Small filled circles */}
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
  // --- MULTI-REPORT STATE MANAGEMENT ---
  const [reports, setReports] = useState<WeeklyReport[]>([INITIAL_REPORT]);
  const [currentReportIndex, setCurrentReportIndex] = useState(0);
  
  // Derived state for the active report
  const report = reports[currentReportIndex];

  const [isEditing, setIsEditing] = useState(true);
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Lightbox State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // States for matching processes
  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
  const [isAnalyzingLogos, setIsAnalyzingLogos] = useState(false);
  
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [imageMatchStatus, setImageMatchStatus] = useState<string>("");
  const [logoMatchStatus, setLogoMatchStatus] = useState<string>("");

  const wordInputRef = useRef<HTMLInputElement>(null);
  const bulkImageInputRef = useRef<HTMLInputElement>(null);
  const bulkLogoInputRef = useRef<HTMLInputElement>(null);

  // Refs for Logo Uploads
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const rightLogoRefs = useRef<(HTMLInputElement | null)[]>([]);
  const partnerRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if(!process.env.API_KEY) {
        setApiKeyMissing(true);
    }
    
    // Load from Local Storage on Mount
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setReports(parsed);
                // Default to the last created report? Or first? Let's stay on 0 for now.
                setCurrentReportIndex(0); 
            }
        } catch (e) {
            console.error("Failed to load saved config", e);
        }
    }
  }, []);

  // Save ALL reports to Local Storage
  useEffect(() => {
      try {
          const jsonString = JSON.stringify(reports);
          localStorage.setItem(STORAGE_KEY, jsonString);
          setLastSaved(new Date());
      } catch (e) {
          console.error("Storage quota exceeded or error saving", e);
      }
  }, [reports]);

  // Helper to update CURRENT report
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
    updateCurrentReport(prev => ({
        ...prev,
        visits: prev.visits.filter(v => v.id !== id)
    }));
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
    updateCurrentReport(prev => ({
        ...prev,
        visits: [...prev.visits, newVisit]
    }));
  }

  const handleUpdateStats = (key: keyof Statistics, value: number) => {
    updateCurrentReport(prev => ({
      ...prev,
      stats: { ...prev.stats, [key]: value }
    }));
  };

  const handleUpdateHeader = (key: keyof WeeklyReport['header'], value: string) => {
      updateCurrentReport(prev => ({
          ...prev,
          header: { ...prev.header, [key]: value }
      }));
  }

  const handleLogoUpdate = (section: 'main' | 'right' | 'partners' | 'categories', indexOrKey: number | string = -1) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
             const base64String = event.target?.result as string;
             updateCurrentReport(prev => {
                if (section === 'main') {
                    return { ...prev, logos: { ...prev.logos, main: base64String } };
                }
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
                    return {
                        ...prev,
                        logos: {
                            ...prev.logos,
                            categories: {
                                ...prev.logos.categories,
                                [indexOrKey]: base64String
                            }
                        }
                    };
                }
                return prev;
             });
          }
          reader.readAsDataURL(file);
      }
  };

  const handlePartnerScale = (index: number, newScale: number) => {
      updateCurrentReport(prev => {
          const newPartners = [...prev.logos.partners];
          newPartners[index] = { ...newPartners[index], scale: newScale };
          return { ...prev, logos: { ...prev.logos, partners: newPartners } };
      });
  };

  // --- Multi-Report Management ---

  const handleCreateNewReport = () => {
      const nextWeekNum = reports.length + 1;
      // Inherit logos from the current report to avoid re-uploading
      const newReport: WeeklyReport = {
          ...INITIAL_REPORT,
          header: {
              ...INITIAL_REPORT.header,
              weekTitle: `الأسبوع ${nextWeekNum}`
          },
          logos: report.logos // Inherit current logos
      };
      
      setReports(prev => [...prev, newReport]);
      setCurrentReportIndex(reports.length); // Switch to the new one
      setIsEditing(true);
  };

  const handleReportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setCurrentReportIndex(parseInt(e.target.value));
  };

  const handleDownloadJSON = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `all_reports_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleDeleteCurrentReport = () => {
      if (reports.length <= 1) {
          alert("لا يمكن حذف التقرير الأخير.");
          return;
      }
      if (window.confirm("هل أنت متأكد من حذف هذا التقرير الأسبوعي؟")) {
          const newReports = reports.filter((_, idx) => idx !== currentReportIndex);
          setReports(newReports);
          setCurrentReportIndex(0);
      }
  };

  // --- File Import Logic ---

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
              } catch (err) {
                  console.error(err);
                  alert("تعذر قراءة ملف Word. يرجى نسخ النص ولصقه يدوياً.");
              }
          };
          reader.readAsArrayBuffer(file);
      } else if (file.name.endsWith('.txt')) {
          const reader = new FileReader();
          reader.onload = (event) => {
              setRawText(event.target?.result as string || "");
          };
          reader.readAsText(file);
      } else {
          alert("يرجى اختيار ملف Word (.docx) أو Text (.txt)");
      }
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
        visits: parsedData.visits?.map((v, idx) => ({
            ...v,
            id: Date.now().toString() + idx,
            images: [] 
        })) || prev.visits
      }));
      setRawText(""); 
      alert("تم استيراد البيانات بنجاح! يمكنك الآن رفع الصور.");
    } catch (error) {
      alert("حدث خطأ أثناء معالجة النص. تأكد من مفتاح API وحاول مرة أخرى.");
    } finally {
      setIsParsing(false);
    }
  };

  // --- Bulk Image/Logo Logic ---

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
        for (const file of files) {
            const visitId = mapping[file.name];
            if (visitId && visitMap.has(visitId)) {
                const visit = visitMap.get(visitId)!;
                if (visit.images.length < 4) {
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => resolve(ev.target?.result as string);
                        reader.readAsDataURL(file);
                    });
                    visit.images.push(base64);
                    matchCount++;
                }
            }
        }
        updateCurrentReport(prev => ({ ...prev, visits: newVisits }));
        setImageMatchStatus(`تم مطابقة ${matchCount} صورة بنجاح!`);
      } catch (error) {
          console.error("AI matching failed", error);
          setImageMatchStatus("فشل التوزيع. حاول مرة أخرى.");
      } finally {
          setIsAnalyzingImages(false);
          if (bulkImageInputRef.current) bulkImageInputRef.current.value = "";
      }
  };
  
  const handleBulkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files) as File[];
      setIsAnalyzingLogos(true);
      setLogoMatchStatus("جاري التعرف على المصانع وتوزيع الشعارات...");
      try {
          const filenames = files.map(f => f.name);
          const mapping = await matchLogosToFactories(filenames, report.visits);
          const newVisits = [...report.visits];
          let matchCount = 0;
          const visitMap = new Map(newVisits.map(v => [v.id, v]));
          for (const file of files) {
              const visitIds = mapping[file.name]; 
              if (visitIds && Array.isArray(visitIds) && visitIds.length > 0) {
                  const base64 = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = (ev) => resolve(ev.target?.result as string);
                      reader.readAsDataURL(file);
                  });
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
          setLogoMatchStatus(`تم توزيع الشعارات على ${matchCount} زيارة!`);
      } catch (error) {
          console.error("Logo matching failed", error);
          setLogoMatchStatus("فشل توزيع الشعارات.");
      } finally {
          setIsAnalyzingLogos(false);
          if (bulkLogoInputRef.current) bulkLogoInputRef.current.value = "";
      }
  }

  const handleFactoryReset = () => {
      if(window.confirm("تحذير: سيتم حذف كل شيء بما في ذلك الشعارات المخصصة وإعادة التطبيق لحالة المصنع. هل أنت متأكد؟")) {
          localStorage.removeItem(STORAGE_KEY);
          setReports([INITIAL_REPORT]);
          window.location.reload();
      }
  }

  return (
    <div className="min-h-screen pb-4 relative"> {/* Reduced bottom padding */}
      
      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
            <div className="relative max-w-5xl max-h-[90vh] animate-zoom-in">
                 <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                 >
                    <X size={32} />
                 </button>
                 <img 
                    src={selectedImage} 
                    alt="Full view" 
                    className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl border border-gray-700"
                    onClick={(e) => e.stopPropagation()} 
                 />
            </div>
        </div>
      )}

      {/* Control Bar (No Print) */}
      <div className="bg-white/95 backdrop-blur-sm shadow-md p-4 sticky top-0 z-50 no-print border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center gap-4">
          
          <div className="flex flex-col items-start gap-1">
              <h1 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <span className="bg-brand-dark text-white p-1 rounded">FM</span>
                منشئ التقارير
              </h1>
              {lastSaved && <span className="text-[10px] text-gray-400 flex items-center gap-1"><CheckCircle2 size={10}/> محفوظ تلقائياً</span>}
          </div>

          {/* Report Switching UI */}
          <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
             <div className="relative">
                 <select 
                    value={currentReportIndex}
                    onChange={handleReportChange}
                    className="appearance-none bg-white border border-gray-300 text-gray-700 py-1.5 pr-8 pl-4 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer text-sm font-bold min-w-[150px]"
                 >
                    {reports.map((r, idx) => (
                        <option key={idx} value={idx}>{r.header.weekTitle} ({r.visits.length} زيارات)</option>
                    ))}
                 </select>
                 <ChevronDown size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
             </div>
             
             <button 
                onClick={handleCreateNewReport}
                className="bg-brand-primary text-white p-2 rounded-md hover:bg-brand-dark transition-colors"
                title="إنشاء أسبوع جديد"
             >
                <Plus size={16} />
             </button>
             
             <button 
                onClick={handleDeleteCurrentReport}
                className="bg-red-50 text-red-500 p-2 rounded-md hover:bg-red-100 transition-colors border border-red-100"
                title="حذف الأسبوع الحالي"
             >
                <Trash2 size={16} />
             </button>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={handleDownloadJSON}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold"
                title="تحميل نسخة احتياطية من جميع البيانات"
             >
                <Download size={16} />
                نسخ احتياطي
             </button>

             <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${isEditing ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-800 text-white hover:bg-gray-900'}`}
             >
               {isEditing ? <><MonitorPlay size={18} /> معاينة التقرير</> : <><Edit3 size={18} /> وضع التعديل</>}
             </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[210mm] mx-auto mt-8 bg-white shadow-2xl min-h-[297mm] h-auto p-8 md:p-12 relative flex flex-col print:shadow-none print:mt-0 print:w-full print:max-w-none print:h-auto z-10 rounded-[2.5rem] overflow-hidden">
        
        {/* Smart Import Area (Only in Edit Mode) */}
        {isEditing && (
            <div className="mb-10 bg-indigo-50 border border-indigo-100 p-6 rounded-xl no-print space-y-6">
                
                {/* 1. Data Import Section */}
                <div className="border-b border-indigo-100 pb-6">
                    <div className="flex items-center gap-2 mb-3 text-brand-dark">
                        <Sparkles className="text-yellow-500" />
                        <h2 className="font-bold text-lg">1. استيراد البيانات (Text / Word)</h2>
                    </div>
                    <div className="flex gap-4 mb-4 items-start">
                        <div className="flex-1">
                             <p className="text-sm text-gray-600 mb-2">
                                الخيار الأفضل: ارفع ملف التقرير (.docx) مباشرة أو الصق النص.
                            </p>
                            <input 
                                type="file" 
                                ref={wordInputRef}
                                accept=".docx, .txt"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => wordInputRef.current?.click()}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
                                >
                                    <FileText size={16} />
                                    رفع ملف (Word/Txt)
                                </button>
                                <span className="text-xs text-gray-400 self-center">أو الصق النص أدناه</span>
                            </div>
                        </div>
                    </div>
                    
                    <textarea 
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="نص التقرير سيظهر هنا... يمكنك التعديل عليه قبل التحليل."
                        className="w-full h-24 p-3 border border-gray-300 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-brand-primary outline-none"
                        dir="rtl"
                    />
                    
                    <button 
                        onClick={handleSmartParse}
                        disabled={isParsing || apiKeyMissing || !rawText.trim()}
                        className="bg-gradient-to-r from-brand-primary to-brand-dark text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all w-full md:w-auto justify-center"
                    >
                        {isParsing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                        {isParsing ? "جاري معالجة البيانات..." : "تعبئة الجدول تلقائياً"}
                    </button>
                    {apiKeyMissing && <p className="text-red-500 text-xs mt-2">API Key missing locally.</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 2. Bulk Image Upload Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 text-brand-dark">
                            <ImageIcon className="text-teal-500" />
                            <h2 className="font-bold text-lg">2. توزيع صور الزيارات</h2>
                        </div>
                        
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            ref={bulkImageInputRef}
                            onChange={handleBulkImageUpload}
                            className="hidden"
                        />
                        
                        <button 
                            onClick={() => bulkImageInputRef.current?.click()}
                            disabled={isAnalyzingImages}
                            className="w-full border-2 border-dashed border-teal-300 bg-teal-50 text-teal-700 py-4 rounded-lg flex flex-col items-center justify-center hover:bg-teal-100 transition-colors gap-2 disabled:opacity-50 disabled:cursor-wait h-full"
                        >
                            {isAnalyzingImages ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                            <span className="font-bold text-sm">
                                {isAnalyzingImages ? "جاري التوزيع..." : "رفع وتوزيع صور الزيارات"}
                            </span>
                        </button>
                        {imageMatchStatus && (
                            <div className={`mt-2 p-1 text-xs rounded border text-center font-bold ${imageMatchStatus.includes('فشل') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {imageMatchStatus}
                            </div>
                        )}
                    </div>

                    {/* 3. Bulk Factory Logo Upload Section */}
                    <div>
                         <div className="flex items-center gap-2 mb-3 text-brand-dark">
                            <Factory className="text-purple-500" />
                            <h2 className="font-bold text-lg">3. توزيع شعارات المصانع</h2>
                        </div>
                        
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            ref={bulkLogoInputRef}
                            onChange={handleBulkLogoUpload}
                            className="hidden"
                        />
                        
                        <button 
                            onClick={() => bulkLogoInputRef.current?.click()}
                            disabled={isAnalyzingLogos}
                            className="w-full border-2 border-dashed border-purple-300 bg-purple-50 text-purple-700 py-4 rounded-lg flex flex-col items-center justify-center hover:bg-purple-100 transition-colors gap-2 disabled:opacity-50 disabled:cursor-wait h-full"
                        >
                            {isAnalyzingLogos ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
                            <span className="font-bold text-sm">
                                {isAnalyzingLogos ? "جاري المطابقة..." : "رفع وتوزيع شعارات المصانع"}
                            </span>
                        </button>
                        {logoMatchStatus && (
                            <div className={`mt-2 p-1 text-xs rounded border text-center font-bold ${logoMatchStatus.includes('فشل') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                {logoMatchStatus}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reset / New Week Controls */}
                <div className="pt-6 border-t border-indigo-100 mt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-xs text-gray-500">
                           <span className="font-bold">ملاحظة:</span> يتم حفظ جميع الشعارات (الهيدر، الفوتر، الفئات) تلقائياً عند تغييرها.
                        </div>

                        <div className="flex gap-3">
                             <button 
                                onClick={handleFactoryReset}
                                className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2 hover:bg-red-100 transition-colors"
                                title="حذف الشعارات والبيانات"
                            >
                                <Trash2 size={16} />
                                ضبط المصنع (حذف كل شيء)
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        )}

        {/* Report Header Section */}
        <header className="flex justify-between items-center border-b-2 border-brand-primary pb-6 mb-8">
            {/* RIGHT SIDE (Start of RTL): The 4 logos */}
            <div className="flex items-center gap-2 h-16">
                 {report.logos.rightLogos.map((logo, idx) => (
                    <React.Fragment key={idx}>
                        <div className="relative group h-full flex items-center">
                            <img 
                                src={logo} 
                                alt={`Right Logo ${idx+1}`} 
                                className={`h-full object-contain max-h-14 ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
                                onClick={() => isEditing && rightLogoRefs.current[idx]?.click()}
                                title={isEditing ? "انقر لتغيير الشعار" : ""}
                            />
                            <input 
                                type="file" 
                                ref={el => rightLogoRefs.current[idx] = el} 
                                onChange={handleLogoUpdate('right', idx)} 
                                className="hidden" 
                                accept="image/*,.svg" 
                            />
                        </div>
                        {/* Separator Line (Don't add after the last item) */}
                        {idx < report.logos.rightLogos.length - 1 && (
                            <div className="h-8 w-px bg-gray-300 mx-2"></div>
                        )}
                    </React.Fragment>
                 ))}
            </div>

            {/* LEFT SIDE (End of RTL): Future Industrialists Logo */}
            <div className="flex flex-col gap-2 relative group h-20 items-end">
                 <img 
                    src={report.logos.main} 
                    alt="Future Industrialists" 
                    className={`h-full object-contain ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
                    onClick={() => isEditing && mainLogoRef.current?.click()}
                    title={isEditing ? "انقر لتغيير الشعار الرئيسي" : ""}
                 />
                 <input type="file" ref={mainLogoRef} onChange={handleLogoUpdate('main')} className="hidden" accept="image/*,.svg" />
            </div>
        </header>

        {/* Title Bar - MODIFIED GRADIENT */}
        <div className="flex justify-between items-end bg-gradient-to-l from-brand-dark via-brand-primary to-brand-accent text-white p-4 rounded-lg mb-10 shadow-lg">
            <div className="text-right">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">التقرير الأسبوعي</h1>
                <p className="text-indigo-100 text-sm md:text-base">مبادرة صناعيو المستقبل – النسخة الرابعة</p>
            </div>
            <div className="text-left bg-white/10 p-2 rounded backdrop-blur-sm">
                {isEditing ? (
                    <div className="flex flex-col gap-1">
                        <input 
                            type="text" 
                            value={report.header.weekTitle}
                            onChange={(e) => handleUpdateHeader('weekTitle', e.target.value)}
                            className="bg-transparent border-b border-indigo-300 text-white placeholder-indigo-300 text-left font-bold"
                        />
                        <input 
                            type="text" 
                            value={report.header.dateRange}
                            onChange={(e) => handleUpdateHeader('dateRange', e.target.value)}
                            className="bg-transparent border-b border-indigo-300 text-white placeholder-indigo-300 text-left text-sm md:text-base font-medium"
                        />
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
                />
            ))}
            
            {isEditing && (
                <button 
                    onClick={handleAddVisit}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-brand-primary hover:text-brand-primary transition-colors flex items-center justify-center gap-2 mb-8"
                >
                    <Plus size={24} />
                    إضافة زيارة يدوياً
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

        {/* Footer Partners */}
        {/* Adjusted padding to remove excessive whitespace */}
        <footer className="mt-8 pt-4 border-t border-gray-200 relative pb-4">
            
            {/* ADDED: Smaller (w-32), styled 'Constellation' Corner Decorations */}
            <div className="absolute bottom-0 right-0 w-32 h-24 overflow-hidden pointer-events-none z-0">
                <ConstellationCorner className="w-full h-full" />
            </div>
            <div className="absolute bottom-0 left-0 w-32 h-24 overflow-hidden pointer-events-none z-0">
                <ConstellationCorner className="w-full h-full" style={{ transform: 'scaleX(-1)' }} />
            </div>

            <div className="text-center mb-6 text-brand-dark font-bold text-2xl relative z-10">شركاء النجاح</div>
            
            <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-6 px-4 relative z-10">
                {report.logos.partners.map((partner, idx) => {
                    // Base height is 48px (h-12), we multiply by scale
                    const baseHeight = 48;
                    const computedHeight = baseHeight * partner.scale;

                    return (
                        <div key={partner.id} className="relative flex flex-col items-center group">
                            {/* The Logo Image */}
                            <img 
                                src={partner.url} 
                                style={{ height: `${computedHeight}px`, width: 'auto' }}
                                className={`object-contain transition-all duration-200 ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`} 
                                alt={`Partner ${idx + 1}`} 
                                onClick={() => isEditing && partnerRefs.current[idx]?.click()}
                                title={isEditing ? "انقر لتغيير الشعار" : ""}
                            />
                            
                            {/* File Input */}
                            <input 
                                type="file" 
                                ref={el => partnerRefs.current[idx] = el} 
                                onChange={handleLogoUpdate('partners', idx)} 
                                className="hidden" 
                                accept="image/*,.svg" 
                            />

                            {/* Scale Slider (Only in Edit Mode) */}
                            {isEditing && (
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24 bg-white shadow-md rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex flex-col items-center border border-gray-200">
                                    <input 
                                        type="range" 
                                        min="0.5" 
                                        max="3.0" 
                                        step="0.1" 
                                        value={partner.scale}
                                        onChange={(e) => handlePartnerScale(idx, parseFloat(e.target.value))}
                                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                                    />
                                    <span className="text-[10px] text-gray-500 mt-1">{Math.round(partner.scale * 100)}%</span>
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