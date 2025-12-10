import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// !!! PASTE YOUR FIREBASE CONFIG HERE !!!
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

feather.replace();

const participants = ["אלעד", "רז", "יהלי", "שקד", "אורי", "יותם", "עינב", "בוכ", "תומר"];
const container = document.getElementById('matches-container');

// Global Data
let gamesData = {};
let scoresData = {};
let betsData = {};

// -----------------------------------------------------------------------------
// 1. ADMIN LOGIC
// -----------------------------------------------------------------------------
document.getElementById('add-game-btn').addEventListener('click', () => {
    const homeTeam = document.getElementById('new-home').value;
    const awayTeam = document.getElementById('new-away').value;

    if (homeTeam && awayTeam) {
        const newGameRef = push(ref(db, 'games')); 
        set(newGameRef, {
            home: homeTeam,
            away: awayTeam,
            timestamp: Date.now()
        });
        
        document.getElementById('new-home').value = '';
        document.getElementById('new-away').value = '';
    } else {
        alert("נא להכניס שמות קבוצות");
    }
});

document.getElementById('clear-all-btn').addEventListener('click', () => {
    if(confirm("בטוח שרוצים למחוק הכל ולהתחיל יום חדש?")) {
        remove(ref(db, 'games'));
        remove(ref(db, 'scores'));
        remove(ref(db, 'bets'));
        location.reload();
    }
});

// -----------------------------------------------------------------------------
// 2. MAIN APP LOGIC
// -----------------------------------------------------------------------------
onValue(ref(db, 'games'), (snapshot) => {
    container.innerHTML = ''; 
    gamesData = snapshot.val() || {};
    
    if (!gamesData) return;

    Object.keys(gamesData).forEach(gameId => {
        const game = gamesData[gameId];
        renderGameBlock(gameId, game);
    });
    
    feather.replace();
});

onValue(ref(db, 'scores'), (snapshot) => {
    scoresData = snapshot.val() || {};
    recalculateAll();
});

onValue(ref(db, 'bets'), (snapshot) => {
    betsData = snapshot.val() || {};
    recalculateAll();
});


// -----------------------------------------------------------------------------
// 3. RENDERING
// -----------------------------------------------------------------------------
function renderGameBlock(gameId, game) {
    const block = document.createElement('div');
    block.className = "match-block bg-white rounded-xl shadow-md overflow-hidden animate-fade-in";
    block.dataset.id = gameId;

    let headerHTML = '';
    participants.forEach(p => {
        headerHTML += `<div class="p-2 border-r border-b border-gray-200 text-center font-bold bg-gray-50 text-xs sm:text-sm whitespace-nowrap">${p}</div>`;
    });

    let betsHTML = '';
    participants.forEach(p => {
        betsHTML += `
            <div class="bet-cell bg-white p-2 border-r border-b border-gray-200 flex items-center justify-center gap-1 transition-colors duration-300 min-h-[50px]" data-player="${p}">
                <input type="number" class="bet-input-home w-8 text-center text-sm border border-gray-200 rounded focus:border-blue-500 outline-none p-1 text-gray-900" placeholder="-">
                <span class="text-gray-300">:</span>
                <input type="number" class="bet-input-away w-8 text-center text-sm border border-gray-200 rounded focus:border-blue-500 outline-none p-1 text-gray-900" placeholder="-">
            </div>
        `;
    });

    // *** FIX: Swapped real-score-away and real-score-home locations below ***
    // Now it follows: [Label] [Home Input] : [Away Input]
    block.innerHTML = `
        <div class="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white sticky left-0 right-0">
            <h3 class="text-xl font-bold text-gray-800">${game.home} - ${game.away}</h3>
            <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-lg">
                <span class="text-sm text-gray-500 font-bold ml-2">תוצאה:</span>
                
                <input type="number" class="real-score-home w-10 text-center border border-gray-300 rounded p-1 text-gray-900" placeholder="-">
                
                <span class="font-bold text-gray-400">:</span>
                
                <input type="number" class="real-score-away w-10 text-center border border-gray-300 rounded p-1 text-gray-900" placeholder="-">
            </div>
        </div>
        
        <div class="overflow-x-auto">
            <div class="grid grid-cols-9 gap-0 min-w-[800px]">
                ${headerHTML}
                ${betsHTML}
            </div>
        </div>
    `;

    container.appendChild(block);

    // ATTACH EVENTS
    const scoreHomeInput = block.querySelector('.real-score-home');
    const scoreAwayInput = block.querySelector('.real-score-away');

    if (scoresData[gameId]) {
        scoreHomeInput.value = scoresData[gameId].home;
        scoreAwayInput.value = scoresData[gameId].away;
    }

    const sendScore = () => {
        set(ref(db, `scores/${gameId}`), {
            home: scoreHomeInput.value,
            away: scoreAwayInput.value
        });
    };
    scoreHomeInput.addEventListener('input', sendScore);
    scoreAwayInput.addEventListener('input', sendScore);

    block.querySelectorAll('.bet-cell').forEach(cell => {
        const player = cell.dataset.player;
        const homeIn = cell.querySelector('.bet-input-home');
        const awayIn = cell.querySelector('.bet-input-away');

        if (betsData[gameId] && betsData[gameId][player]) {
            homeIn.value = betsData[gameId][player].home;
            awayIn.value = betsData[gameId][player].away;
        }

        const sendBet = () => {
            set(ref(db, `bets/${gameId}/${player}`), {
                home: homeIn.value,
                away: awayIn.value
            });
        };
        homeIn.addEventListener('input', sendBet);
        awayIn.addEventListener('input', sendBet);
    });
}

