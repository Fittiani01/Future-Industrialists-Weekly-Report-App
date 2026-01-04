import React, { useState } from 'react';
import { Users, Building2, Factory, MapPin, ChevronRight } from 'lucide-react';

interface LandingMapProps {
    onSelectRegion: (regionId: string) => void;
}

export const LandingMap: React.FC<LandingMapProps> = ({ onSelectRegion }) => {
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

    // Modern Dark Theme Palette
    const theme = {
        bg: "transparent", // Handled by CSS background
        mapFill: "rgba(30, 41, 59, 0.6)", // Dark slate with opacity
        mapStroke: "rgba(148, 163, 184, 0.3)",
        lineColor: "rgba(99, 102, 241, 0.3)", // Faint Indigo
        nodeBase: "#1e293b", // Slate 800
        nodeStroke: "#6366f1", // Indigo 500
        text: "#f8fafc",
        highlight: "#4f46e5", // Indigo 600
        glow: "rgba(99, 102, 241, 0.6)"
    };

    // Coordinates tailored for a 800x600 SVG viewBox
    const locations = {
        qassim: { x: 360, y: 260, label: "القصيم", icon: <Factory size={20} /> },
        riyadh: { x: 440, y: 330, label: "الرياض", icon: <Building2 size={24} /> },
        sharqiyah: { x: 540, y: 290, label: "الشرقية", icon: <Users size={20} /> },
        makkah: { x: 230, y: 380, label: "مكة المكرمة", icon: <MapPin size={24} /> },
    };

    // Detailed KSA Path (Simplified for performance but recognizable)
    const ksaPath = "M200,150 L250,130 L350,110 L500,120 L600,150 L650,250 L680,350 L700,450 L550,550 L400,530 L300,520 L200,480 L150,400 L120,300 L150,200 Z"; 
    // Replacing with a better visual approximation using polygon points relative to 800x600
    // This path draws the general shape of Saudi Arabia
    const saudiPath = `
        M 170 250 
        L 230 180 
        L 320 140 
        L 450 145 
        L 580 180 
        L 640 250 
        L 660 350 
        L 720 480 
        L 550 560 
        L 350 540 
        L 220 500 
        L 150 420 
        L 140 320 
        Z
    `;

    const handleMouseEnter = (id: string) => setHoveredRegion(id);
    const handleMouseLeave = () => setHoveredRegion(null);

    const renderNode = (id: string, data: any) => {
        const isHovered = hoveredRegion === id;
        // Make Makkah pulse by default if nothing hovered to guide user
        const isActive = id === 'makkah' && !hoveredRegion; 

        return (
            <g 
                key={id}
                className="cursor-pointer transition-all duration-500"
                onClick={() => onSelectRegion(id)}
                onMouseEnter={() => handleMouseEnter(id)}
                onMouseLeave={handleMouseLeave}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                {/* Ripple Effect (Pulse) */}
                {(isHovered || isActive) && (
                    <circle cx={data.x} cy={data.y} r="50" fill={theme.glow} opacity="0.2">
                        <animate attributeName="r" from="30" to="60" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                )}

                {/* Connecting Lines (Decorative) */}
                <line x1={data.x} y1={data.y} x2={data.x} y2={data.y + 40} stroke={theme.lineColor} strokeWidth="1" />

                {/* Main Circle Background */}
                <circle 
                    cx={data.x} 
                    cy={data.y} 
                    r={isHovered ? 40 : 30} 
                    fill={isHovered ? theme.highlight : theme.nodeBase} 
                    stroke={theme.text} 
                    strokeWidth={isHovered ? 3 : 1}
                    className="transition-all duration-300 ease-out"
                    filter="url(#shadow)"
                />

                {/* Icon */}
                <foreignObject x={data.x - (isHovered ? 15 : 12)} y={data.y - (isHovered ? 25 : 20)} width={isHovered ? 30 : 24} height={isHovered ? 30 : 24} className="pointer-events-none">
                    <div className={`flex items-center justify-center w-full h-full text-white transition-all duration-300`}>
                        {React.cloneElement(data.icon, { size: isHovered ? 28 : 20 })}
                    </div>
                </foreignObject>

                {/* Label Box */}
                <g transform={`translate(${data.x}, ${data.y + (isHovered ? 55 : 45)})`}>
                    <rect 
                        x="-50" 
                        y="-15" 
                        width="100" 
                        height="30" 
                        rx="15" 
                        fill={isHovered ? "#ffffff" : "rgba(30, 41, 59, 0.8)"} 
                        className="transition-colors duration-300"
                    />
                    <text 
                        x="0" 
                        y="5" 
                        textAnchor="middle" 
                        fill={isHovered ? theme.highlight : "#ffffff"} 
                        className="text-sm font-bold transition-colors duration-300" 
                        style={{ fontFamily: 'Tajawal', fontSize: isHovered ? '14px' : '12px' }}
                    >
                        {data.label}
                    </text>
                </g>
            </g>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[90vh] relative z-10 px-4 overflow-hidden">
            
            {/* Header */}
            <div className="text-center mb-4 md:mb-8 animate-fade-in relative z-20 mt-10">
                <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl mb-2 font-sans tracking-tight">
                    صناعيو المستقبل
                </h1>
                <div className="flex items-center justify-center gap-2 text-indigo-200 text-lg md:text-2xl font-light">
                    <span>النسخة الرابعة</span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                    <span>2025</span>
                </div>
            </div>

            {/* Map Container */}
            <div className="relative w-full max-w-5xl aspect-[4/3] md:aspect-[16/9] flex items-center justify-center perspective-1000">
                <svg viewBox="0 0 800 600" className="w-full h-full drop-shadow-2xl" style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))' }}>
                    <defs>
                        <linearGradient id="mapGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#312e81" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="black" floodOpacity="0.3"/>
                        </filter>
                    </defs>

                    {/* Connection Lines (The Network) */}
                    <path 
                        d={`M${locations.makkah.x},${locations.makkah.y} L${locations.qassim.x},${locations.qassim.y} L${locations.riyadh.x},${locations.riyadh.y} L${locations.sharqiyah.x},${locations.sharqiyah.y}`}
                        fill="none"
                        stroke={theme.lineColor}
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        className="animate-pulse"
                    />
                     <line x1={locations.riyadh.x} y1={locations.riyadh.y} x2={locations.makkah.x} y2={locations.makkah.y} stroke={theme.lineColor} strokeWidth="1" strokeOpacity="0.3" />


                    {/* KSA Map Base */}
                    <path 
                        d={saudiPath} 
                        fill="url(#mapGradient)" 
                        stroke={theme.mapStroke}
                        strokeWidth="1.5"
                    />

                    {/* Nodes */}
                    {renderNode('qassim', locations.qassim)}
                    {renderNode('riyadh', locations.riyadh)}
                    {renderNode('sharqiyah', locations.sharqiyah)}
                    {renderNode('makkah', locations.makkah)}

                </svg>
            </div>

            {/* Footer Text */}
            <div className="mt-4 text-center text-indigo-200/60 text-sm flex items-center gap-2 animate-bounce">
                <span>اختر المنطقة لاستعراض التقارير</span>
                <ChevronRight size={14} className="rotate-90" />
            </div>
        </div>
    );
};