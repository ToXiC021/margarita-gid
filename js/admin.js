// ===== АДМИН-ПАНЕЛЬ =====
// Инициализируем глобальную переменную для текущей страницы отзывов
window.currentReviewsPage = 1;
let currentSupabase = null;

async function compressImage(file, maxWidth = 400, quality = 0.5) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width, height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
}

function setupProfilePhotoUpload() {
  const photoEl = document.getElementById('profilePhoto');
  if (!photoEl) return;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  photoEl.addEventListener('click', () => {
    if (!document.querySelector('#profile')?.classList.contains('editing')) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) {
      if (file?.size > 2 * 1024 * 1024) alert('❌ Фото слишком большое (макс 2 МБ)');
      return;
    }
    photoEl.style.opacity = '0.5';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      photoEl.src = ev.target.result;
      photoEl.style.opacity = '1';
      try {
        const { error } = await currentSupabase.from('profile').update({ photo_url: ev.target.result }).eq('id', 1);
        if (error) throw error;
        alert('✅ Фото обновлено!');
      } catch (err) { alert('❌ Ошибка: ' + err.message); }
    };
    reader.readAsDataURL(file);
  });
}

window.reviewPhotos = [];

window.addEventListener('load', () => {
  if (!window.appConfig) { console.error('❌ config.js не загрузился'); return; }
  const { supabase, ADMIN_TOKEN } = window.appConfig;
  currentSupabase = supabase;
  const token = new URLSearchParams(window.location.search).get('token');
  if (token === ADMIN_TOKEN) {
    console.log('✅ Админ-режим активирован');
    initAdminMode();
  }
});

function initAdminMode() {
  document.getElementById('adminToggle')?.classList.remove('hidden');
  document.querySelectorAll('.admin-controls').forEach(c => c.classList.remove('hidden'));
  
  const profileEditBtn = document.querySelector('[data-block="profile"] .btn-edit');
  const aboutEditBtn = document.querySelector('[data-block="about"] .btn-edit');
  if (profileEditBtn) profileEditBtn.addEventListener('click', () => enableEditing('profile'));
  if (aboutEditBtn) aboutEditBtn.addEventListener('click', () => enableEditing('about'));
  
  const diplomasAddBtn = document.querySelector('[data-block="diplomas"] .btn-add');
  const servicesAddBtn = document.querySelector('[data-block="services"] .btn-add');
  if (diplomasAddBtn) diplomasAddBtn.addEventListener('click', addDiploma);
  if (servicesAddBtn) servicesAddBtn.addEventListener('click', addService);
  
  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.removeEventListener('click', saveHandler);
    btn.addEventListener('click', saveHandler);
  });
  
  function saveHandler(e) {
    const controls = e.target.closest('.admin-controls');
    if (!controls) return;
    const block = controls.dataset.block;
    saveChanges(block);
  }
  
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete')) {
      const item = e.target.closest('[data-id]');
      const table = item?.closest('.diplomas-grid') ? 'diplomas' : 'services';
      const id = item?.dataset.id;
      if (id && confirm('Удалить?')) deleteItem(table, id);
    }
  });
  
  setupProfilePhotoUpload();
  refreshDeleteButtons();
  initReviewForm();
  console.log('✅ Админ-панель готова');
}

function enableEditing(block) {
  const controls = document.querySelector(`[data-block="${block}"]`);
  const editBtn = controls?.querySelector('.btn-edit');
  const saveBtn = controls?.querySelector('.btn-save');
  if (!editBtn || !saveBtn) return;
  editBtn.classList.add('hidden');
  saveBtn.classList.remove('hidden');
  if (block === 'profile') {
    document.querySelector('#profile')?.classList.add('editing');
    makeEditableWithLabel('profileName', 'Имя и фамилия', 'Имя Фамилия');
    makeEditableWithLabel('profileCity', 'Город', 'Город');
  }
  if (block === 'about') {
    makeEditableWithLabel('aboutDescription', 'Описание', 'Описание...', 'textarea');
    makeEditableWithLabel('aboutAge', 'Возраст', '-', 'number');
    makeEditableWithLabel('aboutContactTime', 'Время связи', '-', 'text');
    makeEditableWithLabel('aboutEducation', 'Образование', '-', 'textarea');
    makeEditableWithLabel('aboutExperience', 'Опыт', '-', 'textarea');
    makeEditableWithLabel('aboutWorkDays', 'Дни работы', '-', 'text');
    makeEditableWithLabel('aboutWorkHours', 'Часы работы', '-', 'text');
    makeEditableWithLabel('aboutWorkplace', 'Место работы', '-', 'text');
  }
}

