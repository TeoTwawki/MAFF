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
 * Allows the archiving of multiple tabs.
 */
function MafTabArchiver(browsers, tempPath, scriptPath, archivePath) {
  /** The tabs to archive. */
  this.browsers = browsers,

  /** The path of the temp folder to use. */
  this.tempPath = tempPath,

  /** The path of the archive script to use. */
  this.scriptPath = scriptPath,

  /** The full path of the archive file to archive to. */
  this.archivePath = archivePath,

  /** Keeps track of the timer used to check the download status. */
  //this.timerId = null,

  /** Flag to ensure the start function isn't called twice. */
  this.started = false,

  /** If all the tabs have finished downloading. */
  this.downloadComplete = false,

  /** The archiver objects used to save. */
  this.MafArchivers = new Array(),

  /** The current tab being saved. */
  this.currentMafArchiverIndex = 0;

  /**
   * Starts the download process and the interval checking the download status.
   * An object is created for each tab that is saving,
   * when it is finished, the next one starts.
   */
  this.start = function() {
    if (!this.started) {
      this.started = true;
      // Should always be true, but eh.
      if (browsers.length>0) {
        this.MafArchivers[this.MafArchivers.length] = new MafArchiver(browsers[0], tempPath, scriptPath,
                                                                        archivePath, new Date());
        this.MafArchivers[this.currentMafArchiverIndex].oncomplete = this._checkDownloadComplete;
        this.MafArchivers[this.currentMafArchiverIndex].oncompleteargs = [this];
        this.MafArchivers[this.currentMafArchiverIndex].start();
      }
    }
  },


  this.stop = function() {
    this.currentMafArchiverIndex = this.browsers.length;
  },

  /**
   * Clears the interval timer if the download is complete.
   * Also triggers the archive download function.
   */
  this._checkDownloadComplete = function(args) {
    // If the current download is complete, start the next one

    var objMafTabArchiver = args[0];

    if (objMafTabArchiver.MafArchivers!=null) {
      if (objMafTabArchiver.currentMafArchiverIndex < objMafTabArchiver.browsers.length) {
        if (objMafTabArchiver.MafArchivers[objMafTabArchiver.currentMafArchiverIndex].downloadComplete == true) {
          if (objMafTabArchiver.fnProgressUpdater != null) {
            percentage = Math.floor((objMafTabArchiver.currentMafArchiverIndex/objMafTabArchiver.browsers.length)*100);
            objMafTabArchiver.fnProgressUpdater(percentage);
          }
          objMafTabArchiver.currentMafArchiverIndex += 1;

          if (objMafTabArchiver.currentMafArchiverIndex < objMafTabArchiver.browsers.length) {
            objMafTabArchiver.MafArchivers[objMafTabArchiver.MafArchivers.length] = new MafArchiver(objMafTabArchiver.browsers[objMafTabArchiver.currentMafArchiverIndex], tempPath, scriptPath, archivePath, new Date());
            objMafTabArchiver.MafArchivers[objMafTabArchiver.currentMafArchiverIndex].oncomplete = objMafTabArchiver._checkDownloadComplete;
            objMafTabArchiver.MafArchivers[objMafTabArchiver.currentMafArchiverIndex].oncompleteargs = [objMafTabArchiver];
            objMafTabArchiver.MafArchivers[objMafTabArchiver.currentMafArchiverIndex].start();
          } else {
            if (objMafTabArchiver.fnProgressUpdater != null) {
              objMafTabArchiver.fnProgressUpdater(100);
            }
            objMafTabArchiver.downloadComplete = true;
          }
        }
      } else {
        if (objMafTabArchiver.fnProgressUpdater != null) {
          objMafTabArchiver.fnProgressUpdater(100);
        }
        objMafTabArchiver.downloadComplete = true;
      }
    }
  },

  /**
   * Access method to set the progress update function
   * This is the function that is called whenever there is a change
   * in progress
   */
  this.setProgressUpdater = function(fnProgressUpdater) {
    this.fnProgressUpdater = fnProgressUpdater;
  }

};
