import { WeeklyReport } from './types';

// Default Placeholders - Updated to new brand colors (2a3590)
export const LOGOS = {
  main: "https://placehold.co/150x80/2a3590/fff?text=Future+Industrialists",
  right1: "https://placehold.co/120x60/transparent/2a3590?text=Ministry",
  right2: "https://placehold.co/100x60/transparent/2a3590?text=MODON",
  right3: "https://placehold.co/100x60/transparent/2a3590?text=Vision",
  right4: "https://placehold.co/100x60/transparent/2a3590?text=Partner",
  partner: "https://placehold.co/100x50/transparent/555?text=Partner",
  category: "https://placehold.co/80x80/transparent/2a3590?text=ICON",
};

export const INITIAL_REPORT: WeeklyReport = {
  id: "draft-report-1",
  region: "makkah",
  coverImage: undefined,
  header: {
    weekTitle: "الأسبوع الأول",
    dateRange: "من 14 ديسمبر الى 18 ديسمبر 2025"
  },
  logos: {
      main: LOGOS.main,
      rightLogos: [LOGOS.right1, LOGOS.right2, LOGOS.right3, LOGOS.right4],
      partners: Array(12).fill(null).map((_, i) => ({
          id: `partner-${i}`,
          url: `${LOGOS.partner}${i+1}`,
          scale: 1.0 // Default scale 100%
      })),
      categories: {
          artist: LOGOS.category,
          ambassador: LOGOS.category,
          discoverer: LOGOS.category,
          creative: LOGOS.category
      }
  },
  decorations: [], // Start with no decorations
  visits: [
    {
      id: "1",
      schoolName: "أكاديمية جدة (بنين)",
      participants: 55,
      date: "2025/12/15",
      factory: "يورك",
      images: []
    }
  ],
  stats: {
    totalBeneficiaries: 22805,
    totalRegistered: 3509,
    tweets: 246,
    posts: 34,
    videos: 35,
    tvInterviews: 1,
    creativeCategory: 932,
    discovererCategory: 1667,
    ambassadorCategory: 674,
    artistCategory: 236
  }
};