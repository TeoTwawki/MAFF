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

// Provides a maf: protocol handler

const mafProtocolScheme = "maf";
const mafProtocolName = "Mozilla Archive Format Access Protocol";
const mafProtocolContractID = "@mozilla.org/network/protocol;1?name=" + mafProtocolScheme;
const mafProtocolCID = Components.ID("0cd60c15-b7a9-4190-9176-81ecd67e8174");

var MafState = null;
var MafUtils = null;
var MafPreferences = null;
var MafLibMHTDecoder = null;
var MafMHTHandler = null;

var MafStrBundle = null;

function MAFProtocol() { }

MAFProtocol.prototype = {
  QueryInterface: function(iid)   {
    if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
        !iid.equals(Components.interfaces.nsIMaf) &&
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


  openArchiveURI: function(uri) {
    var loadURIMafRegExp = new RegExp(MafPreferences.getOpenFilterRegEx(), "i");

     if (uri.match(loadURIMafRegExp)) {

         var loadURIios = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

         // Get leaf name
         try {
           var ouri = loadURIios.newURI(uri, "", null);    // Create URI object
           var file = ouri.QueryInterface(Components.interfaces.nsIFileURL).file;
         } catch(e) {
           // It wasn't a URL of the form file://, let's try again, shall we?
           try {
             var file = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
             file.initWithPath(uri);
           } catch(ex) {
             // Give up
             mafdebug(MafStrBundle.GetStringFromName("mafprotocolloadhasgivenup") + ex);
           }
         }

          var ismaf = false;

          try {
            // If file extension match any of the filters MAF handles
            var filterIndex = MafPreferences.getOpenFilterIndexFromFilename(file.leafName);

            // Get matching filter
            ismaf = (filterIndex != -1);
          } catch(e) {
            mafdebug(e);
          }

          if (ismaf) {
            // Get original url's to local file path
            var localFilePath = file.path;

            try {
              // Open as a MAF with registered filter
              this.openFromArchive(MafPreferences.temp,
                              MafPreferences.programFromOpenIndex(filterIndex), localFilePath);
            } catch(e) {

            }
          }
     }
  },

  openFromArchive: function(tempPath, scriptPath, archivePath) {
    var dateTimeExpanded = new Date();

    var folderNumber = dateTimeExpanded.valueOf() + "_" + Math.floor(Math.random()*1000);

    var objMafTabExpander = Components.classes["@mozilla.org/libmaf/tabexpander;1"]
                                 .createInstance(Components.interfaces.nsIMafTabExpander);

    objMafTabExpander.init(tempPath, scriptPath, archivePath, folderNumber, this);
    objMafTabExpander.startBlocking();

    var count = {};
    var archiveLocalURLs = {};

    MafState.addArchiveInfo(tempPath, folderNumber, archivePath, count, archiveLocalURLs);
  },

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
      /** If program is nothing then don't try to run it. */
      if (program != "") {
        if (MafPreferences.win_invisible) {
          localProgram = MafPreferences.win_wscriptexe;
          localProgramArgs = new Array();
          localProgramArgs[localProgramArgs.length] = MafPreferences.win_invisiblevbs;
          localProgramArgs[localProgramArgs.length] = program;
        } else {
          localProgram = program;
          localProgramArgs = new Array();
        }

        try {
          var oProgram = Components.classes["@mozilla.org/file/local;1"]
                           .createInstance(Components.interfaces.nsILocalFile);
          oProgram.initWithPath(localProgram);
        } catch(e) {
          mafdebug(MafStrBundle.GetStringFromName("couldnotfindprogram") + program + " \n" + e);
        }

        try {
          var oProcess = Components.classes["@mozilla.org/process/util;1"]
                           .createInstance(Components.interfaces.nsIProcess);
        } catch (e) {
          mafdebug(MafStrBundle.GetStringFromName("couldnotcreateprocess") + "\n" + e);
        }

        oProcess.init(oProgram);

        localProgramArgs[localProgramArgs.length] = archivefile;
        localProgramArgs[localProgramArgs.length] = destpath;

        oProcess.run(true, localProgramArgs, localProgramArgs.length);

        var obs = Components.classes["@mozilla.org/observer-service;1"]
                     .getService(Components.interfaces.nsIObserverService);
        obs.notifyObservers(null, "maf-extract-finished", destpath);

      }
    }
  },


  newChannel: function(aURI) {
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                 .getService(Components.interfaces.nsIIOService);

    if (MafPreferences.enableMafProtocol) {
      var strURI = aURI.spec;

      // strip off the maf:// part
      var requestURI;

      if (strURI.toLowerCase().startsWith("maf://")) {
        requestURI = strURI.substring(6, strURI.length);
      } else {
        if (strURI.toLowerCase().startsWith("maf:")) {
          requestURI = strURI.substring(4, strURI.length);
        } else {
          // Er, not a maf protocol. Why are we being invoked?
          requestURI = "about:blank";
        }
      }

      // If there's no :// then put it in
      if (requestURI.indexOf("://") == -1) {
        if (requestURI.indexOf("//") == -1) {
          requestURI = "about:blank";
        } else {
          requestURI = requestURI.substring(0, requestURI.indexOf("//")) + ":" +
                       requestURI.substring(requestURI.indexOf("//"), requestURI.length);
        }
      }

      if (requestURI.indexOf("!") > -1) {
        try {
          var filePart = requestURI.substring(requestURI.indexOf("!") + 1, requestURI.length);
          var fileParts = filePart.split("/");

          // strip off the ! part
          var requestURI = requestURI.substring(0, requestURI.indexOf("!"));

          if (!MafState.isArchiveURIOpen(requestURI)) {
            // Open it!
            this.openArchiveURI(requestURI);
          }

          if (MafState.isArchiveURIOpen(requestURI)) {
            var destPath = MafState.expandedArchiveURIPath(requestURI);
            for (var i=0; i<fileParts.length; i++) {
              destPath = MafUtils.appendToDir(destPath, fileParts[i]);
            }
            requestURI = MafUtils.getURIFromFilename(destPath);
          }
        } catch(e) {
          requestURI = "about:blank";
        }

        return ios.newChannel(requestURI, null, null);
      } else {
        return ios.newChannel("about:blank", null, null);
      }
    } else {
      return ios.newChannel("about:blank", null, null);
    }
  },
}

function mafdebug(text) {
  var csClass = Components.classes['@mozilla.org/consoleservice;1'];
  var cs = csClass.getService(Components.interfaces.nsIConsoleService);
  cs.logStringMessage(text);
};

String.prototype.startsWith = function(needle) {
  return (this.substring(0, needle.length) == needle);
};

var MAFProtocolFactory = new Object();

MAFProtocolFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
      !iid.equals(Components.interfaces.nsIMaf) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafState == null) {
    MafState = Components.classes["@mozilla.org/maf/state_service;1"]
                  .getService(Components.interfaces.nsIMafState);
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  if (MafPreferences == null) {
    MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                        .getService(Components.interfaces.nsIMafPreferences);
  }

  if (MafLibMHTDecoder == null) {
    MafLibMHTDecoder = Components.classes["@mozilla.org/libmaf/decoder;1?name=mht"]
                          .createInstance(Components.interfaces.nsIMafMhtDecoder);
  }

  if (MafMHTHandler == null) {
    MafMHTHandler = Components.classes["@mozilla.org/maf/mhthandler_service;1"]
                       .getService(Components.interfaces.nsIMafMhtHandler);
  }

  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
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
