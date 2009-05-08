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
 * Base class representing a page within a web archive. Derived objects must
 *  implement specific methods.
 *
 * This object allows the creation and extraction of individual pages within
 *  web archives, and handles the metadata associated with the page's contents.
 *
 * Instances of this object must be created using the methods in the Archive
 *  object.
 */
function ArchivePage(aArchive) {
  this.archive = aArchive;

  // Initialize other member variables explicitly for proper inheritance
  this.tempDir = null;
  this.indexLeafName = "";
  this.title = "";
  this.originalUrl = "";
  this.dateArchived = null;
  this.renderingCharacterSet = "";
}

ArchivePage.prototype = {

  // --- Public methods and properties ---

  /**
   * The parent Archive object.
   */
  archive: null,

  /**
   * nsIFile representing the temporary directory holding the expanded contents
   *  of the page.
   */
  tempDir: null,

  /**
   * Name of the main file associated with the page. This is often "index.htm".
   */
  indexLeafName: "",

  /**
   * Document title or description explicitly associated with this page.
   */
  title: "",

  /**
   * String representing the original location this page was saved from.
   */
  originalUrl: "",

  /**
   * Date object representing the time the page was archived.
   */
  dateArchived: null,

  /**
   * String representing the character set selected by the user for rendering
   *  the page at the time it was archived. This information may be used when
   *  the archive is opened to override the default character set detected from
   *  the saved page.
   */
  renderingCharacterSet: "",

  // --- Public methods and properties that can be overridden ---

  /**
   * Sets additional metadata about the page starting from the provided document
   *  and browser objects.
   */
  setMetadataFromDocumentAndBrowser: function(aDocument, aBrowser) {
    // Set the properties of this page object appropriately. When saving a page
    //  already located in an archive, use the metadata from the original page.
    this.title = aDocument.title || "Unknown";
    this.originalUrl = MafState.getOriginalURL(aDocument.location.href);
    this.dateArchived = new Date();
    this.renderingCharacterSet = aDocument.characterSet;
  },

  /**
   * Stores the page into the archive file.
   */
  save: function() {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  }
}