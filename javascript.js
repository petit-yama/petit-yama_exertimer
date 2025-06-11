
let videoMode = document.getElementById("video_player");
let goalHourTxt;
let goalMinTxt;
let btnarea = document.getElementById("btnarea");
let timerDsp;
let nowSec = document.getElementById("goal_hour");
let goalSec = document.getElementById("goal_min") * 60 * 60 + 30 * 60;
let selectList = document.getElementById("select_list");
let notificationCheckbox = document.getElementById("notification_switch");

// デフォルトリストを設定
const defaultVideoList = ["https://www.youtube.com/embed/PBRGLbrlUEk", "https://www.youtube.com/embed/k27L4PbOZ10"]

let myWorker;
let now;     //残り時間

function draw(maxTime, timebar_len) {
    // 描画コード
    //残り時間をバーで表示
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");
    const canvasWidth = canvas.width - 14;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    fillRoundedRect(ctx, 7, 7, (canvasWidth / maxTime) * timebar_len, canvas.height - 14, 5)

    ///バーの中に残り時間の描画
    ctx.fillStyle = "#000";
    ctx.font = canvas.height / 3 + "px monospace";

    let countHour = Math.floor(now / 60 / 60);
    if (countHour != 0) {
        countHour = countHour + "時間";
    } else { countHour = "" }
    let countMin = Math.floor(now / 60 % 60);
    if (countMin != 0) {
        countMin = countMin + "分";
    } else {
        countMin = ""
    }
    let countSec = Math.floor(now % 60);
    countSec = countSec + "秒";
    let countTxt = countHour + countMin + countSec;
    ctx.fillText("残り " + countTxt, canvas.width * 0.3, canvas.height * 0.65, canvas.width * 0.44);
}

function fillRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.fillStyle = " #25d0b4";
    ctx.fill();
}

// 通知可否の確認
function NotificationSwitch() {
    Notification.requestPermission().then((result) => {
        console.log(result);
        switch (result) {
            case "default":
                notificationCheckbox.checked = false;
                break;
            case "denied":
                document.getElementById("notification_switch_label").textContent = "デスクトップ通知 不可"
                notificationCheckbox.checked = false;
                notificationCheckbox.disabled = true;
                break;
            case "granted":
                notificationCheckbox.checked = true;
                break;
        }
    })
};

notificationCheckbox.addEventListener('click' , () => {
   NotificationSwitch();
});

// タイマー時刻の設定：時間
function addHour(h_addNo) {
    goalHourTxt = document.getElementById("goal_hour").textContent;
    const goalHourSet = parseInt(goalHourTxt) + h_addNo;
    document.getElementById("goal_hour").textContent = goalHourSet;
    if (goalHourSet <= 0) {
        document.getElementById("goal_hour").textContent = 0;
    }
}

// タイマー時刻の設定：分
function addMin(m_addNo) {
    goalHourTxt = document.getElementById("goal_hour").textContent;
    goalMinTxt = document.getElementById("goal_min").textContent;
    const goalMinSet = parseInt(goalMinTxt) + m_addNo;
    if (goalMinSet >= 60) {
        addHour(1);
        document.getElementById("goal_min").textContent = goalMinSet - 60;
    } else if (goalHourTxt != 0 && goalMinSet < 0) {
        addHour(-1);
        document.getElementById("goal_min").textContent = 60 + goalMinSet;
    } else if (goalHourTxt == 0 && goalMinSet <= 1) {
        // 0分での誤作動を防ぐため、最小値１分とする。
        document.getElementById("goal_min").textContent = 1;
    } else {
        document.getElementById("goal_min").textContent = goalMinSet;
    }
}