function makeEditableWithLabel(id, labelText, placeholder, type = 'text') {
  const el = document.getElementById(id);
  if (!el) return;
  const label = document.createElement('label');
  label.textContent = labelText;
  label.style.cssText = 'display:block;font-weight:600;margin-bottom:0.3rem;color:#2c3e50;';
  if (type === 'textarea') {
    el.contentEditable = 'true';
    el.style.cssText += 'min-height:80px;padding:0.5rem;border:2px dashed #3498db;border-radius:8px;background:#f0f9ff;';
    el.insertBefore(label, el.firstChild);
  } else {
    const input = document.createElement('input');
    input.type = type === 'number' ? 'number' : (type === 'url' ? 'url' : 'text');
    input.value = el.textContent;
    input.placeholder = placeholder;
    input.style.cssText = 'width:100%;padding:0.5rem;margin-bottom:1rem;';
    el.textContent = '';
    el.appendChild(label);
    el.appendChild(input);
  }
  el.dataset.editable = 'true';
}

function addDiploma() {
  const container = document.getElementById('diplomasList');
  if (container.querySelector('.loading')) container.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'diploma-item';
  item.dataset.id = 'temp_' + Date.now();
  item.dataset.new = 'true';
  item.innerHTML = `
    <input type="file" class="diploma-file-input" accept="image/*" style="display:none">
    <div class="upload-box">📷 Выбрать изображение</div>
    <img class="diploma-preview preview-img" style="display:none">
    <input type="text" class="diploma-title" placeholder="Название (опционально)" style="width:100%;margin-top:0.5rem;padding:0.4rem">
  `;
  container.appendChild(item);
  const fileInput = item.querySelector('.diploma-file-input');
  const preview = item.querySelector('.diploma-preview');
  const uploadBox = item.querySelector('.upload-box');
  uploadBox.onclick = () => fileInput.click();
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadBox.textContent = '⏳...';
    try {
      const compressed = await compressImage(file, 400, 0.5);
      preview.src = compressed;
      preview.style.display = 'block';
      uploadBox.style.display = 'none';
      item.dataset.imageUrl = compressed;
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
      uploadBox.style.display = 'block';
      uploadBox.textContent = '📷 Выбрать изображение';
    }
  });
  document.querySelector('[data-block="diplomas"] .btn-save')?.classList.remove('hidden');
  refreshDeleteButtons();
}

function setupServicePhoto(item, fileInput, preview, btn, datasetKey) {
  btn.onclick = () => fileInput.click();
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    btn.textContent = '⏳...';
    try {
      const compressed = await compressImage(file, 400, 0.5);
      preview.src = compressed;
      preview.style.display = 'block';
      btn.style.display = 'none';
      item.dataset[datasetKey] = compressed;
    } catch (err) {
      alert('❌ Ошибка: ' + err.message);
      btn.style.display = 'block';
      btn.textContent = '📷 Фото';
    }
  });
}

