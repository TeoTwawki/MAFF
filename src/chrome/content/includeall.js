/*
 * This helper file allows this extension's source code to be
 * split across multiple files. Including this file is enough
 * to include also all the other relevant parts of the extension.
 *
 * The common shortcuts Ci, Cc, Cr and Cu are also defined here.
 *
 * This file is in the public domain :-)
 *
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

const EXTENSION_CHROME_CONTENT_PATH = "chrome://maf/content/";

// This try-catch block is necessary to show more details in the error console
try {
  // Include each JavaScript file named in the following array
  [

   // Preferences objects (used throughout the rest of the code)
   "preferences/dynamicPrefsObject.js",
   "preferences/prefsObject.js",

   // Integration overlays
   "integration/browser.js",
   "integration/contentAreaUtils.js",
   "integration/fileFiltersObject.js",
   "integration/fileFiltersOverlay.js",

   // Original MAF JavaScript infrastructure
   "jscomponents/nsMafArchiver.js",
   "jscomponents/nsMafGuiHandler.js",
   "jscomponents/nsMafMhtDecoder.js",
   "jscomponents/nsMafMhtEncoder.js",
   "jscomponents/nsMafMhtHandler.js",
   "jscomponents/nsMafState.js",
   "jscomponents/nsMafUtil.js",

   // "Save Complete" extension integration
   "savecomplete/savecomplete.js",
   "savecomplete/saveCompletePersistObject.js",

   // Support objects for the saving front-end
   "savefrontend/tabsDataSourceObject.js",

   // Saving infrastructure
   "saving/jobObject.js",
   "saving/jobRunnerObject.js",
   "saving/mafArchivePersistObject.js",
   "saving/mafWebProgressListenerObject.js",
   "saving/saveArchiveJobObject.js",
   "saving/saveContentJobObject.js",
   "saving/saveJobObject.js"

  ].forEach(function(contentRelativePath) {
    Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
     .getService(Components.interfaces.mozIJSSubScriptLoader)
     .loadSubScript(EXTENSION_CHROME_CONTENT_PATH + contentRelativePath);
  });
}
catch (ex) {
  Components.utils.reportError(ex);
}