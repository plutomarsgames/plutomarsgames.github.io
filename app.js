import { db, doc, setDoc, onSnapshot, getDoc } from "./firebase.js";

let playerName = "";
let playerRole = "";
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

// 🔗 Join Room
async function joinRoom() {
  playerName = document.getElementById("username").value;
  roomId = document.getElementById("roomInput").value.toUpperCase();

  if (!playerName || !roomId) return alert("Enter details");

  const snap = await getDoc(doc(db, "games", roomId));
  if (!snap.exists()) return alert("❌ Room not found");

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
    winner: ""
  });

  startGame(false);
}

// ▶ START
function startGame(isNew) {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  document.getElementById("winner-banner").classList.add("hidden");
  gameEnded = false;

  initGame(isNew);
}

// 🔄 INIT
async function initGame(isNew) {
  const ref = doc(db, "games", roomId);

  if (isNew) {
    await setDoc(ref, {
      boxes: Array(25).fill(null),
      coins: generateCoins(),
      players: {},
      turn: "player1",
      scores: { player1: 0, player2: 0 },
      winner: ""
    });
  }

  onSnapshot(ref, async (snap) => {
    let data = snap.data();
    if (!data) return;

    // FIX: reset old game automatically
    if (data.winner) {
      await setDoc(ref, {
        boxes: Array(25).fill(null),
        coins: generateCoins(),
        players: {},
        turn: "player1",
        scores: { player1: 0, player2: 0 },
        winner: ""
      });
      return;
    }

    // assign players
    if (!data.players.player1) {
      playerRole = "player1";
      await setDoc(ref, { players: { ...data.players, player1: playerName } }, { merge: true });
    } else if (!data.players.player2 && data.players.player1 !== playerName) {
      playerRole = "player2";
      await setDoc(ref, { players: { ...data.players, player2: playerName } }, { merge: true });
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

// 🎮 RENDER
function renderGame(data) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  let opponent =
    playerRole === "player1"
      ? data.players.player2 || "Waiting..."
      : data.players.player1;

  document.getElementById("player").innerText =
    `Room: ${roomId} | ${playerName} vs ${opponent}`;

  for (let i = 0; i < 25; i++) {
    let box = document.createElement("div");
    box.className = "box";

    if (data.boxes[i]) {
      box.classList.add("open");
      box.innerHTML = data.boxes[i];
    }

    box.onclick = () => openBox(i, data);
    grid.appendChild(box);
  }

  // winner
  if (!data.boxes.includes(null) && !data.winner) {
    let p1 = data.scores.player1;
    let p2 = data.scores.player2;

    let winner = p1 > p2 ? data.players.player1 :
                 p2 > p1 ? data.players.player2 : "Tie";

    setDoc(doc(db, "games", roomId), { winner }, { merge: true });
  }

  // show banner
  if (data.winner && !gameEnded) {
    gameEnded = true;

    document.getElementById("winner-banner").classList.remove("hidden");
    document.getElementById("winner-text").innerText =
      data.winner === "Tie" ? "🤝 It's a Tie!" : "🏆 " + data.winner + " Wins!";
  }

  // bot
  if (data.players.player2 === "BLACKMITH" && data.turn === "player2") {
    botMove(data);
  }
}

// 🎯 CLICK
async function openBox(i, data) {
  if (gameEnded) return;
  if (data.boxes[i]) return;
  if (data.turn !== playerRole) return alert("Wait turn");

  let newBoxes = [...data.boxes];
  let scores = { ...data.scores };

  if (data.coins.includes(i)) {
    newBoxes[i] = "🪙";
    scores[playerRole]++;
  } else newBoxes[i] = "❌";

  let next = playerRole === "player1" ? "player2" : "player1";

  await setDoc(doc(db, "games", roomId), {
    boxes: newBoxes,
    scores,
    turn: next
  }, { merge: true });

  document.getElementById("score").innerText = scores[playerRole];
}

// 🤖 BOT
function botMove(data) {
  setTimeout(async () => {
    let empty = data.boxes.map((b, i) => b ? null : i).filter(i => i !== null);
    let i = empty[Math.floor(Math.random() * empty.length)];

    let newBoxes = [...data.boxes];
    let scores = { ...data.scores };

    if (data.coins.includes(i)) {
      newBoxes[i] = "🪙";
      scores.player2++;
    } else newBoxes[i] = "❌";

    await setDoc(doc(db, "games", roomId), {
      boxes: newBoxes,
      scores,
      turn: "player1"
    }, { merge: true });

  }, 800);
}

// 🔁 RESET
async function resetGame() {
  await setDoc(doc(db, "games", roomId), {
    boxes: Array(25).fill(null),
    coins: generateCoins(),
    players: {},
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: ""
  });

  location.reload();
}

// expose
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.playWithBot = playWithBot;
window.resetGame = resetGame;
