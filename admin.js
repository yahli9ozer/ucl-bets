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
let bonusData = {};
let historyData = {};

// DATA LISTENERS
onValue(ref(db, 'users'), snapshot => {
    usersData = snapshot.val() || {};
    renderUsersList();       
    renderManualEntryForm(); 
});
onValue(ref(db, 'games'), snapshot => { gamesData = snapshot.val() || {}; renderGamesList(); });
onValue(ref(db, 'scores'), snapshot => scoresData = snapshot.val() || {});
onValue(ref(db, 'bets'), snapshot => betsData = snapshot.val() || {});
onValue(ref(db, 'bonus_questions'), snapshot => { bonusData = snapshot.val() || {}; renderBonusList(); });
onValue(ref(db, 'history'), snapshot => { historyData = snapshot.val() || {}; renderHistoryList(); });

// ------------------------------------------------------------------
// 1. MANAGE USERS (ACTIVE TOGGLE ADDED)
// ------------------------------------------------------------------
const userNameIn = document.getElementById('user-name');
const userPassIn = document.getElementById('user-pass');

document.getElementById('add-user-btn').addEventListener('click', () => {
    const name = userNameIn.value.trim();
    const pass = userPassIn.value.trim();
    if (!name || !pass) return alert("חובה להזין שם וסיסמה");
    // New users are active by default
    set(push(ref(db, 'users')), { name, password: pass, active: true });
    userNameIn.value = ''; userPassIn.value = ''; userNameIn.focus();
});

