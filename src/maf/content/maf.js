/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.2.20
 *
 * Author: Christopher Ottley
 *
 * Description: The MAF extension for Firefox and Mozilla integrates page archive functionality in the browser
 *
 *  Copyright (c) 2004 Christopher Ottley.
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

/**
 *
 * Changes from 0.2.19 to 0.2.20 - Due 1st July
 *
 * Optional function that is executed when a single page is added to archive - An alert telling the user archive is complete
 * Opening tabs from browse dialog now uses blank tab if possible.
 * Binary Streams are now used for MHT encoding and decoding.
 * Fixed reader bug when reading file using MafUtils.
 * Fixed Quoted Printable encoding to not split = escaped codes across new lines when a line length limit exists.
 * MHT decoding now explicitly caters for parts having content type multipart/alternative.
 * Updated URL rewrite functionality - Support for rewritting urls that contain # for internal links.
 * Isolated native save code - Saving should work without modification across firefox and mozilla browsers.
 *                           - Temporarily disables download window showing up using prefence before saving.
 *
 *
 * Changes from 0.2.18 to 0.2.19 - Completed
 *
 * Fixed preferences bug that occurred on Mozilla when selecting options.
 * Added base URL rewrite functionality - URLs in new tabs are replaced by local URLs using currently open archives
 * Optimized MHT decoding to use Regular Expression for URL substitution.
 * Added base tag for relative URLs existing in decoded MHT files.
 * Fixed save as text, Missing meta-data no longer stops archiving process.
 * Saving works on Mozilla for Windows now.
 * GUI cleanup code - Show entry in Firefox's Tools -> Options -> Extensions
 *                  - Preferences can now be launched from Extensions -> Options
 * Open all entries in an archive by selecting the archive name and open in tabs.
 * Added capability to open archive from browse dialog.
 * Added shortcut keys alt-j for open archive, alt-m for browse open archives.
 *
 */

/**
 *
 *   Known Bugs:
 *     - Other content types (like PDF) haven't been tested
 *     - The GUI does not have the ability to add more archive app scripts or extensions
 *     - If there is a : in the title of something, the RDF reader freaks out
 */

/**
 * Contracts and interfaces used in the source.
 */
const localFileContractID = "@mozilla.org/file/local;1";
const localFileIID = Components.interfaces.nsILocalFile;
const processContractID = "@mozilla.org/process/util;1";
const processIID = Components.interfaces.nsIProcess;
const filePickerContractID = "@mozilla.org/filepicker;1";
const filePickerIID = Components.interfaces.nsIFilePicker;
const fileOutputStreamContractID = "@mozilla.org/network/file-output-stream;1";
const fileOutputStreamIID = Components.interfaces.nsIFileOutputStream;
const fileInputStreamContractID = "@mozilla.org/network/file-input-stream;1";
const fileInputStreamIID = Components.interfaces.nsIFileInputStream;
const scriptableInputStreamContractID = "@mozilla.org/scriptableinputstream;1";
const scriptableInputStreamIID = Components.interfaces.nsIScriptableInputStream;
const externalHelperAppServiceContractID = "@mozilla.org/uriloader/external-helper-app-service;1";
const externalHelperAppServiceIID = Components.interfaces.nsIExternalHelperAppService;
const downloadContractID = "@mozilla.org/download;1";
const downloadIID = Components.interfaces.nsIDownload;
const ioServiceNetworkContractID = "@mozilla.org/network/io-service;1";
const ioServiceNetworkIID = Components.interfaces.nsIIOService;
const xmlRDFDatasourceContractID = "@mozilla.org/rdf/datasource;1?name=xml-datasource";
const xmlRDFDatasourceIID = Components.interfaces.nsIRDFRemoteDataSource;
const rdfRDFServiceContractID = "@mozilla.org/rdf/rdf-service;1";
const rdfRDFServiceIID = Components.interfaces.nsIRDFService;
const prefSvcContractID = "@mozilla.org/preferences-service;1";
const prefSvcIID = Components.interfaces.nsIPrefService;
const rdfRDFCServiceContractID = "@mozilla.org/rdf/container-utils;1";
const rdfRDFCServiceIID = Components.interfaces.nsIRDFContainerUtils;
const appShellContractID = "@mozilla.org/appshell/appShellService;1";
const appShellIID = Components.interfaces.nsIAppShellService;
const asWinMedContractID = "@mozilla.org/appshell/window-mediator;1";
const asWinMedIID = Components.interfaces.nsIWindowMediator;
const rdfDatasourceInMemoryContractID = "@mozilla.org/rdf/datasource;1?name=in-memory-datasource";
const rdfXMLSerializerContractID = "@mozilla.org/rdf/xml-serializer;1";
const rdfXMLSerializerIID = Components.interfaces.nsIRDFXMLSerializer;
const urlContractID = "@mozilla.org/network/standard-url;1";
const urlIID = Components.interfaces.nsIURL;
const mimeServiceContractID = "@mozilla.org/mime;1";
const mimeServiceIID = Components.interfaces.nsIMIMEService;
const binaryInputStreamContractID = "@mozilla.org/binaryinputstream;1";
const binaryInputStreamIID = Components.interfaces.nsIBinaryInputStream;
const binaryOutputStreamContractID = "@mozilla.org/binaryoutputstream;1";
const binaryOutputStreamIID = Components.interfaces.nsIBinaryOutputStream;

const webBrowserPersistIID = Components.interfaces.nsIWebBrowserPersist;
const rdfDatasourceIID = Components.interfaces.nsIRDFDataSource;
const rdfResourceIID = Components.interfaces.nsIRDFResource;
const rdfXMLSourceIID = Components.interfaces.nsIRDFXMLSource;

const MAFNamespaceId = "MAF";
const MAFNamespace = "http://maf.mozdev.org/metadata/rdf#";

const MAFRDFTemplate = '<?xml version="1.0"?>\n' +
  '<RDF:RDF xmlns:'+ MAFNamespaceId +'="'+ MAFNamespace +'"\n' +
  '     xmlns:NC="http://home.netscape.com/NC-rdf#"\n' +
  '     xmlns:RDF="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
  '  <RDF:Description about="urn:root">\n'+
  '  </RDF:Description>\n' +
  '</RDF:RDF>\n';

/** The global RDF service object. */
var gRDFService = Components.classes[rdfRDFServiceContractID].getService(rdfRDFServiceIID);

/** The global RDF Container Service object. */
var gRDFCService = Components.classes[rdfRDFCServiceContractID].getService(rdfRDFCServiceIID);


/**
 * Saving the document specified occurs in a seperate thread,
 * so an object with its own timer is used to check the status
 * of the download before an archive script is invoked.
 */
function MafArchiver(aDocument, tempPath, scriptPath, archivePath, dateTimeArchived) {
  /** The document to archive. */
  this.aDocument = aDocument,

  /** The path of the temp folder to use. */
  this.tempPath = tempPath,

  /** The path of the archive script to use. */
  this.scriptPath = scriptPath,

  /** The full path of the archive file to archive to. */
  this.archivePath = archivePath,

  /** When this document was archived. */
  this.dateTimeArchived = dateTimeArchived,

  /** The folder number used in the archive. */
  this.folderNumber = dateTimeArchived.valueOf()+"_"+Math.floor(Math.random()*1000),

  /** Keeps track of the timer used to check the download status. */
  this.timerId = null,

  /** Flag to ensure the start function isn't called twice. */
  this.started = false,

  this.downloadComplete = false,

  /**
   * Starts the download process and the interval checking the download status.
   */
  this.start = function() {
    if (!this.started) {
      this.started = true;
      MafNativeFileSave.saveFile(this.aDocument, MafUtils.appendToDir(this.tempPath, this.folderNumber), "index.html", this);
      this.timerId = setInterval(this._checkDownloadComplete, 1000, this);
    }
  },

  /**
   * Clears the interval timer if the download is complete.
   * Also triggers the archive download function.
   */
  this._checkDownloadComplete = function(objMafArchiver) {
    // If the download is complete, add to the archive
    if (objMafArchiver.dl!=null) {

      var tempArchiveFolder = MafUtils.appendToDir(objMafArchiver.tempPath, objMafArchiver.folderNumber);

      if ((objMafArchiver.dl.percentComplete == 100) &&
          (MafUtils.checkFileExists(MafUtils.appendToDir(tempArchiveFolder, objMafArchiver.indexfilename)))) {
        clearInterval(objMafArchiver.timerId);
        objMafArchiver.dl = null;
        objMafArchiver.downloadComplete = true;
        objMafArchiver.addMetaData(objMafArchiver);
        objMafArchiver.archiveDownload(objMafArchiver.scriptPath,
                                       objMafArchiver.archivePath,
                                       objMafArchiver.folderNumber);

        // Remove it after 5 seconds
        setTimeout(objMafArchiver._removeFolder, 5000, tempArchiveFolder);
        if (typeof(objMafArchiver.oncomplete) != "undefined") {
          objMafArchiver.oncomplete();
        }
      }
    }
  },

  /**
   * Removes the specified folder if it exists.
   */
  this._removeFolder = function(folderToRemove) {
    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(folderToRemove);
    if (oDir.exists() && oDir.isDirectory()) {
      oDir.remove(true);
    }
  },

  /**
   * Adds RDF files containing Meta Data about the saved page
   * such as original URL, date/time saved and page history
   * METAXXX - Page history not implemented as yet.
   * METAXXX - For future, also save scroll position and text zoom.
   * METAXXX - History index
   */
  this.addMetaData = function(objMafArchiver) {

    destMetaDataFolder = MafUtils.appendToDir(objMafArchiver.tempPath, objMafArchiver.folderNumber);
    // Create index.rdf in the folderNumber and
    // Get a referance to index.rdf's data source
    var indexDS = MafUtils.createRDF(destMetaDataFolder, "index.rdf");

    try {
      // Add url data
      MafUtils.addStringData(indexDS, "originalurl", objMafArchiver.aDocument.location.href);

      if (objMafArchiver.aDocument.title != "") {
        // Add title
        MafUtils.addStringData(indexDS, "title", objMafArchiver.aDocument.title);
      } else {
        MafUtils.addStringData(indexDS, "title", "Unknown");
      }
      // Add Date/Time archived data
      MafUtils.addStringData(indexDS, "archivetime", objMafArchiver.dateTimeArchived);
      // Add index file data
      MafUtils.addStringData(indexDS, "indexfilename", objMafArchiver.indexfilename);

    } catch(e) {

    }
    // Write changes to physical file
    indexDS.Flush();


    // Create history.rdf in the folderNumber and
    // Get a reference to history.rdf
    //var historyDS = MafUtils.createRDF(destMetaDataFolder, "history.rdf");

    // Add history information

    // Write changes to physical file
    //historyDS.Flush();
  },

  /**
   * Archives the downloaded file(s).
   */
  this.archiveDownload = function(program, archivefile, sourcepath) {
    if (program == MafMHTHander.MHT_ARCHIVE_PROG_ID) {
      MafMHTHander.archiveDownload(archivefile, sourcepath);
    } else {
    /** If program is nothing then don't try to run it. */
    if (program != "") {

      if (MafPreferences.win_invisible) {
        localProgram = MafPreferences.win_wscriptexe;
        localProgramArgs = new Array();
        localProgramArgs[localProgramArgs.length] = MafPreferences.win_invisiblevbs;
        localProgramArgs[localProgramArgs.length] = program;
      } else {
        localProgram = program;
        localProgramArgs = new Array();
      }

      try {
        var oProgram = Components.classes[localFileContractID].getService(localFileIID);
        oProgram.initWithPath(localProgram);
      } catch(e) {
        alert("Could not find program: " + program + " \n" + e);
      }

      try {
        var oProcess = Components.classes[processContractID].createInstance(processIID);
      } catch (e) {
        alert("Could not create process:\n" + e);
      }

      oProcess.init(oProgram);

      localProgramArgs[localProgramArgs.length] = archivefile;
      localProgramArgs[localProgramArgs.length] = sourcepath;

      oProcess.run(true, localProgramArgs, localProgramArgs.length);
    }

    }
  }

};


/**
 * An object responsible for performing the calls to save complete pages
 * duplicated from existing code in chrome://browser/content/contentAreaUtils.js
 * It is becoming increasingly difficult to integrate with the native call to
 * the code, so duplicate it, adjust it and use it instead of the original.
 */
