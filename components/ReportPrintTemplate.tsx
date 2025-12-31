import React from 'react';
import { WeeklyReport, Visit, PartnerLogo } from '../types';
import { Factory, Users, Calendar, Video, Mic, FileText, Building2 } from 'lucide-react';

interface ReportPrintTemplateProps {
  report: WeeklyReport;
}

// Helper to chunk visits (4 per page)
function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    if (!array) return [];
    for (let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
    return result;
}

// Helper to ensure date is displayed as YYYY/MM/DD
const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    const cleanDate = dateString.trim();
    // Check if format is DD/MM/YYYY or DD-MM-YYYY (1 or 2 digits, separator, 1 or 2 digits, separator, 4 digits)
    const ddmmyyyyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = cleanDate.match(ddmmyyyyRegex);
    
    if (match) {
        // match[1] = DD, match[2] = MM, match[3] = YYYY
        // Return as YYYY/MM/DD
        return `${match[3]}/${match[2].padStart(2, '0')}/${match[1].padStart(2, '0')}`;
    }
    return cleanDate;
};

// --- CONSTANTS FOR LAYOUT ---
const BRAND_COLOR = "#2a3590";

// --- HELPERS ---
const SafeImage = ({ src, className, style }: { src: string; className?: string; style?: React.CSSProperties }) => (
    <div 
        className={`${className} flex items-center justify-center overflow-hidden relative`}
        style={style}
    >
        <img 
            src={src} 
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block',
            }}
            alt=""
        />
    </div>
);

// --- COMPONENTS ---

const PrintHeader: React.FC<{ report: WeeklyReport }> = ({ report }) => (
    <div className="w-full h-[30mm] flex justify-between items-center px-8 border-b-2 border-gray-100 bg-white z-20 relative box-border">
        {/* Right Side Logos */}
        <div className="flex items-center gap-3 h-full py-2">
             {report.logos.rightLogos.map((logo, idx) => (
                <div key={idx} className="h-full flex items-center justify-center">
                    <img 
                        src={logo} 
                        className="h-full w-auto max-h-[20mm] object-contain"
                        alt=""
                    />
                    {idx < report.logos.rightLogos.length - 1 && (
                        <div className="h-[12mm] w-[1px] bg-gray-300 mx-2"></div>
                    )}
                </div>
             ))}
        </div>
        
        {/* Left Side (Main Logo) */}
        <div className="h-full flex items-center justify-end py-1">
             <img 
                src={report.logos.main} 
                className="h-[22mm] w-auto object-contain"
                alt="" 
             />
        </div>
    </div>
);

const PrintFooter: React.FC<{ partners: PartnerLogo[] }> = ({ partners }) => (
    <div className="w-full h-[40mm] bg-white border-t-2 border-gray-100 flex flex-col items-center justify-center px-6 pb-2 z-20 relative mt-auto box-border">
        <div className="text-center font-bold text-[10px] text-gray-500 mb-2 w-full leading-none">شركاء النجاح</div>
        
        {/* Partners Grid */}
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 w-full px-4">
             {partners.map((p, idx) => (
                <div key={idx} className="flex items-center justify-center h-[15mm] w-[22mm]">
                     <img 
                        src={p.url} 
                        className="w-full h-full object-contain"
                        alt=""
                     />
                </div>
             ))}
        </div>
    </div>
);

