// ==UserScript==
// @name         なろうカスタムリーダー
// @namespace    http://getaji.github.io/
// @version      1.0.0
// @description  「小説家になろう」の小説のページをカスタマイズする
// @author       Getaji
// @match        http://ncode.syosetu.com/*/*/*
// @match        http://novel18.syosetu.com/*/*/*
// @exclude      http://ncode.syosetu.com/novelview/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.0.0/jquery.min.js
// @grant        GM_setClipboard
// ==/UserScript==


// ////////////////////////////// 主要処理 //////////////////////////////
const novel = { date: new Date() },
      ncapi = {};
unsafeWindow.novel = novel;
unsafeWindow.ncapi = ncapi;
$(function() {
    'use strict';
    /* jshint esnext:true */

    const timeStart = Date.now();

    // //////////////////// 汎用関数 ////////////////////
    $.fn.extend({
        /**
         * 選択した全ての要素のHTMLを置換する。
         * @param {regexp|Array} pattern - パターンもしくはパターンと置換オブジェクトの配列
         * @param {string|function} replacement - 置換文字列もしくは関数
         * @return jQuery
         */
        replaceHTML: function(pattern, replacement) {
            this.each((i, e) => {
                if (pattern instanceof Array) {
                    let s = e.innerHTML;
                    for (const pair of pattern) {
                        s = s.replace(pair[0], pair[1]);
                    }
                    e.innerHTML = s;
                } else {
                    e.innerHTML = e.innerHTML.replace(pattern, replacement);
                }
            });
            return this;
        }
    });

    /**
     * 指定した全ての要素のHTMLの全角文字を半角文字に置換する。
     * @param {string|jQuery} selector - 要素セレクタ
     */
    function zToH(selector) {
        let e = selector;
        if (!(selector instanceof jQuery)) {
            e = $(selector);
        }
        // /[Ａ-Ｚａ-ｚ０-９＃＄％＆’（）＝，．＿［］｛｝＠＾￥]/g
        e.replaceHTML(/[Ａ-Ｚａ-ｚ０-９，．]/g, (s) => {
            return String.fromCharCode(s.charCodeAt(0) - 65248);
        });
    }

    /**
     * HTML文字列を構築する。
     * @param {string} tagName - タグ名(必須)
     * @param {object} attr - HTML要素の属性(省略可能)
     * @param {string} content - 要素の中身(省略可能)
     */
    function buildHtml(tagName, attr={}, content='') {
        let html = `<${tagName} `;
        html += $.map(attr, function(value, key) {
            return `${key}='${value}'`;
        }).join(' ');
        html += `>${content}</${tagName}>`;
        return html;
    }

    /**
     * 対象の要素を指定ミリ秒の間ハイライトする。
     * ハイライトは非同期で行われる。
     * @param {object} target - jQueryオブジェクト
     * @param {string} cls - ハイライト用に操作するクラス
     * @param {number} ms - ハイライトする時間(ミリ秒)
     */
    function highlight(target, cls='fade_hl', ms=1000) {
        target.addClass(cls);
        setTimeout(() => {
            target.removeClass(cls);
        }, 1000);
    }

    /**
     * 桁数を指定して四捨五入する。
     * @param {number} n - 四捨五入する数値
     * @param {number} d - 桁数
     * @return {number} 四捨五入した数値
     */
    function round(n, d) {
        if (d < 2) {
            return n;
        }
        d = Math.pow(10, d);
        return Math.round(n * d) / d;
    }

    const popupNode = $('<div id="popup"/>').appendTo('body');
    let timeoutID = null;
    function popup(msg, time) {
        if (timeoutID) {
            clearTimeout(timeoutID);
        }
        popupNode.html(msg);
        popupNode.show();
        timeoutID = setTimeout(function() {
            popupNode.hide();
            timeoutID = null;
        }, time === undefined ? 4000 : time);
    }
    ncapi.popup = popup;

    function isFunc(object) {
        return object && getClass.call(object) == '[object Function]';
    }

    // //////////////////// LocalStorage ////////////////////
    popup('設定読み込み中...');
    class Configuration {
        constructor(id, jsonParser, initialData) {
            this.id = id;
            this.jsonParser = jsonParser;
            const data = localStorage.getItem(id);
            if (data) {
                this.data = JSON.parse(data, jsonParser);
            } else {
                this.data = initialData ? initialData : {};
                localStorage.setItem(id, JSON.stringify(this.data));
            }
        }
        get(key, defaultValue, isSaveDefault=false) {
            if (key in this.data) {
                return this.data[key];
            }
            if (isSaveDefault) {
                this.data[key] = defaultValue;
                this.save();
                console.log(`Writed new configuration: ${key} =`, defaultValue);
            }
            return defaultValue;
        }
        put(key, value, isSave=false) {
            if (this.data[key] === value) {
                console.log(`No changed configuration: ${key}=`, value);
                return;
            }
            this.data[key] = value;
            this.save();
            console.log(`Writed configuration: ${key}=`, value);
        }
        setStrData(s) {
            this.data = JSON.parse(s, this.jsonParser);
        }
        remove(key, isSave=true) {
            delete this.data[key];
            if (isSave) this.save();
        }
        save() {
            localStorage.setItem(this.id, JSON.stringify(this.data));
        }
        reload() {
            this.data = JSON.parse(localStorage.getItem(this.id), this.jsonParser);
        }
        asList() {
            return Object.keys(this.data).map(k => this.data[k]);
        }
    }
    ncapi.Configuration = Configuration;
    const config = new Configuration('ncConfig');

    // //////////////////// 雑多処理 ////////////////////
    console.debug('雑多処理中...');
    // 全角→半角
    zToH('.novel_subtitle');
    zToH('.contents1');

    // タイトル要素などに余計な余白をつけているクラスを削除
    $('.margin_r20').removeClass('margin_r20');
    $('.margin_l10r20').removeClass('margin_l10r20');
    $('.contents1 .attention').addClass('margin_r20');

    const novelPre = $('#novel_p'),
          novelHonbun = $('#novel_honbun'),
          novelAfter = $('#novel_a');

    // 本文置換文字 最後に処理
    const honbunReplaces = [
        [/^　?(?:<br>\n)+/, ''],
        [/(?:<br>\n)+　?$/, '']
    ];

    // タイトル・作者・章
    const contents1Items = $('.contents1').html().trim().split('\n');

    // //////////////////// 書き換え開始 ////////////////////
    novel.id = location.pathname.match(/n\w+/)[0];

    // //////////////////// 基本CSSを差し替え ////////////////////
    const container = $('#container'),
          defCSS = $('link[href="http://sbo.syosetu.com/20160906/ncout2.css"]');
    if (defCSS.length > 0)
        defCSS.attr('href', 'http://sbo.syosetu.com/20160906/ncout.css');

    // //////////////////// ヘッダー ////////////////////
    console.debug('ヘッダー書き換え中...');
    const novelHeader = $('#novel_header'),
          headNav = $('#head_nav'),
          bookmark = $('.booklist'),
          bookmarkRemove = $('.booklist_now'),
          shiori = $('.bookmark_now');

    // 既存の項目を削除してコンテンツに追加
    const defaultHeads = $('li', headNav).remove();
    $('<div id="head-items"/>').append(defaultHeads).prependTo(container);

    // 既存のヘッダーの上に新しいヘッダーを追加
    const topHeader = $('<div id="top_header" class="custom_link"><ul></ul></div>').insertBefore(novelHeader);
    const topHeaderList = $('ul', topHeader);

    // スクロール位置で表示/非表示切り替え
    let isShowingTopHeader = true,
        prevY = window.pageYOffset;
    function showHeader() {
        novelHeader.addClass('shifted');
        topHeader.removeClass('hidden');
        isShowingTopHeader = true;
    }
    function hideHeader() {
        topHeader.addClass('hidden');
        novelHeader.removeClass('shifted');
        isShowingTopHeader = false;
    }
    function checkHeader() {
        if (window.pageYOffset < prevY) {
            if (!isShowingTopHeader) {
                showHeader();
            }
        } else if (window.pageYOffset > prevY) {
            if (isShowingTopHeader) {
                hideHeader();
            }
        }
        prevY = window.pageYOffset;
    }
    novelHeader.addClass('shifted');
    $(window).scroll(function() {
        checkHeader();
    });
    if (window.pageYOffset > 0) {
        hideHeader();
    }

    // ////////// タイトル //////////
    const titleText = $('.contents1 a').eq(0).text(),
          titleHTML = `<a href="http://${location.host}/${novel.id}/">${titleText}</a>`,
          subTitleText = $('.novel_subtitle').text().trim(),
          headerText = subTitleText;
    headNav.append(`<li id='novel_header_subtitle' class='subtitle'>${headerText}</li>`);
    $('title').text(`${subTitleText} - ${titleText}`);
    $('.novel_subtitle').addClass('subtitle');
    novel.title = titleText;
    novel.subtitle = subTitleText;

    topHeaderList.append(`<li id='novel_header_title'>${titleHTML}</li>`);

    // ////////// ページ番号 //////////
    const novelNo = $('#novel_no'),
          noSplit = novelNo.text().split('/');
    novel.pageNo = Number.parseInt(noSplit[0]);
    novel.pageCount = Number.parseInt(noSplit[1]);
    novelNo.remove();
    headNav.append(`<li id='novel_header_no'>${novel.pageNo}/${novel.pageCount}</li>`);

    // ////////// 前後リンク //////////
    const novelBN = $('.novel_bn'),
          bn_a = $('a', novelBN),
          foundPrev = bn_a.text().includes('前の話'),
          foundNext = bn_a.text().includes('次の話');
    bn_a.wrapInner('<div/>');
    bn_a.each(function() {
        if (this.innerText.includes('前の話')) {
            this.childNodes[0].className = 'novel_bn_back';
        } else if (this.innerText.includes('次の話')) {
            this.childNodes[0].className = 'novel_bn_next';
        } else if (this.innerText.includes('目次')) {
            this.parentNode.removeChild(this);
        }
    });
    if (novelBN.eq(0).children().length === 1) {
        if (foundPrev) {
            novelBN.append('<div class="novel_bn_blank"></div>');
        } else if (foundNext) {
            novelBN.prepend('<div class="novel_bn_blank"></div>');
        }
    }
    if (foundPrev) {
        const prev = bn_a.eq(0).attr('href');
        headNav.append(`<li class="novel_header_bn"><a href="${prev}" id="novel_header_back" class="custom_link">＜前</a></li>`);  // '次'と被ってる
    }
    if (foundNext) {
        const next = bn_a.eq(foundPrev ? 1 : 0).attr('href');
        headNav.append(`<li class="novel_header_bn"><a href="${next}" id="novel_header_next" class="custom_link">後＞</a></li>`);
    }

    //  ////////// ブックマーク //////////
    if (bookmark.length > 0) {
        bookmark.appendTo(headNav);
    }
    if (bookmarkRemove.length > 0) {
        bookmarkRemove.appendTo(headNav);
    }
    if (shiori.length > 0) {
        shiori.appendTo(headNav);
    }

    // //////////////////// フッター ////////////////////
    console.debug('フッター構築中...');
    const footNav = $('<ul id="foot_nav" class="custom_link"/>').appendTo(document.body).wrap($('<div id="footer_ex"/>'));
    function addFooterItem(id, content, options) {
        return $('<div/>', $.extend({
            id, class: 'footer_item',
            html: content
        }, options)).appendTo(footNav);
    }

    // ////////// タイトル・作者 //////////
    addFooterItem('footer_title', titleHTML, {title: titleText});
    const author = $('.contents1').html().trim().split('\n')[1],
          chapter = $('.chapter_title'),
          chapterText = chapter.text();
    if (chapter.length > 0)
        addFooterItem('footer_chapter', chapterText, {title: chapterText});
    const authorElm = addFooterItem('footer_author', author),
          authorChild = authorElm.children();
    novel.authorName = authorElm.text().substr(3);
    if (authorChild.length > 0)
        novel.authorURL = authorElm.prop('href');

    // ////////// 行数・文字数 //////////
    const honbun = novelHonbun.text();
    const linesCount = honbun.match(/\n/g).length + 1;
    const charsCount = honbun.replace(/[\n\s\t　]/g, '').length;
    addFooterItem('footer_lc', linesCount + '行');
    addFooterItem('footer_cc', charsCount + '文字');

    // ////////// スクロール位置表示/指定 //////////
    const yOffsetView = addFooterItem('footer_yOffset',
                                      `Y(<span>${window.pageYOffset}</span>/${$(document).height() - $(window).height()})`).children();
    $(window).scroll(function() {
        yOffsetView.text(window.pageYOffset);
    });
    yOffsetView.on('click', function() {
        const scrollY = prompt('scroll to', window.pageYOffset);
        if (scrollY !== null) {
            window.scrollTo(0, parseInt(scrollY));
        }
    });

    // //////////////////// 自動スクロール ////////////////////
    $(window).on('load', () => {
        if (window.pageYOffset === 0) {
            let y = 0;
            const match = location.search.match(/y=([0-9]*?)(&|$)/);
            if (match) {
                y = parseInt(decodeURIComponent(match[1]));
            }
            if (y !== 0) {
                window.scrollTo(0, y);
                console.log(y + 'にスクロール');
            }
        }
    });

    // //////////////////// ツールボックス ////////////////////
    console.debug('ツールボックス構築中...');
    const toolbox = $('<div id="toolbox" />').appendTo(document.body),
          toolboxList = $('<div id="toolbox_list" />').appendTo(toolbox);

    // ////////// ツールボックス表示トグル //////////
    const toggleToolbox = $('<div/>', {
        id: 'toggle_toolbox',
        text: '▼ ツール ▼',
    }).appendTo(toolbox);
    let isShowingToolbox = config.get('isShowingToolbox', true);
    function onToggleToolbox(isShow=null, speed=200) {
        if (isShow === null) {
            isShow = !isShowingToolbox;
        }
        if (isShowingToolbox === isShow) {
            return;
        }
        if (isShow) {
            toolboxList.slideDown(speed);
        } else {
            toolboxList.slideUp(speed);
        }
        const fix = isShow ? '▼' : '▲';
        toggleToolbox.text(fix + ' ツール ' + fix);
        isShowingToolbox = isShow;
        config.put('isShowingToolbox', isShowingToolbox, true);
    }
    toggleToolbox.on('click', function() {
        onToggleToolbox();
    });
    if (!isShowingToolbox) {
        onToggleToolbox(false, 0);
    }

    function createCheckbox(id, text, target, options={}) {
        const classes = options.classes ? options.classes : '',
              checked = options.checked === undefined ? true : options.checked,
              _props = $.extend({id, class: classes, type: 'checkbox', checked}, options.props ? options.props : {}),
              checkbox = $('<input>', _props);
        if (options.click !== undefined) {
            checkbox.on('click', options.click);
        }
        if (options.bindConfig) {
            const configID = options.configID ? options.configID : id;
            checkbox.prop('checked', config.get(configID, checked));
            checkbox.on('click', function(e) {
                config.put(configID, e.target.checked, true);
            });
        }
        return $('<label/>', {class: 'nc-checkbox toolbox_item', for: id}).append(checkbox).append(text).appendTo(target);
    }

    // ////////// 折りたたみ //////////
    function createFolder(title, id, appendTo, isShow=false) {
        let isShowing = config.get('folder-' + id, isShow);
        const container = $('<div class="toolbox_folder_container">'),
              folderToggle = $('<div/>', {
                  class: 'toolbox_folder_toggle folder_opening',
                  text: title,
                  click: function() {
                      isShowing = !isShowing;
                      if (isShowing) {
                          container.show();
                          folderToggle.addClass('folder_opening');
                          folderToggle.removeClass('folder_closing');
                      } else {
                          container.hide();
                          folderToggle.addClass('folder_closing');
                          folderToggle.removeClass('folder_opening');
                      }
                      config.put('folder-' + id, isShowing, true);
                  }
              }),
              top = $(`<div id="folder-${id}" class="toolbox_folder toolbox_item" />`).append(folderToggle).append(container);
        if (!isShowing) {
            container.hide();
            folderToggle.addClass('folder_closing');
            folderToggle.removeClass('folder_opening');
        }
        if (appendTo) appendTo.append(top);
        return {folder: top, container: container, toggler: folderToggle};
    }
    function addCheckboxToFolder(folder, id, text, checked, click) {
        return createCheckbox(id, text, folder.container, {checked, click});
    }

    // ////////// 表示/非表示 //////////
    const folderView = createFolder('表示', 'view', toolboxList);
    // title
    createCheckbox('toggle_title_visibility', 'サブタイトル', folderView.container, {
        click: function() {
            $('.subtitle').css('visibility', this.checked ? 'visible' : 'hidden');
        }, bindConfig: true, configID: 'isShowTitle'
    });
    $('.subtitle').css('visibility', config.get('isShowTitle', true) ? 'visible' : 'hidden');

    // ////////// 本文表示/非表示 //////////
    createCheckbox('toggle_honbun_visibility', '本文', folderView.container, {
        click: function() {
            novelHonbun.css('visibility', this.checked ? 'visible' : 'hidden');
        }, bindConfig: true, configID: 'isShowText'
    });

    // ////////// ルビ括弧表示/非表示 //////////
    const rubyRt = $('ruby rt', container);
    let rubyPrefix = '',
        rubySuffix = '';
    rubyRt.each(function() {
        this.setAttribute('value', this.innerHTML);
    });
    const checkboxRubyBranket = createCheckbox('toggle_ruby_blanket', 'ルビ括弧', folderView.container, {
        checked: false, click: function() {
            rubyPrefix = this.checked ? '(' : '';
            rubySuffix = this.checked ? ')' : '';
            $('rt', container).each(function() {
                this.innerHTML = rubyPrefix + this.getAttribute('value') + rubySuffix;
            });
        }
    });

    // ////////// ルビ表示/非表示 //////////
    const checkboxRuby = createCheckbox('toggle_ruby', 'ルビ', folderView.container, {
        click: function() {
            $('rt', container).css('visibility', this.checked ? 'visible' : 'hidden');
        }
    });

    // ////////// ルビ付き文字表示/非表示 //////////
    const checkboxRubyText = createCheckbox('toggle_ruby_text', 'ルビ付き文字', folderView.container, {
        click: function() {
            $('rb', container).css('visibility', this.checked ? 'visible' : 'hidden');
        }
    });

    // ////////// スタイル切り替え //////////
    const styleDark = $('#stylish-7');
    const head = $('head');
    createCheckbox('toggle_style', '暗色テーマ', folderView.container, {
        click: function() {
            if (this.checked)
                head.append(styleDark);
            else
                styleDark.remove();
        }
    });

    // ////////// コピー //////////
    const copies = createFolder('コピー', 'copy', toolboxList);
    function addCopy(id, btnHTML, msg, getter) {
        return $('<button/>', {
            id: id,
            class: 'button_white toolbox_item',
            html: btnHTML,
            click: function() {
                const text = (typeof getter) === 'string' ? getter : getter();
                if (text !== false) {
                    GM_setClipboard(text, 'text');
                    if (msg) popup(msg.replace('$text', text));
                }
            }
        }).appendTo(copies.container);
    }
    addCopy('button_copy_selection', '選択範囲', '選択範囲をコピーしました：$text', function() {
        const s = document.getSelection().toString();
        return s === '' ? false : s;
    });
    addCopy('button_copy_selection_with_ruby', '<ruby>選択範囲<rt>ルビ含</rt></ruby>', '選択範囲をルビを含めてコピーしました：$text', function() {
        const ruby = $(document.getSelection().focusNode).parents('ruby');
        if (ruby.length !== 0) {
            const rt = $('rt', ruby);
            const text = `${$('rb', ruby).text()}(${rt.attr('value')})`;
            highlight(ruby);
            return text;
        }
        return false;
    });
    addCopy('button_copy_title', 'タイトル', '小説のタイトルをコピーしました', novel.title);
    addCopy('button_copy_subtitle', 'サブタイトル', '小説のサブタイトルをコピーしました', subTitleText);
    if (chapter.length > 0) {
        novel.chapter = chapter.text();
        addCopy('button_copy_chapter', '章名', 'Copied chapter!', novel.chapter);
    }
    addCopy('button_copy_url', 'URL', 'このページのURLをコピーしました', location.href);
    addCopy('button_copy_rss', 'RSS', 'この小説のRSSのURLをコピーしました', $('link[title=Atom]').attr('href'));

    // ////////// その他 //////////
    const moreReplaces = createFolder('置換', 'replaces', toolboxList);
    function addReplacement(id, text, regexp, replacement) {
        $('<button/>', {
            id, class: 'button_white toolbox_item',
            type: 'button', text,
            click: function() {
                novelHonbun.replaceHTML(regexp, replacement);
            }
        }).appendTo(moreReplaces.container);
    }

    // ////////// 鍵括弧前の句点を削除するボタン //////////
    addReplacement('replace_removePeriod', '。」', /。\s?([」』])/g, '$1');
    addReplacement('replace_formatText', '構文最適化', [
        //[/\n　<br>/g, '\n<br>'],
        [/^([^　「『（(?:<br>)]|<ruby>)/gm, '　$1'],  // 行頭字下げ
        [/(?!<br>\n)(.)<br>\n([「『])/g, '$1<br>\n<br>\n$2'],  // 会話行の前に空行(普通のカッコは会話行として使われないパターンがあるので一旦除外)
        [/([」』])<br>\n(?!<br>)(.)/g, '$1<br>\n<br>\n$2'],  // 会話行の後に空行
        [/[・.]{2,}(?!<\/rt>)/g, '……'],  // 三点リーダー
        [/ー{2,}/g, '――'],  // ダッシュ
        [/([？！])([^\s　『「」』！？(<br>)])/g, '$1　$2'],  // 感嘆符の後に空白
        [/。\s?([』」）])/g, '$1']  // 閉じカッコの前の句点を削除
    ]);
    addReplacement('replace_tpr', '三点リーダー', /・{2,}(?!<\/rt>)/g, '……');
    addReplacement('replace_dash', 'ダッシュ', /ー{2,}/g, '――');
    addReplacement('replace_convNewline', '会話文改行削除', /\n[「『].+(?:<br>\n.+)*[」』]<br>/g, s => {
        console.log(s);
        return s.replace(/<br>\n　?/g, '');
    });
    addReplacement('replace_newlines', '連続改行調整', /(?:<br>\n){3,}/g, '<br>\n<br>\n');

    // ////////// その他 //////////
    const moreFolder = createFolder('その他', 'more', toolboxList);

    // ////////// RSSのURL //////////
    const atomURLView = $('<div/>', {
        id: 'atom_url_view',
        class: 'toolbox_item'
    }).appendTo(moreFolder.container).append($('<a/>', {
        class: 'custom_link',
        href: $('link[title=Atom]').attr('href'),
        text: 'RSS(Atom) URL'
    }));
    $('<button/>', {
        id: 'button_rubySwitch',
        class: 'toolbox_item button_white',
        text: 'ルビ表示切り替え',
        title: 'ルビとルビ付き文字の表示をトグルする',
        click: function() {
            checkboxRuby.children().click();
            checkboxRubyText.children().click();
        }
    }).appendTo(moreFolder.container);

    // ////////// 本文置換 //////////
    const replacer = createFolder('置換', 'replacer', toolboxList);
    const replacerPatternInput = $('<input/>', {
        id: 'replacer_input_pattern',
        class: 'replacer_input replacer_item',
        placeholder: '検索文字列',
        type: 'text',
        value: config.get('replacerPattern', ''),
        on: { change: () => {
            config.put('replacerPattern', replacerPatternInput.val(), true);
        }}
    }).appendTo(replacer.container);
    const replacerReplacementInput = $('<input/>', {
        id: 'replacer_input_replacement',
        class: 'replacer_input replacer_item',
        placeholder: '置換後の文字列',
        type: 'text',
        value: config.get('replacerReplacement', ''),
        on: { change: () => {
            config.put('replacerReplacement', replacerReplacementInput.val(), true);
        }}
    }).appendTo(replacer.container);
    $('<button/>', {
        id: 'replacer_run',
        class: 'button_white replacer_item',
        text: '置換を実行',
        click: function() {
            const pattern = RegExp(unescape(replacerPatternInput.val()), 'gm');
            const replacement = unescape(replacerReplacementInput.val());
            console.log(`'${pattern}' -> '${replacement}'`);
            if (pattern !== '' && replacement !== '') {
                const honbun = $('#novel_honbun');
                honbun.replaceHTML(pattern, replacement);
            }
        }
    }).appendTo(replacer.container);

    // ////////// 拡張情報 //////////
    const moreInfoFolder = createFolder('拡張情報', 'moreInfo', toolboxList);
    (function() {
        const moreInfoTable = $('<table/>').appendTo(moreInfoFolder.container);
        const text = novelHonbun.text();
        const convsMatch = text.match(/^[「『].+[」』]$/gm);
        let convP;
        if (convsMatch) {
            const nlCount = honbun.replace(/\n{2,}/g, '\n').match(/\n/g).length;
            convP = round(convsMatch.length / (nlCount / 100), 2);
        } else {
            convP = 0;
        }
        moreInfoTable.append($('<tr/>', {
            html: '<th>会話率</th><td>' + convP + '%</td>',
            title: '連続改行を除いた行数に対する会話行の割合'
        }));
        const nlScore = round(100.00 - (honbun.length / (honbun.match(/\n/g).length + 1)), 2);
        let nlEvaluation = '(適)';
        if (nlScore < 70) {
            nlEvaluation = '(低)';
        } else if (nlScore > 77) {
            nlEvaluation = '(高)';
        }
        moreInfoTable.append($('<tr/>', {
            html: '<th>改行率</th><td>' + nlScore + nlEvaluation + '</td>',
            title: '文字数に対する改行の割合'
        }));
    })();

    // //////////////////// 時間のかかる処理 ////////////////////
    console.debug('最終処理中...');
    const honbuns = $('#novel_p,#novel_honbun,#novel_a');
    zToH(honbuns);
    novelHonbun.replaceHTML(honbunReplaces);
    novelPre.replaceHTML(honbunReplaces);
    novelAfter.replaceHTML(honbunReplaces);

    popup('カスタマイズ処理完了(' + ((Date.now()-timeStart)/1000) + 'ms)');
    document.dispatchEvent(new CustomEvent('NarouCustomizeInitialized'));
});
