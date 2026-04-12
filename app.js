import { db, doc, setDoc, onSnapshot, collection } from "./firebase.js";

let playerName = "";
let playerRole = "";
let roomId = "";
let isBotGame = false;
let gameEnded = false;

let timerInterval;
let timeLeft = 30;

window.onload = loadRooms;

// create room
async function createRoom() {
  playerName = username.value;
  if (!playerName) return alert("Enter username");

  roomId = Math.random().toString(36).substring(2, 7);

  await setDoc(doc(db, "games", roomId), {
    boxes: Array(25).fill(""),
    coins: generateCoins(),
    players: { player1: playerName },
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: ""
  });

  startGame();
}

// bot
async function playWithBot() {
  playerName = username.value;
  if (!playerName) return alert("Enter username");

  isBotGame = true;
  roomId = Math.random().toString(36).substring(2, 7);

  await setDoc(doc(db, "games", roomId), {
    boxes: Array(25).fill(""),
    coins: generateCoins(),
    players: { player1: playerName, player2: "BLACKMITH" },
    turn: "player1",
    scores: { player1: 0, player2: 0 },
    winner: ""
  });

  startGame();
}

// rooms
function loadRooms() {
  const list = document.getElementById("room-list");

  onSnapshot(collection(db, "games"), (snapshot) => {
    list.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.players.player2) {
        const div = document.createElement("div");
        div.className = "room-item";
        div.innerText = "Room: " + docSnap.id;
        div.onclick = () => joinRoom(docSnap.id);
        list.appendChild(div);
      }
    });
  });
}

// join
function joinRoom(id) {
  playerName = username.value;
  roomId = id;
  startGame();
}

// start
function startGame() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

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
      await setDoc(ref, { ...data, players: { ...data.players, player2: playerName } });
      return;
    }

    if (data.players.player1 === playerName) playerRole = "player1";
    if (data.players.player2 === playerName) playerRole = "player2";

    renderGame(data);
  });
}

// timer
function startTimer(data) {
  clearInterval(timerInterval);
  timeLeft = 30;

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").innerText = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      let next = data.turn === "player1" ? "player2" : "player1";

      setDoc(doc(db, "games", roomId), { ...data, turn: next });
    }
  }, 1000);
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
  const status = document.getElementById("status");

  grid.innerHTML = "";

  if (!data.players.player2 && !isBotGame) {
    status.innerText = "Waiting for player...";
    return;
  }

  const turnName = data.turn === "player1"
    ? data.players.player1
    : data.players.player2;

  const opponent = playerRole === "player1"
    ? data.players.player2
    : data.players.player1;

  status.innerText = `${playerName} vs ${opponent} | Turn: ${turnName}`;

  document.getElementById("score").innerText =
    data.scores[playerRole] || 0;

  for (let i = 0; i < 25; i++) {
    let box = document.createElement("div");
    box.className = "box";

    if (data.boxes[i]) {
      box.innerHTML = data.boxes[i];
      box.classList.add("open");
    }

    box.onclick = () => openBox(i, data);
    grid.appendChild(box);
  }

  startTimer(data);

  if (!data.boxes.includes("") && !data.winner) {
    let winner =
      data.scores.player1 > data.scores.player2
        ? data.players.player1
        : data.scores.player2 > data.scores.player1
        ? data.players.player2
        : "Tie";

    setDoc(doc(db, "games", roomId), { ...data, winner });
  }

  if (data.winner && !gameEnded) {
    gameEnded = true;
    status.innerText = "Winner: " + data.winner;

    setTimeout(() => {
      location.reload();
    }, 3000);
  }

  if (isBotGame && data.turn === "player2" && !gameEnded) {
    setTimeout(() => botMove(data), 800);
  }
}

// click
async function openBox(i, data) {
  if (gameEnded) return;
  if (data.turn !== playerRole) return;
  if (data.boxes[i]) return;

  let boxes = [...data.boxes];
  let scores = { ...data.scores };

  if (data.coins.includes(i)) {
    boxes[i] = "🪙";
    scores[playerRole]++;

    coinSound.play();
  } else {
    boxes[i] = "❌";
    clickSound.play();
  }

  let next = playerRole === "player1" ? "player2" : "player1";

  await setDoc(doc(db, "games", roomId), {
    ...data,
    boxes,
    scores,
    turn: next
  });
}

// bot
async function botMove(data) {
  let empty = data.boxes
    .map((b, i) => (b === "" ? i : null))
    .filter(i => i !== null);

  let i = empty[Math.floor(Math.random() * empty.length)];

  let boxes = [...data.boxes];
  let scores = { ...data.scores };

  if (data.coins.includes(i)) {
    boxes[i] = "🪙";
    scores.player2++;
  } else {
    boxes[i] = "❌";
  }

  await setDoc(doc(db, "games", roomId), {
    ...data,
    boxes,
    scores,
    turn: "player1"
  });
}

// expose
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.playWithBot = playWithBot;