// 目標時間の取得
function startButton() {
    //ワーカーの削除
    if (typeof (myWorker) != "undefined") {
        myWorker.terminate();
        console.log("ワーカー削除確認");
    }
    goalHourTxt = document.getElementById("goal_hour").textContent;
    goalHour = parseInt(goalHourTxt);
    goalMinTxt = document.getElementById("goal_min").textContent;
    goalMin = parseInt(goalMinTxt);

    // 時間を秒単位に変換する
    goalSec = (goalHour * 60 * 60) + (goalMin * 60);
    console.log(goalSec);
    // 確認用
    // console.log(goalHour + "時間　" + goalMin + "分" + "：秒換算" + goalSec);
    // youtube再生画面をOFF
    videoOff();
    // タイマー・ポーズボタンの動作開始
    myWorker = new Worker("worker.js");
    setInterval(play(goalSec, "start"), 1000);
    btnOnOff("pause_button", "false");
    btnOnOff("replay_button", "true");
}

//一時停止ボタン
function pauseButton() {
    // ワーカー停止
    myWorker.onmessage = (e) => {
        console.log(e.data[0]);
        let pauseSec = e.data[0];
        myWorker.postMessage([pauseSec, "pause"]);
    }
    //ワーカーの削除
    myWorker.terminate();
    btnOnOff("pause_button", "true");
    btnOnOff("replay_button", "false");
}

// 一時停止状態からカウント再開
function replayButton() {
    myWorker = new Worker("worker.js");
    setInterval(play(now, "start"), 1000);
    btnOnOff("replay_button", "true");
    btnOnOff("pause_button", "false");
}

// 表示更新
function play(startSec, playMode) {
    myWorker.postMessage([startSec, playMode]);
    myWorker.onmessage = (e) => {
        // console.log(e.data);
        now = e.data;
        if (now <= 0) {
            // 指定時間が終了した場合の表示
            desktopNotification();
            clearInterval(timerDsp);
            // youtube APIを使用した動画再生
            videoPlayer();
            //ワーカーの削除 
            pauseButton();
            btnOnOff("pause_button", "true");
            btnOnOff("replay_button", "true");
            // バーをクリア
            const canvas = document.getElementById("myCanvas");
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // 通知音再生
            const soundSwitch = document.getElementById("sound_switch");
            console.log(soundSwitch.checked);
            if (soundSwitch.checked == true) { audioPlay(); }
        } else {
            nowSec += 1;
            draw(goalSec, now);

        }
    };
}

// ボタンon off
function btnOnOff(buttonID, disabledTorF) {
    pauseOnOff = document.getElementById(buttonID);
    if (disabledTorF === "true") {
        pauseOnOff.disabled = true;
    } else {
        pauseOnOff.disabled = false;
    }

}

// youtube再生画面をOFF
function videoOff() {
    videoMode = document.getElementById("video_player");
    if (videoMode.lastChild) {
        videoMode.removeChild(videoMode.lastChild);
    } else {
        //console.log("ビデオ非表示中");
    }
}

// デスクトップ通知
function desktopNotification() {
    switch (Notification.permission) {
        case "default":
        case "denied":
            break;
        case "granted": new Notification("timer Complete",
            {
                body: "お疲れ様です！一度体を動かしましょう。",
                icon: "./img/alarm_icon.svg"
            }
        )
            break;
    }
}

//通知音
function audioPlay() {
    audio.src = './sound/Cuckoo_Clock02-09_Long.mp3';
    audio.play(); //audioを再生
};

// 動画表示
function videoPlayer() {
    const randomNo = Math.floor(Math.random() * 2);
    //const videUrl = videoList[randomNo];
    let videoRest = document.createElement("iframe");
    videoRest.width = "560"
    videoRest.height = "315"
    //videoRest.src = videUrl;
    videoRest.src = rdmSelect();
    videoRest.title = "YouTube video player"
    videoRest.frameborder = "0"
    videoRest.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    videoRest.referrerpolicy = "strict-origin-when-cross-origin";
    videoRest.id = "youtubePlayer"
    videoRest.allowfullscreen = true;
    video_player.appendChild(videoRest);

}

//リスト選択
function changeList() {
    selectList = document.getElementById('select_list');
    // console.log(selectList.value);
    selectedList = selectList.value
}

