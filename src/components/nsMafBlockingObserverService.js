/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.5.0
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

// Provides A blocking observer service

const mafObserverContractID = "@mozilla.org/blocking-observer-service;1";
const mafObserverCID = Components.ID("{575458aa-3244-4460-9310-10ecbf03b7eb}");
const mafObserverIID = Components.interfaces.nsIObserverService;

var MafObserverService = null;

/**
 * The MAF Blocking Observer Service.
 */
function MafObserverServiceClass() {

}

MafObserverServiceClass.prototype = {

  state: new Array(),

  addObserver: function(observer, topic, reference) {
    if (typeof(this.state[topic]) == "undefined") {
      this.state[topic] = new Array();
    }
    this.state[topic][this.state[topic].length] = observer;
  },

  removeObserver: function(observer, topic) {
    if (typeof(this.state[topic]) != "undefined") {
      var toDeleteLoc = new Array();
      for (var i=0; i<this.state[topic].length; i++) {
        if (this.state[topic][i] == observer) {
          toDeleteLoc.push(i);
        }
      }

      while (toDeleteLoc.length > 0) {
        var loc = toDeleteLoc.pop();
        this.state[topic][i].splice(loc, 1);
      }
    }
  },

  notifyObservers: function(subject, topic, utopic) {
    if (typeof(this.state[topic]) != "undefined") {
      for (var i=0; i<this.state[topic].length; i++) {
        try {
          this.state[topic][i].QueryInterface(Components.interfaces.nsIObserver);
          this.state[topic][i].observe(subject, topic, utopic);
        } catch(e) { }
      }
    }
  },

  enumerateObservers: function(topic) {
    var result = new enumerationClass();
    if (typeof(this.state[topic]) != "undefined") {
      result.state = this.state[topic].copy();
    }
    return result;
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafObserverIID) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  }

};


function enumerationClass() {

};

enumerationClass.prototype = {

  hasMoreElements: function() {
    return ((typeof(this.state) != "undefined") && (this.state.length > 0));
  },

  getNext: function() {
    try {
      return this.state.pop();
    } catch(e) {
      return null;
    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsISimpleEnumerator) &&
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


var MafObserverFactory = new Object();

MafObserverFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafObserverIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }



  if (MafObserverService == null) {
    MafObserverService = new MafObserverServiceClass();
  }

  return MafObserverService.QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MafObserverModule = new Object();

MafObserverModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafObserverCID,
                                  "Maf Observer JS Component",
                                  mafObserverContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MafObserverModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafObserverCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MafObserverFactory;
};

MafObserverModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MafObserverModule;
};

