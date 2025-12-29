import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60, // Extend timeout for image fetching
};

const getBrowser = async () => {
    return puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    });
};

// --- HTML Template Helper ---
const generateHTML = (report) => {
    const visits = report.visits || [];
    
    // Helper to chunk visits into groups of 4 per page
    const chunkArray = (arr, size) => {
        const R = [];
        for (let i = 0; i < arr.length; i += size) R.push(arr.slice(i, i + size));
        return R;
    };
    const visitChunks = chunkArray(visits, 4);

    // CSS for PDF only
    const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
    
    @page {
        size: A4;
        margin: 0;
    }
    
    body {
        margin: 0;
        padding: 0;
        font-family: 'Tajawal', sans-serif;
        background: white;
        direction: rtl;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .page {
        width: 210mm;
        height: 296.5mm; /* Tiny bit short of 297mm to prevent overflow blank page */
        position: relative;
        overflow: hidden;
        page-break-after: always;
        display: flex;
        flex-direction: column;
        background: white;
    }
    
    .page:last-child {
        page-break-after: auto;
    }

    /* Cover Page */
    .cover-img {
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        object-fit: cover;
        z-index: 0;
    }
    .cover-text {
        position: absolute;
        bottom: 50mm;
        left: 0;
        width: 100%;
        text-align: center;
        color: white;
        z-index: 10;
        text-shadow: 0 4px 10px rgba(0,0,0,0.3);
    }

    /* Header & Footer */
    .header {
        height: 20mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5mm 10mm 0 10mm;
    }
    .footer {
        padding: 5mm 10mm;
        border-top: 1px solid #eee;
        margin-top: auto;
    }

    /* Visit Cards */
    .content-body {
        flex-grow: 1;
        padding: 5mm 10mm;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .card {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: none; /* Shadow removed for cleaner print */
        border: 1px solid #eee;
    }
    .card-header {
        padding: 8px 12px;
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .image-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
    }
    .visit-img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        border-radius: 4px;
        background: #eee;
    }

    /* Stats Grid */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-top: 20px;
    }
    .stat-box {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 10px;
        text-align: center;
        border: 1px solid #eee;
    }

    /* Colors */
    .bg-blue { background-color: #2a3590; }
    .bg-light-blue { background-color: #3d59a5; }
    .text-blue { color: #2a3590; }
    `;

    // --- HTML Construction ---
    let html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>${styles}</style><script src="https://cdn.tailwindcss.com"></script></head><body>`;

    // 1. Cover Page
    if (report.coverImage) {
        html += `
        <div class="page" style="position:relative;">
            <img src="${report.coverImage}" class="cover-img" />
            <div class="cover-text">
                <h1 style="font-size: 3rem; font-weight: 800; margin-bottom: 10px;">${report.header.weekTitle}</h1>
                <div style="width: 100px; height: 3px; background: white; margin: 10px auto; border-radius: 2px;"></div>
                <p style="font-size: 1.5rem; font-weight: bold; direction: ltr;">${report.header.dateRange}</p>
            </div>
        </div>`;
    }

    const HeaderHTML = `
        <div class="header">
            <div style="display:flex; gap: 15px; height: 50px; align-items: center;">
                 ${report.logos.rightLogos.map(l => `<img src="${l}" style="height: 100%; width: auto; max-width: 120px; object-fit: contain;" />`).join('<div style="width:1px; height: 30px; background:#ddd;"></div>')}
            </div>
            <img src="${report.logos.main}" style="height: 60px; object-fit: contain;" />
        </div>
        <div style="margin: 0 10mm; padding-bottom: 5px; border-bottom: 2px solid #3d59a5; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
                 <h1 style="font-size: 1.2rem; font-weight: 800; color: #2a3590; margin:0;">التقرير الأسبوعي (${report.header.weekTitle})</h1>
                 <span style="font-size: 0.8rem; font-weight: bold; color: #3d59a5;">مبادرة صناعيو المستقبل – النسخة الرابعة</span>
            </div>
            <span style="font-size: 0.8rem; color: #666; direction: ltr; font-weight: 600;">${report.header.dateRange}</span>
        </div>
    `;

    const FooterHTML = `
        <div class="footer">
            <div style="text-align: center; font-weight: bold; color: #2a3590; margin-bottom: 10px; font-size: 1.1rem;">شركاء النجاح</div>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; align-items: center;">
                 ${report.logos.partners.map(p => `<img src="${p.url}" style="height: 35px; width: auto; object-fit: contain;" />`).join('<div style="width:1px; height: 20px; background:#ddd;"></div>')}
            </div>
        </div>
    `;

    // 2. Visit Pages
    visitChunks.forEach(chunk => {
        html += `<div class="page">`;
        html += HeaderHTML;
        html += `<div class="content-body">`;
        
        chunk.forEach(visit => {
            const isGirls = visit.schoolName.includes("بنات");
            const headerColor = isGirls ? "#867bba" : "#2b3592";
            
            html += `
            <div class="card">
                <div class="card-header" style="background-color: ${headerColor};">
                    <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                        <!-- Factory Logo -->
                        <div style="background: white; padding: 4px; border-radius: 6px; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                             ${visit.factoryLogo ? `<img src="${visit.factoryLogo}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2"><path d="M2 22h20V2L2 22z"/></svg>`}
                        </div>
                        
                        <!-- Text Info -->
                        <div style="flex-grow: 1; text-align: right;">
                             <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px;">${visit.schoolName}</div>
                             <div style="font-size: 12px; opacity: 0.9; display: flex; gap: 10px;">
                                 <span>🏭 ${visit.factory}</span>
                             </div>
                        </div>

                        <!-- Stats Pills -->
                         <div style="display: flex; flex-col; gap: 4px; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 8px;">
                            <div style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; direction: ltr;">${visit.date} 📅</div>
                            <div style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">${visit.participants} مشارك 👥</div>
                         </div>
                    </div>
                </div>
                <div class="image-grid">
                    ${[0, 1, 2, 3].map(i => visit.images[i] ? `<img src="${visit.images[i]}" class="visit-img" />` : `<div class="visit-img" style="background: #f0f0f0;"></div>`).join('')}
                </div>
            </div>`;
        });

        html += `</div>`; // End content-body
        html += FooterHTML;
        html += `</div>`; // End page
    });

    // 3. Stats Page (Last Page)
    html += `<div class="page">`;
    html += HeaderHTML;
    
    // Stats Content
    html += `
    <div class="content-body" style="justify-content: center;">
         <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
            <h2 style="color: #2a3590; font-weight: 800; font-size: 2rem;">إحصائيات المبادرة</h2>
         </div>

         <!-- Top 2 -->
         <div style="display: flex; gap: 20px; margin-bottom: 30px;">
            <div style="flex: 1; text-align: center; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="color: #3d59a5; font-size: 3rem; font-weight: 800;">${report.stats.totalBeneficiaries}</div>
                <div style="font-weight: bold; color: #555;">إجمالي عدد المستفيدين</div>
            </div>
             <div style="flex: 1; text-align: center; background: #f8f9fa; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="color: #3d59a5; font-size: 3rem; font-weight: 800;">${report.stats.totalRegistered}</div>
                <div style="font-weight: bold; color: #555;">إجمالي المسجلين</div>
            </div>
         </div>

         <!-- Categories -->
         <h3 style="background: #eee; text-align: center; padding: 5px; font-weight: bold; border-radius: 4px; margin-bottom: 10px;">الفئات</h3>
         <div class="stats-grid">
             ${['creative', 'discoverer', 'ambassador', 'artist'].map(k => `
                <div class="stat-box">
                    <img src="${report.logos.categories[k]}" style="height: 50px; object-fit: contain; margin-bottom: 5px;" />
                    <div style="font-weight: bold; font-size: 0.9rem; margin-bottom: 5px;">${k === 'creative' ? 'المبدع' : k === 'discoverer' ? 'المكتشف' : k === 'ambassador' ? 'السفير' : 'الفنان'}</div>
                    <div style="background: #3d59a5; color: white; padding: 5px; border-radius: 4px; font-weight: bold;">${report.stats[k + 'Category']}</div>
                </div>
             `).join('')}
         </div>

         <!-- Social -->
         <h3 style="background: #eee; text-align: center; padding: 5px; font-weight: bold; border-radius: 4px; margin-top: 20px; margin-bottom: 10px;">التفاعل الإعلامي</h3>
         <div class="stats-grid">
              <div class="stat-box">
                   <div style="font-size: 0.8rem; font-weight: bold;">اللقاءات التلفزيونية</div>
                   <div style="background: #2a3590; color: white; padding: 5px; border-radius: 4px; margin-top: 5px; font-weight: bold;">${report.stats.tvInterviews}</div>
              </div>
              <div class="stat-box">
                   <div style="font-size: 0.8rem; font-weight: bold;">المنشورات</div>
                   <div style="background: #2a3590; color: white; padding: 5px; border-radius: 4px; margin-top: 5px; font-weight: bold;">${report.stats.posts}</div>
              </div>
              <div class="stat-box">
                   <div style="font-size: 0.8rem; font-weight: bold;">الفيديو</div>
                   <div style="background: #2a3590; color: white; padding: 5px; border-radius: 4px; margin-top: 5px; font-weight: bold;">${report.stats.videos}</div>
              </div>
              <div class="stat-box">
                   <div style="font-size: 0.8rem; font-weight: bold;">التغريدات</div>
                   <div style="background: #2a3590; color: white; padding: 5px; border-radius: 4px; margin-top: 5px; font-weight: bold;">${report.stats.tweets}</div>
              </div>
         </div>

    </div>
    `;
    
    html += FooterHTML;
    html += `</div>`; // End Stats Page

    html += `</body></html>`;
    return html;
};

// --- Vercel API Handler ---
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const report = req.body;
        if (!report) return res.status(400).json({ message: 'No report data provided' });

        const browser = await getBrowser();
        const page = await browser.newPage();

        const html = generateHTML(report);
        
        // Wait for network idle (images loaded)
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Wait specifically for fonts
        await page.evaluateHandle('document.fonts.ready');

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 } // Full bleed, CSS handles margins
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report.pdf`);
        res.send(pdf);

    } catch (error) {
        console.error("PDF Gen Error:", error);
        res.status(500).json({ message: 'Error generating PDF', error: error.message });
    }
}