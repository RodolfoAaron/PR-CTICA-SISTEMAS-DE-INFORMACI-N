import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ Reemplaza con tu anon key real (Settings → API → anon public)
const SUPABASE_URL = 'https://cqhqjwlwkxbpvudgeyhe.supabase.co';
const SUPABASE_ANON_KEY = 'AQUI_PEGA_TU_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const feed = document.getElementById('feed');

let photos = [];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function render() {
  feed.innerHTML = photos
    .map(
      (p) => `
        <div class="slide">
          <img src="${p.image_url}" loading="lazy" draggable="false" alt="" />
        </div>
      `
    )
    .join('');
}

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

async function init() {
  const { data, error } = await supabase.from('photos').select('*');

  if (error) {
    feed.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    feed.innerHTML = `<div class="message">No hay fotos</div>`;
    return;
  }

  photos = shuffle(data);
  render();
  setupLoop();
}

init();