var MafNativeFileSave = {

  kSaveAsType_Complete: 0,   // Save document with attached objects

  kSaveAsType_URL: 1,        // Save document or URL by itself

  kSaveAsType_Text: 2,       // Save document, converting to plain text.

  /**
   * Trigger the file save process with the specified data structure.
   */
  saveFile: function(aDocument, aSaveDocPath, aSaveDocFileName, aObjMafArchiver) {
    var data = {
      url: aDocument.location.href,
      fileName: null,
      filePickerTitle: null,
      document: aDocument,
      bypassCache: false,
      window: window,
      saveDocPath: aSaveDocPath,
      saveDocFileName: aSaveDocFileName,
      objMafArchiver: aObjMafArchiver
    };

    var sniffer = new MafNativeFileSave_nsHeaderSniffer(aDocument.location.href, this.foundHeaderInfo, data, true);
  },

foundHeaderInfo: function(aSniffer, aData, aSkipPrompt) {

  var contentType = aSniffer.contentType;
  var contentEncodingType = aSniffer.contentEncodingType;

  var shouldDecode = false;
  // Are we allowed to decode?
  try {
    const helperAppService =
      Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"].
        getService(Components.interfaces.nsIExternalHelperAppService);
    var url = aSniffer.uri.QueryInterface(Components.interfaces.nsIURL);
    var urlExt = url.fileExtension;
    if (helperAppService.applyDecodingForExtension(urlExt,
                                                   contentEncodingType)) {
      shouldDecode = true;
    }
  }
  catch (e) {
  }

  var isDocument = aData.document != null && MafNativeFileSave.isDocumentType(contentType);
  if (!isDocument && !shouldDecode && contentEncodingType) {
    // The data is encoded, we are not going to decode it, and this is not a
    // document save so we won't be doing a "save as, complete" (which would
    // break if we reset the type here).  So just set our content type to
    // correspond to the outermost encoding so we get extensions and the like
    // right.
    contentType = contentEncodingType;
  }

  var file = null;
  var saveAsType = MafNativeFileSave.kSaveAsType_URL;
  try {
    file = aData.fileName.QueryInterface(Components.interfaces.nsILocalFile);
  }
  catch (e) {
    var saveAsTypeResult = { rv: 0 };
    file = MafNativeFileSave.getTargetFile(aData, aSniffer, contentType, isDocument, aSkipPrompt, saveAsTypeResult);
    if (!file)
      return;
    saveAsType = saveAsTypeResult.rv;
  }

  // If we're saving a document, and are saving either in complete mode or
  // as converted text, pass the document to the web browser persist component.
  // If we're just saving the HTML (second option in the list), send only the URI.
  var source = (isDocument && saveAsType != MafNativeFileSave.kSaveAsType_URL) ? aData.document : aSniffer.uri;
  var persistArgs = {
    source      : source,
    contentType : (isDocument && saveAsType == MafNativeFileSave.kSaveAsType_Text) ? "text/plain" : contentType,
    target      : MafNativeFileSave.makeFileURL(file),
    postData    : aData.document ? MafNativeFileSave.getPostData() : null,
    bypassCache : aData.bypassCache
  };

  var persist = MafNativeFileSave.makeWebBrowserPersist();

  // Calculate persist flags.
  const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  const flags = nsIWBP.PERSIST_FLAGS_NO_CONVERSION | nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
  if (aData.bypassCache)
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
  else
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

  if (shouldDecode)
    persist.persistFlags &= ~nsIWBP.PERSIST_FLAGS_NO_CONVERSION;

  // Create download and initiate it (below)
  aData.objMafArchiver.dl = Components.classes["@mozilla.org/download;1"].createInstance(Components.interfaces.nsIDownload);

  if (isDocument && saveAsType != this.kSaveAsType_URL) {
    // Saving a Document, not a URI:
    var filesFolder = null;
    if (persistArgs.contentType != "text/plain") {
      // Create the local directory into which to save associated files.
      filesFolder = file.clone();

      var nameWithoutExtension = filesFolder.leafName;
      nameWithoutExtension = nameWithoutExtension.substring(0, nameWithoutExtension.lastIndexOf("."));
      var filesFolderLeafName = getStringBundle().formatStringFromName("filesFolder",
                                                                       [nameWithoutExtension],
                                                                       1);

      filesFolder.leafName = filesFolderLeafName;
    }

    var encodingFlags = 0;
    if (persistArgs.contentType == "text/plain") {
      encodingFlags |= nsIWBP.ENCODE_FLAGS_FORMATTED;
      encodingFlags |= nsIWBP.ENCODE_FLAGS_ABSOLUTE_LINKS;
      encodingFlags |= nsIWBP.ENCODE_FLAGS_NOFRAMES_CONTENT;
    }

    // Save preference to show download window
    var dwprefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("browser.download.manager.");

    var showWhenStarting = dwprefs.getBoolPref("showWhenStarting");

    // Set to false
    dwprefs.setBoolPref("showWhenStarting", false);

    const kWrapColumn = 80;
    aData.objMafArchiver.dl.init(aSniffer.uri, persistArgs.target, null, null, null, persist);
    persist.saveDocument(persistArgs.source, persistArgs.target, filesFolder,
                         persistArgs.contentType, encodingFlags, kWrapColumn);

    // Return download window preference to saved value
    dwprefs.setBoolPref("showWhenStarting", showWhenStarting);

  } else {
    // Save preference to show download window
    var dwprefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("browser.download.manager.");

    var showWhenStarting = dwprefs.getBoolPref("showWhenStarting");

    // Set to false
    dwprefs.setBoolPref("showWhenStarting", false);

    aData.objMafArchiver.dl.init(source, persistArgs.target, null, null, null, persist);
    persist.saveURI(source, null, MafNativeFileSave.getReferrer(document), persistArgs.postData, null, persistArgs.target);

    // Return download window preference to saved value
    dwprefs.setBoolPref("showWhenStarting", showWhenStarting);
  }
},

makeURL: function(aURL)
{
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
  return ioService.newURI(aURL, null, null);
},

makeFileURL: function(aFile)
{
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                .getService(Components.interfaces.nsIIOService);
  return ioService.newFileURI(aFile);
},

makeWebBrowserPersist: function()
{
  const persistContractID = "@mozilla.org/embedding/browser/nsWebBrowserPersist;1";
  const persistIID = Components.interfaces.nsIWebBrowserPersist;
  return Components.classes[persistContractID].createInstance(persistIID);
},

isDocumentType: function(aContentType)
{
  switch (aContentType) {
  case "text/html":
    return true;
  case "text/xml":
  case "application/xhtml+xml":
  case "application/xml":
    return false; // XXX Disables Save As Complete until it works for XML
  }
  return false;
},

isContentFrame: function(aFocusedWindow)
{
  if (!aFocusedWindow)
    return false;

  var focusedTop = Components.lookupMethod(aFocusedWindow, 'top')
                             .call(aFocusedWindow);

  return (focusedTop == window.content);
},

getContentFrameURI: function(aFocusedWindow)
{
  var contentFrame = MafNativeFileSave.isContentFrame(aFocusedWindow) ? aFocusedWindow : window.content;
  if (contentFrame)
    return Components.lookupMethod(contentFrame, 'location').call(contentFrame).href;
  else
    return null;
},

getReferrer: function(doc)
{
  var focusedWindow = doc.commandDispatcher.focusedWindow;
  var sourceURL = MafNativeFileSave.getContentFrameURI(focusedWindow);

  if (sourceURL) {
    try {
      return MafNativeFileSave.makeURL(sourceURL);
    }
    catch (e) { }
  }
  return null;
},

getPostData: function()
{
  try {
    var sessionHistory = getWebNavigation().sessionHistory;
    entry = sessionHistory.getEntryAtIndex(sessionHistory.index, false);
    entry = entry.QueryInterface(Components.interfaces.nsISHEntry);
    return entry.postData;
  }
  catch (e) {
  }
  return null;
},

  /**
   * Based on code found in getTargetFile in contentAreaUtils.js
   * except it does not prompt the user for the file name and path.
   * Instead uses values stored in the aData record structure.
   */
getTargetFile: function(aData, aSniffer, aContentType, aIsDocument, aSkipPrompt, aSaveAsTypeResult)
{

  aSaveAsTypeResult.rv = MafNativeFileSave.kSaveAsType_Complete;

  // Determine what the 'default' string to display in the File Picker dialog
  // should be.
  var defaultFileName = getDefaultFileName(aData.fileName,
                                           aSniffer.suggestedFileName,
                                           aSniffer.uri,
                                           aData.document);

  var defaultExtension = getDefaultExtension(defaultFileName, aSniffer.uri, aContentType);

  var defaultString = getNormalizedLeafName("index", defaultExtension);

  aData.objMafArchiver.indexfilename = defaultString;

    /** Used to be the default download folder preference. Now it's whatever folder was specified in the
        data structure. */
  var dir = null;
  try {
    dir = Components.classes[localFileContractID].getService(localFileIID);
    dir.initWithPath(aData.saveDocPath);

    // Make the directory!!!
    if (!dir.exists()) {
      dir.create(0x01, 0777);
    }
  }
  catch (e) {

  }

  var file;

    // ben 07/31/2003:
    // We don't nullcheck dir here because dir should never be null if we get here
    // unless something is badly wrong, and if it is, I want to know about it in
    // bugs.
    dir.append(defaultString);
    file = dir;

    // Since we're automatically downloading, we don't get the file picker's
    // logic to check for existing files, so we need to do that here.
    //
    // Note - this code is identical to that in
    //   browser/components/downloads/content/nsHelperAppDlg.js.
    // If you are updating this code, update that code too! We can't share code
    // here since that code is called in a js component.
    while (file.exists()) {
      var parts = /.+-(\d+)(\..*)?$/.exec(file.leafName);
      if (parts) {
        file.leafName = file.leafName.replace(/((\d+)\.)/,
                                              function (str, p1, part, s) {
                                                return (parseInt(part) + 1) + ".";
                                              });
      }
      else {
        file.leafName = file.leafName.replace(/\./, "-1$&");
      }
    }


  return file;

}

};


/**
 * Code copied wholesale from contentAreaUtils.js
 * Name changed.
 */
function MafNativeFileSave_nsHeaderSniffer(aURL, aCallback, aData, aSkipPrompt)
{
  this.mCallback = aCallback;
  this.mData = aData;
  this.mSkipPrompt = aSkipPrompt;

  this.uri = makeURL(aURL);

  this.linkChecker = Components.classes["@mozilla.org/network/urichecker;1"]
    .createInstance(Components.interfaces.nsIURIChecker);
  this.linkChecker.init(this.uri);

  var flags;
  if (aData.bypassCache) {
    flags = Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
  } else {
    flags = Components.interfaces.nsIRequest.LOAD_FROM_CACHE;
  }
  this.linkChecker.loadFlags = flags;

  this.linkChecker.asyncCheck(this, null);
};

/**
 * Code copied wholesale from contentAreaUtils.js
 */
MafNativeFileSave_nsHeaderSniffer.prototype = {

  // ---------- nsISupports methods ----------
  QueryInterface: function (iid) {
    if (!iid.equals(Components.interfaces.nsIRequestObserver) &&
        !iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIInterfaceRequestor)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    return this;
  },

  // ---------- nsIInterfaceRequestor methods ----------
  getInterface : function(iid) {
    if (iid.equals(Components.interfaces.nsIAuthPrompt)) {
      // use the window watcher service to get a nsIAuthPrompt impl
      var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                         .getService(Components.interfaces.nsIWindowWatcher);
      return ww.getNewAuthPrompter(window);
    }
    Components.returnCode = Components.results.NS_ERROR_NO_INTERFACE;
    return null;
  },

  // ---------- nsIRequestObserver methods ----------
  onStartRequest: function (aRequest, aContext) { },

  onStopRequest: function (aRequest, aContext, aStatus) {
    try {
      if (aStatus == 0) { // NS_BINDING_SUCCEEDED, so there's something there
        var linkChecker = aRequest.QueryInterface(Components.interfaces.nsIURIChecker);
        var channel = linkChecker.baseChannel;
        this.contentType = channel.contentType;
        try {
          var httpChannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
          var encodedChannel = channel.QueryInterface(Components.interfaces.nsIEncodedChannel);
          this.contentEncodingType = null;
          // There may be content-encodings on the channel.  Multiple content
          // encodings are allowed, eg "Content-Encoding: gzip, uuencode".  This
          // header would mean that the content was first gzipped and then
          // uuencoded.  The encoding enumerator returns MIME types
          // corresponding to each encoding starting from the end, so the first
          // thing it returns corresponds to the outermost encoding.
          var encodingEnumerator = encodedChannel.contentEncodings;
          if (encodingEnumerator && encodingEnumerator.hasMore()) {
            try {
              this.contentEncodingType = encodingEnumerator.getNext();
            } catch (e) {
            }
          }
          this.mContentDisposition = httpChannel.getResponseHeader("content-disposition");
        }
        catch (e) {
        }
        if (!this.contentType || this.contentType == "application/x-unknown-content-type") {
          // We didn't get a type from the server.  Fall back on other type detection mechanisms
          throw "Unknown Type";
        }
      }
      else {
        dump("Error saving link aStatus = 0x" + aStatus.toString(16) + "\n");
        var bundle = getStringBundle();
        var errorTitle = bundle.GetStringFromName("saveLinkErrorTitle");
        var errorMsg = bundle.GetStringFromName("saveLinkErrorMsg");
        const promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
        promptService.alert(this.mData.window, errorTitle, errorMsg);
        return;
      }
    }
    catch (e) {
      if (this.mData.document) {
        this.contentType = this.mData.document.contentType;
      } else {
        var type = getMIMETypeForURI(this.uri);
        if (type)
          this.contentType = type;
      }
    }
    this.mCallback(this, this.mData, this.mSkipPrompt);
  },

  // ------------------------------------------------

  get promptService()
  {
    var promptSvc;
    try {
      promptSvc = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
      promptSvc = promptSvc.QueryInterface(Components.interfaces.nsIPromptService);
    }
    catch (e) {}
    return promptSvc;
  },

  get suggestedFileName()
  {
    var fileName = "";

    if (this.mContentDisposition) {
      const mhpContractID = "@mozilla.org/network/mime-hdrparam;1"
      const mhpIID = Components.interfaces.nsIMIMEHeaderParam;
      const mhp = Components.classes[mhpContractID].getService(mhpIID);
      var dummy = { value: null }; // To make JS engine happy.
      var charset = getCharsetforSave(null);

      try {
        fileName = mhp.getParameter(this.mContentDisposition, "filename", charset, true, dummy);
      }
      catch (e) {
        try {
          fileName = mhp.getParameter(this.mContentDisposition, "name", charset, true, dummy);
        }
        catch (e) {
        }
      }
    }
    fileName = fileName.replace(/^"|"$/g, "");
    return fileName;
  }
};


