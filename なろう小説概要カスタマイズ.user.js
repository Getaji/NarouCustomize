// ==UserScript==
// @name         なろう小説概要カスタマイズ
// @namespace    http://getaji.github.io/
// @version      1.2.3
// @description  話数、最終更新日、チャプター一覧を表示、その他諸々
// @author       Margherita Works / Getaji
// @match        http://ncode.syosetu.com/n*/
// @match        http://novel18.syosetu.com/n*/
// @exclude      http://ncode.syosetu.com/*/*/
// @exclude      http://novel18.syosetu.com/*/*/
// @grant        none
// ==/UserScript==

// ==Update history==
// # 1.2.3 build7 2016/06/27
// [mod] 話数の単位を "全n話" から "現在n話" に変更
//       ローカルサーバーから取得した小説情報が完結済だった場合は "全n話" に変更する
// [mod] チャプターの表示/非表示アニメーションを300msに変更
// [fix] 処理を最適化
//
// # 1.2.2 build6 2016/06/19
// [fix] ローカルサーバーの仕様変更に対応
//
// # 1.2.1 build5 2016/06/18
// [fix] ES6を使用するように
// [fix] 処理を最適化
//
// # 1.2.0 build4
// [new] ローカルサーバーから情報を取得した場合、既存の作者名表記を消しテーブルに表示するように
// [new] 話数に連載中/完結済を付加表示するように
// [new] 読込中の表示をするように。成功したら削除、失敗したらその旨を上書き表示する
//
// # 1.1.0 build3
// [new] ローカルサーバーで小説情報を取得するように
// [mod] 各種情報をテーブル形式で表示するように
// [fix] ソースコードを整理
//
// # 1.0.1 build2
// [mod] チャプター数が0の場合にコンテナを表示しないように変更
//
// ==/Update history==

// # 機能
// - 話数・最終更新日をテーブル形式で表示
// - チャプターがある場合それを表示
//   - ページ内リンクも付加
// - ローカルサーバーを介してなろうAPIを呼び出し、ジャンルやタグなどの小説情報を取得して表示

