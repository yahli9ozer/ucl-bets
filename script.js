import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// !!! PASTE CONFIG HERE !!!
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
let bonusQuestions = {};
let bonusBets = {};

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

    onValue(ref(db, 'games'), (s) => { gamesData = s.val() || {}; renderAll(); });
    onValue(ref(db, 'bonus_questions'), (s) => { bonusQuestions = s.val() || {}; renderAll(); });

    onValue(ref(db, 'scores'), (s) => { scoresData = s.val() || {}; recalculateAll(); });
    onValue(ref(db, 'bets'), (s) => { betsData = s.val() || {}; recalculateAll(); });
    onValue(ref(db, 'bonus_bets'), (s) => { bonusBets = s.val() || {}; recalculateAll(); });
}

// -----------------------------------------------------------------------------
// 3. CORE RENDERING LOOP
// -----------------------------------------------------------------------------
function renderAll() {
    container.innerHTML = '';
    
    // *** FILTER: ONLY ACTIVE USERS ***
    const sortedUsers = Object.keys(usersData)
        .filter(key => usersData[key].active !== false)
        .map(key => ({
            id: key,
            name: usersData[key].name,
            bonusPoints: usersData[key].bonusPoints || 0
        })).sort((a, b) => a.name.localeCompare(b.name));

    if (gamesData) {
        Object.keys(gamesData).forEach(gameId => {
            renderGameBlock(gameId, gamesData[gameId], sortedUsers);
        });
    }

    if (Object.keys(bonusQuestions).length > 0) {
        renderBonusSection(sortedUsers);
    }

    recalculateAll();
    feather.replace();
}

function renderGameBlock(gameId, game, sortedUsers) {
    const block = document.createElement('div');
    block.className = "match-block bg-white rounded-xl shadow-md overflow-hidden mb-6 border border-gray-100";
    block.dataset.id = gameId;

    const isStarted = (game.started === true); 
    
    let headerHTML = '';
    sortedUsers.forEach(u => {
        const isMe = (u.id === currentUser.key);
        const bgClass = isMe ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-600';
        headerHTML += `<div class="p-2 border-r border-b border-gray-200 text-center font-bold text-xs sm:text-sm whitespace-nowrap ${bgClass}">${u.name}</div>`;
    });

    let betsHTML = '';
    sortedUsers.forEach(u => {
        const isMe = (u.id === currentUser.key);
        let cellContent = '';
        let cellClass = 'bg-white';

        if (isMe) {
            if (isStarted) {
                cellContent = `<span class="bet-display font-bold text-lg"></span>`;
            } else {
                cellContent = `
                    <input type="number" class="my-bet-home w-8 text-center text-sm border border-blue-200 bg-blue-50 rounded p-1 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="-">
                    <span class="text-blue-300">:</span>
                    <input type="number" class="my-bet-away w-8 text-center text-sm border border-blue-200 bg-blue-50 rounded p-1 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="-">
                `;
            }
        } else {
            if (isStarted) {
                cellContent = `<span class="bet-display font-bold"></span>`;
            } else {
                cellContent = `<span class="secret-icon"><i data-feather="lock" class="w-4 h-4 text-gray-300"></i></span>`;
                cellClass = "bg-gray-50";
            }
        }

        betsHTML += `
            <div class="bet-cell ${cellClass} p-2 border-r border-b border-gray-200 flex items-center justify-center gap-1 min-h-[50px] transition-all" data-uid="${u.id}">
                ${cellContent}
            </div>
        `;
    });

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
                <input type="number" class="real-score-home w-10 text-center border border-gray-300 rounded p-1 text-gray-900 font-bold ${scoreBg}" placeholder="-" ${scoreDisabled}>
                <span class="font-bold text-gray-400">:</span>
                <input type="number" class="real-score-away w-10 text-center border border-gray-300 rounded p-1 text-gray-900 font-bold ${scoreBg}" placeholder="-" ${scoreDisabled}>
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

    const myHomeIn = block.querySelector('.my-bet-home');
    const myAwayIn = block.querySelector('.my-bet-away');
    if (myHomeIn && myAwayIn) {
        const sendBet = () => set(ref(db, `bets/${gameId}/${currentUser.key}`), { home: myHomeIn.value, away: myAwayIn.value });
        myHomeIn.addEventListener('input', sendBet); myAwayIn.addEventListener('input', sendBet);
    }
    
    if (isStarted) {
        const realH = block.querySelector('.real-score-home');
        const realA = block.querySelector('.real-score-away');
        const sendScore = () => set(ref(db, `scores/${gameId}`), { home: realH.value, away: realA.value });
        realH.addEventListener('input', sendScore); realA.addEventListener('input', sendScore);
    }
}

