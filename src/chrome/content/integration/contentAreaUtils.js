/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Ben Goodger <ben@netscape.com> (Save File)
 *   Fredrik Holmqvist <thesuckiestemail@yahoo.se>
 *   Asaf Romano <mozilla.mano@sent.com>
 *   Ehsan Akhgari <ehsan.akhgari@gmail.com>
 *   Paolo Amadini <http://www.amadzone.org/>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * internalSave: Used when saving a document or URL.
 *
 * If aChosenData is null, this method:
 *  - Determines a local target filename to use
 *  - Prompts the user to confirm the destination filename and save mode
 *    (aContentType affects this)
 *  - [Note] This process involves the parameters aURL, aReferrer (to determine
 *    how aURL was encoded), aDocument, aDefaultFileName, aFilePickerTitleKey,
 *    and aSkipPrompt.
 *
 * If aChosenData is non-null, this method:
 *  - Uses the provided source URI and save file name
 *  - Saves the document as complete DOM if possible (aDocument present and
 *    right aContentType)
 *  - [Note] The parameters aURL, aDefaultFileName, aFilePickerTitleKey, and
 *    aSkipPrompt are ignored.
 *
 * In any case, this method:
 *  - Creates a 'Persist' object (which will perform the saving in the
 *    background) and then starts it.
 *  - [Note] This part of the process only involves the parameters aDocument,
 *    aShouldBypassCache and aReferrer. The source, the save name and the save
 *    mode are the ones determined previously.
 *
 * @param aURL
 *        The String representation of the URL of the document being saved
 * @param aDocument
 *        The document to be saved
 * @param aDefaultFileName
 *        The caller-provided suggested filename if we don't 
 *        find a better one
 * @param aContentDisposition
 *        The caller-provided content-disposition header to use.
 * @param aContentType
 *        The caller-provided content-type to use
 * @param aShouldBypassCache
 *        If true, the document will always be refetched from the server
 * @param aFilePickerTitleKey
 *        Alternate title for the file picker
 * @param aChosenData
 *        If non-null this contains an instance of object AutoChosen (see below)
 *        which holds pre-determined data so that the user does not need to be
 *        prompted for a target filename.
 * @param aReferrer
 *        the referrer URI object (not URL string) to use, or null
 *        if no referrer should be sent.
 * @param aSkipPrompt [optional]
 *        If set to true, we will attempt to save the file to the
 *        default downloads folder without prompting.
 *        When this function is called, directly or indirectly, by Mozilla
 *        Archive Format to save a file automatically, this parameter can also
 *        be an object with the following properties:
 *         - saveDir: nsILocalFile instance pointing to the directory where the
 *           specified document should be saved. The filename is determined
 *           automatically, using "index" as the basename.
 *         - mafEventListener: Object implementing the onSaveNameDetermined,
 *           onDownloadComplete, and onDownloadFailed event functions.
 *        When this function is called, directly or indirectly, by Mozilla
 *        Archive Format to ask the user to save an archive, this parameter can
 *        also be an object with the following properties:
 *         - mafAskSaveArchive: True to ask to save archives only.
 */
