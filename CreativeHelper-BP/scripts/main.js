import { Vector, system, world } from "@minecraft/server"
import { ActionFormData, ModalFormData } from "@minecraft/server-ui"
import { playerInfo, placeInfo, levelInfo, teleportInfo } from "./class.js"

let playersData = {};

world.afterEvents.worldInitialize.subscribe(() => {
    if (world.getDynamicProperty(`playersData`) == null) return;
    playersData = JSON.parse(world.getDynamicProperty(`playersData`));
});

// デバッグ用
world.afterEvents.chatSend.subscribe(csEvent => {
    if (csEvent.message == "clear") {
        world.clearDynamicProperties();
        world.sendMessage(`保存データを削除しました`);
    }
});

world.afterEvents.playerJoin.subscribe(pjEvent => {
    if (playersData[pjEvent.playerName] != null) return;
    let placeData = new placeInfo(false, 0, 5);
    let levelData = new levelInfo(false, 5, 5);
    let itemsData = {
        "コマンドブロック": "command_block",
        "ストラクチャーブロック": "structure_block",
        "ストラクチャーヴォイド": "minecraft:structure_void",
        "バリアブロック": "barrier"
    };
    let teleportData = {
        "初期スポーン地点": new teleportInfo("overworld", world.getDefaultSpawnLocation().x, 80, world.getDefaultSpawnLocation().z)
    };
    let defaultData = new playerInfo(placeData, levelData, itemsData, teleportData);
    playersData[pjEvent.playerName] = defaultData;
    savedPlayersData();
});

// プレイヤーのデータを保存する
function savedPlayersData() {
    let playersDataStr = JSON.stringify(playersData);
    world.setDynamicProperty(`playersData`, playersDataStr);
};

// アイテム使用を検知
world.afterEvents.itemUse.subscribe(iuEvent => {
    if (iuEvent.source.typeId != `minecraft:player` || iuEvent.itemStack.typeId != `sugiuta:creative_helper`) return;
    actionFormAppear(iuEvent.source);
});

// 基本メニューの表示
function actionFormAppear (p) {
    const actionForm = new ActionFormData()
    .title(`§2§lクリエイティブ§fヘルパー`)
    .button(`連鎖ブロック`, `textures/blocks/command_block_back_mipmap`)
    .button(`ゲーム設定の変更`, `textures/items/apple_golden`)
    .button(`アイテムの取得`, `textures/items/totem`)
    .button(`カスタムテレポート`, `textures/items/ender_pearl`)
    .button(`整地`, `textures/items/iron_shovel`)
    .button(`エフェクト付与`, `textures/items/potion_bottle_splash_heal`)
    .button(`カスタムアイテムの作成`, `textures/items/iron_pickaxe`)
    actionForm.show(p).then((response) => {
        if (!response.canceled) modalFormAppear(p, response.selection);
    })
};

