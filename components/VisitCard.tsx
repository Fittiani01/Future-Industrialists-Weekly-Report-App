import React, { useRef } from 'react';
import { Visit } from '../types';
import { Building2, Calendar, Users, Upload, X, ImagePlus, ZoomIn, Factory } from 'lucide-react';

interface VisitCardProps {
  visit: Visit;
  isEditing: boolean;
  isPrint?: boolean; // New prop to force print styling
  onUpdate: (id: string, data: Partial<Visit>) => void;
  onDelete: (id: string) => void;
  onImageClick: (imageUrl: string) => void;
  onUploadImages?: (files: File[]) => Promise<string[]>;
  onUploadLogo?: (file: File) => Promise<string>;
}

export const VisitCard: React.FC<VisitCardProps> = ({ visit, isEditing, isPrint = false, onUpdate, onDelete, onImageClick, onUploadImages, onUploadLogo }) => {
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

  // Reusable Stats Component (Date & Participants) - Desktop Only Version
  const DesktopStatsPills = () => (
      <div className={`flex flex-col items-end gap-2 pl-2 ${isPrint ? 'border-none' : 'border-l border-white/10'}`}>
          {/* Date Pill */}
          <div className={`flex items-center gap-2 bg-white/10 rounded-md justify-end ${isPrint ? 'px-2 py-0.5 min-w-[90px]' : 'px-3 py-1 min-w-[110px]'}`}>
               {isEditing ? (
                  <input 
                      type="text" 
                      value={visit.date}
                      onChange={(e) => onUpdate(visit.id, { date: e.target.value })}
                      className="bg-transparent text-white text-right focus:outline-none font-bold text-sm w-24"
                  />
              ) : (
                  <span className={`font-bold dir-ltr ${isPrint ? 'text-xs' : 'text-sm'}`}>{visit.date}</span>
              )}
              <Calendar size={16} className={`text-indigo-200 ${isPrint ? 'w-3 h-3' : ''}`} />
          </div>
          
          {/* Participants Pill */}
          <div className={`flex items-center gap-2 bg-white/10 rounded-md justify-end ${isPrint ? 'px-2 py-0.5 min-w-[90px]' : 'px-3 py-1 min-w-[110px]'}`}>
              {isEditing ? (
                      <input 
                      type="number" 
                      value={visit.participants}
                      onChange={(e) => onUpdate(visit.id, { participants: parseInt(e.target.value) || 0 })}
                      className="bg-transparent text-white text-right focus:outline-none font-bold text-sm w-12"
                  />
              ) : (
                  <span className={`font-bold ${isPrint ? 'text-xs' : 'text-sm'}`}>{visit.participants}</span>
              )}
              <span className={`text-indigo-200 font-normal ${isPrint ? 'text-[10px]' : 'text-xs'}`}>مشارك</span>
              <Users size={16} className={`text-indigo-200 ${isPrint ? 'w-3 h-3' : ''}`} />
          </div>
      </div>
  );

  return (
    <div className={`mb-4 md:mb-6 break-inside-avoid relative overflow-hidden rounded-xl ${isPrint ? 'shadow-none border-none bg-transparent mb-0' : 'shadow-md bg-white border border-gray-100'}`}>
      
      {/* Header Bar */}
      <div 
        className={`text-white transition-colors duration-300 ${isPrint ? 'p-2 rounded-lg' : 'p-3 md:p-4 rounded-t-xl'}`}
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
        
        {/* Main Flex Container */}
        <div className={`flex flex-row flex-nowrap items-center justify-between ${isPrint ? 'gap-2' : 'gap-3 md:gap-4'}`}>
            
            {/* RIGHT: Text Info (School & Factory Name) */}
            <div className="flex flex-col justify-center gap-1.5 flex-grow min-w-0 pr-1 text-right">
                
                {/* Row 1: School */}
                <div className="flex items-start gap-2">
                    <div className="bg-white/20 p-1 md:p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="w-full min-w-0">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={visit.schoolName}
                                onChange={(e) => onUpdate(visit.id, { schoolName: e.target.value })}
                                className="bg-transparent border-b border-white/30 text-white w-full focus:outline-none focus:border-white font-bold text-xs md:text-base placeholder-indigo-200"
                                placeholder="اسم المدرسة..."
                            />
                        ) : (
                            <h3 className={`font-bold leading-tight break-words ${isPrint ? 'text-sm' : 'text-[9px] md:text-base'}`}>{visit.schoolName}</h3>
                        )}
                    </div>
                </div>

                {/* Row 2: Factory + Stats (Mobile merged) */}
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2">
                    
                    {/* Factory Name Part */}
                    <div className="flex items-center gap-2 min-w-0 max-w-full">
                        <div className="bg-white/10 p-1 md:p-1.5 rounded-lg flex-shrink-0">
                            <Factory className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-100" />
                        </div>
                        <div className="min-w-0 flex-shrink truncate">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={visit.factory}
                                    onChange={(e) => onUpdate(visit.id, { factory: e.target.value })}
                                    className="bg-transparent border-b border-white/20 text-indigo-50 w-full focus:outline-none focus:border-indigo-200 font-bold text-[10px] md:text-sm placeholder-indigo-300"
                                    placeholder="اسم المصنع..."
                                />
                            ) : (
                                <h4 className={`font-bold text-indigo-50 truncate ${isPrint ? 'text-xs' : 'text-[10px] md:text-sm'}`}>{visit.factory}</h4>
                            )}
                        </div>
                    </div>

                    {/* Stats Part - Mobile Inline (Only show if NOT print, or if print but we want similar layout, but here we use DesktopStatsPills for print usually) */}
                    {!isPrint && (
                        <div className="flex md:hidden items-center gap-2 flex-shrink-0 mr-auto bg-black/10 rounded px-2 py-0.5">
                            {/* Date */}
                            <div className="flex items-center">
                                {isEditing ? (
                                    <input type="text" value={visit.date} onChange={(e) => onUpdate(visit.id, { date: e.target.value })} className="bg-transparent text-white text-[9px] w-14 text-center" />
                                ) : (
                                    <span className="text-[9px] font-bold text-indigo-50 dir-ltr">{visit.date}</span>
                                )}
                            </div>
                            <div className="w-px h-3 bg-white/20"></div>
                            {/* Participants */}
                            <div className="flex items-center gap-1">
                                {isEditing ? (
                                    <input type="number" value={visit.participants} onChange={(e) => onUpdate(visit.id, { participants: parseInt(e.target.value) || 0 })} className="bg-transparent text-white text-[9px] w-6 text-center" />
                                ) : (
                                    <span className="text-[9px] font-bold text-indigo-50">{visit.participants}</span>
                                )}
                                <Users size={10} className="text-indigo-200" />
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* CENTER: Stats - Always visible on Print, or MD on screen */}
            <div className={`${isPrint ? 'flex' : 'hidden md:flex'} flex-col justify-center flex-shrink-0`}>
                <DesktopStatsPills />
            </div>

            {/* LEFT: Big Factory Logo */}
            <div className="flex-shrink-0 flex items-center pt-1 md:pt-0">
                 <div 
                    className={`bg-white rounded-lg flex items-center justify-center relative shadow-lg overflow-hidden ${isPrint ? 'w-14 h-14 p-1' : 'w-16 h-16 md:w-24 md:h-24 p-1 md:p-1.5 md:rounded-xl'} ${isEditing ? 'cursor-pointer hover:ring-4 ring-indigo-300' : ''}`}
                    onClick={() => isEditing && logoInputRef.current?.click()}
                >
                    {visit.factoryLogo ? (
                        <img src={visit.factoryLogo} crossOrigin="anonymous" alt={visit.factory} className="w-full h-full object-contain" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300">
                             <Factory className={isPrint ? "w-6 h-6" : "w-6 h-6 md:w-8 md:h-8"} />
                             <span className={isPrint ? "text-[8px] text-center mt-0.5" : "text-[8px] md:text-[10px] text-center mt-1"}>شعار المصنع</span>
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
      <div className={`bg-gray-50/50 ${isPrint ? 'p-1 pt-1 bg-transparent' : 'p-2 md:p-3'}`}>
        <div className={`grid grid-cols-2 md:grid-cols-4 ${isPrint ? 'grid-cols-4 gap-1.5' : 'gap-2'}`}>
            {[0, 1, 2, 3].map((idx) => (
                <div 
                    key={idx} 
                    className={`relative aspect-video bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center group ${isPrint ? 'rounded-md shadow-none border-none' : 'border border-gray-300 shadow-sm'} ${!isEditing && visit.images[idx] ? 'cursor-zoom-in' : ''}`}
                    onClick={() => !isEditing && visit.images[idx] && onImageClick(visit.images[idx])}
                >
                    {visit.images[idx] ? (
                        <>
                           <img src={visit.images[idx]} crossOrigin="anonymous" alt={`Visit ${idx + 1}`} className="w-full h-full object-cover" />
                           {isEditing && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); const newImages = [...visit.images]; newImages.splice(idx, 1); onUpdate(visit.id, { images: newImages }); }}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <X size={12} />
                             </button>
                           )}
                           {!isEditing && !isPrint && (
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