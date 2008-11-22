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

var MafLibMHTDecoder = new MafMhtDecoderClass();

var MafLibMHTEncoder = new MafMhtEncoderClass();

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
        
        if (entryname.endsWith("/")) {
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
       
      var obs = Components.classes["@mozilla.org/observer-service;1"]
                   .getService(Components.interfaces.nsIObserverService);      
                   
      var observerData = new Array();
      observerData[observerData.length] = 0; // Error code
      observerData[observerData.length] = destpath;

      obs.notifyObservers(null, "maf-extract-finished", observerData);
    }
  },


  /**
   * Archives the downloaded file(s).
   */
  archiveDownload: function(program, archivefile, sourcepath,
   appendtoexistingarchive) {
    if (program == "TypeMHTML") {

      var temppath = Prefs.tempFolder;

      var realSourcePath = MafUtils.appendToDir(temppath, sourcepath);

      MafMHTHandler.createArchive(archivefile, realSourcePath);

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
      
      var observerData = new Array();
      observerData[observerData.length] = exitvalue;
      observerData[observerData.length] = archivefile;
  
      var obs = Components.classes["@mozilla.org/observer-service;1"]
                    .getService(Components.interfaces.nsIObserverService);
      obs.notifyObservers(null, "maf-archiver-finished", observerData);      
      
    }
  },

  /**
   * Save a single web page in an archive
   */
  saveAsWebPageComplete: function(aBrowser, tempPath, scriptPath, archivePath) {
    var dateTimeArchived = new Date();

    var objMafArchiver = new MafArchiverClass();
    objMafArchiver.init(aBrowser, tempPath, scriptPath, archivePath, dateTimeArchived.valueOf() + "", Maf);
    objMafArchiver.setProgressUpdater(Maf);
    objMafArchiver.start(false); // Do not append to existing archive
  },


  nativeSaveFile: function(aDocument, aSaveDocPath, aSaveDocFileName, aObjMafArchiver) {
    try {
     MafNativeFileSave.saveFile(aDocument, aSaveDocPath, aSaveDocFileName,
                                aObjMafArchiver);
    } catch(e) {
      mafdebug(e);
    }
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
  saveAllTabsComplete: function(browsers, includeList, tempPath, scriptPath, archivePath) {
    var objMafTabArchiver = new MafTabArchiverClass();
    objMafTabArchiver.init(browsers, tempPath, scriptPath, archivePath, Maf);
    if (includeList != "") {
      objMafTabArchiver.setIncludeList(includeList);
    }
    MafGUI.showDownloadTabsDLG(objMafTabArchiver);
  },

  /**
   * Open a MAF archive and add the meta-data to the global state
   */
  openFromArchive: function(scriptPath, archivePath) {
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
      this.openListInTabs(archiveLocalURLs.value);
    }

    if (Prefs.openAction == Prefs.OPENACTION_ASK) {
      if (!MafUtils.isWindowOpen("chrome://maf/content/mafBrowseOpenArchivesDLG.xul")) {
        MafGUI.browseOpenArchives();
      }
    }
  },

  /**
   * Opens a list of URLs in tabs.
   */
  openListInTabs: function(urlList) {
    var oBrowser = browserWindow.getBrowser();

    try {
      var triedFirstTab = false;
      for (var i=0; i < urlList.length; i++) {
        if (triedFirstTab) {
          oBrowser.addTab(urlList[i]);
        } else {
          triedFirstTab = true;
          if ((oBrowser.browsers.length == 1) && (oBrowser.currentURI.spec == "about:blank")) {
            oBrowser.loadURI(urlList[i], null, null);
          } else {
            oBrowser.addTab(urlList[i]);
          }

        }
      }
    } catch(e) {
      mafdebug(e);
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
String.prototype.trim = function() {
  // skip leading and trailing whitespace
  // and return everything in between
  var x=this;
  x=x.replace(/^\s*(.*)/, "$1");
  x=x.replace(/(.*?)\s*$/, "$1");
  return x;
};

/**
 * Replace all needles with newneedles
 */
String.prototype.replaceAll = function(needle, newneedle) {
  var x=this;
  x=x.split(needle).join(newneedle);
  return x;
};

String.prototype.startsWith = function(needle) {
  return (this.substring(0, needle.length) == needle);
};

String.prototype.endsWith = function(needle) {
  return (this.substring(this.length - needle.length, this.length) == needle);
};

////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
//////////////  Redefine global functions - 'cuz it's open source and fun!!!  //////////////
////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

/**
 * A new and improved save. With MAF support.
 */
 
function appendFiltersForContentType(aFilePicker, aContentType, aFileExtension, aSaveMode)
{
  var dpa2 = false;
  try {
    if (SAVEMODE_COMPLETE_DOM) {
      dpa2 = true;
    }
  } catch (ex) { }

  // If deer park alpha 2 (dp1 dp2)
  if (dpa2) {
    
    var bundle = getStringBundle();
    // The bundle name for saving only a specific content type.
    var bundleName;
    // The corresponding filter string for a specific content type.
    var filterString;
  
    // XXX all the cases that are handled explicitly here MUST be handled
    // in GetSaveModeForContentType to return a non-fileonly filter.
    switch (aContentType) {
    case "text/html":
      bundleName   = "WebPageHTMLOnlyFilter";
      filterString = "*.htm; *.html";
      break;
  
    case "application/xhtml+xml":
      bundleName   = "WebPageXHTMLOnlyFilter";
      filterString = "*.xht; *.xhtml";
      break;
  
    case "text/xml":
    case "application/xml":
      bundleName   = "WebPageXMLOnlyFilter";
      filterString = "*.xml";
      break;
  
    default:
      if (aSaveMode != SAVEMODE_FILEONLY)
        throw "Invalid save mode for type '" + aContentType + "'";
  
      var mimeInfo = getMIMEInfoForType(aContentType, aFileExtension);
      if (mimeInfo) {
  
        var extEnumerator = mimeInfo.getFileExtensions();
  
        var extString = "";
        while (extEnumerator.hasMore()) {
          var extension = extEnumerator.getNext();
          if (extString)
            extString += "; ";    // If adding more than one extension,
                                  // separate by semi-colon
          extString += "*." + extension;
        }
  
        if (extString)
          aFilePicker.appendFilter(mimeInfo.description, extString);
      }
  
      break;
    }
  
    if (aSaveMode & SAVEMODE_COMPLETE_DOM) {
      aFilePicker.appendFilter(bundle.GetStringFromName("WebPageCompleteFilter"), filterString);
      // We should always offer a choice to save document only if
      // we allow saving as complete.
      aFilePicker.appendFilter(bundle.GetStringFromName(bundleName), filterString);
    }
  
    if (aSaveMode & SAVEMODE_COMPLETE_TEXT)
      aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterText);
  
    if (aSaveMode & SAVEMODE_COMPLETE_DOM) {
      // ** MAF Addition start
      try {
        var filters = FileFilters.saveFiltersArray;
        for (var i=0; i<filters.length; i++) {
          var title = filters[i][0];
          var mask = filters[i][1];
          aFilePicker.appendFilter(title, mask);
        }
      } catch(e) { }
      // ** MAF Addition end    
    }
      
    // Always append the all files (*) filter
    aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
  } else {

    var bundle = getStringBundle();
  
    switch (aContentType) {
    case "text/html":
      if (aSaveMode == MODE_COMPLETE)
        aFilePicker.appendFilter(bundle.GetStringFromName("WebPageCompleteFilter"), "*.htm; *.html");
      aFilePicker.appendFilter(bundle.GetStringFromName("WebPageHTMLOnlyFilter"), "*.htm; *.html");
      if (aSaveMode == MODE_COMPLETE)
        aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterText);
  
      // ** MAF Addition start
      try {
        var filters = FileFilters.saveFiltersArray;
        for (var i=0; i<filters.length; i++) {
          var title = filters[i][0];
          var mask = filters[i][1];
          aFilePicker.appendFilter(title, mask);
        }
      } catch(e) { }
      // ** MAF Addition end
  
      break;
    default:
      var mimeInfo = getMIMEInfoForType(aContentType, aFileExtension);
      if (mimeInfo) {
  
        var extEnumerator = mimeInfo.getFileExtensions();
  
        var extString = "";
        var defaultDesc = "";
        var plural = false;
        while (extEnumerator.hasMore()) {
          if (defaultDesc) {
            defaultDesc += ", ";
            plural = true;
          }
          var extension = extEnumerator.getNext();
          if (extString)
            extString += "; ";    // If adding more than one extension,
                                  // separate by semi-colon
          extString += "*." + extension;
          defaultDesc += extension.toUpperCase();
        }
  
        if (extString) {
          var desc = mimeInfo.Description;
          if (!desc) {
            var key = plural ? "unknownDescriptionFilesPluralFilter" :
                              "unknownDescriptionFilesFilter";
            desc = getStringBundle().formatStringFromName(key, [defaultDesc], 1);
          }
          aFilePicker.appendFilter(desc, extString);
        } else {
          aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
        }
      }
      else
        aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
      break;
    }
  
  }
}


