/**
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
 * Utility functions. Some functionality may still be moved here to increase modularity.
 */
var MafUtils = {

  /**
   * Cross platform append
   */
  appendToDir: function(initialDirectory, subDirectory) {
    var result = initialDirectory;
    try {
      var dir = Components.classes[localFileContractID].getService(localFileIID);
      dir.initWithPath(initialDirectory);
      dir.append(subDirectory);
      result = dir.path;
    } catch(e) {

    }
    return result;
  },

  /**
   * Create directory
   */
  createDir: function(dirToCreate) {
    var dir = null;
    try {
      dir = Components.classes[localFileContractID].getService(localFileIID);
      dir.initWithPath(dirToCreate);

      // Make the directory!!!
      if (!dir.exists()) {
        dir.create(0x01, 0777);
      }
    } catch (e) {

    }
    return dir;
  },


  /**
   * Create file
   */
  createFile: function(fileToCreate, contents) {
    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(fileToCreate);
      if (!oFile.exists()) {
        oFile.create(0x00, 0644);
      }
    } catch (e) {
      alert(e);
    }

    try {
      var oTransport = Components.classes[fileOutputStreamContractID].createInstance(fileOutputStreamIID);
      oTransport.init( oFile, 0x04 | 0x08 | 0x10, 064, 0 );
      oTransport.write(contents, contents.length);
      oTransport.close();
    } catch (e) {
      alert(e);
    }
  },


  /**
   * Create binary file
   */
  createBinaryFile: function(fileToCreate, contents) {
    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(fileToCreate);
      if (!oFile.exists()) {
        oFile.create(0x00, 0644);
      }
    } catch (e) {
      alert(e);
    }

    try {
      var oTransport = Components.classes[fileOutputStreamContractID].createInstance(fileOutputStreamIID);
      oTransport.init( oFile, 0x04 | 0x08 | 0x10, 064, 0 );

      var obj_BinaryIO = Components.classes[binaryOutputStreamContractID].createInstance(binaryOutputStreamIID);
      obj_BinaryIO.setOutputStream(oTransport);

      obj_BinaryIO.writeByteArray(contents, contents.length);
      oTransport.close();
    } catch (e) {
      alert(e);
    }
  },


  /**
   * Delete file
   */
  deleteFile: function(fileToDelete) {
    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(fileToDelete);
      if (oFile.exists()) {
        oFile.remove(true);
      }
    } catch (e) {

    }
  },

  /**
   * Returns true if the file in the path exists
   */
  checkFileExists: function(filePathToCheck) {
    var oFile = Components.classes[localFileContractID].getService(localFileIID);
    oFile.initWithPath(filePathToCheck);
    return oFile.exists();
  },

  /**
   * Based on the suggested filename, new file names are created so as
   * not to overwite existing ones.
   * Code from contentUtils.js
   */
  getUniqueFilename: function(destDir, suggestedFilename) {
    var dir = null;
    try {
      dir = Components.classes[localFileContractID].getService(localFileIID);
      dir.initWithPath(destDir);
    } catch (e) {

    }

    var file;

    dir.append(suggestedFilename);
    file = dir;

    while (file.exists()) {
      var parts = /.+-(\d+)(\..*)?$/.exec(file.leafName);
      if (parts) {
        file.leafName = file.leafName.replace(/((\d+)\.)/,
                                              function (str, p1, part, s) {
                                                return (parseInt(part) + 1) + ".";
                                              });
      }
      else {
        file.leafName = file.leafName.replace(/\./, "-1$&");
      }
    }


    return file.leafName;

  },


  /**
   * Based on the suggested filename, new file names are created so as
   * not to overwite existing ones.
   * Code from contentUtils.js
   */
  getFullUniqueFilename: function(suggestedPathAndFilename) {
    var dir = null;
    try {
      dir = Components.classes[localFileContractID].getService(localFileIID);
      dir.initWithPath(suggestedPathAndFilename);
    } catch (e) {

    }

    var file;

    file = dir;

    while (file.exists()) {
      var parts = /.+-(\d+)(\..*)?$/.exec(file.leafName);
      if (parts) {
        file.leafName = file.leafName.replace(/((\d+)\.)/,
                                              function (str, p1, part, s) {
                                                return (parseInt(part) + 1) + ".";
                                              });
      }
      else {
        file.leafName = file.leafName.replace(/\./, "-1$&");
      }
    }


    return file.path;

  },


  /**
   * Read the contents of a file
   */
  readFile: function(str_Filename) {
    try {
      var obj_File = Components.classes[localFileContractID].createInstance(localFileIID);
      obj_File.initWithPath(str_Filename);

      var obj_InputStream = Components.classes[fileInputStreamContractID].createInstance(fileInputStreamIID);
      obj_InputStream.init(obj_File, 0x01, 0444, null);

      var obj_ScriptableIO = Components.classes[scriptableInputStreamContractID].createInstance(scriptableInputStreamIID);
      obj_ScriptableIO.init(obj_InputStream);
    } catch (e) {
      alert(e);
    }

    try {
      var str = obj_ScriptableIO.read(obj_File.fileSize);
    } catch (e) {

    }
    obj_ScriptableIO.close();
    obj_InputStream.close();

    return str;
  },


  /**
   * Read the contents of a file as bytes
   */
  readBinaryFile: function(str_Filename) {
    try {
      var obj_File = Components.classes[localFileContractID].createInstance(localFileIID);
      obj_File.initWithPath(str_Filename);

      var obj_InputStream = Components.classes[fileInputStreamContractID].createInstance(fileInputStreamIID);
      obj_InputStream.init(obj_File, 0x01, 0444, null);

      var obj_BinaryIO = Components.classes[binaryInputStreamContractID].createInstance(binaryInputStreamIID);

      obj_BinaryIO.setInputStream(obj_InputStream);
    } catch (e) {
      alert(e);
    }

    try {
      //var str = obj_BinaryIO.readBytes(obj_File.fileSize);

      var str = obj_BinaryIO.readByteArray(obj_File.fileSize);

    } catch (e) {
      alert(e);
    }
    obj_BinaryIO.close();
    obj_InputStream.close();

    return str;
  },

  /**
   * Create RDF file based on template.
   */
  createRDF: function(path, filename) {
    var dir = Components.classes[localFileContractID].getService(localFileIID);
    dir.initWithPath(path);
    dir.append(filename);

    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(dir.path);
      if (!oFile.exists()) {
        oFile.create(0x00, 0644);
      }
    } catch (e) {
      alert(e);
    }

    try {
      var oTransport = Components.classes[fileOutputStreamContractID].createInstance(fileOutputStreamIID);
      oTransport.init( oFile, 0x04 | 0x08 | 0x10, 064, 0 );
      oTransport.write(MAFRDFTemplate, MAFRDFTemplate.length);
      oTransport.close();
    } catch (e) {
      alert(e);
    }

    // Load a remote data source
    var datasource = Components.classes[xmlRDFDatasourceContractID].createInstance(xmlRDFDatasourceIID);
    datasource.Init(MafUtils.getURI(oFile.nsIFile));
    datasource.Refresh(true);

    return datasource;
  },

  /**
   * Get the URL of the local file specified.
   */
  getURI: function(nsIFile) {
    var serv = Components.classes[ioServiceNetworkContractID].getService(ioServiceNetworkIID);
    var uri = serv.newFileURI(nsIFile);
    return uri.spec;
  },

  /**
   * Get URL from only a filename
   */
  getURIFromFilename: function(filename) {
    var oFile = Components.classes[localFileContractID].getService(localFileIID);
    oFile.initWithPath(filename);
    return this.getURI(oFile.nsIFile);
  },

  /**
   * Add string data to the data source.
   */
  addStringData: function(datasource, name, value) {
    var rootSubject = gRDFService.GetResource("urn:root");
    var predicate = gRDFService.GetResource(MAFNamespace + name);
    var object = gRDFService.GetResource(value);

    // Make sure we have an interface that we can assert to
    modDataSource = datasource.QueryInterface(rdfDatasourceIID);

    modDataSource.Assert(rootSubject,predicate,object,true);
  },

  /**
   * Shows the dialog to the user when saving tabs.
   */
  showDownloadTabsDLG: function(objMafArchiver) {
    const url = "chrome://maf/content/mafSaveTabsDLG.xul";

    var w = 400;
    var h = 50;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, objMafArchiver);
  },

  /**
   * Shows the dialog to the user when extracting files.
   */
  showOpenTabsDLG: function(objMafExpander) {
    const url = "chrome://maf/content/mafOpenTabsDLG.xul";

    var w = 400;
    var h = 50;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, objMafExpander);
  },

  /**
   * Shows the user some info about MAF
   */
  showAboutDLG: function() {
    const url = "chrome://maf/content/mafAboutDLG.xul";

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes";

    window.openDialog(url, "_blank", win_prefs);
  },

  /**
   * Shows the user the preferences dialog
   */
  showPreferencesDLG: function() {
    const url = "chrome://maf/content/mafPreferencesDLG.xul";

    var w = 500;
    var h = 500;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, MafPreferences, MafGUI);
  },

  /**
   * Shows the user a window that allows them to browse the open archives.
   */
  showBrowseOpenArchivesDLG: function() {
    const url = "chrome://maf/content/mafBrowseOpenArchivesDLG.xul";

    var w = 500;
    var h = 500;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, MafState, window, MafGUI, MafUtils);
  },

  /**
   * Obsolete method that attempts to open all expanded folders in a directory in tabs.
   * Does not use meta-data to determine what the index file is.
   */
  openDirInTabs: function(temp, expandedArchiveRoot) {
    var oBrowser = window.getBrowser();

    try {

    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(MafUtils.appendToDir(temp, expandedArchiveRoot));

    if (oDir.exists() && oDir.isDirectory()) {

      var entries = oDir.directoryEntries;

      // For each folder in the expanded archive root
      while (entries.hasMoreElements()) {
        currDir = entries.getNext();
        currDir.QueryInterface(localFileIID);

        if (currDir.isDirectory()) {

          currDir.append("index.html");

          // If index.html exists
          if (currDir.exists()) {
            // get file URL - temp + expandedArchiveRoot + currFolder + index.html
            url = this.getURI(currDir.nsIFile);
            oBrowser.addTab(url);
          }

        }

      }
    }

    } catch(e) {
      alert(e);
    }

  },

  /**
   * Opens a list of URLs in tabs.
   */
  openListInTabs: function(urlList) {
    var oBrowser = window.getBrowser();

    try {
      var triedFirstTab = false;
      for (var i=0; i<urlList.length; i++) {
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

    }

  },

  /**
   * Returns the number of open windows
   */
  getNumberOfOpenWindows: function() {
    var numberOfOpenWindows = 0;

    try {
      var wmI = Components.classes[asWinMedContractID].getService(asWinMedIID);
      var entries = wmI.getEnumerator(null);

      while (entries.hasMoreElements()) {
        currWindow = entries.getNext();
        numberOfOpenWindows++;
      }
    } catch (e) {
      alert(e);
    }

    return numberOfOpenWindows;
  },

  /**
   * Returns true if a window with that id is open
   */
  isWindowOpen: function(needleLocation) {
    var result = false;

    try {
      var wmI = Components.classes[asWinMedContractID].getService(asWinMedIID);
      var entries = wmI.getEnumerator(null);

      while (entries.hasMoreElements()) {
        currWindow = entries.getNext();
        if (currWindow.location == needleLocation) {
          result = true;
          break;
        }
      }
    } catch (e) {
      alert(e);
    }

    return result;
  },

  /**
   * Registered trigger event whenever a window is closed.
   */
  onWindowClose: function(evt) {

    // Check to see it's the last open window
    var numberOfOpenWindows = MafUtils.getNumberOfOpenWindows();

    // If it's the last window
    if (numberOfOpenWindows < 2) {
      // Get the temp folders used by open archive functions
      // delete each of those folders

      for (var i=0; i<MafState.openArchives.length; i++) {
        try {
          var oDir = Components.classes[localFileContractID].getService(localFileIID);
          oDir.initWithPath(MafState.openArchives[i]);

          if (oDir.exists() && oDir.isDirectory()) {
            oDir.remove(true);
          }
        } catch(e) {

        }
      }

      try {
        // The code below is technically not necessary, as this should only happen
        // when there are no more windows (app is closed). Data in the hidden window
        // should be gone too.

        // Get hidden window
        var appShell = Components.classes[appShellContractID].getService(appShellIID);
        var hiddenWnd = appShell.hiddenDOMWindow;
        hiddenWnd.MafState = null;
      } catch(e) {

      }
    }
  },

  /**
   * Whenever a new window is opened.
   */
  onWindowLoad: function(evt) {
    if (evt.originalTarget == "[object XULDocument]") {
      // New window

      // Get hidden window
      var appShell = Components.classes[appShellContractID].getService(appShellIID);
      var hiddenWnd = appShell.hiddenDOMWindow;

      hiddenWnd.loaded = true;

      // Store global MafState in hidden window
      if (typeof(hiddenWnd.MafState) == "undefined") {
        hiddenWnd.MafState = MafState;

        // Setup the RDF in memory data source for the current state
        hiddenWnd.MafState.setupDataSource();


        hiddenWnd.MafPreferences = MafPreferences;

        // Load the last stored preferences into the object.
        hiddenWnd.MafPreferences.load();

        MafPostSetup.complete();

      } else {
        MafState = hiddenWnd.MafState;
        MafPreferences = hiddenWnd.MafPreferences;
      }

      /**
       * Hack until find an event like onChromeLoad
       */
      if (MafOpenQueue.queue.length > 0) {
        var entry = MafOpenQueue.queue.pop();
        // Open as a MAF with registered filter
        setTimeout(Maf.openFromArchive, 1000, MafPreferences.temp,
                            MafPreferences.programFromOpenIndex(entry.filterIndex), entry.path);
      }
    }

  },

  /**
   * Fired when a new tab is loaded.
   * Replaces original links in the tab being loaded with local links if possible.
   */
  onTabLoad: function(evt) {
    if (evt.originalTarget == "[object HTMLDocument]") {
      // New tab
      if (MafPreferences.urlRewrite) {

        // Get the original url
        var originalURL = evt.originalTarget.location.href;

        // Remove the hash if any
        if (originalURL.indexOf("#") > 0) {
          originalURL = originalURL.substring(0, originalURL.indexOf("#"));
        }

        // If the url is an archive url
        if (typeof(MafState.localFileToUrlMap[originalURL]) != "undefined") {

          // We have some work to do
          var links = evt.originalTarget.links;

          for (var j=0; j < links.length; j++) {
            if (typeof(MafState.urlToLocalFileMap[links[j].href]) != "undefined") {
              links[j].href=MafState.urlToLocalFileMap[links[j].href];
            } else {
              // See if it is hashed
              if (links[j].href.indexOf("#") > 0) {
                var hashPart = links[j].href.substring(links[j].href.indexOf("#"), links[j].href.length);
                var nonHashPart = links[j].href.substring(0, links[j].href.indexOf("#"));

                if (typeof(MafState.urlToLocalFileMap[nonHashPart]) != "undefined") {
                  links[j].href=MafState.urlToLocalFileMap[nonHashPart] + hashPart;
                }
              }
            }
          }

        }
      }
    }
  },


  /**
   * Adds a base tag to HTML.
   * Important so that relative urls not converted by save (such as paths to embedded objects,
   * relative form submit paths, javascripts, etc) can go online to get the missing data.
   */
  addBaseHref: function(sourceString, indexOriginalURL) {
    var resultString = "";
    var baseHrefString = "<base href=\"" + indexOriginalURL + "\" />";
    try {
      var headRe = new RegExp("<[^>]*head[^<]*>", "i"); // Match head tag
      var htmlRe = new RegExp("<[^>]*html[^<]*>", "i"); // Match html tag

      var headMatch = headRe.exec(sourceString);
      var htmlMatch = htmlRe.exec(sourceString);

      // If match head tag, place base href tag right after open head
      if (headMatch != null) {
        resultString = sourceString.substring(0, headMatch.index + headMatch.toString().length);
        resultString += baseHrefString;
        resultString += sourceString.substring(headMatch.index + headMatch.toString().length, sourceString.length);
      } else if(htmlMatch != null) {
        // If no head tag, place after html tag
        resultString = sourceString.substring(0, htmlMatch.index + htmlMatch.toString().length);
        resultString += baseHrefString;
        resultString += sourceString.substring(htmlMatch.index + htmlMatch.toString().length, sourceString.length);
      } else {
        // If no html tag (uhm, ok then) not html?

      }
    } catch(e) {

    }
    return resultString;
  },

  /**
   * Get the mime type for a URI using the MIME service
   */
  getMIMETypeForURI: function(url) {
    var result = null;
    try {
      // Create URI object from url string
      var ioService = Components.classes[ioServiceNetworkContractID].getService(ioServiceNetworkIID);
      var aURI = ioService.newURI(url, null, null);

      // Query MIME service
      var mimeSvc = Components.classes[mimeServiceContractID].getService(mimeServiceIID);
      result = mimeSvc.getTypeFromURI(aURI);

    } catch (e) {
      // Not available, network url and offline?
    }
    return result;
  }


};


