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

// Provides MAF Tab Archiver Object

const mafTabArchiverContractID = "@mozilla.org/libmaf/tabarchiver;1";
const mafTabArchiverCID = Components.ID("{c154eb5d-9d62-40c5-a694-618b55e509a5}");
const mafTabArchiverIID = Components.interfaces.nsIMafTabArchiver;

var MafUtils = null;

var MafPreferences = null;

var MafLibMHTEncoder = null;

var MafStrBundle = null;

/**
 * The MAF Tab Archiver
 */

function MafTabArchiverClass() {

};

MafTabArchiverClass.prototype = {

  init: function(browsers, tempPath, scriptPath, archivePath, Maf) {
    /** The tabs to archive. */
    this.browsers = browsers,

    /** The path of the temp folder to use. */
    this.tempPath = tempPath,

    /** The path of the archive script to use. */
    this.scriptPath = scriptPath,

    /** The full path of the archive file to archive to. */
    this.archivePath = archivePath,

    /** Flag to ensure the start function isn't called twice. */
    this.started = false,

    /** If all the tabs have finished downloading. */
    this.downloadComplete = false,

    /** The archiver objects used to save. */
    this.MafArchivers = new Array(),

    /** The current tab being saved. */
    this.currentMafArchiverIndex = 0;

    this.Maf = Maf;
  },

  start: function() {
    if (!this.started) {
      this.started = true;

      var dateTimeArchived = new Date();

      for (var i=0; i<this.browsers.length; i++) {
        var objMafArchiver = Components.classes["@mozilla.org/libmaf/archiver;1"]
                                .createInstance(Components.interfaces.nsIMafArchiver);
        objMafArchiver.setProgressUpdater(this);
        this.MafArchivers[this.MafArchivers.length] = objMafArchiver;
      }

      if (this.browsers.length > 0) {
        this.MafArchivers[this.currentMafArchiverIndex].init(this.browsers[this.currentMafArchiverIndex],
                            this.tempPath, this.scriptPath, this.archivePath,
                            dateTimeArchived.valueOf() + "", this.Maf);
        this.MafArchivers[this.currentMafArchiverIndex].start();
      }
    }
  },

  stop: function() {
    this.currentMafArchiverIndex = this.browsers.length;
  },

  setProgressUpdater: function(objWith_fnProgressUpdater) {
    this.objWith_fnProgressUpdater = objWith_fnProgressUpdater;
  },

  progressUpdater: function(progress) {
    if (progress == 100) {
      // Finished saving single tab

      if (this.currentMafArchiverIndex < this.browsers.length) {
        if (this.MafArchivers[this.currentMafArchiverIndex].downloadComplete == true) {

          if (this.objWith_fnProgressUpdater != null) {
            var percentage = Math.floor((this.currentMafArchiverIndex/this.browsers.length)*100);
            this.objWith_fnProgressUpdater.progressUpdater(percentage);
          }

          this.currentMafArchiverIndex += 1;
          if (this.currentMafArchiverIndex < this.browsers.length) {
            var dateTimeArchived = new Date();
            var archivePathToUse = this.archivePath;
            // If it's MHT, get unique filename
            if (this.scriptPath == MafLibMHTEncoder.PROGID) {
              archivePathToUse = MafUtils.getFullUniqueFilename(archivePathToUse);
            }
            
            this.MafArchivers[this.currentMafArchiverIndex].init(this.browsers[this.currentMafArchiverIndex],
                               this.tempPath, this.scriptPath, archivePathToUse,
                               dateTimeArchived.valueOf() + "", this.Maf);
            this.MafArchivers[this.currentMafArchiverIndex].start();
          } else {
            if (this.objWith_fnProgressUpdater != null) {
              this.objWith_fnProgressUpdater.progressUpdater(100);
            }
            this.downloadComplete = true;
            var obs = Components.classes["@mozilla.org/observer-service;1"]
                         .getService(Components.interfaces.nsIObserverService);
            obs.notifyObservers(null, "maf-tabarchiver-finished", this.archivePath);
          }

        }
      } else {
        if (this.objWith_fnProgressUpdater != null) {
          this.objWith_fnProgressUpdater.progressUpdater(100);
        }
        this.downloadComplete = true;
        var obs = Components.classes["@mozilla.org/observer-service;1"]
                     .getService(Components.interfaces.nsIObserverService);
        obs.notifyObservers(null, "maf-tabarchiver-finished", this.archivePath);
      }
    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafTabArchiverIID) &&
        !iid.equals(Components.interfaces.nsIMafProgressUpdater) &&
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

var MAFTabArchiverFactory = new Object();

MAFTabArchiverFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafTabArchiverIID) &&
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

  if (MafLibMHTEncoder == null) {
    MafLibMHTEncoder = Components.classes["@mozilla.org/libmaf/encoder;1?name=mht"]
                          .createInstance(Components.interfaces.nsIMafMhtEncoder);
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }

  return (new MafTabArchiverClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFTabArchiverModule = new Object();

MAFTabArchiverModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafTabArchiverCID,
                                  "Maf Tab Archiver JS Component",
                                  mafTabArchiverContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFTabArchiverModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafTabArchiverCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFTabArchiverFactory;
};

MAFTabArchiverModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFTabArchiverModule;
};

