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

// Provides MAF Mht Encoder Object

const mafMhtEncoderContractID = "@mozilla.org/libmaf/encoder;1?name=mht";
const mafMhtEncoderCID = Components.ID("{1a5c8698-b7a4-44af-87f4-38831fb369df}");
const mafMhtEncoderIID = Components.interfaces.nsIMafMhtEncoder;

/**
 * The MAF Mht Encoder.
 */

function MafMhtEncoderClass() {

}

MafMhtEncoderClass.prototype = {

  PROGID : "Internal MHT Program Archive Handler",

  from : "maf@mozdev.org",

  subject : "",

  date : "",

  filelist: new Array(),

  addFile: function(source, type, location, id) {
    var record = { };
    record.source = source;
    record.type = type;
    record.location = location;
    record.id = id;
    filelist.push(record);
  },

  encodeTo: function(dest) {
    if (this.filelist.length > 0) {

      if (!dest.exists()) {
        dest.create(0x00, 0644);
      }

      try {
        var oTransport = Components.classes["@mozilla.org/network/file-output-stream;1"]
                            .createInstance(Components.interfaces.nsIFileOutputStream);
        oTransport.init( dest, 0x04 | 0x08 | 0x10, 064, 0 );

        var MHTContentString = "";
        if (this.from != "" ) { MHTContentString += "From: " + this.from + "\r\n"; }
        if (this.subject != "") { MHTContentString += "Subject: " + this.subject + "\r\n"; }
        if (this.date != "") { MHTContentString += "Date: " + this.date + "\r\n"; }
        MHTContentString += "MIME-Version: 1.0\r\n";

        if (this.filelist.length > 1) {
          MHTContentString += "X-MAF: Produced By MAF MHT Archive Handler V0.4.0\r\n";
          MHTContentString += "\r\nThis is a multi-part message in MIME format.\r\n";
        } else {
          MHTContentString += "X-MAF: Produced By MAF MHT Archive Handler V0.4.0\r\n";
        }

        oTransport.write(MHTContentString, MHTContentString.length);

        oTransport.close();
      } catch (e) {
        mafdebug(e);
      }
    }
  },

  QueryInterface: function(iid) {

    if (!iid.equals(mafMhtEncoderIID) &&
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

var MAFMhtEncoderFactory = new Object();

MAFMhtEncoderFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafMhtEncoderIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  return (new MafMhtEncoderClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFMhtEncoderModule = new Object();

MAFMhtEncoderModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafMhtEncoderCID,
                                  "Maf MHT Encoder JS Component",
                                  mafMhtEncoderContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MAFMhtEncoderModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafMhtEncoderCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFMhtEncoderFactory;
};

MAFMhtEncoderModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFMhtEncoderModule;
};

