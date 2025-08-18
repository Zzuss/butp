const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(bodyParser.json({ limit: '20mb' }));

// 配置 - 仅允许指定前端来源（部署时设置为你的 Vercel 域）
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/generate-pdf', async (req, res) => {
  const { url, html, cookies = [], pdfOptions = {}, viewportWidth } = req.body || {};

  if (!url && !html) return res.status(400).json({ error: '需要 url 或 html' });

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ],
      headless: 'new'
    });

    const page = await browser.newPage();

    if (viewportWidth && typeof viewportWidth === 'number') {
      await page.setViewport({ width: viewportWidth, height: 900 });
    }

    // 如果浏览器发送了 cookie header，设置到请求头（外部调用时也可传 cookie）
    if (req.headers.cookie) {
      await page.setExtraHTTPHeaders({ cookie: req.headers.cookie });
    }

    if (Array.isArray(cookies) && cookies.length) {
      try { await page.setCookie(...cookies); } catch (e) { console.warn('setCookie failed', e); }
    }

    if (html) {
      await page.setContent(html, { waitUntil: 'networkidle0' });
    } else {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    }

    try { await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve()); } catch(e){}

    // 注入覆盖样式（避免 100vh / fixed 导致的裁剪）
    try {
      await page.addStyleTag({ content: `
        html,body { height:auto !important; overflow:visible !important; }
        * { max-height: none !important; overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        [style*="height: 100vh"], [style*="height:100vh"] { height:auto !important; min-height:auto !important; }
        [style*="position: fixed"], [style*="position: absolute"] { position: relative !important; }
      `});
      await new Promise(r => setTimeout(r, 300));
    } catch(e){ console.warn('style inject failed', e) }

    const defaults = {
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' }
    };

    const finalOptions = Object.assign({}, defaults, pdfOptions);
    if (!finalOptions.width && viewportWidth) finalOptions.width = `${viewportWidth}px`;

    const buffer = await page.pdf(finalOptions);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="export_${new Date().toISOString().slice(0,10)}.pdf"`,
      'Content-Length': buffer.length
    });
    res.send(buffer);

  } catch (err) {
    console.error('PDF generation failed', err);
    res.status(500).json({ error: err.message || String(err) });
  } finally {
    if (browser) await browser.close();
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`PDF service listening on ${port}`));