const VisitItem: React.FC<{ visit: Visit }> = ({ visit }) => {
    const isGirls = visit.schoolName.includes("بنات");
    const headerBg = isGirls ? "#6c429e" : BRAND_COLOR;

    return (
        <div className="w-full mb-3 border border-gray-200 rounded-lg bg-white shadow-sm break-inside-avoid box-border overflow-hidden">
            {/* 1. Header Strip - Fixed Height 17mm - Updated Layout */}
            <div 
                className="w-full h-[17mm] flex items-center justify-between px-3 box-border relative"
                style={{ backgroundColor: headerBg, printColorAdjust: 'exact' as any, WebkitPrintColorAdjust: 'exact' as any }}
            >
                {/* Right Side: Text Info with Icons */}
                <div className="flex flex-col justify-center h-full text-right overflow-hidden flex-grow pr-2 gap-1.5">
                     
                     {/* School Line */}
                     <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-white/20 p-1 rounded flex-shrink-0 flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-white" />
                        </div>
                        {/* Lifted text with pb-1 and relaxed leading to prevent cutting */}
                        <div className="text-white font-bold text-[12px] leading-relaxed truncate pb-1 pt-0.5" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                            {visit.schoolName}
                        </div>
                     </div>

                     {/* Factory Line */}
                     <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-white/10 p-1 rounded flex-shrink-0 flex items-center justify-center">
                            <Factory className="w-3 h-3 text-indigo-100" />
                        </div>
                         {/* Lifted text with pb-1 and relaxed leading */}
                        <div className="text-indigo-100 text-[10px] font-bold leading-relaxed truncate opacity-100 pb-1 pt-0.5" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                            {visit.factory}
                        </div>
                     </div>

                </div>

                {/* Left Side: Stats & Logo */}
                <div className="flex items-center gap-2 flex-shrink-0 h-full py-0">
                    <div className="flex items-end gap-2 h-full pb-[2mm]">
                        {/* Date Pill - Swapped Icon/Text */}
                        <div className="bg-white/15 rounded px-2 h-[22px] flex items-center justify-center gap-1 min-w-[70px]">
                            <Calendar size={12} className="text-white/90 mb-[1px]" />
                            <span className="text-white text-[10px] font-bold pb-[3px] block" style={{ fontFamily: 'Tajawal, sans-serif', direction: 'ltr', unicodeBidi: 'plaintext' }}>{formatDisplayDate(visit.date)}</span>
                        </div>
                        {/* Participants Pill - Swapped Icon/Text */}
                        <div className="bg-white/15 rounded px-2 h-[22px] flex items-center justify-center gap-1 min-w-[45px]">
                             <Users size={12} className="text-white/90 mb-[1px]" />
                            <span className="text-white text-[10px] font-bold pb-[3px] block" style={{ fontFamily: 'Tajawal, sans-serif' }}>{visit.participants}</span>
                        </div>
                    </div>
                    
                    {/* Factory Logo Box */}
                    {visit.factoryLogo && (
                        <div className="bg-white rounded overflow-hidden shadow-sm flex items-center justify-center w-[13mm] h-[13mm] border border-white box-border">
                             <img src={visit.factoryLogo} className="w-full h-full object-contain" alt="" />
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Images Strip */}
            <div className="w-full h-[32mm] bg-gray-50 p-1 grid grid-cols-4 gap-1 box-border">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="w-full h-full bg-gray-200 rounded-sm overflow-hidden border border-gray-100 relative flex items-center justify-center">
                        {visit.images[i] ? (
                            <img 
                                src={visit.images[i]} 
                                className="w-full h-full object-cover"
                                alt=""
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-gray-300">
                                <span className="text-[8px]">•</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- STATS COMPONENTS ---

const MainStatBox: React.FC<{ label: string; value: number; primary?: boolean }> = ({ label, value, primary }) => (
    <div 
        className={`flex-1 h-[25mm] rounded-xl flex flex-col items-center justify-center gap-0 border box-border ${primary ? 'border-transparent' : 'border-indigo-100'}`}
        style={{ 
            backgroundColor: primary ? BRAND_COLOR : '#ffffff',
            color: primary ? 'white' : BRAND_COLOR,
            printColorAdjust: 'exact' as any,
            WebkitPrintColorAdjust: 'exact' as any
        }}
    >
        <span className="text-[32px] font-black leading-none mb-1 mt-1 pb-2" style={{ fontFamily: 'Tajawal, sans-serif' }}>{value.toLocaleString()}</span>
        <span className={`text-[10px] font-bold leading-tight ${primary ? 'text-indigo-100' : 'text-gray-500'}`} style={{ fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
    </div>
);

const CategoryStat: React.FC<{ label: string; value: number; icon: string }> = ({ label, value, icon }) => (
    <div className="flex flex-col items-center justify-center h-[45mm]">
        <div className="w-[20mm] h-[20mm] mb-2 flex items-center justify-center">
            <SafeImage src={icon} className="w-full h-full" />
        </div>
        <span className="text-gray-600 font-bold text-sm leading-tight" style={{ fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
        <span className="text-[#2a3590] font-black text-4xl mt-2 leading-none pb-2" style={{ fontFamily: 'Tajawal, sans-serif' }}>{value}</span>
    </div>
);

// UPDATED: Large Icon and Large Number
const SocialStat: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl h-[35mm] border border-gray-100 box-border p-2 gap-2">
        <div className="text-indigo-600 mb-0">
             {icon}
        </div>
        <span className="text-3xl font-black text-gray-800 leading-none pb-1" style={{ fontFamily: 'Tajawal, sans-serif' }}>{value}</span>
        <span className="text-[12px] font-bold text-gray-500 leading-none" style={{ fontFamily: 'Tajawal, sans-serif' }}>{label}</span>
    </div>
);


// --- MAIN TEMPLATE ---

export const ReportPrintTemplate: React.FC<ReportPrintTemplateProps> = ({ report }) => {
  const visitsChunks = chunkArray<Visit>(report.visits, 4); 
  const hasPageBg = !!report.pageBackgroundImage;

  return (
    <div 
        className="flex flex-col items-center bg-gray-50 gap-10 font-sans text-right" 
        dir="rtl"
        style={{ fontFamily: 'Tajawal, sans-serif' }}
    >
        
        {/* 1. COVER PAGE (Optional) */}
        {report.coverImage && (
             <div className="strict-page relative overflow-hidden bg-white box-border" style={{ width: '210mm', height: '297mm', padding: 0 }}>
                 <img src={report.coverImage} className="w-full h-full object-cover" alt="Cover" />
                 {/* Overlay Text if needed */}
                 <div className="absolute bottom-16 left-0 w-full text-center text-white px-10">
                     <h1 className="text-4xl font-bold mb-2 drop-shadow-md leading-tight" style={{ fontFamily: 'Tajawal, sans-serif' }}>{report.header.weekTitle}</h1>
                     <p className="text-xl dir-ltr drop-shadow-md leading-tight" style={{ fontFamily: 'Tajawal, sans-serif' }}>{report.header.dateRange}</p>
                 </div>
             </div>
        )}

        {/* 2. VISITS PAGES */}
        {visitsChunks.map((chunk, i) => (
            <div 
                key={i} 
                className="strict-page relative flex flex-col bg-white box-border" 
                style={{ width: '210mm', height: '297mm' }}
            >
                {/* Background Image Layer (Absolute) - Solves Resolution Issues */}
                {hasPageBg && (
                    <img 
                        src={report.pageBackgroundImage} 
                        className="absolute inset-0 w-full h-full object-cover -z-10" 
                        alt="" 
                        style={{ pointerEvents: 'none' }}
                    />
                )}

                {/* Header Section */}
                {hasPageBg ? <div className="h-[30mm] w-full" /> : <PrintHeader report={report} />}

                {/* Content - MT-10 */}
                <div className="flex-grow px-8 py-4 mt-10 flex flex-col z-10 box-border">
                    {/* Header with Lifted Text */}
                    <div className="flex justify-between items-end mb-4 border-b border-indigo-100 pb-3">
                         {/* Lifted using pb-1 */}
                         <h2 className="text-lg font-bold text-[#2a3590] leading-tight whitespace-nowrap pb-1" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                             تقرير الزيارات ({report.header.weekTitle})
                         </h2>
                         {/* Lifted using pb-1 */}
                         <span className="text-xs text-gray-500 font-bold dir-ltr leading-tight whitespace-nowrap pb-1" style={{ fontFamily: 'Tajawal, sans-serif' }}>{report.header.dateRange}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                        {chunk.map(visit => (
                            <VisitItem key={visit.id} visit={visit} />
                        ))}
                    </div>
                </div>

                {/* Footer Section */}
                {hasPageBg ? <div className="h-[40mm] w-full" /> : <PrintFooter partners={report.logos.partners} />}
            </div>
        ))}

        {/* 3. STATISTICS PAGE */}
        <div 
            className="strict-page relative flex flex-col bg-white box-border" 
            style={{ width: '210mm', height: '297mm' }}
        >
             {/* Background Image Layer */}
             {hasPageBg && (
                <img 
                    src={report.pageBackgroundImage} 
                    className="absolute inset-0 w-full h-full object-cover -z-10" 
                    alt="" 
                    style={{ pointerEvents: 'none' }}
                />
             )}

             {hasPageBg ? <div className="h-[30mm] w-full" /> : <PrintHeader report={report} />}

             {/* Moved down using mt-16 and pb-8 */}
             <div className="flex-grow px-10 pt-16 pb-8 flex flex-col gap-6 z-10 box-border">
                 
                 <div className="text-center mb-2">
                     <h2 className="text-2xl font-black text-[#2a3590] leading-tight" style={{ fontFamily: 'Tajawal, sans-serif' }}>إحصائيات المبادرة</h2>
                     <div className="w-16 h-1 bg-[#2a3590] mx-auto mt-2 rounded-full opacity-20"></div>
                 </div>

                 {/* Top Stats */}
                 <div className="flex gap-4 w-full">
                     <MainStatBox label="إجمالي المستفيدين" value={report.stats.totalBeneficiaries} primary />
                     <MainStatBox label="إجمالي المسجلين بالجائزة" value={report.stats.totalRegistered} />
                 </div>

                 {/* Categories */}
                 <div className="w-full pt-4">
                     <h3 className="text-center text-xs font-bold text-gray-400 mb-6 leading-tight" style={{ fontFamily: 'Tajawal, sans-serif' }}>توزيع الفئات</h3>
                     <div className="grid grid-cols-4 gap-4">
                        <CategoryStat label="المبدع" value={report.stats.creativeCategory} icon={report.logos.categories.creative} />
                        <CategoryStat label="المكتشف" value={report.stats.discovererCategory} icon={report.logos.categories.discoverer} />
                        <CategoryStat label="السفير" value={report.stats.ambassadorCategory} icon={report.logos.categories.ambassador} />
                        <CategoryStat label="الفنان" value={report.stats.artistCategory} icon={report.logos.categories.artist} />
                     </div>
                 </div>

                 {/* Social Media - UPDATED ICONS AND SIZE */}
                 <div className="grid grid-cols-4 gap-4 mt-2">
                     <SocialStat label="تغريدات" value={report.stats.tweets} icon={<span className="font-bold text-2xl">𝕏</span>} />
                     <SocialStat label="منشورات" value={report.stats.posts} icon={<FileText size={32} />} />
                     <SocialStat label="فيديو" value={report.stats.videos} icon={<Video size={32} />} />
                     <SocialStat label="لقاءات" value={report.stats.tvInterviews} icon={<Mic size={32} />} />
                 </div>

             </div>

             {hasPageBg ? <div className="h-[40mm] w-full" /> : <PrintFooter partners={report.logos.partners} />}
        </div>

    </div>
  );
};