function foundHeaderInfo(aSniffer, aData, aSkipPrompt)
{
  var contentType = aSniffer.contentType;
  var contentEncodingType = aSniffer.contentEncodingType;

  var shouldDecode = false;
  // Are we allowed to decode?
  try {
    const helperAppService =
      Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"].
        getService(Components.interfaces.nsIExternalHelperAppService);
    var url = aSniffer.uri.QueryInterface(Components.interfaces.nsIURL);
    var urlExt = url.fileExtension;
    if (helperAppService.applyDecodingForExtension(urlExt,
                                                   contentEncodingType)) {
      shouldDecode = true;
    }
  }
  catch (e) {
  }

  var isDocument = aData.document != null && isDocumentType(contentType);
  if (!isDocument && !shouldDecode && contentEncodingType) {
    // The data is encoded, we are not going to decode it, and this is not a
    // document save so we won't be doing a "save as, complete" (which would
    // break if we reset the type here).  So just set our content type to
    // correspond to the outermost encoding so we get extensions and the like
    // right.
    contentType = contentEncodingType;
  }

  var file = null;
  var saveAsType = kSaveAsType_URL;
  try {
    file = aData.fileName.QueryInterface(Components.interfaces.nsILocalFile);
  }
  catch (e) {
    var saveAsTypeResult = { rv: 0 };
    file = getTargetFile(aData, aSniffer, contentType, isDocument, aSkipPrompt, saveAsTypeResult);
    if (!file)
      return;
    saveAsType = saveAsTypeResult.rv;
  }

  // ** MAF Addition start
  if (saveAsType < 3) { // Not a MAF archive

    // This part was in the original FF code

    // If we're saving a document, and are saving either in complete mode or
    // as converted text, pass the document to the web browser persist component.
    // If we're just saving the HTML (second option in the list), send only the URI.
    var source = (isDocument && saveAsType != kSaveAsType_URL) ? aData.document : aSniffer.uri;
    var persistArgs = {
      source      : source,
      contentType : (isDocument && saveAsType == kSaveAsType_Text) ? "text/plain" : contentType,
      target      : makeFileURL(file),
      postData    : aData.document ? getPostData() : null,
      bypassCache : aData.bypassCache
    };

    var persist = makeWebBrowserPersist();

    // Calculate persist flags.
    const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
    const flags = nsIWBP.PERSIST_FLAGS_NO_CONVERSION | nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
    if (aData.bypassCache)
      persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
    else
      persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

    if (shouldDecode)
      persist.persistFlags &= ~nsIWBP.PERSIST_FLAGS_NO_CONVERSION;

    // Create download and initiate it (below)
    var dl = Components.classes["@mozilla.org/download;1"].createInstance(Components.interfaces.nsIDownload);

    if (isDocument && saveAsType != kSaveAsType_URL) {
      // Saving a Document, not a URI:
      var filesFolder = null;
      if (persistArgs.contentType != "text/plain") {
        // Create the local directory into which to save associated files.
        filesFolder = file.clone();

        var nameWithoutExtension = filesFolder.leafName;
        nameWithoutExtension = nameWithoutExtension.substring(0, nameWithoutExtension.lastIndexOf("."));
        var filesFolderLeafName = getStringBundle().formatStringFromName("filesFolder",
                                                                        [nameWithoutExtension],
                                                                        1);

        filesFolder.leafName = filesFolderLeafName;
      }

      var encodingFlags = 0;
      if (persistArgs.contentType == "text/plain") {
        encodingFlags |= nsIWBP.ENCODE_FLAGS_FORMATTED;
        encodingFlags |= nsIWBP.ENCODE_FLAGS_ABSOLUTE_LINKS;
        encodingFlags |= nsIWBP.ENCODE_FLAGS_NOFRAMES_CONTENT;
      }
      else {
        encodingFlags |= nsIWBP.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES;
      }

      const kWrapColumn = 80;
      dl.init(aSniffer.uri, persistArgs.target, null, null, null, persist);
      persist.saveDocument(persistArgs.source, persistArgs.target, filesFolder,
                          persistArgs.contentType, encodingFlags, kWrapColumn);
    } else {
      dl.init(source, persistArgs.target, null, null, null, persist);
      var referrer = aData.referrer || getReferrer(document)
      persist.saveURI(source, null, referrer, persistArgs.postData, null, persistArgs.target);
    }
  } else {
    // MAF Archive

    saveAsType = saveAsType - 3;

    var filename = file.path;

    var filters = FileFilters.saveFiltersArray;

    var selectedFileType = filters[saveAsType][1];

    selectedFileType = selectedFileType.substring(1,selectedFileType.length);

    if (filename.substring(filename.length-selectedFileType.length, filename.length).toLowerCase() !=
        selectedFileType.toLowerCase()) {
      filename += selectedFileType;
    }

    Maf.saveAsWebPageComplete(window.getBrowser().selectedBrowser, Prefs.tempFolder,
                              FileFilters.scriptPathFromSaveIndex(saveAsType), filename);
  }
  // ** MAF Addition end
}

