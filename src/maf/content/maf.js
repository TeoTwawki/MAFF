/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.4.1
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2004 Christopher Ottley.
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
 * Changes from 0.4.0 to 0.4.1
 *
 * Fixed UTF String conversion bug affecting non-english character sets.
 * Updated Italian locale contributed by Gioxx Solone: eXtenZilla.it.
 * Fixed Archive Timing bug that caused some complex pages not to be archived.
 * maf:// protocol now works with MHT archives.
 * Added Blocking Observer Service component.
 * Fixed MHT decoding bug that caused decoding to fail if the remap list said the new value exists, but the value is null.
 * Added preference to disable javascript document write preference for archive index pages before they open.
 * Added file filters to save drop down box filter names if on Windows.
 * Saving a page opened from an archive now saves the real original url in metadata.
 * Added capability to open archive pages from the browse window using the maf:// protocol if the protocol is enabled.
 *
 *
 * Changes from 0.3.0 to 0.4.0
 *
 * Merged all the installers. Now a single XPI for Mozilla/Firefox on Windows/Linux.
 * Changed the default file extension for MAF files to *.maff to avoid extension clashes with MS Access on Windows.
 * Added French Locale contributed by Xavier Robin.
 * Added Italian Locale contributed by Gioxx Solone: eXtenZilla.it.
 * Fixed GUI bug to allow mafsearch extension to work properly.
 * Fixed bug in post setup version check code to make it work in Firefox 1.0PR.
 * Fixed bug in clear temp on close so it now leaves temp folder and deletes entries in it.
 * MHTs now encoded using timeouts to reduce / avoid script speed warnings.
 * MHT encoding/decoding now 99.99% standards compliant. :).
 * Converted most Javascript objects and services into XPCOM components.
 * Added user agent string in preferences to allow access by XPCOM components.
 * Added code to make URLs absolute when HTML document loads so that form submissions, etc work.
 * Added Save in Archive context menu entry.
 * Added new MIME type "application/maf" for better handler support.
 * Removed the MAF Open archive entry from the file menu. Open file now has all the necessary functionality.
 * Added maf:// protocol that allows resource viewing of local maf archives (not designed for use with MHT archives).
 * When saving the document title of the selected tab is used for the default maf archive name.
 * Created string bundle of english text in code for better localization.
 * Added preference for disabling the maf:// protocol
 *
 */

try {

var browserWindow = window;

var MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                        .getService(Components.interfaces.nsIMafPreferences);

var MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);

var MafMHTHandler = Components.classes["@mozilla.org/maf/mhthandler_service;1"]
                       .getService(Components.interfaces.nsIMafMhtHandler);

var MafLibMHTDecoder = Components.classes["@mozilla.org/libmaf/decoder;1?name=mht"]
                          .createInstance(Components.interfaces.nsIMafMhtDecoder);

var MafLibMHTEncoder = Components.classes["@mozilla.org/libmaf/encoder;1?name=mht"]
                          .createInstance(Components.interfaces.nsIMafMhtEncoder);

var MafGUI = Components.classes["@mozilla.org/maf/guihandler;1"]
                .createInstance(Components.interfaces.nsIMafGuiHandler);
MafGUI.init(browserWindow);

var MafState = Components.classes["@mozilla.org/maf/state_service;1"]
                  .getService(Components.interfaces.nsIMafState);

var MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");

