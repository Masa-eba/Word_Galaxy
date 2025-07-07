// app.js - Main logic for CS Concepts Mind Map
// Loads data, renders mind map, handles interactions and flashcards

// Global state
let network = null;
let nodes = [];
let edges = [];
let selectedNodeIds = [];
let flashcards = [];
let currentCardIndex = 0;
let isSelectingFlashcards = false;

// DOM elements
const detailsOverlay = document.getElementById('details-overlay');
const detailsTitle = document.getElementById('details-title');
const detailsText = document.getElementById('details-text');
const closeDetailsBtn = document.getElementById('close-details');
const createFlashcardsBtn = document.getElementById('create-flashcards');
const flashcardView = document.getElementById('flashcard-view');
const flashcard = document.getElementById('flashcard');
const cardFront = document.querySelector('.card-front');
const cardBack = document.querySelector('.card-back');
const prevCardBtn = document.getElementById('prev-card');
const nextCardBtn = document.getElementById('next-card');
const backToMapBtn = document.getElementById('back-to-map');
const selectControls = document.getElementById('flashcard-select-controls');
const createSelectBtn = document.getElementById('create-flashcard-select');
const cancelSelectBtn = document.getElementById('cancel-flashcard-select');

// Fetch data from backend API
async function loadData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  nodes = data.nodes;
  edges = data.edges;
}

// Render the mind map using Vis.js
function renderNetwork() {
  // Prepare Vis.js DataSets
  const visNodes = new vis.DataSet(nodes.map(n => ({
    id: n.id,
    // Use a small dot for the node
    shape: 'dot',
    size: 14, // small dot
    color: '#f7c873',
    borderWidth: 0,
    // No label inside the dot
    label: '',
    // Store the label for external rendering
    _externalLabel: n.label
  })));
  const visEdges = new vis.DataSet(edges.map(e => ({
    from: e.from,
    to: e.to
    // No label for edges
  })));

  // Vis.js network options
  const options = {
    physics: { stabilization: false },
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

  // Create the network
  const container = document.getElementById('network');
  network = new vis.Network(container, { nodes: visNodes, edges: visEdges }, options);

  // Render external labels after network is stabilized
  network.once('stabilized', function() {
    renderExternalLabels(visNodes);
  });
  network.on('afterDrawing', function() {
    renderExternalLabels(visNodes);
  });

  // Node click: show details
  network.on('click', function(params) {
    if (params.nodes.length === 1) {
      if (!isSelectingFlashcards) {
        const nodeId = params.nodes[0];
        showNodeDetails(nodeId);
      }
    }
  });

  // Node select: handle multi-select
  network.on('selectNode', function(params) {
    if (isSelectingFlashcards) {
      selectedNodeIds = params.nodes;
      updateCreateFlashcardsBtn();
    }
  });
  network.on('deselectNode', function(params) {
    if (isSelectingFlashcards) {
      selectedNodeIds = params.nodes;
      updateCreateFlashcardsBtn();
    }
  });
}

// Render labels outside the dots
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

// Show node details overlay
function showNodeDetails(nodeId) {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return;
  detailsTitle.textContent = node.label;
  detailsText.textContent = node.details;
  detailsOverlay.classList.remove('hidden');
}

// Hide details overlay
function hideNodeDetails() {
  detailsOverlay.classList.add('hidden');
}

// Enable/disable Create Flashcards button
function updateCreateFlashcardsBtn() {
  createFlashcardsBtn.disabled = false;
}

// Generate flashcards from selected nodes
function createFlashcards() {
  flashcards = selectedNodeIds.map(id => {
    const node = nodes.find(n => n.id === id);
    return node ? { front: node.label, back: node.details } : null;
  }).filter(Boolean);
  currentCardIndex = 0;
  showFlashcardView();
}

// Show flashcard view
function showFlashcardView() {
  flashcardView.classList.remove('hidden');
  document.getElementById('network').style.display = 'none';
  createFlashcardsBtn.style.display = 'none';
  renderFlashcard();
}

// Hide flashcard view
function hideFlashcardView() {
  flashcardView.classList.add('hidden');
  document.getElementById('network').style.display = '';
  createFlashcardsBtn.style.display = '';
  // Deselect all nodes when returning
  network.unselectAll();
  selectedNodeIds = [];
  updateCreateFlashcardsBtn();
}

// Render the current flashcard
function renderFlashcard() {
  if (!flashcards.length) return;
  cardFront.textContent = flashcards[currentCardIndex].front;
  cardBack.textContent = flashcards[currentCardIndex].back;
  flashcard.classList.remove('flipped');
}

// Flip the flashcard
function flipFlashcard() {
  flashcard.classList.toggle('flipped');
}

// Show next flashcard
function nextFlashcard() {
  if (currentCardIndex < flashcards.length - 1) {
    currentCardIndex++;
    renderFlashcard();
  }
}

// Show previous flashcard
function prevFlashcard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    renderFlashcard();
  }
}

// --- Event Listeners ---

// Close details overlay
closeDetailsBtn.addEventListener('click', hideNodeDetails);
// Hide details overlay on outside click
window.addEventListener('click', function(e) {
  if (e.target === detailsOverlay) hideNodeDetails();
});

// Create flashcards from selected nodes
createFlashcardsBtn.addEventListener('click', function() {
  enterFlashcardSelectMode();
});

// Flashcard controls
flashcard.addEventListener('click', flipFlashcard);
nextCardBtn.addEventListener('click', nextFlashcard);
prevCardBtn.addEventListener('click', prevFlashcard);
backToMapBtn.addEventListener('click', hideFlashcardView);

// 選択モードの切り替え
function enterFlashcardSelectMode() {
  isSelectingFlashcards = true;
  selectControls.classList.remove('hidden');
  createFlashcardsBtn.style.display = 'none';
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
}

// Createでサーバー保存し、元の画面に戻る
createSelectBtn.addEventListener('click', async function() {
  if (selectedNodeIds.length < 2) {
    alert('2つ以上の単語を選択してください');
    return;
  }
  // 単語のidリストの作成
  const ids = selectedNodeIds.map(id => Number(id));
  // 送信
  const res = await fetch('/api/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (res.ok) {
    const data = await res.json();
    alert('単語帳を保存しました: ' + data.name);
  } else {
    alert('単語帳の保存に失敗しました');
  }
  // 送信が終わってから選択モード終了
  exitFlashcardSelectMode();
});
// Cancelで選択解除
cancelSelectBtn.addEventListener('click', function() {
  exitFlashcardSelectMode();
});

// --- Initialize app ---
(async function init() {
  await loadData();
  renderNetwork();
})(); 