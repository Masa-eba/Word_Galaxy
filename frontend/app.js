// app.js - CS概念マインドマップのメインロジック
// データの読み込み、マインドマップの描画、インタラクションとフラッシュカードの処理

// グローバル状態
let network = null;
let nodes = [];
let edges = [];
let selectedNodeIds = [];
let flashcards = [];
let currentCardIndex = 0;
let isSelectingFlashcards = false;
let isRandomMode = false; // ランダムモードのフラグ
let isTestMode = false; // テストモードのフラグ
let testQuestions = []; // テスト問題の配列
let currentTestIndex = 0; // 現在のテスト問題インデックス
let testResults = []; // テスト結果の配列
let searchResultsArray = []; // 検索結果の配列

// DOM要素
const detailsOverlay = document.getElementById('details-overlay');
const detailsTitle = document.getElementById('details-title');
const detailsText = document.getElementById('details-text');
const closeDetailsBtn = document.getElementById('close-details');
const createFlashcardsBtn = document.getElementById('create-flashcards');
const flashcardView = document.getElementById('flashcard-view');
const flashcard = document.getElementById('flashcard');
const cardFront = document.querySelector('.card-front');
const cardBack = document.querySelector('.card-back');
const cardTitle = document.querySelector('.card-title');
const cardDescription = document.querySelector('.card-description');
const prevCardBtn = document.getElementById('prev-card');
const nextCardBtn = document.getElementById('next-card');
const flipCardBtn = document.getElementById('flip-card');
const backToMapBtn = document.getElementById('back-to-map');
const selectControls = document.getElementById('flashcard-select-controls');
const createSelectBtn = document.getElementById('create-flashcard-select');
const cancelSelectBtn = document.getElementById('cancel-flashcard-select');
const currentCardNumber = document.getElementById('current-card-number');
const totalCards = document.getElementById('total-cards');
const progressFill = document.querySelector('.progress-fill');
const randomModeBtn = document.getElementById('random-mode-btn');
const testModeBtn = document.getElementById('test-mode-btn');
const testView = document.getElementById('test-view');
const testQuestionText = document.getElementById('test-question-text');
const testOptions = document.getElementById('test-options');
const testNextBtn = document.getElementById('test-next-btn');
const backFromTestBtn = document.getElementById('back-from-test');
const testCurrentNumber = document.getElementById('test-current-number');
const testTotalQuestions = document.getElementById('test-total-questions');
const testProgressFill = document.querySelector('.test-progress-fill');
const testPassBtn = document.getElementById('test-pass-btn');

// zoomOutBtnの動的生成を削除し、DOMから取得するだけにする
const zoomOutBtn = document.getElementById('zoom-out-btn');
zoomOutBtn.addEventListener('click', function() {
  if (network) {
    network.fit({ animation: true, scale: 1 });
  }
});

// 検索バーを左上に移動
const searchContainer = document.getElementById('search-container');
if (searchContainer) {
  searchContainer.style.position = 'fixed';
  searchContainer.style.top = '2rem';
  searchContainer.style.left = '2rem';
  searchContainer.style.right = '';
  searchContainer.style.zIndex = 40;
}

// zoomOutBtnと検索バーを垂直に並べる
zoomOutBtn.style.position = 'fixed';
zoomOutBtn.style.top = '2rem';
zoomOutBtn.style.left = '2rem';
zoomOutBtn.style.right = '';
zoomOutBtn.style.zIndex = 40;

// スワイプ用変数
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');
const searchResultsElement = document.getElementById('search-results');

let startX = 0;
let startY = 0;
let endX = 0;
let endY = 0;
let minSwipeDistance = 50; // スワイプの最小距離

// バックエンドAPIからデータを取得
async function loadData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  nodes = data.nodes;
  edges = data.edges;
}