function addService() {
  const container = document.getElementById('servicesList');
  if (container.querySelector('.loading')) container.innerHTML = '';
  const item = document.createElement('div');
  item.className = 'service-item';
  item.dataset.id = 'temp_' + Date.now();
  item.dataset.new = 'true';
  item.innerHTML = `
    <div class="service-header">
      <input type="text" class="service-title-input" placeholder="Название" style="flex:1;padding:0.3rem;border:none;border-bottom:2px solid var(--color-amber)">
      <input type="text" class="service-price-input" placeholder="Цена" style="width:100px;padding:0.3rem;border:none;border-bottom:2px solid var(--color-amber);text-align:right">
    </div>
    <textarea class="service-desc-input" placeholder="Описание" style="width:100%;min-height:60px;padding:0.5rem;border:2px dashed var(--color-amber);border-radius:var(--radius-sm)"></textarea>
    <div style="display:flex;gap:1rem;margin-top:0.5rem;flex-wrap:wrap">
      <div style="flex:1;min-width:150px">
        <input type="file" class="service-file-1" accept="image/*" style="display:none">
        <div class="upload-box">📷 Фото 1</div>
        <img class="service-prev-1 preview-img" style="display:none">
      </div>
      <div style="flex:1;min-width:150px">
        <input type="file" class="service-file-2" accept="image/*" style="display:none">
        <div class="upload-box">📷 Фото 2</div>
        <img class="service-prev-2 preview-img" style="display:none">
      </div>
    </div>
  `;
  container.appendChild(item);
  setupServicePhoto(item, item.querySelector('.service-file-1'), item.querySelector('.service-prev-1'), item.querySelector('.service-file-1').nextElementSibling, 'img1');
  setupServicePhoto(item, item.querySelector('.service-file-2'), item.querySelector('.service-prev-2'), item.querySelector('.service-file-2').nextElementSibling, 'img2');
  document.querySelector('[data-block="services"] .btn-save')?.classList.remove('hidden');
  refreshDeleteButtons();
}

function refreshDeleteButtons() {
  document.querySelectorAll('#diplomasList .diploma-item:not(.has-del)').forEach(item => {
    item.classList.add('has-del');
    const btn = document.createElement('button');
    btn.innerHTML = '🗑️';
    btn.className = 'btn-delete';
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Удалить диплом?')) return;
      const id = item.dataset.id;
      try {
        if (!id.startsWith('temp_')) {
          const { error } = await currentSupabase.from('diplomas').delete().eq('id', id);
          if (error) throw error;
        }
        item.remove();
      } catch (err) { alert('❌ Ошибка: ' + err.message); }
    };
    item.appendChild(btn);
  });
  document.querySelectorAll('#servicesList .service-item:not(.has-del)').forEach(item => {
    item.classList.add('has-del');
    const btn = document.createElement('button');
    btn.innerHTML = '🗑️';
    btn.className = 'btn-delete';
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Удалить услугу?')) return;
      const id = item.dataset.id;
      try {
        if (!id.startsWith('temp_')) {
          const { error } = await currentSupabase.from('services').delete().eq('id', id);
          if (error) throw error;
        }
        item.remove();
      } catch (err) { alert('❌ Ошибка: ' + err.message); }
    };
    item.appendChild(btn);
  });
}

async function deleteItem(table, id) {
  if (!confirm('Удалить?')) return;
  try {
    if (id.startsWith('temp_')) {
      document.querySelector(`[data-id="${id}"]`)?.remove();
      return;
    }
    const { error } = await currentSupabase.from(table).delete().eq('id', id);
    if (error) throw error;
    document.querySelector(`[data-id="${id}"]`)?.remove();
  } catch (err) { alert('❌ Ошибка: ' + err.message); }
}

async function saveChanges(block) {
  try {
    if (block === 'profile' || block === 'about') await saveProfileAndAbout();
    if (block === 'diplomas') await saveDiplomas();
    if (block === 'services') await saveServices();
    const controls = document.querySelector(`[data-block="${block}"]`);
    controls?.querySelector('.btn-save')?.classList.add('hidden');
    controls?.querySelector('.btn-edit')?.classList.remove('hidden');
    if (block === 'profile') document.querySelector('#profile')?.classList.remove('editing');
    alert('✅ Данные сохранены!');
    await refreshPageData();
  } catch (err) { alert('❌ Ошибка: ' + err.message); }
}

