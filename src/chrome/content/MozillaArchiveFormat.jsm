/**
 * Exports all the common JavaScript objects for Mozilla Archive Format.
 */

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let objectsByFolder = {
  general: [
    "AsyncEnumerator",
    "DataSourceWrapper",
  ],
  archiving: [
    "Archive",
    "ArchivePage",
    "MaffArchive",
    "MaffArchivePage",
    "MaffDataSource",
    "MhtmlArchive",
    "MhtmlArchivePage",
    "MimePart",
    "MimeSupport",
    "MultipartMimePart",
    "ZipCreator",
    "ZipDirectory",
  ],
  caching: [
    "ArchiveCache",
    "ArchiveAnnotations",
    "ArchiveHistoryObserver",
  ],
  collecting: [
    "PersistBundle",
    "PersistFolder",
    "PersistResource",
  ],
  converting: [
    "CandidateFinder",
    "CandidateLocation",
    "Candidate",
  ],
  frontend: [
    "CandidatesDataSource",
    "Interface",
  ],
  integration: [
    "FileFilters",
  ],
  loading: [
    "ArchiveLoader",
    "ArchiveStreamConverter",
  ],
  preferences: [
    "DynamicPrefs",
    "FileAssociations",
    "Prefs",
  ],
  processing: [
    "SourceFragment",
    "CssSourceFragment",
    "HtmlSourceFragment",
    "TagSourceFragment",
    "UrlListSourceFragment",
    "UrlSourceFragment",
  ],
  savecomplete: [
    "MafSaveComplete",
    "SaveCompletePersist",
  ],
  savefrontend: [
    "TabsDataSource",
  ],
  saving: [
    "Job",
    "JobRunner",
    "ExactPersistInitialJob",
    "ExactPersistJob",
    "ExactPersist",
    "ExactPersistParsedJob",
    "ExactPersistReference",
    "ExactPersistUnparsedJob",
    "MafArchivePersist",
    "MafWebProgressListener",
    "SaveArchiveJob",
    "SaveContentJob",
    "SaveJob",
  ],
  startup: [
    "HelperAppsWrapper",
    "StartupEvents",
    "StartupInitializer",
  ],
};

let EXPORTED_SYMBOLS = [];
for (let folderName of Object.keys(objectsByFolder)) {
  for (let objectName of objectsByFolder[folderName]) {
    EXPORTED_SYMBOLS.push(objectName);
    Services.scriptloader.loadSubScript("chrome://maf/content/" + folderName +
                                        "/" + objectName + ".js");
  }
}