// Vis.jsでマインドマップを描画
function renderNetwork() {
  // Vis.js DataSetの準備
  const visNodes = new vis.DataSet(nodes.map(n => ({
    id: n.id,
    // ノードには小さなドットを使用
    shape: 'dot',
    size: 14, 
    color: '#f7c873',
    borderWidth: 0,
    // ドット内にラベルは表示しない
    label: '',
    // 外部描画用にラベルを保持
    _externalLabel: n.label
  })));
  const visEdges = new vis.DataSet(edges.map(e => ({
    from: e.from,
    to: e.to
    // エッジにはラベルなし
  })));

  // Vis.jsネットワークのオプション
  const options = {
    physics: {
      stabilization: {
        enabled: true,
        iterations: 10, // Adjust as needed for your graph size
        updateInterval: 25
      }
    },
    nodes: {
      borderWidthSelected: 6,
      color: {
        border: '#f7c873',
        background: '#f7c873',
        highlight: { border: '#f7c873', background: '#f7c873' }
      }
    },
    edges: {
      smooth: true,
      width: 2,
      color: { color: '#aaa' }
    },
    interaction: {
      multiselect: true,
      navigationButtons: false,
      selectable: true,
      dragNodes: true,
      dragView: true,
      zoomView: true
    }
  };

  // ネットワークを作成
  const container = document.getElementById('network');
  network = new vis.Network(container, { nodes: visNodes, edges: visEdges }, options);

  // 起動時に全ノードを表示するように自動でズームアウト
  setTimeout(function () {
    if (network) {
      network.fit({ animation: true, scale: 0.1 });
    }
  }, 500);

  // ノード動作の停止
  // network.once('stabilizationIterationsDone', function () {
  //   network.setOptions({ physics: false });
  // });

  network.on('afterDrawing', function() {
    renderExternalLabels(visNodes);
  });

  // ノードクリック: 詳細を表示または選択トグル
  network.on('click', function(params) {
    if (params.nodes.length === 1) {
      const nodeId = params.nodes[0];
      if (isSelectingFlashcards) {
        // すでに選択されていれば解除、なければ追加
        const idx = selectedNodeIds.indexOf(nodeId);
        if (idx === -1) {
          selectedNodeIds.push(nodeId);
        } else {
          selectedNodeIds.splice(idx, 1);
        }
        // Vis.jsの選択状態を手動で反映
        network.selectNodes(selectedNodeIds);
        updateCreateFlashcardsBtn();
      } else {
        showNodeDetails(nodeId);
      }
    }
  });

  // ノード選択: 複数選択を処理
  network.on('selectNode', function(params) {
    if (isSelectingFlashcards) {
      // ここは何もしない（クリックで制御するため）
      // selectedNodeIds = params.nodes;
      // updateCreateFlashcardsBtn();
    }
  });
  network.on('deselectNode', function(params) {
    if (isSelectingFlashcards) {
      // ここは何もしない（クリックで制御するため）
      // selectedNodeIds = params.nodes;
      // updateCreateFlashcardsBtn();
    }
  });
}

// ドットの外側にラベルを描画
function renderExternalLabels(visNodes) {
  const container = document.getElementById('network');
  const ctx = network.canvas.getContext();
  ctx.save();
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  visNodes.forEach(function(node) {
    const pos = network.getPositions([node.id])[node.id];
    if (pos) {
      ctx.fillStyle = '#fff';
      ctx.fillText(nodes.find(n => n.id === node.id).label, pos.x, pos.y + 16);
    }
  });
  ctx.restore();
}

// ノード詳細オーバーレイを表示
function showNodeDetails(nodeId) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;
  detailsTitle.textContent = node.label;
  detailsText.textContent = node.details;
  detailsOverlay.classList.remove('hidden');
}

// 詳細オーバーレイを非表示
function hideNodeDetails() {
  detailsOverlay.classList.add('hidden');
}

