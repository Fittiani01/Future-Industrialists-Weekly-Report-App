import React from 'react';
import { Statistics, CategoryLogos } from '../types';
import { FileText, Video, Mic, Users, Trophy } from 'lucide-react';

interface StatisticsSectionProps {
  stats: Statistics;
  categoryLogos: CategoryLogos;
  isEditing: boolean;
  isPrint?: boolean; // New prop
  onUpdate: (key: keyof Statistics, value: number) => void;
  onLogoUpdate: (key: keyof CategoryLogos) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CategoryBox: React.FC<{ 
    label: string; 
    value: number; 
    imageSrc: string; 
    colorClass: string; 
    isEditing: boolean;
    isPrint?: boolean;
    onChange: (val: number) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, imageSrc, colorClass, isEditing, isPrint, onChange, onImageUpload }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
    <div className={`flex flex-col items-center text-center rounded-lg h-full justify-start ${isPrint ? 'p-2 bg-white border-gray-200 gap-2' : 'p-3 bg-gray-50 border border-gray-100 gap-3'}`}>
        <div 
            className={`relative group flex items-center justify-center flex-shrink-0 ${isPrint ? 'w-16 h-16' : 'w-20 h-20'} ${isEditing ? 'cursor-pointer' : ''}`}
            onClick={() => isEditing && fileInputRef.current?.click()}
        >
            <img 
                src={imageSrc} 
                crossOrigin="anonymous"
                alt={label} 
                className="w-full h-full object-contain filter drop-shadow-sm" 
            />
            {isEditing && (
                <>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 rounded-full transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="text-white text-xs font-bold">تغيير</span>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={onImageUpload} 
                        accept="image/*"
                    />
                </>
            )}
        </div>
        
        <span className={`font-bold text-brand-dark flex items-center ${isPrint ? 'text-sm font-extrabold min-h-0' : 'text-base min-h-[24px]'}`}>{label}</span>
        
        <div className="w-full mt-auto">
             {isEditing ? (
                <input 
                    type="number" 
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className={`w-full text-center text-white font-bold py-1.5 rounded-md ${colorClass} outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-primary`}
                />
            ) : (
                <div className={`w-full text-white font-bold rounded-md shadow-sm ${colorClass} ${isPrint ? 'text-xl py-1' : 'text-2xl py-1.5'}`}>
                    {value}
                </div>
            )}
        </div>
    </div>
)};

const SocialStatBox: React.FC<{ 
    label: string; 
    value: number; 
    icon: React.ReactNode; 
    colorClass: string; 
    isEditing: boolean;
    isPrint?: boolean;
    onChange: (val: number) => void;
}> = ({ label, value, icon, colorClass, isEditing, isPrint, onChange }) => (
    <div className={`flex flex-col items-center text-center rounded-lg h-full ${isPrint ? 'p-2 bg-white border-gray-200' : 'p-3 bg-gray-50 border border-gray-100'}`}>
        {/* Icon Container */}
        <div className={`text-brand-dark bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0 ${isPrint ? 'mb-2 p-2 w-10 h-10' : 'mb-3 p-3 h-14 w-14'}`}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `text-brand-primary ${isPrint ? 'w-5 h-5' : 'w-6 h-6'}` })}
        </div>
        
        {/* Label */}
        <div className={`flex items-center justify-center w-full ${isPrint ? 'mb-2 h-auto' : 'mb-2 h-10'}`}>
            <span className={`font-bold text-brand-dark leading-tight ${isPrint ? 'text-xs' : 'text-sm'}`}>{label}</span>
        </div>
        
        {/* Value */}
        <div className="w-full mt-auto">
            {isEditing ? (
                <input 
                    type="number" 
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className={`w-full text-center text-white font-bold py-1.5 rounded ${colorClass} outline-none`}
                />
            ) : (
                <div className={`w-full text-white font-bold rounded shadow-sm ${colorClass} ${isPrint ? 'text-lg py-1' : 'text-xl py-1.5'}`}>
                    {value}
                </div>
            )}
        </div>
    </div>
);

