/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.4
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

// Provides MAF Preferences Record Object

const mafPreferencesRecContractID = "@mozilla.org/maf/preferences_rec;1";
const mafPreferencesRecCID = Components.ID("{5cba4706-ec80-416f-b1e3-2724a023f996}");
const mafPreferencesRecIID = Components.interfaces.nsIMafPreferencesRec;

/**
 * The MAF Preferences Record.
 */
function MafPreferencesRecClass() {
  this.id = "";
  this.archivescript = "";
  this.extractscript = "";
  this.extensions = new Array();
}

MafPreferencesRecClass.prototype = {

  getExtensionsLength: function() {
    return this.extensions.length;
  },

  getExtensionAt: function(index) {
    return this.extensions[index];
  },

  addExtension: function(newExtension) {
    this.extensions[this.extensions.length] = newExtension;
  },

  updateExtensionAt: function(index, newExtension) {
    this.extensions[index] = newExtension;
  },

  removeExtensionAt: function(index) {
    this.extensions = this.extensions.splice(index, 1);
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafPreferencesRecIID) &&
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


var MAFPreferencesRecFactory = new Object();

MAFPreferencesRecFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafPreferencesRecIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  return (new MafPreferencesRecClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFPreferencesRecModule = new Object();

MAFPreferencesRecModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafPreferencesRecCID,
                                  "Maf Preference Extension Record JS Component",
                                  mafPreferencesRecContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFPreferencesRecModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafPreferencesRecCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFPreferencesRecFactory;
};

MAFPreferencesRecModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFPreferencesRecModule;
};

