/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.2.19
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
 * Changes from 0.2.18 to 0.2.19
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
 * TODO:
 *   Implement open archive functionality
 *     - Based on preferences
 *       - Dialog box showing all archived files, select to open - DONE
 *       - Open all in new tabs - DONE
 *     - URL Rewrite preference
 *       - As tabs are loaded, search for URLs that match archived URLs and replace with local file:// URLs.
 *     - Show loading dialog until archives have decompressed - DONE
 *
 *   Implement save archive functionality
 *     - Save additional meta data (search for METAXXX).
 *
 *   Implement Preferences functionality
 *     - Settings to create the script used in archiving - INCLUDED IN INSTALLER
 *     - Whole Prefences GUI and logic insanity
 *       - Browse button for existing files should change to the directory (if possible)
 *
 *   Optimizations:
 *     - Look at implementing an Observer object for the download instead of a timer on a 1 second delay.
 *     - Look also for javascript observer for the save tabs dialog
 *
 *   Additional Planned Features:
 *     - MHT File support via a pseudo-app that is responsible for MHT decoding (and encoding?)
 *     - Save all history entries for a specific tab in an archive
 *       - Save all tabs and all history entries for all tabs
 *     - Option to close tab as it is saved
 *     - Most recently opened archive functionality
 *     - Remember when last MAF file was opened
 *     - Open all MAF archives in a directory
 *
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
      this._ns_sniffHeader(this.aDocument, MafUtils.appendToDir(this.tempPath, this.folderNumber), "index.html");
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
  },

  /**
   * Trigger the file save process with the specified data structure.
   */
  this._ns_sniffHeader = function(aDocument, aSaveDocPath, aSaveDocFileName) {
    var data = {
      url: aDocument.location.href,
      fileName: null,
      filePickerTitle: null,
      document: aDocument,
      bypassCache: false,
      window: window,
      saveDocPath: aSaveDocPath,
      saveDocFileName: aSaveDocFileName,
      objMafArchiver: this
    };

    /** Change the header sniffer callback to use the this._ns_foundHeaderInfo function instead */
    /** If there's a constant kSaveAsType_Complete, then we're in Firefox or something in which
        the original code works, otherwise use the Mozilla 1.7 RC2 for windows code. */
    if (typeof(kSaveAsType_Complete) !== "undefined") {
      var sniffer = new nsHeaderSniffer(aDocument.location.href, this._ns_foundHeaderInfo, data, true);
    } else {
      var sniffer = new nsHeaderSniffer(aDocument.location.href, this._ns_foundHeaderInfoAlternate, data, true);
    }
  },

  /**
   * Based on code found in foundHeaderInfo in contentAreaUtils.js
   * except this._ns_getTargetFile is called instead.
   * Changed contract ids and interface references to use global constants.
   */
  this._ns_foundHeaderInfo = function(aSniffer, aData, aSkipPrompt) {
    var contentType = aSniffer.contentType;
    var contentEncodingType = aSniffer.contentEncodingType;

    var shouldDecode = false;
    // Are we allowed to decode?
    try {
      const helperAppService =
        Components.classes[externalHelperAppServiceContractID].getService(externalHelperAppServiceIID);
      var url = aSniffer.uri.QueryInterface(urlIID);
      var urlExt = url.fileExtension;
      if (helperAppService.applyDecodingForExtension(urlExt,
                                                   contentEncodingType)) {
        shouldDecode = true;
      }
    }
    catch (e) {
    }

    var isDocument = aData.document != null && isDocumentType(contentType);
    if (!isDocument && !shouldDecode && contentEncodingType) {
      // The data is encoded, we are not going to decode it, and this is not a
      // document save so we won't be doing a "save as, complete" (which would
      // break if we reset the type here).  So just set our content type to
      // correspond to the outermost encoding so we get extensions and the like
      // right.
      contentType = contentEncodingType;
    }

    var file = null;
    var saveAsType = kSaveAsType_URL;
    try {
      file = aData.fileName.QueryInterface(localFileIID);
    }
    catch (e) {
      var saveAsTypeResult = { rv: 0 };
      file = aData.objMafArchiver._ns_getTargetFile(aData, aSniffer, contentType, isDocument, aSkipPrompt, saveAsTypeResult);
      saveAsType = saveAsTypeResult.rv;
    }

    // If we're saving a document, and are saving either in complete mode or
    // as converted text, pass the document to the web browser persist component.
    // If we're just saving the HTML (second option in the list), send only the URI.
    var source = (isDocument && saveAsType != kSaveAsType_URL) ? aData.document : aSniffer.uri;
    var persistArgs = {
      source      : source,
      contentType : (isDocument && saveAsType == kSaveAsType_Text) ? "text/plain" : contentType,
      target      : file,
      postData    : aData.document ? getPostData() : null,
      bypassCache : aData.bypassCache
    };

    var persist = makeWebBrowserPersist();

    // Calculate persist flags.
    const flags = webBrowserPersistIID.PERSIST_FLAGS_NO_CONVERSION | webBrowserPersistIID.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
    if (aData.bypassCache)
      persist.persistFlags = flags | webBrowserPersistIID.PERSIST_FLAGS_BYPASS_CACHE;
    else
      persist.persistFlags = flags | webBrowserPersistIID.PERSIST_FLAGS_FROM_CACHE;

    if (shouldDecode)
      persist.persistFlags &= ~webBrowserPersistIID.PERSIST_FLAGS_NO_CONVERSION;

    // Create download and initiate it (below)
    aData.objMafArchiver.dl = Components.classes[downloadContractID].createInstance(downloadIID);

    try {

    if (isDocument && saveAsType != kSaveAsType_URL) {
      // Saving a Document, not a URI:
      var filesFolder = null;
      if (persistArgs.contentType != "text/plain") {
        // Create the local directory into which to save associated files.
        filesFolder = Components.classes[localFileContractID].createInstance(localFileIID);
        filesFolder.initWithPath(persistArgs.target.path);

        var nameWithoutExtension = filesFolder.leafName;
        nameWithoutExtension = nameWithoutExtension.substring(0, nameWithoutExtension.lastIndexOf("."));
        var filesFolderLeafName = getStringBundle().formatStringFromName("filesFolder",
                                                                       [nameWithoutExtension],
                                                                       1);

        filesFolder.leafName = filesFolderLeafName;
      }

      var encodingFlags = 0;
      if (persistArgs.contentType == "text/plain") {
        encodingFlags |= webBrowserPersistIID.ENCODE_FLAGS_FORMATTED;
        encodingFlags |= webBrowserPersistIID.ENCODE_FLAGS_ABSOLUTE_LINKS;
        encodingFlags |= webBrowserPersistIID.ENCODE_FLAGS_NOFRAMES_CONTENT;
      }

      const kWrapColumn = 80;
      aData.objMafArchiver.dl.init(aSniffer.uri, persistArgs.target, null, null, null, persist);
      persist.saveDocument(persistArgs.source, persistArgs.target, filesFolder,
                         persistArgs.contentType, encodingFlags, kWrapColumn);
    } else {
      aData.objMafArchiver.dl.init(source, persistArgs.target, null, null, null, persist);
      persist.saveURI(source, null, null, persistArgs.postData, null, persistArgs.target);
    }

    } catch(e) {

    }


  },

  /**
   * Based on code found in getTargetFile in contentAreaUtils.js
   * except it does not prompt the user for the file name and path.
   * Instead uses values stored in the aData record structure.
   */
  this._ns_getTargetFile = function(aData, aSniffer, aContentType, aIsDocument, aSkipPrompt, aSaveAsTypeResult) {
    if (typeof(kSaveAsType_Complete) !== "undefined") {
  aSaveAsTypeResult.rv = kSaveAsType_Complete;
    }

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

  },

  /**
   * Based on code found in foundHeaderInfo in contentAreaUtils.js
   * Quick fix to get it working on Mozilla for windows
   * Removed code prompting user for location to save file to.
   * Why take out aSkipPrompt?!?.
   */
  this._ns_foundHeaderInfoAlternate = function(aSniffer, aData, aSkipPrompt) {

    try {

    var contentType = aSniffer.contentType;
    var contentEncodingType = aSniffer.contentEncodingType;

    var shouldDecode = false;
    var urlExt = null;

    // Are we allowed to decode?
    try {
      const helperAppService =
        Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"].
          getService(Components.interfaces.nsIExternalHelperAppService);
      var url = aSniffer.uri.QueryInterface(Components.interfaces.nsIURL);
      urlExt = url.fileExtension;
      if (contentEncodingType &&
          helperAppService.applyDecodingForExtension(urlExt,
                                                     contentEncodingType)) {
        shouldDecode = true;
      }
    }
    catch (e) {
    }

    var bundle = getStringBundle();

    var saveMode = GetSaveModeForContentType(contentType);
    var isDocument = aData.document != null && saveMode;
    if (!isDocument && !shouldDecode && contentEncodingType) {
      // The data is encoded, we are not going to decode it, and this is not a
      // document save so we won't be doing a "save as, complete" (which would
      // break if we reset the type here).  So just set our content type to
      // correspond to the outermost encoding so we get extensions and the like
      // right.
      contentType = contentEncodingType;
    }

    // Determine what the 'default' string to display in the File Picker dialog
    // should be.
    var defaultFileName = getDefaultFileName(aData.fileName,
                                             aSniffer.suggestedFileName,
                                             aSniffer.uri,
                                             aData.document);
    var defaultExtension = getDefaultExtension(defaultFileName, aSniffer.uri, contentType);

    // XXX We depend on the following holding true in appendFiltersForContentType():
    // If we should save as a complete page, the filterIndex is 0.
    // If we should save as text, the filterIndex is 2.
    /***
    var useSaveDocument = isDocument &&
                        ((saveMode & SAVEMODE_COMPLETE_DOM && fp.filterIndex == 0) ||
                         (saveMode & SAVEMODE_COMPLETE_TEXT && fp.filterIndex == 2));
    ***/
    var useSaveDocument = isDocument &&
                        ((saveMode & SAVEMODE_COMPLETE_DOM) ||
                         (saveMode & SAVEMODE_COMPLETE_TEXT));

    var file = null;
    try {
      var saveAsTypeResult = { rv: 0 };
      file = aData.objMafArchiver._ns_getTargetFile(aData, aSniffer, contentType, isDocument, aSkipPrompt, saveAsTypeResult);
      saveAsType = saveAsTypeResult.rv;
    } catch(e) {
      alert(e);
    }


    // If we're saving a document, and are saving either in complete mode or
    // as converted text, pass the document to the web browser persist component.
    // If we're just saving the HTML (second option in the list), send only the URI.
    var source = useSaveDocument ? aData.document : aSniffer.uri;
    var persistArgs = {
      source      : source,
      contentType : contentType,
      target      : makeFileURL(file),
      postData    : isDocument ? getPostData() : null,
      bypassCache : aData.bypassCache
    };

    // contentType : (useSaveDocument && fp.filterIndex == 2) ? "text/plain" : contentType,

    var persist = makeWebBrowserPersist();

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

    if (useSaveDocument) {
      // Saving a Document, not a URI:
      var filesFolder = null;
      if (persistArgs.contentType != "text/plain") {
        // Create the local directory into which to save associated files.
        filesFolder = file.clone();

        var nameWithoutExtension = filesFolder.leafName.replace(/\.[^.]*$/, "");
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
      else {
        encodingFlags |= nsIWBP.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES;
      }

      const kWrapColumn = 80;
      aData.objMafArchiver.dl.init(aSniffer.uri, persistArgs.target, null, null, null, persist);
      persist.saveDocument(persistArgs.source, persistArgs.target, filesFolder,
                           persistArgs.contentType, encodingFlags, kWrapColumn);
    } else {
      aData.objMafArchiver.dl.init(source, persistArgs.target, null, null, null, persist);
      var referer = getReferrer(document);
      persist.saveURI(source, null, referer, persistArgs.postData, null, persistArgs.target);
    }


    } catch(exc) {
      alert(exc);
    }

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
    objMafArchiver.start();
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
      var str = obj_ScriptableIO.read(obj_File.fileSize-1);
    } catch (e) {

    }
    obj_ScriptableIO.close();
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
    window.openDialog(url, "_blank", win_prefs, MafState, window, MafGUI);
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
        // If no html tag (uhm, ok then) append to top
        resultString = baseHrefString + sourceString;
      }
    } catch(e) {

    }
    return resultString;
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

  base64s: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

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

    // Split using regular expression
    var singleFiles = MHTFile.split(/------=_NextPart_[0-9,A-Z]+_[0-9,A-Z]+_[0-9,A-Z]+.[0-9,A-Z]+/);

    var urlToLocalFilenameMap = new Array();

    var url = Components.classes[urlContractID].createInstance();
    url = url.QueryInterface(urlIID);

    var indexOriginalURL = "Unknown";

    var quotedPrintableMap = new Array();

    // If there is only one part then not a multipart message
    if (singleFiles.length == 1) {
      try {
      //  Get the content type and content location
      var one_headersAndBody = new Array();

      if (singleFiles[0].indexOf("\r\n\r\n")!=-1) {
        one_headersAndBody[0] = singleFiles[0].substring(0, singleFiles[0].indexOf("\r\n\r\n"));
        one_headersAndBody[1] = singleFiles[0].substring(singleFiles[0].indexOf("\r\n\r\n")+4, singleFiles[0].length);
      } else {
        one_headersAndBody[0] = singleFiles[0].substring(0, singleFiles[0].indexOf("\n\n"));
        one_headersAndBody[1] = singleFiles[0].substring(singleFiles[0].indexOf("\n\n")+2, singleFiles[0].length);
      }

      var one_headerLines = one_headersAndBody[0].split(/\n/);

      var one_headerDetails = this._getHeaders(one_headerLines);

      if (one_headerDetails["content-transfer-encoding"] == "quoted-printable") {

        if (one_headerDetails["content-type"]!=null && one_headerDetails["content-type"].indexOf("text/html") >= 0) {
          // Create index.html
          MafUtils.createFile(MafUtils.appendToDir(realDestPath,"index.html"), this._decodeQuotedPrintable(one_headersAndBody[1]));
          urlToLocalFilenameMap[one_headerDetails["content-location"]] = MafUtils.appendToDir(realDestPath,"index.html");

          indexOriginalURL = one_headerDetails["content-location"];
        }
      }

      this._updateMetaData(one_headersAndBody[0], indexOriginalURL, datasource);

      } catch(e) {
        alert(e);
      }

    } else {

    // For each part
    for (var i=1; i<singleFiles.length; i++) { //

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

        urlToLocalFilenameMap[headerDetails["content-location"]] = MafUtils.appendToDir(index_filesDir,localFilename);

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
          MafUtils.createFile(MafUtils.appendToDir(index_filesDir,localFilename), this._decodeBase64(bodyData));

        } else if (headerDetails["content-transfer-encoding"] == "quoted-printable") {

        if (headerDetails["content-type"]!=null && headerDetails["content-type"].indexOf("text/html") >= 0) {
          // Create index.html
          MafUtils.createFile(MafUtils.appendToDir(realDestPath,"index.html"), this._decodeQuotedPrintable(headersAndBody[1]));
          urlToLocalFilenameMap[headerDetails["content-location"]] = MafUtils.appendToDir(realDestPath,"index.html");

          indexOriginalURL = headerDetails["content-location"];
        } else {
          //  Decode the part and save as the filename in index_files
          MafUtils.createFile(MafUtils.appendToDir(index_filesDir,localFilename), this._decodeQuotedPrintable(headersAndBody[1]));
        }

        quotedPrintableMap[quotedPrintableMap.length] = urlToLocalFilenameMap[headerDetails["content-location"]];

        }

      }

      } catch(e) {
        alert(e);
      }
    }


    // Rationalize absolute URLs to relative URLs
    for (var i=0; i<quotedPrintableMap.length; i++) {
      // For each quoted printable file
      var filename =  quotedPrintableMap[i];

      // Load the page contents in a string
      var contents = MafUtils.readFile(filename);

      try {

        contents = this.replaceUrls(contents, urlToLocalFilenameMap);
        contents = MafUtils.addBaseHref(contents, indexOriginalURL);

      } catch(e) {
        alert(e);
      }

      // Remove file
      MafUtils.deleteFile(filename);

      // Save page back
      MafUtils.createFile(filename, contents);
    }

    this._updateMetaData(singleFiles[0], indexOriginalURL, datasource);


    }

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
   */
  _getHeaders: function(headerLines) {
    var result = new Array();
    result["date"] = "Unknown";
    result["subject"] = "Unknown";
    for (var i=0; i<headerLines.length; i++) {
      var headerInfo = headerLines[i].split(/\:/);
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
    var result = "";

    try {
      var bits, decOut = '', i = 0;
      for(; i<encodedString.length; i += 4) {
        bits = (this.base64s.indexOf(encodedString.charAt(i)) & 0xff) <<18 |
               (this.base64s.indexOf(encodedString.charAt(i +1)) & 0xff) <<12 |
               (this.base64s.indexOf(encodedString.charAt(i +2)) & 0xff) << 6 |
               this.base64s.indexOf(encodedString.charAt(i +3)) & 0xff;
        decOut += String.fromCharCode( (bits & 0xff0000) >>16, (bits & 0xff00) >>8, bits & 0xff );
      }
      if(encodedString.charCodeAt(i -2) == 61)
        undecOut=decOut.substring(0, decOut.length -2);
      else if(encodedString.charCodeAt(i -1) == 61)
        undecOut=decOut.substring(0, decOut.length -1);
      else undecOut=decOut;

      result = unescape(undecOut); //line add for chinese char
    } catch(e) {
      alert(e);
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
   * Might do this eventually, for now, not supported
   */
  archiveDownload: function(archivefile, sourcepath) {
    alert("Saving as MHT is not supported.");
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