function renderUsersList() {
    const list = document.getElementById('users-list');
    list.innerHTML = '';
    if (!usersData) {
        list.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-400">אין משתתפים רשומים</td></tr>';
        return;
    }

    // Add Header for Active column if not exists (Optional purely visual tweak)
    // We just render rows here

    Object.keys(usersData).forEach(key => {
        const u = usersData[key];
        const isActive = u.active !== false; // Default to true if undefined

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 border-b last:border-0";
        
        row.innerHTML = `
            <td class="p-3">
                <div class="flex items-center gap-2">
                    <input type="text" class="name-input border border-gray-300 rounded px-2 py-1 w-20 text-sm font-bold text-gray-700 focus:border-blue-500 outline-none" 
                           value="${u.name}" id="name-${key}">
                    <button class="save-name-btn text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded" data-id="${key}"><i data-feather="check" class="w-3 h-3"></i></button>
                </div>
            </td>
            <td class="p-3">
                <div class="flex items-center gap-2">
                    <input type="text" class="pass-input border border-gray-300 rounded px-2 py-1 w-20 text-sm font-mono text-gray-600 focus:border-blue-500 outline-none" 
                           value="${u.password}" id="pass-${key}">
                    <button class="save-pass-btn text-blue-500 hover:text-blue-700 bg-blue-50 p-1 rounded" data-id="${key}"><i data-feather="check" class="w-3 h-3"></i></button>
                </div>
            </td>
            <td class="p-3 text-center">
                <label class="inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="active-toggle sr-only peer" data-id="${key}" ${isActive ? 'checked' : ''}>
                    <div class="relative w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    <span class="ms-2 text-xs font-medium text-gray-600">${isActive ? 'פעיל' : 'לא פעיל'}</span>
                </label>
            </td>
            <td class="p-3 text-center">
                <button class="del-usr text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded" data-id="${key}" title="מחיקה (זהירות!)"><i data-feather="trash-2" class="w-4 h-4"></i></button>
            </td>`;
        list.appendChild(row);
    });
    feather.replace();
    
    // Toggle Active Status
    document.querySelectorAll('.active-toggle').forEach(input => input.addEventListener('change', e => {
        update(ref(db, `users/${e.target.dataset.id}`), { active: e.target.checked });
    }));

    document.querySelectorAll('.del-usr').forEach(btn => btn.addEventListener('click', e => {
        if(confirm("שים לב! מחיקת משתמש תמחק אותו גם מההיסטוריה!\nעדיף להפוך אותו ל'לא פעיל'.\nהאם למחוק בכל זאת?")) remove(ref(db, `users/${e.currentTarget.dataset.id}`));
    }));

    document.querySelectorAll('.save-pass-btn').forEach(btn => btn.addEventListener('click', e => {
        const uid = e.currentTarget.dataset.id;
        const newPass = document.getElementById(`pass-${uid}`).value.trim();
        if(newPass) update(ref(db, `users/${uid}`), { password: newPass });
    }));

    document.querySelectorAll('.save-name-btn').forEach(btn => btn.addEventListener('click', e => {
        const uid = e.currentTarget.dataset.id;
        const newName = document.getElementById(`name-${uid}`).value.trim();
        if(newName) update(ref(db, `users/${uid}`), { name: newName });
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
    if(!gamesData) {
        list.innerHTML = '<div class="text-center text-gray-400 p-4">אין משחקים פעילים</div>';
        return;
    }

    Object.keys(gamesData).forEach(key => {
        const g = gamesData[key];
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-100";
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-gray-700">${g.home} - ${g.away}</span>
                ${g.started ? 
                    `<span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1"><i data-feather="check" class="w-3 h-3"></i> פעיל</span>` : 
                    `<button class="start-game text-green-600 border border-green-200 bg-white px-3 py-1 rounded text-xs hover:bg-green-50 font-bold" data-id="${key}">התחל</button>`}
            </div>
            <button class="del-game text-red-400 hover:text-red-600 p-1" data-id="${key}"><i data-feather="trash-2" class="w-4 h-4"></i></button>`;
        list.appendChild(div);
    });
    feather.replace();

    document.querySelectorAll('.start-game').forEach(b => b.addEventListener('click', e => {
        update(ref(db, `games/${e.currentTarget.dataset.id}`), { started: true });
    }));
    document.querySelectorAll('.del-game').forEach(b => b.addEventListener('click', e => {
        if(confirm("למחוק משחק?")) {
            const id = e.currentTarget.dataset.id;
            remove(ref(db, `games/${id}`)); remove(ref(db, `scores/${id}`)); remove(ref(db, `bets/${id}`));
        }
    }));
}

// ------------------------------------------------------------------
// 3. BONUS QUESTIONS
// ------------------------------------------------------------------
const bonusInput = document.getElementById('bonus-question');
const bonusList = document.getElementById('bonus-list');

document.getElementById('add-bonus-btn').addEventListener('click', () => {
    const q = bonusInput.value.trim();
    if(!q) return;
    set(push(ref(db, 'bonus_questions')), { question: q, started: false });
    bonusInput.value = ''; bonusInput.focus();
});

function renderBonusList() {
    bonusList.innerHTML = '';
    if(!bonusData) {
        bonusList.innerHTML = '<div class="text-center text-gray-400 p-4 text-xs">אין שאלות בונוס</div>';
        return;
    }
    Object.keys(bonusData).forEach(key => {
        const item = bonusData[key];
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-yellow-50/50 p-2 rounded border border-yellow-100";
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-bold text-gray-700 text-sm">${item.question}</span>
                ${item.started ? 
                    `<span class="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">פעיל</span>` : 
                    `<button class="start-bonus text-green-600 border border-green-200 bg-white px-2 py-0.5 rounded text-[10px] hover:bg-green-50 font-bold" data-id="${key}">התחל</button>`}
            </div>
            <button class="del-bonus text-red-400 hover:text-red-600 p-1" data-id="${key}"><i data-feather="trash-2" class="w-4 h-4"></i></button>`;
        bonusList.appendChild(div);
    });
    feather.replace();
    
    document.querySelectorAll('.start-bonus').forEach(b => b.addEventListener('click', e => {
        update(ref(db, `bonus_questions/${e.currentTarget.dataset.id}`), { started: true });
    }));
    document.querySelectorAll('.del-bonus').forEach(b => b.addEventListener('click', e => {
        if(confirm("למחוק?")) {
            const id = e.currentTarget.dataset.id;
            remove(ref(db, `bonus_questions/${id}`)); remove(ref(db, `bonus_bets/${id}`));
        }
    }));
}

// ------------------------------------------------------------------
// 4. ARCHIVE ROUND
// ------------------------------------------------------------------
document.getElementById('archive-round-btn').addEventListener('click', () => {
    const name = document.getElementById('round-name').value.trim();
    if (!name) return alert("הזן שם מחזור");
    if (!confirm(`לשמור את "${name}"?`)) return;

    const results = {};
    Object.keys(usersData).forEach(uid => results[uid] = usersData[uid].bonusPoints || 0);

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
// 5. MANUAL HISTORY & LIST
// ------------------------------------------------------------------
const manualRowsContainer = document.getElementById('manual-rows-container');

function renderManualEntryForm() {
    manualRowsContainer.innerHTML = '';
    if(!usersData) return;
    Object.keys(usersData).forEach(uid => {
        addManualRow(); 
    });
}
document.getElementById('add-manual-row-btn').addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = "flex items-center gap-2 manual-row animate-fade-in mb-2";
    let options = '<option value="">בחר שחקן...</option>';
    if(usersData) Object.keys(usersData).forEach(uid => options += `<option value="${uid}">${usersData[uid].name}</option>`);
    
    div.innerHTML = `
        <select class="manual-user-select flex-1 p-2 border rounded bg-white text-sm">${options}</select>
        <input type="number" class="manual-score-input w-20 p-2 border rounded text-center" placeholder="נק'">
        <button class="rm-row text-red-400 hover:text-red-600"><i data-feather="trash-2" class="w-4 h-4"></i></button>`;
    
    div.querySelector('.rm-row').addEventListener('click', () => div.remove());
    manualRowsContainer.appendChild(div);
    feather.replace();
});

document.getElementById('save-manual-round-btn').addEventListener('click', () => {
    const name = document.getElementById('manual-round-name').value.trim();
    if (!name) return alert("שם מחזור חובה");
    const rows = document.querySelectorAll('.manual-row');
    if (rows.length === 0) return alert("הוסף שחקנים");

    const results = {};
    rows.forEach(row => {
        const uid = row.querySelector('.manual-user-select').value;
        const score = row.querySelector('.manual-score-input').value;
        if(uid && score !== '') results[uid] = Number(score);
    });

    push(ref(db, 'history'), { name, timestamp: Date.now(), results });
    alert("נשמר!");
    document.getElementById('manual-round-name').value = '';
    manualRowsContainer.innerHTML = '';
});

function renderHistoryList() {
    const list = document.getElementById('history-management-list');
    list.innerHTML = '';
    if (!historyData) {
        list.innerHTML = '<li class="text-gray-400 text-center text-sm p-2">אין היסטוריה</li>';
        return;
    }
    const sortedKeys = Object.keys(historyData).sort((a,b) => historyData[b].timestamp - historyData[a].timestamp);
    sortedKeys.forEach(key => {
        const item = historyData[key];
        const date = new Date(item.timestamp).toLocaleDateString('he-IL');
        const li = document.createElement('li');
        li.className = "flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100 hover:bg-gray-50";
        li.innerHTML = `
            <div><span class="font-bold text-gray-800 block">${item.name}</span><span class="text-xs text-gray-400">${date}</span></div>
            <div class="flex gap-2">
                <button class="edit-hist text-blue-400 hover:text-blue-600 bg-blue-50 p-2 rounded-full" data-id="${key}" data-name="${item.name}"><i data-feather="edit-2" class="w-4 h-4"></i></button>
                <button class="del-hist text-red-400 hover:text-red-600 bg-red-50 p-2 rounded-full" data-id="${key}"><i data-feather="trash-2" class="w-4 h-4"></i></button>
            </div>`;
        list.appendChild(li);
    });
    feather.replace();
    
    document.querySelectorAll('.del-hist').forEach(b => b.addEventListener('click', e => {
        if(confirm("למחוק מההיסטוריה?")) remove(ref(db, `history/${e.currentTarget.dataset.id}`));
    }));

    document.querySelectorAll('.edit-hist').forEach(b => b.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        const oldName = e.currentTarget.dataset.name;
        const newName = prompt("הזן שם חדש למחזור:", oldName);
        if(newName && newName.trim() !== "") {
            update(ref(db, `history/${id}`), { name: newName.trim() });
        }
    }));
}

document.getElementById('reset-day-btn').addEventListener('click', () => {
    if(confirm("למחוק הכל מהיום (כולל בונוסים)?")) {
        remove(ref(db, 'games')); remove(ref(db, 'scores')); remove(ref(db, 'bets')); 
        remove(ref(db, 'bonus_questions')); remove(ref(db, 'bonus_bets'));
        if(usersData) {
            Object.keys(usersData).forEach(uid => update(ref(db, `users/${uid}`), { bonusPoints: 0 }));
        }
        alert("בוצע");
    }
});
