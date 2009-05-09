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

var sharedData = Application.storage.get("maf-data", null);
if (!sharedData) {
  sharedData = {};
  Application.storage.set("maf-data", sharedData);
}

Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
 .getService(Components.interfaces.mozIJSSubScriptLoader)
 .loadSubScript("chrome://maf/content/includeall.js");

try {

var browserWindow = window;

var MafUtils = GetMafUtilServiceClass();

var MafMHTHandler = new MafMhtHandlerServiceClass();

var MafGUI = new MAFGuiHandlerClass();
MafGUI.init(browserWindow);

var MafState = GetMafStateServiceClass();

var MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");

} catch(e) {
  mafdebug(e);
}

function maf() {

};

maf.prototype = {

  /**
   * Open a MAF archive and add the meta-data to the global state
   */
  openFromArchive: function(scriptPath, archiveFile, returnFirstItem) {
    if (!scriptPath) {
      // Determine the format to use (MAF or MHT) from the file name
      scriptPath = FileFilters.scriptPathFromFilePath(archiveFile.path);
    }

    // Determine the name of the directory where the archive will be extracted
    var dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    dir.initWithPath(Prefs.tempFolder);
    dir.append(new Date().valueOf() + "_" + Math.floor(Math.random() * 1000));

    // Extract the archive
    var archive;
    if (scriptPath == "TypeMHTML") {
      archive = new MhtmlArchive(archiveFile);
    } else {
      archive = new MaffArchive(archiveFile);
    }
    archive._tempDir = dir;
    archive.extractAll();

    // For each folder in the expanded archive root
    var openUrlList = [];
    archive.pages.forEach(function(page, pageIndex) {
      // Load the metadata if necessary
      if (archive instanceof MaffArchive) {
        try {
          page._loadMetadata();
        } catch (e) {
          Cu.reportError(e);
        }
      }
      // Add to the list the appropriate URL to be opened
      if (archive instanceof MaffArchive && Prefs.openUseJarProtocol) {
        openUrlList.push(page.directArchiveUri.spec);
      } else {
        openUrlList.push(page.tempUri.spec);
      }
    });

    // Register the archive in the cache
    ArchiveCache.registerArchive(archive);

    // Add the metadata to the state object
    MafState.addArchiveInfo(archive);

    if (Prefs.openAction == Prefs.OPENACTION_TABS) {
      if(returnFirstItem) {
        firstItem = openUrlList.shift();
      }
      this.openListInTabs(openUrlList);
      return firstItem;
    }

    if (Prefs.openAction == Prefs.OPENACTION_ASK) {
      if (!MafUtils.isWindowOpen("chrome://maf/content/mafBrowseOpenArchivesDLG.xul")) {
        MafGUI.browseOpenArchives();
      }
    }

    return null;
  },

  /**
   * Opens a list of URLs in tabs.
   */
  openListInTabs: function(urlList) {
    var oBrowser = browserWindow.getBrowser();
    for (var i=0; i < urlList.length; i++) {
      oBrowser.addTab(urlList[i]);
    }
  },

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
            mafdebug(e);
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
  },

  onWindowClose: function(event) {
    // Check to see it's the last open window
    var numberOfOpenWindows = MafUtils.getNumberOfOpenWindows();

    // If it's the last window
    if (numberOfOpenWindows < 2) {

      if (Prefs.tempClearOnExit) {
        // Remove everything in the temp directory
        try {
          var oDir = Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
          oDir.initWithPath(Prefs.tempFolder);

          if (oDir.exists() && oDir.isDirectory()) {
            var entries = oDir.directoryEntries;

            // If there's something to delete
            while (entries.hasMoreElements()) {
              // Remove entry
              var currFile = entries.getNext();
              currFile.QueryInterface(Components.interfaces.nsILocalFile);
              currFile.remove(true);
            }
          }
        } catch(e) {

        }
      }
    }

  },

  onWindowFocus: function(event) {
    if (event.originalTarget == "[object XULDocument]") {
      sharedData.mafObjectOfCurrentWindow = Maf;
    }
  }

};

try {

/**
 * Main object
 */
var Maf = new maf();

browserWindow.addEventListener("close", Maf.onWindowClose, true);
browserWindow.addEventListener("load", Maf.onWindowLoad, true);
browserWindow.addEventListener("focus", Maf.onWindowFocus, true);

} catch(e) {
  mafdebug(e);
}

// When a new browser window initially loads, the current Maf object is updated
//  so that archives will be opened in that window. This must be done here to
//  support the case where an archive is specified on the command-line. When
//  an existing window gets the focus, this reference is updated.
sharedData.mafObjectOfCurrentWindow = Maf;

function mafdebug(text) {
//  var contents = "" + (new Date()).getTime() + ": " + text;

  Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService)
    .logStringMessage(text);

/*
  var logFile = Components.classes["@mozilla.org/file/directory_service;1"]
                  .getService(Components.interfaces.nsIProperties)
                  .get("ProfD", Components.interfaces.nsIFile);
  logFile.append("mafdebug.log");

  if (!logFile.exists()) {
    logFile.create(0x00, 0644);
  }

  contents += "\r\n";

  try {
    var oTransport = Components.classes["@mozilla.org/network/file-output-stream;1"]
                        .createInstance(Components.interfaces.nsIFileOutputStream);
    oTransport.init( logFile, 0x04 | 0x08 | 0x10, 064, 0 );
    oTransport.write(contents, contents.length);
    oTransport.close();
  } catch (e) {
    alert(e);
  }
*/
};

/**
 * Copied from JS-Examples archives
 * Source: http://js-x.com/javascript/?view=932
 * Author: Brock Weaver - 0
 */
var Maf_String_trim = function(x) {
  // skip leading and trailing whitespace
  // and return everything in between
  x=x.replace(/^\s*(.*)/, "$1");
  x=x.replace(/(.*?)\s*$/, "$1");
  return x;
};

/**
 * Replace all needles with newneedles
 */
var Maf_String_replaceAll = function(x, needle, newneedle) {
  x=x.split(needle).join(newneedle);
  return x;
};

var Maf_String_startsWith = function(x, needle) {
  return (x.substring(0, needle.length) == needle);
};

var Maf_String_endsWith = function(x, needle) {
  return (x.substring(x.length - needle.length, x.length) == needle);
};

