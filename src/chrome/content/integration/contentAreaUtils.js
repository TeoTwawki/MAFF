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
 *   Kathleen Brade <brade@pearlcrescent.com>
 *   Mark Smith <mcs@pearlcrescent.com>
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
 * This function is identical to saveDocument, but is required for compatibility
 *  with SeaMonkey 2.0 as its saveDocument function does not propagate the
 *  aSkipPrompt parameter.
 */
function mafSaveDocument(aDocument, aSkipPrompt)
{
  if (!aDocument)
    throw "Must have a document when calling saveDocument";

  // We want to use cached data because the document is currently visible.
  var ifreq =
    aDocument.defaultView
             .QueryInterface(Components.interfaces.nsIInterfaceRequestor);

  var contentDisposition = null;
  try {
    contentDisposition =
      ifreq.getInterface(Components.interfaces.nsIDOMWindowUtils)
           .getDocumentMetadata("content-disposition");
  } catch (ex) {
    // Failure to get a content-disposition is ok
  }

  var cacheKey = null;
  try {
    cacheKey =
      ifreq.getInterface(Components.interfaces.nsIWebNavigation)
           .QueryInterface(Components.interfaces.nsIWebPageDescriptor);
  } catch (ex) {
    // We might not find it in the cache.  Oh, well.
  }

  internalSave(aDocument.location.href, aDocument, null, contentDisposition,
               aDocument.contentType, false, null, null,
               aDocument.referrer ? makeURI(aDocument.referrer) : null,
               aSkipPrompt, cacheKey);
}

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
 *         - saveWithMedia: If true, the Save Complete persist object is
 *           configured to save the media files that are present in the page.
 *         - saveWithContentLocation: If true, the Save Complete persist object
 *           is configured to save the page for inclusion in an MHTML file.
 *         - mafEventListener: Object implementing the onSaveNameDetermined,
 *           onDownloadComplete, and onDownloadFailed event functions. The
 *           persistObject property may also be set on the object.
 *        When this function is called, directly or indirectly, by Mozilla
 *        Archive Format to ask the user to save an archive, this parameter can
 *        also be an object with the following properties:
 *         - mafAskSaveArchive: True to ask to save archives only.
 *         - mafSaveTabs [optional]: Array of browser objects corresponding to
 *           the tabs to be saved.
 *        When this function is called, directly or indirectly, by Mozilla
 *        Archive Format to create an archive automatically, this parameter can
 *        also be an object with the following properties:
 *         - targetFile: nsIFile of the final destination page or archive.
 *         - saveBehavior: Save behavior to use when creating the file.
 *         - mafProgressListener: Object implementing the nsIWebProgressListener
 *           interface, used to detect when the operation completes.
 * @param aCacheKey [optional]
 *        If set will be passed to saveURI.  See nsIWebBrowserPersist for
 *        allowed values.
 */