// 「フラッシュカード作成」ボタンの有効/無効を切り替え
function updateCreateFlashcardsBtn() {
  createFlashcardsBtn.disabled = false;
}

// 選択したノードからフラッシュカードを生成
function createFlashcards() {
  flashcards = selectedNodeIds.map(id => {
    const node = nodes.find(n => n.id === id);
    return node ? { front: node.label, back: node.details } : null;
  }).filter(Boolean);
  currentCardIndex = 0;
  showFlashcardView();
}

// フラッシュカードビューを表示
function showFlashcardView() {
  flashcardView.classList.remove('hidden');
  document.getElementById('network').style.display = 'none';
  createFlashcardsBtn.style.display = 'none';
  currentCardIndex = 0;
  renderFlashcard();
  document.getElementById('search-container').classList.add('hidden');
  // フラッシュカードビュー表示時にボタンを非表示
  document.body.classList.add('hide-corner-btns');
}

// フラッシュカードビューを非表示
function hideFlashcardView() {
  flashcardView.classList.add('hidden');
  document.getElementById('network').style.display = '';
  createFlashcardsBtn.style.display = '';
  network.unselectAll();
  selectedNodeIds = [];
  updateCreateFlashcardsBtn();
  // 検索欄を再表示
  if (testView.classList.contains('hidden')) {
    document.getElementById('search-container').classList.remove('hidden');
  }
  // フラッシュカードビュー非表示時にボタンを再表示
  document.body.classList.remove('hide-corner-btns');
}

// 現在のフラッシュカードを描画
function renderFlashcard() {
  if (!flashcards.length) return;
  
  const card = flashcards[currentCardIndex];
  cardTitle.textContent = card.front;
  cardDescription.textContent = card.back;
  flashcard.classList.remove('flipped');
  
  // カウンターを更新
  currentCardNumber.textContent = currentCardIndex + 1;
  totalCards.textContent = flashcards.length;
  
  // 進捗バーを更新
  const progress = ((currentCardIndex + 1) / flashcards.length) * 100;
  progressFill.style.width = progress + '%';
}

// フラッシュカードを裏返す
function flipFlashcard() {
  flashcard.classList.toggle('flipped');
}

// スワイプ関数
function handleTouchStart(e) {
  console.log('Touch start'); // デバッグ用
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  isClick = true; // スワイプ開始時はクリックを無効にする
}

function handleTouchMove(e) {
  e.preventDefault();
}

function handleTouchEnd(e) {
  console.log('Touch end'); // デバッグ用
  endX = e.changedTouches[0].clientX;
  endY = e.changedTouches[0].clientY;
  
  const diffX = startX - endX;
  const diffY = startY - endY;
  
  console.log('Swipe distance:', diffX); // デバッグ用
  
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
    console.log('Swipe detected, switching card'); // デバッグ用
    if (diffX < 0) {
      // 右スワイプ - 次のカード
      nextFlashcard();
    } else {
      // 左スワイプ - 前のカード
      prevFlashcard();
    }
  } else {
    // スワイプでない場合は裏返す
    flipFlashcard();
  }
  
  // 少し遅延してからクリックを有効にする
  setTimeout(() => {
    isClick = false;
  }, 100);
}

// 次のフラッシュカードを表示
function nextFlashcard() {
  if (isRandomMode) {
    // ランダムモードの場合、ランダムなカードを選択
    const randomIndex = Math.floor(Math.random() * flashcards.length);
    currentCardIndex = randomIndex;
  } else {
    // 通常モードの場合、次のカード
    if (currentCardIndex < flashcards.length - 1) {
      currentCardIndex++;
    }
  }
  renderFlashcard();
}

// 前のフラッシュカードを表示
function prevFlashcard() {
  if (isRandomMode) {
    // ランダムモードの場合、ランダムなカードを選択
    const randomIndex = Math.floor(Math.random() * flashcards.length);
    currentCardIndex = randomIndex;
  } else {
    // 通常モードの場合、前のカード
    if (currentCardIndex > 0) {
      currentCardIndex--;
    }
  }
  renderFlashcard();
}

