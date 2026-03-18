import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/image',
  ],

  // ─── App-wide head ──────────────────────────────────────────────────────────
  app: {
    head: {
      title: 'eTailor — Smart Tailor Business Manager',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },

        // ── Primary SEO ──────────────────────────────────────────────────────
        {
          name:    'description',
          content: 'eTailor is an offline-first business management app for tailors and fashion designers. Manage customers, orders, measurements, materials and get smart reports — all from your phone, even without internet.',
        },
        {
          name:    'keywords',
          content: 'tailor app, fashion designer app, sewing business management, tailor management software, measurements tracker, order tracking tailor, offline tailor app, fashion business Nigeria, tailoring software',
        },
        { name: 'author',  content: 'eTailor' },
        { name: 'robots',  content: 'index, follow' },
        { name: 'theme-color',  content: '#1a1208' },
        { name: 'color-scheme', content: 'light' },

        // ── PWA / Mobile ─────────────────────────────────────────────────────
        { name: 'mobile-web-app-capable',                content: 'yes' },
        { name: 'apple-mobile-web-app-capable',          content: 'yes' },
        { name: 'apple-mobile-web-app-title',            content: 'eTailor' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'application-name',                      content: 'eTailor' },
        { name: 'msapplication-TileColor',               content: '#1a1208' },
        { name: 'msapplication-TileImage',               content: '/icons/icon-144.png' },
        { name: 'format-detection',                      content: 'telephone=no' },

        // ── Open Graph (WhatsApp, Facebook, LinkedIn shares) ─────────────────
        { property: 'og:type',         content: 'website' },
        { property: 'og:site_name',    content: 'eTailor' },
        { property: 'og:title',        content: 'eTailor — Smart Tailor Business Manager' },
        {
          property: 'og:description',
          content:  'Run your tailoring or fashion design business from your phone. Customers, orders, measurements, stock — fully offline.',
        },
        { property: 'og:image',        content: '/og-image.png' },
        { property: 'og:image:width',  content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt',    content: 'eTailor — Smart Tailor Business Manager' },

        // ── Twitter / X card ─────────────────────────────────────────────────
        { name: 'twitter:card',        content: 'summary_large_image' },
        { name: 'twitter:title',       content: 'eTailor — Smart Tailor Business Manager' },
        {
          name:    'twitter:description',
          content: 'Offline-first business app for tailors. Orders, customers, measurements & stock — all from your phone.',
        },
        { name: 'twitter:image',       content: '/og-image.png' },
        { name: 'twitter:image:alt',   content: 'eTailor app screenshot' },
      ],

      link: [
        // ── Favicons ─────────────────────────────────────────────────────────
        { rel: 'icon',             type: 'image/x-icon',    href: '/favicon.ico' },
        { rel: 'icon',             type: 'image/png', sizes: '16x16', href: '/icons/favicon-16.png' },
        { rel: 'icon',             type: 'image/png', sizes: '32x32', href: '/icons/favicon-32.png' },
        { rel: 'icon',             type: 'image/svg+xml',   href: '/icons/icon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180',         href: '/icons/apple-touch-icon.png' },
        { rel: 'mask-icon',        href: '/icons/icon.svg', color: '#c9a84c' },

        // ── Font performance ──────────────────────────────────────────────────
        { rel: 'preconnect',   href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect',   href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },

        // ── Google Fonts ──────────────────────────────────────────────────────
        {
          rel:  'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap',
        },
      ],

      // ── Structured data (JSON-LD) ─────────────────────────────────────────
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context':          'https://schema.org',
            '@type':             'SoftwareApplication',
            name:                'eTailor',
            operatingSystem:     'Android, iOS, Web',
            applicationCategory: 'BusinessApplication',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            description:
              'Offline-first business management app for tailors and fashion designers. Track customers, orders, measurements and materials.',
          }),
        },
      ],
    },
  },

  // ─── Supabase ────────────────────────────────────────────────────────────────
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY,
    redirect: true,
    redirectOptions: {
      login: '/auth/login',
      callback: '/auth/confirm',
      exclude: ['/auth/*'],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 8, // 8 hours
      sameSite: 'lax',
      secure: true,
    },
  },

  // ─── Pinia ───────────────────────────────────────────────────────────────────
  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  // ─── PWA ─────────────────────────────────────────────────────────────────────
  pwa: {
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    manifest: {
      name:             'eTailor',
      short_name:       'eTailor',
      description:      'Offline-first business management for tailors and fashion designers — customers, orders, measurements, materials.',
      theme_color:      '#1a1208',
      background_color: '#faf7f2',
      display:          'standalone',
      orientation:      'portrait-primary',
      start_url:        '/',
      scope:            '/',
      lang:             'en',
      dir:              'ltr',
      categories:       ['business', 'productivity', 'lifestyle'],
      screenshots: [
        // Add real screenshots here after building the app:
        // { src: '/screenshots/dashboard.png', sizes: '390x844', type: 'image/png', label: 'Dashboard' },
      ],
      icons: [
        // Standard sizes for Android/Chrome
        { src: '/icons/icon-72.png',   sizes: '72x72',   type: 'image/png',  purpose: 'any' },
        { src: '/icons/icon-96.png',   sizes: '96x96',   type: 'image/png',  purpose: 'any' },
        { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png',  purpose: 'any' },
        { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png',  purpose: 'any' },
        { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png',  purpose: 'any' },
        // iOS sizes
        { src: '/icons/icon-180.png', sizes: '180x180', type: 'image/png',  purpose: 'any' },
        // Adaptive icon (Android 8+): 'maskable' tells the OS it can be cropped into any shape
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png',  purpose: 'any maskable' },
        { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png',  purpose: 'any' },
        // Splash screen / high-res
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png',  purpose: 'any maskable' },
        // SVG (scalable — used where supported)
        { src: '/icons/icon.svg',         sizes: 'any',      type: 'image/svg+xml', purpose: 'any' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          // Supabase API — network first, fallback to cache
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api-cache',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          // Google Fonts
          urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 20, // seconds
    },
    devOptions: {
      enabled: true,
      suppressWarnings: false,
      type: 'module',
    },
  },

  // ─── Runtime config ──────────────────────────────────────────────────────────
  runtimeConfig: {
    public: {
      appVersion: '1.0.0',
      appName: 'eTailor',
    },
  },
 
  // ─── Build & TypeScript ──────────────────────────────────────────────────────
  typescript: {
    strict: true,
    typeCheck: false, // run separately with `nuxt typecheck`
  },

  // Auto-import composables and components
  components: [
    { path: '~/components/ui',        prefix: 'Ui' },
    { path: '~/components/layout',    prefix: 'App' },
    { path: '~/components/customers', prefix: 'Customer' },
    { path: '~/components/orders',    prefix: 'Order' },
    { path: '~/components/materials', prefix: 'Material' },
    { path: '~/components/dashboard', prefix: 'Dash' },
    { path: '~/components/measurements',    prefix: 'Measurement' },
    { path: '~/components/shared',    prefix: '' },
    '~/components',
  ],

  // imports: {
  //   dirs: ['composables/**', 'stores/**', 'utils/**'],
  // },
 
  // ─── CSS ─────────────────────────────────────────────────────────────────────
  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss()
    ],
  },
  
  compatibilityDate: '2025-07-15',
})