const MainStat: React.FC<{
    label: string;
    value: number;
    icon: React.ReactNode;
    isEditing: boolean;
    isPrint?: boolean;
    onChange: (val: number) => void;
}> = ({ label, value, icon, isEditing, isPrint, onChange }) => (
    <div className={`flex flex-col items-center justify-center w-full text-center rounded-xl ${isPrint ? 'p-3 border-gray-300 bg-gray-50' : 'p-4 border border-gray-100'}`}>
         <div className={`text-brand-accent/20 bg-brand-primary/5 rounded-full ${isPrint ? 'mb-2 p-2' : 'mb-3 p-4'}`}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `text-brand-primary ${isPrint ? 'w-8 h-8' : 'w-8 h-8'}` })}
         </div>
         <span className={`font-bold text-gray-600 max-w-[250px] leading-tight flex items-center justify-center ${isPrint ? 'text-base mb-0' : 'text-lg mb-2'}`}>{label}</span>
         {isEditing ? (
            <input 
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="text-5xl font-extrabold text-brand-dark bg-transparent text-center w-40 border-b-2 border-brand-accent/30 focus:border-brand-primary outline-none"
            />
         ) : (
            <span className={`font-extrabold text-brand-dark tracking-tight ${isPrint ? 'text-3xl mt-1' : 'text-5xl mt-2'}`}>{value.toLocaleString()}</span>
         )}
    </div>
);

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({ stats, categoryLogos, isEditing, isPrint = false, onUpdate, onLogoUpdate }) => {
  return (
    <div className={`relative overflow-hidden flex flex-col justify-start h-full ${isPrint ? 'mt-0 p-0 rounded-none shadow-none border-none gap-10' : 'mt-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-100 gap-8'}`}>
        
        {/* Decorative corner - Hide on print */}
        {!isPrint && <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-brand-accent/10 to-transparent rounded-br-full no-print"></div>}
        
        {/* SECTION 1: TOTALS (Side by Side) */}
        <div className={`flex items-stretch justify-center w-full ${isPrint ? 'flex-row gap-8' : 'flex-col md:flex-row gap-8'}`}>
            <div className="flex-1">
                <MainStat 
                    label="إجمالي عدد المستفيدين من المبادرة" 
                    value={stats.totalBeneficiaries}
                    icon={<Users />}
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('totalBeneficiaries', v)}
                />
            </div>
            <div className="flex-1">
                 <MainStat 
                    label="إجمالي المسجلين في الجائزة" 
                    value={stats.totalRegistered}
                    icon={<Trophy />}
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('totalRegistered', v)}
                />
            </div>
        </div>

        {/* SECTION 2: CATEGORIES (Side by Side - 4 Columns) */}
        <div className="w-full">
            {/* FORCE VISIBILITY if isPrint is true, otherwise use media query for pure CSS print */}
            <h3 className={`text-center text-brand-dark font-bold text-sm mb-2 bg-gray-100 py-1 rounded ${isPrint ? 'block' : 'hidden print:block'}`}>الفئات</h3>
            <div className={`grid ${isPrint ? 'grid-cols-4 gap-4' : 'grid-cols-2 md:grid-cols-4 gap-6'}`}>
                <CategoryBox 
                    label="فئة المبدع" 
                    value={stats.creativeCategory} 
                    imageSrc={categoryLogos.creative}
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('creativeCategory', v)}
                    onImageUpload={onLogoUpdate('creative')}
                />
                <CategoryBox 
                    label="فئة المكتشف" 
                    value={stats.discovererCategory} 
                    imageSrc={categoryLogos.discoverer}
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('discovererCategory', v)}
                    onImageUpload={onLogoUpdate('discoverer')}
                />
                <CategoryBox 
                    label="فئة السفير" 
                    value={stats.ambassadorCategory} 
                    imageSrc={categoryLogos.ambassador} 
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('ambassadorCategory', v)}
                    onImageUpload={onLogoUpdate('ambassador')}
                />
                <CategoryBox 
                    label="فئة الفنان" 
                    value={stats.artistCategory} 
                    imageSrc={categoryLogos.artist} 
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('artistCategory', v)}
                    onImageUpload={onLogoUpdate('artist')}
                />
            </div>
        </div>

        {/* SECTION 3: SOCIAL STATS (Side by Side - 4 Columns) */}
        <div className={`w-full ${isPrint ? 'bg-transparent border-none p-0' : 'bg-gray-50/50 rounded-xl p-6 border border-gray-100'}`}>
             <h3 className={`text-center text-brand-dark font-bold text-sm mb-2 bg-gray-100 py-1 rounded ${isPrint ? 'block' : 'hidden print:block'}`}>التفاعل الإعلامي</h3>
             <div className={`grid ${isPrint ? 'grid-cols-4 gap-4' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
                 <SocialStatBox 
                    label="اللقاءات التلفزيونية" 
                    value={stats.tvInterviews} 
                    icon={<Mic />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('tvInterviews', v)}
                />
                <SocialStatBox 
                    label="عدد المنشورات" 
                    value={stats.posts} 
                    icon={<FileText />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('posts', v)}
                />
                <SocialStatBox 
                    label="عدد مقاطع الفيديو" 
                    value={stats.videos} 
                    icon={<Video />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('videos', v)}
                />
                 <SocialStatBox 
                    label="عدد التغريدات" 
                    value={stats.tweets} 
                    icon={<span className={`font-bold text-brand-primary ${isPrint ? 'text-xl' : 'text-2xl'}`}>𝕏</span>} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    isPrint={isPrint}
                    onChange={(v) => onUpdate('tweets', v)}
                />
            </div>
        </div>

    </div>
  );
};