function internalSave(aURL, aDocument, aDefaultFileName, aContentDisposition,
                      aContentType, aShouldBypassCache, aFilePickerTitleKey,
                      aChosenData, aReferrer, aSkipPrompt)
{
  if (aSkipPrompt == undefined)
    aSkipPrompt = false;

  // We use aSkipPrompt also to convey the saveAllTabs flag
  var mafAskSaveArchive = false;
  if (typeof aSkipPrompt == "object" && aSkipPrompt.mafAskSaveArchive) {
    mafAskSaveArchive = true;
    aSkipPrompt = false;
  }

  // Note: aDocument == null when this code is used by save-link-as...

  // Note: GetSaveModeForContentType can return a value different from
  // SAVEMODE_SAMEFORMAT only if aContentType is present and is a document type
  // (in particular, not an image type). In turn, aContentType can be present
  // only when this function is called from saveDocument or saveImageURL, but
  // in the latter case aContentType is an image type. The saveDocument
  // function always provides aDocument, while other callers never provide it.
  // Thus:
  // saveMode != SAVEMODE_SAMEFORMAT  =>  aDocument != null
  // aDocument == null  =>  aContentType != "<any-type-in-GetSaveModeForContentType>"
  //                    =>  saveMode == SAVEMODE_SAMEFORMAT

  var saveMode = GetSaveModeForContentType(aContentType, aDocument);
  var isDocument = aDocument != null && saveMode != SAVEMODE_SAMEFORMAT;

  var file, fileURL, sourceURI, saveBehavior;
  // Find the URI object for aURL and the FileName/Extension to use when saving.
  // FileName/Extension will be ignored if aChosenData supplied.
  if (aChosenData) {
    file = aChosenData.file;
    sourceURI = aChosenData.uri;
    saveBehavior = gCompleteSaveBehavior;
  } else {
    var charset = null;
    if (aDocument)
      charset = aDocument.characterSet;
    else if (aReferrer)
      charset = aReferrer.originCharset;
    var fileInfo = new FileInfo(aDefaultFileName);
    initFileInfo(fileInfo, aURL, charset, aDocument,
                 aContentType, aContentDisposition);
    sourceURI = fileInfo.uri;

    var fpParams = {
      fpTitleKey: aFilePickerTitleKey,
      fileInfo: fileInfo,
      contentType: aContentType,
      // When saving all tabs, only offer the choice of creating an archive
      saveMode: mafAskSaveArchive ? SAVEMODE_MAFARCHIVE : saveMode,
      saveBehavior: gCompleteSaveBehavior,
      file: file,
      fileURL: fileURL
    };

    // When aSkipPrompt is an object provided by Mozilla Archive Format, no user
    //  prompt is shown and the file is saved in the specified directory using
    //  "index" as the basename.
    if (typeof aSkipPrompt == "object") {
      // Find the leaf name of the file to be saved
      var saveFileName = getNormalizedLeafName("index", fileInfo.fileExt);
      // Notify the Mozilla Archive Format saving component
      try {
        aSkipPrompt.mafEventListener.onSaveNameDetermined(saveFileName);
      } catch(e) {
        Components.utils.reportError(e);
      }
      // Build the target file object
      fpParams.file = aSkipPrompt.saveDir.clone();
      fpParams.file.append(saveFileName);
    } else {
      if (!getTargetFile(fpParams, aSkipPrompt))
        // If the method returned false this is because the user cancelled from
        // the save file picker dialog.
        return;
    }

    saveBehavior = fpParams.saveBehavior;
    
    // When asking to save in an archive, if All Files is selected we will save
    //  the file using the default archive format
    if (mafAskSaveArchive && saveBehavior == gNormalSaveBehavior) {
      // Note: in this case, aDocument is specified and the original saveMode
      //  includes SAVEMODE_MAFARCHIVE, so we needn't worry that saveBehavior
      //  be changed later
      saveBehavior = gMafDefaultSaveBehavior;
    }

    file = fpParams.file;
    fileURL = fpParams.fileURL;
  }

  // The save behavior may not be valid for the save mode if it was determined
  // automatically instead of through the file picker.
  if (!saveBehavior.isValidForSaveMode(saveMode)) {
    saveBehavior = gNormalSaveBehavior;
  }

  // Handle saving a web archive using the Mozilla Archive Format extension
  if (saveBehavior.isMafArchive) {
    // Always add the archive extension if not explicitly specified. No check
    //  is done to see if a file with the new name already exists.
    var mandatoryExtension = saveBehavior.mandatoryExtension;
    var filename = file.path;
    if (filename.substring(filename.length - mandatoryExtension.length,
     filename.length).toLowerCase() != mandatoryExtension.toLowerCase()) {
      filename += mandatoryExtension;
      // If an extension is added later, check if a file with the new name
      //  already exists. This code will be replaced by a new mechanism.
      if (MafUtils.checkFileExists(filename)) {
        if(!browserWindow.confirm('Overwrite "' + filename + '"?')) {
          return;
        }
      }
    }

    // Save the selected page in the web archive
    Maf.saveAsWebPageComplete(window.getBrowser().selectedBrowser,
     saveBehavior.mafArchiveType, filename);

    // Do not continue with the normal save process
    return;
  }

  if (!fileURL)
    fileURL = makeFileURI(file);

  var useSaveDocument = (aDocument != null) && saveBehavior.isComplete;
  // If we're saving a document, and are saving either in complete mode or
  // as converted text, pass the document to the web browser persist component.
  // If we're just saving the HTML (second option in the list), send only the URI.
  var persistArgs = {
    sourceURI         : sourceURI,
    sourceReferrer    : aReferrer,
    sourceDocument    : useSaveDocument ? aDocument : null,
    targetContentType : saveBehavior.targetContentType,
    targetFile        : file,
    targetFileURL     : fileURL,
    sourcePostData    : isDocument ? getPostData() : null,
    bypassCache       : aShouldBypassCache
  };

  // Start the actual save process
  internalPersist(persistArgs, aSkipPrompt);
}