function modalFormAppear (p, n) {
    switch (n) {
        case 0:
            const blockForm = new ModalFormData()
            .title(`§2§l連鎖ブロック`)
            .toggle(`[機能をオンにする]`, playersData[p.name].place.enabled)
            .dropdown(`[ブロックの配置方向を選択]`, [`縦`, `横`, `奥`, `手前`], playersData[p.name].place.direction)
            .slider(`[個数指定]`, 1, 10, 1, playersData[p.name].place.count)
            blockForm.show(p).then(response => {
                if (response.canceled) return;
                playersData[p.name].place.enabled = response.formValues[0];
                playersData[p.name].place.direction = response.formValues[1];
                playersData[p.name].place.count = response.formValues[2];
                savedPlayersData();
            });
            break;
        case 1:
            const ruleForm = new ModalFormData()
            .title(`§2§lゲーム設定の変更`)
            .dropdown(`[ゲームモードの変更]`, [`サバイバル`, `クリエイティブ`, `アドベンチャー`, `スペクテイター`], 0)
            ruleForm.show(p).then(response => {
                changedGamemode(p, parseInt(response.formValues[0]));
            });
            break;
        case 2:
            let itemList = createItemList(p);
            const itemForm = new ModalFormData()
            .title(`§2§lアイテムの取得`)
            .dropdown(`[アイテムを選択]`, itemList["nameList"], 0)
            .slider(`[個数指定]`, 1, 64, 1, 1)
            .toggle(`[アイテムリストを編集]`, false)
            .toggle(`[手持ちアイテムの削除]`, false)
            itemForm.show(p).then(response => {
                if (response.formValues[2]) {
                    itemListFormAppear(p);
                    return;
                }
                if (response.formValues[3]) {
                    p.runCommandAsync(`clear @s`);
                    p.runCommandAsync(`give @s sugiuta:creative_helper`);
                    return;
                }
                let items = itemList["idList"];
                p.runCommandAsync(`give @s ${items[response.formValues[0]]} ${response.formValues[1]}`);
            });
            break;
        case 3:
            let teleportList = createTeleportList(p);
            const teleportForm = new ModalFormData()
            .title(`§2§lカスタムテレポート`)
            .dropdown(`[テレポート先を選択]`, teleportList["nameList"], 0)
            .toggle(`[アイテムリストを編集]`, false)
            teleportForm.show(p).then(response => {
                if (response.formValues[1]) {
                    teleportListFormAppear(p);
                    return;
                }
                let options = {
                    dimension: teleportList["dimentionList"][response.formValues[0]]
                };
                let location = teleportList["locationList"][response.formValues[0]];
                p.teleport(location, options);
            })
            break;
        case 4:
            const levelForm = new ModalFormData()
            .title(`§2§l整地`)
            .toggle(`[機能をオンにする]`, playersData[p.name].level.enabled)
            .slider(`[半径]`, 1, 10, 1, playersData[p.name].level.radius)
            .slider(`[高さ]`, 1, 10, 1, playersData[p.name].level.height)
            levelForm.show(p).then(response => {
                playersData[p.name].level.enabled = response.formValues[0];
                playersData[p.name].level.radius = response.formValues[1];
                playersData[p.name].level.height = response.formValues[2];
                savedPlayersData();
            })
            break;
        case 5:
            const effectForm = new ModalFormData()
            .title(`§2§lエフェクト付与`)
            .dropdown(`[エフェクトを選択]`, [`移動速度上昇`, `跳躍力上昇`, `暗視`, `効果削除`], 0)
            .slider(`[効果の強さ]`, 1, 10, 1, 1)
            .toggle(`[パーティクルの削除]`)
            effectForm.show(p).then(response => {
                addPlayerEffect(p, parseInt(response.formValues[0]), response.formValues[1], response.formValues[2]);
            })
            break;
        case 6:
            const createItemForm = new ModalFormData()
            .title(`§2§lカスタムアイテムの作成`)
            .textField(`[アイテム名を入力]`, `アイテム名を入力してください`, `minecraft:`)
            .slider(`[個数指定]`, 1, 64, 1, 1)
            .dropdown(`[オプションを選択]`, [`破壊可能`, `設置可能`], 0)
            .textField(`[ブロック名を入力(必須)]`, `ブロック名を入力してください`, `minecraft:`)
            createItemForm.show(p).then(response => {
                if (response.formValues[2] == 0) {
                    p.runCommandAsync(`give @s ${response.formValues[0]} ${response.formValues[1]} 0 {"can_destroy": {"blocks": ["${response.formValues[3]}"]}}`);
                } else {
                    p.runCommandAsync(`give @s ${response.formValues[0]} ${response.formValues[1]} 0 {"can_place_on": {"blocks": ["${response.formValues[3]}"]}}`);
                }
            })
            break;
        default:
            break;
    }
};