// Modified from deer park alpha 2 (dp1 dp2)
/**
 * internalSave: Used when saving a document or URL. This method:
 *  - Determines a local target filename to use (unless parameter
 *    aChosenData is non-null)
 *  - Determines content-type if possible
 *  - Prompts the user to confirm the destination filename and save mode
 *    (content-type affects this)
 *  - Creates a 'Persist' object (which will perform the saving in the
 *    background) and then starts it.
 *
 * @param aURL The String representation of the URL of the document being saved
 * @param aDocument The document to be saved
 * @param aDefaultFileName The caller-provided suggested filename if we don't
 *        find a better one
 * @param aContentDisposition The caller-provided content-disposition header
 *         to use.
 * @param aContentType The caller-provided content-type to use
 * @param aShouldBypassCache If true, the document will always be refetched
 *        from the server
 * @param aFilePickerTitleKey Alternate title for the file picker
 * @param aChosenData If non-null this contains an instance of object AutoChosen
 *        (see below) which holds pre-determined data so that the user does not
 *        need to be prompted for a target filename.
 * @param aReferrer the referrer URI object (not URL string) to use, or null
          if no referrer should be sent.
 * @param aSkipPrompt If true, the file will be saved to the default download folder.
 */
function internalSave(aURL, aDocument, aDefaultFileName, aContentDisposition,
                      aContentType, aShouldBypassCache, aFilePickerTitleKey,
                      aChosenData, aReferrer, aSkipPrompt)
{
  if (aSkipPrompt == undefined)
    aSkipPrompt = false;

  // Note: aDocument == null when this code is used by save-link-as...
  var saveMode = GetSaveModeForContentType(aContentType);
  var isDocument = aDocument != null && saveMode != SAVEMODE_FILEONLY;
  var saveAsType = kSaveAsType_Complete;

  var file, fileURL;
  // Find the URI object for aURL and the FileName/Extension to use when saving.
  // FileName/Extension will be ignored if aChosenData supplied.
  var fileInfo = new FileInfo(aDefaultFileName);
  if (aChosenData)
    file = aChosenData.file;
  else {
    initFileInfo(fileInfo, aURL, aDocument, aContentType, aContentDisposition);
    var fpParams = {
      fpTitleKey: aFilePickerTitleKey,
      isDocument: isDocument,
      fileInfo: fileInfo,
      contentType: aContentType,
      saveMode: saveMode,
      saveAsType: saveAsType,
      file: file,
      fileURL: fileURL
    };

    if (!getTargetFile(fpParams, aSkipPrompt))
      // If the method returned false this is because the user cancelled from
      // the save file picker dialog.
      return;

    saveAsType = fpParams.saveAsType;
    saveMode = fpParams.saveMode;
    file = fpParams.file;
    fileURL = fpParams.fileURL;
  }

  // Not a MAF archive
  if ((saveAsType < 3) || (saveAsType > (2 + FileFilters.saveFiltersArray.length))) {
  
    if (!fileURL)
      fileURL = makeFileURI(file);
  
    // XXX We depend on the following holding true in appendFiltersForContentType():
    // If we should save as a complete page, the saveAsType is kSaveAsType_Complete.
    // If we should save as text, the saveAsType is kSaveAsType_Text.
    var useSaveDocument = isDocument &&
                          (((saveMode & SAVEMODE_COMPLETE_DOM) && (saveAsType == kSaveAsType_Complete)) ||
                          ((saveMode & SAVEMODE_COMPLETE_TEXT) && (saveAsType == kSaveAsType_Text)));
    // If we're saving a document, and are saving either in complete mode or
    // as converted text, pass the document to the web browser persist component.
    // If we're just saving the HTML (second option in the list), send only the URI.
    var source = useSaveDocument ? aDocument : fileInfo.uri;
    var persistArgs = {
      source      : source,
      contentType : (!aChosenData && useSaveDocument &&
                    saveAsType == kSaveAsType_Text) ?
                    "text/plain" : aContentType,
      target      : fileURL,
      postData    : isDocument ? getPostData() : null,
      bypassCache : aShouldBypassCache
    };
  
    var persist = makeWebBrowserPersist();
  
    // Calculate persist flags.
    const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
    const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
    if (aShouldBypassCache)
      persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
    else
      persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;
  
    // Leave it to WebBrowserPersist to discover the encoding type (or lack thereof):
    persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
  
    // Create download and initiate it (below)
    var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);
  
    if (useSaveDocument) {
      // Saving a Document, not a URI:
      var filesFolder = null;
      if (persistArgs.contentType != "text/plain") {
        // Create the local directory into which to save associated files.
        filesFolder = file.clone();
  
        var nameWithoutExtension = filesFolder.leafName.replace(/\.[^.]*$/, "");
        var filesFolderLeafName = getStringBundle().formatStringFromName("filesFolder",
                                                                        [nameWithoutExtension],
                                                                        1);
  
        filesFolder.leafName = filesFolderLeafName;
      }
  
      var encodingFlags = 0;
      if (persistArgs.contentType == "text/plain") {
        encodingFlags |= nsIWBP.ENCODE_FLAGS_FORMATTED;
        encodingFlags |= nsIWBP.ENCODE_FLAGS_ABSOLUTE_LINKS;
        encodingFlags |= nsIWBP.ENCODE_FLAGS_NOFRAMES_CONTENT;
      }
      else {
        encodingFlags |= nsIWBP.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES;
      }
  
      const kWrapColumn = 80;
      tr.init((aChosenData ? aChosenData.uri : fileInfo.uri),
              persistArgs.target, "", null, null, null, persist);
      persist.progressListener = tr;
      persist.saveDocument(persistArgs.source, persistArgs.target, filesFolder,
                          persistArgs.contentType, encodingFlags, kWrapColumn);
    } else {
      tr.init((aChosenData ? aChosenData.uri : source),
              persistArgs.target, "", null, null, null, persist);
      persist.progressListener = tr;
      persist.saveURI((aChosenData ? aChosenData.uri : source),
                      null, aReferrer, persistArgs.postData, null,
                      persistArgs.target);
    }
  
  } else {
    // MAF Archive

    saveAsType = saveAsType - 3;

    var filename = file.path;

    var filters = FileFilters.saveFiltersArray;

    var selectedFileType = filters[saveAsType][1];

    selectedFileType = selectedFileType.substring(1,selectedFileType.length);

    if (filename.substring(filename.length-selectedFileType.length, filename.length).toLowerCase() !=
        selectedFileType.toLowerCase()) {
      filename += selectedFileType;
    }

    Maf.saveAsWebPageComplete(window.getBrowser().selectedBrowser, Prefs.tempFolder,
                              FileFilters.scriptPathFromSaveIndex(saveAsType), filename);
  }
}


