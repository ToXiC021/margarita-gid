// 🔧 Настройки подключения к Supabase
const SUPABASE_URL = 'https://zqyfbndewygcxmxrxcbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxeWZibmRld3lnY3hteHJ4Y2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMTIyMTcsImV4cCI6MjA5MTY4ODIxN30.nOFEd8y3kG_IgGhUWEZJBycVw0clhvTZ4wE8Tm0u6yM';
const ADMIN_TOKEN = 'g3n09g43WG343gjEJg';
const SYNC_WORKER_URL = 'https://yandex-sync-worker.margarita-site-gid.workers.dev';

// Инициализируем клиент Supabase ОДИН РАЗ
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспортируем всё в глобальный объект
window.appConfig = {
  supabase: supabaseClient,
  ADMIN_TOKEN,
  SYNC_WORKER_URL
};