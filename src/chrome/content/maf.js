/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.7.1-unofficial
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 * Unofficial release by: Paolo Amadini
 *
 *  Copyright (c) 2005 Christopher Ottley.
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
/**
 *
 * Changes from 0.7.0-unofficial to 0.7.1-unofficial
 *
 * Multi-platform compatibility: Replaced binary zip writer component.
 *
 *
 * Changes from 0.6.3 to 0.7.0-unofficial
 *
 * Firefox 3 compatibility: Replaced the "contents.rdf" files with "chrome.manifest".
 * Firefox 3 compatibility: Updated "install.rdf" and removed "install.js".
 * Firefox 3 compatibility: Added private nsIDictionary implementation.
 * Firefox 3 compatibility: Updated code using the now changed nsIZipReader interface.
 * Changed layout of ZipWriterComponent libraries for cross-platform compatibility.
 * Updated "postsetup" version to force the setup steps, even if it might not be needed.
 *
 *
 * Changes from 0.6.2 to 0.6.3
 *
 * Added post setup copy of msvcr71.dll for Firefox on Wine and older Windows OS (95,98,Me)
 * Mime registration change to hopefully fix bug 11117.
 * Added Slovenian locale by Martin Srebotnjak.
 * Updated MHT Base64 encoding and decoding routines to use DOM window's atob and btoa functions
 * 
 *
 * Changes from 0.6.1 to 0.6.2
 *
 * Fixed save multiple tabs functionality.
 * Fixed save selected tabs functionality.
 * Fixed death of save as dialog in non alpha versions of Firefox.
 *
 *
 * Changes from 0.6.0 to 0.6.1
 *
 * Fixed heap pointer crashing problem in zip writer component (I hope).
 * Fixed Save As MAF integration code to be Deer Park 2 compatible.
 * Changed archiving result error code value from -1 to 1 to enable proper code test.
 * Fixed memory allocation error causing the zip writer component not to be instantiable on Linux.
 * Added script check for vbs file copy under deer park alpha 2.
 *
 *
 * Changes from 0.5.1 to 0.6.0
 *
 * Added xpcom zip writer component.
 * Extract now uses zip reader component.
 * Removed zip and unzip executables and related scripts (.bat and .sh).
 * Added Mozilla 1.8 compatible tree column selector for browse open archives.
 * Made the maf protocol a bit more forgiving of bad uris.
 * Removed some preference GUI elements (specifying script locations mafzip, mafunzip and invis.vbs).
 * Removed second zip maf extension and changed remaining extension mask to *.maff.zip.
 *
 *
 * Changes from 0.5.0 to 0.5.1
 *
 * Added Danish locale by Molle Bestefich.
 * Fixed bug 7913 - Modified batch files should work correctly with Win95/98/ME.
 * Fixed bug that incorrectly resolved supporting files folder relative URLs when using localized browsers.
 * Added non-functional context menu for browse open archives dialog.
 * Changed the MAF content type from application/maf to application/x-maf.
 * Added ability to copy displayed meta-data from browse open archives dialog.
 * Fixed bug 9303 - Removed .bin extension from being appended for unknown file types.
 * Fixed bug 9630 - Non latin character set filenames in "Save Page As..." dialog now show up in unicode.
 * Fixed bug 9629 - Relative content locations misses resources when MAF file optimization is on.
 * Changed native download code so shouldn't have to work offline to a save some pages.
 * Reverted bug fix 9630 and now only latin character set filenames appear in the dialog by default.
 * Added German locale by Ralph Ulrich.
 * Added Save Tabs in Archive context menu entry.
 * Added select all and clear selection buttons to Save Tabs in Archive dialog.
 *
 *
 * Changes from 0.4.3 to 0.5.0
 *
 * Disabling document write also disables document.writeln.
 * Changed the default wscript directory preference from winnt to windows.
 * Fixed bug that ignored content location when selecting root nodes for MHT decoding.
 * Updated Italian locale contributed by Gioxx Solone: eXtenZilla.it.
 * When MHT decoding, the index content type will now be assumed to be html, not bin by default.
 * Moved the save page in archive entries to the Mozilla Archive Format menu.
 * Integrated Save page as MAFF archive into default save dialog for Firefox 1.0 and Mozilla 1.7.3.
 * Fixed bug that ignored processing parts of MHT framed pages if their content type wasn't text/html.
 * Removed preference for windows .maf association to avoid any potential problems with MS Access.
 * Added code to remove 3 byte utf start characters from MHT parts so Mozilla decodes properly.
 * Modified vbs hide functionality to revert to using command window if wscript or the invis.vbs is not found.
 * Added preference to use alternative DOM save component.
 * Preference for using wscript and invis.vbs is now true by default.
 * Added alternative DOM save component based on the Scrapbook extension by Gomita.
 * Added script failure notification code from process exit value.
 * Modified invis.vbs to return process exit value contributed by Allister.
 * Added advanced panel in preferences window.
 * Fixed bug in MAF protocol handler that broke silent opening of MAF archives.
 * Fixed bug in MafState.isArchiveURL(originalURL) that didn't return true for framed archive documents.
 * Added unicode to native locale conversion function for program arguments.
 * Added decoder optimization for MHT MAF files.
 * Added native quoted-printable encoder and decoder support.
 * Added Portuguese locale by Jacinto Leal.
 * Added update.rdf related entries for extension manager updates.
 * Added network url functionality for .maff files.
 * Added preferences entries that have the major, minor and minor minor version of MAF installed.
 * Fixed bug 8897 - Title in browse archive dialog now displays unicode characters.
 * Added additional properties entries for localization of some error messages.
 * Fixed unicode document title conversion bug in getDefaultFileName - Died if title was already unicode.
 *
 *
 * Changes from 0.4.2 to 0.4.3
 *
 * Added save selected tabs functionality.
 * Fixed bug that reset save archive type index when save dialog box was cancelled.
 * Fixed bug that stopped tab saving if an event handler couldn't be removed.
 * Fixed bug that resolved relative links to the wrong base url if the page had a base url tag.
 * Added Russian locale contributed by the ArtLonger: Mozilla.ru team.
 * Added Polish locale contributed by Bartosz Piec: Mozillapl.org team.
 * Updated Post Install code to work with FF RC1
 * Added preference to disable the window alert when a single page has been saved.
 * Updated Post Install code to update new vbs scripts for windows filetype associations.
 * Fixed bug that stopped URL rewriting if there was an error accessing a DOM Attribute Node value.
 * Fixed bug that caused MHT decoding to fail if the root part was of type multipart/alternative.
 * Added functionality to execute filetype VBS when preferences are saved.
 *
 *
 * Changes from 0.4.1 to 0.4.2
 *
 * Added missing invis.vbs file to installation.
 *
 *
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

var MafPreferences = GetMafPreferencesServiceClass();

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

var MafBlockingObserver = GetMafObserverServiceClass();

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
  archiveDownload: function(program, archivefile, sourcepath) {
    if (program == MafLibMHTEncoder.PROGID) {

      var temppath = MafPreferences.temp;

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
        sourcepathobj.initWithPath(MafUtils.appendToDir(MafPreferences.temp, sourcepath));        
  
        zipwriterobj.open(archivefileobj, PR_RDWR | PR_CREATE_FILE); // No PR_TRUNCATE for now
                  
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
   * Convert unicode arguments to native charset
   * Contributed by: glassprogrammer
   * Bug ref#: 7995
   */
  _arguments2Native: function (args){
    try {
    //Check current locale
      var oLocaleSrv = Components.classes["@mozilla.org/intl/nslocaleservice;1"]
                         .createInstance(Components.interfaces.nsILocaleService);
      var sLocale = oLocaleSrv.getLocaleComponentForUserAgent();

      //Get the correct charset
      var sCharset = null;
      switch (sLocale) {
        case "cs-CZ":
        case "hr-HR":
        case "hu-HU":
        case "lt-LT":
        case "lv-LV":
        case "pl-PL":
        case "ro-RO":
        case "sk-SK":
        case "sl-SI":
        case "sq-AL":
                      sCharset = "ISO-8859-2";
                      break;

        case "be-BY":
        case "bg-BG":
        case "mk-MK":
        case "ru-RU":
        case "sh-YU":
        case "sr-YU":
        case "uk-UA":
                      sCharset = "ISO-8859-5";
                      break;

        case "ar-SA":
                      sCharset = "ISO-8859-6";
                      break;


        case "el-GR":
                      sCharset = "ISO-8859-7";
                      break;

        case "iw-IL":
                      sCharset = "ISO-8859-8";
                      break;

        case "tr-TR":
                      sCharset = "ISO-8859-9";
                      break;

        case "ja-JP":
                      sCharset = "Shift_JIS";
                      break;
        case "ko-KR":
                      sCharset = "EUC-KR";
                      break;
        case "zh-CN":
                      sCharset = "GBK";
                      break;
        case "zh-TW":
                      sCharset = "BIG5";
                      break;

        default: sCharset = null; // "ISO-8859-1"
                  break;
      }

      //Convert
      if (sCharset != null) {
        var oConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                           .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

        oConverter.charset = sCharset;
        for(var i = 0; i < args.length; i++) {
          args[i] = oConverter.ConvertFromUnicode(args[i]);
        }
      }
    } catch (e) {
      mafdebug(MafStrBundle.GetStringFromName("errorconvertingunicodetonative") + e);
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
    objMafArchiver.start();
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
        if (MafPreferences.alertOnArchiveComplete) {
          browserWindow.alert(MafStrBundle.GetStringFromName("archiveoperationcomplete"));
        } else {
          browserWindow.status = MafStrBundle.GetStringFromName("archiveoperationcomplete");
        }
      } else {
        if (MafPreferences.alertOnArchiveComplete) {
          browserWindow.alert(MafStrBundle.GetStringFromName("archiveoperationfailed") + code);
        } else {
          browserWindow.status = MafStrBundle.GetStringFromName("archiveoperationfailed") + code;
        }
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
  openFromArchive: function(tempPath, scriptPath, archivePath) {
    var dateTimeExpanded = new Date();

    var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random()*1000);

    var objMafTabExpander = new MafTabExpanderClass();

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

        var MafArchivePostProcessor = new MafArchivePostProcessorClass();
        MafBlockingObserver.addObserver(MafArchivePostProcessor, "maf-open-archive-complete", false);
      }
    } else {
      if (event.originalTarget == "[object HTMLDocument]") {
        // New tab

        // Get the original url
        var originalURL = event.originalTarget.location.href;

        // Remove the hash if any
        if (originalURL.indexOf("#") > 0) {
          originalURL = originalURL.substring(0, originalURL.indexOf("#"));
        }

        if ((MafPreferences.urlRewrite) && (MafState.isArchiveURL(originalURL))) {
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
      var MafDocumentViewer = Components.classes["@mozilla.org/content-viewer-factory/view;1?type=application/x-maf"]
                                .getService(Components.interfaces.nsIMafDocumentViewerFactory);
      MafDocumentViewer.init(Maf);
    }
  },

  onPopupShown: function(event) {
    if (event.target.id != "contentAreaContextMenu") return;

    gContextMenu.showItem("maf-save-in-archive-menuitem",
                         !( gContextMenu.inDirList || gContextMenu.isTextSelected || gContextMenu.onTextInput ||
                            gContextMenu.onLink || gContextMenu.onImage ));
  }

};


