import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: '물음 · MULEUM', short_name: '물음', lang: 'ko',
    description: '질문으로 만나고 함께 배우는 물음',
    start_url: '/member', scope: '/', display: 'standalone',
    background_color: '#FFFFFF', theme_color: '#FFFFFF',
    icons: [
      ...[192, 512].map(size => ({ src: `/brand/muleum-icon-question-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' as const })),
      // Full-bleed square with the question mark inside the central 80% safe zone, so launcher masks never clip it.
      { src: '/brand/muleum-icon-question-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' as const },
    ],
  };
}
