import { db, doc, setDoc, onSnapshot, collection } from "./firebase.js";

let playerName = "";
let playerRole = "";
let roomId = "";
let gameEnded = false;
let isBotGame = false;

// 🔑 room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 🆕 create room
async function createRoom() {
  playerName = document.getElementById("username").value;
  if (!playerName) return alert("Enter username");

  isBotGame = false;
  roomId = generateRoomCode();

  await setDoc(doc(db, "games", roomId), {
    boxes: Array(25).fill(null),
    coins: generateCoins(),
    players: { player1: playerName },
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: ""
  });

  startGame();
}

// 🤖 bot
async function playWithBot() {
  playerName = document.getElementById("username").value;
  if (!playerName) return alert("Enter username");

  isBotGame = true;
  roomId = generateRoomCode();

  await setDoc(doc(db, "games", roomId), {
    boxes: Array(25).fill(null),
    coins: generateCoins(),
    players: { player1: playerName, player2: "BLACKMITH" },
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: ""
  });

  startGame();
}

// 🔄 load rooms
function loadRooms() {
  const list = document.getElementById("room-list");

  onSnapshot(collection(db, "games"), (snapshot) => {
    list.innerHTML = "";

    if (snapshot.empty) {
      list.innerHTML = "<p>No rooms available</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      if (!data.players.player2) {
        const div = document.createElement("div");
        div.className = "room-item";
        div.innerText = `Room: ${docSnap.id} | Host: ${data.players.player1}`;
        div.onclick = () => joinRoom(docSnap.id);
        list.appendChild(div);
      }
    });
  });
}

// join
function joinRoom(id) {
  playerName = document.getElementById("username").value;
  if (!playerName) return alert("Enter username");

  isBotGame = false;
  roomId = id;
  startGame();
}

// start
function startGame() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  document.getElementById("winner-banner").style.display = "none";
  gameEnded = false;

  initGame();
}

// init
function initGame() {
  const ref = doc(db, "games", roomId);

  onSnapshot(ref, async (snap) => {
    const data = snap.data();
    if (!data) return;

    if (!data.players.player2 && data.players.player1 !== playerName && !isBotGame) {
      playerRole = "player2";

      await setDoc(ref, {
        players: { ...data.players, player2: playerName }
      }, { merge: true });

    } else if (data.players.player1 === playerName) {
      playerRole = "player1";

    } else if (data.players.player2 === playerName) {
      playerRole = "player2";
    }

    renderGame(data);
  });
}

// coins
function generateCoins() {
  let arr = [];
  while (arr.length < 8) {
    let r = Math.floor(Math.random() * 25);
    if (!arr.includes(r)) arr.push(r);
  }
  return arr;
}

// render
function renderGame(data) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  if (!data.players.player2 && !isBotGame) {
    document.getElementById("player").innerText =
      `Room: ${roomId} | Waiting for player...`;
    return;
  }

  let opponent =
    playerRole === "player1"
      ? data.players.player2
      : data.players.player1;

  let turnText =
    data.turn === playerRole ? "🟢 Your Turn" : "🔴 Opponent Turn";

  document.getElementById("player").innerText =
    `Room: ${roomId}\n${playerName} vs ${opponent}\n${turnText}`;

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

    let winner =
      p1 > p2 ? data.players.player1 :
      p2 > p1 ? data.players.player2 : "Tie";

    setDoc(doc(db, "games", roomId), { winner }, { merge: true });
  }

  // show winner (FIXED)
  if (data.winner && !gameEnded && data.boxes.every(b => b !== null)) {
    gameEnded = true;

    document.getElementById("winner-banner").style.display = "flex";
    document.getElementById("winner-text").innerText =
      data.winner === "Tie"
        ? "🤝 It's a Tie!"
        : "🏆 " + data.winner + " Wins!";
  }

  // bot
  if (isBotGame && data.turn === "player2" && !gameEnded) {
    botMove(data);
  }
}

// click
async function openBox(i, data) {
  if (gameEnded) return;

  if (!data.players.player2 && !isBotGame) {
    alert("Waiting for opponent");
    return;
  }

  if (data.turn !== playerRole) return alert("Not your turn");
  if (data.boxes[i]) return;

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

// bot
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

// load
window.onload = loadRooms;

// expose
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.playWithBot = playWithBot;
