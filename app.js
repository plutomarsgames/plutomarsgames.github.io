import { db, doc, setDoc, onSnapshot, getDoc } from "./firebase.js";

let playerName = "";
let playerRole = "";
let myTurn = false;
let roomId = "";
let gameEnded = false;

// 🔑 Room Code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 🆕 Create Room
function createRoom() {
  playerName = document.getElementById("username").value;
  if (!playerName) return alert("Enter username");

  roomId = generateRoomCode();
  alert("Room Code: " + roomId);

  startGame(true);
}

// 🔗 Join Room (FIXED)
async function joinRoom() {
  playerName = document.getElementById("username").value;
  roomId = document.getElementById("roomInput").value.toUpperCase();

  if (!playerName || !roomId) {
    alert("Enter username and room code");
    return;
  }

  const docSnap = await getDoc(doc(db, "games", roomId));

  if (!docSnap.exists()) {
    alert("❌ Room not found");
    return;
  }

  startGame(false);
}

// 🤖 BOT MODE
function playWithBot() {
  playerName = document.getElementById("username").value;
  if (!playerName) return alert("Enter username");

  roomId = generateRoomCode();

  setDoc(doc(db, "games", roomId), {
    boxes: Array(25).fill(null),
    coins: generateCoins(),
    players: { player1: playerName, player2: "BLACKMITH" },
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: "",
    rematch: {}
  });

  startGame(false);
}

// ▶ Start
function startGame(isNew) {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  initGame(isNew);
}

// 🔄 Init
async function initGame(isNew) {
  const gameRef = doc(db, "games", roomId);

  if (isNew) {
    await setDoc(gameRef, {
      boxes: Array(25).fill(null),
      coins: generateCoins(),
      players: {},
      turn: "player1",
      scores: { player1: 0, player2: 0 },
      winner: "",
      rematch: {}
    });
  }

  onSnapshot(gameRef, async (snap) => {
    let data = snap.data();

    // assign players
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

// 🎲 Coins
function generateCoins() {
  let arr = [];
  while (arr.length < 8) {
    let r = Math.floor(Math.random() * 25);
    if (!arr.includes(r)) arr.push(r);
  }
  return arr;
}

// 🎮 Render
function renderGame(data) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  let opponent =
    playerRole === "player1"
      ? data.players.player2 || "Waiting..."
      : data.players.player1;

  document.getElementById("player").innerText =
    `Room: ${roomId} | You: ${playerName} vs ${opponent}`;

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

  // 🏆 winner
  if (!data.boxes.includes(null) && !data.winner) {
    let p1 = data.scores.player1;
    let p2 = data.scores.player2;

    let winner = "Tie";

    if (p1 > p2) winner = data.players.player1;
    else if (p2 > p1) winner = data.players.player2;

    setDoc(doc(db, "games", roomId), { winner }, { merge: true });
  }

  // 🎉 show banner
  if (data.winner && !gameEnded) {
    gameEnded = true;

    document.getElementById("winner-banner").classList.remove("hidden");
    document.getElementById("winner-text").innerText =
      data.winner === "Tie" ? "🤝 It's a Tie!" : "🏆 " + data.winner + " Wins!";
  }

  // 🔁 rematch
  if (data.rematch?.player1 && data.rematch?.player2) {
    resetGame();
  }

  // 🤖 bot
  if (data.players.player2 === "BLACKMITH" && data.turn === "player2") {
    botMove(data);
  }
}

// 🎯 Click
async function openBox(index, data) {
  if (gameEnded) return;

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

  await setDoc(doc(db, "games", roomId), {
    boxes: newBoxes,
    scores: newScores,
    turn: nextTurn
  }, { merge: true });

  document.getElementById("score").innerText = newScores[playerRole];
}

// 🤖 BOT
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

    await setDoc(doc(db, "games", roomId), {
      boxes: newBoxes,
      scores: newScores,
      turn: "player1"
    }, { merge: true });

  }, 800);
}

// 🔁 Rematch
async function requestRematch() {
  await setDoc(doc(db, "games", roomId), {
    rematch: { [playerRole]: true }
  }, { merge: true });
}

// 🔄 Reset
async function resetGame() {
  await setDoc(doc(db, "games", roomId), {
    boxes: Array(25).fill(null),
    coins: generateCoins(),
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: "",
    rematch: {}
  }, { merge: true });

  location.reload();
}

// expose
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.playWithBot = playWithBot;
window.requestRematch = requestRematch;
