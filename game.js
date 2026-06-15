const ranks = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const suits = ["♣", "♥", "♠", "♦"];

// Truco Mineiro com manilhas fixas:
// 4♣ (Zap) > 7♥ > A♠ > 7♦ > 3 > 2 > A > K > J > Q > 7 > 6 > 5 > 4
// Observação: as cartas que são manilhas recebem força especial e ficam acima de todas as outras.
const rankPower = {
  "4": 1,
  "5": 2,
  "6": 3,
  "7": 4,
  "Q": 5,
  "J": 6,
  "K": 7,
  "A": 8,
  "2": 9,
  "3": 10
};

function getCardPower(rank, suit) {
  if (rank === "4" && suit === "♣") return 14; // Zap
  if (rank === "7" && suit === "♥") return 13; // 7 de copas
  if (rank === "A" && suit === "♠") return 12; // Espadilha
  if (rank === "7" && suit === "♦") return 11; // 7 de ouros
  return rankPower[rank];
}

let playerScore = 0;
let aiScore = 0;
let handValue = 1;
let round = 1;
let playerHand = [];
let aiHand = [];
let playerPlayed = null;
let aiPlayed = null;
let roundWins = [];
let gameActive = false;
let waitingAi = false;

const el = (id) => document.getElementById(id);

function makeDeck() {
  const deck = [];
  for (const rank of ranks) {
    for (const suit of suits) deck.push({ rank, suit, power: getCardPower(rank, suit) });
  }
  return deck.sort(() => Math.random() - 0.5);
}

function cardHTML(card) {
  return `<div>${card.rank}</div><small>${card.suit}</small>`;
}

function updateUI(msg = "") {
  el("playerScore").textContent = playerScore;
  el("aiScore").textContent = aiScore;
  el("handValue").textContent = `Vale ${handValue}`;
  el("roundInfo").textContent = `Rodada ${round}/3`;
  el("aiCardsCount").textContent = `Cartas da IA: ${aiHand.length}`;
  el("message").textContent = msg;

  el("playerPlayed").className = playerPlayed ? "card" : "card back";
  el("playerPlayed").innerHTML = playerPlayed ? cardHTML(playerPlayed) : "?";
  el("aiPlayed").className = aiPlayed ? "card" : "card back";
  el("aiPlayed").innerHTML = aiPlayed ? cardHTML(aiPlayed) : "?";

  const hand = el("playerHand");
  hand.innerHTML = "";
  playerHand.forEach((card, index) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = cardHTML(card);
    div.onclick = () => playCard(index);
    if (waitingAi) div.classList.add("disabled");
    hand.appendChild(div);
  });

  el("trucoBtn").disabled = !gameActive || waitingAi || handValue >= 12;
  el("runBtn").disabled = !gameActive || waitingAi;
}

function newHand() {
  if (playerScore >= 12 || aiScore >= 12) {
    playerScore = 0; aiScore = 0;
  }
  const deck = makeDeck();
  playerHand = deck.splice(0, 3);
  aiHand = deck.splice(0, 3);
  handValue = (playerScore === 11 || aiScore === 11) ? 3 : 1;
  round = 1;
  roundWins = [];
  playerPlayed = null;
  aiPlayed = null;
  gameActive = true;
  waitingAi = false;
  updateUI(handValue === 3 ? "Mão de 11: vale 3. Jogue ou corra." : "Escolha uma carta para jogar.");
}

function playCard(index) {
  if (!gameActive || waitingAi) return;

  playerPlayed = playerHand.splice(index, 1)[0];
  aiPlayed = null;
  waitingAi = true;

  updateUI(`Você jogou ${playerPlayed.rank}${playerPlayed.suit}. Aguardando a IA...`);

  setTimeout(() => {
    if (!gameActive) return;
    aiPlayed = chooseAiCard();
    updateUI(`IA jogou ${aiPlayed.rank}${aiPlayed.suit}. Comparando cartas...`);

    setTimeout(() => {
      waitingAi = false;
      resolveRound();
    }, 900);
  }, 1300);
}

function chooseAiCard() {
  // IA simples: joga uma carta fraca quando puder, guarda carta forte para depois.
  aiHand.sort((a, b) => a.power - b.power);
  let selectedIndex = 0;
  if (playerPlayed) {
    const winningIndex = aiHand.findIndex(c => c.power > playerPlayed.power);
    selectedIndex = winningIndex >= 0 ? winningIndex : 0;
  }
  return aiHand.splice(selectedIndex, 1)[0];
}

function resolveRound() {
  let result;
  if (playerPlayed.power > aiPlayed.power) result = "player";
  else if (aiPlayed.power > playerPlayed.power) result = "ai";
  else result = "draw";

  roundWins.push(result);
  let msg = result === "player" ? "Você ganhou a rodada." : result === "ai" ? "IA ganhou a rodada." : "Rodada empatou.";

  const handWinner = checkHandWinner();
  if (handWinner) return finishHand(handWinner, msg);

  round++;
  playerPlayed = null;
  aiPlayed = null;
  updateUI(`${msg} Agora escolha outra carta.`);
}

function checkHandWinner() {
  const p = roundWins.filter(x => x === "player").length;
  const a = roundWins.filter(x => x === "ai").length;
  if (p >= 2) return "player";
  if (a >= 2) return "ai";
  if (roundWins.length === 3) {
    if (p > a) return "player";
    if (a > p) return "ai";
    const firstWinner = roundWins.find(x => x !== "draw");
    if (firstWinner) return firstWinner;
    return "none";
  }
  return null;
}

function finishHand(winner, prefix) {
  gameActive = false;
  waitingAi = false;
  if (winner === "player") {
    playerScore += handValue;
    prefix += ` Você fez ${handValue} ponto(s).`;
  } else if (winner === "ai") {
    aiScore += handValue;
    prefix += ` IA fez ${handValue} ponto(s).`;
  } else {
    prefix += " As 3 rodadas empataram. Ninguém pontua.";
  }

  if (playerScore >= 12) prefix += " Você ganhou o jogo!";
  if (aiScore >= 12) prefix += " IA ganhou o jogo!";
  updateUI(prefix + " Clique em Nova mão.");
}

function askTruco() {
  if (!gameActive || handValue >= 12) return;
  const next = handValue === 1 ? 3 : handValue + 3;
  // IA aceita mais quando tem cartas fortes.
  const avg = aiHand.reduce((s, c) => s + c.power, 0) / Math.max(aiHand.length, 1);
  if (avg >= 6 || Math.random() > 0.35) {
    handValue = next;
    updateUI(`Você pediu truco. IA aceitou! Agora vale ${handValue}.`);
  } else {
    gameActive = false;
    waitingAi = false;
    playerScore += handValue;
    updateUI(`Você pediu truco. IA correu. Você ganhou ${handValue} ponto(s).`);
  }
}

function run() {
  if (!gameActive) return;
  gameActive = false;
  waitingAi = false;
  aiScore += handValue;
  updateUI(`Você correu. IA ganhou ${handValue} ponto(s). Clique em Nova mão.`);
}

el("newHandBtn").onclick = newHand;
el("trucoBtn").onclick = askTruco;
el("runBtn").onclick = run;
updateUI("Clique em Nova mão para começar.");
