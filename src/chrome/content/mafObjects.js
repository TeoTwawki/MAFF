/**
 * This helper file is included by the "mafObjects.jsm" module, and loads the
 *  source code of the extension's shared objects from multiple files.
 *
 * The common shortcuts Ci, Cc, Cr and Cu are also defined here.
 *
 * This file is in the public domain :-)
 */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cr = Components.results;
var Cu = Components.utils;

// Since this file is loaded as part of a JavaScript code module, we must name
//  every object to be exported explicitly. For more information, see
//  <https://developer.mozilla.org/en/Using_JavaScript_code_modules> (retrieved
//  2009-05-31).
var EXPORTED_SYMBOLS = [];

// This try-catch block is necessary to show more details in the error console
try {
  // Export each object defined in the associated JavaScript file
  [
   // Web archive handling
   ["archiving/archiveObject.js",                 "Archive"],
   ["archiving/archivePageObject.js",             "ArchivePage"],
   ["archiving/maffArchiveObject.js",             "MaffArchive"],
   ["archiving/maffArchivePageObject.js",         "MaffArchivePage"],
   ["archiving/maffDataSourceObject.js",          "MaffDataSource"],
   ["archiving/mhtmlArchiveObject.js",            "MhtmlArchive"],
   ["archiving/mhtmlArchivePageObject.js",        "MhtmlArchivePage"],
   ["archiving/mimeSupportObject.js",             "MimeSupport"],
   ["archiving/zipCreatorObject.js",              "ZipCreator"],
   ["archiving/zipDirectoryObject.js",            "ZipDirectory"],

   // Web archive caching
   ["caching/archiveCacheObject.js",              "ArchiveCache"],
   ["caching/archiveAnnotationsObject.js",        "ArchiveAnnotations"],

   // Support objects for the front-end
   ["frontend/welcomeObject.js",                  "Welcome"],

   // Support objects for integration with the host application
   ["integration/fileFiltersObject.js",           "FileFilters"],

   // Original MAF JavaScript infrastructure
   ["jscomponents/nsMafMhtDecoder.js",            "MafMhtDecoderClass"],
   ["jscomponents/nsMafMhtEncoder.js",            "MafMhtEncoderClass"],
   ["jscomponents/nsMafMhtHandler.js",            "MafMhtHandler"],
   ["jscomponents/nsMafUtil.js",                  "MafUtils"],

   // Loading infrastructure
   ["loading/archiveLoaderObject.js",             "ArchiveLoader"],

   // Preferences objects
   ["preferences/dynamicPrefsObject.js",          "DynamicPrefs"],
   ["preferences/fileAssociationsObject.js",      "FileAssociations"],
   ["preferences/prefsObject.js",                 "Prefs"],

   // Support objects for the saving front-end
   ["savefrontend/tabsDataSourceObject.js",       "TabsDataSource"],

   // Saving infrastructure
   ["saving/jobObject.js",                        "Job"],
   ["saving/jobRunnerObject.js",                  "JobRunner"],
   ["saving/mafArchivePersistObject.js",          "MafArchivePersist"],
   ["saving/mafWebProgressListenerObject.js",     "MafWebProgressListener"],
   ["saving/saveArchiveJobObject.js",             "SaveArchiveJob"],
   ["saving/saveContentJobObject.js",             "SaveContentJob"],
   ["saving/saveJobObject.js",                    "SaveJob"],

   // Extension initialization
   ["startup/dlfRegistererObject.js",             "DlfRegisterer"],
   ["startup/startupEventsObject.js",             "StartupEvents"],
   ["startup/startupInitializerObject.js",        "StartupInitializer"]

  ].forEach(function([contentRelativePath, objectName]) {
    // Load the source code file where the object is defined
    Cc["@mozilla.org/moz/jssubscript-loader;1"]
     .getService(Ci.mozIJSSubScriptLoader)
     .loadSubScript("chrome://maf/content/" + contentRelativePath);
    // Export the object's constructor or the singleton object itself
    EXPORTED_SYMBOLS.push(objectName);
  });
} catch (e) {
  Components.utils.reportError(e);
}