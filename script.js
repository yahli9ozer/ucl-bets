// script.js

// --------------------------------------------------------
// 1. FIREBASE SETUP
// --------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// !!! PASTE YOUR FIREBASE CONFIG HERE !!!
// It should look like this: const firebaseConfig = { apiKey: "...", ... };
const firebaseConfig = {
  apiKey: "AIzaSyCICNrNm1pxT3FjAHQPRCtXM-ei63dT8yY",
  authDomain: "ucl-bets.firebaseapp.com",
  databaseURL: "https://ucl-bets-default-rtdb.firebaseio.com",
  projectId: "ucl-bets",
  storageBucket: "ucl-bets.firebasestorage.app",
  messagingSenderId: "520474072792",
  appId: "1:520474072792:web:0beb13263d2b9a03d0a9ad"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Initialize Icons
feather.replace();

// --------------------------------------------------------
// 2. APP LOGIC
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const matchBlocks = document.querySelectorAll('.match-block');

    matchBlocks.forEach((block, index) => {
        const homeInput = block.querySelector('.score-home');
        const awayInput = block.querySelector('.score-away');
        const bets = block.querySelectorAll('.bet-value');
        
        // Create a unique ID for this match based on its order (match_0, match_1, etc.)
        const matchId = `match_${index}`;

        // FUNCTION: Calculate Colors (Same as before)
        const checkBets = (hVal, aVal) => {
            // Remove all colors first
            bets.forEach(bet => {
                bet.classList.remove('bg-green-700', 'text-white', 'font-bold', 'bg-green-300');
                bet.classList.add('bg-white');
            });

            // If empty, stop
            if (hVal === '' || aVal === '') return;

            const homeScore = Number(hVal);
            const awayScore = Number(aVal);

            bets.forEach(bet => {
                const betText = bet.innerText.trim();
                const [betHomeStr, betAwayStr] = betText.split(' - ').map(s => s.trim());
                const betHome = Number(betHomeStr);
                const betAway = Number(betAwayStr);

                // Exact Score
                if (betHome === homeScore && betAway === awayScore) {
                    bet.classList.remove('bg-white', 'bg-green-300');
                    bet.classList.add('bg-green-700', 'text-white', 'font-bold');
                }
                // Correct Direction
                else if (
                    (betHome > betAway && homeScore > awayScore) ||
                    (betHome < betAway && homeScore < awayScore) ||
                    (betHome === betAway && homeScore === awayScore)
                ) {
                    bet.classList.remove('bg-white', 'bg-green-700', 'text-white');
                    bet.classList.add('bg-green-300', 'font-bold');
                }
            });
        };

        // LISTENER: When YOU type, send to Database
        const sendToDb = () => {
            set(ref(db, 'scores/' + matchId), {
                home: homeInput.value,
                away: awayInput.value
            });
        };

        homeInput.addEventListener('input', sendToDb);
        awayInput.addEventListener('input', sendToDb);

        // LISTENER: When DATABASE changes (friend types), update screen
        onValue(ref(db, 'scores/' + matchId), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                homeInput.value = data.home;
                awayInput.value = data.away;
                checkBets(data.home, data.away);
            }
        });
    });
});