function renderBonusSection(sortedUsers) {
    const bonusContainer = document.createElement('div');
    bonusContainer.className = "mt-12 bg-yellow-50 rounded-xl p-6 border-t-4 border-yellow-400";
    
    let html = `<h2 class="text-xl font-bold text-yellow-800 mb-6 flex items-center gap-2"><i data-feather="star"></i> שאלות בונוס</h2>`;
    
    Object.keys(bonusQuestions).forEach(qid => {
        const questionObj = bonusQuestions[qid];
        const question = questionObj.question;
        const isStarted = questionObj.started === true;

        let usersHeader = '';
        let answersRow = '';
        
        sortedUsers.forEach(u => {
            const isMe = (u.id === currentUser.key);
            const bgClass = isMe ? 'bg-yellow-100 text-yellow-900' : 'bg-white text-gray-500';
            usersHeader += `<div class="p-2 border-b text-center text-xs font-bold ${bgClass}">${u.name}</div>`;
            
            let content = '';
            if (isMe) {
                if (isStarted) {
                    content = `<span class="my-bonus-display text-sm font-bold text-gray-900"></span>`;
                } else {
                    content = `<input type="text" class="bonus-input w-full text-center text-sm border-0 bg-transparent focus:ring-0 p-1 font-bold text-gray-900" placeholder="..." data-qid="${qid}">`;
                }
            } else {
                if (isStarted) {
                    content = `<span class="other-bonus-display text-xs text-gray-800"></span>`;
                } else {
                    content = `<span class="bonus-secret-icon"><i data-feather="lock" class="w-3 h-3 text-gray-300"></i></span>`;
                }
            }
            
            answersRow += `<div class="p-2 border-r last:border-0 flex items-center justify-center min-h-[40px] bg-white bonus-cell" data-uid="${u.id}" data-qid="${qid}">${content}</div>`;
        });

        html += `
            <div class="mb-8 shadow-sm rounded-lg overflow-hidden border border-yellow-200">
                <div class="bg-yellow-200 p-3 flex justify-between items-center px-4">
                    <span class="font-bold text-yellow-900 text-center w-full">${question}</span>
                    ${isStarted ? '<i data-feather="unlock" class="text-green-600 w-4 h-4"></i>' : '<i data-feather="lock" class="text-gray-500 w-4 h-4"></i>'}
                </div>
                <div class="overflow-x-auto">
                    <div class="grid" style="grid-template-columns: repeat(${sortedUsers.length}, minmax(100px, 1fr));">
                        ${usersHeader}
                        ${answersRow}
                    </div>
                </div>
            </div>
        `;
    });

    bonusContainer.innerHTML = html;
    container.appendChild(bonusContainer);

    bonusContainer.querySelectorAll('.bonus-input').forEach(input => {
        input.addEventListener('change', (e) => { 
            const qid = e.target.dataset.qid;
            const val = e.target.value;
            set(ref(db, `bonus_bets/${qid}/${currentUser.key}`), val);
        });
    });
}

