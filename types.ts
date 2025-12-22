export interface Visit {
  id: string;
  schoolName: string;
  participants: number;
  date: string;
  factory: string;
  factoryLogo?: string; // URL for the factory logo image
  images: string[]; // Local object URLs
}

export interface Statistics {
  totalBeneficiaries: number;
  totalRegistered: number;
  tweets: number;
  posts: number;
  videos: number;
  tvInterviews: number;
  creativeCategory: number; // Mudea
  discovererCategory: number; // Muktashef
  ambassadorCategory: number; // Safeer
  artistCategory: number; // Fannan
}

export interface ReportHeader {
  weekTitle: string;
  dateRange: string;
}

export interface PartnerLogo {
    id: string;
    url: string;
    scale: number; // 0.5 to 2.5 multiplier
}

export interface CategoryLogos {
  artist: string;
  ambassador: string;
  discoverer: string;
  creative: string;
}

export interface ReportLogos {
    main: string;
    rightLogos: string[]; // Array of 4 logos for the right side
    partners: PartnerLogo[]; // Array of partner objects with scale
    categories: CategoryLogos;
}

export interface WeeklyReport {
  id?: string;
  header: ReportHeader;
  visits: Visit[];
  stats: Statistics;
  logos: ReportLogos;
}