// --- イベントリスナー ---

// 詳細オーバーレイを閉じる
closeDetailsBtn.addEventListener('click', hideNodeDetails);
// 詳細オーバーレイを外部クリックで閉じる
window.addEventListener('click', function(e) {
  if (e.target === detailsOverlay) hideNodeDetails();
});

// 選択したノードからフラッシュカードを作成
createFlashcardsBtn.addEventListener('click', function() {
  enterFlashcardSelectMode();
});

// フラッシュカードコントロール
let isClick = false; // クリックとスワイプを区別するためのフラグ

flashcard.addEventListener('click', function(e) {
  if (!isClick) {
    flipFlashcard();
  }
});
flipCardBtn.addEventListener('click', flipFlashcard);
nextCardBtn.addEventListener('click', nextFlashcard);
prevCardBtn.addEventListener('click', prevFlashcard);
backToMapBtn.addEventListener('click', hideFlashcardView);

// ランダムモード切り替え
randomModeBtn.addEventListener('click', function() {
  isRandomMode = !isRandomMode;
  if (isRandomMode) {
    randomModeBtn.classList.add('active');
    randomModeBtn.innerHTML = '<span>🎲 ランダム ON</span>';
  } else {
    randomModeBtn.classList.remove('active');
    randomModeBtn.innerHTML = '<span>🎲 ランダム</span>';
  }
});

// テストモード関数
function generateTestQuestions() {
  testQuestions = [];
  const shuffledCards = [...flashcards].sort(() => Math.random() - 0.5);
  
  shuffledCards.forEach((card, index) => {
    // 正解の選択肢
    const correctAnswer = card.back;
    
    // data.jsonから正解以外の単語をランダムに選んで偽回答を作成
    const allNodes = nodes.filter(node => node.details !== correctAnswer);
    const wrongAnswers = allNodes
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(node => node.details);
    
    // 選択肢をシャッフル
    const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    
    testQuestions.push({
      question: card.front,
      correctAnswer: correctAnswer,
      options: options,
      userAnswer: null,
      isCorrect: false
    });
  });
}

function showTestView() {
  testView.classList.remove('hidden');
  flashcardView.classList.add('hidden');
  document.getElementById('network').style.display = 'none';
  createFlashcardsBtn.style.display = 'none';
  currentTestIndex = 0;
  testResults = [];
  generateTestQuestions();
  renderTestQuestion();
  document.getElementById('search-container').classList.add('hidden');
  // テストモード表示時にボタンを非表示
  document.body.classList.add('hide-corner-btns');
}

function hideTestView() {
  testView.classList.add('hidden');
  flashcardView.classList.remove('hidden');
  document.getElementById('network').style.display = '';
  createFlashcardsBtn.style.display = 'none';
  renderFlashcard();
  // 検索欄を再表示
  if (flashcardView.classList.contains('hidden')) {
    document.getElementById('search-container').classList.remove('hidden');
  }
  // テストモード非表示時にボタンを再表示（ただしフラッシュカードビューが非表示の場合のみ）
  if (flashcardView.classList.contains('hidden')) {
    document.body.classList.remove('hide-corner-btns');
  }
}

function renderTestQuestion() {
  if (currentTestIndex >= testQuestions.length) {
    showTestResults();
    return;
  }
  
  const question = testQuestions[currentTestIndex];
  testQuestionText.textContent = question.question;
  
  testOptions.innerHTML = question.options.map((option, index) => `
    <div class="test-option" data-index="${index}">
      ${option}
    </div>
  `).join('');
  
  // 選択肢のクリックイベント
  testOptions.querySelectorAll('.test-option').forEach(option => {
    option.addEventListener('click', function() {
      const selectedIndex = parseInt(this.getAttribute('data-index'));
      selectTestOption(selectedIndex);
    });
  });
  
  // カウンターとプログレスバーを更新
  testCurrentNumber.textContent = currentTestIndex + 1;
  testTotalQuestions.textContent = testQuestions.length;
  const progress = ((currentTestIndex + 1) / testQuestions.length) * 100;
  testProgressFill.style.width = progress + '%';
}

