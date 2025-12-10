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

// ------------------------------------------------------------------
// 1. MANAGE USERS
// ------------------------------------------------------------------
const userNameIn = document.getElementById('user-name');
const userPassIn = document.getElementById('user-pass');
const addUserBtn = document.getElementById('add-user-btn');
const usersList = document.getElementById('users-list');

// Add User
addUserBtn.addEventListener('click', () => {
    const name = userNameIn.value.trim();
    const pass = userPassIn.value.trim();

    if (!name || !pass) {
        alert("חובה להזין שם וסיסמה");
        return;
    }

    // Push new user to DB
    const newUserRef = push(ref(db, 'users'));
    set(newUserRef, {
        name: name,
        password: pass
    });

    userNameIn.value = '';
    userPassIn.value = '';
    userNameIn.focus();
});

// Render Users List
onValue(ref(db, 'users'), (snapshot) => {
    usersList.innerHTML = '';
    const data = snapshot.val();
    
    if (!data) {
        usersList.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">אין משתתפים רשומים</td></tr>';
        return;
    }

    Object.keys(data).forEach(key => {
        const user = data[key];
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50";
        row.innerHTML = `
            <td class="p-2 font-medium text-gray-800">${user.name}</td>
            <td class="p-2 font-mono text-gray-500">${user.password}</td>
            <td class="p-2 text-center">
                <button class="delete-user text-red-400 hover:text-red-600 p-1" data-id="${key}">
                    <i data-feather="x-circle" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        usersList.appendChild(row);
    });
    feather.replace();

    // Attach Delete Events
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if(confirm("למחוק משתמש זה?")) {
                remove(ref(db, `users/${id}`));
            }
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

// Add Game
addGameBtn.addEventListener('click', () => {
    const home = gameHomeIn.value.trim();
    const away = gameAwayIn.value.trim();

    if (!home || !away) {
        alert("חובה להזין שמות קבוצות");
        return;
    }

    const newGameRef = push(ref(db, 'games'));
    set(newGameRef, {
        home: home,
        away: away,
        timestamp: Date.now()
    });

    gameHomeIn.value = '';
    gameAwayIn.value = '';
    gameHomeIn.focus();
});

// Render Games List
onValue(ref(db, 'games'), (snapshot) => {
    gamesList.innerHTML = '';
    const data = snapshot.val();

    if (!data) {
        gamesList.innerHTML = '<div class="text-center text-gray-400 p-4">אין משחקים פעילים</div>';
        return;
    }

    Object.keys(data).forEach(key => {
        const game = data[key];
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-100";
        div.innerHTML = `
            <span class="font-bold text-gray-700">${game.home} - ${game.away}</span>
            <button class="delete-game text-red-400 hover:text-red-600 p-1" data-id="${key}">
                <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
        `;
        gamesList.appendChild(div);
    });
    feather.replace();

    // Attach Delete Events
    document.querySelectorAll('.delete-game').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            if(confirm("למחוק משחק זה? (זה ימחק גם את ההימורים והתוצאות שלו)")) {
                // Remove game, scores, and bets associated with it
                remove(ref(db, `games/${id}`));
                remove(ref(db, `scores/${id}`));
                remove(ref(db, `bets/${id}`));
            }
        });
    });
});


// ------------------------------------------------------------------
// 3. RESET DAY
// ------------------------------------------------------------------
document.getElementById('reset-day-btn').addEventListener('click', () => {
    if(confirm("פעולה זו תמחק את כ-ל הנתונים:\nמשתמשים, משחקים, הימורים ותוצאות.\n\nהאם להמשיך?")) {
        remove(ref(db, 'users'));
        remove(ref(db, 'games'));
        remove(ref(db, 'scores'));
        remove(ref(db, 'bets'));
        alert("המערכת אותחלה בהצלחה.");
    }
});