/**
 * Attempts to complete the setup for browsers that don't use the install.js
 * - Like firefox 0.9
 */
var MafPostSetup = {

  progid: "{7f57cf46-4467-4c2d-adfa-0cba7c507e54}",

  /**
   * Complete the setup, if necessary
   */
  complete: function() {
    // If firefox 0.9 or higher
    var isFF09OrHigher = false;
    if ((navigator.vendor != null) && (navigator.vendorSub != null)) {
      if (navigator.vendor.toLowerCase() == "firefox") {
        isFF09OrHigher = (parseFloat(navigator.vendorSub) >= 0.9);
      }
    }

    if (isFF09OrHigher) {
      // Get preference maf.postsetup.complete
      var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("maf.");

      try {
        var setupComplete = prefs.getBoolPref("postsetup.complete");
      } catch(e) { setupComplete = false; }

      if (!setupComplete) {
        // Make temp directory
        this.makeTempDirectory();
        // Copy files
        this.copyFiles();

        // Set preference maf.postsetup.complete
        prefs.setBoolPref("postsetup.complete", true);
      }
    }
  },

  /**
   * Create the MAF temporary directory structure.
   */
  makeTempDirectory: function() {
    try {
    // If not on windows
    if (navigator.userAgent.indexOf("Windows") == -1) {
      // Make directory /tmp
      MafUtils.createDir("/tmp");
      // Make directory /tmp/maf/
      MafUtils.createDir("/tmp/maf");
      // Make directory /tmp/maf/maftemp
      MafUtils.createDir("/tmp/maf/maftemp");
    } else {
      // Make directory c:\temp
      MafUtils.createDir("c:\\temp");
      // Make directory c:\temp\maf
      MafUtils.createDir("c:\\temp\\maf");
      // Make directory c:\temp\maf\maftemp
      MafUtils.createDir("c:\\temp\\maf\\maftemp");
    }

    } catch(e) { alert(e); }
  },


  /**
   * @returns A string representing the location of the user's profile directory
   */
  _getProfileDir: function() {
    const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
    try {
      var result = (new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path;
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

    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(sourcepath);

    if (oDir.exists() && oDir.isDirectory()) {
      var entries = oDir.directoryEntries;

      while (entries.hasMoreElements()) {
        var currFile = entries.getNext();
        currFile.QueryInterface(localFileIID);

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
        MafUtils.createBinaryFile(dest, MafUtils.readBinaryFile(source));
      }
    } catch(e) { alert(e); }
  },

  /**
   * Copy a set of files from the extensions, scripts directory
   */
  copyFiles: function() {
    var sourceDir = this._getProfileDir();
    sourceDir = MafUtils.appendToDir(sourceDir, "extensions");
    sourceDir = MafUtils.appendToDir(sourceDir, this.progid);
    sourceDir = MafUtils.appendToDir(sourceDir, "scripts");

    var destDir;

    // If not on windows
    if (navigator.userAgent.indexOf("Windows") == -1) {
      destDir = "/tmp/maf"
    } else {
      destDir = "c:\\temp\\maf"
    }

    var filesList = this._getFilesList(sourceDir);
    for (var i=0; i<filesList.length; i++) {
       this._copyFile(MafUtils.appendToDir(sourceDir, filesList[i]), MafUtils.appendToDir(destDir, filesList[i]));
    }
  }

};
