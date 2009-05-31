/**
 * This helper file is referenced by most of the extension's dialogs and
 *  overlays, and imports the extension's common JavaScript objects.
 *
 * The common shortcuts Ci, Cc, Cr and Cu are also defined here.
 *
 * This file is in the public domain :-)
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

const EXTENSION_CHROME_CONTENT_PATH = "chrome://maf/content/";
const EXTENSION_RESOURCE_MODULES_PATH = "resource://maf/modules/";

// Import the common objects from the shared modules
Cu.import(EXTENSION_RESOURCE_MODULES_PATH + "mafObjects.jsm");
Cu.import(EXTENSION_RESOURCE_MODULES_PATH + "archiveCacheObjects.jsm");