class Board {
    constructor() {
        this.pitchContainer = document.getElementById('pitch-container');
        this.playersLayer = document.getElementById('players-layer');
        this.drawingLayer = document.getElementById('drawing-layer');
        
        this.players = []; // {id, type, element}
        this.lines = []; // {id, type, pathElement, d}
        
        this.currentTool = 'pointer'; // pointer, run, pass, kick, erase
        this.isDrawing = false;
        this.currentPathElement = null;
        this.currentPathData = "";
        
        this.draggedElement = null;
        
        this.setupDragAndDrop();
        this.setupDrawing();
    }

    setTool(tool) {
        this.currentTool = tool;
        if (tool !== 'pointer') {
            this.drawingLayer.classList.add('drawing-active');
        } else {
            this.drawingLayer.classList.remove('drawing-active');
        }
    }

    // --- Drag and Drop Logic ---
    setupDragAndDrop() {
        // Handle dropping items from palette onto the pitch
        this.pitchContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.pitchContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('text/plain');
            if (type) {
                const rect = this.pitchContainer.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                this.addPlayer(type, x, y);
            }
        });

        // Setup palette items drag start in app.js
    }

    addPlayer(type, x, y, id = null) {
        const playerId = id || 'player_' + Date.now();
        const el = document.createElement('div');
        el.className = `player-node ${type}`;
        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        
        const deleteBadge = document.createElement('div');
        deleteBadge.className = 'delete-badge';
        deleteBadge.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        deleteBadge.onclick = (e) => {
            e.stopPropagation();
            this.removePlayer(playerId);
        };
        el.appendChild(deleteBadge);

        // Make it draggable
        this.makeNodeDraggable(el, playerId);

        this.playersLayer.appendChild(el);
        this.players.push({ id: playerId, type, element: el });
    }

    removePlayer(id) {
        const index = this.players.findIndex(p => p.id === id);
        if (index > -1) {
            this.players[index].element.remove();
            this.players.splice(index, 1);
        }
    }

    makeNodeDraggable(element, id) {
        let isDragging = false;
        
        element.addEventListener('mousedown', (e) => {
            if (this.currentTool !== 'pointer') return;
            isDragging = true;
            this.draggedElement = element;
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.draggedElement) return;
            const rect = this.pitchContainer.getBoundingClientRect();
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Constrain
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            
            this.draggedElement.style.left = `${x}%`;
            this.draggedElement.style.top = `${y}%`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            this.draggedElement = null;
        });

        // Touch support
        element.addEventListener('touchstart', (e) => {
            if (this.currentTool !== 'pointer') return;
            isDragging = true;
            this.draggedElement = element;
            e.stopPropagation();
        }, {passive: false});

        document.addEventListener('touchmove', (e) => {
            if (!isDragging || !this.draggedElement) return;
            // e.preventDefault();
            const touch = e.touches[0];
            const rect = this.pitchContainer.getBoundingClientRect();
            let x = ((touch.clientX - rect.left) / rect.width) * 100;
            let y = ((touch.clientY - rect.top) / rect.height) * 100;
            
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            
            this.draggedElement.style.left = `${x}%`;
            this.draggedElement.style.top = `${y}%`;
        }, {passive: false});

        document.addEventListener('touchend', () => {
            isDragging = false;
            this.draggedElement = null;
        });
    }

    // --- Drawing Logic ---
    setupDrawing() {
        this.drawingLayer.addEventListener('mousedown', this.startDrawing.bind(this));
        this.drawingLayer.addEventListener('mousemove', this.draw.bind(this));
        this.drawingLayer.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.drawingLayer.addEventListener('mouseleave', this.stopDrawing.bind(this));

        // Touch support
        this.drawingLayer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousedown", {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.drawingLayer.dispatchEvent(mouseEvent);
        }, {passive: false});

        this.drawingLayer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.drawingLayer.dispatchEvent(mouseEvent);
        }, {passive: false});

        this.drawingLayer.addEventListener('touchend', (e) => {
            const mouseEvent = new MouseEvent("mouseup", {});
            this.drawingLayer.dispatchEvent(mouseEvent);
        });
    }

    getSVGCoords(e) {
        const pt = this.drawingLayer.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(this.drawingLayer.getScreenCTM().inverse());
        return { x: svgP.x, y: svgP.y };
    }

    startDrawing(e) {
        if (this.currentTool === 'pointer' || this.currentTool === 'erase') return;
        this.isDrawing = true;
        const coords = this.getSVGCoords(e);
        this.currentPathData = `M ${coords.x} ${coords.y}`;
        
        this.currentPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.currentPathElement.setAttribute('d', this.currentPathData);
        this.currentPathElement.setAttribute('fill', 'none');
        this.currentPathElement.setAttribute('stroke-width', '3');
        this.currentPathElement.setAttribute('stroke-linecap', 'round');
        this.currentPathElement.setAttribute('stroke-linejoin', 'round');
        this.currentPathElement.setAttribute('class', 'tactics-line');
        this.currentPathElement.dataset.id = 'line_' + Date.now();

        if (this.currentTool === 'run') {
            this.currentPathElement.setAttribute('stroke', '#f8fafc');
        } else if (this.currentTool === 'pass') {
            this.currentPathElement.setAttribute('stroke', '#f8fafc');
            this.currentPathElement.setAttribute('stroke-dasharray', '8,8');
        } else if (this.currentTool === 'kick') {
            this.currentPathElement.setAttribute('stroke', '#eab308');
            // A bit hacky wave approximation with dashes
            this.currentPathElement.setAttribute('stroke-dasharray', '2,6');
            this.currentPathElement.setAttribute('stroke-width', '4');
        }

        // Add erase event
        this.currentPathElement.addEventListener('click', (e) => {
            if (this.currentTool === 'erase') {
                this.removeLine(e.target.dataset.id);
            }
        });

        this.drawingLayer.appendChild(this.currentPathElement);
    }

    draw(e) {
        if (!this.isDrawing || !this.currentPathElement) return;
        const coords = this.getSVGCoords(e);
        this.currentPathData += ` L ${coords.x} ${coords.y}`;
        this.currentPathElement.setAttribute('d', this.currentPathData);
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        // Save line data
        if (this.currentPathElement && this.currentPathData) {
            // Add arrowhead
            this.addArrowhead();
            this.lines.push({
                id: this.currentPathElement.dataset.id,
                type: this.currentTool,
                d: this.currentPathData,
                pathElement: this.currentPathElement
            });
        }
        this.currentPathElement = null;
        this.currentPathData = "";
    }

    addArrowhead() {
        // SVG defs setup for marker if not exists
        let defs = this.drawingLayer.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            this.drawingLayer.appendChild(defs);
            
            const createMarker = (id, color) => {
                const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
                marker.setAttribute('id', id);
                marker.setAttribute('viewBox', '0 0 10 10');
                marker.setAttribute('refX', '9');
                marker.setAttribute('refY', '5');
                marker.setAttribute('markerWidth', '6');
                marker.setAttribute('markerHeight', '6');
                marker.setAttribute('orient', 'auto-start-reverse');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
                path.setAttribute('fill', color);
                marker.appendChild(path);
                return marker;
            };

            defs.appendChild(createMarker('arrow-white', '#f8fafc'));
            defs.appendChild(createMarker('arrow-yellow', '#eab308'));
        }

        if (this.currentTool === 'kick') {
            this.currentPathElement.setAttribute('marker-end', 'url(#arrow-yellow)');
        } else {
            this.currentPathElement.setAttribute('marker-end', 'url(#arrow-white)');
        }
    }

    removeLine(id) {
        const index = this.lines.findIndex(l => l.id === id);
        if (index > -1) {
            this.lines[index].pathElement.remove();
            this.lines.splice(index, 1);
        }
    }

    // --- State Management ---
    getState() {
        const playersData = this.players.map(p => {
            return {
                id: p.id,
                type: p.type,
                x: parseFloat(p.element.style.left),
                y: parseFloat(p.element.style.top)
            };
        });

        const linesData = this.lines.map(l => {
            return {
                id: l.id,
                type: l.type,
                d: l.d
            };
        });

        return { players: playersData, lines: linesData };
    }

    loadState(state) {
        this.clearBoard();
        
        if (state.players) {
            state.players.forEach(p => {
                this.addPlayer(p.type, p.x, p.y, p.id);
            });
        }

        if (state.lines) {
            state.lines.forEach(l => {
                this.currentTool = l.type;
                this.currentPathData = l.d;
                
                this.currentPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                this.currentPathElement.setAttribute('d', l.d);
                this.currentPathElement.setAttribute('fill', 'none');
                this.currentPathElement.setAttribute('stroke-width', '3');
                this.currentPathElement.setAttribute('stroke-linecap', 'round');
                this.currentPathElement.setAttribute('stroke-linejoin', 'round');
                this.currentPathElement.setAttribute('class', 'tactics-line');
                this.currentPathElement.dataset.id = l.id;

                if (l.type === 'run') {
                    this.currentPathElement.setAttribute('stroke', '#f8fafc');
                } else if (l.type === 'pass') {
                    this.currentPathElement.setAttribute('stroke', '#f8fafc');
                    this.currentPathElement.setAttribute('stroke-dasharray', '8,8');
                } else if (l.type === 'kick') {
                    this.currentPathElement.setAttribute('stroke', '#eab308');
                    this.currentPathElement.setAttribute('stroke-dasharray', '2,6');
                    this.currentPathElement.setAttribute('stroke-width', '4');
                }

                this.addArrowhead();
                
                this.currentPathElement.addEventListener('click', (e) => {
                    if (this.currentTool === 'erase') {
                        this.removeLine(e.target.dataset.id);
                    }
                });

                this.drawingLayer.appendChild(this.currentPathElement);
                
                this.lines.push({
                    id: l.id,
                    type: l.type,
                    d: l.d,
                    pathElement: this.currentPathElement
                });
            });
            this.currentTool = 'pointer'; // Reset back
            this.currentPathElement = null;
        }
    }

    clearBoard() {
        this.players.forEach(p => p.element.remove());
        this.players = [];
        
        // Remove lines but keep defs
        const defs = this.drawingLayer.querySelector('defs');
        this.drawingLayer.innerHTML = '';
        if (defs) this.drawingLayer.appendChild(defs);
        this.lines = [];
    }
}

window.Board = Board;
