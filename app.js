import { db, doc, setDoc, onSnapshot } from "./firebase.js";

let playerName = "";
let playerRole = "";
let myTurn = false;

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

    // ✅ Create game only once
    if (!data || !data.boxes) {
      await setDoc(gameRef, {
        boxes: Array(25).fill(null),
        coins: generateCoins(),
        players: {},
        turn: "player1",
        scores: { player1: 0, player2: 0 },
        winner: ""
      });
      return;
    }

    // ✅ Assign player safely
    if (!data.players.player1) {
      playerRole = "player1";
      await setDoc(gameRef, {
        players: { ...data.players, player1: playerName }
      }, { merge: true });

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
      ? data.players.player2 || "🤖 BLACKMITH"
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

  // ✅ End game
  if (!data.boxes.includes(null) && !data.winner) {
    let p1 = data.scores.player1;
    let p2 = data.scores.player2;

    let winner = "Tie";

    if (p1 > p2) winner = data.players.player1;
    else if (p2 > p1) winner = data.players.player2 || "BLACKMITH";

    setDoc(doc(db, "games", "room1"), { winner }, { merge: true });
  }

  if (data.winner) {
    setTimeout(() => {
      alert("🏆 Winner: " + data.winner);
      location.reload();
    }, 200);
  }

  // ✅ BOT plays only when alone
  if (!data.players.player2 && playerRole === "player1" && data.turn === "player2") {
    botMove(data);
  }
}

async function openBox(index, data) {
  // ✅ Strict turn control
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

// 🤖 BLACKMITH BOT
function botMove(data) {
  setTimeout(async () => {
    let empty = [];

    data.boxes.forEach((b, i) => {
      if (!b) empty.push(i);
    });

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

  }, 1000);
}

window.startGame = startGame;
