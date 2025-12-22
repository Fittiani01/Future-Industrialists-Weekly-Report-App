import React from 'react';
import { Statistics, CategoryLogos } from '../types';
import { FileText, Video, Mic, Users, Trophy } from 'lucide-react';

interface StatisticsSectionProps {
  stats: Statistics;
  categoryLogos: CategoryLogos;
  isEditing: boolean;
  onUpdate: (key: keyof Statistics, value: number) => void;
  onLogoUpdate: (key: keyof CategoryLogos) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CategoryBox: React.FC<{ 
    label: string; 
    value: number; 
    imageSrc: string; 
    colorClass: string; 
    isEditing: boolean;
    onChange: (val: number) => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, value, imageSrc, colorClass, isEditing, onChange, onImageUpload }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    return (
    <div className="flex flex-col items-center text-center p-3 print:p-1 bg-gray-50 print:bg-white rounded-lg border border-gray-100 print:border-gray-200 h-full justify-start gap-3 print:gap-1">
        <div 
            className={`relative group w-20 h-20 print:w-12 print:h-12 flex items-center justify-center flex-shrink-0 ${isEditing ? 'cursor-pointer' : ''}`}
            onClick={() => isEditing && fileInputRef.current?.click()}
        >
            <img 
                src={imageSrc} 
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
        
        <span className="text-base font-bold text-brand-dark min-h-[24px] print:min-h-0 flex items-center print:text-xs print:font-extrabold">{label}</span>
        
        <div className="w-full mt-auto">
             {isEditing ? (
                <input 
                    type="number" 
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className={`w-full text-center text-white font-bold py-1.5 rounded-md ${colorClass} outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-primary`}
                />
            ) : (
                <div className={`w-full text-white font-bold text-2xl print:text-lg py-1.5 print:py-0.5 rounded-md shadow-sm ${colorClass}`}>
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
    onChange: (val: number) => void;
}> = ({ label, value, icon, colorClass, isEditing, onChange }) => (
    <div className="flex flex-col items-center text-center p-3 print:p-1 bg-gray-50 print:bg-white rounded-lg border border-gray-100 print:border-gray-200 h-full">
        {/* Icon Container */}
        <div className="mb-3 print:mb-1 text-brand-dark bg-white p-3 print:p-1 rounded-full shadow-sm border border-gray-100 h-14 w-14 print:w-8 print:h-8 flex items-center justify-center flex-shrink-0">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "text-brand-primary w-6 h-6 print:w-4 print:h-4" })}
        </div>
        
