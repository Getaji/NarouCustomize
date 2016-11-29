// ==UserScript==
// @name         なろうオリジナルログ
// @namespace    http://getaji.github.io/
// @version      1.0.0
// @description  小説家になろうの閲覧履歴を独自に管理します。別UserScript"なろうカスタムリーダー"が必要です。
// @author       Getaji
// @match        http://ncode.syosetu.com/*/*/*
// @match        http://novel18.syosetu.com/*/*/*
// @match        http://ncode.syosetu.com/
// @match        http://novel18.syosetu.com/
// @exclude      http://ncode.syosetu.com/novelview/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.0.0/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jsrender/0.9.82/jsrender.min.js
// ==/UserScript==

// //////////////////// LocalStorage //////////////////// //
function valueStr(v) {
    return typeof v === 'string' ? '"' + v + '"' : v;
}
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
        console.debug('Constructed configuration.');
    }
    get(key, defaultValue, isSaveDefault=false) {
        if (key in this.data) {
            return this.data[key];
        }
        if (isSaveDefault) {
            this.data[key] = defaultValue;
            this.save();
            console.debug(`Writed new configuration: ${key} =`, valueStr(defaultValue));
        }
        return defaultValue;
    }
    put(key, value, isSave=false) {
        if (!isSave && this.data[key] === value) {
            console.debug(`No changed configuration: ${key}=`, valueStr(value));
            return;
        }
        this.data[key] = value;
        if (isSave) {
            this.save();
            console.debug(`Put configuration: ${key}=`, valueStr(value));
        } else {
            console.debug(`Writed configuration: ${key}=`, valueStr(value));
        }
    }
    setStrData(s) {
        this.data = JSON.parse(s, this.jsonParser);
    }
    remove(key, isSave=true) {
        delete this.data[key];
        console.debug('Deleted configuration:', key);
        if (isSave) this.save();
    }
    save() {
        localStorage.setItem(this.id, JSON.stringify(this.data));
        console.debug('Saved configuration');
    }
    reload() {
        this.data = JSON.parse(localStorage.getItem(this.id), this.jsonParser);
        console.debug('Reloaded configuration');
        return this;
    }
    asList() {
        return Object.keys(this.data).map(k => this.data[k]);
    }
    getKeys() {
        return Object.keys(this.data);
    }
}
const config = new Configuration('novellogs', function(k, v) {
    return (k === 'latestReadedDate' || k === 'date' || k === 'updatedAt') ? new Date(v) : v;
});
const settings = new Configuration('novellogs-settings', undefined, {
    lastQuery: ''
});
// //////////////////// CSS ////////////////////
$('head').append(`<style>
body {
--accent-color: #41808a;
--light-color: #dde9ec;
}
button {
background-color: var(--accent-color);
color: white;
border: 0px;
border-radius: 2px;
padding: 2px 4px;
}
button:hover {
background: #316871;
}
button:active {
background: #275961;
}
.checkboxLabel {
background-color: var(--accent-color);
padding: 2px 4px;
color: white;
border-radius: 2px;
}
.checkboxLabel input {
visibility: hidden;
position: relative;
}
.checkboxLabel input::before {
content: "";
position: absolute;
visibility: visible;
border-width: 0 2px 2px 0;
border-style: solid;
border-color: #444;
width: 4px;
height: 11px;
transform: rotate(40deg);
top: 0px;
left: 3px;
background: none;
}
.checkboxLabel input:checked::before {
border-color: white;
}
.checkboxLabel input:hover::before {
border-color: #BBB;
}
.checkboxLabel input:active::before {
border-color: black;
}
.__m_b20 {
margin-bottom: 20px;
}
.inline {
display: inline-block;
}
#header {
border-bottom: 1px solid #DDD;
background: #EEE;
}
#title {
padding: 10px;
text-align: center;
background: white;
}
#container {
margin: 0 auto;
}
#pageBottom {
top: 20px;
}
#title {
font-size: x-large;
}
.__80pct_centering {
width: 80%;
margin: 0 auto;
}
#modals-container {
position: fixed;
top: 0; bottom: 0; left: 0; right: 0;
background-color: rgba(0, 0, 0, 0.7);
z-index: 101;
display: none;
}
.modal {
position: fixed;
z-index: 102;
display: none;
width: 80%;
left: 0;
right: 0;
margin: auto;
margin-top: 100px;
background-color: white;
}
.modal-titleBar {
padding: 6px;
font-size: large;
font-weight: bold;
}
.modal-viewport {
padding: 4px;
}
.modal-textarea {
width: 100%;
box-sizing: border-box;
height: 400px;
}
.modal-buttons button {
margin: 4px;
padding: 4px 6px;
}
#buttons {
margin: auto;
width: 80%;
}
#buttons button {
padding: 8px;
margin-right: 4px;
}
#searchBoxWrapper {
}
#searchBox {
margin: 30px auto;
width: 80%;
}
#searchBox-input {
font-size: medium;
padding: 3px;
width: 400px;
}
#searchBox button {
padding: 4px 6px;
margin-left: 10px;
}
.contentsBlock {
padding: 4px 10px;
margin: 10px auto;
background-color: #F5F5F5;
}
#navi-nomal, #navi-r18 {
margin-bottom: 20px;
}
#message {
position: relative;
padding-left: 24px;
}
#message-clear {
position: absolute;
top: 0; left: 0;
}
#processedTime {
margin-left: 20px;
}
#novels {
margin-top: 20px;
}
#novels-count {
border-bottom: 1px solid #DDD;
}
.novel {
margin: 16px 0;
}
.novel-title {
font-size: large;
font-weight: bold;
border-bottom: 1px solid var(--accent-color);
border-left: 10px solid var(--accent-color);
padding-left: 4px;
}
.novel-title~* {
margin-left: 10px;
}
.novel-subtitle {
/*text-decoration: underline;*/
}
.novel-tags-view::empty {
content: 'なし';
}
.novel-tags-view {
display: inline-block;
}
.novel-tag {
padding: 3px;
background-color: #dde9ec;
cursor: pointer;
margin: 2px;
border-radius: 2px;
display: inline-block;
line-height: normal;
}
.novel-tag:hover {
background-color: #cad8dc;
}
.novel-bookmarks table {
margin-left: 10px;
}
.novel-bookmark:hover {
background: #EEE;
}
.novel-bkm-index {
padding-right: 8px;
text-align: right;
}
.novel-bkm-comment {
color: #777;
font-size: small;
}
.nc-togglebutton_pressed {
background-color: #399ab7;
color: white;
}
.nc-togglebutton_released {
background-color: white;
color: black;
}
.nc-togglebutton {
padding: 2px;
}
</style>`);

