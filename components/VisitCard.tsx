import React, { useRef } from 'react';
import { Visit } from '../types';
import { Building2, Calendar, Users, Upload, X, ImagePlus, ZoomIn, Factory } from 'lucide-react';

interface VisitCardProps {
  visit: Visit;
  isEditing: boolean;
  onUpdate: (id: string, data: Partial<Visit>) => void;
  onDelete: (id: string) => void;
  onImageClick: (imageUrl: string) => void;
  onUploadImages?: (files: File[]) => Promise<string[]>;
  onUploadLogo?: (file: File) => Promise<string>;
}

export const VisitCard: React.FC<VisitCardProps> = ({ visit, isEditing, onUpdate, onDelete, onImageClick, onUploadImages, onUploadLogo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      
      if (onUploadImages) {
          try {
              const urls = await onUploadImages(files);
              const combined = [...visit.images, ...urls].slice(0, 4);
              onUpdate(visit.id, { images: combined });
          } catch (error) {
              console.error("Upload failed", error);
              alert("فشل رفع الصور. حاول مرة أخرى.");
          }
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (onUploadLogo) {
              try {
                  const url = await onUploadLogo(file);
                  onUpdate(visit.id, { factoryLogo: url });
              } catch (error) {
                  console.error("Logo upload failed", error);
                  alert("فشل رفع الشعار.");
              }
          }
      }
  }

  // Logic to determine header color based on gender
  const isGirls = visit.schoolName.includes("بنات");
  const headerColor = isGirls ? "#867bba" : "#2b3592";

  // Reusable Stats Component (Date & Participants)
  const StatsPills = ({ mobile = false }: { mobile?: boolean }) => (
      <div className={`flex ${mobile ? 'flex-row mt-2 gap-2' : 'flex-col items-end gap-2'} ${!mobile ? 'pl-2 border-l border-white/10 print:border-none' : ''}`}>
          {/* Date Pill */}
          <div className={`flex items-center gap-2 bg-white/10 rounded-md justify-end ${mobile ? 'px-2 py-1' : 'px-3 py-1 min-w-[110px] print:min-w-[90px] print:px-2 print:py-0.5'}`}>
               {isEditing ? (
                  <input 
                      type="text" 
                      value={visit.date}
                      onChange={(e) => onUpdate(visit.id, { date: e.target.value })}
                      className={`bg-transparent text-white text-right focus:outline-none font-bold ${mobile ? 'text-xs w-20' : 'text-sm w-24'}`}
                  />
              ) : (
                  <span className={`font-bold dir-ltr ${mobile ? 'text-xs' : 'text-sm print:text-xs'}`}>{visit.date}</span>
              )}
              <Calendar size={mobile ? 12 : 16} className="text-indigo-200 print:w-3 print:h-3" />
          </div>
          
          {/* Participants Pill */}
          <div className={`flex items-center gap-2 bg-white/10 rounded-md justify-end ${mobile ? 'px-2 py-1' : 'px-3 py-1 min-w-[110px] print:min-w-[90px] print:px-2 print:py-0.5'}`}>
              {isEditing ? (
                      <input 
                      type="number" 
                      value={visit.participants}
                      onChange={(e) => onUpdate(visit.id, { participants: parseInt(e.target.value) || 0 })}
                      className={`bg-transparent text-white text-right focus:outline-none font-bold ${mobile ? 'text-xs w-8' : 'text-sm w-12'}`}
                  />
              ) : (
                  <span className={`font-bold ${mobile ? 'text-xs' : 'text-sm print:text-xs'}`}>{visit.participants}</span>
              )}
              <span className={`text-indigo-200 font-normal ${mobile ? 'text-[10px]' : 'text-xs print:text-[10px]'}`}>مشارك</span>
              <Users size={mobile ? 12 : 16} className="text-indigo-200 print:w-3 print:h-3" />
          </div>
      </div>
  );

  return (
    <div className="mb-4 md:mb-6 break-inside-avoid relative shadow-md rounded-xl overflow-hidden bg-white border border-gray-100 print:shadow-none print:border-none print:bg-transparent print:mb-0">
      
      {/* Header Bar */}
      <div 
        className="text-white p-3 md:p-4 print:p-2 relative rounded-t-xl print:rounded-lg transition-colors duration-300"
        style={{ backgroundColor: headerColor }}
      >
         {isEditing && (
            <button 
                onClick={() => onDelete(visit.id)}
                className="absolute top-2 left-2 z-20 bg-red-500 hover:bg-red-600 p-1.5 rounded-full text-white no-print shadow-sm transition-colors"
                title="حذف الزيارة"
            >
                <X size={14} />
            </button>
        )}
        
        {/* Main Flex Container - Added flex-nowrap to prevent print breaking */}
        <div className="flex flex-row flex-nowrap items-center md:items-stretch justify-between gap-3 md:gap-4 print:gap-2">
            
            {/* RIGHT: Text Info (School & Factory Name) */}
            <div className="flex flex-col justify-center gap-1 md:gap-2 flex-grow min-w-0 pr-1 text-right">
                {/* School */}
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1 md:p-1.5 rounded-lg flex-shrink-0">
                        <Building2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="w-full min-w-0">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={visit.schoolName}
                                onChange={(e) => onUpdate(visit.id, { schoolName: e.target.value })}
                                className="bg-transparent border-b border-white/30 text-white w-full focus:outline-none focus:border-white font-bold text-sm md:text-lg placeholder-indigo-200"
                                placeholder="اسم المدرسة..."
                            />
                        ) : (
                            <h3 className="text-sm md:text-xl print:text-base font-bold leading-tight truncate">{visit.schoolName}</h3>
                        )}
                    </div>
                </div>

                {/* Factory Name */}
                <div className="flex items-center gap-2">
                    <div className="bg-white/10 p-1 md:p-1.5 rounded-lg flex-shrink-0">
                        <Factory className="w-4 h-4 md:w-5 md:h-5 text-indigo-100" />
                    </div>
                    <div className="w-full min-w-0">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={visit.factory}
                                onChange={(e) => onUpdate(visit.id, { factory: e.target.value })}
                                className="bg-transparent border-b border-white/20 text-indigo-50 w-full focus:outline-none focus:border-indigo-200 font-bold text-xs md:text-base placeholder-indigo-300"
                                placeholder="اسم المصنع..."
                            />
                        ) : (
                            <h4 className="text-xs md:text-lg print:text-sm font-bold text-indigo-50 truncate">{visit.factory}</h4>
                        )}
                    </div>
                </div>

                {/* Mobile Only: Stats displayed here to save width space - HIDDEN IN PRINT */}
                <div className="md:hidden print:hidden">
                    <StatsPills mobile={true} />
                </div>
            </div>

            {/* CENTER (Desktop Only): Stats - FORCED FLEX IN PRINT */}
            <div className="hidden md:flex print:flex flex-col justify-center flex-shrink-0">
                <StatsPills mobile={false} />
            </div>

            {/* LEFT: Big Factory Logo */}
            <div className="flex-shrink-0 flex items-center pt-1 md:pt-0">
                 <div 
                    className={`w-16 h-16 md:w-24 md:h-24 print:w-14 print:h-14 bg-white rounded-lg md:rounded-xl p-1 md:p-1.5 flex items-center justify-center relative shadow-lg overflow-hidden ${isEditing ? 'cursor-pointer hover:ring-4 ring-indigo-300' : ''}`}
                    onClick={() => isEditing && logoInputRef.current?.click()}
                >
                    {visit.factoryLogo ? (
                        <img src={visit.factoryLogo} alt={visit.factory} className="w-full h-full object-contain" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300">
                             <Factory className="w-6 h-6 md:w-8 md:h-8" />
                             <span className="text-[8px] md:text-[10px] text-center mt-1">شعار المصنع</span>
                        </div>
                    )}
                    <input 
                        type="file" 
                        accept="image/*,.svg" 
                        ref={logoInputRef}
                        className="hidden"
                        onChange={handleLogoUpload}
                    />
                </div>
            </div>

        </div>
      </div>

      {/* Content Area - Images */}
      {/* Added print:px-1 to prevent images from touching edges */}
      <div className="p-2 md:p-3 print:px-1 print:pt-1 bg-gray-50/50 print:bg-transparent">
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2 print:gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
                <div 
                    key={idx} 
                    className={`relative aspect-video bg-gray-200 rounded-lg print:rounded-md overflow-hidden border border-gray-300 print:border-none flex items-center justify-center group shadow-sm print:shadow-none ${!isEditing && visit.images[idx] ? 'cursor-zoom-in' : ''}`}
                    onClick={() => !isEditing && visit.images[idx] && onImageClick(visit.images[idx])}
                >
                    {visit.images[idx] ? (
                        <>
                           <img src={visit.images[idx]} alt={`Visit ${idx + 1}`} className="w-full h-full object-cover" />
                           {isEditing && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); const newImages = [...visit.images]; newImages.splice(idx, 1); onUpdate(visit.id, { images: newImages }); }}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <X size={12} />
                             </button>
                           )}
                           {!isEditing && (
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={20} />
                                </div>
                           )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            {isEditing ? (
                                <>
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleImageUpload}
                                        title="رفع صور"
                                    />
                                    <Upload size={20} className="mb-1" />
                                    <span className="text-[10px]">رفع صور</span>
                                </>
                            ) : (
                                <ImagePlus size={20} className="opacity-50" />
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};