/**
 * internalPersist: Creates a 'Persist' object (which will perform the saving
 *  in the background) and then starts it.
 *
 * @param persistArgs.sourceURI
 *        The nsIURI of the document being saved
 * @param persistArgs.sourceDocument [optional]
 *        The document to be saved, or null if not saving a complete document
 * @param persistArgs.sourceReferrer
 *        Required and used only when persistArgs.sourceDocument is NOT present,
 *        the nsIURI of the referrer to use, or null if no referrer should be
 *        sent.
 * @param persistArgs.sourcePostData
 *        Required and used only when persistArgs.sourceDocument is NOT present,
 *        represents the POST data to be sent along with the HTTP request, and
 *        must be null if no POST data should be sent.
 * @param persistArgs.targetFile
 *        The nsIFile of the file to create
 * @param persistArgs.targetFileURL
 *        The nsIURI associated with persistArgs.targetFile
 * @param persistArgs.targetContentType
 *        Required and used only when persistArgs.sourceDocument is present,
 *        determines the final content type of the saved file, or null to use
 *        the same content type as the source document. Currently only
 *        "text/plain" is meaningful.
 * @param persistArgs.bypassCache
 *        If true, the document will always be refetched from the server
 */
function internalPersist(persistArgs, /* For MAF */ aSkipPrompt)
{
  // Check if the Mozilla Archive Format internal save component should be used
  var persist;
  if (Prefs.saveComponent == Prefs.SAVECOMPONENT_MAF &&
      persistArgs.sourceDocument && !persistArgs.targetContentType) {
    // This component can only save a complete document without converting its
    //  content type
    persist = new MafWebBrowserPersistClass();
  } else {
    persist = makeWebBrowserPersist();
  }

  // Calculate persist flags.
  const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
  if (persistArgs.bypassCache)
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
  else
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

  // Leave it to WebBrowserPersist to discover the encoding type (or lack thereof):
  persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

  // Create download and initiate it (below)
  var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);

  if (persistArgs.sourceDocument) {
    // Saving a Document, not a URI:
    var filesFolder = null;
    if (persistArgs.targetContentType != "text/plain") {
      // Create the local directory into which to save associated files.
      filesFolder = persistArgs.targetFile.clone();

      var nameWithoutExtension = getFileBaseName(filesFolder.leafName);
      var filesFolderLeafName = getStringBundle().formatStringFromName("filesFolder",
                                                                       [nameWithoutExtension],
                                                                       1);

      filesFolder.leafName = filesFolderLeafName;
    }

    var encodingFlags = 0;
    if (persistArgs.targetContentType == "text/plain") {
      encodingFlags |= nsIWBP.ENCODE_FLAGS_FORMATTED;
      encodingFlags |= nsIWBP.ENCODE_FLAGS_ABSOLUTE_LINKS;
      encodingFlags |= nsIWBP.ENCODE_FLAGS_NOFRAMES_CONTENT;
    }
    else {
      encodingFlags |= nsIWBP.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES;
    }
  }

  tr.init(persistArgs.sourceURI,
          persistArgs.targetFileURL, "", null, null, null, persist);

  // Mozilla Archive Format indirectly uses this function to save an already
  //  loaded document to a temporary file on disk, before generating the final
  //  archive. If the document saving was initiated by MAF, we add another
  //  download listener, that in turn will call the second-level listener
  //  specified in the eventListener property of the aSkipPrompt object.
  if (typeof aSkipPrompt == "object")
    tr = new MafWebProgressListener(aSkipPrompt.mafEventListener, tr);

  persist.progressListener = new DownloadListener(window, tr);

  if (persistArgs.sourceDocument) {
    const kWrapColumn = 80;
    persist.saveDocument(persistArgs.sourceDocument, persistArgs.targetFileURL, filesFolder,
                         persistArgs.targetContentType, encodingFlags, kWrapColumn);
  } else {
    persist.saveURI(persistArgs.sourceURI,
                    null, persistArgs.sourceReferrer, persistArgs.sourcePostData, null,
                    persistArgs.targetFileURL);
  }
}

