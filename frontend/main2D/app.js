// app.js - マインドマップのメインロジック
// データの読み込み、マインドマップの描画、インタラクションとフラッシュカードの処理

// グローバル状態
let network = null;
let nodes = [];
let edges = [];
let selectedNodeIds = [];
let flashcards = [];
let currentCardIndex = 0;
let isSelectingFlashcards = false;
let testQuestions = []; // テスト問題の配列
let currentTestIndex = 0; // 現在のテスト問題インデックス
let searchResultsArray = []; // 検索結果の配列
let currentSearchIndex = -1; // 現在の検索結果インデックス
let connectedNodesArray = []; // 現在のノードから接続されているノードの配列
let currentConnectedIndex = -1; // 現在の接続ノードインデックス
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
zoomOutBtn.addEventListener('click', function () {
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

// 検索機能用変数
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const clearSearchBtn = document.getElementById('clear-search-btn');
const searchResultsElement = document.getElementById('search-results');

// フラッシュカードスワイプ用変数
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

// --- importance値から色を計算する関数 ---
function getColorFromImportance(importance) {
  // importance値を0～100の範囲にクランプする
  const clampedImportance = Math.max(0, Math.min(100, importance));
  const ratio = clampedImportance / 100;
  // 開始色: オレンジ rgb(180, 120, 60)
  // 終了色: 白 rgb(255, 255, 255)
  const r = Math.round(180 + (75 * ratio));
  const g = Math.round(120 + (135 * ratio));
  const b = Math.round(60 + (195 * ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

// Vis.jsでマインドマップを描画
function renderNetwork() {
  // Vis.js DataSetの準備
  const visNodes = new vis.DataSet(nodes.map(n => ({
    id: n.id,
    // ノードには小さなドットを使用
    shape: 'dot',
    size: 14,
    color: getColorFromImportance(n.importance), // ここをimportanceベースに
    borderWidth: 0,
    // ドット内にラベルは表示しない
    label: '',
    // 外部描画用にラベルを保持
    _externalLabel: n.label
  })));
  const visEdges = new vis.DataSet(edges.map(e => ({
    from: e.from,
    to: e.to,
    length: (e.length || 100) * 3 // データのlength値を2倍に
  })));

  // Vis.jsネットワークのオプション
  const options = {
    physics: {
      stabilization: {
        enabled: true,
        iterations: 10, // グラフのサイズに応じて調整可能
        updateInterval: 25
      },
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.3,
        springLength: function (edge) {
          // length値に基づいてスプリング長を調整
          const length = edge.length || 100;
          // length値をスプリング長に変換 (50-200 → 50-200)
          return Math.max(50, Math.min(200, length));
        },
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0.1
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
      color: { color: '#444' }
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



  network.on('afterDrawing', function () {
    renderExternalLabels(visNodes);
  });

  // エッジホバー時のツールチップ表示
  network.on('hoverEdge', function (params) {
    const edge = edges.find(e =>
      (e.from === params.edge.from && e.to === params.edge.to) ||
      (e.from === params.edge.to && e.to === params.edge.from)
    );
    if (edge && edge.length) {
      showEdgeTooltip(params.event.center.x, params.event.center.y, edge.length); 
    }
  });

  network.on('blurEdge', function (params) {
    hideEdgeTooltip();
  });

  // ノードクリック: 詳細を表示または選択トグル
  network.on('click', function (params) {
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
    } else if (isSelectingFlashcards && params.nodes.length === 0) {
      // 空間クリック時は選択状態を維持
      network.selectNodes(selectedNodeIds);
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
  visNodes.forEach(function (node) {
    const pos = network.getPositions([node.id])[node.id];
    if (pos) {
      // ノード情報を取得
      const nodeData = nodes.find(n => n.id === node.id);
      // importance値から色を取得（なければ白）
      ctx.fillStyle = nodeData && typeof nodeData.importance !== 'undefined' ? getColorFromImportance(nodeData.importance) : '#fff';
      let label = nodeData ? nodeData.label : '';
      // 括弧とその中身を除去（全角・半角両方対応）
      label = label.replace(/\s*\([^)]*\)/g, '').replace(/\s*（[^）]*）/g, '');
      const lines = [label];
      lines.forEach((line, i) => {
        ctx.fillText(line, pos.x, pos.y + 16 + i * 18);
      });
    }
  });
  ctx.restore();
}

// ()があれば2行に分割、なければ1行
function splitLabelByParentheses(label) {
  // Try standard ()
  let openIdx = label.indexOf('(');
  let closeIdx = label.indexOf(')', openIdx);
  if (openIdx !== -1 && closeIdx !== -1 && closeIdx > openIdx) {
    const first = label.slice(0, openIdx).trim();
    const second = label.slice(openIdx, closeIdx + 1).trim();
    return [first, second];
  }
  // Try full-width （）
  openIdx = label.indexOf('（');
  closeIdx = label.indexOf('）', openIdx);
  if (openIdx !== -1 && closeIdx !== -1 && closeIdx > openIdx) {
    const first = label.slice(0, openIdx).trim();
    const second = label.slice(openIdx, closeIdx + 1).trim();
    return [first, second];
  }
  // Otherwise, single line
  return [label];
}

// 日本語・CJK文字を含むか判定
function containsCJK(text) {
  return /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF66-\uFF9F]/.test(text);
}

// 単語単位で折り返し（英語など）
function wrapTextByWord(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// 文字単位で折り返し（日本語・CJKなど）
function wrapTextByChar(ctx, text, maxWidth) {
  const lines = [];
  let currentLine = '';
  for (let i = 0; i < text.length; i++) {
    const testLine = currentLine + text[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = text[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// エッジツールチップを表示
function showEdgeTooltip(x, y, length) {
  // 既存のツールチップを削除
  hideEdgeTooltip();

  const tooltip = document.createElement('div');
  tooltip.id = 'edge-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.left = x + 'px';
  tooltip.style.top = (y - 30) + 'px';
  tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  tooltip.style.color = 'white';
  tooltip.style.padding = '5px 10px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.zIndex = '1000';
  tooltip.textContent = `関係強度: ${length}`;

  document.body.appendChild(tooltip);
}

// エッジツールチップを非表示
function hideEdgeTooltip() {
  const tooltip = document.getElementById('edge-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}

// ノード詳細オーバーレイを表示
function showNodeDetails(nodeId) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;

  // 接続されているノードを取得
  connectedNodesArray = getConnectedNodes(nodeId);
  currentConnectedIndex = -1;

  detailsTitle.textContent = node.label;
  detailsText.textContent = node.details;

  // 既存のナビゲーション要素を削除
  const existingNavigation = detailsOverlay.querySelector('.details-navigation');
  if (existingNavigation) {
    existingNavigation.remove();
  }

  // 接続ノードがある場合はナビゲーションボタンを追加
  if (connectedNodesArray.length > 0) {
    const navigationHtml = `
      <div class="details-navigation">
        <button id="details-prev-btn" class="details-nav-btn">←</button>
        <span id="details-counter" class="details-counter">接続ノード: 0 / ${connectedNodesArray.length}</span>
        <button id="details-next-btn" class="details-nav-btn">→</button>
      </div>
    `;
    detailsText.insertAdjacentHTML('afterend', navigationHtml);

    // ナビゲーションボタンのイベントリスナーを設定
    const prevBtn = document.getElementById('details-prev-btn');
    const nextBtn = document.getElementById('details-next-btn');

    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateConnectedNodes('prev');
    });
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateConnectedNodes('next');
    });

    // ナビゲーション状態を初期化
    updateConnectedNavigation();
  }

  detailsOverlay.classList.remove('hidden');
}

// 接続されているノードを取得
function getConnectedNodes(nodeId) {
  const connectedIds = [];

  // エッジから接続されているノードIDを取得
  edges.forEach(edge => {
    if (edge.from === nodeId) {
      connectedIds.push(edge.to);
    } else if (edge.to === nodeId) {
      connectedIds.push(edge.from);
    }
  });

  // ノード情報を取得
  return nodes.filter(node => connectedIds.includes(node.id));
}

// 接続ノード間をナビゲーション
function navigateConnectedNodes(direction) {
  if (connectedNodesArray.length === 0) return;

  if (direction === 'prev') {
    if (currentConnectedIndex > 0) {
      currentConnectedIndex--;
    } else {
      currentConnectedIndex = connectedNodesArray.length - 1; // 最後にループ
    }
  } else if (direction === 'next') {
    if (currentConnectedIndex < connectedNodesArray.length - 1) {
      currentConnectedIndex++;
    } else {
      currentConnectedIndex = 0; // 最初にループ
    }
  }

  // 選択されたノードにフォーカス
  const selectedNode = connectedNodesArray[currentConnectedIndex];
  if (selectedNode) {
    focusOnNode(selectedNode.id, false);

    // 詳細オーバーレイの内容を更新
    detailsTitle.textContent = selectedNode.label;
    detailsText.textContent = selectedNode.details;

    // ナビゲーション状態を更新
    updateConnectedNavigation();
  }
}

// 接続ノードナビゲーションの状態を更新
function updateConnectedNavigation() {
  const prevBtn = document.getElementById('details-prev-btn');
  const nextBtn = document.getElementById('details-next-btn');
  const counter = document.getElementById('details-counter');

  if (!prevBtn || !nextBtn || !counter) return;

  if (connectedNodesArray.length === 0) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    counter.textContent = '接続ノード: 0 / 0';
    return;
  }

  // ボタンの有効/無効を設定
  prevBtn.disabled = false;
  nextBtn.disabled = false;

  // カウンターを更新
  const current = currentConnectedIndex >= 0 ? currentConnectedIndex + 1 : 0;
  counter.textContent = `接続ノード: ${current} / ${connectedNodesArray.length}`;
}

// 詳細オーバーレイを非表示
function hideNodeDetails() {
  detailsOverlay.classList.add('hidden');
  connectedNodesArray = [];
  currentConnectedIndex = -1;
}

// 「フラッシュカード作成」ボタンの有効/無効を切り替え
function updateCreateFlashcardsBtn() {
  createFlashcardsBtn.disabled = false;
  // 選択された単語リストも更新
  updateSelectedWordsList();
}

function updateSelectedWordsList() {
  const selectedWordsList = document.getElementById('selected-words-list');
  if (!selectedWordsList) {
    return;
  }

  selectedWordsList.innerHTML = '';

  if (selectedNodeIds.length === 0) {
    selectedWordsList.innerHTML = '<p class="no-selection">単語を選択してください</p>';
    return;
  }

  selectedNodeIds.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const wordItem = document.createElement('div');
      wordItem.className = 'selected-word-item';
      wordItem.innerHTML = `
        <span class="word-label">${node.label}</span>
        <button class="remove-word-btn" onclick="removeSelectedWord(${nodeId})">&times;</button>
      `;
      selectedWordsList.appendChild(wordItem);
    }
  });
}

function removeSelectedWord(nodeId) {
  const index = selectedNodeIds.indexOf(nodeId);
  if (index > -1) {
    selectedNodeIds.splice(index, 1);
    // 選択状態を手動で再設定
    network.selectNodes(selectedNodeIds);
    updateCreateFlashcardsBtn();
  }
}

// グローバルスコープで関数を定義
window.removeSelectedWord = removeSelectedWord;

// 選択したノードから単語帳を生成
function createFlashcards() {
  flashcards = selectedNodeIds.map(id => {
    const node = nodes.find(n => n.id === id);
    return node ? { front: node.label, back: node.details } : null;
  }).filter(Boolean);
  currentCardIndex = 0;
  showFlashcardView();
}

// 単語帳ビューを表示
function showFlashcardView() {
  flashcardView.classList.remove('hidden');
  document.getElementById('network').style.display = 'none';
  createFlashcardsBtn.style.display = 'none';
  currentCardIndex = 0;
  renderFlashcard();
  document.getElementById('search-container').classList.add('hidden');
  // 単語帳ビュー表示時にボタンを非表示
  document.body.classList.add('hide-corner-btns');
  const cornerBtnGroup = document.querySelector('.corner-btn-group');
  if (cornerBtnGroup) {
    cornerBtnGroup.classList.remove('visible');
  }
}

// 単語帳ビューを非表示
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
  // 単語帳ビュー非表示時にボタンを再表示
  document.body.classList.remove('hide-corner-btns');
  const cornerBtnGroup = document.querySelector('.corner-btn-group');
  if (cornerBtnGroup) {
    cornerBtnGroup.classList.add('visible');
  }
}

// 現在の単語帳を描画
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

// 単語帳を裏返す
function flipFlashcard() {
  flashcard.classList.toggle('flipped');
}

// スワイプ関数
function handleTouchStart(e) {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  isClick = true; // スワイプ開始時はクリックを無効にする
}

function handleTouchMove(e) {
  e.preventDefault();
}

function handleTouchEnd(e) {
  endX = e.changedTouches[0].clientX;
  endY = e.changedTouches[0].clientY;

  const diffX = startX - endX;
  const diffY = startY - endY;

  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
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

// 次の単語帳を表示
function nextFlashcard() {
  if (currentCardIndex < flashcards.length - 1) {
    currentCardIndex++;
  }
  renderFlashcard();
}

// 前の単語帳を表示
function prevFlashcard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
  }
  renderFlashcard();
}

// --- イベントリスナー ---

// 詳細オーバーレイを閉じる
closeDetailsBtn.addEventListener('click', hideNodeDetails);
// 詳細オーバーレイを外部クリックで閉じる
window.addEventListener('click', function (e) {
  if (e.target === detailsOverlay) {
    // ナビゲーションボタンがクリックされた場合は閉じない
    if (e.target.closest('.details-nav-btn')) {
      return;
    }
    hideNodeDetails();
  }
});

// キーボードショートカット
window.addEventListener('keydown', function (e) {
  // 詳細オーバーレイが表示されている場合
  if (!detailsOverlay.classList.contains('hidden')) {
    if (e.key === 'ArrowLeft' && connectedNodesArray.length > 0) {
      e.preventDefault();
      navigateConnectedNodes('prev');
    } else if (e.key === 'ArrowRight' && connectedNodesArray.length > 0) {
      e.preventDefault();
      navigateConnectedNodes('next');
    } else if (e.key === 'Escape') {
      hideNodeDetails();
    }
  }
});

// 選択したノードから単語帳を生成
createFlashcardsBtn.addEventListener('click', function () {
  enterFlashcardSelectMode();
});

// 単語帳コントロール
let isClick = false; // クリックとスワイプを区別するためのフラグ

flashcard.addEventListener('click', function (e) {
  if (!isClick) {
    flipFlashcard();
  }
});
flipCardBtn.addEventListener('click', flipFlashcard);
nextCardBtn.addEventListener('click', nextFlashcard);
prevCardBtn.addEventListener('click', prevFlashcard);
backToMapBtn.addEventListener('click', function () {
  // 単語帳一覧画面に遷移
  window.location.href = '../flashcard/flashcards.html';
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
  generateTestQuestions();
  renderTestQuestion();
  document.getElementById('search-container').classList.add('hidden');
  // テストモード表示時にボタンを非表示
  document.body.classList.add('hide-corner-btns');
  const cornerBtnGroup = document.querySelector('.corner-btn-group');
  if (cornerBtnGroup) {
    cornerBtnGroup.classList.remove('visible');
  }
}

function hideTestView() {
  // 直接単語帳一覧画面に遷移（一瞬の画面切り替えを避ける）
  window.location.href = '../flashcard/flashcards.html';
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
    option.addEventListener('click', function () {
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
        <button id="back-to-cards" class="result-btn back-btn">← 単語帳一覧に戻る</button>
      </div>
    </div>
  `;

  document.getElementById('retry-test').addEventListener('click', function () {
    currentTestIndex = 0;
    generateTestQuestions();
    renderTestQuestion();
  });

  document.getElementById('back-to-cards').addEventListener('click', function () {
    hideTestView();
  });
}



// テストコントロール
testNextBtn.addEventListener('click', nextTestQuestion);
backFromTestBtn.addEventListener('click', hideTestView);

// スワイプイベントリスナー
flashcard.addEventListener('touchstart', handleTouchStart, { passive: false });
flashcard.addEventListener('touchmove', handleTouchMove, { passive: false });
flashcard.addEventListener('touchend', handleTouchEnd, { passive: false });

// マウスイベントも追加（デスクトップ対応）
let isMouseDown = false;

flashcard.addEventListener('mousedown', function (e) {
  e.preventDefault();
  startX = e.clientX;
  startY = e.clientY;
  isMouseDown = true;
  isClick = true; // スワイプ開始時はクリックを無効にする
});

flashcard.addEventListener('mousemove', function (e) {
  if (!isMouseDown) return;
  e.preventDefault();
});

flashcard.addEventListener('mouseup', function (e) {
  if (!isMouseDown) return;

  endX = e.clientX;
  endY = e.clientY;
  isMouseDown = false;

  const diffX = startX - endX;
  const diffY = startY - endY;

  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
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
document.addEventListener('mouseup', function () {
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

  if (selectControls) {
    selectControls.classList.remove('hidden');
  }

  if (createFlashcardsBtn) {
    createFlashcardsBtn.style.display = 'none';
  }

  document.body.classList.add('hide-corner-btns');
  const cornerBtnGroup = document.querySelector('.corner-btn-group');
  if (cornerBtnGroup) {
    cornerBtnGroup.classList.remove('visible');
  }
  // 編集モードでない場合のみリセット
  if (!window.isEditingFlashcard) {
    // 名前入力をリセット
    const nameInput = document.getElementById('flashcard-name');
    if (nameInput) {
      nameInput.value = '';
    }
    // ノード選択解除
    network.unselectAll();
    selectedNodeIds = [];
  }

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
  const cornerBtnGroup = document.querySelector('.corner-btn-group');
  if (cornerBtnGroup) {
    cornerBtnGroup.classList.add('visible');
  }
  // 編集フラグをリセット
  window.isEditingFlashcard = false;
  window.editingFlashcardId = null;
}

// Createでサーバー保存し、元の画面に戻る
createSelectBtn.addEventListener('click', async function () {
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
      // 単語帳一覧画面に遷移
      window.location.href = '../flashcard/flashcards.html';
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
      // 単語帳一覧画面に遷移
      window.location.href = '../flashcard/flashcards.html';
    } else {
      alert('単語帳の保存に失敗しました');
      exitFlashcardSelectMode();
    }
  }
});
// Cancelで選択解除
cancelSelectBtn.addEventListener('click', function () {
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

  // ナビゲーションボタンを追加
  const navigationContainer = document.createElement('div');
  navigationContainer.className = 'search-navigation';
  navigationContainer.innerHTML = `
    <button id="search-prev-btn" class="search-nav-btn" disabled>←</button>
    <span id="search-counter" class="search-counter">0 / 0</span>
    <button id="search-next-btn" class="search-nav-btn" disabled>→</button>
  `;
  searchResultsElement.appendChild(navigationContainer);

  // 検索結果を表示
  searchResultsArray.forEach((node, index) => {
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

  // ナビゲーションボタンのイベントリスナーを設定
  const prevBtn = document.getElementById('search-prev-btn');
  const nextBtn = document.getElementById('search-next-btn');
  const counter = document.getElementById('search-counter');

  prevBtn.addEventListener('click', () => navigateSearchResults('prev'));
  nextBtn.addEventListener('click', () => navigateSearchResults('next'));

  // 初期状態を設定
  currentSearchIndex = -1;
  updateSearchNavigation();

  searchResultsElement.classList.remove('hidden');
  clearSearchBtn.classList.remove('hidden');
}

function navigateSearchResults(direction) {
  if (searchResultsArray.length === 0) return;

  if (direction === 'prev') {
    if (currentSearchIndex > 0) {
      currentSearchIndex--;
    } else {
      currentSearchIndex = searchResultsArray.length - 1; // 最後にループ
    }
  } else if (direction === 'next') {
    if (currentSearchIndex < searchResultsArray.length - 1) {
      currentSearchIndex++;
    } else {
      currentSearchIndex = 0; // 最初にループ
    }
  }

  // 選択されたノードにフォーカス
  const selectedNode = searchResultsArray[currentSearchIndex];
  if (selectedNode) {
    focusOnNode(selectedNode.id, false);
    updateSearchNavigation();
  }
}

function updateSearchNavigation() {
  const prevBtn = document.getElementById('search-prev-btn');
  const nextBtn = document.getElementById('search-next-btn');
  const counter = document.getElementById('search-counter');

  if (searchResultsArray.length === 0) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    counter.textContent = '0 / 0';
    return;
  }

  // ボタンの有効/無効を設定
  prevBtn.disabled = false;
  nextBtn.disabled = false;

  // カウンターを更新
  const current = currentSearchIndex >= 0 ? currentSearchIndex + 1 : 0;
  counter.textContent = `${current} / ${searchResultsArray.length}`;

  // 検索結果アイテムのハイライトを更新
  const resultItems = searchResultsElement.querySelectorAll('.search-result-item');
  resultItems.forEach((item, index) => {
    item.classList.remove('selected');
    if (index === currentSearchIndex) {
      item.classList.add('selected');
    }
  });
}

function hideSearchResults() {
  searchResultsElement.classList.add('hidden');
  clearSearchBtn.classList.add('hidden');
  currentSearchIndex = -1;
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
searchInput.addEventListener('input', function () {
  searchNodes(this.value);
});

searchInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    if (searchResultsArray.length > 0) {
      // 最初の結果にフォーカス
      currentSearchIndex = 0;
      focusOnNode(searchResultsArray[0].id, true);
      updateSearchNavigation();
    }
  } else if (e.key === 'ArrowLeft' && searchResultsArray.length > 0) {
    e.preventDefault();
    navigateSearchResults('prev');
  } else if (e.key === 'ArrowRight' && searchResultsArray.length > 0) {
    e.preventDefault();
    navigateSearchResults('next');
  }
});

searchBtn.addEventListener('click', function () {
  if (searchResultsArray.length > 0) {
    currentSearchIndex = 0;
    focusOnNode(searchResultsArray[0].id, true);
    updateSearchNavigation();
  }
});

clearSearchBtn.addEventListener('click', function () {
  searchInput.value = '';
  // 選択を解除
  network.unselectAll();
  hideSearchResults();
});

// 単語追加機能
const addWordInput = document.getElementById('add-word-input');
const addWordSuggestions = document.getElementById('add-word-suggestions');

if (addWordInput) {
  addWordInput.addEventListener('input', function () {
    const query = this.value.trim();
    if (!query) {
      addWordSuggestions.classList.add('hidden');
      return;
    }

    const suggestions = nodes.filter(node =>
      node.label.toLowerCase().includes(query.toLowerCase()) &&
      !selectedNodeIds.includes(node.id)
    ).slice(0, 5);

    if (suggestions.length > 0) {
      addWordSuggestions.innerHTML = '';
      suggestions.forEach(node => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = node.label;
        suggestionItem.addEventListener('click', () => {
          if (!selectedNodeIds.includes(node.id)) {
            selectedNodeIds.push(node.id);
            network.selectNodes([node.id]);
            updateCreateFlashcardsBtn();
          }
          addWordInput.value = '';
          addWordSuggestions.classList.add('hidden');
        });
        addWordSuggestions.appendChild(suggestionItem);
      });
      addWordSuggestions.classList.remove('hidden');
    } else {
      addWordSuggestions.classList.add('hidden');
    }
  });

  // フォーカスアウト時に候補を非表示
  addWordInput.addEventListener('blur', function () {
    setTimeout(() => {
      addWordSuggestions.classList.add('hidden');
    }, 200);
  });
}

// --- 初期化 ---
(async function init() {



  await loadData();
  renderNetwork();

  // Get the loading overlay
  const loadingOverlay = document.getElementById('loading-overlay');

  // localStorageにstudyFlashcardがあれば自動で単語帳UIを表示
  const study = localStorage.getItem('studyFlashcard');
  if (study) {
    try {
      const words = JSON.parse(study);
      if (Array.isArray(words) && words.length > 0) {
        flashcards = words.map(word => ({ front: word.label, back: word.details }));
        currentCardIndex = 0;
        showFlashcardView();
      }
    } catch (e) { }
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
    } catch (e) { }
    localStorage.removeItem('testFlashcard');
  }

  // localStorageにeditFlashcardがあれば編集モードを開始
  const edit = localStorage.getItem('editFlashcard');
  if (edit) {
    try {
      const editData = JSON.parse(edit);

      if (editData.words && Array.isArray(editData.words) && editData.words.length > 0) {

        // 編集フラグをenterFlashcardSelectMode前にセット
        window.isEditingFlashcard = true;
        window.editingFlashcardId = editData.id;

        // 既存の単語を選択状態にする
        const wordIds = editData.words.map(word => word.id);
        selectedNodeIds = wordIds;

        // 選択モードに入る
        enterFlashcardSelectMode();
        // 名前を設定
        const nameInput = document.getElementById('flashcard-name');
        if (nameInput) {
          nameInput.value = editData.name || '編集中の単語帳';
        }

        // 選択された単語リストを更新
        updateSelectedWordsList();

        // 選択されたノードを視覚的にハイライト
        setTimeout(() => {
          if (network) {
            network.selectNodes(wordIds);
          }
        }, 1000);
      }
    } catch (e) {
    }
    localStorage.removeItem('editFlashcard');
  }

  // テスト画面の「パス」ボタンのイベントリスナー
  testPassBtn.addEventListener('click', function () {
    nextTestQuestion();
  });

  // --- 単語帳モードまたはテストモードまたは選択モードでない場合はコーナーボタンを表示する ---
  const flashcardViewElem = document.getElementById('flashcard-view');
  const testViewElem = document.getElementById('test-view');
  const selectControlsElem = document.getElementById('flashcard-select-controls');
  const cornerBtnGroup = document.querySelector('.corner-btn-group');

  if (
    (!flashcardViewElem || flashcardViewElem.classList.contains('hidden')) &&
    (!testViewElem || testViewElem.classList.contains('hidden')) &&
    (selectControlsElem && selectControlsElem.classList.contains('hidden'))
  ) {
    document.body.classList.remove('hide-corner-btns');
    if (cornerBtnGroup) {
      cornerBtnGroup.classList.add('visible');
    }
  }

  // Hide the loading overlay after everything is set up
  if (loadingOverlay) {
    // Small delay to ensure smooth transition
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
    }, 100);
  }


})(); 