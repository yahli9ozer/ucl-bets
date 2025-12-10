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

// State for calculating points before archiving
let usersData = {};
let gamesData = {};
let scoresData = {};
let betsData = {};

// ------------------------------------------------------------------
// DATA LISTENERS (Need these to calculate points)
// ------------------------------------------------------------------
onValue(ref(db, 'users'), snapshot => usersData = snapshot.val() || {});
onValue(ref(db, 'games'), snapshot => gamesData = snapshot.val() || {});
onValue(ref(db, 'scores'), snapshot => scoresData = snapshot.val() || {});
onValue(ref(db, 'bets'), snapshot => betsData = snapshot.val() || {});

// ------------------------------------------------------------------
// 1. MANAGE USERS
// ------------------------------------------------------------------
const userNameIn = document.getElementById('user-name');
const userPassIn = document.getElementById('user-pass');
const addUserBtn = document.getElementById('add-user-btn');
const usersList = document.getElementById('users-list');

addUserBtn.addEventListener('click', () => {
    const name = userNameIn.value.trim();
    const pass = userPassIn.value.trim();
    if (!name || !pass) return alert("חובה להזין שם וסיסמה");

    set(push(ref(db, 'users')), { name, password: pass });
    userNameIn.value = ''; userPassIn.value = ''; userNameIn.focus();
});

onValue(ref(db, 'users'), (snapshot) => {
    usersList.innerHTML = '';
    const data = snapshot.val();
    if (!data) return usersList.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">אין משתתפים</td></tr>';

    Object.keys(data).forEach(key => {
        const user = data[key];
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50";
        row.innerHTML = `
            <td class="p-2 font-medium">${user.name}</td>
            <td class="p-2 font-mono text-gray-500">${user.password}</td>
            <td class="p-2 text-center">
                <button class="delete-user text-red-400 hover:text-red-600" data-id="${key}"><i data-feather="x-circle" class="w-4 h-4"></i></button>
            </td>`;
        usersList.appendChild(row);
    });
    feather.replace();
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(confirm("למחוק משתמש?")) remove(ref(db, `users/${e.currentTarget.dataset.id}`));
        });
    });
});

// ------------------------------------------------------------------
// 2. MANAGE GAMES
// ------------------------------------------------------------------
const gameHomeIn = document.getElementById('game-home');
const gameAwayIn = document.getElementById('game-away');
const addGameBtn = document.getElementById('add-game-btn');
const gamesList = document.getElementById('games-list');

addGameBtn.addEventListener('click', () => {
    const home = gameHomeIn.value.trim();
    const away = gameAwayIn.value.trim();
    if (!home || !away) return alert("חובה להזין קבוצות");

    set(push(ref(db, 'games')), { home, away, timestamp: Date.now(), started: false });
    gameHomeIn.value = ''; gameAwayIn.value = ''; gameHomeIn.focus();
});

onValue(ref(db, 'games'), (snapshot) => {
    gamesList.innerHTML = '';
    const data = snapshot.val();
    if (!data) return gamesList.innerHTML = '<div class="text-center text-gray-400 p-4">אין משחקים</div>';

    Object.keys(data).forEach(key => {
        const game = data[key];
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-50 p-3 rounded border";
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold">${game.home}-${game.away}</span>
                ${game.started ? 
                    `<span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">פעיל</span>` : 
                    `<button class="start-game-btn bg-white border border-green-500 text-green-600 text-xs px-2 py-1 rounded" data-id="${key}">התחל</button>`}
            </div>
            <button class="delete-game text-red-400" data-id="${key}"><i data-feather="trash-2" class="w-4 h-4"></i></button>`;
        gamesList.appendChild(div);
    });
    feather.replace();

    document.querySelectorAll('.start-game-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update game to started AND lock betting by creating empty bet records if missing? No, logic handles it.
            // Just mark started.
            const gameId = e.currentTarget.dataset.id;
            
            // Optional: "Lock" current bets by copying them? 
            // For now just mark started, the client hides inputs.
            // We update the game status
            set(ref(db, `games/${gameId}/started`), true);
        });
    });

    document.querySelectorAll('.delete-game').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if(confirm("למחוק משחק?")) {
                remove(ref(db, `games/${id}`));
                remove(ref(db, `scores/${id}`));
                remove(ref(db, `bets/${id}`));
            }
        });
    });
});

// ------------------------------------------------------------------
// 3. ARCHIVE ROUND (NEW!)
// ------------------------------------------------------------------
document.getElementById('archive-round-btn').addEventListener('click', () => {
    const roundName = document.getElementById('round-name').value.trim();
    if (!roundName) return alert("יש להזין שם למחזור (למשל: יום 1)");
    if (!confirm(`האם אתה בטוח שברצונך לשמור את התוצאות כ"${roundName}"?`)) return;

    // 1. Calculate points for everyone based on current data
    const roundResults = {};
    
    // Initialize 0 for all users
    Object.keys(usersData).forEach(uid => {
        roundResults[uid] = 0;
    });

    // Loop games
    Object.keys(gamesData).forEach(gameId => {
        const realScore = scoresData[gameId];
        if (!realScore || realScore.home === '' || realScore.away === '') return;

        Object.keys(usersData).forEach(uid => {
            if (betsData[gameId] && betsData[gameId][uid]) {
                const bet = betsData[gameId][uid];
                const points = getPoints(realScore.home, realScore.away, bet.home, bet.away);
                roundResults[uid] += points;
            }
        });
    });

    // 2. Save to History Node
    const historyRef = push(ref(db, 'history'));
    set(historyRef, {
        name: roundName,
        timestamp: Date.now(),
        results: roundResults
    });

    alert("המחזור נשמר בהצלחה! כעת ניתן למחוק את המשחקים ולהתחיל יום חדש.");
    document.getElementById('round-name').value = '';
});

// Helper for points
function getPoints(rH, rA, bH, bA) {
    rH = Number(rH); rA = Number(rA); bH = Number(bH); bA = Number(bA);
    if (rH === bH && rA === bA) return 3;
    if ((bH > bA && rH > rA) || (bH < bA && rH < rA) || (bH === bA && rH === rA)) return 1;
    return 0;
}

// ------------------------------------------------------------------
// RESET DAY
// ------------------------------------------------------------------
document.getElementById('reset-day-btn').addEventListener('click', () => {
    if(confirm("פעולה זו תמחק את המשחקים, ההימורים והתוצאות של היום.\nהאם ביצעת שמירה לארכיון?")) {
        remove(ref(db, 'games'));
        remove(ref(db, 'scores'));
        remove(ref(db, 'bets'));
        alert("היום אופס.");
    }
});