// //////////////////// カスタムログ表示 ////////////////////

if (location.pathname === '/') {
    $(function() {
        'use strict';
        /* jshint esnext:true */
        // //////////////////// モーダル ////////////////////
        const body = $(document.body),
              modalsContainer = $('<div id="modals-container"/>').appendTo(body);
        function openModal(modal) {
            modal.trigger('OpenModal');
            modalsContainer.show();
            modal.show();
        }
        function closeModal(modal) {
            modalsContainer.hide();
            modal.modal.hide();
        }

        function addModal(id, title, onOpen, ...contents) {
            const modal = $('<div/>', {
                id, class: 'modal'
            }).appendTo(modalsContainer),
                  titleBar = $('<div class="modal-titleBar">' + title + '</div>').appendTo(modal),
                  viewport = $('<div class="modal-viewport"/>').appendTo(modal);
            for (const content of contents) viewport.append(content);
            return {modal, titleBar, viewport, setTitle: function(s) { titleBar.html(s); }};
        }
        function addTextareaModal(id, title, onConfirm, onOpen) {
            const textarea = $('<textarea class="modal-textarea"/>'),
                  buttons = $('<div class="modal-buttons"/>'),
                  buttonOK = $('<button/>', {
                      class: 'modal-button-OK',
                      text: 'OK',
                      click: function(e) {
                          if (onConfirm)
                              if (onConfirm(e))
                                  closeModal(modal);
                              else
                                  return;
                          closeModal(modal);
                      }
                  }).appendTo(buttons),
                  buttonCancel = $('<button/>', {
                      class: 'modal-button-Cancel',
                      text: 'キャンセル',
                      click: function() {
                          closeModal(modal);
                      }
                  }).appendTo(buttons),
                  modal = addModal(id, title, onOpen, textarea, buttons);
            modal.textarea = textarea;
            //modal.modal.addClass('textareaModal');
            return modal;
        }
        const modalExport = addTextareaModal('modal-export', 'データのエクスポート');
        const modalImport = addTextareaModal('modal-import', 'データのインポート', function() {
            if (window.confirm('データを上書きします。よろしいですか？')) {
                config.setStrData(modalImport.textarea.val());
                config.save();
                load();
                return true;
            }
            return false;
        });
        const modalAppend = addTextareaModal('modal-append', 'データの追加', function() {
            if (window.confirm('データを追加します。よろしいですか？')) {
                const data = JSON.parse(modalAppend.textarea.val(), config.jsonParser);
                for (const key in data) {
                    config.put(key, data[key]);
                }
                config.save();
                load(true);
                return true;
            }
            return false;
        });
        let editNovelID = null;
        const modalEditNovel = addTextareaModal('modal-edit-novel', '小説JSONの編集', function() {
            const data = JSON.parse(modalEditNovel.textarea.val(), config.jsonParser);
            config.put(editNovelID, data);
            config.save();
            // $(`.novel[novel-id=${editNovelID}]`).replaceWith(template.render(data));
            if (searchInput.val() === '')
                load(true);
            else
                search();
            return true;
        });

        // 基本データ
        const novelFilters = [];

        // //////////////////// キー入力 ////////////////////
        /*$(document).on('keydown', function(e) {
            if (e.keyCode === 46) {  // delete
            }
        });*/

        // //////////////////// ヘッダー部分 ////////////////////
        $('#novel_header').remove();
        $('title').text('小説カスタムログ');
        const contents = $('#contents_main').empty(),
              header = $('<div id="header"/>').prependTo('#container');

        header.append('<h1 id="title">小説カスタムログ</h1>');

        // //////////////////// 各種ボタン ////////////////////
        const buttons = $('<div id="buttons"/>').appendTo(header);
        buttons.append($('<button/>', {id: 'button-reload', text: 'リロード', click: function() {
            config.reload();
            search();
            console.log('Reloaded');
        }}));
        buttons.append($('<button/>', {id: 'button-import', text: 'インポート', click: function() {
            modalImport.textarea.text(JSON.stringify(config.data, null, '  '));
            openModal(modalImport.modal);
            modalImport.textarea.focus().select();
        }}));
        buttons.append($('<button/>', {id: 'button-export', text: 'エクスポート', click: function() {
            modalExport.textarea.text(JSON.stringify(config.data, null, '  '));
            openModal(modalExport.modal);
            modalExport.textarea.focus().select();
        }}));
        buttons.append($('<button/>', {id: 'button-append', text: '追加', click: function() {
            openModal(modalAppend.modal);
            modalAppend.textarea.focus();
        }}));
        buttons.append($('<button/>', {id: 'button-request', text: 'サーバーから取得', click: function() {
            message('サーバーから取得中...');
            config.reload();
            const dataKeys = Object.keys(config.data),
                  ncodes = dataKeys.map(n => config.get(n)).filter(n => !n.excludeUpdate).map(n => n.id),
                  timeStart = new Date();
            $.ajax({
                type: 'GET',
                url: 'http://localhost:8888/novels',
                data: {
                    ncode: ncodes.join('-'), items: 't-n-u-ga-nu', limit: ncodes.length,
                    r18: location.host === 'novel18.syosetu.com'
                }
            }).done(function(res, status, xhr) {
                console.log(res);
                if ((typeof res) === 'string')
                    res = JSON.parse(res, config.jsonParser);
                const updatedNovels = [];
                for (const novel of res) {
                    if ('allcount' in novel)
                        continue;
                    novel.ncode = novel.ncode.toLowerCase();
                    const savedNovel = config.get(novel.ncode);
                    novel.novelupdated_at = new Date(novel.novelupdated_at);
                    if (savedNovel) {
                        if (savedNovel.pageCount != novel.general_all_no) {
                            savedNovel.pageCount = novel.general_all_no;
                            updatedNovels.push(novel);
                        }
                        savedNovel.updatedAt = novel.novelupdated_at;
                        if (!savedNovel.authorURL)
                            savedNovel.authorURL = 'http://mypage.syosetu.com/' + novel.userid + '/';
                    } else {
                        console.log('Unknown novel:', novel);
                    }
                }
                config.save();
                const updateNovelsLi = updatedNovels.map(n => {
                    return `<li><a href="#novel-${n.ncode}">${n.title}</a> <a href="/${n.ncode}/${n.general_all_no}/">${n.general_all_no}話</a> ${n.novelupdated_at.toLocaleString()}</li>`;
                }).join('');
                message(`サーバーからの取得に成功(更新${updatedNovels.length>0?updatedNovels.length+'件)：':'なし)'}<ul>` + updateNovelsLi + '</ul>');
                search();
            }).fail(function(xhr, status, thrown) {
                console.error(xhr, status, thrown);
                message('サーバーからの取得に失敗');
            });
        }}));
        // //////////////////// 検索 ////////////////////
        function getQueryMatcher(query) {
            const m = query.match(/^\/(.+)\/$/i);
            if (m) {
                const re = new RegExp(m[1], 'i');
                return function(s) {
                    return s.match(re) ? true : false;
                };
            }
            return function(s) {
                return s.includes(query);
            };
        }
        const getSearcher = function(query) {
            const isNot = query.startsWith('!');
            if (isNot)
                query = query.substring(1);
            const [qKey, qVal] = query.split(':', 2);
            if (qVal === undefined) {
                return function(novel) {
                    if (query === '') {
                        return true;
                    }
                    const matcher = getQueryMatcher(query);
                    for (const tag of novel.tags) {
                        if (matcher(tag)) {
                            return true ^ isNot;
                        }
                    }
                    return matcher(novel.title) ^ isNot;
                };
            }
            const matcher = getQueryMatcher(qVal);
            if (qKey === 'readed') {
                return function(novel) {
                    const now = novel.latestReadedNo ? novel.latestReadedNo : novel.pageNo;
                    return (qVal === 'true' ? now === novel.pageCount : now !== novel.pageCount) ^ isNot;
                };
            }
            if (qKey === 'excludeUpdate') {
                return function(novel) {
                    return (qVal === 'true' ? novel.excludeUpdate : !novel.excludeUpdate) ^ isNot;
                };
            }
            if (qKey === 'title') {
                return function(novel) {
                    return matcher(novel.title) ^ isNot;
                };
            }
            if (qKey === 'tag') {
                return function(novel) {
                    if (qVal === '') {
                        return true;
                    }
                    for (const tag of novel.tags) {
                        if (matcher(tag)) {
                            return true ^ isNot;
                        }
                    }
                    return false ^ isNot;
                };
            }
            if (qKey === 'author') {
                return function(novel) {
                    return matcher(novel.authorName) ^ isNot;
                };
            }
            if (qKey === 'datebegin') {
                return function(novel) {
                    return (new Date(qVal) <= novel.date) ^ isNot;
                };
            }
            if (qKey === 'dateend') {
                return function(novel) {
                    return (new Date(qVal) >= novel.date) ^ isNot;
                };
            }
            // attr(key):value
            let m = qKey.match(/attr\((.+)\)/);
            if (m) {
                return function(novel) {
                    const attrValue = novel[m[1]];
                    return (attrValue ? matcher(attrValue.toString()) : false) ^ isNot;
                };
            }
        };
        const searchBox = $('<div id="searchBox"/>').appendTo(header);
        searchBox.wrap('<div id="searchBoxWrapper"/>');
        function filterSearch(novels) {
            const inputVal = searchInput.val();
            settings.put('lastQuery', inputVal, true);
            if (inputVal === '')
                load(true);
            const searchers = searchInput.val().split(' ').map(function(s) { return getSearcher(s); }),
                  returnNovels = [];
            for (const novel of novels) {
                let isInclude = true;
                for (const searcher of searchers) {
                    if (!searcher(novel)) {
                        isInclude = false;
                        break;
                    }
                }
                if (isInclude) returnNovels.push(novel);
            }
            return returnNovels;
        }
        novelFilters.push(filterSearch);
        function search() {
            const timeStart = new Date();
            load(true, filterSearch(config.asList()), timeStart);
        }
        const searchInput = $('<input/>', {
            id: 'searchBox-input', placeholder: '検索', spellcheck: false,
            value: settings.get('lastQuery'),
            on: { keypress: function(e) {
                if (e.keyCode === 13) { //  enter
                    search();
                }
            }}
        }).appendTo(searchBox),
              searchSearch = $('<button/>', {
                  id: 'searchBox-search', text: '🔍', title: '検索(Enterで代用可)', click: search
              }).appendTo(searchBox),
              searchReverse = $('<button/>', {
                  id: 'searchBox-reverse', text: '！', title: '条件を反転', click: function() {
                      const val = searchInput.val();
                      if (val.startsWith('!'))
                          searchInput.val(val.split(' ').map(q => q.substring(1)).join(' '));
                      else
                          searchInput.val(val.split(' ').map(q => '!' + q).join(' '));
                      search();
                  }
              }).appendTo(searchBox),
              searchClear = $('<button/>', {
                  id: 'searchBox-clear', text: '☓', title: 'リセット', click: function() {
                      searchInput.val('');
                      settings.put('lastQuery', '', true);
                      load(true);
                  }
              }).appendTo(searchBox),
              searchHelpContainer = $(`
<div id="searchHelpContainer" class="contentsBlock __80pct_centering">
<h1>検索構文説明</h1>
<h3>*</h3>
特殊構文を用いなかった場合、タイトルとタグを対象に検索します。
<h3>!*</h3>
否定です。マッチした場合に結果から除外します。キー付き構文でも同じく先頭に付加することで動作します。
<h3>/*/</h3>
マッチングに正規表現を用います。大文字/小文字を無視します。詳細はJavascriptの正規表現仕様を参照してください。
<h3>title:*</h3>
タイトルを対象に検索します。
<h3>tag:*</h3>
タグを対象に検索します。
<h3>author:*</h3>
作者名を対象に検索します。
<h3>datebegin:[date]</h3>
最新閲覧が[date]以降の日時のデータにマッチします。
<h3>dateend:[date]</h3>
最新閲覧が[date]以前の日時のデータにマッチします。
<h3>readed:true|false</h3>
値がtrueの場合、最新話まで読んでいるデータにマッチします。
<h3>excludeUpdate:true|false</h3>
値がtrueの場合、更新が除外されたデータにマッチします。
<h3>attr(key):value</h3>
指定された小説の属性を対象に検索します。属性の値は文字列として処理されます。
</div>`).hide().appendTo(header),
              searchHelp = $('<button/>', {
                  id: 'searchBox-help', text: '？', title: '検索のヘルプ', click: function() {
                      searchHelpContainer.toggle();
                  }
              }).appendTo(searchBox),
              onClickTag = function(e) {
                  const pre = e.ctrlKey ? searchInput.val() + ' ' : '';
                  searchInput.val(pre + e.target.innerText.trim());
                  search();
              },
              allTagsView = $('<div/>', {
                  id: 'allTags', class: 'contentsBlock __80pct_centering',
                  click: function(e) {
                      if (e.target.className === 'novel-tag')
                          onClickTag(e);
                  }
              }).hide().appendTo(header),
              showAllTags = $('<button/>', {
                  id: 'searchBox-showAllTags', text: '全タグ', title: 'すべてのタグを表示', click: function() {
                      const tags = [],
                            tagsCount = {};
                      for (const k in config.data) {
                          for (const tag of config.data[k].tags) {
                              if (!tags.includes(tag)) {
                                  tags.push(tag);
                                  tagsCount[tag] = 1;
                              } else {
                                  tagsCount[tag]++;
                              }
                          }
                      }
                      tags.sort((a, b) => {
                          return tagsCount[b] - tagsCount[a];
                      });
                      allTagsView.html(tags.map(tag => '<div class="novel-tag">' + tag + '</div>').join(''));
                      allTagsView.toggle();
                  }
              }).appendTo(searchBox),
              searchQueriesView = $('<div/>', {
                  id: 'searchQueries', class: 'contentsBlock __80pct_centering',
                  html: [
                      'お気に入り',
                      '読みかけ お気に入り',
                      'readed:false お気に入り',
                      'excludeUpdate:false',
                      'readed:false !読みかけ'
                  ].map(s => {
                      return '<div class="novel-tag searchQueries-query">' + s + '</div>';
                  }).join('')
              }).hide().appendTo(header),
              showSearchQueries = $('<button/>', {
                  id: 'showSearchQueries', text: 'クエリ', title: 'よく使うクエリ', click: function() {
                      searchQueriesView.toggle();
                  }
              }).appendTo(searchBox);

        // message
        const messageContainer = $('<div id="message" class="__m_b20"/>').appendTo(contents);
        function message(msg) {
            messageContainer.html('[' + new Date().toLocaleString() + ']' + msg);
            messageContainer.append($('<button/>', {id: 'message-clear', text: '☓', click: function() {messageContainer.text('');}}));
        }

        // R18
        // $('<label/>').append(includeR18).append('R18小説を表示する').appendTo(contents).wrap('<div id="includeR18-wrapper"/>');
        if (location.host === 'novel18.syosetu.com')
            contents.append('<div id="navi-normal"><a href="http://ncode.syosetu.com/">全年齢版に移動する</a></div>');
        else
            contents.append('<div id="navi-r18"><a href="http://novel18.syosetu.com/">R18版に移動する</a></div>');

        const otherTools = $('<div id="otherTools"/>').appendTo(contents),
              sorterSelector = $('<select/>', {change: function(e) {
                  sorter = sorters[sorterSelector.val()];
                  search();
              }}).appendTo(contents),
              sorters = {};
        sorterSelector.prepend('並び替え：');
        function addSorter(id, name, sorter) {
            sorters[id] = sorter;
            sorterSelector.append(`<option value=${id}>${name}</option>`);
            return sorter;
        }
        let sorter = addSorter('lastReadDeOrder', '最終閲覧日時(降順)', function(a, b) {
            return b.date.getTime() - a.date.getTime();
        });
        addSorter('lastReadOrder', '最終閲覧日時(昇順)', function(a, b) {
            return a.date.getTime() - b.date.getTime();
        });
        addSorter('lastUpdatedDeOrder', '最終更新日時(降順)', function(a, b) {
            if (a.updatedAt && b.updatedAt) return b.updatedAt.getTime() - a.updatedAt.getTime();
            if (a.updatedAt) return -1;
            if (b.updatedAt) return 1;
            return 0;
        });
        addSorter('lastUpdatedOrder', '最終更新日時(昇順)', function(a, b) {
            if (a.updatedAt && b.updatedAt) return a.updatedAt.getTime() - b.updatedAt.getTime();
            if (a.updatedAt) return -1;
            if (b.updatedAt) return 1;
            return 0;
        });

        // //////////////////// 小説表示処理 ////////////////////
        const novels = $('<div id="novels"/>').appendTo(contents),
              template = $.templates(`
<div id="novel-{{:id}}" class="novel" novel-id="{{:id}}">
<div class="novel-title">
<a href="/{{:id}}/">{{:title}}</a>
</div>
<div class="novel-author">
作者：{{if authorURL}}<a href="{{:authorURL}}">{{:authorName}}</a>{{else}}{{:authorName}}{{/if}}
</div>
<div class="novel-numbers">
<div class="novel-numLastRead">
最新閲覧： 
{{if pageNo > 1}}
<a href="/{{:id}}/{{:pageNo-1}}/">&#171;</a>
{{else}}
&nbsp;&nbsp;
{{/if}}
{{:pageNo}}
{{if pageNo < pageCount}}
<a href="/{{:id}}/{{:pageNo+1}}/">&#187;</a>
{{else}}
&nbsp;&nbsp;
{{/if}}
{{if chapter}}{{:chapter}}{{/if}}
<div class="novel-subtitle inline"><a href="/{{:id}}/{{:pageNo}}/">{{:subtitle}}</a></div>
{{:date.toLocaleString()}}
</div>
{{if latestReadedNo && latestReadedNo > pageNo}}
<div class="novel-numLastRead">
読了話： 
{{if latestReadedNo > 1}}
<a href="/{{:id}}/{{:latestReadedNo-1}}/">&#171;</a>
{{else}}
&nbsp;&nbsp;
{{/if}}
{{:latestReadedNo}}
{{if latestReadedNo < pageCount}}
<a href="/{{:id}}/{{:latestReadedNo+1}}/">&#187;</a>
{{else}}
&nbsp;&nbsp;
{{/if}}
{{if latestReadedChapter}}{{:latestReadedChapter}} {{/if}}<a href="/{{:id}}/{{:latestReadedNo}}/">{{:latestReadedSubtitle}}</a> {{:latestReadedDate.toLocaleString()}}
</div>
{{/if}}
<div class="novel-numLatest">
最新話： <a href="/{{:id}}/{{:pageCount}}/">{{:pageCount}}</a>  {{if updatedAt}}{{:updatedAt.toLocaleString()}}{{/if}}
</div>
<div class="novel-bookmarks">
{{if bookmarksLen > 0}}
しおり：
<table>
{{props bookmarks}}
<tr class="novel-bookmark">
<td class="novel-bkm-index">{{>prop.pageNo}}</td>
<td>
{{if prop.chapter}}{{>prop.chapter}}{{/if}}
<a href="/{{>prop.id}}/{{>prop.pageNo}}/">{{>prop.subtitle}}</a>
{{if prop.comment}}<span class="novel-bkm-comment">"{{>prop.comment}}"</span>{{/if}}
{{>prop.date.toLocaleString()}}
</td>
</tr>
{{/props}}
</table>
{{/if}}
</div>
</div>
<div class="novel-tags">
{{if tags}}
タグ：
<div class="novel-tags-view">
{{for tags}}<div class="novel-tag">{{:#data.trim()}}</div>{{/for}}
</div>
<button class="novel-tag-edit">編集</button>
{{/if}}
</div>
<div class="novel-buttons">
<button class="novel-edit-json">編集</button>
<button class="novel-update">更新</button>
<button class="novel-delete">削除</button>
<label class="checkboxLabel" style="vertical-align:middle;"><input class="novel-excludeUpdate" type="checkbox" {{if excludeUpdate}}checked={{:excludeUpdate}}{{/if}}/>更新から除外</label>
</div>
</div>
`);

        const onRemove = function() {
            const novel = $(this).parents('.novel'),
                  id = novel.attr('novel-id');
            if (confirm('本当に"'+config.get(id).title+'"を削除しますか？')) {
                config.remove(id);
                novel.remove();
                console.log('Deleted ' + id);
            }
        };
        const onTagEdit = function(e) {
            const novel = $(this).parents('.novel'),
                  novelData = config.get(novel.attr('novel-id')),
                  view = $('.novel-tags-view', novel),
                  viewInner = view.children(),
                  onEnter = function() {
                      const val = editor.val();
                      if (val === '') {
                          novelData.tags = [];
                          view.html('');
                      } else {
                          novelData.tags = val.split(/\s+/g);
                          view.html(novelData.tags.map(tag => '<span class="novel-tag">' + tag + '</span>').join(''));
                          $('.novel-tag', novel).on('click', onClickTag);
                      }
                      config.save();
                  },
                  editor = $('<input/>', {
                      type: 'text', value: novelData.tags.join(' '),
                      style: 'min-width: 200px; width:' + view.width() + 'px',
                      focusout: onEnter,
                      keypress: function(e) {
                          console.log(e.keyCode);
                          if (e.keyCode === 13)
                              onEnter();
                          if (e.keyCode === 27)
                              view.html(viewInner);
                      }
                  });
            view.html(editor);
            editor.focus();
        };
        const onEditJSON = function(e) {
            const novel = $(this).parents('.novel'),
                  id = novel.attr('novel-id'),
                  novelData = config.get(id),
                  view = $('.novel-tags-view', novel);
            editNovelID = novel.attr('novel-id');
            modalEditNovel.textarea.val(JSON.stringify(novelData, null, '  '));
            openModal(modalEditNovel.modal);
            modalEditNovel.textarea.focus();
        };
        const onExcludeUpdate = function(e) {
            const novel = $(this).parents('.novel'),
                  id = novel.attr('novel-id'),
                  novelData = config.get(id);
            novelData.excludeUpdate = e.target.checked;
            config.save();
        };
        const onNovelUpdate = function(e) {
            config.reload();
            const novel = $(this).parents('.novel'),
                  id = novel.attr('novel-id'),
                  newNovel = $(template.render(config.get(id)));
            novel.replaceWith(newNovel);
            setNovelEventHandlers(newNovel);
        };
        function setNovelEventHandlers(novel) {
            $('.novel-tag', novel).on('click', onClickTag);
            $('.novel-tag-edit', novel).on('click', onTagEdit);
            $('.novel-edit-json', novel).on('click', onEditJSON);
            $('.novel-delete', novel).on('click', onRemove);
            $('.novel-excludeUpdate', novel).on('click', onExcludeUpdate);
            $('.novel-update', novel).on('click', onNovelUpdate);
        }
        function load(isReload=false, _novels=null, timeStart=undefined) {
            if (!timeStart)
                timeStart = new Date();
            novels.empty();
            const novelsData = _novels ? _novels : [];
            if (!_novels) {
                for (let novel in config.data) {
                    novel = config.get(novel);
                    novelsData.push(novel);
                }
            }
            novelsData.sort(sorter);

            const searchQuery = searchInput.val(),
                  novelsCount = $(`<div id="novels-count">${config.getKeys().length}件中${novelsData.length}件の小説を表示${searchQuery === '' ? '' : `    "${searchQuery}"`}</div>`).appendTo(novels);
            novels.append(template.render(novelsData));
            setNovelEventHandlers();
            novelsCount.append(`<span id="processedTime">${(new Date() - timeStart)/1000}秒</span>`);
        }
        search();
    });
} else {  // not root page
    // //////////////////// 小説ページ処理 ////////////////////
    document.addEventListener('NarouCustomizeInitialized', function() {
        'use strict';
        /* jshint esnext:true */

        function query(q) {
            return document.querySelector(q);
        }
        const novel = unsafeWindow.novel,
              savedNovel = config.get(novel.id, null, false),
              foundChapter = novel.chapter !== undefined;
        if (location.host === 'novel18.syosetu.com') {
            novel.r18 = true;
            $('#folder-more .toolbox_folder_container').append($('<button/>', {
                id: 'btn-export-r18data', class: 'button_white toolbox_item', text: 'データ出力', click: function() {
                    prompt('ノクターンの小説データ', JSON.stringify(config.data, null, '  '));
                }
            }));
        }
        if (savedNovel) {
            const isUpdateLatestReaded = savedNovel.latestReadedNo && savedNovel.latestReadedNo <= novel.pageNo;
            novel.latestReadedNo = isUpdateLatestReaded ? novel.pageNo : savedNovel.latestReadedNo;
            novel.latestReadedSubtitle = isUpdateLatestReaded ? novel.subtitle : savedNovel.latestReadedSubtitle;
            novel.latestReadedDate = isUpdateLatestReaded ? novel.date : savedNovel.latestReadedDate;
            if (isUpdateLatestReaded && foundChapter)
                novel.latestReadedChapter = novel.chapter;
            else if (savedNovel.latestReadedChapter)
                novel.latestReadedChapter = savedNovel.latestReadedChapter;
            novel.tags = savedNovel.tags ? savedNovel.tags : [];
            novel.bookmarks = savedNovel.bookmarks ? savedNovel.bookmarks : {};
            novel.updatedAt = savedNovel.updatedAt;
        } else {
            novel.latestReadedNo = novel.pageNo;
            novel.latestReadedSubtitle = novel.subtitle;
            novel.latestReadedDate = novel.date;
            if (foundChapter)
                novel.latestReadedChapter = novel.chapter;
            novel.tags = [];
            novel.bookmarks = {};
            novel.updatedAt = new Date('2000/1/1 0:00:00');
        }
        novel.bookmarksLen = Object.keys(novel.bookmarks).length;

        // BOOKMARK
        function toggleButton(id, textReleased, textPressed, pressed, onChange) {
            return $('<button/>', {
                id, class: 'nc-togglebutton ' + (pressed ? 'nc-togglebutton_pressed' : 'nc-togglebutton_released'),
                text: pressed ? textPressed : textReleased,
                click: function(e) {
                    const self = $(this),
                          pressed = self.attr('pressed') !== 'true';
                    self.attr('pressed', pressed);
                    self.removeClass(pressed ? 'nc-togglebutton_released' : 'nc-togglebutton_pressed');
                    self.addClass(pressed ? 'nc-togglebutton_pressed' : 'nc-togglebutton_released');
                    self.text(pressed ? textPressed : textReleased);
                    onChange({target: this, event: e, pressed});
                }
            }).attr('pressed', pressed);
        }
        const isBookmarked = novel.pageNo in novel.bookmarks,
              folderMore = $('#folder-more .toolbox_folder_container');
        let buttonBookmarkEdit;
        function addBookmarkEdit() {
            buttonBookmarkEdit = $('<button/>', {
                id: 'edit-bookmark-comment', class: 'toolbox_item button_white',
                text: 'コメントを編集',
                click: function() {
                    const novel = config.reload().get(unsafeWindow.novel.id);
                    const comment = novel.bookmarks[novel.pageNo].comment;
                    const s = prompt('コメントを編集', comment ? comment : '');
                    if (s !== null) {
                        novel.bookmarks[novel.pageNo] = s;
                        config.save();
                        unsafeWindow.ncapi.popup('栞のコメントを設定しました：', s);
                    }
                }
            }).appendTo(folderMore);
        }
        folderMore.append(toggleButton('toggle-bookmark', '栞を挟む', '栞を外す', isBookmarked, function(detail) {
            const novel = config.reload().get(unsafeWindow.novel.id);
            if (detail.pressed) {
                const bookmark = {
                    id: novel.id, pageNo: novel.pageNo,
                    title: novel.title, subtitle: novel.subtitle, date: novel.date
                },
                      comment = prompt('栞のコメント(省略時は未入力)');
                if (comment)
                    bookmark.comment = comment;
                if (foundChapter)
                    bookmark.chapter = novel.chapter;
                novel.bookmarks[novel.pageNo] = bookmark;
                novel.bookmarksLen++;
                config.save();
                addBookmarkEdit();
                console.log(bookmark);
                unsafeWindow.ncapi.popup('栞を挟みました' + (comment ? '：' + comment : ''));
            } else {
                delete novel.bookmarks[novel.pageNo];
                novel.bookmarksLen--;
                config.save();
                if (buttonBookmarkEdit)
                    buttonBookmarkEdit.remove();
                unsafeWindow.ncapi.popup('栞を外しました');
            }
        }).addClass('toolbox_item'));
        if (isBookmarked) {
            addBookmarkEdit();
        }
        $('<button/>', {
            id: 'setLatestToIt', class: 'toolbox_item button_white', text: '読了話をここに設定',
            click: function() {
                const novel = config.reload().get(unsafeWindow.novel.id);
                novel.latestReadedNo = novel.pageNo;
                novel.latestReadedSubtitle = novel.subtitle;
                novel.latestReadedDate = novel.date;
                config.save();
                unsafeWindow.ncapi.popup('読了話をこのページに設定しました');
            }
        }).appendTo(folderMore);

        config.put(novel.id, novel);
    });
}