function changedGamemode(p, n) {
    switch (n) {
        case 0:
            p.runCommandAsync(`gamemode survival @s`);
            break;
        case 1:
            p.runCommandAsync(`gamemode creative @s`);
            break;
        case 2:
            p.runCommandAsync(`gamemode adventure @s`);
            break;
        case 3:
            p.runCommandAsync(`gamemode spectator @s`);
            break;
        default:
            break;
    }
}

function createTeleportList(p) {
    let nameList = [];
    let dimentionList = [];
    let locationList = [];
    for (let key in playersData[p.name].teleport) {
        nameList.push(key);
        let dimension = world.getDimension(playersData[p.name].teleport[key].id);
        dimentionList.push(dimension);
        let x = playersData[p.name].teleport[key].x;
        let y = playersData[p.name].teleport[key].y;
        let z = playersData[p.name].teleport[key].z;
        let location = new Vector(x, y, z);
        locationList.push(location);
    }
    let teleportList = {
        nameList: nameList,
        dimentionList: dimentionList,
        locationList: locationList
    };
    return teleportList;
}

function createItemList(p) {
    let nameList = [];
    let idList = [];
    for (let key in playersData[p.name].items) {
        nameList.push(key);
        idList.push(playersData[p.name].items[key]);
    }
    let itemList = {
        nameList: nameList,
        idList: idList
    };
    return itemList;
}

function itemListFormAppear(p) {
    const itemListForm = new ModalFormData()
    .title(`§f§lアイテムリストを編集`)
    .dropdown(`[編集内容を選択]`, [`アイテムを追加`, `アイテムを削除`], 0)
    .textField(`[アイテム名を入力]`, `例: コマンドブロック`)
    .textField(`[アイテムIDを入力]`, `例: command_block`)
    itemListForm.show(p).then(response => {
        switch (response.formValues[0]) {
            case 0:
                if (response.formValues[2].length == 0) return;
                playersData[p.name].items[response.formValues[1]] = response.formValues[2];
                savedPlayersData();
                break;
            case 1:
                if (response.formValues[1].length == 0) return;
                delete playersData[p.name].items[response.formValues[1]];
                savedPlayersData();
                break;
            default:
                break;
        }
    });
}

function teleportListFormAppear(p) {
    const teleportListForm = new ModalFormData()
    .title(`§f§lテレポート先のリストを編集`)
    .dropdown(`[編集内容を選択]`, [`テレポート先を追加`, `テレポート先を削除`], 0)
    .textField(`[地点名を入力]`, `例: 初期スポーン地点`)
    .dropdown(`[ディメンションを選択]`, [`オーバーワールド`, `ネザー`, `エンド`], 0)
    .textField(`[X座標を入力]`, `例: 10`)
    .textField(`[Y座標を入力]`, `例: 50`)
    .textField(`[Z座標を入力]`, `例: -100`)
    teleportListForm.show(p).then(response => {
        switch (response.formValues[0]) {
            case 0:
                if (response.formValues[3].length == 0 || response.formValues[4].length == 0 || response.formValues[5].length == 0) return;
                if (response.formValues[2] == 0) {
                    let teleportData = new teleportInfo(`overworld`, parseInt(response.formValues[3]), parseInt(response.formValues[4]), parseInt(response.formValues[5]));
                    playersData[p.name].teleport[response.formValues[1]] = teleportData;
                } else if (response.formValues[2] == 1) {
                    let teleportData = new teleportInfo(`nether`, parseInt(response.formValues[3]), parseInt(response.formValues[4]), parseInt(response.formValues[5]));
                    playersData[p.name].teleport[response.formValues[1]] = teleportData;
                } else {
                    let teleportData = new teleportInfo(`the_end`, parseInt(response.formValues[3]), parseInt(response.formValues[4]), parseInt(response.formValues[5]));
                    playersData[p.name].teleport[response.formValues[1]] = teleportData;
                }
                savedPlayersData();
                break;
            case 1:
                if (response.formValues[1].length == 0) return;
                delete playersData[p.name].teleport[response.formValues[1]];
                savedPlayersData();
                break;
            default:
                break;
        }
    });
}