function selectTestOption(selectedIndex) {
  const question = testQuestions[currentTestIndex];
  const selectedAnswer = question.options[selectedIndex];
  
  question.userAnswer = selectedAnswer;
  question.isCorrect = selectedAnswer === question.correctAnswer;
  
  // 選択肢のスタイルを更新
  testOptions.querySelectorAll('.test-option').forEach((option, index) => {
    const answer = question.options[index];
    option.classList.remove('selected', 'correct', 'incorrect');
    
    if (index === selectedIndex) {
      option.classList.add('selected');
      if (answer === question.correctAnswer) {
        option.classList.add('correct');
      } else {
        option.classList.add('incorrect');
      }
    } else if (answer === question.correctAnswer) {
      option.classList.add('correct');
    }
  });
  
  // 次の問題ボタンを有効化
  testNextBtn.disabled = false;
}

function nextTestQuestion() {
  currentTestIndex++;
  if (currentTestIndex < testQuestions.length) {
    renderTestQuestion();
    testNextBtn.disabled = true;
  } else {
    showTestResults();
  }
}

function showTestResults() {
  const correctCount = testQuestions.filter(q => q.isCorrect).length;
  const totalCount = testQuestions.length;
  const percentage = Math.round((correctCount / totalCount) * 100);
  
  testQuestionText.textContent = `テスト完了！`;
  testOptions.innerHTML = `
    <div class="test-results">
      <h3>結果</h3>
      <p>正解: ${correctCount} / ${totalCount}</p>
      <p>正答率: ${percentage}%</p>
      <div class="result-buttons">
        <button id="retry-test" class="result-btn retry-btn">🔄 再テスト</button>
        <button id="back-to-cards" class="result-btn back-btn">← カードに戻る</button>
      </div>
    </div>
  `;
  
  document.getElementById('retry-test').addEventListener('click', function() {
    currentTestIndex = 0;
    testResults = [];
    generateTestQuestions();
    renderTestQuestion();
  });
  
  document.getElementById('back-to-cards').addEventListener('click', function() {
    hideTestView();
  });
}

// テストモード切り替え
testModeBtn.addEventListener('click', function() {
  if (flashcards.length === 0) {
    alert('テストするカードがありません。まずフラッシュカードを作成してください。');
    return;
  }
  showTestView();
});

// テストコントロール
testNextBtn.addEventListener('click', nextTestQuestion);
backFromTestBtn.addEventListener('click', hideTestView);

// スワイプイベントリスナー
flashcard.addEventListener('touchstart', handleTouchStart, { passive: false });
flashcard.addEventListener('touchmove', handleTouchMove, { passive: false });
flashcard.addEventListener('touchend', handleTouchEnd, { passive: false });

// マウスイベントも追加（デスクトップ対応）
let isMouseDown = false;

flashcard.addEventListener('mousedown', function(e) {
  e.preventDefault();
  startX = e.clientX;
  startY = e.clientY;
  isMouseDown = true;
  isClick = true; // スワイプ開始時はクリックを無効にする
});

flashcard.addEventListener('mousemove', function(e) {
  if (!isMouseDown) return;
  e.preventDefault();
});