async function refreshPageData() {
  try {
    const { data: profile } = await currentSupabase.from('profile').select('*').eq('id', 1).single();
    if (profile) {
      document.getElementById('profileName').textContent = (profile.name||'') + ' ' + (profile.surname||'');
      document.getElementById('profileCity').textContent = profile.city || '';
      document.getElementById('profileRating').textContent = profile.rating || '0.0';
      document.getElementById('profileReviewsCount').textContent = '('+(profile.reviews_count||0)+' оценок)';
      if (profile.photo_url) document.getElementById('profilePhoto').src = profile.photo_url;
      if (profile.yandex_profile_url) document.getElementById('respondLink').href = profile.yandex_profile_url;
      document.getElementById('aboutDescription').textContent = profile.description_short || '';
      document.getElementById('aboutAge').textContent = profile.age || '-';
      document.getElementById('aboutContactTime').textContent = profile.contact_time || '-';
      document.getElementById('aboutEducation').textContent = profile.education || '-';
      document.getElementById('aboutExperience').textContent = profile.work_experience || '-';
      document.getElementById('aboutWorkDays').textContent = profile.work_days || '-';
      document.getElementById('aboutWorkHours').textContent = profile.work_hours || '-';
      document.getElementById('aboutWorkplace').textContent = profile.workplace || '-';
    }
    const { data: dipl } = await currentSupabase.from('diplomas').select('*').order('sort_order');
    const dCont = document.getElementById('diplomasList');
    if (dCont && dipl) {
      if (dipl.length) {
        dCont.innerHTML = dipl.map(x => '<div class="diploma-item" data-id="'+x.id+'"><img src="'+x.image_url+'" onerror="this.style.display=\'none\'" /></div>').join('');
      } else {
        dCont.innerHTML = '<p class="loading">Нет дипломов</p>';
      }
      refreshDeleteButtons();
    }
    const { data: serv } = await currentSupabase.from('services').select('*').order('sort_order');
    const sCont = document.getElementById('servicesList');
    if (sCont && serv) {
      if (serv.length) {
        sCont.innerHTML = serv.map(x => {
          const imgs = (x.images||[]).map(img => '<img src="'+img+'" onerror="this.style.display=\'none\'" />').join('');
          return '<div class="service-item" data-id="'+x.id+'"><div class="service-header"><h3 class="service-title">'+x.title+'</h3><span class="service-price">'+(x.price||'')+'</span></div><p class="service-description">'+(x.description||'')+'</p>'+(imgs?'<div class="service-images">'+imgs+'</div>':'')+'</div>';
        }).join('');
      } else {
        sCont.innerHTML = '<p class="loading">Нет услуг</p>';
      }
      refreshDeleteButtons();
    }
  } catch(e) { console.error(e); }
}

async function saveProfileAndAbout() {
  const getVal = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    if (el.dataset.editable) {
      const input = el.querySelector('input,textarea');
      return input ? input.value.trim() : el.textContent.trim();
    }
    return el.textContent.trim();
  };
  const nameFull = getVal('profileName') || '';
  const nameParts = nameFull.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const updates = {
    name: firstName,
    surname: lastName,
    city: getVal('profileCity'),
    description_short: getVal('aboutDescription'),
    age: parseInt(getVal('aboutAge')) || null,
    contact_time: getVal('aboutContactTime'),
    education: getVal('aboutEducation'),
    work_experience: getVal('aboutExperience'),
    work_days: getVal('aboutWorkDays'),
    work_hours: getVal('aboutWorkHours'),
    workplace: getVal('aboutWorkplace'),
    updated_at: new Date().toISOString()
  };
  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
  const { error } = await currentSupabase.from('profile').update(updates).eq('id', 1);
  if (error) throw error;
}