function addPlayerEffect(p, n, l, b) {
    switch (n) {
        case 0:
            p.runCommandAsync(`effect @s speed 10000 ${l} ${b}`);
            break;
        case 1:
        p.runCommandAsync(`effect @s jump_boost 10000 ${l} ${b}`);
            break;
        case 2:
        p.runCommandAsync(`effect @s night_vision 10000 ${l} ${b}`);
            break;
        case 3:
            p.runCommandAsync(`effect @s clear`);
            break;
        default:
            break;
    }
}

world.afterEvents.playerPlaceBlock.subscribe(pbEvent => {
    let playerData = playersData[pbEvent.player.name];
    if (!playerData.place.enabled) return;

    let clone = pbEvent.block.permutation.clone();
    let direction = pbEvent.player.getRotation().y;

    switch (playerData.place.direction) {
        case 0:
            for (let y = 1; y <= playerData.place.count-1; y += 1) {
                pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x, pbEvent.block.location.y + y, pbEvent.block.location.z)).setPermutation(clone);
            }
            break;
        case 1:
            for (let x = 1; x <= playerData.place.count; x += 1) {
                if ((-180 <= direction && direction < -135) || (-45 <= direction && direction < 45) || (135 <= direction && direction <= 180)) {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x + x, pbEvent.block.location.y, pbEvent.block.location.z)).setPermutation(clone);
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x - x, pbEvent.block.location.y, pbEvent.block.location.z)).setPermutation(clone);
                } else { // Z軸方向
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x, pbEvent.block.location.y, pbEvent.block.location.z + x)).setPermutation(clone);
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x, pbEvent.block.location.y, pbEvent.block.location.z - x)).setPermutation(clone);
                }
            }
            break;
        case 2:
            for (let z = 1; z <= playerData.place.count-1; z += 1) {
                if ((-180 <= direction && direction < -135) || (135 <= direction && direction <= 180)) {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x, pbEvent.block.location.y, pbEvent.block.location.z - z)).setPermutation(clone);
                } else if (-135 <= direction && direction < -45) {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x + z, pbEvent.block.location.y, pbEvent.block.location.z)).setPermutation(clone);
                } else if (-45 <= direction && direction < 45) {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x, pbEvent.block.location.y, pbEvent.block.location.z + z)).setPermutation(clone);
                } else {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x - z, pbEvent.block.location.y, pbEvent.block.location.z)).setPermutation(clone);
                }
            }
            break;
        case 3:
            for (let z = 1; z <= playerData.place.count-1; z += 1) {
                if ((-180 <= direction && direction < -135) || (135 <= direction && direction <= 180)) {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x, pbEvent.block.location.y, pbEvent.block.location.z + z)).setPermutation(clone);
                } else if (-135 <= direction && direction < -45) {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x - z, pbEvent.block.location.y, pbEvent.block.location.z)).setPermutation(clone);
                } else if (-45 <= direction && direction < 45) {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x, pbEvent.block.location.y, pbEvent.block.location.z - z)).setPermutation(clone);
                } else {
                    pbEvent.dimension.getBlock(new Vector(pbEvent.block.location.x + z, pbEvent.block.location.y, pbEvent.block.location.z)).setPermutation(clone);
                }
            }
        default:
            break;
    }
});

system.runInterval(() => {
    if ((system.currentTick % 10) != 0) return;
    for (let player of world.getAllPlayers()) {
        if (playersData[player.name].level.enabled) {
            player.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":"§f§l整地機能§4§l作動中"}]}`);
            let radius = playersData[player.name].level.radius;
            let height = playersData[player.name].level.height;
            player.runCommandAsync(`fill ~${-radius}~~${-radius} ~${radius}~${height-1}~${radius} air`);
        }
        if (playersData[player.name].place.enabled) {
            player.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":"§f§l連鎖機能§4§l作動中"}]}`);
        }
    }
})