function internalSave(aURL, aDocument, aDefaultFileName, aContentDisposition,
                      aContentType, aShouldBypassCache, aFilePickerTitleKey,
                      aChosenData, aReferrer, aSkipPrompt, aCacheKey)
{
  if (aSkipPrompt == undefined)
    aSkipPrompt = false;

  if (aCacheKey == undefined)
    aCacheKey = null;

  // We use aSkipPrompt also to convey the saveAllTabs flag
  var mafAskSaveArchive = false;
  var mafSaveTabs = null;
  if (typeof aSkipPrompt == "object" && aSkipPrompt.mafAskSaveArchive) {
    mafAskSaveArchive = true;
    mafSaveTabs = aSkipPrompt.mafSaveTabs;
    aSkipPrompt = false;
  }

  // Get a reference to the main content browser, if available in the window
  var mainBrowser = window.getBrowser && window.getBrowser().selectedBrowser;

  // Note: aDocument == null when this code is used by save-link-as...
  var saveMode = GetSaveModeForContentType(aContentType, aDocument);

  var file, sourceURI, saveBehavior;
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
      file: file
    };

    // When aSkipPrompt is an object provided by Mozilla Archive Format, no user
    //  prompt is shown and the file is saved in the specified directory using
    //  "index" as the basename.
    if (typeof aSkipPrompt == "object") {
      if (aSkipPrompt.targetFile) {
        // Use the parameters from the provided object
        fpParams.file = aSkipPrompt.targetFile.clone();
        fpParams.saveBehavior = aSkipPrompt.saveBehavior;
      } else {
        // Find the leaf name of the file to be saved. Since in some cases the
        //  browser erroneously reads the default extension from the page title,
        //  if the content we are saving has a known document type, use the
        //  well-known extension for that type.
        var fileExtension = fileInfo.fileExt;
        switch (aContentType) {
        case "text/html":
          fileExtension = "html";
          break;
        case "application/xhtml+xml":
          fileExtension = "xhtml";
          break;
        case "image/svg+xml":
          fileExtension = "svg";
          break;
        case "text/xml":
        case "application/xml":
          fileExtension = "xml";
          break;
        }
        var saveFileName = getNormalizedLeafName("index", fileExtension);
        // Notify the Mozilla Archive Format saving component
        try {
          aSkipPrompt.mafEventListener.onSaveNameDetermined(saveFileName);
        } catch(e) {
          Components.utils.reportError(e);
        }
        // Build the target file object
        fpParams.file = aSkipPrompt.saveDir.clone();
        fpParams.file.append(saveFileName);
      }
    } else {
      if (!getTargetFile(fpParams, aSkipPrompt))
        // If the method returned false this is because the user cancelled from
        // the save file picker dialog.
        return;
    }

    saveBehavior = fpParams.saveBehavior;
    file = fpParams.file;
  }

  // The save behavior may not be valid for the save mode if it was determined
  // automatically instead of through the file picker.
  if (!saveBehavior.isValidForSaveMode(saveMode)) {
    saveBehavior = gNormalSaveBehavior;
  }

  // Create a custom web browser persist object if required
  var mafPersistObject = null;
  if (saveBehavior.getPersistObject) {
    // If the save wasn't initiated from a list of tabs, but the document to be
    //  saved is the main document in the browser window, ensure the browser
    //  object is passed to the archive persist object, to enable saving the
    //  additional metadata.
    if (!mafSaveTabs && mainBrowser &&
        (aDocument == mainBrowser.contentDocument)) {
      mafSaveTabs = [mainBrowser];
    }
    // Create the actual persist object
    mafPersistObject = saveBehavior.getPersistObject(mafSaveTabs);
  }

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
    sourceCacheKey    : aCacheKey,
    sourcePostData    : aDocument ? getPostData(aDocument) : null,
    bypassCache       : aShouldBypassCache,
    persistObject     : mafPersistObject
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
 * @param persistArgs.sourceCacheKey [optional]
 *        If set will be passed to saveURI
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
  if (persistArgs.persistObject) {
    persist = persistArgs.persistObject;
  } else if ((MozillaArchiveFormat.Prefs.saveComponent ==
              MozillaArchiveFormat.Prefs.SAVECOMPONENT_SAVECOMPLETE ||
              MozillaArchiveFormat.Prefs.saveComponent ==
              MozillaArchiveFormat.Prefs.SAVECOMPONENT_EXACTPERSIST) &&
      persistArgs.sourceDocument && !persistArgs.targetContentType &&
      (persistArgs.sourceDocument.contentType == "text/html" ||
      persistArgs.sourceDocument.contentType == "application/xhtml+xml")) {
    // Save Complete can only save a complete HTML document without converting
    //  its content type, while the ExactPersist component could also save XML
    //  and SVG, but not as accurately as the browser's standard save system.
    if (MozillaArchiveFormat.Prefs.saveComponent ==
        MozillaArchiveFormat.Prefs.SAVECOMPONENT_SAVECOMPLETE) {
      persist = new MozillaArchiveFormat.SaveCompletePersist();
    } else {
      persist = new MozillaArchiveFormat.ExactPersist();
    }
    // If the document saving was initiated by MAF
    if (typeof aSkipPrompt == "object" && aSkipPrompt.mafEventListener) {
      // Configure the persist object appropriately
      persist.saveWithMedia = aSkipPrompt.saveWithMedia;
      persist.saveWithContentLocation = aSkipPrompt.saveWithContentLocation;
      // Make the actual persist object available to the callback functions
      aSkipPrompt.mafEventListener.persistObject = persist;
    }
  } else {
    persist = makeWebBrowserPersist();
  }

  // Calculate persist flags.
  const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
                nsIWBP.PERSIST_FLAGS_FORCE_ALLOW_COOKIES;
  if (persistArgs.bypassCache)
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
  else
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

  // Leave it to WebBrowserPersist to discover the encoding type (or lack thereof):
  persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

  // Find the URI associated with the target file
  var targetFileURL = makeFileURI(persistArgs.targetFile);

  // Mozilla Archive Format indirectly uses this function to save an already
  //  loaded document to a temporary file on disk, before generating the final
  //  archive. If the document saving was initiated by MAF, we use the
  //  provided download listener instead of creating a transfer object.
  var tr;
  if (typeof aSkipPrompt == "object" && aSkipPrompt.mafProgressListener) {
    tr = aSkipPrompt.mafProgressListener;
  } else if (typeof aSkipPrompt == "object" && aSkipPrompt.mafEventListener) {
    tr = new MozillaArchiveFormat.MafWebProgressListener(
                                  aSkipPrompt.mafEventListener);
  } else {
    // Create download and initiate it (below)
    tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);
    tr.init(persistArgs.sourceURI,
            targetFileURL, "", null, null, null, persist);
  }

  persist.progressListener = new DownloadListener(window, tr);

  if (persistArgs.sourceDocument) {
    // Saving a Document, not a URI:
    var filesFolder = null;
    if (persistArgs.targetContentType != "text/plain") {
      // Create the local directory into which to save associated files.
      filesFolder = persistArgs.targetFile.clone();

      // When Mozilla Archive Format calls this function to save a file for an
      //  archive, always use "index_files" as the data folder name
      if (typeof aSkipPrompt == "object" && aSkipPrompt.saveDir) {
        filesFolder.leafName = "index_files";
      } else {
        var nameWithoutExtension = getFileBaseName(filesFolder.leafName);
        var filesFolderLeafName = getStringBundle().formatStringFromName("filesFolder",
                                                                         [nameWithoutExtension],
                                                                         1);
  
        filesFolder.leafName = filesFolderLeafName;
      }
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

    const kWrapColumn = 80;
    persist.saveDocument(persistArgs.sourceDocument, targetFileURL, filesFolder,
                         persistArgs.targetContentType, encodingFlags, kWrapColumn);
  } else {
    persist.saveURI(persistArgs.sourceURI,
                    persistArgs.sourceCacheKey, persistArgs.sourceReferrer, persistArgs.sourcePostData, null,
                    targetFileURL);
  }
}

