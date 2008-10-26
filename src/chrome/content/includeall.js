/*
 * This helper file allows this extension's source code to be
 * split across multiple files. Including this file is enough
 * to include also all the other relevant parts of the extension.
 *
 * This file is in the public domain :-)
 *    
 */   

const EXTENSION_CHROME_CONTENT_PATH = "chrome://maf/content/";

// This try-catch block is necessary to show more details in the error console
try {
  // Include each JavaScript file named in the following array
  [
   "jscomponents/nsMafArchivePostProcessor.js",
   "jscomponents/nsMafArchiver.js",
   "jscomponents/nsMafBlockingObserverService.js",
   "jscomponents/nsMafGuiHandler.js",
   "jscomponents/nsMafMhtDecoder.js",
   "jscomponents/nsMafMhtEncoder.js",
   "jscomponents/nsMafMhtHandler.js",
   "jscomponents/nsMafPreferences.js",
   "jscomponents/nsMafProtocol.js",
   "jscomponents/nsMafState.js",
   "jscomponents/nsMafStringValue.js",
   "jscomponents/nsMafTabArchiver.js",
   "jscomponents/nsMafTabExpander.js",
   "jscomponents/nsMafUtil.js",
   "jscomponents/nsMafWebBrowserPersist.js"
  ].forEach(function(contentRelativePath) {
    Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
     .getService(Components.interfaces.mozIJSSubScriptLoader)
     .loadSubScript(EXTENSION_CHROME_CONTENT_PATH + contentRelativePath);
  });
}
catch (ex) {
  Components.utils.reportError(ex);
}