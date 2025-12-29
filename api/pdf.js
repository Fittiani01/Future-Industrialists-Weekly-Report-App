import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { html } = req.body;

  if (!html) {
    return res.status(400).send("Missing HTML content");
  }

  let browser = null;

  try {
    // Launch headless Chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Set the HTML content
    // 'networkidle0' ensures fonts and Tailwind CDN are loaded
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 60000 // 60 seconds timeout
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true, // Crucial for background colors/images
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: true
    });

    // Return the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    res.send(pdf);

  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).send(error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}