// ==UserScript==
// @name         なろう検索カスタマイズ
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://yomou.syosetu.com/search.php?*
// @grant        none
// ==/UserScript==

$(function() {
    'use strict';
    /* jshint esnext:true */
    const matchPage = location.search.match(/p=(\d+)/);
    const page = (matchPage ? Number(matchPage[1]) : 1) - 1;
    $(".searchkekka_box>.novel_h").each((i, val) => {
        $(`<span class="novel_ranking">${page * 20 + (i + 1)}位</span>`).prependTo(val);
        //$(".ex", val).on("click", function() {
        //});
    });
});