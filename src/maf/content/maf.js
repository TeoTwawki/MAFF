/**
 * Mozilla Archive Format
 * ======================
 *
 * Version: 0.3.0
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
 * Changes from 0.2.20 to 0.3.0
 *
 * Styled the tree splitters in the browse open archives.
 * Split javascript objects into seperate files. There is now also a global preference state.
 * Selecting file from browse dialog should now start in directory if possible.
 * Fixed bug that did not allow saving pages in an archive if the pages were in a new window.
 * Retrofitted the download and archive code to use an observer event instead of interval timers. Should seem faster.
 * Added drag and drop archive support.
 * Added file association support and ability to open archives from Open File menu entry.
 * Added an idle update function which gives the user some visual feedback when an archive is opened.
 * Updated the MHT Handler to cater for saving multiple tabs.
 * Fixed bug with file association and loading of preferences.
 *
 *
 * Changes from 0.2.19 to 0.2.20 - Completed
 *
 * Optional function that is executed when a single page is added to archive - An alert telling the user archive is complete
 * Opening tabs from browse dialog now uses blank tab if possible.
 * Binary Streams are now used for MHT encoding and decoding.
 * Fixed reader bug when reading file using MafUtils.
 * Fixed Quoted Printable encoding to not split = escaped codes across new lines when a line length limit exists.
 * MHT decoding now explicitly caters for parts having content type multipart/alternative.
 * Updated URL rewrite functionality - Support for rewritting urls that contain # for internal links.
 *                                   - URL rewrite only on pages that are in an archive.
 * Isolated native save code - Saving should work without modification across firefox and mozilla browsers.
 *                           - Temporarily disables download window showing up using a preference value.
 * Added MHT encoding code - Now possible to save as MHT and have the file display in IE.
 * Extended Meta-Data save implementation - Text zoom, Scroll position and URL History can be saved.
 * Added support for post install setup - For new firefox 0.9 installations.
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
  saveAsWebPageComplete: function(aBrowser, tempPath, scriptPath, archivePath) {
    var dateTimeArchived = new Date();

    var objMafArchiver = new MafArchiver(aBrowser, tempPath, scriptPath, archivePath, dateTimeArchived);

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


window.addEventListener("close", MafUtils.onWindowClose, true);
window.addEventListener("load", MafUtils.onWindowLoad, true);
window.addEventListener("load", MafUtils.onTabLoad, true);

function debug(text) {
  var csClass = Components.classes['@mozilla.org/consoleservice;1'];
  var cs = csClass.getService(Components.interfaces.nsIConsoleService);
  cs.logStringMessage(text);
}

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

////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
//////////////  Redefine global functions - 'cuz it's open source and fun!!!  //////////////
////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

var loadURIios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

    // If we're being called before windows start appearing, we haven't loaded anything as yet
    // TODO: Add an APPSTART observer that takes care of this kind of stuff
    //       Also make all the objects classes and create instances of them in hidden window
    //         on APPSTART
if (!MafPreferences.isLoaded) { MafPreferences.load(); }

var loadURIMafRegExp = MafPreferences.getOpenFilterRegEx();

/**
 * Redefine the loadURI code to check and see if it's a MAF file first
 */
function loadURI(uri, referrer, postData)
{

  if (!uri.match(loadURIMafRegExp)) {
    // Original loadURI function
    try {
      if (postData === undefined)
        postData = null;
      getWebNavigation().loadURI(uri, nsIWebNavigation.LOAD_FLAGS_NONE, referrer, postData, null);
    } catch (e) {
    }
  } else {

    // Get leaf name
    try {
      var ouri = loadURIios.newURI(uri, "", null);    // Create URI object
      var file = ouri.QueryInterface(Components.interfaces.nsIFileURL).file;
    } catch(e) {
      debug(e);

      // It wasn't a URL of the form file://, let's try again, shall we?
      try {
        var file = Components.classes[localFileContractID].createInstance(localFileIID);
        file.initWithPath(uri);
      } catch(ex) {
        // Give up
        debug("MAF LoadURI has given up:" + ex);
      }
    }

    var ismaf = false;

    try {
      // If file extension match any of the filters MAF handles
      var filterIndex = MafPreferences.getOpenFilterIndexFromFilename(file.leafName);

      // Get matching filter
      ismaf = (filterIndex != -1);
    } catch(e) {

    }

    if (!ismaf) {
      // Original loadURI function
      try {
        if (postData === undefined)
          postData = null;
        getWebNavigation().loadURI(uri, nsIWebNavigation.LOAD_FLAGS_NONE, referrer, postData, null);
      } catch (e) {
      }
    } else {
      // Get original url's to local file path
      var localFilePath = file.path;

      // Get hidden window
      var appShell = Components.classes[appShellContractID].getService(appShellIID);
      var hiddenWnd = appShell.hiddenDOMWindow;

      if (hiddenWnd.loaded) {
        // Open as a MAF with registered filter
        setTimeout(Maf.openFromArchive, 100, MafPreferences.temp,
                            MafPreferences.programFromOpenIndex(filterIndex), localFilePath);
      } else {
        // Queue, load request from command line
        MafOpenQueue.add(localFilePath, filterIndex);
      }
    }
  }
}

/**
 * A new and improved open. With MAF support.
 */
function BrowserOpenFileWindow()
{
  // Get filepicker component.
  try {
    const nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, gNavigatorBundle.getString("openFile"), nsIFilePicker.modeOpen);

    fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterImages |
                     nsIFilePicker.filterXML | nsIFilePicker.filterHTML);

    var filters = MafPreferences.getOpenFilters();
    for (var i=0; i<filters.length; i++) {
      var title = filters[i][0];
      var mask = filters[i][1];
      fp.appendFilter(title, mask);
    }

    fp.appendFilters(nsIFilePicker.filterAll);

    if (fp.show() == nsIFilePicker.returnOK)
      openTopWin(fp.fileURL.spec);
  } catch (ex) {
  }
}