/**
 * Allows the archiving of multiple tabs.
 */
function MafTabArchiver(browsers, tempPath, scriptPath, archivePath) {
  /** The tabs to archive. */
  this.browsers = browsers,

  /** The path of the temp folder to use. */
  this.tempPath = tempPath,

  /** The path of the archive script to use. */
  this.scriptPath = scriptPath,

  /** The full path of the archive file to archive to. */
  this.archivePath = archivePath,

  /** Keeps track of the timer used to check the download status. */
  this.timerId = null,

  /** Flag to ensure the start function isn't called twice. */
  this.started = false,

  /** If all the tabs have finished downloading. */
  this.downloadComplete = false,

  /** The archiver objects used to save. */
  this.MafArchivers = new Array(),

  /** The current tab being saved. */
  this.currentMafArchiverIndex = 0;

  /**
   * Starts the download process and the interval checking the download status.
   * An object is created for each tab that is saving,
   * when it is finished, the next one starts.
   */
  this.start = function() {
    if (!this.started) {
      this.started = true;
      // Should always be true, but eh.
      if (browsers.length>0) {
        this.MafArchivers[this.MafArchivers.length] = new MafArchiver(browsers[0].contentDocument, tempPath, scriptPath, archivePath, new Date());
        this.MafArchivers[this.currentMafArchiverIndex].start();
        this.timerId = setInterval(this._checkDownloadComplete, 1000, this);
      }
    }
  },


  this.stop = function() {
    clearInterval(this.timerId);
  }

  /**
   * Clears the interval timer if the download is complete.
   * Also triggers the archive download function.
   */
  this._checkDownloadComplete = function(objMafTabArchiver) {
    // If the current download is complete, start the next one

    if (objMafTabArchiver.MafArchivers!=null) {
      if (objMafTabArchiver.currentMafArchiverIndex < objMafTabArchiver.browsers.length) {
        if (objMafTabArchiver.MafArchivers[objMafTabArchiver.currentMafArchiverIndex].downloadComplete == true) {
          if (objMafTabArchiver.fnProgressUpdater != null) {
            percentage = Math.floor((objMafTabArchiver.currentMafArchiverIndex/objMafTabArchiver.browsers.length)*100);
            objMafTabArchiver.fnProgressUpdater(percentage);
          }
          objMafTabArchiver.currentMafArchiverIndex += 1;
          objMafTabArchiver.MafArchivers[objMafTabArchiver.MafArchivers.length] = new MafArchiver(objMafTabArchiver.browsers[objMafTabArchiver.currentMafArchiverIndex].contentDocument, tempPath, scriptPath, archivePath, new Date());
          objMafTabArchiver.MafArchivers[objMafTabArchiver.currentMafArchiverIndex].start();
        }
      } else {
        clearInterval(objMafTabArchiver.timerId);
        if (objMafTabArchiver.fnProgressUpdater != null) {
          objMafTabArchiver.fnProgressUpdater(100);
        }
        objMafTabArchiver.downloadComplete = true;
      }
    } else {
      clearInterval(objMafTabArchiver.timerId);
    }
  },

  /**
   * Access method to set the progress update function
   * This is the function that is called whenever there is a change
   * in progress
   */
  this.setProgressUpdater = function(fnProgressUpdater) {
    this.fnProgressUpdater = fnProgressUpdater;
  }

};


/**
 * Extracts the archive to the specified path
 */
function MafTabExpander(tempPath, scriptPath, archivePath, folderNumber) {
  /** The path of the temp folder to use. */
  this.tempPath = tempPath,

  /** The path of the archive script to use. */
  this.scriptPath = scriptPath,

  /** The full path of the archive file to archive to. */
  this.archivePath = archivePath,

  /** Flag to ensure the start function isn't called twice. */
  this.started = false,

  /** The folder holding the expanded archive contents. */
  this.folderNumber = folderNumber,

  /**
   * Schedules the extract process to start.
   */
  this.start = function() {
    if (!this.started) {
      this.started = true;
      this.timerId = setTimeout(this._startExtract, 500, this);
    }
  },

  /**
   * Starts the extract process.
   */
  this._startExtract = function(objExtractor) {
    Maf.extractFromArchive(objExtractor.scriptPath, objExtractor.archivePath, MafUtils.appendToDir(objExtractor.tempPath, objExtractor.folderNumber));
    objExtractor.fnProgressUpdater(100);
  },


  /**
   * Can't kill the process, so stop does nothing really.
   */
  this.stop = function() {

  },

  /**
   * Access method to set the progress update function
   * This is the function that is called whenever there is a change
   * in progress
   */
  this.setProgressUpdater = function(fnProgressUpdater) {
    this.fnProgressUpdater = fnProgressUpdater;
  }

};

/**
 * Main object
 */
var Maf = {

  /**
   * Extract the archive using the specified program
   */
  extractFromArchive: function(program, archivefile, destpath) {
    if (program == MafMHTHander.MHT_EXTRACT_PROG_ID) {
      MafMHTHander.extractFromArchive(archivefile, destpath);
    } else {
    /** If program is nothing then don't try to run it. */
    if (program != "") {

      if (MafPreferences.win_invisible) {
        localProgram = MafPreferences.win_wscriptexe;
        localProgramArgs = new Array();
        localProgramArgs[localProgramArgs.length] = MafPreferences.win_invisiblevbs;
        localProgramArgs[localProgramArgs.length] = program;
      } else {
        localProgram = program;
        localProgramArgs = new Array();
      }

      try {
        var oProgram = Components.classes[localFileContractID].getService(localFileIID);
        oProgram.initWithPath(localProgram);
      } catch(e) {
        alert("Could not find program: " + program + " \n" + e);
      }

      try {
        var oProcess = Components.classes[processContractID].createInstance(processIID);
      } catch (e) {
        alert("Could not create process:\n" + e);
      }

      oProcess.init(oProgram);

      localProgramArgs[localProgramArgs.length] = archivefile;
      localProgramArgs[localProgramArgs.length] = destpath;

      oProcess.run(true, localProgramArgs, localProgramArgs.length);
    }

    }
  },

  /**
   * Save a single web page in an archive
   */
  saveAsWebPageComplete: function(aDocument, tempPath, scriptPath, archivePath) {
    var dateTimeArchived = new Date();

    var objMafArchiver = new MafArchiver(aDocument, tempPath, scriptPath, archivePath, dateTimeArchived);
    objMafArchiver.oncomplete = Maf.onSaveAsWebPageComplete;
    objMafArchiver.start();
  },

  /**
   * If a single page is saved, this is called as visual feedback to the user.
   */
  onSaveAsWebPageComplete: function() {
    alert("Archive operation complete");
  },

  /**
   * Save all open tabs in an archive
   */
  saveAllTabsComplete: function(browsers, tempPath, scriptPath, archivePath) {
    var objMafTabArchiver = new MafTabArchiver(browsers, tempPath, scriptPath, archivePath);
    objMafTabArchiver.start();
    MafUtils.showDownloadTabsDLG(objMafTabArchiver);
  },

  /**
   * Open a MAF archive and add the meta-data to the global state
   */
  openFromArchive: function(tempPath, scriptPath, archivePath) {
    var dateTimeExpanded = new Date();

    var folderNumber = dateTimeExpanded.valueOf()+"_"+Math.floor(Math.random()*1000);

    var objMafTabExpander = new MafTabExpander(tempPath, scriptPath, archivePath, folderNumber);
    objMafTabExpander.start();
    MafUtils.showOpenTabsDLG(objMafTabExpander);

    MafState.openArchives.push(MafUtils.appendToDir(tempPath, folderNumber));

    var archiveLocalURLs = MafState.addArchiveInfo(tempPath, folderNumber, archivePath);

    if (MafPreferences.archiveOpenMode == MafPreferences.OPENMODE_ALLTABS) {
      MafUtils.openListInTabs(archiveLocalURLs);
    }

    if (MafPreferences.archiveOpenMode == MafPreferences.OPENMODE_SHOWDIALOG) {
      if (!MafUtils.isWindowOpen("chrome://maf/content/mafBrowseOpenArchivesDLG.xul")) {
        MafGUI.browseOpenArchives();
      }
    }
  }

};


/**
 * Holds GUI related logic.
 */
var MafGUI = {

  /**
   * Prompts the user for the archive to load and then loads it.
   */
  loadArchive: function() {
    var archiveToOpen = this.selectFileOpen();

    Maf.openFromArchive(MafPreferences.temp,
                        MafPreferences.programFromOpenIndex(archiveToOpen[0]), archiveToOpen[1]);
  },

  /**
   * Prompts the user for the archive to save to and then adds the page to it.
   */
  addToArchive: function() {
    var archiveToAddTo = this.selectFileSave();

    Maf.saveAsWebPageComplete(window._content.document, MafPreferences.temp,
                              MafPreferences.programFromSaveIndex(archiveToAddTo[0]), archiveToAddTo[1]);
  },

  /**
   * Prompts the user for the archive to save to and then adds all tabbed pages to it.
   */
  addAllTabsToArchive: function() {
    var archiveToAddTo = this.selectFileSave();

    Maf.saveAllTabsComplete(window.getBrowser().browsers, MafPreferences.temp,
                            MafPreferences.programFromSaveIndex(archiveToAddTo[0]), archiveToAddTo[1]);
  },

  /**
   * Shows the Preferences
   */
  showPreferences: function() {
    MafUtils.showPreferencesDLG();
  },

  /**
   * Opens a File choose dialog with a save mode.
   * @return The file selected.
   */
  selectFileSave: function() {
    var filters = MafPreferences.getSaveFilters();

    var result = this.selectFile("Select MAF Archive:",
                                  filePickerIID.modeSave,
                                  filters);

    var selectedFileType = filters[result[1]][1];

    selectedFileType = selectedFileType.substring(1,selectedFileType.length);

    var filename = result[0].path;
    // if the file name does not end with the file type specified, tack it on

    if (filename.substring(filename.length-selectedFileType.length, filename.length).toLowerCase() !=
        selectedFileType.toLowerCase()) {
        filename += selectedFileType;
    }

    return [result[1], filename];
  },

  /**
   * Opens a File choose dialog with a open mode.
   * @return The file selected.
   */
  selectFileOpen: function() {
    var filters = MafPreferences.getOpenFilters();

    var result = this.selectFile("Select MAF Archive:",
                                  filePickerIID.modeOpen,
                                  filters);

    return [result[1], result[0].path];
  },

  /**
   * Shows the filepicker dialog with the appropriate filters.
   * @return The file selected.
   */
  selectFile: function(windowTitle, filePickerMode, filters) {
    var fp = Components.classes[filePickerContractID].createInstance(filePickerIID);
    fp.init(window, windowTitle, filePickerMode);


    for (var i=0; i<filters.length; i++) {
      var title = filters[i][0];
      var mask = filters[i][1];
      fp.appendFilter(title, mask);
    }

    if (filters.length==0) {
      fp.appendFilters(nsIFilePicker.filterAll);
    }
    var res=fp.show();
    return [fp.file, fp.filterIndex];
  },


  /**
   * Shows the filepicker dialog with the directory select mode.
   * @return The directory selected as a string.
   */
  selectDirectory: function(windowTitle, initialDirectory) {
    var result = initialDirectory;

    var fp = Components.classes[filePickerContractID].createInstance(filePickerIID);
    fp.init(window, windowTitle, filePickerIID.modeGetFolder);

    try {
      if (initialDirectory != null) {
        // Create a directory reference to use
        var dir = Components.classes[localFileContractID].getService(localFileIID);
        dir.initWithPath(initialDirectory);

        fp.displayDirectory = dir;
      }
    } catch(e) {

    }

    var res = fp.show();

    if (res == filePickerIID.returnOK) {
      var selDir = fp.file.QueryInterface(localFileIID);
      result = selDir.path;
    }

    return result;
  },

  /**
   * Shows the file picker dialog allowing the user to select ONLY a specific file.
   * @return The full file path and filename as a string
   */
  selectSpecificFile: function(windowTitle, initialFilePath, filterFilename) {
    var result = initialFilePath;

    try {
      var filter = [ [filterFilename, filterFilename] ];
      var fresult = this.selectFile(windowTitle,
                                     filePickerIID.modeOpen,
                                     filter);
      result = fresult[0].path;
    } catch(e) {

    }

    return result;
  },

  /**
   *  Browse the open archives that are available.
   */
  browseOpenArchives: function() {
    MafUtils.showBrowseOpenArchivesDLG();
  },

  /**
   * Show the about dialog
   */
  showAbout: function() {
    MafUtils.showAboutDLG();
  }

};


