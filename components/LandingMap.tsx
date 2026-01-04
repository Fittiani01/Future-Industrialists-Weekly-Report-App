import React, { useState, useEffect, useRef } from 'react';
import { Users, Building2, Factory, MapPin, ChevronRight, Upload, Grip, RefreshCw } from 'lucide-react';
import { uploadReportImage } from '../utils/uploadImage';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface LandingMapProps {
    onSelectRegion: (regionId: string) => void;
    isAdmin: boolean;
}

interface Coordinate {
    x: number;
    y: number;
}

interface NodeData {
    label: string;
    icon: React.ReactNode;
}

// Default Locations (Original SVG Coordinates)
const DEFAULT_LOCATIONS: Record<string, Coordinate> = {
    qassim: { x: 360, y: 260 },
    riyadh: { x: 440, y: 330 },
    sharqiyah: { x: 540, y: 290 },
    makkah: { x: 230, y: 380 },
};

// Default Path for SVG (KSA)
const DEFAULT_MAP_PATH = `
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

export const LandingMap: React.FC<LandingMapProps> = ({ onSelectRegion, isAdmin }) => {
    const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
    const [mapImageUrl, setMapImageUrl] = useState<string | null>(null);
    const [nodeLocations, setNodeLocations] = useState<Record<string, Coordinate>>(DEFAULT_LOCATIONS);
    const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    
    const svgRef = useRef<SVGSVGElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Static Data for Labels/Icons
    const nodeMetadata: Record<string, NodeData> = {
        qassim: { label: "القصيم", icon: <Factory size={20} /> },
        riyadh: { label: "الرياض", icon: <Building2 size={24} /> },
        sharqiyah: { label: "الشرقية", icon: <Users size={20} /> },
        makkah: { label: "مكة المكرمة", icon: <MapPin size={24} /> },
    };

    // Modern Dark Theme Palette (Navy Blue)
    const theme = {
        bg: "transparent",
        mapFill: "rgba(30, 41, 59, 0.6)", 
        mapStroke: "rgba(148, 163, 184, 0.3)",
        lineColor: "rgba(99, 102, 241, 0.3)", 
        nodeBase: "#1e293b", 
        nodeStroke: "#6366f1", 
        text: "#f8fafc",
        highlight: "#4f46e5", 
        glow: "rgba(99, 102, 241, 0.6)"
    };

    // --- 1. Load Settings from Firestore ---
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const docRef = doc(db, "settings", "general");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.landingMapUrl) setMapImageUrl(data.landingMapUrl);
                    if (data.nodeLocations) setNodeLocations(data.nodeLocations);
                }
            } catch (e) {
                console.error("Failed to load map settings", e);
            } finally {
                setIsLoadingSettings(false);
            }
        };
        loadSettings();
    }, []);

    // --- 2. Save Settings ---
    const saveSettings = async (newUrl?: string, newLocations?: Record<string, Coordinate>) => {
        try {
            await setDoc(doc(db, "settings", "general"), {
                landingMapUrl: newUrl !== undefined ? newUrl : mapImageUrl,
                nodeLocations: newLocations !== undefined ? newLocations : nodeLocations
            }, { merge: true });
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    };

    // --- 3. Handlers ---

    const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Use a fixed ID 'global_settings' for reportId and 'landing_map' for visitId
            // This reuses the existing upload utility
            const url = await uploadReportImage(file, 'global_settings', 'landing_map', { maxWidth: 2000 });
            setMapImageUrl(url);
            await saveSettings(url, undefined);
        } catch (error) {
            console.error(error);
            alert("فشل رفع الخريطة");
        } finally {
            setIsUploading(false);
        }
    };

    const handleResetMap = async () => {
        if (confirm("هل أنت متأكد من استعادة الخريطة الافتراضية ومواقع المدن؟")) {
            setMapImageUrl(null);
            setNodeLocations(DEFAULT_LOCATIONS);
            await saveSettings(null, DEFAULT_LOCATIONS);
        }
    };

    // Drag Logic
    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        if (!isAdmin) return;
        e.stopPropagation();
        setIsDraggingNode(id);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingNode || !svgRef.current) return;
        
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        
        // Transform screen coordinates to SVG coordinates
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        
        setNodeLocations(prev => ({
            ...prev,
            [isDraggingNode]: { x: svgP.x, y: svgP.y }
        }));
    };

    const handleMouseUp = async () => {
        if (isDraggingNode) {
            setIsDraggingNode(null);
            // Save new locations on drop
            await saveSettings(undefined, nodeLocations);
        }
    };

    // --- Render Logic ---

    const renderNode = (id: string, coord: Coordinate, meta: NodeData) => {
        const isHovered = hoveredRegion === id;
        const isActive = id === 'makkah' && !hoveredRegion;
        const isDragging = isDraggingNode === id;

        return (
            <g 
                key={id}
                className={`transition-all duration-500 ${isAdmin ? 'cursor-move' : 'cursor-pointer'}`}
                onClick={() => !isAdmin && onSelectRegion(id)}
                onMouseEnter={() => setHoveredRegion(id)}
                onMouseLeave={() => setHoveredRegion(null)}
                onMouseDown={(e) => handleMouseDown(e, id)}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                {/* Admin Drag Indicator */}
                {isAdmin && (
                    <circle cx={coord.x} cy={coord.y} r="60" fill="transparent" stroke="white" strokeDasharray="4 4" opacity="0.5" className="animate-spin-slow" />
                )}

                {/* Ripple Effect (Pulse) - Only non-admin or dragging */}
                {(!isAdmin && (isHovered || isActive)) && (
                    <circle cx={coord.x} cy={coord.y} r="50" fill={theme.glow} opacity="0.2">
                        <animate attributeName="r" from="30" to="60" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                )}

                {/* Connecting Line (Only visible if default SVG map is used OR specifically desired) */}
                {!mapImageUrl && (
                    <line x1={coord.x} y1={coord.y} x2={coord.x} y2={coord.y + 40} stroke={theme.lineColor} strokeWidth="1" />
                )}

                {/* Main Circle */}
                <circle 
                    cx={coord.x} 
                    cy={coord.y} 
                    r={isHovered || isDragging ? 40 : 30} 
                    fill={isHovered || isDragging ? theme.highlight : theme.nodeBase} 
                    stroke={theme.text} 
                    strokeWidth={isHovered ? 3 : 1}
                    className="transition-all duration-300 ease-out"
                    filter="url(#shadow)"
                />

                {/* Icon */}
                <foreignObject x={coord.x - (isHovered ? 15 : 12)} y={coord.y - (isHovered ? 25 : 20)} width={isHovered ? 30 : 24} height={isHovered ? 30 : 24} className="pointer-events-none">
                    <div className={`flex items-center justify-center w-full h-full text-white transition-all duration-300`}>
                        {React.cloneElement(meta.icon as React.ReactElement, { size: isHovered ? 28 : 20 })}
                    </div>
                </foreignObject>

                {/* Label Box */}
                <g transform={`translate(${coord.x}, ${coord.y + (isHovered ? 55 : 45)})`}>
                    <rect 
                        x="-50" 
                        y="-15" 
                        width="100" 
                        height="30" 
                        rx="15" 
                        fill={isHovered || isDragging ? "#ffffff" : "rgba(30, 41, 59, 0.8)"} 
                        className="transition-colors duration-300"
                    />
                    <text 
                        x="0" 
                        y="5" 
                        textAnchor="middle" 
                        fill={isHovered || isDragging ? theme.highlight : "#ffffff"} 
                        className="text-sm font-bold transition-colors duration-300" 
                        style={{ fontFamily: 'Tajawal', fontSize: isHovered ? '14px' : '12px' }}
                    >
                        {meta.label}
                    </text>
                </g>
            </g>
        );
    };

    if (isLoadingSettings) {
        return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[90vh] relative z-10 px-4 overflow-hidden">
            
            {/* Admin Controls */}
            {isAdmin && (
                <div className="absolute top-4 left-4 z-50 flex gap-2 animate-fade-in bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleMapUpload} 
                        accept="image/png, image/jpeg, image/svg+xml" 
                        className="hidden" 
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploading}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                    >
                        {isUploading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <Upload size={16} />}
                        {mapImageUrl ? "تغيير الخريطة" : "رفع خريطة (PNG)"}
                    </button>
                    {mapImageUrl && (
                        <button 
                            onClick={handleResetMap}
                            className="flex items-center gap-2 bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                        >
                            <RefreshCw size={16} /> استعادة الافتراضي
                        </button>
                    )}
                    <div className="text-white text-xs flex items-center gap-1 opacity-70 border-r border-white/20 pr-3 mr-1">
                        <Grip size={14} />
                        <span>اسحب المدن لتعديل مواقعها</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="text-center mb-4 md:mb-8 animate-fade-in relative z-20 mt-10 pointer-events-none select-none">
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
                <svg 
                    ref={svgRef}
                    viewBox="0 0 800 600" 
                    className={`w-full h-full drop-shadow-2xl ${isAdmin ? '' : 'pointer-events-auto'}`}
                    style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))' }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <defs>
                        <linearGradient id="mapGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#312e81" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="black" floodOpacity="0.3"/>
                        </filter>
                    </defs>

                    {/* Network Lines (Only if no custom map) */}
                    {!mapImageUrl && (
                        <path 
                            d={`M${nodeLocations.makkah.x},${nodeLocations.makkah.y} L${nodeLocations.qassim.x},${nodeLocations.qassim.y} L${nodeLocations.riyadh.x},${nodeLocations.riyadh.y} L${nodeLocations.sharqiyah.x},${nodeLocations.sharqiyah.y}`}
                            fill="none"
                            stroke={theme.lineColor}
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="animate-pulse"
                        />
                    )}

                    {/* Base Map Layer */}
                    {mapImageUrl ? (
                        <image 
                            href={mapImageUrl} 
                            x="0" 
                            y="0" 
                            width="800" 
                            height="600" 
                            preserveAspectRatio="xMidYMid meet" 
                        />
                    ) : (
                        <path 
                            d={DEFAULT_MAP_PATH} 
                            fill="url(#mapGradient)" 
                            stroke={theme.mapStroke}
                            strokeWidth="1.5"
                        />
                    )}

                    {/* Nodes Layer */}
                    {Object.keys(nodeMetadata).map(key => 
                        renderNode(key, nodeLocations[key], nodeMetadata[key])
                    )}

                </svg>
            </div>

            {/* Footer Text */}
            <div className="mt-4 text-center text-indigo-200/60 text-sm flex items-center gap-2 animate-bounce pointer-events-none">
                <span>اختر المنطقة لاستعراض التقارير</span>
                <ChevronRight size={14} className="rotate-90" />
            </div>
        </div>
    );
};