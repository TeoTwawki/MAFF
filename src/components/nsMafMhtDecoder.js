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

// Provides MAF Mht Decoder Object

const mafMhtDecoderContractID = "@mozilla.org/libmaf/decoder;1?name=mht";
const mafMhtDecoderCID = Components.ID("{3814ca79-30bc-4ad3-a005-488f05a1dd87}");
const mafMhtDecoderIID = Components.interfaces.nsIMafMhtDecoder;

/**
 * The MAF Mht Decoder.
 */

function MafMhtDecoderClass() {

}

MafMhtDecoderClass.prototype = {

  PROGID : "Internal MHT Program Extract Handler",

  QueryInterface: function(iid) {

    if (!iid.equals(mafMhtDecoderIID) &&
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

var MAFMhtDecoderFactory = new Object();

MAFMhtDecoderFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafMhtDecoderIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  return (new MafMhtDecoderClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFMhtDecoderModule = new Object();

MAFMhtDecoderModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafMhtDecoderCID,
                                  "Maf MHT Decoder JS Component",
                                  mafMhtDecoderContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFMhtDecoderModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafMhtDecoderCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFMhtDecoderFactory;
};

MAFMhtDecoderModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFMhtDecoderModule;
};

