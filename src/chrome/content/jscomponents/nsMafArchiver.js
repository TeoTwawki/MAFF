/**
 * Mozilla Archive Format
 * ======================
 *
 *  Copyright (c) 2005 Christopher Ottley.
 *  Portions Copyright (c) 2008 Paolo Amadini.
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

// Provides MAF Archiver Object

/**
 * The MAF Archiver
 */

function MafArchiverClass() {

};

MafArchiverClass.prototype = {
  indexfilename: "index.html",

  init: function(aBrowser, scriptPath, archivePath, Maf) {
    /** The browser containing the data archive. */
    this.aBrowser = aBrowser;

    /** The document to archive. */
    this.aDocument = aBrowser.contentDocument;

    /** The path of the archive script to use. */
    this.scriptPath = scriptPath;

    /** The full path of the archive file to archive to. */
    this.archivePath = archivePath;

    /** When this document was archived. */
    this.dateTimeArchived = new Date().valueOf() + "";

    /** The folder number used in the archive. */
    this.folderNumber = this.dateTimeArchived + "_" + Math.floor(Math.random()*1000);

    /** The full path of the temporary folder to save the document to. */
    this.tempSubPath = MafUtils.appendToDir(Prefs.tempFolder, this.folderNumber);
    MafUtils.createDir(this.tempSubPath);

    this.Maf = Maf;
  },


  start: function(appendToArchive) {
    this.appendToExistingArchive = appendToArchive;
    var dir = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsILocalFile);
    dir.initWithPath(this.tempSubPath);
    browserWindow.saveDocument(this.aDocument, {saveDir: dir, mafEventListener: this});
  },

  setProgressUpdater: function(objWith_fnProgressUpdater) {
    this.objWith_fnProgressUpdater = objWith_fnProgressUpdater;
  },

  onSaveNameDetermined: function(aSaveName) {
    this.indexfilename = aSaveName;
  },

  onDownloadFailed: function(aStatus) {
    Components.utils.reportError(new Components.Exception("Download failed.", aStatus));
  },

  onDownloadComplete: function() {
    this.addMetaData();
    this.Maf.archiveDownload(this.scriptPath,
                              this.archivePath,
                              this.folderNumber,
                              this.appendToExistingArchive,
                              this);
  },

  /**
   * Adds RDF files containing Meta Data about the saved page
   * such as original URL, date/time saved and page history
   */
  addMetaData: function() {

    destMetaDataFolder = this.tempSubPath;
    // Create index.rdf in the folderNumber and
    // Get a referance to index.rdf's data source
    var indexDS = MafUtils.createRDF(destMetaDataFolder, "index.rdf");
    indexDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

    try {
      var originalURL = this.aDocument.location.href;

      // If we're saving an archive page, put back the real original url in the metadata
      if (MafState.isArchiveURL(originalURL)) {
        originalURL = MafState.getOriginalURL(originalURL);
      }

      // Add url data
      MafUtils.addStringData(indexDS, "originalurl", originalURL);

      if (this.aDocument.title != "") {
        var titleToUse = this.aDocument.title;
        
        // Add title
        MafUtils.addStringData(indexDS, "title", titleToUse);
      } else {
        MafUtils.addStringData(indexDS, "title", "Unknown");
      }
      // Add Date/Time archived data
      MafUtils.addStringData(indexDS, "archivetime", new Date());
      // Add index file data
      MafUtils.addStringData(indexDS, "indexfilename", this.indexfilename);
      // Add document source character set
      MafUtils.addStringData(indexDS, "charset", this.aDocument.characterSet);

      if (Prefs.saveMetadataExtended) {
        // Add text zoom data
        MafUtils.addStringData(indexDS, "textzoom", this.aBrowser.markupDocumentViewer.textZoom);

        // Add horizontal scroll data
        MafUtils.addStringData(indexDS, "scrollx", this.aBrowser.contentWindow.scrollX);

        // Add vertical scroll data
        MafUtils.addStringData(indexDS, "scrolly", this.aBrowser.contentWindow.scrollY);
      }

    } catch(e) {

    }
    // Write changes to physical file
    indexDS.Flush();


    if (Prefs.saveMetadataExtended) {
      // Create history.rdf in the folderNumber
      try {
        // Get a reference to history.rdf
        var historyDS = MafUtils.createRDF(destMetaDataFolder, "history.rdf");
        historyDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

        // Add history information
        var historyData = this.aBrowser.sessionHistory;

        if (historyData.count > 0) {
          MafUtils.addStringData(historyDS, "current", historyData.index);
          MafUtils.addStringData(historyDS, "noofentries", historyData.count);
            for (var i=0; i<historyData.count; i++) {
               MafUtils.addStringData(historyDS, "entry" + i, historyData.getEntryAtIndex(i, false).URI.spec);
            }
        }

        // Write changes to physical file
        historyDS.Flush();
      } catch(e) {

      }
    }
  },

  onArchivingComplete: function(code) {
    try {
      // Remove Folder
      MafUtils.deleteFile(this.tempSubPath);

      if (this.objWith_fnProgressUpdater != null) {
        this.objWith_fnProgressUpdater.progressUpdater(100, code);
      }
    } catch(e) {
      mafdebug(e);
    }
  }
};
