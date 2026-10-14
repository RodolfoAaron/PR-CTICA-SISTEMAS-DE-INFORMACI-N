import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ===== CONFIG =====
const SUPABASE_URL = 'https://cqhqjwlwkxbpvudgeyhe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ypNbxNpZxpvfB5Po19s0DA_pIFzsK6D';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== DOM =====
const feed = document.getElementById('feed');
const uploadBtn = document.getElementById('uploadBtn');
const uploadModal = document.getElementById('uploadModal');
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const captionInput = document.getElementById('captionInput');
const cancelBtn = document.getElementById('cancelBtn');
const submitBtn = document.getElementById('submitBtn');
const uploadStatus = document.getElementById('uploadStatus');

const camera = document.getElementById('camera');
const snapshot = document.getElementById('snapshot');
const preview = document.getElementById('preview');
const openCameraBtn = document.getElementById('openCameraBtn');
const shootBtn = document.getElementById('shootBtn');
const retakeBtn = document.getElementById('retakeBtn');

// ===== ESTADO =====
let photos = [];
let mediaStream = null;
let capturedBlob = null;

// ===== UTILIDADES =====
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== RENDER FEED =====
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
async function uploadPhoto(fileOrBlob, caption) {
  const ext = fileOrBlob.name ? fileOrBlob.name.split('.').pop() : 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filename, fileOrBlob, { contentType: fileOrBlob.type || 'image/jpeg' });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('photos')
    .getPublicUrl(filename);

  const { data: inserted, error: insertError } = await supabase
    .from('photos')
    .insert({ image_url: urlData.publicUrl, caption })
    .select()
    .single();

  if (insertError) throw insertError;
  return inserted;
}

// ===== CÁMARA =====
async function openCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
    camera.srcObject = mediaStream;
    camera.classList.remove('hidden');
    preview.classList.add('hidden');
    openCameraBtn.classList.add('hidden');
    shootBtn.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    uploadStatus.textContent = '';
    uploadStatus.className = 'status';
  } catch (err) {
    uploadStatus.textContent = `No se pudo abrir la cámara: ${err.message}`;
    uploadStatus.className = 'status error';
  }
}

function shoot() {
  const w = camera.videoWidth;
  const h = camera.videoHeight;
  snapshot.width = w;
  snapshot.height = h;
  snapshot.getContext('2d').drawImage(camera, 0, 0, w, h);

  snapshot.toBlob(
    (blob) => {
      capturedBlob = blob;
      preview.src = URL.createObjectURL(blob);
      preview.classList.remove('hidden');
      camera.classList.add('hidden');
      shootBtn.classList.add('hidden');
      retakeBtn.classList.remove('hidden');
      stopCamera();
    },
    'image/jpeg',
    0.9
  );
}

function retake() {
  capturedBlob = null;
  preview.src = '';
  preview.classList.add('hidden');
  openCamera();
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
}

function resetCameraUI() {
  capturedBlob = null;
  stopCamera();
  camera.classList.add('hidden');
  preview.classList.add('hidden');
  shootBtn.classList.add('hidden');
  retakeBtn.classList.add('hidden');
  openCameraBtn.classList.remove('hidden');
  uploadForm.reset();
  uploadStatus.textContent = '';
  uploadStatus.className = 'status';
}

openCameraBtn.addEventListener('click', openCamera);
shootBtn.addEventListener('click', shoot);
retakeBtn.addEventListener('click', retake);

// ===== MODAL =====
uploadBtn.addEventListener('click', () => {
  uploadModal.classList.remove('hidden');
  resetCameraUI();
});

cancelBtn.addEventListener('click', () => {
  uploadModal.classList.add('hidden');
  resetCameraUI();
});

uploadModal.addEventListener('click', (e) => {
  if (e.target === uploadModal) {
    uploadModal.classList.add('hidden');
    resetCameraUI();
  }
});

// ===== SUBMIT =====
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const file = capturedBlob || fileInput.files[0];
  if (!file) {
    uploadStatus.textContent = 'Elige o toma una foto primero';
    uploadStatus.className = 'status error';
    return;
  }

  submitBtn.disabled = true;
  uploadStatus.textContent = 'Subiendo...';
  uploadStatus.className = 'status';

  try {
    const inserted = await uploadPhoto(file, captionInput.value.trim() || null);
    uploadStatus.textContent = '¡Subida!';
    uploadStatus.className = 'status success';

    photos.unshift(inserted);
    render();

    setTimeout(() => {
      uploadModal.classList.add('hidden');
      resetCameraUI();
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