/**
 * Holds the state of the MAF archives, the meta-data for each open archive.
 * This is a local object, so for each window this is created.
 * A global object stored in a hidden window holds the real state.
 * If that is null, that state is saved using this object.
 * If it is not null, this object is ignored.
 */
var MafState = {

  /** A list of open archives. */
  openArchives: new Array(),

  /** A count of the number of open archives. */
  noOfArchives: 0,

  /** A list of local file urls and the network url it maps to */
  localFileToUrlMap: new Array(),

  /** A list of network urls and the local file url it maps to */
  urlToLocalFileMap: new Array(),

  /**
   * Add archive file info to the state.
   */
  addArchiveInfo: function(tempPath, foldernum, archivePath) {
    this.noOfArchives++;

    var archiveRootSubjectStr = "http://maf.mozdev.org/metadata/rdf/archive/" + this.noOfArchives + "/";

    archive1Subject = gRDFService.GetResource(archiveRootSubjectStr);
    archive1Sequence = gRDFCService.MakeSeq(this.datasource, archive1Subject);

    var localUrls = this.addArchivePagesToDatasource(tempPath, foldernum, archiveRootSubjectStr, archive1Sequence);

    var archiveRootSubject = gRDFService.GetResource(archiveRootSubjectStr);
    var archivePredicate = gRDFService.GetResource(MAFNamespace + "title");
    var archiveObject = gRDFService.GetResource("Archive " + this.noOfArchives);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    archivePredicate = gRDFService.GetResource(MAFNamespace + "localurl");
    archiveObject = gRDFService.GetResource(archivePath);

    this.datasource.Assert(archiveRootSubject, archivePredicate, archiveObject, true);

    this.archivesSequence.AppendElement(archive1Subject);

    return localUrls;
  },

  /**
   * For each saved page, there's an RDF file, process it to get the information.
   * Processing is split up into three loops because on windows local files initWithPath
   * causes something to freak out and stop working. Works fine as one loop in Linux.
   */
  addArchivePagesToDatasource: function(temp, expandedArchiveRoot, archiveSubjectRoot, archiveSequence) {
    try {

    var localUrls = new Array();

    var pageNo = 1;

    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(MafUtils.appendToDir(temp, expandedArchiveRoot));

    if (oDir.exists() && oDir.isDirectory()) {
      var entries = oDir.directoryEntries;

      var dirList = new Array();

      // For each folder in the expanded archive root
      while (entries.hasMoreElements()) {

        var currDir = entries.getNext();
        currDir.QueryInterface(localFileIID);

        if (currDir.isDirectory()) {
          var currArchivePath = MafUtils.getURI(currDir.nsIFile);

          dirList[dirList.length] = [currArchivePath, currDir.path]

        }
      }


      var indexList = new Array();

      for (var i=0; i<dirList.length; i++) {

          var indexrdffile = Components.classes[localFileContractID].getService(localFileIID);
          indexrdffile.initWithPath(dirList[i][1]);
          indexrdffile.append("index.rdf");

          var title = "Page " + pageNo;
          var originalurl = "Unknown";
          var archivetime = "Unknown";
          var indexfilename = "index.html";

            // If the metadata exists
            if (indexrdffile.exists()) {
              // Update the variables with the actual metadata info
              var rdfdataresult = this.getMetaDataFrom(indexrdffile, dirList[i][0]);
              if (rdfdataresult["title"] != "") {
                title = rdfdataresult["title"];
              }
              if (rdfdataresult["originalurl"] != "") {
                originalurl = rdfdataresult["originalurl"];
              }
              if (rdfdataresult["archivetime"] != "") {
                archivetime = rdfdataresult["archivetime"];
              }
              if (rdfdataresult["indexfilename"] != "") {
                indexfilename = rdfdataresult["indexfilename"];
              }
            }


         indexList[indexList.length] = [title, originalurl, archivetime, indexfilename];
      }


      for (var i=0; i<dirList.length; i++) {
          var indexhtmlfile = Components.classes[localFileContractID].getService(localFileIID);
          indexhtmlfile.initWithPath(dirList[i][1]);
          indexhtmlfile.append(indexList[i][3]);

          var thisPageRDFSubjectRoot = archiveSubjectRoot + "" + (i+1) + "/";

          // get file URL - temp + expandedArchiveRoot + currFolder + index.html
          var localurl = MafUtils.getURI(indexhtmlfile.nsIFile);

          localUrls[localUrls.length] = localurl;

          this.addPageInfoToMetaData(thisPageRDFSubjectRoot, indexList[i][0], indexList[i][1], indexList[i][2], localurl, archiveSequence);
      }

    }

    } catch(e) {
      alert(e);
    }

    return localUrls;
  },

  /**
   * Asserts the RDF info.
   */
  addPageInfoToMetaData: function(thisPageRDFSubjectRoot, title, originalurl, archivetime, localurl, archiveSequence) {
    // Add the page info to the metadata

    // This archive's unique archive URL resource
    var rootSubject = gRDFService.GetResource(thisPageRDFSubjectRoot);

    // Add the title
    var predicate = gRDFService.GetResource(MAFNamespace + "title");
    var object = gRDFService.GetResource(title);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the original url
    predicate = gRDFService.GetResource(MAFNamespace + "originalurl");
    object = gRDFService.GetResource(originalurl);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the archive time
    predicate = gRDFService.GetResource(MAFNamespace + "archivetime");
    object = gRDFService.GetResource(archivetime);
    this.datasource.Assert(rootSubject, predicate, object, true);

    // Add the local url
    predicate = gRDFService.GetResource(MAFNamespace + "localurl");
    object = gRDFService.GetResource(localurl);
    this.datasource.Assert(rootSubject, predicate, object, true);

    archiveSequence.AppendElement(rootSubject);

    // Add the info to a searchable URL map.
    this.localFileToUrlMap[localurl] = originalurl;
    this.urlToLocalFileMap[originalurl] = localurl;

    // If the original url has a # sign, add the original url without the # sign to the list
    if (originalurl.indexOf("#") > 0) {
      this.urlToLocalFileMap[originalurl.substring(0,originalurl.indexOf("#"))] = localurl;
    }
  },

  /**
   * Tries to read the data from the RDF for a specific file.
   */
  getMetaDataFrom: function(sourcefile, resourcePath) {
    var result = new Array();
    result["title"] = "Unknown";
    result["originalurl"] = "Unknown";
    result["archivetime"] = "Unknown";
    result["indexfilename"] = "index.html";


    var mdatasource;
    // If loading the data source is a problem, we've probably loaded it already
    try {
      mdatasource = Components.classes[xmlRDFDatasourceContractID].createInstance(xmlRDFDatasourceIID);
      mdatasource.Init(MafUtils.getURI(sourcefile.nsIFile));
      mdatasource.Refresh(true);
      mdatasource.QueryInterface(rdfDatasourceIID);
    } catch(e) {
      mdatasource = gRDFService.GetDataSource(MafUtils.getURI(sourcefile.nsIFile));
    }


    try {
      // This archive's unique archive URL resource
      var rootSubject = gRDFService.GetResource("urn:root");

      // Get the title
      var predicate = gRDFService.GetResource(MAFNamespace + "title");

      var titletarget = mdatasource.GetTarget(rootSubject, predicate, true);
      titletarget = titletarget.QueryInterface(rdfResourceIID);
      result["title"] = titletarget.Value;
      if (resourcePath.length < result["title"].length) {
        // If the resource is in the result, remove it
        if (result["title"].substring(0, resourcePath.length) == resourcePath) {
          result["title"] = result["title"].substring(resourcePath.length, result["title"].length);
        }
      }

      // Get the original url
      predicate = gRDFService.GetResource(MAFNamespace + "originalurl");

      var originalurltarget = mdatasource.GetTarget(rootSubject, predicate, true);
      originalurltarget = originalurltarget.QueryInterface(rdfResourceIID);
      result["originalurl"] = originalurltarget.Value;
      if (resourcePath.length < result["originalurl"].length) {
        // If the resource is in the result, remove it
        if (result["originalurl"].substring(0, resourcePath.length) == resourcePath) {
          result["originalurl"] = result["originalurl"].substring(resourcePath.length, result["originalurl"].length);
        }
      }

      // Get the archive time
      predicate = gRDFService.GetResource(MAFNamespace + "archivetime");

      var archivetimetarget = mdatasource.GetTarget(rootSubject, predicate, true);
      archivetimetarget = archivetimetarget.QueryInterface(rdfResourceIID);
      result["archivetime"] = archivetimetarget.Value;
      if (resourcePath.length < result["archivetime"].length) {
        // If the resource is in the result, remove it
        if (result["archivetime"].substring(0, resourcePath.length) == resourcePath) {
          result["archivetime"] = result["archivetime"].substring(resourcePath.length, result["archivetime"].length);
        }
      }

      // Get the index file name
      predicate = gRDFService.GetResource(MAFNamespace + "indexfilename");

      var indexfilenametarget = mdatasource.GetTarget(rootSubject, predicate, true);
      indexfilenametarget = indexfilenametarget.QueryInterface(rdfResourceIID);
      result["indexfilename"] = indexfilenametarget.Value;
      if (resourcePath.length < result["indexfilename"].length) {
        // If the resource is in the result, remove it
        if (result["indexfilename"].substring(0, resourcePath.length) == resourcePath) {
          result["indexfilename"] = result["indexfilename"].substring(resourcePath.length, result["indexfilename"].length);
        }
      }

    } catch (e) {

    }

    return result;
  },


  /**
   * Creates an in memory RDF data source
   */
  setupDataSource: function() {
    var ds = Components.classes[rdfDatasourceInMemoryContractID].createInstance();
    this.datasource = ds.QueryInterface(rdfDatasourceIID);

    var rootArchiveSubject = gRDFService.GetResource("http://maf.mozdev.org/metadata/rdf/open-archives");
    this.archivesSequence = gRDFCService.MakeSeq(this.datasource, rootArchiveSubject);

  }


};


/**
 * Helper function that lets one see the source to in memory rdf data sources
 */
function serialize(originalDatasource){
  var ser = Components.classes[rdfXMLSerializerContractID].getService(rdfXMLSerializerIID);

  ser.QueryInterface(rdfXMLSourceIID);

  var outputstream = {
    content:"",
    write:function(s, count) {
      this.content+=s;
      return count;
    },
    flush:function(){},
    close:function(){}
  };

  ser.init(originalDatasource);
  ser.Serialize(outputstream);
  alert(outputstream.content);
};


/**
 * Utility functions. Some functionality may still be moved here to increase modularity.
 */
