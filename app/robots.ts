import type { MetadataRoute } from 'next'
import { APP_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/receive-code'],
      disallow: ['/api/', '/auth/', '/dashboard', '/history', '/settings', '/team', '/upload', '/receive/'],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  }
}
