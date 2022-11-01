import { world, BlockLocation } from "@minecraft/server"
import { ActionFormData, ModalFormData } from "@minecraft/server-ui"
import config from "./config.js"

let playerList = [];
let itemNameList = ["なし"];
let itemIdList = ["NOTHING"];
let itemDataList = ["0"];

class playerInfo {
    constructor (player, name, place, level) {
        this.player = player;
        this.name = name;
        this.place = place;
        this.level = level;
    }
}

class placeInfo {
    constructor (enabled, direction, count) {
        this.enabled = enabled;
        this.direction = direction;
        this.count = count;
    }
}

class levelInfo {
    constructor (enabled, radius, height) {
        this.enabled = enabled;
        this.radius = radius;
        this.height = height;
    }
}

/* <----- グローバル -----> */

// プレイヤー入室時のデータ取得
world.events.playerJoin.subscribe(pjEvent => {
    let placeData = new placeInfo(false, 0, 1);
    let levelData = new levelInfo(false, 1, 1);
    let player = new playerInfo(pjEvent.player, pjEvent.player.name, placeData, levelData);
    playerList.push(player);
});

// プレイヤー退室時のデータ削除
world.events.playerLeave.subscribe(plEvent => {
    for (let i = 0; i < playerList.length; i++) {
        let playerData = playerList[i];
        if (playerData.name == plEvent.playerName) {
            playerList.splice(i, 1);
            break;
        }
    }
});

// プレイヤーデータをリストから取得する。
function getPlayerData(n) {
    if (playerList.length == 0) return;
    for (let i = 0; i < playerList.length; i++) {
        if (n == playerList[i].name) {
            return playerList[i];
        }
    }
    return undefined;
}

/* <----- メニュー表示 -----> */

// 指定のアイテムを使用した際にメニューを開く
world.events.beforeItemUse.subscribe(useEvent => {
    if (useEvent.source.typeId != "minecraft:player" || useEvent.item.typeId != "minecraft:stick") return;
    actionFormAppear(useEvent.source);
});

// 基本メニューの表示
function actionFormAppear (p) {
    const homeForm = new ActionFormData()
    .title("§2§lクリエイティブ ヘルパー")
    .button("連鎖ブロック", "textures/items/diamond")
    .button("ゲーム設定の変更", "textures/items/ender_pearl")
    .button("アイテムの取得", "textures/items/totem")
    .button("整地(誤使用注意！)", "textures/items/recovery_compass_item")
    homeForm.show(p).then((response) => {
        if (!response.canceled) modalFormAppear(p, response.selection);
    })
};

// モーダルメニューの表示
function modalFormAppear (p, n) {
    let playerData = getPlayerData(p.name);
    if (n == 0) {
        const blockForm = new ModalFormData()
        .title('§2§l連鎖ブロック')
        .toggle(`[機能をオンにする]`, playerData.place.enabled)
        .dropdown('[ブロックの配置方向を選択]', ['縦', '横', '奥', '手前'], playerData.place.direction)
        .slider("[個数指定]", 1, 10, 1, playerData.place.count)
        blockForm.show(p).then(response => {
            playerData.place.enabled = response.formValues[0];
            playerData.place.direction = parseInt(response.formValues[1]);
            playerData.place.count = response.formValues[2];
        })
    } else if (n == 1) {
        const ruleForm = new ModalFormData()
        .title('§2§lゲーム設定の変更')
        .dropdown('[ゲームモードの変更]', ['サバイバル', 'クリエイティブ', 'アドベンチャー'], 0)
        ruleForm.show(p).then(response => {
            p.runCommandAsync(`gamemode ${parseInt(response.formValues[0])} @s`);
        })
    } else if (n == 2) {
        if (itemNameList.length == 1 && itemIdList.length == 1) {
            for (let i = 0; i < config.itemList.targets.length; i++) {
                let item = Object.values(config.itemList.targets[i]);
                itemNameList.push(item[0]);
                itemIdList.push(item[1]);
                itemDataList.push(item[2]);
            }
        }
        const itemForm = new ModalFormData()
        .title('§2§lアイテムの取得')
        .dropdown('[アイテムを選択]', itemNameList, 0)
        .slider("[個数指定]", 1, 64, 1, 1)
        .toggle('[手持ちアイテムの削除]')
        itemForm.show(p).then(response => {
            if (response.formValues[2]) {
                p.runCommandAsync(`clear @s`);
                p.runCommandAsync('give @s stick');
            }
            if (parseInt(response.formValues[0]) == 0) return;
            p.runCommandAsync(`give @s ${itemIdList[parseInt(response.formValues[0])]} ${response.formValues[1]} ${itemDataList[parseInt(response.formValues[0])]}`);
        })
    } else if (n == 3) {
        const levelForm = new ModalFormData()
        .title('§2§l整地(誤使用注意！)')
        .toggle(`[機能をオンにする]`, playerData.level.enabled)
        .slider("[半径]", 1, 10, 1, playerData.level.radius)
        .slider("[高さ]", 1, 10, 1, playerData.level.height)
        levelForm.show(p).then(response => {
            playerData.level.enabled = response.formValues[0];
            playerData.level.radius = response.formValues[1];
            playerData.level.height = response.formValues[2];
        })
    }
};

