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
let currentUser = null; 
let usersData = {};     
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
onValue(ref(db, 'users'), (snapshot) => {
    usersData = snapshot.val() || {};
    if (currentUser) renderAll();
});

loginBtn.addEventListener('click', attemptLogin);

function attemptLogin() {
    const name = document.getElementById('login-name').value.trim();
    const pass = document.getElementById('login-pass').value.trim();

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
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        document.getElementById('display-username').innerText = foundUserName;
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
// 2. DATA LISTENERS
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
    
    const sortedUsers = Object.keys(usersData).map(key => ({
        id: key,
        name: usersData[key].name
    })).sort((a, b) => a.name.localeCompare(b.name));

    if (gamesData) {
        Object.keys(gamesData).forEach(gameId => {
            renderGameBlock(gameId, gamesData[gameId], sortedUsers);
        });
    }

    calculateLeaderboard(sortedUsers);
    feather.replace();
}

function renderGameBlock(gameId, game, sortedUsers) {
    const block = document.createElement('div');
    block.className = "match-block bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-gray-100";

    // *** LOGIC CHANGE: Status determines visibility, not just score ***
    const isStarted = (game.started === true); 
    const realScore = scoresData[gameId];

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
        
        let betHome = '';
        let betAway = '';
        if (betsData[gameId] && betsData[gameId][u.id]) {
            betHome = betsData[gameId][u.id].home;
            betAway = betsData[gameId][u.id].away;
        }

        let cellContent = '';
        let cellClass = 'bg-white';

        // CASE A: It's ME
        if (isMe) {
            if (isStarted) {
                // Game Started -> Read Only (Lock betting)
                cellContent = `<span class="font-bold text-gray-800 text-lg">${betHome} : ${betAway}</span>`;
            } else {
                // Game Not Started -> Editable
                cellContent = `
                    <input type="number" class="my-bet-home w-8 text-center text-sm border border-blue-200 bg-blue-50 rounded p-1 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="-" value="${betHome}">
                    <span class="text-blue-300">:</span>
                    <input type="number" class="my-bet-away w-8 text-center text-sm border border-blue-200 bg-blue-50 rounded p-1 text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="-" value="${betAway}">
                `;
            }
        } 
        // CASE B: It's OTHERS
        else {
            if (isStarted) {
                // Game Started -> Reveal Bets!
                cellContent = `<span class="font-bold text-gray-800">${betHome} : ${betAway}</span>`;
                
                // Color Logic
                if (realScore && betHome !== '' && betAway !== '') {
                    const points = getPoints(realScore.home, realScore.away, betHome, betAway);
                    if (points === 3) cellClass = 'bg-green-600 text-white';
                    else if (points === 1) cellClass = 'bg-green-300';
                    else cellClass = 'bg-red-200';
                }
            } else {
                // Game Not Started -> Hide
                const hasBet = (betHome !== '' && betAway !== '');
                if (hasBet) {
                     cellContent = `<i data-feather="check-circle" class="w-5 h-5 text-green-500 opacity-50"></i>`;
                } else {
                     cellContent = `<i data-feather="lock" class="w-4 h-4 text-gray-300"></i>`;
                }
                cellClass = "bg-gray-50";
            }
        }

        // Color Logic for ME (if started)
        if (isMe && isStarted && realScore && betHome !== '' && betAway !== '') {
             const points = getPoints(realScore.home, realScore.away, betHome, betAway);
             if (points === 3) cellClass = 'bg-green-600 text-white';
             else if (points === 1) cellClass = 'bg-green-300';
             else cellClass = 'bg-red-200';
        }

        betsHTML += `
            <div class="bet-cell ${cellClass} p-2 border-r border-b border-gray-200 flex items-center justify-center gap-1 min-h-[50px] transition-all" data-uid="${u.id}">
                ${cellContent}
            </div>
        `;
    });

    // Score Inputs - Controlled by isStarted
    // If NOT started -> Disabled & Grey
    // If Started -> Enabled & White
    const scoreDisabled = isStarted ? '' : 'disabled';
    const scoreBg = isStarted ? 'bg-white' : 'bg-gray-100 cursor-not-allowed';

    block.innerHTML = `
        <div class="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white sticky left-0 right-0 z-10">
            <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                ${game.home} - ${game.away}
                ${!isStarted ? '<span class="text-xs bg-gray-200 text-gray-500 px-2 rounded-full">ממתין</span>' : '<span class="text-xs bg-green-100 text-green-600 px-2 rounded-full animate-pulse">משוחק</span>'}
            </h3>
            
            <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                <span class="text-xs text-gray-500 font-bold ml-2">תוצאה:</span>
                <input type="number" class="real-score-home w-10 text-center border border-gray-300 rounded p-1 text-gray-900 font-bold ${scoreBg}" placeholder="-" value="${realScore ? realScore.home : ''}" ${scoreDisabled}>
                <span class="font-bold text-gray-400">:</span>
                <input type="number" class="real-score-away w-10 text-center border border-gray-300 rounded p-1 text-gray-900 font-bold ${scoreBg}" placeholder="-" value="${realScore ? realScore.away : ''}" ${scoreDisabled}>
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <div class="grid" style="grid-template-columns: repeat(${sortedUsers.length}, minmax(80px, 1fr));">
                ${headerHTML}
                ${betsHTML}
            </div>
        </div>
    `;

    container.appendChild(block);

    // EVENTS
    
    // My Bet Input
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

    // Real Score Input
    const realH = block.querySelector('.real-score-home');
    const realA = block.querySelector('.real-score-away');
    
    // Only attach listener if enabled
    if (isStarted) {
        const sendScore = () => {
            set(ref(db, `scores/${gameId}`), {
                home: realH.value,
                away: realA.value
            });
        };
        realH.addEventListener('input', sendScore);
        realA.addEventListener('input', sendScore);
    }
}

// -----------------------------------------------------------------------------
// 4. UTILS & CALC
// -----------------------------------------------------------------------------

function getPoints(rH, rA, bH, bA) {
    if (rH === '' || rA === '' || bH === '' || bA === '') return 0;
    
    rH = Number(rH); rA = Number(rA);
    bH = Number(bH); bA = Number(bA);

    if (rH === bH && rA === bA) return 3; 
    if ((bH > bA && rH > rA) || (bH < bA && rH < rA) || (bH === bA && rH === rA)) return 1; 
    
    return 0;
}

function calculateLeaderboard(sortedUsers) {
    const leaderboard = sortedUsers.map(u => ({ name: u.name, points: 0, exact: 0, direction: 0 }));

    if (gamesData) {
        Object.keys(gamesData).forEach(gameId => {
            const game = gamesData[gameId];
            const realScore = scoresData[gameId];
            
            // Only calc points if game started AND has score
            if (!game.started || !realScore || realScore.home === '' || realScore.away === '') return;

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
    }

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
