import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

let usersData = {};
let gamesData = {};
let scoresData = {};
let betsData = {};
let historyData = {};

// DATA LISTENERS
onValue(ref(db, 'users'), snapshot => {
    usersData = snapshot.val() || {};
    renderUsersList();
});
onValue(ref(db, 'games'), snapshot => { gamesData = snapshot.val() || {}; renderGamesList(); });
onValue(ref(db, 'scores'), snapshot => scoresData = snapshot.val() || {});
onValue(ref(db, 'bets'), snapshot => betsData = snapshot.val() || {});
onValue(ref(db, 'history'), snapshot => {
    historyData = snapshot.val() || {};
    renderHistoryList();
});

// ------------------------------------------------------------------
// 1. MANAGE USERS
// ------------------------------------------------------------------
const userNameIn = document.getElementById('user-name');
const userPassIn = document.getElementById('user-pass');

document.getElementById('add-user-btn').addEventListener('click', () => {
    const name = userNameIn.value.trim();
    const pass = userPassIn.value.trim();
    if (!name || !pass) return alert("חובה להזין שם וסיסמה");
    set(push(ref(db, 'users')), { name, password: pass });
    userNameIn.value = ''; userPassIn.value = ''; userNameIn.focus();
});

function renderUsersList() {
    const list = document.getElementById('users-list');
    list.innerHTML = '';
    if (!usersData) return;

    Object.keys(usersData).forEach(key => {
        const u = usersData[key];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-2 font-medium">${u.name}</td>
            <td class="p-2 font-mono text-gray-500">${u.password}</td>
            <td class="p-2 text-center"><button class="del-usr text-red-400" data-id="${key}">X</button></td>`;
        list.appendChild(row);
    });
    
    document.querySelectorAll('.del-usr').forEach(b => b.addEventListener('click', e => {
        if(confirm("למחוק?")) remove(ref(db, `users/${e.target.dataset.id}`));
    }));
}

// ------------------------------------------------------------------
// 2. MANAGE GAMES
// ------------------------------------------------------------------
const gameHomeIn = document.getElementById('game-home');
const gameAwayIn = document.getElementById('game-away');

document.getElementById('add-game-btn').addEventListener('click', () => {
    const home = gameHomeIn.value.trim();
    const away = gameAwayIn.value.trim();
    if (!home || !away) return;
    set(push(ref(db, 'games')), { home, away, timestamp: Date.now(), started: false });
    gameHomeIn.value = ''; gameAwayIn.value = '';
});

function renderGamesList() {
    const list = document.getElementById('games-list');
    list.innerHTML = '';
    if(!gamesData) return;

    Object.keys(gamesData).forEach(key => {
        const g = gamesData[key];
        const div = document.createElement('div');
        div.className = "flex justify-between p-2 bg-gray-50 border rounded mb-2";
        div.innerHTML = `
            <span>${g.home} - ${g.away} ${g.started ? '✅' : ''}</span>
            <div>
                ${!g.started ? `<button class="start-game text-green-600 mr-2" data-id="${key}">התחל</button>` : ''}
                <button class="del-game text-red-500" data-id="${key}">מחק</button>
            </div>`;
        list.appendChild(div);
    });

    document.querySelectorAll('.start-game').forEach(b => b.addEventListener('click', e => {
        update(ref(db, `games/${e.target.dataset.id}`), { started: true });
    }));
    document.querySelectorAll('.del-game').forEach(b => b.addEventListener('click', e => {
        if(confirm("למחוק משחק?")) {
            const id = e.target.dataset.id;
            remove(ref(db, `games/${id}`)); remove(ref(db, `scores/${id}`)); remove(ref(db, `bets/${id}`));
        }
    }));
}

// ------------------------------------------------------------------
// 3. ARCHIVE ROUND (AUTOMATIC)
// ------------------------------------------------------------------
document.getElementById('archive-round-btn').addEventListener('click', () => {
    const name = document.getElementById('round-name').value.trim();
    if (!name) return alert("הזן שם מחזור");
    if (!confirm(`לשמור את "${name}"?`)) return;

    const results = {};
    // Init all users with 0
    Object.keys(usersData).forEach(uid => results[uid] = 0);

    Object.keys(gamesData).forEach(gid => {
        const score = scoresData[gid];
        if (!score || !score.home) return;
        Object.keys(usersData).forEach(uid => {
            if (betsData[gid] && betsData[gid][uid]) {
                results[uid] += getPoints(score.home, score.away, betsData[gid][uid].home, betsData[gid][uid].away);
            }
        });
    });

    push(ref(db, 'history'), { name, timestamp: Date.now(), results });
    alert("נשמר!");
    document.getElementById('round-name').value = '';
});

function getPoints(rH, rA, bH, bA) {
    rH=Number(rH); rA=Number(rA); bH=Number(bH); bA=Number(bA);
    if(rH===bH && rA===bA) return 3;
    if((bH>bA && rH>rA) || (bH<bA && rH<rA) || (bH===bA && rH===rA)) return 1;
    return 0;
}

// ------------------------------------------------------------------
// 4. MANUAL HISTORY ENTRY (NEW LOGIC)
// ------------------------------------------------------------------
const manualRowsContainer = document.getElementById('manual-rows-container');

// Function to add a single row
function addManualRow() {
    const div = document.createElement('div');
    div.className = "flex items-center gap-2 manual-row animate-fade-in";
    
    // Create Select Options from usersData
    let options = '<option value="">בחר שחקן...</option>';
    Object.keys(usersData).forEach(uid => {
        options += `<option value="${uid}">${usersData[uid].name}</option>`;
    });

    div.innerHTML = `
        <select class="manual-user-select flex-1 p-2 border rounded bg-white text-sm">
            ${options}
        </select>
        <input type="number" class="manual-score-input w-20 p-2 border rounded text-center" placeholder="ניקוד">
        <button class="remove-row-btn text-red-400 hover:text-red-600">
            <i data-feather="trash-2" class="w-4 h-4"></i>
        </button>
    `;

    // Remove row logic
    div.querySelector('.remove-row-btn').addEventListener('click', () => {
        div.remove();
    });

    manualRowsContainer.appendChild(div);
    feather.replace();
}

// Add initial row and Listen to Add Button
document.getElementById('add-manual-row-btn').addEventListener('click', addManualRow);

// Save Manual Round
document.getElementById('save-manual-round-btn').addEventListener('click', () => {
    const name = document.getElementById('manual-round-name').value.trim();
    if (!name) return alert("חובה להזין שם למחזור");

    const rows = document.querySelectorAll('.manual-row');
    if (rows.length === 0) return alert("יש להוסיף לפחות שחקן אחד");

    const results = {};
    let hasData = false;

    rows.forEach(row => {
        const uid = row.querySelector('.manual-user-select').value;
        const score = row.querySelector('.manual-score-input').value;

        if (uid && score !== '') {
            results[uid] = Number(score);
            hasData = true;
        }
    });

    if (!hasData) return alert("נא למלא שחקן וניקוד תקינים");

    push(ref(db, 'history'), {
        name: name,
        timestamp: Date.now(),
        results: results
    });

    alert("המחזור הידני נשמר בהצלחה!");
    document.getElementById('manual-round-name').value = '';
    manualRowsContainer.innerHTML = ''; // Clear rows
});


// ------------------------------------------------------------------
// 5. MANAGE SAVED HISTORY (NEW LOGIC)
// ------------------------------------------------------------------
function renderHistoryList() {
    const list = document.getElementById('history-management-list');
    list.innerHTML = '';

    if (!historyData) {
        list.innerHTML = '<li class="text-gray-400 text-center text-sm">אין היסטוריה שמורה</li>';
        return;
    }

    // Sort by timestamp desc
    const sortedKeys = Object.keys(historyData).sort((a,b) => historyData[b].timestamp - historyData[a].timestamp);

    sortedKeys.forEach(key => {
        const item = historyData[key];
        const date = new Date(item.timestamp).toLocaleDateString('he-IL');
        
        const li = document.createElement('li');
        li.className = "flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100 hover:bg-gray-50";
        li.innerHTML = `
            <div>
                <span class="font-bold text-gray-800 block">${item.name}</span>
                <span class="text-xs text-gray-400">${date}</span>
            </div>
            <button class="delete-history-btn text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-full transition" data-id="${key}">
                <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        list.appendChild(li);
    });
    feather.replace();

    document.querySelectorAll('.delete-history-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if (confirm("האם למחוק את המחזור הזה מההיסטוריה? (לא ניתן לשחזר)")) {
                remove(ref(db, `history/${id}`));
            }
        });
    });
}

// RESET
document.getElementById('reset-day-btn').addEventListener('click', () => {
    if(confirm("למחוק את נתוני היום הנוכחי (משחקים/הימורים)?\n(היסטוריה לא תימחק)")) {
        remove(ref(db, 'games')); remove(ref(db, 'scores')); remove(ref(db, 'bets'));
        alert("בוצע");
    }
});
