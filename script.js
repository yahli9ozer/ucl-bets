// script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// List of participants in the EXACT order they appear in your HTML columns
const participants = [
    "אלעד", "רז", "יהלי", "שקד", "אורי", "יותם", "עינב", "בוכ", "תומר"
];

// Global state to store points for every match: { match_0: [3, 1, 0...], match_1: [...] }
let allMatchPoints = {};

document.addEventListener('DOMContentLoaded', () => {
    const matchBlocks = document.querySelectorAll('.match-block');

    matchBlocks.forEach((block, index) => {
        const homeInput = block.querySelector('.score-home');
        const awayInput = block.querySelector('.score-away');
        const bets = block.querySelectorAll('.bet-value');
        const matchId = `match_${index}`;

        // Initialize this match's points array with 0s
        allMatchPoints[matchId] = participants.map(() => ({ points: 0, exact: 0, direction: 0 }));

        const checkBets = (hVal, aVal) => {
            // Reset this match's stats in the global state
            const currentMatchStats = participants.map(() => ({ points: 0, exact: 0, direction: 0 }));

            // Reset visual styles
            bets.forEach(bet => {
                bet.classList.remove('bg-green-700', 'text-white', 'font-bold', 'bg-green-300');
                bet.classList.add('bg-white');
            });

            if (hVal !== '' && aVal !== '') {
                const homeScore = Number(hVal);
                const awayScore = Number(aVal);

                bets.forEach((bet, playerIndex) => {
                    const betText = bet.innerText.trim();
                    const [betHomeStr, betAwayStr] = betText.split(' - ').map(s => s.trim());
                    const betHome = Number(betHomeStr);
                    const betAway = Number(betAwayStr);

                    // 1. EXACT SCORE (3 Points)
                    if (betHome === homeScore && betAway === awayScore) {
                        bet.classList.remove('bg-white', 'bg-green-300');
                        bet.classList.add('bg-green-700', 'text-white', 'font-bold');
                        
                        currentMatchStats[playerIndex].points = 3;
                        currentMatchStats[playerIndex].exact = 1;
                    }
                    // 2. CORRECT DIRECTION (1 Point)
                    else if (
                        (betHome > betAway && homeScore > awayScore) || // Home Win
                        (betHome < betAway && homeScore < awayScore) || // Away Win
                        (betHome === betAway && homeScore === awayScore)    // Draw
                    ) {
                        bet.classList.remove('bg-white', 'bg-green-700', 'text-white');
                        bet.classList.add('bg-green-300', 'font-bold');
                        
                        currentMatchStats[playerIndex].points = 1;
                        currentMatchStats[playerIndex].direction = 1;
                    }
                });
            }

            // Update global state and refresh leaderboard
            allMatchPoints[matchId] = currentMatchStats;
            updateLeaderboard();
        };

        const sendToDb = () => {
            set(ref(db, 'scores/' + matchId), {
                home: homeInput.value,
                away: awayInput.value
            });
        };

        homeInput.addEventListener('input', sendToDb);
        awayInput.addEventListener('input', sendToDb);

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

function updateLeaderboard() {
    // 1. Aggregate totals
    const totals = participants.map((name, index) => {
        let totalPoints = 0;
        let totalExact = 0;
        let totalDirection = 0;

        // Sum up points from all matches for this player
        Object.values(allMatchPoints).forEach(matchStats => {
            if (matchStats[index]) {
                totalPoints += matchStats[index].points;
                totalExact += matchStats[index].exact;
                totalDirection += matchStats[index].direction;
            }
        });

        return { name, totalPoints, totalExact, totalDirection };
    });

    // 2. Sort by Points (Highest first)
    totals.sort((a, b) => b.totalPoints - a.totalPoints);

    // 3. Render HTML
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = ''; // Clear current

    totals.forEach((player, i) => {
        const row = document.createElement('tr');
        row.className = "border-b hover:bg-gray-50 transition";
        
        // Highlight the top 3
        let rankColor = "text-gray-600";
        if (i === 0) rankColor = "text-yellow-500"; // Gold
        if (i === 1) rankColor = "text-gray-400";   // Silver
        if (i === 2) rankColor = "text-orange-400"; // Bronze

        row.innerHTML = `
            <td class="p-3 text-right flex items-center gap-2">
                <span class="font-bold ${rankColor}">#${i + 1}</span>
                ${player.name}
            </td>
            <td class="p-3 text-lg text-blue-600">${player.totalPoints}</td>
            <td class="p-3 text-sm text-green-700 font-normal bg-green-50 rounded">${player.totalExact}</td>
            <td class="p-3 text-sm text-gray-500 font-normal">${player.totalDirection}</td>
        `;
        tbody.appendChild(row);
    });
}