$(function() {
    /* jshint esnext:true */
    'use strict';

    // //////////////////// 汎用関数 ////////////////////
    function buildHtml(elm, attr, content="") {
        let html = "<" + elm + " ";
        html += $.map(attr, (value, key) => {
            return key + "='" + value + "'";
        }).join(" ");
        html += ">" + content + "</" + elm + ">";
        return html;
    }
    function floor(n, d) {
        if (d === undefined) d = 2;
        return Math.floor(n * (10 ** d)) / (10 ** d);
    }
    function separateDigit(n) {
        return n.toLocaleString();
    }

    // //////////////////// 拡張情報 ////////////////////
    $("#novel_ex").before(buildHtml("table", {
        id: "ex_info"
    }));

    const exInfo = $("#ex_info");
    function addInfoItem(id, name, value) {
        if (value === undefined)
            value = '**UNDEFINED**';
        exInfo.append(`<tr id='${id}'><th>${name}</th><td>${value}</td></tr>`);
    }

    const storyCount = $(".novel_sublist2").length;
    addInfoItem("novel_story_count", "話数", `現在${storyCount}話`);
    addInfoItem("novel_last_update", "最終更新日", $(".long_update").last().text().replace(/[\n ]/g, ""));

    // //////////////////// チャプター ////////////////////
    const chapterTitles = $(".chapter_title");
    if (chapterTitles.length > 0) {

        // ////////// チャプター一覧 //////////
        $("#ex_info").after("<div id='chapters_container'><ul id='chapters'></ul></div>");
        const chapters = $("#chapters");
        chapters.before("<h3>目次</h3>");
        chapters.before(buildHtml("button", {
            id: "toggle_chapter",
            type: "button",
        }, "表示"));
        let isShowChapters = false;
        const buttonToggleChapter = $("#toggle_chapter");
        $("#toggle_chapter").on("click", () => {
            if (isShowChapters) {
                chapters.hide(300);
                buttonToggleChapter.text("表示");
            } else {
                chapters.show(300);
                buttonToggleChapter.text("非表示");
            }
            isShowChapters = !isShowChapters;
        });
        chapters.hide();

        $(".chapter_title").each((i, val) => {
            const id = "chapter_" + i;
            const chapter = $(val);
            chapter.attr({ id: id, chapter: i });
            const chapterInner = buildHtml("a", {
                href: "#" + id
            }, chapter.html());
            chapters.append("<li>" + chapterInner + "</li>");
        });

        // ////////// チャプター折りたたみ・番号 //////////
        let nowChapter = -1;
        let nowContainer;
        let sublist_i = 0;
        $(".chapter_title,.novel_sublist2").each((i, val) => {
            const self = $(val);
            if (self.hasClass("chapter_title")) {
                nowChapter = self.attr("chapter");
                nowContainer = $("<div/>", {
                    "class": "sublists_container chapter_" + nowChapter,
                    "chapter": nowChapter,
                }).insertAfter(self);
                self.attr("title", "クリックで折りたたみ");
                self.on("click", function() {
                    const container = self.next();
                    container.slideToggle(200);
                });
            } else {
                self.attr("chapter", nowChapter);
                self.appendTo(nowContainer);
                self.children().eq(0).prepend(`<span class="story_number">${sublist_i+1}</span>`);
                sublist_i++;
            }
        });
        $(".chapter_title").each((i, val) => {
            const self = $(val);
            self.append(`<span class="story_number">${self.next().children().length}話</span>`);
        });
    } else {
        $('.novel_sublist2').each((i, val) => {
            $(val).children().eq(0).prepend(`<span class="story_number">${i+1}</span>`);
        });
    }

    // //////////////////// 拡張情報取得 ////////////////////
    const ncode = location.href.match(/syosetu\.com\/(n[\w]+)\//)[1];
    const GENRES = {101: "異世界〔恋愛〕", 102: "現実世界〔恋愛〕", 201: "ハイファンタジー〔ファンタジー〕", 202: "ローファンタジー〔ファンタジー〕", 301: "純文学〔文芸〕", 302: "ヒューマンドラマ〔文芸〕", 303: "歴史〔文芸〕", 304: "推理〔文芸〕", 305: "ホラー〔文芸〕", 306: "アクション〔文芸〕", 307: "コメディー〔文芸〕", 401: "VRゲーム〔SF〕", 402: "宇宙〔SF〕", 403: "空想科学〔SF〕", 404: "パニック〔SF〕", 9901: "童話〔その他〕", 9902: "詩〔その他〕", 9903: "エッセイ〔その他〕", 9904: "リプレイ〔その他〕", 9999: "その他〔その他〕", 9801: "ノンジャンル〔ノンジャンル〕"};
    addInfoItem("_loading", "拡張情報", "小説情報を取得中...");
    const query = {
        ncode: ncode, items: '*'
    },
          isR18 = location.host === 'novel18.syosetu.com';
    if (isR18)
        query.r18 = true;
    $.get("http://localhost:8888/novels", query).done(function(data, status, jqXHR) {
        $("#_loading").remove();
        const json = JSON.parse(data)[1];
        console.log(json);

        $(".novel_writername").eq(0).remove();
        const firstUpAt = new Date(json.general_firstup),
              lastUpAt = new Date(json.general_lastup),
              diff = Math.floor(((lastUpAt-firstUpAt)/86400000)+1);
        addInfoItem("novel_firstUp", "初回掲載日", `${firstUpAt.getFullYear()}年${firstUpAt.getMonth()+1}月${firstUpAt.getDate()}日`);
        addInfoItem("novel_upd", '日当りの更新頻度', `${floor(json.general_all_no/diff, 2)}upd (${diff}日間)`);  // upload per day
        const now = Date.now();
        if (now - firstUpAt.getTime() > 2592000000) {  // one month
            let postWithinMonth = 0;
            $('.long_update').each(function() {
                const m = this.innerText.match(/(\d+)年 (\d+)月 (\d+)日/),
                      date = new Date(m[1], m[2]-1, m[3]),
                      diff = now - date.getTime();
                if (diff <= 2592000000) {  // one month
                    postWithinMonth++;
                }
            });
            addInfoItem("novel_uwm", '直近30日間の更新頻度', `${floor(postWithinMonth/30, 2)}uwm (${postWithinMonth}話)`);  // upload within one month
        }

        addInfoItem("novel_author", "作者", buildHtml("a", {
            href: "http://mypage.syosetu.com/" + json.userid + "/"
        }, json.writer));

        const storyCount = $("#novel_story_count td");
        if (json.end === 0) {
            storyCount.html(storyCount.html().replace("現在", "全"));
        }
        storyCount.append(json.end === 1 ? "(連載中)" : "(完結済)");

        addInfoItem("novel_length", "文字数", separateDigit(json.length) + "文字(文庫本" + floor(json.length / 100000, 1) + '冊分)');  // 文庫本1冊＝100,000文字
        const charCountAverage = floor(json.length/json.general_all_no, 2);
        addInfoItem("novel_length_avg", "平均文字数", separateDigit(charCountAverage) + "文字(原稿用紙" + floor(charCountAverage/400, 1) + '枚分)');
        if (!isR18) addInfoItem("novel_genre", "ジャンル", GENRES[json.genre]);
        addInfoItem("novel_point", "評価点", separateDigit(json.all_point));
        addInfoItem("novel_reviews", "レビュー数", json.review_cnt);
        addInfoItem("novel_tags", "タグ", json.keyword.split(" ").map((val) => {
            return "<span>" + val + "</span>";
        }).join(""));
        if (isR18) return;
        const ncode = json.ncode.toLowerCase();
        $.get("http://localhost:8888/ranking?type=all&ncode=" + ncode).done(function(data) {
            const jsonRanking = JSON.parse(data);
            function addRanking(id, name, data) {
                let value;
                if (data.rank === -1) {
                    value = "圏外";
                } else {
                    value = `${data.rank}位 ${separateDigit(data.pt)}pt`;
                }
                addInfoItem("novel_ranking_" + id, name, value);
            }
            addRanking('daily', "日間ランキング", jsonRanking.daily);
            addRanking('weekly', "週間ランキング", jsonRanking.weekly);
            addRanking('monthly', "月間ランキング", jsonRanking.monthly);
            addRanking('quater', "四半期ランキング", jsonRanking.quater);
            addRanking('all', "累計ランキング", jsonRanking.total);

            $.get("http://localhost:8888/rankhis?ncode=" + ncode).done(function(data) {
                const histories = JSON.parse(data);
                for (const type of ['daily', 'weekly', 'monthly', 'quater']) {
                    const his = histories[type.substring(0, 1)];
                    if (his) {
                        const d = his.rtype;
                        $(`#novel_ranking_${type} td`).append(` (最高${his.rank}位 ${d.substring(0, 4)}/${d.substring(4, 6)}/${d.substring(6, 8)})`);
                    }
                }
            }).fail((jqXHR, textStatus, errorThrown) => {
                console.error(jqXHR, textStatus, errorThrown);
            });
        }).fail((jqXHR, textStatus, errorThrown) => {
            console.error(jqXHR, textStatus, errorThrown);
        });
    }).fail((jqXHR, textStatus, errorThrown) => {
        console.log(jqXHR, textStatus, errorThrown);
        $("#_loading td").text("小説情報の取得に失敗。");
    });
});