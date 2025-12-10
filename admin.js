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

// DATA LISTENERS
onValue(ref(db, 'users'), snapshot => {
    usersData = snapshot.val() || {};
    renderUsersList();       // Regular user list
    renderManualEntryForm(); // NEW: Form for retro input
});
onValue(ref(db, 'games'), snapshot => { gamesData = snapshot.val() || {}; renderGamesList(); });
onValue(ref(db, 'scores'), snapshot => scoresData = snapshot.val() || {});
onValue(ref(db, 'bets'), snapshot => betsData = snapshot.val() || {});

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
});

function getPoints(rH, rA, bH, bA) {
    rH=Number(rH); rA=Number(rA); bH=Number(bH); bA=Number(bA);
    if(rH===bH && rA===bA) return 3;
    if((bH>bA && rH>rA) || (bH<bA && rH<rA) || (bH===bA && rH===rA)) return 1;
    return 0;
}

// ------------------------------------------------------------------
// 4. MANUAL HISTORY ENTRY (NEW!)
// ------------------------------------------------------------------
function renderManualEntryForm() {
    const container = document.getElementById('manual-users-list');
    if (!container) return; // In case specific HTML element missing
    container.innerHTML = '';

    Object.keys(usersData).forEach(uid => {
        const u = usersData[uid];
        const div = document.createElement('div');
        div.className = "flex items-center gap-2 bg-gray-50 p-2 rounded";
        div.innerHTML = `
            <label class="text-sm font-bold text-gray-700 w-20 truncate">${u.name}</label>
            <input type="number" class="manual-score-input w-full border rounded p-1 text-center" 
                   data-uid="${uid}" placeholder="נק'">
        `;
        container.appendChild(div);
    });
}

document.getElementById('save-manual-round-btn').addEventListener('click', () => {
    const name = document.getElementById('manual-round-name').value.trim();
    if (!name) return alert("חובה להזין שם למחזור");

    const results = {};
    let hasData = false;

    document.querySelectorAll('.manual-score-input').forEach(input => {
        const val = input.value.trim();
        if (val !== '') {
            results[input.dataset.uid] = Number(val);
            hasData = true;
        } else {
            // Optional: Save as 0 or simply don't save. 
            // If we want them to appear in the table with 0, we should save 0.
            results[input.dataset.uid] = 0; 
        }
    });

    if (!hasData) return alert("לא הוזנו נקודות לאף משתתף");

    push(ref(db, 'history'), {
        name: name,
        timestamp: Date.now(),
        results: results
    });

    alert("המחזור הידני נשמר בהצלחה!");
    document.getElementById('manual-round-name').value = '';
    document.querySelectorAll('.manual-score-input').forEach(i => i.value = '');
});

// RESET
document.getElementById('reset-day-btn').addEventListener('click', () => {
    if(confirm("למחוק הכל?")) {
        remove(ref(db, 'games')); remove(ref(db, 'scores')); remove(ref(db, 'bets'));
        location.reload();
    }
});
