'use client';

import { useMemo } from 'react';

export default function QrBlock({ slug }: { slug: string }) {
  const qrSrc = useMemo(() => `/api/qr/${encodeURIComponent(slug)}`, [slug]);
  const publicPath = useMemo(() => `/u/${slug}`, [slug]);

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 12 }}>QR Code</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.04)',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          <img src={qrSrc} alt="QR Code" width={200} height={200} style={{ display: 'block' }} />
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ opacity: 0.9 }}>
            <div style={{ fontSize: 13, opacity: 0.75 }}>Perfil público:</div>
            <div style={{ fontWeight: 900 }}>{publicPath}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={qrSrc}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 800,
              }}
            >
              Abrir QR em nova aba
            </a>

            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                textDecoration: 'none',
                color: 'inherit',
                fontWeight: 800,
              }}
            >
              Abrir perfil público
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}