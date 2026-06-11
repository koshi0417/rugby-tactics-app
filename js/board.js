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
        
        this.isPlaying = false;
        this.animationId = null;
        this.initialState = null;
        
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

    addPlayer(type, x, y, id = null, hasBall = false) {
        if (type === 'ball' && !id) {
            const rect = this.pitchContainer.getBoundingClientRect();
            let closestId = this.findClosestPlayer((x / 100) * rect.width, (y / 100) * rect.height);
            if (closestId) {
                const player = this.players.find(p => p.id === closestId);
                if (player && player.type !== 'ball') {
                    const elX = parseFloat(player.element.style.left);
                    const elY = parseFloat(player.element.style.top);
                    const dist = Math.sqrt(Math.pow(elX - x, 2) + Math.pow(elY - y, 2));
                    if (dist < 5) {
                        this.giveBallTo(closestId);
                        return; // Absorb ball into player
                    }
                }
            }
        }

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
        this.players.push({ id: playerId, type, element: el, hasBall: false });
        
        if (hasBall) {
            this.giveBallTo(playerId);
        }
    }

    giveBallTo(playerId) {
        this.players.forEach(p => {
            p.hasBall = false;
            p.element.classList.remove('has-ball');
        });
        const player = this.players.find(p => p.id === playerId);
        if (player) {
            player.hasBall = true;
            player.element.classList.add('has-ball');
        }
    }

    toggleBall(id) {
        const player = this.players.find(p => p.id === id);
        if (!player) return;
        if (player.hasBall) {
            player.hasBall = false;
            player.element.classList.remove('has-ball');
        } else {
            this.giveBallTo(id);
        }
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
        
        element.addEventListener('dblclick', (e) => {
            if (this.currentTool === 'pointer') {
                this.toggleBall(id);
                e.stopPropagation();
            }
        });

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
        this.currentPathElement.setAttribute('fill', 'none');
        this.currentPathElement.setAttribute('stroke-width', '3');
        this.currentPathElement.setAttribute('stroke-linecap', 'round');
        this.currentPathElement.setAttribute('stroke-linejoin', 'round');
        this.currentPathElement.setAttribute('class', 'tactics-line');
        this.currentPathElement.dataset.id = 'line_' + Date.now();

        if (this.currentTool === 'pass' || this.currentTool === 'kick') {
            this.passStartCoords = coords;
            this.passStartPlayerId = this.findClosestPlayer(coords.x, coords.y);
            if (this.passStartPlayerId) {
                const p = this.players.find(pl => pl.id === this.passStartPlayerId);
                const rect = this.pitchContainer.getBoundingClientRect();
                const pX = (parseFloat(p.element.style.left) / 100) * rect.width;
                const pY = (parseFloat(p.element.style.top) / 100) * rect.height;
                this.currentPathData = `M ${pX} ${pY}`;
                this.passStartCoords = {x: pX, y: pY};
            }
        }

        this.currentPathElement.setAttribute('d', this.currentPathData);

        if (this.currentTool === 'run') {
            this.currentPathElement.setAttribute('stroke', '#f8fafc');
        } else if (this.currentTool === 'pass') {
            this.currentPathElement.setAttribute('stroke', '#f8fafc');
            this.currentPathElement.setAttribute('stroke-dasharray', '8,8');
        } else if (this.currentTool === 'kick') {
            this.currentPathElement.setAttribute('stroke', '#eab308');
            this.currentPathElement.setAttribute('stroke-dasharray', '2,6');
            this.currentPathElement.setAttribute('stroke-width', '4');
        }

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
        
        if (this.currentTool === 'pass' || this.currentTool === 'kick') {
            this.currentPathData = `M ${this.passStartCoords.x} ${this.passStartCoords.y} L ${coords.x} ${coords.y}`;
        } else {
            this.currentPathData += ` L ${coords.x} ${coords.y}`;
        }
        this.currentPathElement.setAttribute('d', this.currentPathData);
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        
        if (this.currentPathElement && this.currentPathData) {
            this.addArrowhead();
            
            let playerId = null;
            let receiverId = null;

            if (this.currentTool === 'pass' || this.currentTool === 'kick') {
                playerId = this.passStartPlayerId;
                const match = this.currentPathData.match(/L\s+([0-9.-]+)\s+([0-9.-]+)$/);
                if (match) {
                    receiverId = this.findClosestPlayer(parseFloat(match[1]), parseFloat(match[2]));
                    if (receiverId) {
                        const p = this.players.find(pl => pl.id === receiverId);
                        const rect = this.pitchContainer.getBoundingClientRect();
                        const pX = (parseFloat(p.element.style.left) / 100) * rect.width;
                        const pY = (parseFloat(p.element.style.top) / 100) * rect.height;
                        this.currentPathData = `M ${this.passStartCoords.x} ${this.passStartCoords.y} L ${pX} ${pY}`;
                        this.currentPathElement.setAttribute('d', this.currentPathData);
                    }
                }
            } else {
                const match = this.currentPathData.match(/^M\s+([0-9.-]+)\s+([0-9.-]+)/);
                if (match) {
                    playerId = this.findClosestPlayer(parseFloat(match[1]), parseFloat(match[2]));
                }
            }

            this.lines.push({
                id: this.currentPathElement.dataset.id,
                type: this.currentTool,
                d: this.currentPathData,
                pathElement: this.currentPathElement,
                playerId: playerId,
                receiverId: receiverId
            });
        }
        this.currentPathElement = null;
        this.currentPathData = "";
        this.passStartCoords = null;
        this.passStartPlayerId = null;
    }

    findClosestPlayer(svgX, svgY) {
        const rect = this.pitchContainer.getBoundingClientRect();
        const pX = (svgX / rect.width) * 100;
        const pY = (svgY / rect.height) * 100;
        
        let closestId = null;
        let minDistance = 10; // Threshold, roughly 10% of width
        
        this.players.forEach(p => {
            const elX = parseFloat(p.element.style.left);
            const elY = parseFloat(p.element.style.top);
            const dist = Math.sqrt(Math.pow(elX - pX, 2) + Math.pow(elY - pY, 2));
            if (dist < minDistance) {
                minDistance = dist;
                closestId = p.id;
            }
        });
        return closestId;
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
                y: parseFloat(p.element.style.top),
                hasBall: p.hasBall
            };
        });

        const linesData = this.lines.map(l => {
            return {
                id: l.id,
                type: l.type,
                d: l.d,
                playerId: l.playerId,
                receiverId: l.receiverId
            };
        });

        return { players: playersData, lines: linesData };
    }

    loadState(state) {
        this.clearBoard();
        
        if (state.players) {
            state.players.forEach(p => {
                this.addPlayer(p.type, p.x, p.y, p.id, p.hasBall);
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
                    pathElement: this.currentPathElement,
                    playerId: l.playerId,
                    receiverId: l.receiverId
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
        this.initialState = null;
        if (this.isPlaying) {
            cancelAnimationFrame(this.animationId);
            this.isPlaying = false;
        }
    }

    // --- Simulation Logic ---
    playSimulation() {
        if (this.isPlaying) return;
        
        // Save initial state for reset if not already saved
        if (!this.initialState) {
            this.initialState = this.getState();
        }
        this.isPlaying = true;
        this.setTool('pointer');

        const duration = 3000; // 3 seconds for full play
        const startTime = performance.now();

        // 1. Build Timeline
        const runs = this.lines.filter(l => l.type === 'run');
        const passes = this.lines.filter(l => l.type === 'pass' || l.type === 'kick');
        
        const playerRuns = {};
        runs.forEach(r => {
            if (r.playerId) playerRuns[r.playerId] = r;
        });

        let ballEvents = [];
        let initialCarrier = this.players.find(p => p.hasBall);
        
        if (initialCarrier) {
            const carrierPass = passes.find(p => p.playerId === initialCarrier.id);
            if (carrierPass) {
                let t1 = 0;
                let t2 = 0.3; // pass happens immediately and takes 30% time
                
                ballEvents.push({ startT: 0, endT: t1, type: 'carry', playerId: initialCarrier.id });
                ballEvents.push({ startT: t1, endT: t2, type: 'pass', path: carrierPass.pathElement });
                
                if (carrierPass.receiverId) {
                    ballEvents.push({ startT: t2, endT: 1.0, type: 'carry', playerId: carrierPass.receiverId });
                }
            } else {
                ballEvents.push({ startT: 0, endT: 1.0, type: 'carry', playerId: initialCarrier.id });
            }
        }

        // Hide static has-ball indicators and create an animated ball element
        this.players.forEach(p => p.element.classList.remove('has-ball'));
        
        let animBall = document.createElement('div');
        animBall.className = 'player-node ball anim-ball';
        animBall.style.zIndex = '20';
        animBall.style.display = ballEvents.length > 0 ? 'block' : 'none';
        this.playersLayer.appendChild(animBall);

        const animate = (time) => {
            if (!this.isPlaying) return;
            
            let elapsed = time - startTime;
            let progress = elapsed / duration;
            if (progress > 1) progress = 1;

            const rect = this.pitchContainer.getBoundingClientRect();

            // Animate Players
            Object.keys(playerRuns).forEach(pId => {
                const runLine = playerRuns[pId];
                const player = this.players.find(p => p.id === pId);
                if (player) {
                    const pt = runLine.pathElement.getPointAtLength(progress * runLine.pathElement.getTotalLength());
                    const pX = (pt.x / rect.width) * 100;
                    const pY = (pt.y / rect.height) * 100;
                    player.element.style.left = `${pX}%`;
                    player.element.style.top = `${pY}%`;
                }
            });

            // Animate Ball
            if (ballEvents.length > 0) {
                let currentEvent = ballEvents.find(e => progress >= e.startT && progress <= e.endT);
                if (!currentEvent && progress >= 1) currentEvent = ballEvents[ballEvents.length - 1];
                
                if (currentEvent) {
                    let bX, bY;
                    if (currentEvent.type === 'carry') {
                        const carrier = this.players.find(p => p.id === currentEvent.playerId);
                        if (carrier) {
                            bX = carrier.element.style.left;
                            bY = carrier.element.style.top;
                            animBall.style.left = `calc(${bX} + 6px)`; // slight offset
                            animBall.style.top = `calc(${bY} + 6px)`;
                        }
                    } else if (currentEvent.type === 'pass') {
                        const passProg = (progress - currentEvent.startT) / (currentEvent.endT - currentEvent.startT);
                        const pt = currentEvent.path.getPointAtLength(passProg * currentEvent.path.getTotalLength());
                        animBall.style.left = `${(pt.x / rect.width) * 100}%`;
                        animBall.style.top = `${(pt.y / rect.height) * 100}%`;
                    }
                }
            }

            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.isPlaying = false;
                // Leave the anim ball where it is until reset
            }
        };

        this.animationId = requestAnimationFrame(animate);
    }

    resetSimulation() {
        if (this.isPlaying) {
            cancelAnimationFrame(this.animationId);
            this.isPlaying = false;
        }
        
        // Remove animation ball
        const animBall = this.playersLayer.querySelector('.anim-ball');
        if (animBall) animBall.remove();

        if (this.initialState) {
            this.loadState(this.initialState);
            this.initialState = null;
        }
    }
}

window.Board = Board;
