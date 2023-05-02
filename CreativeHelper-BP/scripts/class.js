
export class playerInfo {
    constructor (player, place, level) {
        this.player = player;
        this.place = place;
        this.level = level;
    }
    get name() {
        return this.player.name;
    }
}

export class placeInfo {
    constructor (enabled, direction, count) {
        this.enabled = enabled;
        this.direction = direction;
        this.count = count;
    }
}

export class levelInfo {
    constructor (enabled, radius, height) {
        this.enabled = enabled;
        this.radius = radius;
        this.height = height;
    }
}

export class teleportInfo {
    constructor (name, dimension, location) {
        this.name = name;
        this.dimension = dimension;
        this.location = location;
    }
}