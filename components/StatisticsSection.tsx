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
    <div className="flex flex-col items-center text-center p-3 print:p-2 bg-gray-50 print:bg-white rounded-lg border border-gray-100 print:border-gray-200 h-full justify-start gap-3 print:gap-1">
        <div 
            className={`relative group w-20 h-20 print:w-16 print:h-16 flex items-center justify-center flex-shrink-0 ${isEditing ? 'cursor-pointer' : ''}`}
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
        
        <span className="text-base font-bold text-brand-dark min-h-[24px] print:min-h-0 flex items-center print:text-sm">{label}</span>
        
        <div className="w-full mt-auto">
             {isEditing ? (
                <input 
                    type="number" 
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className={`w-full text-center text-white font-bold py-1.5 rounded-md ${colorClass} outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-primary`}
                />
            ) : (
                <div className={`w-full text-white font-bold text-2xl print:text-xl py-1.5 print:py-1 rounded-md shadow-sm ${colorClass}`}>
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
    <div className="flex flex-col items-center text-center p-3 print:p-2 bg-gray-50 print:bg-white rounded-lg border border-gray-100 print:border-gray-200 h-full">
        {/* Icon Container - Fixed Height */}
        <div className="mb-3 print:mb-1 text-brand-dark bg-white p-3 print:p-2 rounded-full shadow-sm border border-gray-100 h-14 w-14 print:w-10 print:h-10 flex items-center justify-center flex-shrink-0">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "text-brand-primary w-6 h-6 print:w-5 print:h-5" })}
        </div>
        
        {/* Label Container */}
        <div className="h-10 print:h-auto flex items-center justify-center mb-2 print:mb-1 w-full">
            <span className="text-sm font-bold text-brand-dark leading-tight print:text-xs">{label}</span>
        </div>
        
        {/* Value Container */}
        <div className="w-full mt-auto">
            {isEditing ? (
                <input 
                    type="number" 
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className={`w-full text-center text-white font-bold py-1.5 rounded ${colorClass} outline-none`}
                />
            ) : (
                <div className={`w-full text-white font-bold text-xl print:text-lg py-1.5 print:py-1 rounded shadow-sm ${colorClass}`}>
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
    <div className="flex flex-col items-center justify-center w-full text-center p-4 print:p-2">
         <div className="mb-3 print:mb-1 text-brand-accent/20 bg-brand-primary/5 p-4 print:p-2 rounded-full">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "text-brand-primary w-8 h-8 print:w-6 print:h-6" })}
         </div>
         <span className="text-lg print:text-base font-bold text-gray-600 mb-2 print:mb-1 max-w-[250px] leading-tight min-h-[56px] print:min-h-0 flex items-center justify-center">{label}</span>
         {isEditing ? (
            <input 
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="text-5xl font-extrabold text-brand-dark bg-transparent text-center w-40 border-b-2 border-brand-accent/30 focus:border-brand-primary outline-none"
            />
         ) : (
            <span className="text-5xl print:text-4xl font-extrabold text-brand-dark tracking-tight">{value.toLocaleString()}</span>
         )}
    </div>
);

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({ stats, categoryLogos, isEditing, onUpdate, onLogoUpdate }) => {
  return (
    <div className="mt-8 print:mt-2 bg-white p-6 print:p-4 rounded-2xl print:rounded-none shadow-lg print:shadow-none border border-gray-100 print:border-none break-inside-avoid relative overflow-hidden print:overflow-visible h-full flex flex-col justify-center">
        
        {/* Decorative corner - Hide on print */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-brand-accent/10 to-transparent rounded-br-full no-print"></div>
        
        {/* Main Stats with Divider */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 print:gap-4 mb-10 print:mb-6 pb-8 print:pb-4 border-b border-gray-100 relative">
            <div className="flex-1 w-full">
                <MainStat 
                    label="إجمالي عدد المستفيدين من المبادرة" 
                    value={stats.totalBeneficiaries}
                    icon={<Users />}
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('totalBeneficiaries', v)}
                />
            </div>
            
            {/* Elegant Vertical Divider */}
            <div className="hidden md:block w-px h-32 print:h-24 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
            {/* Mobile Divider */}
            <div className="block md:hidden w-3/4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-2"></div>

            <div className="flex-1 w-full">
                 <MainStat 
                    label="إجمالي المسجلين في الجائزة" 
                    value={stats.totalRegistered}
                    icon={<Trophy />}
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('totalRegistered', v)}
                />
            </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 print:gap-4 mb-10 print:mb-6">
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

        {/* Social Stats */}
        <div className="bg-gray-50/50 print:bg-transparent rounded-xl p-6 print:p-0 border border-gray-100 print:border-none">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-3">
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