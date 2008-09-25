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

// Provides MAF Document Viewer Factory
const mafDocumentViewerFactoryContractID = "@mozilla.org/content-viewer-factory/view;1?type=application/x-maf";
const mafDocumentViewerFactoryCID = Components.ID("{af7b4b58-cf98-49c7-81df-feb3b75659fe}");
const mafDocumentViewerFactoryIID = Components.interfaces.nsIMafDocumentViewerFactory;

var Application = Components.classes["@mozilla.org/fuel/application;1"]
 .getService(Components.interfaces.fuelIApplication);

var sharedData = Application.storage.get("maf-data", null);
if (!sharedData) {
  sharedData = {};
  Application.storage.set("maf-data", sharedData);
}

Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
 .getService(Components.interfaces.mozIJSSubScriptLoader)
 .loadSubScript("chrome://maf/content/includeall.js");

var MafDocumentViewerFactory = null;

var MafStrBundle = null;

/**
 * The MAF URI Document Viewer Factory.
 */

function MafDocumentViewerFactoryClass() {

}

MafDocumentViewerFactoryClass.prototype = {

   init: function(maf) {
     this.maf = maf;
   },

   createBlankDocument: function(loadGroup) {
     var result = null;
     return result;
   },

   createInstance: function(command, channel, loadGroup, contentType, container, extraInfo, docListenerResult) {
     var result = null;
     var uri = channel.URI.spec;

     var loadURIMafRegExp = new RegExp(GetMafPreferencesServiceClass()
                                          .getOpenFilterRegEx(), "i");

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
             mafdebug(MafStrBundle.GetStringFromName("mafviewerloadhasgivenup") + ex);
           }
         }

          var MafPreferences = GetMafPreferencesServiceClass();

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
              this.maf.openFromArchive(MafPreferences.temp,
                              MafPreferences.programFromOpenIndex(filterIndex), localFilePath);
            } catch(e) {

            }
          }
     }

     docListenerResult = null;
     return result;
   },

   createInstanceForDocument: function(container, document, command) {
     var result = null;
     return result;
   },

  QueryInterface: function(iid) {

    if (!iid.equals(Components.interfaces.nsIDocumentLoaderFactory) &&
        !iid.equals(mafDocumentViewerFactoryIID) &&
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

var MAFDocumentViewerFactoryFactory = new Object();

MAFDocumentViewerFactoryFactory.createInstance = function (outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  if (!iid.equals(Components.interfaces.nsIDocumentLoaderFactory) &&
      !iid.equals(mafDocumentViewerFactoryIID) &&
      !iid.equals(Components.interfaces.nsISupports)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }


  if (MafStrBundle == null) {
    MafStrBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                      .getService(Components.interfaces.nsIStringBundleService)
                      .createBundle("chrome://maf/locale/maf.properties");
  }

  if (MafDocumentViewerFactory == null) {
    MafDocumentViewerFactory = new MafDocumentViewerFactoryClass();
  }

  return MafDocumentViewerFactory.QueryInterface(iid);
};


/**
 * XPCOM component registration
 */
var MAFDocumentViewerFactoryModule = new Object();

MAFDocumentViewerFactoryModule.registerSelf = function (compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(mafDocumentViewerFactoryCID,
                                  "Maf Document Viewer Factory JS Component",
                                  mafDocumentViewerFactoryContractID,
                                  fileSpec,
                                  location,
                                  type);
};



MAFDocumentViewerFactoryModule.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(mafDocumentViewerFactoryCID)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  if (!iid.equals(Components.interfaces.nsIFactory)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  return MAFDocumentViewerFactoryFactory;
};

MAFDocumentViewerFactoryModule.canUnload = function (compMgr) {
  return true;
};

function NSGetModule(compMgr, fileSpec) {
  return MAFDocumentViewerFactoryModule;
};

