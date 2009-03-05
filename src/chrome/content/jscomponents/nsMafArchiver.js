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

function MafArchiverClass(aDocument, tempSubPath, aBrowser, indexfilename) {
  this.aDocument = aDocument;
  this.tempSubPath = tempSubPath;
  this.aBrowser = aBrowser;
  this.indexfilename = indexfilename;
};

MafArchiverClass.prototype = {

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

      if (Prefs.saveMetadataExtended && this.aBrowser) {
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


    if (Prefs.saveMetadataExtended && this.aBrowser) {
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
  }
};
