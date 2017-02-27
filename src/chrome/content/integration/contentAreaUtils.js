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

var MozillaArchiveFormat = {};
Components.utils.import("chrome://maf/content/MozillaArchiveFormat.jsm",
                        MozillaArchiveFormat);

/**
 * This function is overridden for compatibility with Firefox 42.
 */
function mafSaveBrowser(aBrowser, aSkipPrompt, aOuterWindowID=0)
{
  saveDocument(!aOuterWindowID ? aBrowser.contentDocument :
   Services.wm.getOuterWindowWithId(aOuterWindowID).document, aSkipPrompt);
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
 * @param aInitiatingDocument [optional]
 *        The document from which the save was initiated.
 *        If this is omitted then aIsContentWindowPrivate has to be provided.
 * @param aSkipPrompt [optional]
 *        If set to true, we will attempt to save the file to the
 *        default downloads folder without prompting.
 *        When this function is called, directly or indirectly, by Mozilla
 *        Archive Format to ask the user to save an archive, this parameter can
 *        also be an object with the following properties:
 *         - mafAskSaveArchive: True to ask to save archives only.
 *         - mafSaveTabs [optional]: Array of browser objects corresponding to
 *           the tabs to be saved.
 * @param aCacheKey [optional]
 *        If set will be passed to saveURI.  See nsIWebBrowserPersist for
 *        allowed values.
 * @param aIsContentWindowPrivate [optional]
 *        This parameter is provided when the aInitiatingDocument is not a
 *        real document object. Stores whether aInitiatingDocument.defaultView
 *        was private or not.
 */
function mafInternalSave(aURL, aDocument, aDefaultFileName, aContentDisposition,
                         aContentType, aShouldBypassCache, aFilePickerTitleKey,
                         aChosenData, aReferrer, aInitiatingDocument, aSkipPrompt,
                         aCacheKey, aIsContentWindowPrivate) {
  forbidCPOW(aURL, "internalSave", "aURL");
  forbidCPOW(aReferrer, "internalSave", "aReferrer");
  forbidCPOW(aCacheKey, "internalSave", "aCacheKey");
  // Allow aInitiatingDocument to be a CPOW.

  if (aSkipPrompt == undefined)
    aSkipPrompt = false;

  if (aCacheKey == undefined)
    aCacheKey = null;

  // Get a reference to the main content browser, if available in the window.
  var mainBrowser = window.getBrowser && window.getBrowser().selectedBrowser;

  // Note: aDocument == null when this code is used by save-link-as...
  var saveMode = GetSaveModeForContentType(aContentType, aDocument);

  var file, sourceURI, saveAsType, saveBehavior;
  // Find the URI object for aURL and the FileName/Extension to use when saving.
  // FileName/Extension will be ignored if aChosenData supplied.
  if (aChosenData) {
    file = aChosenData.file;
    sourceURI = aChosenData.uri;
    saveAsType = kSaveAsType_Complete;
    saveBehavior = MozillaArchiveFormat.NormalSaveBehavior;

    continueSave();
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
      fileInfo,
      contentType: aContentType,
      saveMode,
      saveAsType: kSaveAsType_Complete,
      saveBehavior: MozillaArchiveFormat.CompleteSaveBehavior,
      file
    };

    // Find a URI to use for determining last-downloaded-to directory
    let relatedURI = aReferrer || sourceURI;

    promiseTargetFile(fpParams, aSkipPrompt, relatedURI).then(aDialogAccepted => {
      if (!aDialogAccepted)
        return;

      saveAsType = fpParams.saveAsType;
      saveBehavior = fpParams.saveBehavior;
      file = fpParams.file;

      continueSave();
    }).then(null, Components.utils.reportError);
  }

  function continueSave() {
    // Create a custom web browser persist object if required.
    var mafPersistObject = null;
    if (saveBehavior.getPersistObject) {
      let mafSaveTabs = typeof aSkipPrompt == "object" &&
                        aSkipPrompt.mafSaveTabs;
      // If the save wasn't initiated from a list of tabs, but the document to be
      // saved is the main document in the browser window, ensure the browser
      // object is passed to the archive persist object, to enable saving the
      // additional metadata.
      if (!mafSaveTabs && mainBrowser &&
          (aDocument == mainBrowser.contentDocument)) {
        mafSaveTabs = [mainBrowser];
      }
      // Create the actual persist object.
      mafPersistObject = saveBehavior.getPersistObject(mafSaveTabs);
    } else if (MozillaArchiveFormat.Prefs.saveEnabled && aDocument &&
               saveBehavior.isComplete && !saveBehavior.targetContentType &&
               (aDocument.contentType == "text/html" ||
                aDocument.contentType == "application/xhtml+xml")) {
      // The ExactPersist component can also save XML and SVG, but not as
      // accurately as the browser's standard save system.
      mafPersistObject = new MozillaArchiveFormat.ExactPersist();
    }

    // XXX We depend on the following holding true in appendFiltersForContentType():
    // If we should save as a complete page, the saveAsType is kSaveAsType_Complete.
    // If we should save as text, the saveAsType is kSaveAsType_Text.
    var useSaveDocument = aDocument &&
                          (((saveMode & SAVEMODE_COMPLETE_DOM) && (saveAsType == kSaveAsType_Complete)) ||
                           ((saveMode & SAVEMODE_COMPLETE_TEXT) && (saveAsType == kSaveAsType_Text)));
    // If we're saving a document, and are saving either in complete mode or
    // as converted text, pass the document to the web browser persist component.
    // If we're just saving the HTML (second option in the list), send only the URI.
    let nonCPOWDocument =
      aDocument && !Components.utils.isCrossProcessWrapper(aDocument);

    let isPrivate = aIsContentWindowPrivate;
    if (isPrivate === undefined) {
      isPrivate = aInitiatingDocument instanceof Components.interfaces.nsIDOMDocument
        ? PrivateBrowsingUtils.isContentWindowPrivate(aInitiatingDocument.defaultView)
        : aInitiatingDocument.isPrivate;
    }

    var persistArgs = {
      sourceURI,
      sourceReferrer    : aReferrer,
      sourceDocument    : useSaveDocument ? aDocument : null,
      targetContentType : (saveAsType == kSaveAsType_Text) ? "text/plain" : null,
      targetFile        : file,
      sourceCacheKey    : aCacheKey,
      sourcePostData    : nonCPOWDocument ? getPostData(aDocument) : null,
      bypassCache       : aShouldBypassCache,
      isPrivate,
      persistObject     : mafPersistObject
    };

    // Start the actual save process
    internalPersist(persistArgs);
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
 *        When this function is called indirectly by Mozilla Archive Format to
 *        ask the user to save an archive, this parameter can also be an object
 *        with the following properties:
 *        {
 *          mafAskSaveArchive:
 *            True to ask to save archives only.
 *          mafSaveTabs: [optional]
 *            Array of browser objects corresponding to the tabs to be saved.
 *        }
 * @param aRelatedURI
 *        An nsIURI associated with the download. The last used
 *        directory of the picker is retrieved from/stored in the
 *        Content Pref Service using this URI.
 * @return Promise
 * @resolve a boolean. When true, it indicates that the file picker dialog
 *          is accepted.
 */
function mafPromiseTargetFile(aFpP, /* optional */ aSkipPrompt, /* optional */ aRelatedURI) {
  let document = mafPromiseTargetFile.caller.arguments[1];
  return Task.spawn(function*() {
    let downloadLastDir = new DownloadLastDir(window);
    let prefBranch = Services.prefs.getBranch("browser.download.");
    let useDownloadDir = prefBranch.getBoolPref("useDownloadDir");

    let isSeaMonkey = Cc["@mozilla.org/xre/app-info;1"]
     .getService(Ci.nsIXULAppInfo).ID == "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

    let saveOnlyInArchive = false;
    let mafPreferSaveArchive = false;
    if (typeof aSkipPrompt == "object") {
      if (aSkipPrompt.mafAskSaveArchive) {
        saveOnlyInArchive = true;
        // Attempt to save to the default downloads folder automatically if the
        // host application is SeaMonkey and the associated preference is set.
        aSkipPrompt = isSeaMonkey;
      }
    } else {
      // Normal saveDocument calls will save HTML and XHTML documents in archive,
      // unless we are on SeaMonkey where the save dialog may not be displayed.
      mafPreferSaveArchive = !isSeaMonkey && document &&
       (document.contentType == "text/html" ||
       document.contentType == "application/xhtml+xml");
    }

    aFpP.saveInArchiveFirst = MozillaArchiveFormat.Prefs.saveEnabled &&
                              (saveOnlyInArchive || mafPreferSaveArchive);

    if (!aSkipPrompt)
      useDownloadDir = false;

    // Default to the user's default downloads directory configured
    // through download prefs.
    let dirPath = yield Downloads.getPreferredDownloadsDirectory();
    let dirExists = yield OS.File.exists(dirPath);
    let dir = new FileUtils.File(dirPath);

    if (useDownloadDir && dirExists) {
      // If we are saving an archive automatically using Mozilla Archive Format,
      // use the archive type selected when asking to save in an archive, and
      // adjust the output file extension accordingly.
      if (aFpP.saveInArchiveFirst) {
        aFpP.saveBehavior =
             MozillaArchiveFormat.DynamicPrefs.saveFilterIndex == 1 ?
             gMafMhtmlSaveBehavior : gMafMaffSaveBehavior;
        // Use a MAF specific call to retrieve the filter string.
        var filterString = aFpP.saveBehavior.getFileFilter().extensionstring;
        // Get the first valid extension for the file type, excluding the initial
        // star and dot ("*.").
        aFpP.fileInfo.fileExt = filterString.split(";")[0].slice(2);
      }

      dir.append(getNormalizedLeafName(aFpP.fileInfo.fileName,
                                       aFpP.fileInfo.fileExt));
      aFpP.file = uniqueFile(dir);
      return true;
    }

    // We must prompt for the file name explicitly.
    // If we must prompt because we were asked to...
    let deferred = window.Promise.defer();
    if (useDownloadDir) {
      // Keep async behavior in both branches
      Services.tm.mainThread.dispatch(function() {
        deferred.resolve(null);
      }, Components.interfaces.nsIThread.DISPATCH_NORMAL);
    } else {
      downloadLastDir.getFileAsync(aRelatedURI, function getFileAsyncCB(aFile) {
        deferred.resolve(aFile);
      });
    }
    let file = yield deferred.promise;
    if (file && (yield OS.File.exists(file.path))) {
      dir = file;
      dirExists = true;
    }

    if (!dirExists) {
      // Default to desktop.
      dir = Services.dirsvc.get("Desk", Components.interfaces.nsIFile);
    }

    let fp = makeFilePicker();
    let titleKey = aFpP.fpTitleKey || "SaveLinkTitle";
    fp.init(window, ContentAreaUtils.stringBundle.GetStringFromName(titleKey),
            Components.interfaces.nsIFilePicker.modeSave);

    fp.displayDirectory = dir;
    var defaultExtension = aFpP.fileInfo.fileExt;
    var defaultString = getNormalizedLeafName(aFpP.fileInfo.fileName,
                                              aFpP.fileInfo.fileExt);

    // With Mozilla Archive Format on Windows, ensure the default file extension
    // is not included as a part of the file name, since the file picker will
    // add the extension automatically based on the selected filter.
    var isOnWindows = Components.classes["@mozilla.org/xre/app-info;1"].
     getService(Components.interfaces.nsIXULRuntime).OS == "WINNT";
    if (isOnWindows && defaultExtension) {
      var extensionToCheck = "." + defaultExtension;
      if (extensionToCheck.toLowerCase() ==
       defaultString.slice(-extensionToCheck.length).toLowerCase()) {
        defaultString = defaultString.slice(0, -extensionToCheck.length);
        // The file picker will not add the default extension if the file name
        // already ends with a recognized extension. Thus, we must ensure that
        // no recognized extension is present in the file name. We don't know if
        // the extension is recognized, so we assume that any suffix of four or
        // less characters can be a valid extension. We also make some
        // exceptions for executable file types. See also the "IsExecutable"
        // method in
        // <http://mxr.mozilla.org/mozilla-central/source/xpcom/io/nsLocalFileWin.cpp>
        // (retrieved 2010-03-07).
        defaultString = defaultString.replace(
         /\.([^.]{1,4}|application|mshxml|vsmacros)$/i, "_$1");
      }
    }

    // In Mozilla Archive Format on Windows, when asking to save in an archive,
    // the default extension is replaced with the one of the default archive
    // file type.
    if (isOnWindows && aFpP.saveInArchiveFirst) {
      // Use a MAF specific call to retrieve the filter string.
      var filterStringForDefaultType =
       gMafDefaultSaveBehavior.getFileFilter().extensionstring;
      // Get the first valid extension for the file type, excluding the initial
      // star and dot ("*.").
      defaultExtension = filterStringForDefaultType.split(";")[0].slice(2);
    }

    fp.defaultExtension = defaultExtension;
    fp.defaultString = defaultString;

    var saveBehaviors = [];
    mafAppendFiltersForContentType(fp, aFpP.contentType, aFpP.fileInfo.fileExt,
                                   aFpP.saveMode, saveBehaviors,
                                   aFpP.saveInArchiveFirst, saveOnlyInArchive,
                                   document);

    // The index of the selected filter is only preserved and restored if there's
    // more than one filter in addition to "All Files".
    if (document) {
      try {
        // In Mozilla Archive Format, use a special preference to store the
        // selected filter if only the archive save filters are shown.
        if (saveOnlyInArchive) {
          fp.filterIndex = MozillaArchiveFormat.DynamicPrefs.saveFilterIndex;
        } else if (aFpP.saveInArchiveFirst) {
          let indexHtml = MozillaArchiveFormat.DynamicPrefs.saveFilterIndexHtml;
          fp.filterIndex = indexHtml >= 2 ? indexHtml :
           MozillaArchiveFormat.DynamicPrefs.saveFilterIndex;
        } else {
          fp.filterIndex = prefBranch.getIntPref("save_converter_index");
        }
      } catch (e) {
      }
    }

    var saveBehavior;
    do {
      var shouldShowFilePickerAgain = false;

      let deferComplete = window.Promise.defer();
      fp.open(function(aResult) {
        deferComplete.resolve(aResult);
      });
      let result = yield deferComplete.promise;
      if (result == Components.interfaces.nsIFilePicker.returnCancel || !fp.file) {
        return false;
      }

      fp.file.leafName = validateFileName(fp.file.leafName);
      // Set the file name to be shown if the dialog is displayed again.
      fp.defaultString = fp.file.leafName;
      // Check that the file picker filter index is not out of bounds. The
      // nsIFilePicker interface does not guarantee this.
      aFpP.saveBehavior = saveBehaviors[fp.filterIndex] ?
       saveBehaviors[fp.filterIndex] : MozillaArchiveFormat.NormalSaveBehavior;
      aFpP.saveAsType = aFpP.saveBehavior.targetContentType ? kSaveAsType_Text :
                        aFpP.saveBehavior.isComplete ? kSaveAsType_Complete : 1;
      // Save the selected file object and URL.
      aFpP.file = fp.file;
      aFpP.fileURL = fp.fileURL;

      // Archives saved by Mozilla Archive Format cannot be opened unless the
      // correct extension is present. If we are saving an archive, force the
      // extension and check again if the file exists.
      if (aFpP.saveBehavior.mandatoryExtension) {
        // Use a MAF specific call to retrieve the filter string again.
        var filterString = aFpP.saveBehavior.getFileFilter().extensionstring;
        // Get an array of valid extensions for the file type.
        var possibleExtensions = filterString.split(";").
         map(function(extWithStar) {
          // Remove the star ("*"), but leave the dot in the extension.
          return extWithStar.slice(1);
        });
        // If none of the possible extensions matches
        if (!possibleExtensions.some(function(possibleExtension) {
          return possibleExtension.toLowerCase() ==
           aFpP.file.leafName.slice(-possibleExtension.length).toLowerCase();
        })) {
          // Change the name and invalidate the associated file URL.
          aFpP.file.leafName += possibleExtensions[0];
          aFpP.fileURL = null;
          // If an extension is added later, check if a file with the new name
          // already exists.
          if (aFpP.file.exists()) {
            // For more information, see the "confirm_overwrite_file" function
            // in <http://mxr.mozilla.org/mozilla-central/source/widget/src/gtk2/nsFilePicker.cpp>
            // (retrieved 2009-01-06).
            var bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
             .getService(Components.interfaces.nsIStringBundleService)
             .createBundle("chrome://global/locale/filepicker.properties");
            var title = bundle.GetStringFromName("confirmTitle");
            var message = bundle.formatStringFromName("confirmFileReplacing",
             [aFpP.file.leafName], 1);
            // If the user chooses not to overwrite, show the file picker again.
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

    if (document) {
      // In Mozilla Archive Format, use a special preference to store the
      // selected filter if only the archive save filters are shown.
      if (saveOnlyInArchive) {
        MozillaArchiveFormat.DynamicPrefs.saveFilterIndex = fp.filterIndex;
      } else if (aFpP.saveInArchiveFirst) {
        MozillaArchiveFormat.DynamicPrefs.saveFilterIndexHtml = fp.filterIndex;
        if (fp.filterIndex < 2) {
          MozillaArchiveFormat.DynamicPrefs.saveFilterIndex = fp.filterIndex;
        }
        MafInterfaceOverlay.updateSavePageButtonLabel();
      } else {
        prefBranch.setIntPref("save_converter_index", fp.filterIndex);
      }
    }

    // Do not store the last save directory as a pref inside the private browsing mode
    downloadLastDir.setFile(aRelatedURI, fp.file.parent);

    // File types that aren't complete web pages can still be saved in an
    // archive using the nsIWebBrowserPersist.saveDocument method. To ensure
    // that this method is called, we have to modify the saveMode so that
    // internalSave still forwards the document to internalPersist. We can
    // simply bypass all the checks made by internalSave because saveAsType is
    // already correct based on the choice in the file picker.
    aFpP.saveMode.valueOf = () => SAVEMODE_COMPLETE_DOM | SAVEMODE_COMPLETE_TEXT;

    return true;
  });
}

if (!Services.appinfo.browserTabsRemoteAutostart) {
  saveBrowser = mafSaveBrowser;
  internalSave = mafInternalSave;
  promiseTargetFile = mafPromiseTargetFile;
}

/**
 * Populate the filter list of the file picker using the valid save behaviors
 * for the specified save mode. The aReturnBehaviorArray is populated with the
 * save behaviors that have been actually added to the file picker, including
 * the standard behavior for "All Files".
 */
function mafAppendFiltersForContentType(aFilePicker, aContentType,
                                        aFileExtension, aSaveMode,
                                        aReturnBehaviorArray,
                                        aSaveInArchiveFirst, aSaveOnlyInArchive,
                                        aDocument)
{
  function appendWhere(aCheckFn) {
    // For every behavior that is valid for the given save mode.
    gInternalSaveBehaviors.forEach(function(saveBehavior) {
      if (saveBehavior.isValidForSaveMode(aSaveMode, aDocument) &&
          aCheckFn(saveBehavior)) {
        // Add the corresponding file filter if one is provided.
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
  }

  if (aSaveInArchiveFirst || aSaveOnlyInArchive) {
    appendWhere(b => b.savesInArchive);
    if (!aSaveOnlyInArchive) {
      appendWhere(b => !b.savesInArchive);
    }
    // When asking to save in an archive, if All Files is selected we will save
    // the file using the default archive format.
    aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
    aReturnBehaviorArray.push(gMafDefaultSaveBehavior);
  } else {
    appendWhere(() => true);
    // Always append the all files (*) filter.
    aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
    aReturnBehaviorArray.push(MozillaArchiveFormat.NormalSaveBehavior);
  }
}

/**
 * This function is overridden to use a specific persist object when requested.
 */
function makeWebBrowserPersist() {
  if (makeWebBrowserPersist.caller.name == "internalPersist") {
    let persistArgs = makeWebBrowserPersist.caller.arguments[0];
    if (persistArgs.persistObject) {
      return persistArgs.persistObject;
    }
  }

  return Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
           .createInstance(Ci.nsIWebBrowserPersist);
}

{
  // Allow the save mode to be modified by promiseTargetFile.
  let originalFn = GetSaveModeForContentType;
  GetSaveModeForContentType = (...args) => new Number(originalFn(...args));
}

/**
 * The stateless objects that extend this one represent the possible methods to
 * save a web page or other file locally. Every object based on
 * InternalSaveBehavior maps to a save filter in the save file picker dialog.
 *
 * This object is also used by other extensions to integrate with the save
 * system offered by Mozilla Archive Format.
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
  isValidForSaveMode: function(aSaveMode, aDocument) {
    return true;
  },

  /**
   * Returns an object containing the filter string and description to use in
   * the save file picker dialog.
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
    // content types, otherwise try to get the list of valid extensions from the
    // system.

    // The bundle name for saving only a specific content type.
    var bundleName;
    // The actual filter name for a specific content type.
    var filterName = null;
    // The corresponding filter string for a specific content type.
    var filterString = null;

    // Try with known content types first
    // Every case where GetSaveModeForContentType can return non-FILEONLY
    // modes must be handled here.
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
      filterName = ContentAreaUtils.stringBundle.GetStringFromName(bundleName);
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
MozillaArchiveFormat.NormalSaveBehavior = new InternalSaveBehavior();

/** The "save as complete web page" behavior. */
MozillaArchiveFormat.CompleteSaveBehavior = new InternalSaveBehavior();
MozillaArchiveFormat.CompleteSaveBehavior.isComplete = true;
MozillaArchiveFormat.CompleteSaveBehavior.isValidForSaveMode = function(aSaveMode) {
  return aSaveMode & SAVEMODE_COMPLETE_DOM;
};
MozillaArchiveFormat.CompleteSaveBehavior.getFileFilter = function(aContentType, aFileExtension) {
  // Keep the same extensions as the normal behavior, override the description.
  var filter = this.__proto__.getFileFilter(aContentType, aFileExtension);
  filter.title = ContentAreaUtils.stringBundle.GetStringFromName("WebPageCompleteFilter");
  return filter;
};

/** The "save as text only" behavior. */
MozillaArchiveFormat.TextOnlySaveBehavior = new InternalSaveBehavior();
MozillaArchiveFormat.TextOnlySaveBehavior.isComplete = true;
MozillaArchiveFormat.TextOnlySaveBehavior.targetContentType = "text/plain";
MozillaArchiveFormat.TextOnlySaveBehavior.isValidForSaveMode = function(aSaveMode) {
  return aSaveMode & SAVEMODE_COMPLETE_TEXT;
};
MozillaArchiveFormat.TextOnlySaveBehavior.getFileFilter = function(aContentType, aFileExtension) {
  return {mask: Components.interfaces.nsIFilePicker.filterText};
};

/**
 * The list of registered save behaviors.
 *
 * This array is also used by other extensions to integrate with the save system
 * offered by Mozilla Archive Format.
 */
var gInternalSaveBehaviors = [
  MozillaArchiveFormat.CompleteSaveBehavior,
  MozillaArchiveFormat.NormalSaveBehavior,
  MozillaArchiveFormat.TextOnlySaveBehavior,
];

var gMafDefaultSaveBehavior;
var gMafMaffSaveBehavior;
var gMafMhtmlSaveBehavior;

MozillaArchiveFormat.FileFilters.saveFilters.forEach(function(curFilter,
                                                              curFilterIndex) {
  // Create the new save behavior object.
  var newSaveBehavior = new InternalSaveBehavior();
  newSaveBehavior.isComplete = true;
  newSaveBehavior.mandatoryExtension = true;
  newSaveBehavior.savesInArchive = true;
  newSaveBehavior.isValidForSaveMode = function(aSaveMode, aDocument) {
    return MozillaArchiveFormat.Prefs.saveEnabled && aDocument;
  }
  newSaveBehavior.getFileFilter = function(aContentType, aFileExtension) {
    // Access the current values in the MAF save filter objects array.
    var filter = MozillaArchiveFormat.FileFilters.saveFilters[curFilterIndex];
    // Return the required values.
    return {title: filter.title, extensionstring: filter.extensionString};
  }
  newSaveBehavior.getPersistObject = function(saveBrowsers) {
    return new MozillaArchiveFormat.MafArchivePersist(saveBrowsers,
                                                      curFilter.mafArchiveType);
  }

  // Add the save behavior to the browser, before the one already present at
  // index 2, assuming it is the one for saving as text only.
  gInternalSaveBehaviors.splice(2 + curFilterIndex, 0, newSaveBehavior);

  // Save a reference to the first save behavior, considered the default.
  if (curFilterIndex == 0) {
    gMafDefaultSaveBehavior = newSaveBehavior;
    gMafMaffSaveBehavior = newSaveBehavior;
  } else {
    gMafMhtmlSaveBehavior = newSaveBehavior;
  }
});