function getTargetFile(aFpP, /* optional */ aSkipPrompt)
{
  const prefSvcContractID = "@mozilla.org/preferences-service;1";
  const prefSvcIID = Components.interfaces.nsIPrefService;                              
  var prefs = Components.classes[prefSvcContractID]
                        .getService(prefSvcIID).getBranch("browser.download.");

  const nsILocalFile = Components.interfaces.nsILocalFile;

  // For information on download folder preferences, see
  // mozilla/browser/components/preferences/main.js
  
  var useDownloadDir = prefs.getBoolPref("useDownloadDir");
  var dir = null;
  
  // Default to lastDir if useDownloadDir is false, and lastDir
  // is configured and valid. Otherwise, use the user's default
  // downloads directory configured through download prefs.
  var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
                          .getService(Components.interfaces.nsIDownloadManager);
  try {                          
    var lastDir = prefs.getComplexValue("lastDir", nsILocalFile);
    if ((!aSkipPrompt || !useDownloadDir) && lastDir.exists())
      dir = lastDir;
    else
      dir = dnldMgr.userDownloadsDirectory;
  } catch(ex) {
    dir = dnldMgr.userDownloadsDirectory;
  }

  if (!aSkipPrompt || !useDownloadDir || !dir || (dir && !dir.exists())) {
    if (!dir || (dir && !dir.exists())) {
      // Default to desktop.
      var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"]
                                  .getService(Components.interfaces.nsIProperties);
      dir = fileLocator.get("Desk", nsILocalFile);
    }

    var fp = makeFilePicker();
    var titleKey = aFpP.fpTitleKey || "SaveLinkTitle";
    var bundle = getStringBundle();
    fp.init(window, bundle.GetStringFromName(titleKey), 
            Components.interfaces.nsIFilePicker.modeSave);
    
    fp.defaultExtension = aFpP.fileInfo.fileExt;
    fp.defaultString = getNormalizedLeafName(aFpP.fileInfo.fileName,
                                             aFpP.fileInfo.fileExt);
    var saveBehaviors = [];
    appendFiltersForContentType(fp, aFpP.contentType, aFpP.fileInfo.fileExt,
                                aFpP.saveMode, saveBehaviors);

    if (dir)
      fp.displayDirectory = dir;
    
    if (aFpP.saveMode != SAVEMODE_SAMEFORMAT) {
      try {
        fp.filterIndex = prefs.getIntPref("save_converter_index");
      }
      catch (e) {
      }
    }

    if (fp.show() == Components.interfaces.nsIFilePicker.returnCancel || !fp.file)
      return false;

    // Do not remember the last save directory inside the private browsing mode
    var persistLastDir = true;
    try {
      var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]
                          .getService(Components.interfaces.nsIPrivateBrowsingService);
      if (pbs.privateBrowsingEnabled)
        persistLastDir = false;
    }
    catch (e) {
    }
    if (persistLastDir) {
      var directory = fp.file.parent.QueryInterface(nsILocalFile);
      prefs.setComplexValue("lastDir", nsILocalFile, directory);
    }

    fp.file.leafName = validateFileName(fp.file.leafName);
    aFpP.saveBehavior = saveBehaviors[fp.filterIndex];
    aFpP.file = fp.file;
    aFpP.fileURL = fp.fileURL;

    if (aFpP.saveMode != SAVEMODE_SAMEFORMAT)
      prefs.setIntPref("save_converter_index", fp.filterIndex);
  }
  else {
    dir.append(getNormalizedLeafName(aFpP.fileInfo.fileName,
                                     aFpP.fileInfo.fileExt));
    var file = dir;
    
    // Since we're automatically downloading, we don't get the file picker's 
    // logic to check for existing files, so we need to do that here.
    //
    // Note - this code is identical to that in
    //   mozilla/toolkit/mozapps/downloads/src/nsHelperAppDlg.js.in
    // If you are updating this code, update that code too! We can't share code
    // here since that code is called in a js component.
    var collisionCount = 0;
    while (file.exists()) {
      collisionCount++;
      if (collisionCount == 1) {
        // Append "(2)" before the last dot in (or at the end of) the filename
        // special case .ext.gz etc files so we don't wind up with .tar(2).gz
        if (file.leafName.match(/\.[^\.]{1,3}\.(gz|bz2|Z)$/i))
          file.leafName = file.leafName.replace(/\.[^\.]{1,3}\.(gz|bz2|Z)$/i, "(2)$&");
        else
          file.leafName = file.leafName.replace(/(\.[^\.]*)?$/, "(2)$&");
      }
      else {
        // replace the last (n) in the filename with (n+1)
        file.leafName = file.leafName.replace(/^(.*\()\d+\)/, "$1" + (collisionCount+1) + ")");
      }
    }
    aFpP.file = file;
  }

  return true;
}