// リストの中身を取得して、ランダムに表示する
function rdmSelect() {
    changeList();
    const listConteiner = document.getElementById(selectedList);
    const listConteinerArray = listConteiner.children;

    //リストの中身を取得　※空白を除く
    let conteinerNo = 0;
    let countListConteiner = [];
    for (let i = 0; i < listConteinerArray.length; i++) {
        if (listConteinerArray[i].value.length >= 1) {
            //youtubeURLか確かめる　→　埋め込みプレイヤー用のURLに変形　→　配列に登録
            countListConteiner[conteinerNo] = addressChangeWatchToIframe(listConteinerArray[i].value);
            //想定外URLの処理については検討中。。。
            //countListConteiner[conteinerNo] = listConteinerArray[i].value;
            conteinerNo++;
        } else {
            //console.log(i + "のvalueはnullです");
        }
    }

    //配列の長さチェック　→　「0」の場合デフォルトリストと差し替え
    if (countListConteiner.length == 0) {
        countListConteiner = defaultVideoList
    }
    const maxRdmNo = countListConteiner.length;
    const rdmNo = getRandomArbitrary(0, maxRdmNo);
    //console.log(rdmNo);
    const youtubePlayer = document.getElementById("video_player");
    youtubePlayer.src = countListConteiner[rdmNo];
    return countListConteiner[rdmNo];
}

// 乱数取得
function getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

// youtubeアドレスの処理
function addressChangeWatchToIframe(listYoutubeAddress) {
    //動画IDを抽出し、埋め込み用IDにして打ち返す
    //youtubeのURLなのか・視聴URLなのかを確認
    if (listYoutubeAddress.indexOf("https://www.youtube.com/watch?", 0) >= 0) {
        // 「https://www.youtube.com/watch?v=」が含まれる場合は通常のyoutubeURLとみなす
        if (listYoutubeAddress.indexOf("app=desktop&", 30)) {
            listYoutubeAddress = listYoutubeAddress.replace("app=desktop&", "");
        }
        let changedURL = listYoutubeAddress.replace("https://www.youtube.com/watch?v=", "https://www.youtube.com/embed/");
        console.log(changedURL);
        return changedURL;
    } else if (listYoutubeAddress.indexOf("https://youtu.be/", 0) >= 0) {
        // 短縮URL用の分岐
        //[（共通部17文字）https://youtu.be/][動画ID11文字][?si=不要部分] ⇒　
        let shortURL_spl = listYoutubeAddress.substr(17, 11);
        let changedURL = "https://www.youtube.com/embed/" + shortURL_spl;
        //console.log(changedURL);
        return changedURL;
    }
}

//  ビデオ表示確認ボタン
function videoTestPlay() {
    videoOff();
    videoPlayer();
}

// リストをローカルストレージに保存
function videoListUpdate(videoListContentID) {
    const inputListContent = document.getElementById(videoListContentID)

    //更新されたら該当のidのデータを上書きする
    localStorage.removeItem(videoListContentID);
    localStorage.setItem(videoListContentID, inputListContent.value);

    const listTest = localStorage.getItem(videoListContentID);
    console.log(listTest);
}

function videoListHyoji(videoListContentID) {
    const inputListContent = document.getElementById(videoListContentID)
    inputListContent.value = localStorage.getItem(videoListContentID)
}

videoListHyoji("list_A_001");
videoListHyoji("list_A_002");
videoListHyoji("list_A_003");
videoListHyoji("list_A_004");
let videoListCheck = document.getElementById("list_A_001");
if (videoListCheck.value.length == 0) {
    videoListCheck.value = "https://www.youtube.com/watch?v=PBRGLbrlUEk";
    videoListUpdate("list_A_001");
}
videoListCheck = document.getElementById("list_A_002")
if (videoListCheck.value.length == 0) {
    videoListCheck.value = "https://www.youtube.com/watch?v=k27L4PbOZ10"
    videoListUpdate("list_A_002");
}

videoListHyoji("list_B_001");
videoListHyoji("list_B_002");
videoListHyoji("list_B_003");
videoListHyoji("list_B_004");

videoListHyoji("list_C_001");
videoListHyoji("list_C_002");
videoListHyoji("list_C_003");
videoListHyoji("list_C_004");
//NotificationSwitch();
