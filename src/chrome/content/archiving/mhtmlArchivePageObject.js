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
 * Represents the complete web page contained within an MHTML web archive.
 *
 * This class derives from ArchivePage. See the ArchivePage documentation for
 *  details.
 */
function MhtmlArchivePage(aArchive) {
  ArchivePage.call(this, aArchive);

  // Initialize member variables explicitly for proper inheritance
  this._browserObjectForMetadata = null;
}

MhtmlArchivePage.prototype = {
  // Derive from the ArchivePage class in a Mozilla-specific way. See also
  //  <https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Inheritance>
  //  (retrieved 2009-02-01).
  __proto__: ArchivePage.prototype,

  // --- Public methods and properties ---

  /**
   * Stores the page into the archive file asynchronously. When the operation is
   *  completed, the onArchivingComplete method of the provided object is
   *  called, passing the error code as its first argument.
   */
  asyncSave: function(aCallbackObject) {
    // Find the file to original URI mapping made by Save Complete, if present
    var originalUriByPath = aCallbackObject.persistObject &&
     aCallbackObject.persistObject.saveWithContentLocation &&
     aCallbackObject.persistObject.originalUriByPath;
    // Collect the support files associated with this archiving operation
    var archiveBundle = new PersistBundle();
    archiveBundle.scanFolder(this.tempDir, originalUriByPath);
    // Begin creating the MHTML archive asynchronously
    var mhtHandler = new MafMhtHandler();
    mhtHandler.createArchive(
     this.archive.file.path, originalUriByPath, this,
     archiveBundle, aCallbackObject);
  }
}