var MafBlockingObserver = Components.classes["@mozilla.org/blocking-observer-service;1"]
                             .getService(Components.interfaces.nsIObserverService);

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
    if (program == MafLibMHTDecoder.PROGID) {

      var dateTimeExpanded = new Date();
      var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random() * 1000);

      var realDestPath = MafUtils.appendToDir(destpath, folderNumber);

      MafMHTHandler.extractArchive(archivefile, realDestPath);
    } else {
      /** If program is nothing then don't try to run it. */
      if (program != "") {
        if (MafPreferences.win_invisible) {
          localProgram = MafPreferences.win_wscriptexe;
          localProgramArgs = new Array();
          localProgramArgs[localProgramArgs.length] = MafPreferences.win_invisiblevbs;
          localProgramArgs[localProgramArgs.length] = program;
        } else {
          localProgram = program;
          localProgramArgs = new Array();
        }

        try {
          var oProgram = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
          oProgram.initWithPath(localProgram);
        } catch(e) {
          mafdebug(MafStrBundle.GetStringFromName("couldnotfindprogram") + program + " \n" + e);
        }

        try {
          var oProcess = Components.classes["@mozilla.org/process/util;1"]
                           .createInstance(Components.interfaces.nsIProcess);
        } catch (e) {
          mafdebug(MafStrBundle.GetStringFromName("couldnotcreateprocess") + e);
        }

        oProcess.init(oProgram);

        localProgramArgs[localProgramArgs.length] = archivefile;
        localProgramArgs[localProgramArgs.length] = destpath;

        oProcess.run(true, localProgramArgs, localProgramArgs.length);

        var obs = Components.classes["@mozilla.org/observer-service;1"]
                     .getService(Components.interfaces.nsIObserverService);
        obs.notifyObservers(null, "maf-extract-finished", destpath);
      }
    }
  },


  /**
   * Archives the downloaded file(s).
   */
  archiveDownload: function(program, archivefile, sourcepath) {
    if (program == MafLibMHTEncoder.PROGID) {

      var temppath = MafPreferences.temp;

      var realSourcePath = MafUtils.appendToDir(temppath, sourcepath);

      MafMHTHandler.createArchive(archivefile, realSourcePath);

    } else {
      /** If program is nothing then don't try to run it. */
      if (program != "") {
        if (MafPreferences.win_invisible) {
          localProgram = MafPreferences.win_wscriptexe;
          localProgramArgs = new Array();
          localProgramArgs[localProgramArgs.length] = MafPreferences.win_invisiblevbs;
          localProgramArgs[localProgramArgs.length] = program;
        } else {
          localProgram = program;
          localProgramArgs = new Array();
        }

        try {
          var oProgram = Components.classes["@mozilla.org/file/local;1"]
                            .createInstance(Components.interfaces.nsILocalFile);
          oProgram.initWithPath(localProgram);
        } catch(e) {
          mafdebug(MafStrBundle.GetStringFromName("couldnotfindprogram") + program + " \n" + e);
        }

        try {
          var oProcess = Components.classes["@mozilla.org/process/util;1"]
                            .createInstance(Components.interfaces.nsIProcess);
        } catch (e) {
          mafdebug(MafStrBundle.GetStringFromName("couldnotcreateprocess") + e);
        }

        oProcess.init(oProgram);

        localProgramArgs[localProgramArgs.length] = archivefile;
        localProgramArgs[localProgramArgs.length] = sourcepath;

        oProcess.run(true, localProgramArgs, localProgramArgs.length);

        var obs = Components.classes["@mozilla.org/observer-service;1"]
                     .getService(Components.interfaces.nsIObserverService);
        obs.notifyObservers(null, "maf-archiver-finished", archivefile);
      }
    }
  },

  /**
   * Save a single web page in an archive
   */
  saveAsWebPageComplete: function(aBrowser, tempPath, scriptPath, archivePath) {
    var dateTimeArchived = new Date();

    var objMafArchiver = Components.classes["@mozilla.org/libmaf/archiver;1"]
                            .createInstance(Components.interfaces.nsIMafArchiver);
    objMafArchiver.init(aBrowser, tempPath, scriptPath, archivePath, dateTimeArchived.valueOf() + "", Maf);
    objMafArchiver.setProgressUpdater(Maf);
    objMafArchiver.start();
  },


  nativeSaveFile: function(aDocument, aSaveDocPath, aSaveDocFileName, aObjMafArchiver) {
    try {
     MafNativeFileSave.saveFile(aDocument, aSaveDocPath, aSaveDocFileName,
                                aObjMafArchiver.QueryInterface(Components.interfaces.nsIMafArchiver));
    } catch(e) {
      mafdebug(e);
    }
  },

  /**
   * If a single page is saved, this is called as visual feedback to the user.
   */
  progressUpdater: function(progress) {
    if (progress == 100) {
      browserWindow.alert(MafStrBundle.GetStringFromName("archiveoperationcomplete"));
    }
  },

  /**
   * Save all open tabs in an archive
   */
  saveAllTabsComplete: function(browsers, tempPath, scriptPath, archivePath) {
    var objMafTabArchiver = Components.classes["@mozilla.org/libmaf/tabarchiver;1"]
                               .createInstance(Components.interfaces.nsIMafTabArchiver);
    objMafTabArchiver.init(browsers, tempPath, scriptPath, archivePath, Maf);
    MafGUI.showDownloadTabsDLG(objMafTabArchiver);
  },

  /**
   * Open a MAF archive and add the meta-data to the global state
   */
  openFromArchive: function(tempPath, scriptPath, archivePath) {
    var dateTimeExpanded = new Date();

    var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random()*1000);

    var objMafTabExpander = Components.classes["@mozilla.org/libmaf/tabexpander;1"]
                                 .createInstance(Components.interfaces.nsIMafTabExpander);

    objMafTabExpander.init(tempPath, scriptPath, archivePath, folderNumber, Maf);
    objMafTabExpander.start();
    MafGUI.showOpenTabsDLG(objMafTabExpander);

    var count = {};
    var archiveLocalURLs = {};

    MafBlockingObserver.notifyObservers(null, "maf-open-archive-complete", MafUtils.appendToDir(tempPath, folderNumber));
    MafState.addArchiveInfo(tempPath, folderNumber, archivePath, count, archiveLocalURLs);

    if (MafPreferences.archiveOpenMode == Components.interfaces.nsIMafPreferences.OPENMODE_ALLTABS) {
      this.openListInTabs(archiveLocalURLs.value);
    }

    if (MafPreferences.archiveOpenMode == Components.interfaces.nsIMafPreferences.OPENMODE_SHOWDIALOG) {
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

  _makeLocalLinksAbsolute: function(domDoc, baseUrl, index_files) {
    if (baseUrl != "") {
      var obj_baseUrl =  Components.classes["@mozilla.org/network/standard-url;1"]
                            .createInstance(Components.interfaces.nsIURL);
      obj_baseUrl.spec = baseUrl;

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

              if (tagattrib[j].value.startsWith(index_files)) {
                tagattrib[j].value = obj_baseUrl.resolve(tagattrib[j].value);
              }
          }
        }
      }
    }
  },

  onWindowLoad: function(event) {
    if (event.originalTarget == "[object XULDocument]") {
      // New window

      // Get hidden window
      var appShell = Components.classes["@mozilla.org/appshell/appShellService;1"]
                        .getService(Components.interfaces.nsIAppShellService);
      var hiddenWnd = appShell.hiddenDOMWindow;

      if (typeof(hiddenWnd.mafloaded) == "undefined") {
        hiddenWnd.mafloaded = true;

        var prefExists = false;
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService).getBranch("maf.");

        try {
          var navigatorUserAgent = prefs.getCharPref("general.useragent");
          prefExists = true;
        } catch(e) {
          prefExists = false;
        }

        prefs.setCharPref("general.useragent", navigator.userAgent);

        if (!prefExists) {
          // Preferences Service would freak out, load it again
          MafPreferences.load();
        }

        MafPostSetup.complete();

        var MafArchivePostProcessor = Components.classes["@mozilla.org/maf/archive-postprocessor-service;1"]
                                          .createInstance(Components.interfaces.nsIObserver);
        MafBlockingObserver.addObserver(MafArchivePostProcessor, "maf-open-archive-complete", false);
      }
    } else {
      if (event.originalTarget == "[object HTMLDocument]") {
        // New tab

        var doc = event.originalTarget;
        Maf._makeLocalLinksAbsolute(doc, doc.location.href, "index_files");
        Maf._makeLocalLinksAbsolute(doc, MafState.getOriginalURL(doc.location.href), "");

        if (MafPreferences.urlRewrite) {
          // Get the original url
          var originalURL = event.originalTarget.location.href;

          // Remove the hash if any
          if (originalURL.indexOf("#") > 0) {
            originalURL = originalURL.substring(0, originalURL.indexOf("#"));
          }

          // If the url is an archive url
          if (MafState.isArchiveURL(originalURL)) {

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
    }
  },

  onWindowClose: function(event) {
    // Check to see it's the last open window
    var numberOfOpenWindows = MafUtils.getNumberOfOpenWindows();

    // If it's the last window
    if (numberOfOpenWindows < 2) {

      if (MafPreferences.clearTempOnClose) {
        // Remove everything in the temp directory
        try {
          var oDir = Components.classes["@mozilla.org/file/local;1"]
                        .createInstance(Components.interfaces.nsILocalFile);
          oDir.initWithPath(MafPreferences.temp);

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
      var MafDocumentViewer =  Components.classes["@mozilla.org/content-viewer-factory/view;1?type=application/maf"]
                                  .getService(Components.interfaces.nsIMafDocumentViewerFactory);
      MafDocumentViewer.init(Maf);
    }
  },

  onPopupShown: function(event) {
    if (event.target.id != "contentAreaContextMenu") return;

    gContextMenu.showItem("maf-save-in-archive-menuitem",
                         !( gContextMenu.inDirList || gContextMenu.isTextSelected || gContextMenu.onTextInput ||
                            gContextMenu.onLink || gContextMenu.onImage ));
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsIMaf) &&
        !iid.equals(Components.interfaces.nsIMafProgressUpdater) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};


var MafPostSetup = {

  progid: "{7f57cf46-4467-4c2d-adfa-0cba7c507e54}",

  postsetupversion: "0.3.0", // 0.4.1 Doesn't have new scripts, so leave this

  _getSaveFilters: function() {
    var filterresult = new Array();
    var prefsSaveFilterLength = MafPreferences.getSaveFiltersLength();

    for (var i=0; i<prefsSaveFilterLength; i++) {

      var count = {};
      var result = {};
      MafPreferences.getSaveFilterAt(i, count, result);

      if (count.value == 3) {
        filterresult[filterresult.length] = result.value[1].substring(2, result.value[1].length);
      }
    }

    return filterresult;
  },

  setupMafContentType: function() {
    try {
      // Add the content type to the category manager
      // so that when it is encountered the viewer factory
      // will be invoked.
      var catMan = Components.classes["@mozilla.org/categorymanager;1"]
                      .getService(Components.interfaces.nsICategoryManager);
      var result  = catMan.addCategoryEntry("Gecko-Content-Viewers", "application/maf",
                      "@mozilla.org/content-viewer-factory/view;1?type=application/maf", true, true);

      const mimeTypes = "UMimTyp";
      var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties);

      var file = fileLocator.get(mimeTypes, Components.interfaces.nsIFile);

      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
      var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
      var gDS = gRDF.GetDataSourceBlocking(fileHandler.getURLSpecFromFile(file));

      var mime = "application/maf";

      var handler = new HandlerOverride(MIME_URI(mime), gDS);

      handler.mUpdateMode = false;

      handler.mimeType = mime;
      handler.description = "Mozilla Archive Format";

      var handledExtensions = this._getSaveFilters();
      handler.addExtension("maf"); // Legacy maf support
      for (var i=0; i<handledExtensions.length; i++) {
         handler.addExtension(handledExtensions[i]);
      }
      handler.isEditable = true;
      handler.saveToDisk = false;
      handler.handleInternal = false;
      handler.alwaysAsk = true;
      handler.appDisplayName = "MAF";

      handler.buildLinks();

      gDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource).Flush();
    } catch(e) {
      mafdebug(e);
    }
  },

  complete: function() {
    this.setupMafContentType();

    // Get preference maf.postsetup.complete
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefService).getBranch("maf.");

    try {
      var setupComplete = prefs.getBoolPref("postsetup." + this.postsetupversion + ".complete");
    } catch(e) { setupComplete = false; }

    if (!setupComplete) {
      // Make temp directory
      this.makeTempDirectory();
      // Copy files
      this.copyFiles();
      // Update script contents
      this.updateScriptContents();

      // Set preference maf.postsetup.complete
      prefs.setBoolPref("postsetup." + this.postsetupversion + ".complete", true);
    }
  },

  /**
   * Create the MAF temporary directory structure.
   */
  makeTempDirectory: function() {
    try {
      var profileDir = this._getProfileDir();
      // If not on windows
      if (navigator.userAgent.indexOf("Windows") == -1) {
        // Make directory {profileDir}/maf/
        MafUtils.createDir(profileDir + "/maf");
        // Make directory {profileDir}/maf/maftemp
        MafUtils.createDir(profileDir + "/maf/maftemp");
      } else {
        // Make directory {profileDir}\\maf
        MafUtils.createDir(profileDir + "\\maf");
        // Make directory c:\temp\maf\maftemp
        MafUtils.createDir(profileDir + "\\maf\\maftemp");
      }
    } catch(e) { mafdebug(e); }
  },

  /**
   * @returns A string representing the location of the user's profile directory
   */
  _getProfileDir: function() {
    try {
      var result = Components.classes["@mozilla.org/file/directory_service;1"]
                      .getService(Components.interfaces.nsIProperties)
                      .get("ProfD", Components.interfaces.nsIFile).path;
    } catch (e) {
      result = "";
    }
    return result;
  },

  /**
   * @returns an array of files in a directory
   */
  _getFilesList: function(sourcepath) {
    var result = new Array();

    var oDir = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsILocalFile);
    oDir.initWithPath(sourcepath);

    if (oDir.exists() && oDir.isDirectory()) {
      var entries = oDir.directoryEntries;

      while (entries.hasMoreElements()) {
        var currFile = entries.getNext();
        currFile.QueryInterface(Components.interfaces.nsILocalFile);

        result[result.length] = currFile.leafName;
      }
    }
    return result;
  },

  /**
   * Copy an individual file
   */
  _copyFile: function(source, dest) {
    try {
      // Make sure source exists and dest doesn't
      if (MafUtils.checkFileExists(source) && !MafUtils.checkFileExists(dest)) {
        MafUtils.copyBinaryFile(source, dest);
      }
    } catch(e) { mafdebug(e); }
  },

  /**
   * Copy a set of files from the extensions, scripts directory
   * Only copy if FF 0.9 or higher
   */
  copyFiles: function() {
    var profileDir = this._getProfileDir();
    var sourceDir = profileDir;

    // If firefox 0.9 or higher
    var isFF09OrHigher = false;
    if ((navigator.vendor != null) && (navigator.vendorSub != null)) {
      if (navigator.vendor.toLowerCase() == "firefox") {
        isFF09OrHigher = (parseFloat(navigator.vendorSub.substring(navigator.vendorSub.indexOf(".") + 1, navigator.vendorSub.length)) >= 9);
      }
    }

    if (isFF09OrHigher) {
      sourceDir = MafUtils.appendToDir(sourceDir, "extensions");
      sourceDir = MafUtils.appendToDir(sourceDir, this.progid);
      sourceDir = MafUtils.appendToDir(sourceDir, "scripts");

      var destDir;

      // If not on windows
      if (navigator.userAgent.indexOf("Windows") == -1) {
        destDir = profileDir + "/maf";
      } else {
        destDir = profileDir + "\\maf";
      }

      var filesList = this._getFilesList(sourceDir);
      for (var i=0; i<filesList.length; i++) {
        this._copyFile(MafUtils.appendToDir(sourceDir, filesList[i]), MafUtils.appendToDir(destDir, filesList[i]));
      }
    }

  },

  /**
   * Update the scripts to use the new directory
   */
  updateScriptContents: function() {
    var profileDir = this._getProfileDir();

    // If not on windows
    if (navigator.userAgent.indexOf("Windows") == -1) {
      if (MafUtils.checkFileExists(profileDir + "/maf/mafzip.sh")) {
        var mafzipStr = MafUtils.readFile(profileDir + "/maf/mafzip.sh");
        mafzipStr = mafzipStr.replaceAll("%%PROFILEDIR%%", profileDir);
        MafUtils.deleteFile(profileDir + "/maf/mafzip.sh");
        MafUtils.createExecutableFile(profileDir + "/maf/mafzip.sh", mafzipStr);
      }

      if (MafUtils.checkFileExists(profileDir + "/maf/mafunzip.sh")) {
        var mafunzipStr = MafUtils.readFile(profileDir + "/maf/mafunzip.sh");
        mafunzipStr = mafunzipStr.replaceAll("%%PROFILEDIR%%", profileDir);
        MafUtils.deleteFile(profileDir + "/maf/mafunzip.sh");
        MafUtils.createExecutableFile(profileDir + "/maf/mafunzip.sh", mafunzipStr);
      }

    } else {

      if (MafUtils.checkFileExists(profileDir + "\\maf\\mafzip.bat")) {
        var mafzipStr = MafUtils.readFile(profileDir + "\\maf\\mafzip.bat");
        mafzipStr = mafzipStr.replaceAll("%%PROFILEDIR%%", profileDir);
        MafUtils.deleteFile(profileDir + "\\maf\\mafzip.bat");
        MafUtils.createExecutableFile(profileDir + "\\maf\\mafzip.bat", mafzipStr);
      }

      if (MafUtils.checkFileExists(profileDir + "\\maf\\mafunzip.bat")) {
        var mafunzipStr = MafUtils.readFile(profileDir + "\\maf\\mafunzip.bat");
        mafunzipStr = mafunzipStr.replaceAll("%%PROFILEDIR%%", profileDir);
        MafUtils.deleteFile(profileDir + "\\maf\\mafunzip.bat");
        MafUtils.createExecutableFile(profileDir + "\\maf\\mafunzip.bat", mafunzipStr);
      }

    }
  }
}


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