/**
 * Populate the filter list of the file picker using the valid save behaviors
 * for the specified save mode. The aReturnBehaviorArray is populated with the
 * save behaviors that have been actually added to the file picker, including
 * the standard behavior for "All Files".
 */
function appendFiltersForContentType(aFilePicker, aContentType, aFileExtension,
                                     aSaveMode, aReturnBehaviorArray)
{
  // For every behavior that is valid for the given save mode
  gInternalSaveBehaviors.forEach(function(saveBehavior) {
    if(saveBehavior.isValidForSaveMode(aSaveMode)) {
      // Add the corresponding file filter if one is provided
      var filter = saveBehavior.getFileFilter(aContentType, aFileExtension);
      if (filter.mask) {
        aFilePicker.appendFilters(filter.mask);
        aReturnBehaviorArray.push(saveBehavior);
      } else if (filter.extensionstring) {
        aFilePicker.appendFilter(filter.title, filter.extensionstring);
        aReturnBehaviorArray.push(saveBehavior);
      }
    }
  });

  // Always append the all files (*) filter
  aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
  aReturnBehaviorArray.push(gNormalSaveBehavior);
}

/**
 * The stateless objects that extend this one represent the possible methods
 *  to save a web page or other file locally. Every object based on
 *  InternalSaveBehavior maps to a save filter in the save file picker dialog.
 */
function InternalSaveBehavior() { }

InternalSaveBehavior.prototype = {
  /** True if this save behavior is for a complete web page or document. */
  isComplete: false,

  /** Target content type for the complete save, or null to use the default. */
  targetContentType: null,

  /**
   * Returns true is this filter should be included for the given save mode.
   */
  isValidForSaveMode: function(aSaveMode) {
    return true;
  },

  /**
   * Returns an object containing the filter string and description to use in
   *  the save file picker dialog.
   *
   * @param aContentType
   *        The content type of the document being saved
   * @param aFileExtension
   *        The file extension of the document being saved
   *
   * @return .mask [optional]
   *           One and only one of the constants defined in nsIFilePicker for
   *           the appendFilters method. If present, .title and .extensionstring
   *           should be ignored.
   *         .extensionstring [optional]
   *           Filter extensions, for example "*.htm; *.html".
   *         .title
   *           Filter display label, for example "Web Page, HTML only". Must
   *           be returned only if .extensionstring is present.
   *
   * Warning: if neither .mask nor .extensionstring is returned, then the save
   * behavior will not be available from the file picker. Currently this can
   * only happen for the "normal" save mode, that is reachable in any case from
   * the "All Files" filter.
   */
  getFileFilter: function(aContentType, aFileExtension) {
    // Default implementation: use well-known file extensions for the well-known
    //  content types, otherwise try to get the list of valid extensions from
    //  the system.

    var bundle = getStringBundle();
    // The bundle name for saving only a specific content type.
    var bundleName;
    // The actual filter name for a specific content type.
    var filterName = null;
    // The corresponding filter string for a specific content type.
    var filterString = null;

    // Try with known content types first
    // Note: all the cases that are handled in GetSaveModeForContentType to
    // return SAVEMODE_COMPLETE_DOM should also be handled explicitly here,
    // otherwise the file picker dialog might not be able to offer the choice
    // of saving as complete DOM.
    switch (aContentType) {
    case "text/html":
      bundleName   = "WebPageHTMLOnlyFilter";
      filterString = "*.htm; *.html";
      break;

    case "application/xhtml+xml":
      bundleName   = "WebPageXHTMLOnlyFilter";
      filterString = "*.xht; *.xhtml";
      break;

    case "image/svg+xml":
      bundleName   = "WebPageSVGOnlyFilter";
      filterString = "*.svg; *.svgz";
      break;

    case "text/xml":
    case "application/xml":
      bundleName   = "WebPageXMLOnlyFilter";
      filterString = "*.xml";
      break;
    }

    if (filterString) {
      // Get the filter description for the well-known content type
      filterName = bundle.GetStringFromName(bundleName);
    } else {
      // This is not one of the known content types,
      // get the filter info from the system if possible
      var mimeInfo = getMIMEInfoForType(aContentType, aFileExtension);
      if (mimeInfo) {

        var extEnumerator = mimeInfo.getFileExtensions();

        var extString = "";
        while (extEnumerator.hasMore()) {
          var extension = extEnumerator.getNext();
          if (extString)
            extString += "; ";    // If adding more than one extension,
                                  // separate by semi-colon
          extString += "*." + extension;
        }

        if (extString) {
          filterName = mimeInfo.description;
          filterString = extString;
        }
      }
    }

    // Note: filterName and filterString might be null
    return {title: filterName, extensionstring: filterString};
  }
}