// -----------------------------------------------------------------------------
// 4. CALCULATIONS
// -----------------------------------------------------------------------------
function recalculateAll() {
    const leaderboard = {};
    participants.forEach(p => leaderboard[p] = { points: 0, exact: 0, direction: 0 });

    document.querySelectorAll('.match-block').forEach(block => {
        const gameId = block.dataset.id;
        const realScore = scoresData[gameId];
        
        if (realScore) {
            block.querySelector('.real-score-home').value = realScore.home;
            block.querySelector('.real-score-away').value = realScore.away;
        }

        block.querySelectorAll('.bet-cell').forEach(cell => {
            const player = cell.dataset.player;
            const homeIn = cell.querySelector('.bet-input-home');
            const awayIn = cell.querySelector('.bet-input-away');

            if (betsData[gameId] && betsData[gameId][player]) {
                homeIn.value = betsData[gameId][player].home;
                awayIn.value = betsData[gameId][player].away;
            }

            // RESET STYLES
            cell.classList.remove('bg-green-700', 'bg-green-300', 'bg-white'); 
            cell.classList.add('bg-white'); 
            
            homeIn.classList.remove('text-white');
            homeIn.classList.add('text-gray-900'); 
            awayIn.classList.remove('text-white');
            awayIn.classList.add('text-gray-900');

            if (realScore && realScore.home !== '' && realScore.away !== '' && homeIn.value !== '' && awayIn.value !== '') {
                const rH = Number(realScore.home);
                const rA = Number(realScore.away);
                const bH = Number(homeIn.value);
                const bA = Number(awayIn.value);

                // EXACT SCORE
                if (rH === bH && rA === bA) {
                    cell.classList.remove('bg-white');
                    cell.classList.add('bg-green-700'); 
                    leaderboard[player].points += 3;
                    leaderboard[player].exact += 1;
                }
                // CORRECT DIRECTION
                else if (
                    (bH > bA && rH > rA) ||
                    (bH < bA && rH < rA) ||
                    (bH === bA && rH === rA)
                ) {
                    cell.classList.remove('bg-white');
                    cell.classList.add('bg-green-300');
                    leaderboard[player].points += 1;
                    leaderboard[player].direction += 1;
                }
            }
        });
    });

    renderLeaderboard(leaderboard);
}

function renderLeaderboard(data) {
    const sorted = Object.keys(data).map(name => ({
        name, ...data[name]
    })).sort((a, b) => b.points - a.points);

    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    sorted.forEach((p, i) => {
        const row = document.createElement('tr');
        row.className = "border-b hover:bg-gray-50 transition";
        
        let rankColor = "text-gray-600";
        if (i === 0) rankColor = "text-yellow-500";
        if (i === 1) rankColor = "text-gray-400";
        if (i === 2) rankColor = "text-orange-400";

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