var MafUtils = {

  /**
   * Cross platform append
   */
  appendToDir: function(initialDirectory, subDirectory) {
    var result = initialDirectory;
    try {
      var dir = Components.classes[localFileContractID].getService(localFileIID);
      dir.initWithPath(initialDirectory);
      dir.append(subDirectory);
      result = dir.path;
    } catch(e) {

    }
    return result;
  },

  /**
   * Create directory
   */
  createDir: function(dirToCreate) {
    var dir = null;
    try {
      dir = Components.classes[localFileContractID].getService(localFileIID);
      dir.initWithPath(dirToCreate);

      // Make the directory!!!
      if (!dir.exists()) {
        dir.create(0x01, 0777);
      }
    } catch (e) {

    }
    return dir;
  },


  /**
   * Create file
   */
  createFile: function(fileToCreate, contents) {
    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(fileToCreate);
      if (!oFile.exists()) {
        oFile.create(0x00, 0644);
      }
    } catch (e) {
      alert(e);
    }

    try {
      var oTransport = Components.classes[fileOutputStreamContractID].createInstance(fileOutputStreamIID);
      oTransport.init( oFile, 0x04 | 0x08 | 0x10, 064, 0 );
      oTransport.write(contents, contents.length);
      oTransport.close();
    } catch (e) {
      alert(e);
    }
  },


  /**
   * Create binary file
   */
  createBinaryFile: function(fileToCreate, contents) {
    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(fileToCreate);
      if (!oFile.exists()) {
        oFile.create(0x00, 0644);
      }
    } catch (e) {
      alert(e);
    }

    try {
      var oTransport = Components.classes[fileOutputStreamContractID].createInstance(fileOutputStreamIID);
      oTransport.init( oFile, 0x04 | 0x08 | 0x10, 064, 0 );

      var obj_BinaryIO = Components.classes[binaryOutputStreamContractID].createInstance(binaryOutputStreamIID);
      obj_BinaryIO.setOutputStream(oTransport);

      obj_BinaryIO.writeByteArray(contents, contents.length);
      oTransport.close();
    } catch (e) {
      alert(e);
    }
  },


  /**
   * Delete file
   */
  deleteFile: function(fileToDelete) {
    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(fileToDelete);
      if (oFile.exists()) {
        oFile.remove(true);
      }
    } catch (e) {

    }
  },

  /**
   * Returns true if the file in the path exists
   */
  checkFileExists: function(filePathToCheck) {
    var oFile = Components.classes[localFileContractID].getService(localFileIID);
    oFile.initWithPath(filePathToCheck);
    return oFile.exists();
  },

  /**
   * Based on the suggested filename, new file names are created so as
   * not to overwite existing ones.
   * Code from contentUtils.js
   */
  getUniqueFilename: function(destDir, suggestedFilename) {
    var dir = null;
    try {
      dir = Components.classes[localFileContractID].getService(localFileIID);
      dir.initWithPath(destDir);
    } catch (e) {

    }

    var file;

    dir.append(suggestedFilename);
    file = dir;

    while (file.exists()) {
      var parts = /.+-(\d+)(\..*)?$/.exec(file.leafName);
      if (parts) {
        file.leafName = file.leafName.replace(/((\d+)\.)/,
                                              function (str, p1, part, s) {
                                                return (parseInt(part) + 1) + ".";
                                              });
      }
      else {
        file.leafName = file.leafName.replace(/\./, "-1$&");
      }
    }


    return file.leafName;

  },


  /**
   * Read the contents of a file
   */
  readFile: function(str_Filename) {
    try {
      var obj_File = Components.classes[localFileContractID].createInstance(localFileIID);
      obj_File.initWithPath(str_Filename);

      var obj_InputStream = Components.classes[fileInputStreamContractID].createInstance(fileInputStreamIID);
      obj_InputStream.init(obj_File, 0x01, 0444, null);

      var obj_ScriptableIO = Components.classes[scriptableInputStreamContractID].createInstance(scriptableInputStreamIID);
      obj_ScriptableIO.init(obj_InputStream);
    } catch (e) {
      alert(e);
    }

    try {
      var str = obj_ScriptableIO.read(obj_File.fileSize);
    } catch (e) {

    }
    obj_ScriptableIO.close();
    obj_InputStream.close();

    return str;
  },


  /**
   * Read the contents of a file as bytes
   */
  readBinaryFile: function(str_Filename) {
    try {
      var obj_File = Components.classes[localFileContractID].createInstance(localFileIID);
      obj_File.initWithPath(str_Filename);

      var obj_InputStream = Components.classes[fileInputStreamContractID].createInstance(fileInputStreamIID);
      obj_InputStream.init(obj_File, 0x01, 0444, null);

      var obj_BinaryIO = Components.classes[binaryInputStreamContractID].createInstance(binaryInputStreamIID);

      obj_BinaryIO.setInputStream(obj_InputStream);
    } catch (e) {
      alert(e);
    }

    try {
      //var str = obj_BinaryIO.readBytes(obj_File.fileSize);

      var str = obj_BinaryIO.readByteArray(obj_File.fileSize);

    } catch (e) {
      alert(e);
    }
    obj_BinaryIO.close();
    obj_InputStream.close();

    return str;
  },

  /**
   * Create RDF file based on template.
   */
  createRDF: function(path, filename) {
    var dir = Components.classes[localFileContractID].getService(localFileIID);
    dir.initWithPath(path);
    dir.append(filename);

    try {
      var oFile = Components.classes[localFileContractID].createInstance(localFileIID);
      oFile.initWithPath(dir.path);
      if (!oFile.exists()) {
        oFile.create(0x00, 0644);
      }
    } catch (e) {
      alert(e);
    }

    try {
      var oTransport = Components.classes[fileOutputStreamContractID].createInstance(fileOutputStreamIID);
      oTransport.init( oFile, 0x04 | 0x08 | 0x10, 064, 0 );
      oTransport.write(MAFRDFTemplate, MAFRDFTemplate.length);
      oTransport.close();
    } catch (e) {
      alert(e);
    }

    // Load a remote data source
    var datasource = Components.classes[xmlRDFDatasourceContractID].createInstance(xmlRDFDatasourceIID);
    datasource.Init(MafUtils.getURI(oFile.nsIFile));
    datasource.Refresh(true);

    return datasource;
  },

  /**
   * Get the URL of the local file specified.
   */
  getURI: function(nsIFile) {
    var serv = Components.classes[ioServiceNetworkContractID].getService(ioServiceNetworkIID);
    var uri = serv.newFileURI(nsIFile);
    return uri.spec;
  },

  /**
   * Get URL from only a filename
   */
  getURIFromFilename: function(filename) {
    var oFile = Components.classes[localFileContractID].getService(localFileIID);
    oFile.initWithPath(filename);
    return this.getURI(oFile.nsIFile);
  },

  /**
   * Add string data to the data source.
   */
  addStringData: function(datasource, name, value) {
    var rootSubject = gRDFService.GetResource("urn:root");
    var predicate = gRDFService.GetResource(MAFNamespace + name);
    var object = gRDFService.GetResource(value);

    // Make sure we have an interface that we can assert to
    modDataSource = datasource.QueryInterface(rdfDatasourceIID);

    modDataSource.Assert(rootSubject,predicate,object,true);
  },

  /**
   * Shows the dialog to the user when saving tabs.
   */
  showDownloadTabsDLG: function(objMafArchiver) {
    const url = "chrome://maf/content/mafSaveTabsDLG.xul";

    var w = 400;
    var h = 50;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, objMafArchiver);
  },

  /**
   * Shows the dialog to the user when extracting files.
   */
  showOpenTabsDLG: function(objMafExpander) {
    const url = "chrome://maf/content/mafOpenTabsDLG.xul";

    var w = 400;
    var h = 50;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, objMafExpander);
  },

  /**
   * Shows the user some info about MAF
   */
  showAboutDLG: function() {
    const url = "chrome://maf/content/mafAboutDLG.xul";

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes";

    window.openDialog(url, "_blank", win_prefs);
  },

  /**
   * Shows the user the preferences dialog
   */
  showPreferencesDLG: function() {
    const url = "chrome://maf/content/mafPreferencesDLG.xul";

    var w = 500;
    var h = 500;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, MafPreferences, MafGUI);
  },

  /**
   * Shows the user a window that allows them to browse the open archives.
   */
  showBrowseOpenArchivesDLG: function() {
    const url = "chrome://maf/content/mafBrowseOpenArchivesDLG.xul";

    var w = 500;
    var h = 500;

    var sX = (window.screen.width/2)-(Math.round(w/2));
    var sY = (window.screen.height/2)-(Math.round(h/2));

    var win_prefs = "chrome,dialog,dependent=no,modal,resizable=yes,screenX="+ sX + ",screenY="+ sY +
                    ",width="+ w +",height=" + h;
    window.openDialog(url, "_blank", win_prefs, MafState, window, MafGUI, MafUtils);
  },

  /**
   * Obsolete method that attempts to open all expanded folders in a directory in tabs.
   * Does not use meta-data to determine what the index file is.
   */
  openDirInTabs: function(temp, expandedArchiveRoot) {
    var oBrowser = window.getBrowser();

    try {

    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(MafUtils.appendToDir(temp, expandedArchiveRoot));

    if (oDir.exists() && oDir.isDirectory()) {

      var entries = oDir.directoryEntries;

      // For each folder in the expanded archive root
      while (entries.hasMoreElements()) {
        currDir = entries.getNext();
        currDir.QueryInterface(localFileIID);

        if (currDir.isDirectory()) {

          currDir.append("index.html");

          // If index.html exists
          if (currDir.exists()) {
            // get file URL - temp + expandedArchiveRoot + currFolder + index.html
            url = this.getURI(currDir.nsIFile);
            oBrowser.addTab(url);
          }

        }

      }
    }

    } catch(e) {
      alert(e);
    }

  },

  /**
   * Opens a list of URLs in tabs.
   */
  openListInTabs: function(urlList) {
    var oBrowser = window.getBrowser();

    try {
      var triedFirstTab = false;
      for (var i=0; i<urlList.length; i++) {
        if (triedFirstTab) {
          oBrowser.addTab(urlList[i]);
        } else {
          triedFirstTab = true;
          if ((oBrowser.browsers.length == 1) && (oBrowser.currentURI.spec == "about:blank")) {
            oBrowser.loadURI(urlList[i], null, null);
          } else {
            oBrowser.addTab(urlList[i]);
          }

        }
      }
    } catch(e) {

    }

  },

  /**
   * Returns the number of open windows
   */
  getNumberOfOpenWindows: function() {
    var numberOfOpenWindows = 0;

    try {
      var wmI = Components.classes[asWinMedContractID].getService(asWinMedIID);
      var entries = wmI.getEnumerator(null);

      while (entries.hasMoreElements()) {
        currWindow = entries.getNext();
        numberOfOpenWindows++;
      }
    } catch (e) {
      alert(e);
    }

    return numberOfOpenWindows;
  },

  /**
   * Returns true if a window with that id is open
   */
  isWindowOpen: function(needleLocation) {
    var result = false;

    try {
      var wmI = Components.classes[asWinMedContractID].getService(asWinMedIID);
      var entries = wmI.getEnumerator(null);

      while (entries.hasMoreElements()) {
        currWindow = entries.getNext();
        if (currWindow.location == needleLocation) {
          result = true;
          break;
        }
      }
    } catch (e) {
      alert(e);
    }

    return result;
  },

  /**
   * Registered trigger event whenever a window is closed.
   */
  onWindowClose: function(evt) {

    // Check to see it's the last open window
    var numberOfOpenWindows = MafUtils.getNumberOfOpenWindows();

    // If it's the last window
    if (numberOfOpenWindows < 2) {
      // Get the temp folders used by open archive functions
      // delete each of those folders

      for (var i=0; i<MafState.openArchives.length; i++) {
        try {
          var oDir = Components.classes[localFileContractID].getService(localFileIID);
          oDir.initWithPath(MafState.openArchives[i]);

          if (oDir.exists() && oDir.isDirectory()) {
            oDir.remove(true);
          }
        } catch(e) {

        }
      }

      try {
        // The code below is technically not necessary, as this should only happen
        // when there are no more windows (app is closed). Data in the hidden window
        // should be gone too.

        // Get hidden window
        var appShell = Components.classes[appShellContractID].getService(appShellIID);
        var hiddenWnd = appShell.hiddenDOMWindow;
        hiddenWnd.MafState = null;
      } catch(e) {

      }
    }
  },

  /**
   * Whenever a new window is opened.
   */
  onWindowLoad: function(evt) {
    if (evt.originalTarget == "[object XULDocument]") {
      // New window

      // Get hidden window
      var appShell = Components.classes[appShellContractID].getService(appShellIID);
      var hiddenWnd = appShell.hiddenDOMWindow;

      // Store global MafState in hidden window
      if (typeof(hiddenWnd.MafState) == "undefined") {
        hiddenWnd.MafState = MafState;
      } else {
        MafState = hiddenWnd.MafState;
      }

    }

  },

  /**
   * Fired when a new tab is loaded.
   * Replaces original links in the tab being loaded with local links if possible.
   */
  onTabLoad: function(evt) {
    if (evt.originalTarget == "[object HTMLDocument]") {
      // New tab
      if (MafPreferences.urlRewrite) {
        // We have some work to do
        var links = evt.originalTarget.links;

        for (var j=0; j < links.length; j++) {
          if (typeof(MafState.urlToLocalFileMap[links[j].href]) != "undefined") {
            links[j].href=MafState.urlToLocalFileMap[links[j].href];
          } else {
            // See if it is hashed
            if (links[j].href.indexOf("#") > 0) {
              var hashPart = links[j].href.substring(links[j].href.indexOf("#"), links[j].href.length);
              var nonHashPart = links[j].href.substring(0, links[j].href.indexOf("#"));

              if (typeof(MafState.urlToLocalFileMap[nonHashPart]) != "undefined") {
                links[j].href=MafState.urlToLocalFileMap[nonHashPart] + hashPart;
              }
            }
          }
        }
      }
    }
  },

  /**
   * Adds a base tag to HTML.
   * Important so that relative urls not converted by save (such as paths to embedded objects,
   * relative form submit paths, javascripts, etc) can go online to get the missing data.
   */
  addBaseHref: function(sourceString, indexOriginalURL) {
    var resultString = "";
    var baseHrefString = "<base href=\"" + indexOriginalURL + "\" />";
    try {
      var headRe = new RegExp("<[^>]*head[^<]*>", "i"); // Match head tag
      var htmlRe = new RegExp("<[^>]*html[^<]*>", "i"); // Match html tag

      var headMatch = headRe.exec(sourceString);
      var htmlMatch = htmlRe.exec(sourceString);

      // If match head tag, place base href tag right after open head
      if (headMatch != null) {
        resultString = sourceString.substring(0, headMatch.index + headMatch.toString().length);
        resultString += baseHrefString;
        resultString += sourceString.substring(headMatch.index + headMatch.toString().length, sourceString.length);
      } else if(htmlMatch != null) {
        // If no head tag, place after html tag
        resultString = sourceString.substring(0, htmlMatch.index + htmlMatch.toString().length);
        resultString += baseHrefString;
        resultString += sourceString.substring(htmlMatch.index + htmlMatch.toString().length, sourceString.length);
      } else {
        // If no html tag (uhm, ok then) not html?

      }
    } catch(e) {

    }
    return resultString;
  },

  /**
   * Get the mime type for a URI using the MIME service
   */
  getMIMETypeForURI: function(url) {
    var result = null;
    try {
      // Create URI object from url string
      var ioService = Components.classes[ioServiceNetworkContractID].getService(ioServiceNetworkIID);
      var aURI = ioService.newURI(url, null, null);

      // Query MIME service
      var mimeSvc = Components.classes[mimeServiceContractID].getService(mimeServiceIID);
      result = mimeSvc.getTypeFromURI(aURI);

    } catch (e) {
      // Not available, network url and offline?
    }
    return result;
  }


};

