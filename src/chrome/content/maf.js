/**
 * Mozilla Archive Format
 * ======================
 *
 *  Copyright (c) 2005 Christopher Ottley.
 *  Portions Copyright (c) 2008 Paolo Amadini.
 *
 *  This file is part of MAF.
 *
 *  MAF is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  MAF is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.

 *  You should have received a copy of the GNU General Public License
 *  along with MAF; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 */
/**
 * TODO: Add save frame functionality to alternative save component.
 */

var browserWindow = window;

function maf() {

};

maf.prototype = {
  _makeLocalLinksAbsolute: function(domDoc, baseUrl, originalURL) {
    if (baseUrl != "") {
      var obj_baseUrl = Components.classes["@mozilla.org/network/standard-url;1"]
                           .createInstance(Components.interfaces.nsIURL);
      obj_baseUrl.spec = baseUrl;

      var obj_originalURL = Components.classes["@mozilla.org/network/standard-url;1"]
                              .createInstance(Components.interfaces.nsIURL);
      if (originalURL != "") {
        obj_originalURL.spec = originalURL;
      }

      var loadURIios = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);

      var alltags = domDoc.getElementsByTagName("*");
      for (var i=0; i<alltags.length; i++) {
        var tagattrib = alltags[i].attributes;
        for (var j=0; j<tagattrib.length; j++) {
          var attribName = tagattrib[j].name.toLowerCase();
          if ((attribName == "action") ||
              (attribName == "background") ||
              (attribName == "cite") ||
              (attribName == "classid") ||
              (attribName == "codebase") ||
              (attribName == "data") ||
              (attribName == "href") ||
              (attribName == "longdesc") ||
              (attribName == "profile") ||
              (attribName == "src") ||
              (attribName == "usemap")) {

              try {
                if (originalURL != "") {
                  var testURL = obj_originalURL.resolve(tagattrib[j].value);

                  var isLocalURL = false;

                  try {
                    if (testURL != originalURL) {
                      var ouri = loadURIios.newURI(testURL, "", null);    // Create URI object
                      var file = ouri.QueryInterface(Components.interfaces.nsIFileURL).file;
                      if (file.exists()) {
                        isLocalURL = true;
                      }
                    }
                  } catch(ex) {

                  }

                  if (isLocalURL) { // testURL is a URL of a file that exists
                    tagattrib[j].value = testURL;
                  }
                }
              } catch(e) {  }
          }
        }
      }
    }
  },

  onWindowLoad: function(event) {
    if (event.originalTarget == "[object XULDocument]") {
      // New window
    } else {
      if (event.originalTarget == "[object HTMLDocument]") {
        // New tab

        // Get the original url
        var originalURL = event.originalTarget.location.href;
        var page = ArchiveCache.pageFromAnyTempUriSpec(originalURL);

        // Remove the hash if any
        if (originalURL.indexOf("#") > 0) {
          originalURL = originalURL.substring(0, originalURL.indexOf("#"));
        }

        if (Prefs.openRewriteUrls && page) {
          var doc = event.originalTarget;
          var baseUrl = doc.location.href;

          try {
           var baseTag = doc.getElementsByTagName("base")[0];
           var baseTagAttribs = baseTag.attributes;
           for (var i=0; i<baseTagAttribs.length; i++) {
             var attribName = baseTagAttribs[i].name.toLowerCase();
             if (attribName == "href") {
               baseUrl = baseTagAttribs[i].value;
             }
           }

          } catch(e) {

          }

          try {
            Maf._makeLocalLinksAbsolute(doc, baseUrl, originalURL);
            var basePage = ArchiveCache.pageFromUriSpec(baseUrl);
            baseUrl = basePage && basePage.originalUrl;
            Maf._makeLocalLinksAbsolute(doc, baseUrl, "");
          } catch(e) {

          }

          // We have some work to do
          var links = event.originalTarget.links;

          for (var j=0; j < links.length; j++) {
            var targetPage = ArchiveCache.pageFromOriginalUriSpec(links[j].href);
            if (targetPage) {
              // See if it is hashed
              var hashPart = "";
              if (links[j].href.indexOf("#") > 0) {
                hashPart = links[j].href.substring(links[j].href.indexOf("#"), links[j].href.length);
              }
              links[j].href = targetPage.archiveUri.spec + hashPart;
            }
          }
        }
      }
    }
  }

};

/**
 * Main object
 */
var Maf = new maf();

browserWindow.addEventListener("load", Maf.onWindowLoad, true);