flashcard.addEventListener('mouseup', function(e) {
  if (!isMouseDown) return;
  
  console.log('Mouse up'); // デバッグ用
  endX = e.clientX;
  endY = e.clientY;
  isMouseDown = false;
  
  const diffX = startX - endX;
  const diffY = startY - endY;
  
  console.log('Mouse swipe distance:', diffX); // デバッグ用
  
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
    console.log('Mouse swipe detected, switching card'); // デバッグ用
    if (diffX < 0) {
      // 右スワイプ - 次のカード
      nextFlashcard();
    } else {
      // 左スワイプ - 前のカード
      prevFlashcard();
    }
  } else {
    // スワイプでない場合は裏返す
    flipFlashcard();
  }
  
  // 少し遅延してからクリックを有効にする
  setTimeout(() => {
    isClick = false;
  }, 100);
});

// マウスがカードの外に出た場合の処理
document.addEventListener('mouseup', function() {
  if (isMouseDown) {
    isMouseDown = false;
    setTimeout(() => {
      isClick = false;
    }, 100);
  }
});

// 選択モードの切り替え
function enterFlashcardSelectMode() {
  isSelectingFlashcards = true;
  selectControls.classList.remove('hidden');
  createFlashcardsBtn.style.display = 'none';
  document.body.classList.add('hide-corner-btns');
  // 名前入力をリセット
  document.getElementById('flashcard-name').value = '';
  // ノード選択解除
  network.unselectAll();
  selectedNodeIds = [];
  updateCreateFlashcardsBtn();
}
function exitFlashcardSelectMode() {
  isSelectingFlashcards = false;
  selectControls.classList.add('hidden');
  createFlashcardsBtn.style.display = '';
  network.unselectAll();
  selectedNodeIds = [];
  updateCreateFlashcardsBtn();
  document.body.classList.remove('hide-corner-btns');
  // 編集フラグをリセット
  window.isEditingFlashcard = false;
  window.editingFlashcardId = null;
}

