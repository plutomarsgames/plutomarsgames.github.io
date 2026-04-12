import { db, doc, setDoc, onSnapshot } from "./firebase.js";

let playerName = "";
let playerRole = "";
let myTurn = false;
let botTimerStarted = false;
let gameEnded = false;

function startGame() {
  const name = document.getElementById("username").value;
  if (!name) return alert("Enter username");

  playerName = name;

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  initGame();
}

async function initGame() {
  const gameRef = doc(db, "games", "room1");

  onSnapshot(gameRef, async (snap) => {
    let data = snap.data();

    // Reset if broken or finished
    if (!data || data.winner || !data.boxes) {
      await setDoc(gameRef, {
        boxes: Array(25).fill(null),
        coins: generateCoins(),
        players: {},
        turn: "player1",
        scores: { player1: 0, player2: 0 },
        winner: ""
      });
      botTimerStarted = false;
      gameEnded = false;
      return;
    }

    // Assign players
    if (!data.players.player1) {
      playerRole = "player1";
      await setDoc(gameRef, {
        players: { ...data.players, player1: playerName }
      }, { merge: true });

      startBotTimer();

    } else if (!data.players.player2 && data.players.player1 !== playerName) {
      playerRole = "player2";
      await setDoc(gameRef, {
        players: { ...data.players, player2: playerName }
      }, { merge: true });

    } else {
      if (data.players.player1 === playerName) playerRole = "player1";
      if (data.players.player2 === playerName) playerRole = "player2";
    }

    renderGame(data);
  });
}

// ⏱ BOT AFTER 5 SEC
function startBotTimer() {
  if (botTimerStarted) return;
  botTimerStarted = true;

  setTimeout(async () => {
    const gameRef = doc(db, "games", "room1");

    onSnapshot(gameRef, async (snap) => {
      let data = snap.data();

      if (data && !data.players.player2) {
        await setDoc(gameRef, {
          players: { ...data.players, player2: "BLACKMITH" }
        }, { merge: true });
      }
    });
  }, 5000);
}

function generateCoins() {
  let arr = [];
  while (arr.length < 8) {
    let r = Math.floor(Math.random() * 25);
    if (!arr.includes(r)) arr.push(r);
  }
  return arr;
}

function renderGame(data) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  let opponent =
    playerRole === "player1"
      ? data.players.player2 || "Waiting..."
      : data.players.player1;

  document.getElementById("player").innerText =
    `You: ${playerName} vs ${opponent}`;

  myTurn = data.turn === playerRole;

  for (let i = 0; i < 25; i++) {
    let box = document.createElement("div");
    box.classList.add("box");

    if (data.boxes[i]) {
      box.classList.add("open");
      box.innerHTML = data.boxes[i];
    }

    box.onclick = () => openBox(i, data);

    grid.appendChild(box);
  }

  // 🏆 Winner logic
  if (!data.boxes.includes(null) && !data.winner) {
    let p1 = data.scores.player1;
    let p2 = data.scores.player2;

    let winner = "Tie";

    if (p1 > p2) winner = data.players.player1;
    else if (p2 > p1) winner = data.players.player2;

    setDoc(doc(db, "games", "room1"), { winner }, { merge: true });
  }

  // ✅ Show winner + reset
  if (data.winner && !gameEnded) {
    gameEnded = true;

    setTimeout(() => {
      let restart = confirm("🏆 Winner: " + data.winner + "\n\nPlay again?");
      if (restart) resetGame();
    }, 300);
  }

  // 🤖 BOT TURN
  if (data.players.player2 === "BLACKMITH" && data.turn === "player2") {
    botMove(data);
  }
}

async function openBox(index, data) {
  if (!myTurn || data.turn !== playerRole) {
    alert("Not your turn");
    return;
  }

  if (data.boxes[index]) return;

  let newBoxes = [...data.boxes];
  let newScores = { ...data.scores };

  if (data.coins.includes(index)) {
    newBoxes[index] = "🪙";
    newScores[playerRole]++;
  } else {
    newBoxes[index] = "❌";
  }

  let nextTurn = playerRole === "player1" ? "player2" : "player1";

  await setDoc(doc(db, "games", "room1"), {
    boxes: newBoxes,
    scores: newScores,
    turn: nextTurn
  }, { merge: true });

  document.getElementById("score").innerText = newScores[playerRole];
}

// 🤖 BOT MOVE
function botMove(data) {
  setTimeout(async () => {
    let empty = data.boxes.map((b, i) => b ? null : i).filter(i => i !== null);

    let randomIndex = empty[Math.floor(Math.random() * empty.length)];

    let newBoxes = [...data.boxes];
    let newScores = { ...data.scores };

    if (data.coins.includes(randomIndex)) {
      newBoxes[randomIndex] = "🪙";
      newScores.player2++;
    } else {
      newBoxes[randomIndex] = "❌";
    }

    await setDoc(doc(db, "games", "room1"), {
      boxes: newBoxes,
      scores: newScores,
      turn: "player1"
    }, { merge: true });

  }, 800);
}

// 🔁 RESET GAME
async function resetGame() {
  await setDoc(doc(db, "games", "room1"), {
    boxes: Array(25).fill(null),
    coins: generateCoins(),
    players: {},
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: ""
  });

  location.reload();
}

window.startGame = startGame;
