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
 * Saving the document specified occurs in a seperate thread,
 * so an object with its own timer is used to check the status
 * of the download before an archive script is invoked.
 */
function MafArchiver(aBrowser, tempPath, scriptPath, archivePath, dateTimeArchived) {
  /** The browser containing the data archive. */
  this.aBrowser = aBrowser,

  /** The document to archive. */
  this.aDocument = aBrowser.contentDocument,

  /** The path of the temp folder to use. */
  this.tempPath = tempPath,

  /** The path of the archive script to use. */
  this.scriptPath = scriptPath,

  /** The full path of the archive file to archive to. */
  this.archivePath = archivePath,

  /** When this document was archived. */
  this.dateTimeArchived = dateTimeArchived,

  /** The folder number used in the archive. */
  this.folderNumber = dateTimeArchived.valueOf()+"_"+Math.floor(Math.random()*1000),

  /** Flag to ensure the start function isn't called twice. */
  this.started = false,

  this.downloadComplete = false,

  /**
   * Starts the download process and the interval checking the download status.
   */
  this.start = function() {
    if (!this.started) {
      this.started = true;
      MafNativeFileSave.saveFile(this.aDocument, MafUtils.appendToDir(this.tempPath, this.folderNumber), "index.html", this);
    }
  },

  /**
   * Clears the interval timer if the download is complete.
   * Also triggers the archive download function.
   */
  this._checkDownloadComplete = function(objMafArchiver) {
    // If the download is complete, add to the archive
    if (objMafArchiver.dl!=null) {
      var tempArchiveFolder = MafUtils.appendToDir(objMafArchiver.tempPath, objMafArchiver.folderNumber);

      if ((objMafArchiver.dl.percentComplete == 100) &&
          (MafUtils.checkFileExists(MafUtils.appendToDir(tempArchiveFolder, objMafArchiver.indexfilename)))) {

        objMafArchiver.dl = null;
        objMafArchiver.downloadComplete = true;
        objMafArchiver.addMetaData(objMafArchiver);
        objMafArchiver.archiveDownload(objMafArchiver.scriptPath,
                                       objMafArchiver.archivePath,
                                       objMafArchiver.folderNumber);

        // Remove it after 5 seconds
        setTimeout(objMafArchiver._removeFolder, 5000, tempArchiveFolder);
        
        if (typeof(objMafArchiver.oncomplete) != "undefined") {
          if (typeof(objMafArchiver.oncompleteargs) != "undefined") {
            objMafArchiver.oncomplete(objMafArchiver.oncompleteargs);
          } else {
            objMafArchiver.oncomplete();
          }
        }

      } else {
        // Download may be complete, but file isn't in proper filesystem location yet
        if (objMafArchiver.dl.percentComplete == 100) {
          setTimeout(objMafArchiver._checkDownloadComplete, 100, objMafArchiver);
        }
      }
    }
  },

  /**
   * Removes the specified folder if it exists.
   */
  this._removeFolder = function(folderToRemove) {
    var oDir = Components.classes[localFileContractID].getService(localFileIID);
    oDir.initWithPath(folderToRemove);
    if (oDir.exists() && oDir.isDirectory()) {
      oDir.remove(true);
    }
  },

  /**
   * Adds RDF files containing Meta Data about the saved page
   * such as original URL, date/time saved and page history
   */
  this.addMetaData = function(objMafArchiver) {

    destMetaDataFolder = MafUtils.appendToDir(objMafArchiver.tempPath, objMafArchiver.folderNumber);
    // Create index.rdf in the folderNumber and
    // Get a referance to index.rdf's data source
    var indexDS = MafUtils.createRDF(destMetaDataFolder, "index.rdf");

    var MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                           .getService(Components.interfaces.nsIMafPreferences);

    try {
      // Add url data
      MafUtils.addStringData(indexDS, "originalurl", objMafArchiver.aDocument.location.href);

      if (objMafArchiver.aDocument.title != "") {
        // Add title
        MafUtils.addStringData(indexDS, "title", objMafArchiver.aDocument.title);
      } else {
        MafUtils.addStringData(indexDS, "title", "Unknown");
      }
      // Add Date/Time archived data
      MafUtils.addStringData(indexDS, "archivetime", objMafArchiver.dateTimeArchived);
      // Add index file data
      MafUtils.addStringData(indexDS, "indexfilename", objMafArchiver.indexfilename);

      if (MafPreferences.saveExtendedMetadata) {
        // Add text zoom data
        MafUtils.addStringData(indexDS, "textzoom", objMafArchiver.aBrowser.markupDocumentViewer.textZoom);

        // Add horizontal scroll data
        MafUtils.addStringData(indexDS, "scrollx", objMafArchiver.aBrowser.contentWindow.scrollX);

        // Add vertical scroll data
        MafUtils.addStringData(indexDS, "scrolly", objMafArchiver.aBrowser.contentWindow.scrollY);
      }

    } catch(e) {

    }
    // Write changes to physical file
    indexDS.Flush();


    if (MafPreferences.saveExtendedMetadata) {
      // Create history.rdf in the folderNumber
      try {
        // Get a reference to history.rdf
        var historyDS = MafUtils.createRDF(destMetaDataFolder, "history.rdf");

        // Add history information
        var historyData = objMafArchiver.aBrowser.sessionHistory;

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

  /**
   * Archives the downloaded file(s).
   */
  this.archiveDownload = function(program, archivefile, sourcepath) {
    if (program == MafMHTHander.MHT_ARCHIVE_PROG_ID) {
      MafMHTHander.archiveDownload(archivefile, sourcepath);
    } else {
    /** If program is nothing then don't try to run it. */
    if (program != "") {
      var MafPreferences = Components.classes["@mozilla.org/maf/preferences_service;1"]
                             .getService(Components.interfaces.nsIMafPreferences);

      if (MafPreferences.win_invisible) {
        localProgram = MafPreferences.win_wscriptexe;
        localProgramArgs = new Array();
        localProgramArgs[localProgramArgs.length] = MafPreferences.win_invisiblevbs;
        localProgramArgs[localProgramArgs.length] = program;
      } else {
        localProgram = program;
        localProgramArgs = new Array();
      }

      try {
        var oProgram = Components.classes[localFileContractID].getService(localFileIID);
        oProgram.initWithPath(localProgram);
      } catch(e) {
        alert("Could not find program: " + program + " \n" + e);
      }

      try {
        var oProcess = Components.classes[processContractID].createInstance(processIID);
      } catch (e) {
        alert("Could not create process:\n" + e);
      }

      oProcess.init(oProgram);

      localProgramArgs[localProgramArgs.length] = archivefile;
      localProgramArgs[localProgramArgs.length] = sourcepath;

      oProcess.run(true, localProgramArgs, localProgramArgs.length);
    }

    }
  }

};
