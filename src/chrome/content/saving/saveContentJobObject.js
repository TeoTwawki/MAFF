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
 * Manages the saving process of a single web page.
 *
 * This class derives from Job. See the Job documentation for details.
 *
 * @param aDocument    The document to be saved.
 * @param aTargetDir   An nsILocalFile instance representing the temporary
 *                      directory where the document should be saved.
 */
function SaveContentJob(aEventListener, aDocument, aTargetDir) {
  Job.call(this, aEventListener);

  this._document = aDocument;
  this._targetDir = aTargetDir;
}

SaveContentJob.prototype = {
  // Derive from the Job class in a Mozilla-specific way. See also
  //  <https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Inheritance>
  //  (retrieved 2009-02-01).
  __proto__: Job.prototype,

  // --- Overridden Job methods ---

  _executeStart: function() {
    // Create the target folder
    this._targetDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0755);
    // Save the document in the target folder
    browserWindow.saveDocument(this._document,
     {saveDir: this._targetDir, mafEventListener: this});
    // Wait for the save completed callback
    this._asyncWorkStarted();
  },

  _executeCancel: function(aReason) {
    // No special action is required since the worker objects do not support
    //  cancellation
  },

  _executeDispose: function() {
    // Delete the target folder if it was created successfully
    if(this._targetDir.exists()) {
      this._targetDir.remove(true);
    }
  },

  // --- Callback functions for the worker objects ---

  onSaveNameDetermined: function(aSaveName) {
    // Remember the name that the save component has chosen for the index file
    this._targetLeafName = aSaveName;
  },

  onDownloadFailed: function(aStatus) {
    this._handleAsyncCallback(function() {
      // Cancel the operation because the download failed
      Cu.reportError(new Components.Exception("Download failed.", aStatus));
      this.cancel(aStatus);
    }, this);
  },

  onDownloadComplete: function() {
    this._handleAsyncCallback(function() {
      // Add metadata near the saved file
      new MafArchiverClass(this._document, this._targetDir.path,
       this.targetBrowser, this._targetLeafName).addMetaData();
      // Create a new archive or add to an existing archive
      Maf.archiveDownload(this.targetType, this.targetFile.path,
       this._targetDir.path, this.addToArchive, this);
      // Wait for the archiving completed callback
      this._asyncWorkStarted();
    }, this);
  },

  onArchivingComplete: function(code) {
    this._handleAsyncCallback(function() {
      if (code != 0) {
        // Cancel the operation if archiving failed
        this.cancel(Cr.NS_ERROR_FAILURE);
      } else {
        // Archiving completed
        this._notifyCompletion();
      }
    }, this);
  },

  // --- Private methods and properties ---

  _document: null,
  _targetDir: null,
  _targetLeafName: null
}