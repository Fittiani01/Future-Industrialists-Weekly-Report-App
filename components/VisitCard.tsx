import React, { useRef, useState } from 'react';
import { Visit } from '../types';
import { Building2, Calendar, Users, Upload, X, ImagePlus, ZoomIn, Factory, Loader2, ChevronsUpDown } from 'lucide-react';

interface VisitCardProps {
  visit: Visit;
  isEditing: boolean;
  onUpdate: (id: string, data: Partial<Visit>) => void;
  onDelete: (id: string) => void;
  onImageClick: (imageUrl: string) => void;
  onUploadImages?: (files: File[]) => Promise<string[]>;
  onUploadLogo?: (file: File) => Promise<string>;
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

// Sub-component for individual image handling (loading state)
const VisitImageItem = ({ 
    src, 
    idx, 
    position,
    isEditing, 
    onDelete, 
    onTogglePosition,
    onClick 
}: { 
    src: string, 
    idx: number, 
    position: 'top' | 'center' | 'bottom',
    isEditing: boolean, 
    onDelete: () => void, 
    onTogglePosition: () => void,
    onClick: () => void 
}) => {
    const [isLoading, setIsLoading] = useState(true);

    // Map the string position to CSS object-position class or style
    const getObjectPosition = () => {
        switch(position) {
            case 'top': return 'object-top';
            case 'bottom': return 'object-bottom';
            default: return 'object-center';
        }
    };

    const getPositionLabel = () => {
        switch(position) {
            case 'top': return 'أعلى';
            case 'bottom': return 'أسفل';
            default: return 'وسط';
        }
    }

    return (
        <div 
            className={`relative h-32 md:h-40 bg-gray-200 rounded-lg print:rounded-md overflow-hidden border border-gray-300 print:border-none flex items-center justify-center group shadow-sm print:shadow-none ${!isEditing ? 'cursor-zoom-in' : ''}`}
            onClick={onClick}
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
            )}
            <img 
                src={src} 
                alt={`Visit ${idx + 1}`} 
                className={`w-full h-full object-cover ${getObjectPosition()} transition-all duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsLoading(false)} 
            />
            {isEditing && (
                <>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                        title="حذف الصورة"
                    >
                        <X size={12} />
                    </button>
                    
                    {/* Position Toggle Button */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onTogglePosition(); }}
                        className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 text-[10px] backdrop-blur-sm"
                        title="تغيير تركيز الصورة (أعلى/وسط/أسفل)"
                    >
                        <ChevronsUpDown size={10} />
                        <span>{getPositionLabel()}</span>
                    </button>
                </>
            )}
            {!isEditing && !isLoading && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={20} />
                </div>
            )}
        </div>
    );
};

export const VisitCard: React.FC<VisitCardProps> = ({ visit, isEditing, onUpdate, onDelete, onImageClick, onUploadImages, onUploadLogo }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Helper to detect image orientation and set default focus
  const detectImageOrientations = async (files: File[]): Promise<('top' | 'center')[]> => {
      const positions: ('top' | 'center')[] = [];
      for (const file of files) {
          try {
              const url = URL.createObjectURL(file);
              const img = new Image();
              await new Promise<void>((resolve) => {
                  img.onload = () => resolve();
                  img.src = url;
              });
              // Heuristic: If Height > Width, it's portrait. People's heads are at top. Default to 'top'.
              positions.push(img.height > img.width ? 'top' : 'center');
              URL.revokeObjectURL(url);
          } catch (e) {
              positions.push('center');
          }
      }
      return positions;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      
      if (onUploadImages) {
          try {
              // 1. Detect Orientations BEFORE upload complete to have UI ready
              const newPositions = await detectImageOrientations(files);
              
              // 2. Upload
              const urls = await onUploadImages(files);
              
              // 3. Update State
              const combinedImages = [...visit.images, ...urls].slice(0, 4);
              const updatedPositions = { ...(visit.imagePositions || {}) };
              
              urls.forEach((url, idx) => {
                  if (url) updatedPositions[url] = newPositions[idx] || 'center';
              });

              onUpdate(visit.id, { 
                  images: combinedImages,
                  imagePositions: updatedPositions
              });

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

  const toggleImagePosition = (imgUrl: string) => {
      const currentPos = visit.imagePositions?.[imgUrl] || 'center';
      let newPos: 'top' | 'center' | 'bottom' = 'center';
      
      if (currentPos === 'center') newPos = 'top';
      else if (currentPos === 'top') newPos = 'bottom';
      else newPos = 'center';

      onUpdate(visit.id, {
          imagePositions: {
              ...(visit.imagePositions || {}),
              [imgUrl]: newPos
          }
      });
  };

  // Logic to determine header color based on gender
  const isGirls = visit.schoolName.includes("بنات");
  const headerColor = isGirls ? "#867bba" : "#2b3592";

  // Unified Stats Component
  const Stats = ({ compact }: { compact?: boolean }) => (
    <div
        className={[
        "flex items-center gap-2 rounded-md bg-white/10 border border-white/5",
        compact ? "bg-transparent border-none flex-col items-end gap-1 p-0" : "px-3 py-1.5", // Compact (Mobile) style changes
        "flex-shrink-0",
        ].join(" ")}
        style={{ fontVariantNumeric: "tabular-nums" }}
    >
        {/* Date */}
        <div className={`flex items-center gap-1.5 ${compact ? "bg-white/20 px-1.5 py-0.5 rounded" : ""}`}>
            <Calendar size={compact ? 10 : 16} className="text-indigo-200 opacity-80" />
            {isEditing ? (
                <input
                    type="text"
                    value={visit.date}
                    onChange={(e) => onUpdate(visit.id, { date: e.target.value })}
                    className="bg-transparent text-white text-center focus:outline-none font-bold text-[10px] md:text-sm w-16 md:w-24"
                    style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                    placeholder="YYYY/MM/DD"
                />
            ) : (
                <span className="font-bold text-indigo-50 text-[10px] md:text-sm print:text-xs leading-none pt-0.5 inline-block" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>
                    {formatDisplayDate(visit.date)}
                </span>
            )}
        </div>

        {!compact && <div className="w-px h-3 bg-white/20 mx-0.5" />}

        {/* Participants */}
        <div className={`flex items-center gap-1.5 ${compact ? "bg-white/20 px-1.5 py-0.5 rounded" : ""}`}>
            <Users size={compact ? 10 : 16} className="text-indigo-200 opacity-80" />
            {isEditing ? (
                    <input
                    type="number"
                    value={visit.participants}
                    onChange={(e) => onUpdate(visit.id, { participants: parseInt(e.target.value) || 0 })}
                    className="bg-transparent text-white text-right focus:outline-none font-bold text-[10px] md:text-sm w-8"
                />
            ) : (
                <span className="font-bold text-indigo-50 text-[10px] md:text-sm print:text-xs leading-none pt-0.5">
                    {visit.participants}
                </span>
            )}
            <span className="text-indigo-200 text-[9px] md:text-xs print:text-[9px] leading-none">مشارك</span>
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
        
        {/* Main Flex Container */}
        <div className="flex flex-row flex-nowrap items-center justify-between gap-3 md:gap-4 print:gap-2">
            
            {/* RIGHT: Text Info (School & Factory Name) */}
            <div className="flex flex-col justify-center flex-grow min-w-0 text-right gap-1.5">
                
                {/* Row 1: School */}
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-1 md:p-1.5 rounded-lg flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                    </div>
                    <div className="w-full min-w-0">
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={visit.schoolName}
                                onChange={(e) => onUpdate(visit.id, { schoolName: e.target.value })}
                                className="bg-transparent border-b border-white/30 text-white w-full focus:outline-none focus:border-white font-bold text-xs md:text-lg placeholder-indigo-200"
                                placeholder="اسم المدرسة..."
                            />
                        ) : (
                            // UPDATED: text-xs for mobile as requested
                            <h3 className="text-xs md:text-lg print:text-base font-bold leading-tight truncate text-white">{visit.schoolName}</h3>
                        )}
                    </div>
                </div>

                {/* Row 2: Factory */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                    
                    {/* Factory Name */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="bg-white/10 p-1 md:p-1.5 rounded-lg flex-shrink-0">
                            <Factory className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-100" />
                        </div>
                        <div className="min-w-0 flex-shrink">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    value={visit.factory}
                                    onChange={(e) => onUpdate(visit.id, { factory: e.target.value })}
                                    className="bg-transparent border-b border-white/20 text-indigo-50 w-full focus:outline-none focus:border-indigo-200 font-bold text-[10px] md:text-sm placeholder-indigo-300"
                                    placeholder="اسم المصنع..."
                                />
                            ) : (
                                <h4 className="text-xs md:text-base print:text-sm font-bold text-indigo-50 truncate">{visit.factory}</h4>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CENTER (Desktop Only): Stats */}
            <div className="hidden md:flex print:flex items-center pl-4">
                <Stats />
            </div>

            {/* LEFT CONTAINER: Logo + Mobile Stats */}
            <div className="flex-shrink-0 flex items-center gap-2 pt-1 md:pt-0">
                 
                 {/* Mobile Stats (Stacked on Left) */}
                 <div className="flex md:hidden">
                    <Stats compact />
                 </div>

                 <div 
                    className={`w-14 h-14 md:w-20 md:h-20 print:w-16 print:h-16 bg-white rounded-lg md:rounded-xl p-1 md:p-1.5 flex items-center justify-center relative shadow-lg overflow-hidden ${isEditing ? 'cursor-pointer hover:ring-4 ring-indigo-300' : ''}`}
                    onClick={() => isEditing && logoInputRef.current?.click()}
                >
                    {visit.factoryLogo ? (
                        <img src={visit.factoryLogo} alt={visit.factory} className="w-full h-full object-contain" />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300">
                             <Factory className="w-6 h-6 md:w-8 md:h-8" />
                             <span className="text-[8px] md:text-[10px] text-center mt-1">شعار</span>
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
      <div className="p-2 md:p-3 print:px-1 print:pt-1 bg-gray-50/50 print:bg-transparent">
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2 print:gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
                <React.Fragment key={idx}>
                    {visit.images[idx] ? (
                        <VisitImageItem 
                            src={visit.images[idx]} 
                            idx={idx} 
                            position={visit.imagePositions?.[visit.images[idx]] || 'center'}
                            isEditing={isEditing} 
                            onDelete={() => { const newImages = [...visit.images]; newImages.splice(idx, 1); onUpdate(visit.id, { images: newImages }); }}
                            onTogglePosition={() => toggleImagePosition(visit.images[idx])}
                            onClick={() => !isEditing && onImageClick(visit.images[idx])}
                        />
                    ) : (
                        <div className="relative h-32 md:h-40 bg-gray-200 rounded-lg print:rounded-md overflow-hidden border border-gray-300 print:border-none flex items-center justify-center group shadow-sm print:shadow-none">
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
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
};