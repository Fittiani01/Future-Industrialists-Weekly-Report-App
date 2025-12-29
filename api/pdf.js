import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Force maximum duration allowed by Vercel Pro (or Hobby limit)
export const config = {
  maxDuration: 60, 
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    let browser = null;

    try {
        const report = req.body;
        if (!report) return res.status(400).json({ message: 'No report data' });

        // 1. Setup Browser with Aggressive Memory Saving Flags
        // Chromium on Serverless is very memory constrained (1024MB default)
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Critical for container environments
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // Saves memory but less stable, vital for Vercel
                '--disable-extensions'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // 2. Construct HTML
        const htmlContent = generateHTML(report);

        // 3. Load Content with strict timeout
        // We use 'waitUntil: load' which is faster/safer than 'networkidle0' for heavy pages
        await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 });

        // 4. Fail-Safe Image Loader (The Magic Fix)
        // Instead of letting the browser hang forever on a slow image, we force a check.
        // If an image takes >5 seconds, we stop waiting for it.
        await page.evaluate(async () => {
            const selectors = Array.from(document.querySelectorAll('img'));
            
            const imagePromises = selectors.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    // Success
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if error
                    
                    // Force Timeout for this specific image
                    setTimeout(() => {
                        console.warn('Image load timed out:', img.src);
                        resolve(); 
                    }, 5000); 
                });
            });

            // Wait for images or their timeouts
            await Promise.all(imagePromises);
            
            // Try to wait for fonts, but don't die if they fail
            try { await document.fonts.ready; } catch (e) {}
        });

        // 5. Generate PDF
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: true
        });

        await browser.close();

        // 6. Send Response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);
        res.setHeader('Cache-Control', 'no-cache');
        res.status(200).send(pdf);

    } catch (error) {
        console.error("PDF Generation CRITICAL FAILURE:", error);
        
        // Close browser if it's still open
        if (browser) {
            try { await browser.close(); } catch (e) {}
        }

        res.status(500).json({ 
            message: 'فشل إنشاء ملف PDF من السيرفر', 
            details: error.message,
            stack: error.stack 
        });
    }
}