var MafPostSetup = {

  progid: "{7f57cf46-4467-4c2d-adfa-0cba7c507e54}",

  postsetupversion: "0.7.0u",

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
      var result  = catMan.addCategoryEntry("Gecko-Content-Viewers", "application/x-maf",
                      "@mozilla.org/content-viewer-factory/view;1?type=application/x-maf", true, true);

      const mimeTypes = "UMimTyp";
      var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties);

      var file = fileLocator.get(mimeTypes, Components.interfaces.nsIFile);

      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
      var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
      var gDS = gRDF.GetDataSourceBlocking(fileHandler.getURLSpecFromFile(file));

      var mime = "application/x-maf";

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


    try {
      prefs.setIntPref("version.major", 0);
      prefs.setIntPref("version.minor", 6);
      prefs.setIntPref("version.minorminor", 3);
    } catch(e) { }

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
   * @returns A string representing the location of the browser executable on disk
   */
  _getMozillaInstance: function() {
    try {
      var result = Components.classes["@mozilla.org/file/directory_service;1"]
                      .getService(Components.interfaces.nsIProperties)
                      .get("CurProcD", Components.interfaces.nsIFile);

      if ((navigator.vendor != null) && (navigator.vendor.toLowerCase() == "firefox")) {
        // If not on windows
        if (navigator.userAgent.indexOf("Windows") == -1) {
          // Append firefox
          result.append("firefox");
        } else {
          // Append firefox.exe
          result.append("firefox.exe");
        }
      } else {
        // If not on windows
        if (navigator.userAgent.indexOf("Windows") == -1) {
          // Append mozilla
          result.append("mozilla");
        } else {
          // Append mozilla.exe
          result.append("mozilla.exe");
        }
      }

      result = result.path;

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
        isFF09OrHigher = (parseFloat(navigator.vendorSub.substring(navigator.vendorSub.indexOf(".") + 1,
                         navigator.vendorSub.length)) + (parseFloat(navigator.vendorSub.substring(0,
                         navigator.vendorSub.indexOf("."))) * 100) >= 9);
      }
    }
    
    // Deer park alpha 2
    if (!isFF09OrHigher) {
      // Alpha, Beta, RC1 release - No vendor or vendor sub
      if ((navigator.productSub.startsWith("2005")) && (navigator.userAgent.toLowerCase().indexOf("firefox") != -1)) {
        isFF09OrHigher = true;
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
    
    
    // If on windows
    if (navigator.userAgent.indexOf("Windows") != -1) {
      // Copy the lib files to the program folder if it doesn't exist
      var progDir = Components.classes["@mozilla.org/file/directory_service;1"]
                      .getService(Components.interfaces.nsIProperties)
                      .get("CurProcD", Components.interfaces.nsIFile).path;
                      
      var libSourceDir = profileDir;
      
      if (isFF09OrHigher) {
        libSourceDir = MafUtils.appendToDir(sourceDir, "extensions");
        libSourceDir = MafUtils.appendToDir(sourceDir, this.progid);
        libSourceDir = MafUtils.appendToDir(sourceDir, "libs");      
        
        var libFilesList = this._getFilesList(libSourceDir);
        for (var i=0; i<libFilesList.length; i++) {
          this._copyFile(MafUtils.appendToDir(libSourceDir, libFilesList[i]), MafUtils.appendToDir(progDir, libFilesList[i]));
        }        
      }
                      
    }
    
  },

  /**
   * Update the scripts to use the new directory
   */
  updateScriptContents: function() {
    var profileDir = this._getProfileDir();
    var mozillaInstance = this._getMozillaInstance();
    var profileDirDrive = profileDir.substring(0, 2);
    var profileDirNoDrive = profileDir.substring(2, profileDir.length);

    // If on windows
    if (navigator.userAgent.indexOf("Windows") != -1) {

      if (MafUtils.checkFileExists(profileDir + "\\maf\\setmafffiletype.vbs")) {
        var mafsetMaffStr = MafUtils.readFile(profileDir + "\\maf\\setmafffiletype.vbs");
        mafsetMaffStr = mafsetMaffStr.replaceAll("%%MOZILLA_EXE%%", mozillaInstance);
        MafUtils.deleteFile(profileDir + "\\maf\\setmafffiletype.vbs");
        MafUtils.createExecutableFile(profileDir + "\\maf\\setmafffiletype.vbs", mafsetMaffStr);
      }

      if (MafUtils.checkFileExists(profileDir + "\\maf\\setmhtfiletype.vbs")) {
        var mafsetMhtStr = MafUtils.readFile(profileDir + "\\maf\\setmhtfiletype.vbs");
        mafsetMhtStr = mafsetMhtStr.replaceAll("%%MOZILLA_EXE%%", mozillaInstance);
        MafUtils.deleteFile(profileDir + "\\maf\\setmhtfiletype.vbs");
        MafUtils.createExecutableFile(profileDir + "\\maf\\setmhtfiletype.vbs", mafsetMhtStr);
      }

      if (MafUtils.checkFileExists(profileDir + "\\maf\\unsetallfiletypes.vbs")) {
        var mafunsetAllStr = MafUtils.readFile(profileDir + "\\maf\\unsetallfiletypes.vbs");
        mafunsetAllStr = mafunsetAllStr.replaceAll("%%MOZILLA_EXE%%", mozillaInstance);
        MafUtils.deleteFile(profileDir + "\\maf\\unsetallfiletypes.vbs");
        MafUtils.createExecutableFile(profileDir + "\\maf\\unsetallfiletypes.vbs", mafunsetAllStr);
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
 * In order to modify Firefox / Mozilla without patching, the functions used must be
 * redefined. Mozilla may have unresolved dependent functions, so those must also be
 * included for Mozilla to work when using the Firefox functions as a base.
 */
function getMafSaveFilters() {
  var filterresult = new Array();
  var prefsSaveFilterLength = MafPreferences.getSaveFiltersLength();

  for (var i=0; i<prefsSaveFilterLength; i++) {

    var count = {};
    var result = {};
    MafPreferences.getSaveFilterAt(i, count, result);

    if (count.value == 3) {
      var entry = [result.value[0], result.value[1], parseInt(result.value[2])];

      filterresult[filterresult.length] = entry;
    }
  }
  return filterresult;
};

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
        var filters = getMafSaveFilters();
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
        var filters = getMafSaveFilters();
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

    var filters = getMafSaveFilters();

    var selectedFileType = filters[saveAsType][1];

    selectedFileType = selectedFileType.substring(1,selectedFileType.length);

    if (filename.substring(filename.length-selectedFileType.length, filename.length).toLowerCase() !=
        selectedFileType.toLowerCase()) {
      filename += selectedFileType;
    }

    Maf.saveAsWebPageComplete(window.getBrowser().selectedBrowser, MafPreferences.temp,
                              MafPreferences.programFromSaveIndex(saveAsType), filename);
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
  if ((saveAsType < 3) || (saveAsType > (2 + getMafSaveFilters().length))) {
  
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

    var filters = getMafSaveFilters();

    var selectedFileType = filters[saveAsType][1];

    selectedFileType = selectedFileType.substring(1,selectedFileType.length);

    if (filename.substring(filename.length-selectedFileType.length, filename.length).toLowerCase() !=
        selectedFileType.toLowerCase()) {
      filename += selectedFileType;
    }

    Maf.saveAsWebPageComplete(window.getBrowser().selectedBrowser, MafPreferences.temp,
                              MafPreferences.programFromSaveIndex(saveAsType), filename);
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

    // ** MAF Addition start
    try {
      var filters = getMafOpenFilters();
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


