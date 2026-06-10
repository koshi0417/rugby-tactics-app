class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'rugbyTacticsPlays';
    }

    getPlays() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    savePlay(name, players, lines) {
        const plays = this.getPlays();
        const newPlay = {
            id: Date.now().toString(),
            name: name,
            players: players, // Array of {id, type, x, y}
            lines: lines,     // Array of {id, type, path}
            date: new Date().toISOString()
        };
        plays.push(newPlay);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plays));
        return newPlay;
    }

    deletePlay(id) {
        const plays = this.getPlays();
        const filtered = plays.filter(p => p.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }

    getPlay(id) {
        const plays = this.getPlays();
        return plays.find(p => p.id === id);
    }
}

window.storageManager = new StorageManager();
