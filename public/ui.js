// Example mock data. Replace later with your real API data.
const sample = [
  {
    title: 'Laugh Again',
    creator: 'Anna Brooks',
    thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    duration: '02:31'
  },
  {
    title: 'Suit Up',
    creator: 'David Ko',
    thumb: 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=1200&auto=format&fit=crop',
    duration: '03:04'
  },
  {
    title: 'Best Buds',
    creator: 'Jamal & Lee',
    thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1200&auto=format&fit=crop',
    duration: '01:58'
  },
  {
    title: 'Street Moves',
    creator: 'Yuki',
    thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
    duration: '04:12'
  },
  {
    title: 'Sunset Vlog',
    creator: 'Mara',
    thumb: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
    duration: '02:47'
  },
  {
    title: 'Weekend Fun',
    creator: 'Rico & Sam',
    thumb: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1200&auto=format&fit=crop',
    duration: '05:07'
  }
];

const grid = document.getElementById('videoGrid');

function renderCards(list) {
  grid.innerHTML = list.map(v => `
    <article class="card">
      <div class="thumb">
        <img src="${v.thumb}" alt="">
        <span class="play"><i class="ri-play-mini-fill"></i> ${v.duration}</span>
      </div>
      <div class="meta">
        <div class="title">${v.title}</div>
        <div class="sub">by ${v.creator}</div>
      </div>
    </article>
  `).join('');
}

renderCards(sample);

// Upload dialog (placeholder UX)
const dlg = document.getElementById('uploadDlg');
document.getElementById('btnUpload').addEventListener('click', () => dlg.showModal());
