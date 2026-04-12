import { db, doc, setDoc, onSnapshot, collection } from "./firebase.js";

let playerName = "";
let playerRole = "";
let roomId = "";
let isBotGame = false;
let gameEnded = false;

window.onload = () => {
  loadRooms();
};

// ✅ FIX username
function getName() {
  const name = document.getElementById("username").value;
  if (!name) {
    alert("Enter username");
    return null;
  }
  return name;
}

// create room
async function createRoom() {
  playerName = getName();
  if (!playerName) return;

  isBotGame = false;

  roomId = Math.random().toString(36).substring(2,7);

  await setDoc(doc(db,"games",roomId),{
    boxes:Array(25).fill(""),
    coins:generateCoins(),
    players:{player1:playerName},
    turn:"player1",
    scores:{player1:0,player2:0},
    winner:""
  });

  startGame();
}

// 🤖 BOT FIXED
async function playWithBot() {
  playerName = getName();
  if (!playerName) return;

  isBotGame = true;

  roomId = Math.random().toString(36).substring(2,7);

  await setDoc(doc(db,"games",roomId),{
    boxes:Array(25).fill(""),
    coins:generateCoins(),
    players:{
      player1: playerName,
      player2: "BLACKMITH"
    },
    turn:"player1",
    scores:{player1:0,player2:0},
    winner:""
  });

  startGame();
}

// rooms
function loadRooms(){
  onSnapshot(collection(db,"games"),(snap)=>{
    const list=document.getElementById("room-list");
    list.innerHTML="";

    snap.forEach(d=>{
      const data=d.data();

      if(!data.players.player2){
        let div=document.createElement("div");
        div.className="room-item";
        div.innerText="Room "+d.id;
        div.onclick=()=>joinRoom(d.id);
        list.appendChild(div);
      }
    });
  });
}

// join
function joinRoom(id){
  playerName = getName();
  if (!playerName) return;

  isBotGame = false;
  roomId=id;
  startGame();
}

// start
function startGame(){
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");
  gameEnded = false;
  initGame();
}

// init
function initGame(){
  onSnapshot(doc(db,"games",roomId),(snap)=>{
    let data=snap.data();
    if(!data)return;

    // assign roles
    if (!data.players.player2 && !isBotGame && data.players.player1 !== playerName) {
      playerRole = "player2";

      setDoc(doc(db,"games",roomId),{
        ...data,
        players:{...data.players, player2: playerName}
      });
      return;
    }

    if (data.players.player1 === playerName) playerRole = "player1";
    if (data.players.player2 === playerName) playerRole = "player2";

    renderGame(data);
  });
}

// render
function renderGame(data){
  const grid=document.getElementById("grid");
  const status=document.getElementById("status");

  grid.innerHTML="";

  if(!data.players.player2){
    status.innerText="Waiting for player...";
    return;
  }

  const turnName =
    data.turn === "player1"
      ? data.players.player1
      : data.players.player2;

  const opponent =
    playerRole === "player1"
      ? data.players.player2
      : data.players.player1;

  status.innerText = `${playerName} vs ${opponent} | Turn: ${turnName}`;

  document.getElementById("score").innerText =
    data.scores[playerRole] || 0;

  for(let i=0;i<25;i++){
    let box=document.createElement("div");
    box.className="box";

    if(data.boxes[i]){
      box.innerHTML=data.boxes[i];
      box.classList.add("open");
    }

    box.onclick=()=>openBox(i,data,box);
    grid.appendChild(box);
  }

  // winner
  if(!data.boxes.includes("") && !data.winner){
    let w =
      data.scores.player1 > data.scores.player2
        ? data.players.player1
        : data.scores.player2 > data.scores.player1
        ? data.players.player2
        : "Tie";

    setDoc(doc(db,"games",roomId),{...data, winner:w});
  }

  if(data.winner && !gameEnded){
    gameEnded = true;
    showWin(data.winner);
  }

  // 🤖 BOT TURN FIX
  if(isBotGame && data.turn === "player2" && !gameEnded){
    setTimeout(()=>botMove(data),600);
  }
}

// click
async function openBox(i,data,box){
  if(gameEnded) return;
  if(data.turn !== playerRole) return;
  if(data.boxes[i]) return;

  let boxes=[...data.boxes];
  let scores={...data.scores};

  if(data.coins.includes(i)){
    boxes[i]="🪙";
    scores[playerRole]++;
  } else {
    boxes[i]="❌";
  }

  let next = playerRole === "player1" ? "player2" : "player1";

  await setDoc(doc(db,"games",roomId),{
    ...data,
    boxes,
    scores,
    turn: next
  });
}

// 🤖 BOT LOGIC FIXED
async function botMove(data){
  let empty = data.boxes
    .map((b,i)=> b==="" ? i : null)
    .filter(i=>i!==null);

  if(empty.length === 0) return;

  let i = empty[Math.floor(Math.random()*empty.length)];

  let boxes=[...data.boxes];
  let scores={...data.scores};

  if(data.coins.includes(i)){
    boxes[i]="🪙";
    scores.player2++;
  } else {
    boxes[i]="❌";
  }

  await setDoc(doc(db,"games",roomId),{
    ...data,
    boxes,
    scores,
    turn:"player1"
  });
}

// win
function showWin(w){
  let win=document.getElementById("win-screen");
  win.classList.remove("hidden");
  document.getElementById("winner-text").innerText="🏆 "+w+" Wins!";

  setTimeout(()=>location.reload(),3000);
}

// coins
function generateCoins(){
  let arr=[];
  while(arr.length<8){
    let r=Math.floor(Math.random()*25);
    if(!arr.includes(r))arr.push(r);
  }
  return arr;
}

// expose
window.createRoom=createRoom;
window.joinRoom=joinRoom;
window.playWithBot=playWithBot;