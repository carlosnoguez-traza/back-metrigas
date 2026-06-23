// payment-html.template.ts

interface HtmlTemplateConfig {
  title: string;
  message: string;
  isSuccess: boolean;
  buttonText: string;
}

export function getPaymentHtmlTemplate(config: HtmlTemplateConfig): string {
  const icon = config.isSuccess ? '✓' : '✕';
  const colorClass = config.isSuccess ? 'success' : 'failed';

  // Reemplaza por el Deep Link o URL de tu aplicación
  const redirectUrl = 'tuapp://';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.title}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f6f8;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #333;
        }
        .card {
          background: white;
          padding: 40px 30px;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        .icon-wrapper {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 32px;
          font-weight: bold;
        }
        .icon-wrapper.success { background-color: #e6f7ed; color: #2ecc71; }
        .icon-wrapper.failed { background-color: #fde8e8; color: #e74c3c; }
        h1 { font-size: 24px; margin-bottom: 12px; color: #1a1a1a; }
        p { font-size: 15px; color: #666; line-height: 1.5; margin-bottom: 32px; }
        .btn {
          display: inline-block;
          width: 100%;
          padding: 14px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.2s;
        }
        .btn.success { background-color: #2ec7cc; color: white; }
        .btn.success:hover { background-color: #2ec7cc; }
        .btn.failed { background-color: #e74c3c; color: white; }
        .btn.failed:hover { background-color: #c0392b; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-wrapper ${colorClass}">${icon}</div>
        <h1>${config.title}</h1>
        <p>${config.message}</p>
      </div>
    </body>
    </html>
  `;
}