// -----------------------------------------------------------------------------
// 4. SMART UPDATES
// -----------------------------------------------------------------------------
function recalculateAll() {
    // *** FILTER: ONLY ACTIVE USERS ***
    const sortedUsers = Object.keys(usersData)
        .filter(key => usersData[key].active !== false)
        .map(key => ({
            id: key, 
            name: usersData[key].name,
            bonusPoints: usersData[key].bonusPoints || 0
        })).sort((a, b) => a.name.localeCompare(b.name));

    const leaderboard = sortedUsers.map(u => ({ 
        id: u.id, name: u.name, points: 0, exact: 0, direction: 0, bonus: u.bonusPoints 
    }));

    // UPDATE GAMES
    document.querySelectorAll('.match-block').forEach(block => {
        const gameId = block.dataset.id;
        const game = gamesData[gameId];
        const realScore = scoresData[gameId];
        const isStarted = game && game.started;

        // Update Score Inputs
        const realH = block.querySelector('.real-score-home');
        const realA = block.querySelector('.real-score-away');
        if (realScore) {
            if (document.activeElement !== realH) realH.value = realScore.home;
            if (document.activeElement !== realA) realA.value = realScore.away;
        }

        block.querySelectorAll('.bet-cell').forEach(cell => {
            const uid = cell.dataset.uid;
            const isMe = (uid === currentUser.key);
            
            let betHome = '', betAway = '';
            if (betsData[gameId] && betsData[gameId][uid]) {
                betHome = betsData[gameId][uid].home;
                betAway = betsData[gameId][uid].away;
            }

            if (isMe) {
                if (isStarted) {
                    const span = cell.querySelector('.bet-display');
                    if (span) span.innerText = `${betHome} : ${betAway}`;
                } else {
                    const inH = cell.querySelector('.my-bet-home');
                    const inA = cell.querySelector('.my-bet-away');
                    if (inH && document.activeElement !== inH) inH.value = betHome;
                    if (inA && document.activeElement !== inA) inA.value = betAway;
                }
            } else {
                if (isStarted) {
                    const span = cell.querySelector('.bet-display');
                    if (span) span.innerText = `${betHome} : ${betAway}`;
                } else {
                    const hasBet = (betHome !== '' && betAway !== '');
                    const iconSpan = cell.querySelector('.secret-icon');
                    if (iconSpan) {
                        iconSpan.innerHTML = hasBet ? 
                            `<i data-feather="check-circle" class="w-5 h-5 text-green-500 opacity-50"></i>` : 
                            `<i data-feather="lock" class="w-4 h-4 text-gray-300"></i>`;
                        feather.replace();
                    }
                }
            }

            // CLEANUP CLASS
            cell.classList.remove('bg-green-700', 'bg-green-400', 'bg-green-200', 'bg-red-200', 'bg-white', 'text-white', 'text-gray-900'); 
            
            // Text color logic
            const hasResult = (isStarted && realScore && String(realScore.home).trim() !== '' && String(realScore.away).trim() !== '');
            const textColorClass = hasResult ? 'text-gray-900' : 'text-white'; 
            
            cell.classList.add('bg-white', textColorClass);
            
            const inputs = cell.querySelectorAll('input');
            inputs.forEach(i => { 
                i.classList.remove('text-white', 'text-gray-900'); 
                i.classList.add(textColorClass); 
            });

            if (hasResult && betHome !== '' && betAway !== '') {
                const pts = getPoints(realScore.home, realScore.away, betHome, betAway);
                
                const userStat = leaderboard.find(u => u.id === uid);
                if (userStat) {
                    userStat.points += pts;
                    if (pts === 3) userStat.exact++;
                    if (pts === 1) userStat.direction++;
                }

                if (isMe || isStarted) {
                    cell.classList.remove('bg-white');
                    if (pts === 3) {
                        cell.classList.add('bg-green-600');
                    }
                    else if (pts === 1) {
                        cell.classList.add('bg-green-200');
                    }
                    else {
                        cell.classList.add('bg-red-200');
                    }
                }
            } else if (!isMe && !isStarted) {
                cell.classList.remove('bg-white');
                cell.classList.add('bg-gray-50');
            }
        });
    });

    // UPDATE BONUS
    document.querySelectorAll('.bonus-cell').forEach(cell => {
        const uid = cell.dataset.uid;
        const qid = cell.dataset.qid;
        const isMe = (uid === currentUser.key);
        const questionObj = bonusQuestions[qid];
        const isStarted = questionObj && questionObj.started;
        
        let answer = '';
        if (bonusBets[qid] && bonusBets[qid][uid]) answer = bonusBets[qid][uid];

        if (isMe) {
            if (isStarted) {
                const span = cell.querySelector('.my-bonus-display');
                if (span) span.innerText = answer || '-';
            } else {
                const input = cell.querySelector('.bonus-input');
                if (input && document.activeElement !== input) input.value = answer;
            }
        } else {
            if (isStarted) {
                const span = cell.querySelector('.other-bonus-display');
                if (span) span.innerText = answer || '-';
            } else {
                const iconSpan = cell.querySelector('.bonus-secret-icon');
                if (iconSpan) {
                    iconSpan.innerHTML = answer ? 
                        `<i data-feather="check-circle" class="w-4 h-4 text-green-500 opacity-50"></i>` : 
                        `<i data-feather="lock" class="w-3 h-3 text-gray-300"></i>`;
                    feather.replace();
                }
            }
        }
    });

    leaderboard.forEach(p => p.points += p.bonus);
    leaderboard.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.exact - a.exact;
    });
    renderLeaderboardTable(leaderboard);
}

