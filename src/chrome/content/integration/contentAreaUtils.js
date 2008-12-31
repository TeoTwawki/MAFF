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
 * internalSave: Used when saving a document or URL. This method:
 *  - Determines a local target filename to use (unless parameter
 *    aChosenData is non-null)
 *  - Determines content-type if possible
 *  - Prompts the user to confirm the destination filename and save mode
 *    (content-type affects this)
 *  - Creates a 'Persist' object (which will perform the saving in the
 *    background) and then starts it.
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
 *        Archive Format, this parameter can also be an object with the
 *        following properties:
 *         - saveDir: nsILocalFile instance pointing to the directory where the
 *           specified document should be saved. The filename is determined
 *           automatically, using "index" as the basename.
 *         - mafEventListener: Object implementing the onSaveNameDetermined,
 *           onDownloadComplete, and onDownloadFailed event functions.
 */
function internalSave(aURL, aDocument, aDefaultFileName, aContentDisposition,
                      aContentType, aShouldBypassCache, aFilePickerTitleKey,
                      aChosenData, aReferrer, aSkipPrompt)
{
  if (aSkipPrompt == undefined)
    aSkipPrompt = false;

  // Note: aDocument == null when this code is used by save-link-as...
  var saveMode = GetSaveModeForContentType(aContentType);
  var isDocument = aDocument != null && saveMode != SAVEMODE_FILEONLY;

  var file, fileURL, sourceURI, saveAsType;
  // Find the URI object for aURL and the FileName/Extension to use when saving.
  // FileName/Extension will be ignored if aChosenData supplied.
  var fileInfo = new FileInfo(aDefaultFileName);
  if (aChosenData) {
    file = aChosenData.file;
    sourceURI = aChosenData.uri;
    saveAsType = kSaveAsType_Complete;
  } else {
    var charset = null;
    if (aDocument)
      charset = aDocument.characterSet;
    else if (aReferrer)
      charset = aReferrer.originCharset;
    initFileInfo(fileInfo, aURL, charset, aDocument,
                 aContentType, aContentDisposition);
    var fpParams = {
      fpTitleKey: aFilePickerTitleKey,
      isDocument: isDocument,
      fileInfo: fileInfo,
      contentType: aContentType,
      saveMode: saveMode,
      saveAsType: kSaveAsType_Complete,
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

    saveAsType = fpParams.saveAsType;
    saveMode = fpParams.saveMode;
    file = fpParams.file;
    fileURL = fpParams.fileURL;
    sourceURI = fileInfo.uri;
  }

  // Handle saving a web archive using the Mozilla Archive Format extension
  var mafSaveFilterIndex = saveAsType - 3;
  if (mafSaveFilterIndex >= 0 &&
   mafSaveFilterIndex < FileFilters.saveFiltersArray.length) {
    // Always add the archive extension if not explicitly specified. No check
    //  is done to see if a file with the new name already exists.
    var selectedFileType = FileFilters.saveFiltersArray[mafSaveFilterIndex][1];
    selectedFileType = selectedFileType.substring(1, selectedFileType.length);
    var filename = file.path;
    if (filename.substring(filename.length - selectedFileType.length,
     filename.length).toLowerCase() != selectedFileType.toLowerCase()) {
      filename += selectedFileType;
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
     FileFilters.scriptPathFromSaveIndex(mafSaveFilterIndex),
     filename);

    // Do not continue with the normal save process
    return;
  }

  if (!fileURL)
    fileURL = makeFileURI(file);

  // XXX We depend on the following holding true in appendFiltersForContentType():
  // If we should save as a complete page, the saveAsType is kSaveAsType_Complete.
  // If we should save as text, the saveAsType is kSaveAsType_Text.
  var useSaveDocument = isDocument &&
                        (((saveMode & SAVEMODE_COMPLETE_DOM) && (saveAsType == kSaveAsType_Complete)) ||
                         ((saveMode & SAVEMODE_COMPLETE_TEXT) && (saveAsType == kSaveAsType_Text)));
  // If we're saving a document, and are saving either in complete mode or
  // as converted text, pass the document to the web browser persist component.
  // If we're just saving the HTML (second option in the list), send only the URI.
  var persistArgs = {
    source      : aDocument,
    contentType : (!aChosenData &&
                   saveAsType == kSaveAsType_Text) ?
                  "text/plain" : null,
    target      : fileURL,
    postData    : isDocument ? getPostData() : null,
    bypassCache : aShouldBypassCache
  };

  var persist = makeWebBrowserPersist();

  // Calculate persist flags.
  const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
  const flags = nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES;
  if (aShouldBypassCache)
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
  else
    persist.persistFlags = flags | nsIWBP.PERSIST_FLAGS_FROM_CACHE;

  // Leave it to WebBrowserPersist to discover the encoding type (or lack thereof):
  persist.persistFlags |= nsIWBP.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

  // Create download and initiate it (below)
  var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);

  if (useSaveDocument) {
    // Saving a Document, not a URI:
    var filesFolder = null;
    if (persistArgs.contentType != "text/plain") {
      // Create the local directory into which to save associated files.
      filesFolder = file.clone();

      var nameWithoutExtension = getFileBaseName(filesFolder.leafName);
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
    tr.init(sourceURI,
            persistArgs.target, "", null, null, null, persist);

    // Mozilla Archive Format indirectly uses this function to save an already
    //  loaded document to a temporary file on disk, before generating the final
    //  archive. If the document saving was initiated by MAF, we add another
    //  download listener, that in turn will call the second-level listener
    //  specified in the eventListener property of the aSkipPrompt object.
    if (typeof aSkipPrompt == "object")
      tr = new MafWebProgressListener(aSkipPrompt.mafEventListener, tr);

    persist.progressListener = new DownloadListener(window, tr);
    persist.saveDocument(persistArgs.source, persistArgs.target, filesFolder,
                         persistArgs.contentType, encodingFlags, kWrapColumn);
  } else {
    tr.init(sourceURI,
            persistArgs.target, "", null, null, null, persist);
    persist.progressListener = new DownloadListener(window, tr);
    persist.saveURI(sourceURI,
                    null, aReferrer, persistArgs.postData, null,
                    persistArgs.target);
  }
}

// If we are able to save a complete DOM, the 'save as complete' filter
// must be the first filter appended.  The 'save page only' counterpart
// must be the second filter appended.  And the 'save as complete text'
// filter must be the third filter appended.
function appendFiltersForContentType(aFilePicker, aContentType, aFileExtension, aSaveMode)
{
  var bundle = getStringBundle();
  // The bundle name for saving only a specific content type.
  var bundleName;
  // The corresponding filter string for a specific content type.
  var filterString;

  // XXX all the cases that are handled explicitly here MUST be handled
  // in GetSaveModeForContentType to return a non-fileonly filter.
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

  default:
    if (aSaveMode != SAVEMODE_FILEONLY)
      throw "Invalid save mode for type '" + aContentType + "'";

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

      if (extString)
        aFilePicker.appendFilter(mimeInfo.description, extString);
    }

    break;
  }

  if (aSaveMode & SAVEMODE_COMPLETE_DOM) {
    aFilePicker.appendFilter(bundle.GetStringFromName("WebPageCompleteFilter"), filterString);
    // We should always offer a choice to save document only if
    // we allow saving as complete.
    aFilePicker.appendFilter(bundle.GetStringFromName(bundleName), filterString);
  }

  if (aSaveMode & SAVEMODE_COMPLETE_TEXT)
    aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterText);

  if (aSaveMode & SAVEMODE_COMPLETE_DOM) {
    // Add filters from Mozilla Archive Format
    FileFilters.saveFiltersArray.forEach(function(curFilterEntry) {
      aFilePicker.appendFilter(curFilterEntry[0], curFilterEntry[1]);
    });
  }

  // Always append the all files (*) filter
  aFilePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);
}
