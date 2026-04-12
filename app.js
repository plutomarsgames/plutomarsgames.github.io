import { db, doc, setDoc, onSnapshot } from "./firebase.js";

let playerName = "";
let playerRole = "";
let myTurn = false;
let roomId = "";
let gameEnded = false;
let botTimerStarted = false;

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

  startGame();
}

// 🔗 Join Room
function joinRoom() {
  playerName = document.getElementById("username").value;
  roomId = document.getElementById("roomInput").value.toUpperCase();

  if (!playerName || !roomId) {
    alert("Enter username and room code");
    return;
  }

  startGame();
}

// ▶ Start Game
function startGame() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  initGame();
}

// 🔄 Init Game
async function initGame() {
  const gameRef = doc(db, "games", roomId);

  onSnapshot(gameRef, async (snap) => {
    let data = snap.data();

    // Create new room
    if (!data) {
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

// ⏱ BOT after 5 sec
function startBotTimer() {
  if (botTimerStarted) return;
  botTimerStarted = true;

  setTimeout(async () => {
    const gameRef = doc(db, "games", roomId);

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

  // 🏆 Winner
  if (!data.boxes.includes(null) && !data.winner) {
    let p1 = data.scores.player1;
    let p2 = data.scores.player2;

    let winner = "Tie";

    if (p1 > p2) winner = data.players.player1;
    else if (p2 > p1) winner = data.players.player2;

    setDoc(doc(db, "games", roomId), { winner }, { merge: true });
  }

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

// 🎯 Click
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

  await setDoc(doc(db, "games", roomId), {
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

    await setDoc(doc(db, "games", roomId), {
      boxes: newBoxes,
      scores: newScores,
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