async function saveDiplomas() {
  for (const item of document.querySelectorAll('#diplomasList .diploma-item')) {
    const id = item.dataset.id, isNew = item.dataset.new === 'true';
    const imageUrl = item.dataset.imageUrl || item.querySelector('.diploma-preview')?.src;
    const title = item.querySelector('.diploma-title')?.value?.trim() || null;
    if (!imageUrl || imageUrl.length < 50) continue;
    const data = { image_url: imageUrl, title, sort_order: 0 };
    const { error } = isNew 
      ? await currentSupabase.from('diplomas').insert([data])
      : await currentSupabase.from('diplomas').update(data).eq('id', id);
    if (error) throw error;
    if (isNew) delete item.dataset.new;
  }
}

async function saveServices() {
  for (const item of document.querySelectorAll('#servicesList .service-item')) {
    const id = item.dataset.id, isNew = item.dataset.new === 'true';
    const title = item.querySelector('.service-title-input')?.value?.trim();
    if (!title) continue;
    const img1 = item.dataset.img1 || item.querySelector('.service-prev-1')?.src;
    const img2 = item.dataset.img2 || item.querySelector('.service-prev-2')?.src;
    const images = [img1, img2].filter(x => x?.length > 50);
    const data = {
      title,
      price: item.querySelector('.service-price-input')?.value?.trim() || null,
      description: item.querySelector('.service-desc-input')?.value?.trim() || null,
      images,
      sort_order: 0
    };
    const { error } = isNew
      ? await currentSupabase.from('services').insert([data])
      : await currentSupabase.from('services').update(data).eq('id', id);
    if (error) throw error;
    if (isNew) delete item.dataset.new;
  }
}

function initReviewForm() {
  const starsContainer = document.getElementById('newReviewStars');
  const ratingInput = document.getElementById('newReviewRating');
  if (starsContainer && ratingInput) {
    const stars = starsContainer.querySelectorAll('.star');
    const setRating = (val) => {
      ratingInput.value = val;
      stars.forEach(star => {
        const starVal = parseInt(star.dataset.val);
        if (starVal <= val) {
          star.classList.add('active');
        } else {
          star.classList.remove('active');
        }
      });
    };
    stars.forEach(star => {
      star.onclick = (e) => {
        e.preventDefault();
        const val = parseInt(star.dataset.val);
        setRating(val);
      };
      star.onmouseenter = () => {
        const val = parseInt(star.dataset.val);
        stars.forEach(s => {
          const sv = parseInt(s.dataset.val);
          if (sv <= val) s.classList.add('active');
          else s.classList.remove('active');
        });
      };
    });
    starsContainer.onmouseleave = () => {
      const currentVal = parseInt(ratingInput.value) || 5;
      setRating(currentVal);
    };
    setRating(5);
  }
  
  const photoInput = document.getElementById('newReviewPhotos');
  const photoContainer = document.getElementById('newReviewPhotosPrev');
  if (photoInput && photoContainer) {
    photoInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      for (const file of files) {
        if (window.reviewPhotos.length >= 5) break;
        if (file.size > 2 * 1024 * 1024) { alert('⚠️ ' + file.name + ' > 2 МБ'); continue; }
        window.reviewPhotos.push(file);
      }
      photoContainer.innerHTML = '';
      window.reviewPhotos.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const wrap = document.createElement('div');
          wrap.className = 'photo-preview-item';
          const img = document.createElement('img');
          img.src = ev.target.result;
          const del = document.createElement('span');
          del.innerHTML = '×';
          del.className = 'remove-photo';
          del.onclick = () => { window.reviewPhotos.splice(idx, 1); initReviewForm(); };
          wrap.appendChild(img);
          wrap.appendChild(del);
          photoContainer.appendChild(wrap);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    });
  }
  
  const addBtn = document.querySelector('[data-block="reviews"] .btn-add');
  const form = document.getElementById('reviewFormContainer');
  if (addBtn && form) {
    addBtn.replaceWith(addBtn.cloneNode(true));
    const newBtn = document.querySelector('[data-block="reviews"] .btn-add');
    if (newBtn) {
      newBtn.onclick = () => {
        form.classList.remove('hidden');
        form.scrollIntoView({ behavior: 'smooth' });
      };
    }
  }
}

