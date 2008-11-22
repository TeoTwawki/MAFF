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

// Provides MAF Tab Archiver Object

/**
 * The MAF Tab Archiver
 */

function MafTabArchiverClass() {

};

MafTabArchiverClass.prototype = {

  init: function(browsers, tempPath, scriptPath, archivePath, Maf) {
    /** The tabs to archive. */
    this.browsers = browsers,

    /** The path of the temp folder to use. */
    this.tempPath = tempPath,

    /** The path of the archive script to use. */
    this.scriptPath = scriptPath,

    /** The full path of the archive file to archive to. */
    this.archivePath = archivePath,

    /** Flag to ensure the start function isn't called twice. */
    this.started = false,

    /** If all the tabs have finished downloading. */
    this.downloadComplete = false,

    /** The archiver objects used to save. */
    this.MafArchivers = new Array(),

    /** The current tab being saved. */
    this.currentMafArchiverIndex = 0;

    /** Which tabs to save. */
    this.browsersInclude = new Array();

    this.browsers.QueryInterface(Components.interfaces.nsIArray);
    
    for (var i=0; i<this.browsers.length; i++) {
      this.browsersInclude[this.browsersInclude.length] = i;
    }

    this.Maf = Maf;
  },

  setIncludeList: function(strIncludeList) {
    this.browsersInclude = new Array();

    var strListIndexes = strIncludeList.split(",");

    for (var i=0; i<strListIndexes.length; i++) {
      var browserIndex = parseInt(strListIndexes[i]);
      if ((browserIndex > -1) && (browserIndex < this.browsers.length)) {
        this.browsersInclude[this.browsersInclude.length] = browserIndex;
      }
    }
  },

  start: function() {
    if (!this.started) {
      this.started = true;

      var dateTimeArchived = new Date();

      for (var i=0; i<this.browsers.length; i++) {
        var objMafArchiver =  new MafArchiverClass();
        objMafArchiver.setProgressUpdater(this);
        this.MafArchivers[this.MafArchivers.length] = objMafArchiver;
      }

      if (this.browsersInclude.length > 0) {
        this.MafArchivers[this.currentMafArchiverIndex].init(this.browsers.queryElementAt(
                              this.browsersInclude[this.currentMafArchiverIndex], Components.interfaces.nsISupports),
                            this.tempPath, this.scriptPath, this.archivePath,
                            dateTimeArchived.valueOf() + "", this.Maf);
        // We are archiving the first tab, replace an existing archive
        this.MafArchivers[this.currentMafArchiverIndex].start(false);
      }
    }
  },

  stop: function() {
    this.currentMafArchiverIndex = this.browsers.length;
  },

  setProgressUpdater: function(objWith_fnProgressUpdater) {
    this.objWith_fnProgressUpdater = objWith_fnProgressUpdater;
  },

  progressUpdater: function(progress, code) {
    if (progress == 100) {
      // Finished saving single tab

      if (this.currentMafArchiverIndex < this.browsersInclude.length) {
        if (this.MafArchivers[this.currentMafArchiverIndex].downloadComplete == true) {

          if (this.objWith_fnProgressUpdater != null) {
            var percentage = Math.floor((this.currentMafArchiverIndex/this.browsersInclude.length)*100);
            this.objWith_fnProgressUpdater.progressUpdater(percentage, 0);
          }

          this.currentMafArchiverIndex += 1;
          if (this.currentMafArchiverIndex < this.browsersInclude.length) {
            var dateTimeArchived = new Date();
            var archivePathToUse = this.archivePath;
            // If it's MHT, get unique filename
            if (this.scriptPath == "TypeMHTML") {
              archivePathToUse = MafUtils.getFullUniqueFilename(archivePathToUse);
            }
            
            this.MafArchivers[this.currentMafArchiverIndex].init(this.browsers.queryElementAt(
                              this.browsersInclude[this.currentMafArchiverIndex], Components.interfaces.nsISupports),
                               this.tempPath, this.scriptPath, archivePathToUse,
                               dateTimeArchived.valueOf() + "", this.Maf);
            // We are archiving a new tab, append to the existing archive
            this.MafArchivers[this.currentMafArchiverIndex].start(true);
          } else {
            if (this.objWith_fnProgressUpdater != null) {
              this.objWith_fnProgressUpdater.progressUpdater(100, 0);
            }
            this.downloadComplete = true;
            var obs = Components.classes["@mozilla.org/observer-service;1"]
                         .getService(Components.interfaces.nsIObserverService);
            obs.notifyObservers(null, "maf-tabarchiver-finished", this.archivePath);
          }

        }
      } else {
        if (this.objWith_fnProgressUpdater != null) {
          this.objWith_fnProgressUpdater.progressUpdater(100, 0);
        }
        this.downloadComplete = true;
        var obs = Components.classes["@mozilla.org/observer-service;1"]
                     .getService(Components.interfaces.nsIObserverService);
        obs.notifyObservers(null, "maf-tabarchiver-finished", this.archivePath);
      }
    }
  }
};