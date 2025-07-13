// flashcards.js - 単語帳一覧ページのロジック

async function loadFlashcards() {
  try {
    const response = await fetch('/api/flashcards');
    const flashcards = await response.json();
    renderTabs(flashcards);
    updateHeader(flashcards.length);
  } catch (error) {
    document.getElementById('empty-state').style.display = '';
    updateHeader(0);
  }
}

function updateHeader(count) {
  const header = document.querySelector('.page-header');
  const subtitle = document.querySelector('.page-subtitle');
  
  if (count === 0) {
    header.textContent = '単語帳一覧';
    subtitle.textContent = 'まだ単語帳がありません';
  } else if (count === 1) {
    header.textContent = '単語帳一覧';
    subtitle.textContent = `${count}個の単語帳があります`;
  } else {
    header.textContent = '単語帳一覧';
    subtitle.textContent = `${count}個の単語帳があります`;
  }
}

function renderTabs(flashcards) {
  const tabList = document.getElementById('tab-list');
  if (!flashcards.length) {
    tabList.style.display = 'none';
    document.getElementById('empty-state').style.display = '';
    return;
  }
  tabList.style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
  tabList.innerHTML = '';
  
  flashcards.forEach((flashcard, idx) => {
    // タブ
    const tab = document.createElement('button');
    tab.className = 'tab';
    tab.innerHTML = `
      <svg class="tab-arrow" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      <span>${flashcard.name}</span><span class="tab-count">${flashcard.words.length}</span>`;
    tab.dataset.idx = idx;
    tabList.appendChild(tab);
    
    // 内容
    const content = document.createElement('div');
    content.className = 'tab-content';
    content.innerHTML = `
      <div class="word-list">
        ${flashcard.words.map(word => `<div class="word-item">${word.label}</div>`).join('')}
      </div>
      <div class="action-buttons">
        <button class="simple-btn test-btn" title="テスト" data-id="${flashcard.id}">テスト</button>
        <button class="simple-btn study-btn" title="ビュー" data-id="${flashcard.id}">ビュー</button>
        <button class="simple-btn random-btn" title="ランダム" data-id="${flashcard.id}">ランダム</button>
        <button class="simple-btn edit-btn" title="編集" data-id="${flashcard.id}">編集</button>
        <button class="simple-btn delete-btn" title="削除" data-id="${flashcard.id}">削除</button>
      </div>
    `;
    tabList.appendChild(content);
  });
  
  // タブ開閉（アコーディオン式、複数同時開閉可）
  const tabs = tabList.querySelectorAll('.tab');
  const contents = tabList.querySelectorAll('.tab-content');
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      const isOpen = tab.classList.contains('open');
      tab.classList.toggle('open', !isOpen);
      contents[i].classList.toggle('open', !isOpen);
    });
  });
  
  // ボタンイベントリスナー
  setupButtonListeners(flashcards);
}

function setupButtonListeners(flashcards) {
  const tabList = document.getElementById('tab-list');
  
  // 学習ボタン
  tabList.querySelectorAll('.study-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.getAttribute('data-id');
      const card = flashcards.find(f => String(f.id) === String(id));
      if (card) {
        localStorage.setItem('studyFlashcard', JSON.stringify(card.words));
        window.location.href = 'flashcard_view.html';
      }
    });
  });
  
  // テストボタン
  tabList.querySelectorAll('.test-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.getAttribute('data-id');
      const card = flashcards.find(f => String(f.id) === String(id));
      if (card) {
        localStorage.setItem('testFlashcard', JSON.stringify(card.words));
        window.location.href = 'flashcard_view.html';
      }
    });
  });
  
  // ランダムボタン
  tabList.querySelectorAll('.random-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.getAttribute('data-id');
      const card = flashcards.find(f => String(f.id) === String(id));
      if (card) {
        const shuffled = [...card.words].sort(() => Math.random() - 0.5);
        localStorage.setItem('studyFlashcard', JSON.stringify(shuffled));
        window.location.href = 'flashcard_view.html';
      }
    });
  });
  
  // 編集ボタン
  tabList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.getAttribute('data-id');
      const card = flashcards.find(f => String(f.id) === String(id));
      if (card) {
        localStorage.setItem('editFlashcard', JSON.stringify(card));
        window.location.href = 'flashcard_view.html';
      }
    });
  });
  
  // 削除ボタン
  tabList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const id = this.getAttribute('data-id');
      if (!confirm('本当にこの単語帳を削除しますか？')) return;
      
      try {
        const res = await fetch(`/api/flashcards/${id}`, { method: 'DELETE' });
        if (res.ok) {
          const updatedResponse = await fetch('/api/flashcards');
          const updatedFlashcards = await updatedResponse.json();
          renderTabs(updatedFlashcards);
          updateHeader(updatedFlashcards.length);
        }
      } catch {}
    });
  });
}

// 初期化
document.addEventListener('DOMContentLoaded', loadFlashcards); 