/**
 * The MAF preferences.
 */
var MafPreferences = {

  /** The temp folder. */
  temp: "",

  /** The registered scripts used with archiving. */
  programExtensions: new Array(),

  /** The extension that handles *.maf by default. */
  defaultMAFExtensionIndex: 0,

  archiveOpenMode: 0,
     /** 0 - Do nothing. */
     /** 1 - Open all in new tabs. */
     /** 2 - Dialog box showing all archived files, select to open. */

  OPENMODE_NOTHING: 0,

  OPENMODE_ALLTABS: 1,

  OPENMODE_SHOWDIALOG: 2,

  /** URL Rewrite enabled. */
  urlRewrite: false,

  /** Save extended metadata. */
  saveExtendedMetadata: true,

  /** Windows specific preferences. */
  win_invisible: false,

  win_wscriptexe: "c:\\winnt\\system32\\wscript.exe",

  win_invisiblevbs: "c:\\temp\\maf\\invis.vbs",

  /**
   * Creates a multi-dimensional array holding info on each registered program
   */
  getOpenFilters: function() {
    var result = [ ["MAF Archives", "*.maf", this.defaultMAFExtensionIndex] ];
    for (var i=0; i<this.programExtensions.length; i++) {
      var entry = ["MAF " + this.programExtensions[i][0] + " Archives"];

      // Construct a string like "*.zip.maf; *.maf.zip"
      var additionalExts = "";
      for (var j=0; j<this.programExtensions[i][3].length; j++) {
        if (additionalExts == "") {
          additionalExts = this.programExtensions[i][3][j];
        } else {
          additionalExts += "; " + this.programExtensions[i][3][j];
        }
      }
      entry[entry.length] = additionalExts;
      // Add associated program extension index
      entry[entry.length] = i;
      result[result.length] = entry;
    }
    return result;
  },

  /**
   * Creates a multi-dimensional array holding info on each registered program
   */
  getSaveFilters: function() {
    var result = [ ["MAF Archives", "*.maf", this.defaultMAFExtensionIndex] ];

    // Each unique extension has its own entry
    for (var i=0; i<this.programExtensions.length; i++) {
      for (var j=0; j<this.programExtensions[i][3].length; j++) {
        var entry = ["MAF " + this.programExtensions[i][0] + " Archives", this.programExtensions[i][3][j], i];
        result[result.length] = entry;
      }
    }
    return result;
  },

  /**
   * Gets the program to use from the selected index.
   */
  programFromSaveIndex: function(index) {
    filters = this.getSaveFilters();
    selProgExt = this.programExtensions[filters[index][2]];
    return selProgExt[1];
  },

  /**
   * Gets the program to use from the selected index.
   */
  programFromOpenIndex: function(index) {
    filters = this.getOpenFilters();
    selProgExt = this.programExtensions[filters[index][2]];
    return selProgExt[2];
  },

  /**
   * Load the preferences from the user prefs.
   */
  load: function() {
    // Default if there's no stored prefs

    this.defaultMAFExtensionIndex = 0;

    // If not on windows
    if (navigator.userAgent.indexOf("Windows") == -1) {
      this.temp = "/tmp/maf/maftemp/";
      this.programExtensions[this.programExtensions.length] = [
         "Zip", "/tmp/maf/mafzip.sh", "/tmp/maf/mafunzip.sh", ["*.zip.maf", "*.maf.zip"]];
    } else {
      this.temp = "c:\\temp\\maf\\maftemp\\";
      this.programExtensions[this.programExtensions.length] = [
         "Zip", "c:\\temp\\maf\\mafzip.bat", "c:\\temp\\maf\\mafunzip.bat", ["*.zip.maf", "*.maf.zip"]];
    };

    // Load the temp path
    // Load the defaultMAFExtensionIndex
    // Load the program extensions array
      // For each extension
        // Load the extension's id
        // Load the archive program path + filename
        // Load the extract program path + filename
        // Load each of the extensions wildcard file matches
      // end-for

    try {

      var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("maf.");

      this.temp = prefs.getCharPref("temp");
      this.urlRewrite = prefs.getBoolPref("urlrewrite");
      this.saveExtendedMetadata = prefs.getBoolPref("saveextendedmetadata");
      this.defaultMAFExtensionIndex = prefs.getIntPref("defaultmafhandler");
      this.archiveOpenMode = prefs.getIntPref("archiveopenmode");

      this.win_invisible = prefs.getBoolPref("wininvisible");
      this.win_wscriptexe = prefs.getCharPref("winwscriptexe");
      this.win_invisiblevbs = prefs.getCharPref("wininvisiblevbs");

      var noOfExtensions = prefs.getIntPref("noofextensions");

      this.programExtensions = new Array();

      for (var i=0; i<noOfExtensions; i++) {
        currEntry = new Array();
        currEntry[0] = prefs.getCharPref("ext." + i + ".id");
        currEntry[1] = prefs.getCharPref("ext." + i + ".archive");
        currEntry[2] = prefs.getCharPref("ext." + i + ".extract");
        var noOfMasks = prefs.getIntPref("ext." + i + ".masklength");
        maskEntry = new Array();
        for (var j=0; j<noOfMasks; j++) {
          maskEntry[j] = prefs.getCharPref("ext." + i + ".mask." + j);
        }
        currEntry[3] = maskEntry;
        this.programExtensions[this.programExtensions.length] = currEntry;
      }

    } catch(e) {
      // alert(e);
    }

    // Add MHT as the last archive format supported
    this.programExtensions[this.programExtensions.length] = [
       "MHT", MafMHTHander.MHT_ARCHIVE_PROG_ID, MafMHTHander.MHT_EXTRACT_PROG_ID, ["*.mht"]];
  },

  /**
   * Save the preferences to the user prefs.
   */
  save: function() {
    // Save the temp path
    // Save the defaultMAFExtensionIndex
    // Save the program extensions array
      // For each extension
        // Save the extension's 3 letter id
        // Save the archive program path + filename
        // Save the extract program path + filename
        // Save each of the extensions wildcard file matches
      // end-for
    try {

      var prefs = Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch("maf.");

      prefs.setCharPref("temp", this.temp);
      prefs.setBoolPref("urlrewrite", this.urlRewrite);
      prefs.setBoolPref("saveextendedmetadata", this.saveExtendedMetadata);
      prefs.setIntPref("defaultmafhandler", this.defaultMAFExtensionIndex);
      prefs.setIntPref("archiveopenmode", this.archiveOpenMode);

      prefs.setBoolPref("wininvisible", this.win_invisible);
      prefs.setCharPref("winwscriptexe", this.win_wscriptexe);
      prefs.setCharPref("wininvisiblevbs", this.win_invisiblevbs);

      prefs.setIntPref("noofextensions", this.programExtensions.length);
      for (var i=0; i<this.programExtensions.length; i++) {
        if (this.programExtensions[i][0] != "MHT") {
          prefs.setCharPref("ext." + i + ".id", this.programExtensions[i][0]);
          prefs.setCharPref("ext." + i + ".archive", this.programExtensions[i][1]);
          prefs.setCharPref("ext." + i + ".extract", this.programExtensions[i][2]);
          prefs.setIntPref("ext." + i + ".masklength", this.programExtensions[i][3].length);
          for (var j=0; j<this.programExtensions[i][3].length; j++) {
            prefs.setCharPref("ext." + i + ".mask." + j, this.programExtensions[i][3][j]);
          }
        }
      }

    } catch(e) {
      alert(e);
    }
  }

};

/**
 * Object that handles working with MHTs
 *
 * File format assumption: The only file with the content type text/html
 *                         is the main page
 */