/**
* Remove any non-ascii chars from result string
*/
function removeDoubleByteChars(strWithDoubleByteChars) {
  var result = "";

  if (strWithDoubleByteChars) {
    for (var i=0; i<strWithDoubleByteChars.length; i++) {
      if (strWithDoubleByteChars.charCodeAt(i) < 256) {
        result += strWithDoubleByteChars[i];
      }
    }
  }

  return result;
}


function getDefaultFileName(aDefaultFileName, aURI, aDocument,
                            aContentDisposition) {
  var ff15 = false;

  try {
    // assuming we're running under Firefox
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                               .getService(Components.interfaces.nsIVersionComparator);
    if (versionChecker.compare(appInfo.version, "1.5") >= 0) {
      // running under Firefox 1.5 or later
      ff15 = true;
    }
  } catch (ex) { }


  if (ff15) {
    return getDefaultFileName_postDP(aDefaultFileName, aURI, aDocument, aContentDisposition);
  } else {
    return getDefaultFileName_preDP(aDefaultFileName, aNameFromHeaders, aURI, aDocument);
  }
}

/**
 * Redefined to check the document title first and then the headers.
 * Not re-numbered in comments to show original position.
 */
function getDefaultFileName_preDP(aDefaultFileName, aNameFromHeaders, aDocumentURI, aDocument)
{
  if ((aDocument) && (aDocument.contentType == "text/html")) {

    var uctitle = removeDoubleByteChars(aDocument.title);

    if (uctitle != aDocument.title) {
      uctitle = uctitle.replace(/\||:|-|,|\.|_/g, " ");
    }

    var docTitle = validateFileName(uctitle).replace(/^\s+|\s+$/g, "");

    if (docTitle != "") {
      // 3) Use the document title
      return docTitle;
    }
  }

  if (aNameFromHeaders)
    // 1) Use the name suggested by the HTTP headers
    return validateFileName(aNameFromHeaders);

  try {
    var url = aDocumentURI.QueryInterface(Components.interfaces.nsIURL);
    if (url.fileName != "") {
      // 2) Use the actual file name, if present
      return validateFileName(decodeURIComponent(url.fileName));
    }
  } catch (e) {
    try {
      // the file name might be non ASCII
      // try unescape again with a characterSet
      var textToSubURI = Components.classes["@mozilla.org/intl/texttosuburi;1"]
                                   .getService(Components.interfaces.nsITextToSubURI);
      var charset = getCharsetforSave(aDocument);
      return validateFileName(textToSubURI.unEscapeURIForUI(charset, url.fileName));
    } catch (e) {
      // This is something like a wyciwyg:, data:, and so forth
      // URI... no usable filename here.
    }
  }

  if (aDefaultFileName)
    // 4) Use the caller-provided name, if any
    return validateFileName(aDefaultFileName);

  // 5) If this is a directory, use the last directory name
  var re = /\/([^\/]+)\/$/;
  var path = aDocumentURI.path.match(re);
  if (path && path.length > 1) {
      return validateFileName(path[1]);
  }

  try {
    if (aDocumentURI.host)
      // 6) Use the host.
      return aDocumentURI.host;
  } catch (e) {
    // Some files have no information at all, like Javascript generated pages
  }
  try {
    // 7) Use the default file name
    return getStringBundle().GetStringFromName("DefaultSaveFileName");
  } catch (e) {
    //in case localized string cannot be found
  }
  // 8) If all else fails, use "index"
  return "index";
}


