document.addEventListener('DOMContentLoaded', () => {
    const board = new window.Board();
    const storage = window.storageManager;

    // Setup Toolbar
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toolBtns.forEach(b => b.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            
            const toolId = target.id.replace('tool-', '');
            board.setTool(toolId);
        });
    });

    // Palette Drag Start
    const paletteItems = document.querySelectorAll('.palette-item');
    paletteItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.type);
            // Optionally set drag image
        });

        // Touch support for palette (Tap to select and then tap on board could be implemented, 
        // but for simplicity we rely on drag and drop API for desktop, and touch events on board for moving)
    });

    // Simulation
    document.getElementById('btn-play').addEventListener('click', () => {
        board.playSimulation();
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        board.resetSimulation();
    });

    // Clear Board
    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the board?')) {
            board.clearBoard();
        }
    });

    // Save Play
    const playNameInput = document.getElementById('play-name');
    document.getElementById('btn-save').addEventListener('click', () => {
        const name = playNameInput.value.trim();
        if (!name) {
            alert('Please enter a name for the play.');
            return;
        }

        const state = board.getState();
        if (state.players.length === 0 && state.lines.length === 0) {
            alert('The board is empty.');
            return;
        }

        storage.savePlay(name, state.players, state.lines);
        playNameInput.value = '';
        renderSavedPlays();
    });

    // Render Saved Plays
    const savedPlaysList = document.getElementById('saved-plays-list');
    
    function renderSavedPlays() {
        savedPlaysList.innerHTML = '';
        const plays = storage.getPlays();
        
        plays.forEach(play => {
            const li = document.createElement('li');
            li.className = 'saved-play-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = play.name;
            
            // Load play on click
            nameSpan.addEventListener('click', () => {
                const p = storage.getPlay(play.id);
                if (p) board.loadState(p);
                
                // Reset tools
                toolBtns.forEach(b => b.classList.remove('active'));
                document.getElementById('tool-pointer').classList.add('active');
                board.setTool('pointer');
            });

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-play-btn';
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete play "${play.name}"?`)) {
                    storage.deletePlay(play.id);
                    renderSavedPlays();
                }
            });

            li.appendChild(nameSpan);
            li.appendChild(delBtn);
            savedPlaysList.appendChild(li);
        });
    }

    // Initial render
    renderSavedPlays();
    
    // Add default players to start
    board.addPlayer('attacker', 50, 80);
    board.addPlayer('defender', 50, 40);
    board.addPlayer('ball', 55, 80);
});
