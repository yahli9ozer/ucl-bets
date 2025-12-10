import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCICNrNm1pxT3FjAHQPRCtXM-ei63dT8yY",
  authDomain: "ucl-bets.firebaseapp.com",
  databaseURL: "https://ucl-bets-default-rtdb.firebaseio.com",
  projectId: "ucl-bets",
  storageBucket: "ucl-bets.firebasestorage.app",
  messagingSenderId: "520474072792",
  appId: "1:520474072792:web:0beb13263d2b9a03d0a9ad"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// State
let currentUser = null; // { key: '...', name: '...' }
let usersData = {};     // All users from DB
let gamesData = {};
let scoresData = {};
let betsData = {};

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const container = document.getElementById('matches-container');

// -----------------------------------------------------------------------------
// 1. INITIALIZATION & LOGIN
// -----------------------------------------------------------------------------

// Fetch Users first to allow login
onValue(ref(db, 'users'), (snapshot) => {
    usersData = snapshot.val() || {};
    
    // If we are already logged in, re-render to update columns if users changed
    if (currentUser) {
        renderAll();
    }
});

loginBtn.addEventListener('click', attemptLogin);

function attemptLogin() {
    const name = document.getElementById('login-name').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

    // Find user in usersData (Object loop)
    let foundUserKey = null;
    let foundUserName = null;

    Object.keys(usersData).forEach(key => {
        const u = usersData[key];
        if (u.name === name && u.password === pass) {
            foundUserKey = key;
            foundUserName = u.name;
        }
    });

    if (foundUserKey) {
        currentUser = { key: foundUserKey, name: foundUserName };
        
        // UI Switch
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        document.getElementById('display-username').innerText = foundUserName;
        
        // Start Listening to Data
        startAppListeners();
    } else {
        loginError.innerText = "שם משתמש או סיסמה שגויים";
        loginError.classList.remove('hidden');
    }
}

document.getElementById('logout-btn').addEventListener('click', () => {
    location.reload();
});


// -----------------------------------------------------------------------------
// 2. DATA LISTENERS (Only start after login)
// -----------------------------------------------------------------------------
function startAppListeners() {
    feather.replace();

    onValue(ref(db, 'games'), (snapshot) => {
        gamesData = snapshot.val() || {};
        renderAll();
    });

    onValue(ref(db, 'scores'), (snapshot) => {
        scoresData = snapshot.val() || {};
        renderAll();
    });

    onValue(ref(db, 'bets'), (snapshot) => {
        betsData = snapshot.val() || {};
        renderAll();
    });
}

