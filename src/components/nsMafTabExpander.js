/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.4.3
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

// Provides MAF Tab Expander Object

const mafTabExpanderContractID = "@mozilla.org/libmaf/tabexpander;1";
const mafTabExpanderCID = Components.ID("{4383b20a-7cdf-4c82-90ee-74ee29d2ffce}");
const mafTabExpanderIID = Components.interfaces.nsIMafTabExpander;

var MafUtils = null;

var MafStrBundle = null;

/**
 * The MAF Tab Expander
 */

function MafTabExpanderClass() {

};

MafTabExpanderClass.prototype = {

  init: function(tempPath, scriptPath, archivePath, folderNumber, Maf) {
    /** The path of the temp folder to use. */
    this.tempPath = tempPath;

    /** The path of the archive script to use. */
    this.scriptPath = scriptPath;

    /** The full path of the archive file to archive to. */
    this.archivePath = archivePath;

    /** Flag to ensure the start function isn't called twice. */
    this.started = false;

    /** The folder holding the expanded archive contents. */
    this.folderNumber = folderNumber;

    this.Maf = Maf;
  },


  start: function() {
    if (!this.started) {
      this.started = true;
      this.timer = Components.classes["@mozilla.org/timer;1"]
                     .createInstance(Components.interfaces.nsITimer);
      this.timer.initWithCallback(this, 500, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
  },

  startBlocking: function() {
    if (!this.started) {
      this.started = true;
      this.notify(this.timer);
    }
  },

  /**
   * Can't kill the process, so stop does nothing really.
   */
  stop: function() {

  },

  notify: function(expiredtimer) {
    if (this.timer == expiredtimer) {
      this.timer = null;

      this.Maf.extractFromArchive(this.scriptPath, this.archivePath,
                                   MafUtils.appendToDir(this.tempPath, this.folderNumber));
      if (this.objWith_fnProgressUpdater != null) {
        this.objWith_fnProgressUpdater.progressUpdater(100);
      }
    }
  },

  /**
   * Access method to set the progress update function
   * This is the function that is called whenever there is a change
   * in progress
   */
  setProgressUpdater: function(objWith_fnProgressUpdater) {
    this.objWith_fnProgressUpdater = objWith_fnProgressUpdater;
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafTabExpanderIID) &&
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

var MAFTabExpanderFactory = new Object();

MAFTabExpanderFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafTabExpanderIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }
    
  return (new MafTabExpanderClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFTabExpanderModule = new Object();

MAFTabExpanderModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafTabExpanderCID,
                                  "Maf Tab Expander JS Component",
                                  mafTabExpanderContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFTabExpanderModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafTabExpanderCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFTabExpanderFactory;
};

MAFTabExpanderModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFTabExpanderModule;
};

