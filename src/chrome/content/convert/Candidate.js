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
 * The Original Code is Mozilla Archive Format.
 *
 * The Initial Developer of the Original Code is
 * Paolo Amadini <http://www.amadzone.org/>.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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
 * Represents a saved page that can be converted from one format to another.
 */
function Candidate() {

}

Candidate.prototype = {
  /**
   * String representing the source format of the file to be converted.
   *
   * Possible values:
   *   "complete"   - Complete web page, only if a support folder is present.
   *   "mhtml"      - MHTML archive.
   *   "maff"       - MAFF archive.
   */
  sourceFormat: "complete",

  /**
   * String representing the destination format of the converted file.
   *
   * Possible values:
   *   "maff"       - MAFF archive.
   *   "mhtml"      - MHTML archive.
   *   "complete"   - Plain web page. A support folder is created if required.
   */
  destFormat: "maff",

  /**
   * String representing the relative path, with regard to the root search
   * location, of the folder where the candidate is located.
   */
  relativePath: "",

  /**
   * CandidateLocation object for the main file.
   */
  location: null,

  /**
   * CandidateLocation object for the support folder, if applicable.
   */
  dataFolderLocation: null,

  /**
   * Zero-based index of the page to be converted in a multi-page archive.
   */
  pageIndex: 0,

  /**
   * True if one of the destination files or support folders already exists.
   */
  obstructed: false,

  /**
   * Reference to an object containing a countdown of the number of pages that
   * need to be converted before the source file can be moved to the bin path.
   */
  binCountdown: null,

  /**
   * Identifier of the candidate in the candidates data source.
   */
  internalIndex: 0,

  /**
   * Sets the location of the source, destination and bin files based on the
   * given parameters and the current source and destination file formats.
   *
   * @param aParentLocation
   *        CandidateLocation object pointing to the parent folder that contains
   *        the candidate.
   * @param aLeafName
   *        File name of the candidate.
   * @param aDataFolderLeafName
   *        Name of the folder containing the support files required by the main
   *        document. If unspecified, no support folder is present.
   */
  setLocation: function(aParentLocation, aLeafName, aDataFolderLeafName) {
    // Set the initial location, relevant for the source and bin paths.
    this.relativePath = aParentLocation.relativePath;
    this.location = aParentLocation.getSubLocation(aLeafName);

    // Set the location of the source support folder, if present.
    if (aDataFolderLeafName) {
      this.dataFolderLocation = aParentLocation.getSubLocation(
       aDataFolderLeafName);
      this.dataFolderLocation.dest = null;
    }

    // Determine the correct extension for the destination file.
    var destExtension;
    switch (this.destFormat) {
      case "mhtml":
        destExtension = Prefs.saveUseMhtmlExtension ? "mhtml" : "mht";
        break;
      case "maff":
        destExtension = "maff";
        break;
      default:
        switch (this.sourceFormat) {
          case "mhtml":
          case "maff":
            // TODO: Open the source archive and determine the extension.
            destExtension = "html";
            break;
          default:
            throw "Unexpected combination of file formats for conversion";
        }
    }

    // Determine the base name from the provided source leaf name.
    var leafNameWithoutExtension = aLeafName.replace(/\.[^.]*$/, "") +
     (this.pageIndex ? "-" + (this.pageIndex + 1) : "");

    // Modify the destination location with the correct file name.
    var destLeafName = leafNameWithoutExtension + "." + destExtension;
    this.location.dest = aParentLocation.getSubLocation(destLeafName).dest;

    // If the destination can be a complete web page with a support folder
    if (this.destFormat == "complete") {
      // The source data folder location should not be present.
      if (this.dataFolderLocation) {
        throw "Unexpected specified for archive source file";
      }
      // Determine the name of the destination support folder for data files.
      var destFolderName = Cc["@mozilla.org/intl/stringbundle;1"].
       getService(Ci.nsIStringBundleService).
       createBundle("chrome://global/locale/contentAreaCommands.properties").
       formatStringFromName("filesFolder", [leafNameWithoutExtension], 1);
      // Set the data folder location, where only the destination is relevant.
      this.dataFolderLocation = aParentLocation.getSubLocation(destFolderName);
      this.dataFolderLocation.source = null;
      this.dataFolderLocation.bin = null;
    }
  },

  /**
   * Sets the "obstructed" property based on the existence of the destination or
   * bin files.
   */
  checkObstructed: function() {
    // Assume that the destination is obstructed.
    this.obstructed = true;
    // Check if the destination or bin files already exist.
    if (this.location.dest.exists() ||
        (this.location.bin && this.location.bin.exists())) {
      // This candidate should be ignored when determining when the source file
      // should be moved to the bin folder.
      if (this.binCountdown) {
        this.binCountdown.count--;
      }
      return;
    }
    // If no support folder for data files is present, exit now.
    if (!this.dataFolderLocation) {
      this.obstructed = false;
      return
    }
    // Check if the destination support folder already exists.
    if (this.dataFolderLocation.dest && this.dataFolderLocation.dest.exists()) {
      return;
    }
    // Check if the bin support folder already exists.
    if (this.dataFolderLocation.bin && this.dataFolderLocation.bin.exists()) {
      return;
    }
    // The destination files are not already present.
    this.obstructed = false;
  },

  /**
   * DOM window hosting the save infrastructure required for the conversion.
   */
  conversionWindow: null,

  /**
   * Starts the actual conversion process. When the process is finished, the
   * given function is called, passing true if the operation succeeded, or false
   * if the operation failed.
   */
  convert: function(aCompleteFn) {
    this._convertTask().then(() => {
      if (!this._canceled) {
        aCompleteFn(true);
      }
    }, ex => {
      this._reportConversionError(ex);
      if (!this._canceled) {
        aCompleteFn(false);
      }
    }).catch(Cu.reportError);
  },

  /**
   * Cancels the currently running conversion process, if any. The finish
   * callback function will not be called in this case.
   */
  cancelConversion: function() {
    this._canceled = true;
  },

  /**
   * True if the operation was explicitly canceled.
   */
  _canceled: false,

  /**
   * Asynchronous function that executes the conversion.
   */
  _convertTask: Task.async(function () {
    // Check the destination location for obstruction before starting.
    this._checkDestination();

    // Preload the archive in order to detect any errors with the format, then
    // remove the temporary files that have been created for the extraction.
    if (this.sourceFormat != "complete") {
      var archive = ArchiveCache.archiveFromUri(NetUtil.newURI(
       this.location.source));
      if (!archive) {
        archive = ArchiveLoader.extractAndRegister(this.location.source);
      }
      try {
        yield this._createAndConvertFrameTask(archive);
      } finally {
        // Do not remove the archive from the cache if it is possible that we
        // will convert other pages from the same archive. This means we will
        // keep around the temporary files for archives where at least one page
        // was deselected or failed the conversion.
        if (!this.binCountdown || this.binCountdown.count == 0) {
          try {
            ArchiveCache.unregisterArchive(archive);
            archive._tempDir.remove(true);
          } catch (e) {
            Cu.reportError(e);
          }
        }
      }
    } else {
      // There are no temporary files when loading complete web pages. 
      yield this._createAndConvertFrameTask(null);
    }
  }),

  /**
   * Asynchronous function creating the frame where the conversion continues.
   */
  _createAndConvertFrameTask: Task.async(function (archive) {
    // Create a new frame to load the source document.
    var conversionFrame = this.conversionWindow.document.
     createElement("iframe");
    conversionFrame.setAttribute("type", "content");
    conversionFrame.setAttribute("hidden", "true");

    // Place the frame in the conversion window, and remove it when finished.
    this.conversionWindow.document.documentElement.appendChild(conversionFrame);
    try {
      // In order to prevent the conversion process from blocking, disable the
      // content features that may cause dialogs to be displayed, for example
      // message boxes put up by embedded JavaScript.
      conversionFrame.docShell.allowAuth = false;
      conversionFrame.docShell.allowJavascript = false;
      conversionFrame.docShell.allowMetaRedirects = false;
      conversionFrame.docShell.allowPlugins = false;
      yield new Promise(resolve => this._mainThread.dispatch(() => resolve(),
       Ci.nsIThread.DISPATCH_NORMAL));

      yield this._convertFrameTask(archive, conversionFrame);
    } finally {
      conversionFrame.remove();
    }
  }),

  /**
   * Asynchronous function that continues the conversion in the provided frame.
   */
  _convertFrameTask: Task.async(function (archive, conversionFrame) {
    // Register the load listeners.
    var promiseLoad = this._promiseLoad(conversionFrame);
    var webProgress = conversionFrame.docShell.
     QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);
    var promiseLoadNetworkStop = this._promiseNetworkStop(
      listener => webProgress.addProgressListener(listener,
       Ci.nsIWebProgress.NOTIFY_STATE_NETWORK),
      listener => webProgress.removeProgressListener(listener)
    );

    // Load the URL associated with the source file in the conversion frame.
    var sourceUrl = archive ? archive.pages[this.pageIndex].archiveUri :
     Cc["@mozilla.org/network/io-service;1"].
     getService(Ci.nsIIOService).newFileURI(this.location.source);
    conversionFrame.webNavigation.loadURI(sourceUrl.spec, 0, null, null, null);

    yield promiseLoadNetworkStop;
    yield promiseLoad;

    // Wait for a short timeout to ensure the page is loaded.
    yield new Promise(resolve => this.conversionWindow.setTimeout(resolve, 99));

    // We must also wait for all events to be processed before continuing,
    // otherwise the conversion of some pages might fail because some elements
    // in the page are not available for saving.
    var timeLimit = Date.now() + 5000;
    while (this._mainThread.hasPendingEvents()) {
      yield new Promise(resolve => this._mainThread.dispatch(() => resolve(),
       Ci.nsIThread.DISPATCH_NORMAL));

      if (Date.now() > timeLimit) {
        // On timeout, continue even though not all events have been processed.
        this._reportConversionError("Unable to process all events generated" +
         " by the source page in a timely manner. Your computer might be" +
         " busy. The conversion operation will be tried anyway.");
        break;
      }
    }

    // Check if the operation was canceled while processing the events.
    if (this._canceled) {
      return;
    }

    // Check the destination location for obstruction again.
    this._checkDestination();
    // Ensure that the destination folder exists, and create it if required.
    if (!this.location.dest.parent.exists()) {
      this.location.dest.parent.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    }

    var document = conversionFrame.contentDocument;

    var persist;
    if (this.destFormat == "mhtml") {
      persist = new MafArchivePersist(null, "TypeMHTML");
      persist.saveWithNotLoadedResources = true;
    } else if (this.destFormat == "maff") {
      persist = new MafArchivePersist(null, "TypeMAFF");
      persist.saveWithNotLoadedResources = true;
    } else if (document.contentType == "text/html" ||
     document.contentType == "application/xhtml+xml") {
      // The ExactPersist component can also save XML and SVG, but not as
      // accurately as the browser's standard save system.
      persist = new ExactPersist();
      persist.saveWithMedia = true;
      persist.saveWithNotLoadedResources = true;
    } else {
      persist = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
       .createInstance(Ci.nsIWebBrowserPersist);
    }
    var promiseSaveNetworkStop = this._promiseNetworkStop(
     listener => persist.progressListener = listener);
    persist.persistFlags =
     Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
     Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FORCE_ALLOW_COOKIES |
     Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FROM_CACHE |
     Ci.nsIWebBrowserPersist.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;
    persist.saveDocument(
      document,
      NetUtil.newURI(this.location.dest),
      this.dataFolderLocation && this.dataFolderLocation.dest,
      null,
      Ci.nsIWebBrowserPersist.ENCODE_FLAGS_ENCODE_BASIC_ENTITIES,
      80
    );

    // This throws an exception if the save operation failed.
    yield promiseSaveNetworkStop;

    // Change the last modified time of the destination to match the source.
    this.location.dest.lastModifiedTime =
     this.location.source.lastModifiedTime;

    // Conversion completed successfully, move the source to the bin folder.
    this._moveToBin();
  }),

  /**
   * Throws an exception if the destination location is obstructed.
   */
  _checkDestination: function() {
    // Ensure that the destination file does not exist.
    if (this.location.dest.exists()) {
      throw new Components.Exception(
        "The destination location is unexpectedly obstructed.");
    }
    // Ensure that the destination support folder does not exist.
    if (this.dataFolderLocation && this.dataFolderLocation.dest &&
     this.location.dest.exists()) {
      throw new Components.Exception(
        "The destination location is unexpectedly obstructed.");
    }
  },

  /**
   * Moves the source file and support folder to the bin folder, if required.
   */
  _moveToBin: function() {
    // If this is a multipage archive and we have not yet converted all the
    // selectable pages, we don't move the source file to the bin folder.
    if (this.binCountdown) {
      if (--this.binCountdown.count > 0) {
        return;
      }
    }
    // Move the source file to the bin folder.
    if (this.location.bin) {
      // Ensure that the destination does not exist.
      if (this.location.bin.exists()) {
        throw new Components.Exception(
          "The bin location is unexpectedly obstructed.");
      }
      // Move the file as required.
      this.location.source.moveTo(this.location.bin.parent,
       this.location.bin.leafName);
    }
    // Move the source support folder, if present, to the bin folder.
    if (this.dataFolderLocation) {
      if (this.dataFolderLocation.source && this.dataFolderLocation.bin) {
        // Ensure that the destination does not exist.
        if (this.dataFolderLocation.bin.exists()) {
          throw new Components.Exception(
            "The bin location is unexpectedly obstructed.");
        }
        // Move the folder as required.
        this.dataFolderLocation.source.moveTo(
         this.dataFolderLocation.bin.parent,
         this.dataFolderLocation.bin.leafName);
      }
    }
  },

  /**
   * Resolves the returned promise when a frame reports the "load" event.
   */
  _promiseLoad: function(frame) {
    return new Promise((resolve, reject) => {
      frame.addEventListener("load", function loadListener(event) {
        // If the current "load" event is for a subframe, ignore it.
        if (event.target == frame.contentDocument) {
          frame.removeEventListener("load", loadListener, true);
          resolve();
        }
      }, true);
    });
  },

  /**
   * Creates a web progress listener that resolves the returned promise when the
   * network stop event is received, and rejects the promise in case of errors.
   * The listener is passed to the provided functions for registration.
   */
  _promiseNetworkStop: function(addListener, removeListener = () => {}) {
    return new Promise((resolve, reject) => {
      addListener({
        QueryInterface: XPCOMUtils.generateQI([
          Ci.nsIWebProgressListener,
          Ci.nsIWebProgressListener2,
          Ci.nsISupportsWeakReference,
        ]),
        onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
          if (aRequest instanceof Ci.nsIChannel &&
              aRequest.URI.spec == "about:blank") {
            return;
          }
          if (aStatus != Cr.NS_OK) {
            removeListener(this);
            reject(new Components.Exception("Operation failed", aStatus));
          } else if ((aStateFlags & Ci.nsIWebProgressListener.STATE_STOP) &&
           (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK)) {
            removeListener(this);
            resolve();
          }
        },
        onProgressChange() {},
        onLocationChange() {},
        onStatusChange() {},
        onSecurityChange() {},
        onProgressChange64() {},
        onRefreshAttempted() {},
      });
    });
  },

  /**
   * Reports the given exception that occurred during the conversion of this
   * candidate, providing additional information about the error.
   */
  _reportConversionError: function(aException) {
    try {
      // Determine the first part of the message for the Error Console.
      var messagePrefix = "The following error occurred while converting\n" +
       this.location.source.path + ":\n\n";
      // Report the complete message appropriately.
      if (aException instanceof Ci.nsIXPCException) {
        Cu.reportError(new Components.Exception(messagePrefix +
         aException.message, aException.result, aException.location,
         aException.data, aException.inner));
      } else {
        Cu.reportError(messagePrefix + aException);
      }
    } catch (e) {
      // In case of errors, report only the original exception.
      Cu.reportError(aException);
    }
  },

  _mainThread: Cc["@mozilla.org/thread-manager;1"].
   getService(Ci.nsIThreadManager).mainThread,
}