var MafMHTHander = {

  MHT_ARCHIVE_PROG_ID: "Internal MHT Program Archive Handler",

  MHT_EXTRACT_PROG_ID: "Internal MHT Program Extract Handler",

  APPSIGNATURE: navigator.appCodeName + " " + navigator.appVersion,

  base64s: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

  /** Characters that are to be unaltered during quoted printable encoding */
  QPENCODE_UNALTERED: String.fromCharCode(32) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126),

  /** Characters that are to be unaltered during quoted printable encoding if they are the last char*/
  QPENCODE_UNALTEREDEND: String.fromCharCode(33) + String.fromCharCode(60) + String.fromCharCode(62) + String.fromCharCode(126),

  /** The maximum number of characters before line wrap */
  QPENCODE_MAXLINESIZE: 76,

  /**
   * TODO: QP original url storage / usage
   */
  extractFromArchive: function(archivefile, destpath) {
    // Create destpath
    MafUtils.createDir(destpath);

    var dateTimeExpanded = new Date();
    var folderNumber = dateTimeExpanded.valueOf()+"_"+Math.floor(Math.random()*1000);

    realDestPath = MafUtils.appendToDir(destpath, folderNumber);

    MafUtils.createDir(realDestPath);

    // Create index.rdf in destpath
    var datasource = MafUtils.createRDF(realDestPath, "index.rdf");

    var index_filesDir = MafUtils.appendToDir(realDestPath,"index_files");
    // Create index_files
    MafUtils.createDir(index_filesDir);

    // Read file
    var MHTFile = MafUtils.readFile(archivefile);

    // Get headers
    var headerStr = "";
    var bodyStr = "";
    if (MHTFile.indexOf("\r\n\r\n") != -1) {
      headerStr = MHTFile.substring(0, MHTFile.indexOf("\r\n\r\n"));
      bodyStr = MHTFile.substring(MHTFile.indexOf("\r\n\r\n") + 4, MHTFile.length);
    } else if (MHTFile.indexOf("\n\n") != -1) {
      headerStr = MHTFile.substring(0, MHTFile.indexOf("\n\n"));
      bodyStr = MHTFile.substring(MHTFile.indexOf("\n\n") + 2, MHTFile.length);
    }

    var headerLines = headerStr.split(/\n/);
    var headerDetails = this._getHeaders(headerLines);

    var urlToLocalFilenameMap = new Array();

    var indexOriginalURL = "Unknown";

    var quotedPrintableMap = new Array();

    if (headerDetails["content-type"].indexOf("multipart/") == -1) {
      // Single file decoding
      try {
        if (headerDetails["content-transfer-encoding"] == "quoted-printable") {

          if (headerDetails["content-type"]!=null && headerDetails["content-type"].indexOf("text/html") >= 0) {
            // Create index.html
            MafUtils.createFile(MafUtils.appendToDir(realDestPath,"index.html"), this._decodeQuotedPrintable(bodyStr));
            urlToLocalFilenameMap[headerDetails["content-location"]] = MafUtils.appendToDir(realDestPath,"index.html");

            indexOriginalURL = headerDetails["content-location"];
          }
        }

        this._updateMetaData(headerStr, indexOriginalURL, datasource);
      } catch(e) {
        alert(e);
      }

    } else {
      // Multiple file decoding
      var decodeResult = this._decodeMultipartMimeFiles(headerDetails, MHTFile, index_filesDir, urlToLocalFilenameMap, quotedPrintableMap);

      indexOriginalURL = decodeResult.indexOriginalURL;
      urlToLocalFilenameMap = decodeResult.urlToLocalFilenameMap;
      quotedPrintableMap = decodeResult.quotedPrintableMap;

      // Rationalize absolute URLs to relative URLs
      for (var i=0; i<quotedPrintableMap.length; i++) {
        // For each quoted printable file
        var filename =  quotedPrintableMap[i];

        // Load the page contents in a string
        var contents = MafUtils.readFile(filename);

        try {
          contents = this.replaceUrls(contents, urlToLocalFilenameMap);
          // TODO: If the content type is text/html, get the original url of each page (could be framed)
          //       and add the original url as the base href
          // TODO: Save original url of every quoted printable object
          //contents = MafUtils.addBaseHref(contents, indexOriginalURL);
        } catch(e) {
          alert(e);
        }

        // Remove file
        MafUtils.deleteFile(filename);

        // Save page back
        MafUtils.createFile(filename, contents);
      }

      this._updateMetaData(decodeResult.headers, indexOriginalURL, datasource);
    }

  },

  /**
   * Get the boundary string used to separate MIME content from the content-type header
   */
  _getBoundaryStringFromHeader: function(ctheaderDetails) {
    // Get the boundary string
    var result = "";

    var contentTypeValues = ctheaderDetails.split(";");

      for (var i=0; i<contentTypeValues.length; i++) {
        if (contentTypeValues[i].indexOf("=") != -1) {
          // We have a name=value pair
          var name = contentTypeValues[i].substring(0, contentTypeValues[i].indexOf("=")).trim();
          var value = contentTypeValues[i].substring(contentTypeValues[i].indexOf("=") + 1,
                                                     contentTypeValues[i].length).trim();

          if (value.length > 1) {
            // Value should be quoted, unquote
            value = value.substring(1, value.length - 1);
          }

          if (name == "boundary") {
            result = value;
            break;
          }
        }

      }

    return result;
  },


  /**
   * Recursive function which decodes Multipart mime content
   * It creates the decoded files in the specified index files directory
   *   and stores meta-data in a result structure for post decoding processing
   */
  _decodeMultipartMimeFiles: function(headerDetails, MHTFile, index_filesDir, urlToLocalFilenameMap, quotedPrintableMap) {
    var result = {
      indexOriginalURL: "Unknown",
      urlToLocalFilenameMap: urlToLocalFilenameMap,
      quotedPrintableMap: quotedPrintableMap,
      headers: ""
    };

    var url = Components.classes[urlContractID].createInstance();
    url = url.QueryInterface(urlIID);

    var boundaryString = this._getBoundaryStringFromHeader(headerDetails["content-type"]);

    // Split using boundary string
    // End of part (--) and beginning of another (boundaryString)
    var singleFiles = MHTFile.split("--" + boundaryString);

    result.headers = singleFiles[0];

    // For each part
    for (var i=1; i<singleFiles.length; i++) {

      try {
        //  Get the content type and content location
        var headersAndBody = new Array();

        if (singleFiles[i].indexOf("\r\n\r\n")!=-1) {
          headersAndBody[0] = singleFiles[i].substring(0, singleFiles[i].indexOf("\r\n\r\n"));
          headersAndBody[1] = singleFiles[i].substring(singleFiles[i].indexOf("\r\n\r\n")+4, singleFiles[i].length);
        } else {
          headersAndBody[0] = singleFiles[i].substring(0, singleFiles[i].indexOf("\n\n"));
          headersAndBody[1] = singleFiles[i].substring(singleFiles[i].indexOf("\n\n")+2, singleFiles[i].length);
        }

          var headerLines = headersAndBody[0].split(/\n/);
          var headerDetails = this._getHeaders(headerLines);

          if (typeof(headerDetails["content-location"]) != "undefined") {

            url.spec = headerDetails["content-location"];

            //  Based on location guess the filename
            var localFilename = MafUtils.getUniqueFilename(index_filesDir ,getDefaultFileName(null, null, url, null));

            result.urlToLocalFilenameMap[headerDetails["content-location"]] = MafUtils.appendToDir(index_filesDir,localFilename);

            if (headerDetails["content-transfer-encoding"] == "base64") {

              // Get rid of the newlines
              var bodyLines = headersAndBody[1].split(/\r?\n/);

              var bodyData = "";
              for (var j=0; j<bodyLines.length; j++) {
                bodyData += bodyLines[j];
              }

              bodyLines = null;

              // Create The decoded file
              //  Decode the part and save as the filename in index_files
              MafUtils.createBinaryFile(MafUtils.appendToDir(index_filesDir,localFilename), this._decodeBase64(bodyData));

            } else if (headerDetails["content-transfer-encoding"] == "quoted-printable") {

                if (headerDetails["content-type"]!=null && headerDetails["content-type"].indexOf("text/html") >= 0) {
                  // Create index.html
                  MafUtils.createFile(MafUtils.appendToDir(realDestPath,"index.html"),
                                      this._decodeQuotedPrintable(headersAndBody[1]));
                  result.urlToLocalFilenameMap[headerDetails["content-location"]] =
                     MafUtils.appendToDir(realDestPath,"index.html");

                  result.indexOriginalURL = headerDetails["content-location"];
                } else {
                  //  Decode the part and save as the filename in index_files
                  MafUtils.createFile(MafUtils.appendToDir(index_filesDir,localFilename),
                                      this._decodeQuotedPrintable(headersAndBody[1]));
                }

                result.quotedPrintableMap[result.quotedPrintableMap.length] = result.urlToLocalFilenameMap[headerDetails["content-location"]];

            }

          } else if ((typeof(headerDetails["content-type"]) != "undefined") &&
                      (headerDetails["content-type"].indexOf("multipart/") >= 0)) {
              var multipartResult = this._decodeMultipartMimeFiles(headerDetails, headersAndBody[1], index_filesDir, result.urlToLocalFilenameMap, result.quotedPrintableMap);
              result.urlToLocalFilenameMap = multipartResult.urlToLocalFilenameMap;
              result.quotedPrintableMap = multipartResult.quotedPrintableMap;
              if (result.indexOriginalURL == "Unknown") {
                result.indexOriginalURL = multipartResult.indexOriginalURL;
              }
          }

      } catch(e) {
        alert(e);
      }
    }

    return result;
  },

  /**
   * Use a regular expression to replace absolute URLs with relative ones.
   * O(n) algorithm now instead of O(n^2).
   */
  replaceUrls: function(sourceString, urlToLocalFilenameMap) {
    var resultString = "";
    var unprocessedString = sourceString;
    var re = new RegExp("[a-z]+://[^>\"']+", "i"); // Absolute URL regular expression

    var m = re.exec(unprocessedString);
    while (m != null) {
      resultString += unprocessedString.substring(0, m.index);
      var originalUrl = m.toString();

      // Todo, decode anything else that might give trouble
      originalUrl = originalUrl.replaceAll("&amp;", "&");

      // Cater for Hashes
      var baseUrl = originalUrl.split("#")[0];
      var leftOver = originalUrl.split("#")[1];

      if (typeof(urlToLocalFilenameMap[baseUrl]) != "undefined") {
        resultString += MafUtils.getURIFromFilename(urlToLocalFilenameMap[baseUrl]);
        if (typeof(leftOver) != "undefined") {
          resultString += "#" + leftOver;
        }
      } else {
        resultString += m.toString();
      }

      unprocessedString = unprocessedString.substring(m.index + m.toString().length, unprocessedString.length);
      m = re.exec(unprocessedString);
    }

    resultString += unprocessedString;
    return resultString;
  },

  /**
   * Adds meta data gathered from the MHT to the RDF datasource used by MAF
   */
  _updateMetaData: function(headers, originalURL, datasource) {
    var result = "";
    var headerLines = headers.split(/\n/);
    var headerDetails = this._getHeaders(headerLines);

    // Add url data
    MafUtils.addStringData(datasource, "originalurl", originalURL);
    // Add title
    MafUtils.addStringData(datasource, "title", headerDetails["subject"]);
    // Add Date/Time archived data
    MafUtils.addStringData(datasource, "archivetime", headerDetails["date"]);
    // Add index file data
    MafUtils.addStringData(datasource, "indexfilename", "index.html");

    // Write changes to physical file
    datasource.Flush();

    return result;
  },

  /**
   * Tries to create an associative array of header => value pairs by parsing text.
   * Now cater for multi-line header values
   */
  _getHeaders: function(headerLines) {

    // Ensure that values that cross lines end up on only one line
    var normalizedHeaderLines = new Array();

    for (var i=0; i<headerLines.length; i++) {
      if (headerLines[i].indexOf(":") > 0) {
        normalizedHeaderLines[normalizedHeaderLines.length] = headerLines[i];
      } else {
        if (normalizedHeaderLines.length > 0) {
          normalizedHeaderLines[normalizedHeaderLines.length-1] += headerLines[i].trim();
        }
      }
    }

    var result = new Array();
    result["date"] = "Unknown";
    result["subject"] = "Unknown";
    for (var i=0; i<normalizedHeaderLines.length; i++) {
      var headerInfo = normalizedHeaderLines[i].split(/\:/);
      if (headerInfo.length>1) {
        // We have a header
        var headerInfoValue = headerInfo[1];
        for (var j=2; j<headerInfo.length; j++) {
          headerInfoValue += ":" + headerInfo[j];
        }
        result[headerInfo[0].trim().toLowerCase()] = headerInfoValue.trim();
      }

    }
    return result;
  },

  /**
   * Copied from FAQTs Knowledge Base
   * Source: http://www.faqts.com/knowledge_base/view.phtml/aid/1748
   * Authors: Jeff Wong, Thomas Loo, Louise Tolman, Martin Honnen, jsWalter
   */
  _decodeBase64: function(encodedString) {
    var result = new Array();

    try {
      var bits, decOut = new Array(), i = 0;
      for(; i<encodedString.length; i += 4) {
        bits = (this.base64s.indexOf(encodedString.charAt(i)) & 0xff) <<18 |
               (this.base64s.indexOf(encodedString.charAt(i +1)) & 0xff) <<12 |
               (this.base64s.indexOf(encodedString.charAt(i +2)) & 0xff) << 6 |
               this.base64s.indexOf(encodedString.charAt(i +3)) & 0xff;

        decOut.push((bits & 0xff0000) >>16);
        decOut.push((bits & 0xff00) >>8);
        decOut.push(bits & 0xff);
      }
      if(encodedString.charCodeAt(i -2) == 61)
        undecOut=decOut.slice(0, decOut.length -2);
      else if(encodedString.charCodeAt(i -1) == 61)
        undecOut=decOut.slice(0, decOut.length -1);
      else undecOut=decOut;

      result = undecOut;
    } catch(e) {
      alert(e);
    }
    return result;
  },


  /**
   * Copied from FAQTs Knowledge Base
   * Source: http://www.faqts.com/knowledge_base/view.phtml/aid/1748
   * Authors: Jeff Wong, Thomas Loo, Louise Tolman, Martin Honnen, jsWalter
   */
  _encodeBase64: function(decStr) {
    var result = "";

    try {
      var bits, dual, i = 0, encOut = '';

      while(decStr.length >= i + 3) {
        bits = (decStr[i++] & 0xff) <<16 |
               (decStr[i++] & 0xff) <<8  |
                decStr[i++] & 0xff;
        encOut += this.base64s.charAt((bits & 0x00fc0000) >>18) +
                  this.base64s.charAt((bits & 0x0003f000) >>12) +
                  this.base64s.charAt((bits & 0x00000fc0) >> 6) +
                  this.base64s.charAt((bits & 0x0000003f));
      }
      if (decStr.length -i > 0 && decStr.length - i < 3) {
        dual = Boolean(decStr.length -i -1);
        bits = ((decStr[i++] & 0xff) <<16) |
                (dual ? (decStr[i] & 0xff) <<8 : 0);
        encOut += this.base64s.charAt((bits & 0x00fc0000) >>18) +
                  this.base64s.charAt((bits & 0x0003f000) >>12) +
                  (dual ? this.base64s.charAt((bits & 0x00000fc0) >>6) : '=') + '=';
      }
      result = encOut;
    } catch(e) {
      alert(e);
    }

    if (encOut.length > this.QPENCODE_MAXLINESIZE) {
      // Split into lines of QPENCODE_MAXLINESIZE characters or less
      result = encOut.slice(0, this.QPENCODE_MAXLINESIZE);
      i = this.QPENCODE_MAXLINESIZE;
      while (i < encOut.length) {
        result += "\r\n" + encOut.slice(i, i + this.QPENCODE_MAXLINESIZE);
        i += this.QPENCODE_MAXLINESIZE;
      }
    }

    return result;
  },

  /**
   * Decode quoted printable text.
   */
  _decodeQuotedPrintable: function(encodedString) {
    var result;
    result = encodedString;
    // = sign followed by new line, replaced by nothing.
    result = result.replace(/=\r?\n/g, "");

    var equalsArray = result.split("=");
    var newresult = equalsArray[0];
    for (var i=1; i<equalsArray.length; i++) {
      if (equalsArray[i].length >= 2) {
        newresult += this._hexToDec(equalsArray[i].substring(0,2));
        if (equalsArray[i].length > 2) {
          newresult += equalsArray[i].substring(2,equalsArray[i].length);
        }
      }
    }

    return newresult;
  },

  /**
   * Encode text to be quoted printable.
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintable: function(srcString) {
    var result;
    result = "";

    var textLines = srcString.split(new RegExp("\r?\n","g"));
    for (var i=0; i<textLines.length; i++) {
      result += this._encodeQuotedPrintableLine(textLines[i]) + "\r\n";
    }

    return result;
  },

  /**
   * Encode a single line of text to be quoted printable.
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintableLine: function(srcLineString) {
    var result;
    result = "";

    if (srcLineString.length > 0) {
      var s = "";

      for (var i = 0; i<srcLineString.length-1; i++) {
        s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(i), this.QPENCODE_UNALTERED);
      }

      // Encode last character; if space, encode it
      s += this._encodeQuotedPrintableCharacter(srcLineString.charCodeAt(srcLineString.length-1), this.QPENCODE_UNALTEREDEND);

      result = s;

      if (s.length > this.QPENCODE_MAXLINESIZE) {

        // Split into lines of QPENCODE_MAXLINESIZE characters or less
        result = s.slice(0, this.QPENCODE_MAXLINESIZE);
        i = this.QPENCODE_MAXLINESIZE;

        // If either the last character, character before is =
        //   then we've split across a code - Bad idea for compatibility with
        //   streaming decoders who may see == or =A= or such and upchuck.
        if (result.charAt(result.length-1) == "=") {
          result = result.slice(0, result.length - 1);
          i -= 1;
        } else if (result.charAt(result.length-2) == "=") {
          result = result.slice(0, result.length - 2);
          i -= 2;
        }

        while (i < s.length) {
          result += "=\r\n" + s.slice(i, i + this.QPENCODE_MAXLINESIZE);
          i += this.QPENCODE_MAXLINESIZE;

          if (result.charAt(result.length-1) == "=") {
            result = result.slice(0, result.length - 1);
            i -= 1;
          } else if (result.charAt(result.length-2) == "=") {
            result = result.slice(0, result.length - 2);
            i -= 2;
          }
        }
      }

    }

    return result;
  },


  /**
   * Encode a character that isn't in range as a hex string
   * Based on code from: http://sourceforge.net/snippet/detail.php?type=snippet&id=101156
   * Original author: samray
   */
  _encodeQuotedPrintableCharacter: function(Character, UnAltered) {
    var x, Alter=true;
    for (var i=0; i<UnAltered.length; i+=2) {
      if (Character >= UnAltered.charCodeAt(i) && Character <= UnAltered.charCodeAt(i+1)) {
        Alter=false;
      }
    }

    if (!Alter) {
      return String.fromCharCode(Character);
    }

    x = Character.toString(16).toUpperCase();
    return (x.length == 1) ? "=0" + x : "=" + x;
  },

  /**
   * Convert a hex digit into decimal
   */
  _deHex: function(hexDigit) {
    return("0123456789ABCDEF".indexOf(hexDigit));
  },

  /**
   * Convert two digit hex code to ascii character
   */
  _hexToDec: function(hexString) {
    return String.fromCharCode((this._deHex(hexString.substring(0,1)) << 4) + this._deHex(hexString.substring(1,2)));
  },

  /**
   * Might do this eventually, for now, not supported XXXMHT
   * To implement:
   *  Make sure all available meta data is present
   *    - Missing some from MAF - Original URLs of saved resources - Not present. Arrg. Necessary?
   *                            - Content types of saved resources - Can be determined using MIME service
   *  Load RDF of saved archive files - DONE
   *  Content types of each resource file - DONE
   *  Generate boundary string - DONE
   *  Get subject (title) - DONE
   *  Base 64 encode binary data - DONE
   *  Quoted print html, css - DONE
   *
   */
  archiveDownload: function(archivefile, sourcepath) {

    var MHTContentString = "";
    var mainfileSubject = "Unknown";
    var dateArchived = "Unknown";
    var originalUrl = "";
    var indexfilename = "";

    var rdfdataresult = this._getMainFileMetaData(sourcepath);
    if (rdfdataresult["title"] != "") { mainfileSubject = rdfdataresult["title"]; }
    if (rdfdataresult["archivetime"] != "") { dateArchived = rdfdataresult["archivetime"]; }

    if (rdfdataresult["originalurl"] != "") { originalurl = rdfdataresult["originalurl"]; }
    if (rdfdataresult["indexfilename"] != "") { indexfilename = rdfdataresult["indexfilename"]; }

    var hasSupportingFiles = this._getHasSupportingFiles(sourcepath);

    var indexContentType = this._getFileContentType(sourcepath, indexfilename);

    var boundaryString = "";

    MHTContentString += "From: <Saved by " + this.APPSIGNATURE + ">\r\n";
    MHTContentString += "Subject: " + mainfileSubject + "\r\n";
    MHTContentString += "Date: " + dateArchived + "\r\n";
    MHTContentString += "MIME-Version: 1.0\r\n";

    if (hasSupportingFiles) {
      boundaryString = this._getBoundaryString();
      MHTContentString += "Content-Type: multipart/related;\r\n";
      MHTContentString += "\tboundary=\"" + boundaryString + "\";\r\n"
      MHTContentString += "\ttype=\"" + indexContentType + "\"\r\n";
      MHTContentString += "X-MAF: Produced By MAF MHT Archive Handler V0.2.20\r\n";
      MHTContentString += "\r\nThis is a multi-part message in MIME format.\r\n";
      MHTContentString += this._addFileToMHT(boundaryString, sourcepath, indexfilename, originalurl);

      try {
        var supportFileList = this._getSupportingFilesList(sourcepath, originalurl);
        // For each file supporting, add it
        for (var i=0; i<supportFileList.length; i++) {
          MHTContentString += this._addFileToMHT(boundaryString, sourcepath,
                                        supportFileList[i][0], supportFileList[i][1], "index_files");
        }
      } catch(e) {

      }

      // End file content
      MHTContentString += "\r\n--" + boundaryString + "--\r\n";
    } else {

      // TODO!!! Don't forget

    }

    MafUtils.createFile(archivefile, MHTContentString);
  },

  /**
   * @return a fake url where resources were found
   */
  _getBaseFakeUrl: function(originalurl) {
    var baseUrl = "";

    // Get a url without querystring or hash
    baseUrl = originalurl.trim();
    if (baseUrl.indexOf("?") > 0) {
      baseUrl = baseUrl.substring(0, baseUrl.indexOf("?"));
    }
    if (baseUrl.indexOf("#") > 0) {
      baseUrl = baseUrl.substring(0, baseUrl.indexOf("#"));
    }

    // If the last character isn't a /
    if (baseUrl.charAt(baseUrl.length-1) != "/") {
      // Append / to end
      baseUrl += "/";
    }

    return baseUrl;
  },

  /**
   * Returns an array of supporting index files
   * Does not generate real original addresses of index files - TODO FIX, somehow
   */
  _getSupportingFilesList: function(sourcepath, originalurl) {
    var result = new Array();

    var baseUrl = this._getBaseFakeUrl(originalurl);

    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(MafPreferences.temp);
    oDir.append(sourcepath);
    oDir.append("index_files");

    if (oDir.exists() && oDir.isDirectory()) {
      var entries = oDir.directoryEntries;

      while (entries.hasMoreElements()) {
        var currFile = entries.getNext();
        currFile.QueryInterface(localFileIID);

        result[result.length] = [currFile.leafName, baseUrl + "index_files/" + currFile.leafName];

      }
    }
    return result;
  },

  /**
   * Add a supporting binary file to the MHT encoding
   */
  _addFileToMHT: function(boundaryString, sourcepath, filename, originalUrl, subdir) {
    var result = "";
    try {
      var thisFileContentType = this._getFileContentType(sourcepath, filename);
      var thisFileContentEncoding = this._getContentEncodingByType(thisFileContentType);

      result += "\r\n--" + boundaryString + "\r\n";
      if ((subdir != null) && (thisFileContentType == "text/html")) {
        result += "Content-Type: application/octet-stream\r\n";
      } else {
        result += "Content-Type: " + thisFileContentType + "\r\n";
      }
      result += "Content-Transfer-Encoding: " + thisFileContentEncoding + "\r\n";
      result += "Content-Location: " + originalUrl + "\r\n\r\n";


      var fullSourcePath = MafUtils.appendToDir(MafPreferences.temp, sourcepath);
      if (subdir != null) {
        fullSourcePath = MafUtils.appendToDir(fullSourcePath, subdir);
      }
      var fullFilename = MafUtils.appendToDir(fullSourcePath, filename);

      var srcFile;

      if (thisFileContentEncoding == "quoted-printable") {
        srcFile =  MafUtils.readFile(fullFilename);
        // If it isn't a supporting file, replace all relative
        //   supporting files urls with absolute urls
        if (subdir == null) {
          var supportFileList = this._getSupportingFilesList(sourcepath, originalurl);
          srcFile = this._updateRelativeResourceLinks(srcFile, supportFileList);
        }
        result += this._encodeQuotedPrintable(srcFile);
      } else { // Base64
        srcFile = MafUtils.readBinaryFile(fullFilename);
        result += this._encodeBase64(srcFile);
      }

      result += "\r\n";
    } catch(e) {
      alert(e);
    }
    return result;
  },


  /**
   * For each resource, search and replace all
   * @return srcFile with absolute links.
   */
  _updateRelativeResourceLinks: function(srcFile, supportFileList) {
    var result = srcFile;

    for (var i=0; i<supportFileList.length; i++) {
      result = result.replaceAll("index_files/" + supportFileList[i][0], supportFileList[i][1]);
    }

    return result;
  },


  /**
   * Determine the MIME encoding to used based on the content type
   */
  _getContentEncodingByType: function(fileContentType) {
    var result = "base64";
    if (fileContentType == "text/html") { result = "quoted-printable"; }
    if (fileContentType == "text/css") { result = "quoted-printable"; }
    return result;
  },

  /**
   * Loads meta-data available from the saved archive
   */
  _getMainFileMetaData: function(sourcepath) {
    var indexrdffile = Components.classes[localFileContractID].getService(localFileIID);
    indexrdffile.initWithPath(MafPreferences.temp);
    indexrdffile.append(sourcepath);

    var uriPath = MafUtils.getURI(indexrdffile.nsIFile);

    indexrdffile.append("index.rdf");

    return MafState.getMetaDataFrom(indexrdffile, uriPath);
  },

  /**
   * Generates the boundary string used to seperate MIME parts
   */
  _getBoundaryString: function() {
    var result = "----=_NextPart_000_0000_";

    for (var i=0; i<8; i++) {
      result += this._hex(Math.floor(Math.random()*15));
    }
    result += ".";

    for (var i=0; i<8; i++) {
      result += this._hex(Math.floor(Math.random()*15));
    }
    return result;
  },

  /**
   * Convert a single decimal digit (0 to 15) into hex
   */
  _hex: function(decDigit) {
    if (decDigit >=0 && decDigit <= 15) {
      return("0123456789ABCDEF".charAt(decDigit));
    } else {
      return "0";
    }
  },

  /**
   * @return true if there are supporting files in archive file folder
   */
  _getHasSupportingFiles: function(sourcepath) {
    var result = false;
    var supportingFilesDirName = "index_files";

    try {
      var iDir = Components.classes[localFileContractID].getService(localFileIID);
      iDir.initWithPath(MafPreferences.temp);
      iDir.append(sourcepath);
      iDir.append(supportingFilesDirName);

      result = iDir.exists();
    } catch(e) {

    }

    return result;
  },

  /**
   * @return The content type for whatever file specified.
   */
  _getFileContentType: function(sourcepath, filename, subdir) {
    var result = "application/octet-stream";
    try {
      var ifile = Components.classes[localFileContractID].getService(localFileIID);
      ifile.initWithPath(MafPreferences.temp);
      ifile.append(sourcepath);
      if (subdir != null) {
        ifile.append(subdir);
      }
      ifile.append(filename);

      result = MafUtils.getMIMETypeForURI(MafUtils.getURI(ifile.nsIFile));
    } catch(e) {
      alert(e);
    }

    return result;
  }

};

// Setup the RDF in memory data source for the current state
MafState.setupDataSource();

// Load the last stored preferences into the object.
MafPreferences.load();

window.addEventListener("close", MafUtils.onWindowClose, true);
window.addEventListener("load", MafUtils.onWindowLoad, true);
window.addEventListener("load", MafUtils.onTabLoad, true);


/**
 * Copied from JS-Examples archives
 * Source: http://js-x.com/javascript/?view=932
 * Author: Brock Weaver - 0
 */
String.prototype.trim = function() {
  // skip leading and trailing whitespace
  // and return everything in between
  var x=this;
  x=x.replace(/^\s*(.*)/, "$1");
  x=x.replace(/(.*?)\s*$/, "$1");
  return x;
};

/**
 * Replace all needles with newneedles
 */
String.prototype.replaceAll = function(needle, newneedle) {
  var x=this;
  x=x.split(needle).join(newneedle);
  return x;
};
