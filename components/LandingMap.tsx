import React, { useState, useEffect, useRef } from 'react';
import { Users, Building2, Factory, MapPin, ChevronRight, Upload, Grip, RefreshCw, Eye, EyeOff, Edit } from 'lucide-react';
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
    const [showLines, setShowLines] = useState(true); // Control visibility of connection lines
    
    const svgRef = useRef<SVGSVGElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Static Data for Labels/Icons (Used only for keys now)
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
        lineColor: "rgba(99, 102, 241, 0.5)", 
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
                    if (data.showLines !== undefined) setShowLines(data.showLines);
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
    const saveSettings = async (updates: any) => {
        try {
            await setDoc(doc(db, "settings", "general"), updates, { merge: true });
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
            const url = await uploadReportImage(file, 'global_settings', 'landing_map', { maxWidth: 2000 });
            setMapImageUrl(url);
            await saveSettings({ landingMapUrl: url });
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
            setShowLines(true);
            await saveSettings({ landingMapUrl: null, nodeLocations: DEFAULT_LOCATIONS, showLines: true });
        }
    };

    const toggleLines = async () => {
        const newState = !showLines;
        setShowLines(newState);
        await saveSettings({ showLines: newState });
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
            await saveSettings({ nodeLocations });
        }
    };

    // --- Render Logic ---

    const renderNode = (id: string, coord: Coordinate, meta: NodeData) => {
        const isHovered = hoveredRegion === id;
        const isDragging = isDraggingNode === id;
        
        // Increased radius to better frame text on background maps
        // Previous: 28/32 -> New: 48/56
        const radius = isHovered || isDragging ? 56 : 48;

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
                    <circle cx={coord.x} cy={coord.y} r={radius + 15} fill="transparent" stroke="yellow" strokeDasharray="4 4" opacity="0.6" strokeWidth="2" className="animate-spin-slow" />
                )}

                {/* Ripple Effect (Pulse) - Optional feedback */}
                {(!isAdmin && (isHovered)) && (
                    <circle cx={coord.x} cy={coord.y} r={radius + 5} fill={theme.glow} opacity="0.4">
                        <animate attributeName="r" from={radius} to={radius + 15} dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                )}

                {/* Main Hollow Circle */}
                <circle 
                    cx={coord.x} 
                    cy={coord.y} 
                    r={radius} 
                    fill="rgba(255,255,255,0.01)" /* Almost transparent for clickability */
                    stroke={isHovered ? "#ffffff" : "rgba(255,255,255,0.7)"} 
                    strokeWidth={isHovered ? 4 : 2}
                    className="transition-all duration-300 ease-out"
                    filter="url(#shadow)"
                />

                {/* REMOVED: Icons and Labels as requested */}
            </g>
        );
    };

    if (isLoadingSettings) {
        return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[90vh] relative z-10 px-4 overflow-hidden pt-10">
            
            {/* Admin Controls */}
            {isAdmin && (
                <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 animate-fade-in bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 shadow-xl max-w-xs">
                    <div className="flex gap-2">
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
                        
                        <button 
                            onClick={toggleLines}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${showLines ? 'bg-indigo-500 text-white' : 'bg-gray-600 text-gray-300'}`}
                            title={showLines ? "إخفاء الخطوط" : "إظهار الخطوط"}
                        >
                            {showLines ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                    </div>

                    {mapImageUrl && (
                        <button 
                            onClick={handleResetMap}
                            className="flex items-center gap-2 bg-red-500/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm transition-colors w-full justify-center"
                        >
                            <RefreshCw size={16} /> استعادة الافتراضي
                        </button>
                    )}
                    
                    {/* Region Navigation Buttons */}
                    <div className="border-t border-white/20 pt-2 mt-2">
                        <div className="flex items-center gap-2 mb-2 text-white/80 text-xs font-bold">
                            <Edit size={12} />
                            <span>تعديل تقارير المناطق:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(nodeMetadata).map(([key, data]) => (
                                <button
                                    key={key}
                                    onClick={() => onSelectRegion(key)}
                                    className="flex items-center justify-center gap-1 bg-white/5 hover:bg-indigo-600 text-white text-xs py-2 px-2 rounded border border-white/10 transition-all hover:border-indigo-400"
                                >
                                    {data.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-white text-xs flex items-center gap-1 opacity-70 border-t border-white/20 pt-2 mt-2">
                        <Grip size={14} />
                        <span>اسحب الدوائر لتعديل مواقعها</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="text-center mb-2 animate-fade-in relative z-20 pointer-events-none select-none">
                <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-2xl mb-2 font-sans tracking-tight">
                    صناعيو المستقبل
                </h1>
                <div className="flex items-center justify-center gap-2 text-indigo-200 text-lg md:text-2xl font-light">
                    <span>النسخة الرابعة</span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                    <span>2025</span>
                </div>
            </div>

            {/* Selection Text */}
            <div className="text-center text-indigo-200/80 text-sm md:text-base flex items-center justify-center gap-2 animate-bounce mb-4 relative z-20 pointer-events-none">
                <span>اختر المنطقة لاستعراض التقارير</span>
                <ChevronRight size={16} className="rotate-90" />
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

                    {/* Network Lines - Restored and controlled by state */}
                    {showLines && (
                        <path 
                            d={`M${nodeLocations.makkah.x},${nodeLocations.makkah.y} L${nodeLocations.qassim.x},${nodeLocations.qassim.y} L${nodeLocations.riyadh.x},${nodeLocations.riyadh.y} L${nodeLocations.sharqiyah.x},${nodeLocations.sharqiyah.y}`}
                            fill="none"
                            stroke={theme.lineColor}
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            className="animate-pulse"
                        />
                    )}

                    {/* Nodes Layer */}
                    {Object.keys(nodeMetadata).map(key => 
                        renderNode(key, nodeLocations[key], nodeMetadata[key])
                    )}

                </svg>
            </div>
        </div>
    );
};