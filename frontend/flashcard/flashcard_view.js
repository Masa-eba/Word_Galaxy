// flashcard_view.js - スタンドアロンのフラッシュカード/テスト表示ロジック

document.addEventListener('DOMContentLoaded', () => {
  // DOM要素
  const flashcardView = document.getElementById('flashcard-view');
  const flashcard = document.getElementById('flashcard');
  const cardTitle = document.querySelector('.card-title');
  const cardDescription = document.querySelector('.card-description');
  const cardHint = document.querySelector('.card-hint');
  const prevCardBtn = document.getElementById('prev-card');
  const nextCardBtn = document.getElementById('next-card');
  const flipCardBtn = document.getElementById('flip-card');
  const backToMapBtn = document.getElementById('back-to-map');
  const currentCardNumber = document.getElementById('current-card-number');
  const totalCards = document.getElementById('total-cards');
  const progressFill = document.querySelector('.progress-fill');

  // テスト表示要素
  const testView = document.getElementById('test-view');
  const testQuestionText = document.getElementById('test-question-text');
  const testOptions = document.getElementById('test-options');
  const testNextBtn = document.getElementById('test-next-btn');
  const backFromTestBtn = document.getElementById('back-from-test');
  const testCurrentNumber = document.getElementById('test-current-number');
  const testTotalQuestions = document.getElementById('test-total-questions');
  const testProgressFill = document.querySelector('.test-progress-fill');
  const testPassBtn = document.getElementById('test-pass-btn');

  // 状態
  let flashcards = [];
  let currentCardIndex = 0;
  let testQuestions = [];
  let currentTestIndex = 0;

  // localStorageから読み込み
  function loadFlashcardData() {
    let study = localStorage.getItem('studyFlashcard');
    let test = localStorage.getItem('testFlashcard');
    let edit = localStorage.getItem('editFlashcard');
    if (study) {
      try {
        const words = JSON.parse(study);
        if (Array.isArray(words) && words.length > 0) {
          flashcards = words.map(word => ({ front: word.label, back: word.details }));
          currentCardIndex = 0;
          showFlashcardView();
        }
      } catch (e) {}
      localStorage.removeItem('studyFlashcard');
      return;
    }
    if (test) {
      try {
        const words = JSON.parse(test);
        if (Array.isArray(words) && words.length > 0) {
          flashcards = words.map(word => ({ front: word.label, back: word.details }));
          currentCardIndex = 0;
          generateTestQuestions().then(() => {
            showTestView();
          });
        }
      } catch (e) {}
      localStorage.removeItem('testFlashcard');
      return;
    }
    if (edit) {
      try {
        const editData = JSON.parse(edit);
        if (editData.words && Array.isArray(editData.words) && editData.words.length > 0) {
          flashcards = editData.words.map(word => ({ front: word.label, back: word.details }));
          currentCardIndex = 0;
          showFlashcardView();
        }
      } catch (e) {}
      localStorage.removeItem('editFlashcard');
      return;
    }
    // 何も見つからない場合、空で表示
    flashcards = [];
    showFlashcardView();
  }

  // フラッシュカード表示ロジック
  function showFlashcardView() {
    flashcardView.classList.remove('hidden');
    testView.classList.add('hidden');
    renderFlashcard();
  }

  function renderFlashcard() {
    if (!flashcards.length) {
      cardTitle.textContent = '';
      cardDescription.textContent = '';
      cardHint.textContent = '単語帳がありません';
      currentCardNumber.textContent = '0';
      totalCards.textContent = '0';
      progressFill.style.width = '0%';
      return;
    }
    const card = flashcards[currentCardIndex];
    cardTitle.textContent = card.front;
    cardDescription.textContent = card.back;
    cardHint.textContent = 'タップして裏面を見る';
    // カード裏面からサブタイトル表示を削除（HTMLで処理）
    const cardBack = flashcard.querySelector('.card-back .card-content');
    if (cardBack) {
      // サブタイトルが存在する場合は削除
      const subtitle = cardBack.querySelector('.card-subtitle');
      if (subtitle) subtitle.remove();
    }
    flashcard.classList.remove('flipped');
    currentCardNumber.textContent = currentCardIndex + 1;
    totalCards.textContent = flashcards.length;
    const progress = ((currentCardIndex + 1) / flashcards.length) * 100;
    progressFill.style.width = progress + '%';
  }

  function flipFlashcard() {
    flashcard.classList.toggle('flipped');
  }

  function nextFlashcard() {
    if (currentCardIndex < flashcards.length - 1) {
      currentCardIndex++;
      renderFlashcard();
    }
  }

  function prevFlashcard() {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      renderFlashcard();
    }
  }

  // イベントリスナー
  if (flashcard) {
    flashcard.addEventListener('click', function () {
      flipFlashcard();
    });
  }
  if (flipCardBtn) flipCardBtn.addEventListener('click', flipFlashcard);
  if (nextCardBtn) nextCardBtn.addEventListener('click', nextFlashcard);
  if (prevCardBtn) prevCardBtn.addEventListener('click', prevFlashcard);
  if (backToMapBtn) backToMapBtn.addEventListener('click', function () {
    window.location.href = 'flashcard_menu.html';
  });

  // テストモードロジック
  async function generateTestQuestions() {
    testQuestions = [];
    const shuffledCards = [...flashcards].sort(() => Math.random() - 0.5);
    
    // data.jsonから全ノードの詳細を取得
    let allNodes = [];
    try {
      const response = await fetch('/api/data');
      const data = await response.json();
      allNodes = data.nodes || [];
    } catch (error) {
      console.error('Failed to load data.json:', error);
      // フォールバック: 単語帳内の他の単語を使用
      allNodes = shuffledCards.map(card => ({ details: card.back }));
    }
    
    shuffledCards.forEach(card => {
      const correctAnswer = card.back;
      // data.jsonから正解以外の単語をランダムに選んで偽回答を作成
      const wrongAnswers = allNodes
        .filter(node => node.details !== correctAnswer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(node => node.details);
      
      const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      testQuestions.push({
        question: card.front,
        correctAnswer,
        options,
        userAnswer: null,
        isCorrect: false
      });
    });
  }

  async function showTestView() {
    testView.classList.remove('hidden');
    flashcardView.classList.add('hidden');
    currentTestIndex = 0;
    await generateTestQuestions();
    renderTestQuestion();
  }

  function renderTestQuestion() {
    if (!testQuestions.length) return;
    const q = testQuestions[currentTestIndex];
    testQuestionText.textContent = q.question;
    testOptions.innerHTML = q.options.map((opt, i) => `<div class="test-option" data-index="${i}">${opt}</div>`).join('');
    testCurrentNumber.textContent = currentTestIndex + 1;
    testTotalQuestions.textContent = testQuestions.length;
    const progress = ((currentTestIndex + 1) / testQuestions.length) * 100;
    testProgressFill.style.width = progress + '%';
    testNextBtn.disabled = true;
    // オプションクリック
    testOptions.querySelectorAll('.test-option').forEach((el, i) => {
      el.addEventListener('click', () => {
        selectTestOption(i);
      });
    });
  }

  function selectTestOption(idx) {
    const q = testQuestions[currentTestIndex];
    q.userAnswer = q.options[idx];
    q.isCorrect = q.userAnswer === q.correctAnswer;
    // スタイル
    testOptions.querySelectorAll('.test-option').forEach((el, i) => {
      el.classList.remove('selected', 'correct', 'incorrect');
      if (i === idx) {
        el.classList.add('selected');
        if (q.isCorrect) el.classList.add('correct');
        else el.classList.add('incorrect');
      } else if (q.options[i] === q.correctAnswer) {
        el.classList.add('correct');
      }
    });
    testNextBtn.disabled = false;
  }

  function nextTestQuestion() {
    if (currentTestIndex < testQuestions.length - 1) {
      currentTestIndex++;
      renderTestQuestion();
    } else {
      showTestResults();
    }
  }

  function showTestResults() {
    // テストコントロールとプログレスバーを非表示
    const testControls = document.querySelector('.test-controls');
    const testProgressBar = document.querySelector('.test-progress-bar');
    if (testControls) testControls.style.display = 'none';
    if (testProgressBar) testProgressBar.style.display = 'none';

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
          <button id="retry-test" class="result-btn">再テスト</button>
          <button id="back-to-cards" class="result-btn">単語帳一覧に戻る</button>
        </div>
      </div>
    `;
    document.getElementById('retry-test').addEventListener('click', async () => {
      // コントロールとプログレスバーを復元
      if (testControls) testControls.style.display = '';
      if (testProgressBar) testProgressBar.style.display = '';
      currentTestIndex = 0;
      await generateTestQuestions();
      renderTestQuestion();
    });
    document.getElementById('back-to-cards').addEventListener('click', () => {
      window.location.href = 'flashcard_menu.html';
    });
  }

  if (testNextBtn) testNextBtn.addEventListener('click', nextTestQuestion);
  if (backFromTestBtn) backFromTestBtn.addEventListener('click', () => {
    window.location.href = 'flashcard_menu.html';
  });
  if (testPassBtn) testPassBtn.addEventListener('click', nextTestQuestion);

  // 開始
  loadFlashcardData();
}); 