/**
 * This helper file is referenced by the extension's dialogs, and imports the
 *  extension's common JavaScript objects in the global namespace.
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
Cu.import("resource://maf/modules/mafObjects.jsm");