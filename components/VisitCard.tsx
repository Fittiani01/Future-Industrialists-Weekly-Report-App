import React, { useRef } from 'react';
import { Visit } from '../types';
import { Building2, Calendar, Users, Upload, X, ImagePlus, ZoomIn, Factory } from 'lucide-react';

interface VisitCardProps {
  visit: Visit;
  isEditing: boolean;
  onUpdate: (id: string, data: Partial<Visit>) => void;
  onDelete: (id: string) => void;
  onImageClick: (imageUrl: string) => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({ visit, isEditing, onUpdate, onDelete, onImageClick }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files).map((file) => URL.createObjectURL(file as Blob));
      // Keep only up to 4 images total
      const combined = [...visit.images, ...newImages].slice(0, 4);
      onUpdate(visit.id, { images: combined });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const logoUrl = URL.createObjectURL(file);
          onUpdate(visit.id, { factoryLogo: logoUrl });
      }
  }

  const removeImage = (index: number) => {
    const newImages = visit.images.filter((_, i) => i !== index);
    onUpdate(visit.id, { images: newImages });
  };

  return (
    <div className="mb-8 break-inside-avoid print-break-inside relative shadow-lg rounded-xl overflow-hidden bg-white border border-gray-100">
      
      {/* Header Bar */}
      <div className="bg-brand-dark text-white p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative">
         {isEditing && (
            <button 
                onClick={() => onDelete(visit.id)}
                className="absolute top-2 left-2 z-20 bg-red-500 hover:bg-red-600 p-1.5 rounded-full text-white no-print shadow-sm transition-colors"
                title="حذف الزيارة"
            >
                <X size={14} />
            </button>
        )}
        
        {/* RIGHT: Text Information */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="bg-white/10 p-2.5 rounded-xl flex-shrink-0 mt-1">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex flex-col w-full min-w-0 justify-center">
            {/* School Name - Smaller Size, Text Wrap Allowed (No Truncate) */}
            <div className="mb-1.5">
                 {isEditing ? (
                    <input 
                        type="text" 
                        value={visit.schoolName}
                        onChange={(e) => onUpdate(visit.id, { schoolName: e.target.value })}
                        className="bg-transparent border-b border-indigo-400/50 text-white px-0 py-0.5 placeholder-indigo-300 w-full focus:outline-none focus:border-white transition-colors text-lg md:text-xl font-bold"
                        placeholder="اسم المدرسة..."
                    />
                ) : (
                    <h3 className="text-lg md:text-xl font-bold leading-snug whitespace-normal break-words">{visit.schoolName}</h3>
                )}
            </div>

            {/* Factory Name */}
            <div className="flex items-center gap-2 text-indigo-200">
                 <Factory size={16} />
                 {isEditing ? (
                    <input 
                        type="text" 
                        value={visit.factory}
                        onChange={(e) => onUpdate(visit.id, { factory: e.target.value })}
                        className="bg-transparent border-b border-indigo-400/30 text-indigo-100 px-0 py-0 placeholder-indigo-400/70 w-full md:w-80 focus:outline-none focus:border-indigo-200 transition-colors text-base font-medium"
                        placeholder="اسم المصنع..."
                    />
                ) : (
                    <span className="text-base font-medium truncate">{visit.factory}</span>
                )}
            </div>
          </div>
        </div>

        {/* LEFT: Stats & Logo Container */}
        <div className="flex items-center gap-6 self-end md:self-center flex-shrink-0 bg-brand-primary/20 md:bg-transparent p-3 md:p-0 rounded-lg w-full md:w-auto justify-between md:justify-end">
            
            {/* Stats Column */}
            <div className="flex flex-col items-end justify-center gap-1.5 px-2">
                {/* Date */}
                <div className="flex items-center gap-2 text-indigo-100">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={visit.date}
                            onChange={(e) => onUpdate(visit.id, { date: e.target.value })}
                            className="bg-white/10 text-white w-28 px-1 py-0.5 rounded text-center focus:outline-none focus:bg-white/20 text-sm"
                        />
                    ) : (
                        <span className="font-mono dir-ltr text-base font-medium">{visit.date}</span>
                    )}
                    <Calendar size={16} />
                </div>
                
                {/* Participants */}
                <div className="flex items-center gap-2">
                     <span className="text-xs md:text-sm text-indigo-200">مشارك</span>
                     {isEditing ? (
                        <input 
                            type="number" 
                            value={visit.participants}
                            onChange={(e) => onUpdate(visit.id, { participants: parseInt(e.target.value) || 0 })}
                            className="bg-white/10 text-white w-16 px-1 py-0.5 rounded text-center focus:outline-none focus:bg-white/20 font-bold text-base"
                        />
                    ) : (
                        <span className="text-xl md:text-2xl font-bold leading-none">{visit.participants}</span>
                    )}
                     <Users size={20} />
                </div>
            </div>

            {/* Factory Logo */}
            <div 
                className={`w-16 h-16 md:w-20 md:h-20 bg-white rounded-xl p-1.5 flex items-center justify-center relative group overflow-hidden shadow-md border-2 border-white/10 ${isEditing ? 'cursor-pointer hover:ring-2 ring-indigo-400' : ''}`}
                onClick={() => isEditing && logoInputRef.current?.click()}
                title={isEditing ? "تغيير شعار المصنع" : ""}
            >
                {visit.factoryLogo ? (
                    <img src={visit.factoryLogo} alt={visit.factory} className="w-full h-full object-contain" />
                ) : (
                    <Factory className="text-gray-300" size={28} />
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

      {/* Content Area - Images */}
      <div className="p-4 bg-gray-50/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((idx) => (
                <div 
                    key={idx} 
                    className={`relative aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center group shadow-sm ${!isEditing && visit.images[idx] ? 'cursor-zoom-in' : ''}`}
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
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center justify-center h-full w-full bg-gray-100">
                             {isEditing ? (
                                <div className="flex flex-col items-center gap-1">
                                    <ImagePlus size={20} className="text-gray-300" />
                                    <span className="text-[10px] text-gray-400">صورة</span>
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