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
    <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg border border-gray-100 h-full justify-start gap-3">
        <div 
            className={`relative group w-20 h-20 flex items-center justify-center flex-shrink-0 ${isEditing ? 'cursor-pointer' : ''}`}
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
        
        <span className="text-base font-bold text-brand-dark min-h-[24px] flex items-center">{label}</span>
        
        <div className="w-full mt-auto">
             {isEditing ? (
                <input 
                    type="number" 
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                    className={`w-full text-center text-white font-bold py-1.5 rounded-md ${colorClass} outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-primary`}
                />
            ) : (
                <div className={`w-full text-white font-bold text-2xl py-1.5 rounded-md shadow-sm ${colorClass}`}>
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
    <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg border border-gray-100 h-full">
        {/* Icon Container - Fixed Height */}
        <div className="mb-3 text-brand-dark bg-white p-3 rounded-full shadow-sm border border-gray-100 h-14 w-14 flex items-center justify-center flex-shrink-0">
            {icon}
        </div>
        
        {/* Label Container - Fixed Height to align all boxes regardless of text length */}
        <div className="h-10 flex items-center justify-center mb-2 w-full">
            <span className="text-sm font-bold text-brand-dark leading-tight">{label}</span>
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
                <div className={`w-full text-white font-bold text-xl py-1.5 rounded shadow-sm ${colorClass}`}>
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
    <div className="flex flex-col items-center justify-center w-full text-center p-4">
         <div className="mb-3 text-brand-accent/20 bg-brand-primary/5 p-4 rounded-full">
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "text-brand-primary w-8 h-8" })}
         </div>
         <span className="text-lg font-bold text-gray-600 mb-2 max-w-[250px] leading-tight min-h-[56px] flex items-center justify-center">{label}</span>
         {isEditing ? (
            <input 
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                className="text-5xl font-extrabold text-brand-dark bg-transparent text-center w-40 border-b-2 border-brand-accent/30 focus:border-brand-primary outline-none"
            />
         ) : (
            <span className="text-5xl font-extrabold text-brand-dark tracking-tight">{value.toLocaleString()}</span>
         )}
    </div>
);

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({ stats, categoryLogos, isEditing, onUpdate, onLogoUpdate }) => {
  return (
    <div className="mt-8 bg-white p-6 rounded-2xl shadow-lg border border-gray-100 break-inside-avoid relative overflow-hidden">
        
        {/* Decorative corner */}
        <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-brand-accent/10 to-transparent rounded-br-full"></div>
        
        {/* Main Stats with Divider */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-10 pb-8 border-b border-gray-100 relative">
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
            <div className="hidden md:block w-px h-32 bg-gradient-to-b from-transparent via-gray-300 to-transparent"></div>
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

        {/* Categories Grid - REORDERED: Creative first (Right in RTL) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
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

        {/* Social Stats - ALIGNED HEIGHTS */}
        <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <SocialStatBox 
                    label="اللقاءات التلفزيونية" 
                    value={stats.tvInterviews} 
                    icon={<Mic size={24} className="text-brand-primary" />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('tvInterviews', v)}
                />
                <SocialStatBox 
                    label="عدد المنشورات" 
                    value={stats.posts} 
                    icon={<FileText size={24} className="text-brand-primary" />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('posts', v)}
                />
                <SocialStatBox 
                    label="عدد مقاطع الفيديو" 
                    value={stats.videos} 
                    icon={<Video size={24} className="text-red-500" />} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('videos', v)}
                />
                 <SocialStatBox 
                    label="عدد التغريدات" 
                    value={stats.tweets} 
                    icon={<span className="text-2xl font-bold text-brand-primary">𝕏</span>} 
                    colorClass="bg-brand-dark"
                    isEditing={isEditing}
                    onChange={(v) => onUpdate('tweets', v)}
                />
            </div>
        </div>

    </div>
  );
};