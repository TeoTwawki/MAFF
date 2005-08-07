/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.6.3
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2005 Christopher Ottley.
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

// Provides A blocking ArchivePostProcessor

const mafArchivePostProcessorContractID = "@mozilla.org/maf/archive-postprocessor;1";
const mafArchivePostProcessorCID = Components.ID("{34ae9a7d-f128-4b30-b519-6bad064eb81f}");
const mafArchivePostProcessorIID = Components.interfaces.nsIObserver;

var MafPreferences = null;

var MafUtils = null;

/**
 * The MAF Blocking ArchivePostProcessor.
 */
function MafArchivePostProcessorClass() {

}

MafArchivePostProcessorClass.prototype = {

  addDocumentWriteOverride: function(source) {
    var result = "";
    var documentwriteString = "<script language=\"javascript\">document.write = function(s) { }; document.writeln = function(s) { }; </script>";
    try {
      var scriptRe = new RegExp("<[^>]*script[^<]*>", "i"); // Match script tag

      var scriptMatch = scriptRe.exec(source);

      if (scriptMatch != null) {
        result = source.substring(0, scriptMatch.index);
        result += documentwriteString;
        result += source.substring(scriptMatch.index, source.length);
      } else {
        result = source;
      }

    } catch(e) {
      result = source;
    }
    return result;
  },

  process: function(filepath) {
    try {
      var str = MafUtils.readFile(filepath);

      MafUtils.deleteFile(filepath);

      if (MafPreferences.addDocumentWriteOverride) {
        str = this.addDocumentWriteOverride(str);
      }

      MafUtils.createFile(filepath, str);
    } catch(e) {

    }

  },

  observe: function(subject, topic, data) {
    if (topic == "maf-open-archive-complete") {
      try {
        var oDir = Components.classes["@mozilla.org/file/local;1"]
                      .createInstance(Components.interfaces.nsILocalFile);
        oDir.initWithPath(data);

        if (oDir.exists() && oDir.isDirectory()) {
          var entries = oDir.directoryEntries;

          while (entries.hasMoreElements()) {
            var currDir = entries.getNext();
            currDir.QueryInterface(Components.interfaces.nsILocalFile);

            if (currDir.isDirectory()) {
              var ientries = currDir.directoryEntries;
              while (ientries.hasMoreElements()) {
                var currDirEntry = ientries.getNext();
                currDirEntry.QueryInterface(Components.interfaces.nsILocalFile);

                if (!currDirEntry.isDirectory()) {
                  // If it's an HTML file
                  if (MafUtils.getMIMETypeForURI(MafUtils.getURI(currDirEntry)) == "text/html") {
                    this.process(currDirEntry.path);
                  }
                }
              }
            }
          }
        }
      } catch(e) {

      }
    }
  },


  QueryInterface: function(iid) {

    if (!iid.equals(mafArchivePostProcessorIID) &&
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


var MafArchivePostProcessorFactory = new Object();

MafArchivePostProcessorFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(mafArchivePostProcessorIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (MafPreferences == null) {
    MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                        .getService(Components.interfaces.nsIMafPreferences);
  }

  if (MafUtils == null) {
    MafUtils = Components.classes["@mozilla.org/maf/util_service;1"]
                  .getService(Components.interfaces.nsIMafUtil);
  }

  return (new MafArchivePostProcessorClass()).QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MafArchivePostProcessorModule = new Object();

MafArchivePostProcessorModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafArchivePostProcessorCID,
                                  "Maf Archive Post Processor JS Component",
                                  mafArchivePostProcessorContractID,
                                  fileSpec,
                                  location,
                                  type);
};

MafArchivePostProcessorModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafArchivePostProcessorCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MafArchivePostProcessorFactory;
};

MafArchivePostProcessorModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MafArchivePostProcessorModule;
};

