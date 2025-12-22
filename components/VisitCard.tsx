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

  const removeImage = (index: number) => {
    const newImages = visit.images.filter((_, i) => i !== index);
    onUpdate(visit.id, { images: newImages });
  };

  return (
    <div className="mb-8 print:mb-0 break-inside-avoid relative shadow-lg rounded-xl overflow-hidden bg-white border border-gray-100 print:shadow-none print:border-none print:bg-transparent">
      
      {/* Header Bar - Updated for Print Compactness */}
      <div className="bg-brand-dark text-white p-3 print:py-1.5 print:px-3 flex flex-col md:flex-row print:flex-row items-stretch md:items-center justify-between gap-3 relative rounded-t-xl print:rounded-md">
         {isEditing && (
            <button 
                onClick={() => onDelete(visit.id)}
                className="absolute top-2 left-2 z-20 bg-red-500 hover:bg-red-600 p-1.5 rounded-full text-white no-print shadow-sm transition-colors"
                title="حذف الزيارة"
            >
                <X size={14} />
            </button>
        )}
        
        {/* Right Section: School & Factory */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="bg-white/10 p-2 print:p-1 rounded-lg flex-shrink-0">
            <Building2 className="w-5 h-5 print:w-3.5 print:h-3.5 text-white" />
          </div>
          
          <div className="flex flex-col w-full min-w-0">
            {/* School Name */}
            <div className="mb-0.5">
                 {isEditing ? (
                    <input 
                        type="text" 
                        value={visit.schoolName}
                        onChange={(e) => onUpdate(visit.id, { schoolName: e.target.value })}
                        className="bg-transparent border-b border-indigo-400/50 text-white px-0 py-0.5 placeholder-indigo-300 w-full focus:outline-none focus:border-white transition-colors text-lg font-bold"
                        placeholder="اسم المدرسة..."
                    />
                ) : (
                    <h3 className="text-lg print:text-sm font-bold leading-tight truncate">{visit.schoolName}</h3>
                )}
            </div>

            {/* Factory Name */}
            <div className="flex items-center gap-1.5 text-indigo-200">
                 <Factory size={14} />
                 {isEditing ? (
                    <input 
                        type="text" 
                        value={visit.factory}
                        onChange={(e) => onUpdate(visit.id, { factory: e.target.value })}
                        className="bg-transparent border-b border-indigo-400/30 text-indigo-100 px-0 py-0 placeholder-indigo-400/70 w-full focus:outline-none focus:border-indigo-200 transition-colors text-sm font-medium"
                        placeholder="اسم المصنع..."
                    />
                ) : (
                    <span className="text-sm print:text-[10px] font-medium truncate">{visit.factory}</span>
                )}
            </div>
          </div>
        </div>

        {/* Left Section: Stats & Logo */}
        <div className="flex items-center gap-4 print:gap-2 self-end md:self-center flex-shrink-0">
            
            {/* Stats */}
            <div className="flex flex-col items-end gap-0.5 px-2 border-r border-indigo-400/30">
                {/* Date */}
                <div className="flex items-center gap-1.5 text-indigo-100">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={visit.date}
                            onChange={(e) => onUpdate(visit.id, { date: e.target.value })}
                            className="bg-white/10 text-white w-24 px-1 py-0.5 rounded text-center focus:outline-none focus:bg-white/20 text-xs"
                        />
                    ) : (
                        <span className="font-mono dir-ltr text-sm print:text-[9px] font-medium">{visit.date}</span>
                    )}
                    <Calendar size={14} />
                </div>
                
                {/* Participants */}
                <div className="flex items-center gap-1.5">
                     <span className="text-[10px] text-indigo-200 print:text-[8px]">مشارك</span>
                     {isEditing ? (
                        <input 
                            type="number" 
                            value={visit.participants}
                            onChange={(e) => onUpdate(visit.id, { participants: parseInt(e.target.value) || 0 })}
                            className="bg-white/10 text-white w-12 px-1 py-0.5 rounded text-center focus:outline-none focus:bg-white/20 font-bold text-sm"
                        />
                    ) : (
                        <span className="text-lg print:text-sm font-bold leading-none">{visit.participants}</span>
                    )}
                     <Users size={16} />
                </div>
            </div>

            {/* Factory Logo */}
            <div 
                className={`w-14 h-14 print:w-10 print:h-10 bg-white rounded-lg p-1 flex items-center justify-center relative group overflow-hidden shadow-sm ${isEditing ? 'cursor-pointer hover:ring-2 ring-indigo-400' : ''}`}
                onClick={() => isEditing && logoInputRef.current?.click()}
            >
                {visit.factoryLogo ? (
                    <img src={visit.factoryLogo} alt={visit.factory} className="w-full h-full object-contain" />
                ) : (
                    <Factory className="text-gray-300" size={20} />
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

      {/* Content Area - Images (Horizontal Row in Print) */}
      <div className="p-3 print:p-0 print:pt-1 bg-gray-50/50 print:bg-transparent">
        {/* Screen: Grid 2x2 or 4x1. Print: Strictly 4 columns (1 row) */}
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-3 print:gap-1.5">
            {[0, 1, 2, 3].map((idx) => (
                <div 
                    key={idx} 
                    className={`relative aspect-video bg-gray-200 rounded-lg print:rounded-md overflow-hidden border border-gray-300 print:border-none flex items-center justify-center group shadow-sm print:shadow-none ${!isEditing && visit.images[idx] ? 'cursor-zoom-in' : ''}`}
                    onClick={() => !isEditing && visit.images[idx] && onImageClick(visit.images[idx])}
                >
                    {visit.images[idx] ? (
                        <>
                            <img src={visit.images[idx]} alt={`Visit ${idx + 1}`} className="w-full h-full object-cover" />
                            {isEditing ? (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity no-print shadow-md"
                                >
                                    <X size={14} />
                                </button>
                            ) : (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center no-print">
                                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center justify-center h-full w-full bg-gray-100 print:bg-gray-50">
                             {isEditing ? (
                                <div className="flex flex-col items-center gap-1">
                                    <ImagePlus size={20} className="text-gray-300" />
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            ))}
        </div>

        {isEditing && (
            <div className="mt-3 flex justify-center no-print">
                 <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleImageUpload}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-indigo-50 text-indigo-600 text-xs font-bold py-1.5 px-4 rounded-full border border-indigo-200 hover:bg-indigo-100 flex items-center gap-2 transition-all shadow-sm"
                >
                    <Upload size={14} />
                    رفع / تغيير الصور
                </button>
            </div>
        )}
      </div>
    </div>
  );
};