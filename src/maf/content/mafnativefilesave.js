/**
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
  var isFF08OrLower = false;
  if ((navigator.vendor != null) && (navigator.vendorSub != null)) {
    if (navigator.vendor.toLowerCase() == "firefox") {
      isFF08OrLower = (parseFloat(navigator.vendorSub.substring(navigator.vendorSub.indexOf(".") + 1,
                       navigator.vendorSub.length)) + (parseFloat(navigator.vendorSub.substring(0,
                       navigator.vendorSub.indexOf("."))) * 100) <= 8);
    }
  }
  var persistArgs = {
    source      : source,
    contentType : (isDocument && saveAsType == MafNativeFileSave.kSaveAsType_Text) ? "text/plain" : contentType,
    target      : (isFF08OrLower) ? file : MafNativeFileSave.makeFileURL(file),
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
  aData.dl = Components.classes["@mozilla.org/download;1"].createInstance(Components.interfaces.nsIDownload);

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


    try {
      // Save preference to show download window
      var dwprefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefService).getBranch("browser.download.manager.");

      var showWhenStarting = dwprefs.getBoolPref("showWhenStarting");

      // Set to false
      dwprefs.setBoolPref("showWhenStarting", false);
    } catch (e) {
      // If the preference doesn't exist - eg. Mozilla
    }

    const kWrapColumn = 80;

    aData.dl.init(aSniffer.uri, persistArgs.target, null, null, null, persist);
    persist.progressListener = new DownloadArchiveStateListener(persist.progressListener, aData);
    persist.saveDocument(persistArgs.source, persistArgs.target, filesFolder,
                         persistArgs.contentType, encodingFlags, kWrapColumn);


    try {
      // Return download window preference to saved value
      dwprefs.setBoolPref("showWhenStarting", showWhenStarting);
    } catch(e) {

    }

  } else {
    try {
      // Save preference to show download window
      var dwprefs = Components.classes["@mozilla.org/preferences-service;1"]
                       .getService(Components.interfaces.nsIPrefService).getBranch("browser.download.manager.");

      var showWhenStarting = dwprefs.getBoolPref("showWhenStarting");

      // Set to false
      dwprefs.setBoolPref("showWhenStarting", false);
    } catch(e) { }

    aData.dl.init(source, persistArgs.target, null, null, null, persist);
    persist.progressListener = new DownloadArchiveStateListener(persist.progressListener, aData);
    persist.saveURI(source, null, MafNativeFileSave.getReferrer(document), persistArgs.postData, null, persistArgs.target);

    try {
      // Return download window preference to saved value
      dwprefs.setBoolPref("showWhenStarting", showWhenStarting);
    } catch(e) {

    }
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
    dir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
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

  this.uri = MafNativeFileSave.makeURL(aURL);

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
 * Call the original functions from the original listener for each event.
 * When it's done, call the checkdownload complete from the archive object
 */
function DownloadArchiveStateListener(originalListener, aData)
{
  this.listener = originalListener;
  this.aData = aData;

}

DownloadArchiveStateListener.prototype = {

  QueryInterface: function(aIID) {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsITimerCallback) ||
        aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress,
                                aCurTotalProgress, aMaxTotalProgress) {
    this.listener.onProgressChange(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress,
                                aCurTotalProgress, aMaxTotalProgress);
  },

  onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
    this.listener.onStateChange(aWebProgress, aRequest, aStateFlags, aStatus);

    if (this.aData.dl.percentComplete == 100) {
      this.timer = Components.classes["@mozilla.org/timer;1"]
                      .createInstance(Components.interfaces.nsITimer);
      this.timer.initWithCallback(this, 100, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
  },

  notify: function(expiredtimer) {
    if (this.timer == expiredtimer) {
      this.timer = null;
      this.aData.objMafArchiver.onDownloadComplete();
    }
  },

  onLocationChange: function(aWebProgress, aRequest, aLocation) {
    this.listener.onLocationChange(aWebProgress, aRequest, aLocation);
  },

  onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {
    this.listener.onStatusChange(aWebProgress, aRequest, aStatus, aMessage);
  },

  onSecurityChange: function(aWebProgress, aRequest, aState) {
    this.listener.onSecurityChange(aWebProgress, aRequest, aState);
  }
}

