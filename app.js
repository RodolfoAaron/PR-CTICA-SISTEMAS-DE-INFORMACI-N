import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ Reemplaza con tu anon key real
const SUPABASE_URL = 'https://cqhqjwlwkxbpvudgeyhe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ypNbxNpZxpvfB5Po19s0DA_pIFzsK6D';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const feed = document.getElementById('feed');
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const captionInput = document.getElementById('captionInput');
const cancelBtn = document.getElementById('cancelBtn');
const submitBtn = document.getElementById('submitBtn');
const uploadStatus = document.getElementById('uploadStatus');

let photos = [];

// ===== UTILIDADES =====
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ===== RENDER =====
function render() {
  feed.innerHTML = photos
    .map(
      (p) => `
        <div class="slide">
          <img src="${p.image_url}" loading="lazy" draggable="false" alt="" />
          ${p.caption ? `<div class="caption">${escapeHtml(p.caption)}</div>` : ''}
        </div>
      `
    )
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== BUCLE INFINITO =====
function setupLoop() {
  feed.addEventListener('scroll', () => {
    const atBottom = feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 5;
    if (atBottom) {
      setTimeout(() => {
        photos = shuffle(photos);
        render();
        feed.scrollTo({ top: 0 });
      }, 300);
    }
  });
}

// ===== CARGA INICIAL =====
async function init() {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    feed.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    feed.innerHTML = `<div class="message">No hay fotos aún</div>`;
    return;
  }

  photos = shuffle(data);
  render();
  setupLoop();
}

// ===== SUBIR FOTO =====
async function uploadPhoto(file, caption) {
  // 1. Nombre único para el archivo
  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // 2. Subir al bucket "photos"
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filename, file);

  if (uploadError) throw uploadError;

  // 3. Obtener URL pública
  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(filename);

  // 4. Insertar fila en la tabla
  const { data: inserted, error: insertError } = await supabase
    .from('photos')
    .insert({ image_url: urlData.publicUrl, caption })
    .select()
    .single();

  if (insertError) throw insertError;

  return inserted;
}

// ===== EVENTOS DEL MODAL =====
uploadBtn.addEventListener('click', () => {
  uploadModal.classList.remove('hidden');
  uploadStatus.textContent = '';
  uploadStatus.className = 'status';
  uploadForm.reset();
});

cancelBtn.addEventListener('click', () => {
  uploadModal.classList.add('hidden');
});

uploadModal.addEventListener('click', (e) => {
  if (e.target === uploadModal) uploadModal.classList.add('hidden');
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) return;

  submitBtn.disabled = true;
  uploadStatus.textContent = 'Subiendo...';
  uploadStatus.className = 'status';

  try {
    const inserted = await uploadPhoto(file, captionInput.value.trim() || null);

    uploadStatus.textContent = '¡Subida!';
    uploadStatus.className = 'status success';

    // Añadir al feed al principio
    photos.unshift(inserted);
    render();

    setTimeout(() => {
      uploadModal.classList.add('hidden');
    }, 800);
  } catch (err) {
    uploadStatus.textContent = `Error: ${err.message}`;
    uploadStatus.className = 'status error';
  } finally {
    submitBtn.disabled = false;
  }
});

// ===== ARRANCAR =====
init();
