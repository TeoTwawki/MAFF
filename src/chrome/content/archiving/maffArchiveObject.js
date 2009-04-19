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
 * Represents a MAFF web archive.
 *
 * This object allows the creation and extraction of MAFF archives, and contains
 *  the metadata associated with the archive's contents.
 */
function MaffArchive(aFile) {
  this.file = aFile;

  // Initialize object members explicitly
  this.pages = [];
}

MaffArchive.prototype = {

  // --- Public methods and properties ---

  /**
   * nsIFile representing the compressed archive. The file usually ends with
   *  the ".maff" extension.
   */
  file: null,

  /**
   * Array of MaffPage objects holding information on each individual web page
   *  included in the archive. The order of the items is important, and reflects
   *  the index that can be used to select a specific page in the archive.
   */
  pages: [],

  /**
   * Adds a new page to the archive and returns the new page object.
   */
  addPage: function() {
    var page = new MaffArchivePage(this);
    this.pages.push(page);
    return page;
  },

  /**
   * Reloads all the pages from the archive file.
   */
  load: function() {
    // Indicate that the file contains other saved pages that must be preserved
    this._createNew = false;
  },

  // --- Private methods and properties ---

  /**
   * Indicates that the archive file should be created from scratch. If false,
   *  indicates that at least one of the listed pages has already been saved,
   *  or that the archive contains other unloaded pages and should not be
   *  overwritten.
   */
  _createNew: true
}