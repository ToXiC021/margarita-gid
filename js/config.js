// js/config.js
window.appConfig = {
  supabase: window.supabase.createClient(
    'https://zqyfbndewygcxmxrxcbe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeWZibmRld3lnY3hteHJ4Y2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTIyMTcsImV4cCI6MjA5MTY4ODIxN30.nOFEd8y3kG_IgGhUWEZJBycVw0clhvTZ4wE8Tm0u6yM',
    {
      auth: {
        // ❌ Полностью отключаем использование хранилища
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      // ✅ Опционально: добавляем заголовки для отладки
      global: {
        headers: {
          'X-Client-Info': 'margarita-portfolio/1.0'
        }
      }
    }
  ),
  SYNC_WORKER_URL: 'https://yandex-sync-worker.margarita-site-gid.workers.dev',
  ADMIN_TOKEN: 'g3n09g43WG343gjEJg'
};