function mafdebug(text) {
  var csClass = Components.classes['@mozilla.org/consoleservice;1'];
  var cs = csClass.getService(Components.interfaces.nsIConsoleService);
  cs.logStringMessage(text);
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


////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
//////////////  Redefine global functions - 'cuz it's open source and fun!!!  //////////////
////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////


function getMafOpenFilters() {
  var filterresult = new Array();
  var prefsOpenFilterLength = MafPreferences.getOpenFiltersLength();

  for (var i=0; i<prefsOpenFilterLength; i++) {

    var count = {};
    var result = {};
    MafPreferences.getOpenFilterAt(i, count, result);

    if (count.value == 3) {
      var entry = [result.value[0], result.value[1], parseInt(result.value[2])];

      filterresult[filterresult.length] = entry;
    }
  }
  return filterresult;
};

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

    try {
      var filters = getMafOpenFilters();
      for (var i=0; i<filters.length; i++) {
        var title = filters[i][0];
        var mask = filters[i][1];
        fp.appendFilter(title, mask);
      }
    } catch(e) { }

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


////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////  Copied from helperApps.js  ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Datasource initialization
 **/
var gRDF = Components.classes["@mozilla.org/rdf/rdf-service;1"]
            .getService(Components.interfaces.nsIRDFService);

///////////////////////////////////////////////////////////////////////////////
// MIME Types DataSource Wrapper

function NC_URI(aProperty)
{
  return "http://home.netscape.com/NC-rdf#" + aProperty;
}

function MIME_URI(aType)
{
  return "urn:mimetype:" + aType;
}

function HANDLER_URI(aHandler)
{
  return "urn:mimetype:handler:" + aHandler;
}

function APP_URI(aType)
{
  return "urn:mimetype:externalApplication:" + aType;
}


/**
 * Handler Override class
 **/
function HandlerOverride(aURI, aDatasource)
{
  this.URI = aURI;
  this._DS = aDatasource;
}

HandlerOverride.prototype = {
  // general information
  get mimeType()
  {
    return this.getLiteralForContentType(this.URI, "value");
  },

  set mimeType(aMIMETypeString)
  {
    this.changeMIMEStuff(MIME_URI(aMIMETypeString), "value", aMIMETypeString.toLowerCase());
    return aMIMETypeString;
  },

  get description()
  {
    return this.getLiteralForContentType(this.URI, "description");
  },

  set description(aDescriptionString)
  {
    this.changeMIMEStuff(MIME_URI(this.mimeType), "description", aDescriptionString);
    return aDescriptionString;
  },

  get isEditable()
  {
    return this.getLiteralForContentType(this.URI, "editable");
  },

  set isEditable(aIsEditableString)
  {
    this.changeMIMEStuff(MIME_URI(this.mimeType), "editable", aIsEditableString);
    return aIsEditableString;
  },

  get extensions()
  {
    var extensionResource = gRDF.GetUnicodeResource(NC_URI("fileExtensions"));
    var contentTypeResource = gRDF.GetUnicodeResource(MIME_URI(this.mimeType));
    var extensionTargets = this._DS.GetTargets(contentTypeResource, extensionResource, true);
    var extString = "";
    if (extensionTargets) {
      while (extensionTargets.hasMoreElements()) {
        var currentExtension = extensionTargets.getNext();
        if (currentExtension) {
          currentExtension = currentExtension.QueryInterface(Components.interfaces.nsIRDFLiteral);
          if (extString != "") {
            extString += " ";
          }
          extString += currentExtension.Value.toLowerCase();
        }
      }
    }
    return extString;
  },

  addExtension: function (aExtensionString)
  {
    this.assertMIMEStuff(MIME_URI(this.mimeType), "fileExtensions", aExtensionString.toLowerCase());
  },

  removeExtension: function (aExtensionString)
  {
    this.unassertMIMEStuff(MIME_URI(this.mimeType), "fileExtensions", aExtensionString.toLowerCase());
  },

  clearExtensions: function ()
  {
    var extArray = this.extensions.split(" ");
    for (i = extArray.length - 1; i >= 0; --i) {
      this.removeExtension(extArray[i]);
    }
  },

  // content handling
  get saveToDisk()
  {
    return this.getHandlerInfoForType(this.URI, "saveToDisk");
  },

  set saveToDisk(aSavedToDisk)
  {
    this.changeMIMEStuff(HANDLER_URI(this.mimeType), "saveToDisk", aSavedToDisk);
    this.setHandlerProcedure("handleInternal", "false");
    this.setHandlerProcedure("useSystemDefault", "false");
    return aSavedToDisk;
 },

  get useSystemDefault()
  {
    return this.getHandlerInfoForType(this.URI, "useSystemDefault");
  },

  set useSystemDefault(aUseSystemDefault)
  {
    this.changeMIMEStuff(HANDLER_URI(this.mimeType), "useSystemDefault", aUseSystemDefault);
    this.setHandlerProcedure("handleInternal", "false");
    this.setHandlerProcedure("saveToDisk", "false");
    return aUseSystemDefault;
  },

  get handleInternal()
  {
    return this.getHandlerInfoForType(this.URI, "handleInternal");
  },

  set handleInternal(aHandledInternally)
  {
    this.changeMIMEStuff(HANDLER_URI(this.mimeType), "handleInternal", aHandledInternally);
    this.setHandlerProcedure("saveToDisk", "false");
    this.setHandlerProcedure("useSystemDefault", "false");
    return aHandledInternally;
  },

  setHandlerProcedure: function (aHandlerProcedure, aValue)
  {
    var handlerSource = gRDF.GetUnicodeResource(HANDLER_URI(this.mimeType));
    var handlerProperty = gRDF.GetUnicodeResource(NC_URI(aHandlerProcedure));
    var oppositeValue = aValue == "false" ? "true" : "false";
    var trueLiteral = gRDF.GetLiteral(oppositeValue);
    var hasCounterpart = this._DS.HasAssertion(handlerSource, handlerProperty, trueLiteral, true);
    if (hasCounterpart) {
      var falseLiteral = gRDF.GetLiteral(aValue);
      this._DS.Change(handlerSource, handlerProperty, trueLiteral, falseLiteral);
    }
  },

  get alwaysAsk()
  {
    return this.getHandlerInfoForType(this.URI, "alwaysAsk");
  },

  set alwaysAsk(aAlwaysAsk)
  {
    this.changeMIMEStuff(HANDLER_URI(this.mimeType), "alwaysAsk", aAlwaysAsk);
    return aAlwaysAsk;
  },

  // helper application
  get appDisplayName()
  {
    return getHelperAppInfoForType(this.URI, "prettyName");
  },

  set appDisplayName(aDisplayName)
  {
    this.changeMIMEStuff(APP_URI(this.mimeType), "prettyName", aDisplayName);
    return aDisplayName;
  },

  get appPath()
  {
    return this.getHelperAppInfoForType(this.URI, "path");
  },

  set appPath(aAppPath)
  {
    this.changeMIMEStuff(APP_URI(this.mimeType), "path", aAppPath);
    return aAppPath;
  },

  /**
   * After setting the various properties on this override, we need to
   * build the links between the mime type resource, the handler for that
   * resource, and the helper app (if any) associated with the resource.
   * We also need to add this mime type to the RDF seq (list) of types.
   **/
  buildLinks: function()
  {
    // assert the handler resource
    var mimeSource = gRDF.GetUnicodeResource(MIME_URI(this.mimeType));
    var handlerProperty = gRDF.GetUnicodeResource(NC_URI("handlerProp"));
    var handlerResource = gRDF.GetUnicodeResource(HANDLER_URI(this.mimeType));
    this._DS.Assert(mimeSource, handlerProperty, handlerResource, true);
    // assert the helper app resource
    var helperAppProperty = gRDF.GetUnicodeResource(NC_URI("externalApplication"));
    var helperAppResource = gRDF.GetUnicodeResource(APP_URI(this.mimeType));
    this._DS.Assert(handlerResource, helperAppProperty, helperAppResource, true);
    // add the mime type to the MIME types seq
    var container = Components.classes["@mozilla.org/rdf/container;1"].createInstance();
    if (container) {
      container = container.QueryInterface(Components.interfaces.nsIRDFContainer);
      if (container) {
        var containerRes = gRDF.GetUnicodeResource("urn:mimetypes:root");
        container.Init(this._DS, containerRes);
        var element = gRDF.GetUnicodeResource(MIME_URI(this.mimeType));
        if (container.IndexOf(element) == -1)
          container.AppendElement(element);
      }
    }
  },

  // Implementation helper methods

  getLiteralForContentType: function (aURI, aProperty)
  {
    var contentTypeResource = gRDF.GetUnicodeResource(aURI);
    var propertyResource = gRDF.GetUnicodeResource(NC_URI(aProperty));
    return this.getLiteral(contentTypeResource, propertyResource);
  },

  getLiteral: function (aSource, aProperty)
  {
    var node = this._DS.GetTarget(aSource, aProperty, true);
    if (node) {
      node = node.QueryInterface(Components.interfaces.nsIRDFLiteral);
      return node.Value;
    }
    return "";
  },

  getHandlerInfoForType: function (aURI, aPropertyString)
  {
    // get current selected type
    var handler = HANDLER_URI(this.getLiteralForContentType(aURI, "value"));
    var source = gRDF.GetUnicodeResource(handler);
    var property = gRDF.GetUnicodeResource(NC_URI(aPropertyString));
    var target = this._DS.GetTarget(source, property, true);
    if (target) {
      target = target.QueryInterface(Components.interfaces.nsIRDFLiteral);
      return target.Value;
    }
    return "";
  },

  getHelperAppInfoForType: function (aURI, aPropertyString)
  {
    var appURI      = APP_URI(this.getLiteralForContentType(aURI, "value"));
    var appRes      = gRDF.GetUnicodeResource(appURI);
    var appProperty = gRDF.GetUnicodeResource(NC_URI(aPropertyString));
    return getLiteral(appRes, appProperty);
  },

  // write to the ds
  assertMIMEStuff: function (aMIMEString, aPropertyString, aValueString)
  {
    var mimeSource = gRDF.GetUnicodeResource(aMIMEString);
    var valueProperty = gRDF.GetUnicodeResource(NC_URI(aPropertyString));
    var mimeLiteral = gRDF.GetLiteral(aValueString);
    this._DS.Assert(mimeSource, valueProperty, mimeLiteral, true);
  },

  changeMIMEStuff: function(aMIMEString, aPropertyString, aValueString)
  {
    var mimeSource = gRDF.GetUnicodeResource(aMIMEString);
    var valueProperty = gRDF.GetUnicodeResource(NC_URI(aPropertyString));
    var mimeLiteral = gRDF.GetLiteral(aValueString);
    var currentValue = this._DS.GetTarget(mimeSource, valueProperty, true);
    if (currentValue) {
      this._DS.Change(mimeSource, valueProperty, currentValue, mimeLiteral);
    } else {
      this._DS.Assert(mimeSource, valueProperty, mimeLiteral, true);
    }
  },

  unassertMIMEStuff: function(aMIMEString, aPropertyString, aValueString)
  {
    var mimeSource = gRDF.GetUnicodeResource(aMIMEString);
    var valueProperty = gRDF.GetUnicodeResource(NC_URI(aPropertyString));
    var mimeLiteral = gRDF.GetLiteral(aValueString);
    this._DS.Unassert(mimeSource, valueProperty, mimeLiteral, true);
  }
};


