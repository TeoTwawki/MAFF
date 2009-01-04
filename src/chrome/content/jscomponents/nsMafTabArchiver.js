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

  init: function(browsers, scriptPath, archivePath, Maf) {
    /** The tabs to archive. */
    this.browsers = browsers,

    /** The path of the archive script to use. */
    this.scriptPath = scriptPath,

    /** The full path of the archive file to archive to. */
    this.archivePath = archivePath,

    /** The archiver objects used to save. */
    this.MafArchivers = new Array(),

    /** The current tab being saved. */
    this.currentMafArchiverIndex = 0;

    this.Maf = Maf;
  },

  start: function() {
    var dateTimeArchived = new Date();

    for (var i=0; i<this.browsers.length; i++) {
      var objMafArchiver =  new MafArchiverClass();
      objMafArchiver.setProgressUpdater(this);
      this.MafArchivers[this.MafArchivers.length] = objMafArchiver;
    }

    if (this.browsers.length > 0) {
      this.MafArchivers[this.currentMafArchiverIndex].init(
                          this.browsers[this.currentMafArchiverIndex],
                          this.scriptPath, this.archivePath,
                          dateTimeArchived.valueOf() + "", this.Maf);
      // We are archiving the first tab, replace an existing archive
      this.MafArchivers[this.currentMafArchiverIndex].start(false);
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

      if (this.currentMafArchiverIndex < this.browsers.length) {
          this.currentMafArchiverIndex += 1;

          if (this.objWith_fnProgressUpdater != null) {
            var percentage = Math.floor((this.currentMafArchiverIndex/this.browsers.length)*100);
            this.objWith_fnProgressUpdater.progressUpdater(percentage, 0);
          }

          if (this.currentMafArchiverIndex < this.browsers.length) {
            var dateTimeArchived = new Date();
            var archivePathToUse = this.archivePath;
            // If it's MHT, get unique filename
            if (this.scriptPath == "TypeMHTML") {
              archivePathToUse = MafUtils.getFullUniqueFilename(archivePathToUse);
            }
            
            this.MafArchivers[this.currentMafArchiverIndex].init(
                               this.browsers[this.currentMafArchiverIndex],
                               this.scriptPath, archivePathToUse,
                               dateTimeArchived.valueOf() + "", this.Maf);
            // We are archiving a new tab, append to the existing archive
            this.MafArchivers[this.currentMafArchiverIndex].start(true);
          }
      }
    }
  }
};