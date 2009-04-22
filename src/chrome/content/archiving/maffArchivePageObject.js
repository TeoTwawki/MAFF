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
 * Represents a page within a MAFF web archive.
 *
 * This object allows the creation and extraction of individual pages within
 *  MAFF archives, and handles the metadata associated with the page's contents.
 *
 * Instances of this object must be created using the methods in the MaffArchive
 *  object.
 */
function MaffArchivePage(aArchive) {
  this.archive = aArchive;
}

MaffArchivePage.prototype = {

  // --- Public methods and properties ---

  /**
   * The parent MaffArchive object.
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

  /**
   * Browser object to gather extended metadata from, or null if not available.
   */
  browserObjectForMetadata: null,

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
    // Store the provided browser object
    this.browserObjectForMetadata = aBrowser;
  },

  /**
   * Stores the page into the archive file.
   */
  save: function() {
    // Create the "index.rdf" and "history.rdf" files near the main file
    this._saveMetadata();
    // Prepare the archive for creation or modification
    var creator = new ZipCreator(this.archive.file, this.archive._createNew);
    try {
      // Add the contents of the temporary directory to the archive, under the
      //  ZIP entry with the same name as the temporary directory itself
      creator.addDirectory(this.tempDir, this.tempDir.leafName);
      // In case of success, the new archive file should not be overwritten
      this.archive._createNew = false;
    } finally {
      creator.dispose();
    }
  },

  // --- Private methods and properties ---

  /**
   * Loads the metadata of this page from the "index.rdf" file in the temporary
   *  directory.
   */
  _loadMetadata: function() {
    var ds = new MaffDataSource();
    var res = ds.resources;

    // Load the metadata from the "index.rdf" file
    var indexFile = this.tempDir.clone();
    indexFile.append("index.rdf");
    ds.loadFromFile(indexFile);

    // Store the metadata in this object, using defaults for missing entries
    this.originalUrl = ds.getMafProperty(res.originalUrl) || "Unknown";
    this.title = ds.getMafProperty(res.title) || "Unknown";
    this.dateArchived = ds.getMafProperty(res.archiveTime) || "Unknown";
    this.indexLeafName = ds.getMafProperty(res.indexFileName) || "index.html";
    this.renderingCharacterSet = ds.getMafProperty(res.charset);
  },

  /**
   * Saves the metadata of this page to the "index.rdf" and "history.rdf" files
   *  in the temporary directory.
   */
  _saveMetadata: function() {
    // Set standard metadata for "index.rdf"
    var indexMetadata = [
     ["originalurl", this.originalUrl],
     ["title", this.title],
     ["archivetime", this.dateArchived],
     ["indexfilename", this.indexLeafName],
     ["charset", this.renderingCharacterSet]
    ];

    var historyMetadata = null;
    var browser = this.browserObjectForMetadata;
    if (Prefs.saveMetadataExtended && browser) {
      // Set extended metadata for "index.rdf"
      indexMetadata.push(
       ["textzoom", browser.markupDocumentViewer.textZoom],
       ["scrollx", browser.contentWindow.scrollX],
       ["scrolly", browser.contentWindow.scrollY]
      );
      // Set extended metadata for "history.rdf"
      var sessionHistory = browser.sessionHistory;
      historyMetadata = [
       ["current", sessionHistory.index],
       ["noofentries", sessionHistory.count]
      ];
      for (var i = 0; i < sessionHistory.count; i++) {
        historyMetadata.push(
         ["entry" + i, sessionHistory.getEntryAtIndex(i, false).URI.spec]
        );
      }
    }

    // Write the metadata to the required files
    this._savePropertiesToFile(indexMetadata, "index.rdf")
    if (historyMetadata) {
      this._savePropertiesToFile(historyMetadata, "history.rdf")
    }
  },

  /**
   * Save the provided metadata to the file with the given name in the temporary
   *  directory.
   */
  _savePropertiesToFile: function(aPropertyArray, aFileName) {
    // Create a new data source for writing
    ds = new MaffDataSource();
    ds.init();
    // Set all the properties in the given order
    aPropertyArray.forEach(function([propertyname, value]) {
      ds.setMafProperty(ds.resourceForProperty(propertyname), value);
    });
    // Actually save the metadata to the file with the provided name
    var destFile = this.tempDir.clone();
    destFile.append(aFileName);
    ds.saveToFile(destFile);
  }
}