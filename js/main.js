// ===== ЗАГРУЗКА ДАННЫХ САЙТА =====
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Старт загрузки данных...');
  
  var cfg = window.appConfig;
  if (!cfg || !cfg.supabase) {
    console.error('❌ Конфиг не загружен');
    return;
  }
  var db = cfg.supabase;
  
  // === ПРОФИЛЬ ===
  try {
    var {  profile, error: pErr } = await db.from('profile').select('*').eq('id', 1).single();
    if (!pErr && profile) {
      console.log('✅ Профиль:', profile);
      var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val || '-'; };
      set('profileName', (profile.name||'')+' '+(profile.surname||''));
      set('profileCity', profile.city);
      set('profileRating', profile.rating);
      set('profileReviewsCount', '('+(profile.reviews_count||0)+' оценок)');
      var ph = document.getElementById('profilePhoto'); if (ph && profile.photo_url) ph.src = profile.photo_url;
      var lnk = document.getElementById('respondLink'); if (lnk && profile.yandex_profile_url) lnk.href = profile.yandex_profile_url;
      set('aboutDescription', profile.description_short);
      set('aboutAge', profile.age);
      set('aboutContactTime', profile.contact_time);
      set('aboutEducation', profile.education);
      set('aboutExperience', profile.work_experience);
      set('aboutWorkDays', profile.work_days);
      set('aboutWorkHours', profile.work_hours);
      set('aboutWorkplace', profile.workplace);
    }
  } catch(e) { console.error('❌ Профиль:', e); }

  // === ДИПЛОМЫ ===
  try {
    var {  dipl, error: dErr } = await db.from('diplomas').select('*').order('sort_order');
    var dCont = document.getElementById('diplomasList');
    if (dCont) {
      if (!dErr && dipl && dipl.length > 0) {
        console.log('✅ Дипломов:', dipl.length);
        dCont.innerHTML = dipl.map(function(x) {
          return '<div class="diploma-item" data-id="'+x.id+'"><img src="'+x.image_url+'" onerror="this.style.display=\'none\'" /></div>';
        }).join('');
      } else {
        dCont.innerHTML = '<p class="loading">Нет дипломов</p>';
      }
    }
  } catch(e) { console.error('❌ Дипломы:', e); }

  // === УСЛУГИ ===
  try {
    var {  serv, error: sErr } = await db.from('services').select('*').order('sort_order');
    var sCont = document.getElementById('servicesList');
    if (sCont) {
      if (!sErr && serv && serv.length > 0) {
        console.log('✅ Услуг:', serv.length);
        sCont.innerHTML = serv.map(function(x) {
          var imgs = (x.images||[]).map(function(img){ return '<img src="'+img+'" onerror="this.style.display=\'none\'" />'; }).join('');
          return '<div class="service-item" data-id="'+x.id+'"><div class="service-header"><h3 class="service-title">'+x.title+'</h3><span class="service-price">'+(x.price||'')+'</span></div><p class="service-description">'+(x.description||'')+'</p>'+(imgs?'<div class="service-images">'+imgs+'</div>':'')+'</div>';
        }).join('');
      } else {
        sCont.innerHTML = '<p class="loading">Нет услуг</p>';
      }
    }
  } catch(e) { console.error('❌ Услуги:', e); }

  // === ОТЗЫВЫ С ПАГИНАЦИЕЙ ===
  var currentPage = 1;
  var REVIEWS_PER_PAGE = 10;
  var allReviews = [];

  try {
    var {  revs, error: rErr } = await db.from('reviews')
      .select('*')
      .order('date', { ascending: false, nullsLast: true });

    var rCont = document.getElementById('reviewsList');
    var pCont = document.getElementById('reviewsPagination');

    if (!rErr && revs) {
      allReviews = revs;
      console.log('✅ Загружено отзывов:', allReviews.length);

      // Отрисовка страницы отзывов
      function showReviewsPage(page) {
        var start = (page - 1) * REVIEWS_PER_PAGE;
        var end = start + REVIEWS_PER_PAGE;
        var pageReviews = allReviews.slice(start, end);
        var container = document.getElementById('reviewsList');
        if (!container) return;

        if (pageReviews.length === 0) {
          container.innerHTML = '<p class="loading">Пока нет отзывов</p>';
          return;
        }

        container.innerHTML = pageReviews.map(function(r) {
          var dt = r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '';
          var st = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));

          // === ФОТОГРАФИИ (массив или строка) ===
          var photosHtml = '';
          if (r.photos && Array.isArray(r.photos) && r.photos.length > 0) {
            photosHtml = '<div style="display:flex; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap;">' +
              r.photos.slice(0, 4).map(function(p) {
                return '<img src="'+p+'" style="max-width:80px; max-height:80px; border-radius:6px; object-fit:cover; cursor:pointer;" onclick="window.open(this.src)">';
              }).join('') +
              (r.photos.length > 4 ? '<span style="font-size:0.8rem; color:#666; align-self:center;">+ ещё ' + (r.photos.length - 4) + '</span>' : '') +
              '</div>';
          } else if (r.photo_url) {
            photosHtml = '<img src="'+r.photo_url+'" style="max-width:200px; max-height:150px; margin-top:0.5rem; border-radius:8px; cursor:pointer;" onclick="window.open(this.src)">';
          }

          return '<div class="review-item" data-id="'+r.id+'">' +
            '<div class="review-header">' +
              '<span class="review-author">'+(r.author_name||'')+'</span>' +
              '<span class="review-rating">'+st+'</span>' +
              (dt ? '<span class="review-date"> • '+dt+'</span>' : '') +
            '</div>' +
            '<p class="review-text">'+(r.text||'')+'</p>' +
            photosHtml +
          '</div>';
        }).join('');

        // Кнопки удаления для админа
        if (window.appConfig?.ADMIN_TOKEN && typeof window.attachReviewDeleteButtons === 'function') {
          setTimeout(function() { window.attachReviewDeleteButtons(); }, 100);
        }
      }
      
      // Отрисовка пагинации
      function showPagination() {
        if (!pCont) return;
        var totalPages = Math.ceil(allReviews.length / REVIEWS_PER_PAGE);
        if (totalPages <= 1) { pCont.innerHTML = ''; return; }
        
        var html = '';
        html += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' data-page="' + (currentPage - 1) + '" class="page-btn">‹</button>';
        
        var startP = Math.max(1, currentPage - 2);
        var endP = Math.min(totalPages, currentPage + 2);
        for (var i = startP; i <= endP; i++) {
          html += '<button data-page="' + i + '" class="page-btn' + (i === currentPage ? ' active' : '') + '">' + i + '</button>';
        }
        
        html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' data-page="' + (currentPage + 1) + '" class="page-btn">›</button>';
        
        pCont.innerHTML = html;
        
        pCont.querySelectorAll('.page-btn').forEach(function(btn) {
          btn.onclick = function(e) {
            var p = parseInt(e.target.dataset.page);
            if (p && p !== currentPage) {
              currentPage = p;
              showReviewsPage(p);
              showPagination();
              document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
            }
          };
        });
      }
      
      // Показываем первую страницу
      showReviewsPage(1);
      showPagination();
      
    } else if (rCont) {
      rCont.innerHTML = '<p class="loading">Нет отзывов</p>';
    }
  } catch(e) { 
    console.error('❌ Отзывы:', e); 
    var rCont = document.getElementById('reviewsList');
    if (rCont) rCont.innerHTML = '<p class="loading">Ошибка загрузки</p>';
  }
  
  // === ФУТЕР ===
  var yr = document.getElementById('currentYear');
  if (yr) yr.textContent = new Date().getFullYear();
  
  console.log('🏁 Загрузка завершена');
});