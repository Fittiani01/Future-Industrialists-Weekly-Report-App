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

  return (
    <div className="mb-6 break-inside-avoid relative shadow-md rounded-xl overflow-hidden bg-white border border-gray-100 print:shadow-none print:border-none print:bg-transparent print:mb-4">
      
      {/* Header Bar - Completely Redesigned for Pro Look */}
      <div 
        className="text-white p-4 print:p-3 relative rounded-t-xl print:rounded-lg transition-colors duration-300"
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
        <div className="flex flex-row items-stretch justify-between gap-4">
            
            {/* RIGHT: Text Info (School & Factory Name) */}
            <div className="flex flex-col justify-center gap-2 flex-grow min-w-0 pr-1">
                {/* School */}
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1.5 rounded-lg flex-shrink-0">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="w-full">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={visit.schoolName}
                                onChange={(e) => onUpdate(visit.id, { schoolName: e.target.value })}
                                className="bg-transparent border-b border-white/30 text-white w-full focus:outline-none focus:border-white font-bold text-lg placeholder-indigo-200"
                                placeholder="اسم المدرسة..."
                            />
                        ) : (
                            <h3 className="text-xl print:text-lg font-bold leading-tight truncate">{visit.schoolName}</h3>
                        )}
                    </div>
                </div>

                {/* Factory Name */}
                <div className="flex items-center gap-2">
                    <div className="bg-white/10 p-1.5 rounded-lg flex-shrink-0">
                        <Factory className="w-5 h-5 text-indigo-100" />
                    </div>
                    <div className="w-full">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={visit.factory}
                                onChange={(e) => onUpdate(visit.id, { factory: e.target.value })}
                                className="bg-transparent border-b border-white/20 text-indigo-50 w-full focus:outline-none focus:border-indigo-200 font-bold text-base placeholder-indigo-300"
                                placeholder="اسم المصنع..."
                            />
                        ) : (
                            <h4 className="text-lg print:text-base font-bold text-indigo-50 truncate">{visit.factory}</h4>
                        )}
                    </div>
                </div>
            </div>

            {/* CENTER: Stats (Date & Participants) - Next to Logo */}
            <div className="flex flex-col justify-center items-end gap-2 pl-2 border-l border-white/10 print:border-none">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-md min-w-[110px] justify-end">
                     {isEditing ? (
                        <input 
                            type="text" 
                            value={visit.date}
                            onChange={(e) => onUpdate(visit.id, { date: e.target.value })}
                            className="bg-transparent text-white w-24 text-right focus:outline-none font-bold text-sm"
                        />
                    ) : (
                        <span className="font-bold text-sm dir-ltr">{visit.date}</span>
                    )}
                    <Calendar size={16} className="text-indigo-200" />
                </div>
                
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-md min-w-[110px] justify-end">
                    {isEditing ? (
                            <input 
                            type="number" 
                            value={visit.participants}
                            onChange={(e) => onUpdate(visit.id, { participants: parseInt(e.target.value) || 0 })}
                            className="bg-transparent text-white w-12 text-right focus:outline-none font-bold text-sm"
                        />
                    ) : (
                        <span className="font-bold text-sm">{visit.participants}</span>
                    )}
                    <span className="text-xs text-indigo-200 font-normal">مشارك</span>
                    <Users size={16} className="text-indigo-200" />
                </div>
            </div>

            {/* LEFT: Big Factory Logo */}
            <div className="flex-shrink-0 flex items-center">
                 <div 
                    className={`w-24 h-24 print:w-20 print:h-20 bg-white rounded-xl p-1.5 flex items-center justify-center relative shadow-lg overflow-hidden ${isEditing ? 'cursor-pointer hover:ring-4 ring-indigo-300' : ''}`}
                    onClick={() => isEditing && logoInputRef.current?.click()}
                >
                    {visit.factoryLogo ? (
                        <img src={visit.factoryLogo} alt={visit.factory} className="w-full h-full object-contain" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300">
                             <Factory size={32} />
                             <span className="text-[10px] text-center mt-1">شعار المصنع</span>
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
      <div className="p-3 print:p-0 print:pt-1 bg-gray-50/50 print:bg-transparent">
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2 print:gap-1">
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