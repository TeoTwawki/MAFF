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
   * Extract the archive using the specified program
   */
  extractFromArchive: function(program, archivefile, destpath) {
    MafUtils.createDir(destpath);
    if (program == "TypeMHTML") {

      var dateTimeExpanded = new Date();
      var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random() * 1000);

      var realDestPath = MafUtils.appendToDir(destpath, folderNumber);

      MafMHTHandler.extractArchive(archivefile, realDestPath);
    } else {
      var oArchivefile = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
      oArchivefile.initWithPath(archivefile);

      var oDestpath = Components.classes["@mozilla.org/file/local;1"]
                             .createInstance(Components.interfaces.nsILocalFile);
      oDestpath.initWithPath(destpath);
          
      if (!oDestpath.exists() || !oDestpath.isDirectory()) {
        oDestpath.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 511);
      }
      
      var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"]
                        .createInstance(Components.interfaces.nsIZipReader);
      zipReader.open(oArchivefile);

      var it = zipReader.findEntries("*");
      while (it.hasMore()) {
      	entryname = it.getNext();
        var entry = zipReader.getEntry(entryname);
        entry = entry.QueryInterface(Components.interfaces.nsIZipEntry);	

        var oDestpathentry = Components.classes["@mozilla.org/file/local;1"]
                          .createInstance(Components.interfaces.nsILocalFile);
        oDestpathentry.initWithPath(destpath);
        oDestpathentry.setRelativeDescriptor(oDestpath, entryname);
        
        if (Maf_String_endsWith(entryname, "/")) {
          // Folder
          //alert("Extracting " + entryname);
          if (!oDestpathentry.exists() || !oDestpathentry.isDirectory()) {
            oDestpathentry.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 511);
          }          
        } else {
          //alert("Extracting " + entryname);
          if (!oDestpathentry.parent.exists() || !oDestpathentry.parent.isDirectory()) {
            oDestpathentry.parent.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 511);
          }
          zipReader.extract(entryname, oDestpathentry);        
        }
      }
      zipReader.close();
    }
  },


  /**
   * Archives the downloaded file(s).
   */
  archiveDownload: function(program, archivefile, sourcepath,
   appendtoexistingarchive, mafeventlistener) {
    if (program == "TypeMHTML") {

      var temppath = Prefs.tempFolder;

      var realSourcePath = MafUtils.appendToDir(temppath, sourcepath);

      MafMHTHandler.createArchive(archivefile, realSourcePath, mafeventlistener);

    } else {
    
      var exitvalue = 0;
    
      // Dfine some useful constants, locally for now
      const PR_RDONLY      = 0x01;
      const PR_WRONLY      = 0x02;
      const PR_RDWR        = 0x04;
      const PR_CREATE_FILE = 0x08;
      const PR_APPEND      = 0x10;
      const PR_TRUNCATE    = 0x20;
      const PR_SYNC        = 0x40;
      const PR_EXCL        = 0x80;

      const PR_USEC_PER_MSEC = 1000;

      try {
    
        var archivefileobj = Components.classes["@mozilla.org/file/local;1"]
                              .createInstance(Components.interfaces.nsILocalFile);
        archivefileobj.initWithPath(archivefile); 
        
        var zipwriterobj = Components.classes["@mozilla.org/zipwriter;1"]
                              .createInstance(Components.interfaces.nsIZipWriter);

        var sourcepathobj = Components.classes["@mozilla.org/file/local;1"]
                              .createInstance(Components.interfaces.nsILocalFile);
        sourcepathobj.initWithPath(MafUtils.appendToDir(Prefs.tempFolder, sourcepath));        
  
        var flags = PR_RDWR | PR_CREATE_FILE;
        if(!appendtoexistingarchive) flags |= PR_TRUNCATE;        
        zipwriterobj.open(archivefileobj, flags);
                  
        function addDirectoryToZipRecursive(sourcePathObj, destZipEntry) {
          var entries = sourcePathObj.directoryEntries;

          if (entries.hasMoreElements()) {
            zipwriterobj.addEntryDirectory(
             destZipEntry,
             sourcePathObj.lastModifiedTime * PR_USEC_PER_MSEC,
             false);
          }
  
          while (entries.hasMoreElements()) {
            var entry = entries.getNext().QueryInterface(Components.interfaces.nsIFile);
            var zipEntry = destZipEntry + "/" + entry.leafName;
            if (entry.isDirectory()) {
              addDirectoryToZipRecursive(entry, zipEntry);
            } else {
              zipwriterobj.addEntryFile(
               zipEntry,
               Components.interfaces.nsIZipWriter.COMPRESSION_BEST,
               entry,
               false);
            }
          }        
        }

        addDirectoryToZipRecursive(sourcepathobj, sourcepathobj.leafName);
          
        zipwriterobj.close();
        zipwriterobj = null;
      
      } catch (e) {
        mafdebug(e);
        exitvalue = 1;
      }

      mafeventlistener.onArchivingComplete(exitvalue);
    }
  },

  /**
   * Save a single web page in an archive
   */
  saveAsWebPageComplete: function(aBrowser, scriptPath, archivePath) {
    var objMafArchiver = new MafArchiverClass();
    objMafArchiver.init(aBrowser, scriptPath, archivePath, Maf);
    objMafArchiver.setProgressUpdater(Maf);
    objMafArchiver.start(false); // Do not append to existing archive
  },

  /**
   * If a single page is saved, this is called as visual feedback to the user.
   */
  progressUpdater: function(progress, code) {
    if (progress == 100) {
      if (code == 0) {
        if (Prefs.alertOnSinglePageComplete) {
          browserWindow.alert(MafStrBundle.GetStringFromName("archiveoperationcomplete"));
        } else {
          browserWindow.status = MafStrBundle.GetStringFromName("archiveoperationcomplete");
        }
      } else {
        browserWindow.alert(MafStrBundle.GetStringFromName("archiveoperationfailed") + code);
      }
    }
  },

  /**
   * Save all open tabs in an archive
   */
  saveAllTabsComplete: function(browsers, includeList, scriptPath, archivePath) {
    var objMafTabArchiver = new MafTabArchiverClass();
    objMafTabArchiver.init(browsers, scriptPath, archivePath, Maf);
    MafGUI.showDownloadTabsDLG(objMafTabArchiver);
  },

  /**
   * Open a MAF archive and add the meta-data to the global state
   */
  openFromArchive: function(scriptPath, archivePath, returnFirstItem) {
    var tempPath = Prefs.tempFolder;

    if (!scriptPath) {
      // Determine the format to use (MAF or MHT) from the file name
      scriptPath = FileFilters.scriptPathFromFilePath(archivePath);
    }

    var dateTimeExpanded = new Date();

    var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random()*1000);

    var objMafTabExpander = new MafTabExpanderClass();

    objMafTabExpander.init(tempPath, scriptPath, archivePath, folderNumber, Maf);
    objMafTabExpander.start();
    MafGUI.showOpenTabsDLG(objMafTabExpander);

    var count = {};
    var archiveLocalURLs = {};

    MafState.addArchiveInfo(tempPath, folderNumber, archivePath, count, archiveLocalURLs);

    if (Prefs.openAction == Prefs.OPENACTION_TABS) {
      if(returnFirstItem) {
        firstItem = archiveLocalURLs.value.shift();
      }
      this.openListInTabs(archiveLocalURLs.value);
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

        // Remove the hash if any
        if (originalURL.indexOf("#") > 0) {
          originalURL = originalURL.substring(0, originalURL.indexOf("#"));
        }

        if (Prefs.openRewriteUrls && (MafState.isArchiveURL(originalURL))) {
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
            Maf._makeLocalLinksAbsolute(doc, MafState.getOriginalURL(baseUrl), "");
          } catch(e) {
            mafdebug(e);
          }

          // We have some work to do
          var links = event.originalTarget.links;

          for (var j=0; j < links.length; j++) {
            if (MafState.isLocallyMappableURL(links[j].href)) {
              links[j].href=MafState.getLocalURL(links[j].href);
            } else {
              // See if it is hashed
              if (links[j].href.indexOf("#") > 0) {
                var hashPart = links[j].href.substring(links[j].href.indexOf("#"), links[j].href.length);
                var nonHashPart = links[j].href.substring(0, links[j].href.indexOf("#"));

                if (MafState.isLocallyMappableURL(nonHashPart)) {
                  links[j].href=MafState.getLocalURL(nonHashPart) + hashPart;
                }
              }
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
  },

  onPopupShown: function(event) {
    if (event.target.id != "contentAreaContextMenu") return;

    gContextMenu.showItem("maf-save-in-archive-menuitem",
                         !( gContextMenu.inDirList || gContextMenu.isTextSelected || gContextMenu.onTextInput ||
                            gContextMenu.onLink || gContextMenu.onImage ));
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
browserWindow.addEventListener("popupshown", Maf.onPopupShown, true);

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