/* <----- 連鎖ブロック -----> */

// ブロックを配置した際の情報を取得
world.events.blockPlace.subscribe(bpEvent => {
    let playerData = getPlayerData(bpEvent.player.name);
    if (!playerData.place.enabled) return;

    const clone = bpEvent.block.permutation.clone();
    let direction = bpEvent.player.rotation.y;
    if (playerData.place.direction == 0) { // 縦の場合
        for (let y = 1; y <= playerData.place.count; y += 1) {
            bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x, bpEvent.block.location.y + y, bpEvent.block.location.z)).setPermutation(clone);
        }
    } else if (playerData.place.direction == 1) { // 横の場合
        for (let x = 1; x <= playerData.place.count; x += 1) {
            if ((-180 <= direction && direction < -135) || (-45 <= direction && direction < 45) || (135 <= direction && direction <= 180)) { // X軸方向
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x + x, bpEvent.block.location.y, bpEvent.block.location.z)).setPermutation(clone);
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x - x, bpEvent.block.location.y, bpEvent.block.location.z)).setPermutation(clone);
            } else { // Z軸方向
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x, bpEvent.block.location.y, bpEvent.block.location.z + x)).setPermutation(clone);
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x, bpEvent.block.location.y, bpEvent.block.location.z - x)).setPermutation(clone);
            }
        }
    } else if (playerData.place.direction == 2) { // 奥の場合
        for (let z = 1; z <= playerData.place.count; z += 1) {
            if ((-180 <= direction && direction < -135) || (135 <= direction && direction <= 180)) { // bpEvent.block.location.z - z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x, bpEvent.block.location.y, bpEvent.block.location.z - z)).setPermutation(clone);
            } else if (-135 <= direction && direction < -45) { // bpEvent.block.location.x + z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x + z, bpEvent.block.location.y, bpEvent.block.location.z)).setPermutation(clone);
            } else if (-45 <= direction && direction < 45) { // bpEvent.block.location.z + z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x, bpEvent.block.location.y, bpEvent.block.location.z + z)).setPermutation(clone);
            } else { // bpEvent.block.location.x - z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x - z, bpEvent.block.location.y, bpEvent.block.location.z)).setPermutation(clone);
            }
        }
    } else { // 手前の場合
        for (let z = 1; z <= playerData.place.count; z += 1) {
            if ((-180 <= direction && direction < -135) || (135 <= direction && direction <= 180)) { // bpEvent.block.location.z + z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x, bpEvent.block.location.y, bpEvent.block.location.z + z)).setPermutation(clone);
            } else if (-135 <= direction && direction < -45) { // bpEvent.block.location.x - z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x - z, bpEvent.block.location.y, bpEvent.block.location.z)).setPermutation(clone);
            } else if (-45 <= direction && direction < 45) { // bpEvent.block.location.z - z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x, bpEvent.block.location.y, bpEvent.block.location.z - z)).setPermutation(clone);
            } else { // bpEvent.block.location.x + z
                bpEvent.dimension.getBlock(new BlockLocation(bpEvent.block.location.x + z, bpEvent.block.location.y, bpEvent.block.location.z)).setPermutation(clone);
            }
        }
    }
});

/* <----- 整地 -----> */

// 数秒ごとに周囲のブロックを削除
world.events.tick.subscribe(tick => {
    if ((tick.currentTick % 10) != 0) return;
    for (let i = 0; i < playerList.length; i++) {
        if (playerList[i].level.enabled) {
            playerList[i].player.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":"§f§l整地機能§4§l作動中"}]}`);
            try {
                playerList[i].player.runCommandAsync(`fill ~${-playerList[i].level.radius}~~${-playerList[i].level.radius} ~${playerList[i].level.radius}~${playerList[i].level.height-1}~${playerList[i].level.radius} air 0`);
            } catch(error) {}
        }
    }
});