// -----------------------------------------------------------------------------
// 3. CORE RENDERING LOOP
// -----------------------------------------------------------------------------
function renderAll() {
    container.innerHTML = '';
    
    // Convert users object to array and sort by Name to keep column order consistent
    const sortedUsers = Object.keys(usersData).map(key => ({
        id: key,
        name: usersData[key].name
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Render Games
    if (gamesData) {
        Object.keys(gamesData).forEach(gameId => {
            renderGameBlock(gameId, gamesData[gameId], sortedUsers);
        });
    }

    // Calculate Leaderboard
    calculateLeaderboard(sortedUsers);
    
    feather.replace();
}

function renderGameBlock(gameId, game, sortedUsers) {
    const block = document.createElement('div');
    block.className = "match-block bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-gray-100";

    // Check if game has started (has score)
    const realScore = scoresData[gameId];
    const gameStarted = (realScore && realScore.home !== '' && realScore.away !== '');

    // 1. Build Header Row
    let headerHTML = '';
    sortedUsers.forEach(u => {
        const isMe = (u.id === currentUser.key);
        const bgClass = isMe ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-600';
        headerHTML += `<div class="p-2 border-r border-b border-gray-200 text-center font-bold text-xs sm:text-sm whitespace-nowrap ${bgClass}">${u.name}</div>`;
    });

    // 2. Build Betting Cells
    let betsHTML = '';
    sortedUsers.forEach(u => {
        const isMe = (u.id === currentUser.key);
        
        // Get existing bet
        let betHome = '';
        let betAway = '';
        if (betsData[gameId] && betsData[gameId][u.id]) {
            betHome = betsData[gameId][u.id].home;
            betAway = betsData[gameId][u.id].away;
        }

        let cellContent = '';
        let cellClass = 'bg-white'; // Default background

        // --- VISIBILITY LOGIC ---
        
        // CASE A: It's ME
        if (isMe) {
            if (gameStarted) {
                // Game started -> Show text, Read Only
                cellContent = `<span class="font-bold text-gray-800 text-lg">${betHome} : ${betAway}</span>`;
            } else {
                // Game NOT started -> Show Inputs (Editable)
                cellContent = `
                    <input type="number" class="my-bet-home w-8 text-center text-sm border border-blue-200 bg-blue-50 rounded p-1 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="-" value="${betHome}">
                    <span class="text-blue-300">:</span>
                    <input type="number" class="my-bet-away w-8 text-center text-sm border border-blue-200 bg-blue-50 rounded p-1 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="-" value="${betAway}">
                `;
            }
        } 
        // CASE B: It's SOMEONE ELSE
        else {
            if (gameStarted) {
                // Game started -> Reveal their bet!
                cellContent = `<span class="font-bold text-gray-800">${betHome} : ${betAway}</span>`;
                
                // --- COLOR LOGIC (Only for others, or me when game started) ---
                if (realScore && betHome !== '' && betAway !== '') {
                    const points = getPoints(realScore.home, realScore.away, betHome, betAway);
                    if (points === 3) cellClass = 'bg-green-600 text-white'; // Bullseye
                    else if (points === 1) cellClass = 'bg-green-300';      // Direction
                    else cellClass = 'bg-red-100';                          // Miss
                }
            } else {
                // Game NOT started -> HIDE (Lock)
                // We show an icon based on whether they bet or not
                const hasBet = (betHome !== '' && betAway !== '');
                if (hasBet) {
                     cellContent = `<i data-feather="check-circle" class="w-5 h-5 text-green-500 opacity-50"></i>`; // They bet, but secret
                } else {
                     cellContent = `<i data-feather="lock" class="w-4 h-4 text-gray-300"></i>`; // No bet yet
                }
                cellClass = "bg-gray-50";
            }
        }

        // Apply colors to "Me" cell if game started
        if (isMe && gameStarted && realScore && betHome !== '' && betAway !== '') {
             const points = getPoints(realScore.home, realScore.away, betHome, betAway);
             if (points === 3) cellClass = 'bg-green-600 text-white';
             else if (points === 1) cellClass = 'bg-green-300';
             else cellClass = 'bg-red-100';
        }

        betsHTML += `
            <div class="bet-cell ${cellClass} p-2 border-r border-b border-gray-200 flex items-center justify-center gap-1 min-h-[50px] transition-all" data-uid="${u.id}">
                ${cellContent}
            </div>
        `;
    });

    // Score Inputs (Read Only for regular users? No, usually admin sets score. 
    // But in your agile mode, maybe you want everyone to be able to set the score?)
    // Let's keep score inputs editable by anyone for agility.
    
    block.innerHTML = `
        <div class="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white sticky left-0 right-0 z-10">
            <h3 class="text-lg font-bold text-gray-800">${game.home} - ${game.away}</h3>
            
            <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                <span class="text-xs text-gray-500 font-bold ml-2">תוצאה:</span>
                <input type="number" class="real-score-home w-10 text-center border border-gray-300 rounded p-1 text-gray-900 font-bold" placeholder="-" value="${realScore ? realScore.home : ''}">
                <span class="font-bold text-gray-400">:</span>
                <input type="number" class="real-score-away w-10 text-center border border-gray-300 rounded p-1 text-gray-900 font-bold" placeholder="-" value="${realScore ? realScore.away : ''}">
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <div class="grid grid-flow-col auto-cols-[minmax(80px,1fr)] min-w-max border-b border-gray-200">
                </div>
            <div class="grid" style="grid-template-columns: repeat(${sortedUsers.length}, minmax(80px, 1fr));">
                ${headerHTML}
                ${betsHTML}
            </div>
        </div>
    `;

    container.appendChild(block);

    // EVENTS
    
    // 1. My Bet Input Listener
    const myHomeIn = block.querySelector('.my-bet-home');
    const myAwayIn = block.querySelector('.my-bet-away');
    
    if (myHomeIn && myAwayIn) {
        const sendBet = () => {
            set(ref(db, `bets/${gameId}/${currentUser.key}`), {
                home: myHomeIn.value,
                away: myAwayIn.value
            });
        };
        myHomeIn.addEventListener('input', sendBet);
        myAwayIn.addEventListener('input', sendBet);
    }

    // 2. Real Score Listener (Anyone can update score in Agile mode)
    const realH = block.querySelector('.real-score-home');
    const realA = block.querySelector('.real-score-away');
    
    const sendScore = () => {
        set(ref(db, `scores/${gameId}`), {
            home: realH.value,
            away: realA.value
        });
    };
    realH.addEventListener('input', sendScore);
    realA.addEventListener('input', sendScore);
}

// -----------------------------------------------------------------------------
// 4. UTILS & CALC
// -----------------------------------------------------------------------------

function getPoints(rH, rA, bH, bA) {
    if (rH === '' || rA === '' || bH === '' || bA === '') return 0;
    
    rH = Number(rH); rA = Number(rA);
    bH = Number(bH); bA = Number(bA);

    if (rH === bH && rA === bA) return 3; // Exact
    
    if ((bH > bA && rH > rA) || (bH < bA && rH < rA) || (bH === bA && rH === rA)) return 1; // Direction
    
    return 0; // Miss
}

function calculateLeaderboard(sortedUsers) {
    const leaderboard = sortedUsers.map(u => ({ name: u.name, points: 0, exact: 0, direction: 0 }));

    // Loop all games
    Object.keys(gamesData).forEach(gameId => {
        const realScore = scoresData[gameId];
        if (!realScore || realScore.home === '' || realScore.away === '') return; // Skip unstarted games

        // Loop all users
        sortedUsers.forEach((u, index) => {
            if (betsData[gameId] && betsData[gameId][u.id]) {
                const bet = betsData[gameId][u.id];
                const pts = getPoints(realScore.home, realScore.away, bet.home, bet.away);
                
                leaderboard[index].points += pts;
                if (pts === 3) leaderboard[index].exact++;
                if (pts === 1) leaderboard[index].direction++;
            }
        });
    });

    // Sort and Render
    leaderboard.sort((a, b) => b.points - a.points);
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    leaderboard.forEach((p, i) => {
        let rankColor = "text-gray-600";
        if (i === 0) rankColor = "text-yellow-500";
        if (i === 1) rankColor = "text-gray-400";
        if (i === 2) rankColor = "text-orange-400";

        const row = document.createElement('tr');
        row.className = "border-b hover:bg-gray-50 transition";
        row.innerHTML = `
            <td class="p-3 text-right flex items-center gap-2">
                <span class="font-bold ${rankColor}">#${i + 1}</span>
                ${p.name}
            </td>
            <td class="p-3 text-lg text-blue-600 font-bold">${p.points}</td>
            <td class="p-3 text-sm text-green-700 font-normal bg-green-50 rounded">${p.exact}</td>
            <td class="p-3 text-sm text-gray-500 font-normal">${p.direction}</td>
        `;
        tbody.appendChild(row);
    });
}
