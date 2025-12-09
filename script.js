// script.js

// Initialize icons
feather.replace();

// Logic for checking scores
document.addEventListener('DOMContentLoaded', () => {
    const matchBlocks = document.querySelectorAll('.match-block');

    matchBlocks.forEach(block => {
        const homeInput = block.querySelector('.score-home');
        const awayInput = block.querySelector('.score-away');
        const bets = block.querySelectorAll('.bet-value');

        const checkBets = () => {
            const homeVal = Number(homeInput.value); // Convert to number for comparison
            const awayVal = Number(awayInput.value);
            
            // Check if inputs are empty strings (because Number('') is 0, which is a valid score)
            if (homeInput.value === '' || awayInput.value === '') {
                bets.forEach(bet => {
                    bet.classList.remove('bg-green-700', 'text-white', 'font-bold', 'bg-green-300');
                    bet.classList.add('bg-white'); 
                });
                return;
            }

            bets.forEach(bet => {
                const betText = bet.innerText.trim();
                const [betHomeStr, betAwayStr] = betText.split(' - ').map(s => s.trim());
                const betHome = Number(betHomeStr);
                const betAway = Number(betAwayStr);

                // 1. EXACT SCORE (Bullseye) -> Dark Green
                if (betHome === homeVal && betAway === awayVal) {
                    bet.classList.remove('bg-white', 'bg-green-300');
                    bet.classList.add('bg-green-700', 'text-white', 'font-bold');
                }
                // 2. CORRECT DIRECTION (Winner/Draw) -> Light Green
                // Check if Home Won in both, Away Won in both, or Draw in both
                else if (
                    (betHome > betAway && homeVal > awayVal) || // Home wins
                    (betHome < betAway && homeVal < awayVal) || // Away wins
                    (betHome === betAway && homeVal === awayVal) // Draw
                ) {
                    bet.classList.remove('bg-white', 'bg-green-700', 'text-white');
                    bet.classList.add('bg-green-300', 'font-bold'); // Removed text-white for light green so text is readable
                }
                // 3. NO MATCH -> White
                else {
                    bet.classList.remove('bg-green-700', 'text-white', 'font-bold', 'bg-green-300');
                    bet.classList.add('bg-white');
                }
            });
        };

        homeInput.addEventListener('input', checkBets);
        awayInput.addEventListener('input', checkBets);
    });
});
