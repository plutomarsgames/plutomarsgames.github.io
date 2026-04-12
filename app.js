import { db, doc, setDoc, onSnapshot } from "./firebase.js";

let playerName = "";
let found = 0;

function startGame() {
  let name = document.getElementById("username").value;

  if (!name) {
    alert("Enter username");
    return;
  }

  playerName = name;

  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  document.getElementById("player").innerText = "Player: " + name;

  initGame();
}

async function initGame() {
  const gameRef = doc(db, "games", "room1");

  // Create game if not exists
  await setDoc(gameRef, {
    boxes: Array(25).fill(null),
    coins: generateCoins(),
    winner: ""
  }, { merge: true });

  // Listen realtime
  onSnapshot(gameRef, (snap) => {
    const data = snap.data();
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

  if (data.winner) {
    setTimeout(() => {
      alert("🏆 Winner: " + data.winner);
      location.reload();
    }, 200);
  }
}

async function openBox(index, data) {
  if (data.boxes[index]) return;

  const gameRef = doc(db, "games", "room1");

  let newBoxes = [...data.boxes];

  if (data.coins.includes(index)) {
    newBoxes[index] = "🪙";
    found++;
  } else {
    newBoxes[index] = "❌";
  }

  let winner = data.winner;

  if (found === 8 && !winner) {
    winner = playerName;
  }

  await setDoc(gameRef, {
    boxes: newBoxes,
    winner: winner
  }, { merge: true });

  document.getElementById("score").innerText = found;
}

window.startGame = startGame;