/** The normal save behavior (also used when All Files is selected) */
var gNormalSaveBehavior = new InternalSaveBehavior();
gNormalSaveBehavior.isValidForSaveMode = function(aSaveMode) {
  return aSaveMode & SAVEMODE_SAMEFORMAT;
};

/** The "save as complete web page" behavior. */
var gCompleteSaveBehavior = new InternalSaveBehavior();
gCompleteSaveBehavior.isComplete = true;
gCompleteSaveBehavior.isValidForSaveMode = function(aSaveMode) {
  return aSaveMode & SAVEMODE_COMPLETE_DOM;
};
gCompleteSaveBehavior.getFileFilter = function(aContentType, aFileExtension) {
  // Keep the same extensions as the normal behavior, override the description
  filter = this.__proto__.getFileFilter(aContentType, aFileExtension);
  filter.title = getStringBundle().GetStringFromName("WebPageCompleteFilter");
  return filter;
};

/** The "save as text only" behavior. */
var gTextOnlySaveBehavior = new InternalSaveBehavior();
gTextOnlySaveBehavior.isComplete = true;
gTextOnlySaveBehavior.targetContentType = "text/plain";
gTextOnlySaveBehavior.isValidForSaveMode = function(aSaveMode) {
  return aSaveMode & SAVEMODE_COMPLETE_TEXT;
};
gTextOnlySaveBehavior.getFileFilter = function(aContentType, aFileExtension) {
  return {mask: Components.interfaces.nsIFilePicker.filterText};
};

/** The list of registered save behaviors. */
var gInternalSaveBehaviors = [
  gCompleteSaveBehavior,
  gNormalSaveBehavior,
  gTextOnlySaveBehavior
];

// Special save modes for Mozilla Archive Format
const SAVEMODE_MAFARCHIVE = 0x100;
const SAVEMODE_SAMEFORMAT = 0x200;

function GetSaveModeForContentType(aContentType, aDocument)
{
  // We can only save a complete page if we have a loaded document
  if (!aDocument)
    return SAVEMODE_SAMEFORMAT;

  // Find the possible save modes using the provided content type
  var saveMode = SAVEMODE_SAMEFORMAT | SAVEMODE_MAFARCHIVE;
  switch (aContentType) {
  case "text/html":
  case "application/xhtml+xml":
  case "image/svg+xml":
    saveMode |= SAVEMODE_COMPLETE_TEXT;
    // Fall through
  case "text/xml":
  case "application/xml":
    saveMode |= SAVEMODE_COMPLETE_DOM;
    break;
  }

  return saveMode;
}
