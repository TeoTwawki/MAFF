/**
 * This helper file includes some of the extension's JavaScript objects that
 *  require to be loaded in a browser window in order to work correctly.
 *
 * This file is in the public domain :-)
 */

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
     .loadSubScript(EXTENSION_CHROME_CONTENT_PATH + contentRelativePath);
  });
} catch (e) {
  Cu.reportError(e);
}