/** 
 * Given the Filepicker Parameters (aFpP), show the file picker dialog,
 * prompting the user to confirm (or change) the fileName.
 * @param aFpP
 *        A structure (see definition in internalSave(...) method)
 *        containing all the data used within this method.
 * @param aSkipPrompt
 *        If true, attempt to save the file automatically to the user's default
 *        download directory, thus skipping the explicit prompt for a file name,
 *        but only if the associated preference is set.
 *        If false, don't save the file automatically to the user's
 *        default download directory, even if the associated preference
 *        is set, but ask for the target explicitly.
 * @return true if the user confirmed a filename in the picker or the picker
 *         was not displayed; false if they dismissed the picker.
 */
function getTargetFile(aFpP, /* optional */ aSkipPrompt)
{
  if (typeof gDownloadLastDir != "object") {
    try {
      Components.utils.import("resource://gre/modules/DownloadLastDir.jsm");
    }
    catch (e) {
    }
  }

  // Wrap gDownloadLastDir into a local variable, if it exists
  var gDownloadLastDir = gDownloadLastDir || {};

  var prefs = getPrefsBrowserDownload("browser.download.");
  var useDownloadDir = prefs.getBoolPref("useDownloadDir");
  const nsILocalFile = Components.interfaces.nsILocalFile;

  if (!aSkipPrompt)
    useDownloadDir = false;

  var inPrivateBrowsing = false;
  if ("@mozilla.org/privatebrowsing;1" in Components.classes) {
    var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]
                        .getService(Components.interfaces.nsIPrivateBrowsingService);
    inPrivateBrowsing = pbs.privateBrowsingEnabled;
  }

  // Default to the user's default downloads directory configured
  // through download prefs.
  var dlMgr = Components.classes["@mozilla.org/download-manager;1"]
                        .getService(Components.interfaces.nsIDownloadManager);
  var dir = dlMgr.userDownloadsDirectory;
  var dirExists = dir && dir.exists();

  if (useDownloadDir && dirExists) {
    dir.append(getNormalizedLeafName(aFpP.fileInfo.fileName,
                                     aFpP.fileInfo.fileExt));
    aFpP.file = uniqueFile(dir);
    return true;
  }

  // We must prompt for the file name explicitly.
  // If we must prompt because we were asked to...
  if (!useDownloadDir) try {
    // ...find the directory that was last used for saving, and use it in the
    // file picker if it is still valid. Otherwise, keep the default of the
    // user's default downloads directory. If it doesn't exist, it will be
    // changed to the user's desktop later.
    var lastDir;
    if (inPrivateBrowsing && gDownloadLastDir.file)
      lastDir = gDownloadLastDir.file;
    else
      lastDir = prefs.getComplexValue("lastDir", nsILocalFile);
    if (lastDir.exists()) {
      dir = lastDir;
      dirExists = true;
    }
  } catch(e) {}

  if (!dirExists) {
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

  fp.displayDirectory = dir;
  var defaultExtension = aFpP.fileInfo.fileExt;
  var defaultString = getNormalizedLeafName(aFpP.fileInfo.fileName,
                                            aFpP.fileInfo.fileExt);

  // With Mozilla Archive Format on Windows, ensure the default file extension
  //  is not included as a part of the file name, since the file picker will
  //  add the extension automatically based on the selected filter.
  var isOnWindows = Components.classes["@mozilla.org/xre/app-info;1"].
   getService(Components.interfaces.nsIXULRuntime).OS == "WINNT";
  if (isOnWindows && defaultExtension) {
    var extensionToCheck = "." + defaultExtension;
    if (extensionToCheck.toLowerCase() ==
     defaultString.slice(-extensionToCheck.length).toLowerCase()) {
      defaultString = defaultString.slice(0, -extensionToCheck.length);
    }
  }

  // In Mozilla Archive Format on Windows, when asking to save in an archive,
  //  the default extension is replaced with the one of the default archive
  //  file type
  if (isOnWindows && aFpP.saveMode == SAVEMODE_MAFARCHIVE) {
    // Use a MAF specific call to retrieve the filter string
    var filterStringForDefaultType =
     gMafDefaultSaveBehavior.getFileFilter().extensionstring;
    // Get the first valid extension for the file type, excluding the initial
    //  star and dot ("*.")
    defaultExtension = filterStringForDefaultType.split(";")[0].slice(2);
  }

  fp.defaultExtension = defaultExtension;
  fp.defaultString = defaultString;

  var saveBehaviors = [];
  appendFiltersForContentType(fp, aFpP.contentType, aFpP.fileInfo.fileExt,
                              aFpP.saveMode, saveBehaviors);

  // The index of the selected filter is only preserved and restored if there's
  // more than one filter in addition to "All Files".
  if (aFpP.saveMode != SAVEMODE_SAMEFORMAT) {
    try {
        // In Mozilla Archive Format, use a special preference to store the
        //  selected filter if only the archive save filters are shown
        if (aFpP.saveMode == SAVEMODE_MAFARCHIVE)
          fp.filterIndex = MozillaArchiveFormat.DynamicPrefs.saveFilterIndex;
        else
          fp.filterIndex = prefs.getIntPref("save_converter_index");
    }
    catch (e) {
    }
  }

  var saveBehavior;
  do {
    var shouldShowFilePickerAgain = false;

    if (fp.show() == Components.interfaces.nsIFilePicker.returnCancel || !fp.file)
      return false;

    fp.file.leafName = validateFileName(fp.file.leafName);
    // Set the file name to be shown if the dialog is displayed again
    fp.defaultString = fp.file.leafName;
    // Check that the file picker filter index is not out of bounds. The
    //  nsIFilePicker interface does not guarantee this.
    aFpP.saveBehavior = saveBehaviors[fp.filterIndex] ?
     saveBehaviors[fp.filterIndex] : gNormalSaveBehavior;
    // Save the selected file object and URL
    aFpP.file = fp.file;
    aFpP.fileURL = fp.fileURL;

    // Archives saved by Mozilla Archive Format cannot be opened unless the
    //  correct extension is present. If we are saving an archive, force the
    //  extension and check again if the file exists.
    if (aFpP.saveBehavior.mandatoryExtension) {
      // Use a MAF specific call to retrieve the filter string again
      var filterString = aFpP.saveBehavior.getFileFilter().extensionstring;
      // Get an array of valid extensions for the file type
      var possibleExtensions = filterString.split(";").
       map(function(extWithStar) {
        // Remove the star ("*"), but leave the dot in the extension
        return extWithStar.slice(1);
      });
      // If none of the possible extensions matches
      if (!possibleExtensions.some(function(possibleExtension) {
        return possibleExtension.toLowerCase() ==
         aFpP.file.leafName.slice(-possibleExtension.length).toLowerCase();
      })) {
        // Change the name and invalidate the associated file URL
        aFpP.file.leafName += possibleExtensions[0];
        aFpP.fileURL = null;
        // If an extension is added later, check if a file with the new name
        //  already exists
        if (aFpP.file.exists()) {
          // For more information, see the "confirm_overwrite_file" function
          //  in <http://mxr.mozilla.org/mozilla-central/source/widget/src/gtk2/nsFilePicker.cpp>
          //  (retrieved 2009-01-06)
          var bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
           .getService(Components.interfaces.nsIStringBundleService)
           .createBundle("chrome://global/locale/filepicker.properties");
          var title = bundle.GetStringFromName("confirmTitle");
          var message = bundle.formatStringFromName("confirmFileReplacing",
           [aFpP.file.leafName], 1);
          // If the user chooses not to overwrite, show the file picker again
          var prompts =
           Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
           .getService(Components.interfaces.nsIPromptService);
          if(prompts.confirmEx(window, title, message,
           prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_YES +
           prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_NO +
           prompts.BUTTON_POS_1_DEFAULT, "", "", "", null, {}) == 1) {
            shouldShowFilePickerAgain = true;
          }
        }
      }
    }
  } while(shouldShowFilePickerAgain);

  // Do not store the last save directory as a pref inside the private browsing mode
  var directory = fp.file.parent.QueryInterface(nsILocalFile);
  if (inPrivateBrowsing)
    gDownloadLastDir.file = directory;
  else
    prefs.setComplexValue("lastDir", nsILocalFile, directory);

  if (aFpP.saveMode != SAVEMODE_SAMEFORMAT) {
    // In Mozilla Archive Format, use a special preference to store the
    //  selected filter if only the archive save filters are shown
    if (aFpP.saveMode == SAVEMODE_MAFARCHIVE)
      MozillaArchiveFormat.DynamicPrefs.saveFilterIndex = fp.filterIndex;
    else
      prefs.setIntPref("save_converter_index", fp.filterIndex);
  }

  return true;
}

