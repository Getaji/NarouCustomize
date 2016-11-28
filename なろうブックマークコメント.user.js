// ==UserScript==
// @name         なろうブックマークコメント
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  『小説家になろう』のブックマークページでコメントをできるようにします。ブラウザのLocalStorageに保存されます。
// @author       You
// @match        http://syosetu.com/favnovelmain/list/*
// @grant        none
// ==/UserScript==

$(function() {
    'use strict';
    /* jshint esnext:true */

    /******************** LocalStorage ********************/
    let data = localStorage.getItem("nblcData");
    if (data === null) {
        data = {};
        localStorage.setItem("nblcData", "{}");
    } else {
        data = JSON.parse(data);
    }
    console.log("Loaded NarouBookmarkLocalComment", data);
    function saveData() {
        localStorage.setItem("nblcData", JSON.stringify(data));
    }
    function getData(name, defaultValue="") {
        if (name in data) {
            return data[name];
        }
        data[name] = defaultValue;
        saveData();
        console.log(`Writed new novel: ${name}`);
        return defaultValue;
    }
    function setData(name, value) {
        data[name] = value;
        saveData();
        console.log(`Writed novel: ${name}=${value}`);
    }

    /******************** Fields ********************/
    const comments = {};  // { ncode: textarea }

    /******************** Import/Export Buttons ********************/
    var exButtons = $("<div id='ex-buttons' />").insertAfter("#search_menu");
    $("<button/>", {
        id: "ex-buttons__import-overwrite",
        class: "ex-buttons__button button__white",
        text: "設定をインポート(上書き)",
        click: function() {
            const importData = prompt("設定をインポート(上書き)", "");
            if (importData) {
                try {
                    data = JSON.parse(importData);
                    saveData();
                    for (const key in data) {
                        const textarea = comments[key];
                        if (textarea) {
                            textarea.val(data[key]);
                        }
                    }
                    console.log("Overwrited the data:", data);
                } catch (e) {
                    alert("設定のインポートに失敗しました。\n詳細はコンソールログを参照してください。");
                    console.error(e);
                }
            }
        }
    }).appendTo(exButtons);
    $("<button/>", {
        id: "ex-buttons__import-append",
        class: "ex-buttons__button button__white",
        text: "設定をインポート(追加)",
        click: function() {
            const importData = prompt("設定をインポート(追加)", "");
            if (importData) {
                try {
                    const importDataJSON = JSON.parse(importData);
                    for (const key in importDataJSON) {
                        data[key] = importDataJSON[key];
                    }
                    saveData();
                    for (const key in data) {
                        const textarea = comments[key];
                        if (textarea) {
                            textarea.val(data[key]);
                        }
                    }
                    console.log("Appended data:", data);
                } catch (e) {
                    alert("設定のインポートに失敗しました。\n詳細はコンソールログを参照してください。");
                    console.error(e);
                }
            }
        }
    }).appendTo(exButtons);
    $("<button/>", {
        id: "ex-buttons__export",
        class: "ex-buttons__button button__white",
        text: "設定をエクスポート",
        click: function() {
            prompt("設定をエクスポート", JSON.stringify(data));
        }
    }).appendTo(exButtons);

    /******************** Add Comment-Textarea ********************/
    $(".favnovel").each(function() {
        const self = $(this),
              ncode = $("a.title", self).attr("href").match(/ncode\.syosetu\.com\/(n[\w]+)\//)[1],
              tr = $("<tr/>").appendTo($("tbody", self)).append("<td></td>"),
              textarea = $("<textarea/>", {
                  "id": "novel_comment_" + ncode,
                  "class": "novel_comment",
                  "value": getData(ncode),
                  change: function() {
                      setData(ncode, textarea.val());
                  }
              }).appendTo(tr).wrap("<td colspan='2' />");
        comments[ncode] = textarea;
    });
});