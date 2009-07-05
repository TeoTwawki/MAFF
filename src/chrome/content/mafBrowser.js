/**
 * This helper file is referenced by the extension's browser overlays, and
 *  imports the extension's common JavaScript objects in the global
 *  "MozillaArchiveFormat" object.
 *
 * This file also includes some of the extension's JavaScript objects that
 *  require to be loaded in a browser window in order to work correctly.
 *
 * The common shortcuts Ci, Cc, Cr and Cu are also defined here.
 *
 * This file is in the public domain :-)
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

// Import the common objects from the shared modules
var MozillaArchiveFormat = {};
Cu.import("resource://maf/modules/mafObjects.jsm", MozillaArchiveFormat);

// This try-catch block is necessary to show more details in the error console
try {
  // Include each JavaScript file named in the following array
  [

   // Integration overlays
   "integration/browser.js",
   "integration/contentAreaUtils.js",
   "integration/fileFiltersOverlay.js",

   // Original MAF JavaScript infrastructure
   "maf.js",

   // "Save Complete" extension integration
   "savecomplete/saveCompleteWrapper.js",
   "savecomplete/saveCompletePersistObject.js"

  ].forEach(function(contentRelativePath) {
    Cc["@mozilla.org/moz/jssubscript-loader;1"]
     .getService(Ci.mozIJSSubScriptLoader)
     .loadSubScript("chrome://maf/content/" + contentRelativePath);
  });
} catch (e) {
  Cu.reportError(e);
}