// Since we're automatically downloading, we don't get the file picker's
// logic to check for existing files, so we need to do that here.
//
// Note - this code is identical to that in
//   mozilla/toolkit/mozapps/downloads/src/nsHelperAppDlg.js.in
// If you are updating this code, update that code too! We can't share code
// here since that code is called in a js component.
function uniqueFile(aLocalFile)
{
  var collisionCount = 0;
  while (aLocalFile.exists()) {
    collisionCount++;
    if (collisionCount == 1) {
      // Append "(2)" before the last dot in (or at the end of) the filename
      // special case .ext.gz etc files so we don't wind up with .tar(2).gz
      if (aLocalFile.leafName.match(/\.[^\.]{1,3}\.(gz|bz2|Z)$/i))
        aLocalFile.leafName = aLocalFile.leafName.replace(/\.[^\.]{1,3}\.(gz|bz2|Z)$/i, "(2)$&");
      else
        aLocalFile.leafName = aLocalFile.leafName.replace(/(\.[^\.]*)?$/, "(2)$&");
    }
    else {
      // replace the last (n) in the filename with (n+1)
      aLocalFile.leafName = aLocalFile.leafName.replace(/^(.*\()\d+\)/, "$1" + (collisionCount + 1) + ")");
    }
  }
  return aLocalFile;
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
  if (aSaveMode == SAVEMODE_MAFARCHIVE) {
    // When asking to save in an archive, if All Files is selected we will save
    //  the file using the default archive format
    aReturnBehaviorArray.push(gMafDefaultSaveBehavior);
  } else {
    aReturnBehaviorArray.push(gNormalSaveBehavior);
  }
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

function getPostData(aDocument)
{
  try {
    var sessionHistory = aDocument.defaultView
                                  .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                                  .getInterface(Components.interfaces.nsIWebNavigation)
                                  .sessionHistory;
    return sessionHistory.getEntryAtIndex(sessionHistory.index, false)
                         .QueryInterface(Components.interfaces.nsISHEntry)
                         .postData;
  }
  catch (e) {
  }
  return null;
}

function getStringBundle()
{
  return Components.classes["@mozilla.org/intl/stringbundle;1"]
                   .getService(Components.interfaces.nsIStringBundleService)
                   .createBundle("chrome://global/locale/contentAreaCommands.properties");
}

// Get the preferences branch ("browser.download." for normal 'save' mode)...
function getPrefsBrowserDownload(branch)
{
  const prefSvcContractID = "@mozilla.org/preferences-service;1";
  const prefSvcIID = Components.interfaces.nsIPrefService;                              
  return Components.classes[prefSvcContractID].getService(prefSvcIID).getBranch(branch);
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
  var filter = this.__proto__.getFileFilter(aContentType, aFileExtension);
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