window.toggleReviewForm = function(show) {
  const form = document.getElementById('reviewFormContainer');
  if (!form) return;
  if (show === false) {
    form.classList.add('hidden');
    document.getElementById('newReviewAuthor').value = '';
    document.getElementById('newReviewText').value = '';
    document.getElementById('newReviewDate').value = '';
    document.getElementById('newReviewRating').value = '5';
    document.getElementById('newReviewPhotos').value = '';
    document.getElementById('newReviewPhotosPrev').innerHTML = '';
    window.reviewPhotos = [];
    const stars = document.querySelectorAll('#newReviewStars .star');
    stars.forEach(s => s.classList.remove('active'));
    stars.forEach(s => { if (parseInt(s.dataset.val) <= 5) s.classList.add('active'); });
  } else {
    form.classList.remove('hidden');
  }
};

// ===== НОВАЯ ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ СПИСКА ОТЗЫВОВ БЕЗ ПЕРЕЗАГРУЗКИ =====
// ===== ОБНОВЛЕНИЕ СПИСКА ОТЗЫВОВ =====
async function refreshReviewsList() {
  try {
    const { data: revs, error } = await currentSupabase.from('reviews')
      .select('*')
      .order('date', { ascending: false, nullsLast: true });
    if (error) throw error;
    
    window.allReviews = revs || [];
    const currentPage = window.currentReviewsPage || 1;
    const REVIEWS_PER_PAGE = 10;
    const start = (currentPage - 1) * REVIEWS_PER_PAGE;
    const end = start + REVIEWS_PER_PAGE;
    const pageReviews = window.allReviews.slice(start, end);
    
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    if (pageReviews.length === 0) {
      container.innerHTML = '<p class="loading">Пока нет отзывов</p>';
      document.getElementById('reviewsPagination').innerHTML = '';
      return;
    }
    
    container.innerHTML = pageReviews.map(function(r) {
      var dt = r.date ? new Date(r.date).toLocaleDateString('ru-RU') : '';
      var stars = '★'.repeat(r.rating || 0) + '☆'.repeat(5 - (r.rating || 0));
      var photosHtml = '';
      if (r.photos && Array.isArray(r.photos) && r.photos.length > 0) {
        photosHtml = '<div class="review-photos">' +
          r.photos.slice(0, 4).map(function(p) {
            return '<img src="'+p+'" class="review-photo" onclick="window.open(this.src)">';
          }).join('') +
          (r.photos.length > 4 ? '<span style="font-size:0.8rem; color:var(--color-gray); align-self:center;">+ ещё ' + (r.photos.length - 4) + '</span>' : '') +
          '</div>';
      } else if (r.photo_url) {
        photosHtml = '<img src="'+r.photo_url+'" class="review-photo" onclick="window.open(this.src)">';
      }
      return '<div class="review-item" data-id="'+r.id+'">' +
        '<div class="review-header">' +
          '<div>' +
            '<span class="review-author">' + (r.author_name || 'Аноним') + '</span>' +
            (dt ? '<span class="review-date"> • ' + dt + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="review-rating">' + stars + '</div>' +
        '<p class="review-text">' + (r.text || '') + '</p>' +
        photosHtml +
      '</div>';
    }).join('');
    
    // Пагинация
    const pCont = document.getElementById('reviewsPagination');
    if (pCont) {
      const totalPages = Math.ceil(window.allReviews.length / REVIEWS_PER_PAGE);
      if (totalPages <= 1) { pCont.innerHTML = ''; return; }
      let html = '';
      html += '<button ' + (currentPage === 1 ? 'disabled' : '') + ' data-page="' + (currentPage - 1) + '" class="page-btn">‹</button>';
      let startP = Math.max(1, currentPage - 2);
      let endP = Math.min(totalPages, currentPage + 2);
      for (let i = startP; i <= endP; i++) {
        html += '<button data-page="' + i + '" class="page-btn' + (i === currentPage ? ' active' : '') + '">' + i + '</button>';
      }
      html += '<button ' + (currentPage === totalPages ? 'disabled' : '') + ' data-page="' + (currentPage + 1) + '" class="page-btn">›</button>';
      pCont.innerHTML = html;
      pCont.querySelectorAll('.page-btn').forEach(btn => {
        btn.onclick = (e) => {
          let p = parseInt(e.target.dataset.page);
          if (p && p !== currentPage) {
            window.currentReviewsPage = p;
            refreshReviewsList();
            document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
          }
        };
      });
    }
    
    // Перепривязываем кнопки удаления
    if (typeof window.attachReviewDeleteButtons === 'function') {
      window.attachReviewDeleteButtons();
    }
  } catch (err) {
    console.error('Ошибка обновления отзывов:', err);
    alert('Не удалось обновить список отзывов: ' + err.message);
  }
}
// ИСПРАВЛЕННАЯ ФУНКЦИЯ УДАЛЕНИЯ ОТЗЫВОВ (без перезагрузки)
window.attachReviewDeleteButtons = function() {
  document.querySelectorAll('#reviewsList .review-item:not(.has-del)').forEach(item => {
    item.classList.add('has-del');
    const id = item.dataset.id;
    if (!id || id.startsWith('temp_')) return;
    const btn = document.createElement('button');
    btn.className = 'btn-del-review';
    btn.innerHTML = '🗑️';
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('Удалить отзыв?')) return;
      try {
        // Выполняем удаление и получаем ответ с количеством удалённых строк
        const { error, count } = await currentSupabase
          .from('reviews')
          .delete({ count: 'exact' })
          .eq('id', id);
        
        if (error) {
          console.error('Ошибка Supabase:', error);
          throw new Error(`Ошибка БД: ${error.message}. Код: ${error.code}`);
        }
        
        // Если count === 0, значит запись не найдена или нет прав
        if (count === 0) {
          throw new Error('Запись не найдена или недостаточно прав для удаления. Проверьте политики безопасности Supabase (RLS).');
        }
        
        // Успешно удалили — обновляем список
        await refreshReviewsList();
        alert('✅ Отзыв удалён');
      } catch (err) {
        console.error(err);
        alert('❌ Ошибка при удалении: ' + err.message);
      }
    };
    item.appendChild(btn);
  });
};
// ИСПРАВЛЕННАЯ ФУНКЦИЯ ДОБАВЛЕНИЯ ОТЗЫВА (без перезагрузки)
window.submitNewReview = async function() {
  const author = document.getElementById('newReviewAuthor')?.value?.trim();
  const text = document.getElementById('newReviewText')?.value?.trim();
  if (!author || !text) { alert('❌ Заполните имя и текст'); return; }
  try {
    const photosArray = [];
    for (let i = 0; i < Math.min(window.reviewPhotos?.length || 0, 5); i++) {
      const file = window.reviewPhotos[i];
      if (file?.type.startsWith('image/')) {
        const base64 = await new Promise(res => {
          const r = new FileReader();
          r.onload = e => res(e.target.result);
          r.readAsDataURL(file);
        });
        photosArray.push(base64);
      }
    }
    let dateVal = document.getElementById('newReviewDate')?.value;
    let formattedDate = dateVal ? dateVal : null;
    const newReview = {
      author_name: author,
      text: text,
      rating: parseInt(document.getElementById('newReviewRating')?.value) || 5,
      date: formattedDate,
      photos: photosArray,
      yandex_review_id: 'manual_' + Date.now(),
      source: 'manual',
      created_at: new Date().toISOString()
    };
    const { error } = await currentSupabase.from('reviews').insert([newReview]);
    if (error) throw error;
    alert('✅ Отзыв добавлен!');
    window.toggleReviewForm(false);
    window.currentReviewsPage = 1;
    await refreshReviewsList();
  } catch (e) {
    console.error(e);
    alert('❌ Ошибка: ' + e.message);
  }
};
