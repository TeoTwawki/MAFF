/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.4.0
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

// Provides MAF Archiver Object

const mafArchiverContractID = "@mozilla.org/libmaf/archiver;1";
const mafArchiverCID = Components.ID("{29c494d1-6f42-4ddd-a831-ea2176753ddd}");
const mafArchiverIID = Components.interfaces.nsIMafArchiver;

var MafUtils = null;

var MafPreferences = null;

var MafStrBundle = null;

/**
 * The MAF Archiver
 */

function MafArchiverClass() {

};

MafArchiverClass.prototype = {

  downloadPercentComplete: -1,

  indexfilename: "index.html",

  downloadComplete: false,

  init: function(aBrowser, tempPath, scriptPath, archivePath, dateTimeArchived, Maf) {
    /** The browser containing the data archive. */
    this.aBrowser = aBrowser;

    /** The document to archive. */
    this.aDocument = aBrowser.contentDocument;

    /** The path of the temp folder to use. */
    this.tempPath = tempPath;

    /** The path of the archive script to use. */
    this.scriptPath = scriptPath;

    /** The full path of the archive file to archive to. */
    this.archivePath = archivePath;

    /** When this document was archived. */
    this.dateTimeArchived = dateTimeArchived;

    /** The folder number used in the archive. */
    this.folderNumber = dateTimeArchived + "_" + Math.floor(Math.random()*1000);

    /** Flag to ensure the start function isn't called twice. */
    this.started = false;

    this.downloadComplete = false;

    this.Maf = Maf;
  },


  start: function() {
    if (!this.started) {
      this.started = true;
      this.Maf.nativeSaveFile(this.aDocument, MafUtils.appendToDir(this.tempPath, this.folderNumber),
                                 "index.html", this);
    }
  },

  setProgressUpdater: function(objWith_fnProgressUpdater) {
    this.objWith_fnProgressUpdater = objWith_fnProgressUpdater;
  },

  onDownloadComplete: function() {
    var tempArchiveFolder = MafUtils.appendToDir(this.tempPath, this.folderNumber);

    if (MafUtils.checkFileExists(MafUtils.appendToDir(tempArchiveFolder, this.indexfilename))) {

        var ocHandler = new MafArchiverOnComplete();
        ocHandler.objMafArchiver = this;
        ocHandler.tempArchiveFolder = tempArchiveFolder;
        ocHandler.objWith_fnProgressUpdater = this.objWith_fnProgressUpdater;

        var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                 .getService(Components.interfaces.nsIObserverService);
        observerService.addObserver(ocHandler, "mht-encoder-finished", false);
        observerService.addObserver(ocHandler, "maf-archiver-finished", false);

        this.downloadComplete = true;
        this.addMetaData();
        this.Maf.archiveDownload(this.scriptPath,
                                  this.archivePath,
                                  this.folderNumber);

      }
  },

  /**
   * Adds RDF files containing Meta Data about the saved page
   * such as original URL, date/time saved and page history
   */
  addMetaData: function() {

    destMetaDataFolder = MafUtils.appendToDir(this.tempPath, this.folderNumber);
    // Create index.rdf in the folderNumber and
    // Get a referance to index.rdf's data source
    var indexDS = MafUtils.createRDF(destMetaDataFolder, "index.rdf");
    indexDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

    try {
      // Add url data
      MafUtils.addStringData(indexDS, "originalurl", this.aDocument.location.href);

      if (this.aDocument.title != "") {
        // Add title
        MafUtils.addStringData(indexDS, "title", this.aDocument.title);
      } else {
        MafUtils.addStringData(indexDS, "title", "Unknown");
      }
      // Add Date/Time archived data
      MafUtils.addStringData(indexDS, "archivetime", new Date());
      // Add index file data
      MafUtils.addStringData(indexDS, "indexfilename", this.indexfilename);

      if (MafPreferences.saveExtendedMetadata) {
        // Add text zoom data
        MafUtils.addStringData(indexDS, "textzoom", this.aBrowser.markupDocumentViewer.textZoom);

        // Add horizontal scroll data
        MafUtils.addStringData(indexDS, "scrollx", this.aBrowser.contentWindow.scrollX);

        // Add vertical scroll data
        MafUtils.addStringData(indexDS, "scrolly", this.aBrowser.contentWindow.scrollY);
      }

    } catch(e) {

    }
    // Write changes to physical file
    indexDS.Flush();


    if (MafPreferences.saveExtendedMetadata) {
      // Create history.rdf in the folderNumber
      try {
        // Get a reference to history.rdf
        var historyDS = MafUtils.createRDF(destMetaDataFolder, "history.rdf");
        historyDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

        // Add history information
        var historyData = this.aBrowser.sessionHistory;

        if (historyData.count > 0) {
          MafUtils.addStringData(historyDS, "current", historyData.index);
          MafUtils.addStringData(historyDS, "noofentries", historyData.count);
            for (var i=0; i<historyData.count; i++) {
               MafUtils.addStringData(historyDS, "entry" + i, historyData.getEntryAtIndex(i, false).URI.spec);
            }
        }

        // Write changes to physical file
        historyDS.Flush();
      } catch(e) {

      }
    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafArchiverIID) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};

function MafArchiverOnComplete() {

};

MafArchiverOnComplete.prototype = {

  observe: function(subject, topic, data) {
    if (topic == "mht-encoder-finished") {
      var obs = Components.classes["@mozilla.org/observer-service;1"]
                               .getService(Components.interfaces.nsIObserverService);
      obs.removeObserver(this, "mht-encoder-finished");
      obs.removeObserver(this, "maf-archiver-finished");
      this.onComplete();
    } else {
      if (topic == "maf-archiver-finished") {
        var obs = Components.classes["@mozilla.org/observer-service;1"]
                                 .getService(Components.interfaces.nsIObserverService);
        obs.removeObserver(this, "maf-archiver-finished");
        this.onComplete();
      }
    }
  },

  /**
   * Removes the specified folder if it exists.
   */
  removeFolder: function(folderToRemove) {
    var oDir = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsILocalFile);
    oDir.initWithPath(folderToRemove);
    if (oDir.exists() && oDir.isDirectory()) {
      oDir.remove(true);
    }
  },

  notify: function(expiredtimer) {
    if (this.timer == expiredtimer) {
      this.removeFolder(this.tempArchiveFolder);
      this.timer = null;
    }
  },

  onComplete: function() {
    try {
      // Remove Folder after 5 seconds
      this.timer = Components.classes["@mozilla.org/timer;1"]
                     .createInstance(Components.interfaces.nsITimer);
      this.timer.initWithCallback(this, 5000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);


      if (this.objWith_fnProgressUpdater != null) {
        this.objWith_fnProgressUpdater.progressUpdater(100);
      }
    } catch(e) {
      mafdebug(e);
    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsIObserver) &&
        !iid.equals(Components.interfaces.nsITimerCallback) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }
};


function mafdebug(text) {
  var csClass = Components.classes['@mozilla.org/consoleservice;1'];
  var cs = csClass.getService(Components.interfaces.nsIConsoleService);
  cs.logStringMessage(text);
};

String.prototype.trim = function() {
  // skip leading and trailing whitespace
  // and return everything in between
  var x = this;
  x = x.replace(/^\s*(.*)/, "$1");
  x = x.replace(/(.*?)\s*$/, "$1");
  return x;
};

/**
 * Replace all needles with newneedles
 */
String.prototype.replaceAll = function(needle, newneedle) {
  var x = this;
  x = x.split(needle).join(newneedle);
  return x;
};

var MAFArchiverFactory = new Object();

MAFArchiverFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafArchiverIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  if (MafPreferences == null) {
    MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                        .getService(Components.interfaces.nsIMafPreferences);
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }

  return (new MafArchiverClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFArchiverModule = new Object();

MAFArchiverModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafArchiverCID,
                                  "Maf Archiver JS Component",
                                  mafArchiverContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFArchiverModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafArchiverCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFArchiverFactory;
};

MAFArchiverModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFArchiverModule;
};

