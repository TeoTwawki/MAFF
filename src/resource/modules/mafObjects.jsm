/**
 * This module exports all the common JavaScript objects that are implemented by
 *  Mozilla Archive Format. The JavaScript files with the actual implementation
 *  are listed and included in the extension's chrome code.
 *
 * This file is in the public domain :-)
 */

// This try-catch block is necessary to show more details in the error console
try {
  // Delegate the actual loading to the file in the chrome content folder
  Components.classes["@mozilla.org/moz/jssubscript-loader;1"].
   getService(Components.interfaces.mozIJSSubScriptLoader).
   loadSubScript("chrome://maf/content/mafObjects.js");
} catch (e) {
  Components.utils.reportError(e);
}