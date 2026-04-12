import { db, doc, setDoc, onSnapshot, collection } from "./firebase.js";

let playerName = "";
let playerRole = "";
let roomId = "";
let gameEnded = false;
let isBotGame = false;

// loading screen
window.onload = () => {
  setTimeout(() => {
    document.getElementById("loading-screen").style.display = "none";
    document.getElementById("main-app").classList.remove("hidden");
    document.getElementById("bgMusic").play();
  }, 1500);

  loadRooms();
};

// create
async function createRoom() {
  playerName = username.value;
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

// bot
async function playWithBot() {
  playerName = username.value;
  isBotGame = true;
  roomId = Math.random().toString(36).substring(2,7);

  await setDoc(doc(db,"games",roomId),{
    boxes:Array(25).fill(""),
    coins:generateCoins(),
    players:{player1:playerName,player2:"BLACKMITH"},
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
        div.innerText="Room "+d.id;
        div.onclick=()=>joinRoom(d.id);
        list.appendChild(div);
      }
    });
  });
}

// join
function joinRoom(id){
  playerName=username.value;
  roomId=id;
  startGame();
}

// start
function startGame(){
  start-screen.classList.add("hidden");
  game-screen.classList.remove("hidden");
  initGame();
}

// init
function initGame(){
  onSnapshot(doc(db,"games",roomId),(snap)=>{
    let data=snap.data();
    if(!data)return;

    if(!data.players.player2 && data.players.player1!==playerName){
      playerRole="player2";
      setDoc(doc(db,"games",roomId),{
        ...data,
        players:{...data.players,player2:playerName}
      });
      return;
    }

    if(data.players.player1===playerName)playerRole="player1";
    if(data.players.player2===playerName)playerRole="player2";

    renderGame(data);
  });
}

// render
function renderGame(data){
  const grid=document.getElementById("grid");
  grid.innerHTML="";

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
    let w=data.scores.player1>data.scores.player2
      ?data.players.player1
      :data.players.player2;

    setDoc(doc(db,"games",roomId),{...data,winner:w});
  }

  if(data.winner && !gameEnded){
    gameEnded=true;
    showWin(data.winner);
  }
}

// coin animation
function showCoinAnimation(box){
  let coin=document.createElement("div");
  coin.className="coin";
  coin.innerText="🪙";

  let rect=box.getBoundingClientRect();
  coin.style.left=rect.left+"px";
  coin.style.top=rect.top+"px";

  document.body.appendChild(coin);

  setTimeout(()=>coin.remove(),800);
}

// click
async function openBox(i,data,box){
  if(data.turn!==playerRole || data.boxes[i])return;

  let boxes=[...data.boxes];
  let scores={...data.scores};

  if(data.coins.includes(i)){
    boxes[i]="🪙";
    scores[playerRole]++;
    coinSound.play();
    showCoinAnimation(box); // 💎 animation
  }else{
    boxes[i]="❌";
  }

  let next=playerRole==="player1"?"player2":"player1";

  await setDoc(doc(db,"games",roomId),{
    ...data,boxes,scores,turn:next
  });
}

// win screen
function showWin(winner){
  let win=document.getElementById("win-screen");
  win.classList.remove("hidden");
  winner-text.innerText="🏆 "+winner+" Wins!";

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