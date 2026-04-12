import { db, doc, setDoc, onSnapshot, collection } from "./firebase.js";

let playerName = "";
let playerRole = "";
let roomId = "";
let gameEnded = false;
let isBotGame = false;

// debug
console.log("APP LOADED");

// load rooms
window.onload = loadRooms;

// create room
async function createRoom() {
  playerName = document.getElementById("username").value;
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
  playerName = document.getElementById("username").value;
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
  playerName = document.getElementById("username").value;
  if (!playerName) return alert("Enter username");

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
        ...data,
        players: { ...data.players, player2: playerName }
      });
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
    document.getElementById("player").innerText = "Waiting...";
    return;
  }

  for (let i = 0; i < 25; i++) {
    let box = document.createElement("div");
    box.className = "box";
    box.innerHTML = data.boxes[i];
    box.onclick = () => openBox(i, data);
    grid.appendChild(box);
  }

  if (!data.boxes.includes("") && !data.winner) {
    let p1 = data.scores.player1;
    let p2 = data.scores.player2;

    let winner =
      p1 > p2 ? data.players.player1 :
      p2 > p1 ? data.players.player2 : "Tie";

    setDoc(doc(db, "games", roomId), { ...data, winner });
  }

  if (data.winner && !gameEnded) {
    gameEnded = true;
    document.getElementById("winner-banner").style.display = "flex";
    document.getElementById("winner-text").innerText =
      data.winner === playerName ? "🏆 You Win!" : "💀 You Lose!";
  }
}

// click
async function openBox(i, data) {
  if (gameEnded) return;
  if (data.turn !== playerRole) return;

  let boxes = [...data.boxes];
  let scores = { ...data.scores };

  if (data.coins.includes(i)) {
    boxes[i] = "🪙";
    scores[playerRole]++;
  } else {
    boxes[i] = "❌";
  }

  let next = playerRole === "player1" ? "player2" : "player1";

  await setDoc(doc(db, "games", roomId), {
    ...data,
    boxes,
    scores,
    turn: next
  });
}

// expose
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.playWithBot = playWithBot;