// --- HTML Generator (Identical layout logic, kept separate for cleanliness) ---
const generateHTML = (report) => {
    const visits = report.visits || [];
    
    const chunkArray = (arr, size) => {
        const R = [];
        for (let i = 0; i < arr.length; i += size) R.push(arr.slice(i, i + size));
        return R;
    };
    const visitChunks = chunkArray(visits, 4);

    const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&display=swap');
    
    @page { size: A4; margin: 0; }
    
    * { box-sizing: border-box; }

    body {
        margin: 0; padding: 0;
        font-family: 'Tajawal', sans-serif;
        background: white; direction: rtl;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }

    .page {
        width: 210mm; height: 296.8mm; /* Precise A4 height */
        position: relative; overflow: hidden;
        page-break-after: always;
        display: flex; flex-direction: column;
        background: white;
    }
    
    .page:last-child { page-break-after: auto; }

    .cover-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
    .cover-text { position: absolute; bottom: 50mm; left: 0; width: 100%; text-align: center; color: white; z-index: 10; text-shadow: 0 4px 10px rgba(0,0,0,0.5); }

    .header { height: 22mm; display: flex; justify-content: space-between; align-items: center; padding: 5mm 10mm 0 10mm; }
    .footer { padding: 4mm 10mm; border-top: 1px solid #eee; margin-top: auto; }

    .content-body { flex-grow: 1; padding: 2mm 10mm; display: flex; flex-direction: column; gap: 8px; }
    
    .card { background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; page-break-inside: avoid; }
    .card-header { padding: 6px 10px; color: white; display: flex; justify-content: space-between; align-items: center; }
    
    .image-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 2px; background: #f3f4f6; }
    .visit-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 2px; background: #e5e5e5; display: block; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 15px; }
    .stat-box { background: #f9fafb; border-radius: 6px; padding: 8px; text-align: center; border: 1px solid #e5e7eb; }
    `;

    let html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>${styles}</style></head><body>`;

    // 1. Cover
    if (report.coverImage) {
        html += `
        <div class="page">
            <img src="${report.coverImage}" class="cover-img" />
            <div class="cover-text">
                <h1 style="font-size: 3.5rem; font-weight: 800; margin-bottom: 15px;">${report.header.weekTitle}</h1>
                <div style="width: 120px; height: 4px; background: white; margin: 10px auto; border-radius: 2px;"></div>
                <p style="font-size: 1.8rem; font-weight: bold; direction: ltr;">${report.header.dateRange}</p>
            </div>
        </div>`;
    }

    const HeaderHTML = `
        <div class="header">
            <div style="display:flex; gap: 10px; height: 50px; align-items: center;">
                 ${report.logos.rightLogos.map(l => `<img src="${l}" style="height: 100%; width: auto; max-width: 100px; object-fit: contain;" />`).join('<div style="width:1px; height: 25px; background:#ddd;"></div>')}
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
            <div style="text-align: center; font-weight: bold; color: #2a3590; margin-bottom: 5px; font-size: 1rem;">شركاء النجاح</div>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; align-items: center;">
                 ${report.logos.partners.map(p => `<img src="${p.url}" style="height: 30px; width: auto; object-fit: contain;" />`).join('<div style="width:1px; height: 15px; background:#ddd;"></div>')}
            </div>
        </div>
    `;

    // 2. Visits
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
                        <div style="background: white; padding: 2px; border-radius: 4px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                             ${visit.factoryLogo ? `<img src="${visit.factoryLogo}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : `🏭`}
                        </div>
                        <div style="flex-grow: 1; text-align: right;">
                             <div style="font-weight: 800; font-size: 13px; margin-bottom: 2px;">${visit.schoolName}</div>
                             <div style="font-size: 11px; opacity: 0.9;">🏭 ${visit.factory}</div>
                        </div>
                         <div style="display: flex; flex-col; gap: 2px; border-left: 1px solid rgba(255,255,255,0.2); padding-left: 8px;">
                            <div style="background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; direction: ltr;">${visit.date} 📅</div>
                            <div style="background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">${visit.participants} مشارك 👥</div>
                         </div>
                    </div>
                </div>
                <div class="image-grid">
                    ${[0, 1, 2, 3].map(i => visit.images[i] ? `<img src="${visit.images[i]}" class="visit-img" />` : `<div class="visit-img" style="background: #f0f0f0;"></div>`).join('')}
                </div>
            </div>`;
        });

        html += `</div>`; 
        html += FooterHTML;
        html += `</div>`; 
    });

    // 3. Stats
    html += `<div class="page">`;
    html += HeaderHTML;
    html += `
    <div class="content-body" style="justify-content: center;">
         <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #ddd; padding-bottom: 8px;">
            <h2 style="color: #2a3590; font-weight: 800; font-size: 1.8rem;">إحصائيات المبادرة</h2>
         </div>
         <div style="display: flex; gap: 15px; margin-bottom: 20px;">
            <div style="flex: 1; text-align: center; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="color: #3d59a5; font-size: 2.5rem; font-weight: 800; line-height: 1;">${report.stats.totalBeneficiaries}</div>
                <div style="font-weight: bold; color: #555; font-size: 0.9rem;">إجمالي عدد المستفيدين</div>
            </div>
             <div style="flex: 1; text-align: center; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                <div style="color: #3d59a5; font-size: 2.5rem; font-weight: 800; line-height: 1;">${report.stats.totalRegistered}</div>
                <div style="font-weight: bold; color: #555; font-size: 0.9rem;">إجمالي المسجلين</div>
            </div>
         </div>
         <h3 style="background: #eee; text-align: center; padding: 4px; font-weight: bold; border-radius: 4px; margin-bottom: 8px; font-size: 0.9rem;">الفئات</h3>
         <div class="stats-grid">
             ${['creative', 'discoverer', 'ambassador', 'artist'].map(k => `
                <div class="stat-box">
                    <img src="${report.logos.categories[k]}" style="height: 40px; object-fit: contain; margin-bottom: 4px;" />
                    <div style="font-weight: bold; font-size: 0.8rem; margin-bottom: 4px;">${k === 'creative' ? 'المبدع' : k === 'discoverer' ? 'المكتشف' : k === 'ambassador' ? 'السفير' : 'الفنان'}</div>
                    <div style="background: #3d59a5; color: white; padding: 2px; border-radius: 3px; font-weight: bold; font-size: 0.9rem;">${report.stats[k + 'Category']}</div>
                </div>
             `).join('')}
         </div>
         <h3 style="background: #eee; text-align: center; padding: 4px; font-weight: bold; border-radius: 4px; margin-top: 15px; margin-bottom: 8px; font-size: 0.9rem;">التفاعل الإعلامي</h3>
         <div class="stats-grid">
              <div class="stat-box"><div style="font-size: 0.75rem; font-weight: bold;">اللقاءات التلفزيونية</div><div style="background: #2a3590; color: white; padding: 2px; border-radius: 3px; margin-top: 4px; font-weight: bold;">${report.stats.tvInterviews}</div></div>
              <div class="stat-box"><div style="font-size: 0.75rem; font-weight: bold;">المنشورات</div><div style="background: #2a3590; color: white; padding: 2px; border-radius: 3px; margin-top: 4px; font-weight: bold;">${report.stats.posts}</div></div>
              <div class="stat-box"><div style="font-size: 0.75rem; font-weight: bold;">الفيديو</div><div style="background: #2a3590; color: white; padding: 2px; border-radius: 3px; margin-top: 4px; font-weight: bold;">${report.stats.videos}</div></div>
              <div class="stat-box"><div style="font-size: 0.75rem; font-weight: bold;">التغريدات</div><div style="background: #2a3590; color: white; padding: 2px; border-radius: 3px; margin-top: 4px; font-weight: bold;">${report.stats.tweets}</div></div>
         </div>
    </div>`;
    
    html += FooterHTML;
    html += `</div></body></html>`;
    return html;
};