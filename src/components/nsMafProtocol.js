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

// Provides a maf: protocol handler

const mafProtocolScheme = "maf";
const mafProtocolName = "Mozilla Archive Format Access Protocol";
const mafProtocolContractID = "@mozilla.org/network/protocol;1?name=" + mafProtocolScheme;
const mafProtocolCID = Components.ID("0cd60c15-b7a9-4190-9176-81ecd67e8174");

function MAFProtocol() { }

MAFProtocol.prototype = {
  QueryInterface: function(iid)   {
    if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
        !iid.equals(Components.interfaces.nsISupports)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },

  scheme: mafProtocolScheme,
  defaultPort: -1,
  protocolFlags: Components.interfaces.nsIProtocolHandler.URI_NORELATIVE |
                 Components.interfaces.nsIProtocolHandler.URI_NOAUTH,

  allowPort: function(port, scheme) {
    return false;
  },

  newURI: function(spec, charset, baseURI) {
    var uri = Components.classes["@mozilla.org/network/simple-uri;1"]
                .createInstance(Components.interfaces.nsIURI);
    uri.spec = spec;
    return uri;
  },

  newChannel: function(aURI) {
    var strURI = aURI.spec;

    // strip off the maf: part
    var requestURI = strURI.substring(strURI.indexOf(":") + 1, strURI.length);

    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                 .getService(Components.interfaces.nsIIOService);

    // Only if it's a registered MAF file
    // If doesn't have ! then open all
    return ios.newChannel(requestURI, null, null);
  },
}

var MAFProtocolFactory = new Object();

MAFProtocolFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  return new MAFProtocol();
}


/**
 * XPCOM component registration
 */
var MAFProtocolModule = new Object();

MAFProtocolModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafProtocolCID,
                                  mafProtocolName,
                                  mafProtocolContractID,
                                  fileSpec,
                                  location,
                                  type);
}

MAFProtocolModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafProtocolCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFProtocolFactory;
}

MAFProtocolModule.canUnload = function (compMgr) {
  return true;
}

function NSGetModule(compMgr, fileSpec) {
  return MAFProtocolModule;
}
