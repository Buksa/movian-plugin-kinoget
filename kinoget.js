/*
 *  kinoget  - Movian Plugin
 *
 *  Copyright (C) 2016 Buksa
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
//ver 0.1.1
var plugin = JSON.parse(Plugin.manifest);
var PREFIX = plugin.id;
var BASE_URL = "http://kinoget.to";
var service = require("showtime/service");
var settings = require("showtime/settings");
var page = require("showtime/page");
var http = require("showtime/http");
var html = require("showtime/html");
var io = require('native/io');
service.create(plugin.title, PREFIX + ":start", "video", true, Plugin.path + "logo.png");
settings.globalSettings(plugin.id, plugin.title, Plugin.path + "logo.png", plugin.synopsis);
settings.createDivider("General");
settings.createBool("debug", "Debug", false, function(v) {
  service.debug = v;
});
io.httpInspectorCreate("http.*\\.kinoget.to*", function(req) {
  req.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36');
  req.setHeader('Accept-Encoding', 'gzip, deflate');
});
new page.Route(PREFIX + ":start", start);
new page.Route(PREFIX + ":index:([^:]+):(.*)", index);
new page.Route(PREFIX + ":mediaInfo:(.*)", mediaInfo);
page.Searcher(PREFIX + " - Videos", Plugin.path + "logo.png", searcher);

function searcher(page, query) {
  page.entries = 0;
  page.type = "directory";
  page.loading = true;
  query = escape(query);
  try {
    console.log("Search kinoget for: " + query);
    //curl "http://kinoget.to/search"
    //-H "Pragma: no-cache"
    //-H "Origin: http://kinoget.to"
    //-H "Accept-Encoding: gzip, deflate"
    //-H "Accept-Language: en-US,en;q=0.8,zh;q=0.6,zh-CN;q=0.4,zh-TW;q=0.2"
    //-H "Upgrade-Insecure-Requests: 1"
    //-H "User-Agent: Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36"
    //-H "Content-Type: application/x-www-form-urlencoded"
    //-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
    //-H "Cache-Control: no-cache"
    //-H "Referer: http://kinoget.to/"
    //-H "Cookie: __cfduid=de9bcd6aed38c2ecb6246fe16065e14361452636293; ci_session=b96cee607116c07227fbaf46ae141176f5f1486c"
    //-H "Connection: keep-alive" --data "search_text=lost" --compressed
    var response = http.request("http://kinoget.to/search", {
      debug: service.debug,
      postdata: {
        search_text: query
      }
    });
    //returnValue=[]
    var dom = html.parse(response.toString());
    var elements = dom.root.getElementByClassName("filmInfo");
    for (i = 0; i < elements.length; i++) {
      element = elements[i];
      year = null !== /\((\d{4})\)/.exec(element.getElementByClassName("origTitle")[0].textContent.trim()) ? /(\d{4})/.exec(element.getElementByClassName("origTitle")[0].textContent.trim())[0] : "";
      href = element.getElementByTagName("a")[0].attributes.getNamedItem("href").value
      icon = BASE_URL + element.getElementByTagName("img")[0].attributes.getNamedItem("src").value
      title = element.getElementByClassName("filmblockTitle")[0].textContent.trim()
      page.appendItem(PREFIX + ":mediaInfo:" + href, "video", {
        title: title,
        icon: icon,
        year: +year
      });
      page.entries++;
    }
  } catch (err) {
    console.log("kinoget - Ошибка поиска:  " + err);
    e(err);
  }
  page.loading = false;
}

function start(page) {
  page.metadata.title = plugin.title;
  page.metadata.logo = Plugin.path + "logo.png";
  page.loading = true;
  try {
    start_block(page, '/cat/film/page/1', 'фильмы');
    start_block(page, '/cat/ser/page/1', 'Сериалы');
  } catch (err) {
    p("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    p(e(err));
    p("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  }
  page.type = "directory";
  page.loading = false;
}

function getTitles(response, callback) {
  var returnValue = [];
  if (response.statuscode === 200) {
    var dom = html.parse(response.toString());
    var elements = dom.root.getElementByClassName("filmBlock");
    for (i = 0; i < elements.length; i++) {
      element = elements[i];
      var year = null !== /\((\d{4})\)/.exec(element.getElementByClassName("origTitle")[0].textContent.trim()) ? /(\d{4})/.exec(element.getElementByClassName("origTitle")[0].textContent.trim())[0] :
        "";
      returnValue.push({
        url: element.getElementByTagName("a")[0].attributes.getNamedItem("href").value,
        icon: BASE_URL + element.getElementByTagName("img")[0].attributes.getNamedItem("src").value,
        title: element.getElementByClassName("filmblockTitle")[0].textContent.trim(),
        year: year,
        orig_title: element.getElementByClassName("origTitle")[0].textContent.trim(),
        description: element.getElementByClassName("filmRightSide")[0].getElementByTagName("span")[3].textContent.trim()
      });
    }
  }
  p("getTitles return:" + "\n" + dump(returnValue));
  if (callback) {
    callback(returnValue);
  }
  return returnValue;
}

function start_block(page, href, title) {
  page.appendItem("", "separator", {
    title: title
  });
  var response = http.request(BASE_URL + href, {
    debug: service.debug,
    method: "GET",
    noFail: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0"
    }
  });
  var items = getTitles(response);
  for (i = 0; i < items.length; i++) {
    item = items[i];
    page.appendItem(PREFIX + ":mediaInfo:" + item.url, "video", {
      title: item.title,
      year: item.year ? parseInt(item.year, 10) : '',
      rating: parseInt(item.rating, 10),
      genre: item.genre,
      description: item.description ? item.description : item.title,
      icon: item.icon
    });
  }
  page.appendItem(PREFIX + ":index:" + href + ":" + title, "directory", {
    title: "Дальше больше ►"
  });
}

function index(page, path, title) {
  var urlData, offset;
  page.metadata.title = title;
  offset = 1;
  path = path.replace(/\d+$/g, "");

  function loader() {
    setTimeout(function() {
      p("loader start");
      p(BASE_URL + path + offset + "/");
      urlData = http.request(BASE_URL + path + offset + "/", {
        method: "GET",
        debug: service.debug,
        noFail: true
      });
      if (urlData.statuscode === 404) {
        p(urlData.statuscode);
        page.haveMore(false);
        return;
      }
      getTitles(urlData, function(titleList) {
        for (var i = 0; i < titleList.length; i++) {
          item = titleList[i];
          page.appendItem(PREFIX + ":mediaInfo:" + item.url, "video", {
            title: item.title,
            year: parseInt(item.year, 10),
            rating: parseInt(item.rating, 10),
            genre: item.genre,
            description: item.description ? item.description : item.title,
            icon: item.icon
          });
        }
        offset++;
        page.haveMore(true);
      });
      p("loader stop");
    }, 3E3);
  }
  page.type = "directory";
  page.asyncPaginator = loader;
  loader();
}

function mediaInfo(page, href) {
  page.metadata.title = plugin.title;
  page.metadata.logo = Plugin.path + "logo.png";
  page.loading = true;
  try {
    var resp = http.request(BASE_URL + href, {
      method: "GET",
      noFail: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0"
      }
    });
    dom = html.parse(resp.toString());
    dom.root.getElementByClassName("filmVersions")[0].getElementByTagName("tbody")[0].children.forEach(function(element, i) {
      href = element.getElementByTagName("a")[0].attributes.getNamedItem("href").value;
      title = element.getElementByTagName("span")[0].textContent.trim();
      size = element.getElementByTagName("span")[1].textContent.trim();
      seeds = element.getElementByTagName("span")[2].textContent.trim();
      page.appendItem("torrent:browse:" + BASE_URL + href, "directory", {
        title: title + ' | Сиды:' + seeds
      });
    });
  } catch (err) {
    p("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    p(e(err));
    p("xxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  }
  page.type = "directory";
  page.loading = false;
}

function p(message) {
  if (service.debug == "1") {
    print(message);
  }
}

function e(ex) {
  console.log(ex);
  console.log("Line #" + ex.lineNumber);
}

function dump(arr, level) {
  var dumped_text = "";
  if (!level) {
    level = 0;
  }
  var level_padding = "";
  for (var j = 0; j < level + 1; j++) {
    level_padding += "    ";
  }
  if (typeof arr == "object") {
    for (var item in arr) {
      var value = arr[item];
      if (typeof value == "object") {
        dumped_text += level_padding + "'" + item + "' ...\n";
        dumped_text += dump(value, level + 1);
      } else {
        dumped_text += level_padding + "'" + item + "' => \"" + value + '"\n';
      }
    }
  } else {
    dumped_text = "===>" + arr + "<===(" + typeof arr + ")";
  }
  return dumped_text;
}