function renderLeaderboardTable(leaderboard) {
    const tbody = document.getElementById('leaderboard-body');
    const headerRow = document.querySelector('#leaderboard-body').parentElement.querySelector('tr');
    
    if (!headerRow.querySelector('.bonus-head')) {
        const th = document.createElement('th');
        th.className = "p-2 bonus-head text-yellow-600";
        th.innerText = "בונוס";
        headerRow.appendChild(th);
    }

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
            <td class="p-3 text-sm text-green-700 font-bold">${p.exact}</td>
            <td class="p-3 text-sm text-gray-500 font-normal">${p.direction}</td>
            <td class="p-3 flex items-center justify-center gap-1">
                <button class="bonus-btn-minus bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 w-6 h-6 rounded text-xs" data-uid="${p.id}">-</button>
                <span class="text-sm font-bold text-yellow-600 w-4 text-center">${p.bonus}</span>
                <button class="bonus-btn-plus bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-500 w-6 h-6 rounded text-xs" data-uid="${p.id}">+</button>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.querySelectorAll('.bonus-btn-plus').forEach(btn => {
        btn.addEventListener('click', (e) => updateBonus(e.target.dataset.uid, 1));
    });
    document.querySelectorAll('.bonus-btn-minus').forEach(btn => {
        btn.addEventListener('click', (e) => updateBonus(e.target.dataset.uid, -1));
    });
}

function updateBonus(uid, change) {
    const currentBonus = usersData[uid].bonusPoints || 0;
    update(ref(db, `users/${uid}`), { bonusPoints: currentBonus + change });
}

function getPoints(rH, rA, bH, bA) {
    if (rH === '' || rA === '' || bH === '' || bA === '') return 0;
    rH = Number(rH); rA = Number(rA); bH = Number(bH); bA = Number(bA);
    if (rH === bH && rA === bA) return 3; 
    if ((bH > bA && rH > rA) || (bH < bA && rH < rA) || (bH === bA && rH === rA)) return 1; 
    return 0;
}

// -----------------------------------------------------------------------------
// 6. FALLING BACKGROUND
// -----------------------------------------------------------------------------
function createFallingBackground() {
    const container = document.getElementById('falling-elements-container');
    if (!container) return;

    const itemImages = ['assets/item1.png','assets/item2.png','assets/item3.png','assets/item4.png','assets/item5.png','assets/item6.png'];

    function spawnItem() {
        const item = document.createElement('img');
        const randomImg = itemImages[Math.floor(Math.random() * itemImages.length)];
        item.src = randomImg;
        item.classList.add('falling-item');

        const startLeft = Math.random() * 100; 
        const size = Math.random() * 30 + 20; 
        const duration = Math.random() * 5 + 5; 
        const delay = Math.random() * 5; 

        item.style.left = `${startLeft}%`;
        item.style.width = `${size}px`;
        item.style.height = 'auto';
        item.style.animationDuration = `${duration}s`;
        item.style.animationDelay = `-${delay}s`; 

        container.appendChild(item);

        setTimeout(() => { item.remove(); }, (duration + delay) * 1000);
    }

    setInterval(spawnItem, 500);
    for(let i=0; i<15; i++) spawnItem();
}

document.addEventListener('DOMContentLoaded', createFallingBackground);
