
// メッセージを受信してコンソールに表示する
onmessage = (e) => {
    let goalSec;
    let playMode;
    let nowSec;

    console.log(e.data[0] + "秒　：状態" + e.data[1]);
    goalSec = e.data[0];
    playMode = e.data[1];

    nowSec = 1;
    if (playMode === "start") {
        timerDsp = setInterval(countdown, 1000);
    } if (playMode === "pause") {
        if (timerDsp) {
            clearInterval(timerDsp);
        }
    } 

    // 残り時間表示
    function countdown() {
        let now = goalSec - (nowSec);
        //console.log(now + "worker内表示テスト");
        nowSec += 1;
        postMessage(now);
    }
};








