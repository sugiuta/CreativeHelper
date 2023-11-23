
export class playerInfo {
    constructor (place, level, items, teleport) {
        this.place = place;
        this.level = level;
        this.items = items;
        this.teleport = teleport;
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
    constructor (id, x, y, z) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = z;
    }
}