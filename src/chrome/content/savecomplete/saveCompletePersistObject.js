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

// Import XPCOMUtils to generate the QueryInterface functions
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * This object implements nsIWebBrowserPersist, and is used for integrating the
 *  Save Complete extension in the normal save process.
 */
function SaveCompletePersist() {

}

SaveCompletePersist.prototype = {

  // --- nsISupports interface functions ---

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebBrowserPersist]),

  // --- nsICancelable interface functions ---

  cancel: function(aReason) {
    // Update the state of this object first, then send the notifications
    this.result = aReason;
    this._onComplete();
    // If the save operation started successfully, the worker object will
    //  now handle the cancel operation and notify the progress listener
    if (this._saver) {
      this._saver.cancel(aReason);
    }
  },

  // --- nsIWebBrowserPersist interface functions ---

  persistFlags: 0,

  currentState: Ci.nsIWebBrowserPersist.PERSIST_STATE_READY,

  result: Cr.NS_OK,

  progressListener: null,

  saveURI: function(aURI, aCacheKey, aReferrer, aPostData, aExtraHeaders,
   aFile) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  saveChannel: function(aChannel, aFile) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  saveDocument: function(aDocument, aFile, aDataPath, aOutputContentType,
   aEncodingFlags, aWrapColumn) {
    // Pass exceptions to the progress listener
    try {
      // Set the object state to "operation in progress". The progress listener
      //  is not notified that the operation started, since this is done later
      //  by the worker object. In rare cases, this may lead to a finish
      //  notification being sent without the corresponding start notification,
      //  but this is not known to cause any problem.
      this.currentState = Ci.nsIWebBrowserPersist.PERSIST_STATE_SAVING;

      // Find the path of the file to save to
      var fileObject = aFile.QueryInterface(Ci.nsIFileURL).file;

      // Save the selected page to disk
      var thisObject = this;
      var scOptions = {
        rewriteLinks: true,
        callback: function(aSaver, aStatus, aOtherInfo) {
          // Report the error messages, if present
          if (aOtherInfo.errors && aOtherInfo.errors.length) {
            // ------------------------------------------------------------
            //  Errors that are notified here are typically network issues
            //  or problems with the page being saved, that are intercepted
            //  and reported by the integrated Save Complete component.
            // ------------------------------------------------------------
            Cu.reportError(aOtherInfo.errors);
          }
          // Update the state of this object. The progress listener will be
          //  notified later by the worker object itself.
          thisObject.result = aOtherInfo.result;
          thisObject._onComplete();
        },
        progressListener: this.progressListener
      };
      // Construct the integrated Save Complete object and start saving
      var scSaver = new MafSaveComplete.scPageSaver(aDocument, fileObject,
       aDataPath, scOptions);
      scSaver.run();
      // If the "run" method did not raise an exception, store a reference to
      //  the worker object to allow canceling and to indicate that the worker
      //  object will notify the listener when the operation is finished
      this._saver = scSaver;
    } catch(e) {
      Cu.reportError(e);
      // Preserve the result code of XPCOM exceptions
      if (e instanceof Ci.nsIXPCException) {
        this.result = e.result;
      } else {
        this.result = Cr.NS_ERROR_FAILURE;
      }
      // Report that the download is finished to the listener
      this._onComplete();
    }
  },

  cancelSave: function() {
    this.cancel(Cr.NS_BINDING_ABORTED);
  },

  // --- Private methods and properties ---

  _onComplete: function() {
    // Never report the finished condition more than once
    if (this.currentState != Ci.nsIWebBrowserPersist.PERSIST_STATE_FINISHED) {
      // Operation completed
      this.currentState = Ci.nsIWebBrowserPersist.PERSIST_STATE_FINISHED;
      // Signal success or failure in the archiving process, but only if the
      //  task is not delegated to the worker object
      if (this.progressListener && !this._saver) {
        this.progressListener.onStateChange(null, null,
         Ci.nsIWebProgressListener.STATE_STOP |
         Ci.nsIWebProgressListener.STATE_IS_NETWORK, this.result);
      }
    }
  },

  _saver: null
}