// Createでサーバー保存し、元の画面に戻る
createSelectBtn.addEventListener('click', async function() {
  if (selectedNodeIds.length < 2) {
    alert('2つ以上の単語を選択してください');
    return;
  }
  
  const nameInput = document.getElementById('flashcard-name');
  const name = nameInput.value.trim() || '新しい単語帳';
  
  // 単語のidリストの作成
  const ids = selectedNodeIds.map(id => Number(id));
  
  if (window.isEditingFlashcard) {
    // 編集モードの場合、PUTリクエストで更新
    const res = await fetch(`/api/flashcards/${window.editingFlashcardId}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, name })
    });
    if (res.ok) {
      const data = await res.json();
      // 更新した単語帳のwordsで学習UIを表示
      flashcards = data.words.map(word => ({ front: word.label, back: word.details }));
      currentCardIndex = 0;
      exitFlashcardSelectMode();
      showFlashcardView();
      // 編集フラグをリセット
      window.isEditingFlashcard = false;
      window.editingFlashcardId = null;
    } else {
      alert('単語帳の更新に失敗しました');
      exitFlashcardSelectMode();
    }
  } else {
    // 新規作成の場合、POSTリクエスト
    const res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, name })
    });
    if (res.ok) {
      const data = await res.json();
      // 保存した単語帳のwordsで学習UIを表示
      flashcards = data.words.map(word => ({ front: word.label, back: word.details }));
      currentCardIndex = 0;
      exitFlashcardSelectMode();
      showFlashcardView();
    } else {
      alert('単語帳の保存に失敗しました');
      exitFlashcardSelectMode();
    }
  }
});
// Cancelで選択解除
cancelSelectBtn.addEventListener('click', function() {
  exitFlashcardSelectMode();
});

// 検索機能
function searchNodes(query) {
  if (!query.trim()) {
    searchResultsArray = [];
    hideSearchResults();
    return;
  }
  
  const searchTerm = query.toLowerCase();
  searchResultsArray = nodes.filter(node => 
    node.label.toLowerCase().includes(searchTerm) ||
    node.details.toLowerCase().includes(searchTerm)
  );
  
  showSearchResults();
}

function showSearchResults() {
  if (searchResultsArray.length === 0) {
    hideSearchResults();
    return;
  }
  
  searchResultsElement.innerHTML = '';
  searchResultsArray.forEach(node => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.innerHTML = `
      <div class="search-result-term">${node.label}</div>
      <div class="search-result-details">${node.details.substring(0, 100)}${node.details.length > 100 ? '...' : ''}</div>
    `;
    resultItem.addEventListener('click', () => {
      focusOnNode(node.id, true);
    });
    searchResultsElement.appendChild(resultItem);
  });
  
  searchResultsElement.classList.remove('hidden');
  clearSearchBtn.classList.remove('hidden');
}

function hideSearchResults() {
  searchResultsElement.classList.add('hidden');
  clearSearchBtn.classList.add('hidden');
}

function focusOnNode(nodeId, hideAfterZoom = false) {
  network.selectNodes([nodeId]);
  const positions = network.getPositions([nodeId]);
  const nodePosition = positions[nodeId];

  if (nodePosition) {
    if (hideAfterZoom) {
      hideSearchResults(); // ズーム開始と同時に非表示
    }
    network.focus(nodeId, {
      scale: 1.5,
      animation: {
        duration: 1000,
        easingFunction: 'easeInOutQuad'
      }
    });
  } else if (hideAfterZoom) {
    hideSearchResults();
  }
}

// Search event listeners
searchInput.addEventListener('input', function() {
  searchNodes(this.value);
});

searchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    if (searchResultsArray.length > 0) {
      // 最初の結果にフォーカス
      focusOnNode(searchResultsArray[0].id, true); // ズーム前に消す
    }
  }
  // Escapeキーや他のキーでは何もしない
});

searchBtn.addEventListener('click', function() {
  if (searchResultsArray.length > 0) {
    focusOnNode(searchResultsArray[0].id, true);
  }
});

clearSearchBtn.addEventListener('click', function() {
  searchInput.value = '';
  // 選択を解除
  network.unselectAll();
});

// --- 初期化 ---
(async function init() {
  await loadData();
  renderNetwork();
  // localStorageにstudyFlashcardがあれば自動でカードUIを表示
  const study = localStorage.getItem('studyFlashcard');
  if (study) {
    try {
      const words = JSON.parse(study);
      if (Array.isArray(words) && words.length > 0) {
        flashcards = words.map(word => ({ front: word.label, back: word.details }));
        currentCardIndex = 0;
        showFlashcardView();
      }
    } catch(e) {}
    localStorage.removeItem('studyFlashcard');
  }

  // localStorageにtestFlashcardがあれば自動でテストUIを表示
  const test = localStorage.getItem('testFlashcard');
  if (test) {
    try {
      const words = JSON.parse(test);
      if (Array.isArray(words) && words.length > 0) {
        flashcards = words.map(word => ({ front: word.label, back: word.details }));
        currentCardIndex = 0;
        generateTestQuestions();
        showTestView();
      }
    } catch(e) {}
    localStorage.removeItem('testFlashcard');
  }

  // localStorageにeditFlashcardがあれば編集モードを開始
  const edit = localStorage.getItem('editFlashcard');
  if (edit) {
    try {
      const editData = JSON.parse(edit);
      if (editData.words && Array.isArray(editData.words) && editData.words.length > 0) {
        // 既存の単語を選択状態にする
        const wordIds = editData.words.map(word => word.id);
        selectedNodeIds = wordIds;
        
        // 選択モードに入る
        enterFlashcardSelectMode();
        
        // 名前を設定
        document.getElementById('flashcard-name').value = editData.name || '編集中の単語帳';
        
        // 編集フラグを設定
        window.isEditingFlashcard = true;
        window.editingFlashcardId = editData.id;
      }
    } catch(e) {}
    localStorage.removeItem('editFlashcard');
  }

  // テスト画面の「パス」ボタンのイベントリスナー
  testPassBtn.addEventListener('click', function() {
    nextTestQuestion();
  });
})(); 