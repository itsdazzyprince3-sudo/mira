import { execFileSync } from 'node:child_process'

let gitVersion = ''
try {
  gitVersion = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
} catch {
  gitVersion = ''
}

const appVersion = process.env.VERCEL_GIT_COMMIT_SHA
  || process.env.GITHUB_SHA
  || gitVersion
  || `build-${Date.now()}`

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MIRA_APP_VERSION: appVersion,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ]
  },
}

export default nextConfig