        {/* Label */}
        <div className="h-10 print:h-auto flex items-center justify-center mb-2 print:mb-1 w-full">
            <span className="text-sm font-bold text-brand-dark leading-tight print:text-[10px]">{label}</span>
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
                <div className={`w-full text-white font-bold text-xl print:text-base py-1.5 print:py-0.5 rounded shadow-sm ${colorClass}`}>
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
    onChange: (val: number) => void;
}> = ({ label, value, icon, isEditing, onChange }) => (
    <div className="flex flex-col items-center justify-center w-full text-center p-4 print:p-1 border border-gray-100 print:border-gray-300 rounded-xl print:bg-gray-50">
         <div className="mb-3 print:mb-1 text-brand-accent/20 bg-brand-primary/5 p-4 print:p-1.5 rounded-full">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "text-brand-primary w-8 h-8 print:w-6 print:h-6" })}
         </div>
         <span className="text-lg print:text-sm font-bold text-gray-600 mb-2 print:mb-0 max-w-[250px] leading-tight flex items-center justify-center">{label}</span>
         {isEditing ? (
            <input 
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="text-5xl font-extrabold text-brand-dark bg-transparent text-center w-40 border-b-2 border-brand-accent/30 focus:border-brand-primary outline-none"
            />
         ) : (
            <span className="text-5xl print:text-3xl font-extrabold text-brand-dark tracking-tight mt-2 print:mt-1">{value.toLocaleString()}</span>
         )}
    </div>
);

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({ stats, categoryLogos, isEditing, onUpdate, onLogoUpdate }) => {
  return (
    <div className="mt-8 print:mt-0 bg-white p-6 print:p-0 rounded-2xl print:rounded-none shadow-lg print:shadow-none border border-gray-100 print:border-none break-inside-avoid relative overflow-hidden print:overflow-visible h-full flex flex-col justify-start print:justify-start gap-8 print:gap-4">
        
        {/* Decorative corner - Hide on print */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-brand-accent/10 to-transparent rounded-br-full no-print"></div>
        
        {/* SECTION 1: TOTALS (Side by Side) */}
        <div className="flex flex-col md:flex-row print:flex-row items-stretch justify-center gap-8 print:gap-4 w-full">
            <div className="flex-1">
                <MainStat 
                    label="إجمالي عدد المستفيدين من المبادرة" 
                    value={stats.totalBeneficiaries}
                    icon={<Users />}
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('totalBeneficiaries', v)}
                />
            </div>
            <div className="flex-1">
                 <MainStat 
                    label="إجمالي المسجلين في الجائزة" 
                    value={stats.totalRegistered}
                    icon={<Trophy />}
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('totalRegistered', v)}
                />
            </div>
        </div>

        {/* SECTION 2: CATEGORIES (Side by Side - 4 Columns) */}
        <div className="w-full">
            <h3 className="hidden print:block text-center text-brand-dark font-bold text-sm mb-1 bg-gray-100 py-1 rounded">الفئات</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-6 print:gap-2">
                <CategoryBox 
                    label="فئة المبدع" 
                    value={stats.creativeCategory} 
                    imageSrc={categoryLogos.creative}
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('creativeCategory', v)}
                    onImageUpload={onLogoUpdate('creative')}
                />
                <CategoryBox 
                    label="فئة المكتشف" 
                    value={stats.discovererCategory} 
                    imageSrc={categoryLogos.discoverer}
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('discovererCategory', v)}
                    onImageUpload={onLogoUpdate('discoverer')}
                />
                <CategoryBox 
                    label="فئة السفير" 
                    value={stats.ambassadorCategory} 
                    imageSrc={categoryLogos.ambassador} 
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('ambassadorCategory', v)}
                    onImageUpload={onLogoUpdate('ambassador')}
                />
                <CategoryBox 
                    label="فئة الفنان" 
                    value={stats.artistCategory} 
                    imageSrc={categoryLogos.artist} 
                    colorClass="bg-brand-primary"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('artistCategory', v)}
                    onImageUpload={onLogoUpdate('artist')}
                />
            </div>
        </div>

        {/* SECTION 3: SOCIAL STATS (Side by Side - 4 Columns) */}
        <div className="bg-gray-50/50 print:bg-transparent rounded-xl p-6 print:p-0 border border-gray-100 print:border-none w-full">
             <h3 className="hidden print:block text-center text-brand-dark font-bold text-sm mb-1 bg-gray-100 py-1 rounded">التفاعل الإعلامي</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2">
                 <SocialStatBox 
                    label="اللقاءات التلفزيونية" 
                    value={stats.tvInterviews} 
                    icon={<Mic />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('tvInterviews', v)}
                />
                <SocialStatBox 
                    label="عدد المنشورات" 
                    value={stats.posts} 
                    icon={<FileText />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('posts', v)}
                />
                <SocialStatBox 
                    label="عدد مقاطع الفيديو" 
                    value={stats.videos} 
                    icon={<Video />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('videos', v)}
                />
                 <SocialStatBox 
                    label="عدد التغريدات" 
                    value={stats.tweets} 
                    icon={<span className="text-2xl print:text-xl font-bold text-brand-primary">𝕏</span>} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('tweets', v)}
                />
            </div>
        </div>

    </div>
  );
};