function getDefaultFileName_postDP(aDefaultFileName, aURI, aDocument,
                            aContentDisposition)
{
  // 1) look for a filename in the content-disposition header, if any
  if (aContentDisposition) {
    const mhpContractID = "@mozilla.org/network/mime-hdrparam;1";
    const mhpIID = Components.interfaces.nsIMIMEHeaderParam;
    const mhp = Components.classes[mhpContractID].getService(mhpIID);
    var dummy = { value: null };  // Need an out param...
    var charset = getCharsetforSave(aDocument);

    var fileName = null;
    try {
      fileName = mhp.getParameter(aContentDisposition, "filename", charset,
                                  true, dummy);
    }
    catch (e) {
      try {
        fileName = mhp.getParameter(aContentDisposition, "name", charset, true,
                                    dummy);
      }
      catch (e) {
      }
    }
    if (fileName)
      return fileName;
  }

  try {
    var url = aURI.QueryInterface(Components.interfaces.nsIURL);
    if (url.fileName != "") {
      // 2) Use the actual file name, if present
      var textToSubURI = Components.classes["@mozilla.org/intl/texttosuburi;1"]
                                   .getService(Components.interfaces.nsITextToSubURI);
      return validateFileName(textToSubURI.unEscapeURIForUI(url.originCharset || "UTF-8", url.fileName));
    }
  } catch (e) {
    // This is something like a data: and so forth URI... no filename here.
  }

  if (aDocument) {
    var docTitle = validateFileName(aDocument.title).replace(/^\s+|\s+$/g, "");
    if (docTitle) {
      // 3) Use the document title
      return docTitle;
    }
  }

  if (aDefaultFileName)
    // 4) Use the caller-provided name, if any
    return validateFileName(aDefaultFileName);

  // 5) If this is a directory, use the last directory name
  var path = aURI.path.match(/\/([^\/]+)\/$/);
  if (path && path.length > 1)
    return validateFileName(path[1]);

  try {
    if (aURI.host)
      // 6) Use the host.
      return aURI.host;
  } catch (e) {
    // Some files have no information at all, like Javascript generated pages
  }
  try {
    // 7) Use the default file name
    return getStringBundle().GetStringFromName("DefaultSaveFileName");
  } catch (e) {
    //in case localized string cannot be found
  }
  // 8) If all else fails, use "index"
  return "index";
}

/**
 * A new and improved open. With MAF support.
 */
function BrowserOpenFileWindow() {
  // Get filepicker component.
  try {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(browserWindow, gNavigatorBundle.getString("openFile"), nsIFilePicker.modeOpen);

    fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterImages |
                     nsIFilePicker.filterXML | nsIFilePicker.filterHTML);

    // ** MAF Addition start
    try {
      var filters = FileFilters.openFiltersArray;
      for (var i=0; i<filters.length; i++) {
        var title = filters[i][0];
        var mask = filters[i][1];
        fp.appendFilter(title, mask);
      }
    } catch(e) { }
    // ** MAF Addition end

    fp.appendFilters(nsIFilePicker.filterAll);

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                  .getService(Components.interfaces.nsIPrefService).getBranch("browser.");

    try {
      // Check pref for index and set it
      var filterIndex = prefs.getIntPref("openfile.filterindex");
      fp.filterIndex = filterIndex;
    } catch(e) { }


    if (fp.show() == nsIFilePicker.returnOK) {
      prefs.setIntPref("openfile.filterindex", fp.filterIndex);
      openTopWin(fp.fileURL.spec);
    }
  } catch (ex) {
    mafdebug(ex);
  }
};
